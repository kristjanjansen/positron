// Plaits on the board: rig/board/plaits/posplaits (the browser's plaits_shim.cc compiled here) as a
// JACK source summed into the capture beside the sampler and collide, announced as `pi-1:plaits`.
// Verbs: audio.start/stop {source: 'plaits'}, note.on/off/panic {node: 'plaits'}, plaits.set,
// plaits.patch, plaits.stats. plans/plan-plaits-on-pi.md §1.A and §3.

import { spawn, execFileSync } from 'node:child_process';
import { accessSync, constants as FS } from 'node:fs';
import { join } from 'node:path';
import { KNOBS, PATCHES, P, PARAM_NAMES, patchKnobs } from '../../demo/shell/plaits-params.mjs';
import { JACK_ENDS, jackRows } from '../../demo/shell/graph-registry.mjs';
import { ensureJackd, ensureCapture, releaseCapture, setStandingRows, wire } from './jacksynth.mjs';

export { PARAM_NAMES as PLAITS_PARAMS };

/** As /connect/ and /code/plaits/ play it (rt-plaits.mjs), so both ends steal alike. */
export const VOICES = 6;
/** The shim's `kMaxVoices`. */
export const MAX_VOICES = 8;
/** A page that has said nothing for this long has its held notes released; a Plaits note held never ends. */
export const QUIET_MS = 15000;
export const READY_MS = 5000;
export const STATS_MS = 1500;
export const QUIT_GRACE_MS = 1000;
/** posplaits refuses a gain past this (kMaxGain); the largest patch trim is 3.5. */
export const MAX_GAIN = 4;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
/** A number as the host's `%f` reads it: plain decimal, six places at most, never NaN. */
export const num = (v) => String(Number((+v).toFixed(6)));

/** One command line for posplaits' stdin. Refuses anything that is not a word and finite numbers. */
export function encodeCmd(word, ...args) {
  if (!/^[a-z]{2,8}$/.test(word)) throw new Error(`${word} is not a posplaits command`);
  for (const a of args) if (typeof a !== 'number' || !Number.isFinite(a)) throw new Error(`${word}: ${a} is not a finite number`);
  return `${[word, ...args.map(num)].join(' ')}\n`;
}

/** One line posplaits printed: `<kind> <json>`. Answers { kind, body } or null for anything else. */
export function parseLine(text) {
  const m = /^([a-z]+)(?: (\{.*\}))?\s*$/.exec(String(text));
  if (!m) return null;
  if (!m[2]) return { kind: m[1], body: {} };
  try { return { kind: m[1], body: JSON.parse(m[2]) }; } catch { return null; }
}

/** Splits a byte stream into lines; `push(chunk)` answers the complete ones. */
export function lineReader() {
  let carry = '';
  return { push(chunk) { carry += String(chunk); const parts = carry.split('\n'); carry = parts.pop(); return parts.filter(Boolean); } };
}

// Notes, knobs and patches with no process: every verb becomes command lines through `send`.
export function createPlaitsCore({ send, voices = VOICES, now = () => Date.now(), heardAt = null } = {}) {
  const byName = new Map(KNOBS.map((k) => [k.name, k]));
  const values = new Map(KNOBS.map((k) => [k.name, k.value]));
  const heard = new Map();
  /** key note -> { at: the note Plaits was handed, by, t } */
  const playing = new Map();
  let transpose = 0, gain = PATCHES[0].gain, patch = 0;
  const poly = clamp(Math.round(voices) || VOICES, 1, MAX_VOICES);
  const stat = { on: 0, off: 0, sets: 0, patches: 0, panics: 0, quietReleased: 0, refused: 0, reasons: {} };
  const refuse = (reason) => { stat.refused++; stat.reasons[reason] = (stat.reasons[reason] || 0) + 1; return { ok: false, reason }; };
  const touch = (from) => { if (from) heard.set(from, now()); };
  const lastHeard = (from) => Math.max(heard.get(from) ?? -Infinity, heardAt?.(from) ?? -Infinity);

  function apply(name, v) {
    const k = byName.get(name);
    values.set(name, v);
    if (k.param === 'transpose') { transpose = v; return; }
    send(encodeCmd('set', P[k.param], v));
  }

  /** Everything the host needs to sound like the page's first state, or like this one after a restart. */
  function boot() {
    send(encodeCmd('voices', poly));
    send(encodeCmd('gain', gain));
    for (const [name, v] of values) apply(name, v);
  }

  function noteOn(msg = {}, { from = null } = {}) {
    touch(from);
    const note = msg.note;
    if (!Number.isInteger(note) || note < 0 || note > 127) return refuse('not a note');
    const vel = clamp(Number.isFinite(msg.vel) ? msg.vel : 100, 1, 127);
    if (playing.has(note)) send(encodeCmd('off', playing.get(note).at));
    const at = clamp(note + transpose, 0, 127);
    send(encodeCmd('on', at, vel / 127));
    playing.set(note, { at, by: from, t: now() });
    stat.on++;
    return { ok: true, note, at, vel };
  }
  function noteOff(msg = {}, { from = null } = {}) {
    touch(from);
    const p = playing.get(msg.note);
    if (!p) return { ok: true, held: false };
    send(encodeCmd('off', p.at));
    playing.delete(msg.note);
    stat.off++;
    return { ok: true, held: true, at: p.at };
  }
  function panic({ from = null } = {}) {
    touch(from);
    send(encodeCmd('panic'));
    const n = playing.size;
    playing.clear();
    stat.panics++;
    return { ok: true, released: n };
  }

  /** `{ name, v }`, the value-in event's own shape; `value` is taken too. */
  function set(msg = {}, { from = null } = {}) {
    touch(from);
    const k = byName.get(msg.name);
    if (!k) return refuse(`${JSON.stringify(msg.name)} is not one of ${PARAM_NAMES.join(', ')}`);
    const raw = msg.v ?? msg.value;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return refuse(`${k.name} is not a finite number`);
    let v = clamp(raw, k.min, k.max);
    if (k.round || k.param === 'transpose') v = Math.round(v);
    apply(k.name, v);
    stat.sets++;
    return { ok: true, name: k.name, v };
  }

  /** `{ index }` or `{ name }`: the patch's engine, knobs and level trim, as /connect/'s picker sets them. */
  function loadPatch(msg = {}, { from = null } = {}) {
    touch(from);
    const i = Number.isInteger(msg.index) ? msg.index : PATCHES.findIndex((p) => p.name === msg.name);
    const p = PATCHES[i];
    if (!p) return refuse(`no patch ${JSON.stringify(msg.index ?? msg.name)}; there are ${PATCHES.length}: ${PATCHES.map((x) => x.name).join(', ')}`);
    patch = i;
    gain = clamp(p.gain, 0, MAX_GAIN);
    send(encodeCmd('gain', gain));
    for (const [name, v] of Object.entries(patchKnobs(p))) apply(name, v);
    stat.patches++;
    return { ok: true, index: i, name: p.name, gain };
  }

  /** Releases the notes of pages that have gone quiet. */
  function sweep() {
    const t = now();
    for (const [note, p] of [...playing]) {
      if (!p.by) continue;
      const last = Math.max(lastHeard(p.by), p.t);
      if (t - last > QUIET_MS) { stat.quietReleased++; noteOff({ note }); }
    }
  }

  return {
    boot, noteOn, noteOff, panic, set, loadPatch, sweep, touch,
    stats: () => ({ voices: poly, patch, patchName: PATCHES[patch].name, gain, transpose, held: playing.size,
      values: Object.fromEntries(values), ...stat, reasons: { ...stat.reasons } }),
  };
}

// ── the service: the verbs, over a host process that may or may not be up ───

const VERBS = new Set(['plaits.set', 'plaits.patch', 'plaits.stats']);
/** Is this message the Plaits engine's. */
export function isForPlaits(msg) {
  if (!msg) return false;
  if (VERBS.has(msg.type)) return true;
  if ((msg.type === 'audio.start' || msg.type === 'audio.stop') && msg.source === 'plaits') return true;
  return /^note\.(on|off|panic)$/.test(msg.type) && msg.node === 'plaits';
}

// A host is { ok, ready, send(line), onExit(fn), stats(): Promise, stop(), status() }; a test passes a fake.
export function createPlaitsService({ start = startPosPlaits, log = () => {}, onFrame = null, now = () => Date.now(),
  heardAt = null, sweepMs = 1000 } = {}) {
  let host = null, core = null, starting = null, timer = null, exits = 0, lastExit = null;

  function attach(h, voices) {
    host = h;
    core = createPlaitsCore({ send: (line) => host?.send(line), voices, now, heardAt });
    core.boot();
    h.onExit?.((why) => {
      if (host !== h) return;
      exits++; lastExit = why;
      log(`posplaits exited (${why}), Plaits is no longer sounding`, 'bad');
      detach();
    });
    timer = setInterval(() => core?.sweep(), sweepMs);
    timer.unref?.();
  }
  function detach() {
    clearInterval(timer); timer = null;
    const was = host;
    host = null; core = null;
    return was;
  }
  async function up(msg = {}) {
    if (host) return { ok: true, already: true };
    if (starting) return starting;
    const voices = clamp(Math.round(Number.isFinite(msg.voices) ? msg.voices : VOICES), 1, MAX_VOICES);
    starting = (async () => {
      const h = await start({ onLog: log, onFrame, voices }).catch((e) => ({ ok: false, reason: e.message }));
      if (!h.ok) return h;
      attach(h, voices);
      return { ok: true, already: false };
    })().finally(() => { starting = null; });
    return starting;
  }
  function down() {
    const was = detach();
    if (!was) return { ok: true, was: null };
    was.stop();
    return { ok: true, was: 'plaits' };
  }
  const status = () => ({ ok: !!host, source: 'plaits', up: !!host, exits, lastExit, jack: JACK_ENDS.plaits,
    ...(host ? host.status() : {}) });
  const notUp = 'Plaits is not running on this board, send audio.start {source: "plaits"} first';

  async function handle(msg, reply) {
    const from = msg.from ?? null;
    core?.touch(from);
    switch (msg.type) {
      case 'audio.start': {
        const r = await up(msg);
        return reply('audio.started', r.ok ? { ...status(), already: r.already } : { ok: false, source: 'plaits', reason: r.reason });
      }
      case 'audio.stop':
        return reply('audio.stopped', { ...down(), source: 'plaits' });
      case 'note.on':
        if (!core) return reply('note.ack', { node: 'plaits', note: msg.note, dropped: true, reason: notUp });
        return reply('note.ack', { node: 'plaits', ...core.noteOn(msg, { from }) });
      case 'note.off':
        return reply('note.ack', { node: 'plaits', note: msg.note, ...(core ? core.noteOff(msg, { from }) : {}) });
      case 'note.panic':
        return reply('note.ack', { node: 'plaits', panic: true, ...(core ? core.panic({ from }) : {}) });
      case 'plaits.set':
        return reply('plaits.set', core ? core.set(msg, { from }) : { ok: false, reason: notUp });
      case 'plaits.patch':
        return reply('plaits.patch', core ? core.loadPatch(msg, { from }) : { ok: false, reason: notUp });
      case 'plaits.stats': {
        const h = host;
        const engine = h ? await h.stats().catch(() => null) : null;
        return reply('plaits.stats', { ...status(), ...(core ? core.stats() : { held: 0 }), engine });
      }
      default:
        return undefined;
    }
  }

  return { handles: isForPlaits, handle, status, stop: down, core: () => core };
}

// ── the process, on the board ───────────────────────────────────────────────

const HERE = new URL('.', import.meta.url).pathname;
export const PLAITS_BIN = join(HERE, 'plaits', 'posplaits');
const sh = (cmd) => { try { return execFileSync('bash', ['-c', cmd], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch { return ''; } };
const isExec = (f) => { try { accessSync(f, FS.X_OK); return true; } catch { return false; } };
/** Built on this board by rig/board/plaits/build.sh, and a jackd to run it on. */
export const plaitsAvailable = () => isExec(PLAITS_BIN) && !!sh('command -v jackd').trim();

// Raise posplaits on the board's jackd and sum it into the capture; a host or {ok: false, reason}.
export async function startPosPlaits({ onLog, onFrame, voices = VOICES, bin = PLAITS_BIN } = {}) {
  const t0 = Date.now();
  if (!isExec(bin)) return { ok: false, reason: 'posplaits is not built on this board: run rig/board/plaits/build.sh, which needs libjack-jackd2-dev' };
  const j = await ensureJackd({ onLog });
  if (!j.ok) return { ok: false, reason: j.reason };
  sh('pkill -9 -x posplaits');
  const proc = spawn(bin, ['--voices', String(voices)], { stdio: ['pipe', 'pipe', 'pipe'] });
  proc.stdin.on('error', () => {});
  const out = lineReader();
  const waiting = [];      // { kind, resolve, timer }
  const exitFns = [];
  let ready = null, stopping = false, exited = null;
  proc.stdout.on('data', (d) => {
    for (const text of out.push(d)) {
      const m = parseLine(text);
      if (!m) { onLog?.(`posplaits: ${text}`); continue; }
      if (m.kind === 'err' || m.kind === 'gone') onLog?.(`posplaits ${m.kind}: ${m.body.reason ?? text}`);
      const w = waiting.findIndex((x) => x.kinds.includes(m.kind));
      if (w >= 0) { const [x] = waiting.splice(w, 1); clearTimeout(x.timer); x.resolve(m); }
    }
  });
  proc.stderr.on('data', (d) => {
    for (const l of String(d).split('\n').map((x) => x.trim()).filter(Boolean)) {
      if (!/^Cannot lock down \d+ byte memory area/.test(l)) onLog?.(`posplaits: ${l}`);
    }
  });
  const wait = (kinds, ms) => new Promise((resolve) => {
    const x = { kinds, resolve, timer: setTimeout(() => { waiting.splice(waiting.indexOf(x), 1); resolve(null); }, ms) };
    waiting.push(x);
  });
  proc.on('exit', (code, sig) => {
    exited = sig ?? code;
    for (const x of waiting.splice(0)) { clearTimeout(x.timer); x.resolve(null); }
    if (!stopping) for (const fn of exitFns) fn(String(exited));
  });

  const first = await wait(['ready', 'fail'], READY_MS);
  if (first?.kind !== 'ready') {
    try { proc.kill('SIGKILL'); } catch { /* gone */ }
    return { ok: false, reason: first?.body?.reason ?? (exited != null ? `posplaits exited (${exited}) before it was ready` : `posplaits did not say ready within ${READY_MS / 1000} s`) };
  }
  ready = first.body;

  await ensureCapture('plaits', { onFrame, onLog });
  const rows = jackRows(JACK_ENDS.plaits, JACK_ENDS.capture).rows;
  setStandingRows('plaits', rows);
  const wired = wire({ v: 1, links: rows }, { onLog, what: 'plaits into the capture' }).ok;
  onLog?.(`plaits up as ${ready.port}, ${ready.voices} voices, ${ready.period} frames, src ${ready.src}, in ${Date.now() - t0} ms`);

  const send = (line) => { if (exited == null) { try { proc.stdin.write(line); } catch { /* gone */ } } };
  return {
    ok: true, ready, send,
    onExit: (fn) => { exitFns.push(fn); },
    async stats() {
      const w = wait(['stats'], STATS_MS);
      send(encodeCmd('stats'));
      return (await w)?.body ?? null;
    },
    stop() {
      stopping = true;
      setStandingRows('plaits', []);
      send(encodeCmd('quit'));
      try { proc.stdin.end(); } catch { /* closed */ }
      setTimeout(() => { if (proc.exitCode === null && proc.signalCode === null) { try { proc.kill('SIGKILL'); } catch { /* gone */ } } }, QUIT_GRACE_MS).unref?.();
      return releaseCapture('plaits');
    },
    status: () => ({ pid: proc.pid, client: ready.client, port: ready.port, build: ready.build, src: ready.src,
      period: ready.period, rate: ready.rate, wired, upMs: Date.now() - t0 }),
  };
}

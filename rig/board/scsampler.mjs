// rig/board/scsampler.mjs: the board's sampler, `pi-1:sampler`, on SuperCollider.
//
// Asked 2026-10-11: *"do supercollider. rm fluidsynth"*, with option b) of
// plans/plan-sampler-pi-pico.md §2.2: the sampler and Yoshimi both on JACK,
// both summed into the one capture, so starting one never switches the other
// off for somebody in another building.
//
// 🔴 ITS OWN scsynth, AND NO sclang WHILE IT PLAYS. The granulator's server is
// raised by sclang only when `fx.pappus` asks, is killed by `stopPappus`, and
// uses `SuperCollider:in_*`/`out_*` as the insert. Sharing it would tie a piano
// to a granulator switch somebody else presses. So this is a second scsynth:
//   - JACK client `possampler` (`-H default:possampler`), so `pappusFx`'s test
//     for a running granulator (`jack_lsp` includes `SuperCollider`) can never
//     mistake it;
//   - UDP port 57130 (`SAMPLER_SC_PORT`), which `stopPappus` reads to leave it
//     alone;
//   - no inputs, two outputs, and SC_JACK_DEFAULT_* pointed at nothing, so it
//     connects nowhere by itself; `wire()` puts out_1 and out_2 into the capture.
// node drives it over OSC: voices, stealing, the pedal and program change are
// decided here, where they can be graded with no board (`createSamplerCore`).
// sclang runs only to WRITE the two SynthDefs (`norns/possampler-defs.scd`),
// once, when the files are missing or older than the script.
//
// 🔴 THE MIDI PATH IS THE RELAY AND NOTHING ELSE. A page's note arrives as
// `note.on {node: 'sampler'}` and becomes one `/s_new`. There is no ALSA client
// for this engine at all, so nothing on the board (the Circuit included) can be
// subscribed to it, by anybody or by itself.
//
// The rules a key is played by are the ones `demo/code/sampler.mjs`
// has: the nearest recording, a tie to the lower one, rate 2^(shift/12), the
// Rhodes layer from the author's crossfade table with his fallback over the
// holes, a key struck again damps the voice it replaces, the oldest voice taken
// past the cap, the damper a ramp (`demo/shell/pedal.mjs`, imported, not copied).
// The piano (program 0) is the Salamander grand since 2026-10-11
// (plans/plan-piano-samples.md): four velocity bands hard switched, level from
// ONE constant for the set and 6 dB inside a band, and a key-off sample when
// the damper lands. The FluidR3 piano is program 2, on /nola/'s (v/127)^1.5.
import { spawn, execFileSync } from 'node:child_process';
import { createSocket } from 'node:dgram';
/** How long scsynth gets to leave the JACK graph by itself after /quit. */
export const QUIT_GRACE_MS = 3000;
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createPedal, SUSTAIN_CC } from '../../demo/shell/pedal.mjs';
import { JACK_ENDS, jackRows } from '../../demo/shell/graph-registry.mjs';
import { oscMessage, ensureJackd, ensureCapture, releaseCapture, setStandingRows, wire, SAMPLER_SC_PORT } from './jacksynth.mjs';
import { readOsc } from './pappus.mjs';
import { PIANO_NOTES, RHODES_NOTES, RHODES_ABSENT, rhodesName, SAMPLE_DIR, RHODES_DIR, ensurePiano, ensureRhodes,
  SALAMANDER_DIR, SALAMANDER_LAYERS, RELEASE_KEYS, salamanderName, releaseName, ensureSalamander } from './sampler.mjs';

export const SC_CLIENT = 'possampler';
export const SC_PORT = SAMPLER_SC_PORT;
export const DEF_DIR = process.env.BOARD_SAMPLER_DEFS || '/opt/positron-board/samples/defs';
const HERE = new URL('.', import.meta.url).pathname;
export const DEF_SCD = join(HERE, 'norns', 'possampler-defs.scd');
/** Past this many sounding voices the oldest is taken. The browser has 64. */
export const VOICES = 32;
/** One hard note lands here in the capture, as one does in the browser. */
export const LOUDEST = 0.30;
/** The loudest FluidR3 piano file, measured on /nola/ 2026-09-22 by decoding all thirty. */
export const PIANO_PEAK = 0.097;
/**
 * The loudest Salamander v16 file, the browser's encode decoded back
 * (PROVENANCE-salamander.json `peak.web`). The SAME constant as the browser, so
 * a mono file here lands a little under a stereo one there, by what summing L
 * and R loses (0.6 to 1.7 dB, plan section 2.2), which a mono speaker loses too.
 */
export const SALAMANDER_PEAK = 0.9085;
/** The loudest Rhodes file, from demo/nola/PROVENANCE-rhodes.json. */
export const RHODES_PEAK = 0.9981;

// ── the rules, copied from the browser module and graded against it ────────
// (test.mjs imports `demo/code/sampler.mjs` and compares every
// value over every input, so a change there turns these red.)

/** The recording a note is played from. A tie goes to the lower one. */
export const nearestIn = (notes, note) => notes.reduce(
  (best, n) => (Math.abs(n - note) < Math.abs(best - note) ? n : best), notes[0]);
/** What one press is worth before the damper, for a set whose loudest file is `peak`. */
export const velGain = (peak, vel) => (LOUDEST / peak) * Math.pow(Math.max(1, Math.min(127, vel)) / 127, 1.5);
const RHODES_XF = [
  { layer: 5, lo: 1, hi: 60, in: null, out: [25, 60] },
  { layer: 4, lo: 25, hi: 84, in: [25, 60], out: [61, 84] },
  { layer: 3, lo: 61, hi: 103, in: [61, 84], out: [85, 103] },
  { layer: 2, lo: 85, hi: 119, in: [85, 103], out: [104, 119] },
  { layer: 1, lo: 104, hi: 127, in: [104, 119], out: null },
];
function xfGain(g, vel) {
  if (vel < g.lo || vel > g.hi) return 0;
  if (g.in && vel <= g.in[1]) return (vel - g.in[0]) / (g.in[1] - g.in[0]);
  if (g.out && vel >= g.out[0]) return (g.out[1] - vel) / (g.out[1] - g.out[0]);
  return 1;
}
/** The layer loudest in his crossfade at this velocity, softest first on a tie. */
export function layerFor(vel) {
  let best = RHODES_XF[0], top = -1;
  for (const g of RHODES_XF) { const v = xfGain(g, vel); if (v > top) { top = v; best = g; } }
  return best.layer;
}
/** The Salamander's four bands, hard switched: the browser module's PIANO_BANDS. */
export const PIANO_BANDS = Object.freeze([
  { layer: 1, lo: 1, hi: 40 },
  { layer: 6, lo: 41, hi: 72 },
  { layer: 11, lo: 73, hi: 104 },
  { layer: 16, lo: 105, hi: 127 },
]);
const clampVel = (vel) => Math.max(1, Math.min(127, Math.round(vel)));
const bandOf = (vel) => { const v = clampVel(vel); return PIANO_BANDS.find((b) => v <= b.hi); };
export const bandFor = (vel) => bandOf(vel).layer;
export const BAND_SPAN_DB = 6;
/** One press on the Salamander: one constant for the set, 6 dB from a band's bottom to its top. */
export function pianoGain(vel) {
  const v = clampVel(vel), b = bandOf(v);
  return (LOUDEST / SALAMANDER_PEAK) * Math.pow(10, (-BAND_SPAN_DB * (b.hi - v) / (b.hi - b.lo)) / 20);
}
/** A key-off sample: Data/hammer.txt's volume=-37, amp_veltrack=82, rt_decay=2 dB per second held. */
export function releaseGain(vel, heldSec = 0) {
  const v = clampVel(vel) / 127;
  return (LOUDEST / SALAMANDER_PEAK) * Math.pow(10, -37 / 20) * (0.18 + 0.82 * v * v)
    * Math.pow(10, (-2 * Math.max(0, heldSec)) / 20);
}
const RHODES_FALLBACK = { 1: 2, 3: 4 };
export function rhodesLayerAt(note, layer) {
  let l = layer;
  while (RHODES_ABSENT.has(`${note}-${l}`)) {
    const next = RHODES_FALLBACK[l];
    if (!next || next === l) return null;
    l = next;
  }
  return l;
}

/**
 * The sets, by program number. Buffer numbers are fixed per file and never
 * overlap: FluidR3 0 to 29, Rhodes 100 to 164, Salamander notes 300 to 419 and
 * its releases 500 to 587, all under scsynth's default of 1024 buffers.
 */
export const SETS = Object.freeze({
  0: { id: 'piano', name: 'Piano', program: 0, notes: PIANO_NOTES, peak: SALAMANDER_PEAK, dir: SALAMANDER_DIR,
       gain: pianoGain, releaseGain,
       files: [
         ...PIANO_NOTES.flatMap((n) => SALAMANDER_LAYERS.map((l) => salamanderName(n, l)))
           .map((k, i) => ({ key: k, file: `${k}.flac`, bufnum: 300 + i })),
         ...RELEASE_KEYS.map((k, i) => ({ key: releaseName(k), file: `${releaseName(k)}.flac`, bufnum: 500 + i })),
       ],
       fileFor: (near, vel) => salamanderName(near, bandFor(vel)),
       releaseFor: (key) => (key >= 21 && key <= 108 ? releaseName(key) : null) },
  2: { id: 'piano-fluid', name: 'FluidR3 piano', program: 2, notes: PIANO_NOTES, peak: PIANO_PEAK, dir: SAMPLE_DIR,
       files: PIANO_NOTES.map((n, i) => ({ key: `${n}`, file: `${n}.flac`, bufnum: i })),
       fileFor: (near) => `${near}` },
  1: { id: 'rhodes', name: 'Rhodes', program: 1, notes: RHODES_NOTES, peak: RHODES_PEAK, dir: RHODES_DIR,
       files: RHODES_NOTES.flatMap((n) => [1, 2, 3, 4, 5].filter((l) => !RHODES_ABSENT.has(`${n}-${l}`))
         .map((l) => rhodesName(n, l))).map((k, i) => ({ key: k, file: `${k}.flac`, bufnum: 100 + i })),
       fileFor: (near, vel) => { const l = rhodesLayerAt(near, layerFor(vel)); return l == null ? null : rhodesName(near, l); } },
});

export function scsynthArgs({ port = SC_PORT, client = SC_CLIENT } = {}) {
  // -i 0 -o 2: no inputs, out_1 and out_2. -R 0: no Zeroconf. -l 1: one client.
  return ['-u', String(port), '-i', '0', '-o', '2', '-H', `default:${client}`, '-R', '0', '-l', '1'];
}
/** What keeps scsynth from patching itself to the card: a pattern that names no port. */
export const SC_ENV = Object.freeze({ SC_JACK_DEFAULT_INPUTS: 'posnothing:none', SC_JACK_DEFAULT_OUTPUTS: 'posnothing:none' });

/**
 * 🔴 THE ONE-SOURCE RULE, WITH THE SAMPLER BESIDE IT. Pure, so it is graded.
 * Yoshimi (and the old pipe sources) are still one at a time: a second one
 * replaces the first, as `startAudio` has always done. The sampler is not in
 * that rule: starting it stops nothing, and starting anything else leaves it
 * running. `audio.stop` with no source stops the instrument and never the
 * sampler; `{source: 'sampler'}` stops the sampler and nothing else.
 */
export function startPlan(want, { running = null, sampler = false } = {}) {
  if (want === 'sampler') return { act: sampler ? 'already' : 'start-sampler', stopInst: false, stopSampler: false };
  if (running === want) return { act: 'already', stopInst: false, stopSampler: false };
  return { act: 'start', stopInst: !!running, stopSampler: false };
}
export function stopPlan(source, { running = null, sampler = false } = {}) {
  if (source === 'sampler') return { stopInst: false, stopSampler: sampler };
  return { stopInst: !!running, stopSampler: false };
}
/** Which engine a note, a controller or a program is for. Only `node: 'sampler'` is the sampler's. */
export const isForSampler = (msg) => msg?.node === 'sampler';

/**
 * Voices, the pedal and program change, with no server. `send(address, args)`
 * is the whole output; `loaded(program)` says whether a set's buffers are in.
 * Every decision about a note is here, so `test.mjs` drives it with a fake.
 */
export function createSamplerCore({ send, voices: cap = VOICES, buffers = new Map(), log = () => {}, onProgram = () => {},
  now = () => Date.now() / 1000 } = {}) {
  let program = 0, nextId = 2000;
  const live = [];                // { id, note, damped, set, vel, at }, oldest first
  const stat = { started: 0, stolen: 0, dropped: 0, ended: 0, releases: 0, programs: [], last: null, peakVoices: 0 };
  /**
   * The damper falls on a key: its voices ramp out, and a Salamander string
   * makes its key-off sound (only when a sounding voice was damped, never on a
   * key up under the pedal, which pedal.mjs does not pass here). A release
   * voice is not counted in `live`: it is under half a second and frees itself.
   */
  const release = (note, sec) => {
    let fell = null;
    for (const v of live) if (v.note === note && !v.damped) { damp(v, sec); fell ??= v; }
    const set = fell && SETS[fell.program];
    const key = set?.releaseFor?.(note);
    const b = key && buffers.get(`${set.id}:${key}`);
    if (!b) return;
    const amp = set.releaseGain(fell.vel, now() - fell.at) * (b.channels === 2 ? 0.5 : 1);
    send('/s_new', [b.channels === 2 ? 'posSampler2' : 'posSampler1', nextId++, 1, 0, 'buf', b.bufnum, 'rate', 1, 'amp', amp]);
    stat.releases++;
  };
  const pedal = createPedal({ cc: SUSTAIN_CC, release });
  function damp(v, sec) {
    if (v.damped) return;
    v.damped = true;
    send('/n_set', [v.id, 'rel', Math.max(0.005, sec), 'gate', 0]);
  }
  function remove(v) { const i = live.indexOf(v); if (i >= 0) live.splice(i, 1); }

  function noteOn(note, vel) {
    if (!(note >= 0 && note <= 127)) return { ok: false, reason: 'not a note' };
    const set = SETS[program];
    pedal.keyDown(note);
    const near = nearestIn(set.notes, note);
    const key = set.fileFor(near, vel);
    const b = key == null ? null : buffers.get(`${set.id}:${key}`);
    if (!b) { stat.dropped++; return { ok: false, dropped: true, reason: `${set.name} is not loaded yet` }; }
    for (const v of live) if (v.note === note) damp(v, 0.04);
    while (live.length >= cap) { const old = live[0]; damp(old, 0.02); remove(old); stat.stolen++; }
    const rate = Math.pow(2, (note - near) / 12);
    const amp = (set.gain ? set.gain(vel) : velGain(set.peak, vel)) * (b.channels === 2 ? 0.5 : 1);
    const id = nextId++;
    send('/s_new', [b.channels === 2 ? 'posSampler2' : 'posSampler1', id, 1, 0, 'buf', b.bufnum, 'rate', rate, 'amp', amp]);
    live.push({ id, note, damped: false, program, vel, at: now() });
    stat.started++;
    stat.peakVoices = Math.max(stat.peakVoices, live.length);
    stat.last = { set: set.id, note, near, file: key, rate: +rate.toFixed(4), amp: +amp.toFixed(4), id };
    return { ok: true, ...stat.last };
  }
  function noteOff(note) { pedal.keyUp(note); }
  function control(c, v) { return pedal.control(c, v); }
  function setProgram(p) {
    stat.programs.push(p);
    if (!SETS[p]) { log(`program ${p} is not a set here, 0 is the piano, 1 the Rhodes and 2 the FluidR3 piano`); return { ok: false, reason: `program ${p} is not a set here` }; }
    if (p === program) return { ok: true, program: p, set: SETS[p].id, changed: false };
    program = p;
    for (const v of [...live]) { damp(v, 0.06); remove(v); }
    onProgram(SETS[p]);
    return { ok: true, program: p, set: SETS[p].id, changed: true };
  }
  /** scsynth said this node is gone (`/n_end`). */
  function ended(id) { const v = live.find((x) => x.id === id); if (v) { remove(v); stat.ended++; } }
  function panic() { for (const v of [...live]) { damp(v, 0.02); remove(v); } pedal.panic?.(); }
  return {
    noteOn, noteOff, control, program: setProgram, ended, panic,
    current: () => SETS[program],
    sounding: () => live.length,
    stat: () => ({ ...stat, programs: [...stat.programs], voices: live.length, cap, program, set: SETS[program].id,
                   pedal: pedal.down() }),
  };
}

const sh = (cmd) => { try { return execFileSync('bash', ['-c', cmd], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch { return ''; } };
const have = (bin) => !!sh(`command -v ${bin}`).trim();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const samplerAvailable = () => have('scsynth') && have('sclang') && have('jackd') && existsSync(DEF_SCD);

/** sclang writes the two defs, only when they are missing or older than the script. */
async function ensureDefs(onLog) {
  const defs = ['posSampler1', 'posSampler2'].map((n) => join(DEF_DIR, `${n}.scsyndef`));
  const scdAt = statSync(DEF_SCD).mtimeMs;
  if (defs.every((f) => existsSync(f) && statSync(f).mtimeMs >= scdAt)) return { ok: true, compiled: false };
  const t0 = Date.now();
  const p = spawn('sclang', [DEF_SCD], {
    env: { ...process.env, POS_DEFDIR: DEF_DIR, XDG_RUNTIME_DIR: '/tmp/rt', QT_QPA_PLATFORM: 'offscreen', QTWEBENGINE_DISABLE_SANDBOX: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let said = '';
  p.stdout.on('data', (d) => { said += d; });
  p.stderr.on('data', (d) => { said += d; });
  const done = await Promise.race([new Promise((r) => p.on('exit', () => r(true))), wait(120000).then(() => false)]);
  if (!done) { try { p.kill('SIGKILL'); } catch { /* gone */ } }
  const ok = defs.every((f) => existsSync(f) && statSync(f).mtimeMs >= scdAt) && /POSSAMPLER DEFS WRITTEN/.test(said);
  onLog?.(ok ? `wrote the sampler's two SynthDefs in ${Date.now() - t0} ms` : `sclang did not write the SynthDefs: ${said.trim().split('\n').slice(-3).join(' / ')}`);
  return { ok, compiled: true, ms: Date.now() - t0 };
}

/**
 * Raise the sampler: jackd, the defs, scsynth, the piano's buffers, the capture,
 * out_1 and out_2 into the capture. Answers the engine, or `{ ok: false, reason }`.
 */
export async function startScSampler({ onFrame, onLog, onState } = {}) {
  const t0 = Date.now();
  const marks = {};
  if (!samplerAvailable()) return { ok: false, reason: 'scsynth, sclang or jackd is not installed on this board' };
  const j = await ensureJackd({ onLog });
  if (!j.ok) return { ok: false, reason: j.reason };
  const piano = await ensureSalamander({ onLog }).catch((e) => ({ error: e.message }));
  if (piano.error) return { ok: false, reason: `the piano samples are not on the card: ${piano.error}` };
  const defs = await ensureDefs(onLog);
  if (!defs.ok) return { ok: false, reason: 'the SynthDefs could not be written' };
  marks.defs = Date.now() - t0;

  // A sampler scsynth left by a previous run of this service holds the port
  // and the JACK name; it answers nobody we know, so it goes.
  sh(`pgrep -ax scsynth | awk '/-u ${SC_PORT}( |$)/{print $1}' | xargs -r kill -9`);
  const proc = spawn('scsynth', scsynthArgs(), { env: { ...process.env, ...SC_ENV }, stdio: ['ignore', 'pipe', 'pipe'] });
  let ready = false, stopping = false;
  const hear = (d) => {
    for (const line of String(d).split('\n').map((x) => x.trim()).filter(Boolean)) {
      if (/server ready/.test(line)) ready = true;
      if (/^Cannot lock down|LADSPA|couldn't connect .* to posnothing/.test(line)) continue;
      onLog?.(`scsynth: ${line}`);
    }
  };
  proc.stdout.on('data', hear); proc.stderr.on('data', hear);
  proc.on('exit', (code, sig) => { if (!stopping) onLog?.(`scsynth exited (${sig ?? code}), the sampler is no longer making sound`); onState?.('exited'); });
  for (let i = 0; i < 60 && !ready; i++) await wait(100);
  if (!ready) { try { proc.kill('SIGKILL'); } catch { /* gone */ } return { ok: false, reason: 'scsynth did not say it was ready within six seconds' }; }
  marks.server = Date.now() - t0;

  // ── OSC: one socket, replies by address ──────────────────────────────────
  const udp = createSocket('udp4');
  await new Promise((r) => udp.bind(0, '127.0.0.1', r));
  const waiting = [];
  const buffers = new Map();
  /** Other readers of this server's replies: `scollide.mjs` when it shares this server. */
  const listeners = new Set();
  let core = null;
  udp.on('message', (b) => {
    let m; try { m = readOsc(b); } catch { return; }
    for (const fn of listeners) { try { fn(m); } catch { /* a reader's fault is its own */ } }
    if (m.addr === '/n_end') core?.ended(m.args[0]);
    if (m.addr === '/fail') onLog?.(`scsynth refused ${m.args.join(' ')}`);
    for (const w of [...waiting]) if (w.match(m)) { waiting.splice(waiting.indexOf(w), 1); w.resolve(m); }
  });
  const send = (addr, args = []) => { const msg = oscMessage(addr, args); udp.send(msg, 0, msg.length, SC_PORT, '127.0.0.1'); };
  const ask = (addr, args, match, ms = 4000) => new Promise((resolve) => {
    const w = { match, resolve };
    waiting.push(w);
    setTimeout(() => { const i = waiting.indexOf(w); if (i >= 0) { waiting.splice(i, 1); resolve(null); } }, ms);
    send(addr, args);
  });
  await ask('/notify', [1], (m) => m.addr === '/done' && m.args[0] === '/notify');
  const dl = await ask('/d_loadDir', [DEF_DIR], (m) => m.addr === '/done' && m.args[0] === '/d_loadDir');
  if (!dl) { stop(); return { ok: false, reason: 'scsynth did not load the SynthDefs' }; }

  /**
   * Read one set's files into buffers, four at a time, and ask each its channel
   * count. Four, not all at once: scsynth reads files one after another on its
   * own thread, so 208 Salamander requests sent together would queue behind
   * each other and the later ones would outlive their 8 s answer timeout.
   */
  async function loadSet(set) {
    const t = Date.now();
    const pool = async (items, n, fn) => {
      const res = new Array(items.length);
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
        while (next < items.length) { const i = next++; res[i] = await fn(items[i]); }
      }));
      return res;
    };
    const got = await pool(set.files, 4, async (f) => {
      const path = join(set.dir, f.file);
      if (!existsSync(path)) return null;
      const d = await ask('/b_allocRead', [f.bufnum, path, 0, -1], (m) => m.addr === '/done' && m.args[0] === '/b_allocRead' && m.args[1] === f.bufnum, 8000);
      if (!d) return null;
      const info = await ask('/b_query', [f.bufnum], (m) => m.addr === '/b_info' && m.args[0] === f.bufnum);
      if (!info || !info.args[1]) return null;
      const b = { bufnum: f.bufnum, frames: info.args[1], channels: info.args[2], rate: info.args[3] };
      buffers.set(`${set.id}:${f.key}`, b);
      return b;
    });
    const n = got.filter(Boolean).length;
    onLog?.(`${set.name}: ${n} of ${set.files.length} recordings in scsynth in ${Date.now() - t} ms`);
    return { loaded: n, of: set.files.length, ms: Date.now() - t };
  }
  const loading = new Map();
  function ensureSet(p) {
    if (loading.has(p)) return loading.get(p);
    const set = SETS[p];
    const job = (async () => {
      if (set.id === 'rhodes' || set.id === 'piano-fluid') {
        const r = await (set.id === 'rhodes' ? ensureRhodes : ensurePiano)({ onLog }).catch((e) => ({ error: e.message }));
        if (r.error) { onLog?.(`the ${set.name} could not be fetched: ${r.error}`); loading.delete(p); return { loaded: 0, of: set.files.length, error: r.error }; }
      }
      return loadSet(set);
    })();
    loading.set(p, job);
    return job;
  }
  const pianoLoad = await ensureSet(0);
  marks.piano = Date.now() - t0;
  if (!pianoLoad.loaded) { stop(); return { ok: false, reason: 'no piano recording loaded into scsynth' }; }

  core = createSamplerCore({ send, buffers, log: (l) => onLog?.(l),
    onProgram: (set) => { onLog?.(`program ${set.program}: the sampler plays the ${set.name} now`); ensureSet(set.program); } });

  // ── the capture, and out_1 and out_2 into it ──────────────────────────────
  await ensureCapture('sampler', { onFrame, onLog });
  const rows = jackRows(JACK_ENDS.sampler, JACK_ENDS.capture).rows;
  setStandingRows('sampler', rows);
  const w = wire({ v: 1, links: rows }, { onLog, what: 'sampler into the capture' });
  marks.wired = Date.now() - t0;
  onLog?.(`sampler up in ${marks.wired} ms (defs ${marks.defs}, server ${marks.server}, piano ${marks.piano}), out_1 and out_2 into the capture ${w.ok ? 'read back' : 'NOT read back'}`);

  function stop() {
    stopping = true;
    setStandingRows('sampler', []);
    // 🔴 /quit HAS TO LEAVE BEFORE THE SOCKET CLOSES, AND scsynth HAS TO BE
    // GIVEN TIME TO TAKE ITSELF OFF THE JACK GRAPH. MEASURED 2026-10-12 on the
    // Pi with Yoshimi running: this stop cost 1 to 2 jackd xruns every time
    // (`possampler was not finished`), and the process was gone about 600 ms
    // after the stop, which is the SIGKILL below. The same server sent /quit
    // by hand exited by itself in 183 ms with no xrun at all. `udp.close()`
    // straight after an async `send` can drop the datagram, so the kill landed
    // on a client still running in the graph. So: close in the send callback,
    // and kill only a process still there after QUIT_GRACE_MS.
    const quit = oscMessage('/quit');
    try { udp.send(quit, 0, quit.length, SC_PORT, '127.0.0.1', () => { try { udp.close(); } catch { /* closed */ } }); }
    catch { try { udp.close(); } catch { /* closed */ } }
    setTimeout(() => { if (proc.exitCode === null && proc.signalCode === null) { try { proc.kill('SIGKILL'); } catch { /* gone */ } } }, QUIT_GRACE_MS).unref?.();
    return releaseCapture('sampler');
  }
  const status = () => ({ ok: true, source: 'sampler', pid: proc.pid, port: SC_PORT, client: SC_CLIENT,
    jack: JACK_ENDS.sampler, buffers: buffers.size, upMs: Date.now() - t0, startMs: marks, ...core.stat() });
  return {
    ok: true, source: 'sampler', jack: true, wired: w.ok, startMs: marks, buffers: buffers.size,
    noteOn: (n, v) => core.noteOn(n, v), noteOff: (n) => core.noteOff(n),
    cc: (c, v) => (c === SUSTAIN_CC ? core.control(c, v) : false),
    program: (p) => core.program(p),
    loadSet: (p) => ensureSet(p),
    panic: () => core.panic(),
    status, stop,
    /**
     * 🔴 THIS SERVER'S OSC, FOR `scollide.mjs` WHEN IT IS TOLD TO SHARE IT
     * (`ENGINES.shared`). scsynth runs with `-l 1`, one client, and this socket
     * is that client, so `/n_end` for a page's node arrives HERE and nowhere
     * else: a second socket's `/notify` would be refused. `send` takes encoded
     * bytes (a message or a bundle); `onReply(fn)` hears every decoded reply
     * and answers the function that stops it. Nothing calls either while the
     * collide engine has its own server, which is the default.
     */
    osc: {
      port: SC_PORT,
      send: (buf) => udp.send(buf, 0, buf.length, SC_PORT, '127.0.0.1'),
      onReply: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    },
    /** scsynth's own CPU, average and peak, as it reports it (`/status`). */
    cpu: async () => {
      const m = await ask('/status', [], (x) => x.addr === '/status.reply');
      return m ? { ugens: m.args[1], synths: m.args[2], avg: +m.args[5].toFixed(2), peak: +m.args[6].toFixed(2) } : null;
    },
  };
}

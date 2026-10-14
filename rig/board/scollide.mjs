// Programs a page typed, compiled here by demo/shell/sclang-lite.mjs, played on scsynth;
// no OSC from a browser. Verbs: audio.start/stop, sc.load, sc.hit, note.*, sc.set, sc.stats,
// clock.ping. ENGINE picks its own scsynth (57131) or the sampler's; PAGE_BUS is limited.
// why: lessons/rig-board-io.md#scollide-header

import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createSocket } from 'node:dgram';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from '../../demo/shell/sclang-lite.mjs';
// Imported directly so push.sh and setup.sh copy synthdef.mjs (they follow rig/board's own
// imports).
// why: lessons/rig-board-io.md#synthdef-import
import { readSynthDef } from '../../demo/shell/synthdef.mjs';
import { JACK_ENDS, jackRows } from '../../demo/shell/graph-registry.mjs';
import { oscMessage, oscBundle, ntpTimetag, ensureJackd, ensureCapture, releaseCapture, setStandingRows, wire,
  SAMPLER_SC_PORT, COLLIDE_SC_PORT } from './jacksynth.mjs';
import { scsynthArgs, SC_ENV, DEF_DIR, QUIT_GRACE_MS } from './scsampler.mjs';
import { readOsc } from './pappus.mjs';

// ── the engine switch ───────────────────────────────────────────────────────

export const ENGINES = Object.freeze({
  own: Object.freeze({ mode: 'own', port: COLLIDE_SC_PORT, client: 'poscollide', starts: true }),
  shared: Object.freeze({ mode: 'shared', port: SAMPLER_SC_PORT, client: 'possampler', starts: false }),
});
// The one-line switch: ENGINES.shared puts page programs on the sampler's server.
// why: lessons/rig-board-io.md#engine
export const ENGINE = ENGINES.own;

// ── the numbers, each one the plan's (§1.2, §1.5) ───────────────────────────

/** The page's nodes live in this group, at the head of the server. */
export const PAGE_GROUP = 900;
/** The board's limiter, added after the group. */
export const LIMITER_NODE = 901;
export const LIMITER_DEF = 'posCollideOut';
// The private bus pair page programs write to, past either server's ins and outs.
// why: lessons/rig-board-io.md#page-bus
export const PAGE_BUS = 64;
// The capture sums out_1 and out_2 while a page averages them, so 0.5 matches the tab (6 dB louder
// before).
// why: lessons/rig-board-io.md#fold
export const FOLD = 0.5;
// Per channel after the fold, so the capture tops out at 0.98: a clip guard, not loudness.
// why: lessons/rig-board-io.md#limit
export const LIMIT_LEVEL = 0.49;
// Page node ids start here; the sampler counts up from 2000 and cannot reach it.
// why: lessons/rig-board-io.md#first-node
export const FIRST_NODE = 10_000_000;
export const PREFIX = 'pg_';
/** `params.set`'s pattern for an OSC command name (board.mjs). */
export const NAME_RE = /^[a-z][a-z0-9_]{0,23}$/;
// 4.6 times the largest program the pages play (864 B).
// why: lessons/rig-board-io.md#text-cap
export const TEXT_CAP = 4000;
export const MAX_DEFS = 16;
export const MAX_NODES = 48;
// Blocks in one definition; the largest today is 31.
// why: lessons/rig-board-io.md#block-cap
export const BLOCK_CAP = 64;
export const MAX_HITS = 16;
export const MAX_ARGS = 16;
/** An `at` further ahead than this on the board's clock is refused. */
export const AHEAD_MAX_MS = 2000;
/** An `at` up to this far behind plays at once and counts `late`; older is dropped. */
export const LATE_OK_MS = 20;
export const HIT_LIFE_MS = 4000;
export const NOTE_LIFE_MS = 30000;
/** A stolen node gets `gate 0`, then `/n_free` this long after. */
export const STEAL_FREE_MS = 50;
/** A page that has said nothing for this long has its held notes released (`INSERT_HELD_MS`). */
export const QUIET_MS = 15000;
/** Above this average CPU, new hits and notes are refused. */
export const CPU_REFUSE = 70;
// Every class the compiler can emit, by hand, so a new one must be added on purpose (test.mjs goes
// red).
// why: lessons/rig-board-io.md#structural
export const STRUCTURAL = Object.freeze(['Control', 'LagControl', 'BinaryOpUGen', 'UnaryOpUGen', 'Out']);
// Core scsynth plugin classes for the grain ring; .sin and .cos are UnaryOpUGen.
// why: lessons/rig-board-io.md#allowed
export const ALLOWED_CLASSES = Object.freeze(new Set([...STRUCTURAL,
  'SinOsc', 'Saw', 'Pulse', 'LFSaw', 'LFTri', 'LFNoise1', 'WhiteNoise', 'LPF', 'HPF', 'RLPF', 'Pan2', 'EnvGen',
  'GrainBuf', 'BufWr', 'Phasor', 'SendReply', 'Impulse', 'Dust', 'TRand', 'In', 'BufFrames', 'BufDur',
  'DelayC', 'LocalIn', 'LocalOut']));
// BufWr is refused on the shared engine, where the buffers are the piano; on `own` it writes
// nothing.
// why: lessons/rig-board-io.md#shared-refused
export const SHARED_REFUSED = Object.freeze(['BufWr']);
export const ALLOWED_SHARED = Object.freeze(new Set([...ALLOWED_CLASSES].filter((c) => !SHARED_REFUSED.includes(c))));

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const nameOk = (n) => typeof n === 'string' && NAME_RE.test(n);
export const defName = (n) => `${PREFIX}${n}`;
/** The board's clock, which is the shared clock while it is in the room (§2.2). */
export const epochNow = () => performance.timeOrigin + performance.now();
const mtof = (n) => 440 * 2 ** ((n - 69) / 12);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Re-read the board's own bytes and check every block, guarding against a future compiler change.
// Returns {ok, blocks, classes} or {ok: false, reason}.
// why: lessons/rig-board-io.md#check-def
export function checkDef(bytes, { name, bus, allowed = ALLOWED_CLASSES, cap = BLOCK_CAP } = {}) {
  let r;
  try { r = readSynthDef(bytes); } catch (e) { return { ok: false, reason: `the compiled bytes do not read back: ${e.message}` }; }
  if (r.defs.length !== 1) return { ok: false, reason: `one definition expected, ${r.defs.length} found` };
  const d = r.defs[0];
  if (d.name !== name) return { ok: false, reason: `the definition is called ${d.name}, not ${name}` };
  if (d.blocks.length > cap) return { ok: false, reason: `${d.blocks.length} blocks, and this board takes ${cap}` };
  const bad = d.blocks.find((b) => !allowed.has(b.name));
  if (bad) return { ok: false, reason: `${bad.name} is not a class this board plays` };
  const outs = d.blocks.filter((b) => b.name === 'Out');
  if (!outs.length) return { ok: false, reason: 'nothing is written to an output' };
  for (const o of outs) {
    const first = o.inputs[0];
    if (!first || first.from !== -1 || d.constants[first.out] !== bus) {
      return { ok: false, reason: `an Out writes somewhere other than bus ${bus}` };
    }
  }
  return { ok: true, blocks: d.blocks.length, classes: [...new Set(d.blocks.map((b) => b.name))] };
}

/** One answer to `clock.ping`. `t1` is the board's epoch ms. */
export const clockPong = (msg, now = epochNow) => (Number.isFinite(msg?.t0) ? { t0: msg.t0, t1: now() } : null);

// A core packet to bytes; every packet is a bundle (tt null is immediately).
// why: lessons/rig-board-io.md#encode-packet
export const encodePacket = (p) => oscBundle(p.tt ?? [0, 1], p.msgs);

// Loads, hits and notes with no server or clock. o: send(packet), now, bus, allowed, nameOk, choke
// (the last three are sabotage hooks for tests).
// why: lessons/rig-board-io.md#core
export function createCollideCore({ send, now = epochNow, bus = PAGE_BUS, group = PAGE_GROUP, firstNode = FIRST_NODE,
  allowed = ALLOWED_CLASSES, nameOk: nameRule = nameOk, choke: chokeOn = true, log = () => {} } = {}) {
  /** name -> { name, def, sha, bytes, controls: Map, values: Map, gateUsed, freesItself, ampDefault } */
  const defs = new Map();
  /** id -> { id, name, kind: 'hit' | 'note', at, dieBy, by, note?, releasing, freeAt } in creation order */
  const live = new Map();
  /** `${name}:${note}` -> id */
  const held = new Map();
  /** from -> the last time that page said anything */
  const heard = new Map();
  let nextId = firstNode;
  let cpu = null;
  const stat = { loads: 0, started: 0, ended: 0, late: 0, droppedLate: 0, refused: 0, fails: 0, stolen: 0,
    expired: 0, chokes: 0, quietReleased: 0, reasons: {} };
  const refuse = (reason, extra = {}) => {
    stat.refused++;
    stat.reasons[reason] = (stat.reasons[reason] || 0) + 1;
    return { ok: false, reason, ...extra };
  };

  /** Validate and compile a load. Changes nothing until `commit`. */
  function load(msg = {}) {
    const { name, text, sha } = msg;
    if (!nameRule(name)) return refuse(`a name is ${NAME_RE.source}, and ${JSON.stringify(name)} is not one`);
    if (typeof text !== 'string') return refuse('send the program as text');
    if (text.length > TEXT_CAP) return refuse(`the program is ${text.length} characters and this board takes ${TEXT_CAP}`);
    if (!defs.has(name) && defs.size >= MAX_DEFS) {
      return refuse(`this board holds ${MAX_DEFS} programs and has ${defs.size}: ${[...defs.keys()].join(', ')}`);
    }
    const t0 = performance.now();
    // The bytes the TAB makes from the same text, at bus 0, under the page's
    // own name: what `same` compares against the page's own hash.
    const canon = compile(text, { name });
    if (!canon.ok) return refuse('it does not compile', { line: canon.line, col: canon.col, error: canon.message });
    const played = compile(text, { name: defName(name), bus });
    const compileMs = performance.now() - t0;
    if (!played.ok) return refuse('it does not compile', { line: played.line, col: played.col, error: played.message });
    const chk = checkDef(played.bytes, { name: defName(name), bus, allowed });
    if (!chk.ok) return refuse(chk.reason);
    const mine = sha256(canon.bytes);
    return {
      ok: true, name, def: defName(name), bytes: played.bytes.length, ugens: chk.blocks, classes: chk.classes,
      controls: played.controls.map((c) => ({ name: c.name, value: c.value })),
      freesItself: played.freesItself, gateUsed: played.gateUsed, warnings: played.warnings,
      compileMs: +compileMs.toFixed(2), sha: mine, same: typeof sha === 'string' ? sha === mine : null,
      recv: played.bytes,
    };
  }
  /** The server took the bytes (`/done /d_recv`): from now on the name plays them. */
  function commit(r) {
    const was = defs.get(r.name);
    defs.set(r.name, {
      name: r.name, def: r.def, sha: r.sha, bytes: r.recv,
      controls: new Map(r.controls.map((c) => [c.name, c.value])),
      values: was ? was.values : new Map(),
      gateUsed: r.gateUsed, freesItself: r.freesItself,
      ampDefault: r.controls.find((c) => c.name === 'amp')?.value ?? null,
    });
    stat.loads++;
  }

  /** `args` checked against the program's own controls. Returns `[k, v, ...]` or a reason. */
  function argsFor(d, args) {
    if (args == null) return [];
    if (typeof args !== 'object' || Array.isArray(args)) return 'args is an object of control names and numbers';
    const keys = Object.keys(args);
    if (keys.length > MAX_ARGS) return `at most ${MAX_ARGS} args`;
    const out = [];
    for (const k of keys) {
      if (!d.controls.has(k)) return `${k} is not a control of ${d.name}`;
      let v = Number(args[k]);
      if (typeof args[k] !== 'number' || !Number.isFinite(v)) return `${k} is not a finite number`;
      if (k === 'freq') v = clamp(v, 20, 20000);
      if (k === 'amp') v = clamp(v, 0, 1);
      out.push(k, v);
    }
    return out;
  }

  /** Where an `at` falls on the board's clock. */
  function place(at, t = now()) {
    if (at == null) return { tt: null, late: false };
    if (!Number.isFinite(at)) return { refuse: 'at is not a number' };
    const ahead = at - t;
    if (ahead > AHEAD_MAX_MS) return { refuse: `at is ${Math.round(ahead)} ms ahead and this board takes ${AHEAD_MAX_MS}` };
    if (ahead < -LATE_OK_MS) return { dropped: true };
    if (ahead < 0) return { tt: null, late: true };
    return { tt: ntpTimetag(at), late: false };
  }

  /** Past the cap the oldest node is released, `gate 0` now and `/n_free` shortly after. */
  function makeRoom(t) {
    const counted = () => [...live.values()].filter((n) => !n.releasing);
    const msgs = [];
    while (counted().length >= MAX_NODES) {
      const old = counted()[0];
      old.releasing = true; old.freeAt = t + STEAL_FREE_MS;
      if (old.kind === 'note') held.delete(`${old.name}:${old.note}`);
      msgs.push(['/n_set', old.id, 'gate', 0]);
      stat.stolen++;
    }
    if (msgs.length) send({ tt: null, msgs });
  }

  const cpuHigh = () => cpu && cpu.avg > CPU_REFUSE;

  function hit(msg = {}, { from = null } = {}) {
    if (from) heard.set(from, now());
    const hits = msg.hits;
    if (!Array.isArray(hits) || !hits.length) return { ok: false, played: 0, refused: [refuse('send hits: [{ name, at }]')] };
    if (hits.length > MAX_HITS) return { ok: false, played: 0, refused: [refuse(`at most ${MAX_HITS} hits a message`)] };
    if (cpuHigh()) return { ok: false, played: 0, refused: hits.map(() => refuse(`the engine is at ${cpu.avg.toFixed(0)} per cent`)) };
    const t = now();
    let played = 0;
    const refused = [];
    for (const h of hits) {
      const d = defs.get(h?.name);
      if (!d) { refused.push(refuse(`${h?.name} is not loaded`)); continue; }
      if (!d.freesItself) { refused.push(refuse(`${h.name} never frees itself, so a hit on it would never end`)); continue; }
      const w = place(h.at, t);
      if (w.refuse) { refused.push(refuse(w.refuse)); continue; }
      if (w.dropped) { stat.droppedLate++; continue; }
      const a = argsFor(d, h.args);
      if (typeof a === 'string') { refused.push(refuse(a)); continue; }
      let target = null;
      if (h.choke != null) {
        target = defs.get(h.choke);
        if (!target) { refused.push(refuse(`the choke ${h.choke} is not loaded`)); continue; }
      }
      if (w.late) stat.late++;
      makeRoom(t);
      const at = w.late || w.tt == null ? t : h.at;
      const msgs = [];
      if (target && chokeOn) {
        // Every live node of the choked program that started before this hit,
        // closed in the same bundle, so the choke and the hit share a sample.
        for (const n of live.values()) {
          if (n.name !== target.name || n.releasing || n.at > at) continue;
          msgs.push(['/n_set', n.id, 'gate', 0]);
          stat.chokes++;
        }
      }
      const id = nextId++;
      const vals = [...d.values].flat();
      msgs.push(['/s_new', d.def, id, 0, group, ...vals, ...a]);
      send({ tt: w.tt, msgs });
      live.set(id, { id, name: d.name, kind: 'hit', at, dieBy: at + HIT_LIFE_MS, by: from, releasing: false, freeAt: 0 });
      stat.started++;
      played++;
    }
    return { ok: refused.length === 0, played, refused };
  }

  function noteOn(msg = {}, { from = null } = {}) {
    if (from) heard.set(from, now());
    const d = defs.get(msg.name);
    if (!d) return refuse(`${msg.name} is not loaded`);
    const note = msg.note;
    if (!Number.isInteger(note) || note < 0 || note > 127) return refuse('not a note');
    const vel = clamp(Number.isFinite(msg.vel) ? msg.vel : 100, 1, 127);
    if (cpuHigh()) return refuse(`the engine is at ${cpu.avg.toFixed(0)} per cent`);
    const t = now();
    const w = place(msg.at, t);
    if (w.refuse) return refuse(w.refuse);
    if (w.dropped) { stat.droppedLate++; return { ok: false, dropped: true }; }
    if (w.late) stat.late++;
    const key = `${d.name}:${note}`;
    if (held.has(key)) noteOff({ name: d.name, note });
    makeRoom(t);
    const id = nextId++;
    const args = [];
    if (d.controls.has('freq')) args.push('freq', mtof(note));
    if (d.controls.has('gate')) args.push('gate', 1);
    if (d.ampDefault != null) args.push('amp', d.ampDefault * vel / 127);
    for (const [k, v] of d.values) args.push(k, v);
    send({ tt: w.tt, msgs: [['/s_new', d.def, id, 0, group, ...args]] });
    const at = w.tt ? msg.at : t;
    held.set(key, id);
    live.set(id, { id, name: d.name, kind: 'note', note, at, dieBy: at + NOTE_LIFE_MS, by: from, releasing: false, freeAt: 0 });
    stat.started++;
    return { ok: true, id, note, name: d.name };
  }

  function noteOff(msg = {}, { from = null } = {}) {
    if (from) heard.set(from, now());
    const d = defs.get(msg.name);
    const key = `${msg.name}:${msg.note}`;
    const id = held.get(key);
    if (!d || id == null) return { ok: true, held: false };
    held.delete(key);
    const n = live.get(id);
    // How a note is let go is the program's, as `collide-voice.mjs` decides: a
    // gate an EnvGen reads closes it, a program that never frees itself is cut,
    // and one that frees itself with no gate is left to end.
    if (d.gateUsed && d.freesItself) {
      send({ tt: null, msgs: [['/n_set', id, 'gate', 0]] });
      if (n) n.dieBy = Math.min(n.dieBy, now() + HIT_LIFE_MS);
    } else if (!d.freesItself) {
      send({ tt: null, msgs: [['/n_free', id]] });
      live.delete(id);
    }
    return { ok: true, held: true, id };
  }

  function set(msg = {}, { from = null } = {}) {
    if (from) heard.set(from, now());
    const d = defs.get(msg.name);
    if (!d) return refuse(`${msg.name} is not loaded`);
    if (!d.controls.has(msg.param) || msg.param === 'gate') return refuse(`${msg.param} is not a control a knob may set on ${msg.name}`);
    const a = argsFor(d, { [msg.param]: msg.value });
    if (typeof a === 'string') return refuse(a);
    d.values.set(msg.param, a[1]);
    const ids = [...live.values()].filter((n) => n.name === d.name && !n.releasing).map((n) => n.id);
    if (ids.length) send({ tt: null, msgs: ids.map((id) => ['/n_set', id, msg.param, a[1]]) });
    return { ok: true, name: d.name, param: msg.param, value: a[1], nodes: ids.length };
  }

  function panic() {
    send({ tt: null, msgs: [['/g_freeAll', group]] });
    const n = live.size;
    live.clear(); held.clear();
    return { ok: true, freed: n };
  }

  /** scsynth said a node is gone. */
  function ended(id) { if (live.delete(id)) stat.ended++; }
  /** scsynth refused something (a choke on a node that already freed itself, usually). */
  function failed() { stat.fails++; }

  /** Every 250 ms or so: overdue frees, stolen frees, quiet pages' held notes. */
  function sweep() {
    const t = now();
    const free = [];
    for (const n of [...live.values()]) {
      if ((n.releasing && n.freeAt <= t) || n.dieBy <= t) {
        if (!n.releasing) stat.expired++;
        free.push(['/n_free', n.id]);
        live.delete(n.id);
        if (n.kind === 'note') held.delete(`${n.name}:${n.note}`);
      }
    }
    if (free.length) send({ tt: null, msgs: free });
    for (const [key, id] of [...held]) {
      const n = live.get(id);
      if (!n?.by) continue;
      const last = heard.get(n.by) ?? n.at;
      if (t - last > QUIET_MS) { stat.quietReleased++; noteOff({ name: n.name, note: n.note }); }
    }
  }

  return {
    load, commit, hit, noteOn, noteOff, set, panic, ended, failed, sweep,
    touch: (from) => { if (from) heard.set(from, now()); },
    setCpu: (c) => { cpu = c; },
    has: (name) => defs.has(name),
    /** For a restart: every loaded program's bytes, to send again. */
    loaded: () => [...defs.values()].map((d) => ({ ...d, controls: new Map(d.controls), values: new Map(d.values) })),
    restore: (d) => { defs.set(d.name, d); },
    live: () => [...live.values()].map((n) => ({ ...n })),
    stats: () => ({
      defs: [...defs.keys()], live: [...live.values()].filter((n) => !n.releasing).length, held: held.size,
      ...stat, reasons: { ...stat.reasons }, cpu,
    }),
  };
}

// ── the service: the verbs, over a server that may or may not be up ─────────

const VERBS = new Set(['sc.load', 'sc.hit', 'sc.set', 'sc.stats', 'clock.ping']);
/** Is this message the collide engine's. */
export function isForCollide(msg) {
  if (!msg) return false;
  if (VERBS.has(msg.type)) return true;
  if ((msg.type === 'audio.start' || msg.type === 'audio.stop') && msg.source === 'collide') return true;
  return /^note\.(on|off|panic)$/.test(msg.type) && msg.node === 'collide';
}

// The verbs over a server from start({ engine, onLog, sampler }); fake-board.mjs passes a fake.
// A server is { ok, mode, port, bus, send, recv, onReply, cpu, stop, status }.
// why: lessons/rig-board-io.md#service
export function createCollideService({ engine = ENGINE, start = startScCollide, now = epochNow, log = () => {},
  sampler = () => null, onFrame = null, sweepMs = 250, cpuMs = 2000 } = {}) {
  let server = null, core = null, starting = null, timers = [], offReply = null, missedCpu = 0, restarts = 0;
  let loading = Promise.resolve();
  const early = { refused: 0 };

  function attach(s) {
    server = s;
    core = createCollideCore({ send: (p) => server?.send(encodePacket(p)), now, bus: s.bus ?? PAGE_BUS, log,
      allowed: s.mode === 'shared' ? ALLOWED_SHARED : ALLOWED_CLASSES });
    offReply = s.onReply((m) => {
      if (m.addr === '/n_end') core?.ended(m.args[0]);
      else if (m.addr === '/fail') core?.failed(m.args);
    });
    timers = [
      setInterval(() => core?.sweep(), sweepMs),
      setInterval(pollCpu, cpuMs),
    ];
    for (const t of timers) t.unref?.();
  }
  function detach() {
    for (const t of timers) clearInterval(t);
    timers = [];
    offReply?.(); offReply = null;
    const was = server;
    server = null; core = null;
    return was;
  }
  async function pollCpu() {
    if (!server || !core) return;
    const c = await server.cpu().catch(() => null);
    if (c) { missedCpu = 0; core?.setCpu(c); return; }
    // No `/status.reply` for two polls (more than 3 s) is a stuck DSP thread.
    // Its own server is killed and raised again with every program reloaded;
    // the sampler's is never touched from here.
    if (++missedCpu < 2 || engine.mode !== 'own') return;
    missedCpu = 0;
    log('the engine stopped answering /status, so it is being restarted', 'warn');
    const keep = core.loaded();
    detach()?.stop();
    const s = await start({ engine, onLog: log, sampler: sampler(), onFrame }).catch((e) => ({ ok: false, reason: e.message }));
    if (!s.ok) { log(`the restart failed: ${s.reason}`, 'bad'); return; }
    restarts++;
    attach(s);
    for (const d of keep) {
      // The bytes are the board's own and were checked when they were first
      // loaded, so they go back as they are, and the name plays them again.
      const ok = await server.recv(d.bytes);
      if (ok.ok) core.restore(d); else log(`${d.name} could not be put back after the restart`, 'bad');
    }
  }

  async function up() {
    if (server) return { ok: true, already: true };
    if (starting) return starting;
    starting = (async () => {
      const s = await start({ engine, onLog: log, sampler: sampler(), onFrame }).catch((e) => ({ ok: false, reason: e.message }));
      if (!s.ok) return s;
      attach(s);
      return { ok: true, already: false };
    })().finally(() => { starting = null; });
    return starting;
  }
  function down() {
    const was = detach();
    if (!was) return { ok: true, was: null };
    was.stop();
    return { ok: true, was: 'collide' };
  }

  const status = () => ({ ok: !!server, source: 'collide', engine: engine.mode, port: engine.port,
    up: !!server, restarts, ...(server ? server.status() : {}) });

  async function handle(msg, reply) {
    const from = msg.from ?? null;
    core?.touch(from);
    switch (msg.type) {
      case 'clock.ping': {
        const p = clockPong(msg, now);
        return p ? reply('clock.pong', p) : undefined;
      }
      case 'audio.start': {
        const r = await up();
        return reply('audio.started', r.ok ? { ...status(), already: r.already } : { ok: false, source: 'collide', reason: r.reason, engine: engine.mode });
      }
      case 'audio.stop':
        return reply('audio.stopped', { ...down(), source: 'collide' });
      case 'sc.load': {
        if (!core) return reply('sc.loaded', { ok: false, name: msg.name, reason: 'the collide engine is not running, send audio.start {source: "collide"} first' });
        const r = core.load(msg);
        if (!r.ok) return reply('sc.loaded', { ...r, name: msg.name });
        // One load at a time: scsynth's `/done /d_recv` names no definition,
        // so two in flight could not be told apart.
        const run = loading.then(async () => {
          const t = performance.now();
          const got = await server.recv(r.recv);
          if (!got.ok) return { ok: false, name: r.name, reason: `scsynth did not take it: ${got.reason ?? 'no answer'}` };
          core.commit(r);
          const { recv, ...body } = r;
          return { ...body, loadMs: +(performance.now() - t).toFixed(1) };
        });
        loading = run.catch(() => {});
        return reply('sc.loaded', await run);
      }
      case 'sc.hit':
        if (!core) { early.refused++; return undefined; }
        core.hit(msg, { from });
        return undefined;
      case 'sc.set':
        return reply('sc.set', core ? core.set(msg, { from }) : { ok: false, reason: 'the collide engine is not running' });
      case 'sc.stats':
        return reply('sc.stats', { ...status(), ...(core ? core.stats() : { defs: [], live: 0 }), refusedWhileDown: early.refused });
      case 'note.on': {
        if (!core) return reply('note.ack', { node: 'collide', note: msg.note, dropped: true, reason: 'the collide engine is not running' });
        return reply('note.ack', { node: 'collide', ...core.noteOn(msg, { from }) });
      }
      case 'note.off':
        return reply('note.ack', { node: 'collide', note: msg.note, ...(core ? core.noteOff(msg, { from }) : {}) });
      case 'note.panic':
        return reply('note.ack', { node: 'collide', panic: true, ...(core ? core.panic() : {}) });
      default:
        return undefined;
    }
  }

  return {
    handles: isForCollide, handle, status, stop: down,
    /** The sampler went away. On a shared server the collide engine went with it. */
    samplerGone() { if (engine.mode === 'shared' && server) { detach(); log('the sampler stopped, and the collide programs were on its server'); } },
    core: () => core,
  };
}

// The server, on the board.
// why: lessons/rig-board-io.md#server-banner

const HERE = new URL('.', import.meta.url).pathname;
export const COLLIDE_SCD = join(HERE, 'norns', 'poscollide-defs.scd');
const sh = (cmd) => { try { return execFileSync('bash', ['-c', cmd], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch { return ''; } };
const have = (bin) => !!sh(`command -v ${bin}`).trim();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const collideAvailable = () => have('scsynth') && have('sclang') && have('jackd') && existsSync(COLLIDE_SCD);

/** sclang writes the limiter def, only when it is missing or older than the script. */
async function ensureLimiterDef(onLog) {
  const file = join(DEF_DIR, `${LIMITER_DEF}.scsyndef`);
  const scdAt = statSync(COLLIDE_SCD).mtimeMs;
  if (existsSync(file) && statSync(file).mtimeMs >= scdAt) return { ok: true, file, compiled: false };
  const t0 = Date.now();
  const p = spawn('sclang', [COLLIDE_SCD], {
    env: { ...process.env, POS_DEFDIR: DEF_DIR, XDG_RUNTIME_DIR: '/tmp/rt', QT_QPA_PLATFORM: 'offscreen', QTWEBENGINE_DISABLE_SANDBOX: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let said = '';
  p.stdout.on('data', (d) => { said += d; });
  p.stderr.on('data', (d) => { said += d; });
  const done = await Promise.race([new Promise((r) => p.on('exit', () => r(true))), wait(120000).then(() => false)]);
  if (!done) { try { p.kill('SIGKILL'); } catch { /* gone */ } }
  const ok = existsSync(file) && statSync(file).mtimeMs >= scdAt && /POSCOLLIDE DEFS WRITTEN/.test(said);
  onLog?.(ok ? `wrote ${LIMITER_DEF} in ${Date.now() - t0} ms` : `sclang did not write ${LIMITER_DEF}: ${said.trim().split('\n').slice(-3).join(' / ')}`);
  return { ok, file, compiled: true };
}

// Raise the chosen engine with the page group and the limiter; a server or {ok: false, reason}.
// why: lessons/rig-board-io.md#start
export async function startScCollide({ engine = ENGINE, onLog, onFrame, sampler = null } = {}) {
  const t0 = Date.now();
  if (engine.mode === 'shared' && !sampler?.osc) {
    return { ok: false, reason: 'shared mode plays on the sampler\'s server, so start it first: audio.start {source: "sampler"}' };
  }
  if (!collideAvailable()) return { ok: false, reason: 'scsynth, sclang, jackd or the limiter script is not on this board' };
  const lim = await ensureLimiterDef(onLog);
  if (!lim.ok) return { ok: false, reason: `the ${LIMITER_DEF} SynthDef could not be written` };

  let proc = null, udp = null, sendBuf, onReplyFn, stopping = false;
  const readers = new Set();
  if (engine.mode === 'shared') {
    sendBuf = (b) => sampler.osc.send(b);
    onReplyFn = (fn) => sampler.osc.onReply(fn);
  } else {
    const j = await ensureJackd({ onLog });
    if (!j.ok) return { ok: false, reason: j.reason };
    sh(`pgrep -ax scsynth | awk '/-u ${engine.port}( |$)/{print $1}' | xargs -r kill -9`);
    proc = spawn('scsynth', scsynthArgs({ port: engine.port, client: engine.client }), { env: { ...process.env, ...SC_ENV }, stdio: ['ignore', 'pipe', 'pipe'] });
    let ready = false;
    const hear = (d) => {
      for (const line of String(d).split('\n').map((x) => x.trim()).filter(Boolean)) {
        if (/server ready/.test(line)) ready = true;
        if (/^Cannot lock down|LADSPA|couldn't connect .* to posnothing/.test(line)) continue;
        onLog?.(`scsynth: ${line}`);
      }
    };
    proc.stdout.on('data', hear); proc.stderr.on('data', hear);
    proc.on('exit', (code, sig) => { if (!stopping) onLog?.(`scsynth exited (${sig ?? code}), the collide engine is no longer making sound`); });
    for (let i = 0; i < 60 && !ready; i++) await wait(100);
    if (!ready) { try { proc.kill('SIGKILL'); } catch { /* gone */ } return { ok: false, reason: 'scsynth did not say it was ready within six seconds' }; }
    udp = createSocket('udp4');
    await new Promise((r) => udp.bind(0, '127.0.0.1', r));
    udp.on('message', (b) => { let m; try { m = readOsc(b); } catch { return; } for (const fn of readers) fn(m); });
    sendBuf = (b) => udp.send(b, 0, b.length, engine.port, '127.0.0.1');
    onReplyFn = (fn) => { readers.add(fn); return () => readers.delete(fn); };
  }

  const ask = (buf, match, ms = 4000) => new Promise((resolve) => {
    let off = null;
    const timer = setTimeout(() => { off?.(); resolve(null); }, ms);
    off = onReplyFn((m) => { if (match(m)) { clearTimeout(timer); off?.(); resolve(m); } });
    sendBuf(buf);
  });
  const stop = () => {
    stopping = true;
    try { sendBuf(oscMessage('/g_freeAll', [PAGE_GROUP])); sendBuf(oscMessage('/n_free', [LIMITER_NODE])); } catch { /* gone */ }
    if (engine.mode === 'own') {
      setStandingRows('collide', []);
      // The same stop as `scsampler.mjs`'s, for the same measured reason.
      const quit = oscMessage('/quit');
      try { udp.send(quit, 0, quit.length, engine.port, '127.0.0.1', () => { try { udp.close(); } catch { /* closed */ } }); }
      catch { try { udp.close(); } catch { /* closed */ } }
      setTimeout(() => { if (proc.exitCode === null && proc.signalCode === null) { try { proc.kill('SIGKILL'); } catch { /* gone */ } } }, QUIT_GRACE_MS).unref?.();
      return releaseCapture('collide');
    }
    return true;
  };

  if (engine.mode === 'own') await ask(oscMessage('/notify', [1]), (m) => m.addr === '/done' && m.args[0] === '/notify');
  const dl = await ask(oscMessage('/d_load', [lim.file]), (m) => (m.addr === '/done' || m.addr === '/fail') && m.args[0] === '/d_load');
  if (!dl || dl.addr !== '/done') { stop(); return { ok: false, reason: `scsynth did not load ${LIMITER_DEF}` }; }
  // The page group at the head of the server, the limiter straight after it.
  sendBuf(oscMessage('/g_new', [PAGE_GROUP, 0, 0]));
  sendBuf(oscMessage('/s_new', [LIMITER_DEF, LIMITER_NODE, 3, PAGE_GROUP, 'in', PAGE_BUS, 'fold', FOLD, 'level', LIMIT_LEVEL]));

  let wired = null;
  if (engine.mode === 'own') {
    await ensureCapture('collide', { onFrame, onLog });
    const rows = jackRows(JACK_ENDS.collide, JACK_ENDS.capture).rows;
    setStandingRows('collide', rows);
    wired = wire({ v: 1, links: rows }, { onLog, what: 'collide into the capture' }).ok;
  }
  onLog?.(`collide engine up on ${engine.mode === 'own' ? `its own scsynth, UDP ${engine.port}` : `the sampler's scsynth, UDP ${engine.port}`} in ${Date.now() - t0} ms`);

  return {
    ok: true, mode: engine.mode, port: engine.port, bus: PAGE_BUS,
    send: sendBuf,
    onReply: onReplyFn,
    /** `/d_recv` and wait for scsynth's own `/done` (or `/fail`). */
    async recv(bytes) {
      const m = await ask(oscMessage('/d_recv', [bytes]), (x) => (x.addr === '/done' || x.addr === '/fail') && x.args[0] === '/d_recv');
      return m?.addr === '/done' ? { ok: true } : { ok: false, reason: m ? m.args.slice(1).join(' ') : 'no answer in 4 s' };
    },
    async cpu() {
      const m = await ask(oscMessage('/status'), (x) => x.addr === '/status.reply', 1500);
      return m ? { ugens: m.args[1], synths: m.args[2], avg: +m.args[5].toFixed(2), peak: +m.args[6].toFixed(2) } : null;
    },
    stop,
    status: () => ({ pid: proc?.pid ?? null, client: engine.client, jack: engine.mode === 'own' ? JACK_ENDS.collide : JACK_ENDS.sampler,
      wired, upMs: Date.now() - t0 }),
  };
}

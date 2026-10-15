// rig/board/sequencer.mjs: the board's own step sequencer (plans/plan-pi-sequencer.md, clock stage 1).
// The Pi's clock only: every step's time is computed from a bar origin, never accumulated; a note off
// follows at half a step; a new pattern or tempo lands on the next bar. No MIDI clock, start or stop.
// why: lessons/rig-board-sequencer.md#header

import { normalizePattern, notesAt, stepMs as stepMsOf } from '../../demo/shell/drum-pattern.mjs';
import { createBay, printLink } from '../../demo/shell/bay.mjs';
import { boardPort } from '../../demo/shell/graph-registry.mjs';

const LATE_KEEP = 512;

/** p50, p99 and the worst of a list of ms, rounded to 0.01. */
export function spread(xs) {
  if (!xs.length) return { n: 0, p50: null, p99: null, max: null };
  const s = [...xs].sort((a, b) => a - b), at = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  const r = (x) => Math.round(x * 100) / 100;
  return { n: s.length, p50: r(at(0.5)), p99: r(at(0.99)), max: r(s[s.length - 1]) };
}

/**
 * The engine, with its clock injected so a test can run it on a fake one.
 * `emit(ev)` gets `{ cls: 'note', ch: 10, d1, d2, at }` (a note off has `d2: 0, off: true`) and, on
 * stop, `{ cls: 'cc', ch: 10, d1: 123, d2: 0 }`. `onStep({ step, bar, at, late })` after each step.
 * @param {object} o
 * @param {() => number} o.now              ms, monotonic
 * @param {(fn: Function, ms: number) => any} o.setTimer
 * @param {(t: any) => void} o.clearTimer
 * @param {(ev: object) => void} o.emit
 * @param {number} [o.leadMs]   how far after `start` the first step sounds
 * @param {number} [o.vel]      every note's velocity; the browser drum machine sends 100
 */
export function createSequencer({ now, setTimer, clearTimer, emit, onStep = () => {}, leadMs = 20, vel = 100, ch = 10 }) {
  let pattern = null, pending = null, running = false, timer = null;
  // The clock: `epoch` is the start of bar 0 at the current tempo, `bars` counts bars since it.
  let epoch = 0, bars = 0, step = 0, ms = stepMsOf(120);
  let offs = [];                       // [{ at, notes }] note offs not yet sent, oldest first
  const late = [];
  const n = { on: 0, off: 0, cc: 0, steps: 0, skipped: 0, bars: 0 };
  let lastStep = -1;

  /** When step `i` of the current bar sounds. Computed, never added up. */
  const timeOf = (i) => epoch + bars * (ms * pattern.steps) + i * ms;

  function set(p) {
    const v = normalizePattern(p);
    if (!v.ok) return v;
    if (running) pending = v.pattern; else { pattern = v.pattern; ms = stepMsOf(pattern.bpm); }
    return { ok: true, pending: running };
  }

  function arm() {
    if (!running) return;
    const nextOn = timeOf(step);
    const due = offs.length ? Math.min(offs[0].at, nextOn) : nextOn;
    timer = setTimer(fire, Math.max(0, due - now()));
  }

  function fire() {
    timer = null;
    if (!running) return;
    const t = now();
    while (offs.length && offs[0].at <= t) {
      for (const d1 of offs.shift().notes) { emit({ cls: 'note', ch, d1, d2: 0, off: true, at: t }); n.off++; }
    }
    const at = timeOf(step);
    if (at <= t) {
      const lateMs = t - at;
      late.push(lateMs); if (late.length > LATE_KEEP) late.shift();
      // A step more than half a step late is skipped, never sent late.
      if (lateMs > ms / 2) n.skipped++;
      else {
        const notes = notesAt(pattern, step);
        for (const d1 of notes) { emit({ cls: 'note', ch, d1, d2: vel, at }); n.on++; }
        if (notes.length) offs.push({ at: at + ms / 2, notes });
      }
      n.steps++;
      lastStep = step;
      onStep({ step, bar: n.bars, at, late: lateMs });
      step++;
      if (step >= pattern.steps) {
        step = 0; n.bars++;
        // The next bar starts where this tempo puts it; a change moves the epoch there.
        const nextBar = epoch + (bars + 1) * (ms * pattern.steps);
        if (pending) {
          pattern = pending; pending = null;
          const was = ms; ms = stepMsOf(pattern.bpm);
          if (ms !== was) { epoch = nextBar; bars = 0; } else bars++;
        } else bars++;
      }
    }
    arm();
  }

  function start(p) {
    if (p) { const v = set(p); if (!v.ok) return v; }
    if (pending) { pattern = pending; pending = null; ms = stepMsOf(pattern.bpm); }
    if (!pattern) return { ok: false, why: 'there is no pattern yet, send one first' };
    if (running) return { ok: true, already: true };
    running = true; epoch = now() + leadMs; bars = 0; step = 0; offs = []; n.bars = 0;
    arm();
    return { ok: true };
  }

  /** Every note that is on, off; then all notes off on the drum channel. */
  function stop() {
    const was = running;
    running = false;
    if (timer !== null) { clearTimer(timer); timer = null; }
    const t = now();
    for (const o of offs) for (const d1 of o.notes) { emit({ cls: 'note', ch, d1, d2: 0, off: true, at: t }); n.off++; }
    offs = [];
    emit({ cls: 'cc', ch, d1: 123, d2: 0, at: t }); n.cc++;
    if (pending) { pattern = pending; pending = null; ms = stepMsOf(pattern.bpm); }
    step = 0; lastStep = -1;
    return { ok: true, was };
  }

  return {
    set, start, stop,
    running: () => running,
    pattern: () => pattern,
    pending: () => pending,
    step: () => lastStep,
    stepMs: () => ms,
    epoch: () => epoch,
    status: () => ({ running, bpm: pattern?.bpm ?? null, step: lastStep, bar: n.bars, rows: pattern?.rows.length ?? 0,
      pending: !!pending, counts: { ...n }, late: spread(late) }),
  };
}

/**
 * The board's verbs around one sequencer: `seq.pattern`, `seq.start`, `seq.stop`, `seq.status`, each
 * answered `seq.state`. Notes leave by a bay link `pi-1:sequencer:midi-out -> pi-1:circuit:midi-in
 * { drummap circuit }`, made against the board's own graph, so the port's consent and map apply.
 * @param {object} o
 * @param {() => object|null} o.graph   the board's graph (beat.mjs `graphOf`), null before the hello
 * @param {(bytes: number[], why: (w: string) => void) => void} o.midiSend  into the Circuit's gate
 * @param {(steps: object) => void} [o.screen]  panel.steps, while running
 * why: lessons/rig-board-sequencer.md#service
 */
export function createSequencerService({ graph, midiSend, screen = () => {}, log = () => {}, target = 'circuit',
  now = () => performance.now(), setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (t) => clearTimeout(t) }) {
  const SEQ = boardPort('sequencer', 'midi-out'), TO = boardPort(target, 'midi-in');
  let bay = null, linkWhy = '', delivered = 0, refused = 0, lastRefusal = '';
  let look = { empty: 'dot', head: 'frame' }, shorts = null, startedBy = null;

  /** The board's own bay: the two nodes from its graph and the one link. Rebuilt when it is missing. */
  function wire() {
    if (bay && bay.links().length) return true;
    const g = graph();
    if (!g) { linkWhy = 'the board has not said what it is yet'; return false; }
    bay = createBay();
    for (const nd of g.nodes) bay.addNode({ id: nd.id, kind: nd.kind, label: nd.label, place: nd.place });
    for (const p of g.ports) {
      if (p.id !== SEQ && p.id !== TO) continue;
      bay.addPort({ ...p, ...(p.id === TO ? { deliver: (ev) => out(ev) } : {}) });
    }
    const r = bay.link(SEQ, TO, [{ op: 'drummap', name: target }]);
    linkWhy = r.ok ? '' : `${r.why} ${r.fix || ''}`.trim();
    if (!r.ok) log(`sequencer: ${SEQ} -> ${TO} refused: ${linkWhy}`);
    return r.ok;
  }

  /** A bay event as bytes into the Circuit's gate. Notes and CC only; the gate refuses the rest. */
  function out(ev) {
    const c = (ev.ch - 1) & 0x0F;
    const bytes = ev.cls === 'note'
      ? (ev.off || !ev.d2 ? [0x80 | c, ev.d1, 0] : [0x90 | c, ev.d1, ev.d2])
      : ev.cls === 'cc' ? [0xB0 | c, ev.d1, ev.d2] : null;
    if (!bytes) { refused++; lastRefusal = `${ev.cls} is not sent by the sequencer`; return; }
    delivered++;
    midiSend(bytes, (why) => { refused++; lastRefusal = why; });
  }

  const core = createSequencer({
    now, setTimer, clearTimer,
    emit: (ev) => { if (bay) bay.send(SEQ, ev); },
    onStep: ({ step }) => screen(stepsFor(step, true)),
  });

  function stepsFor(step, playing) {
    const p = core.pattern();
    if (!p) return null;
    return { voices: p.rows.map((r, i) => String(shorts?.[i] ?? r.voice.slice(0, 2).toUpperCase()).slice(0, 2)),
      pattern: p.rows.map((r) => r.steps), step, voice: -1, playing, look };
  }

  function state(extra = {}) {
    const L = bay?.links()[0];
    return { ok: true, ...core.status(), target, link: L ? printLink(L) : null, why: linkWhy || undefined,
      linked: L?.sent ?? 0, dropped: L?.dropped ?? 0, delivered, refused, lastRefusal: lastRefusal || undefined,
      pattern: core.pattern(), startedBy, ...extra };
  }

  function take(msg) {
    if (msg.screen && typeof msg.screen === 'object') {
      if (Array.isArray(msg.screen.voices)) shorts = msg.screen.voices.slice(0, 16).map((v) => String(v).slice(0, 2));
      if (msg.screen.look && typeof msg.screen.look === 'object') look = { empty: String(msg.screen.look.empty ?? 'dot'), head: String(msg.screen.look.head ?? 'frame') };
    }
    return msg.pattern ? core.set(msg.pattern) : { ok: true };
  }

  return {
    core,
    handles: (msg) => typeof msg?.type === 'string' && /^seq\.(pattern|start|stop|status)$/.test(msg.type),
    async handle(msg, reply) {
      switch (msg.type) {
        case 'seq.pattern': {
          const v = take(msg);
          if (!v.ok) return reply('seq.state', state({ ok: false, why: v.why }));
          if (!core.running()) { const s = stepsFor(-1, false); if (s) screen(s); }
          return reply('seq.state', state({ landed: v.pending ? 'on the next bar' : 'now' }));
        }
        case 'seq.start': {
          const v = take(msg);
          if (!v.ok) return reply('seq.state', state({ ok: false, why: v.why }));
          if (!wire()) return reply('seq.state', state({ ok: false, why: linkWhy }));
          const r = core.start();
          if (!r.ok) return reply('seq.state', state({ ok: false, why: r.why }));
          if (!r.already) { startedBy = msg.from ?? null; log(`sequencer: started at ${core.pattern().bpm} bpm into ${TO}, by ${startedBy ?? 'nobody named'}`); }
          return reply('seq.state', state());
        }
        case 'seq.stop': {
          const r = core.stop();
          const s = stepsFor(-1, false); if (s) screen(s);
          if (r.was) log(`sequencer: stopped, ${core.status().counts.on} notes sent`);
          return reply('seq.state', state());
        }
        case 'seq.status': return reply('seq.state', state());
        default: return undefined;
      }
    },
    status: state,
    stop: () => core.stop(),
  };
}

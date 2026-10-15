// rig/board/circuit-drums.mjs: the Circuit's drums play the Pi's SuperCollider drums, read by the board.
// One link in the board's own bay, `pi-1:circuit:midi-out -> pi-1:drums:midi-in { drummap circuit }`,
// and the Circuit's clock moving a 16 step grid on the Pi's screen. Nothing is written to the Circuit.
// why: lessons/rig-board-circuit-drums.md#header

import { createBay, printLink } from '../../demo/shell/bay.mjs';
import { boardPort } from '../../demo/shell/graph-registry.mjs';
import { GM_VOICES } from '../../demo/shell/drum-maps.mjs';
import { createMidiParser } from './midi-back.mjs';
import { eventOfBytes } from './keyboard.mjs';
import { spread } from './sequencer.mjs';

/** MIDI clock: 24 a quarter note, so 6 a 16th step; a bar is 16 steps. */
export const TICKS_PER_STEP = 6, STEPS = 16;
/** The grid's rows, as General MIDI notes after the map: drum 1 to 4 of the Circuit. */
export const ROWS = Object.freeze([36, 38, 42, 46]);
/** The drum voice each row plays on the board (`demo/drums/voices.mjs` names, `GM_VOICES` keys). */
export const VOICE_OF = Object.freeze(Object.fromEntries(ROWS.map((n) => [n, Object.keys(GM_VOICES).find((k) => GM_VOICES[k].note === n)])));
const LAT_KEEP = 512, BPM_TICKS = 96;

/**
 * The grid, pure: `tick()`, `start()`, `stop()`, `cont()` from the clock bytes, `hit(row)` from a note.
 * A step entered is cleared before its hits land, so each square holds the last bar's hit there.
 * Before a Start is heard, the first hit is step 0. A hit in the second half of a step lands on the next.
 * why: lessons/rig-board-circuit-drums.md#grid
 */
export function createClockGrid({ rows = ROWS.length, steps = STEPS, tps = TICKS_PER_STEP } = {}) {
  const span = steps * tps;
  let tick = -1, step = 0, playing = null, aligned = null;
  const cells = Array.from({ length: rows }, () => new Array(steps).fill(false));
  const pending = new Map();
  const n = { ticks: 0, starts: 0, stops: 0, continues: 0, hits: 0, steps: 0, early: 0 };
  const clear = () => { for (const r of cells) r.fill(false); pending.clear(); };
  function enter(st) {
    for (const r of cells) r[st] = false;
    for (const r of pending.get(st) || []) cells[r][st] = true;
    pending.delete(st);
    n.steps++;
  }
  return {
    /** One clock tick. True when the running step moved. */
    tick() {
      n.ticks++;
      if (playing === false) return false;
      tick = (tick + 1) % span;
      const st = Math.floor(tick / tps);
      if (st === step) return false;
      step = st; enter(st);
      return true;
    },
    start() { n.starts++; playing = true; aligned = 'start'; tick = -1; step = 0; clear(); },
    stop() { n.stops++; playing = false; },
    cont() { n.continues++; playing = true; },
    /** A hit on `row`; answers the step it lit. */
    hit(row) {
      if (!Number.isInteger(row) || row < 0 || row >= rows) return -1;
      n.hits++;
      if (aligned === null) { aligned = 'first hit'; tick = 0; step = 0; clear(); }
      if (playing !== false && tick >= 0 && tick % tps >= tps / 2) {
        const st = (step + 1) % steps;
        if (!pending.has(st)) pending.set(st, new Set());
        pending.get(st).add(row);
        n.early++;
        return st;
      }
      cells[row][step] = true;
      return step;
    },
    view: () => ({ pattern: cells.map((r) => r.map((x) => (x ? '1' : '0')).join('')), step, playing, aligned, tick }),
    counts: () => ({ ...n }),
  };
}

/**
 * The board's verbs around the link: `cdrums.link`, `cdrums.unlink`, `cdrums.status`, each answered
 * `cdrums.state`. The Circuit's out is read only while the link is held (`tap`).
 * @param {object} o
 * @param {() => object|null} o.graph   the board's graph (beat.mjs `graphOf`)
 * @param {(fn: (bytes: Uint8Array, readAt: number) => void) => (null | (() => void))} o.tap  the Circuit input's out
 * @param {(name: string) => { ok: boolean, why?: string }} o.hit  one drum on the board's SuperCollider, now
 * @param {(steps: object) => void} [o.screen]  panel.steps
 * why: lessons/rig-board-circuit-drums.md#service
 */
export function createCircuitDrumsService({ graph, tap, hit, screen = () => {}, log = () => {},
  source = 'circuit', target = 'drums', now = () => performance.now() }) {
  const SRC = boardPort(source, 'midi-out'), TO = boardPort(target, 'midi-in');
  let bay = null, untap = null, linkWhy = '', parser = createMidiParser(), grid = createClockGrid();
  const n = { read: 0, notes: 0, played: 0, refused: 0, offs: 0, sysex: 0 };
  const reasons = {};
  const lat = [], tickAt = [];
  let lastRefusal = '', heldBy = null;

  /** The board's own bay: the Circuit's out, the drums' in, the one link. */
  function wire() {
    const g = graph();
    if (!g) return 'the board has not said what it is yet';
    const a = g.ports.find((p) => p.id === SRC), b = g.ports.find((p) => p.id === TO);
    if (!a) return `${SRC} is not on this board: is the Circuit plugged in?`;
    if (!b) return `${TO} is not on this board: is SuperCollider installed?`;
    const next = createBay();
    const ends = [SRC, TO].map((id) => id.split(':').slice(0, 2).join(':'));
    for (const nd of g.nodes) if (ends.includes(nd.id)) next.addNode(nd);
    next.addPort(a);
    next.addPort({ ...b, deliver: (ev, l, meta) => play(ev, meta) });
    const r = next.link(SRC, TO, [{ op: 'drummap', name: source }]);
    if (!r.ok) return `${r.why} ${r.fix || ''}`.trim();
    bay = next;
    return '';
  }

  const draw = () => {
    const v = grid.view();
    screen({ voices: ['KI', 'SN', 'CH', 'OH'], pattern: v.pattern, step: v.step, voice: -1, playing: v.playing !== false,
      look: { empty: 'dot', head: 'frame' } });
  };

  /** A General MIDI drum note that crossed the link: one hit on the board, one square on the grid. */
  function play(ev, meta) {
    if (ev.cls !== 'note') return;
    if (ev.off || !ev.d2) { n.offs++; return; }
    const row = ROWS.indexOf(ev.d1), name = VOICE_OF[ev.d1];
    if (row < 0 || !name) return;
    const r = hit(name);
    if (r?.ok) {
      n.played++;
      if (Number.isFinite(meta?.readAt)) { lat.push(now() - meta.readAt); if (lat.length > LAT_KEEP) lat.shift(); }
    } else {
      n.refused++;
      lastRefusal = r?.why || 'refused';
      reasons[lastRefusal] = (reasons[lastRefusal] || 0) + 1;
    }
    grid.hit(row);
    meta.dirty.v = true;
  }

  /** One chunk off the Circuit: clock bytes move the grid, every other message goes along the link. */
  function data(bytes, readAt) {
    const dirty = { v: false };
    for (const b of bytes) {
      if (b === 0xF8) { if (grid.tick()) dirty.v = true; tickAt.push(readAt); if (tickAt.length > BPM_TICKS) tickAt.shift(); continue; }
      if (b === 0xFA) { grid.start(); dirty.v = true; continue; }
      if (b === 0xFB) { grid.cont(); continue; }
      if (b === 0xFC) { grid.stop(); dirty.v = true; continue; }
      if (b >= 0xF8) continue;
      if (b === 0xF0) n.sysex++;
      for (const m of parser.feed([b])) {
        n.read++;
        const ev = eventOfBytes(m);
        if (!ev || !bay) continue;
        if (ev.cls === 'note' && !ev.off && ev.ch === 10) n.notes++;
        bay.send(SRC, ev, { readAt, dirty });
      }
    }
    if (dirty.v) draw();
  }

  /** Beats a minute from the clock ticks of about the last four beats, or null. */
  function bpm() {
    if (tickAt.length < 25) return null;
    const dt = tickAt[tickAt.length - 1] - tickAt[0];
    return dt > 0 ? Math.round((60000 * (tickAt.length - 1)) / (24 * dt) * 10) / 10 : null;
  }

  function state(extra = {}) {
    const L = bay?.links()[0], v = grid.view(), g = grid.counts();
    return { ok: true, held: !!bay, link: L ? printLink(L) : null, reading: !!untap, why: linkWhy || undefined,
      counts: { ...n, dropped: L?.dropped ?? 0 }, reasons: { ...reasons }, lastRefusal: lastRefusal || undefined,
      lat: spread(lat), clock: { bpm: bpm(), playing: v.playing, aligned: v.aligned, step: v.step, ...g },
      grid: v.pattern, heldBy, ...extra };
  }

  function unlink(why) {
    if (!bay) return false;
    const L = bay.links()[0];
    try { untap?.(); } catch { /* the input went away */ }
    untap = null; bay = null; heldBy = null;
    const v = grid.view();
    screen({ voices: ['KI', 'SN', 'CH', 'OH'], pattern: v.pattern, step: -1, voice: -1, playing: false, look: { empty: 'dot', head: 'frame' } });
    log(`circuit drums: ${L ? printLink(L) : SRC} removed, ${why}`);
    return true;
  }

  return {
    handles: (msg) => typeof msg?.type === 'string' && /^cdrums\.(link|unlink|status)$/.test(msg.type),
    async handle(msg, reply) {
      switch (msg.type) {
        case 'cdrums.link': {
          if (bay) return reply('cdrums.state', state({ already: true }));
          linkWhy = wire();
          if (linkWhy) { log(`circuit drums: ${SRC} -> ${TO} refused: ${linkWhy}`); return reply('cdrums.state', state({ ok: false })); }
          const u = tap((bytes, readAt) => data(bytes, readAt));
          if (!u) { bay = null; linkWhy = 'this board has no circuit input with MIDI to read'; return reply('cdrums.state', state({ ok: false })); }
          untap = u; parser = createMidiParser(); grid = createClockGrid(); tickAt.length = 0;
          heldBy = msg.from ?? null;
          log(`circuit drums: ${printLink(bay.links()[0])} held, by ${heldBy ?? 'nobody named'}`);
          draw();
          return reply('cdrums.state', state());
        }
        case 'cdrums.unlink': unlink('asked'); linkWhy = ''; return reply('cdrums.state', state());
        case 'cdrums.status': return reply('cdrums.state', state());
        default: return undefined;
      }
    },
    /** While held, the board's screen is this grid's. */
    held: () => !!bay,
    /** For the beat: whether the link is held, and what has gone through it. */
    beat: () => ({ held: !!bay, played: n.played, refused: n.refused, bpm: bpm() }),
    status: state,
    /** For a test: feed bytes as if read off the Circuit. */
    feed: (bytes, readAt = now()) => data(bytes, readAt),
    stop() { unlink('the board is stopping'); },
  };
}

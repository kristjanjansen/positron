// demo/concepts/rhythm/drum-machine.mjs: the drum machine /concepts/rhythm/000/
// and /concepts/rhythm/010/ are built from. A page mounts the shell and calls
// `createDrumMachine(d, { voices })`, and gets the glued transport and grid,
// the patchbay, and, when the voices carry a parameter (010), one row of knobs,
// each knob a bay node `web:knob-<name>` with a value wire into its drum.
//
// A drum machine as a patchbay: a 16 step by 4 row grid, a sequencer that
// sends each hit as a MIDI note, and four SuperCollider voices (kick, snare,
// open hat, closed hat), each a node of its own on the bay. Asked 2026-10-12
// (BACKLOG, "A rhythm concept group"): *"make new grpup concept rythm. make a
// 16 x 4 grid pad componetn (global one), 4 sc (or fau?) synths for kick
// snare hho hhc and patchbay. 000"*.
//
// THE GRID IS THE KIT'S `createStepGrid`, the one /tom/ and /kit/devices/
// use, with its rows named. Its label column used to be a fixed 22 px, which
// cut every name past two letters; `shell.css` now sizes it to the widest
// label with 22 px as the floor, so every numbered grid is unchanged.
//
// EVERY HIT CROSSES A WIRE. The sequencer has one `midi-out` and sends General
// MIDI drum notes on channel 10 (36 kick, 38 snare, 46 open hat, 42 closed
// hat). Each voice is linked to it through a `range` transform that lets its
// own note through and nothing else, so the patchbay shows four wires, each
// carrying one drum. Take a wire away and that drum stops.
//
// SCHEDULED AHEAD ON THE AUDIO CLOCK, as /concepts/clock/010/ argues: a timer
// wakes every 25 ms and hands over every hit due in the next 150 ms, each
// carrying the time it must sound at (`at`, on performance.now()'s clock).
// The voice sends it to scsynth as a timestamped OSC bundle (`sendAt`), which
// SuperSonic maps to the speakers' clock, so a late timer makes a hit late to
// HAND OVER, never late to SOUND.
//
// ONE ENGINE, ONE OUTPUT. The four voices are four definitions on one scsynth,
// and their sound leaves as one mix, so a voice's `audio-out -> speaker` link
// is honoured where it can be: a voice whose link is gone starts no hits.
//
// THE CHOKE is a drum machine's: a closed hat cuts an open hat that is still
// ringing. The closed hat voice sends `/n_set gate 0` to the open hat's node,
// in the same bundle time as its own hit; the open hat's program closes in
// 15 ms on that gate.
//
// NOTHING OPENS ON A VISIT. The four programs are compiled in JavaScript as
// the page opens (no fetch). A pointer over the transport fetches the engine
// from our origin; the first press of play makes the AudioContext, boots
// scsynth, loads the four definitions and starts.

import { el } from '/shell/shell.mjs';
import { createBay } from '/shell/bay.mjs';
import { createPatchbay } from '/shell/patchbay.mjs';
import { createStepGrid } from '/shell/step-grid.mjs';
import { createPanelLayout } from '/shell/panel-layout.mjs';
import { createTransportBar } from '/shell/transport-bar.mjs';
import { createGlue } from '/shell/glue.mjs';
import { createStepper } from '/shell/stepper.mjs';
import { createIconButton } from '/shell/icon-button.mjs';
import { createKnob } from '/shell/knob.mjs';
import { createKnobGrid } from '/shell/knob-grid.mjs';
import { createDeck } from '/timeline/transport.mjs';
import { bootScsynth, loadScsynth } from '/shell/scsynth.mjs';
import { compile } from '/shell/sclang-lite.mjs';
import { LIFE } from './voices.mjs';

/**
 * @param {object} d  what `mount()` returned, for its log
 * @param {object} o
 * @param {object[]} o.voices  from `voices()` in voices.mjs, with or without knobs
 * @returns {{ surface: HTMLElement, knobs: ?HTMLElement, patchbay: HTMLElement, api: object }}
 */
export function createDrumMachine(d, { voices }) {
  const S = 'web';
  const ID = (node, port) => `${S}:${node}:${port}`;
  const SEQ = ID('sequencer', 'midi-out');
  const SPK = ID('speaker', 'audio-in');

  // ── the tempo and the bar ────────────────────────────────────────────────
  // 120 bpm, the house default, four steps to a beat: a step is 125 ms and the
  // sixteen of them are one 2 s bar, looped. The tempo is the bar's `- bpm +`
  // stepper, 60 to 180 in fives (asked 2026-10-12: *"rm step of and bpm. use
  // bpm selector on right and add clear button"*), the kit's `createStepper`
  // as /tom/ wears it.
  const BPM_AT_START = 120, BPM_MIN = 60, BPM_MAX = 180, BPM_STEP = 5, STEPS = 16;
  const stepMsAt = (b) => 60000 / (b * 4);
  let bpm = BPM_AT_START;
  const BAR = STEPS * stepMsAt(BPM_AT_START);
  const AHEAD = 150, TICK = 25;              // hand each hit over 150 ms early, look every 25 ms

  const VOICES = voices;
  const KNOBS = VOICES.filter((v) => v.param);

  // ── the four programs, compiled now (pure JavaScript, no fetch) ──────────
  const compiled = new Map(VOICES.map((v) => {
    const r = compile(v.program, { name: v.name });
    if (!r.ok) throw new Error(`${v.label} did not compile: ${r.message}`);
    return [v.key, r];
  }));

  // ── the engine, booted on the first play ─────────────────────────────────
  let ctx = null, eng = null, waking = null, junction = null, an = null, buf = null;
  let nextId = 3000;
  const stat = { bootMs: null, loadMs: null, started: {}, ended: {}, chokes: 0, fails: 0 };
  for (const v of VOICES) { stat.started[v.key] = 0; stat.ended[v.key] = 0; }
  const nodeVoice = new Map();               // node id -> voice key, until its /n_end
  let openHat = null;                        // { id, until } the open hat that may still be ringing
  /** Each voice's knob value, sent with every hit of that voice. */
  const values = new Map(KNOBS.map((v) => [v.key, v.param.value]));
  let paramSends = 0;

  function heard(m) {
    if (m[0] === '/n_end') {
      const k = nodeVoice.get(m[1]);
      if (k) { stat.ended[k]++; nodeVoice.delete(m[1]); }
      return true;
    }
    if (m[0] === '/fail') { stat.fails++; d.log(`SuperCollider: ${m.slice(1).join(' ')}`, 'warn'); }
    return false;
  }

  function wake() {
    if (eng) return Promise.resolve(eng);
    waking ??= (async () => {
      const e = await bootScsynth({ audioContext: ctx, log: d.log, onReply: heard });
      stat.bootMs = Math.round(e.bootMs);
      // The engine's sound goes where the bay says, so it comes off the
      // speakers here. A silent branch to the destination stays, because Web
      // Audio pulls and an engine nobody pulls never answers /d_recv
      // (collide-voice.mjs measured that).
      e.out.disconnect();
      const pull = ctx.createGain(); pull.gain.value = 0; pull.connect(ctx.destination);
      e.out.connect(pull);
      junction = ctx.createGain();
      e.out.connect(junction);
      junction.connect(ctx.destination);
      an = ctx.createAnalyser(); an.fftSize = 1024; buf = new Float32Array(an.fftSize);
      junction.connect(an);
      const t = performance.now();
      for (const v of VOICES) {
        const got = await e.sendAndWait((m) => (m[0] === '/done' || m[0] === '/fail') && m[1] === '/d_recv', 5000,
          '/d_recv', compiled.get(v.key).bytes);
        if (!got || got[0] !== '/done') throw new Error(`SuperCollider did not take ${v.label}`);
      }
      stat.loadMs = Math.round(performance.now() - t);
      d.log(`SuperCollider booted in ${stat.bootMs} ms and took the four drums in ${stat.loadMs} ms`);
      eng = e;
      return e;
    })().catch((err) => { waking = null; d.log(`SuperCollider did not start: ${err?.message || err}`, 'bad'); throw err; });
    return waking;
  }

  /** Whether a voice's sound has a wire to the speakers. */
  const wired = (key) => bay.links().some((l) => l.from === ID(key, 'audio-out') && l.to === SPK);

  /** One hit, at `at` on performance.now()'s clock, as a timestamped bundle. */
  function hit(v, at) {
    if (!eng || !wired(v.key)) return;
    const id = nextId++;
    if (v.key === 'hhc' && openHat && at < openHat.until) {
      // The choke, in the same bundle time as the closed hat itself.
      eng.sendAt(at, '/n_set', openHat.id, 'gate', 0);
      stat.chokes++;
      openHat = null;
    }
    // A knob's value goes in the hit's own bundle, so the hit sounds with the
    // value the knob had when it was handed over.
    const args = v.param ? [v.param.name, values.get(v.key)] : [];
    eng.sendAt(at, '/s_new', v.name, id, 0, 0, ...args);
    nodeVoice.set(id, v.key);
    stat.started[v.key]++;
    if (v.key === 'hho') openHat = { id, until: at + (v.param ? values.get(v.key) : LIFE.hho) * 1000 };
  }

  // ── the bay ──────────────────────────────────────────────────────────────
  const bay = createBay();
  bay.addNode({ id: `${S}:sequencer`, kind: 'engine', label: 'sequencer', place: 'browser' });
  for (const v of VOICES) bay.addNode({ id: `${S}:${v.key}`, kind: 'engine', label: `${v.label}, SuperCollider`, place: 'browser' });
  bay.addNode({ id: `${S}:speaker`, kind: 'screen', label: 'speakers', place: 'browser' });
  bay.addPort({ id: SEQ, label: 'sequencer:midi-out', dir: 'out', medium: 'midi', emits: ['note'] });
  const heardBy = {};
  for (const v of VOICES) {
    heardBy[v.key] = 0;
    bay.addPort({ id: ID(v.key, 'midi-in'), label: `${v.key}:midi-in`, dir: 'in', medium: 'midi', accepts: ['note'],
      deliver: (e) => { if (e.d1 !== v.note || !e.d2) return; heardBy[v.key]++; hit(v, e.at); } });
    bay.addPort({ id: ID(v.key, 'audio-out'), label: `${v.key}:audio-out`, dir: 'out', medium: 'audio' });
  }
  bay.addPort({ id: SPK, label: 'speaker:audio-in', dir: 'in', medium: 'audio' });
  // A knob per drum, each a node of its own with a value wire into its voice.
  for (const v of KNOBS) {
    const n = v.param.name;
    bay.addNode({ id: `${S}:knob-${n}`, kind: 'person', label: `${v.label} ${n}`, place: 'browser' });
    bay.addPort({ id: ID(`knob-${n}`, 'value-out'), label: `knob-${n}:value-out`, dir: 'out', medium: 'value', shape: { of: 'param' } });
    bay.addPort({ id: ID(v.key, 'value-in'), label: `${v.key}:value-in`, dir: 'in', medium: 'value',
      shape: { of: 'param', names: [n] }, deliver: (e) => {
        if (e?.of !== 'param' || e.name !== n) return;
        values.set(v.key, e.v); paramSends++;
      } });
  }
  const lay = (from, to, tf = []) => { const r = bay.link(from, to, tf, { site: S }); if (!r.ok) d.log(`${from} -> ${to} refused: ${r.why}`, 'warn'); };
  for (const v of VOICES) {
    lay(SEQ, ID(v.key, 'midi-in'), [{ op: 'range', lo: v.note, hi: v.note }]);
    lay(ID(v.key, 'audio-out'), SPK);
  }
  for (const v of KNOBS) lay(ID(`knob-${v.param.name}`, 'value-out'), ID(v.key, 'value-in'));

  // ── the grid ─────────────────────────────────────────────────────────────
  const panel = createPanelLayout({ side: 'left', flow: false, strip: { role: 'group', label: 'steps' } });
  const grid = createStepGrid({
    fixed: panel.fixed, strip: panel.strip, rows: VOICES.length, steps: STEPS,
    label: (r) => VOICES[r].label,
    title: (r) => `${VOICES[r].label}, note ${VOICES[r].note}`,
    padTitle: (r, s) => `${VOICES[r].label}, step ${s + 1}`,
    ticks: true,
    onToggle: (r, s, lit, why) => { if (why !== 'quiet') d.log(`${VOICES[r].label} step ${s + 1} ${lit ? 'on' : 'off'}`); },
  });
  // A plain four on the floor, backbeat snare, open hats on the offbeats and
  // closed hats around them, each closed hat after an open one choking it.
  const START = {
    kick: [0, 4, 8, 12],
    snare: [4, 12],
    hho: [2, 6, 10, 14],
    hhc: [0, 3, 4, 7, 8, 11, 12, 15],
  };
  VOICES.forEach((v, r) => { for (const s of START[v.key]) grid.set(r, s, true, 'quiet'); });

  // ── the sequencer: wakes every 25 ms, hands over what is due in the next 150 ─
  // The deck only carries the bar's play state (the bar shows no time). Its
  // range is a day, because the deck runs in milliseconds and pauses itself at
  // its end, which would stop the loop through the bar's own command.
  const deck = createDeck({ items: [], range: [0, 24 * 3600e3] });
  let loop = null, raf = 0, t0 = 0, next = 0, playing = false, laps = 0, shown = -1;
  /**
   * WHEN EACH STEP SOUNDS, AS AN ANCHOR AND A STEP LENGTH. A tempo change moves
   * the anchor to the first step not yet handed over, at the time it already
   * had, and only the steps after it get the new length. Hits already handed
   * to the engine keep their times, so a change lands from the next step with
   * no step played twice, skipped or squeezed.
   */
  let anchor = { k: 0, t: 0, ms: stepMsAt(bpm) };
  const heardAt = (k) => anchor.t + (k - anchor.k) * anchor.ms;   // performance.now() ms of absolute step k
  const handed = new Map();                       // absolute step -> the time it was handed over for
  function tick() {
    const horizon = performance.now() + AHEAD;
    while (heardAt(next) < horizon) {
      const s = next % STEPS, at = heardAt(next);
      handed.set(next, at);
      handed.delete(next - 64);
      next++;
      if (at < performance.now()) continue;      // already gone by: never sent late
      VOICES.forEach((v, r) => {
        if (grid.get(r, s)) bay.send(SEQ, { cls: 'note', ch: 10, d1: v.note, d2: 100, at, step: s });
      });
    }
  }
  /** The playhead follows what is being HEARD, not what was handed over. */
  function frame() {
    raf = 0;
    if (!playing) return;
    const now = performance.now();
    // Walk on to the newest step whose time has come, reading the times the
    // steps were actually handed over for, so a tempo change cannot move it.
    let k = shown;
    while (handed.has(k + 1) && handed.get(k + 1) <= now) k++;
    if (k !== shown && k >= 0) {
      shown = k;
      grid.at(k % STEPS);
      laps = Math.floor(k / STEPS);
    }
    sample(now);
    raf = requestAnimationFrame(frame);
  }
  async function start() {
    if (playing) return;
    ctx ??= new AudioContext({ latencyHint: 'interactive' });
    ctx.resume();
    bar.el.dataset.busy = '1';
    try { await wake(); } catch { delete bar.el.dataset.busy; return; }
    delete bar.el.dataset.busy;
    playing = true;
    t0 = performance.now() + 80;
    anchor = { k: 0, t: t0, ms: stepMsAt(bpm) };
    next = 0; laps = 0; shown = -1; handed.clear(); openHat = null;
    grid.at(0); grid.live(true);
    deck.seek(0); deck.play();
    clearInterval(loop);
    loop = setInterval(tick, TICK);
    tick();
    raf ||= requestAnimationFrame(frame);
    pb.refresh();
  }
  async function stop() {
    playing = false;
    clearInterval(loop); loop = null;
    cancelAnimationFrame(raf); raf = 0;
    if (deck.playing()) deck.pause();
    deck.seek(0);
    grid.live(false); grid.at(0);
    openHat = null;
    if (eng) {
      // Every hit already handed over is still in a scheduler, the page's and
      // the engine's: purge clears both, then everything sounding is freed.
      try { await eng.sonic.purge(); } catch { /* an older engine */ }
      eng.send('/g_freeAll', 0);
    }
    pb.refresh();
  }

  // ── the tempo selector and the clear button, on the bar's right ───────────
  const BPMS = [];
  for (let v = BPM_MIN; v <= BPM_MAX; v += BPM_STEP) BPMS.push(v);
  const tempo = createStepper({
    what: 'tempo',
    prev: () => setBpm(bpm - BPM_STEP),
    next: () => setBpm(bpm + BPM_STEP),
    pick: { options: BPMS.map((v) => `${v} bpm`), at: BPMS.indexOf(bpm), onPick: (i) => setBpm(BPMS[i]) },
  });
  function setBpm(v) {
    const was = bpm;
    bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(v / BPM_STEP) * BPM_STEP));
    const i = BPMS.indexOf(bpm);
    tempo.show(`${bpm} bpm`, i >= 0 ? i : undefined);
    if (bpm === was) return;
    // From the first step not yet handed over, at the time it already had.
    if (playing) anchor = { k: next, t: heardAt(next), ms: stepMsAt(bpm) };
    d.log(`tempo ${bpm} bpm, a step is ${stepMsAt(bpm).toFixed(1)} ms`);
  }
  setBpm(bpm);
  // Clear: every pad off. Playback keeps running, so a pattern can be built
  // again from nothing while it loops.
  const clear = createIconButton({ icon: 'trash', label: 'clear the grid', onPress: () => {
    let n = 0;
    for (let r = 0; r < VOICES.length; r++) for (let s = 0; s < STEPS; s++) if (grid.get(r, s)) { grid.set(r, s, false, 'quiet'); n++; }
    d.log(`cleared ${n} hits`);
  } });

  // ── the transport: the kit's bar, glued over the grid ─────────────────────
  const barHost = el('div');
  const bar = createTransportBar(barHost, deck, {
    scrub: false, loop: false, live: false, verb: 'stop',
    time: false, right: [clear.el, tempo.el],
    command: { play: () => start(), pause: () => stop() },
  });
  // Intent: fetch the engine from our origin, boot nothing.
  for (const ev of ['pointerenter', 'focusin', 'touchstart']) barHost.addEventListener(ev, () => loadScsynth().catch(() => {}), { once: true, passive: true });
  const surface = createGlue(barHost, panel.el);

  // ── the patchbay ─────────────────────────────────────────────────────────
  const pb = createPatchbay(bay, { flowing: () => playing });

  // ── the knobs, one row, each sending on its own wire ─────────────────────
  let knobs = null, knobGrid = null;
  if (KNOBS.length) {
    knobs = new Map(KNOBS.map((v) => {
      const p = v.param;
      const knob = createKnob({
        label: p.name, min: p.min, max: p.max, value: p.value, hand: true,
        onInput: (x) => bay.send(ID(`knob-${p.name}`, 'value-out'), { of: 'param', name: p.name, v: x }),
      });
      knob.el.dataset.param = p.name;
      knob.el.title = `${v.label} ${p.name}, ${p.min} to ${p.max} ${p.unit}`;
      return [p.name, knob];
    }));
    knobGrid = createKnobGrid(knobs, { row: true });
  }

  // ── the level, for a check that wants to know a hit was HEARD ─────────────
  // A short history of the mix's loudness against performance.now(), shifted
  // by the output latency, so a window of time can be asked what it held.
  const levels = [];
  function sample(now) {
    if (!an) return;
    an.getFloatTimeDomainData(buf);
    let s = 0;
    for (const v of buf) s += v * v;
    const late = ((ctx.outputLatency || 0) + (ctx.baseLatency || 0)) * 1000;
    // Zero crossings per second, a rough pitch or brightness, for the knob checks.
    let zc = 0;
    for (let i = 1; i < buf.length; i++) if ((buf[i - 1] < 0) !== (buf[i] < 0)) zc++;
    levels.push({ t: now + late, rms: Math.sqrt(s / buf.length), zc: zc * ctx.sampleRate / buf.length });
    if (levels.length > 2400) levels.splice(0, levels.length - 2400);
  }

  addEventListener('pagehide', () => { stop(); ctx?.close(); });

  const api = {
    bay, grid, deck, bar, stat, heardBy, levels, compiled, values, knobs, knobGrid,
    BAR, VOICES, tempo, clear, setBpm,
    paramSends: () => paramSends,
    bpm: () => bpm, stepMs: () => stepMsAt(bpm),
    /** When absolute step k was handed over to sound, on performance.now()'s clock. */
    stepTime: (k) => handed.get(k),
    playing: () => playing, laps: () => laps, t0: () => t0, shown: () => shown,
    ctx: () => ctx, engine: () => eng,
    /** The mix's loudness right now, read off the analyser, 0 before the first play. */
    level: () => { if (!an) return 0; an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; return Math.sqrt(s / buf.length); },
    start, stop,
  };
  return { surface, knobs: knobGrid?.el ?? null, patchbay: pb.el, api };
}

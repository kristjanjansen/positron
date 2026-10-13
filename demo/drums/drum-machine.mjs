// demo/drums/drum-machine.mjs: the drum machine /drums/machine/
// and /drums/knobs/ are built from. A page mounts the shell and calls
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
import { createWaveShape } from '/shell/synth-view.mjs';
import { createDeck } from '/timeline/transport.mjs';
import { bootScsynth, loadScsynth } from '/shell/scsynth.mjs';
import { compile } from '/shell/sclang-lite.mjs';
import { LIFE } from './voices.mjs';

/**
 * @param {object} d  what `mount()` returned, for its log
 * @param {object} o
 * @param {object[]} o.voices  from `voices()` in voices.mjs, with or without knobs
 * @param {boolean} [o.patternIn]  give the sequencer a `value-in` that takes a
 *   whole pattern, `{ of: 'pattern', rows: [[0|1 x 16] x 4] }`, and makes the
 *   grid read only and empty, with no clear button: the pattern arrives on a
 *   wire (rhythm/050, where a picture is the pattern).
 * @param {(lap: number) => void} [o.onBar]  called just before the first step
 *   of every bar is handed over, which is where a page sends that bar's pattern
 * @param {(link: object, playing: boolean) => boolean} [o.flowing]  which wires the patchbay lights
 * @param {(engine: object, ctx: AudioContext) => Promise<void>} [o.onWake]  awaited
 *   once the engine is up and the definitions are in, before the first hit
 *   (rhythm/020 loads its samples here). A voice may also bring `def` (bytes),
 *   `params` (several knobs) and `args()` (extra `/s_new` arguments per hit,
 *   or null to skip the hit); see `paramsOf` and `hit`.
 * @param {(ctx: AudioContext) => Promise<void>} [o.onStart]  awaited on every
 *   press of Play, after the engine is up and before the first hit, while the
 *   bar shows it is busy (remote/040 joins the Pi here, so the lead is the
 *   Pi's path from the first hit)
 * @param {() => void} [o.onStop]  called on every stop (remote/040 leaves the Pi)
 * @param {boolean} [o.scopes]  one scope per drum, each a node `web:scope-<drum>`
 *   fed by that drum's own `audio-out` (rhythm/010)
 * @param {number | (() => number)} [o.ahead]  how far ahead each hit is handed
 *   over, ms, read on every tick; 150 by default. remote/040 hands over on the
 *   Pi's path, 250 on the relay and 150 direct (plans/plan-pi-supercollider-defs.md §2.4)
 * @param {() => AudioContext} [o.context]  the page's own context, made on the
 *   first press; left out, the machine makes one (remote/040 needs 48 kHz)
 * @param {{ node: string, label: string }} [o.mix]  the drums go into a node
 *   of this name (`web:<node>:audio-in`) with an `audio-out` of its own, and
 *   the mix is NOT connected to the speakers: the page routes `api.mixOut()`
 *   where its own wires say (remote/040's crossfader). Left out, the node is
 *   `web:speaker` and the mix goes to the speakers.
 * @param {{ rows: number, steps: number }} [o.shape]  how many of `voices` are
 *   rows (the first n) and how many steps a loop has, 16 by default. Changed
 *   with `api.setShape`, which lands at the next loop while playing
 *   (rhythm/050's 1x and 2x). The other rows' drums stay loaded on the engine
 *   and leave the grid and the patchbay.
 * @param {(shape: {rows: number, steps: number}) => void} [o.onShape]  called as
 *   a new shape lands, before its first step is read, so a page that writes the
 *   pattern can write it for the new shape first
 * @param {boolean} [o.start]  false: the grid starts empty rather than with the
 *   house four on the floor (rhythm/020, whose rows are whatever was loaded)
 * @param {(rows: number) => number} [o.gain]  the mix's level for this many
 *   rows, read at the first play and at every new shape; left out, it follows
 *   how many drums there are in all, as it always has
 * @param {{ over: number, node: string, label: (rows: number) => string }} [o.group]
 *   above `over` rows the patchbay draws the rows as ONE box, `web:<node>`,
 *   with one MIDI wire in and one audio wire out (rhythm/020 with a 64 sample
 *   pack). It is the picture only: the bay still holds one filtered wire per
 *   row, and every hit still crosses its own.
 *
 * A voice's `label` and `title` are read every time they are drawn, so a voice
 * whose label is a getter renames its row and its box (rhythm/020's sample
 * names); `opens` and `closes`, when a voice has them, say which rows are an
 * open hat and the closed hat that chokes it (by default the `hho` and `hhc`
 * keys, as on 000).
 * @returns {{ surface: HTMLElement, knobs: ?HTMLElement, scopes: ?HTMLElement[], patchbay: HTMLElement, api: object }}
 */
export function createDrumMachine(d, { voices, patternIn = false, onBar = null, flowing = null, scopes: wantScopes = false, onWake = null,
  onStart = null, onStop = null, ahead = 150, context = null, mix = null, shape: shapeOpt = null, onShape = null,
  start: startPattern = true, gain = null, group = null }) {
  const S = 'web';
  const ID = (node, port) => `${S}:${node}:${port}`;
  const SEQ = ID('sequencer', 'midi-out');
  const OUT = mix ? mix.node : 'speaker';
  const SPK = ID(OUT, 'audio-in');

  // ── the tempo and the bar ────────────────────────────────────────────────
  // 120 bpm, the house default, four steps to a beat: a step is 125 ms and the
  // sixteen of them are one 2 s bar, looped. The tempo is the bar's `- bpm +`
  // stepper, 60 to 180 in fives (asked 2026-10-12: *"rm step of and bpm. use
  // bpm selector on right and add clear button"*), the kit's `createStepper`
  // as /tom/ wears it.
  const BPM_AT_START = 120, BPM_MIN = 60, BPM_MAX = 180, BPM_STEP = 5;
  let STEPS = shapeOpt?.steps ?? 16;
  const stepMsAt = (b) => 60000 / (b * 4);
  let bpm = BPM_AT_START;
  const BAR = STEPS * stepMsAt(BPM_AT_START);
  const TICK = 25;                           // look every 25 ms
  const aheadMs = () => (typeof ahead === 'function' ? ahead() : ahead);   // hand each hit over this early, 150 by default

  const ALL = voices;
  /** The drums that are rows now: the first `shape.rows` of `voices`. */
  let VOICES = ALL.slice(0, shapeOpt?.rows ?? ALL.length);
  /**
   * A voice's knobs: `v.params` (a list, rhythm/020's pitch and length per row)
   * or `v.param` (one, rhythm/010). Each is `{ name, value, min, max, unit }`
   * plus, optionally, `control` (the definition's control the value is sent as,
   * default `name`), `label` and `sub` for the knob, `toArg(x)` (what is sent,
   * default the value itself) and `life: true` for the one that says how long
   * a hit rings (the open hat's choke window follows it). `name` is the bay
   * node's (`web:knob-<name>`), so it is unique on the page.
   */
  const paramsOf = (v) => v.params ?? (v.param ? [v.param] : []);
  const KNOBS = ALL.filter((v) => paramsOf(v).length);

  // ── the four programs, compiled now (pure JavaScript, no fetch) ──────────
  // EACH DRUM ON A STEREO PAIR OF ITS OWN: drum i's last line goes to output
  // busses 2i and 2i+1, and the engine is booted with eight outputs. So the
  // engine's output can be split per drum, which is what makes a drum's
  // `audio-out` wire real (the speaker hears exactly the drums wired to it)
  // and what lets a scope see one drum alone.
  //
  // 🔴 UNLESS THERE ARE MORE THAN SIXTEEN DRUMS. An AudioWorkletNode carries at
  // most 32 channels in Chrome, so 16 pairs is the ceiling; rhythm/050's 2x has
  // eighteen. Then every drum plays on busses 0 and 1, the engine has two
  // outputs, and a drum's `audio-out` wire is honoured at the hit instead (a
  // drum with no wire to the speakers starts no hits). Nothing with scopes has
  // that many drums.
  const SPLIT = 2 * ALL.length <= 32;
  const BUS = new Map(ALL.map((v, i) => [v.key, SPLIT ? 2 * i : 0]));
  // A voice may bring its definition as bytes (`v.def`, rhythm/020's
  // `drumsample`, written with synthdef.mjs); it then takes its pair as `out`.
  const compiled = new Map(ALL.map((v) => {
    if (v.def) return [v.key, { ok: true, bytes: v.def }];
    const r = compile(v.program, { name: v.name, bus: BUS.get(v.key) });
    if (!r.ok) throw new Error(`${v.label} did not compile: ${r.message}`);
    return [v.key, r];
  }));

  // ── the engine, booted on the first play ─────────────────────────────────
  let ctx = null, eng = null, waking = null, junction = null, an = null, buf = null;
  /** key -> the drum's own stereo signal, and its scope's analyser */
  const outs = new Map(), scopeAn = new Map();
  let nextId = 3000;
  const stat = { bootMs: null, loadMs: null, started: {}, ended: {}, chokes: 0, fails: 0 };
  for (const v of ALL) { stat.started[v.key] = 0; stat.ended[v.key] = 0; }
  const nodeVoice = new Map();               // node id -> voice key, until its /n_end
  let openHat = null;                        // { id, until } the open hat that may still be ringing
  /** Each voice's knob value, sent with every hit of that voice. */
  const values = new Map(KNOBS.map((v) => [v.key, new Map(paramsOf(v).map((p) => [p.name, p.value]))]));
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
      const e = await bootScsynth({ audioContext: ctx, log: d.log, onReply: heard,
        scsynthOptions: { numOutputBusChannels: SPLIT ? 2 * ALL.length : 2, numInputBusChannels: 2 } });
      stat.bootMs = Math.round(e.bootMs);
      // The engine's sound goes where the bay says, so it comes off the
      // speakers here. A silent branch to the destination stays, because Web
      // Audio pulls and an engine nobody pulls never answers /d_recv
      // (collide-voice.mjs measured that).
      e.out.disconnect();
      const pull = ctx.createGain(); pull.gain.value = 0; pull.connect(ctx.destination);
      e.out.connect(pull);
      // Eight channels in, one stereo pair per drum out.
      const split = SPLIT ? ctx.createChannelSplitter(2 * ALL.length) : null;
      if (split) e.out.connect(split);
      stat.channels = e.out.channelCount;
      if (!SPLIT) outs.set('*', e.out);
      (SPLIT ? ALL : []).forEach((v, i) => {
        const pair = ctx.createChannelMerger(2);
        split.connect(pair, 2 * i, 0);
        split.connect(pair, 2 * i + 1, 1);
        outs.set(v.key, pair);
        if (wantScopes) {
          // 32768 samples (0.68 s at 48 kHz) holds the longest window, 500 ms,
          // plus the output latency and the 30 ms the capture waits.
          const a = ctx.createAnalyser(); a.fftSize = 32768;
          // An analyser is pulled through a silent branch, as `an` is below.
          const z = ctx.createGain(); z.gain.value = 0; a.connect(z); z.connect(ctx.destination);
          scopeAn.set(v.key, { an: a, buf: new Float32Array(a.fftSize) });
          views[i].listen(a);
        }
      });
      junction = ctx.createGain();
      // Eight drums at once (050) sum about 3 dB hotter than four, and the
      // loudest bar measured -1.5 dBFS RMS, so the mix comes down to 0.7 there.
      // Eighteen (050 at 2x) come down to 0.5.
      junction.gain.value = levelFor();
      if (!mix) junction.connect(ctx.destination);
      an = ctx.createAnalyser(); an.fftSize = 1024; buf = new Float32Array(an.fftSize);
      junction.connect(an);
      route();
      const t = performance.now();
      const sent = new Set();
      for (const v of ALL) {
        if (sent.has(v.name)) continue;   // one definition several rows share goes once
        sent.add(v.name);
        const got = await e.sendAndWait((m) => (m[0] === '/done' || m[0] === '/fail') && m[1] === '/d_recv', 5000,
          '/d_recv', compiled.get(v.key).bytes);
        if (!got || got[0] !== '/done') throw new Error(`SuperCollider did not take ${v.label}`);
      }
      if (onWake) await onWake(e, ctx);
      stat.loadMs = Math.round(performance.now() - t);
      d.log(`SuperCollider booted in ${stat.bootMs} ms and took the ${ALL.length} drums in ${stat.loadMs} ms`);
      eng = e;
      return e;
    })().catch((err) => { waking = null; d.log(`SuperCollider did not start: ${err?.message || err}`, 'bad'); throw err; });
    return waking;
  }

  /** THE ROUTER: each drum's pair goes where its `audio-out` wires say. */
  function route() {
    if (!SPLIT) {
      // One mix: it reaches the speakers whole, and each drum's wire is read at the hit.
      const o = outs.get('*');
      if (o) { try { o.disconnect(); } catch { /* not connected */ } o.connect(junction); }
      return;
    }
    for (const v of ALL) {
      const o = outs.get(v.key);
      if (!o) continue;
      try { o.disconnect(); } catch { /* not connected */ }
      for (const l of bay.links()) {
        if (l.from !== ID(v.key, 'audio-out')) continue;
        if (l.to === SPK) o.connect(junction);
        if (l.to === ID(`scope-${v.key}`, 'audio-in') && scopeAn.get(v.key)) o.connect(scopeAn.get(v.key).an);
      }
    }
  }

  /** The mix's level: the page's, for the rows there are now, or by how many drums there are in all. */
  const levelFor = () => (gain ? gain(VOICES.length) : ALL.length > 9 ? 0.5 : ALL.length > 4 ? 0.7 : 1);
  /** Which rows are an open hat and the closed hat that chokes it. */
  const opens = (v) => (v.opens ?? v.key === 'hho');
  const closes = (v) => (v.closes ?? v.key === 'hhc');

  /** One hit, at `at` on performance.now()'s clock, as a timestamped bundle. */
  /** Whether a drum's sound has a wire to the speakers (read at the hit when the outputs are not split). */
  const wired = (key) => bay.links().some((l) => l.from === ID(key, 'audio-out') && l.to === SPK);

  function hit(v, at) {
    if (!eng) return;
    if (!SPLIT && !wired(v.key)) return;
    const id = nextId++;
    if (closes(v) && openHat && at < openHat.until) {
      // The choke, in the same bundle time as the closed hat itself.
      eng.sendAt(at, '/n_set', openHat.id, 'gate', 0);
      stat.chokes++;
      openHat = null;
    }
    // A knob's value goes in the hit's own bundle, so the hit sounds with the
    // value the knob had when it was handed over.
    const args = [];
    let life = LIFE[v.key] ?? 0.5;
    for (const p of paramsOf(v)) {
      const x = values.get(v.key).get(p.name);
      args.push(p.control ?? p.name, p.toArg ? p.toArg(x) : x);
      if (p.life) life = x;
    }
    if (v.def) args.push('out', BUS.get(v.key));
    if (v.args) { const more = v.args(); if (!more) return; args.push(...more); }   // null: nothing to play (no sample yet)
    eng.sendAt(at, '/s_new', v.name, id, 0, 0, ...args);
    nodeVoice.set(id, v.key);
    stat.started[v.key]++;
    if (opens(v)) openHat = { id, until: at + life * 1000 };
  }

  // ── the bay ──────────────────────────────────────────────────────────────
  const bay = createBay();
  bay.addNode({ id: `${S}:sequencer`, kind: 'engine', label: 'sequencer', place: 'browser' });
  for (const v of ALL) bay.addNode({ id: `${S}:${v.key}`, kind: 'engine', label: `${v.label}, SuperCollider`, place: 'browser' });
  bay.addNode({ id: `${S}:${OUT}`, kind: mix ? 'engine' : 'screen', label: mix ? mix.label : 'speakers', place: 'browser' });
  bay.addPort({ id: SEQ, label: 'sequencer:midi-out', dir: 'out', medium: 'midi', emits: ['note'] });
  const heardBy = {};
  for (const v of ALL) {
    heardBy[v.key] = 0;
    bay.addPort({ id: ID(v.key, 'midi-in'), label: `${v.key}:midi-in`, dir: 'in', medium: 'midi', accepts: ['note'],
      deliver: (e) => { if (e.d1 !== v.note || !e.d2) return; heardBy[v.key]++; hit(v, e.at); } });
    bay.addPort({ id: ID(v.key, 'audio-out'), label: `${v.key}:audio-out`, dir: 'out', medium: 'audio' });
  }
  bay.addPort({ id: SPK, label: `${OUT}:audio-in`, dir: 'in', medium: 'audio' });
  if (mix) bay.addPort({ id: ID(OUT, 'audio-out'), label: `${OUT}:audio-out`, dir: 'out', medium: 'audio' });
  if (wantScopes) for (const v of ALL) {
    bay.addNode({ id: `${S}:scope-${v.key}`, kind: 'screen', label: 'scope', place: 'browser' });
    bay.addPort({ id: ID(`scope-${v.key}`, 'audio-in'), label: `scope-${v.key}:audio-in`, dir: 'in', medium: 'audio' });
    // What starts a trace arrives on a wire too: the drum's own note, filtered
    // the same way, so the scope triggers on exactly the hits its drum plays.
    bay.addPort({ id: ID(`scope-${v.key}`, 'midi-in'), label: `scope-${v.key}:midi-in`, dir: 'in', medium: 'midi', accepts: ['note'],
      deliver: (e) => {
        if (e.d1 !== v.note || !e.d2) return;
        if (!bay.links().some((l) => l.from === ID(v.key, 'audio-out') && l.to === ID(`scope-${v.key}`, 'audio-in'))) return;
        views?.[ALL.indexOf(v)].trigger(e.at);
      } });
  }
  // A knob per drum, each a node of its own with a value wire into its voice.
  for (const v of KNOBS) {
    const names = paramsOf(v).map((p) => p.name);
    for (const p of paramsOf(v)) {
      const n = p.name;
      bay.addNode({ id: `${S}:knob-${n}`, kind: 'person', label: `${v.label} ${p.label ?? n}`, place: 'browser' });
      bay.addPort({ id: ID(`knob-${n}`, 'value-out'), label: `knob-${n}:value-out`, dir: 'out', medium: 'value', shape: { of: 'param' } });
    }
    bay.addPort({ id: ID(v.key, 'value-in'), label: `${v.key}:value-in`, dir: 'in', medium: 'value',
      shape: { of: 'param', names }, deliver: (e) => {
        if (e?.of !== 'param' || !names.includes(e.name)) return;
        values.get(v.key).set(e.name, e.v); paramSends++;
      } });
  }
  const lay = (from, to, tf = []) => { const r = bay.link(from, to, tf, { site: S }); if (!r.ok) d.log(`${from} -> ${to} refused: ${r.why}`, 'warn'); };
  for (const v of ALL) {
    lay(SEQ, ID(v.key, 'midi-in'), [{ op: 'range', lo: v.note, hi: v.note }]);
    lay(ID(v.key, 'audio-out'), SPK);
    if (wantScopes) {
      lay(ID(v.key, 'audio-out'), ID(`scope-${v.key}`, 'audio-in'));
      lay(SEQ, ID(`scope-${v.key}`, 'midi-in'), [{ op: 'range', lo: v.note, hi: v.note }]);
    }
  }
  for (const v of KNOBS) for (const p of paramsOf(v)) lay(ID(`knob-${p.name}`, 'value-out'), ID(v.key, 'value-in'));

  // ── the grid ─────────────────────────────────────────────────────────────
  const panel = createPanelLayout({ side: 'left', flow: false, strip: { role: 'group', label: 'steps' } });
  const makeGrid = () => createStepGrid({
    fixed: panel.fixed, strip: panel.strip, rows: VOICES.length, steps: STEPS,
    // A voice may carry a `short` grid label (rhythm/020's row numbers); the
    // full name stays in the row's hover and everywhere else.
    label: (r) => VOICES[r].short ?? VOICES[r].label,
    title: (r) => VOICES[r].title ?? `${VOICES[r].label}, note ${VOICES[r].note}`,
    padTitle: (r, s) => `${VOICES[r].label}, step ${s + 1}`,
    ticks: true, readOnly: patternIn,
    onToggle: (r, s, lit, why) => { if (why !== 'quiet') d.log(`${VOICES[r].label} step ${s + 1} ${lit ? 'on' : 'off'}`); },
  });
  let grid = makeGrid();
  /** A new shape: the grid is built again for it, empty, in the same panel. */
  function reshape(sh) {
    VOICES = ALL.slice(0, sh.rows);
    STEPS = sh.steps;
    grid.destroy();
    panel.fixed.textContent = '';
    panel.strip.textContent = '';
    grid = makeGrid();
    if (playing) grid.live(true);
    if (junction) junction.gain.value = levelFor();
    api.grid = grid;
    onShape?.({ rows: sh.rows, steps: sh.steps });
    pb.refresh();
  }
  let pendingShape = null;
  // A plain four on the floor, backbeat snare, open hats on the offbeats and
  // closed hats around them, each closed hat after an open one choking it.
  const START = {
    kick: [0, 4, 8, 12],
    snare: [4, 12],
    hho: [2, 6, 10, 14],
    hhc: [0, 3, 4, 7, 8, 11, 12, 15],
  };
  if (!patternIn && startPattern) VOICES.forEach((v, r) => { for (const s of START[v.key] ?? []) grid.set(r, s, true, 'quiet'); });
  /** A whole pattern from a wire: every pad set to what the rows say. */
  let patternsIn = 0;
  function setPattern(rows) {
    for (let r = 0; r < VOICES.length; r++) for (let s = 0; s < STEPS; s++) grid.set(r, s, !!rows?.[r]?.[s], 'quiet');
    patternsIn++;
  }
  if (patternIn) {
    bay.addPort({ id: ID('sequencer', 'value-in'), label: 'sequencer:value-in', dir: 'in', medium: 'value',
      shape: { of: 'pattern' }, deliver: (e) => { if (e?.of === 'pattern') setPattern(e.rows); } });
  }

  // ── the sequencer: wakes every 25 ms, hands over what is due in the next 150 ─
  // The deck only carries the bar's play state (the bar shows no time). Its
  // range is a day, because the deck runs in milliseconds and pauses itself at
  // its end, which would stop the loop through the bar's own command.
  const deck = createDeck({ items: [], range: [0, 24 * 3600e3] });
  let loop = null, raf = 0, t0 = 0, next = 0, playing = false, laps = 0, shown = -1;
  /** The absolute step the current loop began at, so a loop can change length at its end. */
  let loopStart = 0, loopIndex = 0;
  const stepOf = new Map();                       // absolute step -> [the step of the grid it played, which loop]
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
    const horizon = performance.now() + aheadMs();
    while (heardAt(next) < horizon) {
      if (next - loopStart >= STEPS) {
        loopStart = next; loopIndex++;
        // A new shape lands here, at the top of a loop, before its first step is read.
        if (pendingShape) { const sh = pendingShape; pendingShape = null; reshape(sh); }
      }
      const s = next - loopStart, at = heardAt(next);
      handed.set(next, at);
      stepOf.set(next, [s, loopIndex]);
      handed.delete(next - 128); stepOf.delete(next - 128);
      next++;
      if (s === 0 && onBar) onBar(Math.floor((next - 1) / STEPS));
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
      const [s, lap] = stepOf.get(k) ?? [0, laps];
      grid.at(s);
      laps = lap;
    }
    sample(now);
    drawScopes();
    raf = requestAnimationFrame(frame);
  }
  async function start() {
    if (playing) return;
    ctx ??= context ? context() : new AudioContext({ latencyHint: 'interactive' });
    ctx.resume();
    bar.el.dataset.busy = '1';
    try { await wake(); } catch { delete bar.el.dataset.busy; return; }
    if (onStart) { try { await onStart(ctx); } catch (e) { d.log(`before play: ${e.message}`, 'warn'); } }
    delete bar.el.dataset.busy;
    playing = true;
    // The first step is handed over at once, so it gets the lead the rest get:
    // 80 ms at the 150 default, and 100 more at 250 (remote/040 on the relay,
    // where a first hit 80 ms ahead would reach the Pi after its time).
    t0 = performance.now() + 80 + Math.max(0, aheadMs() - 150);
    anchor = { k: 0, t: t0, ms: stepMsAt(bpm) };
    next = 0; laps = 0; shown = -1; handed.clear(); stepOf.clear(); loopStart = 0; loopIndex = 0; openHat = null;
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
    if (onStop) onStop();
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
      views?.forEach((w) => w.flat());   // the scopes go flat with the sound
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
    time: false, right: patternIn ? [tempo.el] : [clear.el, tempo.el],
    command: { play: () => start(), pause: () => stop() },
  });
  // Intent: fetch the engine from our origin, boot nothing.
  for (const ev of ['pointerenter', 'focusin', 'touchstart']) barHost.addEventListener(ev, () => loadScsynth().catch(() => {}), { once: true, passive: true });
  const surface = createGlue(barHost, panel.el);

  // ── the patchbay ─────────────────────────────────────────────────────────
  // A page that adds wires of its own (050's camera) says when those flow.
  // The patchbay shows the drums that are rows now; the others stay loaded and leave the picture.
  const offRow = (id) => { const k = id.split(':')[1]; return ALL.some((v) => v.key === k) && !VOICES.some((v) => v.key === k); };
  const filtered = {
    nodes: () => bay.nodes().filter((n) => !offRow(n.id)),
    ports: () => bay.ports().filter((p) => !offRow(p.id)),
    links: () => bay.links().filter((l) => !offRow(l.from) && !offRow(l.to)),
  };
  // With `group`: each row's box is named by its voice's label as it is now,
  // and above `over` rows the rows are drawn as one box. A row's own node and
  // ports are `web:<key>` and `web:<key>:<port>`; the scopes' are not.
  const rowOf = (id) => { const k = id.split(':')[1]; return VOICES.find((v) => v.key === k) ?? null; };
  const GID = `${S}:${group?.node ?? 'samples'}`;
  const many = () => !!group && VOICES.length > group.over;
  const toGroup = (id) => (rowOf(id) ? `${GID}:${id.split(':')[2]}` : id);
  const groupedView = {
    nodes() {
      const ns = filtered.nodes().map((n) => { const v = rowOf(n.id); return v ? { ...n, label: `${v.label}, SuperCollider` } : n; });
      if (!many()) return ns;
      const at = ns.findIndex((n) => rowOf(n.id));
      const out = ns.filter((n) => !rowOf(n.id));
      out.splice(Math.max(0, at), 0, { id: GID, kind: 'engine', label: group.label(VOICES.length), place: 'browser' });
      return out;
    },
    ports() {
      const ps = filtered.ports();
      if (!many()) return ps;
      const g = group.node;
      return [...ps.filter((p) => !rowOf(p.id)),
        { id: `${GID}:midi-in`, label: `${g}:midi-in`, dir: 'in', medium: 'midi', accepts: ['note'] },
        { id: `${GID}:audio-out`, label: `${g}:audio-out`, dir: 'out', medium: 'audio' }];
    },
    links() {
      const ls = filtered.links();
      if (!many()) return ls;
      // One wire per pair of ends, carrying the rows' traffic summed.
      const by = new Map();
      for (const l of ls) {
        const from = toGroup(l.from), to = toGroup(l.to);
        if (from === l.from && to === l.to) { by.set(l.id, l); continue; }
        const k = `${from}>${to}`, was = by.get(k);
        if (was) { was.sent += l.sent || 0; continue; }
        by.set(k, { ...l, id: `g-${k}`, from, to, transforms: [], sent: l.sent || 0 });
      }
      return [...by.values()];
    },
  };
  const view = group ? groupedView : SPLIT && !shapeOpt ? bay : filtered;
  const pb = createPatchbay(view, { flowing: (l) => (flowing ? flowing(l, playing) : playing) });

  // ── the knobs, one row, each sending on its own wire ─────────────────────
  let knobs = null, knobGrid = null;
  if (KNOBS.length) {
    knobs = new Map(KNOBS.flatMap((v) => paramsOf(v).map((p) => {
      const knob = createKnob({
        label: p.label ?? p.name, sub: p.sub ?? '', min: p.min, max: p.max, value: p.value, hand: true,
        ...(p.step ? { step: p.step } : {}),
        onInput: (x) => bay.send(ID(`knob-${p.name}`, 'value-out'), { of: 'param', name: p.name, v: x }),
      });
      knob.el.dataset.param = p.name;
      knob.el.title = `${v.label} ${p.label ?? p.name}, ${p.min} to ${p.max} ${p.unit}`;
      return [p.name, knob];
    })));
    knobGrid = createKnobGrid(knobs, { row: true });
  }

  // ── the scopes, one per drum, each fed by that drum's own wire ───────────
  /** Each scope's loudness over the last frames, for a check that one drum
   *  is on its own scope and nowhere else. */
  const scopeLevels = new Map(ALL.map((v) => [v.key, []]));
  /**
   * TRIGGERED, HELD SCOPES, asked 2026-10-12: *"scopes are very "nervous"."*.
   * Each scope takes its drum's window from the hit's onset (it knows the
   * time the hit sounds, off its `midi-in`) and holds it until the next hit,
   * the previous trace faint underneath. The kit's own option:
   * `createWaveShape({ mode: 'triggered', window, fade, source })`. The
   * window suits the drum: a kick's body and fall, a snare's crack and wires,
   * the open hat's ring, the closed hat's tick. The label and the span are
   * fixed strings, so nothing on a scope changes size as it redraws.
   */
  const WINDOW = { kick: 250, snare: 200, hho: 500, hhc: 80 };
  // The analyser exists only once the engine is up, so it is handed over then (`listen`).
  const views = wantScopes ? ALL.map((v) => createWaveShape({ reason: null, colour: '--hi', height: 90, name: v.label,
    axes: { x: `${WINDOW[v.key]} ms` }, mode: 'triggered', window: WINDOW[v.key], fade: 1, full: 0.6 })) : null;
  /** Each scope's own loudness, measured per frame, for a check that one drum
   *  is on its own scope and nowhere else. Not drawn. */
  function drawScopes() {
    if (!views) return;
    ALL.forEach((v) => {
      const s = scopeAn.get(v.key);
      if (!s) return;
      s.an.getFloatTimeDomainData(s.buf);
      // The newest 2048 samples: the buffer holds 0.68 s, and its old end
      // would still hold a hit from before the last stop.
      let sum = 0;
      for (let i = s.buf.length - 2048; i < s.buf.length; i++) sum += s.buf[i] * s.buf[i];
      const L = scopeLevels.get(v.key);
      L.push({ t: performance.now(), rms: Math.sqrt(sum / 2048) });
      if (L.length > 600) L.splice(0, L.length - 600);
    });
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
    BAR, tempo, clear, setBpm,
    /** The drums that are rows now (every one of `voices` unless a shape says fewer). */
    get VOICES() { return VOICES; },
    ALL,
    paramSends: () => paramSends, patternsIn: () => patternsIn, refresh: () => pb.refresh(),
    scopeLevels, route, views,
    /** A drum's own stereo signal (its output pair), once the engine is up. */
    outOf: (key) => outs.get(key) ?? null,
    /** With `mix`: the drums' sum, once the engine is up, for the page to route. */
    mixOut: () => junction,
    aheadMs,
    bpm: () => bpm, stepMs: () => stepMsAt(bpm),
    /** When absolute step k was handed over to sound, on performance.now()'s clock. */
    stepTime: (k) => handed.get(k),
    playing: () => playing, laps: () => laps, t0: () => t0, shown: () => shown,
    ctx: () => ctx, engine: () => eng,
    /** The mix's loudness right now, read off the analyser, 0 before the first play. */
    level: () => { if (!an) return 0; an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; return Math.sqrt(s / buf.length); },
    start, stop,
    /** The shape now, and a new one: at once when stopped, at the top of the next loop when playing. */
    shape: () => ({ rows: VOICES.length, steps: STEPS }),
    /** `fresh`: build the grid again, empty, even when the shape is the same (a new kit). */
    setShape(sh, { fresh = false } = {}) {
      if (!fresh && sh.rows === VOICES.length && sh.steps === STEPS) { pendingShape = null; return; }
      if (playing) pendingShape = sh; else reshape(sh);
    },
    pendingShape: () => pendingShape,
  };
  return { surface, knobs: knobGrid?.el ?? null, scopes: views ? views.map((w) => w.el) : null, patchbay: pb.el, api };
}

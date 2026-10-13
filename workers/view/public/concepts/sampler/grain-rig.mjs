// demo/concepts/sampler/grain-rig.mjs: everything a granulator concept page has
// that is not its engine. Lifted out of sampler/050 (now /archive/pappus/) on 2026-10-13 when its
// lighter twin sampler/060 arrived (BACKLOG, *"the plain GrainBuf ring is the
// real lighter twin of Pappus - do"*), so the two pages share one copy:
// the sources, the patchbay, the two scopes with their grain ticks, the grain
// events, the two knobs, Play, `window.__demo.grains` and the self check.
// A page hands in an ENGINE and its PATCHES and nothing else.
//
// Named for what it is rather than `grain-sources.mjs`: the sources are one
// part of it, and a file called sources that also holds the scopes would be a
// name somebody has to see past.
//
// THE ENGINE CONTRACT. `engine` is
//   {
//     label,                          the web:grains box's label
//     boot({ ctx, input, grain, log }) -> { meter, out, timing, scsynth }
//         bring it up with `input` (an AudioNode) feeding its input bus;
//         `meter` is an analyser on its output and `out` a gain the rig
//         opens and closes for the speaker wire, `scsynth` the booted
//         engine for a check over CDP. Call `grain(g)` for every
//         grain the ENGINE reports, `g = { pos, ago, dur, voice, half }`:
//         `pos` 0..1 of the window it reads, `ago` how many seconds ago the
//         audio under it arrived. Nothing here invents a grain.
//     land(i, now)                     what patch i sets that is NOT a knob
//                                      (the knobs glide there on their own);
//                                      `now` is every knob's value right now
//     fixed(set)                       a patch's fixed values, written at once
//     knob(name, v)                    one control, by its name in `controls`,
//                                      and 'mix' (0 dry to 1 wet) when `mixes`
//     mixes                            true when the engine blends its own
//                                      input against its grains; otherwise
//                                      the rig mixes outside it, with the
//                                      dry source on a wire of its own
//     run(on)                          pause or resume, keeping the ring
//     read(name) -> Promise<number>    a knob's value ASKED OF THE SERVER
//     glitches() -> number|null
//     moving() -> string[]             optional: controls the engine moves by
//                                      itself, so their read back value is the
//                                      patch's plus that movement
//     value(ev) -> boolean             optional: an event on web:grains:value-in
//                                      that is not a knob's or a patch's (070's
//                                      tempo, its follow switch); true when the
//                                      engine took it
//   }
// `controls` is everything a patch sets, each a knob a person may turn:
// `{ name, label, kind: 'knob', min, max, warp: 'lin' | 'exp', fmt }` for an
// amount, `{ name, label, kind: 'steps', choices: [{ label, value }] }` for a
// choice (the kit's stepped knob, `step: 1`; a value may be an array, a chord
// or a figure, and is matched whole). Each knob is a cell of its own in
// one row (asked 2026-10-13, *"no grouped buttons"*), its label short enough
// to fit the cell,
// and `patches` is `[{ name, says, set, fixed }]`: `set` a value for every
// knob, `fixed` everything else the patch sets, and each name written as it
// is to be shown (sentence case).
//
// FEW KNOBS, THE REST FIXED. Asked 2026-10-13: *"reduce granulator knobs a
// lot. fix values. patch only changes those"*. What is not a knob is set by
// the patch alone: `web:patch:value-out-2` carries it, one `{ of: 'fixed',
// set }` event per patch change, straight into `web:grains:value-in`, and the
// engine writes it at once with no glide (`engine.fixed(set)`).
//
// THE PATCH IS A NODE AND THE KNOBS TAKE INPUT. Asked 2026-10-13: *"expose
// them. route patch to knobs (should take input)"* and *"patch selection
// should slowly go to new values"*. `web:patch:value-out` is wired into every
// knob's `value-in`; a patch change is ONE event carrying the whole set, and
// each knob takes its own value and glides there over `GLIDE_MS`, eased, its
// own needle moving. Every knob's `value-out` goes into `web:grains:value-in`,
// so the knobs are the only thing that drives the grains. A hand on a knob
// during a glide stops that knob's glide, and what it is turned to holds
// until the next patch. A stepped knob (a mode, a chord, freeze) steps at the
// START of the glide: halfway between two chords is a third chord nobody
// chose, and a freeze that lands at the start holds the moment you chose.
// The wet/dry is first in the row (asked 2026-10-13, *"move wet/dry to
// first"*) and no patch moves it.
//
// THE SOURCES. A source is an audio node into the granulator's input and that
// is the whole contract: each entry's `open(ctx)` resolves to `{ node, stop }`.
// A recording decodes a file from our R2 bucket and loops it. A microphone, a
// tab's audio, the Pi over the relay or our own stage stream are one more
// entry each with their own `open`, and nothing else changes, because both
// engines record whatever reaches their input bus and never see a file.
// `store` says where the bytes come from, for the patchbay; a live source has
// none. Never an outside station: these were captured once and are kept in
// our bucket.
//
// NOTHING OPENS ON A VISIT. No AudioContext, no fetch, no engine, no prefetch
// hint: Play brings the engine up, fetches the recording and starts both.
import { el } from '/shell/shell.mjs';
import { SELFCHECK } from '/shell/selfcheck.mjs';
import { createBay } from '/shell/bay.mjs';
import { createPatchbay } from '/shell/patchbay.mjs';
import { createVideoPanel } from '/shell/video-panel.mjs';
import { createGrainScope } from '/shell/grain-scope.mjs';
import { createButtonGroup } from '/shell/button-group.mjs';
import { createPicker } from '/shell/picker.mjs';
import { createKnob } from '/shell/knob.mjs';
import { createKnobGrid } from '/shell/knob-grid.mjs';

/** The window both engines read, in seconds, and the source scope's width. */
export const WINDOW_S = 8;
export const MEDIA = 'https://positron-station.kristjan-jansen.workers.dev/media/';

// ── the recordings ─────────────────────────────────────────────────────────
// One gain per second of the file, raised (never lowered) toward -16 dB RMS by
// at most 36 dB and eased across seconds, then a soft knee over 0.8. It is
// /concepts/radio/020/'s levelling made shorter: MEASURED there, the Ida
// capture is -44 dB RMS under one loud stretch, so one gain for the whole file
// would leave it inaudible.
const LEVEL_RMS = 10 ** (-16 / 20), LEVEL_MAX_DB = 36, KNEE = 0.8;
export function level(b) {
  const sr = b.sampleRate, n = b.length, blk = Math.round(sr), nb = Math.ceil(n / blk);
  const chs = Array.from({ length: b.numberOfChannels }, (_, c) => b.getChannelData(c));
  const gdb = new Float32Array(nb);
  for (let k = 0; k < nb; k++) {
    let sum = 0, m = 0;
    for (const x of chs) for (let i = k * blk; i < Math.min(n, (k + 1) * blk); i += 2) { sum += x[i] * x[i]; m++; }
    const rms = Math.sqrt(sum / Math.max(1, m));
    gdb[k] = rms > 1e-6 ? Math.max(0, Math.min(LEVEL_MAX_DB, 20 * Math.log10(LEVEL_RMS / rms))) : 0;
  }
  const lo = gdb.map((g, k) => Math.min(g, gdb[k - 1] ?? g, gdb[k + 1] ?? g));
  const eased = lo.map((g, k) => ((lo[k - 1] ?? g) + g + (lo[k + 1] ?? g)) / 3);
  const room = 1 - KNEE;
  for (let i = 0; i < n; i++) {
    const pos = i / blk - 0.5, k0 = Math.max(0, Math.min(nb - 1, Math.floor(pos))), k1 = Math.min(nb - 1, k0 + 1);
    const f = Math.max(0, Math.min(1, pos - k0));
    const g = 10 ** ((eased[k0] * (1 - f) + eased[k1] * f) / 20);
    for (const x of chs) {
      const v = x[i] * g, a = v < 0 ? -v : v;
      x[i] = a <= KNEE ? v : Math.sign(v) * (KNEE + room * Math.tanh((a - KNEE) / room));
    }
  }
  return eased.reduce((s, g) => s + g, 0) / nb;
}

/** The sources a page offers. `log` is the page's log; `?src=` swaps every URL. */
export function createSources({ log = () => {} } = {}) {
  const asked = new URLSearchParams(location.search).get('src');
  const decoded = new Map();          // source id -> AudioBuffer, decoded once
  async function openRecording(ac, id, label, url) {
    let b = decoded.get(id);
    if (!b) {
      log(`fetching ${url}`);
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} from ${url}`);
      const ab = await r.arrayBuffer();
      const size = ab.byteLength;
      b = await ac.decodeAudioData(ab);
      const raised = level(b);
      decoded.set(id, b);
      log(`${label}: ${(size / 1e6).toFixed(2)} MB, ${b.duration.toFixed(1)} s, raised ${raised.toFixed(1)} dB on average`);
    }
    const node = ac.createBufferSource();
    node.buffer = b; node.loop = true;
    node.start();
    return { node, stop: () => { try { node.stop(); node.disconnect(); } catch { /* already stopped */ } } };
  }
  const recording = (id, label, key) => {
    const url = asked || `${MEDIA}${key}`;
    return { id, label, kind: 'recording', store: 'cf-r2', url, open: (ac) => openRecording(ac, id, label, url) };
  };
  const list = [
    // A recording is named as one, so it is never taken for the live station
    // (asked 2026-10-13, *"when you have radio recordings, suffix patch names
    // with '... recording'"*).
    recording('raadio2', 'Raadio 2 recording', 'radio/raadio2/2026-10-11.mp3'),
    recording('raadio4', 'Raadio 4 recording', 'radio/raadio4/2026-10-11.mp3'),
    recording('ida', 'Ida recording', 'radio/ida/2026-10-11.aac'),
  ];
  list.fetched = () => decoded.size;
  return list;
}

// ── the page ───────────────────────────────────────────────────────────────
const CSS = `
  .cc-wave .pos-scope { margin: 0; --edge: 0px; --r: 0px; }
  .cc-wave .pos-scope-gut { display: none; }
  .cc-wave { position: relative; }
  .cc-births { position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
  .cc-top { display: flex; gap: var(--ctl-gap); }
  .cc-top > .pos-bgroup { flex: none; width: auto; }
  .cc-patch { display: flex; }
  .cc-patch > .pos-pick { display: flex; width: 100%; height: auto; }
  .cc-patch .pos-pick-seg { display: flex; flex: 1 1 auto; min-width: 0; }
  .cc-patch .pos-pick-cell { width: auto; flex: 1 1 0; min-width: 0; }
`;
// The kit's grain scope as a panel's picture, as /concepts/radio/020/ draws
// it: the panel's stage is the edge and the ground, so the scope gives up its
// own margin, border and corner, and its always-empty caption takes no room.
// The grains' start times over the output scope are a canvas laid exactly on
// the scope's, so it moves nothing. Play sits on its own row, at its own size.
// A patch picker standing alone (`outputScope: false`) spans its row, with
// the kit's own phone arrangement of `.pos-pick` (shell.css) at every width
// (asked 2026-10-13, *"patch selector full w"*).

/**
 * @param {object} o
 * @param o.d        the page's `mount()` result
 * @param o.engine   see the contract at the top of this file
 * @param o.patches  `[{ name, says, set }]`
 * @param o.controls the knobs, plain and stepped, see the contract above
 * @param o.roles    which control is a grain's length and which is how many a
 *                   second, for the self check: `{ size, density }`
 * @param o.hue      `(knob) => number|null`, a knob's hue, so a page that shows
 *                   its program can colour a knob and its control alike
 * @param o.under    elements that go under the knobs (a code box: knobs above
 *                   the code, as every concept page with both has them)
 * @param o.check    `async (tools) => {}`, the page's own checks, run inside the
 *                   self check while the sound is still playing
 * @param o.outputScope false for no output scope: the patch picker then stands
 *                   alone where the scope's panel was (050, asked 2026-10-13,
 *                   *"replace with just a patch selector (no scope/viz/footer)"*)
 * @param o.source   the id of the source the picker opens on (060 opens on
 *                   `ida`, asked 2026-10-13, *"put ida rec default"*); the
 *                   first one when it is not given or names none
 * @param o.wire     `({ bay, hold, holds, ports }) => {}`, called once the rig's own
 *                   nodes and links are in the bay and before the patchbay is
 *                   drawn, so a page can add nodes and links of its own (070's
 *                   tempo detector). `ports` names the rig's ports.
 * @param o.audio    `({ ctx, bus }) => {}`, called once when Play first builds
 *                   the audio graph: `bus` is the chosen source, the same node
 *                   the granulator and the source scope hear
 * @param o.top      elements after Play on its row (070's follow switch)
 *
 * Added 2026-10-13 for /concepts/sampler/070/; a page that passes none of
 * wire, audio, top or `engine.value` gets what it got before.
 */
export function createGrainRig({ d, engine, patches, controls, roles = { size: 'size', density: 'rate' },
  hue = () => null, under = [], check: pageCheck = null, outputScope = true, source: firstSource = null,
  wire = null, audio = null, top: topExtra = [] }) {
  if (!document.getElementById('cc-grain-css')) {
    const st = el('style'); st.id = 'cc-grain-css'; st.textContent = CSS; document.head.append(st);
  }
  const SOURCES = createSources({ log: (m) => d.log(m) });
  let at = Math.max(0, SOURCES.findIndex((s) => s.id === firstSource));

  // ── the bay ──────────────────────────────────────────────────────────────
  const S = 'web';
  const FILE_OUT = (s) => `${s.store}:${s.id}:file-out`;
  const RADIO_IN = `${S}:radio:file-in`, RADIO_OUT = `${S}:radio:audio-out`;
  const GRAINS_IN = `${S}:grains:audio-in`, GRAINS_OUT = `${S}:grains:audio-out`;
  const GRAINS_VAL = `${S}:grains:value-in`;
  const GRAINS_EV = `${S}:grains:value-out`;
  const WAVE_IN = `${S}:wave:audio-in`, WAVE_EV = `${S}:wave:value-in`;
  const SCOPE_IN = `${S}:scope:audio-in`, SCOPE_EV = `${S}:scope:value-in`;
  const SPEAKER_IN = `${S}:speaker:audio-in`;
  const PATCH_OUT = `${S}:patch:value-out`, PATCH_FIXED = `${S}:patch:value-out-2`;
  const KNOB_IN = (n) => `${S}:knob-${n}:value-in`, KNOB_OUT = (n) => `${S}:knob-${n}:value-out`;
  const MIX = { name: 'mix', label: 'wet/dry', kind: 'knob', min: 0, max: 1, warp: 'lin', fmt: (v) => `${Math.round(v * 100)}%` };
  // An engine that does not blend its own dry and wet is mixed here: the dry
  // source goes to the speakers on a wire of its own, beside the grains.
  const outside = !engine.mixes;

  const bay = createBay();
  for (const s of SOURCES) {
    bay.addNode({ id: `${s.store}:${s.id}`, kind: 'store', label: s.label, place: 'cloudflare', net: 'cloudflare' });
    bay.addPort({ id: FILE_OUT(s), label: 'recording', dir: 'out', medium: 'file', transports: ['https'], address: s.url });
  }
  bay.addNode({ id: `${S}:radio`, kind: 'engine', label: 'radio', place: 'browser' });
  bay.addPort({ id: RADIO_IN, label: 'radio', dir: 'in', medium: 'file' });
  bay.addPort({ id: RADIO_OUT, label: 'radio', dir: 'out', medium: 'audio' });
  bay.addNode({ id: `${S}:grains`, kind: 'engine', label: engine.label, place: 'browser' });
  bay.addPort({ id: GRAINS_IN, label: 'grains', dir: 'in', medium: 'audio' });
  bay.addPort({ id: GRAINS_OUT, label: 'grains', dir: 'out', medium: 'audio' });
  // Every knob's value comes in here, one port for all of them, as on
  // /concepts/synth/090/; the event names its control.
  bay.addPort({ id: GRAINS_VAL, label: 'values', dir: 'in', medium: 'value', deliver: (ev) => valueIn(ev) });
  // Every grain the engine reports leaves here as one event, so anything that
  // wants to follow the grains (the two scopes today, a picture later) holds a
  // link from this port rather than reaching into the engine.
  bay.addPort({ id: GRAINS_EV, label: 'grains', dir: 'out', medium: 'value' });
  bay.addNode({ id: `${S}:wave`, kind: 'screen', label: 'source scope', place: 'browser' });
  bay.addPort({ id: WAVE_IN, label: 'wave', dir: 'in', medium: 'audio' });
  bay.addPort({ id: WAVE_EV, label: 'grains', dir: 'in', medium: 'value', deliver: (ev) => waveGrain(ev) });
  if (outputScope) {
    bay.addNode({ id: `${S}:scope`, kind: 'screen', label: 'output scope', place: 'browser' });
    bay.addPort({ id: SCOPE_IN, label: 'scope', dir: 'in', medium: 'audio' });
    bay.addPort({ id: SCOPE_EV, label: 'grains', dir: 'in', medium: 'value', deliver: (ev) => scopeGrain(ev) });
  }
  bay.addNode({ id: `${S}:speaker`, kind: 'screen', label: 'speakers', place: 'browser' });
  bay.addPort({ id: SPEAKER_IN, label: 'speakers', dir: 'in', medium: 'audio' });
  bay.addNode({ id: `${S}:patch`, kind: 'engine', label: 'patch', place: 'browser' });
  bay.addPort({ id: PATCH_OUT, label: 'patch', dir: 'out', medium: 'value' });
  bay.addPort({ id: PATCH_FIXED, label: 'fixed', dir: 'out', medium: 'value' });
  for (const c of [MIX, ...controls]) {
    bay.addNode({ id: `${S}:knob-${c.name}`, kind: 'person', label: c.label, place: 'browser' });
    // The wet/dry is no patch's, so it has nothing coming in.
    if (c !== MIX) bay.addPort({ id: KNOB_IN(c.name), label: c.label, dir: 'in', medium: 'value', deliver: (ev) => patchIn(c.name, ev) });
    bay.addPort({ id: KNOB_OUT(c.name), label: c.label, dir: 'out', medium: 'value' });
  }

  // The links, held from load so the picture does not change with play.
  const held = new Map();
  function hold(a, b) {
    const k = `${a} ${b}`;
    if (held.has(k)) return;
    const r = bay.link(a, b, [], { site: S });
    if (r.ok) held.set(k, r.id); else d.log(`${a} -> ${b} refused: ${r.why}`, 'warn');
  }
  // The sound follows the links the bay holds, read off `bay.links()`.
  const holds = (a, b) => bay.links().some((l) => l.from === a && l.to === b);
  for (const s of SOURCES) hold(FILE_OUT(s), RADIO_IN);
  hold(RADIO_OUT, GRAINS_IN);
  if (outside) hold(RADIO_OUT, SPEAKER_IN);
  for (const c of controls) hold(PATCH_OUT, KNOB_IN(c.name));
  hold(PATCH_FIXED, GRAINS_VAL);
  for (const c of [MIX, ...controls]) hold(KNOB_OUT(c.name), GRAINS_VAL);
  hold(RADIO_OUT, WAVE_IN);
  hold(GRAINS_OUT, SPEAKER_IN);
  if (outputScope) hold(GRAINS_OUT, SCOPE_IN);
  hold(GRAINS_EV, WAVE_EV);
  if (outputScope) hold(GRAINS_EV, SCOPE_EV);
  wire?.({ bay, hold, holds, ports: { RADIO_OUT, GRAINS_IN, GRAINS_OUT, GRAINS_VAL, GRAINS_EV, WAVE_IN, WAVE_EV, SPEAKER_IN, PATCH_OUT, PATCH_FIXED } });

  // ── state ────────────────────────────────────────────────────────────────
  let ctx = null, srcBus = null, toGrains = null, srcTap = null, srcBuf = null, outBuf = null;
  // `dry` is the outside mix's dry path, unused when the engine mixes;
  // `heard` is an analyser on what the speakers get, wet and dry together.
  let dry = null, heard = null;
  let eng = null, booting = null, source = null, opening = null, fetchedAt = 0, playing = false;
  let patchAt = 0;
  // `mix` is not a patch's: a patch change leaves the wet/dry where it is.
  const cur = { ...patches[0].set, mix: 1 };
  // The grain ticks fade with the grains in the sound, and never quite out,
  // so a dry setting still shows the grains are being made.
  const tickAlpha = () => 0.15 + 0.85 * cur.mix;

  // ── the grains, as data ──────────────────────────────────────────────────
  const EV_KEEP = 400;
  const events = [];
  const listeners = new Set();
  let grainCount = 0;
  function grain(g) {
    if (!playing) return;
    // Whatever else an engine knows about a grain rides along (the ring reports each grain's rate).
    const { pos, ago, dur, voice = 0, half = 0, ...more } = g;
    const ev = { of: 'grain', at: +ctx.currentTime.toFixed(4), pos, ago: +ago.toFixed(3), dur, voice, half,
      patch: patches[patchAt].name, ...more };
    grainCount++;
    events.push(ev);
    if (events.length > EV_KEEP) events.shift();
    for (const fn of listeners) { try { fn(ev); } catch { /* a listener's fault is its own */ } }
    bay.send(GRAINS_EV, ev);
  }

  // ── the pictures ────────────────────────────────────────────────────────
  // The SOURCE scope: the last eight seconds of what went into the granulator,
  // which is exactly what its ring holds, with every grain a tick at the place
  // in that sound it read. The kit's `grainSeconds` puts a mark of position p
  // at `(1 - p) * 8` seconds ago, so each grain is handed `1 - ago / 8`.
  const waveHost = el('div', 'cc-wave');
  const wave = createGrainScope(waveHost, { seconds: WINDOW_S, height: 120, fullScale: 1, grainSeconds: WINDOW_S });
  function waveGrain(ev) {
    if (ev?.of !== 'grain') return;
    wave.mark({ pos: 1 - ev.ago / WINDOW_S, dur: ev.dur, voice: ev.voice, half: ev.half });
  }
  const pick = createPicker({ what: 'source', prev: () => choose(at - 1), next: () => choose(at + 1), onPick: (i) => choose(i) });
  pick.options(SOURCES.map((s) => s.label), at);
  const wavePanel = createVideoPanel({ media: waveHost, aspect: 'auto', right: false, left: pick.el });

  // The OUTPUT scope: what the granulator sends to the speakers, with each
  // grain's start drawn as a hairline at the moment the engine reported it, so
  // the marks scroll left with the sound they started.
  const OUT_S = 4;
  const scopeHost = el('div', 'cc-wave');
  const scope = createGrainScope(scopeHost, { seconds: OUT_S, height: 120, fullScale: 1 });
  const birthCanvas = el('canvas', 'cc-births');
  scopeHost.append(birthCanvas);
  const births = [];
  function scopeGrain(ev) {
    if (ev?.of !== 'grain') return;
    births.push({ at: ev.at, dur: ev.dur });
    if (births.length > 2000) births.shift();
  }
  const patchPick = createPicker({ what: 'patch', prev: () => choosePatch(patchAt - 1), next: () => choosePatch(patchAt + 1),
    onPick: (i) => choosePatch(i) });
  patchPick.options(patches.map((p) => p.name), 0);
  const scopePanel = outputScope ? createVideoPanel({ media: scopeHost, aspect: 'auto', right: patchPick.el, left: false })
    : { el: (() => { const row = el('div', 'cc-patch'); row.append(patchPick.el); return row; })() };

  const tok = (k) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  let ink = null;
  const inks = () => (ink ??= { hi: tok('--hi') || '#ffd400' });
  function fit(c) {
    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr);
    if (W && H && (c.width !== W || c.height !== H)) { c.width = W; c.height = H; }
    return { W, H, dpr };
  }
  function drawBirths() {
    const { W, H, dpr } = fit(birthCanvas);
    if (!W || !H) return;
    const g = birthCanvas.getContext('2d');
    g.clearRect(0, 0, W, H);
    const now = ctx.currentTime;
    while (births.length && births[0].at < now - OUT_S - 0.5) births.shift();
    g.fillStyle = inks().hi;
    for (const b of births) {
      const age = now - b.at;
      const x = Math.round(W - (age / OUT_S) * W);
      if (x < 0 || x > W) continue;
      // Brightest as it starts, fading over the grain's own length.
      g.globalAlpha = tickAlpha() * (0.25 + 0.75 * Math.max(0, 1 - age / Math.max(0.05, b.dur || 0.1)));
      g.fillRect(x - dpr, H * 0.82, dpr, H * 0.18);
    }
    g.globalAlpha = 1;
  }

  // grains per second, over the last second of events
  function gps() {
    if (!ctx) return 0;
    const now = ctx.currentTime;
    let n = 0;
    for (let i = events.length - 1; i >= 0 && events[i].at > now - 1; i--) n++;
    return n;
  }
  function frame() {
    if (!playing) return;
    if (holds(RADIO_OUT, WAVE_IN)) { srcTap.getFloatTimeDomainData(srcBuf); wave.feed(srcBuf, ctx.sampleRate); }
    if (outputScope && eng && holds(GRAINS_OUT, SCOPE_IN)) { heard.getFloatTimeDomainData(outBuf); scope.feed(outBuf, ctx.sampleRate); }
    if (outputScope) drawBirths();
    requestAnimationFrame(frame);
  }

  // ── the patchbay ─────────────────────────────────────────────────────────
  // The file wire is lit while the recording comes down and for 600 ms after;
  // the audio wires while it plays. Value wires pulse once per event.
  const pb = createPatchbay(bay, {
    flowing: (l, medium) => {
      if (medium === 'file') return l.from === FILE_OUT(SOURCES[at]) && (!!opening || (fetchedAt && performance.now() - fetchedAt < 600));
      if (medium === 'audio') return playing && !!source;
      return false;
    },
  });

  function choose(i) {
    const n = (i + SOURCES.length) % SOURCES.length;
    if (n === at) return;
    at = n;
    pick.show(SOURCES[at].label, at);
    pb.refresh();
    if (playing) plug();
  }
  /** The chosen source into the bus the granulator records. */
  async function plug() {
    const s = SOURCES[at];
    const job = opening = s.open(ctx);
    pb.refresh();
    let got;
    try { got = await job; }
    catch (e) { d.log(`${s.label} did not open: ${e?.message || e}`, 'warn'); return false; }
    finally { if (opening === job) { opening = null; fetchedAt = performance.now(); pb.refresh(); } }
    if (!playing || SOURCES[at] !== s) { got.stop(); return false; }
    source?.stop();
    source = got;
    source.node.connect(srcBus);
    pb.refresh();
    return true;
  }

  // ── the engine ───────────────────────────────────────────────────────────
  function route() {
    try { srcBus.disconnect(toGrains); } catch { /* not connected */ }
    if (holds(RADIO_OUT, GRAINS_IN)) srcBus.connect(toGrains);
    // Equal power, so the middle of the knob does not dip. When the engine
    // mixes, its output is already the blend and goes out whole.
    const wet = outside ? Math.sin(cur.mix * Math.PI / 2) : 1;
    if (eng) eng.out.gain.setTargetAtTime(holds(GRAINS_OUT, SPEAKER_IN) && playing ? 0.9 * wet : 0, ctx.currentTime, 0.02);
    if (dry) dry.gain.setTargetAtTime(holds(RADIO_OUT, SPEAKER_IN) && playing ? 0.9 * Math.cos(cur.mix * Math.PI / 2) : 0, ctx.currentTime, 0.02);
  }
  function boot() {
    booting ??= (async () => {
      eng = await engine.boot({ ctx, input: toGrains, grain, log: (m, k) => d.log(m, k) });
      eng.out.connect(heard);
      engine.land(patchAt, { ...cur });
      engine.fixed(patches[patchAt].fixed);
      // Every knob as it stands, which is the patch unless one was turned before Play.
      for (const c of controls) engine.knob(c.name, cur[c.name]);
      if (engine.mixes) engine.knob('mix', cur.mix);
      d.log(`${patches[patchAt].name}: ${patches[patchAt].says}`);
      return eng;
    })();
    booting.catch(() => { booting = null; eng = null; });
    return booting;
  }

  // ── a patch, the knobs it moves, and the glide ───────────────────────────
  function choosePatch(i) {
    const n = (i + patches.length) % patches.length;
    patchAt = n;
    patchPick.show(patches[n].name, n);
    if (eng) { engine.land(n, { ...cur }); d.log(`${patches[n].name}: ${patches[n].says}`); }
    bay.send(PATCH_OUT, { of: 'patch', name: patches[n].name, set: { ...patches[n].set } });
    bay.send(PATCH_FIXED, { of: 'fixed', name: patches[n].name, set: { ...patches[n].fixed } });
  }
  /** A patch arriving at one knob, on its wire from web:patch. */
  function patchIn(name, ev) {
    if (ev?.of !== 'patch' || !ev.set || !(name in ev.set)) return;
    glideTo(name, ev.set[name]);
  }
  /** A knob's value arriving at the grains, on its wire into web:grains. */
  function valueIn(ev) {
    if (engine.value?.(ev)) return;
    if (ev?.of === 'fixed') { if (eng && ev.set) engine.fixed(ev.set); return; }
    if (ev?.of !== 'param' || ev.v === undefined || !(ev.name in cur)) return;
    if (ev.name === 'mix' && !Number.isFinite(ev.v)) return;
    cur[ev.name] = ev.v;
    if (ev.name === 'mix') {
      wave.grainAlpha(tickAlpha());
      if (ctx) route();
      if (!engine.mixes) return;
    }
    if (eng) engine.knob(ev.name, ev.v);
  }
  // A knob's travel is 0 to 1 and its warp says what that means: `exp` puts
  // the middle of the knob at the middle of the octaves (20 ms to 4 s, 0.5 to
  // 64 a second), `lin` is straight. A glide moves the travel, so an `exp`
  // knob glides evenly in octaves.
  const byName = new Map([MIX, ...controls].map((c) => [c.name, c]));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const stepOf = (c, v) => Math.max(0, c.choices.findIndex((x) => same(x.value, v)));
  const toV = (c, k) => (c.warp === 'exp' ? c.min * (c.max / c.min) ** k : c.min + (c.max - c.min) * k);
  const toK = (c, v) => Math.min(1, Math.max(0, c.warp === 'exp' ? Math.log(v / c.min) / Math.log(c.max / c.min) : (v - c.min) / (c.max - c.min)));
  const send = (name, v) => bay.send(KNOB_OUT(name), { of: 'param', name, v });
  const knobs = new Map();
  for (const c of [MIX, ...controls]) {
    if (c.kind === 'steps') {
      // The kit's stepped knob, as /kit/devices/ shows it: `step: 1` over the choices.
      knobs.set(c.name, createKnob({
        label: c.label, min: 0, max: c.choices.length - 1, step: 1, value: stepOf(c, cur[c.name]),
        format: (i) => c.choices[Math.round(i)]?.label ?? '',
        onInput: (i) => send(c.name, c.choices[Math.round(i)].value),
      }));
      continue;
    }
    knobs.set(c.name, createKnob({
      label: c.label, min: 0, max: 1, value: toK(c, cur[c.name]),
      format: (k) => c.fmt(toV(c, k)),
      onInput: (k, from) => { if (from === 'hand') glides.delete(c.name); send(c.name, toV(c, k)); },
    }));
  }
  for (const [name, knob] of knobs) {
    const h = hue(name);
    if (h != null) { knob.el.dataset.param = name; knob.el.style.setProperty('--param-hue', String(h)); }
  }
  const knobRow = createKnobGrid(knobs, { row: true });

  /** How long a patch takes to arrive, eased in and out: long enough to hear it travel. */
  const GLIDE_MS = 1600, GLIDE_TICK_MS = 40;
  const glides = new Map();          // knob name -> { k0, k1, t0 }
  let glideTimer = 0;
  function glideTo(name, v) {
    const c = byName.get(name), knob = knobs.get(name);
    if (c.kind === 'steps') { knob.set(stepOf(c, v), { from: 'self' }); return; }
    const k0 = knob.value(), k1 = toK(c, v);
    if (Math.abs(k1 - k0) < 1e-6) { send(name, v); return; }
    glides.set(name, { k0, k1, t0: performance.now() });
    glideTimer ||= setInterval(glideStep, GLIDE_TICK_MS);
  }
  function glideStep() {
    const now = performance.now();
    for (const [name, g] of glides) {
      const t = Math.min(1, (now - g.t0) / GLIDE_MS), e = 0.5 - 0.5 * Math.cos(Math.PI * t);
      knobs.get(name).set(g.k0 + (g.k1 - g.k0) * e, { from: 'self' });
      if (t >= 1) glides.delete(name);
    }
    if (!glides.size) { clearInterval(glideTimer); glideTimer = 0; }
  }
  const glidingNow = () => [...glides.keys()];

  // ── play and stop ────────────────────────────────────────────────────────
  async function play() {
    ctx ??= new AudioContext({ sampleRate: 48000 });
    ctx.resume();
    if (!srcBus) {
      srcBus = ctx.createGain();
      toGrains = ctx.createGain();
      srcTap = ctx.createAnalyser(); srcTap.fftSize = 2048; srcTap.smoothingTimeConstant = 0;
      srcBuf = new Float32Array(srcTap.fftSize);
      outBuf = new Float32Array(2048);
      srcBus.connect(srcTap);
      // pulled, or the analyser is never asked to run
      const pull = ctx.createGain(); pull.gain.value = 0; srcTap.connect(pull).connect(ctx.destination);
      heard = ctx.createAnalyser(); heard.fftSize = 2048; heard.smoothingTimeConstant = 0;
      heard.connect(pull);
      if (outside) {
        dry = ctx.createGain(); dry.gain.value = 0;
        srcBus.connect(dry);
        dry.connect(ctx.destination);
        dry.connect(heard);
      }
      audio?.({ ctx, bus: srcBus });
    }
    playing = true;
    face();
    route();
    const wasUp = !!eng;
    try { await boot(); } catch (e) { d.log(`the granulator did not come up: ${e?.message || e}`, 'bad'); playing = false; face(); return; }
    if (!playing) return;
    if (wasUp) engine.run(true);
    route();
    await plug();
    pb.refresh();
    requestAnimationFrame(frame);
  }
  function stop() {
    playing = false;
    source?.stop(); source = null;
    // Paused, not freed: the ring keeps what it held and the next Play goes on from it.
    if (eng) engine.run(false);
    route();
    pb.refresh();
    face();
  }

  const transport = createButtonGroup({ buttons: [
    { id: 'play', icon: 'play', label: 'play', onPress: () => (playing ? stop() : play()) },
  ] });
  function face() { transport.setIcon('play', playing ? 'stop' : 'play', playing ? 'stop' : 'play'); }
  face();

  const top = el('div', 'cc-top');
  top.append(transport.el, ...topExtra);
  d.stack.add(top, wavePanel.el, scopePanel.el, knobRow.el, ...under, pb.el);

  // ── read only, for a check over CDP, and for a picture that wants the grains ─
  const meterRms = (ms = 1000) => new Promise((res) => {
    const buf = new Float32Array(2048); let s = 0, n = 0;
    const id = setInterval(() => { heard.getFloatTimeDomainData(buf); for (const v of buf) { s += v * v; n++; } }, 50);
    setTimeout(() => { clearInterval(id); res(Math.sqrt(s / Math.max(1, n))); }, ms);
  });
  const api = {
    events: () => events.slice(),
    /** Follow every grain as it is reported. Returns a function that stops. */
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    playing: () => playing, source: () => SOURCES[at].id, patch: () => patches[patchAt].name,
    knob: (name) => cur[name] ?? null, count: () => grainCount, gps, tickAlpha, timing: () => ({ ...(eng?.timing || {}) }),
    engine: () => eng, level: meterRms, glitches: () => engine.glitches(),
  };
  window.__demo.grains = api;

  // ── the self check, only under ?selfcheck=1, never for a visitor ─────────
  async function check() {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    d.assert('a visit opened no audio context and fetched nothing', ctx === null && SOURCES.fetched() === 0);
    await play();
    d.assert('Play brought the granulator up in this tab', !!eng, JSON.stringify(eng?.timing || {}));
    if (!eng) return;
    // the ring has to hold something before a grain can sound like the source
    await wait(WINDOW_S * 1000 + 500);
    const lv = await meterRms(1500);
    d.assert('Play makes sound: the output level is above zero', lv > 0.002, `rms ${lv.toFixed(4)}`);
    d.assert('the engine reports its grains as events', grainCount > 0, `${grainCount} grains, ${gps()} in the last second`);
    const ev = events[events.length - 1];
    d.assert('a grain event carries its time, its place and its length',
      ev && Number.isFinite(ev.at) && ev.pos >= 0 && ev.pos <= 1 && ev.ago >= 0 && ev.ago <= WINDOW_S && ev.dur > 0,
      ev ? JSON.stringify(ev) : 'none');

    // Density: grains a second, counted from the engine's own reports.
    const SZ = byName.get(roles.size), DN = byName.get(roles.density);
    const rate = async (v) => { knobs.get(DN.name).set(toK(DN, v), { from: 'hand' }); await wait(1600); return gps(); };
    const lo = await rate(4), hi = await rate(40);
    d.assert('the density knob changes how many grains the engine reports', hi > lo * 3, `4/s gave ${lo}, 40/s gave ${hi}`);
    // Size: the length the engine says each grain had.
    const meanDur = (from) => { const xs = events.filter((e) => e.at > from).map((e) => e.dur); return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length); };
    const size = async (v) => { knobs.get(SZ.name).set(toK(SZ, v), { from: 'hand' }); await wait(300); const t = ctx.currentTime; await wait(1200); return meanDur(t); };
    const sShort = await size(0.05), sLong = await size(0.6);
    d.assert('the size knob changes the length the engine reports for each grain', sLong > sShort * 4,
      `50 ms gave ${(sShort * 1000).toFixed(0)} ms, 600 ms gave ${(sLong * 1000).toFixed(0)} ms`);
    // A patch change, asked of the server rather than believed: the patch
    // furthest from the current knob values, so both must move.
    const before = { size: await engine.read(SZ.name), rate: await engine.read(DN.name) };
    let to = 0, far = -1;
    patches.forEach((p, i) => {
      const dist = Math.abs(Math.log(p.set[SZ.name] / before.size)) + Math.abs(Math.log(p.set[DN.name] / before.rate));
      if (i !== patchAt && dist > far) { far = dist; to = i; }
    });
    const n0 = grainCount;
    const sentBefore = bay.links().filter((l) => l.from === PATCH_OUT || l.from === PATCH_FIXED).reduce((n, l) => n + (l.sent || 0), 0);
    const k0 = knobs.get(DN.name).value(), kTo = toK(DN, patches[to].set[DN.name]);
    choosePatch(to);
    await wait(GLIDE_MS * 0.4);
    const kMid = knobs.get(DN.name).value();
    const midOver = await engine.read(DN.name);
    await wait(GLIDE_MS * 0.6 + 600);
    const after = { size: await engine.read(SZ.name), rate: await engine.read(DN.name) };
    // A control the engine is moving by itself (050's patches send the
    // music's level onto some of them) reads its patch value plus that
    // movement, so it is held to within an octave rather than to the digit.
    const moving = new Set(engine.moving?.() ?? []);
    const near = (a, b, name) => (moving.has(name) ? Math.abs(Math.log(a / b)) < Math.LN2 : Math.abs(a - b) <= Math.abs(b) * 1e-3);
    const sent = bay.links().filter((l) => l.from === PATCH_OUT || l.from === PATCH_FIXED).reduce((n, l) => n + (l.sent || 0), 0) - sentBefore;
    d.assert('a patch reaches the knobs over their wires from web:patch, one event on every one, and its fixed values on one wire of their own',
      sent === controls.length + 1, `${sent} events on ${controls.length} knob wires and the fixed one`);
    d.assert('and the knobs glide there: part way through, the density knob is between where it was and where it goes, and so is the engine',
      kMid > Math.min(k0, kTo) + 0.02 && kMid < Math.max(k0, kTo) - 0.02 && midOver > Math.min(before.rate, patches[to].set[DN.name]) && midOver < Math.max(before.rate, patches[to].set[DN.name]),
      `knob ${k0.toFixed(3)} to ${kTo.toFixed(3)}, at ${GLIDE_MS * 0.4} ms ${kMid.toFixed(3)}, engine ${midOver?.toFixed(2)}`);
    d.assert('a patch change reaches the engine through the knobs', near(after.size, patches[to].set[SZ.name], SZ.name)
      && near(after.rate, patches[to].set[DN.name], DN.name) && !near(before.rate, after.rate, ''),
      `${patches[to].name}: before ${JSON.stringify(before)}, after ${JSON.stringify(after)}${moving.size ? `, moved by the patch itself: ${[...moving].join(' ')}` : ''}`);
    d.assert('and the knobs come to rest on the patch', Math.abs(toV(DN, knobs.get(DN.name).value()) - patches[to].set[DN.name]) < patches[to].set[DN.name] * 0.001,
      `${toV(DN, knobs.get(DN.name).value()).toFixed(3)}/s`);
    // A hand on a knob during a glide stops that knob's glide and keeps what it turned to.
    const back = patchAt === 0 ? 1 : 0;
    choosePatch(back);
    await wait(300);
    const handK = 0.5;
    knobs.get(SZ.name).set(handK, { from: 'hand' });
    await wait(GLIDE_MS + 400);
    d.assert('a hand on a knob during a glide stops that knob there, while the others arrive',
      Math.abs(knobs.get(SZ.name).value() - handK) < 1e-6 && Math.abs(toV(DN, knobs.get(DN.name).value()) - patches[back].set[DN.name]) < patches[back].set[DN.name] * 0.001,
      `size knob ${knobs.get(SZ.name).value().toFixed(3)}, density ${toV(DN, knobs.get(DN.name).value()).toFixed(3)}/s, still gliding: ${glidingNow().join(' ') || 'none'}`);
    const lv2 = await meterRms(1500);
    d.assert('the new patch still sounds', lv2 > 0.001, `rms ${lv2.toFixed(4)}, ${grainCount - n0} grains since`);
    // Wet and dry. What is heard is compared with the source: at 0 it IS the
    // source (a correlation near 1, at whatever lag the engine adds), at 1
    // it is grains, which are other moments of it at other pitches and much
    // less alike. The tick ink is read off both canvases.
    const corr = () => {
      const a = new Float32Array(2048), b = new Float32Array(2048);
      srcTap.getFloatTimeDomainData(a); heard.getFloatTimeDomainData(b);
      let best = 0;
      let ea = 0; for (let i = 0; i < 1024; i++) ea += a[i] * a[i];
      for (let L = 0; L < 1024; L += 1) {
        let sab = 0, eb = 0;
        for (let i = 0; i < 1024; i++) { sab += a[i] * b[i + L]; eb += b[i + L] * b[i + L]; }
        const c = ea > 0 && eb > 0 ? sab / Math.sqrt(ea * eb) : 0;
        if (c > best) best = c;
      }
      return best;
    };
    const corrOver = async (n = 8) => { let t = 0; for (let i = 0; i < n; i++) { t += corr(); await wait(120); } return t / n; };
    const birthInk = () => {
      const g = birthCanvas.getContext('2d'), px = g.getImageData(0, 0, birthCanvas.width, birthCanvas.height).data;
      let m = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > m) m = px[i]; return m;
    };
    const waveInk = () => {
      const c = wave.canvas, px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let m = 0; for (let i = 0; i < px.length; i += 4) { const y = px[i + 1] - px[i + 2]; if (y > m) m = y; } return m;
    };
    const atMix = async (v) => {
      knobs.get('mix').set(v, { from: 'hand' });
      await wait(900);
      return { mix: v, rms: +(await meterRms(1000)).toFixed(4), corr: +(await corrOver()).toFixed(2), tick: +tickAlpha().toFixed(2), birthInk: birthInk(), waveInk: waveInk() };
    };
    const m0 = await atMix(0), mh = await atMix(0.5), m1 = await atMix(1);
    const say = [m0, mh, m1].map((m) => JSON.stringify(m)).join(' ');
    d.assert('wet/dry at 0 is the source itself, and at 1 the grains', m0.corr > 0.8 && m1.corr < m0.corr - 0.2 && m0.rms > 0.002 && m1.rms > 0.002, say);
    d.assert('and halfway is both', mh.corr < m0.corr && mh.corr > m1.corr - 0.05 && mh.rms > 0.002, say);
    d.assert(`the grain ticks fade with the grains: faint when dry, full when wet, on ${outputScope ? 'both scopes' : 'the source scope'}`,
      m0.tick < 0.2 && m1.tick === 1 && (!outputScope || m0.birthInk < m1.birthInk * 0.4) && m0.waveInk < m1.waveInk * 0.6, say);
    if (pageCheck) await pageCheck({ wait, gps, level: meterRms, choosePatch, events: () => events.slice(),
      knob: (name, v) => knobs.get(name).set(toK(name, v), { from: 'self' }), count: () => grainCount });
    d.log(`timing ${JSON.stringify(eng.timing)}, glitches ${engine.glitches()}`);
    stop();
  }

  return {
    bay, api, play, stop, waveHost,
    /** Run the self check when `?selfcheck=1` asked for one, then say ready. */
    async ready() {
      if (SELFCHECK) { try { await check(); } catch (e) { d.assert('the self check ran to the end', false, String(e?.stack || e)); } }
      d.ready();
    },
  };
}

// demo/concepts/sampler/grain-rig.mjs: everything a granulator concept page has
// that is not its engine. Lifted out of sampler/050 on 2026-10-13 when its
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
//     land(i)                          load patch i whole
//     knob(name, v)                    'size' (s) or 'rate' (grains/s)
//     run(on)                          pause or resume, keeping the ring
//     read(name) -> Promise<number>    a knob's value ASKED OF THE SERVER
//     glitches() -> number|null
//   }
// and `patches` is `[{ name, says, size, rate }]`, each name written as it is
// to be shown (sentence case).
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
    recording('raadio2', 'Raadio 2', 'radio/raadio2/2026-10-11.mp3'),
    recording('raadio4', 'Raadio 4', 'radio/raadio4/2026-10-11.mp3'),
    recording('ida', 'Ida', 'radio/ida/2026-10-11.aac'),
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
  .cc-top { display: flex; }
  .cc-top > .pos-bgroup { flex: none; width: auto; }`;
// The kit's grain scope as a panel's picture, as /concepts/radio/020/ draws
// it: the panel's stage is the edge and the ground, so the scope gives up its
// own margin, border and corner, and its always-empty caption takes no room.
// The grains' start times over the output scope are a canvas laid exactly on
// the scope's, so it moves nothing. Play sits on its own row, at its own size.

/**
 * @param {object} o
 * @param o.d        the page's `mount()` result
 * @param o.engine   see the contract at the top of this file
 * @param o.patches  `[{ name, says, size, rate }]`
 * @param o.ranges   `{ size: [lo, hi], rate: [lo, hi] }` for the two knobs
 * @param o.hue      `(knob) => number|null`, a knob's hue, so a page that shows
 *                   its program can colour a knob and its control alike
 * @param o.under    elements that go under the knobs (a code box: knobs above
 *                   the code, as every concept page with both has them)
 * @param o.check    `async (tools) => {}`, the page's own checks, run inside the
 *                   self check while the sound is still playing
 */
export function createGrainRig({ d, engine, patches, ranges = { size: [0.02, 4], rate: [0.5, 64] },
  hue = () => null, under = [], check: pageCheck = null }) {
  if (!document.getElementById('cc-grain-css')) {
    const st = el('style'); st.id = 'cc-grain-css'; st.textContent = CSS; document.head.append(st);
  }
  const SOURCES = createSources({ log: (m) => d.log(m) });
  let at = 0;

  // ── the bay ──────────────────────────────────────────────────────────────
  const S = 'web';
  const FILE_OUT = (s) => `${s.store}:${s.id}:file-out`;
  const RADIO_IN = `${S}:radio:file-in`, RADIO_OUT = `${S}:radio:audio-out`;
  const GRAINS_IN = `${S}:grains:audio-in`, GRAINS_OUT = `${S}:grains:audio-out`;
  const GRAINS_SIZE = `${S}:grains:value-in`, GRAINS_DENS = `${S}:grains:value-in-2`;
  const GRAINS_EV = `${S}:grains:value-out`;
  const WAVE_IN = `${S}:wave:audio-in`, WAVE_EV = `${S}:wave:value-in`;
  const SCOPE_IN = `${S}:scope:audio-in`, SCOPE_EV = `${S}:scope:value-in`;
  const SPEAKER_IN = `${S}:speaker:audio-in`;
  const SIZE_OUT = `${S}:knob-size:value-out`, DENS_OUT = `${S}:knob-density:value-out`;

  const bay = createBay();
  for (const s of SOURCES) {
    bay.addNode({ id: `${s.store}:${s.id}`, kind: 'store', label: `${s.label}, recorded`, place: 'cloudflare', net: 'cloudflare' });
    bay.addPort({ id: FILE_OUT(s), label: 'recording', dir: 'out', medium: 'file', transports: ['https'], address: s.url });
  }
  bay.addNode({ id: `${S}:radio`, kind: 'engine', label: 'radio', place: 'browser' });
  bay.addPort({ id: RADIO_IN, label: 'radio', dir: 'in', medium: 'file' });
  bay.addPort({ id: RADIO_OUT, label: 'radio', dir: 'out', medium: 'audio' });
  bay.addNode({ id: `${S}:grains`, kind: 'engine', label: engine.label, place: 'browser' });
  bay.addPort({ id: GRAINS_IN, label: 'grains', dir: 'in', medium: 'audio' });
  bay.addPort({ id: GRAINS_OUT, label: 'grains', dir: 'out', medium: 'audio' });
  bay.addPort({ id: GRAINS_SIZE, label: 'size', dir: 'in', medium: 'value', deliver: (ev) => knobIn('size', ev) });
  bay.addPort({ id: GRAINS_DENS, label: 'density', dir: 'in', medium: 'value', deliver: (ev) => knobIn('rate', ev) });
  // Every grain the engine reports leaves here as one event, so anything that
  // wants to follow the grains (the two scopes today, a picture later) holds a
  // link from this port rather than reaching into the engine.
  bay.addPort({ id: GRAINS_EV, label: 'grains', dir: 'out', medium: 'value' });
  bay.addNode({ id: `${S}:wave`, kind: 'screen', label: 'source scope', place: 'browser' });
  bay.addPort({ id: WAVE_IN, label: 'wave', dir: 'in', medium: 'audio' });
  bay.addPort({ id: WAVE_EV, label: 'grains', dir: 'in', medium: 'value', deliver: (ev) => waveGrain(ev) });
  bay.addNode({ id: `${S}:scope`, kind: 'screen', label: 'output scope', place: 'browser' });
  bay.addPort({ id: SCOPE_IN, label: 'scope', dir: 'in', medium: 'audio' });
  bay.addPort({ id: SCOPE_EV, label: 'grains', dir: 'in', medium: 'value', deliver: (ev) => scopeGrain(ev) });
  bay.addNode({ id: `${S}:speaker`, kind: 'screen', label: 'speakers', place: 'browser' });
  bay.addPort({ id: SPEAKER_IN, label: 'speakers', dir: 'in', medium: 'audio' });
  bay.addNode({ id: `${S}:knob-size`, kind: 'engine', label: 'size knob', place: 'browser' });
  bay.addPort({ id: SIZE_OUT, label: 'size', dir: 'out', medium: 'value' });
  bay.addNode({ id: `${S}:knob-density`, kind: 'engine', label: 'density knob', place: 'browser' });
  bay.addPort({ id: DENS_OUT, label: 'density', dir: 'out', medium: 'value' });

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
  hold(RADIO_OUT, WAVE_IN);
  hold(GRAINS_OUT, SPEAKER_IN);
  hold(GRAINS_OUT, SCOPE_IN);
  hold(SIZE_OUT, GRAINS_SIZE);
  hold(DENS_OUT, GRAINS_DENS);
  hold(GRAINS_EV, WAVE_EV);
  hold(GRAINS_EV, SCOPE_EV);

  // ── state ────────────────────────────────────────────────────────────────
  let ctx = null, srcBus = null, toGrains = null, srcTap = null, srcBuf = null, outBuf = null;
  let eng = null, booting = null, source = null, opening = null, fetchedAt = 0, playing = false;
  let patchAt = 0;
  const cur = { size: patches[0].size, rate: patches[0].rate };

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
  pick.options(SOURCES.map((s) => s.label), 0);
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
  const scopePanel = createVideoPanel({ media: scopeHost, aspect: 'auto', right: patchPick.el, left: false,
    values: [{ key: 'gps', label: 'grains/s', reserve: 5 }] });

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
      g.globalAlpha = 0.25 + 0.75 * Math.max(0, 1 - age / Math.max(0.05, b.dur || 0.1));
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
  let gpsShownAt = 0;
  function frame() {
    if (!playing) return;
    if (holds(RADIO_OUT, WAVE_IN)) { srcTap.getFloatTimeDomainData(srcBuf); wave.feed(srcBuf, ctx.sampleRate); }
    if (eng && holds(GRAINS_OUT, SCOPE_IN)) { eng.meter.getFloatTimeDomainData(outBuf); scope.feed(outBuf, ctx.sampleRate); }
    drawBirths();
    if (performance.now() - gpsShownAt > 250) { gpsShownAt = performance.now(); scopePanel.values.set('gps', String(gps())); }
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
    if (eng) eng.out.gain.setTargetAtTime(holds(GRAINS_OUT, SPEAKER_IN) && playing ? 0.9 : 0, ctx.currentTime, 0.02);
  }
  function boot() {
    booting ??= (async () => {
      eng = await engine.boot({ ctx, input: toGrains, grain, log: (m, k) => d.log(m, k) });
      engine.land(patchAt);
      // a knob turned before the engine was up still counts
      if (cur.size !== patches[patchAt].size) engine.knob('size', cur.size);
      if (cur.rate !== patches[patchAt].rate) engine.knob('rate', cur.rate);
      d.log(`${patches[patchAt].name}: ${patches[patchAt].says}`);
      return eng;
    })();
    booting.catch(() => { booting = null; eng = null; });
    return booting;
  }

  // ── a patch, and the two knobs on top of it ──────────────────────────────
  function choosePatch(i) {
    const n = (i + patches.length) % patches.length;
    patchAt = n;
    patchPick.show(patches[n].name, n);
    cur.size = patches[n].size; cur.rate = patches[n].rate;
    setKnob('size', cur.size);
    setKnob('rate', cur.rate);
    if (eng) { engine.land(n); d.log(`${patches[n].name}: ${patches[n].says}`); }
  }
  /** One of the two numbers, from a knob's event on its value wire. */
  function knobIn(name, ev) {
    if (ev?.of !== 'param' || ev.name !== name || !Number.isFinite(ev.v)) return;
    cur[name] = ev.v;
    if (eng) engine.knob(name, ev.v);
  }
  // Each knob travels geometrically, because 20 ms to 4 s and 0.5 to 64 a
  // second are ranges where the middle of the knob should be the middle of
  // the octaves.
  const toV = (name, k) => { const [lo, hi] = ranges[name]; return lo * (hi / lo) ** k; };
  const toK = (name, v) => { const [lo, hi] = ranges[name]; return Math.log(v / lo) / Math.log(hi / lo); };
  const OUT_OF = { size: SIZE_OUT, rate: DENS_OUT };
  const fmt = { size: (v) => (v < 1 ? `${Math.round(v * 1000)} ms` : `${v.toFixed(2)} s`), rate: (v) => `${v < 10 ? v.toFixed(1) : Math.round(v)}/s` };
  const mk = (name, label) => createKnob({
    label, min: 0, max: 1, step: 0.001, value: toK(name, patches[0][name]),
    format: (k) => fmt[name](toV(name, k)),
    onInput: (k) => bay.send(OUT_OF[name], { of: 'param', name, v: +toV(name, k).toFixed(4) }),
  });
  const knobs = new Map([['size', mk('size', 'size')], ['rate', mk('rate', 'density')]]);
  for (const [name, knob] of knobs) {
    const h = hue(name);
    if (h != null) { knob.el.dataset.param = name; knob.el.style.setProperty('--param-hue', String(h)); }
  }
  function setKnob(name, v) { knobs.get(name).set(toK(name, v), { from: 'self', quiet: true }); }
  const knobRow = createKnobGrid(knobs, { row: true });

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
  top.append(transport.el);
  d.stack.add(top, wavePanel.el, scopePanel.el, knobRow.el, ...under, pb.el);

  // ── read only, for a check over CDP, and for a picture that wants the grains ─
  const meterRms = (ms = 1000) => new Promise((res) => {
    const buf = new Float32Array(2048); let s = 0, n = 0;
    const id = setInterval(() => { eng.meter.getFloatTimeDomainData(buf); for (const v of buf) { s += v * v; n++; } }, 50);
    setTimeout(() => { clearInterval(id); res(Math.sqrt(s / Math.max(1, n))); }, ms);
  });
  const api = {
    events: () => events.slice(),
    /** Follow every grain as it is reported. Returns a function that stops. */
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    playing: () => playing, source: () => SOURCES[at].id, patch: () => patches[patchAt].name,
    knob: (name) => cur[name] ?? null, count: () => grainCount, gps, timing: () => ({ ...(eng?.timing || {}) }),
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
    const rate = async (v) => { knobs.get('rate').set(toK('rate', v), { from: 'self' }); await wait(1600); return gps(); };
    const lo = await rate(4), hi = await rate(40);
    d.assert('the density knob changes how many grains the engine reports', hi > lo * 3, `4/s gave ${lo}, 40/s gave ${hi}`);
    // Size: the length the engine says each grain had.
    const meanDur = (from) => { const xs = events.filter((e) => e.at > from).map((e) => e.dur); return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length); };
    const size = async (v) => { knobs.get('size').set(toK('size', v), { from: 'self' }); await wait(300); const t = ctx.currentTime; await wait(1200); return meanDur(t); };
    const sShort = await size(0.05), sLong = await size(0.6);
    d.assert('the size knob changes the length the engine reports for each grain', sLong > sShort * 4,
      `50 ms gave ${(sShort * 1000).toFixed(0)} ms, 600 ms gave ${(sLong * 1000).toFixed(0)} ms`);
    // A patch change, asked of the server rather than believed: the patch
    // furthest from the current knob values, so both must move.
    const before = { size: await engine.read('size'), rate: await engine.read('rate') };
    let to = 0, far = -1;
    patches.forEach((p, i) => {
      const dist = Math.abs(Math.log(p.size / before.size)) + Math.abs(Math.log(p.rate / before.rate));
      if (i !== patchAt && dist > far) { far = dist; to = i; }
    });
    const n0 = grainCount;
    choosePatch(to);
    await wait(1500);
    const after = { size: await engine.read('size'), rate: await engine.read('rate') };
    const near = (a, b) => Math.abs(a - b) <= Math.abs(b) * 1e-3;
    d.assert('a patch change reaches the engine', near(after.size, patches[to].size) && near(after.rate, patches[to].rate)
      && !near(before.rate, after.rate), `${patches[to].name}: before ${JSON.stringify(before)}, after ${JSON.stringify(after)}`);
    d.assert('and the knobs follow the patch', Math.abs(toV('rate', knobs.get('rate').value()) - patches[to].rate) < patches[to].rate * 0.01,
      `${toV('rate', knobs.get('rate').value()).toFixed(3)}/s`);
    const lv2 = await meterRms(1500);
    d.assert('the new patch still sounds', lv2 > 0.001, `rms ${lv2.toFixed(4)}, ${grainCount - n0} grains since`);
    if (pageCheck) await pageCheck({ wait, gps, level: meterRms, choosePatch, events: () => events.slice(),
      knob: (name, v) => knobs.get(name).set(toK(name, v), { from: 'self' }), count: () => grainCount });
    d.log(`timing ${JSON.stringify(eng.timing)}, glitches ${engine.glitches()}`);
    stop();
  }

  return {
    bay, api, play, stop,
    /** Run the self check when `?selfcheck=1` asked for one, then say ready. */
    async ready() {
      if (SELFCHECK) { try { await check(); } catch (e) { d.assert('the self check ran to the end', false, String(e?.stack || e)); } }
      d.ready();
    },
  };
}

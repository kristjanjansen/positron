// demo/radio/rig.mjs: what /radio/tempo/ and /radio/live/ share, one copy
// since 2026-10-14 (they carried it line for line). The wave with its beat
// lines, the tempo detector and its scope, the fx box with its click and mix
// knob, the station picker, Play, and the links between them. A page brings
// its source: the stations, the nodes up to the player's `audio-out`, the
// links into it, and how a station starts and stops.
import { el } from '/shell/shell.mjs';
import { createPatchbay } from '/shell/patchbay.mjs';
import { addNodes } from '/shell/nodes.mjs';
import { createVideoPanel } from '/shell/video-panel.mjs';
import { createGrainScope } from '/shell/grain-scope.mjs';
import { createButtonGroup } from '/shell/button-group.mjs';
import { createPicker } from '/shell/picker.mjs';
import { createKnob } from '/shell/knob.mjs';
import { createKnobGrid } from '/shell/knob-grid.mjs';
import { createTempoDetector, LO, HI, STEADY, steady } from '/radio/tempo.mjs';

/**
 * Call after `mount()`, once the page's source nodes and its player node are on the bay.
 * @param {object} o
 * @param {object} o.bay
 * @param {object} o.d                the mounted page
 * @param {string} o.site             the page's site, `web`
 * @param {object[]} o.stations       `{ id, label }` each, picked in the wave's footer
 * @param {Function} o.srcOf          `(station) => url`, for a check over CDP
 * @param {string} o.playerOut        the port whose sound the wave, the detector and the fx hear
 * @param {boolean} [o.seen]          mark both ends of every held link as seen
 * @param {Function} o.holdSources    `(hold) => void`, the page's links up to the player, held first
 * @param {Function} o.flowing        `(link, medium, playing) => boolean` for the picture
 * @param {Function} [o.onChoose]     `(at) => void` after the station changed
 * @param {Function} [o.refuse]       `() => true` to refuse a Play press
 * @param {Function} [o.build]        once, after the audio graph is first made
 * @param {Function} [o.load]         `() => Promise`, awaited on Play before the station starts
 * @param {Function} o.start          `(station) => void`: its sound into `rig.out`
 * @param {Function} o.stop           stop the station's sound
 * @param {object} [o.demo]           more read only hooks for `window.__demo.tempo`
 * @returns the rig: `ctx`, `pull`, `out`, `playing`, `at` (getters), `pb`, `play`, `stop`
 */
export function createTempoRig({ bay, d, site: S, stations: STATIONS, srcOf, playerOut: PLAYER_OUT, seen = false,
  holdSources, flowing, onChoose = null, refuse = null, build = null, load = null, start, stop: stopSource, demo = {} }) {
  let at = 0;
  const WAVE_IN = `${S}:wave:audio-in`, WAVE_BEATS = `${S}:wave:value-in`, SPEAKER_IN = `${S}:speaker:audio-in`;
  const BPM_IN = `${S}:bpm:audio-in`, BPM_EV = `${S}:bpm:value-out`;
  const DISPLAY_IN = `${S}:display:value-in`;
  const FX_IN = `${S}:fx:audio-in`, FX_TEMPO = `${S}:fx:value-in`, FX_MIX = `${S}:fx:value-in-2`, FX_OUT = `${S}:fx:audio-out`;
  const MIX_OUT = `${S}:knob-mix:value-out`;

  // The wave's beats and the scope's tempo are only what arrives on their value
  // ins. The fx box is a low cut plus a click on the beat grid, mixed against the
  // untouched radio by its own knob: tempo on value-in, the mix on value-in-2.
  addNodes(bay, S, ['wave', 'bpm', 'display', 'fx-click', 'mix-knob', 'speaker'], {
    deliver: { 'wave:value-in': (ev) => beatsIn(ev), 'display:value-in': (ev) => shown(ev),
      'fx:value-in': (ev) => fxTempo(ev), 'fx:value-in-2': (ev) => fxMix(ev) },
    ports: Object.fromEntries(Object.entries({ 'wave:audio-in': 'wave', 'wave:value-in': 'beats',
      'bpm:audio-in': 'tempo detector', 'bpm:value-out': 'tempo', 'display:value-in': 'tempo scope',
      'fx:audio-in': 'fx', 'fx:value-in': 'tempo', 'fx:value-in-2': 'mix', 'fx:audio-out': 'fx',
      'knob-mix:value-out': 'mix', 'speaker:audio-in': 'speakers' }).map(([k, label]) => [k, { label }])),
  });

  // ── the links, held from load so the picture does not change with play ────
  const held = new Map();
  function hold(a, b, opts) {
    const k = `${a} ${b}`;
    if (held.has(k)) return;
    if (seen) { bay.seen(a); bay.seen(b); }
    const r = bay.link(a, b, [], { site: S, ...opts });
    if (r.ok) held.set(k, r.id); else d.log(`${a} -> ${b} refused: ${r.why}`, 'warn');
  }
  // The sound follows the links the bay holds, read off `bay.links()`.
  const holds = (a, b) => bay.links().some((l) => l.from === a && l.to === b);
  holdSources(hold);
  hold(PLAYER_OUT, WAVE_IN);
  hold(PLAYER_OUT, BPM_IN);
  hold(PLAYER_OUT, FX_IN);
  hold(FX_OUT, SPEAKER_IN);
  hold(BPM_EV, DISPLAY_IN);
  hold(BPM_EV, WAVE_BEATS);
  hold(BPM_EV, FX_TEMPO);
  hold(MIX_OUT, FX_MIX);

  // ── the sound ───────────────────────────────────────────────────────────
  let ctx = null, pull = null, out = null, tap = null, tapBuf = null;
  let playing = false;
  const pb = createPatchbay(bay, { flowing: (l, medium) => flowing(l, medium, playing) });

  // ── the pictures ────────────────────────────────────────────────────────
  const waveHost = el('div', 'cc-wave');
  const scope = createGrainScope(waveHost, { seconds: 4, height: 150, fullScale: 1 });
  // The station, the kit picker in the wave panel's footer. Choosing one while
  // playing stops the old station before the new one starts, with a fresh
  // tempo reading.
  const pick = createPicker({ what: 'station', prev: () => choose(at - 1), next: () => choose(at + 1), onPick: (i) => choose(i) });
  pick.options(STATIONS.map((st) => st.label), 0);
  function choose(i) {
    const n = (i + STATIONS.length) % STATIONS.length;
    if (n === at) return;
    at = n;
    pick.show(STATIONS[at].label, at);
    onChoose?.(at);
    pb.refresh();
    if (playing) { stop(); play(); }
  }
  const wavePanel = createVideoPanel({ media: waveHost, aspect: 'auto', right: false, left: pick.el });

  // The beats on the wave: a canvas over the scope, drawn on the scope's own
  // seconds (4 across, the newest at the right edge), so a mark scrolls left
  // with the sound it was placed on. Each is as bright as the reading that
  // placed it was sure.
  const WAVE_S = 4;
  const beatCanvas = el('canvas', 'cc-beats');
  waveHost.append(beatCanvas);
  const beats = [];                // { at, c }: a beat instant on this tab's audio clock, and the reading's confidence
  function beatsIn(ev) {
    if (ev?.of !== 'param' || ev.name !== 'bpm' || !Array.isArray(ev.beats)) return;
    // Under STEADY there is no beat to draw (plan-tempo-key-improve.md item 2).
    if (!steady(ev)) return;
    for (const b of ev.beats) if (Number.isFinite(b)) beats.push({ at: b, c: ev.confidence ?? 1 });
  }
  /** Where now sits on the tempo scope: fixed at 5/6 of the width. Following
   *  where new beat lines appear was tried and taken back the same day (*"move
   *  dot to 5/6 of w. keep it steady"*). */
  const nowAt = () => 5 / 6;

  // The tempo scope: every reading that arrived on the display's in-port, time
  // across (the last TEMPO_S seconds, the newest at nowAt() of the width) and bpm up, the
  // detector's whole range. Asked 2026-10-11: *"show all condidences"*, *"same
  // h as waveform . no horiz grid"*, *"zoom in time, show less hsitoric"* and
  // *"show bpm and conf on all times"*. So nothing is withheld: the chosen
  // tempo is the line, each segment as bright as its confidence, every
  // candidate the detector weighed is a dot as bright as its score, and the
  // pointer reads any moment out in full. The labels on the line and the
  // vertical lines came off the same day (*"no need for annotations"*, *"rm
  // radio 020 vert line on viz"*). The range is the corner label. 15 s across is a quarter of the 60 it was.
  const TEMPO_S = 15;   // now is at nowAt(), 5/6 of the width
  const tempoCanvas = el('canvas', 'cc-tempo');
  const tempoHost = el('div', 'cc-tempo-host');
  tempoHost.append(tempoCanvas);
  const tempoPanel = createVideoPanel({ media: tempoHost, aspect: 'auto', right: false,
    left: el('span', 'cc-say', 'tempo'),
    values: [{ key: 'bpm', reserve: 14 }, { key: 'conf', label: 'confidence', reserve: 4 }] });
  // The pointer over the scope: where it is, in CSS pixels from the left, or null.
  let hoverX = null;
  tempoCanvas.addEventListener('pointermove', (e) => { hoverX = e.offsetX; drawTempo(); });
  tempoCanvas.addEventListener('pointerdown', (e) => { hoverX = e.offsetX; drawTempo(); });
  tempoCanvas.addEventListener('pointerleave', () => { hoverX = null; drawTempo(); });

  // What the scope shows is only what arrived on its in-port.
  const history = [];              // every reading delivered, { at, v, confidence, beatAt, candidates }
  function shown(ev) {
    if (ev?.of !== 'param' || ev.name !== 'bpm' || !Number.isFinite(ev.v)) return;
    const c = Number.isFinite(ev.confidence) ? ev.confidence : 0;
    history.push({ at: ctx ? +ctx.currentTime.toFixed(2) : 0, v: ev.v, confidence: c, beatAt: ev.beatAt ?? null,
      candidates: Array.isArray(ev.candidates) ? ev.candidates : [] });
    // Under STEADY the reading is not a fact, so no number is shown: readings
    // at 0.5 or more were 92% within 4% of the reference tools, under it 54%
    // (research/tempo-key-eval-2026-10-12.md 4.2). The line still draws, dimmed.
    tempoPanel.values.set('bpm', c >= STEADY ? `${ev.v.toFixed(1)} bpm` : 'no steady beat');
    tempoPanel.values.set('conf', c.toFixed(2));
  }

  function frame() {
    if (!playing) return;
    if (holds(PLAYER_OUT, WAVE_IN)) { tap.getFloatTimeDomainData(tapBuf); scope.feed(tapBuf, ctx.sampleRate); }
    drawBeats();
    drawTempo();
    requestAnimationFrame(frame);
  }

  // ── the tempo detector: /radio/tempo.mjs, shared by both pages since
  // 2026-10-12. Every step of it, every constant and every measurement behind
  // them is written there. It hears the player's sound on its own link and
  // sends each reading out on BPM_EV.
  let det = null;
  const detBuild = () => createTempoDetector(ctx, { pull, playing: () => playing, onReading: (ev) => bay.send(BPM_EV, ev) });

  // Canvas ink is read off the stylesheet's tokens once.
  const tok = (k) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  let ink = null;
  const inks = () => (ink ??= { card: tok('--card') || '#141922', line: tok('--line') || '#232c3a',
    dim: tok('--dim2') || '#6a7280', fg: tok('--fg') || '#e6e6e6', hi: tok('--hi') || '#ffd400',
    mono: tok('--mono') || 'ui-monospace, monospace' });
  function fit(c) {
    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr);
    if (W && H && (c.width !== W || c.height !== H)) { c.width = W; c.height = H; }
    return { W, H, dpr };
  }
  // How bright a mark is for a confidence or a score, 0 to 1: never invisible.
  const shade = (c) => 0.2 + 0.8 * Math.max(0, Math.min(1, c));

  // One accent line, full height, at each beat the wave was sent.
  function drawBeats() {
    const { W, H, dpr } = fit(beatCanvas);
    if (!W || !H) return;
    const g = beatCanvas.getContext('2d');
    g.clearRect(0, 0, W, H);
    const now = ctx.currentTime;
    while (beats.length && beats[0].at < now - WAVE_S - 0.5) beats.shift();
    g.fillStyle = inks().hi;
    for (const b of beats) {
      const x = Math.round(W - ((now - b.at) / WAVE_S) * W);
      if (x < 0 || x > W) continue;
      g.globalAlpha = shade(b.c);
      g.fillRect(x - dpr, 0, dpr, H);
    }
    g.globalAlpha = 1;
  }

  // The tempo scope. No grid lines and no time label (*"rm 15sc label"*). The
  // range in the top left corner.
  let stoppedAt = 0;
  const clock = () => (ctx ? (playing ? ctx.currentTime : stoppedAt) : 0);
  function drawTempo() {
    const { W, H, dpr } = fit(tempoCanvas);
    if (!W || !H) return;
    const k = inks(), g = tempoCanvas.getContext('2d');
    g.fillStyle = k.card; g.fillRect(0, 0, W, H);
    const pad = 8 * dpr, top = pad, bot = H - pad;
    const y = (v) => bot - ((v - LO) / (HI - LO)) * (bot - top);
    const now = clock();
    // Now sits at nowAt() of the width, the last TEMPO_S seconds to its left,
    // and no lines up the scope. Asked 2026-10-11: *"rm radio 020 vert line on
    // viz. make yellow dot around 2/3 of w"*.
    const xNow = W * nowAt();
    const x = (at) => xNow - ((now - at) / TEMPO_S) * xNow;
    while (history.length && history[0].at < now - TEMPO_S - 1) history.shift();
    // the candidates: a dot each, as bright as its score
    g.fillStyle = k.dim;
    for (const r of history) {
      const px = x(r.at);
      for (const cd of r.candidates) { g.globalAlpha = shade(cd.s); g.fillRect(px - dpr, y(cd.bpm) - dpr, 2 * dpr, 2 * dpr); }
    }
    // the chosen tempo: one line, each segment as bright as its confidence
    g.strokeStyle = k.fg; g.lineWidth = 1.5 * dpr; g.lineJoin = 'round';
    for (let i = 1; i < history.length; i++) {
      const p = history[i - 1], q = history[i];
      g.strokeStyle = q.confidence >= STEADY ? k.fg : k.dim;
      g.globalAlpha = shade(q.confidence);
      g.beginPath(); g.moveTo(x(p.at), y(p.v)); g.lineTo(x(q.at), y(q.v)); g.stroke();
    }
    // The dot is NOW and stays at xNow (*"can yellow dot just steady on lover
    // wiz"*): the line runs on from the last reading to it, so the dot never
    // drifts left between readings and jumps back when one arrives.
    const last = history[history.length - 1];
    if (last) {
      g.strokeStyle = last.confidence >= STEADY ? k.fg : k.dim;
      g.globalAlpha = shade(last.confidence);
      g.beginPath(); g.moveTo(x(last.at), y(last.v)); g.lineTo(xNow, y(last.v)); g.stroke();
    }
    g.globalAlpha = 1;
    if (last) { g.fillStyle = last.confidence >= STEADY ? k.hi : k.dim; g.beginPath(); g.arc(xNow, y(last.v), 3 * dpr, 0, 2 * Math.PI); g.fill(); }
    g.font = `${11 * dpr}px ${k.mono}`;
    // No labels on the line since 2026-10-11 (*"no need for annotations"*):
    // the footer says the bpm and confidence, the pointer reads any moment.
    g.fillStyle = k.dim;
    g.textBaseline = 'top'; g.textAlign = 'left';
    g.fillText(`${LO} to ${HI} bpm`, 6 * dpr, 6 * dpr);
    // the pointer: a hairline and the reading nearest it, in full, in a box
    // pinned to the top right so it never covers the left corner label
    if (hoverX != null && history.length) {
      const hx = hoverX * dpr;
      let r = history[0];
      for (const h of history) if (Math.abs(x(h.at) - hx) < Math.abs(x(r.at) - hx)) r = h;
      const rx = x(r.at);
      g.fillStyle = k.fg; g.fillRect(Math.round(rx), 0, dpr, H);
      const l1 = `${(now - r.at).toFixed(1)} s ago  ${r.confidence >= STEADY ? `${r.v.toFixed(1)} bpm` : 'no steady beat'}  ${r.confidence.toFixed(2)}`;
      const l2 = `also ${r.candidates.filter((c) => Math.abs(c.bpm - r.v) / r.v > 0.03).map((c) => c.bpm.toFixed(1)).join(' ')}`;
      const tw = Math.max(g.measureText(l1).width, g.measureText(l2).width), lh = 15 * dpr;
      const bx = W - tw - 12 * dpr, by = 4 * dpr;
      g.fillStyle = k.card; g.globalAlpha = 0.9; g.fillRect(bx - 6 * dpr, by, tw + 12 * dpr, 2 * lh + 6 * dpr); g.globalAlpha = 1;
      g.fillStyle = k.fg; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillText(l1, bx, by + 3 * dpr); g.fillStyle = k.dim; g.fillText(l2, bx, by + 3 * dpr + lh);
    }
    g.textAlign = 'left';
  }

  // The sound follows the links the bay holds: the player reaches the
  // speakers, the wave and the detector each only along its own link.
  function route() {
    try { out.disconnect(); } catch { /* not connected */ }
    out.connect(tap);
    tap.connect(pull);
    if (holds(PLAYER_OUT, BPM_IN)) out.connect(det.in);
    try { fx.out.disconnect(); } catch { /* not connected */ }
    fx.out.connect(fxTap);
    fxTap.connect(pull);
    if (holds(PLAYER_OUT, FX_IN)) out.connect(fx.in);
    if (holds(FX_OUT, SPEAKER_IN)) fx.out.connect(ctx.destination);
  }

  function play() {
    if (refuse?.()) return;
    ctx ??= new AudioContext();
    ctx.resume();
    if (!out) {
      pull = ctx.createGain(); pull.gain.value = 0; pull.connect(ctx.destination);
      out = ctx.createGain();
      tap = ctx.createAnalyser(); tap.fftSize = 2048; tapBuf = new Float32Array(tap.fftSize);
      fxBuild();
      build?.();
    }
    playing = true;
    face();
    if (!load) return begin();
    return load().then(() => { if (playing) begin(); },          // not if stopped while it loaded
      (e) => { d.log(`the recording did not load: ${e?.message || e}`, 'warn'); playing = false; face(); });
  }
  function begin() {
    // A fresh detector every play, so the number is this listen's measurement.
    if (det) { try { det.proc.disconnect(); det.in.disconnect(); } catch { /* gone */ } }
    det = detBuild();
    history.length = 0; beats.length = 0; fxGrid = null; hoverX = null;
    tempoPanel.values.set('bpm', ''); tempoPanel.values.set('conf', '');
    route();
    start(STATIONS[at]);
    pb.refresh();
    requestAnimationFrame(frame);
  }
  function stop() {
    stoppedAt = ctx ? ctx.currentTime : 0;
    playing = false;
    fxGrid = null;
    stopSource();
    pb.refresh();
    face();
  }

  // ── the fx box ──────────────────────────────────────────────────────────
  // in -> dry gain (1 - mix) -------------------------------------------> out
  // in -> two high passes (12 dB each) -> music gain (mix * MUSIC_AT_1) -> out
  //       drum voices -> saturation -> drum gain (mix) -----------------> out
  // At mix 0 the output is the input through a gain of exactly 1. Turning up,
  // the low cut rises from CUT_LO to CUT_HI (geometrically, so the middle of
  // the knob is the middle of the octaves) and the drum comes up, so the
  // middle is a blend and the top is thin music under a dominant drum. Asked
  // 2026-10-11: *"max mix make music whay thinner and bd dominent"*.
  //
  // 🔴 AND THE LOUDNESS STAYS WHERE THE DRY RADIO IS AT EVERY MIX, asked the
  // same day as *"keep volume the same in all mix settings"*. The music and the
  // drum go through one makeup gain, and every LEVEL_MS a loop compares the
  // output's loudness with the input's (both K weighted, as a loudness meter
  // weighs them: a high shelf of +4 dB above 1.7 kHz and a cut below 38 Hz,
  // mean squares eased over LEVEL_TAU_S) and nudges that gain toward equal. It
  // touches only the wet side, so at mix 0 the output is still the input.
  const CUT_LO = 120, CUT_HI = 900, MUSIC_AT_1 = 0.45, DRUM_GAIN = 0.85, AHEAD_S = 0.12, TICK_MS = 25;
  const LEVEL_MS = 100, LEVEL_TAU_S = 1.5;
  let fx = null, fxTap = null, fxBuf = null, mix = 0.5, fxGrid = null, fxLast = -Infinity, fxTimer = 0;
  const kicks = [];                // every drum scheduled { at, beatAt, bpm }, for a check over CDP
  function fxBuild() {
    fx = { in: ctx.createGain(), dry: ctx.createGain(), cut1: ctx.createBiquadFilter(), cut2: ctx.createBiquadFilter(),
      music: ctx.createGain(), drums: ctx.createGain(), sat: ctx.createWaveShaper(), drum: ctx.createGain(),
      makeup: ctx.createGain(), out: ctx.createGain(), g: 1, msIn: 0, msOut: 0 };
    for (const c of [fx.cut1, fx.cut2]) { c.type = 'highpass'; c.Q.value = 0; }
    // tanh at a drive of 2.5, normalised so a full scale input still peaks at 1
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) { const u = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(2.5 * u) / Math.tanh(2.5); }
    fx.sat.curve = curve; fx.sat.oversample = '2x';
    fx.in.connect(fx.dry).connect(fx.out);
    fx.in.connect(fx.cut1).connect(fx.cut2).connect(fx.music).connect(fx.makeup);
    fx.drums.connect(fx.sat).connect(fx.drum).connect(fx.makeup);
    fx.makeup.connect(fx.out);
    fx.kIn = kMeter(fx.in); fx.kOut = kMeter(fx.out);
    fx.lvl = new Float32Array(fx.kIn.fftSize);
    setInterval(fxLevel, LEVEL_MS);
    fxTap = ctx.createAnalyser(); fxTap.fftSize = 2048; fxBuf = new Float32Array(2048);
    fxMixApply();
  }
  // A loudness meter's weighting in front of an analyser, off to the side.
  function kMeter(node) {
    const sh = ctx.createBiquadFilter(); sh.type = 'highshelf'; sh.frequency.value = 1681; sh.gain.value = 4;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38; hp.Q.value = 0;
    const a = ctx.createAnalyser(); a.fftSize = 4096; a.smoothingTimeConstant = 0;
    node.connect(sh).connect(hp).connect(a).connect(pull);   // pulled, or it is never run
    return a;
  }
  const meanSq = (a, buf) => { a.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; return s / buf.length; };
  function fxLevel() {
    if (!playing || !fx) return;
    const k = 1 - Math.exp(-LEVEL_MS / 1000 / LEVEL_TAU_S);
    fx.msIn += (meanSq(fx.kIn, fx.lvl) - fx.msIn) * k;
    fx.msOut += (meanSq(fx.kOut, fx.lvl) - fx.msOut) * k;
    if (mix < 0.01 || fx.msIn < 1e-7 || fx.msOut < 1e-9) return;
    fx.g = Math.max(0.1, Math.min(4, fx.g * Math.sqrt(fx.msIn / fx.msOut) ** 0.25));
    fx.makeup.gain.setTargetAtTime(fx.g, ctx.currentTime, 0.15);
  }
  function fxMixApply() {
    if (!fx) return;
    const t = ctx.currentTime, hz = CUT_LO * (CUT_HI / CUT_LO) ** mix;
    fx.dry.gain.setTargetAtTime(1 - mix, t, 0.01);
    fx.music.gain.setTargetAtTime(mix * MUSIC_AT_1, t, 0.01);
    fx.drum.gain.setTargetAtTime(mix * DRUM_GAIN, t, 0.01);
    fx.cut1.frequency.setTargetAtTime(hz, t, 0.02);
    fx.cut2.frequency.setTargetAtTime(hz, t, 0.02);
  }
  function fxMix(ev) {
    if (ev?.of !== 'param' || ev.name !== 'mix' || !Number.isFinite(ev.v)) return;
    mix = Math.max(0, Math.min(1, ev.v));
    fxMixApply();
  }
  // A tempo the detector is sure of sets the grid; one under DRUM_FLOOR takes
  // the grid away and the drum stops. The pictures show every reading; only
  // the drum waits for a sure one, because a kick on a wrong grid is heard.
  // 0.5: MEASURED offline 2026-10-11, the steady stretches of both recordings
  // read 0.6 to 0.9 and Raadio 4's last minute, which has no steady beat,
  // reads under 0.3.
  const DRUM_FLOOR = 0.5;
  function fxTempo(ev) {
    if (ev?.of !== 'param' || ev.name !== 'bpm') return;
    const sure = Number.isFinite(ev.v) && Number.isFinite(ev.beatAt) && (ev.confidence ?? 0) >= DRUM_FLOOR;
    fxGrid = sure ? { bpm: ev.v, beatAt: ev.beatAt } : null;
  }
  // A click, not a bass drum, since 2026-10-11 (*"is bd sound laggy? make click
  // isntead"*). The drum was on its grid to 2.5 ms (MEASURED by the agent that
  // built it), but a sine falling to a 52 Hz body puts its weight 20 to 70 ms
  // after the onset, so it is heard late. A click has all its energy in its
  // first 2 ms: a burst of white noise and a 2.5 kHz tick, gone in 15 ms.
  let noise = null;
  function kick(at) {
    if (!noise) {
      noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.02), ctx.sampleRate);
      const ch = noise.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    const n = ctx.createBufferSource(), ng = ctx.createGain();
    n.buffer = noise;
    ng.gain.setValueAtTime(0.9, at); ng.gain.exponentialRampToValueAtTime(0.0001, at + 0.006);
    n.connect(ng).connect(fx.drums);
    n.start(at); n.stop(at + 0.008);
    const t = ctx.createOscillator(), tg = ctx.createGain();
    t.frequency.value = 2500;
    tg.gain.setValueAtTime(0.0001, at);
    tg.gain.exponentialRampToValueAtTime(0.8, at + 0.0005);
    tg.gain.exponentialRampToValueAtTime(0.0001, at + 0.015);
    t.connect(tg).connect(fx.drums);
    t.start(at); t.stop(at + 0.017);
  }
  // Scheduled ahead on the audio clock, every TICK_MS, so a busy main thread
  // moves when the next one is booked and never when it sounds.
  function fxTick() {
    if (!playing || !fx || !fxGrid || mix <= 0) return;
    const per = 60 / fxGrid.bpm, end = ctx.currentTime + AHEAD_S;
    let k = Math.ceil((Math.max(ctx.currentTime, fxLast + per / 2) - fxGrid.beatAt) / per);
    for (let at = fxGrid.beatAt + k * per; at < end; k++, at = fxGrid.beatAt + k * per) {
      kick(at);
      fxLast = at;
      kicks.push({ at: +at.toFixed(4), beatAt: fxGrid.beatAt, bpm: fxGrid.bpm });
      if (kicks.length > 400) kicks.shift();
    }
  }
  fxTimer = setInterval(fxTick, TICK_MS);

  // The mix knob, its own node: a turn is one event on its value-out.
  const MIX0 = 0.5;
  const knobs = new Map([['mix', createKnob({
    label: 'mix', min: 0, max: 1, step: 0.01, value: MIX0, hand: true,
    format: (v) => `${Math.round(v * 100)}%`,
    onInput: (v) => bay.send(MIX_OUT, { of: 'param', name: 'mix', v }),
  })]]);
  const knobRow = createKnobGrid(knobs, { row: true });
  bay.send(MIX_OUT, { of: 'param', name: 'mix', v: MIX0 });

  const transport = createButtonGroup({ buttons: [
    { id: 'play', icon: 'play', label: 'play', onPress: () => (playing ? stop() : play()) },
  ] });
  function face() { transport.setIcon('play', playing ? 'stop' : 'play', playing ? 'stop' : 'play'); }
  face();

  const top = el('div', 'cc-top');
  top.append(transport.el);
  d.stack.add(top, wavePanel.el, tempoPanel.el, knobRow.el, pb.el);
  // Read only, for a check over CDP.
  window.__demo.tempo = { src: () => srcOf(STATIONS[at]), station: () => STATIONS[at].id, ...demo,
    history: () => history.slice(), beats: () => beats.slice(), kicks: () => kicks.slice(), mix: () => mix,
    setMix: (v) => { knobs.get('mix').set?.(v); bay.send(MIX_OUT, { of: 'param', name: 'mix', v }); },
    // At the current mix: the music path's energy below 300 Hz against the
    // input's, in dB, and the drum's peak against the music path's RMS, in dB,
    // over `ms` of playing.
    measure: (ms = 4000) => new Promise((res) => {
      const an = (node) => { const a = ctx.createAnalyser(); a.fftSize = 8192; a.smoothingTimeConstant = 0; node.connect(a); return a; };
      const aIn = an(fx.in), aMu = an(fx.music), aDr = an(fx.drum);
      const bins = new Float32Array(4096), buf = new Float32Array(8192);
      let eIn = 0, eMu = 0, drPeak = 0, muSq = 0, muN = 0;
      const hz = ctx.sampleRate / 8192, top = Math.floor(300 / hz);
      const low = (a) => { a.getFloatFrequencyData(bins); let e = 0; for (let i = 1; i <= top; i++) e += 10 ** (bins[i] / 10); return e; };
      const id = setInterval(() => {
        eIn += low(aIn); eMu += low(aMu);
        aDr.getFloatTimeDomainData(buf); for (const v of buf) drPeak = Math.max(drPeak, Math.abs(v));
        aMu.getFloatTimeDomainData(buf); for (const v of buf) { muSq += v * v; muN++; }
      }, 100);
      setTimeout(() => { clearInterval(id); for (const a of [aIn, aMu, aDr]) a.disconnect();
        const db = (r) => +(10 * Math.log10(r)).toFixed(1);
        res({ mix, cutHz: Math.round(CUT_LO * (CUT_HI / CUT_LO) ** mix), lowMusicVsInputDb: db(eMu / eIn), drumPeak: +drPeak.toFixed(3),
          musicRms: +Math.sqrt(muSq / muN).toFixed(4), drumPeakOverMusicRmsDb: db(drPeak ** 2 / (muSq / muN)) }); }, ms);
    }),
    // The K weighted loudness of the output against the input's over the same
    // `ms`, in dB, at the current mix.
    level: (ms = 5000) => new Promise((res) => {
      const buf = new Float32Array(fx.kIn.fftSize); let a = 0, b = 0, n = 0;
      const id = setInterval(() => { a += meanSq(fx.kIn, buf); b += meanSq(fx.kOut, buf); n++; }, 90);
      setTimeout(() => { clearInterval(id); res({ mix, outVsInDb: +(10 * Math.log10(b / a)).toFixed(2), makeup: +fx.g.toFixed(3) }); }, ms);
    }),
    diff: () => { if (!fxTap) return null; const a = new Float32Array(2048); tap.getFloatTimeDomainData(a); fxTap.getFloatTimeDomainData(fxBuf); let m = 0, p = 0; for (let i = 0; i < 2048; i++) { m = Math.max(m, Math.abs(a[i] - fxBuf[i])); p = Math.max(p, Math.abs(a[i])); } return { maxDiff: m, peak: p }; }, conf: () => det?.conf ?? null, playing: () => playing };
  return {
    get ctx() { return ctx; }, get pull() { return pull; }, get out() { return out; },
    get playing() { return playing; }, get at() { return at; }, pb, play, stop,
  };
}

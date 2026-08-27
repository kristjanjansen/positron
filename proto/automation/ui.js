// proto/automation/ui.js — shared bits for the two continuous-control demos:
// the lane strip (evidence vs reconstruction), the transport bar, and a
// generated WAV so automation.html needs no binary asset to have a media clip
// with its own internal clock.

import { valueAt } from './cc-core.js';

export const $ = (s, r = document) => r.querySelector(s);
export const nowUs = () => (performance.timeOrigin + performance.now()) * 1e3;  // steal §1.8

// ---------------------------------------------------------------------------
// Lane strip. Two renderers over one array (own-prior-art §4): the EVIDENCE
// lane draws the full-rate raw samples the capture saw, the RECONSTRUCTION lane
// draws the throttled knots and the straight lines replay actually plays. The
// visible gap between them IS the cost of the 100 ms throttle.
// ---------------------------------------------------------------------------

export function makeStrip(canvas, { range = [0, 1000], height = 120 } = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const st = { range: [...range], playhead: null, wall: null };
  function size() {
    const w = canvas.clientWidth || 600;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.height = height + 'px';
  }
  size();
  new ResizeObserver(size).observe(canvas);

  const xOf = (t) => ((t - st.range[0]) / Math.max(1e-6, st.range[1] - st.range[0])) * canvas.width;
  const yOf = (v) => canvas.height - 6 * dpr - (v / 16383) * (canvas.height - 12 * dpr);

  function draw({ series = new Map(), raw = null, playhead = null, wall = null, colors = {}, showKnots = true } = {}) {
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#0a0c0e'; g.fillRect(0, 0, canvas.width, canvas.height);
    // grid
    g.strokeStyle = '#1b2026'; g.lineWidth = 1 * dpr;
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * canvas.width;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, canvas.height); g.stroke();
    }
    // EVIDENCE: full-rate raw samples, faint
    if (raw) {
      for (const [key, pts] of raw) {
        g.strokeStyle = (colors[key] || '#e0b862') + '55';
        g.lineWidth = 3 * dpr; g.beginPath();
        pts.forEach((p, i) => (i ? g.lineTo(xOf(p.t), yOf(p.v)) : g.moveTo(xOf(p.t), yOf(p.v))));
        g.stroke();
      }
    }
    // RECONSTRUCTION: the logged knots and the interpolated line between them
    for (const [key, s] of series) {
      const c = colors[key] || '#79b8ff';
      g.strokeStyle = c; g.lineWidth = 1.5 * dpr; g.beginPath();
      s.pts.forEach((p, i) => (i ? g.lineTo(xOf(p.t), yOf(p.v)) : g.moveTo(xOf(p.t), yOf(p.v))));
      g.stroke();
      if (showKnots) {
        g.fillStyle = c;
        for (const p of s.pts) g.fillRect(xOf(p.t) - 1.5 * dpr, yOf(p.v) - 1.5 * dpr, 3 * dpr, 3 * dpr);
      }
    }
    // dual cursor (own-prior-art §4): playhead + wall-clock ghost
    if (wall !== null) {
      g.strokeStyle = '#7d879166'; g.lineWidth = 1 * dpr;
      g.beginPath(); g.moveTo(xOf(wall), 0); g.lineTo(xOf(wall), canvas.height); g.stroke();
    }
    if (playhead !== null) {
      g.strokeStyle = '#e2726e'; g.lineWidth = 1.5 * dpr;
      g.beginPath(); g.moveTo(xOf(playhead), 0); g.lineTo(xOf(playhead), canvas.height); g.stroke();
    }
    st.playhead = playhead; st.wall = wall;
  }
  return { canvas, draw, xOf, yOf, get range() { return st.range; }, set range(r) { st.range = [...r]; },
           tOf: (px) => st.range[0] + (px / (canvas.clientWidth || 1)) * (st.range[1] - st.range[0]) };
}

/** the deviation the throttle costs: reconstruction vs evidence, in 14-bit
 *  units, sampled at every raw sample (demo10's lesson — the two buffers are
 *  separate, the comparison is non-destructive). */
export function deviation(series, rawByKey) {
  const out = {};
  for (const [key, pts] of rawByKey) {
    const s = series.get(key);
    if (!s || !pts.length) continue;
    let sum = 0, max = 0; const errs = [];
    for (const p of pts) {
      const v = valueAt(s, p.t);
      if (v === null) continue;
      const e = Math.abs(v - p.v);
      errs.push(e); sum += e; if (e > max) max = e;
    }
    errs.sort((a, b) => a - b);
    out[key] = {
      n: errs.length,
      meanLsb: +(sum / Math.max(1, errs.length)).toFixed(1),
      p95Lsb: errs.length ? +errs[Math.floor(errs.length * 0.95)].toFixed(1) : 0,
      maxLsb: +max.toFixed(1),
      maxPct: +((max / 16383) * 100).toFixed(2),
    };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Transport bar — play/pause/scrubber/rate, wired to a deck. SEAM 2 is visible
// here: setRate() does NOT start playback, so the rate buttons stay meaningful
// while paused and the UI shows targetRate().
// ---------------------------------------------------------------------------

export function transportBar(root, deck, { onSeek } = {}) {
  const el = {
    play: $('[data-t=play]', root), pause: $('[data-t=pause]', root),
    scrub: $('[data-t=scrub]', root), pos: $('[data-t=pos]', root),
    rates: [...root.querySelectorAll('[data-rate]')],
  };
  let dragging = false;
  const [lo, hi] = deck.range;
  el.scrub.min = lo; el.scrub.max = hi; el.scrub.step = 1;
  el.play.onclick = () => deck.play();
  el.pause.onclick = () => deck.pause();
  el.scrub.oninput = () => { dragging = true; const p = deck.seek(+el.scrub.value); onSeek && onSeek(p); };
  el.scrub.onchange = () => { dragging = false; };
  for (const b of el.rates) b.onclick = () => { deck.setRate(+b.dataset.rate); paint(); };
  function paint(pos = deck.position()) {
    if (!dragging) el.scrub.value = pos;
    el.pos.textContent = `${(pos / 1000).toFixed(2)}s / ${(deck.durationMs / 1000).toFixed(2)}s  ×${deck.targetRate()}${deck.playing() ? '' : ' (paused)'}`;
    for (const b of el.rates) b.classList.toggle('on', +b.dataset.rate === deck.targetRate());
  }
  return { paint, el };
}

// ---------------------------------------------------------------------------
// A generated media clip: 16-bit PCM WAV, one tone per second, so the clip has
// an audible position AND its own internal clock — which is the only property
// automation.html actually needs from it. Point the page at a real file with
// ?media=/media/a1-concat.webm; the code path is identical, this just removes
// the binary asset from the loop.
// ---------------------------------------------------------------------------

export function makeWavBlob({ seconds = 20, rate = 22050 } = {}) {
  const n = seconds * rate;
  const buf = new ArrayBuffer(44 + n * 2);
  const dv = new DataView(buf);
  const s = (o, t) => { for (let i = 0; i < t.length; i++) dv.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); s(8, 'WAVEfmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  s(36, 'data'); dv.setUint32(40, n * 2, true);
  const scale = [0, 2, 4, 5, 7, 9, 11, 12];
  for (let i = 0; i < n; i++) {
    const sec = Math.floor(i / rate);
    const f = 220 * Math.pow(2, scale[sec % scale.length] / 12) * (1 + Math.floor(sec / 8) * 0.5);
    const env = Math.min(1, (i % rate) / (rate * 0.02)) * Math.exp(-((i % rate) / rate) * 1.6);
    const v = Math.sin((2 * Math.PI * f * i) / rate) * 0.5 * env;
    dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

export function logLine(el, text, cls = '') {
  const d = document.createElement('div');
  d.className = cls; d.textContent = text;
  el.appendChild(d);
  while (el.childElementCount > 400) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}

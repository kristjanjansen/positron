// demo/shell/grain-scope.mjs — the sound being eaten, and where.
//
// The picture is the MATERIAL: the held seconds drawn as a waveform, left to
// right. On it, a lit range is where grains are being taken from, a cursor is
// the middle of that range, and every grain flickers as a tick at the exact
// point it read. Move `where` and the range slides along the sound. Widen
// `scatter` and it opens. Turn density up and the flicker thickens. Freeze and
// the whole picture stops dead.
//
// 🔴 THE FIRST VERSION OF THIS PLOTTED POSITION AGAINST TIME AND IT WAS USELESS
// to anyone except me. It was a debugging instrument — it answered "did a grain
// fire", which was my question, not the player's. Its vertical axis read "0.35
// of the way through the held seconds", which is a NUMBER, not a place you can
// hear. Drawn on the waveform it came from, the same number is a place: that
// quiet bit just before the loud bit. The verdict on the old one — "this viz
// does nothing to me, perhaps to you" — was exactly right and is the reason
// this file looks like this.
//
// ⚠️ IT STILL DOES NOT CARE WHERE THE GRAINS COME FROM, and it still says what
// it knows. Two pictures, chosen by what it is given:
//
//   buffer() + mark()   there is material AND the engine reports its grains.
//                       The waveform, the range, the cursor, the flicker.
//                       Everything drawn is MEASURED.
//
//   feed()              audio and nothing else — a stream from another machine
//                       that sends sound and no events. A scrolling waveform of
//                       what arrived, and the gutter says it is all that can be
//                       honestly shown. No range, no cursor, no grain ticks:
//                       inventing them would be drawing knowledge we do not
//                       have, and this project already keeps "we did not look"
//                       and "we looked and it was fine" apart everywhere else.
//
// ⚠️ AND THE GUTTER NAMES IT. A picture of grains drawn from settings and a
// picture drawn from reported grains look alike and mean completely different
// things, so the line under it says which this is, in words.

import { el } from './shell.mjs';

export function createGrainScope(host, { seconds = 4, height = 150, fadeMs = 520 } = {}) {
  const wrap = el('div', 'pos-scope');
  const canvas = el('canvas', 'pos-scope-c');
  const gut = el('div', 'pos-scope-gut', 'nothing yet');
  wrap.append(canvas, gut);
  host.append(wrap);

  // ── the second picture: the settings, on the material they act on ────────
  //
  // 🔴 A SEPARATE CANVAS, NOT A SECOND THING DRAWN ON THE FIRST. The waveform
  // above is the last few seconds of sound ARRIVING; this is the whole minute
  // the engine is holding. Two different x-axes, and stacking them in one
  // rectangle would invite exactly the reading the picture must not support —
  // that the lit window sits over the sound you can see.
  //
  // ⚠️ IT DRAWS A CENTRE AND A WIDTH, NEVER A GRAIN. The first version of the
  // grain picture drew ticks derived from the requested rate, which is a
  // confident row of marks under a stream never shown to contain one grain.
  // Every lane below says whether its centre is the engine's OWN report or
  // what this page asked for, and the gutter says it again in words.
  let winCv = null, winGut = null, lanes = null, winSeconds = 60;

  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const tok = (n, fb) => (css.getPropertyValue(n) || '').trim() || fb;
  const C = {
    field: tok('--card', '#141922'),
    line: tok('--line', '#232c3a'),
    line2: tok('--line2', '#32405a'),
    wave: tok('--dim2', '#7a879c'),
    grain: tok('--ok', '#6ee7a8'),
    hi: tok('--hi', '#ffd400'),
    dim: tok('--dim', '#9aa7bd'),
  };

  let dpr = 1, W = 0, H = 0;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(200, Math.round(wrap.getBoundingClientRect().width));
    H = height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
  }
  size();
  new ResizeObserver(() => { size(); sizeWin(); }).observe(wrap);

  // ── state ────────────────────────────────────────────────────────────────
  let peaks = null, writeAt = 0, filled = 0;      // the material
  let band = null;                                 // {from, to, at} — 0..1
  const live = [];                                 // flickering grain ticks
  const scroll = [];                               // {t, v} for the audio-only view
  let sourceName = '', counts = { measured: 0, inferred: 0 };
  const t0 = performance.now() / 1000;
  const now = () => performance.now() / 1000 - t0;
  let envAcc = 0, envN = 0;

  const api = {
    el: wrap, canvas,

    /** The held sound itself, as peaks. This is what makes the rest legible. */
    buffer(p, { write = 0, filledFrac = 1 } = {}) {
      peaks = p; writeAt = write; filled = filledFrac;
    },

    /** Where grains are being read from: the lit range and its cursor. */
    range(from, to, at) { band = { from, to, at }; },

    /** One grain, at the point in the material it read. */
    mark(g) {
      counts.measured++;
      live.push({ pos: g.pos ?? 0.5, level: g.level ?? 1, born: performance.now() });
      if (live.length > 600) live.splice(0, live.length - 600);
    },
    marks(list) { if (list?.length) for (const g of list) api.mark(g); },

    /**
     * Audio and nothing else — the honest case for a stream off another
     * machine. A scrolling waveform, and no grain ticks, because nothing here
     * knows where a grain started or whether one did.
     */
    feed(pcm, rate = 48000) {
      const t = now();
      const win = Math.max(1, Math.round(rate * 0.004));
      for (let i = 0; i < pcm.length; i++) {
        const v = pcm[i]; envAcc = Math.max(envAcc, v < 0 ? -v : v); envN++;
        if (envN >= win) { scroll.push({ t, v: envAcc }); envAcc = 0; envN = 0; }
      }
      counts.inferred++;
      const cut = t - seconds - 0.3;
      while (scroll.length && scroll[0].t < cut) scroll.shift();
    },

    /**
     * What the engine has been told to read, drawn on the seconds it holds.
     *
     * @param list  [{label, at, spray, rate, size, measured}] — `at` and
     *              `spray` are fractions of the held seconds; `measured` says
     *              the centre came back FROM the engine rather than from what
     *              this page sent it.
     */
    window(list, { seconds: secs = 60 } = {}) {
      lanes = list || null;
      winSeconds = secs;
      if (!lanes || !lanes.length) { if (winCv) { winCv.remove(); winGut.remove(); winCv = winGut = null; } return; }
      if (!winCv) {
        winCv = el('canvas', 'pos-scope-c pos-scope-w');
        winGut = el('div', 'pos-scope-gut', '');
        wrap.append(winCv, winGut);
        sizeWin();
      }
    },

    source(name) { sourceName = name; },
    clear() { live.length = 0; scroll.length = 0; peaks = null; counts = { measured: 0, inferred: 0 }; },
    stats: () => ({ ...counts, flickering: live.length }),
  };

  const LANE_H = 30, LANE_GAP = 6, WIN_PAD = 10;
  function sizeWin() {
    if (!winCv || !lanes) return;
    const h = WIN_PAD * 2 + lanes.length * LANE_H + (lanes.length - 1) * LANE_GAP;
    const w = Math.max(200, Math.round(wrap.getBoundingClientRect().width));
    if (winCv.width !== Math.round(w * dpr) || winCv.height !== Math.round(h * dpr)) {
      winCv.width = Math.round(w * dpr); winCv.height = Math.round(h * dpr);
      winCv.style.width = `${w}px`; winCv.style.height = `${h}px`;
    }
    return { w, h };
  }

  function paintWindow() {
    if (!winCv || !lanes || !lanes.length) return;
    const dim = sizeWin();
    if (!dim) return;
    const { w, h } = dim;
    const g = winCv.getContext('2d');
    g.save();
    g.scale(dpr, dpr);
    g.fillStyle = C.field; g.fillRect(0, 0, w, h);

    let measured = 0;
    lanes.forEach((L, i) => {
      const y = WIN_PAD + i * (LANE_H + LANE_GAP);
      // the held seconds, as a track
      g.fillStyle = C.line; g.fillRect(0, y, w, LANE_H);
      // ten-second marks, so the axis is a duration and not a bar
      g.fillStyle = C.field;
      for (let t = 10; t < winSeconds; t += 10) g.fillRect((t / winSeconds) * w, y, 1, LANE_H);

      // where it reads: the centre, and how far grains scatter from it
      const at = Math.max(0, Math.min(1, L.at ?? 0.5));
      const half = Math.max(0.004, (L.spray ?? 0) / 2);
      const x1 = (at - half) * w, x2 = (at + half) * w;
      g.fillStyle = 'rgba(255,212,0,.10)';
      g.fillRect(Math.max(0, x1), y, Math.min(w, x2) - Math.max(0, x1), LANE_H);
      if (x1 < 0) g.fillRect(w + x1, y, -x1, LANE_H);
      if (x2 > w) g.fillRect(0, y, x2 - w, LANE_H);

      // ⚠️ SOLID WHEN THE ENGINE SAID SO, DASHED WHEN WE ASKED FOR IT. Those
      // are different claims and they must not look alike.
      g.strokeStyle = C.hi; g.lineWidth = 1.5;
      if (L.measured) measured++; else g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(at * w + 0.5, y); g.lineTo(at * w + 0.5, y + LANE_H); g.stroke();
      g.setLineDash([]);

      g.font = `500 10px ${MONO}`;
      g.textBaseline = 'middle';
      g.fillStyle = C.dim;
      g.fillText(L.label ?? '', 6, y + LANE_H / 2);
      const right = `${fmtRate(L.rate)} a second · each ${Math.round((L.size ?? 0) * 1000)} ms`;
      g.textAlign = 'right';
      g.fillText(right, w - 6, y + LANE_H / 2);
      g.textAlign = 'left';
    });

    g.strokeStyle = C.line; g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, w - 1, h - 1);
    g.restore();

    // The gutter carries what the picture IS, not how to use it.
    const all = lanes.length;
    winGut.textContent = `the ${winSeconds} seconds the engine is holding · the lit band is where grains are taken from · `
      + (measured === all ? 'both centres are the engine’s own'
        : measured === 0 ? 'the centres are what this page asked for, not what the engine reported'
          : `${measured} of ${all} centres come back from the engine; the dashed one is what this page asked for`);
  }

  const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  const fmtRate = (r) => (r == null ? '?' : r >= 10 ? r.toFixed(0) : r.toFixed(1));

  // ── paint ────────────────────────────────────────────────────────────────
  function paint() {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = C.field; ctx.fillRect(0, 0, W, H);
    const mid = H / 2;

    if (peaks && peaks.length) {
      // ── the material ───────────────────────────────────────────────────
      // Mirrored around the centre, which is how a waveform is read
      // everywhere, so nobody has to learn this picture.
      const n = peaks.length;
      let mx = 0; for (let i = 0; i < n; i++) if (peaks[i] > mx) mx = peaks[i];
      const k = mx > 0 ? (H * 0.42) / mx : 0;
      ctx.fillStyle = C.line2;
      const bw = W / n;
      for (let i = 0; i < n; i++) {
        const h = Math.max(0.5, peaks[i] * k);
        ctx.fillRect(i * bw, mid - h, Math.max(1, bw - 0.5), h * 2);
      }

      // ── where it is reading ────────────────────────────────────────────
      if (band) {
        const x1 = band.from * W, x2 = band.to * W;
        // A lit RANGE rather than a tinted one: a wash over the waveform
        // changes the thing the picture is of.
        ctx.fillStyle = 'rgba(255,212,0,.07)';
        if (x2 >= x1) ctx.fillRect(x1, 0, Math.max(2, x2 - x1), H);
        else { ctx.fillRect(x1, 0, W - x1, H); ctx.fillRect(0, 0, x2, H); }
        ctx.strokeStyle = 'rgba(255,212,0,.35)'; ctx.lineWidth = 1;
        for (const x of [x1, x2]) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
        // the cursor: the middle of the range, which is what `where` sets
        ctx.strokeStyle = C.hi; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(band.at * W + 0.5, 2); ctx.lineTo(band.at * W + 0.5, H - 2); ctx.stroke();
      }

      // ── where new sound is going in ────────────────────────────────────
      if (filled < 0.999) {
        ctx.strokeStyle = C.line; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.moveTo(writeAt * W + 0.5, 0); ctx.lineTo(writeAt * W + 0.5, H); ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── the grains, flickering ─────────────────────────────────────────
      // Each one is a tick at the exact point it read, bright when it fires
      // and gone within half a second. At 25 a second that is a shimmer
      // inside the range, and the range is what you are steering.
      const tnow = performance.now();
      for (let i = live.length - 1; i >= 0; i--) {
        const g = live[i];
        const age = (tnow - g.born) / fadeMs;
        if (age >= 1) { live.splice(i, 1); continue; }
        const x = g.pos * W;
        const a = (1 - age) * (0.25 + 0.75 * Math.min(1, g.level));
        const h = mid * (0.35 + 0.55 * (1 - age));
        ctx.strokeStyle = C.grain; ctx.globalAlpha = a; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 0.5, mid - h); ctx.lineTo(x + 0.5, mid + h); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else {
      // ── audio only: what arrived, scrolling ────────────────────────────
      if (scroll.length > 1) {
        const t = now(), x0 = t - seconds;
        const X = (tt) => ((tt - x0) / seconds) * W;
        let mx = 0; for (const s of scroll) if (s.v > mx) mx = s.v;
        const k = mx > 0 ? (H * 0.44) / mx : 0;
        ctx.beginPath();
        ctx.moveTo(X(scroll[0].t), mid);
        for (const s of scroll) ctx.lineTo(X(s.t), mid - s.v * k);
        for (let i = scroll.length - 1; i >= 0; i--) ctx.lineTo(X(scroll[i].t), mid + scroll[i].v * k);
        ctx.closePath();
        ctx.fillStyle = C.line2; ctx.fill();
        ctx.strokeStyle = C.hi; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W - 0.5, 0); ctx.lineTo(W - 0.5, H); ctx.stroke();
      }
    }

    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    ctx.restore();

    gut.textContent = peaks
      ? `${live.length} grains in the air · the lit range is where they are being taken from${sourceName ? ` · ${sourceName}` : ''}`
      : counts.inferred
        ? `this is the sound that arrived, and all that can honestly be drawn${sourceName ? ` — ${sourceName}` : ''}`
        : 'nothing yet';

    paintWindow();
    raf = requestAnimationFrame(paint);
  }
  let raf = requestAnimationFrame(paint);
  api.stop = () => cancelAnimationFrame(raf);
  return api;
}

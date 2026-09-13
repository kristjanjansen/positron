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
  // ⚠️ THE ELEMENT STAYS AND IS NEVER WRITTEN TO. Removing it outright would
  // change the wrap's height and every page that lays out around this
  // component; keeping it empty keeps the geometry and makes the absence
  // deliberate rather than a deletion somebody has to rediscover.
  const gut = el('div', 'pos-scope-gut', '');
  wrap.append(canvas, gut);
  host.append(wrap);

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
  new ResizeObserver(size).observe(wrap);

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
      live.push({ pos: g.pos ?? 0.5, level: g.level ?? 1, half: g.half ?? 0, born: performance.now() });
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

    source(name) { sourceName = name; },
    clear() { live.length = 0; scroll.length = 0; peaks = null; counts = { measured: 0, inferred: 0 }; },
    stats: () => ({ ...counts, flickering: live.length }),
  };

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
    } else if (live.length) {
      // ── grains, on the buffer's own axis, with nothing drawn under them ──
      //
      // 🔴 THE THIRD PICTURE, AND IT EXISTS BECAUSE THE AXES DO NOT MATCH.
      // A remote engine can report WHERE each grain read — a fraction of the
      // held seconds — long before it can send the held seconds themselves. Its
      // arriving audio is a different quantity on a different axis (the last
      // few seconds of OUTPUT), so drawing ticks over that waveform would put
      // buffer positions on a time axis and invite the one reading this must
      // never support.
      //
      // So the waveform goes and the ticks stay, on the axis they belong to —
      // which is also the axis the page's own granulator is drawn on, so the
      // two are finally comparable. What is missing is named in the gutter
      // rather than approximated.
      const bed = H * 0.5;
      ctx.fillStyle = C.line;
      ctx.fillRect(0, bed - 0.5, W, 1);
      // ten marks across, so the axis is a duration rather than a bar
      for (let i = 1; i < 10; i++) ctx.fillRect((i / 10) * W, bed - 4, 1, 8);
      if (band) {
        ctx.fillStyle = 'rgba(255,212,0,.07)';
        const x1 = band.from * W, x2 = band.to * W;
        if (x2 >= x1) ctx.fillRect(x1, 0, Math.max(2, x2 - x1), H);
        else { ctx.fillRect(x1, 0, W - x1, H); ctx.fillRect(0, 0, x2, H); }
        ctx.strokeStyle = C.hi; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(band.at * W + 0.5, 2); ctx.lineTo(band.at * W + 0.5, H - 2); ctx.stroke();
      }
      // ⚠️ THE HALF IS DRAWN AS A SIDE, NOT AS A COLOUR. One meaning for colour
      // across every demo: a mark's colour says HOW IT LANDED. Which granulator
      // fired it is identity, and identity is position — granulator one above
      // the line, two below it.
      const tnow = performance.now();
      for (let i = live.length - 1; i >= 0; i--) {
        const g = live[i];
        const age = (tnow - g.born) / fadeMs;
        if (age >= 1) { live.splice(i, 1); continue; }
        const x = g.pos * W;
        const h = (H * 0.34) * (0.35 + 0.55 * (1 - age));
        ctx.strokeStyle = C.grain;
        ctx.globalAlpha = (1 - age) * (0.25 + 0.75 * Math.min(1, g.level));
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (g.half) { ctx.moveTo(x + 0.5, bed + 2); ctx.lineTo(x + 0.5, bed + 2 + h); }
        else { ctx.moveTo(x + 0.5, bed - 2 - h); ctx.lineTo(x + 0.5, bed - 2); }
        ctx.stroke();
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

    // 🔴 NO PROSE UNDER A PICTURE THAT REDRAWS EVERY FRAME. This carried a
    // sentence that rewrote itself sixty times a second and REFLOWED — three
    // lines, then four, then three — so the whole page jumped under the
    // reader's eye continuously. The words were accurate and it did not matter;
    // a caption that changes length is a caption that cannot be read, and it
    // moves everything below it as well. Reported as "a horrible jump of
    // content each time it updates", which is exactly what it was.
    //
    // The count that mattered is a NUMBER, and a number belongs in a cell of
    // fixed width — `grains` prints it in its readout, where it changes without
    // moving anything. See `shell.css`'s note on live text and reflow.
    if (gut && gut.textContent) gut.textContent = '';

    raf = requestAnimationFrame(paint);
  }
  let raf = requestAnimationFrame(paint);
  api.stop = () => cancelAnimationFrame(raf);
  return api;
}

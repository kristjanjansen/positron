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

export function createGrainScope(host, { seconds = 4, height = 150, fadeMs = 520,
                                        fullScale = null, grainSeconds = 0 } = {}) {
  // 🔴 `grainSeconds` PUTS GRAIN TICKS ON THE SCROLLING WAVE, and the branch
  // below explains at length why that is normally forbidden: a remote engine's
  // grain positions are fractions of ITS held buffer, while its arriving audio
  // is the last few seconds of OUTPUT — two quantities on two axes, and
  // overlaying them invites a reading nothing supports.
  //
  // ⚠️ THAT ARGUMENT DOES NOT HOLD WHEN THE MATERIAL IS THE SAME AUDIO. On
  // `/radio1965/` the granulator's buffer is filled from the very stream this
  // scope is drawing, on one clock in one process — so a grain that read at
  // fraction `pos` of an N-second buffer read the audio that arrived
  // `(1 - pos) * N` seconds ago, and that lands on this axis exactly. Passing
  // the buffer length is how a page says "these are the same seconds"; leaving
  // it at 0 keeps the refusal.
  // 🔴 `fullScale` LOCKS THE VERTICAL SCALE, AND WITHOUT IT THE PICTURE LIES
  // ABOUT LOUDNESS. The default draws the waveform normalised to the loudest
  // sample CURRENTLY IN VIEW, which is right for a fixed buffer you are
  // inspecting and wrong for a stream: as a loud passage scrolls off the right
  // edge the divisor drops and everything left standing suddenly grows, so a
  // quiet stretch looks identical to a loud one and the whole picture heaves.
  // Reported from `/radio1965/` as *"the scale keeps changing"*, which is
  // exactly what it was doing.
  //
  // Set it to an amplitude (1 = full scale) and the height means a level again.
  // ⚠️ It is opt-in so that `/grains/`, which inspects a held buffer where
  // relative shape is the subject, keeps the behaviour it was built with.
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
  // ⚠️ `wraps`, NOT `marks`. This object already had `mark(g)` — one grain, at
  // the point in the material it read — and a second `mark()` defined lower in
  // the SAME object literal silently replaced it. Every grain tick on
  // `/radio1965/` stopped being drawn, the page's own assert read `0 ticks
  // alive`, and it was put down to the station being off air, which it also
  // was. Two names, two jobs, and the collision was invisible because a later
  // key in an object literal simply wins.
  const wraps = [];                                // {t} — moments worth seeing
  let sourceName = '', counts = { measured: 0, inferred: 0 };
  // 🔴 HOW SOLID THE GRAINS ARE DRAWN, AND IT IS A NUMBER THE PAGE OWNS.
  // `/radio1965/` blends a live station against the granulator chewing it, and
  // the fader that does that is the one gesture on the page — so the ticks are
  // drawn at exactly the share of what you are HEARING that they are: invisible
  // when the fader is all radio, solid when it is all granulator.
  //
  // ⚠️ IT MULTIPLIES THE PER-GRAIN FADE, IT DOES NOT REPLACE IT. Each tick
  // already fades over `fadeMs` from the instant it fired, which is the thing
  // that makes the picture a flicker rather than a smear; this scales the whole
  // layer under that. Two alphas, two meanings — age, and share of the output.
  //
  // ⚠️ DEFAULT 1, so `/grains/`, which has no blend to report, is unchanged.
  // And it is deliberately NOT applied to the waveform: the wave is the
  // MATERIAL, which is being eaten whatever the fader says, so dimming it would
  // be the picture claiming the radio had gone away.
  let grainAlpha = 1;
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
    /**
     * @param {number|null} tone 0..1, where the energy sits — 0 all low, 1 all
     *   high. OPTIONAL, and the picture is honest either way: given one, each
     *   column is coloured by it; given none, the wave draws flat as before.
     *   ⚠️ The SCOPE does not compute it. Whoever owns the audio owns the
     *   measurement; this file draws what it is handed and nothing else.
     */
    feed(pcm, rate = 48000, tone = null) {
      const t = now();
      const win = Math.max(1, Math.round(rate * 0.004));
      for (let i = 0; i < pcm.length; i++) {
        const v = pcm[i]; envAcc = Math.max(envAcc, v < 0 ? -v : v); envN++;
        if (envN >= win) { scroll.push({ t, v: envAcc, tone }); envAcc = 0; envN = 0; }
      }
      counts.inferred++;
      const cut = t - seconds - 0.3;
      while (scroll.length && scroll[0].t < cut) scroll.shift();
    },

    /**
     * 0..1 — how much of what the listener hears is the granulator. See the
     * note by `grainAlpha` above. Anything outside 0..1 is clamped rather than
     * refused: this is fed straight off a fader.
     */
    grainAlpha(v) { grainAlpha = Math.max(0, Math.min(1, Number(v) || 0)); },

    /**
     * A moment worth seeing on the scrolling wave — today, a loop coming round.
     *
     * 🔴 THE LOOP'S ENDS ARE NOT DRAWABLE HERE AND THE WRAP IS. This scope's
     * axis is ARRIVAL TIME: the last few seconds of what came out, scrolling
     * left. A loop's start and end are positions in the MEDIA, and at any rate
     * but 1x the two axes advance at different speeds — so drawing the bounds
     * on this picture would put media positions on a time axis, which is the
     * reading the whole file is careful not to invite (see `grainSeconds`).
     * A WRAP is different: it is a thing that happened at an instant, and an
     * instant is exactly what this axis holds. Marked where it happened, it
     * scrolls away with the audio it belongs to — and the spacing between two
     * marks is the loop's length as you actually heard it, which is the one
     * number a picture can give you that the transport cannot.
     */
    wrap() { wraps.push({ t: now() }); },

    source(name) { sourceName = name; },
    clear() { live.length = 0; scroll.length = 0; wraps.length = 0; peaks = null; counts = { measured: 0, inferred: 0 }; },
    /** Which of the two pictures is being drawn. ⚠️ READ OFF THE SAME STATE THE
     *  PAINT BRANCHES ON, not off whatever a caller last asked for — a page
     *  that thinks it switched and did not is exactly the thing worth checking. */
    showing: () => (peaks && peaks.length ? 'material' : 'scrolling'),
    stats: () => ({ ...counts, flickering: live.length, wraps: wraps.length }),
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
      let mx = fullScale ?? 0;
      if (!fullScale) for (let i = 0; i < n; i++) if (peaks[i] > mx) mx = peaks[i];
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
        const a = (1 - age) * (0.25 + 0.75 * Math.min(1, g.level)) * grainAlpha;
        const h = mid * (0.35 + 0.55 * (1 - age));
        ctx.strokeStyle = C.grain; ctx.globalAlpha = a; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 0.5, mid - h); ctx.lineTo(x + 0.5, mid + h); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (live.length && !grainSeconds) {
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
        ctx.globalAlpha = (1 - age) * (0.25 + 0.75 * Math.min(1, g.level)) * grainAlpha;
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
        let mx = fullScale ?? 0;
        if (!fullScale) for (const s of scroll) if (s.v > mx) mx = s.v;
        const k = mx > 0 ? (H * 0.44) / mx : 0;
        // 🔴 ONE GREY, AND IT IS NOT A STYLE CHOICE — THE SAME RULE `floor`
        // FOLLOWS AND FOR THE SAME REASON. There was a hue-mapped wave here:
        // height for loudness, hue for where the energy sits, bounded to ~95
        // degrees of `--hi` rather than a rainbow. The argument was a good one —
        // a flat grey wave cannot tell a cymbal from a bass note at the same
        // level — and it is not the argument that was being had. The repo owner
        // asked for the original monochrome back, twice, and a second
        // measurement nobody asked for is a second measurement nobody asked for
        // however well it is reasoned.
        //
        // ⚠️ AND IT WAS UNFINDABLE FROM THE PAGE. `demo/radio1965/index.html`
        // contains no colour at all — one `theme-color` meta and nothing else —
        // because the hue lived in this shared kit, switched on merely by the
        // data carrying a `tone` field. Looking at the page that showed it would
        // never have found it. If colour comes back here it needs a flag the
        // PAGE sets by name, not a field that turns it on by being present.
        ctx.beginPath();
        ctx.moveTo(X(scroll[0].t), mid);
        for (const s of scroll) ctx.lineTo(X(s.t), mid - s.v * k);
        for (let i = scroll.length - 1; i >= 0; i--) ctx.lineTo(X(scroll[i].t), mid + scroll[i].v * k);
        ctx.closePath();
        ctx.fillStyle = C.line2; ctx.fill();
        // ── the loop coming round ──────────────────────────────────────────
        // One hairline where each wrap happened, ageing off the left with the
        // audio it belongs to. Drawn OVER the wave and under the grains: it is
        // a fact about the wave, not a thing in it.
        while (wraps.length && wraps[0].t < x0) wraps.shift();
        if (wraps.length) {
          ctx.save();
          ctx.strokeStyle = C.hi; ctx.lineWidth = 1;
          for (const m of wraps) {
            const x = X(m.t);
            // Fading with age says which wrap is the recent one without a
            // second channel; the newest is full strength.
            ctx.globalAlpha = 0.25 + 0.55 * ((m.t - x0) / seconds);
            ctx.beginPath(); ctx.moveTo(x + 0.5, 2); ctx.lineTo(x + 0.5, H - 2); ctx.stroke();
          }
          ctx.restore();
        }
        // the grains, on the same seconds the wave is drawn on.
        // ⚠️ SKIPPED OUTRIGHT AT ZERO, not drawn at `globalAlpha = 0`. The two
        // are identical on screen and they are not identical to read: a loop
        // that runs and paints nothing invites exactly the report that came in —
        // *"turn off grain animation if you are at zero"* — from somebody
        // watching a picture that was still moving for a different reason.
        // Skipping says in the code what the fader says on screen.
        if (grainSeconds && grainAlpha > 0) {
          for (let i = live.length - 1; i >= 0; i--) {
            const g = live[i];
            const age = (performance.now() - g.born) / 1000;
            if (age > fadeMs / 1000) continue;
            // ⚠️ ON THIS FILE'S OWN CLOCK. `now()` is `performance.now()/1000 - t0`
            // and `g.born` is a raw `performance.now()` in MILLISECONDS, so the
            // two must be reconciled before either touches `X()`. Mixing them
            // puts every tick t0 seconds out — a picture that looks plausible
            // and is wrong by a constant, which is the hardest kind to notice.
            const bornAt = g.born / 1000 - t0;
            const at = bornAt - (1 - g.pos) * grainSeconds;
            const x = X(at);
            if (x < 0 || x > W) continue;
            ctx.globalAlpha = Math.max(0, 1 - age / (fadeMs / 1000)) * grainAlpha;
            ctx.fillStyle = C.hi;
            ctx.fillRect(x - 0.5, mid - H * 0.46, 1.5, H * 0.92);
          }
          ctx.globalAlpha = 1;
        }
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

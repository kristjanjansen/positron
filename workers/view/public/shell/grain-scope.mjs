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
//
// 🔴 `playhead()` STOPS THE PICTURE AND THAT IS THE WHOLE POINT OF IT. Asked for
// in these words: *"keep x scale the same, just stop the viz and move loop
// playhead."* A loop plays a window of sound that has already gone by, so while
// one runs there is nothing new to scroll and a wave that kept sliding would be
// drawing arriving audio that the listener is not hearing. Setting a playhead
// freezes the scrolling picture where it stands, at the SAME seconds-per-pixel
// it already had, and runs one solid hairline across it; clearing the playhead
// starts the scroll again. Nothing is rescaled in either direction, so the
// picture a reader learned before the loop is the picture they are reading
// during it.

import { el } from './shell.mjs';

/** How wide the playhead is drawn, in CSS pixels. One, and it is solid. */
const HEAD_PX = 1;

/**
 * 🔴 A WINDOW NARROWER THAN THE BUFFER IT DRAWS GRAINS FROM SILENTLY DROPS THE
 * OLDEST OF THEM, AND IT IS REFUSED. A grain reported at position `p` of a
 * `grainSeconds` buffer is drawn at `bornAt - (1 - p) * grainSeconds`, so with
 * `seconds` smaller than `grainSeconds` every grain read from the first
 * `1 - seconds/grainSeconds` of the buffer lands left of x=0 and is skipped by
 * the bounds test.
 *
 * MEASURED on `/radio/`, which asked for a 6 s window over an 8 s buffer:
 * the oldest QUARTER of the granulator's range could not be drawn at all, so
 * whenever its read head sat there the picture showed no grains and the page's
 * own check read `0 lit`. That was taken for the station being off air more
 * than once, which is the expensive half: a display defect wearing an outage's
 * clothes. The picture was also simply wrong for a reader, every day, with
 * nothing saying so.
 *
 * It throws rather than widening itself, because a scope that quietly changes
 * the axis it was asked for is a second thing that can disagree with the page.
 */
export function createGrainScope(host, { seconds = 4, height = 150, fadeMs = 520,
                                        fullScale = null, grainSeconds = 0,
                                        freezeOnLoop = true } = {}) {
  if (grainSeconds && grainSeconds > seconds) {
    throw new Error(`a ${seconds} s window cannot draw grains from a ${grainSeconds} s buffer`
      + `. The oldest ${Math.round((1 - seconds / grainSeconds) * 100)}% of them would land off the left edge`);
  }
  // 🔴 `grainSeconds` PUTS GRAIN TICKS ON THE SCROLLING WAVE, and the branch
  // below explains at length why that is normally forbidden: a remote engine's
  // grain positions are fractions of ITS held buffer, while its arriving audio
  // is the last few seconds of OUTPUT — two quantities on two axes, and
  // overlaying them invites a reading nothing supports.
  //
  // ⚠️ THAT ARGUMENT DOES NOT HOLD WHEN THE MATERIAL IS THE SAME AUDIO. On
  // `/radio/` the granulator's buffer is filled from the very stream this
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
  // Reported from `/radio/` as *"the scale keeps changing"*, which is
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
    /**
     * 🔴 A LOOP IS DRAWN IN GREY AND THE THING THAT MOVES IS NOT. ASKED FOR:
     * *"loop info viz colors: just grayscale?"*. The band, the two ends, the
     * wraps and the live edge were all `--hi`, the same yellow as the grain
     * ticks, so a picture of a granulator chewing a loop was one colour saying
     * five things. `mark` is the furniture: where the loop is and where it came
     * round. `head` is the playhead, which is the only mark here that is
     * somewhere different every frame, and it is the brightest grey there is
     * rather than a second hue. What keeps `--hi` is the grains, because they
     * are the measurement the picture exists to show.
     */
    mark: tok('--dim2', '#6a7280'),
    head: tok('--fg', '#e6e6e6'),
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
  // `/radio/` stopped being drawn, the page's own assert read `0 ticks
  // alive`, and it was put down to the station being off air, which it also
  // was. Two names, two jobs, and the collision was invisible because a later
  // key in an object literal simply wins.
  const wraps = [];                                // {t} — moments worth seeing
  // A loop's playhead, 0..1 across the picture, and the scope clock the
  // scrolling picture was stopped at. They are one state in two variables: a
  // playhead is only meaningful on a picture that is not moving under it.
  let head = null, frozenAt = null;
  /**
   * 🔴 THE COLUMNS THE FROZEN PICTURE IS DRAWN FROM, COPIED AT THE INSTANT IT
   * FROZE. REPORTED as the waveform being *"chipped away"* while a loop ran,
   * and the mechanism is two clocks: the picture is drawn against `frozenAt`,
   * which does not move, while `feed()` goes on trimming `scroll` against
   * `now()`, which does. So every second of loop dropped a second off the LEFT
   * of a window that was not sliding, and after `seconds` of looping the whole
   * wave had been eaten from the left edge inward while the marks stood still.
   *
   * ⚠️ IT IS A SNAPSHOT AND NOT A LONGER RETENTION. Holding `scroll` back to
   * `frozenAt - seconds` instead would work and would grow without bound: a
   * loop left running for ten minutes is 150,000 columns nobody is drawing.
   * A copy is the window being read, `scroll` goes on being the last few
   * seconds of real audio, and letting go of the copy is what makes the picture
   * live again — with the loop's own seconds already in it rather than a hole.
   */
  let held = null;
  /**
   * 🔴 A LOOP IS THREE MARKS, NOT ONE, AND THEY ARRIVE AT DIFFERENT TIMES.
   * Specified from the page rather than invented here:
   *
   *   press one   a line at the live edge, and THE WAVE KEEPS SCROLLING. The
   *               sound is still arriving and being kept, so a frozen picture
   *               would be a lie about what the button just did. The seconds
   *               since that line are tinted, which is the only thing on screen
   *               saying "this part is being recorded".
   *   press two   the wave STOPS where it is, and a second line lands at the
   *               rightmost point it reached. Those two lines are now the ends
   *               of the loop, and they cannot move, because the picture under
   *               them cannot.
   *   then        a third line runs between the two, and only between the two.
   *   press three the lines go and the wave starts moving again.
   *
   * ⚠️ `loopA` AND `loopB` ARE TIMES ON THIS FILE'S OWN CLOCK, not fractions.
   * A fraction would have to be re-read against the window every frame while
   * the window is still sliding, and the first mark lives through exactly that.
   */
  let loopA = null, loopB = null;
  let sourceName = '', counts = { measured: 0, inferred: 0 };
  // 🔴 HOW SOLID THE GRAINS ARE DRAWN, AND IT IS A NUMBER THE PAGE OWNS.
  // `/radio/` blends a live station against the granulator chewing it, and
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

  /**
   * Stop the picture at `t`, and keep the columns it is standing on.
   *
   * ⚠️ ONE `now()`, READ BY THE CALLER AND PASSED IN. `loopTo` needs the same
   * instant for the freeze and for the end mark, and taking the clock twice a
   * microsecond apart drew the wave held at one moment and the band that marks
   * the loop against another. That was already a written rule here and the
   * snapshot is a third reader of the same instant.
   */
  function freeze(t) {
    frozenAt = t;
    held = scroll.slice();
  }

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
      // 🔴 A FROZEN PICTURE GOES ON RECORDING. It used to drop every sample and
      // then wipe the held columns on release, which left a gap in the picture
      // for exactly as long as the loop had run. REPORTED, and the reason it is
      // wrong is one sentence: **there was no silence**. The loop was playing
      // the whole time and it plays into the same graph, so those seconds have
      // audio in them and the wave should simply carry on with the loop in its
      // past and the station after it.
      //
      // ⚠️ THE OLD WORRY WAS REAL AND IS ANSWERED BY RECORDING RATHER THAN
      // ACCUMULATING. Holding one running maximum across the whole loop would
      // have put a single enormous column at the seam, a spike that never
      // happened. Columns keep being pushed at their own times instead; what
      // freezing changes is only the RIGHT EDGE the picture is drawn against,
      // so the new ones are off-screen until the edge starts moving again.
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

    /**
     * Where a loop has got to, as a fraction of the picture's width, drawn as
     * one solid hairline. `null` takes it away.
     *
     * 🔴 IT ALSO STOPS THE SCROLLING PICTURE, AND THAT IS NOT A SIDE EFFECT —
     * it is the thing that was asked for (see the note at the top of this
     * file). While a playhead is set the wave holds still at the scale it
     * already had, so the line moves against a fixed picture instead of two
     * things sliding past each other at different speeds. Clearing it lets the
     * wave start again.
     *
     * ⚠️ THE FRACTION IS OF THE PICTURE, NOT OF THE LOOP, and the caller is who
     * turns one into the other. This file knows how many seconds are across its
     * own width and knows nothing about a loop's ends, so anything else would
     * be it guessing at somebody else's axis.
     *
     * @param {number|null} frac 0..1, clamped. Anything not a finite number
     *   takes the playhead away, so `playhead()` and `playhead(null)` agree.
     */
    /** Press one: mark the live edge and go on scrolling. */
    loopFrom() { loopA = now(); loopB = null; head = null; frozenAt = null; },
    /**
     * Press two: stop the picture and mark where it stopped.
     * ⚠️ `frozenAt` IS SET FIRST, AND `loopB` READS IT. Taking `now()` twice
     * puts the second line a frame's worth of milliseconds right of the edge
     * the picture actually froze at, which at eight seconds across is a couple
     * of pixels of the line standing outside the wave it is supposed to end.
     */
    /**
     * 🔴 FREEZING IS RIGHT WHERE SOMETHING KEEPS LANDING ON THE FROZEN PICTURE,
     * AND WRONG WHERE NOTHING DOES.
     *
     * On `/radio/` the wave stops and the GRAINS carry on being drawn
     * across the held span, so a stopped picture is still a live one: the thing
     * that moves is the instrument reading the seconds again and again.
     *
     * ⚠️ THE EXAMPLE THIS NOTE USED TO GIVE HAS CHANGED SIDES, AND THE OPTION IS
     * WHY IT COULD. `/tapes/` passed `false`, because its loop was made of SEEKS:
     * the file really was still playing, so a picture that stopped was claiming
     * a silence that did not happen, reported as *"visualization just stops on
     * looping tapes"*. That page keeps its lap in a ring now and plays it from
     * there, so the picture is a fixed piece of sound with a line crossing it,
     * and it freezes like `/radio/` does. No page passes `false` today. The
     * option stays because the question it answers is real: whether anything is
     * still arriving to draw is a fact about the caller, not about this file.
     */
    // 🔴 ONE `now()`, READ ONCE. The line this replaced carried a warning saying
    // exactly that and the `freezeOnLoop` edit broke it anyway: two calls a
    // microsecond apart put the freeze instant and the loop's end mark at
    // DIFFERENT times, so the picture is held at one moment while the band that
    // marks the loop is drawn against another. What that looks like is the wave
    // vanishing and the loop region sitting alone on an empty scope, reported
    // as the loop eating the waveform.
    loopTo() { const t = now(); if (freezeOnLoop) freeze(t); loopB = t; },
    /**
     * Press three: the wave catches up with live again.
     *
     * 🔴 NOTHING IS THROWN AWAY. This used to empty `scroll`, because with the
     * picture taking nothing in during a loop the held columns were followed by
     * a hole, and the wave is one polygon so the hole was drawn as a flat line
     * at zero: a picture of silence over audio that was playing. Now the loop's
     * own seconds were recorded as they played, so letting the edge move again
     * simply reveals them, and the station follows on behind with no seam.
     *
     * ⚠️ THE TWO END MARKS STAY. They age off the left with the audio they
     * belong to, exactly as a wrap does, so the loop you just heard is still
     * visible in the picture's past instead of vanishing the moment it stops.
     */
    loopOff() { head = null; frozenAt = null; held = null; },
    playhead(frac) {
      if (!Number.isFinite(frac)) {
        // 🔴 THE SNAPSHOT GOES AND `scroll` STAYS, AND THAT IS THE OPPOSITE OF
        // WHAT THIS DID. It used to empty `scroll`, because back when a frozen
        // picture dropped every sample the held columns were followed by a hole,
        // and the wave is one polygon so the hole was drawn as a flat line at
        // zero: a picture of silence over audio that had been playing.
        // `feed()` records right through a freeze now, so `scroll` holds the
        // loop's own last seconds, unbroken, and wiping it blanked a picture
        // that had exactly the right thing in it.
        head = null; frozenAt = null; held = null;
        return;
      }
      head = Math.max(0, Math.min(1, frac));
      // ⚠️ IT NO LONGER FREEZES BY ITSELF. `loopTo()` is what stops the
      // picture, and it is a different press from the one that starts the line
      // moving. A `playhead` that also froze meant the first position pushed
      // after the loop closed decided where the wave stopped, which is a frame
      // or two late and is the wrong event to hang it on.
      if (loopA == null && frozenAt == null) freeze(now());
    },

    source(name) { sourceName = name; },
    clear() {
      live.length = 0; scroll.length = 0; wraps.length = 0; peaks = null;
      head = null; frozenAt = null; held = null; loopA = null; loopB = null;
      counts = { measured: 0, inferred: 0 };
    },
    /** Which of the two pictures is being drawn. ⚠️ READ OFF THE SAME STATE THE
     *  PAINT BRANCHES ON, not off whatever a caller last asked for — a page
     *  that thinks it switched and did not is exactly the thing worth checking. */
    showing: () => (peaks && peaks.length ? 'material' : 'scrolling'),
    // ⚠️ `frozen` IS REPORTED SEPARATELY FROM `playhead` even though one sets
    // the other, because they answer different questions: one is where the line
    // is, the other is whether any new audio is reaching the picture at all.
    // A check that a loop stopped the wave needs the second and cannot get it
    // from the first.
    // ⚠️ `frozenCols` IS HOW A CHECK SEES THE WAVE BEING EATEN. A frozen
    // picture whose column count FALLS is the chipping-away bug; `frozen: true`
    // cannot see it, because the wave was stopped either way.
    stats: () => ({ ...counts, flickering: live.length, wraps: wraps.length,
      playhead: head, frozen: frozenAt != null,
      frozenCols: held ? held.length : null,
      loopFrom: loopA, loopTo: loopB, marks: (loopA != null) + (loopB != null) }),
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
      // ⚠️ THE SNAPSHOT WHILE FROZEN, `scroll` OTHERWISE. See `held` above: the
      // live array goes on being trimmed against a clock this picture is no
      // longer drawn on, so reading it here is what ate the wave from the left.
      const cols = held ?? scroll;
      if (cols.length > 1) {
        // ⚠️ THE CLOCK IS THE FROZEN ONE WHILE A LOOP RUNS, and that single
        // substitution is what holds the x scale. `seconds` never changes, so
        // stopping the right edge stops the whole mapping with it: every column
        // stays exactly where the reader last saw it rather than sliding left
        // under a line that is supposed to be the only thing moving.
        const t = frozenAt ?? now(), x0 = t - seconds;
        const X = (tt) => ((tt - x0) / seconds) * W;
        let mx = fullScale ?? 0;
        if (!fullScale) for (const s of cols) if (s.v > mx) mx = s.v;
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
        // ⚠️ AND IT WAS UNFINDABLE FROM THE PAGE. `demo/radio/index.html`
        // contains no colour at all — one `theme-color` meta and nothing else —
        // because the hue lived in this shared kit, switched on merely by the
        // data carrying a `tone` field. Looking at the page that showed it would
        // never have found it. If colour comes back here it needs a flag the
        // PAGE sets by name, not a field that turns it on by being present.
        // ── the seconds being kept ─────────────────────────────────────────
        // 🔴 UNDER THE WAVE, AND IT IS THE ONLY THING THAT SAYS RECORDING IS
        // HAPPENING. Between the first press and the second the picture goes on
        // scrolling exactly as before, which is correct and leaves the button
        // with nothing visible to show for itself. A tint from the first mark to
        // the live edge is that: it grows as the sound arrives, and it is the
        // shape the loop will have. Drawn before the wave so the wave stays the
        // brightest thing in the box.
        if (loopA != null) {
          const ax = Math.max(0, X(loopA));
          const bx = loopB != null ? X(loopB) : W;
          if (bx > ax) {
            ctx.globalAlpha = 0.12; ctx.fillStyle = C.mark;
            ctx.fillRect(ax, 1, bx - ax, H - 2);
            ctx.globalAlpha = 1;
          }
        }
        ctx.beginPath();
        ctx.moveTo(X(cols[0].t), mid);
        for (const s of cols) ctx.lineTo(X(s.t), mid - s.v * k);
        for (let i = cols.length - 1; i >= 0; i--) ctx.lineTo(X(cols[i].t), mid + cols[i].v * k);
        ctx.closePath();
        ctx.fillStyle = C.line2; ctx.fill();
        // ── the loop coming round ──────────────────────────────────────────
        // One hairline where each wrap happened, ageing off the left with the
        // audio it belongs to. Drawn OVER the wave and under the grains: it is
        // a fact about the wave, not a thing in it.
        while (wraps.length && wraps[0].t < x0) wraps.shift();
        if (wraps.length) {
          ctx.save();
          // 🔴 ONE PIXEL, SOLID, IN THE LOOP'S OWN GREY, THE SAME AS EVERY
          // OTHER LOOP EDGE. These used to fade from 0.25 to 0.80 with age, on
          // the argument that the fade says which wrap is the recent one without
          // spending a second channel. The argument is fine and the consistency
          // is worth more: the transport bar draws a loop's ends as a 1 px solid
          // border in the same grey, so a loop boundary that is sometimes a
          // quarter-strength hairline is the same mark in three strengths across
          // two surfaces. Age is already said by position, which is the channel a
          // scrolling wave has for free: the leftmost is the oldest, and it
          // leaves the picture when the audio it belongs to does.
          ctx.strokeStyle = C.mark; ctx.lineWidth = 1; ctx.globalAlpha = 1;
          for (const m of wraps) {
            const x = X(m.t);
            ctx.beginPath(); ctx.moveTo(x + 0.5, 2); ctx.lineTo(x + 0.5, H - 2); ctx.stroke();
          }
          ctx.restore();
        }
        // ── the loop's ends ────────────────────────────────────────────────
        // One pixel, solid, in the loop's grey: the same mark the transport bar
        // draws round a loop. ⚠️ NOT the same as the playhead any more — those
        // were one colour and the playhead crosses both of them, so at the top
        // and the bottom of a lap the moving mark and the fixed one it had
        // reached were indistinguishable. The first
        // appears on the first press and travels left with the audio it belongs
        // to while the picture is still moving; the second lands when the
        // picture stops, and after that neither can move because nothing under
        // them does.
        // ⚠️ THEY EXPIRE WITH THEIR AUDIO. A mark whose second has scrolled off
        // the left is a mark about nothing, and left in place it would pin
        // itself to the edge and read as a loop that is still running.
        if (loopA != null && loopA < x0) loopA = null;
        if (loopB != null && loopB < x0) loopB = null;
        for (const t of [loopA, loopB]) {
          if (t == null) continue;
          const x = X(t);
          if (x < -1 || x > W + 1) continue;
          ctx.strokeStyle = C.mark; ctx.lineWidth = 1; ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.moveTo(Math.round(x) + 0.5, 1);
          ctx.lineTo(Math.round(x) + 0.5, H - 1);
          ctx.stroke();
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
        // 🔴 THE LIVE EDGE IS NOT DRAWN ON A STOPPED PICTURE. This hairline
        // means "this is now", and while a loop runs the right edge is the
        // moment the picture stopped rather than the moment you are in. Left
        // standing it would be a second full-height line in the same colour as
        // the playhead, claiming to be the live edge of a wave that is not
        // advancing.
        if (frozenAt == null) {
          ctx.strokeStyle = C.mark; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(W - 0.5, 0); ctx.lineTo(W - 0.5, H); ctx.stroke();
        }
      }
    }

    /**
     * 🔴 A LINE SAYING WHAT THIS PICTURE IS, AND IT WAS DEAD CODE UNTIL NOW.
     * `source(name)` has existed and been called by `/radio/` for weeks and the
     * string was assigned and never drawn: a component with a setter and no
     * reader, which is the same shape as a control that looks live and is
     * inert. FOUND 2026-09-16 while answering why `/tapes/` shows an empty box
     * on most of its recordings.
     *
     * ⚠️ IT IS STATIC TEXT IN A FIXED CORNER, which is what makes it allowed at
     * all. CLAUDE.md forbids anything that redraws every frame from changing
     * how much room it takes; this changes only when the page sets it, and it
     * is drawn INSIDE the canvas, so it cannot reflow the page whatever it says.
     */
    if (sourceName) {
      ctx.save();
      ctx.globalAlpha = 1;
      // ⚠️ `--dim`, NOT `--line`. `--line` is the colour of a grid rule on a
      // dark ground and a sentence in it is not readable; this has to be read.
      ctx.fillStyle = C.dim;
      ctx.font = `11px ${getComputedStyle(canvas).fontFamily || 'monospace'}`;
      ctx.textBaseline = 'bottom';
      ctx.fillText(sourceName, 8, H - 7);
      ctx.restore();
    }

    // ── the loop's playhead ──────────────────────────────────────────────
    // Last, so it is on top of whichever of the three pictures was drawn, and
    // SOLID: no age, no fade, no alpha. Every other mark here is faded by
    // something (a tick by its age, a wrap by how long ago it happened, the
    // grain layer by the fader), and fading is how this file says a mark is
    // reported rather than certain. A playhead is neither: it is where the
    // sound being played has got to, which is not a measurement that can be
    // more or less confident.
    // ── grains, while the picture is stopped ──────────────────────────────
    // 🔴 A FROZEN WAVE USED TO DRAW NO GRAINS AT ALL, and the page still had a
    // granulator running. REPORTED as not being able to see the grain
    // animation: every tick was placed at `bornAt` on an axis whose right edge
    // had stopped moving, so every one of them landed past the right edge and
    // was skipped by the bounds test. The picture was correct about the wave
    // and silently blank about the thing chewing it.
    //
    // ⚠️ POSITIONED ACROSS THE LOOP, AND ONLY BECAUSE THE LOOP IS WHAT IS BEING
    // READ. A grain reports where in the granulator's buffer it read; while a
    // loop plays, that buffer holds the loop and nothing else, so the fraction
    // IS a position inside these two marks. Without both marks there is no span
    // to map into and nothing is drawn, because a tick at a guessed position is
    // worse than no tick.
    if (frozenAt != null && loopA != null && loopB != null && grainAlpha > 0 && live.length) {
      const t = frozenAt, s0 = t - seconds;
      const LX = (tt) => ((tt - s0) / seconds) * W;
      const ax = LX(loopA), bx = LX(loopB);
      const tnow = performance.now();
      for (let i = live.length - 1; i >= 0; i--) {
        const g = live[i];
        const age = (tnow - g.born) / fadeMs;
        if (age >= 1) { live.splice(i, 1); continue; }
        const x = ax + g.pos * (bx - ax);
        if (x < 0 || x > W) continue;
        ctx.globalAlpha = (1 - age) * (0.25 + 0.75 * Math.min(1, g.level)) * grainAlpha;
        ctx.fillStyle = C.hi;
        ctx.fillRect(x - 0.5, mid - H * 0.44, 1.5, H * 0.88);
      }
      ctx.globalAlpha = 1;
    }

    if (head != null) {
      ctx.globalAlpha = 1;             // whatever the branch above left behind
      // ⚠️ THE ONE MARK HERE THAT IS SOMEWHERE ELSE EVERY FRAME, so it is the
      // one that is not drawn in the furniture's grey. See `C.head`.
      ctx.fillStyle = C.head;
      // 🔴 BETWEEN THE TWO ENDS, NOT ACROSS THE BOX. It used to run the whole
      // width, which is only right when the loop happens to be the entire
      // window: any shorter loop had its playhead outside its own ends, over
      // audio it was not playing. With both marks known the fraction is mapped
      // into the span they bound, and the fallback stays the full width for a
      // caller that pushes a position without having marked anything.
      let x0p = 0, x1p = W - HEAD_PX;
      if (loopA != null && loopB != null && frozenAt != null) {
        const t = frozenAt, s0 = t - seconds;
        const X2 = (tt) => ((tt - s0) / seconds) * W;
        x0p = X2(loopA);
        x1p = Math.max(x0p, X2(loopB) - HEAD_PX);
      }
      ctx.fillRect(Math.round(x0p + head * (x1p - x0p)), 1, HEAD_PX, H - 2);
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

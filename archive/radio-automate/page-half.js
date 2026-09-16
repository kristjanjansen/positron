// archive/radio-automate/page-half.js — the tour that `Automate` armed, removed
// from `demo/radio/index.html` on 2026-09-16.
//
// 🔴 THIS IS NOT A MODULE AND MUST NOT BE IMPORTED. Every function below closes
// over names that exist only inside that page: `eng`, `modulator`, `patch`,
// `PATCHES`, `applyPatch`, `routedNow`, `lockedRate`, `sliders`, `faderSld`,
// `scanRange`, `setWet`, `granSlot`, `P`, `d`, `SELFCHECK`. It is kept verbatim
// and in the order it stood, so that a session that wants the movement back can
// read what it actually was rather than what somebody remembered.
//
// It also imported five things from `demo/shell/radio-gran.mjs`, which are still
// there and are still exported: `tourAt`, `breathe`, `SLOT_MS`, `DWELL_MS`,
// `MORPH_MS`, plus `morphOf`, `basesOf`, `writeContinuous` and `writeDiscrete`.
// Nothing was deleted from that module. See the README beside this file.

  // ═══ letting it play itself ════════════════════════════════════════════════
  //
  // 🔴 THE SAME MOVEMENT `/videoradio/` HAS, ON A PAGE WITH A PERSON HOLDING IT,
  // AND THAT SECOND CLAUSE IS ALL OF THE DESIGN. Over there every decision is a
  // clock's and there are no controls to move; here every decision is a hand's
  // and there are five rows of them. So the movement is the same tour and it is
  // wrapped in three rules, each of which this repo has already paid for:
  //
  //   · it is OFF until somebody presses `Let it play itself`
  //   · a hand on anything it moves takes it back AT ONCE, and the log says so
  //   · it never moves a control a finger is already on, because the hand-back
  //     fires on `pointerdown`, which is the FIRST event of a touch
  //
  // ⚠️ AND IT DOES NOT CHANGE STATION, WHICH IS THE ONE THING `/videoradio/`
  // DOES THAT IS NOT COPIED. Two separate reasons and either is enough. This
  // page was asked in as many words not to move the row by itself: *"do not
  // switch channels if I do not"*, which is why the background watch ungreys a
  // dead station and never follows it. And every mount here is a public
  // broadcaster's, whose listener figures count each connection this repo opens:
  // a tour that hops stations on a timer adds one of those every seventy-one
  // seconds for as long as a tab is open. The blend, the sound and the four
  // settings are this page's own and cost nobody anything.
  //
  // ⚠️ THE BLEND'S TWO ENDS, AND NEITHER IS 0 OR 1. At 0 the granulator is
  // inaudible and the grain picture is drawing something nobody can hear; at 1
  // the station is gone and what is left is an instrument with no material.
  const DRIFT_LO = 0.25, DRIFT_HI = 0.92;
  const drift = {
    on: false,
    from: 0,
    /**
     * 🔴 HELD WHILE THE PAGE IS EXERCISING ITS OWN CONTROLS, AND ONLY THEN.
     * `demo/verify.mjs` presses every `.pos-controls` button a second or two
     * after load, which is in the middle of a wasm boot, an eight-second ring
     * fill, an ink probe that runs the fader to both ends and a patch A/B that
     * presses `›` and `‹`. A tour running through all of that would fight every
     * one of them, and each fight reads as a broken page rather than as two
     * things writing one control. So under a harness the PAGE drives this
     * control itself, once, at the one moment in the run when nothing else is
     * moving the instrument. A visitor never sets this.
     */
    held: SELFCHECK,
    moves: 0,           // ticks that actually wrote something
    yields: 0,          // times a hand took it back
    k: 0,               // where in the slide between two sounds
  };
  // The shell's own accessor, so the id is written once and a rename cannot
  // leave a selector here pointing at nothing.
  const driftBtn = () => d.button('drift');
  // What the four sliders were last shown, so a dwell costs no DOM at all: with
  // `k` at 0 the morph returns sound A's own numbers EXACTLY, so every one of
  // these comparisons is false and nothing is written for twenty-two seconds.
  const shown = { rate: NaN, size: NaN, spray: NaN, scan: NaN };

  function driftFace() {
    const b = driftBtn();
    if (b) b.setAttribute('aria-pressed', String(drift.on));
  }

  function driftStart() {
    if (drift.on || drift.held) return false;
    drift.on = true;
    drift.moves = 0;
    // 🔴 IT BEGINS ON THE SOUND THAT IS ALREADY LOADED, so pressing the button
    // changes nothing you can hear in that instant: the tour opens at the top
    // of `patch`'s own slot and slides out of it twenty-two seconds later. A
    // clock started at zero would jump to whatever sound slot 0 happens to be.
    drift.from = performance.now() - patch * SLOT_MS;
    // the blend rides the frame clock while this is on; see `blendFrame`
    if (!blendRaf) blendRaf = requestAnimationFrame(blendFrame);
    driftFace();
    d.log(`playing itself: ${(DWELL_MS / 1000).toFixed(0)} s on each sound, `
      + `${(MORPH_MS / 1000).toFixed(0)} s sliding to the next, and the blend `
      + 'breathing with it. Touch any of it and it is yours again.', 'hi');
    return true;
  }

  /**
   * 🔴 STOPPING LEAVES THE INSTRUMENT EXACTLY WHERE IT IS, AND THAT IS THE
   * POINT RATHER THAN A SHORTCUT. Landing the current sound whole on the way
   * out would move all four sliders at the moment a hand arrives, including the
   * one under the finger, which is the rule this whole block exists to keep.
   * What a visitor takes over is what they can see: the engine is holding the
   * values the sliders are showing, halfway between two sounds if that is where
   * the tour was, which is an ordinary place for an instrument to be and is one
   * press of `‹` away from a named sound.
   */
  function driftStop(why) {
    if (!drift.on) return false;
    drift.on = false;
    // the frame loop checks `drift.on` too, but cancelling is what stops a
    // frame being queued for a tour that has already ended
    if (blendRaf) { cancelAnimationFrame(blendRaf); blendRaf = 0; }
    driftFace();
    d.log(why, 'hi');
    return true;
  }

  /**
   * A hand on anything the tour moves.
   *
   * ⚠️ `pointerdown` AND `keydown`, NEVER `click`. Two reasons and they pull the
   * same way. A click arrives at the END of a press, so a tour that yielded on
   * it would have a whole gesture's worth of time to move the control under the
   * finger; `pointerdown` is the first event of a touch. And `element.click()`
   * fires no pointer events at all, which is what `verify.mjs` and this page's
   * own checks use to drive controls, so the page working its own picker
   * cannot be mistaken for somebody reaching for it.
   */
  /**
   * A hand on the granulator takes the instrument back.
   *
   * 🔴 IT IGNORES THE BUTTON THAT STARTS IT, AND THAT BECAME LOAD BEARING THE
   * MOMENT THAT BUTTON MOVED IN HERE. `Automate` was in the page's control row
   * and is now inside `.gran-slot`, which is the element this listener is on:
   * without the guard, pressing it would arm the tour and then immediately hand
   * it back on the same gesture, so the control would look broken rather than
   * off. Checked by id on the composed path, because the press lands on the
   * button and bubbles through the slot.
   */
  const handBack = (e) => {
    if (!drift.on) return;
    const from = e?.target?.closest?.('[data-id="drift"]');
    if (from) return;
    drift.yields++;
    driftStop('the instrument is yours now, so it has stopped moving by itself');
  };

  /**
   * One pass of the tour, at the modulator's own rate.
   *
   * 🔴 THE MORPH MOVES THE BASE OF A ROUTED CONTROL AND WRITES EVERY OTHER ONE
   * ITSELF. `createModulator` writes `base + modulation` twenty-five times a
   * second; a tour writing the raw value of the same control at the same rate
   * makes the two alternate, which is a 25 Hz square wave on something that is
   * supposed to be gliding. `routedNow` is what keeps them out of each other's
   * way, and it is why `applyPatch` remembers the set.
   */
  function driftTick() {
    if (!eng || !modulator || !drift.on || drift.held) return;
    const t = tourAt(performance.now() - drift.from, PATCHES.length);
    const m = morphOf(PATCHES[t.a], PATCHES[t.b], t.k);
    drift.k = m.k;
    const landOn = PATCHES.indexOf(m.at);
    if (landOn >= 0 && landOn !== patch) applyPatch(landOn, { half: 'discrete' });

    const values = { ...m.values };
    // 🔴 A LOCKED GRAIN CLOCK OUTRANKS THE TOUR, and that is what tempo-synced
    // means here: while a loop is playing the grain rate belongs to the lap
    // rather than to the sound the tour is travelling through. Written here
    // rather than fought with afterwards, for the same reason as `routedNow`.
    if (lockedRate != null) values.rate = lockedRate;

    // The base is where a modulated control RETURNS to, so it has to be the
    // morphed value and not the arriving sound's: otherwise every routed
    // control jumps to its destination at the crossover while the unrouted ones
    // glide, and half the instrument arrives early.
    const bases = basesOf(m.at);
    for (const k of Object.keys(bases)) {
      const moved = values[k];
      modulator.setBase(k, typeof moved === 'number' ? moved : bases[k]);
    }
    writeContinuous(eng, values, { scanmode: m.at.scanmode, bufSeconds: BUF_SECONDS,
      skip: routedNow });
    P.rate = values.rate; P.size = values.size;
    P.spray = values.spray; P.scan = values.scan;

    /**
     * 🔴 AND THE SLIDERS FOLLOW, WHICH THE MODULATOR DELIBERATELY DOES NOT.
     * The note on `startModulator` is right that a knob redrawn twenty-five
     * times a second is the `grain-scope` caption in another costume: a
     * modulation is a wobble AROUND where a setting sits, and the handle has to
     * show where it sits. A morph is the other thing. The setting itself is
     * travelling from one sound to another over nine seconds, so a handle that
     * stayed put would be this file's own named failure, a page showing one
     * patch and playing another.
     * ⚠️ IT COSTS NOTHING DURING A DWELL. `blend(a, b, 0)` is `a` exactly, in
     * both the linear and the geometric lane, so for twenty-two seconds out of
     * every thirty-one every comparison below is false.
     */
    if (sliders) {
      const r = scanRange();
      const four = [[sliders.rate, 'rate', values.rate],
                    [sliders.size, 'size', values.size],
                    [sliders.spray, 'spray', values.spray],
                    [sliders.scan, 'scan', r.toUi(values.scan)]];
      for (const [sld, key, v] of four) {
        if (!sld || !Number.isFinite(v) || v === shown[key]) continue;
        shown[key] = v;
        sld.set(v, { quiet: true });
      }
    }
    drift.moves++;
  }

  /**
   * 🔴 THE BLEND MOVES ON THE FRAME CLOCK, NOT ON THE MODULATOR'S 25 Hz.
   * REPORTED 2026-09-16: *"wet dry movement is janky/choppy"*.
   *
   * It was written from the same `setInterval` as everything else the tour
   * does, at 40 ms. That is plenty of steps for a value, and it is the wrong
   * CLOCK for a thing being watched: a 40 ms timer and a 16.7 ms paint do not
   * divide, so the handle got one update on some frames and two on others, in a
   * pattern that repeats every three frames. The number was smooth and the
   * picture of it juddered.
   *
   * ⚠️ THE FOUR SETTINGS STAY ON THE 25 Hz TICK AND THAT IS NOT AN OVERSIGHT.
   * They only move during the 9 s slide and they are written through
   * `shown[key]`, which skips a write when the value has not changed; the blend
   * is the one control that moves through the WHOLE slot, every tick, which is
   * why it is the one that showed this.
   * ⚠️ AND THE AUDIO MOVED WITH IT rather than being left behind on the timer.
   * Two clocks writing one gain would put the ear and the eye a frame apart for
   * no reason; `breathe()` is a pure function of the tour clock, so both simply
   * read it at whatever rate they run.
   */
  let blendRaf = 0;
  function blendFrame() {
    blendRaf = 0;
    if (!drift.on) return;
    if (!drift.held) {
      const t = tourAt(performance.now() - drift.from, PATCHES.length);
      setWet(breathe(t.within, DRIFT_LO, DRIFT_HI));
      faderSld?.set(wet, { quiet: true });
    }
    blendRaf = requestAnimationFrame(blendFrame);
  }

  d.on('drift', () => {
    // ⚠️ REFUSED WHILE THE PAGE IS CHECKING ITSELF, IN SILENCE. See `held`: the
    // harness presses this in the middle of a boot, and the page drives the same
    // button itself once everything else has stopped moving.
    if (drift.held) return;
    if (drift.on) driftStop('stopped playing itself');
    else driftStart();
  });

  /**
   * 🔴 ON THE SLOT, NOT ON THE WHOLE PAGE, AND THE SCOPE IS THE CLAIM. What
   * takes the instrument back is a hand on something the tour MOVES: the fader,
   * the four settings and the sound picker, all of which land inside
   * `.gran-slot`. The station row and the transport are not moved by the tour,
   * so pressing play, LOOP or a station is not a request to stop it, and a
   * listener on the whole body would have made it one.
   * ⚠️ CAPTURE PHASE, so it runs before the control's own handler and before
   * anything can be dragged. A capture listener reaches a target even when the
   * event does not bubble, which is what makes it reliable across three
   * different components.
   */
  granSlot.addEventListener('pointerdown', handBack, { capture: true });
  granSlot.addEventListener('keydown', handBack, { capture: true });

// ── and the check that graded it, from the same file ─────────────────────

      /**
       * 🔴 IT PLAYS ITSELF, A HAND TAKES IT BACK, AND THE BUTTON STOPS IT TOO.
       * Three claims and three asserts, because each one alone passes on a page
       * that is broken in one of the other two ways: a tour that never yields
       * satisfies the first, a control wired to nothing satisfies the second,
       * and a toggle that only latches on satisfies both.
       *
       * ⚠️ LAST IN THE BLOCK, AND THAT POSITION IS THE MEASUREMENT. Everything
       * above this line drives a control: the ink probe runs the fader to both
       * ends, the patch A/B presses `›` and `‹`, the loop row cycles four ways.
       * A tour running through any of that is a second writer on the control
       * being graded, and the reading would be about the collision rather than
       * about either thing. This is the one moment in the run when the page has
       * stopped working its own instrument.
       *
       * ⚠️ DRIVEN BY THE REAL BUTTON, never by calling `driftStart`. The fault
       * this kind of check exists to catch lives in the wiring between a button
       * and its handler, and calling the handler steps straight over it.
       */
      {
        muted = true; setWet(0);
        const btn = driftBtn();
        const wasPatch = patch;
        drift.held = false;                    // see `held`: the page's turn now
        const before = { rate: P.rate, size: P.size, scan: P.scan, spray: P.spray };
        btn?.click();
        G.driftOn = drift.on;
        G.driftFace = btn ? btn.getAttribute('aria-pressed') : 'no button';

        /**
         * 🔴 THE CLOCK IS PLACED, AND THIS IS THE ONE THING THE CHECK DOES THAT
         * A VISITOR DOES NOT. A slot is thirty-one seconds and a run cannot
         * wait for one: at the top of a dwell the blend's cosine is flat and
         * nothing has started sliding yet, so a second and a half of sampling
         * there would read `0.001 of span` about a tour that is working
         * perfectly. Seeded to just before the crossover, the same window
         * contains the steep part of the blend, the slide between two sounds,
         * and the step from one to the other.
         * ⚠️ IT SETS THE CLOCK, NOT THE STATE. Everything downstream is still a
         * pure function of `performance.now()`, which is the property that
         * makes this safe to do at all.
         */
        const DWELL_FRAC = DWELL_MS / SLOT_MS;
        const atK = (k) => { drift.from = performance.now()
          - (wasPatch + DWELL_FRAC + k * (1 - DWELL_FRAC)) * SLOT_MS; };
        atK(0.40);
        let lo = Infinity, hi = -Infinity, n = 0;
        for (let i = 0; i < 26; i++) {
          await new Promise((r) => setTimeout(r, 50));
          lo = Math.min(lo, wet); hi = Math.max(hi, wet); n++;
        }
        G.driftWet = { lo, hi, n, span: hi - lo, moves: drift.moves };
        G.driftLanded = patch !== wasPatch;
        G.driftSliders = ['rate', 'size', 'spray', 'scan']
          .filter((k) => Math.abs(P[k] - before[k]) > Math.abs(before[k]) * 1e-6).length;

        /**
         * 🔴 AND THE ENGINE IS HOLDING A VALUE BETWEEN THE TWO SOUNDS, ASKED OF
         * THE ENGINE. Everything above is this page's own idea of what it sent.
         * A morph that computed beautifully and wrote nothing would pass all of
         * it, which is the failure `/s_get` exists to close: a value strictly
         * between two patches' numbers, on the far side of the wire, is the one
         * reading a stepped patch change cannot produce.
         *
         * ⚠️ THE DESTINATION IS CHOSEN RATHER THAN TYPED. It has to be a control
         * the modulator is NOT walking (the tour does not write those, by
         * design) whose two ends are far enough apart that halfway is not
         * halfway to the same place. A hard-coded `msize` was exactly the trap
         * the follower check next door fell into when the opening sound changed.
         */
        // ⚠️ FROZEN WHILE IT IS READ. `/s_get` is a round trip and the tour is
        // still travelling during it, so an unfrozen read grades whatever the
        // morph reached by the time the answer came back rather than the value
        // that was asked about. Holding the tick leaves the engine on the last
        // value it was written, which is the one quantity in question.
        atK(0.5);
        await new Promise((r) => setTimeout(r, 200));
        drift.held = true;
        const A = PATCHES[wasPatch], B = PATCHES[(wasPatch + 1) % PATCHES.length];
        const pick = ['size', 'rate', 'spray'].find((k) => !routedNow.has(k)
          && Math.min(A[k], B[k]) > 0
          && Math.max(A[k], B[k]) / Math.min(A[k], B[k]) >= 1.3);
        G.driftMid = pick
          ? { name: pick, got: await ask1(`m${pick}`), a: A[pick], b: B[pick] }
          : null;
        drift.held = false;

        // 🔴 AND NOW THE HAND. A synthetic `pointerdown` on the sound picker's
        // `›`, which is a control the tour moves and whose own handler is an
        // `onclick`, so this exercises the hand-back and cannot press the
        // button as a side effect.
        // ⚠️ NOT ON A SLIDER LANE. `slider.mjs` reads `clientX` in its own
        // `pointerdown` and calls `setPointerCapture`, so a synthetic event with
        // no real pointer behind it would either write NaN into the engine or
        // throw inside a listener, which lands in the console check two asserts
        // along as a failure with nothing to do with this one.
        const reach = patchPick?.buttons?.[1];
        G.driftYieldFrom = drift.on;
        reach?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        G.driftYielded = !drift.on;
        G.driftYields = drift.yields;
        G.driftSaid = (d.api?.logs || []).slice(-3)
          .some((l) => /yours now/.test(l.msg));

        // 🔴 AND THE BUTTON STOPS IT TOO, WHICH THE HAND-BACK CANNOT SHOW. A
        // toggle whose second press is never driven is half a control, and this
        // is the half a visitor reaches for when they want the movement to end
        // without taking the instrument over. Two synchronous presses: no tick
        // can fire between them, so nothing moves and the face is the only
        // thing being read.
        btn?.click();
        const onAgain = drift.on && driftBtn()?.getAttribute('aria-pressed') === 'true';
        btn?.click();
        const offAgain = !drift.on && driftBtn()?.getAttribute('aria-pressed') === 'false';
        G.driftToggle = { onAgain, offAgain };

        // 🔴 AND THE PAGE IS PUT BACK WHERE THE VISITOR LEFT IT. Same rule as
        // the station A/B and the patch A/B: the sound it opened on, the fader
        // at 0, the button unpressed, nothing playing itself.
        driftStop('the check is finished');
        applyPatch(wasPatch, { silent: true });
        muted = false; setWet(0);
        faderSld?.set(0, { quiet: true });
        // ⚠️ AND HELD AGAIN. `verify.mjs` presses every control once and the
        // press is not synchronised with anything this page does, so a press
        // that lands AFTER this block would start a tour over the loop check
        // below. The page has had its turn.
        drift.held = true;
      }

// ── and the three asserts it answered for ────────────────────────────────

      /**
       * 🔴 THE TOUR MOVES REAL THINGS, AND THE PROOF IS ON THE FAR SIDE OF THE
       * WIRE. Three quantities in one assert because each of them alone is
       * passable by a page that is doing something else: a blend that breathes
       * with nothing behind it, a sound that steps without sliding, and a set
       * of numbers this page computed and never sent. The middle one is the
       * strong claim: `m<name>` read back with `/s_get`, strictly between two
       * patches' own values, which is the reading a stepped change cannot give.
       */
      const mid = G.driftMid;
      const midOk = !!mid && Number.isFinite(mid.got)
        && mid.got > Math.min(mid.a, mid.b) * 1.02
        && mid.got < Math.max(mid.a, mid.b) * 0.98;
      d.assert('it plays itself: the blend breathes, the sound slides, and the engine takes it',
        G.driftOn && G.driftFace === 'true'
          && (G.driftWet?.span ?? 0) > 0.02 && (G.driftWet?.moves ?? 0) > 10
          && G.driftLanded && G.driftSliders >= 2 && midOk,
        !G.driftOn ? `pressing the button left it ${G.driftFace}`
          : `the blend spanned ${(G.driftWet?.span ?? 0).toFixed(3)} over `
            + `${G.driftWet?.n ?? 0} reads and ${G.driftWet?.moves ?? 0} writes · `
            + `${G.driftSliders} of 4 settings moved · `
            + `it ${G.driftLanded ? 'stepped to the next sound' : 'NEVER STEPPED'} · `
            + (mid ? `${mid.name} read back ${Number(mid.got).toFixed(4)} between `
                     + `${mid.a} and ${mid.b}`
                   : 'no two sounds here differ enough to grade the halfway'));
      /**
       * 🔴 AND A HAND TAKES IT BACK, WHICH IS THE HALF THAT MATTERS ON THIS
       * PAGE. This repo has twice shipped a page that worked a control in front
       * of the person holding it, and both times the report was about the
       * instrument being taken away rather than about the feature. So the
       * yield is graded the same way the feature is: a real `pointerdown` on a
       * control the tour moves, the tour off on the next line, and the LOG
       * carrying the sentence that says so. A page that stops silently and a
       * page that has crashed look identical from a chair.
       *
       * ⚠️ IT ASSERTS THE BEFORE AS WELL AS THE AFTER. `driftYielded` alone is
       * satisfied by a tour that was never running, which is the vacuous pass
       * this check exists to be worth more than.
       */
      d.assert('a hand on the sound row takes the instrument straight back, and it says so',
        G.driftYieldFrom && G.driftYielded && G.driftYields === 1 && G.driftSaid,
        !G.driftYieldFrom ? 'it was not playing itself when the hand arrived'
          : `${G.driftYields} hand-back(s), it is ${G.driftYielded ? 'stopped' : 'STILL MOVING'}, `
            + `and the log ${G.driftSaid ? 'said so' : 'SAID NOTHING'}`);
      // ⚠️ AND THE OTHER WAY OUT, which is the one a visitor uses when they want
      // the movement to stop without taking the instrument over. The face is
      // read off the button both times: `aria-pressed` is the only thing on
      // screen that says which state this control is in, so a toggle that works
      // and does not repaint is a control nobody can read.
      d.assert('the same button stops it again, and the face follows both ways',
        !!G.driftToggle?.onAgain && !!G.driftToggle?.offAgain,
        G.driftToggle
          ? `pressed on: ${G.driftToggle.onAgain ? 'running and lit' : 'NOT BOTH'} · `
            + `pressed off: ${G.driftToggle.offAgain ? 'stopped and dark' : 'NOT BOTH'}`
          : 'never driven');
    }

// archive/videoradio-xr/xr-half.js — the headset half of /videoradio/,
// lifted out of demo/videoradio/index.html on 2026-09-16. See README.md.
//
// 🔴 THIS IS NOT A MODULE AND MUST NOT BE IMPORTED. It is the removed code,
// kept verbatim and in the order it appeared, so that somebody re-reading the
// attempt reads what actually ran rather than a description of it. Half of it
// closes over names that only exist inside that page (`tick`, `SEA`, `start`,
// `speakers`, `stream`, `lastBytes`, `at`, `d`).


// ── the import — at the top of the file, never dynamic, because a dynamic
import inside the press would spend the transient user activation
`requestSession` needs 

  import { createXRPanels, beacon } from '/shell/xr-panel.mjs';

// ── the control, in mount()'s `controls` array ──────────────────────────

      // 🔴 THE SAME PICTURE, ON THE GROUND, AT ARM'S LENGTH IN EVERY DIRECTION.
      // Asked 2026-09-16: *"can we iplenent videoradio on vr? just on the
      // floor? as 'i am on a sea' fading out on all dirs?"*. A WORD rather than
      // a glyph because there is no glyph for it and every other headset page
      // here says `Run in VR` in words; `caps.mjs` un-links it where the
      // browser has no `immersive-vr`, with the reason said out loud.
      { id: 'vr', label: 'Run in VR', aria: 'run in VR', word: true },

// ── the row it was moved into, under the page's own sentence ────────────

  /**
   * 🔴 RUN IN VR IS NOT A PICTURE CONTROL, SO IT DOES NOT LIVE OVER THE
   * PICTURE. Asked 2026-09-16: *"move 'run in vr' below desc"*.
   *
   * The row above was moved into the pane and AUTO-HIDES after three seconds of
   * no pointer, which is right for play and full screen: those act on the thing
   * you are looking at, and they should get out of its way. Entering a headset
   * is not that. It is a way of opening the page, it is pressed once, and a
   * control that fades out over a picture is the worst place to put something
   * somebody has to find. Under the sentence that says what the page is, which
   * is where every other headset page on this site keeps it.
   *
   * ⚠️ MOVED, NOT REBUILT, for the same reason the row below was: `mount()`
   * made this button, `d.button('vr')` finds it, and `.pos-controls button` is
   * what the harness presses. A second copy is a second thing to keep in step.
   */
  {
    const b = d.button('vr');
    if (b) {
      const row = el('div', 'pos-controls vr-enter');
      row.append(b);
      d.el.prepend(row);
    }
  }

// ── the session's own sea, the preview, the session options and the press 

  /** The headset's. `createXRPanels` attaches it to the session's context. */
  const theSea = makeSea();

// ── the preview, which is how the XR half was graded with no headset ────

  /**
   * Build the session's context in the window and draw both eyes into it.
   *
   * ⚠️ IT MAKES `xr` IF THERE IS NONE, because the checks run whether or not
   * anybody pressed Run in VR, and the point of this preview is that it needs
   * no headset and no press. It uses the same options the button does, so what
   * is graded is what a wearer would get rather than a second arrangement built
   * for the check.
   */
  async function xrPreview() {
    try {
      if (!xr) xr = makeXR();
      // Enough frames that the chain has stepped, the plane has been drawn, and
      // the readback is of a presented frame rather than a cleared one.
      return await xr.preview({ frames: 6, width: 512, height: 320 });
    } catch (e) {
      return { ok: false, why: e.message };
    }
  }

  /**
   * Is the floor a RAMP or a PLATE? Read off `preview`'s own profile: the
   * middle of the eye against its edge, with the ground colour for scale.
   *
   * ⚠️ THE MIDDLE IS AVERAGED OVER A FEW SAMPLES, NOT TAKEN AT ONE POINT. The
   * picture on the floor is a landscape with gaps in it, so a single sample can
   * land between two lines and read as dark on a picture that is fine. That is
   * `mirror`'s four-point mistake, which this repo has already paid for twice.
   */
  function fadeRamp(pv) {
    const p = pv && pv.profile;
    if (!p || p.length < 8) return null;
    const n = p.length;
    const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const mid = avg(p.slice(Math.round(n * 0.40), Math.round(n * 0.60)));
    const rim = avg(p.slice(0, Math.max(2, Math.round(n * 0.10))));
    return { mid, rim, bg: pv.ground ?? 0 };
  }

// ── the session, and the press that enters it ───────────────────────────

  /**
   * 🔴 THE WAY IN, AND EVERY RULE THIS REPO HAS ALREADY PAID FOR IS IN
   * `xr-panel.mjs` RATHER THAN HERE. That module owns the session, both eyes,
   * the clears, the controllers and the two ways out; this page owns a floor.
   * A page that writes its own `requestSession` inherits none of the fixes.
   *
   * ⚠️ THE ROOM STAYS, WITH NOTHING IN IT. `room: null` reads like the right
   * answer for a page that wants no furniture and is not: the tablet, the hands
   * and therefore the quit badge's grips are built only when there is a room,
   * so a page with none has no visible way out. `sky: false, things: false`
   * leaves the dotted grid, which is the ground the sea sits on.
   */
  const makeXR = () => createXRPanels({
    panels: [],
    surface: theSea,
    // ⚠️ THE ROOM STAYS AND ITS DOTS DO NOT. `room: null` would take the tablet,
    // the hands and the quit badge's grips with it, which is a session with no
    // visible way out; `grid: false` takes only the floor this page is already
    // drawing its own version of. Reported as two floors: *"hide floor dots"*.
    // ⚠️ THE ROOM STAYS AND EVERYTHING IT DRAWS GOES. `room: null` would take
    // the tablet, the ray and the quit badge's grips with it, which is a
    // session with no visible way out; these three switches take only the
    // things this page draws its own version of, or has no use for. Reported as
    // *"hide floor dots"* and *"rm dotted floor and controlers"*.
    room: { seed: 424242, sky: false, things: false, grid: false, hands: false,
            tablet: false, bg: SEA.bg },
    clear: [...SEA.bg, 1],
    // The chain steps once per headset frame, not once per eye: it is one
    // picture and both eyes look at the same one.
    /**
     * 🔴 THE PAGE'S OWN FRAME, DRIVEN BY THE HEADSET'S CLOCK. See `tick`: the
     * window's `requestAnimationFrame` does not fire in here, so without this
     * line the data the sea stands on is frozen at the instant the session
     * started and the sea is a still photograph of one moment.
     * ⚠️ IT ALSO KEEPS THE WINDOW'S PICTURE ALIVE for the moment the headset
     * comes off. `pic.step` draws into the PAGE's context, which is a different
     * context entirely, so it cannot touch anything the session has bound.
     */
    onFrame: () => { tick(performance.now()); theSea.step(); },
    onEnd: () => d.log('back out of the headset'),
    log: (m, k) => d.log(m, k),
  });

  d.on('vr', () => {
    if (!xr) xr = makeXR();
    // 🔴 NOT ONE `await` BEFORE `enter()`, AND THAT IS WHY THE IMPORT IS AT THE
    // TOP OF THIS FILE RATHER THAN HERE. `requestSession` needs a TRANSIENT
    // USER ACTIVATION, and an activation is spent by the first await in the
    // handler: a dynamic import of the module would be exactly that, so the
    // press would be consumed loading the thing it was meant to start.
    // `xr-panel.mjs` carries the same rule about its own support answer, which
    // is why `supported()` reads a value taken at load and is not a promise.
    if (xr.supported() === false) {
      d.log('no headset here, so there is nothing to enter', 'warn');
      return null;
    }
    /**
     * 🔴 THE SOUND STARTS WITH THE SESSION, BECAUSE IN A HEADSET THERE IS NO
     * PLAY BUTTON TO PRESS. Asked 2026-09-16: *"add audio to vr videoradio"*.
     *
     * The page opens silent on purpose and the picture is honest about it: with
     * no audio graph there are no grains and what draws is the standby field.
     * Enter a session in that state and you are standing on a sea made of
     * nothing, with the one control that would fix it on a screen you can no
     * longer see. This press IS the gesture, so it is the right and only moment
     * to spend it.
     *
     * ⚠️ NOT AWAITED, AND THE ORDER MATTERS. `requestSession` needs a TRANSIENT
     * USER ACTIVATION and the first await in a handler spends it, so `start()`
     * is FIRED and `enter()` is called synchronously after it in the same task.
     * `start()` is itself careful never to await `ctx.resume()`, for the reason
     * written on it: neither that nor `play()` rejects when the gesture is
     * missing, so awaiting one is a hang rather than an error.
     *
     * ⚠️ AND THE PLAY BUTTON IS PUT IN STEP, or somebody who takes the headset
     * off finds a page that is plainly making a noise over a button offering to
     * start it. That is the same defect as a control describing a loop that is
     * not running, and this page has already paid for it once.
     */
    /**
     * 🔴 WHATEVER STATE THE SOUND IS IN, ENTERING TURNS IT ON. Reported twice,
     * the second time as *"when music is paused and i enter turn music on"*.
     * It handled "never started" and "stopped" as two branches and a page can
     * be silent for a third reason: the context suspended itself while the tab
     * was in the background, which is exactly what a headset does to the window
     * it came from. So all three are handled unconditionally rather than
     * branched on, because the intent of the press is not ambiguous: somebody
     * putting a headset on wants the sound.
     *
     * ⚠️ NOT ONE `await`, AND `start()` IS FIRED RATHER THAN AWAITED.
     * `requestSession` needs a TRANSIENT USER ACTIVATION and the first await in
     * a handler spends it. `ctx.resume()` and `play()` never REJECT when the
     * gesture is missing either, so awaiting one is a hang rather than an error.
     */
    const was = { started, quiet, ctx: ctx ? ctx.state : 'none',
                  speakers: !!speakers, stream: !!stream };
    if (!started) {
      start().catch((e) => {
        d.log(`the sound did not start: ${e.message}`, 'bad');
        beacon(`FAIL sound on entry · ${e.message}`);
      });
      d.log('the station is starting, and it plays into the headset');
    }
    ctx?.resume?.();
    quiet = false;
    if (speakers && ctx) speakers.gain.setTargetAtTime(1, ctx.currentTime, 0.012);
    const pb = d.button('play');
    if (pb) { pb.textContent = '❚❚'; pb.setAttribute('aria-label', 'stop'); }
    beacon(`entering · was ${JSON.stringify(was)}`);
    /**
     * 🔴 AND AGAIN ONCE THE SESSION IS ACTUALLY LIVE, WITH THE ANSWER POSTED.
     * Reported three times: *"sound does not start on entering vr"*. Every
     * repair so far was made by reasoning about which branch should run, which
     * is the thing CLAUDE.md says costs the most time here, and a headset is
     * the one place a `console.log` cannot be read.
     *
     * Two things happen after `enter()` resolves and neither can be done
     * before it. The page goes HIDDEN the moment the session presents, and a
     * hidden page's `AudioContext` can be suspended by the browser — the
     * context that `/earshot/` measured surviving was already running long
     * before it entered, which is a different case from one created BY the
     * press. So it is resumed again on the far side. And whatever the state
     * turns out to be, it is beaconed: `state`, the fader, whether a stream
     * exists and what the meter reads, once a second for five seconds. The next
     * run says what happened rather than leaving it to be guessed at again.
     */
    return xr.enter().then((ok) => {
      if (!ok) return ok;
      ctx?.resume?.();
      let n = 0;
      const say = () => {
        if (++n > 5) return;
        beacon(`sound in session · ctx ${ctx ? ctx.state : 'none'}`
          + ` · quiet ${quiet} · stream ${stream ? 'open' : 'none'}`
          + ` · out ${speakers ? speakers.gain.value.toFixed(3) : 'no node'}`
          // ⚠️ THE LEVEL THE PAGE ALREADY MEASURES, off the analyser the picture
          // is drawn from. Zero here with a stream open and the fader up is a
          // graph that is connected and silent, which is a different fault from
          // a stream that never opened, and the two are what this is for.
          // ⚠️ THE LOUDNESS BYTE THE PICTURE IS ALREADY DRAWN FROM, read out of
          // the same array rather than measured a second way. Zero here with a
          // stream open and the fader up is a graph that is connected and
          // silent, which is a different fault from a stream that never opened,
          // and telling those two apart is what this line is for.
          + ` · loud ${lastBytes ? lastBytes[at(0, 3)] : 'no data'} of 255`);
        setTimeout(say, 1000);
      };
      setTimeout(say, 1000);
      return ok;
    });
  });

// ── the two asserts ─────────────────────────────────────────────────────

      // ⚠️ THE CHAIN NEEDS ONE STEP BEFORE THERE IS A TEXTURE TO DRAW WITH, and
      // `preview` calls `onFrame` itself every frame, which is what does it. So
      // this asks for enough frames to have stepped, drawn and settled.
      const pv = await xrPreview();
      const cover = pv && pv.surface;
      d.assert('the sea builds in the headset’s own context and is reached every frame',
        !!pv?.ok && !!cover?.attached && cover.draws >= 2 && pv.glError === 0,
        !pv?.ok ? `no preview: ${pv?.why || 'unknown'}`
          : `${cover?.attached ? 'attached' : `refused: ${cover?.why}`}`
            + ` · drawn ${cover?.draws ?? 0} times · ${pv.glWhere}`
            + ` · the chain stepped ${theSea.frames()} frames`);
      /**
       * 🔴 A RAMP, NOT A DISC, AND THE DIFFERENCE IS THE WHOLE FEATURE.
       * Read along the middle row of one eye: the fade is measured from the
       * VIEWER, so ink near the centre of the eye must be brighter than ink at
       * its edge. A plane drawn at one flat alpha passes every other check on
       * this page and fails only this one.
       */
      const ramp = pv?.ok ? fadeRamp(pv) : null;
      d.assert('the sea fades out in every direction rather than ending at an edge',
        !!ramp && ramp.mid > ramp.rim * 1.35 && ramp.rim < 40,
        ramp ? `the middle of the view reads ${ramp.mid.toFixed(1)} and its edge `
          + `${ramp.rim.toFixed(1)} of 255, against a ground of ${ramp.bg.toFixed(1)}`
          : 'the preview gave no pixels to read');

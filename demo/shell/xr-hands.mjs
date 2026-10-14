// demo/shell/xr-hands.mjs: what is in your hands, and the one place that decides what each hand does.
// No session mode anywhere in here, so VR and AR share one input path. Hands are assigned by
// handedness, never slot index; trackedSources is a Meta-only attribute and is read guarded.
// why: lessons/kit-xr-hands.md#header

import { pickQuad } from './xr-pick.mjs';
import { holdM, GRIP_PARTS } from './xr-room.mjs';
import { TABLET } from './xr-tablet.mjs';

/**
 * Indices from @webxr-input-profiles/assets 1.0.20 meta-quest-touch-plus profile.json: trigger 0,
 * squeeze 1, thumbstick 3 (axes 2, 3), A/X 4, B/Y 5, thumbrest 6, menu 7 (left only).
 * why: lessons/kit-xr-hands.md#button
 */
export const BUTTON = { trigger: 0, squeeze: 1, thumbstick: 3, primary: 4, secondary: 5 };
export const AXIS = { stickX: 2, stickY: 3 };

/**
 * Metres within which two grip poses are one physical thing (one controller reported twice is 0 cm).
 * why: lessons/kit-xr-hands.md#same-thing-m
 */
export const SAME_THING_M = 0.06;

/**
 * One physical thing, one shape: the same hand can arrive in both arrays. A controller beats a hand,
 * inputSources beats trackedSources, then drop same handedness or a grip within SAME_THING_M.
 * Returns kept and dropped, so the log can tell two controllers from one reported twice.
 * why: lessons/kit-xr-hands.md#dedupe
 */
export function dedupe(list) {
  const rank = (h) => (h.hasHand ? 2 : 0) + (h.where[0] === 'T' ? 1 : 0);
  const sorted = [...list].sort((a, b) => rank(a) - rank(b));
  const kept = [], dropped = [];
  for (const h of sorted) {
    const same = kept.find((k) => (
      (k.handedness !== 'none' && k.handedness === h.handedness)
      || (k.m && h.m
        && Math.hypot(k.m[12] - h.m[12], k.m[13] - h.m[13], k.m[14] - h.m[14]) < SAME_THING_M)));
    if (same) {
      dropped.push(`${h.where}:${h.handedness}:${h.profile} is the same thing as ${same.where}:${same.handedness}:${same.profile}`);
      continue;
    }
    kept.push(h);
  }
  return { kept, dropped };
}

/** Which hand does what. Declared once, printed in the fingerprint. */
export const TABLET_HAND = 'left';
export const POINTER_HAND = 'right';

const DEG = 180 / Math.PI;

/**
 * @param {object} [o]
 * @param {object|null} [o.tablet]   the tablet component, or null for none.
 * @param {() => boolean} [o.tabletShown]  is the tablet in the scene this frame; a predicate because
 *   passthrough can refuse it. Without it the ray hit-tests an invisible slab and eats presses.
 * @param {(msg:string, kind?:string) => void} [o.log]
 * @param {(line:string) => void} [o.say]  the beacon, never a batched shipper (it holds for 2 s).
 * why: lessons/kit-xr-hands.md#create-xr-hands
 */
export function createXRHands({ tablet = null, tabletShown = () => true,
  log = () => {}, say = () => {} } = {}) {
  const state = {
    sources: 0,            // how many were in inputSources
    tracked: 0,            // how many were in trackedSources
    trackedSays: 'not looked yet',
    hands: [],             // [{ m, handedness, profile, where, hasHand }] — DEDUPED
    raw: [],               // every source, before dedupe — the debugging instrument
    dropped: [],           // what dedupe removed, in words
    pointer: null,         // { m, o, dir, handedness } — the ray that is drawn
    // The pointer's own source, so buttons are read off the hand that is pointing.
    // why: lessons/kit-xr-hands.md#pointer-src
    pointerSrc: null,
    tabletM: null,         // where the tablet is hanging, or null
    hit: null,             // { t, u, v } where the ray meets the tablet
    over: false,           // is the ray on the tablet right now
    trigger: false,
    gripRayM: null,        // metres between grip and target ray, for the report
    gripRayDeg: null,
    lost: 0,               // frames with a source but no resolvable grip
    frames: 0,
    // The label of the control that ended the session, or null, so a page can say why it ended.
    // why: lessons/kit-xr-hands.md#state-left
    left: null,
  };

  // A tablet without fired() or notes() is reported once out loud, rather than optional-chained past
  // silently every frame.
  // why: lessons/kit-xr-hands.md#tablet-drains
  if (tablet && (typeof tablet.fired !== 'function' || typeof tablet.notes !== 'function')) {
    say('FAIL hands · this tablet cannot report its own presses (no fired/notes)'
      + ' · anything drawn on it as a way out would be a picture of a button');
    log('the screen on your hand cannot report what you press on it', 'bad');
  }

  // A named stage for every step with a deadline, so a stage that never arrives is named in words.
  // why: lessons/kit-xr-hands.md#stages
  const stages = new Map();
  const at = (name, line) => {
    if (stages.has(name)) return false;
    stages.set(name, performance.now());
    say(`hands · ${name}${line ? ' · ' + line : ''}`);
    return true;
  };
  const reached = (name) => stages.has(name);
  // Each entry: [stage, ms after the first frame, what its absence means].
  const DUE = [
    ['a source with a grip pose', 5000,
     'no controller reported a grip pose. There is nothing to hang the tablet on, and the stand-ins will be missing too'],
    ['the tablet placed', 5000,
     'a grip resolved but the tablet was never placed · holdM or the tablet module'],
    // Not a diagnosis: nobody has to point at the tablet, so the line names both readings.
    // why: lessons/kit-xr-hands.md#stage-ray-on-tablet
    ['the ray on the tablet', 25000,
     'either nobody pointed at it, or the pose and the hit test disagree. Look at the line above: if the tablet was PLACED and the stand-ins are visible where your hands are, it is the first; if the tablet is not where your hand is, it is the second, and that defect is pure arithmetic that node demo/shell/xr-pick-test.mjs grades on a laptop'],
  ];
  let firstFrameAt = 0, overdueSaid = false;
  // Counted on the far side: a `getPose` that RETURNED something, never a call
  // that was made. A counter incremented at the call site reads identically
  // whether the runtime answered or not.
  const count = { frames: 0, grip: 0, ray: 0, onTablet: 0, emulated: 0 };
  let rateSaid = 0;

  function checkOverdue() {
    if (overdueSaid || !firstFrameAt) return;
    const dt = performance.now() - firstFrameAt;
    for (const [name, ms, why] of DUE) {
      if (dt > ms && !reached(name)) {
        overdueSaid = true;
        say(`FAIL hands · "${name}" has not happened ${(dt / 1000).toFixed(1)} s in: ${why}`);
        log(`the controller interface stalled at: ${name} · ${why}`, 'bad');
        return;
      }
    }
  }

  /** One line that two runs in two modes are compared on, and it has no mode in it. */
  const fingerprint = () =>
    `${TABLET.fingerprint} · trigger=button ${BUTTON.trigger}, stick=axes ${AXIS.stickX}/${AXIS.stickY}`
    + ` · one stand-in per thing within ${SAME_THING_M} m, a controller beating a hand`;

  let announced = false, sig = '', failSaid = false;

  /**
   * Once per frame, never per eye, and it cannot throw.
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} space  `local-floor`
   * @param {XRSession} session
   * why: lessons/kit-xr-hands.md#observe
   */
  function observe(frame, space, session) {
    if (!frame || !session) return state;
    try {
      state.frames++;
      if (!firstFrameAt) {
        firstFrameAt = performance.now();
        at('built', fingerprint());
      }

      // Both arrays, and say which. See the header.
      // why: lessons/kit-xr-hands.md#both-arrays
      let tracked = [];
      let trackedSays = 'attribute ABSENT (this browser has no trackedSources)';
      try {
        if (session.trackedSources) {
          tracked = [...session.trackedSources];
          trackedSays = `attribute present, ${tracked.length} in it`;
        }
      } catch (e) { trackedSays = `attribute threw: ${e.name}`; }
      const inputs = [...(session.inputSources || [])];
      state.sources = inputs.length;
      state.tracked = tracked.length;
      state.trackedSays = trackedSays;

      const all = [
        ...inputs.map((s, i) => ({ src: s, where: `I${i}` })),
        ...tracked.map((s, i) => ({ src: s, where: `T${i}` })),
      ];

      const seen = [];
      for (const { src, where } of all) {
        const rec = {
          src, where,
          handedness: src.handedness || 'none',
          profile: src.profiles?.length ? src.profiles[0] : 'no profile',
          hasHand: !!src.hand,
          m: null, ray: null, emulated: false,
        };
        // gripSpace is null for anything not trackable; an unresolved pose (this frame) differs from
        // a missing space (this controller).
        // why: lessons/kit-xr-hands.md#grip-space
        if (src.gripSpace) {
          const gp = frame.getPose(src.gripSpace, space);
          if (gp) { rec.m = gp.transform.matrix; rec.emulated = !!gp.emulatedPosition; }
        }
        if (src.targetRaySpace) {
          const rp = frame.getPose(src.targetRaySpace, space);
          if (rp) {
            const m = rp.transform.matrix;
            rec.ray = { m, o: [m[12], m[13], m[14]], dir: [-m[8], -m[9], -m[10]] };
          }
        }
        seen.push(rec);
      }
      // One physical thing, one stand-in. See dedupe.
      // why: lessons/kit-xr-hands.md#observe-dedupe
      const { kept, dropped } = dedupe(seen);
      state.hands = kept;
      state.raw = seen;
      state.dropped = dropped;

      // By handedness: right has the ray, left the tablet. With one source it carries both, and says so.
      // why: lessons/kit-xr-hands.md#who-gets-what
      const withGrip = kept.filter((h) => h.m);
      const withRay = kept.filter((h) => h.ray);
      const tabletSrc = withGrip.find((h) => h.handedness === TABLET_HAND)
        || (withGrip.length === 1 ? withGrip[0] : null);
      // Prefer a pointer source with buttons: a tracked controller or a hand can have an empty gamepad.
      // why: lessons/kit-xr-hands.md#armed
      const armed = (h) => !!h.src.gamepad?.buttons?.length;
      const pointSrc = withRay.find((h) => h.handedness === POINTER_HAND && armed(h))
        || withRay.find((h) => h.handedness === POINTER_HAND)
        || withRay.find((h) => h !== tabletSrc && armed(h))
        || withRay.find((h) => h !== tabletSrc)
        || withRay[0] || null;
      state.pointer = pointSrc
        ? { ...pointSrc.ray, handedness: pointSrc.handedness } : null;
      state.pointerSrc = pointSrc?.src || null;

      if (withGrip.length) at('a source with a grip pose',
        withGrip.map((h) => `${h.where}:${h.handedness} ${h.profile}`).join(' | '));
      else if (seen.length) state.lost++;

      // How far apart grip and target ray are on this runtime, measured once on the pointer.
      // why: lessons/kit-xr-hands.md#grip-ray
      if (pointSrc?.m && pointSrc.ray && state.gripRayM === null) {
        const g = pointSrc.m, r = pointSrc.ray.m;
        state.gripRayM = Math.hypot(r[12] - g[12], r[13] - g[13], r[14] - g[14]);
        const dot = (-g[8]) * (-r[8]) + (-g[9]) * (-r[9]) + (-g[10]) * (-r[10]);
        state.gripRayDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * DEG;
      }

      // Nothing is hit-tested against a slab that is not drawn. See tabletShown.
      // why: lessons/kit-xr-hands.md#tablet-shown
      const shown = !!tablet && tabletShown() !== false;
      state.tabletM = (shown && tabletSrc) ? holdM(tabletSrc.m) : null;
      if (state.tabletM) {
        at('the tablet placed',
          `on ${tabletSrc.where}:${tabletSrc.handedness}`
          + (tabletSrc.handedness === TABLET_HAND ? '' : ` (no ${TABLET_HAND} hand here, so it is on the only source there is)`));
      }
      state.hit = (state.tabletM && state.pointer)
        ? pickQuad(state.tabletM, state.pointer.o, state.pointer.dir) : null;
      state.over = !!state.hit;
      if (state.hit) at('the ray on the tablet',
        `u ${state.hit.u.toFixed(3)} v ${state.hit.v.toFixed(3)} at ${state.hit.t.toFixed(3)} m`);

      // Read off the pointer's gamepad (button 0), not selectstart, which fires for any source.
      // Edge-detected so a held trigger is a drag.
      // why: lessons/kit-xr-hands.md#trigger
      const down = !!pointSrc?.src.gamepad?.buttons?.[BUTTON.trigger]?.pressed;
      if (tablet && shown) {
        tablet.aim(state.hit);
        if (down && !state.trigger) tablet.press(state.hit);
        else if (down) tablet.drag(state.hit);
        else if (state.trigger && tablet.holding()) tablet.release();
        // The words are the tablet's: it knows which control changed and how. This file carries them to the beacon.
        // why: lessons/kit-xr-hands.md#tablet-notes
        for (const line of tablet.notes?.() || []) say(`hands · ${line}`);
        // A control that raises `leaves` ends the session here, the only place holding the session for both pages.
        // It is a third way out and replaces neither of the page's own.
        // why: lessons/kit-xr-hands.md#way-out
        for (const c of tablet.fired?.() || []) {
          if (!c.leaves) continue;
          state.left = c.label;
          say(`hands · leaving · the tablet's "${c.label}", held the whole ${c.hold} ms`);
          log(`leaving · you held "${c.label}" on the tablet`, 'ok');
          try { session.end()?.catch?.(() => {}); } catch { /* it may already be going */ }
        }
      }
      state.trigger = down;

      // ── one line whenever what is in your hands changes ──────────────────
      const now = seen.map((h) => `${h.where}:${h.handedness}:${h.profile}:${h.m ? 'grip' : 'NOgrip'}:${h.ray ? 'ray' : 'NOray'}:${h.hasHand ? 'hand' : 'nohand'}`).join(' || ');
      if (now !== sig) {
        sig = now;
        say(`hands · ${state.sources} input + ${state.tracked} tracked · trackedSources ${trackedSays}`
          // Says how many shapes are drawn and what was dropped as a duplicate.
          // why: lessons/kit-xr-hands.md#drawn-count
          + ` · drawing ${kept.length} stand-in(s)`
          + (dropped.length ? ` · dropped ${dropped.length}: ${dropped.join(' ; ')}` : ' · nothing was a duplicate')
          + ` · tablet on ${tabletSrc ? `${tabletSrc.where}:${tabletSrc.handedness}` : 'NOTHING'}`
          + ` · pointer on ${pointSrc ? `${pointSrc.where}:${pointSrc.handedness}` : 'NOTHING'}`
          + (pointSrc && !armed(pointSrc) ? ' (it has NO buttons, so the trigger cannot reach the tablet)' : '')
          + (state.gripRayM !== null
            ? ` · grip-ray offset ${state.gripRayM.toFixed(3)} m, ${state.gripRayDeg.toFixed(1)}°` : '')
          + ` · ${now || '(no sources)'}`);
      }
      if (!announced && seen.length) {
        announced = true;
        log(`${state.sources} controller(s) · the tablet is on your ${TABLET_HAND} hand, the pointer on your ${POINTER_HAND}`, 'ok');
      }

      // Pose resolutions counted against frames, not Hz: separates a slow runtime from dropouts with no clock.
      // Logged twice, for starting up and for running.
      // why: lessons/kit-xr-hands.md#rate-line
      count.frames++;
      if (withGrip.length) count.grip++;
      if (state.pointer) count.ray++;
      if (state.hit) count.onTablet++;
      if (seen.some((h) => h.emulated)) count.emulated++;
      const since = performance.now() - firstFrameAt;
      if ((rateSaid === 0 && since > 3000) || (rateSaid === 1 && since > 10000)) {
        rateSaid++;
        say(`hands rate · ${count.frames} frames · grip ${count.grip}/${count.frames}`
          + ` · ray ${count.ray}/${count.frames} · on the tablet ${count.onTablet}/${count.frames}`
          + ` · position only guessed at on ${count.emulated}`
          + (tablet ? ` · ${JSON.stringify(tablet.values())}` : ''));
      }
      checkOverdue();
    } catch (e) {
      // A frame callback that throws does not stop the loop, it silently
      // removes everything below it. Said once, then swallowed for good.
      if (!failSaid) {
        failSaid = true;
        say(`FAIL hands · could not be read · ${e.name}: ${e.message}`);
        log(`could not read what is in your hands: ${e.message}`, 'bad');
      }
    }
    return state;
  }

  return {
    observe, state, fingerprint,
    standInParts: GRIP_PARTS.length,
    /** `true` while the pointer is on the tablet — a page must not grab through it. */
    get over() { return state.over; },
    get hands() { return state.hands; },
    get pointer() { return state.pointer; },
    get tabletM() { return state.tabletM; },
    get hit() { return state.hit; },
    /** The tablet control that ended the session, or null. */
    get left() { return state.left; },
  };
}

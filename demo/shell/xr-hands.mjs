// demo/shell/xr-hands.mjs — what is in your hands, and the one place that
// decides what each hand does.
//
// 🔴 ONE INPUT PATH, AND IT CANNOT TELL VR FROM AR. That is the requirement
// stated as a property of the code rather than as a promise in prose: there is
// no `immersive-vr`, no `immersive-ar`, no `environmentBlendMode` and no
// `session.mode` anywhere in this file, so the controllers, the pointer, the
// tablet and its slider are necessarily identical in both modes. Two code paths
// that are MEANT to be the same will drift, and the drift gets found in a
// headset, which is the most expensive place in this project to find anything.
//
// The only thing that legitimately differs between the two modes is the ROOM —
// passthrough draws the surfaces the headset MEASURED, an opaque session draws
// the one surface `local-floor` guarantees. That lives in `xr-room.mjs`'s
// `buildOwnRoom`/plane adoption and nowhere else. If you find yourself reaching
// for the session mode out here, that is the smell.
//
// 🔴 AND THE ASSIGNMENT COMES FROM `handedness`, NEVER FROM A SLOT INDEX.
// MEASURED on a Quest 3, 2026-09-13: ONE frame reported the SAME hand as both
// `inputSources[0]` and `trackedSources[1]` with different profiles, and an
// earlier run had the LEFT grip fail to resolve while the right one resolved.
// An index is a statement about the order an array happened to be in;
// `handedness` is the runtime answering the question. ⚠️ It can also be `none`,
// so this is a three-way choice with a fallback, not a boolean.
//
// ⚠️ `session.trackedSources` IS A META-FORK ATTRIBUTE. Upstream Chromium has
// no such thing, so reading it unguarded on a desktop browser is a TypeError
// inside a frame callback — the failure that does not stop the loop, it
// silently deletes everything below it. Guarded, and WHICH ARRAY a source came
// from is itself reported, because absent-and-empty, present-and-empty and
// present-with-a-hand are three different findings.
//
// ⚠️ NOTHING IN `observe` MAY THROW, for the same reason. Every read is inside
// the one try, and a refusal is remembered rather than retried ninety times a
// second to be told no.

import { pickQuad } from './xr-pick.mjs';
import { holdM, GRIP_PARTS } from './xr-room.mjs';
import { TABLET } from './xr-tablet.mjs';

/**
 * 🔴 THE BUTTON INDICES, TAKEN FROM THE REGISTRY WITHOUT TAKING THE MESH.
 *
 * `plan-xr-hands` §4.2 stage 2. Read out of
 * `@webxr-input-profiles/assets@1.0.20`'s own
 * `dist/profiles/meta-quest-touch-plus/profile.json` on 2026-09-13, which is
 * the file the registry would have been fetched for:
 *
 *   xr-standard-trigger    button 0
 *   xr-standard-squeeze    button 1
 *   xr-standard-thumbstick button 3 · xAxis 2 · yAxis 3
 *   a/x-button             button 4
 *   b/y-button             button 5
 *   thumbrest              button 6
 *   menu (left only)       button 7
 *
 * ⚠️ IT CONFIRMS THE GUESSES ALREADY IN `scene` RATHER THAN CORRECTING THEM —
 * `buttons[4]` really is A/X and `axes[3]` really is the thumbstick's Y on this
 * controller. That is worth writing down precisely because it is a pass: those
 * two indices were typed against a controller nobody had asked the name of, and
 * "it happens to be right" and "it is right" are the same observation until
 * somebody checks. The headset reports `meta-quest-touch-plus`, and the four
 * ids it falls back to (`oculus-touch-v3`, `oculus-touch`,
 * `generic-trigger-squeeze-thumbstick`) carry the same first four indices.
 */
export const BUTTON = { trigger: 0, squeeze: 1, thumbstick: 3, primary: 4, secondary: 5 };
export const AXIS = { stickX: 2, stickY: 3 };

/** Which hand does what. Declared once, printed in the fingerprint. */
export const TABLET_HAND = 'left';
export const POINTER_HAND = 'right';

const DEG = 180 / Math.PI;

/**
 * @param {object} o
 * @param {{aim:Function,press:Function,drag:Function,release:Function,holding:Function}} [o.tablet]
 * @param {(msg:string, kind?:string) => void} [o.log]
 * @param {(line:string) => void} [o.say]  🔴 THE BEACON, never a batched
 *        shipper — `createShipper` holds for 2 s and entering an immersive
 *        session is exactly when timers stop being generous.
 */
export function createXRHands({ tablet = null, log = () => {}, say = () => {} } = {}) {
  const state = {
    sources: 0,            // how many were in inputSources
    tracked: 0,            // how many were in trackedSources
    trackedSays: 'not looked yet',
    hands: [],             // [{ m, handedness, profile, where, hasHand }]
    pointer: null,         // { m, o, dir, handedness } — the ray that is drawn
    // ⚠️ THE POINTER'S OWN SOURCE, so a page reads the thumbstick and the
    // buttons off THE HAND THAT IS POINTING rather than off whichever source
    // the array happened to put first. `scene` used to `break` out of that loop,
    // which is the same bug wearing a `break` — with two controllers it drove
    // the held thing from one hand and aimed with the other, at random.
    pointerSrc: null,
    tabletM: null,         // where the tablet is hanging, or null
    hit: null,             // { t, u, v } where the ray meets the tablet
    over: false,           // is the ray on the tablet right now
    trigger: false,
    gripRayM: null,        // metres between grip and target ray, for the report
    gripRayDeg: null,
    lost: 0,               // frames with a source but no resolvable grip
    frames: 0,
  };

  // ── instrumentation, because the owner gets ONE run ────────────────────
  // 🔴 A NAMED PHASE FOR EVERY STEP, AND A DEADLINE THAT NAMES THE ONE THAT DID
  // NOT HAPPEN. This repo has three headset runs that were indistinguishable
  // from outside until a line was shipped before and after every await, and the
  // per-frame path has no awaits at all — so the equivalent here is a STAGE
  // that has to be reached, with a clock on it. A stage that never arrives says
  // which stage, in words, rather than leaving a silent tablet to be guessed at.
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
     'no controller reported a grip pose — there is nothing to hang the tablet on, and the stand-ins will be missing too'],
    ['the tablet placed', 5000,
     'a grip resolved but the tablet was never placed — holdM or the tablet module'],
    // ⚠️ THIS ONE IS NOT A DIAGNOSIS AND IT MUST NOT READ AS ONE. Nobody is
    // obliged to point at the tablet, so the honest line names BOTH readings
    // and says which one the numbers beside it would settle. A guess presented
    // as a diagnosis has already cost this project a room rescan and a serious
    // suggestion of reinstalling a headset.
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
        say(`FAIL hands · "${name}" has not happened ${(dt / 1000).toFixed(1)} s in — ${why}`);
        log(`the controller interface stalled at: ${name} — ${why}`, 'bad');
        return;
      }
    }
  }

  /** One line that two runs in two modes are compared on, and it has no mode in it. */
  const fingerprint = () =>
    `${TABLET.fingerprint} · trigger=button ${BUTTON.trigger}, stick=axes ${AXIS.stickX}/${AXIS.stickY}`;

  let announced = false, sig = '', failSaid = false;

  /**
   * Once per FRAME, never per eye, and it cannot throw.
   *
   * @param {XRFrame} frame
   * @param {XRReferenceSpace} space  `local-floor`
   * @param {XRSession} session
   */
  function observe(frame, space, session) {
    if (!frame || !session) return state;
    try {
      state.frames++;
      if (!firstFrameAt) {
        firstFrameAt = performance.now();
        at('built', fingerprint());
      }

      // ⚠️ BOTH ARRAYS, AND SAY WHICH. See the header.
      let tracked = [];
      let trackedSays = 'attribute ABSENT (this browser has no trackedSources)';
      try {
        if (session.trackedSources) {
          tracked = [...session.trackedSources];
          trackedSays = `attribute present, ${tracked.length} in it`;
        }
      } catch (e) { trackedSays = `attribute threw — ${e.name}`; }
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
        // ⚠️ `gripSpace` IS NULL FOR ANYTHING NOT INHERENTLY TRACKABLE, so every
        // read is guarded rather than dereferenced. And a pose that does not
        // RESOLVE is different from a space that does not exist — the first is
        // this frame, the second is this controller.
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
      state.hands = seen;

      // ── who gets what ───────────────────────────────────────────────────
      // 🔴 BY HANDEDNESS, WITH A NAMED FALLBACK. The owner's rule is "right has
      // the ray, left is the tablet". A headset with one controller still has
      // to work, so the fallback is written down rather than left to whichever
      // source happened to be first: with only one source it carries the tablet
      // AND the ray, which is usable and is reported in words, because a tablet
      // that silently did not attach reads as a broken tablet.
      const withGrip = seen.filter((h) => h.m);
      const withRay = seen.filter((h) => h.ray);
      const tabletSrc = withGrip.find((h) => h.handedness === TABLET_HAND)
        || (withGrip.length === 1 ? withGrip[0] : null);
      const pointSrc = withRay.find((h) => h.handedness === POINTER_HAND)
        || withRay.find((h) => h !== tabletSrc)
        || withRay[0] || null;
      state.pointer = pointSrc
        ? { ...pointSrc.ray, handedness: pointSrc.handedness } : null;
      state.pointerSrc = pointSrc?.src || null;

      if (withGrip.length) at('a source with a grip pose',
        withGrip.map((h) => `${h.where}:${h.handedness} ${h.profile}`).join(' | '));
      else if (seen.length) state.lost++;

      // 🔴 THE FIELD `plan-xr-hands` §6.3 CALLS THE HIGHEST-VALUE ONE IN THE
      // RUN: how far apart grip and target ray actually are on this runtime. It
      // turns "hang a model off the wrong space and it floats" from a claim
      // into a number. Taken on the pointer, once.
      if (pointSrc?.m && pointSrc.ray && state.gripRayM === null) {
        const g = pointSrc.m, r = pointSrc.ray.m;
        state.gripRayM = Math.hypot(r[12] - g[12], r[13] - g[13], r[14] - g[14]);
        const dot = (-g[8]) * (-r[8]) + (-g[9]) * (-r[9]) + (-g[10]) * (-r[10]);
        state.gripRayDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * DEG;
      }

      // ── the tablet ──────────────────────────────────────────────────────
      state.tabletM = tabletSrc ? holdM(tabletSrc.m) : null;
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

      // ── the trigger, read off the gamepad rather than off session events ──
      // ⚠️ ON PURPOSE, AND IT IS NOT A SECOND WAY TO DO THE SAME THING.
      // `selectstart` fires for WHICHEVER source pressed; a slider needs to know
      // that the POINTER's trigger is down, this frame, while the ray is
      // somewhere. Edge-detected here so a held trigger is a drag rather than
      // ninety presses, and index 0 is the registry's own `xr-standard-trigger`
      // rather than a guess — see BUTTON above.
      const down = !!pointSrc?.src.gamepad?.buttons?.[BUTTON.trigger]?.pressed;
      if (tablet) {
        tablet.aim(state.hit);
        if (down && !state.trigger) {
          if (tablet.press(state.hit)) {
            say(`hands · pressed the tablet · ${JSON.stringify(tablet.values())}`);
          }
        } else if (down) {
          tablet.drag(state.hit);
        } else if (state.trigger && tablet.holding()) {
          tablet.release();
          say(`hands · let go of the tablet · ${JSON.stringify(tablet.values())}`);
        }
      }
      state.trigger = down;

      // ── one line whenever what is in your hands changes ──────────────────
      const now = seen.map((h) => `${h.where}:${h.handedness}:${h.profile}:${h.m ? 'grip' : 'NOgrip'}:${h.ray ? 'ray' : 'NOray'}:${h.hasHand ? 'hand' : 'nohand'}`).join(' || ');
      if (now !== sig) {
        sig = now;
        say(`hands · ${state.sources} input + ${state.tracked} tracked · trackedSources ${trackedSays}`
          + ` · tablet on ${tabletSrc ? `${tabletSrc.where}:${tabletSrc.handedness}` : 'NOTHING'}`
          + ` · pointer on ${pointSrc ? `${pointSrc.where}:${pointSrc.handedness}` : 'NOTHING'}`
          + (state.gripRayM !== null
            ? ` · grip-ray offset ${state.gripRayM.toFixed(3)} m, ${state.gripRayDeg.toFixed(1)}°` : '')
          + ` · ${now || '(no sources)'}`);
      }
      if (!announced && seen.length) {
        announced = true;
        log(`${state.sources} controller(s) — the tablet is on your ${TABLET_HAND} hand, the pointer on your ${POINTER_HAND}`, 'ok');
      }

      // ── the rate line, twice ──────────────────────────────────────────────
      // 🔴 A FRACTION, NOT A Hz FIGURE. A Hz number needs a clock and still
      // cannot separate "the runtime updates at 60 while we render at 90" from
      // "poses drop out". Resolutions counted against frames answers both with
      // no clock at all. Twice because the first covers starting up and the
      // second covers running — `plan-xr-room` §9 measured those differing
      // 84.5 -> 90.0 fps, and this is the same distinction for input.
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
        say(`FAIL hands · could not be read — ${e.name}: ${e.message}`);
        log(`could not read what is in your hands — ${e.message}`, 'bad');
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
  };
}

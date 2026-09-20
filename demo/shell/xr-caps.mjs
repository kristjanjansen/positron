// demo/shell/xr-caps.mjs: can this browser be ASKED to open a headset session,
// and what to say to somebody whose browser cannot.
//
// 🔴 THE DEFECT THIS EXISTS FOR IS ONE CHARACTER, AND IT SHIPPED ON FOUR PAGES.
// Every XR page here wrote the same line:
//
//     navigator.xr?.isSessionSupported('immersive-vr')
//       .then(v => vrKnown = v, () => vrKnown = false)
//
// On a browser with no `navigator.xr` AT ALL the optional chain returns
// `undefined`, so neither handler ever runs and `vrKnown` stays `null` forever.
// `/weight/` then asserted `vrKnown !== null` and reported, to a visitor holding
// an iPhone, `FAIL a headset was asked about, both ways`. Reported 2026-09-19
// with a photograph of exactly that: *"having no capability is not fail, its
// default info"*. iPhone Safari has no `navigator.xr`, which is every visitor
// on a phone.
//
// ⚠️ SO THERE IS A THIRD ANSWER, AND `demo/shell/caps.mjs` IS THE PRECEDENT.
// That file already holds this principle in writing: a probe that could not
// answer returns `unknown`, which never blocks, because "we did not look" must
// not read as "it is missing". The same idea, one step further: a browser with
// no WebXR is not a browser that failed to answer, it is a browser that was
// never in a position to be asked, and that is ordinary information about a
// phone rather than a fault of the page.
//
// ⚠️ THIS IS ONLY ABOUT WHETHER A SESSION CAN BE ASKED FOR. It is NOT the
// nativeness probe. CLAUDE.md records that the two catch disjoint things: a
// desktop Chrome has a genuinely native `navigator.xr` and answers
// `immersive-vr: false`, while the Immersive Web Emulator installs a JavaScript
// `XRSystem` that claims everything. `/blocks/` owns the nativeness half and
// nothing here duplicates it.

/** Which session mode each name asks about. The page calls `requestSession`
 *  with the same string, so it is written once here. */
export const XR_MODE = { vr: 'immersive-vr', ar: 'immersive-ar' };

/**
 * Every answer a probe can give, in the order they are worth reading.
 *
 *   yes     this browser says it can open that session
 *   no      this browser has WebXR and says it cannot, or refused to answer
 *   absent  this browser has no WebXR at all, so there was nothing to ask
 *   asking  the question is out and the answer has not come back yet
 *
 * ⚠️ `asking` IS A FOURTH STATE AND IT IS NOT A FOURTH ANSWER. `isSessionSupported`
 * is a promise, so between the question and the reply there has to be something
 * for `caps()` to return, and the one thing it must not return is a guess. It
 * never blocks a control: see `canEnter`.
 * ⚠️ `absent` RESOLVES AT ONCE. That is the whole repair: a browser with nothing
 * to ask is answered in the same turn the probe is built, not never.
 */
export const XR_STATES = ['yes', 'no', 'absent', 'asking'];

/** Has this state stopped moving? True for yes, no and absent alike, because a
 *  browser that has no headset has answered the question. */
export const answered = (state) => state === 'yes' || state === 'no' || state === 'absent';

/**
 * Should a control that opens this kind of session be pressable?
 *
 * 🔴 `asking` COUNTS AS YES, ON PURPOSE. A button disabled while the answer is
 * still coming is a control that lies in the other direction: on a headset it
 * would sit grey for as long as the browser takes to reply, and this project
 * already has a rule about a control whose state is a guess. Nothing is lost by
 * being late to disable, because the state that matters on a phone is `absent`
 * and that one is known before the first frame.
 */
export const canEnter = (state) => state === 'yes' || state === 'asking';

/**
 * What to put in a control's `title`, in plain words.
 *
 * 🔴 A DISABLED BUTTON WITH NO REASON IS WORSE THAN AN ENABLED ONE. It reads as
 * a page that is broken rather than as a browser that cannot do the thing, and
 * `caps.mjs` already answers this for the index: a row it cannot link says why,
 * in words, rather than vanishing.
 *
 * ⚠️ `yes` HAS NOTHING TO SAY AND RETURNS AN EMPTY STRING. A control that works
 * explains itself by working, and a tooltip restating the label is furniture.
 * This also makes one call site cover every state:
 * `group.enable('vr', canEnter(s), reasonFor(s, 'vr'))`.
 *
 * ⚠️ A VISITOR READS THIS, so it obeys the rules every visitor-facing sentence
 * here obeys: no file paths, no warning signs, no jargon, and nothing about how
 * the page found out.
 */
const SAYS = {
  vr: {
    yes: '',
    no: 'This browser found no headset to open.',
    absent: 'This browser cannot open a headset, which is normal on a phone or a laptop.',
    asking: 'Still asking this browser whether it can open a headset.',
  },
  ar: {
    yes: '',
    no: 'This browser cannot lay the page over the room you are in.',
    absent: 'This browser cannot open a headset, which is normal on a phone or a laptop.',
    asking: 'Still asking this browser whether it can lay the page over the room.',
  },
};

/** @param {string} state one of XR_STATES @param {'vr'|'ar'} mode */
export function reasonFor(state, mode = 'vr') {
  return SAYS[mode]?.[state] ?? '';
}

/**
 * One probe over one `XRSystem`, or over nothing at all.
 *
 * ⚠️ IT TAKES THE OBJECT RATHER THAN READING `navigator`, so the thing that is
 * hard to reproduce can be reproduced. `/kit/` builds one over `undefined` and
 * proves the iPhone case answers `absent` at once, one over a system that says
 * yes, and one over a system that refuses to answer. An instrument that
 * reported `absent` about everything would pass the first of those on its own,
 * which is why all three are graded.
 *
 * @param {XRSystem|undefined|null} xr
 * @returns {{ caps: () => {vr: string, ar: string},
 *             when: (ms?: number) => Promise<{vr: string, ar: string}>,
 *             on: (fn: (caps: {vr: string, ar: string}) => void) => () => void }}
 */
export function createXrProbe(xr) {
  const state = { vr: 'asking', ar: 'asking' };
  const listeners = new Set();
  const snap = () => ({ ...state });

  let settle;
  const settled = new Promise((r) => { settle = r; });

  function publish() {
    for (const fn of [...listeners]) {
      try { fn(snap()); } catch (e) { console.warn('xr-caps: a listener threw', e); }
    }
    if (answered(state.vr) && answered(state.ar)) settle(snap());
  }

  function land(key, value) {
    if (state[key] === value) return;
    state[key] = value;
    publish();
  }

  // 🔴 THE MISSING CASE, ANSWERED IN THIS TURN. `xr` is undefined on every
  // iPhone and on any browser where the feature is switched off, and the old
  // line left its variable at `null` forever rather than coming here.
  // ⚠️ `isSessionSupported` IS CHECKED, NOT JUST `xr`. A browser could carry an
  // `XRSystem` without the query, and a missing method would throw on call
  // rather than answer.
  if (!xr || typeof xr.isSessionSupported !== 'function') {
    state.vr = 'absent';
    state.ar = 'absent';
    publish();
  } else {
    for (const key of Object.keys(XR_MODE)) {
      let p;
      // It can reject, and a polyfill can throw where the spec says reject.
      // Both mean the same thing to a control: this is not a session that is
      // going to open here.
      try { p = xr.isSessionSupported(XR_MODE[key]); }
      catch { land(key, 'no'); continue; }
      Promise.resolve(p).then((yes) => land(key, yes ? 'yes' : 'no'), () => land(key, 'no'));
    }
  }

  return {
    caps: snap,
    /**
     * Settle, whatever happens. A browser whose promise never comes back gets
     * the snapshot as it stands after `ms`, still saying `asking`, because the
     * one thing worse than waiting is inventing the answer that ends the wait.
     */
    when(ms = 5000) {
      if (answered(state.vr) && answered(state.ar)) return Promise.resolve(snap());
      return new Promise((resolve) => {
        const t = setTimeout(() => resolve(snap()), ms);
        settled.then((v) => { clearTimeout(t); resolve(v); });
      });
    },
    /** Called at once with what is known, and again on every change. Returns
     *  the unsubscribe, so a page that ends can stop being told. */
    on(fn) {
      listeners.add(fn);
      try { fn(snap()); } catch (e) { console.warn('xr-caps: a listener threw', e); }
      return () => listeners.delete(fn);
    },
  };
}

// ── the one every page uses ───────────────────────────────────────────────
// Built on first use rather than at import, so a page that only wants
// `reasonFor` asks this browser nothing.
let shared = null;
const probe = () => (shared ||= createXrProbe(globalThis.navigator?.xr));

/** What is known right now: `{ vr, ar }`, each one of XR_STATES. Never null. */
export const xrCaps = () => probe().caps();

/** Subscribe. Called at once and on every change; returns the unsubscribe. */
export const onXrCaps = (fn) => probe().on(fn);

/** Resolves when both answers are in, or after `ms` with what there is. */
export const whenXrCaps = (ms) => probe().when(ms);

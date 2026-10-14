// demo/shell/xr-caps.mjs: can this browser be asked to open a headset session, and what to say
// when it cannot. No `navigator.xr` (every iPhone) answers `absent` at once, never null forever.
// Not the nativeness probe; /blocks/ owns that.
// why: lessons/kit-xr-caps.md#header

/** Which session mode each name asks about. The page calls `requestSession`
 *  with the same string, so it is written once here. */
export const XR_MODE = { vr: 'immersive-vr', ar: 'immersive-ar' };

/**
 * yes, no (has WebXR, says no or refused), absent (no WebXR at all), asking (reply pending).
 * `asking` never blocks a control; `absent` resolves in the same turn.
 * why: lessons/kit-xr-caps.md#xr-states
 */
export const XR_STATES = ['yes', 'no', 'absent', 'asking'];

/** Has this state stopped moving? True for yes, no and absent alike, because a
 *  browser that has no headset has answered the question. */
export const answered = (state) => state === 'yes' || state === 'no' || state === 'absent';

/**
 * Should a control that opens this session be pressable? `asking` counts as yes on purpose.
 * why: lessons/kit-xr-caps.md#can-enter
 */
export const canEnter = (state) => state === 'yes' || state === 'asking';

/**
 * What to put in a control's `title`, in plain visitor words. A disabled button always says why;
 * `yes` returns ''. One call site: `group.enable('vr', canEnter(s), reasonFor(s, 'vr'))`.
 * why: lessons/kit-xr-caps.md#reason-for
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
 * One probe over one `XRSystem`, or over nothing. Takes the object, so /kit/ can grade all three cases.
 * @param {XRSystem|undefined|null} xr
 * @returns {{ caps: () => {vr: string, ar: string},
 *            when: (ms?: number) => Promise<{vr: string, ar: string}>,
 *            on: (fn: (caps: {vr: string, ar: string}) => void) => () => void }}
 * why: lessons/kit-xr-caps.md#create-xr-probe
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

  // The missing case, answered this turn; `isSessionSupported` is checked too, or the call throws.
  // why: lessons/kit-xr-caps.md#absent
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
     * Settle whatever happens: after `ms` the snapshot as it stands, still `asking` if no reply.
     * why: lessons/kit-xr-caps.md#when
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

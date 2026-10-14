// demo/shell/audio.mjs: one AudioContext per page and one owner sounding in it: `sharedAudio`, `claim`,
// `release`, `contexts`. Nothing happens on import. 48000 for Plaits. Suspend, never close; the new
// owner is set before the old is stopped; no suspend while a resume is in flight (wedges Chrome).
// why: lessons/kit-audio.md#header

/**
 * A hub: one context, one owner. Exported so the arithmetic can be graded with
 * a fake context; a page uses the module-level functions below.
 *
 * @param {object} io
 * @param {(opts: {sampleRate: number}) => AudioContext} io.make builds a context
 * @param {() => (Document | null)} io.doc where `visibilitychange` is heard, read when the first context is made
 */
export function createAudioHub({ make, doc }) {
  let ctx = null;
  let made = 0;
  let owner = null;
  /** The latest `resume()` called on a context that did not read `running`, until it settles. */
  let resuming = null;

  function resume() {
    if (!ctx) return;
    const wasRunning = ctx.state === 'running';
    const p = Promise.resolve(ctx.resume?.()).catch(() => {});
    if (wasRunning) return;
    resuming = p;
    p.then(() => { if (resuming === p) resuming = null; });
  }

  /** Suspend when nobody holds the context, after any resume still in flight (see the header). */
  function suspendIfFree() {
    if (!ctx || owner) return;
    if (resuming && ctx.state !== 'running') { resuming.then(suspendIfFree); return; }
    ctx.suspend?.();
  }

  function onVisibility() {
    const d = doc();
    if (!d || d.visibilityState !== 'hidden' || !owner) return;
    /* A front page left in a background tab must not hold a sound device. The
       owner is stopped and then let go here as well, so an owner whose `stop()`
       forgets to release cannot keep the device busy behind the tab. */
    const was = owner;
    try { was.stop?.(); } finally { release(was); }
  }

  function sharedAudio({ sampleRate = 48000 } = {}) {
    if (ctx) {
      // Fired and not awaited: `resume()` waits on a gesture and never rejects.
      resume();
      return ctx;
    }
    ctx = make({ sampleRate });
    made++;
    doc()?.addEventListener?.('visibilitychange', onVisibility);
    resume();
    return ctx;
  }

  function claim(next) {
    if (!next) throw new Error('claim() needs an owner, an object with a stop()');
    if (ctx && ctx.state === 'suspended') resume();
    if (owner === next) return next;
    const prev = owner;
    owner = next;                       // first, see the header
    if (prev) prev.stop?.();
    return next;
  }

  function release(who) {
    if (!who || owner !== who) return false;
    owner = null;
    suspendIfFree();
    return true;
  }

  return {
    sharedAudio,
    claim,
    release,
    contexts: () => made,
    owner: () => owner,
    context: () => ctx,
  };
}

let hub = null;
function theHub() {
  if (!hub) {
    hub = createAudioHub({
      make: ({ sampleRate }) => {
        const C = globalThis.AudioContext || globalThis.webkitAudioContext;
        /* An old webkitAudioContext takes no options and throws on them. */
        try { return new C({ sampleRate }); } catch { return new C(); }
      },
      doc: () => (typeof document === 'undefined' ? null : document),
    });
  }
  return hub;
}

/** The page's one AudioContext, made on the first call. Call it inside a gesture. */
export const sharedAudio = (opts) => theHub().sharedAudio(opts);
/** Make `owner` the one thing sounding here; the previous owner's `stop()` runs. */
export const claim = (owner) => theHub().claim(owner);
/** Let go; when nobody holds the context it is suspended. Returns whether `owner` held it. */
export const release = (owner) => theHub().release(owner);
/** How many contexts this module has made on this page. Nought on a visit. */
export const contexts = () => (hub ? hub.contexts() : 0);
/** Who holds the context now, or null. */
export const audioOwner = () => (hub ? hub.owner() : null);

// ── waking a context on a phone ──
// WebKit keeps a context made outside a gesture silent, so `wakeAudioOnGesture()` resumes every
// never-run context on the next trusted gesture, and sets `audioSession.type = 'playback'`.
// why: lessons/kit-audio.md#wake
let woken = null;
export function wakeAudioOnGesture() {
  if (woken) return woken;
  const w = typeof window === 'undefined' ? null : window;
  if (!w) return (woken = { contexts: () => [] });
  const live = new Set();
  const ran = new WeakSet();
  const track = (c) => {
    if (!c || live.has(c)) return c;
    live.add(c);
    const note = () => {
      if (c.state === 'running') ran.add(c);
      if (c.state === 'closed') live.delete(c);
    };
    note();
    c.addEventListener?.('statechange', note);
    return c;
  };
  for (const name of ['AudioContext', 'webkitAudioContext']) {
    const Orig = w[name];
    if (typeof Orig !== 'function' || Orig.__posWake) continue;
    const Wrapped = new Proxy(Orig, {
      construct(t, args, nt) { return track(Reflect.construct(t, args, nt === Wrapped ? t : nt)); },
      get(t, k, r) { return k === '__posWake' ? true : Reflect.get(t, k, t); },
    });
    try { w[name] = Wrapped; } catch { /* a frozen global; contexts then go unseen */ }
  }
  if (hub?.context()) track(hub.context());

  let session = false;
  const onGesture = (e) => {
    if (!e.isTrusted) return;
    if (!session) {
      session = true;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* read only here */ }
    }
    for (const c of live) {
      if (c.state === 'running' || c.state === 'closed') continue;
      if (c.state === 'suspended' && ran.has(c)) continue;
      Promise.resolve(c.resume?.()).catch(() => {});
    }
  };
  for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'keydown', 'click']) {
    w.addEventListener(type, onGesture, { capture: true, passive: true });
  }
  return (woken = { contexts: () => [...live] });
}

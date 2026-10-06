// demo/shell/audio.mjs: one AudioContext per page, and one slot sounding in it.
//
//   import { sharedAudio, claim, release, contexts } from '/shell/audio.mjs';
//
// 🔴 WHY IT EXISTS. Thirteen files built their own AudioContext on 2026-10-06
// (`plans/plan-live-slides.md` section 3.4, MEASURED with `grep -c`) and no
// shared one existed. A page with two players, or a deck on `/fau/`, would make
// a second sound device for the same pair of speakers. This module is the one
// place a context is made, and the one place that says who is using it.
//
// ── THE FOUR VERBS ─────────────────────────────────────────────────────────
//
// `sharedAudio({ sampleRate })` makes the context on its FIRST call, inside the
// gesture that asked for it, and hands back the same one afterwards with a
// `resume()` fired and not awaited. `claim(owner)` makes `owner` the one thing
// sounding on this page and calls the previous owner's `stop()`. `release(owner)`
// lets go and suspends the context when nobody holds it. `contexts()` counts
// the contexts this module has made, which is what a check reads to say a visit
// or a step opened no sound device.
//
// 🔴 NOTHING HAPPENS ON IMPORT. No context, no listener, no `window` or
// `document` read. A page may import this on a visit and pay for a few hundred
// bytes of module and nothing else; the visibility listener is added when the
// first context is made, because before that there is nothing to stop.
//
// 🔴 48000, BECAUSE PLAITS REQUIRES IT AND NOTHING ELSE HERE MINDS. `/muta/`
// refuses any other rate (READ, `plan-live-slides.md` 2). Faust takes the
// context's rate, scsynth takes the context it is handed, `/nola/` decodes into
// whatever it gets. A caller asking for a rate the existing context does not
// have still gets that context, because one page has one device: compare
// `ctx.sampleRate` with what you asked for and SAY so, the way `/muta/` reports
// a 44100 today. A second return channel for one comparison the caller can make
// itself would be a second copy of a fact.
//
// 🔴 SUSPEND, NEVER CLOSE. A closed context cannot be reopened, so the next
// press would have to build a new one and register every worklet again. A
// suspended one costs the audio thread nothing and keeps every processor it
// has, and the next press is a gesture anyway, which is what `resume()` wants.
//
// 🔴 ONE OWNER, AND ITS STATE IS SET BEFORE THE PREVIOUS OWNER IS STOPPED.
// A slot's `stop()` usually ends with `release(this)`. If the new owner were
// written after that call, the old owner's release would find itself still
// the owner, clear it and suspend the context the new owner is about to sound
// in. `audio-test.mjs` carries that exact case as a negative control.
//
// 🔴 NO SUSPEND WHILE A RESUME IS IN FLIGHT. MEASURED 2026-10-06 in headless
// Chrome, outside any positron page: `resume()` on a suspended context leaves
// `state` reading `suspended` for about 1.5 to 3 ms, and a `suspend()` in that
// window stops the device without changing `state`; the resume then lands and
// the context reads `running` with `currentTime` frozen, 25 trials of 40.
// After that `resume()` resolves and does nothing, so every later press on the
// page sounds silence until a reload. A Start on a broken edit did it on
// `/kit/slides/`: the compile fails a couple of ms after the press resumed.
// So a release that finds a resume in flight waits for it, then suspends only
// if nobody has claimed in the meantime. `audio-test.mjs` carries the case
// over a fake that orders the verbs the way Chrome does.
//
// ⚠️ WHAT AN OWNER IS: any object with a `stop()` method, compared by identity.
// A page with one instrument passes one object for its whole life; a slide
// passes itself.
//
// ⚠️ THE ARITHMETIC IS GRADED WITH NO BROWSER. `createAudioHub({ make, doc })`
// is the whole module with its two globals handed in, and the functions this
// file exports are one hub built lazily on the real `window` and `document`.
// `node demo/shell/audio-test.mjs` drives a hub over a fake context.

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

// demo/shell/link-badge.mjs: is anything arriving on this link, in three words.
//
// 🔴 THE OWNER'S ANSWER, MADE A KIT PIECE, 2026-10-06 (plans/plan-routing-migration.md
// §3.7). Asked whether `/stage/` should move onto the patchbay, the owner said
// *"i do not about patchbay, perhaps just visual indication of picture
// happening"*, and what shipped there is a tag on the picture: STARTING,
// RECEIVING, STALLED. That is the UI a page that moves onto the patchbay gets,
// not a patch view. `/patchbay/` stays the one place links are drawn and made.
//
// 🔴 OUTCOME, NEVER INTENT, AND THE COUNT IS TAKEN ON THE FAR SIDE. A press only
// makes it `starting`. `receiving` needs a number that GREW, read from an
// opener's `count()`: frames decoded here, PCM frames that reached this page,
// pieces ingest acknowledged. CLAUDE.md: *a count is only evidence on the far
// side of the boundary*. An opener whose only count is what it sent has no
// `count()`, and gets no badge rather than a badge that says `receiving` about
// its own queue.
//
// ⚠️ THE RULE IS `presenceOf`, THE STAGE'S OWN, NOT A SECOND ONE TYPED HERE: a
// count that grew is a heartbeat, `stallMs` is the stall window, one miss is
// gone. `linkStateOf` is that rule as a pure function, so a page can feed it
// fixtures in its own check pass.
// ⚠️ HIDDEN WHILE `unknown`, which is before a start and after a stop, as the
// stage hides its tag when there is nothing to receive.

import { createPresence, presenceOf } from './presence.mjs';

/** Two seconds without growth is stalled, the stage's `PIC_STALL_MS`. */
export const LINK_STALL_MS = 2000;
/** How long a start may say `starting` before it is called nothing. */
export const LINK_START_MS = 90_000;
/** The stage's words, in the presence badge's five states. */
export const LINK_SAYS = { unknown: 'not receiving', coming: 'starting', checking: 'starting',
  online: 'receiving', offline: 'stalled' };
/** The three a link badge can reach once started. */
export const LINK_CAN = ['coming', 'online', 'offline'];

/**
 * The rule, as a pure function of three times: one of `presenceOf`'s words.
 * @param {object} o
 * @param {number} o.now
 * @param {?number} o.lastCountAt when the count last grew, or null
 * @param {?number} o.startedAt   when the link was opened, or null
 */
export function linkStateOf({ now, lastCountAt = null, startedAt = null, stallMs = LINK_STALL_MS, startMs = LINK_START_MS }) {
  return presenceOf({ now, everyMs: stallMs, misses: 1, lastSeenAt: lastCountAt,
    comingSince: lastCountAt == null ? startedAt : null, comingMs: startMs, since: null });
}

/**
 * A badge for one open link.
 * @param {object} o
 * @param {() => ?number} o.count  what arrived so far, counted on the far side;
 *                                 null while it cannot be counted
 * @param {number} [o.stallMs]
 * @param {number} [o.startMs]
 * @param {number} [o.pollMs]      how often `count` is read
 * @param {Function} [o.onChange]  `(state, word)`
 * @returns {{ el: HTMLElement, start(): object, stop(): object, poll(): string, state(): string, says(): string }}
 */
export function createLinkBadge({ count, stallMs = LINK_STALL_MS, startMs = LINK_START_MS, pollMs = 250, onChange = null } = {}) {
  if (typeof count !== 'function') {
    throw new Error('link-badge: count is a function answering what arrived on the far side. '
      + 'An opener with no such count gets no badge.');
  }
  // ⚠️ `let` AND A NULL CHECK: `createPresence` calls `onChange` once while it
  // is still being built, before `pres` holds anything.
  let pres = null;
  pres = createPresence({ mode: 'badge', state: 'unknown', says: LINK_SAYS, can: LINK_CAN,
    onChange: (st) => { if (pres) pres.el.hidden = st === 'unknown'; onChange?.(st, LINK_SAYS[st]); } });
  pres.el.hidden = true;
  let last = null, timer = null;

  /** Read the count once. Answers the state after it. */
  function poll() {
    let n = null;
    try { n = count(); } catch { n = null; }
    if (Number.isFinite(n) && (last == null || n > last)) {
      // The first reading is a baseline, not an arrival: an opener that
      // starts at 12 has not received anything since the press.
      if (last != null) pres.seen();
      last = n;
    }
    return pres.state();
  }

  const api = {
    el: pres.el,
    /** The press: `starting`, and the count is watched from here. */
    start() {
      last = null;
      pres.follow({ everyMs: stallMs, misses: 1, since: null, comingMs: startMs });
      pres.coming(true);
      poll();
      clearInterval(timer);
      timer = setInterval(poll, pollMs);
      return api;
    },
    /** Closed: hidden again, and nothing is read. */
    stop() {
      clearInterval(timer);
      timer = null;
      pres.stop();
      pres.set('unknown');
      return api;
    },
    poll,
    state: () => pres.state(),
    says: () => LINK_SAYS[pres.state()],
  };
  return api;
}

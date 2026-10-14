// demo/shell/link-badge.mjs: is anything arriving on this link: STARTING, RECEIVING, STALLED.
// Outcome, never intent: receiving needs an opener's count() that grew on the far side;
// the rule is presence.mjs's presenceOf. Hidden while unknown.
// why: lessons/kit-link-badge.md#header

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
  // `let` and a null check: createPresence calls onChange while still being built.
  // why: lessons/kit-link-badge.md#pres-null
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

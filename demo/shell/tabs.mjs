// demo/shell/tabs.mjs — the parts of one page, named across the top.
//
// 🔴 A HASH, NOT A SUBPAGE, AND THE REASON IS THE INSTALLED APP. Asked directly:
// *"Second and third tab should be #links? Or subpages?"* A subpage is a
// NAVIGATION — the document is thrown away and rebuilt, which on this project's
// pages means the audio stops, the deck is rebuilt, the service worker's warm
// state goes and an installed web app flashes white on every tab press. A hash
// changes one attribute. It is still a real address: shareable, in the history,
// answered by the back button, and a notification can open the app straight
// onto one part of it.
//
// ⚠️ THE TABS ARE NOT A `choice`. `choice.mjs` is a segmented control for
// mutually exclusive SETTINGS — armed options inside one box, borders overlapped
// so the group reads as one thing. These are places you go. Same shape on screen
// would say the same thing about two different acts, which is the drift `/kit/`
// exists to catch, so this is its own component rather than a fifth caller of
// that one.
//
// ⚠️ AND IT SCROLLS RATHER THAN WRAPPING, for the reason the option rows do:
// MEASURED on a 390 px phone, three names wrapped a tab onto two lines and cut
// the third mid-word. `flex: 0 0 auto` plus an overflowing row keeps every name
// whole and lets the row move.

import { el } from './shell.mjs';

/**
 * @param {object} o
 * @param {Array<{id:string, label:string, disabled?:boolean, note?:string}>} o.tabs
 *   `disabled` is for a part that EXISTS AND IS NOT BUILT YET. It stays in the
 *   row, named, unpressable — because a part that is coming and a part that does
 *   not exist are different facts, and hiding it makes them the same one.
 * @param {string} [o.at]      the id to open on; the hash wins over it
 * @param {boolean} [o.hash]   read and write `location.hash` (default true)
 * @param {(id:string)=>void} [o.onPick]
 * @returns {{el:HTMLElement, panel:(id:string)=>HTMLElement, go:(id:string)=>void,
 *            at:()=>string, buttons:HTMLButtonElement[], panels:HTMLElement}}
 */
export function createTabs({ tabs, at, hash = true, onPick } = {}) {
  if (!Array.isArray(tabs) || !tabs.length) throw new Error('createTabs: name some tabs');

  const live = tabs.filter((t) => !t.disabled);
  if (!live.length) throw new Error('createTabs: every tab is disabled, so there is nothing to show');

  const wrap = el('div', 'pos-tabs');
  const bar = el('div', 'pos-tabs-bar', '', { role: 'tablist' });
  const panels = el('div', 'pos-tabs-panels');
  wrap.append(bar, panels);

  const byId = new Map();
  const buttons = tabs.map((t) => {
    const b = el('button', 'pos-tabs-t', t.label,
      { type: 'button', role: 'tab', 'aria-selected': 'false' });
    if (t.disabled) {
      b.disabled = true;
      // ⚠️ THE REASON IS ON THE CONTROL, not in a legend. A greyed word with no
      // explanation reads as a fault in the page.
      b.title = t.note || 'not built yet';
    } else {
      b.onclick = () => go(t.id);
    }
    bar.append(b);
    const p = el('div', 'pos-tabs-p', '', { role: 'tabpanel' });
    p.hidden = true;
    panels.append(p);
    byId.set(t.id, { t, b, p });
    return b;
  });

  const fromHash = () => {
    const h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    const hit = byId.get(h);
    return hit && !hit.t.disabled ? h : null;
  };

  let cur = null;
  function go(id, { quiet = false, push = true } = {}) {
    const hit = byId.get(id);
    if (!hit || hit.t.disabled || id === cur) return;
    cur = id;
    for (const [k, v] of byId) {
      const on = k === id;
      v.b.setAttribute('aria-selected', String(on));
      v.p.hidden = !on;
    }
    // ⚠️ `replaceState`, NOT AN ASSIGNMENT TO `location.hash`. Assigning fires
    // `hashchange`, which this listens to, which calls `go` again — harmless
    // only because the second call returns on `id === cur`. Writing history
    // directly says what is meant and leaves one entry per press.
    if (hash && push && fromHash() !== id) {
      try { history.replaceState(null, '', `#${encodeURIComponent(id)}`); } catch { /* file:// */ }
    }
    if (!quiet) onPick?.(id);
  }

  if (hash) addEventListener('hashchange', () => { const h = fromHash(); if (h) go(h, { push: false }); });

  go(fromHash() || (byId.get(at) && !byId.get(at).t.disabled ? at : live[0].id), { quiet: true });

  return {
    el: wrap, buttons, panels,
    panel: (id) => byId.get(id)?.p,
    go,
    at: () => cur,
  };
}

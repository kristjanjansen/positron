// demo/shell/tabs.mjs: the parts of one page, named across the top. A hash, not a
// subpage, so audio and app state survive a tab press. Not a `choice` (places, not
// settings). The row scrolls rather than wraps (a 390 px phone cut a name mid-word).
// why: lessons/kit-tabs.md#header

import { el } from './shell.mjs';

/**
 * @param {object} o
 * @param {Array<{id:string, label:string, disabled?:boolean, note?:string}>} o.tabs
 *   `disabled`: a part that exists and is not built yet, kept in the row, unpressable.
 * @param {string} [o.at]      the id to open on; the hash wins over it
 * @param {boolean} [o.hash]   read and write `location.hash` (default true)
 * @param {(id:string)=>void} [o.onPick]
 * @returns {{el:HTMLElement, panel:(id:string)=>HTMLElement, go:(id:string)=>void,
 *            at:()=>string, buttons:HTMLButtonElement[], panels:HTMLElement}}
 * why: lessons/kit-tabs.md#create-tabs
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
    // `replaceState`, not assigning `location.hash`, which would fire `hashchange` into `go` again.
    // why: lessons/kit-tabs.md#replace-state
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
    /**
     * Switch a tab off at runtime when nothing is behind it, with the reason on the control.
     * Switching off the open tab moves to the first tab still live.
     * why: lessons/kit-tabs.md#enable
     */
    enable(id, yes, note) {
      const hit = byId.get(id);
      if (!hit) return;
      hit.t.disabled = !yes;
      hit.b.disabled = !yes;
      hit.b.title = yes ? '' : (note || 'nothing here yet');
      hit.b.onclick = yes ? () => go(id) : null;
      if (!yes && cur === id) {
        const next = [...byId.values()].find((v) => !v.t.disabled);
        if (next) { cur = null; go(next.t.id); }
      }
    },
    /** Whether a tab can be reached, so a page can assert what it switched off. */
    enabled: (id) => !byId.get(id)?.t.disabled,
  };
}

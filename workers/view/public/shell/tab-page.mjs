// demo/shell/tab-page.mjs: one page of tabs, each tab a module exporting `build(ctx)` and
// optionally `readout` and `about`. A tab is built on first show and opens nothing; each has
// its own report; checks run in `page.check()` before `d.ready()`; the hash picks the tab.
// why: lessons/kit-tab-page.md#header

import { createTabs } from './tabs.mjs';
import { createReport, el } from './shell.mjs';
import { createStack } from './stack.mjs';
import { assertBar } from './bar-drill.mjs';

const twoFrames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/**
 * @param {object} d  what `mount()` returned
 * @param {object} o
 * @param {Array<{id:string, label:string, about?:string, mod:{build:Function, about?:string, readout?:object|null, log?:boolean}}>} o.tabs
 *   `about` on the entry wins over the module's `export const about`.
 * @param {string} [o.at]      the tab to open on when the hash names none
 * @param {boolean} [o.hash]   default true; false inside a page that owns the hash
 * @param {object} [o.host]    a stack or an element to put the row in; default `d.stack`
 * @param {(id:string)=>void} [o.onPick]  after the tab is built and shown
 */
export function createTabPage(d, { tabs, at, hash = true, host, onPick } = {}) {
  if (!Array.isArray(tabs) || !tabs.length) throw new Error('createTabPage: name some tabs');
  for (const t of tabs) {
    if (!t.mod || typeof t.mod.build !== 'function') throw new Error(`createTabPage: tab ${t.id} has no build()`);
  }
  const byId = new Map(tabs.map((t) => [t.id, t]));
  const built = new Map();     // id -> { handle, report, panel, assert }

  const row = createTabs({
    tabs: tabs.map(({ id, label }) => ({ id, label })),
    at, hash,
    onPick: (id) => { open(id); onPick?.(id); },
  });
  for (const t of tabs) row.panel(t.id).dataset.ownKeys = '';
  const into = host || d.stack;
  if (into.add) into.add(row.el); else into.append(row.el);

  // Rule 6: every tab's explanation in one cell, the open one visible.
  const aboutOf = (t) => String(t.about ?? t.mod.about ?? '').trim();
  const abouts = new Map();
  let aboutBox = null;
  if (tabs.some((t) => aboutOf(t))) {
    aboutBox = el('div', 'pos-tabs-about');
    for (const t of tabs) {
      const p = el('p', 'pos-tabs-about-t', aboutOf(t));
      p.setAttribute('aria-hidden', 'true');
      aboutBox.append(p);
      abouts.set(t.id, p);
    }
    row.el.insertBefore(aboutBox, row.panels);
  }
  function showAbout(id) {
    for (const [k, p] of abouts) {
      const on = k === id;
      p.classList.toggle('on', on);
      p.setAttribute('aria-hidden', String(!on));
    }
  }

  /** A tab's assert: its label in front, so the harness output says which tab. */
  const assertFor = (id) => {
    const label = byId.get(id).label;
    return (what, pass, detail) => d.assert(`${label}: ${what}`, pass, detail);
  };

  /**
   * Build a tab if it has not been. On a closed tab it builds into a panel with no width,
   * so anything measuring itself reads 0; only for a check that needs the handle unseen.
   * why: lessons/kit-tab-page.md#ensure
   */
  function ensure(id) {
    if (built.has(id)) return built.get(id);
    const t = byId.get(id);
    if (!t) throw new Error(`createTabPage: no tab ${id}`);
    const panel = createStack(row.panel(id));
    const report = createReport({
      readout: t.mod.readout || {},
      showLog: t.mod.log !== false,
    });
    const assert = assertFor(id);
    const entry = { handle: {}, report, panel, assert, error: null };
    built.set(id, entry);
    try {
      entry.handle = t.mod.build({
        panel, report, d, assert,
        tab: { id, label: t.label },
        log: (msg, kind) => report.line(msg, kind),
        set: (k, v, state) => report.set(k, v, state),
      }) || {};
    } catch (e) {
      entry.error = e;
      report.line(`this tab did not build: ${e.message}`, 'bad');
      d.log(`${t.label} did not build: ${e.message}`, 'bad');
    }
    // The report goes under whatever the tab built, and only if it draws
    // something: `createReport` hands back `foot: null` for nothing to show.
    panel.add(report.foot || report.top);
    return entry;
  }

  let shown = null;
  function open(id) {
    if (shown && shown !== id) {
      const prev = built.get(shown);
      try { prev?.handle.hide?.(); } catch (e) { d.log(`${shown} hide: ${e.message}`, 'bad'); }
    }
    showAbout(id);
    const entry = ensure(id);
    shown = id;
    try { entry.handle.show?.(); } catch (e) { d.log(`${id} show: ${e.message}`, 'bad'); }
  }

  // The first `go` inside `createTabs` is quiet, so `onPick` did not fire for
  // the tab the page opens on. It is opened here, once.
  open(row.at());

  /**
   * The page's one check pass. Await it before `d.ready()`, under SELFCHECK:
   *
   *   if (SELFCHECK) await page.check();
   *   d.ready();
   */
  async function check() {
    const was = row.at();
    const before = [...built.keys()];
    d.assert('tabs: before the checks only the tab that was open had been built, so a tab nobody picked opened nothing',
      before.length === 1 && before[0] === was,
      `built ${before.join(', ') || 'none'}, open ${was}`);

    const still = [];   // [label, box height, panels top, the text on show]
    for (const t of tabs) {
      row.go(t.id, { push: false });
      if (row.at() !== t.id) { assertFor(t.id)('could be opened', false, `the row is on ${row.at()}`); continue; }
      await twoFrames();
      if (aboutBox) {
        const on = abouts.get(t.id);
        still.push([t.label, aboutBox.getBoundingClientRect().height,
          row.panels.getBoundingClientRect().top + scrollY,
          on.classList.contains('on') && getComputedStyle(on).visibility === 'visible' ? on.textContent : null]);
      }
      const entry = built.get(t.id);
      const A = entry.assert;
      A('built', !entry.error, entry.error ? entry.error.message : 'its build() returned');
      if (entry.error) continue;
      try {
        await entry.handle.check?.({ A, report: entry.report, panel: entry.panel, page });
      } catch (e) {
        A('its checks ran to the end', false, e.message);
      }
      // Every bar the tab declared gets the harness's drill, except the one
      // the page published, which the harness drills itself. In parallel: each
      // key is sent at its own bar and moves no other (see bar-drill.mjs). A
      // tab whose bars share ONE deck lists one of them, or two drills press
      // one deck at once.
      const bars = (entry.handle.bars || []).filter(({ bar }) =>
        !(window.__demo && window.__demo.transport === (bar.api || bar)));
      await Promise.all(bars.map(({ name, bar, strip }) => assertBar(A, bar, { name, strip })));
    }
    row.go(was, { push: false });

    if (aboutBox) {
      const hs = still.map((r) => r[1]), tops = still.map((r) => r[2]);
      const spread = (a) => Math.max(...a) - Math.min(...a);
      d.assert('tabs: the explanation under the tab row keeps one height on every tab, so switching tabs moves nothing below it',
        hs[0] > 0 && spread(hs) < 0.5 && spread(tops) < 0.5,
        still.map(([l, h, top]) => `${l} ${h.toFixed(1)} px, panel at ${top.toFixed(1)}`).join(', '));
      const wrong = tabs.filter((t, i) => still[i] && still[i][3] !== aboutOf(t)).map((t) => t.label);
      d.assert('tabs: each tab shows its own explanation and only its own',
        !wrong.length && aboutBox.querySelectorAll('.pos-tabs-about-t.on').length === 1,
        wrong.length ? `wrong text on ${wrong.join(', ')}` : `${still.length} tabs, one explanation visible at a time`);
    }
  }

  const page = {
    el: row.el,
    tabs: row,
    /** the one explanation box under the row, or null when no tab has an `about` */
    about: aboutBox,
    at: () => row.at(),
    /** open a tab as a press would: builds it if needed, writes the hash */
    go: (id) => row.go(id),
    ensure: (id) => ensure(id).handle,
    /** the tab's handle, or null if it has never been built */
    built: (id) => (built.has(id) ? built.get(id).handle : null),
    report: (id) => built.get(id)?.report || null,
    assert: assertFor,
    check,
  };
  return page;
}

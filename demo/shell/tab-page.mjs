// demo/shell/tab-page.mjs: one page made of several old pages, one per tab.
//
// 🔴 WHY THIS EXISTS. Decided by the owner 2026-10-04: twenty demos regroup into
// four tabbed pages, `/sync/` (ARRIVAL, AHEAD, FOLLOW, AFTER), `/time/`
// (SCHEDULE, BEAT, LOOPS, SCORE, DATES), `/wire/` (BYTES, NOTES) and
// `/capture/` (TAKES, SEGMENTS, ROUND TRIP, FAR END), with no redirects.
// `plans/plan-demo-structure.md` §3 and §5 step 1. Four pages doing the same
// five things by hand is four versions of them, and the five things are the
// rules below, so they live here once.
//
// THE CONVENTION. A tab is the old page's body moved into a module beside the
// new page (`demo/sync/arrival.mjs`), exporting `build(ctx)` and, optionally,
// `readout` and `about` (rule 6). The page lists its tabs and this does the rest:
//
//   1  🔴 NOTHING IS BUILT FOR A TAB NOBODY OPENED. A tab's `build` runs the
//      first time its tab is shown, by a press, by the hash, or by the check
//      pass. So a relay join, a fetch or a media element in a tab nobody
//      picked cannot happen, because the code that would do it has not run.
//      ⚠️ AND `build` ITSELF OPENS NOTHING EITHER. Building the tab that is
//      open on load is part of a visit, and *"a visit, a step and a scrub must
//      open nothing"* (CLAUDE.md). A join waits for the first press in its own
//      tab. The check pass asserts the first half (only the open tab was built
//      before it ran); the second half is each tab's own assert to make.
//      ⚠️ It also cures the hidden-panel width bug `/stage/` and `/kit/` both
//      paid for: a component built inside a closed panel measures 0 wide. Here
//      a tab is only ever built into a panel that is on screen, except through
//      `ensure()`, which says so.
//   2  🔴 EACH TAB HAS ITS OWN REPORT, `createReport` from `shell.mjs`, with the
//      readout the module declares and its own log, placed under the tab's
//      blocks. The page itself mounts with `readout: null, showLog: false`:
//      one log per tab, because a line about ARRIVAL under the AFTER tab is a
//      line nobody can place.
//   3  🔴 CHECKS RUN ONLY FROM THE PAGE'S ONE `SELFCHECK` PASS, `page.check()`,
//      awaited BEFORE `d.ready()`. It opens each tab in turn, runs its
//      `check`, drills every bar it declared, and puts the page back on the
//      tab it found. DECIDED, and the reason: a check reaches a tab that is not
//      open by OPENING it, not by building it in the dark, because half of what
//      a tab checks is layout and keys, and a closed panel has no width and
//      takes no key. That switch is visible, and it is allowed to be, because
//      the pass runs only under `?selfcheck=1` where nobody is watching
//      (`positron-verify`: a self-check never runs for a visitor). Before
//      `ready` and not after, because the harness drills the published bar
//      the moment `ready` is true and a tab switch under it would race it.
//   4  🔴 A TAB'S CONTROLS NEVER GO IN `.pos-controls`. The harness presses that
//      row by position across the whole document, so a button in a closed tab
//      would be pressed blind and every control after it would move. A tab's
//      buttons go in its own blocks, and its checks press them.
//   5  🔴 THE HASH SELECTS THE TAB, `/sync/#arrival`, through `tabs.mjs`, which
//      already reads and writes it. `hash: false` only for a specimen inside a
//      page that owns its own hash (`/kit/`).
//   6  🔴 A TAB SAYS WHAT IT IS IN ONE FIXED BOX UNDER THE ROW, NOT AT THE TOP
//      OF ITS PANEL. Asked 2026-10-05: *"do critical user experience review of
//      new demost with many tabs. its hard to understand what they do. have a
//      fixed height descriptions under tabs to explain. rm top desriptions"*.
//      The text is the module's `export const about = '...'`, or `about` on
//      the page's tab entry, and THE ENTRY WINS, so a page can reword a module
//      it borrows without editing it. One or two short sentences: what you are
//      looking at and what to press.
//      ⚠️ ONE BOX FOR THE PAGE, SWAPPED ON A TAB CHANGE, AND IT NEVER CHANGES
//      HEIGHT (positron-compose §7: anything that changes lives in a fixed box
//      sized from the widest thing it can say). Every tab's text is in the box
//      at once, stacked in ONE grid cell, and only the open tab's is visible,
//      so the cell is as tall as the longest of them AT THE CURRENT WIDTH, a
//      phone included, with no number typed and nothing measured in script.
//      Switching tabs therefore moves nothing below the box. The check pass
//      asserts it: the box's height and the panels' top are read on every tab
//      and must not differ.
//      ⚠️ EMPTY PAINTS NOTHING. A page none of whose tabs carries an `about`
//      gets no box at all; a tab with none shows blank inside the reserve,
//      because the reserve is what keeps the panel still.
//
// AND TWO THINGS THE OTHER SHARED FILES DO FOR IT, SAME DAY:
//   - every panel here carries `data-own-keys`, and `transport-bar.mjs` sends no
//     key to a bar inside one that is hidden, so space on SCHEDULE does not
//     start BEAT's deck three tabs away;
//   - `bar-drill.mjs` runs the harness's transport drill against each bar a tab
//     returns, as page asserts, because `verify.mjs` drills only the published
//     one.
//
// WHY A HELPER AND NOT A RECIPE: the lazy build, the per-tab report, the hide
// and show calls and the check pass are about sixty lines that would be typed
// four times and would differ in the one place each page got wrong. `/stage/`
// already shows the shape by hand (its own `onPick`, its own `refit`, its own
// tab walk in the checks) and is left as it is.

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
   * Build a tab if it has not been. ⚠️ CALLED ON A CLOSED TAB IT BUILDS INTO A
   * PANEL WITH NO WIDTH, so anything that measures itself at build reads 0.
   * The page and the check pass never do that; it is here for a check that
   * needs a tab's handle without showing it.
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

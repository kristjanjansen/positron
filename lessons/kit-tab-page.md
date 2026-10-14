# Kit lessons: tab-page.mjs

The long comments cut from `demo/shell/tab-page.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-tab-page.md#<anchor>`.

<a id="header"></a>

## tab-page.mjs, file header, the six rules

demo/shell/tab-page.mjs: one page made of several old pages, one per tab.

🔴 WHY THIS EXISTS. Decided by the owner 2026-10-04: twenty demos regroup into
four tabbed pages, `/sync/` (ARRIVAL, AHEAD, FOLLOW, AFTER), `/time/`
(SCHEDULE, BEAT, LOOPS, SCORE, DATES), `/wire/` (BYTES, NOTES) and
`/capture/` (TAKES, SEGMENTS, ROUND TRIP, FAR END), with no redirects.
`plans/plan-demo-structure.md` §3 and §5 step 1. Four pages doing the same
five things by hand is four versions of them, and the five things are the
rules below, so they live here once.

THE CONVENTION. A tab is the old page's body moved into a module beside the
new page (`demo/sync/arrival.mjs`), exporting `build(ctx)` and, optionally,
`readout` and `about` (rule 6). The page lists its tabs and this does the rest:

  1  🔴 NOTHING IS BUILT FOR A TAB NOBODY OPENED. A tab's `build` runs the
     first time its tab is shown, by a press, by the hash, or by the check
     pass. So a relay join, a fetch or a media element in a tab nobody
     picked cannot happen, because the code that would do it has not run.
     ⚠️ AND `build` ITSELF OPENS NOTHING EITHER. Building the tab that is
     open on load is part of a visit, and *"a visit, a step and a scrub must
     open nothing"* (CLAUDE.md). A join waits for the first press in its own
     tab. The check pass asserts the first half (only the open tab was built
     before it ran); the second half is each tab's own assert to make.
     ⚠️ It also cures the hidden-panel width bug `/stage/` and `/kit/` both
     paid for: a component built inside a closed panel measures 0 wide. Here
     a tab is only ever built into a panel that is on screen, except through
     `ensure()`, which says so.
  2  🔴 EACH TAB HAS ITS OWN REPORT, `createReport` from `shell.mjs`, with the
     readout the module declares and its own log, placed under the tab's
     blocks. The page itself mounts with `readout: null, showLog: false`:
     one log per tab, because a line about ARRIVAL under the AFTER tab is a
     line nobody can place.
  3  🔴 CHECKS RUN ONLY FROM THE PAGE'S ONE `SELFCHECK` PASS, `page.check()`,
     awaited BEFORE `d.ready()`. It opens each tab in turn, runs its
     `check`, drills every bar it declared, and puts the page back on the
     tab it found. DECIDED, and the reason: a check reaches a tab that is not
     open by OPENING it, not by building it in the dark, because half of what
     a tab checks is layout and keys, and a closed panel has no width and
     takes no key. That switch is visible, and it is allowed to be, because
     the pass runs only under `?selfcheck=1` where nobody is watching
     (`positron-verify`: a self-check never runs for a visitor). Before
     `ready` and not after, because the harness drills the published bar
     the moment `ready` is true and a tab switch under it would race it.
  4  🔴 A TAB'S CONTROLS NEVER GO IN `.pos-controls`. The harness presses that
     row by position across the whole document, so a button in a closed tab
     would be pressed blind and every control after it would move. A tab's
     buttons go in its own blocks, and its checks press them.
  5  🔴 THE HASH SELECTS THE TAB, `/sync/#arrival`, through `tabs.mjs`, which
     already reads and writes it. `hash: false` only for a specimen inside a
     page that owns its own hash (`/kit/`).
  6  🔴 A TAB SAYS WHAT IT IS IN ONE FIXED BOX UNDER THE ROW, NOT AT THE TOP
     OF ITS PANEL. Asked 2026-10-05: *"do critical user experience review of
     new demost with many tabs. its hard to understand what they do. have a
     fixed height descriptions under tabs to explain. rm top desriptions"*.
     The text is the module's `export const about = '...'`, or `about` on
     the page's tab entry, and THE ENTRY WINS, so a page can reword a module
     it borrows without editing it. One or two short sentences: what you are
     looking at and what to press.
     ⚠️ ONE BOX FOR THE PAGE, SWAPPED ON A TAB CHANGE, AND IT NEVER CHANGES
     HEIGHT (positron-compose §7: anything that changes lives in a fixed box
     sized from the widest thing it can say). Every tab's text is in the box
     at once, stacked in ONE grid cell, and only the open tab's is visible,
     so the cell is as tall as the longest of them AT THE CURRENT WIDTH, a
     phone included, with no number typed and nothing measured in script.
     Switching tabs therefore moves nothing below the box. The check pass
     asserts it: the box's height and the panels' top are read on every tab
     and must not differ.
     ⚠️ EMPTY PAINTS NOTHING. A page none of whose tabs carries an `about`
     gets no box at all; a tab with none shows blank inside the reserve,
     because the reserve is what keeps the panel still.

AND TWO THINGS THE OTHER SHARED FILES DO FOR IT, SAME DAY:
  - every panel here carries `data-own-keys`, and `transport-bar.mjs` sends no
    key to a bar inside one that is hidden, so space on SCHEDULE does not
    start BEAT's deck three tabs away;
  - `bar-drill.mjs` runs the harness's transport drill against each bar a tab
    returns, as page asserts, because `verify.mjs` drills only the published
    one.

WHY A HELPER AND NOT A RECIPE: the lazy build, the per-tab report, the hide
and show calls and the check pass are about sixty lines that would be typed
four times and would differ in the one place each page got wrong. `/stage/`
already shows the shape by hand (its own `onPick`, its own `refit`, its own
tab walk in the checks) and is left as it is.

<a id="ensure"></a>

## tab-page.mjs, `ensure()`

Build a tab if it has not been. ⚠️ CALLED ON A CLOSED TAB IT BUILDS INTO A
PANEL WITH NO WIDTH, so anything that measures itself at build reads 0.
The page and the check pass never do that; it is here for a check that
needs a tab's handle without showing it.

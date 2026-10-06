// demo/shell/kit-page.mjs, the scaffolding every `/kit/<part>/` page stands on.
//
// 🔴 ONE PAGE PER PART, 2026-10-06. Asked as *"for ui, we are pressing limits
// of tabs in kit page. for your testing you have page size issue. i am
// proposing split page up to separate ones, link from frontpage cards"*, then
// *"no link to #, separate /kit/x pages"*, and planned in
// `plans/plan-kit-split.md`. `/kit/` was 13,600 lines in one file with eight
// tabs; each part is now a page of its own at `/kit/<part>/`, and what every
// one of those pages did the same way lives here once.
//
// ⚠️ WHAT MOVED HERE, AND IT IS THE PART OF `/kit/` THAT WAS NOT A BLOCK:
//   - `section(title, note, src, build, { bare })`, the same function less its
//     first argument, because a page holds one part and has nothing to name;
//   - `out(t)`, the box's footer line;
//   - the page level checks that every part ran in the monolith (every block
//     built, nothing drags the page sideways, two blocks keep the one gap, the
//     newest block is first, every block has an address) in `checkPage()`;
//   - landing on a block named in the address, which the tab row used to do.
// ⚠️ WHAT DID NOT MOVE, BECAUSE A PAGE WITH ONE PART HAS NO USE FOR IT: the tab
// row, `GROUPS`, the measuring window (`measure()`, `settle()`, `paintedOpen`
// and the `.kit-measuring` rule) and the asserts about them. The window
// existed only because a closed tab has no width, and a part page has no
// closed tab. With it goes the one argument ever made for running a check for
// a visitor here, so EVERY check, the page level ones included, is behind
// `?selfcheck=1` (CLAUDE.md: a self-check never runs for a visitor).
// ⚠️ `/kit/` ITSELF IS UNCHANGED UNTIL STEP 4 OF THE PLAN and keeps its own
// copy of all of this.

import { mount, el } from './shell.mjs';
import { createStack } from './stack.mjs';
import { idFor, partRow } from './kit-parts.mjs';

export { idFor };

/**
 * `part` is the row name in `kit-parts.mjs` and the slug's second half: the
 * page mounts as `kit/<part>`, which is its manifest row's name, because
 * `verify.mjs` asserts the two are the same. `what` is the one sentence under
 * the title. `controls` goes to `mount()` unchanged, for the one part that
 * has a control row (HARDWARE's start).
 */
export function createKitPage({ part, what, controls = [] }) {
  /* `readout: null` because the subject here is the controls themselves. Every
     readout on these pages is a SPECIMEN rather than the page's own
     instrument (the monolith's mount carries the whole argument). */
  const d = mount({ name: `kit/${part}`, what, readout: null, controls });
  const body = d.el;
  const stack = createStack(body);
  const out = (t) => { const o = el('div', 'kit-out', t); return o; };
  // What every section reports about itself, for the checks at the bottom.
  const built = [];
  const failed = [];

  /**
   * 🔴 A SECTION THAT THROWS IS THE DEFECT THIS PAGE EXISTS TO FIND, so it is
   * caught and RECORDED rather than allowed to stop the page. A component that
   * will not build takes every block below it with it when the error escapes,
   * which turns one broken control into a blank page and hides which one it
   * was. Both lists are asserted at the bottom.
   *
   * 🔴 `bare`: NO BOX, NO READOUT, THE SPECIMENS ARE BLOCKS OF THE PAGE. Asked
   * 2026-09-26 about the PANEL part: *"don't wrap things in another wrappers
   * because instruments are already wrappers so it's unnecessary. information
   * footer is unnecessary. let the panels be the panels just extending to the
   * layout"*. An instrument panel has a border and a ground of its own; a
   * `.kit-box` round it is a bordered box round a bordered box, which is the
   * doubled edge `.pos-glue` and `.pos-report` both exist to avoid, one level
   * up. So `build` is handed `add` instead of a box, and every block it adds is
   * a child of the page's own stack, spaced by the page's one rhythm with
   * nothing typed.
   */
  function section(title, note, src, build, { bare = false } = {}) {
    // 🔴 ONE ELEMENT PER SECTION, WHICH IS WHAT A STACK ASKS FOR. These four
    // used to be four children of the page, and a stack puts the project's one
    // gap between every pair of its children, so a title would have stood
    // 40 px away from the sentence explaining it. A heading, its note, its
    // snippet and its specimen are one block; the air belongs BETWEEN blocks.
    // See demo/shell/stack.mjs.
    const sec = el('section', 'kit-sec');
    sec.id = idFor(title);
    stack.add(sec);
    sec.append(el('h2', 'kit-h', title));
    if (note) sec.append(el('p', 'kit-n', note));
    if (src) sec.append(el('pre', 'kit-src', src));
    const box = bare ? null : el('div', 'kit-box');
    if (box) sec.append(box);
    const add = (...blocks) => stack.add(...blocks);
    try { build(bare ? add : box); built.push(title); }
    catch (e) {
      failed.push(`${title}: ${e.message}`);
      (box || sec).append(el('div', 'kit-cut', `this block did not build: ${e.message}`));
      d.log(`${title} did not build: ${e.message}`, 'bad');
    }
  }

  /**
   * 🔴 A LINK TO A BLOCK LANDS ON THE BLOCK. Every section has an id off its
   * title, so `/kit/<part>/#slider` scrolls to it. It is not a check, it is
   * what a reader following a link gets, so it runs for everybody. Call it
   * once, after the last block is built.
   */
  function land() {
    const wanted = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (wanted) document.getElementById(wanted)?.scrollIntoView({ block: 'start' });
  }

  /**
   * The checks every part page makes about itself, moved out of the foot of
   * the monolith. Call it from inside the page's own `if (SELFCHECK)`, after
   * the page's first painted frame, before `d.ready()`.
   */
  function checkPage() {
    d.assert('every block on this page built',
      built.length > 0 && failed.length === 0,
      failed.length ? `${failed.length} did not: ${failed.join(', ')}`
                    : `${built.length} blocks, none threw`);

    // 🔴 NOTHING DRAGS THE PAGE SIDEWAYS. `min-width: 0` missing from a
    // scrolling row makes it push the whole document instead of scrolling inside
    // itself: MEASURED at 390 px, a tabs row produced 141 px of page overflow.
    // The document, not the element, is the thing to measure, because the element
    // looks fine in exactly the case that is broken.
    const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    d.assert('no block drags the page sideways',
      over <= 0,
      over <= 0 ? `${document.documentElement.clientWidth} px wide, nothing overflowing`
                : `${over} px of horizontal overflow`);

    /* 🔴 THE BLOCKS KEEP THE PROJECT'S ONE GAP. In the monolith this was
       measured between the sections of the open tab; here the page's own stack
       holds them, so it is every pair of neighbours in `.pos-body`, a `bare`
       block's specimens included, against `--pos-gap` read off the root rather
       than typed here. A part with one child has no gap and says so. */
    {
      const want = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--pos-gap'));
      const kids = [...body.children].filter((k) => getComputedStyle(k).display !== 'none');
      const gaps = kids.slice(1).map((k, i) => +(k.getBoundingClientRect().top
        - kids[i].getBoundingClientRect().bottom).toFixed(1));
      const worst = gaps.length ? Math.max(...gaps.map((g) => Math.abs(g - want))) : -1;
      d.assert('two blocks on this page sit the project’s one gap apart',
        body.classList.contains('pos-stack') && (kids.length === 1 || (gaps.length >= 1 && worst <= 0.5)),
        kids.length === 1 ? 'one block, so there is no gap between two to measure'
          : `${gaps.length} gap(s) against --pos-gap ${want} px, worst ${worst} px out`);
    }

    // The newest block is the first call to `section()`, which is the order of
    // the file, and it has to be the first block on the page.
    {
      const first = body.querySelector(':scope > .kit-sec')?.id || null;
      d.assert('the newest block is the first one on the page',
        !!built[0] && first === idFor(built[0]),
        `${built[0]} is the newest block and the first on the page is ${first}`);
    }

    /* 🔴 EVERY BLOCK HAS AN ADDRESS, AND THE ADDRESSES ARE THE MAP'S. The map
       in `kit-parts.mjs` is what the forwarder at `/kit/` sends an old link
       by, so it is a second copy of what this page builds, and a second copy
       is graded against the first: same ids, same order, each one resolving
       to exactly one element on this page.
       ⚠️ AND THE NEGATIVE HALF: a name no block has resolves to nothing. */
    {
      const ids = built.map(idFor);
      const row = partRow(part);
      const want = row ? row.ids : [];
      const unresolved = ids.filter((id) => document.querySelectorAll(`[id="${id}"]`).length !== 1);
      d.assert('every block has an address, and the addresses are this part’s row in kit-parts.mjs',
        ids.length > 0 && ids.join(' ') === want.join(' ') && unresolved.length === 0
          && !document.getElementById('no-such-block'),
        unresolved.length ? `${unresolved.length} with no single element: ${unresolved.join(', ')}`
          : ids.join(' ') === want.join(' ') ? `${ids.length} addresses, the same ${want.length} in the same order`
            : `built ${ids.join(' ')}, the map says ${want.join(' ')}`);
    }
  }

  return { d, body, stack, out, section, built, failed, land, checkPage };
}

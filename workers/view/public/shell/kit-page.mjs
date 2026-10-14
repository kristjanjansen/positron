// demo/shell/kit-page.mjs: the scaffolding every /kit/<part>/ page stands on: `section()`, `out()`,
// landing on a block named in the address, and the page level checks in `checkPage()`.
// Every check is behind `?selfcheck=1`.
// why: lessons/kit-kit-page.md#header

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
  // back to the kit, saying so
  // why: lessons/kit-kit-page.md#backlink
  const d = mount({ name: `kit/${part}`, what, readout: null, controls, index: '/kit/', indexLabel: 'kit' });
  // The heading is the part alone; `__demo.name`, `document.title` and the feedback slug keep
  // `kit/<part>`, the identity verify.mjs checks against the manifest.
  // why: lessons/kit-kit-page.md#heading
  const h1 = d.head.querySelector('.pos-name');
  if (h1) h1.textContent = part;
  const body = d.el;
  const stack = createStack(body);
  const out = (t) => { const o = el('div', 'kit-out', t); return o; };
  // What every section reports about itself, for the checks at the bottom.
  const built = [];
  const failed = [];

  /**
   * A section that throws is caught and recorded, not allowed to blank the page; both lists are asserted.
   * `bare`: no box, `build` gets `add` and its blocks join the page's own stack, for panels that
   * already have their own border.
   * why: lessons/kit-kit-page.md#section
   */
  function section(title, note, src, build, { bare = false } = {}) {
    // One element per section, as a stack asks: title, note, snippet and specimen are one block,
    // and the air belongs between blocks (stack.mjs).
    // why: lessons/kit-kit-page.md#section-element
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
   * A link to a block lands on the block, for everybody; call once after the last block.
   * why: lessons/kit-kit-page.md#land
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

    // Nothing drags the page sideways; measure the document, since the element looks fine when broken.
    // Measured at 390 px: a tabs row without `min-width: 0` made 141 px of page overflow.
    // why: lessons/kit-kit-page.md#overflow
    const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    d.assert('no block drags the page sideways',
      over <= 0,
      over <= 0 ? `${document.documentElement.clientWidth} px wide, nothing overflowing`
                : `${over} px of horizontal overflow`);

    // Every pair of neighbours in `.pos-body` keeps `--pos-gap`, read off the root.
    // why: lessons/kit-kit-page.md#one-gap
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

    // Every block's id matches `kit-parts.mjs`, in order, each resolving to one element;
    // a name no block has resolves to nothing.
    // why: lessons/kit-kit-page.md#addresses
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

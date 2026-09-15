// demo/shell/card.mjs — a link with room in it: a title, a line about what is
// behind it, and the tags that say what it needs.
//
// 🔴 WHY A COMPONENT AND NOT A STYLE ON THE INDEX. The front page's rows are
// the only place in this project where "here is a thing, here is what it is,
// here is what it costs you" has ever been written down, and they are written
// as a template string inside `manifest.mjs`. A second surface that wants the
// same thing — a menu in a headset, a set of links at the end of a demo, a
// contact sheet — would copy that template, and this repo has paid twice for
// exactly that copy: `rowHTML` printed `undefined` over every demo name for an
// afternoon, and `moq.mjs` kept a URL a rename had moved.
//
// ── three decisions that are not taste ────────────────────────────────────
//
// **It is SANS, and it is the only control in the kit that is.** Everything
// else here is monospace because the fixed width carries meaning — a value, a
// key, a lane. A card is a sentence about somewhere else; there is nothing in
// it to line up, and monospace prose in a small box reads as a terminal rather
// than as a label. `/kit/`'s own note already makes this argument for its
// paragraphs; this is the same argument for a card.
//
// 🔴 **THE DESCRIPTION IS NOT CLAMPED, AND THAT IS DELIBERATE.** A
// `-webkit-line-clamp` would keep every card the same shape and would truncate
// with an ellipsis — and CLAUDE.md is explicit that *anything that truncates
// with an ellipsis is in the wrong place*: the ellipsis is the signal, not a
// styling problem to widen your way out of. So the box GROWS and the grid makes
// the row match, which means a card that does not fit is visibly a description
// that is too long, where a clamp would have hidden it.
//
// 🔴 **THE FLOOR IS A HEIGHT, NOT A RATIO — MEASURED, AFTER TRYING THE RATIO.**
// A card wants some presence when it has little to say, and `aspect-ratio:
// 16 / 9` is the obvious way to give it some. It is wrong at one extreme and
// invisible at the other: in two columns on a phone a card is ~170 px wide, so
// the ratio asks for 96 px and the content usually needs more — the ratio does
// nothing. In ONE column at 320 px the same rule asks for **180 px of height
// for about 90 px of content**, and the card is half empty. A ratio makes the
// empty space grow with the width, which is exactly backwards: the wider a card
// is, the less height its text needs. `minH` is in pixels and does not scale,
// so it reads the same at every width. ⚠️ `aspect` is still there for a caller
// who wants a shape on purpose — a contact sheet, a row of pictures — and it is
// a FLOOR either way, because `min-height: auto` on a grid item is its content,
// so a card with more to say gets taller instead of spilling.

import { el } from './shell.mjs';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * The card's insides, as a string.
 *
 * 🔴 THIS IS THE ONLY PLACE THE MARKUP EXISTS, AND THAT IS THE WHOLE POINT.
 * The front page's list is baked at BUILD TIME by `workers/view/build.mjs`,
 * which runs in node and has no DOM, while `/kit/` and any page that wants a
 * card build one in the browser. Two renderers for one look is exactly the
 * drift this file was written to stop — `rowHTML` printed `undefined` over
 * every demo name for an afternoon because the index and the manifest each had
 * a copy. So `createCard` below builds its element FROM this string and then
 * wires the buttons on; there is no second set of class names to keep in step.
 *
 * ⚠️ It escapes. Everything that reaches it today is ours, and the first thing
 * that is not would otherwise be an injection in the one page everybody opens.
 */
export function cardInner({ title, desc = '', tags = [], why = '', actions = [], href = '', linkTitle = false }) {
  const t = linkTitle && href
    ? `<a class="pos-card-t" href="${esc(href)}">${esc(title)}</a>`
    : `<span class="pos-card-t">${esc(title)}</span>`;
  const foot = why
    ? `<span class="pos-card-why">${esc(why)}</span>`
    : tags.map((g) => `<span class="pos-card-g">${esc(g)}</span>`).join('');
  const acts = actions.length
    ? `<span class="pos-card-a">${actions.map((a) =>
      `<button type="button">${esc(a.label)}</button>`).join('')}</span>`
    : '';
  return `${t}<span class="pos-card-d">${esc(desc)}</span>`
    + `<span class="pos-card-f">${foot}${acts}</span>`;
}

/**
 * A whole card as a string, for a page that is assembled rather than scripted.
 * `attrs` is passed through verbatim onto the outer element — the index uses it
 * for `data-needs`, which `caps.mjs` reads in the browser afterwards.
 */
export function cardHTML(o = {}) {
  const linkable = o.href && !(o.actions || []).length;
  const tag = linkable ? 'a' : 'div';
  const open = `<${tag} class="pos-card${o.cls ? ' ' + o.cls : ''}"`
    + (linkable ? ` href="${esc(o.href)}"` : '')
    + (o.why ? ' data-off="1"' : '')
    + (o.minH === 0 ? '' : ` style="min-height:${o.minH ?? 108}px"`)
    + (o.attrs || '') + '>';
  return `${open}${cardInner({ ...o, linkTitle: !linkable })}</${tag}>`;
}

/**
 * @param {object} o
 * @param {string} o.title      the name of the thing. Shown top left.
 * @param {string} [o.desc]     one short line about it. Keep it short — see the
 *                              header: nothing truncates it, so a long one just
 *                              makes its card taller than its neighbours.
 * @param {string[]} [o.tags]   shown along the bottom.
 * @param {string} [o.href]     makes the whole card the link. Without it the
 *                              card is a plain box that does nothing, which is
 *                              what `/kit/` wants and what a disabled row wants.
 * @param {number} [o.minH]     the least tall it may be, in px. Width-
 *                              independent on purpose — see the header.
 * @param {string} [o.aspect]   CSS aspect ratio instead, for a caller who wants
 *                              a shape rather than a floor. Off by default.
 * @param {Array<{label: string, onPress: Function, title?: string}>} [o.actions]
 *                              buttons along the bottom right.
 *                              🔴 A CARD WITH BUTTONS CANNOT BE A LINK-SHAPED
 *                              CARD, and that is a fact about HTML rather than
 *                              a preference: a `<button>` inside an `<a>` is
 *                              invalid, and browsers resolve it by making the
 *                              press ambiguous — you get the link, the button,
 *                              or both, depending on where the pointer went
 *                              down. So passing `actions` moves the link onto
 *                              the TITLE and leaves the box inert. The card
 *                              still goes somewhere; it just stops being one
 *                              big target with smaller targets inside it.
 * @param {string} [o.why]      why this one is not a link. Replaces the tags,
 *                              in the warning colour — because a row that
 *                              simply vanishes says the thing does not exist,
 *                              which is a different and false statement
 *                              (`caps.mjs` makes the same argument).
 */
export function createCard({ title, desc = '', tags = [], href = '', minH = 108,
  aspect = '', why = '', actions = [] } = {}) {
  const linkIsTitle = actions.length > 0;
  const wrap = el(href && !linkIsTitle ? 'a' : 'div', 'pos-card');
  if (href && !linkIsTitle) { wrap.href = href; }
  if (aspect) wrap.style.aspectRatio = aspect;
  else if (minH) wrap.style.minHeight = `${minH}px`;
  if (why) wrap.dataset.off = '1';

  // ⚠️ BUILT FROM `cardInner`, NOT BESIDE IT. The buttons are the only thing a
  // string cannot carry, so they are wired on after — everything else, down to
  // the class names, comes from the one renderer the build also uses.
  // ⚠️ AND THE BUTTONS ARE PUSHED RIGHT, NOT PUT ON THEIR OWN LINE. Tags say
  // what a thing needs and buttons say what you can do to it; they read as one
  // list the moment they share a left edge.
  function drawFoot() {
    wrap.innerHTML = cardInner({ title, desc, tags, why, actions, href, linkTitle: linkIsTitle });
    const bs = wrap.querySelectorAll('.pos-card-a button');
    actions.forEach((a, i) => {
      const b = bs[i];
      if (!b) return;
      if (a.title) b.title = a.title;
      b.addEventListener('click', (ev) => { ev.preventDefault(); a.onPress?.(ev); });
    });
  }
  drawFoot();
  const t = { set textContent(v) { wrap.querySelector('.pos-card-t').textContent = v; } };
  const dEl = { set textContent(v) { wrap.querySelector('.pos-card-d').textContent = v; } };

  return {
    el: wrap,
    set(o = {}) {
      if (o.title != null) t.textContent = o.title;
      if (o.desc != null) dEl.textContent = o.desc;
      if (o.tags) { tags = o.tags; drawFoot(); }
      if (o.why != null) { why = o.why; wrap.dataset.off = why ? '1' : ''; drawFoot(); }
    },
  };
}

/**
 * The rows the cards sit in.
 *
 * 🔴 `minmax(min(100%, N), 1fr)` AND NOT `minmax(N, 1fr)`. A bare `minmax` with
 * a floor wider than the screen does not fall back to one column — it makes a
 * COLUMN WIDER THAN THE PAGE, and the whole document then scrolls sideways.
 * That is the same defect `tabs.mjs` shipped and `/kit/` caught: at 390 px a
 * row measured 500 px wide with 141 px of page overflow. `min(100%, N)` is the
 * one-line fix and it is why a phone can never be made to scroll by a card.
 *
 * ⚠️ AND THE CARD ITSELF NEEDS `min-width: 0`, IN THE STYLESHEET. A grid item's
 * automatic minimum size is its CONTENT, so one long unbroken word in a title
 * widens the column past the track it was given — with the same result.
 *
 * @param {object} o
 * @param {number} [o.min]   the narrowest a card may get, in px. 190 gives two
 *                           columns on every phone anyone owns (measured from
 *                           iPhone SE's 375 up) and four on a laptop.
 */
export function createCardGrid({ min = 190, gap = 10 } = {}) {
  const wrap = el('div', 'pos-cards');
  wrap.style.setProperty('--card-min', `${min}px`);
  wrap.style.setProperty('--card-gap', `${gap}px`);
  return {
    el: wrap,
    add(card) { wrap.append(card.el ?? card); return card; },
    addAll(cards) { for (const c of cards) this.add(c); return cards; },
  };
}

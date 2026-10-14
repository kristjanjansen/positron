// demo/shell/card.mjs: a link with room in it: a title, a line about what is behind it, its tags.
// Sans, unlike the rest of the kit. The description is never clamped, so a long one shows.
// The floor is `minH` in px, not an aspect ratio, which leaves a one-column card half empty.
// why: lessons/kit-card.md#header

import { el } from './shell.mjs';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * The card's insides, as a string, and the only place the markup exists: the build bakes the
 * front page in node with no DOM, and `createCard` builds from this too. It escapes.
 * why: lessons/kit-card.md#cardinner
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
 * @param {string} [o.desc]     one short line; nothing truncates it.
 * @param {string[]} [o.tags]   shown along the bottom.
 * @param {string} [o.href]     makes the whole card the link; without it a plain box.
 * @param {number} [o.minH]     the least tall it may be, in px, width-independent.
 * @param {string} [o.aspect]   CSS aspect ratio instead. Off by default.
 * @param {Array<{label: string, onPress: Function, title?: string}>} [o.actions]
 *                              buttons bottom right; they move the link onto the title,
 *                              because a `<button>` inside an `<a>` is invalid HTML.
 * @param {string} [o.why]      why this one is not a link. Replaces the tags, in warning colour.
 * why: lessons/kit-card.md#createcard
 */
export function createCard({ title, desc = '', tags = [], href = '', minH = 108,
  aspect = '', why = '', actions = [] } = {}) {
  const linkIsTitle = actions.length > 0;
  const wrap = el(href && !linkIsTitle ? 'a' : 'div', 'pos-card');
  if (href && !linkIsTitle) { wrap.href = href; }
  if (aspect) wrap.style.aspectRatio = aspect;
  else if (minH) wrap.style.minHeight = `${minH}px`;
  if (why) wrap.dataset.off = '1';

  // Built from `cardInner`; the buttons are wired on after, pushed right on the tags' line.
  // why: lessons/kit-card.md#drawfoot
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
 * The rows the cards sit in. `minmax(min(100%, N), 1fr)`, since a bare floor wider than the
 * screen makes a column wider than the page. The card also needs `min-width: 0` in the stylesheet.
 * @param {object} o
 * @param {number} [o.min]   the narrowest a card may get, in px. 190 gives two columns from 375 px.
 * why: lessons/kit-card.md#createcardgrid
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

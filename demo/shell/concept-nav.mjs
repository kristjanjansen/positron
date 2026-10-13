// demo/shell/concept-nav.mjs: previous and next links in a concept page's header,
// on the same line as `← concepts`, walking the order in concept-list.mjs.
// `← concepts` goes to the front page, which is the concepts index since
// 2026-10-13 (*"move concepts to frontpage"*), and every link here is a
// /<group>/<slug>/ address, never a number.
import { el } from '/shell/shell.mjs';
import { CONCEPTS } from './concept-list.mjs';

// How many lines a concept page's code box shows before it scrolls, one number
// for every page. Asked 2026-10-12: *"too little h. fix is something sensible
// on all code wins"*, after half of each page's own count left four lines.
// Then 2026-10-13: *"make code boxes 1/3 less h"*: 14 to 9 lines.
export const CODE_ROWS = 9;

export function conceptNav(id) {
  const head = document.querySelector('.pos-head');
  const back = head?.querySelector('.pos-back');
  if (!head || !back) return;
  const i = CONCEPTS.findIndex((c) => c.id === id);
  // A page that is off the index (/room/patch-from-words/) has no place in the
  // order, so no pager: CONCEPTS[-1 + 1] used to offer it the first card as `next`.
  const prev = i < 0 ? null : CONCEPTS[i - 1], next = i < 0 ? null : CONCEPTS[i + 1];
  // The heading is the concept's title from concept-list.mjs, never a number.
  // Asked 2026-10-12: *"use real title. rm numbers from titles and <> pagers"*.
  const me = CONCEPTS[i];
  const h1 = head.querySelector('.pos-name');
  if (me && h1) { h1.textContent = me.title; document.title = me.title; }
  // The card's description under the title, on every concept page, from the
  // one list the cards read. Asked 2026-10-12: *"Add convepts descs under each
  // concept totle in each concept page"*. A page that set its own `what` keeps it.
  if (me?.say && !head.querySelector('.pos-what')) head.append(el('p', 'pos-what', me.say));
  const row = el('div', 'cc-nav');
  back.replaceWith(row);
  row.append(back);
  const side = el('span', 'cc-nav-pn');
  if (prev) side.append(el('a', 'pos-back', `‹ ${prev.title}`, { href: `/${prev.id}/` }));
  if (next) side.append(el('a', 'pos-back', `${next.title} ›`, { href: `/${next.id}/` }));
  row.append(side);
  if (!document.getElementById('cc-nav-css')) {
    const st = el('style');
    st.id = 'cc-nav-css';
    st.textContent = '.cc-nav { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }'
      + ' .cc-nav-pn { display: flex; gap: 20px; }'
      // Prev and next as the titles are written, bigger, and on a phone their
      // own row right under the back link, spread to both edges. Asked
      // 2026-10-12: *"Move prev next closer to vackling, bigther, sentence
      // case, justify between"*. The row keeps the back link's air under it,
      // so the links inside it give up their own.
      + ' .cc-nav { row-gap: 10px; margin-bottom: 20px; }'
      + ' .cc-nav .pos-back { margin-bottom: 0; }'
      + ' .cc-nav-pn .pos-back { font-size: 13px; letter-spacing: 0; text-transform: none; }'
      + ' @media (min-width: 600px) { .cc-nav { margin-bottom: 30px; } }'
      + ' @media (max-width: 599px) { .cc-nav-pn { flex: 1 1 100%; justify-content: space-between; } }'
      // Code boxes on concept pages: three times the kit field's 7px 9px.
      // Asked 2026-10-12: *"make code win 1/2 less h and add 3x padding. same
      // on other code wins"*; the pages halve their own `rows`.
      // Then *"30% less padding on code boxes. 15% more line height"*: 15px
      // 19px, and the code field's 1.45 times 1.15. MEASURED: the kit sets it
      // in `.pos-field.tall.code textarea` (0,3,1), so this ties that weight
      // and wins by coming later. Then *"5% less lineheight"*: 1.67 to 1.59.
      + ' .pos-code { --field-pad: 15px 19px; }'
      + ' .pos-field.code.pos-code textarea { line-height: 1.59; }';
    document.head.append(st);
  }
}

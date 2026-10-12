// demo/concepts/nav.mjs: previous and next links in a concept page's header,
// on the same line as `← concepts`, walking the order in list.mjs.
import { el } from '/shell/shell.mjs';
import { CONCEPTS } from './list.mjs';

// How many lines a concept page's code box shows before it scrolls, one number
// for every page. Asked 2026-10-12: *"too little h. fix is something sensible
// on all code wins"*, after half of each page's own count left four lines.
export const CODE_ROWS = 14;

export function conceptNav(n) {
  const head = document.querySelector('.pos-head');
  const back = head?.querySelector('.pos-back');
  if (!head || !back) return;
  const i = CONCEPTS.findIndex((c) => c.n === n);
  const prev = CONCEPTS[i - 1], next = CONCEPTS[i + 1];
  // The heading is the concept's title from list.mjs, not `concept <group> <n>`.
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
  if (prev) side.append(el('a', 'pos-back', `‹ ${prev.title}`, { href: `/concepts/${prev.n}/` }));
  if (next) side.append(el('a', 'pos-back', `${next.title} ›`, { href: `/concepts/${next.n}/` }));
  row.append(side);
  if (!document.getElementById('cc-nav-css')) {
    const st = el('style');
    st.id = 'cc-nav-css';
    st.textContent = '.cc-nav { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }'
      + ' .cc-nav-pn { display: flex; gap: 20px; }'
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

// demo/concepts/nav.mjs: previous and next links in a concept page's header,
// on the same line as `← concepts`, walking the order in list.mjs.
import { el } from '/shell/shell.mjs';
import { CONCEPTS } from './list.mjs';

export function conceptNav(n) {
  const head = document.querySelector('.pos-head');
  const back = head?.querySelector('.pos-back');
  if (!head || !back) return;
  const i = CONCEPTS.findIndex((c) => c.n === n);
  const prev = CONCEPTS[i - 1], next = CONCEPTS[i + 1];
  const row = el('div', 'cc-nav');
  back.replaceWith(row);
  row.append(back);
  const side = el('span', 'cc-nav-pn');
  if (prev) side.append(el('a', 'pos-back', `‹ ${prev.n} ${prev.title}`, { href: `/concepts/${prev.n}/` }));
  if (next) side.append(el('a', 'pos-back', `${next.n} ${next.title} ›`, { href: `/concepts/${next.n}/` }));
  row.append(side);
  if (!document.getElementById('cc-nav-css')) {
    const st = el('style');
    st.id = 'cc-nav-css';
    st.textContent = '.cc-nav { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }'
      + ' .cc-nav-pn { display: flex; gap: 20px; }';
    document.head.append(st);
  }
}

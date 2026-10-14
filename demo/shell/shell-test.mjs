// demo/shell/shell-test.mjs: the DOM log's cap and the device-log shipper, with a fake document.
//   node demo/shell/shell-test.mjs
// Four of the 6 are negative controls; what `mount()` draws is graded by the page harnesses.
// why: lessons/kit-shell.md#test-header

let pass = 0, fail = 0, neg = 0;
const ok = (name, cond, detail = '') => {
  if (name.startsWith('NEGATIVE CONTROL')) neg++;
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ', ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ', ' + detail : ''}`); }
};

// Enough of a DOM for addLine(): children, append and remove.
function node() {
  const n = { children: [], className: '', textContent: '', scrollTop: 0, scrollHeight: 0,
    setAttribute() {},
    append(...c) { for (const x of c) { x.parent = n; n.children.push(x); } },
    remove() { const p = n.parent; if (p) p.children.splice(p.children.indexOf(n), 1); },
    get childElementCount() { return n.children.length; },
    get firstElementChild() { return n.children[0] ?? null; } };
  return n;
}
globalThis.document = { createElement: node, visibilityState: 'visible' };
const listeners = {};
globalThis.addEventListener = (type, fn) => { (listeners[type] ||= []).push(fn); };

const { addLine, createShipper } = await import('./shell.mjs');

console.log('\n== the DOM log ==');
{
  const logEl = node();
  for (let i = 0; i < 1000; i++) addLine(logEl, `line ${i}`, 'info', i);
  ok('NEGATIVE CONTROL: the DOM log stops at 400 lines, like __demo.logs', logEl.childElementCount === 400, `${logEl.childElementCount} rows`);
  ok('and keeps the newest', logEl.children.at(-1).children[1].textContent === 'line 999'
    && logEl.children[0].children[1].textContent === 'line 600', logEl.children[0].children[1].textContent);
}

console.log('\n== the device-log shipper ==');
{
  const posted = [], beaconed = [];
  const ship = createShipper('http://x/log', { delayMs: 20, post: (b) => posted.push(b), beacon: (b) => beaconed.push(b) });
  const a = 'fragLoadError on level 2 fragment 1234 of the video track at the live edge: 404';
  const b = 'fragLoadError on level 2 fragment 1234 of the video track at the live edge: 403 refused';
  ship(a); ship(b); ship(b); ship(b);
  await new Promise((r) => setTimeout(r, 60));
  const sent = posted.join('\n');
  ok('NEGATIVE CONTROL: two lines sharing 60 characters both arrive', sent.includes('404') && sent.includes('403 refused'), JSON.stringify(sent));
  ok('NEGATIVE CONTROL: an identical line still collapses, and its count is sent with the batch', /previous line x3/.test(sent), JSON.stringify(sent));

  ship('the last thing before the tab closed');
  for (const fn of listeners.pagehide || []) fn();
  ok('NEGATIVE CONTROL: pagehide sends what is pending by beacon, without waiting 2 s',
    beaconed.join('\n').includes('the last thing before the tab closed'), JSON.stringify(beaconed));
  await new Promise((r) => setTimeout(r, 60));
  ok('and the timer does not send it a second time', !posted.join('\n').includes('the last thing'), JSON.stringify(posted));
}

console.log(`\n${pass} ok, ${fail} failed, ${neg} of them negative controls`);
process.exit(fail ? 1 : 0);

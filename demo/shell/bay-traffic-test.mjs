// demo/shell/bay-traffic-test.mjs: `remove()` takes a wire's row out of the
// traffic layer, against a fake DOM and a hand-driven animation frame.
//
//   node demo/shell/bay-traffic-test.mjs
//
// THE LEAK THIS FILE EXISTS FOR. `patchbay.mjs`'s trace() added a row for
// every link it ever saw and never took one away, so a page that relinks
// read one more row every frame for each link it had dropped (hero.mjs had
// the same growth). A row's `read` is asked once a frame, so a read that is
// still asked after `remove()` is a row that is still there.
//
// FOUR OF THE 10 ARE NEGATIVE CONTROLS, marked `NEGATIVE CONTROL`: a remove
// that took every row, or the wrong view's row, or nothing, fails them.
// MEASURED 2026-10-14: `remove()` without its splice takes 4 red, and one
// that matches on the link id alone, ignoring the view, takes 1 red.

let failed = 0, ok = 0, negative = 0;
const check = (name, pass, detail = '') => {
  if (name.startsWith('NEGATIVE CONTROL')) negative++;
  if (pass) ok++; else failed++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
};

// ── a DOM just big enough for bay-traffic.mjs ─────────────────────────────
class Node {
  constructor(tag) { this.tag = tag; this.attrs = {}; this.style = {}; this.children = []; this.parent = null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  removeAttribute(k) { delete this.attrs[k]; }
  append(...cs) { for (const c of cs) { c.remove(); c.parent = this; this.children.push(c); } }
  prepend(c) { c.remove(); c.parent = this; this.children.unshift(c); }
  after(c) { c.remove(); const p = this.parent; c.parent = p; p.children.splice(p.children.indexOf(this) + 1, 0, c); }
  remove() { if (this.parent) { const cs = this.parent.children; cs.splice(cs.indexOf(this), 1); this.parent = null; } }
  cloneNode() { const c = new Node(this.tag); c.attrs = { ...this.attrs }; c.ownerSVGElement = this.ownerSVGElement; c.getTotalLength = this.getTotalLength; c.getPointAtLength = this.getPointAtLength; return c; }
  get id() { return this.attrs.id; }
}
globalThis.document = { createElementNS: (ns, tag) => new Node(tag) };
let frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); };
const tick = (t) => { const fs = frames; frames = []; for (const f of fs) f(t); };

const { createBayTraffic } = await import('./bay-traffic.mjs');

// a view holding wires, each a path inside one svg
function makeView(ids) {
  const svg = new Node('svg');
  const wires = new Map();
  for (const id of ids) {
    const p = new Node('path');
    p.ownerSVGElement = svg;
    p.getTotalLength = () => 100;
    p.getPointAtLength = (n) => ({ x: n, y: 0 });
    svg.append(p);
    wires.set(id, p);
  }
  return { svg, wires };
}
const counter = () => { const r = () => { r.calls++; return { n: 1, flowing: true }; }; r.calls = 0; return r; };

const traffic = createBayTraffic();
const v1 = makeView(['a', 'b', 'c']), v2 = makeView(['a']);
const reads = { a: counter(), b: counter(), c: counter(), v2a: counter() };
traffic.add(v1, 'a', 'midi', reads.a);
traffic.add(v1, 'b', 'audio', reads.b);
traffic.add(v1, 'c', 'value', reads.c);
traffic.add(v2, 'a', 'midi', reads.v2a);
tick(16);
check('every row is read on a frame', Object.values(reads).every((r) => r.calls === 1), Object.entries(reads).map(([k, r]) => `${k} ${r.calls}`).join(', '));
const defsIn = (svg) => svg.children.filter((c) => c.tag === 'defs').length;
const glowsIn = (svg) => svg.children.filter((c) => c.tag === 'path' && c.attrs.stroke?.startsWith('url(')).length;
const before = { defs: defsIn(v1.svg), glows: glowsIn(v1.svg) };
check('attached rows put their gradients and glows in the picture', before.defs === 3 && before.glows > 3, `${before.defs} defs, ${before.glows} glows`);

const gone = traffic.remove(v1, 'b');
check('remove answers how many rows went', gone === 1, `${gone}`);
check('the layer holds one row fewer', traffic.size() === 3, `${traffic.size()}`);
tick(32);
check('the removed row is not read again', reads.b.calls === 1, `b read ${reads.b.calls} times`);
check('its defs and glow left the picture', defsIn(v1.svg) === 2 && glowsIn(v1.svg) === before.glows - 1, `${defsIn(v1.svg)} defs, ${glowsIn(v1.svg)} glows`);
check('NEGATIVE CONTROL: the other rows of the same view are still read', reads.a.calls === 2 && reads.c.calls === 2, `a ${reads.a.calls}, c ${reads.c.calls}`);
check('NEGATIVE CONTROL: the same link id in another view is still read', reads.v2a.calls === 2, `v2 a ${reads.v2a.calls}`);
check('NEGATIVE CONTROL: removing a wire that is not there removes nothing', traffic.remove(v1, 'zz') === 0 && traffic.size() === 3, `${traffic.size()} rows`);
// a pulse pool's glows go too, not only a stream's one glow
traffic.remove(v1, 'a');
check('NEGATIVE CONTROL: removing an event wire takes its whole pulse pool and leaves the other one\'s', glowsIn(v1.svg) === 8 && defsIn(v1.svg) === 1 && traffic.size() === 2, `${glowsIn(v1.svg)} glows, ${defsIn(v1.svg)} defs, ${traffic.size()} rows`);

console.log(`\n${ok} ok, ${failed} failed (${negative} negative controls)`);
process.exit(failed ? 1 : 0);

// demo/shell/board-test.mjs: createBoard's teardown and audio start, with no
// relay, no Pi and no browser.
//
//   node demo/shell/board-test.mjs
//
// The DOM, the socket and the AudioContext are fakes defined here. What is
// graded is bookkeeping: a closed board leaves no timer running, two
// startAudio() calls share one build, and a failed build is retried.
// THREE OF THE 5 ARE NEGATIVE CONTROLS, written so the bug they name fails them.
// Sound, the worklet and the board's protocol are graded on the remote pages.

let pass = 0, fail = 0, neg = 0;
const ok = (name, cond, detail = '') => {
  if (name.startsWith('NEGATIVE CONTROL')) neg++;
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ', ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ', ' + detail : ''}`); }
};

// Any property of a fake element is a callable fake element, so the badge
// code that builds DOM runs without a document.
const fakeEl = () => new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => '' : (k in t ? t[k] : (t[k] = fakeEl()))),
  set: (t, k, v) => { t[k] = v; return true; },
  apply: () => fakeEl(),
});
globalThis.document = fakeEl();
globalThis.location = { search: '' };
globalThis.window = globalThis;
globalThis.matchMedia = () => ({ matches: true });
class FakeSocket {
  constructor() { this.readyState = 0; }
  close() { this.readyState = 3; this.onclose?.(); }
  send() {}
}
globalThis.WebSocket = FakeSocket;

// Every interval, so a leaked one can be counted.
const live = new Set();
const realSet = globalThis.setInterval, realClear = globalThis.clearInterval;
globalThis.setInterval = (fn, ms, ...a) => { const t = realSet(fn, ms, ...a); live.add(t); return t; };
globalThis.clearInterval = (t) => { live.delete(t); realClear(t); };

let built = 0, failNext = false;
class FakeContext {
  constructor() { built++; this.state = 'running'; this.sampleRate = 48000; this.closed = false;
    this.audioWorklet = { addModule: async () => {
      await new Promise((r) => setTimeout(r, 20));
      if (failNext) { failNext = false; throw new Error('worklet failed to load'); }
    } }; }
  resume() { return Promise.resolve(); }
  close() { this.closed = true; return Promise.resolve(); }
  addEventListener() {}
  createAnalyser() { return { fftSize: 0, connect() {} }; }
  get destination() { return {}; }
}
globalThis.AudioContext = FakeContext;
globalThis.AudioWorkletNode = class { constructor() { this.port = { postMessage() {}, onmessage: null }; } connect() {} };

const { createBoard } = await import('./board.mjs');

console.log('\n== close() ==');
{
  const before = live.size;
  const b = createBoard({ room: 'board-test-room', relay: 'ws://127.0.0.1:1' });
  ok('a board runs intervals while open', live.size > before, `${live.size - before} running`);
  b.close();
  ok('NEGATIVE CONTROL: close() leaves no interval running', live.size === before, `${live.size - before} left`);
}

console.log('\n== startAudio() ==');
{
  built = 0;
  const b = createBoard({ room: 'board-test-room', relay: 'ws://127.0.0.1:1' });
  // The playout is read the moment each caller resumes: a second caller handed
  // the context before the worklet loaded finds none, and holdSource throws.
  const got = (c) => ({ c, playout: b.playout() });
  const [x, y] = await Promise.all([b.startAudio().then(got), b.startAudio().then(got)]);
  ok('NEGATIVE CONTROL: two calls at once share one build, and neither resumes before the playout exists',
    built === 1 && x.c && x.c === y.c && x.playout && y.playout,
    `${built} built, playout ${!!x.playout} and ${!!y.playout}`);
  b.close();

  built = 0; failNext = true;
  const c = createBoard({ room: 'board-test-room', relay: 'ws://127.0.0.1:1' });
  const first = await c.startAudio().catch(() => 'threw');
  ok('a failed worklet load answers null', first === null);
  const second = await c.startAudio().catch(() => null);
  ok('NEGATIVE CONTROL: the next call builds again and gets a playing context', second && c.playout() && built === 2,
    `${built} built, playout ${!!c.playout()}`);
  c.close();
}

console.log(`\n${pass} ok, ${fail} failed, ${neg} of them negative controls`);
process.exit(fail ? 1 : 0);

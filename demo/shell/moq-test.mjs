// demo/shell/moq-test.mjs (node demo/shell/moq-test.mjs): startMoq's stop and moq-audio's bounded
// stats, on a fake @moq client whose catalog never arrives. 3 of 4 are negative controls.
// Frames, codecs and latency are graded on /video/moq/ against the real relay.
// why: lessons/kit-moq.md#test-header
import { register } from 'node:module';

let pass = 0, fail = 0, neg = 0;
const ok = (name, cond, detail = '') => {
  if (name.startsWith('NEGATIVE CONTROL')) neg++;
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ', ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ', ' + detail : ''}`); }
};

// `/moq/moq-vendor.js` resolves to a fake that hands out whatever globalThis.__fakeMoq holds.
const fake = `export const Connection = { connect: (...a) => globalThis.__fakeMoq.connect(...a) };
export const Path = { from: (s) => s };
export const Broadcast = { Producer: class {} };
export const Container = {};`;
register(`data:text/javascript,${encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if (spec === '/moq/moq-vendor.js') return { url: 'data:text/javascript,' + ${JSON.stringify(encodeURIComponent(fake))}, shortCircuit: true };
  return next(spec, ctx);
}`)}`);

const canvas = () => ({ width: 0, height: 0, style: {}, getContext: () => ({}) });
globalThis.document = { createElement: canvas };
let conns = 0, closedConns = 0;
globalThis.__fakeMoq = {
  connect: async () => {
    conns++;
    return {
      version: 'fake',
      close() { closedConns++; },
      consume: () => ({ subscribe: () => ({ nextGroup: () => new Promise(() => {}), closed: new Promise(() => {}), close() {} }) }),
    };
  },
};

const { startMoq } = await import('./moq.mjs');

console.log('\n== startMoq: Stop during the wait for the catalog ==');
{
  const ac = new AbortController();
  const t0 = performance.now();
  const started = startMoq({ out: canvas(), ns: 'moq-test', role: 'watch', signal: ac.signal });
  setTimeout(() => ac.abort(), 100);
  const r = await Promise.race([started.then(() => 'returned'), new Promise((res) => setTimeout(() => res('still waiting'), 1500))]);
  ok('NEGATIVE CONTROL: aborting during the catalog wait returns at once', r === 'returned',
    `${r} after ${Math.round(performance.now() - t0)} ms`);
  ok('NEGATIVE CONTROL: and closes the relay connection', closedConns === conns, `${closedConns} of ${conns} closed`);
}

console.log('\n== subscribeSynth: transit samples are bounded ==');
{
  const { subscribeSynth, MOQ_AUDIO_KEEP } = await import('./moq-audio.mjs');
  let onAudio = null;
  globalThis.window = globalThis;
  globalThis.MoqSynth = { subscriber: async (relay, ns, o) => { onAudio = o.onAudio; return { close() {} }; } };
  globalThis.AudioWorkletNode = class { constructor() { this.port = { postMessage() {}, onmessage: null }; } connect() {} };
  globalThis.EncodedAudioChunk = class { constructor(o) { Object.assign(this, o); } };
  globalThis.AudioDecoder = class {
    constructor({ output }) { this.output = output; }
    configure() {}
    decode() { this.output({ numberOfFrames: 4, copyTo() {}, close() {} }); }
    close() {}
  };
  const ac = { audioWorklet: { addModule: async () => {} }, destination: {} };
  const s = await subscribeSynth({ ac, ns: 'moq-test' });
  const frame = (seq) => {
    const b = new Uint8Array(20); const dv = new DataView(b.buffer);
    dv.setUint32(0, seq, true); dv.setFloat64(4, (performance.timeOrigin + performance.now()) * 1000, true);
    return b;
  };
  const N = (MOQ_AUDIO_KEEP ?? 2000) * 3;
  for (let i = 0; i < N; i++) onAudio({ payload: frame(i), tsUs: i * 5000 });
  const st = s.stats();
  ok('every frame was decoded', st.decoded === N, `${st.decoded} of ${N}`);
  ok('NEGATIVE CONTROL: the transit samples stop growing at the cap', st.transitMs.length <= (MOQ_AUDIO_KEEP ?? 2000),
    `${st.transitMs.length} kept`);
  s.close();
}

console.log(`\n${pass} ok, ${fail} failed, ${neg} of them negative controls`);
process.exit(fail ? 1 : 0);

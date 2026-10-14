// node workers/relay/key-test.mjs
// The keyed room's wrong-key limit, on a stub DO state. No network.
globalThis.WebSocketRequestResponsePair = class {};
const { Relay } = await import('./src/index.js');
const kv = new Map();
const mk = () => new Relay({ setWebSocketAutoResponse() {}, getWebSockets: () => [], storage: { get: async (k) => structuredClone(kv.get(k)), put: async (k, v) => kv.set(k, structuredClone(v)) } }, { PI_CAM_KEY: 'secret-key' });
const key = (r, body, ip) => r.fetch(new Request('https://x/room/studio-1-cam/key', { method: 'POST', body, headers: { 'cf-connecting-ip': ip } }));
let pass = 0, fail = 0;
const ok = (c, what) => { c ? pass++ : fail++; console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`); };
let r = mk(); const codes = [];
for (let i = 0; i < 12; i++) codes.push((await key(r, 'guess' + i, '198.51.100.1')).status);
ok(codes.slice(0, 10).every((c) => c === 403) && codes.slice(10).every((c) => c === 429), `ten wrong keys then 429 (${codes.join(' ')})`);
ok((await key(r, 'secret-key', '198.51.100.1')).status === 429, 'the held address is not checked at all, even with the right key');
ok((await key(r, 'secret-key', '198.51.100.2')).status === 204, 'another address with the right key: 204');
r = mk();
ok((await key(r, 'guess', '198.51.100.1')).status === 429, 'a fresh object on the same storage still holds the address');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path';
const W = '../zrel/web/';
const { default: createZynModule } = await import(W + 'zyn_wasm.js');
const z = await createZynModule({ wasmBinary: fs.readFileSync(W + 'zyn_wasm.wasm'), print() {}, printErr() {} });
const SR = 48000; z._zyn_init(SR); const out = z._zyn_get_output_buffer_ptr();
const midi = (st, a, b) => z._zyn_midi_event(((st << 24) | (a << 16) | (b << 8)) >>> 0);
const render = (blocks) => { const t = performance.now(); let s = 0; for (let i = 0; i < blocks; i++) { z._zyn_process(out, 128, 2); s += Math.abs(z.HEAPF32[(out >> 2) + 7]); } return [performance.now() - t, s]; };
const root = '../jy/banks'; const rows = [];
for (const b of fs.readdirSync(root)) { const d = path.join(root, b); if (!fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.xiz'))) {
    let raw = fs.readFileSync(path.join(d, f)); try { raw = zlib.gunzipSync(raw); } catch {}
    const xml = raw.toString('utf8'); const pad = /PADsynth_used" value="yes/.test(xml);
    const buf = Buffer.from(xml + '\0'); const p = z._malloc(buf.length); z.HEAPU8.set(buf, p);
    const t = performance.now(); z._zyn_load_part_patch(0, p); const load = performance.now() - t; z._free(p);
    const chord = [48, 52, 55, 59, 60, 64, 67, 71]; chord.forEach((n) => midi(0x90, n, 100));
    const [ms, s] = render(375); chord.forEach((n) => midi(0x80, n, 0)); render(375 * 2); midi(0xB0, 120, 0); midi(0xB0, 123, 0); render(20);
    rows.push({ name: `${b}/${f}`, pad, load, cpu8: ms / 1000 * 100, silent: s === 0 });
  } }
fs.writeFileSync('zyn-sweep.json', JSON.stringify(rows));
const q = (a, k) => { const s = a.map((r) => r[k]).sort((x, y) => x - y); return [0.5, 0.95, 1].map((p) => s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1)).join(' / '); };
for (const [label, set] of [['all', rows], ['PADsynth', rows.filter((r) => r.pad)], ['no PAD', rows.filter((r) => !r.pad)]])
  console.log(`${label} n=${set.length}: load ms p50/p95/max ${q(set, 'load')}; 8 voices % of one core p50/p95/max ${q(set, 'cpu8')}`);
console.log('silent:', rows.filter((r) => r.silent).length);
console.log('heaviest:', rows.sort((a, b) => b.cpu8 - a.cpu8).slice(0, 4).map((r) => `${r.name} ${r.cpu8.toFixed(1)}%`).join(', '));
console.log('slowest load:', rows.sort((a, b) => b.load - a.load).slice(0, 4).map((r) => `${r.name} ${r.load.toFixed(0)}ms`).join(', '));

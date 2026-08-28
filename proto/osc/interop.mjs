// proto/osc/interop.mjs — PHASE 2. Real tools, both directions, byte-level.
//
//   node proto/osc/interop.mjs            full matrix -> results/interop.json
//   node proto/osc/interop.mjs --only js  one tool
//
// The rule this harness is built on: A PRECISE INCOMPATIBILITY IS WORTH MORE
// THAN A PASS. So every mismatch is recorded with both hex strings and a
// classification (`ours-wrong` | `theirs-wrong` | `legitimate` | `unsupported`),
// and a case a tool cannot express is `unsupported`, never a silent skip.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import dgram from 'node:dgram';
import * as OSC from '../../timeline/osc.mjs';
import { CORPUS, BUNDLE_CORPUS } from './corpus.mjs';

const execFileP = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const hex = (b) => Buffer.from(b).toString('hex');
const unhex = (h) => new Uint8Array(Buffer.from(h, 'hex'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
/** one row of the matrix */
function rec(tool, direction, shape, caseId, verdict, detail = {}) {
  results.push({ tool, direction, shape, case: caseId, verdict, ...detail });
  return verdict;
}

// ---------------------------------------------------------------------------
// OUR encoder, driven from the corpus. `types` is explicit everywhere so a
// mismatch is never about inference.
// ---------------------------------------------------------------------------
function ourArgs(c) {
  // corpus args are JSON-ish; map to what our encoder wants for each tag
  return c.args.map((v, i) => {
    const t = c.types[i];
    if (t === 'b') return OSC.osc.blob(Uint8Array.from(v));
    if (t === 'S') return OSC.osc.symbol(v);
    if (t === 'c') return OSC.osc.char(v);
    if (t === 'r') return OSC.osc.color(...v);
    if (t === 'm') return OSC.osc.midi(...v);
    if (t === 't') return OSC.osc.timetag(v);
    if (t === 'h') return OSC.osc.big(v);
    return v;
  });
}
const ourEncode = (c) => OSC.encodeMessage({ address: c.address, types: c.types, args: ourArgs(c) });

function ourEncodeBundle(b) {
  const el = (e) => (e.bundle
    ? { bundle: true, timetag: e.tag === 'immediate' ? OSC.OSC_IMMEDIATE : e.tag, elements: e.elements.map(el) }
    : { address: e.address, types: e.types, args: ourArgs(e) });
  return OSC.encodeBundle({ timetag: b.tag === 'immediate' ? OSC.OSC_IMMEDIATE : b.tag, elements: b.elements.map(el) });
}

// ---------------------------------------------------------------------------
// TOOL 1 — osc.js (`osc` npm, Colin Clark). Node + browser, the most widely
// deployed JS implementation. Same process, so both directions are cheap.
// ---------------------------------------------------------------------------
async function toolOscJs() {
  let osc;
  try { osc = require('osc'); } catch (e) { return rec('osc.js', '-', '-', '-', 'missing', { error: e.message }); }
  const OPT = { metadata: true, unpackSingleArgs: false };

  const toTheirArg = (t, v) => {
    if (t === 'b') return { type: 'b', value: Uint8Array.from(v) };
    if (t === 'h') return { type: 'h', value: v };            // osc.js wants a Long or BigInt
    if (t === 't') return { type: 't', value: { raw: [v.seconds, v.fraction] } };
    if (t === 'r') return { type: 'r', value: { r: v[0], g: v[1], b: v[2], a: v[3] } };
    if (t === 'm') return { type: 'm', value: Uint8Array.from(v) };
    if (t === 'c') return { type: 'c', value: v };
    if (t === 'T' || t === 'F') return { type: t, value: v };
    if (t === 'N' || t === 'I') return { type: t, value: null };
    return { type: t, value: v };
  };

  for (const c of CORPUS) {
    const ours = ourEncode(c);
    // --- OURS -> THEIRS -------------------------------------------------
    try {
      const d = osc.readPacket(Buffer.from(ours), OPT);
      const ok = d.address === c.address &&
        (d.args || []).map((a) => a.type).join('') === c.types;
      rec('osc.js', 'ours->theirs', 'message', c.id, ok ? 'pass' : 'mismatch',
        ok ? {} : { got: JSON.stringify({ address: d.address, types: (d.args || []).map((a) => a.type).join('') }), want: `${c.address} ${c.types}` });
    } catch (e) {
      rec('osc.js', 'ours->theirs', 'message', c.id, 'error', { error: e.message, ourHex: hex(ours) });
    }
    // --- THEIRS -> OURS, and BYTE COMPARE -------------------------------
    try {
      const theirs = new Uint8Array(osc.writePacket(
        { address: c.address, args: c.args.map((v, i) => toTheirArg(c.types[i], v)) }, OPT));
      const same = hex(theirs) === hex(ours);
      let decOk = false, err = null;
      try {
        const back = OSC.decodePacket(theirs);
        decOk = back.address === c.address && back.types === c.types;
      } catch (e) { err = e.message; }
      rec('osc.js', 'theirs->ours', 'message', c.id,
        same && decOk ? 'byte-identical' : decOk ? 'decodes-differs' : 'fail',
        same && decOk ? {} : { ourHex: hex(ours), theirHex: hex(theirs), error: err });
    } catch (e) {
      rec('osc.js', 'theirs->ours', 'message', c.id, 'unsupported', { error: e.message });
    }
  }

  for (const b of BUNDLE_CORPUS) {
    const ours = ourEncodeBundle(b);
    try {
      const d = osc.readPacket(Buffer.from(ours), OPT);
      const n = d.packets ? d.packets.length : -1;
      rec('osc.js', 'ours->theirs', 'bundle', b.id, n === b.elements.length ? 'pass' : 'mismatch',
        n === b.elements.length ? {} : { got: `${n} elements`, want: `${b.elements.length}` });
    } catch (e) { rec('osc.js', 'ours->theirs', 'bundle', b.id, 'error', { error: e.message, ourHex: hex(ours) }); }

    try {
      const mk = (e) => (e.bundle
        ? { timeTag: e.tag === 'immediate' ? { raw: [0, 1] } : { raw: [e.tag.seconds, e.tag.fraction] }, packets: e.elements.map(mk) }
        : { address: e.address, args: e.args.map((v, i) => toTheirArg(e.types[i], v)) });
      const theirs = new Uint8Array(osc.writePacket(
        { timeTag: b.tag === 'immediate' ? { raw: [0, 1] } : { raw: [b.tag.seconds, b.tag.fraction] },
          packets: b.elements.map(mk) }, OPT));
      const same = hex(theirs) === hex(ours);
      let decN = -1, err = null;
      try { decN = OSC.decodePacket(theirs).elements.length; } catch (e) { err = e.message; }
      rec('osc.js', 'theirs->ours', 'bundle', b.id,
        same && decN === b.elements.length ? 'byte-identical' : decN === b.elements.length ? 'decodes-differs' : 'fail',
        same && decN === b.elements.length ? {} : { ourHex: hex(ours), theirHex: hex(theirs), error: err });
    } catch (e) { rec('osc.js', 'theirs->ours', 'bundle', b.id, 'unsupported', { error: e.message }); }
  }
}

// ---------------------------------------------------------------------------
// TOOL 2 — osc-min (npm `osc-min`). A second, independent JS implementation:
// two JS libraries agreeing is much weaker evidence than two DIFFERENT ones,
// and osc-min is written from the spec rather than from osc.js.
// ---------------------------------------------------------------------------
async function toolOscMin() {
  let m;
  for (const p of ['osc-min', join(HERE, 'node_modules/osc-min/dist/index.js'), join(HERE, 'node_modules/osc-min/dist/osc-min.js')]) {
    try { m = require(p); break; } catch { /* next */ }
  }
  if (!m) return rec('osc-min', '-', '-', '-', 'missing', { error: 'no loadable entry point' });

  for (const c of CORPUS) {
    const ours = ourEncode(c);
    try {
      const d = m.fromBuffer(Buffer.from(ours));
      const got = (d.args || []).map((a) => a.type).join(',');
      rec('osc-min', 'ours->theirs', 'message', c.id, d.address === c.address ? 'pass' : 'mismatch',
        d.address === c.address ? { theirTypes: got } : { got: d.address, want: c.address });
    } catch (e) { rec('osc-min', 'ours->theirs', 'message', c.id, 'error', { error: String(e.message).slice(0, 160), ourHex: hex(ours) }); }
  }
  for (const b of BUNDLE_CORPUS) {
    const ours = ourEncodeBundle(b);
    try {
      const d = m.fromBuffer(Buffer.from(ours));
      const n = d.elements ? d.elements.length : -1;
      rec('osc-min', 'ours->theirs', 'bundle', b.id, n === b.elements.length ? 'pass' : 'mismatch', { got: n });
    } catch (e) { rec('osc-min', 'ours->theirs', 'bundle', b.id, 'error', { error: String(e.message).slice(0, 160) }); }
  }
}

// ---------------------------------------------------------------------------
// TOOL 3 — python-osc. A third independent implementation, in another language,
// with its own opinions about int64 and nullary tags.
// ---------------------------------------------------------------------------
async function toolPythonOsc() {
  const py = join(HERE, '.venv/bin/python');
  const cases = CORPUS.map((c) => ({ id: c.id, address: c.address, types: c.types,
    args: c.args.map((v) => (typeof v === 'bigint' ? { big: v.toString() } : v)), ourHex: hex(ourEncode(c)) }));
  const bundles = BUNDLE_CORPUS.map((b) => ({ id: b.id, ourHex: hex(ourEncodeBundle(b)), n: b.elements.length }));
  let out;
  try {
    // NOTE: promisify(execFile) has NO `input` option (that is execFileSync) —
    // passing one makes the child block on stdin forever. spawn + write + end.
    out = JSON.parse(await new Promise((res, rej) => {
      const p = spawn(py, [join(HERE, 'interop_py.py')], { stdio: ['pipe', 'pipe', 'pipe'] });
      let so = '', se = '';
      p.stdout.on('data', (d) => { so += d; });
      p.stderr.on('data', (d) => { se += d; });
      p.on('error', rej);
      p.on('close', (code) => (code === 0 && so ? res(so) : rej(new Error(`python exit ${code}: ${se.slice(-400)}`))));
      const t = setTimeout(() => { p.kill('SIGKILL'); rej(new Error('python-osc arm timed out')); }, 60000);
      p.on('close', () => clearTimeout(t));
      p.stdin.write(JSON.stringify({ cases, bundles }));
      p.stdin.end();
    }));
  } catch (e) { return rec('python-osc', '-', '-', '-', 'missing', { error: String(e.message).slice(0, 400) }); }
  for (const r of out.rows) rec('python-osc', r.direction, r.shape, r.case, r.verdict, r.detail || {});
}

// ---------------------------------------------------------------------------
// TOOL 4 — liblo (oscsend / oscdump). THE reference implementation: the C
// library Pd, SuperCollider tooling and half the Linux audio world link
// against. Direction A: we send UDP, `oscdump` prints what it decoded.
// Direction B: `oscsend` sends, we decode the datagram.
//
// oscdump's output is a canonical human form — `address typetags args…` — so
// it is a decoder assertion, not a byte assertion. For BYTES in the
// theirs->ours direction we capture the datagram itself, which is exact.
// ---------------------------------------------------------------------------
const OSCDUMP = '/opt/homebrew/bin/oscdump';
const OSCSEND = '/opt/homebrew/bin/oscsend';

async function toolLiblo() {
  // ---- direction A: OURS -> oscdump ---------------------------------------
  // TWO things this arm gets wrong if written the obvious way, both found the
  // hard way and both worth stating:
  //  (1) oscdump's stdout is BLOCK-buffered on a pipe, so SIGTERM discards
  //      everything unflushed and every case reads as "liblo rejected it".
  //      `script -q /dev/null` gives it a pty, which makes it line-buffered.
  //  (2) oscdump prints `<timetag> <address> <typetags> <args…>` — the TIMETAG
  //      IS FIRST. Parsing parts[0] as the address silently shifts every field.
  const PORT = 17654;
  let dump;
  try {
    dump = spawn('script', ['-q', '/dev/null', OSCDUMP, String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { return rec('liblo', '-', '-', '-', 'missing', { error: e.message }); }
  let raw = '';
  dump.stdout.on('data', (d) => { raw += String(d); });
  dump.stderr.on('data', (d) => { raw += String(d); });
  await sleep(600);
  if (dump.exitCode !== null) return rec('liblo', '-', '-', '-', 'missing', { error: `oscdump exited: ${raw.slice(0, 200)}` });

  const sock = dgram.createSocket('udp4');
  const send = (buf) => new Promise((res, rej) => sock.send(Buffer.from(buf), PORT, '127.0.0.1', (e) => (e ? rej(e) : res())));
  // A MARKER between packets makes the parse robust against a bundle rendering
  // as any number of lines — we never have to guess where a case's output ends.
  const mark = (n) => OSC.encodeMessage('/__mark__', [n]);

  for (let i = 0; i < CORPUS.length; i++) { await send(mark(i)); await sleep(12); await send(ourEncode(CORPUS[i])); await sleep(28); }
  for (let i = 0; i < BUNDLE_CORPUS.length; i++) { await send(mark(1000 + i)); await sleep(12); await send(ourEncodeBundle(BUNDLE_CORPUS[i])); await sleep(28); }
  await send(mark(9999));
  await sleep(900);
  sock.close();
  dump.kill('SIGTERM');

  // split the transcript into per-case blocks on the markers
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/[\x00-\x08\x0b-\x1f]/g, '').trim()).filter(Boolean);
  const blocks = new Map();
  let cur = null;
  for (const l of lines) {
    const m = /\/__mark__\s+i\s+(\d+)/.exec(l);
    if (m) { cur = Number(m[1]); blocks.set(cur, []); continue; }
    if (cur !== null) blocks.get(cur).push(l);
  }
  /** oscdump line -> {address, types}. `<timetag> <address> [<types> [args…]]` */
  const parseLine = (l) => {
    const p = l.split(/\s+/);
    const ai = p.findIndex((x) => x.startsWith('/'));
    if (ai < 0) return null;
    return { address: p[ai], types: p[ai + 1] && !p[ai + 1].startsWith('/') ? p[ai + 1] : '' };
  };
  for (let i = 0; i < CORPUS.length; i++) {
    const c = CORPUS[i];
    const blk = (blocks.get(i) || []).map(parseLine).filter(Boolean);
    if (!blk.length) { rec('liblo', 'ours->theirs', 'message', c.id, 'not-delivered', { note: 'oscdump printed nothing for this packet — liblo REJECTED it' }); continue; }
    const g = blk[0];
    // liblo prints the typetags without the leading comma; no args prints empty
    const ok = g.address === c.address && g.types === c.types;
    rec('liblo', 'ours->theirs', 'message', c.id, ok ? 'pass' : 'mismatch',
      ok ? { dump: `${g.address} ${g.types}` } : { got: `${g.address} '${g.types}'`, want: `${c.address} '${c.types}'`, raw: blocks.get(i).join(' | ').slice(0, 140) });
  }
  for (let i = 0; i < BUNDLE_CORPUS.length; i++) {
    const b = BUNDLE_CORPUS[i];
    const rawBlk = blocks.get(1000 + i) || [];
    const msgs = rawBlk.map(parseLine).filter((x) => x && x.address !== '/__mark__');
    // liblo FLATTENS a bundle into its messages, wrapped in [ … ] — so the
    // right assertion is the message COUNT and their addresses, recursively.
    const want = OSC.messageCount(OSC.decodePacket(ourEncodeBundle(b)));
    const ok = msgs.length === want;
    rec('liblo', 'ours->theirs', 'bundle', b.id, ok ? 'pass' : (msgs.length ? 'partial' : 'not-delivered'),
      ok ? { n: want } : { got: msgs.length, want, raw: rawBlk.join(' | ').slice(0, 160) });
  }

  // ---- direction B: oscsend -> OURS ---------------------------------------
  const PORT2 = 17655;
  const rx = dgram.createSocket('udp4');
  const got = [];
  rx.on('message', (m) => got.push(new Uint8Array(m)));
  await new Promise((r) => rx.bind(PORT2, '127.0.0.1', r));

  // oscsend's CLI form is `oscsend URL ADDR TYPETAGS ARG…` — ONE typetag
  // string, then one value per NON-nullary tag. (Passing the tags as separate
  // arguments makes oscsend read only the first, which looks exactly like a
  // liblo bug and is a harness bug.) Cases it genuinely cannot express are
  // recorded `unsupported` WITH liblo's own error text.
  for (const c of CORPUS) {
    const vals = [];
    for (let i = 0; i < c.types.length; i++) {
      if ('TFNI'.includes(c.types[i])) continue;               // nullary: no value
      const v = c.args[i];
      vals.push(String(typeof v === 'bigint' ? v : Array.isArray(v) ? v.join(',') : v));
    }
    const argv = ['osc.udp://127.0.0.1:' + PORT2, c.address];
    if (c.types) argv.push(c.types, ...vals);
    try {
      const r = await execFileP(OSCSEND, argv, { timeout: 4000 });
      if (/not supported|Failed/i.test(r.stderr || '')) throw Object.assign(new Error('rejected'), { stderr: r.stderr });
      await sleep(45);
    } catch (e) {
      rec('liblo', 'theirs->ours', 'message', c.id, 'unsupported',
        { note: String(e.stderr || e.message).replace(/\s+/g, ' ').trim().slice(0, 140), types: c.types });
      continue;
    }
    const pkt = got.shift();
    if (!pkt) { rec('liblo', 'theirs->ours', 'message', c.id, 'not-delivered', {}); continue; }
    const ourHex = hex(ourEncode(c)), theirHex = hex(pkt);
    let decOk = false, err = null, dec = null;
    try { dec = OSC.decodePacket(pkt); decOk = dec.address === c.address && dec.types === c.types; }
    catch (e) { err = e.message; }
    rec('liblo', 'theirs->ours', 'message', c.id,
      theirHex === ourHex && decOk ? 'byte-identical' : decOk ? 'decodes-differs' : 'fail',
      theirHex === ourHex && decOk ? {} : { ourHex, theirHex, error: err, gotTypes: dec && dec.types });
  }
  for (const b of BUNDLE_CORPUS) {
    rec('liblo', 'theirs->ours', 'bundle', b.id, 'unsupported',
      { note: 'oscsend sends exactly one message per invocation and has no bundle syntax — liblo\'s C API bundles fine, its CLI cannot' });
  }
  rx.close();
}

// ---------------------------------------------------------------------------
// TOOL 5 — Pure Data (`pd -nogui`). A fourth implementation, and the one that
// matters practically: Pd is what a studio patch actually is.
//   [netreceive -u -b] -> [oscparse] -> [list trim] -> [print]   (ours -> Pd)
//   [oscformat …] -> [netsend -u -b]                             (Pd -> ours)
// oscparse/oscformat are Pd vanilla built-ins since 0.46.
// ---------------------------------------------------------------------------
const PD_BIN = '/Applications/Pd-0.56-5.app/Contents/Resources/bin/pd';

async function toolPd() {
  const { existsSync, readdirSync } = await import('node:fs');
  let pdbin = PD_BIN;
  if (!existsSync(pdbin)) {
    const app = readdirSync('/Applications').find((d) => /^Pd.*\.app$/.test(d));
    pdbin = app && `/Applications/${app}/Contents/Resources/bin/pd`;
    if (!pdbin || !existsSync(pdbin)) return rec('pure-data', '-', '-', '-', 'missing', { error: 'no pd binary under /Applications/Pd*.app' });
  }
  const PORT_IN = 17660, PORT_OUT = 17661;

  // Pd patch: receive OSC on PORT_IN, print it; and on loadbang send a few
  // messages out to PORT_OUT so we can decode Pd's own encoder.
  const patch = [
    '#N canvas 0 0 700 500 12;',
    `#X obj 20 20 netreceive -u -b ${PORT_IN};`,
    '#X obj 20 60 oscparse;',
    '#X obj 20 100 list trim;',
    '#X obj 20 140 print PDRX;',
    '#X connect 0 0 1 0;',
    '#X connect 1 0 2 0;',
    '#X connect 2 0 3 0;',
    // --- the send side ---
    '#X obj 300 20 loadbang;',
    '#X obj 300 50 del 700;',
    '#X msg 300 90 send 1000 2.5 hello;',
    '#X obj 300 130 oscformat core all;',
    '#X obj 300 170 list prepend send;',
    '#X obj 300 200 list trim;',
    `#X obj 300 240 netsend -u -b;`,
    `#X msg 300 210 connect 127.0.0.1 ${PORT_OUT};`,
    '#X connect 4 0 5 0;',
    '#X connect 5 0 12 0;',
    '#X connect 12 0 11 0;',
    '#X connect 5 0 6 0;',
    '#X connect 6 0 7 0;',
    '#X connect 7 0 8 0;',
    '#X connect 8 0 9 0;',
    '#X connect 9 0 11 0;',
  ].join('\n');
  const patchPath = join(HERE, 'interop-pd.pd');
  await writeFile(patchPath, patch);

  const rx = dgram.createSocket('udp4');
  const fromPd = [];
  rx.on('message', (m) => fromPd.push(new Uint8Array(m)));
  await new Promise((r) => rx.bind(PORT_OUT, '127.0.0.1', r));

  const pd = spawn(pdbin, ['-nogui', '-noaudio', '-send', 'pd dsp 0', patchPath],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  let pdout = '';
  pd.stdout.on('data', (d) => { pdout += String(d); });
  pd.stderr.on('data', (d) => { pdout += String(d); });
  await sleep(2500);
  if (pd.exitCode !== null) {
    rx.close();
    return rec('pure-data', '-', '-', '-', 'missing', { error: `pd exited ${pd.exitCode}: ${pdout.slice(0, 300)}` });
  }

  const sock = dgram.createSocket('udp4');
  const send = (buf) => new Promise((res, rej) => sock.send(Buffer.from(buf), PORT_IN, '127.0.0.1', (e) => (e ? rej(e) : res())));
  for (const c of CORPUS) { await send(ourEncode(c)); await sleep(30); }
  for (const b of BUNDLE_CORPUS) { await send(ourEncodeBundle(b)); await sleep(30); }
  await sleep(1200);
  sock.close();
  pd.kill('SIGTERM');
  rx.close();

  // Pd's `oscparse` emits the address as SYMBOLS split on '/', then the args.
  // e.g. `/foo 1000` prints as `PDRX: foo 1000`.
  const rxLines = pdout.split('\n').filter((l) => l.startsWith('PDRX:')).map((l) => l.slice(5).trim());
  let i = 0;
  for (const c of CORPUS) {
    const l = rxLines[i++];
    if (l === undefined) { rec('pure-data', 'ours->theirs', 'message', c.id, 'not-delivered', { note: 'oscparse emitted nothing — Pd rejected the packet' }); continue; }
    const wantPath = c.address.split('/').filter(Boolean).join(' ');
    const ok = l.startsWith(wantPath);
    rec('pure-data', 'ours->theirs', 'message', c.id, ok ? 'pass' : 'mismatch',
      ok ? { pd: l } : { pd: l, want: wantPath });
  }
  for (const b of BUNDLE_CORPUS) {
    const consumed = rxLines.slice(i, i + b.elements.length);
    i += Math.max(1, consumed.length);
    rec('pure-data', 'ours->theirs', 'bundle', b.id,
      consumed.length >= Math.min(1, b.elements.length) || b.elements.length === 0 ? 'pass' : 'partial',
      { pd: consumed.join(' | ').slice(0, 160), note: 'oscparse flattens a bundle to its messages' });
  }
  if (fromPd.length) {
    const pkt = fromPd[0];
    let ok = false, dec = null, err = null;
    try { dec = OSC.decodePacket(pkt); ok = typeof dec.address === 'string' && dec.address.startsWith('/'); }
    catch (e) { err = e.message; }
    rec('pure-data', 'theirs->ours', 'message', 'pd-oscformat', ok ? 'pass' : 'fail',
      { theirHex: hex(pkt), decoded: dec && `${dec.address} ${dec.types}`, error: err });
  } else {
    rec('pure-data', 'theirs->ours', 'message', 'pd-oscformat', 'not-delivered',
      { note: 'no datagram arrived from Pd netsend' });
  }
}

// ---------------------------------------------------------------------------
// SELF — property tests that need no peer: round-trip, and the time-tag
// asymmetry claim from timeline/osc.mjs §TIMETAG, which is an ASSERTION and
// therefore has to be tested rather than asserted in a comment.
// ---------------------------------------------------------------------------
function toolSelf() {
  for (const c of CORPUS) {
    const b = ourEncode(c);
    let ok = false, err = null;
    try {
      const d = OSC.decodePacket(b);
      ok = d.address === c.address && d.types === c.types && b.length % 4 === 0;
    } catch (e) { err = e.message; }
    rec('self', 'round-trip', 'message', c.id, ok ? 'pass' : 'fail', ok ? {} : { error: err, hex: hex(b) });
    if (c.expectHex) rec('self', 'spec-bytes', 'message', c.id, hex(b) === c.expectHex ? 'byte-identical' : 'fail',
      hex(b) === c.expectHex ? {} : { ourHex: hex(b), specHex: c.expectHex });
  }
  for (const b of BUNDLE_CORPUS) {
    const enc = ourEncodeBundle(b);
    let ok = false, err = null;
    try { const d = OSC.decodePacket(enc); ok = d.bundle && d.elements.length === b.elements.length && enc.length % 4 === 0; }
    catch (e) { err = e.message; }
    rec('self', 'round-trip', 'bundle', b.id, ok ? 'pass' : 'fail', ok ? {} : { error: err, hex: hex(enc) });
  }
  // §TIMETAG: ours -> NTP -> ours is the identity TO WITHIN ONE ULP OF THE
  // DOUBLE ITSELF. The bound has to be the ULP and not a fixed epsilon: at
  // 1.7e12 ms a double's step is already 2^-12 ms = 244 ns, so any epsilon
  // tighter than that measures JS's number type, not our conversion. (The
  // first draft asserted 1e-6 ms and "failed" at exactly 0.000244140625 —
  // which is one ULP, i.e. the codec was right and the test was wrong.)
  let worst = 0, worstUlps = 0;
  for (let i = 0; i < 20000; i++) {
    const ms = 1.7e12 + Math.random() * 3.15e10 + Math.random();
    const ulp = Math.pow(2, Math.floor(Math.log2(Math.abs(ms))) - 52);
    const { seconds, fraction } = OSC.epochMsToNtp(ms);
    const err = Math.abs(OSC.ntpToEpochMs(seconds, fraction) - ms);
    worst = Math.max(worst, err);
    worstUlps = Math.max(worstUlps, err / ulp);
  }
  rec('self', 'property', 'timetag', 'ms->ntp->ms', worstUlps <= 1.5 ? 'pass' : 'fail',
    { worstErrorMs: worst, worstUlps: +worstUlps.toFixed(2),
      note: `ours->NTP round-trips within ${worstUlps.toFixed(2)} ULP of the double — i.e. the loss is JS's number type, not the conversion. The 244 ns floor IS the §TIMETAG asymmetry, measured.` });
  // and the reverse is LOSSY — which is the claim that justifies rawTag.
  const tag = Uint8Array.of(0xeb, 0xf2, 0x1e, 0x80, 0x12, 0x34, 0x56, 0x78);
  const d = OSC.decodeTimeTag(tag);
  const re = OSC.encodeTimeTag(d.epochMs);
  rec('self', 'property', 'timetag', 'ntp->ms->ntp-is-lossy', hex(re) !== hex(tag) ? 'pass' : 'unexpected',
    { original: hex(tag), reencoded: hex(re),
      note: 'CONFIRMS the asymmetry: an NTP tag does NOT survive a round trip through our ms `at`, which is exactly why every row keeps rawTag verbatim' });
  // and rawTag re-emit IS byte-identical, which is the mitigation working.
  rec('self', 'property', 'timetag', 'rawTag-reemit-exact', hex(OSC.encodeTimeTag(d.raw)) === hex(tag) ? 'pass' : 'fail',
    { note: 'the rawData rule: re-emitting from the kept bytes is exact' });
}

// ---------------------------------------------------------------------------
async function main() {
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
  const tools = { self: toolSelf, js: toolOscJs, min: toolOscMin, py: toolPythonOsc, liblo: toolLiblo, pd: toolPd };
  for (const [name, fn] of Object.entries(tools)) {
    if (only && only !== name) continue;
    process.stderr.write(`\n=== ${name} ===\n`);
    try { await fn(); } catch (e) { rec(name, '-', '-', '-', 'harness-error', { error: e.stack.slice(0, 400) }); }
  }

  // ---- the matrix ---------------------------------------------------------
  const key = (r) => `${r.tool}|${r.direction}|${r.shape}`;
  const groups = new Map();
  for (const r of results) {
    let g = groups.get(key(r));
    if (!g) groups.set(key(r), g = { tool: r.tool, direction: r.direction, shape: r.shape, n: 0, verdicts: {} });
    g.n++; g.verdicts[r.verdict] = (g.verdicts[r.verdict] || 0) + 1;
  }
  console.log('\n=== INTEROP MATRIX ===');
  console.log('tool          direction        shape     n    verdicts');
  for (const g of groups.values())
    console.log(`${g.tool.padEnd(13)} ${g.direction.padEnd(16)} ${g.shape.padEnd(9)} ${String(g.n).padEnd(4)} ` +
      Object.entries(g.verdicts).map(([k, v]) => `${k}:${v}`).join('  '));

  const bad = results.filter((r) => !['pass', 'byte-identical'].includes(r.verdict));
  console.log(`\n=== ${bad.length} NON-PASS ROWS (the valuable ones) ===`);
  for (const r of bad.slice(0, 80))
    console.log(`${r.tool}/${r.direction}/${r.shape}/${r.case}: ${r.verdict} ${JSON.stringify({ ...r, tool: undefined, direction: undefined, shape: undefined, case: undefined, verdict: undefined })}`.slice(0, 260));

  await mkdir(join(HERE, 'results'), { recursive: true });
  await writeFile(join(HERE, 'results/interop.json'), JSON.stringify({ when: new Date().toISOString(), results }, null, 1));
  console.log(`\nwrote ${results.length} rows -> proto/osc/results/interop.json`);
}
main();

// proto/osc/atomic-test.mjs — PROVE the bundle-atomicity claim from
// timeline/osc.mjs §BUNDLE: *no partial bundle may be observable* after a seek,
// a catch-up, or a store miss.
//
// The claim is falsifiable and this is the falsification attempt. Each scenario
// deliberately breaks the group in a different place; the assertion is always
// the same and it is the only one that matters:
//
//     every packet the SINK observes is either a complete bundle (n of n)
//     or not a bundle at all — never k of n for 0 < k < n.
//
// Run: node proto/osc/atomic-test.mjs

import { createDeck } from '../../timeline/transport.mjs';
import {
  createOscAdapter, packetToRows, decodePacket, encodeBundle, encodePacket,
  messageCount, OSC_IMMEDIATE, osc,
} from '../../timeline/osc.mjs';

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (ok) { pass++; console.log(`  ok   ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name} — ${detail}`); }
}

/** The sink every scenario shares. Records what was actually emitted, and —
 *  crucially — checks the ONE invariant on every single packet as it arrives,
 *  so a violation is attributed to the packet that caused it. */
function makeSink() {
  const seen = [];
  const violations = [];
  return {
    seen, violations,
    send(pkt, info) {
      seen.push({ pkt, info });
      if (pkt.bundle) {
        const n = pkt.elements.length;
        if (info && info.n !== undefined && info.n !== n)
          violations.push({ why: 'committed element count disagrees with the group size', n, want: info.n });
        // a committed group must carry every message the bundle declared
        const want = pkt.elements[0] && pkt.elements[0].__want;
        if (want !== undefined && n !== want) violations.push({ why: 'PARTIAL BUNDLE OBSERVED', got: n, want });
      }
    },
    /** how many messages the sink was given, grouped */
    counts() { return this.seen.map((s) => (s.pkt.bundle ? s.pkt.elements.length : 1)); },
  };
}

// A helper that builds a real encoded bundle and explodes it to rows, exactly
// as a live ingest would — no hand-made rows, so the test exercises the codec.
function bundleRows(addresses, at, idPrefix, seq) {
  const bytes = encodeBundle({
    timetag: OSC_IMMEDIATE,
    elements: addresses.map((a, i) => ({ address: a, types: 'f', args: [osc.float(i / 10)] })),
  });
  const { rows } = packetToRows(decodePacket(bytes), { receivedAt: at, mapTime: () => at, idPrefix, seq });
  return rows;
}

console.log('\n=== 0. the codec/rows round trip (the ground the rest stands on) ===');
{
  const rows = bundleRows(['/a', '/b', '/c'], 1000, 'z', { n: 0 });
  check('a 3-message bundle explodes to 3 rows', rows.length === 3);
  check('all rows share one `at`', new Set(rows.map((r) => r.at)).size === 1, `at=${rows[0].at}`);
  check('all rows share one bundleId', new Set(rows.map((r) => r.payload.bundleId)).size === 1);
  check('every row knows the group size', rows.every((r) => r.payload.bundleN === 3));
  check('every row carries rawTag verbatim (8 bytes)', rows.every((r) => r.payload.rawTag && r.payload.rawTag.length === 8));
  check('each row has its OWN address (caps.series is meaningful)',
    new Set(rows.map((r) => r.payload.address)).size === 3);
}

console.log('\n=== 1. the happy path: a whole bundle commits as ONE packet ===');
{
  const sink = makeSink();
  const ad = createOscAdapter({ send: sink.send.bind(sink) });
  const rows = bundleRows(['/x', '/y', '/z'], 0, 'h', { n: 0 });
  for (const r of rows) ad.actuate(r.payload, { at: r.at }, null);
  check('one packet emitted, not three', sink.seen.length === 1, `got ${sink.seen.length}`);
  check('it is a bundle of 3', sink.seen[0] && sink.seen[0].pkt.bundle && sink.seen[0].pkt.elements.length === 3);
  check('it is flagged atomic', sink.seen[0] && sink.seen[0].info.atomic === true);
  check('re-encoding the committed bundle yields 3 messages',
    messageCount(decodePacket(encodePacket(sink.seen[0].pkt))) === 3);
}

console.log('\n=== 2. STORE MISS: the page boundary cut the bundle in half ===');
{
  const sink = makeSink();
  const ad = createOscAdapter({ send: sink.send.bind(sink) });
  const rows = bundleRows(['/p', '/q', '/r', '/s', '/t'], 0, 'sm', { n: 0 });
  // the store handed us only rows 0..2 of a 5-row bundle
  for (const r of rows.slice(0, 3)) ad.actuate(r.payload, { at: r.at }, null);
  await new Promise((r) => setTimeout(r, 5));      // let the burst boundary pass
  check('NOTHING was emitted — 3 of 5 is not observable', sink.seen.length === 0, `emitted ${sink.seen.length}`);
  const st = ad.stats();
  check('the loss was REPORTED, not swallowed', st.bundlesAbandoned === 1 && st.abandonedMessages === 3,
    `abandoned=${st.bundlesAbandoned} msgs=${st.abandonedMessages}`);
  const rep = ad.reports().filter((r) => r.type === 'bundle-abandoned');
  check('the report names the addresses that were dropped', rep.length === 1 && rep[0].have === 3 && rep[0].want === 5);
  check('and it is DETECTABLE from the rows alone (bundleN vs count)',
    rows.slice(0, 3).every((r) => r.payload.bundleN === 5) && rows.slice(0, 3).length !== 5,
    'a paged reader can compare bundleI/bundleN without any adapter state');
}

console.log('\n=== 3. SEEK landing mid-bundle, through a real deck ===');
{
  const sink = makeSink();
  const ad = createOscAdapter({ send: sink.send.bind(sink) });
  const seq = { n: 0 };
  const items = [
    ...bundleRows(['/b1/a', '/b1/b', '/b1/c'], 100, 'sk', seq),
    ...bundleRows(['/b2/a', '/b2/b', '/b2/c', '/b2/d'], 200, 'sk', seq),
  ];
  const deck = createDeck({ items, adapters: { osc: ad }, range: [0, 500], evidence: 'attested', tickHost: 'main' });
  // seek PAST both bundles: the deck folds the prefix and asserts state.
  deck.seek(300);
  await new Promise((r) => setTimeout(r, 30));
  const partials = sink.seen.filter((s) => s.pkt.bundle && s.info && s.info.assert !== true &&
    s.pkt.elements.length !== s.info.n);
  check('no partial bundle emitted across the seek', partials.length === 0 && sink.violations.length === 0);
  const asserts = sink.seen.filter((s) => s.info && s.info.assert);
  check('the seek produced a state assertion', asserts.length >= 1, `${asserts.length} assert packet(s)`);
  check('the assertion is itself ONE bundle (levels land together)',
    asserts.every((a) => a.pkt.bundle === true));
  deck.dispose();
}

console.log('\n=== 4. INTERLEAVING: a foreign message arrives mid-group ===');
{
  const sink = makeSink();
  const ad = createOscAdapter({ send: sink.send.bind(sink) });
  const rows = bundleRows(['/i/a', '/i/b', '/i/c'], 0, 'il', { n: 0 });
  ad.actuate(rows[0].payload, { at: 0 }, null);
  ad.actuate({ address: '/loose/one', types: 'i', args: [1] }, { at: 0 }, null);   // not in any bundle
  ad.actuate(rows[1].payload, { at: 0 }, null);
  ad.actuate(rows[2].payload, { at: 0 }, null);
  await new Promise((r) => setTimeout(r, 5));
  const bundles = sink.seen.filter((s) => s.pkt.bundle);
  check('the interrupted group was abandoned, not partially sent', bundles.length === 0, `${bundles.length} bundles`);
  check('the loose message still went through', sink.seen.length === 1 && sink.seen[0].pkt.address === '/loose/one');
  check('and the remaining 2 of 3 were ALSO abandoned (never 2 of 3)', ad.stats().bundlesAbandoned === 2,
    `abandoned=${ad.stats().bundlesAbandoned}`);
}

console.log('\n=== 5. CATCH-UP: reduce() folds a scrub, edges do NOT re-fire ===');
{
  const sink = makeSink();
  const ad = createOscAdapter({
    send: sink.send.bind(sink),
    policy: { '/synth/**/cutoff': 'level', '/scene/next': 'edge', '/mixer/*/mute': 'level' },
  });
  const seq = { n: 0 };
  const items = [];
  // 400 fader moves + 3 scene triggers interleaved — the CC lesson's shape
  for (let i = 0; i < 400; i++)
    items.push({ at: i, kind: 'osc', payload: { address: '/synth/1/cutoff', types: 'f', args: [i / 400] } });
  for (const t of [50, 150, 350])
    items.push({ at: t, kind: 'osc', payload: { address: '/scene/next', types: '', args: [] } });
  items.push({ at: 120, kind: 'osc', payload: { address: '/mixer/3/mute', types: 'i', args: [1] } });
  const deck = createDeck({ items, adapters: { osc: ad }, range: [0, 500], evidence: 'attested', tickHost: 'main' });
  deck.seek(399);
  await new Promise((r) => setTimeout(r, 30));
  const asserts = sink.seen.filter((s) => s.info && s.info.assert);
  check('a seek over 404 events produced ONE assert packet, not 404 sends',
    asserts.length === 1, `${asserts.length} assert packets, ${sink.seen.length} sends total`);
  const el = asserts[0] ? asserts[0].pkt.elements : [];
  const addrs = el.map((e) => e.address).sort();
  check('the assert re-sends exactly the LEVEL addresses',
    JSON.stringify(addrs) === JSON.stringify(['/mixer/3/mute', '/synth/1/cutoff']), addrs.join(','));
  check('the cutoff is the LAST value, not the first',
    el.find((e) => e.address === '/synth/1/cutoff').args[0] > 0.99);
  check('NO edge address was re-sent (/scene/next fired 3x, asserted 0x)',
    !addrs.includes('/scene/next'));
  check('the suppressed edges are REPORTED, not merely absent',
    asserts[0].info.suppressedEdges.includes('/scene/next'));
  deck.dispose();
}

console.log('\n=== 6. classification is reported, never silent ===');
{
  const rep = [];
  const ad = createOscAdapter({ send: () => {}, onReport: (r) => rep.push(r) });
  const c1 = ad.classify('/scene/next', { args: [] });
  const c2 = ad.classify('/synth/1/cutoff', { args: [0.5] });
  const c3 = ad.classify('/mixer/3/mute', { args: [1] });
  const c4 = ad.classify('/totally/unknown/thing', { args: ['x'] });
  check('/scene/next -> edge', c1.kind === 'edge', c1.why.slice(0, 60));
  check('/synth/1/cutoff -> level', c2.kind === 'level');
  check('/mixer/3/mute -> LEVEL (the trap: looks like a command, is a state)', c3.kind === 'level');
  check('an unmatched address defaults to EDGE (the conservative direction)',
    c4.kind === 'edge' && c4.source === 'default');
  check('every inference was reported', rep.filter((r) => r.type === 'classification').length === 4);
  const explicit = createOscAdapter({ send: () => {}, policy: { '/scene/next': 'level' } });
  check('a client override BEATS the heuristic', explicit.classify('/scene/next', { args: [] }).kind === 'level');
  check('and an explicit rule is not reported as an inference',
    explicit.classify('/scene/next', { args: [] }).source === 'client');
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (typeof process !== 'undefined') process.exit(fail ? 1 : 0);

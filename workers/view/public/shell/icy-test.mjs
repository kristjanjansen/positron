// demo/shell/icy-test.mjs — node demo/shell/icy-test.mjs
//
// The demuxer was LIFTED out of `shout`'s page, and the audio branch was
// rewritten on the way: the original kept every un-consumed audio byte in
// `spare` and re-tested against a constant `need`; this one discards them and
// decrements `need`. Equivalent in theory, 16 KB lighter, and exactly the kind
// of "obviously the same" change that loses a title at a chunk boundary.
//
// So: a synthetic Icecast stream, fed at every chunk size from 1 byte upward,
// checked against what was put in. A title that straddles a chunk is the case
// that matters and is the case a naive parser drops.
import { icyDemuxer } from './icy.mjs';

const METAINT = 64;
const enc = new TextEncoder();

/** Build a real ICY byte stream: audio, [len], text, audio, [len], … */
function build(titles) {
  const out = [];
  for (const t of titles) {
    for (let i = 0; i < METAINT; i++) out.push(i & 0xff);          // "audio"
    if (t === null) { out.push(0); continue; }                      // empty slot
    const txt = enc.encode(`StreamTitle='${t}';StreamUrl='';`);
    const pad = (16 - (txt.length % 16)) % 16;
    out.push((txt.length + pad) / 16);
    out.push(...txt, ...new Array(pad).fill(0));
  }
  return new Uint8Array(out);
}

const TITLES = ['01_EMA_Improvisation_I', null, null, 'a', null,
                '05_EMA_Improvisation_IV', null, 'x'.repeat(200), '05_EMA_Improvisation_IV'];
const stream = build(TITLES);
// what a correct parser must report: every non-null, deduped against the previous
const expectTitles = TITLES.filter((t) => t !== null)
  .filter((t, i, a) => t !== a[i - 1]);
const expectSlots = TITLES.length;
const expectMeta = TITLES.filter((t) => t !== null).length;

let bad = 0, ran = 0, failed = false;
const SIZES = [1, 2, 3, 7, 13, 16, 17, 63, 64, 65, 100, 511, 4096, stream.length];
for (const size of SIZES) {
  const got = [], slots = [], metas = [];
  const eat = icyDemuxer(METAINT, {
    onTitle: (t) => got.push(t), onSlot: () => slots.push(1), onMeta: (m) => metas.push(m),
  });
  for (let i = 0; i < stream.length; i += size) eat(stream.subarray(i, i + size));
  ran++;
  const ok = JSON.stringify(got) === JSON.stringify(expectTitles)
    && slots.length === expectSlots && metas.length === expectMeta;
  if (!ok) {
    bad++;
    console.log(`  FAIL chunk=${size}  titles ${got.length}/${expectTitles.length} `
      + `slots ${slots.length}/${expectSlots} meta ${metas.length}/${expectMeta}`);
    console.log(`       got ${JSON.stringify(got)}`);
  }
}
console.log(`chunk sizes: ${ran - bad}/${ran} reproduce the stream exactly`);

// ── 🔴 THE AUDIO MUST COME BACK OUT, BYTE FOR BYTE ────────────────────────
// `onAudio` is what `mp3-stream.mjs` decodes, so "the titles were right" says
// nothing about whether the sound survived. The expected payload is every
// `METAINT`-byte run with the text taken out; one byte of metadata left in it
// is a click in the output, and one byte of audio dropped desynchronises the
// MP3 frame scanner for ever after.
const expectAudio = new Uint8Array(TITLES.length * METAINT);
for (let s2 = 0; s2 < TITLES.length; s2++) {
  for (let i = 0; i < METAINT; i++) expectAudio[s2 * METAINT + i] = i & 0xff;
}
let audioBad = 0;
for (const size of SIZES) {
  const got = [];
  const eat = icyDemuxer(METAINT, { onAudio: (b) => got.push(...b) });
  for (let i = 0; i < stream.length; i += size) eat(stream.subarray(i, i + size));
  const out = Uint8Array.from(got);
  const same = out.length === expectAudio.length && out.every((v, i) => v === expectAudio[i]);
  if (!same) { audioBad++; console.log(`       (size ${size}: ${out.length} B of ${expectAudio.length})`); }
}
console.log(`audio out: ${SIZES.length - audioBad}/${SIZES.length} chunk sizes return the payload byte-identical`);
if (audioBad) failed = true;

// ⚠️ AND WITH NO `icy-metaint` EVERY BYTE IS AUDIO. This returned early before
// `onAudio` existed — harmless while the only product was titles, and a
// no-sound bug the moment somebody wanted the samples.
let plain = 0;
const eatPlain = icyDemuxer(0, { onAudio: (b) => { plain += b.length; } });
eatPlain(stream);
console.log(`no metaint: ${plain === stream.length ? 'every byte is audio' : `LOST ${stream.length - plain} B`}`);
if (plain !== stream.length) failed = true;

// no metaint = the station is not talking, and that is not an error
let fired = 0;
const quiet = icyDemuxer(0, { onTitle: () => fired++, onSlot: () => fired++ });
quiet(stream);
console.log(fired === 0 ? 'no metaint: silent, as it must be' : `FAIL: fired ${fired} with no metaint`);

// AND THE GUARD ITSELF: a deliberately broken demuxer must FAIL this test,
// or the test is decoration. Feed it a stream built with the WRONG metaint.
const wrong = [];
const mis = icyDemuxer(METAINT + 1, { onTitle: (t) => wrong.push(t) });
for (let i = 0; i < stream.length; i += 100) mis(stream.subarray(i, i + 100));
console.log(wrong.length < expectTitles.length
  ? `sabotage control: wrong metaint recovers ${wrong.length}/${expectTitles.length} titles — the test can fail`
  : 'FAIL: wrong metaint still passed, so this test proves nothing');

process.exit(bad || fired || failed ? 1 : 0);

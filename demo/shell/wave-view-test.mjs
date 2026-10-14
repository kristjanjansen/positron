// demo/shell/wave-view-test.mjs: the wave view's arithmetic, with no browser.
//   node demo/shell/wave-view-test.mjs
// Proves the picture is a min/max envelope, not a decimation, by sabotage. Pixels, styles,
// ResizeObserver and the real frame loop are not graded here. Reads the owner's pack read-only
// for one section and skips it when absent.
// why: lessons/kit-wave-view.md#test-header

import fs from 'node:fs';
import path from 'node:path';
import { readZip, entry } from './unzip.mjs';
import { readWave, toMono, content } from './circuit-sample.mjs';
import * as V from './wave-view.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const PACK = path.join(HERE, '../../tmp/personal/New Pack.circuitpack');

let pass = 0, fail = 0, skip = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '  ' + detail : ''}`); }
};
const note = (s) => { skip++; console.log(`  skip ${s}`); };
const near = (a, b, eps = 1e-7) => Math.abs(a - b) <= eps;

console.log('\n== the wave view ==');

/* ── the fixture ───────────────────────────────────────────────────────────
   One signal, built so that every claim in the battery below is decidable on
   it. Nothing in it is silent, so a column that comes back at zero is a column
   the drawer never filled rather than a quiet moment in the audio. */

const FRAMES = 4096;
const COLS = 300;                       // 13.65 samples a column, deliberately not whole
const SPIKE_AT = 7;                     // inside column 0 and not on any stride
const SPIKE = 0.95;                     // the loudest thing in the file
const BURST_FROM = 1600, BURST_TO = 1700;   // a run that never crosses zero
const LAST = -0.8;                      // unique, and in the very last column

function fixture() {
  const s = new Float32Array(FRAMES);
  for (let i = 0; i < FRAMES; i++) {
    // Deterministic, never zero, and small enough that the three landmarks
    // below are the only extremes in the file.
    const v = 0.05 + 0.14 * Math.abs(Math.sin(i * 0.37));
    s[i] = i % 2 ? v : -v;
  }
  for (let i = BURST_FROM; i < BURST_TO; i++) s[i] = -0.3 - 0.3 * Math.abs(Math.sin(i * 0.11));
  s[SPIKE_AT] = SPIKE;
  s[FRAMES - 1] = LAST;
  return s;
}
const SIG = fixture();
const TRUE_PEAK = SIG.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

/* ── the columns ──────────────────────────────────────────────────────────── */

console.log('\n-- how the file is cut into columns --');

// 1. A column is a pixel, and a picture that has not been laid out yet still
//    gets an envelope rather than a divide by zero.
ok('a column is a pixel, and an unlaid-out picture falls back to the floor',
  V.columnCount(700) === 700 && V.columnCount(0) === V.MIN_COLS
  && V.columnCount(12) === V.MIN_COLS,
  `700 px gives ${V.columnCount(700)}, 0 px gives ${V.columnCount(0)}`);

// 2. The columns tile the file: each starts where the one before stopped.
// why: lessons/kit-wave-view.md#test-tiling
{
  const n = 95947, c = 700;                // the longest sample in the pack, in a 700 px box
  let tiles = true, from0 = -1, lastTo = -1;
  for (let i = 0; i < c; i++) {
    const r = V.columnRange(n, c, i);
    if (i === 0) from0 = r.from; else if (r.from !== lastTo) tiles = false;
    lastTo = r.to;
  }
  ok('the columns tile the file, so no sample is in the gap between two of them',
    tiles && from0 === 0 && lastTo === n,
    `${c} columns from ${from0} to ${lastTo} of ${n}`);
}

// 3. NEGATIVE CONTROL. No column is ever empty, at any count, including counts
//    with far more columns than there are samples. An empty column has no
//    minimum and no maximum and would be drawn as silence in the middle of a
//    sound.
{
  const counts = [1, 2, 3, 7, 64, 299, 300, 301, 700, 4095, 4096, 4097, 9000];
  const bad = [];
  for (const c of counts) {
    for (let i = 0; i < c; i++) {
      const r = V.columnRange(FRAMES, c, i);
      if (r.to <= r.from || r.from < 0 || r.to > FRAMES) { bad.push(`${c}/${i}`); break; }
    }
  }
  ok('no column is empty and none runs off the end, at thirteen column counts',
    bad.length === 0, bad.join() || `${counts.join(', ')} columns, all sound`);
}

// 4. And with fewer samples than columns every sample is still SHOWN, which is
//    the other direction of the same property: a 50 frame file in a 700 px box
//    repeats rather than hiding most of itself.
{
  const n = 50, c = 700;
  const seen = new Set();
  for (let i = 0; i < c; i++) {
    const r = V.columnRange(n, c, i);
    for (let j = r.from; j < r.to; j++) seen.add(j);
  }
  ok('a file with fewer samples than columns still shows every sample',
    seen.size === n, `${seen.size} of ${n} samples reachable`);
}

/* ── the envelope ─────────────────────────────────────────────────────────── */

console.log('\n-- what the envelope draws --');

const ENV = V.envelope(SIG, COLS);

// 5. The loudest sample sits at index 7 and the stride is 13.65, so a decimator never sees it.
// why: lessons/kit-wave-view.md#test-loudest
{
  const stride = FRAMES / COLS;
  const decimated = SIG[Math.floor(0 * stride)];
  ok('a spike between two strides is still drawn, which is the whole reason not to decimate',
    near(ENV.max[0], Math.fround(SPIKE)) && near(ENV.peak, Math.fround(TRUE_PEAK)),
    `column 0 reaches ${ENV.max[0].toFixed(4)} where one sample a column reads ${decimated.toFixed(4)}`);
}

// 6. NEGATIVE CONTROL. A run that never crosses zero reports a NEGATIVE
//    maximum. Taking the absolute value per column, or clamping the maximum at
//    zero, both throw away which side of the line the sound is on.
{
  const inBurst = [];
  for (let i = 0; i < COLS; i++) {
    const r = V.columnRange(FRAMES, COLS, i);
    if (r.from >= BURST_FROM && r.to <= BURST_TO) inBurst.push(i);
  }
  ok('a column of nothing but negative samples reports a negative maximum',
    inBurst.length > 0 && inBurst.every((i) => ENV.max[i] < 0 && ENV.min[i] < ENV.max[i]),
    `${inBurst.length} columns inside the burst, max ${ENV.max[inBurst[0]].toFixed(4)}`);
}

// 7. The peak the picture draws is the peak in the file, at every column count.
// why: lessons/kit-wave-view.md#test-peak-invariant
{
  const counts = [4, 17, 64, 128, 300, 397, 700, 1024, 1920, 4096];
  const off = counts.filter((c) => V.envelope(SIG, c).peak !== Math.fround(TRUE_PEAK));
  ok('the peak the picture draws is the peak in the file, at ten column counts',
    off.length === 0, off.length ? `wrong at ${off.join()}` : `${Math.fround(TRUE_PEAK).toFixed(4)} at every width`);
}

// 8. And it is drawn in the right PLACE, not merely found. A picture that knew
//    the peak and painted it in column 0 would pass the check above.
{
  const want = Math.floor(SPIKE_AT / (FRAMES / COLS));
  ok('the peak is drawn in the column the sample it came from falls in',
    ENV.peakCol === want, `column ${ENV.peakCol}, and sample ${SPIKE_AT} falls in column ${want}`);
}

// 9. Nothing to draw is a picture of nothing, not a throw and not a peak of
//    something. A page swapping samples will hand this an empty array the first
//    time somebody presses the wrong row.
{
  const e = V.envelope(new Float32Array(0), 700);
  ok('an empty sample draws an empty picture rather than throwing',
    e.empty && e.peak === 0 && e.cols === 700 && e.min.length === 700 && e.lit === 0,
    `${e.cols} columns, peak ${e.peak}`);
}

/* ── the head ─────────────────────────────────────────────────────────────── */

console.log('\n-- where the head is --');

const DUR = 1.3;

// 10. The plain mapping, and both ends of it.
ok('the head runs from the left edge to the right edge across the sound',
  V.headAt(0, DUR) === 0 && near(V.headAt(DUR / 2, DUR), 0.5) && V.headAt(DUR, DUR) === 1,
  `${V.headAt(DUR / 2, DUR)} at half`);

// 11. NEGATIVE CONTROL. A clock read a frame before the sound starts is
//     slightly negative and one read a frame after a one shot ends is slightly
//     past the duration. Neither is an error, and neither may make the head
//     disappear for a frame.
ok('a position just outside the sound is clamped rather than dropped',
  V.headAt(-0.004, DUR) === 0 && V.headAt(DUR + 0.004, DUR) === 1
  && V.headAt(1, 0) === null && V.headAt(NaN, DUR) === null,
  'and a sample with no duration has no head at all');

// 11b. `null`, `undefined`, `''` and `false` are no head, not a head at zero.
// why: lessons/kit-wave-view.md#test-dead-guard
ok('a head that was taken away is gone, rather than coming back at zero',
  V.headAt(null, DUR) === null && V.headAt(undefined, DUR) === null
  && V.headAt('', DUR) === null && V.headAt(false, DUR) === null
  && V.headX(null, DUR, 700) === null && V.secondsToX(null, DUR, 700) === null,
  'Number(null) is 0, which is what the first version of this guard believed');

// 11c. And a position arriving as TEXT is refused rather than parsed. A page
//      that hands a string to a playhead has a bug, and a component that
//      quietly reads it draws a head somebody else thinks they cleared.
ok('a numeric string is not a position',
  V.headAt('0.5', DUR) === null && V.headAt(true, DUR) === null,
  'strict, and the refusal is the same shape as the one above');

// 12. A head at the very end is drawn inside the canvas, not at x equal to the width.
// why: lessons/kit-wave-view.md#test-last-pixel
{
  const W = 700;
  const end = V.headX(DUR, DUR, W), start = V.headX(0, DUR, W);
  ok('the head at the very end is still inside the picture, by its own width',
    end === W - V.HEAD_PX && end + V.HEAD_PX <= W && start === 0,
    `x ${end} of ${W}, and the line ends at ${end + V.HEAD_PX}`);
}

// 13. Seconds to pixels and back again. A picture 700 px wide cannot resolve
//     better than one pixel, so the round trip is asserted to that and no
//     tighter.
{
  const W = 700, bad = [];
  for (const t of [0, 0.001, 0.25, 0.5, 0.9999, 1.2, DUR]) {
    const back = V.xToSeconds(V.secondsToX(t, DUR, W), W, DUR);
    if (Math.abs(back - t) > DUR / W) bad.push(`${t} to ${back.toFixed(6)}`);
  }
  ok('seconds to pixels and back again comes home, inside one pixel',
    bad.length === 0, bad.join('; ') || `one pixel is ${(DUR / W * 1000).toFixed(2)} ms here`);
}

// 14. NEGATIVE CONTROL. The head is never drawn at a negative x, which would
//     put it over whatever sits to the left of the picture.
ok('a position before the start draws at the left edge and never left of it',
  V.headX(-5, DUR, 700) === 0 && V.xToSeconds(-40, 700, DUR) === 0);

/* ── the battery, and the four broken drawers ─────────────────────────────── */

console.log('\n-- the sabotages, and what stays green under each --');

// Six claims, all true of a min/max envelope over the fixture. Each broken
// drawer runs the battery and the claims that go red are the measurement.
function battery(draw) {
  const out = [];
  const add = (name, fn) => {
    try { out.push({ name, ok: !!fn() }); } catch (e) { out.push({ name, ok: false, why: e.message }); }
  };
  const e = draw(SIG, COLS);
  add('it reaches the peak that is in the file', () => near(e.peak, Math.fround(TRUE_PEAK), 1e-6));
  add('it draws the spike in the column it belongs to',
    () => near(e.max[0], Math.fround(SPIKE), 1e-6));
  add('it keeps the sign of a burst that never crosses zero', () => {
    for (let i = 0; i < COLS; i++) {
      const r = V.columnRange(FRAMES, COLS, i);
      if (r.from >= BURST_FROM && r.to <= BURST_TO && e.max[i] < 0) return true;
    }
    return false;
  });
  add('it fills every column, and the fixture has no silence in it',
    () => Array.from(e.max).every((v, i) => v !== 0 || e.min[i] !== 0));
  add('it covers the last sample in the file',
    () => Array.from(e.min).some((v) => v <= Math.fround(LAST) + 1e-6));
  add('no column has a maximum below its minimum',
    () => Array.from(e.max).every((v, i) => v >= e.min[i]));
  return out;
}
const withPeak = (min, max) => {
  let peak = 0, peakCol = -1;
  for (let i = 0; i < max.length; i++) {
    const a = Math.max(Math.abs(min[i]), Math.abs(max[i]));
    if (a > peak) { peak = a; peakCol = i; }
  }
  return { cols: max.length, frames: FRAMES, min, max, peak, peakCol, empty: false };
};
const reds = (draw) => battery(draw).filter((c) => !c.ok);
const N = battery(V.envelope).length;

ok(`the real envelope passes all ${N} of the battery`, reds(V.envelope).length === 0,
  reds(V.envelope).map((c) => c.name).join('; ') || 'nothing red');

// Sabotage 1: one sample every N. Misses the loudest sample, the peak and the end.
// why: lessons/kit-wave-view.md#test-sabotage-decimate
{
  const decimate = (s, c) => {
    const min = new Float32Array(c), max = new Float32Array(c);
    for (let i = 0; i < c; i++) {
      const v = s[Math.min(s.length - 1, Math.floor((i * s.length) / c))];
      min[i] = v; max[i] = v;
    }
    return withPeak(min, max);
  };
  const r = reds(decimate);
  const drew = decimate(SIG, COLS).peak;
  ok(`one sample every N takes ${r.length} of ${N} red, and none of the three survivors is about a peak`,
    r.length === 3
    && r.some((c) => c.name.includes('reaches the peak'))
    && r.some((c) => c.name.includes('spike'))
    && r.some((c) => c.name.includes('last sample')),
    `it draws a peak of ${drew.toFixed(4)} where the file holds ${Math.fround(TRUE_PEAK).toFixed(4)}`);
  // A decimation keeps the sign and the shape, which is why it survives review.
  // why: lessons/kit-wave-view.md#test-decimate-sign
  ok('while it is still green on the sign and on the shape, so the battery is not simply hostile',
    battery(decimate).filter((c) => c.ok).length === 3);
}

// Sabotage 2: magnitude per column, drawn symmetrically; a one-way transient goes both ways.
// why: lessons/kit-wave-view.md#test-sabotage-symmetric
{
  const symmetric = (s, c) => {
    const e = V.envelope(s, c);
    const min = new Float32Array(c), max = new Float32Array(c);
    for (let i = 0; i < c; i++) {
      const a = Math.max(Math.abs(e.min[i]), Math.abs(e.max[i]));
      min[i] = -a; max[i] = a;
    }
    return withPeak(min, max);
  };
  const r = reds(symmetric);
  ok(`drawing the magnitude both ways takes ${r.length} of ${N} red, and it is the sign`,
    r.length === 1 && r[0].name.includes('sign'),
    r.map((c) => c.name).join('; '));
}

// Sabotage 3: a stride of round(frames / cols). 4,096 / 300 rounds to 14, so the last seven
// columns start past the end: one claim red, and seven blank columns at the right edge.
// why: lessons/kit-wave-view.md#test-sabotage-rounded
{
  const rounded = (s, c) => {
    const min = new Float32Array(c), max = new Float32Array(c);
    const stride = Math.round(s.length / c);
    for (let i = 0; i < c; i++) {
      const from = i * stride;
      if (from >= s.length) continue;                    // the columns that go missing
      let lo = s[from], hi = s[from];
      for (let j = from + 1; j < Math.min(s.length, from + stride); j++) {
        if (s[j] < lo) lo = s[j];
        if (s[j] > hi) hi = s[j];
      }
      min[i] = lo; max[i] = hi;
    }
    return withPeak(min, max);
  };
  const r = reds(rounded);
  const e = rounded(SIG, COLS);
  const blank = Array.from(e.max).filter((v, i) => v === 0 && e.min[i] === 0).length;
  ok(`a stride of round(frames / cols) takes ${r.length} of ${N} red, and it is the blank tail`,
    r.length === 1 && r[0].name.includes('every column')
    && blank === COLS - Math.ceil(FRAMES / Math.round(FRAMES / COLS)),
    `${blank} of ${COLS} columns drawn as silence, and the file has none`);
}

// Sabotage 4: the maximum clamped at zero, `Math.max(0, hi)`.
// why: lessons/kit-wave-view.md#test-sabotage-clamped
{
  const clamped = (s, c) => {
    const e = V.envelope(s, c);
    const min = new Float32Array(c), max = new Float32Array(c);
    for (let i = 0; i < c; i++) { min[i] = Math.min(0, e.min[i]); max[i] = Math.max(0, e.max[i]); }
    return withPeak(min, max);
  };
  const r = reds(clamped);
  ok(`clamping the maximum at zero takes ${r.length} of ${N} red, the same one the magnitude took`,
    r.length === 1 && r[0].name.includes('sign'),
    'two different mistakes, one claim that can see either of them');
  // The real envelope must still be green after every sabotage.
  // why: lessons/kit-wave-view.md#test-control
  ok('while the real envelope is still green, so the sabotages are the difference',
    reds(V.envelope).length === 0 && SIG[SPIKE_AT] === Math.fround(SPIKE));
}

/* ── real audio ───────────────────────────────────────────────────────────── */

console.log('\n-- against the 64 real samples --');

if (!fs.existsSync(PACK)) {
  note(`no pack at ${PACK}, so the synthetic fixtures carry this on their own`);
} else {
  const list = await readZip(new Uint8Array(fs.readFileSync(PACK)));
  const mono = [];
  for (let i = 0; i < 64; i++) {
    const w = readWave(await entry(list, `samples/sample_${i}.wav`).read());
    mono.push({ i, m: toMono(w), c: content(w), seconds: w.duration });
  }
  const longest = mono.reduce((a, b) => (b.m.frames > a.m.frames ? b : a));

  // 15. Against the pack's 64 drum samples in a 700 px box: drawn peak equals decoded peak.
  // why: lessons/kit-wave-view.md#test-real-peaks
  {
    const off = mono.filter((s) => V.envelope(s.m.samples, 700).peak !== s.c.peak);
    ok('in all 64 real samples the drawn peak is the measured peak, in a 700 px box',
      off.length === 0,
      off.length ? `${off.length} disagree` : `${mono.length} samples, 5,999 to ${longest.m.frames.toLocaleString('en-US')} frames`);
  }

  // 16. The longest sample is 95,947 frames: 137 frames a column at 700 px, so one sample a
  // column would draw 0.73 per cent of the file.
  // why: lessons/kit-wave-view.md#test-real-cost
  {
    const s = longest;
    const c = 700;
    let dec = 0;
    for (let i = 0; i < c; i++) {
      dec = Math.max(dec, Math.abs(s.m.samples[Math.floor((i * s.m.frames) / c)]));
    }
    const env = V.envelope(s.m.samples, c);
    ok('and one sample a column really does miss the peak of the longest one',
      dec < env.peak && env.peak === s.c.peak,
      `${(c / s.m.frames * 100).toFixed(2)} per cent of the file read, peak ${dec.toFixed(4)} against ${env.peak.toFixed(4)}`);
  }

  // 17. A column comes back blank only where the audio really is zero (real samples carry
  // leading and trailing silence).
  // why: lessons/kit-wave-view.md#test-blank-columns
  {
    const wrong = [];
    let blanks = 0;
    for (const s of mono) {
      for (const c of [V.MIN_COLS, 390, 700, 1920]) {
        const e = V.envelope(s.m.samples, c);
        for (let i = 0; i < c; i++) {
          if (e.max[i] !== 0 || e.min[i] !== 0) continue;
          blanks++;
          const r = V.columnRange(s.m.frames, c, i);
          for (let j = r.from; j < r.to; j++) {
            if (s.m.samples[j] !== 0) { wrong.push(`${s.i}/${c}/${i}`); break; }
          }
        }
      }
    }
    ok('a column is blank only where the file really is silent, over 256 pictures of real audio',
      wrong.length === 0,
      wrong.slice(0, 6).join() || `${blanks} blank columns, every one of them over silence`);
  }

  // 18. The head arithmetic against real durations, at a real width.
  {
    const bad = mono.filter((s) => {
      const end = V.headX(s.seconds, s.seconds, 700);
      return end !== 700 - V.HEAD_PX || V.headAt(s.seconds / 2, s.seconds) !== 0.5;
    });
    ok('the head reaches the end of all 64 and stays inside the picture',
      bad.length === 0,
      bad.length ? `${bad.length} wrong` : '0.124979 s to 1.998896 s, one head position each');
  }
}

// ── the component, against a stub document ──────────────────────────────
// Grades which canvas calls the component makes, with a stub that rasterises rectangles;
// only the coarsest claims (any byte set, frame counter stops) are taken from it.
// why: lessons/kit-wave-view.md#test-stub-section

console.log('\n-- the component, driven against a stub document --');

function stubCtx(canvas) {
  let sx = 1, sy = 1, fill = [0, 0, 0];
  const hex = (v) => {
    const m = /^#([0-9a-f]{6})$/i.exec(String(v).trim());
    return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : [255, 255, 255];
  };
  const rect = (x, y, w, h, on) => {
    const x0 = Math.max(0, Math.round(x * sx)), y0 = Math.max(0, Math.round(y * sy));
    const x1 = Math.min(canvas.width, Math.round((x + w) * sx));
    const y1 = Math.min(canvas.height, Math.round((y + h) * sy));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * canvas.width + px) * 4;
        canvas.bits[i] = on ? fill[0] : 0;
        canvas.bits[i + 1] = on ? fill[1] : 0;
        canvas.bits[i + 2] = on ? fill[2] : 0;
        canvas.bits[i + 3] = on ? 255 : 0;
      }
    }
  };
  return {
    setTransform(a, b, c, d) { sx = a; sy = d; },
    scale(x, y) { sx *= x; sy *= y; },
    set fillStyle(v) { fill = hex(v); },
    get fillStyle() { return fill; },
    fillRect(x, y, w, h) { rect(x, y, w, h, true); },
    clearRect(x, y, w, h) { rect(x, y, w, h, false); },
    getImageData(x, y, w, h) { return { data: canvas.bits }; },
  };
}

function stubEl(tag) {
  const e = {
    tag, className: '', textContent: '', hidden: false, id: '', children: [], removed: false,
    style: { setProperty(k, v) { e.style[k] = v; } },
    clientWidth: 0, clientHeight: 0, width: 0, height: 0, bits: new Uint8ClampedArray(4),
    setAttribute() {},
    append(...k) { e.children.push(...k); },
    remove() { e.removed = true; },
    getContext() { return (e.ctx = e.ctx || stubCtx(e)); },
  };
  // A canvas loses its bitmap when a dimension is assigned, as a real one does; `clear()`
  // must not wait for that.
  // why: lessons/kit-wave-view.md#test-stub-width
  let w = 0, h = 0;
  Object.defineProperty(e, 'width', {
    get: () => w, set: (v) => { w = v; e.bits = new Uint8ClampedArray(Math.max(1, w * h) * 4); },
  });
  Object.defineProperty(e, 'height', {
    get: () => h, set: (v) => { h = v; e.bits = new Uint8ClampedArray(Math.max(1, w * h) * 4); },
  });
  return e;
}

const styles = [];
let rafQ = [];
globalThis.document = {
  createElement: stubEl,
  getElementById: (id) => styles.find((s) => s.id === id) || null,
  head: { prepend(s) { styles.push(s); } },
  documentElement: {},
};
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
globalThis.window = { devicePixelRatio: 2 };
globalThis.requestAnimationFrame = (fn) => rafQ.push(fn);
globalThis.cancelAnimationFrame = () => { rafQ = []; };
globalThis.ResizeObserver = class { observe() {} disconnect() {} };

{
  const host = stubEl('div');
  const view = V.createWaveView(host, { height: 120, label: 'a sample' });
  const wrap = host.children[0];
  const cv = wrap.children[0];
  const anyInk = () => { for (let i = 3; i < cv.bits.length; i += 4) if (cv.bits[i]) return true; return false; };
  // A layout the component can measure. It reads `clientWidth` off the wrapper
  // and `clientHeight` off the canvas, which is the content box either way.
  wrap.clientWidth = 700; cv.clientHeight = 120;

  const s = new Float32Array(48000);
  for (let i = 0; i < s.length; i++) s[i] = Math.sin(i / 40) * 0.8;
  s[1234] = 0.99;

  // 22. It puts nothing on the page before there is anything to show.
  ok('a view with no sample is hidden and has painted nothing',
    wrap.hidden === true && !anyInk() && view.facts().drawn === false
    && styles.length === 1,
    `${styles.length} stylesheet injected, hidden ${wrap.hidden}`);

  // 23. A sample goes in, the box comes back, and the BITMAP has ink in it.
  const put = view.set(s, 48000, { name: 'sample_0' });
  const drew = view.ink();
  ok('a sample unhides the box and really does reach the bitmap',
    put.ok && wrap.hidden === false && drew.measured === true && drew.ink > 0
    && drew.ink < drew.total && cv.width === 1400 && cv.height === 240,
    `${drew.ink.toLocaleString('en-US')} of ${drew.total.toLocaleString('en-US')} pixels, backing store ${cv.width}x${cv.height}`);

  // 24. `clear()` wipes the canvas synchronously, asserted on the bytes, not on `ink()`.
  // why: lessons/kit-wave-view.md#test-clear-wipes
  const was = drew.ink;
  view.clear();
  const after = view.ink();
  ok('clear() empties the bitmap rather than only hiding the box',
    !anyInk() && after.ink === 0 && wrap.hidden === true && view.facts().drawn === false,
    `${was.toLocaleString('en-US')} pixels before, ${after.ink} after, and every byte of the bitmap is zero`);

  // 25. And `ink()` says it had nothing to measure, rather than returning a
  //     share about a bitmap with no field colour in it.
  ok('and ink() reports that it measured nothing, instead of a number that cannot move',
    after.measured === false && after.share === 0 && after.why.includes('empty'),
    after.why);

  // 26. The frame loop runs while something plays and STOPS when it does not.
  //     Read off the counter, never off the boolean: a state read one line
  //     after an event is an instant, and a counter is what has happened.
  {
    view.set(s, 48000, { name: 'again' });
    let t = 0;
    view.follow(() => t);
    const step = () => { const q = rafQ; rafQ = []; for (const fn of q) fn(); };
    t = 0.1; step(); t = 0.2; step();
    const running = view.facts();
    t = null; step();                       // the page says the sound stopped
    const stopped = view.facts().paints;
    step(); step();
    ok('the head moves while something plays and the loop stops dead when it does not',
      running.moving === true && running.ticks === 2 && running.position === 0.2
      && view.facts().moving === false && view.facts().paints === stopped
      && rafQ.length === 0,
      `${running.paints} paints while following, then ${stopped} and no more`);
  }

  // 27. NEGATIVE CONTROL ON THE STUB ITSELF. Everything above is worthless if
  //     the stub canvas records nothing, so one rectangle is drawn by hand and
  //     read back.
  {
    const probe = stubEl('canvas');
    probe.width = 4; probe.height = 4;
    const c = probe.getContext();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#ffffff';
    c.fillRect(1, 1, 2, 2);
    let on = 0;
    for (let i = 3; i < probe.bits.length; i += 4) if (probe.bits[i]) on++;
    c.clearRect(0, 0, 4, 4);
    let left = 0;
    for (let i = 3; i < probe.bits.length; i += 4) if (probe.bits[i]) left++;
    ok('the stub canvas can tell a drawn pixel from an empty one, or none of the five above mean anything',
      on === 4 && left === 0, `${on} of 16 pixels filled, ${left} left after a clear`);
  }
}

/* ── the absence ──────────────────────────────────────────────────────────── */

console.log('\n-- what this module must not be able to do --');

// 19. THE EXPORT TEST. A drawer that could make a sound would be a second audio
//     path in a page that already has one.
{
  const names = Object.keys(V);
  const makers = names.filter((k) => /audio|context|play|sound|start|fetch|midi/i.test(k));
  ok('no export is named for playing, opening or fetching anything',
    makers.length === 0, makers.join() || `${names.length} exports: ${names.join(', ')}`);
}

// 20. A source test, since a name test cannot see a call inside a function; comments are
// stripped first because the header names what it never calls.
// why: lessons/kit-wave-view.md#test-source
{
  const src = fs.readFileSync(path.join(HERE, 'wave-view.mjs'), 'utf8');
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  ok('the comment stripper left the code behind, which is what makes the next checks worth reading',
    code.includes('export function envelope') && !code.includes('IT DRAWS AND IT DOES NOT PLAY'),
    `${src.length} characters down to ${code.length}`);

  const banned = ['AudioContext', 'decodeAudioData', 'AudioWorklet', 'createBufferSource',
    'new Audio', 'HTMLAudioElement', '.play(', 'fetch(', 'XMLHttpRequest', 'WebSocket',
    'requestMIDIAccess', 'navigator.mediaDevices'];
  const found = banned.filter((b) => code.includes(b));
  ok('the code opens no audio device, no socket, no port and no request',
    found.length === 0, found.join() || `${banned.length} patterns, none present`);

  // One call site for the frame loop and a way to stop it. A source test; whether it really
  // stops needs a browser.
  // why: lessons/kit-wave-view.md#test-frame-loop
  const starts = (code.match(/requestAnimationFrame\(/g) || []).length;
  const stops = (code.match(/cancelAnimationFrame\(/g) || []).length;
  ok('the frame loop has two call sites, the arming one and the loop asking for the next frame',
    starts === 2 && stops === 1,
    `${starts} requestAnimationFrame, ${stops} cancelAnimationFrame, and one place that calls it`);

  ok('the file says so in its own header, so the next reader is told rather than left to notice',
    src.includes('IT DRAWS AND IT DOES NOT PLAY')
    && src.includes('THE HEAD MOVES ONLY WHILE SOMETHING IS PLAYING'));

  // 21. No em dash or middot in the module. The characters are escapes so this file passes.
  // why: lessons/kit-wave-view.md#test-no-dashes
  const dash = String.fromCharCode(0x2014), middot = String.fromCharCode(0x00b7);
  ok('no em dash and no middot anywhere in the module, comments included',
    !src.includes(dash) && !src.includes(middot),
    `${src.split('\n').length} lines`);
}

console.log(`\n${pass} ok, ${fail} failed${skip ? `, ${skip} skipped` : ''}`);
process.exit(fail ? 1 : 0);

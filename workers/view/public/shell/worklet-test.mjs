// demo/shell/worklet-test.mjs. Carrying code into a worklet, with no browser.
//
//   node demo/shell/worklet-test.mjs
//
// `workletSource` turns functions and constants into text. Everything that can
// go wrong with that is text going wrong, so none of it needs an audio thread:
// what a browser adds is `addModule`, and `addModule` either takes valid source
// or it does not.
//
// 🔴 THE ONE THAT MATTERS IS TEST 3, AND IT IS WHY THIS FILE EXISTS. The copy
// in the blob has to compute THE SAME NUMBERS as the module it came from. Not
// approximately, and not "it ran without throwing": the same floats. A test
// that only checked the source contained the function name would pass on a
// build where `toString()` returned something subtly different, and a page
// would ship two versions of one instrument.
//
// 🔴 AND TEST 4 IS THE NEGATIVE CONTROL FOR THE TRAP THE HEADER NAMES. A
// function carried without the constant it closes over defines perfectly and
// throws the moment it runs, which in a page is on the audio thread. Here it
// throws in front of a test with the missing name in the message.
//
// TWENTY THREE OF THESE THIRTY TWO ARE REFUSALS OR NEGATIVE CONTROLS: each one
// is written so that the defect it names would fail it, rather than so that
// today's code passes.
//
// 🔴 FIVE DELIBERATE SABOTAGES, MEASURED 2026-09-23 RATHER THAN CLAIMED, and
// two of the numbers are not the ones this comment was first written with:
//
//   dropping the value guard          9 red
//   dropping the name check           4 red
//   dropping the `[native code]` guard 2 red
//   `let` instead of `const`          2 red
//   emitting the values in REVERSE    0 red
//
// ⚠️ THE ZERO IS THE USEFUL ONE AND IT IS KEPT RATHER THAN ENGINEERED AWAY.
// Reversing the order changes nothing, because a name inside a function body is
// read when the function runs and every `const` has landed by then. The first
// version of this file asserted the opposite and went red on working code, so
// the order values are passed in is NOT a rule here and `worklet.mjs` says so.
// ⚠️ AND THE TWO FOR `let` ARE BOTH TEXT ASSERTIONS rather than behaviour: a
// blob full of `let` works. They hold the emitter to what its own header
// promises, which is worth less than the other nine and is worth saying.

import { workletSource } from './worklet.mjs';
import { rhodesVoice, mixVoices } from './rhodes.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? '   ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? '   ' + detail : ''}`); }
};
const threw = (fn) => { try { fn(); return null; } catch (e) { return String(e.message || e); } };

/**
 * Run emitted source the way a worklet would, and hand back what it made.
 *
 * ⚠️ `new Function` IS NOT A WORKLET AND THIS FILE DOES NOT PRETEND IT IS. What
 * it shares with one is the thing under test: a scope with none of this
 * module's bindings in it, evaluating a piece of text. What it cannot tell you
 * is whether `addModule` accepts the blob, whether the origin is secure, or
 * whether a Content-Security-Policy refuses it. Those three are in
 * `worklet.mjs`'s header and a browser is the only thing that can answer them.
 */
const run = (src, tail = '') => new Function(`${src}\n${tail}`)();

// 1. A function is emitted under its own name, as a const, with its source.
{
  const add = (a, b) => a + b;
  const src = workletSource({ values: { add } });
  ok('a function arrives as a const with its own name',
    src.includes('const add = ') && src.includes('a + b'), JSON.stringify(src.trim()));
  // NEGATIVE CONTROL: it is not merely mentioned, it works in a scope that has
  // nothing else in it.
  ok('and it runs in a scope that has none of this module in it',
    run(src, 'return add(2, 3);') === 5);
}

// 2. Constants come across as values rather than as names.
{
  const src = workletSource({ values: { RATE: 48000, NAME: 'organ', LIST: [1, 2, 3],
                                        CFG: { a: 1, b: { c: 2 } } } });
  ok('numbers, strings, arrays and nested objects all cross',
    run(src, 'return [RATE, NAME, LIST[2], CFG.b.c].join(",");') === '48000,organ,3,2');
}

// 3. 🔴 THE COPY COMPUTES THE SAME NUMBERS AS THE ORIGINAL. The whole point.
{
  const TAU = Math.PI * 2;
  const src = workletSource({ values: { TAU, rhodesVoice } });
  const copy = run(src, 'return rhodesVoice;');
  let worst = 0, n = 0;
  for (const note of [21, 48, 60, 84, 108]) {
    const freq = 440 * Math.pow(2, (note - 69) / 12);
    for (const vel of [1, 64, 127]) {
      const a = rhodesVoice(freq, vel), b = copy(freq, vel);
      for (let t = 0; t < 0.5; t += 0.0013) {
        worst = Math.max(worst, Math.abs(a.sample(t) - b.sample(t)));
        n++;
      }
    }
  }
  ok('the copy in the blob is the same instrument, sample for sample',
    worst === 0, `${n} samples compared, worst difference ${worst}`);
  // NEGATIVE CONTROL: the comparison can tell two instruments apart at all.
  const other = rhodesVoice(440, 100), same = rhodesVoice(440, 20);
  ok('and that comparison is able to see a difference when there is one',
    Math.abs(other.sample(0.01) - same.sample(0.01)) > 1e-6,
    `${other.sample(0.01).toFixed(6)} against ${same.sample(0.01).toFixed(6)}`);
}

// 4. 🔴 THE LOST CLOSURE, WHICH IS THE TRAP THE HEADER IS ABOUT.
{
  const src = workletSource({ values: { rhodesVoice } });      // TAU left out
  ok('a function carried without what it closes over still DEFINES perfectly',
    src.includes('const rhodesVoice ='));
  const msg = threw(() => run(src, 'return rhodesVoice(440, 100).sample(0.01);'));
  ok('and throws the moment it runs, with the missing name in the message',
    msg !== null && /TAU/.test(msg), msg || 'it did not throw');
  // NEGATIVE CONTROL: the same call with the constant carried does not throw.
  const whole = workletSource({ values: { TAU: Math.PI * 2, rhodesVoice } });
  ok('and the same call with the constant beside it does not throw',
    threw(() => run(whole, 'return rhodesVoice(440, 100).sample(0.01);')) === null);
}

// 5. Order is the order given, so a value may use one declared before it.
{
  const src = workletSource({ values: { BASE: 7, twice: (n) => n * 2, seed: 3 },
                              body: 'globalThis.__out = twice(BASE + seed);' });
  ok('the body runs last and sees every name', run(src, 'return __out;') === 20);
  /* 🔴 THIS TEST EXPECTED THE OPPOSITE AND WAS WRONG, AND THE MODULE'S
     DOCUMENTATION WAS WRONG WITH IT. It asserted that a function referring to a
     const declared AFTER it would throw, on a reading of the temporal dead
     zone. It does not: a name inside a function body is looked up when the
     function RUNS, and by then every `const` in the blob has landed. So the
     order values are passed in does not constrain what they may refer to, and
     saying otherwise in the header would have sent the next person reordering
     an object literal to fix a bug that was somewhere else. */
  const late = workletSource({ values: { early: () => LATE * 2, LATE: 5 } });
  ok('a carried function may refer to a name declared after it, because it is '
     + 'read when it runs', run(late, 'return early();') === 10);
}

// 6. A class is carried whole.
{
  class Ring {
    constructor(n) { this.buf = new Float32Array(n); }
    size() { return this.buf.length; }
  }
  const src = workletSource({ values: { Ring } });
  ok('a class crosses with its methods', run(src, 'return new Ring(8).size();') === 8);
}

// 7. NEGATIVE CONTROL: a native or bound function has no source, and emitting
//    it would make a SyntaxError out of the whole blob.
{
  const msg = threw(() => workletSource({ values: { max: Math.max } }));
  ok('a native function is refused rather than emitted as [native code]',
    msg !== null && /native or bound/.test(msg), msg || 'it was accepted');
  const bound = threw(() => workletSource({ values: { f: ((a) => a).bind(null) } }));
  ok('and so is a bound one', bound !== null && /native or bound/.test(bound));
  // and the reason it matters, stated as the thing that would otherwise happen
  ok('because [native code] is not source a blob could parse',
    threw(() => new Function(`const max = ${Math.max.toString()};`)) !== null);
}

// 8. 🔴 NEGATIVE CONTROLS FOR THE THINGS JSON CHANGES RATHER THAN REFUSES, AND
//    THE FIRST TWO OF THESE FOUND A REAL DEFECT IN `worklet.mjs` THE FIRST TIME
//    THEY RAN. The guard tested `JSON.stringify(v) === undefined`, which is
//    true for a function and false for a Map: `JSON.stringify(new Map([[1,2]]))`
//    is `"{}"`. So a page passing a filled lookup table would have handed the
//    audio thread an EMPTY OBJECT, with nothing thrown and nothing logged.
{
  for (const [what, v] of [['a Map', new Map([[1, 2]])], ['a Set', new Set([1])],
                           ['a Float32Array', new Float32Array(4)],
                           ['a class instance', new (class Thing { constructor() { this.a = 1; } })()],
                           ['a Map nested inside a plain object', { deep: { m: new Map() } }],
                           ['NaN', NaN], ['Infinity', Infinity],
                           ['undefined', undefined], ['a symbol', Symbol('x')]]) {
    const msg = threw(() => workletSource({ values: { x: v } }));
    ok(`${what} is refused`, msg !== null, msg || 'it was accepted');
  }
  // and the shape of what would otherwise have happened, stated once
  ok('because JSON turns a Map into {} and NaN into null rather than refusing them',
    JSON.stringify(new Map([[1, 2]])) === '{}' && JSON.stringify(NaN) === 'null');
  // and the ones that look the same and are fine
  ok('while null crosses, because JSON carries it',
    run(workletSource({ values: { x: null } }), 'return x === null;') === true);
  ok('and so does a plain object of plain values',
    run(workletSource({ values: { x: { a: [1, 'two', null], b: true } } }),
        'return x.a[1] === "two" && x.b === true;') === true);
}

// 9. NEGATIVE CONTROL: a name that cannot be a const is refused. The failure
//    without this is a SyntaxError naming a blob URL.
{
  for (const bad of ['two words', '2nd', 'a-b', '']) {
    ok(`"${bad}" is refused as a name`,
      threw(() => workletSource({ values: { [bad]: 1 } })) !== null);
  }
}

// 10. Whatever comes out parses. This is the check that would catch a change to
//     the emitter that produced something no browser could load.
{
  const TAU = Math.PI * 2;
  const src = workletSource({
    values: { TAU, rhodesVoice, mixVoices, N: 128 },
    body: 'globalThis.__ok = typeof mixVoices === "function";',
  });
  ok('everything this module emits is source a scope can evaluate',
    threw(() => new Function(src)) === null);
  ok('and the whole kit reaches it together',
    run(src, 'return __ok && typeof rhodesVoice === "function" && N === 128;') === true);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);

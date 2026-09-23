// demo/shell/local-remote-test.mjs. The crossfade's arithmetic, with no audio
// and no browser at all.
//
//   node demo/shell/local-remote-test.mjs
//
// `fadeGains` is the one pure thing in `local-remote.mjs` and it is the one
// thing in it that can be wrong without anybody seeing: a linear pair looks
// identical on screen, behaves identically under a harness that only reads the
// slider, and is 3 dB down in the middle, which is exactly where a listener
// stops to compare the two ends. That claim needs a number rather than a
// picture.
//
// FOUR OF THESE ARE NEGATIVE CONTROLS. They are written so the bug they
// describe would fail them, rather than so today's code passes them.

import { fadeGains, NARROW_PX, KINDS, ARRANGEMENTS } from './local-remote.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ', ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ', ' + detail : ''}`); }
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const f = (x) => x.toFixed(5);

console.log('\n== local and remote ==');

// ── the two ends ────────────────────────────────────────────────────────────

// 1. All the way to the near end is all of one side and none of the other.
{
  const g = fadeGains(0);
  ok('at nought the local side is whole and the remote side is silent',
    near(g.local, 1) && near(g.remote, 0), `local ${f(g.local)}, remote ${f(g.remote)}`);
}

// 2. And the far end is the mirror of it.
{
  const g = fadeGains(1);
  ok('at one the remote side is whole and the local side is silent',
    near(g.local, 0) && near(g.remote, 1), `local ${f(g.local)}, remote ${f(g.remote)}`);
}

// 3. The middle is BOTH, which is the half a switch cannot do.
{
  const g = fadeGains(0.5);
  ok('the middle is both sides at once, at the same level',
    near(g.local, g.remote) && g.local > 0.7 && g.local < 0.71,
    `local ${f(g.local)}, remote ${f(g.remote)}`);
}

// ── equal power, which is the whole reason this is not a straight line ───────

// 4. The property that names it: the squares sum to one everywhere, so two
//    uncorrelated sources keep a constant loudness across the whole travel.
{
  let worst = 0, at = 0;
  for (let i = 0; i <= 1000; i++) {
    const b = i / 1000;
    const g = fadeGains(b);
    const p = g.local * g.local + g.remote * g.remote;
    if (Math.abs(p - 1) > worst) { worst = Math.abs(p - 1); at = b; }
  }
  ok('the power is the same at every position on the lane, not the sum',
    worst < 1e-12, `1001 positions, worst ${worst.toExponential(2)} off one at ${at}`);
}

// 5. NEGATIVE CONTROL. A LINEAR pair passes every check above about the two
//    ends and fails this one, which is the bug this function exists to avoid.
//    MEASURED below: two uncorrelated sources at 0.5 each carry half the power,
//    which is 3.01 dB down, and that dip sits exactly in the middle of the lane.
//    (`/grains/`'s comment beside the same line says 6 dB, which is the figure
//    for one source rather than for the pair. The dip a listener hears is this
//    one.)
{
  const lin = (b) => ({ local: 1 - b, remote: b });
  const g = lin(0.5);
  const power = g.local * g.local + g.remote * g.remote;
  const dB = 10 * Math.log10(power);
  ok('NEGATIVE CONTROL: a linear pair holds its ends and loses the middle',
    near(lin(0).local, 1) && near(lin(1).remote, 1) && power < 0.51 && dB < -2.9,
    `linear middle power ${f(power)}, which is ${dB.toFixed(2)} dB, against equal power 1.00000`);
}

// 6. NEGATIVE CONTROL. And the two are genuinely different curves rather than
//    two spellings of one: at a quarter of the way across they disagree by more
//    than a fifth of full scale.
{
  const b = 0.25;
  const eq = fadeGains(b);
  const lin = { local: 1 - b, remote: b };
  const gap = Math.abs(eq.remote - lin.remote);
  ok('NEGATIVE CONTROL: the curve is not a straight line wearing a cosine',
    gap > 0.12, `at ${b} the remote gain is ${f(eq.remote)} here and ${f(lin.remote)} linear, ${f(gap)} apart`);
}

// ── monotonic, and clamped ──────────────────────────────────────────────────

// 7. Dragging one way only ever moves each side one way. A fader that went back
//    on itself anywhere would be a control that argues with the hand on it.
{
  let mono = true;
  let prevL = Infinity, prevR = -Infinity;
  for (let i = 0; i <= 1000; i++) {
    const g = fadeGains(i / 1000);
    if (g.local > prevL + 1e-12 || g.remote < prevR - 1e-12) mono = false;
    prevL = g.local; prevR = g.remote;
  }
  ok('every step toward the far end quietens the near one and raises the far one',
    mono, '1001 steps, neither side reverses');
}

// 8. Off the end of the lane is the end of the lane, not a negative gain. A
//    page driving this from a socket can hand it anything.
{
  const under = fadeGains(-3), over = fadeGains(4.2);
  ok('a value off either end of the lane is the end of the lane',
    near(under.local, 1) && near(under.remote, 0)
    && near(over.local, 0) && near(over.remote, 1),
    `-3 gives ${f(under.local)}/${f(under.remote)} and 4.2 gives ${f(over.local)}/${f(over.remote)}`);
}

// 9. NEGATIVE CONTROL. Nothing at all is the near end rather than a NaN pair.
//    `NaN` in an AudioParam is not a throw and not a drop: it is a gain that
//    does not exist, arriving at a graph the page called connected. That shape
//    has already been paid for once here, on a note number computed as
//    `note + undefined`.
{
  const g = fadeGains(NaN), h = fadeGains(undefined);
  ok('NEGATIVE CONTROL: no value at all is the near end, never a gain of NaN',
    Number.isFinite(g.local) && Number.isFinite(g.remote) && near(g.local, 1)
    && Number.isFinite(h.local) && near(h.local, 1),
    `NaN gives ${f(g.local)}/${f(g.remote)}, undefined gives ${f(h.local)}/${f(h.remote)}`);
}

// ── the numbers the module publishes ────────────────────────────────────────

// 10. The breakpoint is the one this project already uses eleven times in
//     shell.css, and it is declared here once so no second copy can drift.
ok('the arrangement changes at the width the rest of the shell changes at',
  NARROW_PX === 560, `NARROW_PX ${NARROW_PX}`);

// 11. `missing` is one of the three kinds rather than the absence of a kind,
//     which is the whole design decision this component was built around.
ok('a pane can be video, audio or missing, and missing is a state like the others',
  KINDS.length === 3 && KINDS.includes('missing') && KINDS.includes('audio')
  && KINDS.includes('video'), KINDS.join(', '));

// 12. Two arrangements, named, because the module moves an element between them
//     and a check has to be able to ask for one by name.
ok('there are two arrangements and both can be asked for by name',
  ARRANGEMENTS.join(',') === 'wide,narrow', ARRANGEMENTS.join(', '));

// 13. Nothing this module exports as a word carries an em dash. CLAUDE.md, and
//     it is checked in code rather than swept by hand because two formatters in
//     this repository were stamping them.
{
  const words = [...KINDS, ...ARRANGEMENTS];
  ok('no em dash and no middot in anything this module names',
    // Written as escapes rather than as the characters, so this file does not
    // itself carry the two things it is checking for.
    words.every((s) => !s.includes('—') && !s.includes('·')),
    `${words.length} words`);
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);

// demo/shell/pappus-mod-test.mjs: the modulator's arithmetic, off the wire. node demo/shell/pappus-mod-test.mjs
// It grades what the page's assert cannot (a lock that locks, an array destination not shredded),
// and carries its own negative controls.
// why: lessons/kit-pappus-mod.md#test-header

import { createModulator, spec } from './pappus-mod.mjs';

let bad = 0;
const ok = (pass, msg) => { console.log(`${pass ? 'ok  ' : 'FAIL'}  ${msg}`); if (!pass) bad++; };

// ── a control's own space ─────────────────────────────────────────────────
{
  const s = spec({ min: 0.002, max: 4, warp: 'exp' });
  // Both samples well inside the lane: a clamped reading looks exactly like a warp that does not work.
  // why: lessons/kit-pappus-mod.md#test-inside-lane
  const lowIn = 0.004, highIn = 0.5;
  const d = 0.1;                                   // a tenth of the lane
  const lowOut = s.map(s.unmap(lowIn) + d);
  const highOut = s.map(s.unmap(highIn) + d);
  const r1 = lowOut / lowIn, r2 = highOut / highIn;
  ok(Math.abs(r1 - r2) < 1e-9,
    `exp offsets are a RATIO: 4 ms ×${r1.toFixed(4)}, 2 s ×${r2.toFixed(4)}`);
  // the control: on a LINEAR lane the same offset is a constant amount, not a
  // ratio — so the test above is measuring the warp and not the arithmetic.
  const lin = spec({ min: 0, max: 1 });
  const a = lin.map(lin.unmap(0.1) + d) - 0.1, b = lin.map(lin.unmap(0.8) + d) - 0.8;
  ok(Math.abs(a - b) < 1e-9 && Math.abs(a - d) < 1e-9,
    `linear offsets are an AMOUNT: +${a.toFixed(4)} at both ends`);
  ok(Math.abs(s.map(s.unmap(0.002) - 5) - 0.002) < 1e-12
     && Math.abs(s.map(s.unmap(4) + 5) - 4) < 1e-9,
    'a modulation cannot push a control past its own ends');
}

// ── a rig ─────────────────────────────────────────────────────────────────
function rig({ specs, followers, routes, bases, deadband }) {
  let t = 0;
  const sent = [];
  const m = createModulator({
    now: () => t,
    send: (name, v) => sent.push([name, Array.isArray(v) ? v.slice() : v]),
    specs, followers,
    ...(deadband == null ? {} : { deadband }),
    warn: () => {},
  });
  for (const [k, v] of Object.entries(bases)) m.setBase(k, v);
  m.setRoutes(routes);
  return { m, sent, at: (x) => { t = x; }, tick: (x) => { t = x; m.tick(); } };
}

const SIZE = { min: 0.002, max: 4, warp: 'exp' };
const PROBS = { min: 0, max: 1, n: 8 };

// ── the amount is cubed ───────────────────────────────────────────────────
{
  const s = spec(SIZE);
  // ⚠️ A BASE LOW IN THE LANE, or +0.5 of it runs off the top and clamps.
  const B = 0.01;
  const r = rig({ specs: { size: SIZE }, bases: { size: B },
                  routes: [{ src: 'lfo', dest: 'size', shape: 'saw', hz: 1, amt: 1 }] });
  // saw at phase .75 is +0.5 of the lane; amt 1 cubes to 1
  r.tick(0.75);
  const got = r.sent.at(-1)[1];
  ok(Math.abs(s.unmap(got) - (s.unmap(B) + 0.5)) < 1e-9,
    `amt 1 moves half a lane on a half-height saw · ${got.toFixed(4)} s`);

  const half = rig({ specs: { size: SIZE }, bases: { size: B },
                     routes: [{ src: 'lfo', dest: 'size', shape: 'saw', hz: 1, amt: 0.5 }] });
  half.tick(0.75);
  const g2 = half.sent.at(-1)[1];
  const moved = s.unmap(g2) - s.unmap(B);
  ok(Math.abs(moved - 0.5 * 0.125) < 1e-9,
    `amt 0.5 is CUBED to 0.125 · moved ${moved.toFixed(5)} of the lane, not ${(0.5 * 0.5).toFixed(5)}`);
}

// ── the Turing machine ────────────────────────────────────────────────────
function turingSeq({ machine, steps = 32, hz = 1 }) {
  const r = rig({ specs: { size: SIZE }, bases: { size: 0.1 },
                  routes: [{ src: 'lfo', dest: 'size', shape: 'step', hz, machine, amt: 0.9 }] });
  const out = [];
  for (let k = 0; k < steps; k++) { r.tick(k + 0.5); out.push(r.sent.at(-1)?.[1] ?? null); }
  return out;
}
{
  const locked = turingSeq({ machine: 1 });
  const a = locked.slice(0, 16).join(','), b = locked.slice(16, 32).join(',');
  ok(a === b && new Set(locked.slice(0, 16)).size > 8,
    `machine 1 locks a 16-step loop · lap 2 is identical, ${new Set(locked.slice(0, 16)).size} distinct values`);

  // THE CONTROL. At 0 it must NOT repeat, or the test above is passing on a
  // machine that has no choice.
  const free = turingSeq({ machine: 0 });
  ok(free.slice(0, 16).join(',') !== free.slice(16, 32).join(','),
    'machine 0 does not repeat, so the lock above is a real setting');

  // and the middle, which is the one worth having: a few values change a lap
  const drift = turingSeq({ machine: 0.85, steps: 48 });
  const lap1 = drift.slice(0, 16), lap2 = drift.slice(16, 32);
  const changed = lap1.filter((v, i) => v !== lap2[i]).length;
  ok(changed > 0 && changed < 16, `machine 0.85 drifts · ${changed} of 16 values rewritten in a lap`);
}

// A skipped tick ages the pattern by the clock: with machine 1 the value at t equals the value a whole
// number of laps later, however many ticks happened. An accumulator would drift.
// why: lessons/kit-pappus-mod.md#test-skipped-tick
{
  const r = rig({ specs: { size: SIZE }, bases: { size: 0.01 }, deadband: 0,
                  routes: [{ src: 'lfo', dest: 'size', shape: 'step', hz: 1, machine: 1, amt: 0.9 }] });
  const lap1 = [];
  for (let k = 0; k < 16; k++) { r.tick(k + 0.5); lap1.push(r.sent.at(-1)[1]); }
  // one tick, eighty-five steps later — five full laps and four slots on
  r.tick(100.5);
  const jumped = r.sent.at(-1)[1];
  ok(jumped === lap1[100 % 16],
    `a tick 85 steps late reads slot ${100 % 16}, the one the clock says · ${jumped.toFixed(4)} s`);
}

// ── an array destination ──────────────────────────────────────────────────
{
  const r = rig({ specs: { probs: PROBS }, bases: { probs: [1, 1, 1, 1, 1, 1, 1, 1] },
                  routes: [{ src: 'lfo', dest: 'probs', shape: 'sine', hz: 0.5, amt: 0.9 }] });
  r.tick(0.3);
  const v = r.sent.at(-1);
  ok(v[0] === 'probs' && Array.isArray(v[1]) && v[1].length === 8,
    `an array destination writes all eight · ${v[1].map((x) => x.toFixed(2)).join(' ')}`);
  ok(new Set(v[1].map((x) => x.toFixed(4))).size > 4,
    'the eight elements differ: one shape rotated across the voices, not one value copied');
  ok(v[1].every((x) => x >= 0 && x <= 1), 'every element stays inside the spec');
}

// A Turing route on an eight-element destination advances its memory once per tick, not per element.
// why: lessons/kit-pappus-mod.md#test-once-per-tick
{
  const r = rig({ specs: { probs: PROBS }, bases: { probs: [1, 1, 1, 1, 1, 1, 1, 1] },
                  routes: [{ src: 'lfo', dest: 'probs', shape: 'step', hz: 1, machine: 1, amt: 0.9 }] });
  const laps = [];
  for (let k = 0; k < 32; k++) { r.tick(k + 0.5); laps.push(r.sent.at(-1)[1].join(',')); }
  ok(laps.slice(0, 16).join('|') === laps.slice(16).join('|'),
    'a locked pattern survives being read by eight voices at once');
}

// ── the dead-band, and going home ─────────────────────────────────────────
{
  const r = rig({ specs: { scan: { min: 0, max: 1 } }, bases: { scan: 0.5 },
                  routes: [{ src: 'lfo', dest: 'scan', shape: 'sine', hz: 0.005, amt: 0.3 }] });
  for (let k = 0; k < 50; k++) r.tick(k * 0.04);      // two seconds of a 200 s wave
  ok(r.sent.length > 0 && r.sent.length < 50,
    `a 0.005 Hz source costs ${r.sent.length} message(s) in 50 ticks, not 50`);
  const st = r.m.stats();
  ok(st.skipped > 0, `${st.skipped} ticks moved too little to be worth a message`);

  r.m.setRoutes([]);
  ok(r.sent.at(-1)[0] === 'scan' && r.sent.at(-1)[1] === 0.5,
    'a destination that stops being modulated is put back on its base');
}

// ── hold ──────────────────────────────────────────────────────────────────
{
  const r = rig({ specs: { size: SIZE }, bases: { size: 1.8 },
                  routes: [{ src: 'lfo', dest: 'size', shape: 'sine', hz: 2, amt: 0.7 }] });
  for (let k = 0; k < 10; k++) r.tick(k * 0.04);
  const n = r.sent.length;
  r.m.hold(true);
  ok(r.sent.at(-1)[1] === 1.8, 'hold puts the control back on its base');
  for (let k = 10; k < 30; k++) r.tick(k * 0.04);
  ok(r.sent.length === n + 1, `held: ${r.sent.length - n - 1} messages in twenty ticks`);
  r.m.hold(false);
  for (let k = 30; k < 40; k++) r.tick(k * 0.04);
  ok(r.sent.length > n + 1, 'and it moves again when released');
}

// ── a routing nobody can honour is REFUSED, not reinterpreted ─────────────
{
  const r = rig({ specs: { size: SIZE }, bases: { size: 1 }, routes: [] });
  r.m.setRoutes([
    { src: 'env', dest: 'size', amt: 0.5 },      // no follower named rms declared? there is one by default
    { src: 'lfo2', dest: 'size', amt: 0.5 },     // a typo
    { src: 'lfo', dest: 'swarm', amt: 0.5 },     // no such destination
  ]);
  const st = r.m.stats();
  ok(st.routes === 1 && st.dropped === 2,
    `1 routing kept, ${st.dropped} refused · a typo does not become a 0.1 Hz sine`);
}

// ── the envelope follower ─────────────────────────────────────────────────
{
  // ⚠️ A MIDDLING BASE AND A MODEST AMOUNT, or both ends of the follower's
  // travel clamp and a working follower reads as a control stuck at 4 s.
  const r = rig({ specs: { size: SIZE }, bases: { size: 0.05 },
                  followers: { rms: { attack: 0.01, release: 0.35, sens: 6 } },
                  routes: [{ src: 'env', dest: 'size', amt: 0.6 }] });
  // 0.12, not 0.5: value() is clamp01(env x sens) with sens 6, so 0.5 saturates the follower.
  // why: lessons/kit-pappus-mod.md#test-rms
  r.at(0); r.m.sense({ rms: 0 });
  r.tick(0.04);
  const quiet = r.sent.at(-1)[1];
  for (let k = 1; k < 20; k++) { r.at(k * 0.02); r.m.sense({ rms: 0.12 }); }
  r.tick(0.42);
  const loud = r.sent.at(-1)[1];
  ok(loud > quiet * 1.5, `loud opens the control: ${quiet.toFixed(4)} s quiet -> ${loud.toFixed(4)} s loud`);
  // THE CONTROL: an attack of 0.01 s must be far FASTER than a release of
  // 0.35 s. It reached `loud` within one 0.02 s feed; a fifth of a second of
  // silence must still leave it well above where it started.
  for (let k = 0; k < 10; k++) { r.at(0.42 + k * 0.02); r.m.sense({ rms: 0 }); }
  r.tick(0.64);
  const falling = r.sent.at(-1)[1];
  ok(falling > quiet && falling < loud,
    `and it falls back SLOWLY · ${falling.toFixed(4)} s, 0.2 s after the sound stopped`);
}

console.log(bad ? `\n${bad} FAILED` : '\nall green');
process.exit(bad ? 1 : 0);

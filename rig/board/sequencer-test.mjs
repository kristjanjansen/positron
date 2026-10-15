// rig/board/sequencer-test.mjs: the board's sequencer on a fake clock, and its verbs on a fake
// Circuit, with no board, socket or instrument.  node rig/board/sequencer-test.mjs
// Most are NEGATIVE CONTROLS; the fake clock fires every timer 0 to 3 ms late, so a sequencer that
// adds up step lengths from when it woke drifts and goes red. why: lessons/rig-board-sequencer.md#test

import { createSequencer, createSequencerService, spread } from './sequencer.mjs';
import { normalizePattern, notesAt, patternOf, stepMs } from '../../demo/shell/drum-pattern.mjs';
import { boardGraph } from '../../demo/shell/graph-registry.mjs';
import { DRUM_MAPS, GM_VOICES } from '../../demo/shell/drum-maps.mjs';
import { NOTE } from '../../demo/drums/voices.mjs';
import { format } from '../../demo/shell/wire.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};

/** A clock that only moves when told, firing each timer `jitter()` ms after it was due. */
function fakeClock({ jitter = () => 0 } = {}) {
  let t = 1000, id = 0;
  const timers = new Map();
  return {
    now: () => t,
    setTimer: (fn, ms) => { const k = ++id; timers.set(k, { at: t + ms + jitter(), fn }); return k; },
    clearTimer: (k) => { timers.delete(k); },
    /** Run every timer due up to `until`, in time order. */
    run(until) {
      for (;;) {
        let best = null;
        for (const [k, x] of timers) if (x.at <= until && (!best || x.at < best[1].at)) best = [k, x];
        if (!best) break;
        timers.delete(best[0]); t = Math.max(t, best[1].at); best[1].fn();
      }
      t = Math.max(t, until);
    },
    pending: () => timers.size,
  };
}
/** 0 to 3 ms, the same sequence every run. */
const lcg = (seed = 7) => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return (seed % 3001) / 1000; };

const P = (bpm = 120, rows = null) => ({ v: 1, bpm, steps: 16, rows: rows ?? [
  { voice: 'kick', steps: '1000100010001000' },
  { voice: 'snare', steps: '0000100000001000' },
  { voice: 'hhc', steps: '1010101010101010' },
  { voice: 'clap', steps: '0001000000010000' },
] });

console.log('\n== the pattern ==');
{
  ok('GM_VOICES carries the same notes as demo/drums/voices.mjs NOTE', Object.keys(NOTE).every((k) => GM_VOICES[k]?.note === NOTE[k])
    && Object.keys(GM_VOICES).length === Object.keys(NOTE).length);
  ok('a good pattern is accepted and copied', normalizePattern(P()).ok);
  ok('NEGATIVE CONTROL: a voice that is not a GM voice is refused by name', /row 1 names "cowbel"/.test(normalizePattern(P(120, [{ voice: 'cowbel', steps: '1'.repeat(16) }])).why || ''));
  ok('NEGATIVE CONTROL: 15 steps are refused', /16 characters/.test(normalizePattern(P(120, [{ voice: 'kick', steps: '1'.repeat(15) }])).why || ''));
  ok('NEGATIVE CONTROL: a tempo of 0 is refused', /bpm is a number/.test(normalizePattern(P(0)).why || ''));
  ok('a step plays the GM notes of its unmuted rows', JSON.stringify(notesAt(normalizePattern(P()).pattern, 4)) === '[36,38,42]');
  const muted = normalizePattern(P(120, [{ voice: 'kick', steps: '1'.repeat(16), mute: true }])).pattern;
  ok('NEGATIVE CONTROL: a muted row plays nothing', notesAt(muted, 0).length === 0);
  const g = patternOf(['kick', 'snare'], [[true, false], [false, true]], 100);
  ok('a grid becomes rows of 0 and 1', g.rows[0].steps.startsWith('10') && g.rows[1].steps.startsWith('01') && g.bpm === 100);
}

console.log('\n== the clock ==');
{
  const c = fakeClock({ jitter: lcg() });
  const evs = [];
  const s = createSequencer({ now: c.now, setTimer: c.setTimer, clearTimer: c.clearTimer, emit: (e) => evs.push({ ...e, t: c.now() }) });
  ok('NEGATIVE CONTROL: start with no pattern is refused in words', /no pattern yet/.test(s.start().why || ''));
  s.set(P(120));
  s.start();
  const origin = s.epoch(), MS = stepMs(120);
  c.run(origin + 1000 * 16 * MS);              // 1000 bars
  const ons = evs.filter((e) => e.cls === 'note' && !e.off);
  const kicks = ons.filter((e) => e.d1 === 36);
  ok('1000 bars of four kicks', kicks.length === 4000, `${kicks.length}`);
  const worstAt = Math.max(...kicks.map((e, k) => Math.abs(e.at - (origin + k * 4 * MS))));
  ok('every kick\'s time is the bar origin plus its step, never added up', worstAt < 1e-6, `worst ${worstAt} ms off`);
  const fired = Math.max(...ons.map((e) => e.t - e.at));
  ok('NEGATIVE CONTROL: and each left within the timer\'s own lateness, so 1000 bars did not drift', fired <= 3.0001, `latest ${fired.toFixed(3)} ms after its step`);
  const st = s.status();
  ok('the status reports how late the timer fired', st.late.n > 0 && st.late.max <= 3.0001, JSON.stringify(st.late));
  const offs = evs.filter((e) => e.off);
  const firstKickOff = offs.find((e) => e.d1 === 36);
  ok('a note off follows each note on at half a step', firstKickOff && Math.abs(firstKickOff.t - (origin + MS / 2)) <= 3.0001,
    firstKickOff ? `${(firstKickOff.t - origin).toFixed(2)} ms after the first kick` : 'no off');
  const n0 = evs.length;
  s.stop();
  const offsAll = evs.filter((e) => e.off);
  ok('NEGATIVE CONTROL: after Stop, as many offs as ons, so nothing hangs', offsAll.length === ons.length, `${ons.length} on, ${offsAll.length} off`);
  const cc = evs.slice(n0).filter((e) => e.cls === 'cc');
  ok('Stop sends all notes off, CC 123 on channel 10', cc.length === 1 && cc[0].d1 === 123 && cc[0].ch === 10 && cc[0].d2 === 0);
  ok('NEGATIVE CONTROL: and no timer is left running after Stop', c.pending() === 0);
  ok('every note is on channel 10', ons.every((e) => e.ch === 10));
}

console.log('\n== changes land on the next bar ==');
{
  const c = fakeClock();
  const evs = [];
  const s = createSequencer({ now: c.now, setTimer: c.setTimer, clearTimer: c.clearTimer, emit: (e) => evs.push({ ...e, t: c.now() }) });
  s.set(P(120));
  s.start();
  const o = s.epoch(), MS = stepMs(120), BAR = 16 * MS;
  c.run(o + 5 * MS);                            // into bar 1, step 5
  const r = s.set(P(150, [{ voice: 'snare', steps: '1'.repeat(16) }]));
  ok('a change while running is held for the next bar', r.ok && r.pending === true);
  c.run(o + BAR - 1);
  ok('NEGATIVE CONTROL: nothing before the bar line is off the old tempo\'s grid', evs.filter((e) => !e.off && e.at < o + BAR)
    .every((e) => Math.abs(((e.at - o) / MS) - Math.round((e.at - o) / MS)) < 1e-9));
  const before = evs.filter((e) => !e.off && e.cls === 'note' && e.at >= o + 5 * MS && e.at < o + BAR);
  ok('the rest of the bar plays the old pattern', before.every((e) => [36, 38, 42, 39].includes(e.d1)) && before.some((e) => e.d1 === 42), `${before.length} notes`);
  c.run(o + BAR + 16 * stepMs(150) * 2 - 1);
  const after = evs.filter((e) => !e.off && e.cls === 'note' && e.at >= o + BAR);
  ok('from the bar line, the new pattern', after.length === 32 && after.every((e) => e.d1 === 38), `${after.length} notes`);
  ok('at the new tempo, from the bar line', Math.abs(after[1].at - after[0].at - stepMs(150)) < 1e-9 && Math.abs(after[0].at - (o + BAR)) < 1e-9,
    `first at +${(after[0].at - o).toFixed(3)} ms, step ${(after[1].at - after[0].at).toFixed(3)} ms`);
  s.stop();
}

console.log('\n== a stalled process skips, never sends late ==');
{
  let stall = 0;
  const c = fakeClock({ jitter: () => stall });
  const evs = [];
  const s = createSequencer({ now: c.now, setTimer: c.setTimer, clearTimer: c.clearTimer, emit: (e) => evs.push({ ...e, t: c.now() }) });
  s.set(P(120, [{ voice: 'hhc', steps: '1'.repeat(16) }]));
  s.start();
  const o = s.epoch();
  stall = 400;                                   // the timer armed at step 2 wakes 400 ms late
  c.run(o + stepMs(120));
  stall = 0;
  c.run(o + 16 * stepMs(120));
  const lateOns = evs.filter((e) => !e.off && e.t - e.at > stepMs(120) / 2);
  ok('NEGATIVE CONTROL: no note left more than half a step after its time', lateOns.length === 0, `${lateOns.length} late`);
  ok('the steps the stall swallowed are counted as skipped', s.status().counts.skipped >= 2, `${s.status().counts.skipped} skipped`);
  s.stop();
}

console.log('\n== the verbs, into a fake Circuit through the board\'s own bay ==');
{
  const c = fakeClock();
  const g = boardGraph({ room: 'studio-1', gpu: false, sequencer: true, drums: { circuit: DRUM_MAPS.circuit },
    inputs: [{ name: 'circuit', channels: 2, midi: { port: 'Circuit', channels: [1, 2, 10] } }] });
  const wrote = [], screens = [];
  const svc = createSequencerService({ graph: () => g, midiSend: (b) => wrote.push(b), screen: (s) => screens.push(s),
    now: c.now, setTimer: c.setTimer, clearTimer: c.clearTimer });
  // Every answer goes through the wire's own format, which throws on a field the envelope owns (`sent`).
  const formatted = [];
  const ask = async (msg) => { let out = null; await svc.handle(msg, (type, body) => { formatted.push(() => format({ type, ...body }, { from: 'b', seq: 0 })); out = { type, ...body }; }); return out; };
  ok('it answers the four seq verbs and nothing else', ['seq.pattern', 'seq.start', 'seq.stop', 'seq.status'].every((t) => svc.handles({ type: t }))
    && !svc.handles({ type: 'midi.send' }) && !svc.handles({ type: 'seq.sysex' }));
  const bad = await ask({ type: 'seq.pattern', pattern: P(120, [{ voice: 'nope', steps: '1'.repeat(16) }]) });
  ok('NEGATIVE CONTROL: a bad pattern is answered with the reason', bad.ok === false && /row 1 names "nope"/.test(bad.why), bad.why);
  const rows = ['kick', 'snare', 'hhc', 'hho', 'clap', 'tomlo', 'tomhi', 'cowbell'].map((voice) => ({ voice, steps: '1000000000000000' }));
  const st = await ask({ type: 'seq.start', pattern: P(120, rows), screen: { voices: ['BD', 'SD', 'CH', 'OH', 'cl', 'lo', 'hi', 'co'] } });
  ok('seq.start makes the link with the drum map and runs', st.ok && st.running && st.link === 'pi-1:sequencer:midi-out -> pi-1:circuit:midi-in { drummap circuit }', st.why || st.link);
  c.run(svc.core.epoch() + 1);
  const hex = wrote.map((b) => b.map((x) => x.toString(16).toUpperCase().padStart(2, '0')).join(' '));
  ok('step 1 of eight rows writes exactly the four Circuit drums on channel 10', JSON.stringify(hex.sort()) === JSON.stringify(['99 3C 64', '99 3E 64', '99 40 64', '99 41 64']), hex.join(' | '));
  ok('NEGATIVE CONTROL: the four GM extras reach the bay and are dropped there', (await ask({ type: 'seq.status' })).dropped === 4);
  ok('the screen follows the board\'s own step', screens.at(-1)?.playing === true && screens.at(-1)?.step === 0 && screens.at(-1)?.voices[0] === 'BD');
  wrote.length = 0;
  c.run(svc.core.epoch() + stepMs(120) / 2 + 1);
  ok('half a step later, the four note offs', wrote.length === 4 && wrote.every((b) => b[0] === 0x89 && b[2] === 0), JSON.stringify(wrote));
  wrote.length = 0;
  await ask({ type: 'seq.stop' });
  ok('Stop writes B9 7B 00, all notes off on channel 10', JSON.stringify(wrote.at(-1)) === JSON.stringify([0xB9, 123, 0]), JSON.stringify(wrote));
  ok('NEGATIVE CONTROL: nothing it ever wrote is SysEx, a program change or a drum patch CC',
    [...wrote].every((b) => b[0] !== 0xF0 && (b[0] & 0xF0) !== 0xC0 && !((b[0] & 0xF0) === 0xB0 && [8, 18, 44, 50].includes(b[1]))));
  const after = (await ask({ type: 'seq.status' }));
  ok('and the status says it stopped', after.running === false);
  let wireWhy = '';
  try { for (const f of formatted) f(); } catch (e) { wireWhy = e.message; }
  ok('NEGATIVE CONTROL: every answer survives the wire, no payload field named like the envelope', formatted.length >= 5 && !wireWhy, wireWhy || `${formatted.length} answers`);

  const noCircuit = createSequencerService({ graph: () => boardGraph({ room: 'studio-1', gpu: false, sequencer: true }), midiSend: () => {},
    now: c.now, setTimer: c.setTimer, clearTimer: c.clearTimer });
  let r = null; await noCircuit.handle({ type: 'seq.start', pattern: P() }, (t, b) => { r = b; });
  ok('NEGATIVE CONTROL: with the Circuit unplugged, Start is refused naming the missing port', r.ok === false && /no port called pi-1:circuit:midi-in/.test(r.why), r.why);
  ok('spread() reads p50, p99 and the worst', JSON.stringify(spread([1, 2, 3, 4, 100])) === '{"n":5,"p50":3,"p99":100,"max":100}');
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);

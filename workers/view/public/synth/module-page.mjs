// demo/synth/module-page.mjs: a patch of synth modules on a page,
// played from the kit's keys, a knob per parameter. It was written for three
// pages, one module each (050 filter, 060 envelope, 070 LFO, the split of
// synth/040), and since 2026-10-13 builds the one that replaced them,
// /synth/sound-design/ Sound design (*"combine filter+envelope+lfo to single
// sound design concept"*). It stays a module because the page is a patch and a
// knob list handed to it.
//
// The page, top to bottom, as positron-concepts lays out a synth: the
// waveform at full width, the knob row, the keys, the patchbay. The sound is
// patch-synth.mjs; the patchbay draws only the nodes the patch links, so it
// shows exactly the modules this page uses.
//
// NOTHING OPENS ON A VISIT. The AudioContext is made on the first key press,
// and until then a knob only moves the module's stored parameter.

import { el } from '/shell/shell.mjs';
import { createPatchbay } from '/shell/patchbay.mjs';
import { createKnob } from '/shell/knob.mjs';
import { createKnobGrid } from '/shell/knob-grid.mjs';
import { createKeyboard, keyRange } from '/shell/keyboard.mjs';
import { createWaveShape } from '/shell/synth-view.mjs';
import { createSynth, KNOBS, knobRaw, withKnobs } from '/synth/patch-synth.mjs';

/**
 * @param {object} d        what `mount()` returned
 * @param {object} o
 * @param {string} o.patch  the links, one `from -> to` a line, without the knob cables
 * @param {string[]} o.knobs  the knobs this page offers, by name; each gets a cable to its module
 * @param {object} [o.preset]  starting parameters by knob name, e.g. `{ wave: 'sawtooth' }`
 */
export function modulePage(d, { patch, knobs: names, preset = {} }) {
  const synth = createSynth({ log: (m, lv) => d.log(m, lv) });
  const { bay } = synth;
  const ID = synth.id;
  const owner = (name) => KNOBS.find((k) => k.name === name).owner;
  const inPatch = (node) => bay.links().some((l) => l.from.split(':')[1] === node || l.to.split(':')[1] === node);

  // ── the waveform: one window from the first rising zero crossing, so a
  // steady tone stands still, at one fixed scale, so a level change shows ──
  const WINDOW = 512, FULL = 0.5;
  const wave = createWaveShape({ reason: null, colour: '--hi', height: 120, name: '' });
  function frame() {
    const buf = synth.on() ? synth.read('scope') : null;
    if (buf) {
      let i0 = 0;
      for (let i = 1; i < buf.length - WINDOW; i++) if (buf[i - 1] < 0 && buf[i] >= 0) { i0 = i; break; }
      const win = buf.subarray(i0, i0 + WINDOW);
      wave.set({ points: Array.from(win, (v) => Math.max(-1, Math.min(1, v / FULL))), reason: '', name: '' });
    } else wave.set({ points: null, reason: null, name: '' });
    requestAnimationFrame(frame);
  }

  // ── the starting sound, then the knobs, each turn one event on its cable ─
  for (const [name, v] of Object.entries(preset)) synth.setParam(owner(name), name, v);
  const knobs = new Map(names.map((name) => {
    const k = KNOBS.find((x) => x.name === name);
    return [name, createKnob({
      label: name === 'q' ? 'Q' : name, min: k.min, max: k.max, step: k.step,
      value: knobRaw(name, synth.P[k.owner][name]), format: k.format, hand: true,
      onInput: (r) => bay.send(ID(`knob-${name}`, 'value-out'), { of: 'param', name, v: k.value(r) }),
    })];
  }));
  const grid = createKnobGrid(knobs, { row: true });

  // ── sound: made on the first key, then left on ──────────────────────────
  let ctx = null;
  function wake() {
    if (!ctx) { ctx = new AudioContext(); synth.start(ctx); synth.sound(true); requestAnimationFrame(frame); }
    ctx.resume();
  }

  // ── the keys: what they play leaves on keys:midi-out and nowhere else ──
  const host = el('div');
  const down = (note) => { wake(); bay.send(ID('keys', 'midi-out'), { cls: 'note', ch: 1, d1: note, d2: 100 }); };
  const up = (note) => bay.send(ID('keys', 'midi-out'), { cls: 'note', ch: 1, d1: note, d2: 0 });
  const kb = createKeyboard(host, {
    ...keyRange(21), base: 48,
    onDown: (note, how) => { if (how !== 'midi') down(note); },
    onUp: (note, how) => { if (how !== 'midi') up(note); },
  });

  // ── the patch, and the patchbay drawing only what it links ──────────────
  let bad;
  try { bad = synth.load(withKnobs(patch, names)); } catch (e) { bad = [{ line: '', why: e.message.replace(/^bay: /, '') }]; }
  for (const b of bad) d.log(b.line ? `${b.line} refused: ${b.why}` : b.why, 'warn');
  const pb = createPatchbay({
    nodes: () => bay.nodes().filter((n) => inPatch(n.id.split(':')[1])),
    ports: () => bay.ports().filter((p) => inPatch(p.id.split(':')[1])),
    links: () => bay.links(),
  }, { flowing: (l) => (l.from === ID('lfo', 'audio-out') ? synth.on() : synth.sounding()) });

  d.stack.add(wave.el, grid.el, host, pb.el);
  window.__demo.synth = synth;
  window.__demo.knobs = grid;
  window.__demo.keyboard = kb;
  /** RMS of what reaches the scope now, 0 before the first key. */
  const level = () => {
    const buf = synth.read('scope');
    if (!buf) return 0;
    let s = 0;
    for (const v of buf) s += v * v;
    return Math.sqrt(s / buf.length);
  };
  window.__demo.level = level;
  /** Turn a knob as a hand would, so the value travels its own wire. */
  const turn = (name, v) => knobs.get(name).set(knobRaw(name, v));
  return { synth, knobs, grid, kb, pb, down, up, turn, level };
}

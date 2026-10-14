// demo/shell/synthdef-audio.mjs — the browser's own sound, built from the same
// file SuperCollider is given.
//
// WHY A SECOND READER AT ALL. The claim this page exists to make is that a
// synth definition is a DOCUMENT — bytes that describe an instrument rather
// than an instrument tied to one program. A document that only one program can
// read is indistinguishable from that program's private save file, so the
// claim needs a second reader or it is not a claim. This is the cheapest
// honest one: the browser's own oscillators and gains, wired up from the graph
// in the file.
//
// 🔴 IT REFUSES RATHER THAN APPROXIMATES. If the file holds a kind of building
// block this does not know, NOTHING is played and the unknown names are
// returned. The alternative — play the parts it understands and drop the rest
// — produces a sound that is not the one in the file while looking like a
// success, which is this project's oldest failure shape: `grains` had a
// granulator whose parameters demonstrably did nothing while the suite stayed
// green, and `twins` claims two ends run "the same instrument" when one of them
// is a reimplementation that merely sounds similar. A reader that plays half a
// graph would make exactly that mistake again, one layer down.
//
// ⚠️ WHAT IS NOT THE SAME, AND IS NOT PRETENDED TO BE. `LFSaw` in
// SuperCollider is a raw ramp with every harmonic in it; the browser's
// `sawtooth` is BAND-LIMITED, so the two are the same shape and not the same
// spectrum. `SinOsc`'s phase argument is ignored here. Those are listed by
// `caveats` and printed by the page rather than left for someone to discover
// by ear — a difference nobody wrote down is a difference somebody will later
// call a bug.

/** Which kinds of building block this can run. Everything else stops it. */
export const KNOWN = ['Control', 'SinOsc', 'LFSaw', 'LFPulse', 'LFTri', 'BinaryOpUGen', 'Out'];

/** The browser oscillator each shape maps to, and what that costs in honesty. */
const SHAPE = {
  SinOsc: { type: 'sine', note: null },
  LFSaw: { type: 'sawtooth', note: 'a raw ramp here is a band-limited sawtooth in the browser' },
  LFPulse: { type: 'square', note: 'the width of the pulse cannot be set on a browser oscillator' },
  LFTri: { type: 'triangle', note: null },
};

/**
 * Which blocks this reader does not know, without building anything.
 * The page asks this before it offers to play, so the answer can be shown
 * beside the file rather than discovered by pressing a button that fails.
 */
export function unknownParts(def) {
  const out = [];
  for (const b of def.blocks) if (!KNOWN.includes(b.name) && !out.includes(b.name)) out.push(b.name);
  return out;
}

/**
 * Build and start the graph in `def` on `ctx`.
 *
 * @param {AudioContext} ctx
 * @param {object} def          one definition, as `readSynthDef` returns it
 * @param {object} [o]
 * @param {Record<string,number>} [o.params]  overrides, by parameter name
 * @param {AudioNode} [o.destination]
 * @returns {{played:boolean, unknown:string[], caveats:string[],
 *            stop:()=>void, set:(name:string, value:number)=>boolean}}
 */
export function playHere(ctx, def, { params = {}, destination = ctx.destination } = {}) {
  const unknown = unknownParts(def);
  if (unknown.length) {
    return { played: false, unknown, caveats: [], stop: () => {}, set: () => false };
  }

  const caveats = [];
  const started = [];                 // everything that has to be stopped
  const holders = new Map();          // parameter name -> [AudioParam|setter]
  const values = new Map();           // parameter name -> the number in force

  // A signal is either a plain number or an AudioNode. Keeping the two apart
  // rather than wrapping every constant in a ConstantSourceNode is not an
  // optimisation: a number can be handed straight to an AudioParam, which is
  // where a parameter has to land if it is ever going to be changed.
  const num = (s) => (typeof s === 'number' ? s : null);

  /** Route a signal into an AudioParam, whichever kind it is. */
  const into = (param, sig) => {
    if (typeof sig === 'number') { param.value = sig; return; }
    param.value = 0;
    sig.connect(param);
  };

  const gainOf = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };

  // Which block holds the parameters. Index 0 in everything written here, but
  // a definition compiled somewhere else need not put it first, and a reader
  // that assumes a position is a reader that works only on its own files.
  const controlAt = def.blocks.findIndex((b) => b.name === 'Control');

  const outs = [];                    // resolved outputs, per block
  const readInput = (i, constants) =>
    (i.from === -1 ? constants[i.out] : outs[i.from][i.out ?? 0]);

  for (let bi = 0; bi < def.blocks.length; bi++) {
    const b = def.blocks[bi];
    const inputs = b.inputs.map((i) => readInput(i, def.constants));

    if (b.name === 'Control') {
      // The parameters, as plain numbers. `b.special` is where this block's
      // first parameter sits in the value array — always 0 here, but read
      // rather than assumed, because a definition compiled elsewhere may not be.
      const row = [];
      for (let k = 0; k < b.outputs.length; k++) {
        const at = b.special + k;
        const name = def.paramNames.find((p) => p.at === at)?.name ?? `#${at}`;
        const v = Object.hasOwn(params, name) ? params[name] : def.paramValues[at];
        values.set(name, v);
        row.push(v);
        holders.set(name, { at: k });
      }
      outs.push(row);
      continue;
    }

    if (SHAPE[b.name]) {
      const { type, note } = SHAPE[b.name];
      if (note && !caveats.includes(note)) caveats.push(note);
      const osc = ctx.createOscillator();
      osc.type = type;
      into(osc.frequency, inputs[0] ?? 440);
      // 🔴 A PHASE ARGUMENT HAS NOWHERE TO GO. `OscillatorNode` has no phase,
      // so this is dropped — said out loud rather than silently ignored.
      if (inputs.length > 1 && num(inputs[1]) !== 0) {
        const say = 'the starting phase in the file cannot be set on a browser oscillator';
        if (!caveats.includes(say)) caveats.push(say);
      }
      osc.start();
      started.push(osc);
      outs.push([osc]);
      // remember which parameter drives this oscillator's pitch, so `set`
      // moves the sound. Only when the pitch arrived as a NUMBER: a pitch fed
      // by another block is already connected, and writing `.value` on a
      // connected AudioParam changes the offset the connection adds to, which
      // is a different quantity wearing the same name.
      if (typeof inputs[0] === 'number') rememberParam(b.inputs[0], (v) => { osc.frequency.value = v; });
      continue;
    }

    if (b.name === 'BinaryOpUGen') {
      const [a, c] = inputs;
      const op = b.special;
      let result;
      if (op === 2 || op === 4) {                      // multiply, divide
        const cc = op === 4 ? (typeof c === 'number' ? 1 / c : null) : c;
        if (cc === null) throw new Error('dividing one signal by another is not built here');
        if (typeof a === 'number' && typeof cc === 'number') result = a * cc;
        else if (typeof cc === 'number') { const g = gainOf(cc); a.connect(g); result = g; rememberParam(b.inputs[1], (v) => { g.gain.value = op === 4 ? 1 / v : v; }); }
        else if (typeof a === 'number') { const g = gainOf(a); cc.connect(g); result = g; rememberParam(b.inputs[0], (v) => { g.gain.value = v; }); }
        else { const g = gainOf(0); a.connect(g); cc.connect(g.gain); result = g; }
      } else if (op === 0 || op === 1) {               // add, subtract
        const sign = op === 1 ? -1 : 1;
        if (typeof a === 'number' && typeof c === 'number') result = a + sign * c;
        else {
          const sum = gainOf(1);
          for (const [sig, s] of [[a, 1], [c, sign]]) {
            if (typeof sig === 'number') {
              const k = ctx.createConstantSource();
              k.offset.value = sig * s;
              k.start(); started.push(k);
              k.connect(sum);
            } else if (s === 1) sig.connect(sum);
            else { const inv = gainOf(-1); sig.connect(inv); inv.connect(sum); }
          }
          result = sum;
        }
      } else {
        throw new Error(`the arithmetic numbered ${op} is not built here`);
      }
      outs.push([result]);
      continue;
    }

    if (b.name === 'Out') {
      // input 0 is which output to use; the rest are the channels
      const chans = inputs.slice(1).filter((s) => typeof s !== 'number');
      const mix = gainOf(1);
      for (const c of chans) c.connect(mix);
      mix.connect(destination);
      outs.push([]);
      started.push({ stop: () => { try { mix.disconnect(); } catch { /* already gone */ } } });
      continue;
    }

    // unreachable: unknownParts() above refused anything not in KNOWN
    throw new Error(`no rule for ${b.name}`);
  }

  /**
   * Bind a live setter to whichever parameter feeds this input, so a knob moves
   * the sound rather than only the number. A constant input binds nothing.
   */
  function rememberParam(ref, apply) {
    if (!ref || ref.from !== controlAt || controlAt < 0) return;
    const at = def.blocks[controlAt].special + ref.out;
    const name = def.paramNames.find((p) => p.at === at)?.name;
    if (!name) return;
    const h = holders.get(name) || {};
    (h.apply ||= []).push(apply);
    holders.set(name, h);
  }

  return {
    played: true,
    unknown: [],
    caveats,
    set(name, value) {
      const h = holders.get(name);
      if (!h?.apply?.length) return false;
      values.set(name, value);
      for (const fn of h.apply) fn(value);
      return true;
    },
    value: (name) => values.get(name),
    stop() {
      for (const s of started) { try { s.stop(); } catch { /* already stopped */ } }
      started.length = 0;
    },
  };
}

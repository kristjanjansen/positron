// demo/shell/rt-drums.mjs: the one drum machine (drums/drum-machine.mjs) that
// the `sequencer` and `drum` runtimes of one /connect/ bay share. The machine
// is /drums/machine/'s, its four SuperCollider voices in the page's one
// context; the sequencer's notes leave on /connect/'s own sequencer:midi-out
// (`sequence`), and what arrives on drum:midi-in is played by the voices
// (`api.play`), so the link between the two boxes is what carries every hit.
// Kept for the bay's life once made: a second scsynth for a relink would be a
// second engine for the same four drums.

const machines = new WeakMap();

/**
 * @param {object} bay      /connect/'s bay, the key
 * @param {object} o
 * @param {Function} o.wake the page's wake(), which answers its one context
 * @param {Function} o.log
 * @param {Function} o.sequence  `(ev) => void`, where the grid's notes go
 */
export async function machineFor(bay, { wake, log, sequence }) {
  if (!machines.has(bay)) {
    machines.set(bay, (async () => {
      const [{ createDrumMachine }, { VOICES }] = await Promise.all([import('/drums/drum-machine.mjs'), import('/drums/voices.mjs')]);
      const hook = { sequence: () => {} };
      // `mix`: the drums' sum is NOT connected to the speakers; /connect/'s router does that from drum:audio-out.
      const m = createDrumMachine({ log }, { voices: VOICES, context: () => wake(), mix: { node: 'mix', label: 'drums' },
        sequence: (ev) => hook.sequence(ev) });
      return { ...m, hook };
    })());
  }
  const m = await machines.get(bay);
  if (sequence) m.hook.sequence = sequence;
  return m;
}

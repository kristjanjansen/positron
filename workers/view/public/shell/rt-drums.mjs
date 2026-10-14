// demo/shell/rt-drums.mjs: the one drum machine the `sequencer` and `drum` runtimes of a /connect/
// bay share. Hits travel over the link between the two boxes. Kept for the bay's life: a relink
// must not start a second scsynth.
// why: lessons/kit-rt-drums.md#header

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

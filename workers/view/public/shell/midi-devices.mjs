// demo/shell/midi-devices.mjs: the MIDI inputs plugged into this machine as
// `device` nodes on a page's bay. One node per input, `<site>:midi`,
// `<site>:midi-2`, ..., named after the device, with one `midi-out` port
// linked to the in-ports a page names. A device keeps its node id across a
// replug, and an unplugged one lets go of its held notes and loses its links.
//
// The page decides what a message becomes (`message`); by default a note on
// or off is sent along the device's port and anything else is ignored.

/**
 * @param {object} o
 * @param {object} o.bay
 * @param {string} o.site          the page's site, `web`
 * @param {string[]} o.to          the in-ports a device's midi-out is linked to
 * @param {string[]} [o.emits]     what the port says it emits, `['note']`
 * @param {Function} [o.portLabel] `(node) => label` for the port
 * @param {Function} [o.message]   `(e, { node, send, hold }) => void` for each
 *   message: `send(msg)` sends along the device's port, `hold(note, on)` keeps
 *   the held notes that unplugging releases
 * @param {Function} [o.noteOff]   `(note) => msg` that releases a held note
 * @param {Function} [o.onRelease] `(note) => void` beside each release
 * @param {Function} [o.onChange]  after the inputs were read, e.g. a patchbay refresh
 * @param {Function} [o.log]       `(line, kind)`
 * @returns {{ plugged: Set<string>, attach: (access) => void, ask: () => Promise<object|null> }}
 */
export function createMidiDevices({ bay, site, to, emits = ['note'], portLabel = null, message = null,
  noteOff = (n) => ({ cls: 'note', ch: 1, d1: n, d2: 0 }), onRelease = null, onChange = null, log = () => {} }) {
  const plugged = new Set();         // node ids of the devices plugged in now
  const slots = new Map();           // MIDI port id -> node id
  const held = new Map();            // node id -> Set of notes held on it
  const linked = new Map();          // node id -> link ids
  const wired = new WeakSet();
  const slotFor = (p) => {
    if (!slots.has(p.id)) slots.set(p.id, slots.size ? `${site}:midi-${slots.size + 1}` : `${site}:midi`);
    return slots.get(p.id);
  };
  const notes = (e, { send, hold }) => {
    const [b0, d1, d2 = 0] = e.data;
    const st = b0 & 0xf0, ch = (b0 & 0x0f) + 1;
    if (st !== 0x90 && st !== 0x80) return;
    const on = st === 0x90 && d2 > 0;
    hold(d1, on);
    send({ cls: 'note', ch, d1, d2: on ? d2 : 0 });
  };
  function fromDevice(e) {
    const node = slots.get(e.target.id);
    if (!node || !plugged.has(node)) return;
    const send = (msg) => bay.send(`${node}:midi-out`, msg);
    const hold = (n, on) => { const h = held.get(node); if (on) h.add(n); else h.delete(n); };
    (message || notes)(e, { node, send, hold });
  }
  function plug(p) {
    const node = slotFor(p);
    bay.addNode({ id: node, kind: 'device', label: p.name || 'MIDI keyboard', place: 'browser' });
    if (plugged.has(node)) return;
    bay.addPort({ id: `${node}:midi-out`, ...(portLabel ? { label: portLabel(node) } : {}), dir: 'out', medium: 'midi', emits });
    const ids = [];
    for (const t of to) {
      const r = bay.link(`${node}:midi-out`, t, [], { site });
      if (r.ok) ids.push(r.id); else log(`${node}:midi-out -> ${t} refused: ${r.why}`, 'warn');
    }
    plugged.add(node); held.set(node, new Set()); linked.set(node, ids);
    if (!wired.has(p)) { p.addEventListener('midimessage', fromDevice); wired.add(p); }
    log(`MIDI in: ${p.name || 'unnamed port'} as ${node}`);
  }
  function unplug(node) {
    // Let go of what it was holding first, so nothing hangs or stays lit.
    for (const n of held.get(node) || []) { onRelease?.(n); bay.send(`${node}:midi-out`, noteOff(n)); }
    for (const id of linked.get(node) || []) bay.unlink(id);
    plugged.delete(node); held.delete(node); linked.delete(node);
    log(`MIDI in gone: ${bay.node?.(node)?.label || node}`);
  }
  function read(access) {
    const now = new Set();
    for (const p of access.inputs.values()) if (p.state !== 'disconnected') { plug(p); now.add(slotFor(p)); }
    for (const node of [...plugged]) if (!now.has(node)) unplug(node);
    onChange?.();
  }
  /** Read `access`'s inputs now and again on every change. */
  function attach(access) {
    read(access);
    access.onstatechange = () => read(access);
  }
  /** Ask the browser (its prompt shows once) and attach; null when refused or absent, and nothing is said. */
  function ask() {
    if (!navigator.requestMIDIAccess) return Promise.resolve(null);
    return navigator.requestMIDIAccess({ sysex: false }).then((access) => { attach(access); return access; }, () => null);
  }
  return { plugged, attach, ask };
}

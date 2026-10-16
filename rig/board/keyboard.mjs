// rig/board/keyboard.mjs: the Evolution MK-425C plugged into the Pi plays the Circuit, by the board.
// The board reads the keyboard's raw MIDI and forwards it along a link in its own bay,
// `pi-1:mk-425c:midi-out -> pi-1:circuit:midi-in { channel N }`, into the Circuit input's gate.
// why: lessons/rig-board-keyboard.md#header

import { createBay, printLink } from '../../demo/shell/bay.mjs';
import { boardPort } from '../../demo/shell/graph-registry.mjs';
import { createMidiParser } from './midi-back.mjs';
import { spread } from './sequencer.mjs';

/** Synth 1 and Synth 2 of the Circuit, which listen on channels 1 and 2. */
export const KBD_CHANNELS = Object.freeze([1, 2]);
/** Where the keyboard can play: the Circuit (a channel) or the board's own Plaits. */
export const KBD_TARGETS = Object.freeze(['circuit', 'plaits']);
/** The keyboard's ALSA card id (`/proc/asound/Keyboard`), resolved to a card number at every open. */
export const KBD_CARD = 'Keyboard';
const LAT_KEEP = 512;

/** A parsed message `[status, d1, d2?]` as a bay event, or null. A note on at velocity 0 is a note off. */
export function eventOfBytes(m) {
  if (!Array.isArray(m) || m.length < 2) return null;
  const [st, d1, d2] = m, k = st & 0xF0, ch = (st & 0x0F) + 1;
  if (k === 0x90 && d2 > 0) return { cls: 'note', ch, d1, d2 };
  if (k === 0x80 || k === 0x90) return { cls: 'note', ch, d1, d2: 0, off: true };
  if (k === 0xB0) return { cls: 'cc', ch, d1, d2 };
  if (k === 0xC0) return { cls: 'program', ch, d1 };
  if (k === 0xE0) return { cls: 'bend', ch, d1, d2 };
  if (k === 0xA0 || k === 0xD0) return { cls: 'touch', ch, d1, d2 };
  return null;
}

/** A bay event as the bytes the Circuit's gate reads, or null for a class this file never writes. */
export function bytesOfEvent(ev) {
  const c = (ev.ch - 1) & 0x0F;
  if (ev.cls === 'note') return ev.off || !ev.d2 ? [0x80 | c, ev.d1, 0] : [0x90 | c, ev.d1, ev.d2];
  if (ev.cls === 'cc') return [0xB0 | c, ev.d1, ev.d2];
  if (ev.cls === 'program') return [0xC0 | c, ev.d1];
  return null;
}

/**
 * The board's verbs around the keyboard: `kbd.link { target, channel }`, `kbd.unlink`, `kbd.status`, each
 * answered `kbd.state`. The device is open only while the link is held, and reopened after a replug.
 * `target` is `circuit` (default, needs a channel) or `plaits` (notes to `play`).
 * @param {object} o
 * @param {() => object|null} o.graph    the board's graph (beat.mjs `graphOf`)
 * @param {() => void} [o.refresh]       list the ALSA ports again, so a replugged keyboard is in the graph
 * @param {(bytes: number[], refused: (why: string) => void) => void} o.midiSend  into the Circuit's gate
 * @param {(card: string, h: { data: (chunk: Uint8Array) => void, end: (why: string) => void }) => { close(): void }} o.open
 * @param {(card: string) => boolean} o.present
 * @param {(ev: object) => {ok: boolean, why?: string}} [o.play]  a note into the board's Plaits
 * @param {(ev: object) => void} [o.onNote]  each note on forwarded, after it is written
 * why: lessons/rig-board-keyboard.md#service
 */
export function createKeyboardService({ graph, refresh = () => {}, midiSend, play = () => ({ ok: false, why: 'this board has no Plaits' }), open, present, onNote = () => {}, log = () => {},
  card = KBD_CARD, source = 'mk-425c', target = 'circuit', checkMs = 2000,
  now = () => performance.now(), setTimer = (fn, ms) => setInterval(fn, ms), clearTimer = (t) => clearInterval(t) }) {
  const SRC = boardPort(source, 'midi-out');
  let to = target, TO = boardPort(target, 'midi-in');
  let bay = null, channel = null, linkWhy = '', reader = null, readerSaid = '', parser = createMidiParser();
  const held = new Set();               // `${ch}:${note}` this link started on the Circuit and has not ended
  const n = { read: 0, forwarded: 0, refused: 0, sysex: 0, realtime: 0, opens: 0, ends: 0 };
  const lat = [];
  let lastRefusal = '', lastWritten = [];

  /** The bay from the board's graph: the keyboard's out, the target's in, the one link. */
  function wire(ch, dest) {
    to = dest; TO = boardPort(dest, 'midi-in');
    let g = graph();
    if (g && !g.ports.some((p) => p.id === SRC)) { refresh(); g = graph(); }
    if (!g) return 'the board has not said what it is yet';
    const a = g.ports.find((p) => p.id === SRC), b = g.ports.find((p) => p.id === TO);
    if (!a) return `${SRC} is not on this board: is the keyboard plugged in?`;
    if (!b) return `${TO} is not on this board: ${dest === 'circuit' ? 'is the Circuit plugged in?' : 'is Plaits built on this board?'}`;
    const next = createBay();
    const ends = [SRC, TO].map((id) => id.split(':').slice(0, 2).join(':'));
    for (const nd of g.nodes) if (ends.includes(nd.id)) next.addNode(nd);
    next.addPort(a);
    next.addPort({ ...b, deliver: (ev, l, meta) => out(ev, meta) });
    const r = next.link(SRC, TO, dest === 'circuit' ? [{ op: 'channel', to: ch }] : []);
    if (!r.ok) return `${r.why} ${r.fix || ''}`.trim();
    bay = next;
    return '';
  }

  /** One event into the target; answers '' or why it was not taken. */
  function send(ev) {
    if (to === 'plaits') { const r = play(ev); return r?.ok === false ? (r.why || 'refused') : ''; }
    const bytes = bytesOfEvent(ev);
    if (!bytes) return `${ev.cls} is not written by the keyboard link`;
    let no = '';
    midiSend(bytes, (why) => { no = why || 'refused'; });
    if (!no) lastWritten = [...lastWritten, bytes].slice(-8);
    return no;
  }
  function write(ev, meta) {
    const no = send(ev);
    if (no) { n.refused++; lastRefusal = no; return false; }
    n.forwarded++;
    if (ev?.cls === 'note') {
      const key = `${ev.ch}:${ev.d1}`;
      if (ev.off || !ev.d2) held.delete(key);
      else {
        held.add(key);
        if (Number.isFinite(meta?.readAt)) { lat.push(now() - meta.readAt); if (lat.length > LAT_KEEP) lat.shift(); }
        onNote(ev);
      }
    }
    return true;
  }
  function out(ev, meta) { write(ev, meta); }

  /** Every note this link started, ended, so a key let go while unlinking does not hang on the Circuit. */
  function release(why) {
    if (!held.size) return 0;
    const k = held.size;
    for (const key of [...held]) {
      const [ch, d1] = key.split(':').map(Number);
      write({ cls: 'note', ch, d1, d2: 0, off: true });
    }
    held.clear();
    log(`keyboard: released ${k} held note${k === 1 ? '' : 's'}, ${why}`);
    return k;
  }

  /** One chunk off the keyboard: SysEx and real time counted and dropped by the parser, the rest along the link. */
  function data(chunk) {
    const readAt = now();
    readerSaid = '';
    for (const b of chunk) { if (b === 0xF0) n.sysex++; else if (b >= 0xF8) n.realtime++; }
    for (const m of parser.feed(chunk)) {
      n.read++;
      const ev = eventOfBytes(m);
      if (ev && bay) bay.send(SRC, ev, { readAt });
    }
  }

  function openReader() {
    if (reader || channel === null) return;
    const absent = `the keyboard is not plugged in, no /proc/asound/${card}`;
    if (!present(card)) { if (readerSaid !== absent) log(`keyboard: ${absent}, waiting for it`); readerSaid = absent; return; }
    try {
      parser = createMidiParser();
      const r = open(card, { data, end: (why) => {
        if (reader !== r) return;
        reader = null;
        release(`the keyboard went away (${why})`);
        // Said once per reason: a device held elsewhere ends every retry the same way.
        if (readerSaid !== why) log(`keyboard: the keyboard stopped (${why}), trying again every ${checkMs / 1000} s`);
        readerSaid = why;
        n.ends++;
      } });
      reader = r; n.opens++;
      if (!readerSaid || readerSaid === absent) log(`keyboard: reading ${card} into ${printLink(bay.links()[0])}`);
    } catch (e) {
      const why = e.code || e.message;
      if (readerSaid !== why) log(`keyboard: ${card} could not be opened, ${why}`);
      readerSaid = why;
    }
  }
  function closeReader() {
    const r = reader;
    reader = null;
    try { r?.close(); } catch { /* gone */ }
  }
  const ticker = setTimer(() => { if (channel !== null && !reader) openReader(); }, checkMs);
  ticker?.unref?.();

  function state(extra = {}) {
    const L = bay?.links()[0];
    return { ok: true, held: channel !== null, target: channel !== null ? to : null, channel, synth: channel, link: L ? printLink(L) : null,
      reading: !!reader, present: !!present(card), card, why: linkWhy || readerSaid || undefined,
      counts: { ...n, dropped: L?.dropped ?? 0, notesHeld: held.size }, lastRefusal: lastRefusal || undefined,
      written: lastWritten, lat: spread(lat), ...extra };
  }

  function unlink(why) {
    if (channel === null) return false;
    closeReader();
    release(why);
    channel = null; bay = null; readerSaid = '';
    log(`keyboard: ${SRC} -> ${TO} removed, ${why}`);
    return true;
  }

  return {
    handles: (msg) => typeof msg?.type === 'string' && /^kbd\.(link|unlink|status)$/.test(msg.type),
    async handle(msg, reply) {
      switch (msg.type) {
        case 'kbd.link': {
          const dest = msg.target ?? 'circuit';
          if (!KBD_TARGETS.includes(dest)) return reply('kbd.state', state({ ok: false, why: `target is one of ${KBD_TARGETS.join(', ')}` }));
          // On Plaits the keyboard plays as it is; `channel` 0 marks the link held.
          const ch = dest === 'plaits' ? 0 : Number(msg.channel);
          if (dest === 'circuit' && !KBD_CHANNELS.includes(ch)) return reply('kbd.state', state({ ok: false, why: `channel is ${KBD_CHANNELS.join(' or ')}, synth 1 or synth 2 of the Circuit` }));
          if (channel === ch && to === dest && bay) { openReader(); return reply('kbd.state', state({ already: true })); }
          if (channel !== null) unlink(`moving to ${dest === 'plaits' ? 'Plaits' : `channel ${ch}`}`);
          linkWhy = wire(ch, dest);
          if (linkWhy) { log(`keyboard: ${SRC} -> ${TO} refused: ${linkWhy}`); return reply('kbd.state', state({ ok: false })); }
          channel = ch;
          log(`keyboard: ${printLink(bay.links()[0])} held, by ${msg.from ?? 'nobody named'}`);
          openReader();
          return reply('kbd.state', state());
        }
        case 'kbd.unlink': unlink('asked'); linkWhy = ''; return reply('kbd.state', state());
        case 'kbd.status': return reply('kbd.state', state());
        default: return undefined;
      }
    },
    /** For the beat: whether the link is held, on which channel, and whether the keyboard is being read. */
    beat: () => ({ held: channel !== null, target: channel !== null ? to : null, channel, reading: !!reader, forwarded: n.forwarded }),
    status: state,
    stop() { unlink('the board is stopping'); clearTimer(ticker); },
  };
}

/**
 * The real reader: `cat` on the card's raw MIDI device, so a byte is handed over the moment it is read
 * and a replug ends the process. Resolves the card number every time: card numbers move.
 * why: lessons/rig-board-keyboard.md#reader
 */
export function rawMidiReader({ spawn, readlinkSync }) {
  return (card, { data, end }) => {
    const c = /^card(\d+)$/.exec(readlinkSync(`/proc/asound/${card}`))?.[1];
    if (c == null) throw new Error(`/proc/asound/${card} is not a card`);
    const p = spawn('cat', [`/dev/snd/midiC${c}D0`], { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stdout.on('data', (b) => data(b));
    p.stderr.on('data', (d) => { err += String(d); });
    p.on('exit', (code, sig) => end(err.trim().split('\n').at(-1) || `cat exited ${sig ?? code}`));
    return { close: () => { try { p.kill('SIGTERM'); } catch { /* gone */ } } };
  };
}

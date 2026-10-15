// demo/shell/rt-pi.mjs: the runtime of a Raspberry Pi node on /connect/ (node-runtime.mjs SITES).
// Nothing joins before the Join press: a link to a pi-1 port opens nothing, and a
// check gets a private room, never studio-1.
// why: lessons/kit-rt-pi.md#header

import { createBoard } from './board.mjs';
import { createLease } from './openers.mjs';
import { createButtonGroup } from './button-group.mjs';
import { roomFor, STUDIO_ROOM } from './bay-node.mjs';
import { samplerProgram } from './patch-names.mjs';

// What each Pi node does with a note, and which room it answers in. The
// Circuit is an input with its own room and a lease; the sampler is an
// instrument in the main room, started by name (/remote/piano/).
const KINDS = {
  circuit: { room: (r) => `${r}-circuit`, label: 'the Circuit', lease: true,
    midi: (board, ev) => {
      // Synth 1, channel 1; program changes 0 to 63 only, as /remote/circuit/'s gate.
      if (ev.cls === 'note') return board.send({ type: 'midi.send', bytes: ev.d2 > 0 ? [0x90, ev.d1, ev.d2] : [0x80, ev.d1, 0] });
      if (ev.cls === 'program' && ev.d1 >= 0 && ev.d1 <= 63) return board.send({ type: 'midi.send', bytes: [0xC0, ev.d1] });
      return false;
    } },
  sampler: { room: (r) => r, label: 'the sampler', start: 'sampler',
    midi: (board, ev) => {
      if (ev.cls !== 'note') return false;
      return board.send(ev.d2 > 0 ? { type: 'note.on', node: 'sampler', note: ev.d1, vel: ev.d2, channel: 0 }
        : { type: 'note.off', node: 'sampler', note: ev.d1, channel: 0 });
    },
    // The board's own verb for the sampler's program, as /remote/piano/ sends it.
    patch: (board, name) => {
      const program = samplerProgram(name);
      return program === null ? false : board.send({ type: 'voice.select', node: 'sampler', program });
    } },
};

export function make({ id, log, wake, reroute }) {
  const name = id.split(':')[1];
  const kind = KINDS[name] ?? null;
  const base = roomFor({ slug: 'connect' });
  const room = kind ? kind.room(base) : base;
  let board = null, lease = null, joined = false, sent = 0, heldOff = 0, chose = null, patched = null;
  // A patch chosen before Join is kept and sent once joined, as /remote/piano/ keeps a program.
  const sendPatch = () => { if (joined && board && chose && chose !== patched && kind?.patch?.(board, chose)) patched = chose; };
  const say = document.createElement('p');
  say.className = 'cn-face-say';
  say.textContent = kind ? `not joined: Join reaches ${kind.label} in ${room}` : `not joined: this Pi node is drawn, and nothing here plays it yet`;
  const badge = document.createElement('span');
  const buttons = createButtonGroup({ buttons: [
    { id: 'join', icon: 'play', label: 'Join', onPress: () => join() },
    { id: 'leave', icon: 'stop', label: 'Leave', onPress: () => leave() },
  ] });
  buttons.enable('leave', false, 'not joined');
  if (!kind) buttons.enable('join', false, 'nothing here plays this Pi node yet');
  const row = document.createElement('div');
  row.className = 'cn-pi-row';
  row.append(buttons.el, badge);
  const face = document.createElement('div');
  face.className = 'cn-panel';
  face.append(row, say);

  async function join() {
    if (board || !kind) return;
    const ctx = wake();
    let open;
    const opened = new Promise((r) => { open = r; });
    board = createBoard({ room, of: 'Raspberry Pi', showName: false, cushionMs: 80, maxCushionMs: 250,
      audioContext: ctx, toDestination: false,
      // A private room is a check against the stand-in board, never the studio.
      inSelfcheck: room.startsWith(STUDIO_ROOM) ? 'refuse' : 'allow',
      log, onOpen: () => open(true) });
    badge.replaceChildren(board.presence.el);
    buttons.enable('join', false, 'joined');
    buttons.enable('leave', true);
    say.textContent = `reaching ${room}`;
    const up = await Promise.race([opened, new Promise((r) => setTimeout(() => r(false), 8000))]);
    if (!board) return;
    if (!up) { say.textContent = `the relay did not open ${room} within eight seconds`; return; }
    await board.startAudio();
    reroute();
    const st = await board.ask({ type: 'audio.status' }, 'audio.started', 6000);
    if (!board) return;
    if (!st) { say.textContent = `the Raspberry Pi is not answering in ${room}`; return; }
    if (kind.start && !(st[kind.start]?.ok)) {
      const r = await board.ask({ type: 'audio.start', source: kind.start }, 'audio.started', 60000);
      if (!board) return;
      if (!r?.ok) { say.textContent = `the Pi could not start ${kind.label}${r?.reason ? `: ${r.reason}` : ''}`; return; }
    }
    if (kind.lease) lease = createLease({ ask: (m, r, t) => board.ask(m, r, t), what: `${kind.label} capture`, log });
    joined = true;
    sendPatch();
    say.textContent = `joined ${room}, ${kind.label} plays what arrives here`;
  }
  function leave() {
    if (!board) return;
    if (joined) board.send(name === 'circuit' ? { type: 'midi.panic' } : { type: 'note.panic' });
    lease?.stop(); lease = null;
    board.close(); board = null; joined = false; patched = null;
    badge.replaceChildren();
    buttons.enable('join', !!kind);
    buttons.enable('leave', false, 'not joined');
    say.textContent = `left ${room}`;
    reroute();
  }

  return {
    face, slot: 'panel', bridge: true, room,
    deliver: {
      'midi-in': (ev) => {
        if (!joined || !board) { heldOff++; return; }
        if (kind.midi(board, ev)) sent++;
      },
    },
    audio: { out: () => board?.playout() ?? null },
    join, leave,
    /** A `patch` transform on a link into this Pi node, sent now if joined or on Join. */
    patch(name) {
      if (!kind?.patch) { log(`${id} takes no patch from here`, 'warn'); return false; }
      chose = name; sendPatch();
      return true;
    },
    chosen: () => chose,
    joined: () => joined,
    board: () => board,
    lease: () => lease,
    heard: () => sent,
    heldOff: () => heldOff,
    close() { leave(); face.remove(); },
  };
}

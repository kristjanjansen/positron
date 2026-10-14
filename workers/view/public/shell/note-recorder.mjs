// demo/shell/note-recorder.mjs: /synth/recorder/'s recorder, notes in and played back at their times.
// A page hands it send(ev) (its rec:midi-out) and onStop(); it calls take(e) for every note on rec:midi-in.
// /synth/timeline/, /synth/dots/ and /room/words/ still carry their own copy.
// why: lessons/kit-note-recorder.md#header

import { createTable } from './table.mjs';
import { createButtonGroup } from './button-group.mjs';

export function createNoteRecorder({ send = () => {}, onStop = () => {} } = {}) {
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const nameOf = (n) => `${NAMES[n % 12]}${Math.floor(n / 12) - 1}`;
  let armed = false, t0 = 0;
  const notes = [];                // { n, vel, at, len }
  const open = new Map();          // note -> its row, until the key comes up
  function take(e) {
    if (!armed) return;
    const at = performance.now() - t0;
    if (e.d2) { const r = { n: e.d1, vel: e.d2, at, len: null }; notes.push(r); open.set(e.d1, r); }
    else { const r = open.get(e.d1); if (r) { r.len = at - r.at; open.delete(e.d1); } }
    drawNotes();
  }
  const notesT = createTable({ columns: [
    { key: 'i', label: '#', width: 36, align: 'right' },
    { key: 'note', label: 'note', grow: true, hi: true },
    { key: 'vel', label: 'vel', width: 48, align: 'right' },
    { key: 'at', label: 'at', width: 80, align: 'right' },
    { key: 'len', label: 'length', width: 80, align: 'right' },
  ], minRows: 6, stick: true });
  const ms = (v) => (v == null ? '' : `${(v / 1000).toFixed(2)} s`);
  function drawNotes() {
    notesT.set(notes.map((r, i) => ({ i: i + 1, note: nameOf(r.n), vel: r.vel, at: ms(r.at), len: r.len == null ? 'held' : ms(r.len) })));
  }
  let timers = [], playing = false;
  // The rows sounding right now during playback, lit with the table's own mark.
  const sounding = new Set();
  // The table scrolls inside its own box to keep the lit row in the middle;
  // scrollIntoView would move the whole page as well.
  const lit = () => {
    notesT.mark((row, i) => sounding.has(i));
    const box = notesT.scroller(), on = box.querySelector('.pos-tbl-row.on');
    if (on) box.scrollTop = on.offsetTop - box.offsetTop - (box.clientHeight - on.offsetHeight) / 2;
  };
  // Two toggles, icons only: record becomes stop while recording, play
  // becomes stop while playing. Recording and playing stop each other.
  function face() {
    const p = transport.button('play');
    transport.setIcon('rec', armed ? 'stop' : 'record', armed ? 'stop recording' : 'record');
    transport.setIcon('play', playing ? 'stop' : 'play', playing ? 'stop playing' : 'play');
    p.disabled = !notes.length && !playing;
  }
  function play() {
    stop();
    playing = true;
    const end = notes.reduce((m, r) => Math.max(m, r.at + (r.len ?? 200)), 0);
    timers.push(setTimeout(() => { playing = false; face(); }, end + 50));
    notes.forEach((r, i) => {
      timers.push(setTimeout(() => { sounding.add(i); lit(); send({ cls: 'note', ch: 1, d1: r.n, d2: r.vel }); }, r.at));
      timers.push(setTimeout(() => { sounding.delete(i); lit(); send({ cls: 'note', ch: 1, d1: r.n, d2: 0 }); }, r.at + (r.len ?? 200)));
    });
    face();
  }
  function stop() {
    armed = false; playing = false;
    sounding.clear(); lit();
    for (const t of timers) clearTimeout(t);
    timers = [];
    onStop();
    face();
  }
  function record() {
    stop();
    notes.length = 0; open.clear(); t0 = performance.now(); armed = true;
    drawNotes(); face();
  }
  const transport = createButtonGroup({ buttons: [
    { id: 'rec', icon: 'record', label: 'record', onPress: () => (armed ? stop() : record()) },
    { id: 'play', icon: 'play', label: 'play', onPress: () => (playing ? stop() : play()) },
  ] });
  transport.button('rec').classList.add('cc-rec');
  face();

  // ── the links as a picture, with the links and ports behind its details ──
  // A MIDI wire pulses once per event its link delivered; an audio wire is lit
  // while a voice sounds.

  return { take, transport, table: notesT, notes, play, stop, record, drawNotes,
    armed: () => armed, playing: () => playing };
}

// rig/board/midi-back.mjs: what the instrument says back, and the one part of
// it a page is told.
//
// 🔴 ASKED 2026-10-13: *"make all concept knobs \"invisible-handed\" start from
// remote 010"*. On /remote/circuit-on-pi/ the eight macro knobs M1 to M8 send
// CC 80 to 87 to the Circuit, and a hand turning the Circuit's own macro knob
// on the desk was not seen by the page, because nothing read the Circuit's
// MIDI out except a patch dump request (`inputs.mjs` `askBack`).
// 📏 MEASURED, NOT READ: the Circuit sends its macro knobs as plain absolute
// 7 bit CC 80 to 87 on channel 1 when they are turned by hand
// (research/measured-devices-2026-09-20.md, "Circuit macro 7 is CC 86", a full
// 0 to 127 sweep each, read through Web MIDI on the Mac). The Pi reading the
// same USB port through ALSA raw MIDI is not measured yet.
//
// 🔴 WHAT LEAVES IS AN ALLOWLIST AND IT IS SMALL: CC 80 to 87 on channels 1
// and 2, the macros of Synth 1 and Synth 2. Not the clock (48 a second,
// unattended), not notes, not SysEx, not the master filter on 16. A page that
// wants more asks for it by name here, never by widening a test.
// 🔴 AND IT IS RATE LIMITED PER CONTROLLER, LAST VALUE WINS. A hand sweeping a
// knob sends a CC per detent, 128 in a second or two; at most `GAP_MS` apart
// per controller reaches the room, and the value a hand stopped on always
// goes, late by at most one gap, never dropped.
//
// Pure apart from the timer it is handed, so `midi-back-test.mjs` grades it
// with no board, no ALSA and no relay.

/** The macro knobs, CC 80 to 87. */
export const BACK_CC = Object.freeze([80, 81, 82, 83, 84, 85, 86, 87]);
/** Synth 1 and Synth 2. The macros are the same numbers on each synth's channel. */
export const BACK_CHANNELS = Object.freeze([1, 2]);
/** At most this often per controller, so about 30 a second each. */
export const GAP_MS = 33;

/**
 * Channel voice messages out of a raw MIDI byte stream, as ALSA raw MIDI hands
 * it over in arbitrary chunks. Real time bytes (F8 to FF) may sit anywhere,
 * even inside another message, and are skipped without breaking it. SysEx is
 * skipped whole. Running status is honoured, because a stream is allowed to
 * use it even if USB MIDI from the Circuit has not been seen to.
 * Returns `[status, d1, d2?]` arrays.
 */
export function createMidiParser() {
  let run = 0, need = 0, data = [], inSysex = false;
  const len = (st) => {
    const k = st & 0xF0;
    return k === 0xC0 || k === 0xD0 ? 1 : 2;
  };
  return {
    feed(chunk) {
      const out = [];
      for (const b of chunk) {
        if (b >= 0xF8) continue;                       // real time, anywhere
        if (b === 0xF0) { inSysex = true; run = 0; data = []; continue; }
        if (b === 0xF7) { inSysex = false; continue; }
        if (b >= 0xF1) { inSysex = false; run = 0; data = []; continue; }   // system common: not ours
        if (b >= 0x80) { inSysex = false; run = b; need = len(b); data = []; continue; }
        if (inSysex || !run) continue;
        data.push(b);
        if (data.length === need) { out.push([run, ...data]); data = []; }
      }
      return out;
    },
  };
}

/** `{ ch, cc, v }` when this message is one a page is told, else null. */
export function backVerdict(msg) {
  if (!Array.isArray(msg) || msg.length !== 3) return null;
  const [st, cc, v] = msg;
  if ((st & 0xF0) !== 0xB0) return null;
  const ch = (st & 0x0F) + 1;
  if (!BACK_CHANNELS.includes(ch) || !BACK_CC.includes(cc)) return null;
  if (!(v >= 0 && v <= 127)) return null;
  return { ch, cc, v };
}

/**
 * Per controller, at most one value every `gapMs`, and the last one always
 * goes. A value inside the gap waits for the gap's end; a newer one overtakes
 * it rather than queueing behind it. `emit({ ch, cc, v })`.
 */
export function createBackLimiter({ emit, gapMs = GAP_MS, now = () => Date.now(),
  setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const q = new Map();      // `${ch}:${cc}` -> { v, last, timer, ch, cc }
  const counts = { in: 0, out: 0, folded: 0 };
  function flush(k) {
    const e = q.get(k);
    if (!e || e.v == null) return;
    const v = e.v; e.v = null; e.last = now();
    counts.out++;
    emit({ ch: e.ch, cc: e.cc, v });
  }
  return {
    push({ ch, cc, v }) {
      counts.in++;
      const k = `${ch}:${cc}`;
      const e = q.get(k) ?? { v: null, last: -Infinity, timer: null, ch, cc };
      q.set(k, e);
      if (e.v != null) counts.folded++;
      e.v = v;
      if (e.timer) return;
      const due = e.last + gapMs - now();
      if (due <= 0) flush(k);
      else e.timer = setTimer(() => { e.timer = null; flush(k); }, due);
    },
    counts: () => ({ ...counts }),
    close() { for (const e of q.values()) { if (e.timer) clearTimer(e.timer); e.timer = null; e.v = null; } },
  };
}

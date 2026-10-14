// The Circuit's MIDI out, of which a page hears an allowlist: CC 80 to 87 on channels 1 and 2.
// Rate limited per controller, last value wins. Pure but for the timer (midi-back-test.mjs).
// why: lessons/rig-board-io.md#midi-back-header

/** The macro knobs, CC 80 to 87. */
export const BACK_CC = Object.freeze([80, 81, 82, 83, 84, 85, 86, 87]);
/** Synth 1 and Synth 2. The macros are the same numbers on each synth's channel. */
export const BACK_CHANNELS = Object.freeze([1, 2]);
/** At most this often per controller, so about 30 a second each. */
export const GAP_MS = 33;

// Channel voice messages from raw MIDI chunks: real time bytes skipped anywhere, SysEx skipped
// whole,
// running status honoured. Returns `[status, d1, d2?]`.
// why: lessons/rig-board-io.md#midi-parser
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

// Per controller, one value per `gapMs`; a newer value overtakes a waiting one, the last always
// goes.
// why: lessons/rig-board-io.md#midi-back-limiter
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

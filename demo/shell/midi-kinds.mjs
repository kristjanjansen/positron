// demo/shell/midi-kinds.mjs: the one list of MIDI message kinds for bay.mjs and rig/board.
// Imports nothing: rig/board/push.sh ships only files a board module imports directly.
// why: lessons/kit-midi-kinds.md#header

/**
 * Every kind a port may accept or refuse, and a link may carry. `sysex` is here to be refused
 * by name; `clock` and `transport` are two kinds so a port can want tempo without start/stop.
 * why: lessons/kit-midi-kinds.md#kinds
 */
export const KINDS = ['note', 'cc', 'bend', 'touch', 'program', 'clock', 'transport', 'sysex'];

/** The older spellings `rig/board/alsa.mjs` accepted, so a saved patch keeps working. */
export const ALIASES = { pitchbend: 'bend', aftertouch: 'touch' };

/** A name in either spelling, as a kind, or null when it is neither. */
export function canonKind(name) {
  const k = ALIASES[name] ?? name;
  return KINDS.includes(k) ? k : null;
}

/**
 * The kind of a raw message from its status byte, or 'other'. No running status.
 * Note off is a note, and so is a note on at velocity 0.
 * why: lessons/kit-midi-kinds.md#kind-of
 */
export function kindOf(bytes) {
  const st = bytes?.[0];
  if (!Number.isInteger(st) || st < 0x80 || st > 0xFF) return 'other';
  if (st < 0xF0) {
    switch (st & 0xF0) {
      case 0x80: case 0x90: return 'note';
      case 0xA0: case 0xD0: return 'touch';
      case 0xB0: return 'cc';
      case 0xC0: return 'program';
      case 0xE0: return 'bend';
    }
  }
  switch (st) {
    case 0xF0: return 'sysex';
    case 0xF1: case 0xF8: return 'clock';                       // MTC quarter frame, timing clock
    case 0xF2: case 0xF3: case 0xFA: case 0xFB: case 0xFC: return 'transport'; // song position, song select, start, continue, stop
    default: return 'other';
  }
}

/** The same answer for a message already decoded by `midi-decode.mjs`. */
export function kindOfDecoded(m) {
  switch (m?.kind) {
    case 'note on': case 'note off': return 'note';
    case 'control': return 'cc';
    case 'pitch bend': return 'bend';
    case 'poly touch': case 'channel touch': return 'touch';
    case 'program': return 'program';
    case 'sysex': return 'sysex';
    case 'clock': case 'mtc': return 'clock';
    case 'start': case 'stop': case 'continue': case 'song position': case 'song select': return 'transport';
    default: return 'other';
  }
}

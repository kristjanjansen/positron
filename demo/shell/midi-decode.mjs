// demo/shell/midi-decode.mjs: bytes in, a row out, pure and graded by midi-decode-test.mjs.
// Every row carries the raw bytes beside the reading. A note-on at velocity 0 is a note-off.
// why: lessons/kit-midi-decode.md#header

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * A note number as a name, note 60 = C4 (Yamaha). Roland says C3, so the number is the fact.
 * why: lessons/kit-midi-decode.md#note-name
 */
export function noteName(n) {
  return `${NOTES[n % 12]}${Math.floor(n / 12) - 1}`;
}

/**
 * What the MIDI specification says a controller means, shown as `by convention`: on Yoshimi 76 and 77
 * are FM amplitude and resonance centre, not GM vibrato.
 * why: lessons/kit-midi-decode.md#cc-names
 */
const CC = new Map([
  [0, 'bank select MSB'], [1, 'mod wheel'], [2, 'breath'], [4, 'foot'],
  [5, 'portamento time'], [6, 'data entry MSB'], [7, 'volume'], [8, 'balance'],
  [10, 'pan'], [11, 'expression'], [32, 'bank select LSB'], [38, 'data entry LSB'],
  [64, 'sustain'], [65, 'portamento'], [66, 'sostenuto'], [67, 'soft'],
  [71, 'resonance'], [74, 'cutoff'],
  [96, 'data increment'], [97, 'data decrement'],
  [98, 'NRPN LSB'], [99, 'NRPN MSB'], [100, 'RPN LSB'], [101, 'RPN MSB'],
  [120, 'all sound off'], [121, 'reset controllers'], [123, 'all notes off'],
]);

export function ccName(n) {
  return CC.get(n) || '';
}

/** System real time, which arrives between the bytes of anything else. */
const REALTIME = new Map([
  [0xf8, 'clock'], [0xf9, 'undefined'], [0xfa, 'start'], [0xfb, 'continue'],
  [0xfc, 'stop'], [0xfd, 'undefined'], [0xfe, 'active sensing'], [0xff, 'reset'],
]);

/**
 * Clock (48 a second at 120 bpm) and active sensing (about 3 a second) are counted, never listed.
 * why: lessons/kit-midi-decode.md#is-flood
 */
export function isFlood(status) {
  return status === 0xf8 || status === 0xfe;
}

/**
 * One MIDI message, decoded.
 *
 * @param {Uint8Array|number[]} data  exactly as Web MIDI delivered it
 * @returns {{status:number, kind:string, ch:number|null, d1:number|null,
 *            d2:number|null, what:string, reading:string, bytes:string,
 *            flood:boolean, cc:number|null, note:number|null}}
 */
export function decode(data) {
  const b = Array.from(data);
  const bytes = b.map(hex).join(' ');
  const st = b[0] ?? 0;
  const base = {
    status: st, ch: null, d1: b[1] ?? null, d2: b[2] ?? null,
    bytes, flood: isFlood(st), cc: null, note: null,
  };

  // System real time and system common. These carry no channel at all, and a
  // page that prints `ch 15` for a clock byte is reading the low nibble of a
  // status byte that has no channel in it.
  if (st >= 0xf8) {
    return { ...base, kind: REALTIME.get(st) || 'system', d1: null, d2: null,
      what: REALTIME.get(st) || 'system', reading: '' };
  }
  if (st === 0xf0) {
    return { ...base, kind: 'sysex', d1: null, d2: null, what: 'sysex',
      reading: readInquiryReply(b) || `${b.length} bytes` };
  }
  if (st === 0xf1) {
    return { ...base, kind: 'mtc', what: 'quarter frame',
      reading: `piece ${(b[1] >> 4) & 0x07}` };
  }
  if (st === 0xf2) {
    const pos = ((b[2] << 7) | b[1]);
    return { ...base, kind: 'song position', what: 'song position',
      reading: `${pos} sixteenths, bar ${Math.floor(pos / 16) + 1}` };
  }
  if (st === 0xf3) {
    return { ...base, kind: 'song select', what: 'song select', d2: null,
      reading: `song ${b[1]}` };
  }
  if (st >= 0xf0) {
    return { ...base, kind: 'system', what: 'system', reading: '' };
  }

  const ch = (st & 0x0f) + 1;   // 1-16 for a reader; the wire is 0-15
  const kind = st & 0xf0;
  const a = b[1], v = b[2];

  switch (kind) {
    case 0x80:
      return { ...base, ch, kind: 'note off', note: a, what: 'note off',
        reading: `${noteName(a)} off, velocity ${v}` };
    case 0x90:
      // The whole reason this branch is not one line.
      return v === 0
        ? { ...base, ch, kind: 'note off', note: a, what: 'note off',
            reading: `${noteName(a)} off, sent as note on at velocity 0` }
        : { ...base, ch, kind: 'note on', note: a, what: 'note on',
            reading: `${noteName(a)}, velocity ${v}` };
    case 0xa0:
      return { ...base, ch, kind: 'poly touch', note: a, what: 'poly touch',
        reading: `${noteName(a)} pressure ${v}` };
    case 0xb0: {
      const name = ccName(a);
      return { ...base, ch, kind: 'control', cc: a, what: `CC ${a}`,
        reading: name ? `${v}, ${name} by convention` : `${v}` };
    }
    case 0xc0:
      return { ...base, ch, kind: 'program', d2: null, what: 'program',
        reading: `program ${a}` };
    case 0xd0:
      return { ...base, ch, kind: 'channel touch', d2: null, what: 'channel touch',
        reading: `pressure ${a}` };
    case 0xe0: {
      // 🔴 LITTLE ENDIAN AND FOURTEEN BITS. The LSB comes FIRST, which is the
      // opposite of every other pair on the wire, and centre is 8192 rather
      // than 0. Getting either wrong gives a number that moves plausibly.
      const raw = (v << 7) | a;
      return { ...base, ch, kind: 'pitch bend', what: 'pitch bend',
        reading: `${raw}, ${raw === 8192 ? 'centred' : raw > 8192 ? `+${raw - 8192}` : raw - 8192}` };
    }
    default:
      return { ...base, ch, kind: 'unknown', what: 'unknown', reading: '' };
  }
}

function hex(n) {
  return n.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * MIDI Device Inquiry, universal SysEx, so any maker's box answers with its firmware revision.
 * 0x7F is the all-channels address.
 * why: lessons/kit-midi-decode.md#device-inquiry
 */
export function deviceInquiry() {
  return [0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7];
}

/**
 * The reply, if that is what this is. The manufacturer id is one byte or three; 0x00 escapes to three.
 * @returns {string} '' when these bytes are not an inquiry reply
 * why: lessons/kit-midi-decode.md#read-inquiry-reply
 */
export function readInquiryReply(b) {
  if (b[0] !== 0xf0 || b[1] !== 0x7e || b[3] !== 0x06 || b[4] !== 0x02) return '';
  let i = 5, man;
  if (b[i] === 0x00) { man = `${hex(b[i])} ${hex(b[i + 1])} ${hex(b[i + 2])}`; i += 3; }
  else { man = hex(b[i]); i += 1; }
  const who = MAKERS.get(man) || `maker ${man}`;
  const family = (b[i + 1] << 7) | b[i];
  const member = (b[i + 3] << 7) | b[i + 2];
  const rev = b.slice(i + 4, i + 8).filter((n) => n !== undefined);
  return `${who}, family ${family}, model ${member}, version ${rev.join('.')}`;
}

/**
 * Not a complete table: an unknown id is printed as the id.
 * why: lessons/kit-midi-decode.md#makers
 */
const MAKERS = new Map([
  ['41', 'Roland'], ['42', 'Korg'], ['43', 'Yamaha'], ['47', 'Akai'],
  ['00 20 29', 'Focusrite / Novation'],
  ['00 01 3F', 'Evolution / M-Audio'],
  ['00 02 2E', 'TEAC / TASCAM'],
  ['7D', 'non-commercial'],
]);

/**
 * Is this controller sending positions or clicks? Four seconds of turning answers what no document does.
 * unknown until there is enough to say. @param {number[]} values for one (channel, controller)
 * @returns {{verdict:'absolute'|'relative'|'unknown', why:string}}
 * why: lessons/kit-midi-decode.md#classify-encoder
 */
export function classifyEncoder(values) {
  const n = values.length;
  if (n < 10) return { verdict: 'unknown', why: `only ${n} so far, 10 needed` };

  const distinct = new Set(values);

  /**
   * Relative means a small set of magnitudes mirrored across bit 6, anywhere in the range: a Model 12
   * MULTI JOG sent 0x04/0x44, 0x3F/0x7F and 0x02/0x42 over 525 messages.
   * why: lessons/kit-midi-decode.md#encoder-sign-bit
   */
  const mag = (v) => v & 0x3f;
  const neg = (v) => (v & 0x40) !== 0;
  const magnitudes = new Set(values.map(mag));
  const zeros = values.filter((v) => mag(v) === 0).length;
  const bothWays = values.some(neg) && values.some((v) => !neg(v));

  // ⚠️ A ZERO MAGNITUDE IS MEANINGLESS AS A CLICK, so a stream carrying many of
  // them is reporting positions. An absolute knob sweeping its travel passes
  // through 0 and through 64 like any other value.
  if (bothWays && magnitudes.size <= 8 && zeros <= n * 0.05) {
    const pairs = [...magnitudes].sort((x, y) => x - y).join(', ');
    return { verdict: 'relative',
      why: `${n} messages, ${magnitudes.size} step size${magnitudes.size === 1 ? '' : 's'} `
         + `(${pairs}), both directions, sign on bit 6` };
  }
  if (!bothWays && magnitudes.size <= 8 && zeros <= n * 0.05 && n >= 10) {
    return { verdict: 'unknown',
      why: `${magnitudes.size} step sizes but only one direction, turn it the other way` };
  }

  const near = (v) => (v >= 1 && v <= 15) || (v >= 65 && v <= 79);
  const outside = values.filter((v) => !near(v)).length;

  if (distinct.size >= 10 || outside > n * 0.2) {
    const lo = Math.min(...values), hi = Math.max(...values);
    return { verdict: 'absolute', why: `${distinct.size} distinct values, ${lo} to ${hi}` };
  }
  return { verdict: 'unknown', why: `${distinct.size} distinct, not clustered and not swept` };
}

/**
 * NRPN is four CC messages that mean one thing; the page shows both the four rows and the one.
 * 99 is MSB and 98 is LSB; RPN is 101 and 100.
 * why: lessons/kit-midi-decode.md#create-nrpn
 */
export function createNrpn() {
  const per = new Map();   // channel -> { msb, lsb, rpn }
  return {
    /** @returns {string} '' unless this message completed a parameter write */
    feed(msg) {
      if (msg.kind !== 'control') return '';
      const s = per.get(msg.ch) || { msb: null, lsb: null, rpn: false };
      per.set(msg.ch, s);
      const v = msg.d2;
      switch (msg.cc) {
        case 99: s.msb = v; s.rpn = false; return '';
        case 98: s.lsb = v; s.rpn = false; return '';
        case 101: s.msb = v; s.rpn = true; return '';
        case 100: s.lsb = v; s.rpn = true; return '';
        case 6:
          if (s.msb === null || s.lsb === null) return '';
          return `${s.rpn ? 'RPN' : 'NRPN'} ${s.msb * 128 + s.lsb} = ${v}`;
        case 38:
          if (s.msb === null || s.lsb === null) return '';
          return `${s.rpn ? 'RPN' : 'NRPN'} ${s.msb * 128 + s.lsb} fine = ${v}`;
        default: return '';
      }
    },
    pending: () => per,
  };
}

/**
 * Is a pitch bend fourteen bits, or seven in a fourteen bit message? Ask whether the LSB is independent of
 * the MSB: an MK-425C sends LSB 0, a Model 12 fader copies the MSB into it.
 * @returns {{bits:7|14|0, why:string, positions:number}}
 * why: lessons/kit-midi-decode.md#classify-bend
 */
export function classifyBend(messages) {
  const b = messages.map((m) => Array.from(m)).filter((m) => (m[0] & 0xf0) === 0xe0);
  if (b.length < 4) return { bits: 0, why: `only ${b.length} so far, 4 needed`, positions: 0 };

  const lsb = b.map((m) => m[1]), msb = b.map((m) => m[2]);
  const positions = new Set(b.map((m) => (m[2] << 7) | m[1])).size;

  if (new Set(lsb).size === 1) {
    return { bits: 7, positions,
      why: `the low byte is always 0x${lsb[0].toString(16).toUpperCase()}, `
         + `so 128 of the 16384 positions exist` };
  }
  if (b.every((m) => m[1] === m[2])) {
    return { bits: 7, positions,
      why: 'the low byte is a copy of the high byte, so it varies perfectly and '
         + 'carries nothing. 128 positions, not 16384' };
  }
  return { bits: 14, positions,
    why: `${new Set(lsb).size} low byte values against ${new Set(msb).size} high, `
       + `moving independently` };
}

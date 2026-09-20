// demo/shell/midi-decode.mjs — bytes in, a row out. No browser, no device.
//
// 🔴 WHY THIS IS A MODULE AND NOT A FUNCTION INSIDE `/dump/`. Everything here is
// pure, so it can be graded by `node demo/shell/midi-decode-test.mjs` against
// byte streams whose answers are known in advance. A decoder living inside a
// page can only ever be tested by plugging something in, and what a device
// happens to send today is not a known answer, so it cannot test a decoder.
// `demo/shell/looper-test.mjs` is the precedent and made the same argument.
//
// 🔴 RAW BYTES ARE NEVER REPLACED BY A READING OF THEM. Every row this returns
// carries `bytes` alongside `reading`, and the page shows both. A relative
// encoder reads as a position if you only interpret it, and that is exactly the
// question somebody points this page at a mixer to settle.
//
// ⚠️ A NOTE-ON AT VELOCITY 0 IS A NOTE-OFF. `midi.mjs` already carries this
// warning and it belongs here too: most keyboards send it that way and many
// never send 0x80 at all.

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * A note number as a name. Middle C is C4 here, which is the Yamaha/MIDI
 * convention where note 60 is C4.
 *
 * ⚠️ THERE IS NO AGREED ANSWER AND EVERY CHOICE IS WRONG SOMEWHERE. Roland
 * calls note 60 C3 and Yamaha calls it C4, so a name is a CONVENTION and the
 * NUMBER is the fact. That is why the page shows the number in its own column
 * and the name only inside the reading.
 */
export function noteName(n) {
  return `${NOTES[n % 12]}${Math.floor(n / 12) - 1}`;
}

/**
 * What the MIDI specification says a controller number means.
 *
 * 🔴 THIS IS A CONVENTION AND NOT A FACT ABOUT ANY DEVICE, AND THIS PROJECT HAS
 * ALREADY BEEN BITTEN BY TREATING IT AS ONE. In General MIDI, 76 and 77 are
 * vibrato rate and depth. On Yoshimi they are FM amplitude and resonance
 * centre, which was measured here on a real instrument after a slider labelled
 * from this table turned out to move nothing. So a name out of this table is
 * shown as `by convention` and never as what the knob you just turned does.
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
 * 🔴 CLOCK AND ACTIVE SENSING ARE FLOODS AND THE PAGE COUNTS THEM RATHER THAN
 * LISTING THEM. Clock is 24 per quarter note, so a mixer running at 120 bpm
 * sends 48 a second for as long as it is on, and active sensing is about three
 * a second forever. Either one fills a table in seconds and buries the one
 * message somebody pressed a button to see. This is the flag the page reads to
 * decide which pile a message goes in.
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
 * MIDI Device Inquiry: the one question every device is supposed to understand.
 *
 * 🔴 IT IS UNIVERSAL SYSEX, NOT A VENDOR EXTENSION, so it is the only way to ask
 * four different manufacturers' boxes the same question. A device that answers
 * returns its own firmware revision, which otherwise takes a menu dive on one
 * device and a web application on another.
 * ⚠️ `0x7F` IS THE ALL-CHANNELS ADDRESS. A device listening on any SysEx
 * channel replies.
 */
export function deviceInquiry() {
  return [0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7];
}

/**
 * The reply, if that is what this is.
 *
 * ⚠️ THE MANUFACTURER ID IS ONE BYTE OR THREE, and `0x00` is the escape into
 * the three byte form rather than a manufacturer. Reading it as one byte always
 * makes every three byte manufacturer look like the same nonexistent one.
 * @returns {string} '' when these bytes are not an inquiry reply
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
 * The four makers on this desk, plus the ones a reader is likeliest to meet.
 * ⚠️ NOT A COMPLETE TABLE and it must never pretend to be: an id that is not
 * here is printed as the id, which is still the fact.
 */
const MAKERS = new Map([
  ['41', 'Roland'], ['42', 'Korg'], ['43', 'Yamaha'], ['47', 'Akai'],
  ['00 20 29', 'Focusrite / Novation'],
  ['00 01 3F', 'Evolution / M-Audio'],
  ['00 02 2E', 'TEAC / TASCAM'],
  ['7D', 'non-commercial'],
]);

/**
 * Is this controller sending POSITIONS or CLICKS?
 *
 * 🔴 THE QUESTION THIS WHOLE PAGE EXISTS FOR. TASCAM publishes no controller
 * numbers for the Model 12 in Mackie Control mode at any firmware revision, so
 * whether its pan knobs send an absolute position or a relative click is not
 * answerable from any document. It IS answerable in about four seconds of
 * turning one knob.
 *
 * A relative encoder sends a small number for clockwise and the same small
 * number with bit 6 set for counter clockwise, so its values cluster near 0x01
 * and near 0x41 and NEVER sweep the range. An absolute one walks 0 to 127.
 *
 * ⚠️ IT RETURNS `unknown` UNTIL THERE IS ENOUGH TO SAY, AND `unknown` IS A REAL
 * ANSWER. Four messages cannot tell these apart: an absolute knob nudged four
 * times sends four neighbouring values, which is exactly what a relative one
 * looks like. A page that guesses from four is a page that is confidently wrong
 * half the time.
 *
 * @param {number[]} values every value seen for one (channel, controller)
 * @returns {{verdict:'absolute'|'relative'|'unknown', why:string}}
 */
export function classifyEncoder(values) {
  const n = values.length;
  if (n < 10) return { verdict: 'unknown', why: `only ${n} so far, 10 needed` };

  const distinct = new Set(values);

  /**
   * 🔴 THE SIGN IS BIT 6, AND THE MAGNITUDE IS THE OTHER SIX BITS. A signed bit
   * relative encoder sends `0x01..0x3F` for one direction and `0x41..0x7F` for
   * the other, so the WHOLE range is in play and a fast turn really does send
   * 63. What makes it relative is not where the values sit, it is that they
   * come in a small set of magnitudes MIRRORED across bit 6.
   *
   * 🔴 THE FIRST BUILD ASKED WHETHER THE VALUES SAT NEAR 1 AND NEAR 65, AND
   * MEASUREMENT KILLED IT. A TASCAM Model 12's MULTI JOG, read through this
   * module on 2026-09-20, sent exactly six values in 525 messages: `0x04` 172
   * times and `0x44` 189 times, `0x3F` 48 times and `0x7F` 48 times, `0x02` 35
   * times and `0x42` 33 times. Three magnitudes, each mirrored, and `0x3F` and
   * `0x7F` landing on the same count to the message. **This function called
   * that `unknown`**, because 63 and 127 fell outside a window that was guessed
   * rather than measured. A textbook relative encoder read as no answer at all.
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
 * NRPN is FOUR messages that mean ONE thing, and the four are ordinary CC
 * messages that also mean themselves.
 *
 * 🔴 THE PAGE SHOWS BOTH. The four rows stay in the table, because whether a
 * device rides this convention at all is the open question for the Circuit,
 * which Novation never wrote down. Folding them into one row would answer the
 * question by assuming it.
 *
 * ⚠️ 99 IS MSB AND 98 IS LSB, WHICH IS THE OPPOSITE ORDER FROM THE NUMBERS.
 * RPN is 101 and 100 and is a different address space with the same shape.
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
 * Is a pitch bend really fourteen bits, or seven bits in a fourteen bit
 * message?
 *
 * 🔴 BOTH DEVICES ON THIS DESK FAKE IT, IN TWO DIFFERENT DISGUISES, AND THE
 * OBVIOUS TEST IS FOOLED BY ONE OF THEM. MEASURED 2026-09-20:
 * - An **Evolution MK-425C** wheel sends `E0 00 <msb>`: the LSB is always zero.
 *   "Does the LSB move" catches this one.
 * - A **TASCAM Model 12** MCU fader sends `E0 22 22`, `E0 23 23`, `E0 26 26`:
 *   **the LSB is a copy of the MSB.** The LSB moves on every message, so "does
 *   the LSB move" answers FOURTEEN BIT, confidently, about a control with 128
 *   positions.
 *
 * ⚠️ SO THE QUESTION IS WHETHER THE LSB IS INDEPENDENT OF THE MSB, never
 * whether it changes. A statistic that is constant by construction over your
 * subject is not a weak measurement, it is a blind one, and this is the same
 * shape: a duplicated byte varies perfectly and carries nothing.
 *
 * @param {Array<Uint8Array|number[]>} messages every pitch bend seen on one channel
 * @returns {{bits:7|14|0, why:string, positions:number}}
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

// demo/shell/circuit-patch.mjs — what is inside a Novation Circuit pack: the
// 340 address synth patch, and the four numbers that tell a backup from a blank.
//
// 🔴 THIS EXISTED ONCE AND WAS NOT KEPT, WHICH IS WHY IT IS HERE.
// `research/circuit-soundbank-2026-09-21.md` built a decoder, graded it against
// the published `patch_0` at 246 varying fields of 324 exactly, and it lived in
// a scratchpad that is gone. `plans/plan-pack-page.md` §4 makes rebuilding it
// step one, because a page that decodes inline is the third place in this
// repository that knows the format and the first one nothing grades.
//
// 🔴 NOTHING HERE PRODUCES BYTES. There is no encoder, no writer and no sender,
// and that is a safety property rather than an omission. `Replace Current Patch`
// and `Replace Patch` differ by ONE byte at offset 6; the second overwrites a
// patch in FLASH on an instrument with no factory reset, and
// `New Pack.circuitpack` is the only backup of that flash. The function that
// turns an intention into a message does not exist, so it cannot be called by
// mistake. `circuit-patch-test.mjs` asserts the absence.
//
// 🔴 THE ADDRESS TABLE IS GENERATED, NOT TYPED. Parsed out of 📄 the Circuit
// Programmer's Reference Guide v1.1 (Paul Whittington and Jonathan Page,
// Novation / Focusrite) read with `pdftotext -layout`, the same method
// `circuit-cc.mjs` used, and checked to be 340 contiguous addresses 0..339 with
// no duplicates before it was written out. Two rows wrap across two lines in
// that document and truncate mid-word, so addresses 91 and 99 are written out by
// hand as bitfields and are marked as such below.
//
// ⚠️ A `d` HERE IS THE DOCUMENT'S DEFAULT, NOT A MEASUREMENT OF THIS DESK. It is
// what tells a parameter somebody moved from one nobody touched, which is the
// only thing the detail panel can honestly shade.

/** The whole file: 6 header bytes, command, location, reserved, 340 data, F7. */
export const PATCH_BYTES = 350;
/** The patch itself, addresses 0..339. */
export const PATCH_DATA = 340;
/** Where address 0 sits inside the file. */
export const DATA_AT = 9;
/** The name is addresses 0..15, space padded. */
export const NAME_LEN = 16;
/** `F0` then the Novation manufacturer, product type and product number. */
export const SYSEX_HEAD = [0xf0, 0x00, 0x20, 0x29, 0x01, 0x60];

// 🔴 BYTE 6 IS THE WHOLE SAFETY QUESTION ABOUT A `.syx` ON DISK. `00` is a
// message that lands in RAM and is forgotten at the next patch change; `01`
// overwrites one of the 64 patches in flash. Every one of the 128 loose `.syx`
// files in this repository's archive is `00`, measured.
export const COMMANDS = {
  0x00: { name: 'replace current patch', flash: false, slot: 'synth' },
  0x01: { name: 'replace patch', flash: true, slot: 'patch' },
  0x40: { name: 'current patch dump request', flash: false, slot: 'synth' },
};

export const POLYPHONY = ['mono', 'mono AG', 'poly'];

// 📄 Osc Waveform Table. The reference splits these into waveforms 0..13 and
// wavetables 14..29; the split is kept because a page may want to say which.
export const OSC_WAVES = [
  'sine', 'triangle', 'sawtooth', 'saw 9:1 PW', 'saw 8:2 PW', 'saw 7:3 PW',
  'saw 6:4 PW', 'saw 5:5 PW', 'saw 4:6 PW', 'saw 3:7 PW', 'saw 2:8 PW',
  'saw 1:9 PW', 'pulse width', 'square',
  'sine table', 'analogue pulse', 'analogue sync', 'triangle-saw blend',
  'digital nasty 1', 'digital nasty 2', 'digital saw-square', 'digital vocal 1',
  'digital vocal 2', 'digital vocal 3', 'digital vocal 4', 'digital vocal 5',
  'digital vocal 6', 'random collection 1', 'random collection 2',
  'random collection 3',
];
/** The first wavetable. Below this an oscillator is playing a plain shape. */
export const FIRST_WAVETABLE = 14;

// 📄 Filter Table.
export const FILTER_TYPES = [
  'low pass 12dB', 'low pass 24dB', 'band pass 6/6 dB', 'band pass 12/12 dB',
  'high pass 12dB', 'high pass 24dB',
];
export const DRIVE_TYPES = [
  'diode', 'valve', 'clipper', 'cross-over', 'rectifier', 'bit reducer',
  'rate reducer',
];
// 📄 Distortion Table. Same seven words but for `rectify`, which is the
// document's wording and is kept rather than tidied.
export const DISTORTION_TYPES = [
  'diode', 'valve', 'clipper', 'cross-over', 'rectify', 'bit reducer',
  'rate reducer',
];

// 📄 LFO Waveform Table.
export const LFO_WAVES = [
  'sine', 'triangle', 'sawtooth', 'square', 'random S/H', 'time S/H',
  'piano envelope', 'sequence 1', 'sequence 2', 'sequence 3', 'sequence 4',
  'sequence 5', 'sequence 6', 'sequence 7', 'alternative 1', 'alternative 2',
  'alternative 3', 'alternative 4', 'alternative 5', 'alternative 6',
  'alternative 7', 'alternative 8', 'chromatic', 'chromatic 16', 'major',
  'major 7', 'minor 7', 'min arp 1', 'min arp 2', 'diminished', 'dec minor',
  'minor 3rd', 'pedal', '4ths', '4ths x12', '1625 maj', '1625 Min', '2511',
];

// 📄 Mod Matrix Table.
export const MOD_SOURCES = [
  'direct', 'modulation wheel', 'after touch', 'expression', 'velocity',
  'keyboard', 'LFO 1 +', 'LFO 1 +/-', 'LFO 2 +', 'LFO 2 +/-', 'env amp',
  'env filter', 'env 3',
];
export const MOD_DESTINATIONS = [
  'osc 1 & 2 pitch', 'osc 1 pitch', 'osc 2 pitch', 'osc 1 v-sync',
  'osc 2 v-sync', 'osc 1 pulse width / index', 'osc 2 pulse width / index',
  'osc 1 level', 'osc 2 level', 'noise level', 'ring modulation 1*2 level',
  'filter drive amount', 'filter frequency', 'filter resonance', 'LFO 1 rate',
  'LFO 2 rate', 'amp envelope decay', 'filter envelope decay',
];
/** The source values that are an LFO, for the reading in `summarise`. */
export const LFO1_SOURCES = [6, 7];
export const LFO2_SOURCES = [8, 9];
/** A mod matrix depth of 64 is zero depth, so a slot at 64 reaches nothing. */
export const ZERO_DEPTH = 64;
export const MOD_SLOTS = 20;
export const MACRO_KNOBS = 8;

// 🔴 SEVEN OF FIFTEEN CATEGORY VALUES HAVE A WORD AND EIGHT DO NOT, AND THE
// SEVEN ARE DERIVED RATHER THAN PUBLISHED. 📄 The reference gives
// `Patch_Category` a range of 0..14 and no label table at all.
// `research/circuit-soundbank-2026-09-21.md` §4.3 recovered these by correlating
// the byte against a vendor's own spreadsheet column across 128 patches, with
// the agreement counts kept beside each one. The owner's factory bank also uses
// 5, 10, 11, 12 and 14, and there is no evidence anywhere on this machine of
// what those five mean.
// ⚠️ SO AN UNKNOWN CATEGORY GETS NO INVENTED WORD. `categoryName` returns `''`,
// which is `instruments.mjs`'s rule about an unrecognised port arriving here.
export const CATEGORIES = [
  'None',
  'Arp',
  'Bass',
  'Bell',
  'Classic',
  'Drum',
  'Keyboard',
  'Lead',
  'Motion',
  'Pad',
  'Poly',
  'SFX',
  'String',
  'User 1',
  'User 2',
];

/**
 * The seven values that were recovered by correlation before Novation's own
 * list was read, kept because they are the evidence that the list is right.
 * All seven agree with  exactly.
 */
export const CATEGORY_DERIVED = {
  1: 'arp', 2: 'bass', 3: 'bell', 6: 'keyboard', 7: 'lead', 8: 'motion',
  9: 'pad',
};

/**
 * 📄 The 71 macro knob destinations. The Programmer's Reference gives this
 * parameter a range of 0..70 and NO table at all, and
 * `research/circuit-soundbank-2026-09-21.md` §8 lists these names as
 * unobtainable from this machine. They were read off the live DOM of Novation's
 * own Circuit editor on 2026-09-21.
 * ✅ THE STRUCTURAL FIT IS WHAT MAKES THEM CREDIBLE RATHER THAN PLAUSIBLE:
 * values 51 to 70 are `Mod Matrix 1` to `Mod Matrix 20`, twenty consecutive
 * entries landing exactly on the twenty slots this format has, and ending
 * precisely at the documented maximum of 70.
 * 🔴 AND HOW THEY WERE OBTAINED WAS NOT AUTHORISED. The instrument was
 * CONNECTED while that page was driven by a script, with `Send to Circuit` in
 * the header. `plans/plan-circuit-synth-editor.md` opens with the whole account.
 * The data was re-verified here index by index; the reading was not the problem.
 */
export const MACRO_DESTINATIONS = [
  'No Destination',
  'Portamento Rate',
  'Post FX Volume',
  'O1 Wave Interpolate',
  'O1 Pulse Width Index',
  'O1 VSync Depth',
  'O1 Density',
  'O1 Density Detune',
  'O1 Semitones Tune',
  'O1 Cents Tune',
  'O2 Wave Interpolate',
  'O2 Pulse Width Index',
  'O2 VSync Depth',
  'O2 Density',
  'O2 Density Detune',
  'O2 Semitones Tune',
  'O2 Cents Tune',
  'OSC 1 Volume',
  'OSC 2 Volume',
  'Ring Volume',
  'Noise Volume',
  'Cutoff Frequency',
  'Resonance',
  'Drive',
  'Key Track',
  'Env2 Mod',
  'Env 1 Attack',
  'Env 1 Decay',
  'Env 1 Sustain',
  'Env 1 Release',
  'Env 2 Attack',
  'Env 2 Decay',
  'Env 2 Sustain',
  'Env 2 Release',
  'Env 3 Delay',
  'Env 3 Attack',
  'Env 3 Decay',
  'Env 3 Sustain',
  'Env 3 Release',
  'LFO 1 Rate',
  'LFO 1 Sync',
  'LFO 1 Slew',
  'LFO 2 Rate',
  'LFO 2 Sync',
  'LFO 2 Slew',
  'Distortion Level',
  'Chorus Level',
  'Chorus Rate',
  'Chorus Feedback',
  'Chorus Depth',
  'Chorus Delay',
  'Mod Matrix 1',
  'Mod Matrix 2',
  'Mod Matrix 3',
  'Mod Matrix 4',
  'Mod Matrix 5',
  'Mod Matrix 6',
  'Mod Matrix 7',
  'Mod Matrix 8',
  'Mod Matrix 9',
  'Mod Matrix 10',
  'Mod Matrix 11',
  'Mod Matrix 12',
  'Mod Matrix 13',
  'Mod Matrix 14',
  'Mod Matrix 15',
  'Mod Matrix 16',
  'Mod Matrix 17',
  'Mod Matrix 18',
  'Mod Matrix 19',
  'Mod Matrix 20',
];

/**
 * Every address the patch has, 0..339.
 * `a` address · `p` the reference's own parameter name · `d` its default ·
 * `lo`/`hi` its range where the document gives one · `bits` for the two
 * addresses that pack several settings into one byte.
 * @type {{a:number, p:string, d:number, lo?:number, hi?:number,
 *         bits?:[string,number,number][]}[]}
 */
export const ADDRESSES = [
  { a: 0, p: 'Patch_Name', d: 73 },
  { a: 1, p: 'Patch_Name', d: 110 },
  { a: 2, p: 'Patch_Name', d: 105 },
  { a: 3, p: 'Patch_Name', d: 116 },
  { a: 4, p: 'Patch_Name', d: 105 },
  { a: 5, p: 'Patch_Name', d: 97 },
  { a: 6, p: 'Patch_Name', d: 108 },
  { a: 7, p: 'Patch_Name', d: 32 },
  { a: 8, p: 'Patch_Name', d: 80 },
  { a: 9, p: 'Patch_Name', d: 97 },
  { a: 10, p: 'Patch_Name', d: 116 },
  { a: 11, p: 'Patch_Name', d: 99 },
  { a: 12, p: 'Patch_Name', d: 104 },
  { a: 13, p: 'Patch_Name', d: 32 },
  { a: 14, p: 'Patch_Name', d: 32 },
  { a: 15, p: 'Patch_Name', d: 32 },
  { a: 16, p: 'Patch_Category', d: 0, lo: 0, hi: 14 },
  { a: 17, p: 'Patch_Genre', d: 0, lo: 0, hi: 9 },
  { a: 18, p: 'Patch_Reserved1', d: 0 },
  { a: 19, p: 'Patch_Reserved2', d: 0 },
  { a: 20, p: 'Patch_Reserved3', d: 0 },
  { a: 21, p: 'Patch_Reserved4', d: 0 },
  { a: 22, p: 'Patch_Reserved5', d: 0 },
  { a: 23, p: 'Patch_Reserved6', d: 0 },
  { a: 24, p: 'Patch_Reserved7', d: 0 },
  { a: 25, p: 'Patch_Reserved8', d: 0 },
  { a: 26, p: 'Patch_Reserved9', d: 0 },
  { a: 27, p: 'Patch_Reserved10', d: 0 },
  { a: 28, p: 'Patch_Reserved11', d: 0 },
  { a: 29, p: 'Patch_Reserved12', d: 0 },
  { a: 30, p: 'Patch_Reserved13', d: 0 },
  { a: 31, p: 'Patch_Reserved14', d: 0 },
  { a: 32, p: 'Voice_PolyphonyMode', d: 2, lo: 0, hi: 2 },
  { a: 33, p: 'Voice_PortamentoRate', d: 0, lo: 0, hi: 127 },
  { a: 34, p: 'Voice_PreGlide', d: 64, lo: 52, hi: 76 },
  { a: 35, p: 'Voice_KeyboardOctave', d: 64, lo: 58, hi: 69 },
  { a: 36, p: 'Osc1_Wave', d: 2, lo: 0, hi: 29 },
  { a: 37, p: 'Osc1_WaveInterpolate', d: 127, lo: 0, hi: 127 },
  { a: 38, p: 'Osc1_PulseWidthIndex', d: 64, lo: 0, hi: 127 },
  { a: 39, p: 'Osc1_VirtualSyncDepth', d: 0, lo: 0, hi: 127 },
  { a: 40, p: 'Osc1_Density', d: 0, lo: 0, hi: 127 },
  { a: 41, p: 'Osc1_DensityDetune', d: 0, lo: 0, hi: 127 },
  { a: 42, p: 'Osc1_Semitones', d: 64, lo: 0, hi: 127 },
  { a: 43, p: 'Osc1_Cents', d: 64, lo: 0, hi: 127 },
  { a: 44, p: 'Osc1_PitchBend', d: 76, lo: 52, hi: 76 },
  { a: 45, p: 'Osc2_Wave', d: 2, lo: 0, hi: 29 },
  { a: 46, p: 'Osc2_WaveInterpolate', d: 127, lo: 0, hi: 127 },
  { a: 47, p: 'Osc2_PulseWidthIndex', d: 64, lo: 0, hi: 127 },
  { a: 48, p: 'Osc2_VirtualSyncDepth', d: 0, lo: 0, hi: 127 },
  { a: 49, p: 'Osc2_Density', d: 0, lo: 0, hi: 127 },
  { a: 50, p: 'Osc2_DensityDetune', d: 0, lo: 0, hi: 127 },
  { a: 51, p: 'Osc2_Semitones', d: 64, lo: 0, hi: 127 },
  { a: 52, p: 'Osc2_Cents', d: 64, lo: 0, hi: 127 },
  { a: 53, p: 'Osc2_PitchBend', d: 76, lo: 52, hi: 76 },
  { a: 54, p: 'Mixer_Osc1Level', d: 127, lo: 0, hi: 127 },
  { a: 55, p: 'Mixer_Osc2Level', d: 0, lo: 0, hi: 127 },
  { a: 56, p: 'Mixer_RingModLevel12', d: 0, lo: 0, hi: 127 },
  { a: 57, p: 'Mixer_NoiseLevel', d: 0, lo: 0, hi: 127 },
  { a: 58, p: 'Mixer_PreFXLevel', d: 64, lo: 52, hi: 82 },
  { a: 59, p: 'Mixer_PostFXLevel', d: 64, lo: 52, hi: 82 },
  { a: 60, p: 'Filter_Routing', d: 0, lo: 0, hi: 2 },
  { a: 61, p: 'Filter_Drive', d: 0, lo: 0, hi: 127 },
  { a: 62, p: 'Filter_DriveType', d: 0, lo: 0, hi: 6 },
  { a: 63, p: 'Filter_Type', d: 1, lo: 0, hi: 5 },
  { a: 64, p: 'Filter_Frequency', d: 127, lo: 0, hi: 127 },
  { a: 65, p: 'Filter_Track', d: 127, lo: 0, hi: 127 },
  { a: 66, p: 'Filter_Resonance', d: 0, lo: 0, hi: 127 },
  { a: 67, p: 'Filter_QNormalise', d: 64, lo: 0, hi: 127 },
  { a: 68, p: 'Filter_Env2ToFreq', d: 64, lo: 0, hi: 127 },
  { a: 69, p: 'Envelope1_Velocity', d: 64, lo: 0, hi: 127 },
  { a: 70, p: 'Envelope1_Attack', d: 2, lo: 0, hi: 127 },
  { a: 71, p: 'Envelope1_Decay', d: 90, lo: 0, hi: 127 },
  { a: 72, p: 'Envelope1_Sustain', d: 127, lo: 0, hi: 127 },
  { a: 73, p: 'Envelope1_Release', d: 40, lo: 0, hi: 127 },
  { a: 74, p: 'Envelope2_Velocity', d: 64, lo: 0, hi: 127 },
  { a: 75, p: 'Envelope2_Attack', d: 2, lo: 0, hi: 127 },
  { a: 76, p: 'Envelope2_Decay', d: 75, lo: 0, hi: 127 },
  { a: 77, p: 'Envelope2_Sustain', d: 35, lo: 0, hi: 127 },
  { a: 78, p: 'Envelope2_Release', d: 45, lo: 0, hi: 127 },
  { a: 79, p: 'Envelope3_Delay', d: 0, lo: 0, hi: 127 },
  { a: 80, p: 'Envelope3_Attack', d: 10, lo: 0, hi: 127 },
  { a: 81, p: 'Envelope3_Decay', d: 70, lo: 0, hi: 127 },
  { a: 82, p: 'Envelope3_Sustain', d: 64, lo: 0, hi: 127 },
  { a: 83, p: 'Envelope3_Release', d: 40, lo: 0, hi: 127 },
  { a: 84, p: 'LFO1_Waveform', d: 0, lo: 0, hi: 37 },
  { a: 85, p: 'LFO1_PhaseOffset', d: 0, lo: 0, hi: 119 },
  { a: 86, p: 'LFO1_SlewRate', d: 0, lo: 0, hi: 127 },
  { a: 87, p: 'LFO1_Delay', d: 0, lo: 0, hi: 127 },
  { a: 88, p: 'LFO1_DelaySync', d: 0, lo: 0, hi: 35 },
  { a: 89, p: 'LFO1_Rate', d: 68, lo: 0, hi: 127 },
  { a: 90, p: 'LFO1_RateSync', d: 0, lo: 0, hi: 35 },
  { a: 91, p: 'LFO1_Flags', d: 0, bits: [['LFO1_OneShot', 0, 1], ['LFO1_KeySync', 1, 1], ['LFO1_CommonSync', 2, 1], ['LFO1_DelayTrigger', 3, 1], ['LFO1_FadeMode', 4, 2]] },
  { a: 92, p: 'LFO2_Waveform', d: 0, lo: 0, hi: 37 },
  { a: 93, p: 'LFO2_PhaseOffset', d: 0, lo: 0, hi: 119 },
  { a: 94, p: 'LFO2_SlewRate', d: 0, lo: 0, hi: 127 },
  { a: 95, p: 'LFO2_Delay', d: 0, lo: 0, hi: 127 },
  { a: 96, p: 'LFO2_DelaySync', d: 0, lo: 0, hi: 35 },
  { a: 97, p: 'LFO2_Rate', d: 68, lo: 0, hi: 127 },
  { a: 98, p: 'LFO2_RateSync', d: 0, lo: 0, hi: 35 },
  { a: 99, p: 'LFO2_Flags', d: 0, bits: [['LFO2_OneShot', 0, 1], ['LFO2_KeySync', 1, 1], ['LFO2_CommonSync', 2, 1], ['LFO2_DelayTrigger', 3, 1], ['LFO2_FadeMode', 4, 2]] },
  { a: 100, p: 'Distortion_Level', d: 0, lo: 0, hi: 127 },
  { a: 101, p: 'FX_Reserved1', d: 0, lo: 0, hi: 127 },
  { a: 102, p: 'Chorus_Level', d: 0, lo: 0, hi: 127 },
  { a: 103, p: 'FX_Reserved2', d: 0 },
  { a: 104, p: 'FX_Reserved3', d: 0 },
  { a: 105, p: 'Equaliser_BassFrequency', d: 64, lo: 0, hi: 127 },
  { a: 106, p: 'Equaliser_BassLevel', d: 64, lo: 0, hi: 127 },
  { a: 107, p: 'Equaliser_MidFrequency', d: 64, lo: 0, hi: 127 },
  { a: 108, p: 'Equaliser_MidLevel', d: 64, lo: 0, hi: 127 },
  { a: 109, p: 'Equaliser_TrebleFrequency', d: 125, lo: 0, hi: 127 },
  { a: 110, p: 'Equaliser_TrebleLevel', d: 64, lo: 0, hi: 127 },
  { a: 111, p: 'FX_Reserved4', d: 0 },
  { a: 112, p: 'FX_Reserved5', d: 0 },
  { a: 113, p: 'FX_Reserved6', d: 0 },
  { a: 114, p: 'FX_Reserved7', d: 0 },
  { a: 115, p: 'FX_Reserved8', d: 0 },
  { a: 116, p: 'Distortion_Type', d: 0, lo: 0, hi: 6 },
  { a: 117, p: 'Distortion_Compensation', d: 100, lo: 0, hi: 127 },
  { a: 118, p: 'Chorus_Type', d: 1, lo: 0, hi: 1 },
  { a: 119, p: 'Chorus_Rate', d: 20, lo: 0, hi: 127 },
  { a: 120, p: 'Chorus_RateSync', d: 0, lo: 0, hi: 35 },
  { a: 121, p: 'Chorus_Feedback', d: 74, lo: 0, hi: 127 },
  { a: 122, p: 'Chorus_ModDepth', d: 64, lo: 0, hi: 127 },
  { a: 123, p: 'Chorus_Delay', d: 64, lo: 0, hi: 127 },
  { a: 124, p: 'ModMatrix1_Source1', d: 0, lo: 0, hi: 12 },
  { a: 125, p: 'ModMatrix1_Source2', d: 0, lo: 0, hi: 12 },
  { a: 126, p: 'ModMatrix1_Depth', d: 64, lo: 0, hi: 127 },
  { a: 127, p: 'ModMatrix1_Destination', d: 0, lo: 0, hi: 17 },
  { a: 128, p: 'ModMatrix2_Source1', d: 0, lo: 0, hi: 12 },
  { a: 129, p: 'ModMatrix2_Source2', d: 0, lo: 0, hi: 12 },
  { a: 130, p: 'ModMatrix2_Depth', d: 64, lo: 0, hi: 127 },
  { a: 131, p: 'ModMatrix2_Destination', d: 0, lo: 0, hi: 17 },
  { a: 132, p: 'ModMatrix3_Source1', d: 0, lo: 0, hi: 12 },
  { a: 133, p: 'ModMatrix3_Source2', d: 0, lo: 0, hi: 12 },
  { a: 134, p: 'ModMatrix3_Depth', d: 64, lo: 0, hi: 127 },
  { a: 135, p: 'ModMatrix3_Destination', d: 0, lo: 0, hi: 17 },
  { a: 136, p: 'ModMatrix4_Source1', d: 0, lo: 0, hi: 12 },
  { a: 137, p: 'ModMatrix4_Source2', d: 0, lo: 0, hi: 12 },
  { a: 138, p: 'ModMatrix4_Depth', d: 64, lo: 0, hi: 127 },
  { a: 139, p: 'ModMatrix4_Destination', d: 0, lo: 0, hi: 17 },
  { a: 140, p: 'ModMatrix5_Source1', d: 0, lo: 0, hi: 12 },
  { a: 141, p: 'ModMatrix5_Source2', d: 0, lo: 0, hi: 12 },
  { a: 142, p: 'ModMatrix5_Depth', d: 64, lo: 0, hi: 127 },
  { a: 143, p: 'ModMatrix5_Destination', d: 0, lo: 0, hi: 17 },
  { a: 144, p: 'ModMatrix6_Source1', d: 0, lo: 0, hi: 12 },
  { a: 145, p: 'ModMatrix6_Source2', d: 0, lo: 0, hi: 12 },
  { a: 146, p: 'ModMatrix6_Depth', d: 64, lo: 0, hi: 127 },
  { a: 147, p: 'ModMatrix6_Destination', d: 0, lo: 0, hi: 17 },
  { a: 148, p: 'ModMatrix7_Source1', d: 0, lo: 0, hi: 12 },
  { a: 149, p: 'ModMatrix7_Source2', d: 0, lo: 0, hi: 12 },
  { a: 150, p: 'ModMatrix7_Depth', d: 64, lo: 0, hi: 127 },
  { a: 151, p: 'ModMatrix7_Destination', d: 0, lo: 0, hi: 17 },
  { a: 152, p: 'ModMatrix8_Source1', d: 0, lo: 0, hi: 12 },
  { a: 153, p: 'ModMatrix8_Source2', d: 0, lo: 0, hi: 12 },
  { a: 154, p: 'ModMatrix8_Depth', d: 64, lo: 0, hi: 127 },
  { a: 155, p: 'ModMatrix8_Destination', d: 0, lo: 0, hi: 17 },
  { a: 156, p: 'ModMatrix9_Source1', d: 0, lo: 0, hi: 12 },
  { a: 157, p: 'ModMatrix9_Source2', d: 0, lo: 0, hi: 12 },
  { a: 158, p: 'ModMatrix9_Depth', d: 64, lo: 0, hi: 127 },
  { a: 159, p: 'ModMatrix9_Destination', d: 0, lo: 0, hi: 17 },
  { a: 160, p: 'ModMatrix10_Source1', d: 0, lo: 0, hi: 12 },
  { a: 161, p: 'ModMatrix10_Source2', d: 0, lo: 0, hi: 12 },
  { a: 162, p: 'ModMatrix10_Depth', d: 64, lo: 0, hi: 127 },
  { a: 163, p: 'ModMatrix10_Destination', d: 0, lo: 0, hi: 17 },
  { a: 164, p: 'ModMatrix11_Source1', d: 0, lo: 0, hi: 12 },
  { a: 165, p: 'ModMatrix11_Source2', d: 0, lo: 0, hi: 12 },
  { a: 166, p: 'ModMatrix11_Depth', d: 64, lo: 0, hi: 127 },
  { a: 167, p: 'ModMatrix11_Destination', d: 0, lo: 0, hi: 17 },
  { a: 168, p: 'ModMatrix12_Source1', d: 0, lo: 0, hi: 12 },
  { a: 169, p: 'ModMatrix12_Source2', d: 0, lo: 0, hi: 12 },
  { a: 170, p: 'ModMatrix12_Depth', d: 64, lo: 0, hi: 127 },
  { a: 171, p: 'ModMatrix12_Destination', d: 0, lo: 0, hi: 17 },
  { a: 172, p: 'ModMatrix13_Source1', d: 0, lo: 0, hi: 12 },
  { a: 173, p: 'ModMatrix13_Source2', d: 0, lo: 0, hi: 12 },
  { a: 174, p: 'ModMatrix13_Depth', d: 64, lo: 0, hi: 127 },
  { a: 175, p: 'ModMatrix13_Destination', d: 0, lo: 0, hi: 17 },
  { a: 176, p: 'ModMatrix14_Source1', d: 0, lo: 0, hi: 12 },
  { a: 177, p: 'ModMatrix14_Source2', d: 0, lo: 0, hi: 12 },
  { a: 178, p: 'ModMatrix14_Depth', d: 64, lo: 0, hi: 127 },
  { a: 179, p: 'ModMatrix14_Destination', d: 0, lo: 0, hi: 17 },
  { a: 180, p: 'ModMatrix15_Source1', d: 0, lo: 0, hi: 12 },
  { a: 181, p: 'ModMatrix15_Source2', d: 0, lo: 0, hi: 12 },
  { a: 182, p: 'ModMatrix15_Depth', d: 64, lo: 0, hi: 127 },
  { a: 183, p: 'ModMatrix15_Destination', d: 0, lo: 0, hi: 17 },
  { a: 184, p: 'ModMatrix16_Source1', d: 0, lo: 0, hi: 12 },
  { a: 185, p: 'ModMatrix16_Source2', d: 0, lo: 0, hi: 12 },
  { a: 186, p: 'ModMatrix16_Depth', d: 64, lo: 0, hi: 127 },
  { a: 187, p: 'ModMatrix16_Destination', d: 0, lo: 0, hi: 17 },
  { a: 188, p: 'ModMatrix17_Source1', d: 0, lo: 0, hi: 12 },
  { a: 189, p: 'ModMatrix17_Source2', d: 0, lo: 0, hi: 12 },
  { a: 190, p: 'ModMatrix17_Depth', d: 64, lo: 0, hi: 127 },
  { a: 191, p: 'ModMatrix17_Destination', d: 0, lo: 0, hi: 17 },
  { a: 192, p: 'ModMatrix18_Source1', d: 0, lo: 0, hi: 12 },
  { a: 193, p: 'ModMatrix18_Source2', d: 0, lo: 0, hi: 12 },
  { a: 194, p: 'ModMatrix18_Depth', d: 64, lo: 0, hi: 127 },
  { a: 195, p: 'ModMatrix18_Destination', d: 0, lo: 0, hi: 17 },
  { a: 196, p: 'ModMatrix19_Source1', d: 0, lo: 0, hi: 12 },
  { a: 197, p: 'ModMatrix19_Source2', d: 0, lo: 0, hi: 12 },
  { a: 198, p: 'ModMatrix19_Depth', d: 64, lo: 0, hi: 127 },
  { a: 199, p: 'ModMatrix19_Destination', d: 0, lo: 0, hi: 17 },
  { a: 200, p: 'ModMatrix20_Source1', d: 0, lo: 0, hi: 12 },
  { a: 201, p: 'ModMatrix20_Source2', d: 0, lo: 0, hi: 12 },
  { a: 202, p: 'ModMatrix20_Depth', d: 64, lo: 0, hi: 127 },
  { a: 203, p: 'ModMatrix20_Destination', d: 0, lo: 0, hi: 17 },
  { a: 204, p: 'MacroKnob1_Position', d: 0, lo: 0, hi: 127 },
  { a: 205, p: 'MacroKnob1_DestinationA', d: 0, lo: 0, hi: 70 },
  { a: 206, p: 'MacroKnob1_StartPosA', d: 0, lo: 0, hi: 127 },
  { a: 207, p: 'MacroKnob1_EndPosA', d: 127, lo: 0, hi: 127 },
  { a: 208, p: 'MacroKnob1_DepthA', d: 64, lo: 0, hi: 127 },
  { a: 209, p: 'MacroKnob1_DestinationB', d: 0, lo: 0, hi: 70 },
  { a: 210, p: 'MacroKnob1_StartPosB', d: 0, lo: 0, hi: 127 },
  { a: 211, p: 'MacroKnob1_EndPosB', d: 127, lo: 0, hi: 127 },
  { a: 212, p: 'MacroKnob1_DepthB', d: 64, lo: 0, hi: 127 },
  { a: 213, p: 'MacroKnob1_DestinationC', d: 0, lo: 0, hi: 70 },
  { a: 214, p: 'MacroKnob1_StartPosC', d: 0, lo: 0, hi: 127 },
  { a: 215, p: 'MacroKnob1_EndPosC', d: 127, lo: 0, hi: 127 },
  { a: 216, p: 'MacroKnob1_DepthC', d: 64, lo: 0, hi: 127 },
  { a: 217, p: 'MacroKnob1_DestinationD', d: 0, lo: 0, hi: 70 },
  { a: 218, p: 'MacroKnob1_StartPosD', d: 0, lo: 0, hi: 127 },
  { a: 219, p: 'MacroKnob1_EndPosD', d: 127, lo: 0, hi: 127 },
  { a: 220, p: 'MacroKnob1_DepthD', d: 64, lo: 0, hi: 127 },
  { a: 221, p: 'MacroKnob2_Position', d: 0, lo: 0, hi: 127 },
  { a: 222, p: 'MacroKnob2_DestinationA', d: 0, lo: 0, hi: 70 },
  { a: 223, p: 'MacroKnob2_StartPosA', d: 0, lo: 0, hi: 127 },
  { a: 224, p: 'MacroKnob2_EndPosA', d: 127, lo: 0, hi: 127 },
  { a: 225, p: 'MacroKnob2_DepthA', d: 64, lo: 0, hi: 127 },
  { a: 226, p: 'MacroKnob2_DestinationB', d: 0, lo: 0, hi: 70 },
  { a: 227, p: 'MacroKnob2_StartPosB', d: 0, lo: 0, hi: 127 },
  { a: 228, p: 'MacroKnob2_EndPosB', d: 127, lo: 0, hi: 127 },
  { a: 229, p: 'MacroKnob2_DepthB', d: 64, lo: 0, hi: 127 },
  { a: 230, p: 'MacroKnob2_DestinationC', d: 0, lo: 0, hi: 70 },
  { a: 231, p: 'MacroKnob2_StartPosC', d: 0, lo: 0, hi: 127 },
  { a: 232, p: 'MacroKnob2_EndPosC', d: 127, lo: 0, hi: 127 },
  { a: 233, p: 'MacroKnob2_DepthC', d: 64, lo: 0, hi: 127 },
  { a: 234, p: 'MacroKnob2_DestinationD', d: 0, lo: 0, hi: 70 },
  { a: 235, p: 'MacroKnob2_StartPosD', d: 0, lo: 0, hi: 127 },
  { a: 236, p: 'MacroKnob2_EndPosD', d: 127, lo: 0, hi: 127 },
  { a: 237, p: 'MacroKnob2_DepthD', d: 64, lo: 0, hi: 127 },
  { a: 238, p: 'MacroKnob3_Position', d: 0, lo: 0, hi: 127 },
  { a: 239, p: 'MacroKnob3_DestinationA', d: 0, lo: 0, hi: 70 },
  { a: 240, p: 'MacroKnob3_StartPosA', d: 0, lo: 0, hi: 127 },
  { a: 241, p: 'MacroKnob3_EndPosA', d: 127, lo: 0, hi: 127 },
  { a: 242, p: 'MacroKnob3_DepthA', d: 64, lo: 0, hi: 127 },
  { a: 243, p: 'MacroKnob3_DestinationB', d: 0, lo: 0, hi: 70 },
  { a: 244, p: 'MacroKnob3_StartPosB', d: 0, lo: 0, hi: 127 },
  { a: 245, p: 'MacroKnob3_EndPosB', d: 127, lo: 0, hi: 127 },
  { a: 246, p: 'MacroKnob3_DepthB', d: 64, lo: 0, hi: 127 },
  { a: 247, p: 'MacroKnob3_DestinationC', d: 0, lo: 0, hi: 70 },
  { a: 248, p: 'MacroKnob3_StartPosC', d: 0, lo: 0, hi: 127 },
  { a: 249, p: 'MacroKnob3_EndPosC', d: 127, lo: 0, hi: 127 },
  { a: 250, p: 'MacroKnob3_DepthC', d: 64, lo: 0, hi: 127 },
  { a: 251, p: 'MacroKnob3_DestinationD', d: 0, lo: 0, hi: 70 },
  { a: 252, p: 'MacroKnob3_StartPosD', d: 0, lo: 0, hi: 127 },
  { a: 253, p: 'MacroKnob3_EndPosD', d: 127, lo: 0, hi: 127 },
  { a: 254, p: 'MacroKnob3_DepthD', d: 64, lo: 0, hi: 127 },
  { a: 255, p: 'MacroKnob4_Position', d: 0, lo: 0, hi: 127 },
  { a: 256, p: 'MacroKnob4_DestinationA', d: 0, lo: 0, hi: 70 },
  { a: 257, p: 'MacroKnob4_StartPosA', d: 0, lo: 0, hi: 127 },
  { a: 258, p: 'MacroKnob4_EndPosA', d: 127, lo: 0, hi: 127 },
  { a: 259, p: 'MacroKnob4_DepthA', d: 64, lo: 0, hi: 127 },
  { a: 260, p: 'MacroKnob4_DestinationB', d: 0, lo: 0, hi: 70 },
  { a: 261, p: 'MacroKnob4_StartPosB', d: 0, lo: 0, hi: 127 },
  { a: 262, p: 'MacroKnob4_EndPosB', d: 127, lo: 0, hi: 127 },
  { a: 263, p: 'MacroKnob4_DepthB', d: 64, lo: 0, hi: 127 },
  { a: 264, p: 'MacroKnob4_DestinationC', d: 0, lo: 0, hi: 70 },
  { a: 265, p: 'MacroKnob4_StartPosC', d: 0, lo: 0, hi: 127 },
  { a: 266, p: 'MacroKnob4_EndPosC', d: 127, lo: 0, hi: 127 },
  { a: 267, p: 'MacroKnob4_DepthC', d: 64, lo: 0, hi: 127 },
  { a: 268, p: 'MacroKnob4_DestinationD', d: 0, lo: 0, hi: 70 },
  { a: 269, p: 'MacroKnob4_StartPosD', d: 0, lo: 0, hi: 127 },
  { a: 270, p: 'MacroKnob4_EndPosD', d: 127, lo: 0, hi: 127 },
  { a: 271, p: 'MacroKnob4_DepthD', d: 64, lo: 0, hi: 127 },
  { a: 272, p: 'MacroKnob5_Position', d: 0, lo: 0, hi: 127 },
  { a: 273, p: 'MacroKnob5_DestinationA', d: 0, lo: 0, hi: 70 },
  { a: 274, p: 'MacroKnob5_StartPosA', d: 0, lo: 0, hi: 127 },
  { a: 275, p: 'MacroKnob5_EndPosA', d: 127, lo: 0, hi: 127 },
  { a: 276, p: 'MacroKnob5_DepthA', d: 64, lo: 0, hi: 127 },
  { a: 277, p: 'MacroKnob5_DestinationB', d: 0, lo: 0, hi: 70 },
  { a: 278, p: 'MacroKnob5_StartPosB', d: 0, lo: 0, hi: 127 },
  { a: 279, p: 'MacroKnob5_EndPosB', d: 127, lo: 0, hi: 127 },
  { a: 280, p: 'MacroKnob5_DepthB', d: 64, lo: 0, hi: 127 },
  { a: 281, p: 'MacroKnob5_DestinationC', d: 0, lo: 0, hi: 70 },
  { a: 282, p: 'MacroKnob5_StartPosC', d: 0, lo: 0, hi: 127 },
  { a: 283, p: 'MacroKnob5_EndPosC', d: 127, lo: 0, hi: 127 },
  { a: 284, p: 'MacroKnob5_DepthC', d: 64, lo: 0, hi: 127 },
  { a: 285, p: 'MacroKnob5_DestinationD', d: 0, lo: 0, hi: 70 },
  { a: 286, p: 'MacroKnob5_StartPosD', d: 0, lo: 0, hi: 127 },
  { a: 287, p: 'MacroKnob5_EndPosD', d: 127, lo: 0, hi: 127 },
  { a: 288, p: 'MacroKnob5_DepthD', d: 64, lo: 0, hi: 127 },
  { a: 289, p: 'MacroKnob6_Position', d: 0, lo: 0, hi: 127 },
  { a: 290, p: 'MacroKnob6_DestinationA', d: 0, lo: 0, hi: 70 },
  { a: 291, p: 'MacroKnob6_StartPosA', d: 0, lo: 0, hi: 127 },
  { a: 292, p: 'MacroKnob6_EndPosA', d: 127, lo: 0, hi: 127 },
  { a: 293, p: 'MacroKnob6_DepthA', d: 64, lo: 0, hi: 127 },
  { a: 294, p: 'MacroKnob6_DestinationB', d: 0, lo: 0, hi: 70 },
  { a: 295, p: 'MacroKnob6_StartPosB', d: 0, lo: 0, hi: 127 },
  { a: 296, p: 'MacroKnob6_EndPosB', d: 127, lo: 0, hi: 127 },
  { a: 297, p: 'MacroKnob6_DepthB', d: 64, lo: 0, hi: 127 },
  { a: 298, p: 'MacroKnob6_DestinationC', d: 0, lo: 0, hi: 70 },
  { a: 299, p: 'MacroKnob6_StartPosC', d: 0, lo: 0, hi: 127 },
  { a: 300, p: 'MacroKnob6_EndPosC', d: 127, lo: 0, hi: 127 },
  { a: 301, p: 'MacroKnob6_DepthC', d: 64, lo: 0, hi: 127 },
  { a: 302, p: 'MacroKnob6_DestinationD', d: 0, lo: 0, hi: 70 },
  { a: 303, p: 'MacroKnob6_StartPosD', d: 0, lo: 0, hi: 127 },
  { a: 304, p: 'MacroKnob6_EndPosD', d: 127, lo: 0, hi: 127 },
  { a: 305, p: 'MacroKnob6_DepthD', d: 64, lo: 0, hi: 127 },
  { a: 306, p: 'MacroKnob7_Position', d: 0, lo: 0, hi: 127 },
  { a: 307, p: 'MacroKnob7_DestinationA', d: 0, lo: 0, hi: 70 },
  { a: 308, p: 'MacroKnob7_StartPosA', d: 0, lo: 0, hi: 127 },
  { a: 309, p: 'MacroKnob7_EndPosA', d: 127, lo: 0, hi: 127 },
  { a: 310, p: 'MacroKnob7_DepthA', d: 64, lo: 0, hi: 127 },
  { a: 311, p: 'MacroKnob7_DestinationB', d: 0, lo: 0, hi: 70 },
  { a: 312, p: 'MacroKnob7_StartPosB', d: 0, lo: 0, hi: 127 },
  { a: 313, p: 'MacroKnob7_EndPosB', d: 127, lo: 0, hi: 127 },
  { a: 314, p: 'MacroKnob7_DepthB', d: 64, lo: 0, hi: 127 },
  { a: 315, p: 'MacroKnob7_DestinationC', d: 0, lo: 0, hi: 70 },
  { a: 316, p: 'MacroKnob7_StartPosC', d: 0, lo: 0, hi: 127 },
  { a: 317, p: 'MacroKnob7_EndPosC', d: 127, lo: 0, hi: 127 },
  { a: 318, p: 'MacroKnob7_DepthC', d: 64, lo: 0, hi: 127 },
  { a: 319, p: 'MacroKnob7_DestinationD', d: 0, lo: 0, hi: 70 },
  { a: 320, p: 'MacroKnob7_StartPosD', d: 0, lo: 0, hi: 127 },
  { a: 321, p: 'MacroKnob7_EndPosD', d: 127, lo: 0, hi: 127 },
  { a: 322, p: 'MacroKnob7_DepthD', d: 64, lo: 0, hi: 127 },
  { a: 323, p: 'MacroKnob8_Position', d: 0, lo: 0, hi: 127 },
  { a: 324, p: 'MacroKnob8_DestinationA', d: 0, lo: 0, hi: 70 },
  { a: 325, p: 'MacroKnob8_StartPosA', d: 0, lo: 0, hi: 127 },
  { a: 326, p: 'MacroKnob8_EndPosA', d: 127, lo: 0, hi: 127 },
  { a: 327, p: 'MacroKnob8_DepthA', d: 64, lo: 0, hi: 127 },
  { a: 328, p: 'MacroKnob8_DestinationB', d: 0, lo: 0, hi: 70 },
  { a: 329, p: 'MacroKnob8_StartPosB', d: 0, lo: 0, hi: 127 },
  { a: 330, p: 'MacroKnob8_EndPosB', d: 127, lo: 0, hi: 127 },
  { a: 331, p: 'MacroKnob8_DepthB', d: 64, lo: 0, hi: 127 },
  { a: 332, p: 'MacroKnob8_DestinationC', d: 0, lo: 0, hi: 70 },
  { a: 333, p: 'MacroKnob8_StartPosC', d: 0, lo: 0, hi: 127 },
  { a: 334, p: 'MacroKnob8_EndPosC', d: 127, lo: 0, hi: 127 },
  { a: 335, p: 'MacroKnob8_DepthC', d: 64, lo: 0, hi: 127 },
  { a: 336, p: 'MacroKnob8_DestinationD', d: 0, lo: 0, hi: 70 },
  { a: 337, p: 'MacroKnob8_StartPosD', d: 0, lo: 0, hi: 127 },
  { a: 338, p: 'MacroKnob8_EndPosD', d: 127, lo: 0, hi: 127 },
  { a: 339, p: 'MacroKnob8_DepthD', d: 64, lo: 0, hi: 127 },
];

const BY_NAME = new Map();
for (const row of ADDRESSES) if (!BY_NAME.has(row.p)) BY_NAME.set(row.p, row.a);

/** The row at one address. */
export function address(a) {
  return ADDRESSES[a] || null;
}

/**
 * The address of a parameter, by the reference's own name.
 * ⚠️ IT THROWS ON A NAME THAT IS NOT THERE. A lookup that answered `undefined`
 * would be read as byte 0, which is the first letter of the patch name, and a
 * wrong reading that looks like a reading is this repository's costliest shape.
 */
export function addressOf(name) {
  const a = BY_NAME.get(name);
  if (a === undefined) throw new Error(`no patch address is called ${name}`);
  return a;
}

/**
 * Read one 350 byte patch message.
 * Throws on anything structural: a wrong length, a header that is not
 * Novation's, a command byte the reference does not define, a missing end of
 * sysex. A data byte above 0x7F is REPORTED rather than thrown, because the
 * page's job is to say what is in a file including that it is wrong.
 * @param {Uint8Array|ArrayBuffer} buf
 */
export function readPatch(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (u8.length !== PATCH_BYTES) {
    throw new Error(`a patch is ${PATCH_BYTES} bytes and this is ${u8.length}`);
  }
  for (let i = 0; i < SYSEX_HEAD.length; i++) {
    if (u8[i] !== SYSEX_HEAD[i]) {
      throw new Error(`byte ${i} is ${hex(u8[i])} and a Circuit patch has ${hex(SYSEX_HEAD[i])}`);
    }
  }
  if (u8[PATCH_BYTES - 1] !== 0xf7) {
    throw new Error(`the last byte is ${hex(u8[PATCH_BYTES - 1])} and end of sysex is F7`);
  }
  const command = u8[6];
  const spec = COMMANDS[command];
  if (!spec) throw new Error(`byte 6 is ${hex(command)} and no Circuit command is that`);
  return {
    ...readPatchData(u8.slice(DATA_AT, DATA_AT + PATCH_DATA)),
    bytes: u8,
    command,
    commandName: spec.name,
    // 🔴 The one fact worth reading before anything else about a `.syx`.
    writesFlash: spec.flash,
    slot: u8[7],
    slotName: spec.slot === 'patch' ? `patch ${u8[7]}` : `synth ${u8[7] + 1}`,
    reserved: u8[8],
  };
}

/**
 * The 340 address payload on its own, with no message wrapped round it.
 *
 * 🔴 THIS EXISTS BECAUSE A SESSION CARRIES TWO PATCHES AND THEY ARE NOT
 * MESSAGES. `demo/shell/circuit-session.mjs` finds them at offsets 47,300 and
 * 47,640 of a `.circuitsession`, as bare 340 byte payloads, and MEASURED, 10 of
 * 64 are byte identical to a `patch_*.syx` payload in the same pack. Before
 * this, the only way to decode one was to build a SysEx frame around it, and
 * **building a message is the first half of sending one**, so that function
 * deliberately does not exist anywhere in this repository.
 * ⚠️ IT READS, IT DOES NOT MAKE. Everything `summarise`, `patchFields` and
 * `modSlots` need is `data`, so they all work on a payload unchanged.
 * ⚠️ AND THE MESSAGE FIELDS ARE NOT GUESSED, THEY ARE REPORTED ABSENT. A
 * payload has no command byte and no destination, so `commandName` is empty and
 * `writesFlash` is false because a payload cannot write anything: it is not a
 * message. That is different from a message that happens to be safe.
 */
export function readPatchData(buf) {
  const data = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (data.length !== PATCH_DATA) {
    throw new Error(`a patch payload is ${PATCH_DATA} bytes and this is ${data.length}`);
  }
  let highBytes = 0;
  for (const b of data) if (b > 0x7f) highBytes++;
  const rawName = String.fromCharCode(...data.subarray(0, NAME_LEN));
  const at = (a) => data[a];
  const value = (name) => data[addressOf(name)];
  return {
    data,
    command: null,
    commandName: '',
    writesFlash: false,
    slot: null,
    slotName: '',
    rawName,
    name: rawName.replace(/\0/g, ' ').trimEnd(),
    category: at(addressOf('Patch_Category')),
    genre: at(addressOf('Patch_Genre')),
    highBytes,
    at,
    value,
  };
}

/** The derived word for a category byte, or `''` when nobody here knows. */
export function categoryName(n) {
  // ⚠️ LOWERCASED, because every other word this module returns is a value read
  // off a table and reads in running prose.  is a category the instrument
  // offers and is not the same as "we do not know", which is still .
  return CATEGORIES[n] ? CATEGORIES[n].toLowerCase() : '';
}

/** A named value from a table, or the bare number when it is out of range. */
function label(table, v) {
  return table[v] === undefined ? String(v) : table[v];
}

/**
 * All 340 addresses decoded, for a detail panel.
 * `changed` is against the document's default, which is what separates a
 * parameter somebody moved from one nobody touched.
 */
export function patchFields(patch) {
  return ADDRESSES.map((row) => {
    const v = patch.data[row.a];
    return {
      a: row.a,
      p: row.p,
      v,
      d: row.d,
      changed: v !== row.d,
      bits: row.bits ? row.bits.map(([n, at, w]) => ({ n, v: (v >> at) & ((1 << w) - 1) })) : null,
      label: named(row.p, v),
    };
  });
}

/**
 * The word for a value where a table exists for it, otherwise ''.
 * ⚠️ KEYED ON THE PARAMETER NAME, NEVER ON THE VALUE'S RANGE. Two parameters
 * with the same 0..29 range can mean different things, which is the trap
 * `circuit-cc.mjs` already records about controller numbers on two channels.
 */
export function named(p, v) {
  if (p === 'Voice_PolyphonyMode') return label(POLYPHONY, v);
  if (p === 'Osc1_Wave' || p === 'Osc2_Wave') return label(OSC_WAVES, v);
  if (p === 'Filter_Type') return label(FILTER_TYPES, v);
  if (p === 'Filter_DriveType') return label(DRIVE_TYPES, v);
  if (p === 'Distortion_Type') return label(DISTORTION_TYPES, v);
  if (p === 'LFO1_Waveform' || p === 'LFO2_Waveform') return label(LFO_WAVES, v);
  if (p === 'Patch_Category') return categoryName(v);
  if (/^MacroKnob\d+_Destination[A-D]$/.test(p)) return label(MACRO_DESTINATIONS, v);
  if (/^ModMatrix\d+_Source[12]$/.test(p)) return label(MOD_SOURCES, v);
  if (/^ModMatrix\d+_Destination$/.test(p)) return label(MOD_DESTINATIONS, v);
  return '';
}

/** The 20 mod matrix slots. A slot at zero depth reaches nothing. */
export function modSlots(patch) {
  const base = addressOf('ModMatrix1_Source1');
  const out = [];
  for (let n = 1; n <= MOD_SLOTS; n++) {
    const at = base + (n - 1) * 4;
    const depth = patch.data[at + 2];
    out.push({
      n,
      source1: patch.data[at],
      source2: patch.data[at + 1],
      depth,
      destination: patch.data[at + 3],
      used: depth !== ZERO_DEPTH,
    });
  }
  return out;
}

/** The 32 macro legs, four per knob. */
export function macroLegs(patch) {
  const out = [];
  for (let k = 1; k <= MACRO_KNOBS; k++) {
    for (const leg of ['A', 'B', 'C', 'D']) {
      const depth = patch.value(`MacroKnob${k}_Depth${leg}`);
      out.push({
        knob: k,
        leg,
        destination: patch.value(`MacroKnob${k}_Destination${leg}`),
        start: patch.value(`MacroKnob${k}_StartPos${leg}`),
        end: patch.value(`MacroKnob${k}_EndPos${leg}`),
        depth,
        used: depth !== ZERO_DEPTH,
      });
    }
  }
  return out;
}

/**
 * The one row a table shows for a patch.
 * ⚠️ `lfo` IS A FLOOR AND NOT A TOTAL, and the reason is published rather than
 * hidden: it counts an LFO that reaches something through a mod matrix slot,
 * and 📄 the reference gives macro destinations a range of 0..70 with NO table,
 * so an LFO routed only through a macro knob is invisible here. That is
 * `research/circuit-soundbank-2026-09-21.md` §4.4's own caveat about its
 * 126 of 128.
 */
export function summarise(patch) {
  const slots = modSlots(patch).filter((s) => s.used);
  const reaches = (which) =>
    slots.some((s) => which.includes(s.source1) || which.includes(s.source2));
  const one = reaches(LFO1_SOURCES);
  const two = reaches(LFO2_SOURCES);
  return {
    name: patch.name,
    category: patch.category,
    categoryLabel: categoryName(patch.category),
    genre: patch.genre,
    poly: label(POLYPHONY, patch.value('Voice_PolyphonyMode')),
    osc1: label(OSC_WAVES, patch.value('Osc1_Wave')),
    osc2: label(OSC_WAVES, patch.value('Osc2_Wave')),
    osc2Silent: patch.value('Mixer_Osc2Level') === 0,
    filter: label(FILTER_TYPES, patch.value('Filter_Type')),
    drive: patch.value('Filter_Drive') > 0,
    chorus: patch.value('Chorus_Level') > 0,
    distortion: patch.value('Distortion_Level') > 0,
    attack: patch.value('Envelope1_Attack'),
    release: patch.value('Envelope1_Release'),
    lfo: one && two ? 'both' : one ? 'lfo 1' : two ? 'lfo 2' : 'none',
    mods: slots.length,
  };
}

// ---------------------------------------------------------------------------
// The four numbers that tell a backup from a blank.
//
// 🔴 THIS IS THE FEATURE THAT EARNS THE PAGE AND IT IS A SAFETY CHECK.
// There are three packs on this machine that all display as `*New Pack` in
// Novation Components: the owner's own backup, and two purchased ones whose 32
// sessions are blanks. MEASURED HERE 2026-09-21, both sides, from the files:
//
//   owner's `New Pack.circuitpack`   32 distinct fingerprints of 32
//                                    entropy 0.827 to 1.462 bits a byte
//                                    84.57 to 89.58 per cent non-zero
//   the two purchased packs          1 distinct fingerprint of 32, each
//                                    entropy 0.009, flat
//                                    0.07 per cent non-zero
//
// The vendor's install note says to press `Send to Circuit`, which is one of the
// three operations that replace the instrument's contents on a box with no
// factory reset.
//
// 🔴 AND THE FIRST FOUR BYTES ARE NOT THE FOURTH DISCRIMINATOR. THEY WERE
// PUBLISHED AS ONE AND THE PACK DISAGREES. `CLAUDE.md`, `plans/plan-pack-page.md`
// §2.1 and `research/circuit-soundbank-2026-09-21.md` all said `INIT` against the
// owner's `DEMO`. The owner's 32 sessions are **`USER` 22, `DEMO` 7 and `INIT`
// 3**, so three of somebody's real sessions carry the exact head published as the
// blank signature, and all three are ordinary work: entropy 0.87, 86.5 per cent
// non-zero, 2,016 payload bytes, distinct fingerprints. **A head of `INIT` would
// have condemned three real sessions.** The other three numbers separate the two
// packs by two orders of magnitude and are what the check rests on. `head` is
// still reported, because it is a fact about the file and a reader should see
// that it is the same on both sides.
// ⚠️ A NAME IS NOT EVIDENCE, and this project got that wrong about these very
// sessions once: the ones still called `User Session` were implied to be blanks
// and measurement said 32 distinct of 32 with none empty. The head is the same
// mistake one layer down, in a field that looks like content.
//
// ⚠️ AND ASK WHAT THE DENOMINATOR IS, which is why two size readings are here
// rather than one. A session file is four fifths `0xFF` erasure, and a statistic
// over the whole artefact measures the erasure: 44,071 high bytes of 53,248 was
// published here as *not seven bit* when the real payload was 9,180 bytes of
// which two were above 0x7F. `notErased` is that published reading, the bytes
// that are not `0xFF`; `payload` is the stricter one, the bytes that are neither
// `0xFF` nor `0x00`. MEASURED on session_0: 9,179 and 2,238.

/**
 * @param {Uint8Array|ArrayBuffer} buf one session file
 * @returns {Promise<{bytes:number, entropy:number, nonZero:number,
 *                    notErased:number, payload:number, head:string,
 *                    fingerprint:string}>}
 */
export async function sessionStats(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const hist = new Uint32Array(256);
  for (const b of u8) hist[b]++;
  let entropy = 0;
  for (const n of hist) {
    if (!n) continue;
    const p = n / u8.length;
    entropy -= p * Math.log2(p);
  }
  const zero = hist[0x00];
  const erased = hist[0xff];
  const head = String.fromCharCode(...u8.subarray(0, 4)).replace(/[^\x20-\x7e]/g, '.');
  return {
    bytes: u8.length,
    entropy,
    nonZero: u8.length ? (u8.length - zero) / u8.length : 0,
    // Not `FF`: the published reading of how much of the file is not erasure.
    notErased: u8.length - erased,
    // Neither `00` nor `FF`: what is left after the erasure and the padding.
    payload: u8.length - zero - erased,
    head,
    fingerprint: await sha256(u8),
  };
}

async function sha256(u8) {
  const src = u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength
    ? u8.buffer
    : u8.slice().buffer;
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', src));
  let s = '';
  for (const b of d) s += b.toString(16).padStart(2, '0');
  return s;
}

function hex(b) {
  return b === undefined ? '??' : b.toString(16).toUpperCase().padStart(2, '0');
}

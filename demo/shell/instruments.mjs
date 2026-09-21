// demo/shell/instruments.mjs — what the things on this desk are actually called.
//
//   node demo/shell/instruments-test.mjs
//
// 🔴 WHY THIS EXISTS, AND IT IS A MEASURED FAILURE RATHER THAN TIDINESS. Asked
// 2026-09-21 after `/wish/` was told *"connect evolution to circuit"* and
// answered *the model proposed nothing, which is the right answer to an
// instruction that names nothing on this desk*. THE MODEL WAS RIGHT. CoreMIDI
// calls that port `MK-425C USB MIDI Keyboard`, and the instrument is an
// **Evolution** MK-425C: the maker's name is printed on the box, on the rear
// lip and in every sentence a person says about it, and it was in NONE of the
// strings anything here was given. Asked for as *"can you not enrich the names
// with brands etc"*, *"also keyboard drum machine mixer soundcard"*, and
// *"have a taxononomy"*.
//
// 🔴 A PORT NAME IS WHAT AN OPERATING SYSTEM CALLS A CABLE. It is not what the
// object is called, it is not what its maker is, and it does not say what kind
// of thing it is. Three different facts, none of them in the string, and every
// page here had been guessing at all three separately: `/bay/` stripped a
// trailing direction word, `/wish/` carried a hand-written `sub` per diagram
// box, and `/circuit/`, `/model/` and `/evo/` each typed their own nameplate.
//
// ⚠️ IT IS DATA, NEVER A DERIVATION. No regular expression turns `MK-425C` into
// `Evolution`: that happens to be right here and would be wrong on the next
// device. A maker is a fact somebody knows, so it is written down, and a port
// nothing recognises gets NO invented brand. That is the same rule that makes
// the patch bay's port list an `enum` rather than a suggestion: a Moog and a
// Prophet which are not on the desk came back as no links in 496 ms rather
// than as an invention.
//
// ⚠️ AND THE RAW NAME IS NEVER THROWN AWAY. It is the only thing that ties a
// row back to the cable, it is what a reader needs when two devices are named
// alike, and `/bay/` already prints it on a row whenever it differs from the
// label. Enriching a name must not lose it.

/** What kind of thing it is, in a word a visitor would use. */
export const KINDS = ['keyboard', 'synth', 'drum machine', 'mixer', 'soundcard', 'bus'];

/**
 * 🔴 THE DESK, WRITTEN DOWN. Every entry is a thing somebody can point at,
 * except the last, which is the one that is not.
 *
 * `match`  what the operating system is likely to call its port.
 * `maker`  the brand on the box.
 * `model`  what the maker calls it.
 * `kind`   one of `KINDS`, the primary one.
 * `also`   other words a person might reach for, in order of likelihood.
 * `plays`  false for a thing nobody presses a key on. See `/bay/`.
 * `note`   one sentence, for a hover or a prompt, never furniture.
 */
export const DESK = [
  {
    match: /mk-?4\d\dc|evolution/i,
    maker: 'Evolution', model: 'MK-425C', kind: 'keyboard',
    also: ['controller', 'midi keyboard'],
    /* MEASURED on this unit and recorded in `research/evo-mk425c-face-2026-09-21.md`:
       25 keys, notes 47 to 71 where a 25 key controller sits at 48 to 72, and a
       global channel of 2. It has no sound engine, which is why `/bay/` gives
       its input an empty `accepts` list. */
    note: 'a 25 key controller with no sound engine of its own',
  },
  {
    match: /^\s*circuit\s*$/i,
    maker: 'Novation', model: 'Circuit', kind: 'synth',
    /* Both words are true and both get used about it, so both are offered. */
    also: ['drum machine', 'groovebox'],
    note: 'two synth voices and four drum parts, and it has no factory reset',
  },
  {
    match: /circuit\s*tracks/i,
    maker: 'Novation', model: 'Circuit Tracks', kind: 'synth',
    also: ['drum machine', 'groovebox'],
    /* Not on this desk. It is here because a purchased soundbank ships patches
       for it, and its patch header differs from the Circuit's at exactly one
       byte: offset 5 is 0x60 for the Circuit and 0x64 for the Tracks. Anything
       that names it should be able to say it is the wrong instrument. */
    note: 'a different and later instrument, not the one on this desk',
  },
  /**
   * 🔴 THE DAW CONTROL PORT IS ITS OWN ENTRY AND IT MUST COME FIRST, BECAUSE
   * `find` STOPS AT THE FIRST MATCH. MEASURED in a real browser the minute the
   * taxonomy landed: the Model 12 offers `Model 12 MIDI IN/OUT` **and**
   * `Model 12 DAW Control IN/OUT`, and enriching both to `TASCAM Model 12` gave
   * `/bay/` two rows with the same name and nothing to tell them apart. The
   * enrichment had made the desk LESS legible, which is the opposite of the
   * point.
   * ⚠️ AND THEY REALLY ARE TWO DIFFERENT THINGS, so this is not a label patch.
   * The MIDI pair carries notes and controllers; the DAW Control pair speaks
   * Mackie Control, which is a mixer protocol, and `/model/` records that it
   * sends nothing at all unless DAW control mode is switched on at the desk.
   */
  {
    match: /model\s*12.*daw|daw.*model\s*12/i,
    maker: 'TASCAM', model: 'Model 12 DAW control', kind: 'mixer',
    also: ['Model 12', 'desk', 'mackie control'],
    note: 'the mixer control surface, which sends nothing unless DAW mode is on',
  },
  {
    match: /model\s*12/i,
    maker: 'TASCAM', model: 'Model 12', kind: 'mixer',
    also: ['desk', 'audio interface'],
    note: 'twelve channels, and its DAW control has to be switched on to send anything',
  },
  {
    match: /fast\s*track/i,
    maker: 'M-Audio', model: 'Fast Track Pro', kind: 'soundcard',
    also: ['audio interface', 'converter'],
    /* MEASURED in `research/fasttrack-capture-2026-09-21.md`: the Circuit's
       left output is on capture channel 1 at 48 kHz 16 bit. */
    note: 'two in and two out, and it carries the Circuit into a recording',
  },
  {
    match: /\biac\b|loopback|virtual/i,
    maker: 'Apple', model: 'IAC Driver', kind: 'bus',
    also: ['loopback', 'virtual bus'],
    /* 🔴 `plays: false` IS A BEHAVIOUR AND NOT A LABEL. `/bay/` links two
       instruments by having them PLAYED, and a loopback returns everything sent
       to it, so within a minute of MIDI first flowing it echoed a panic and the
       bay linked a keyboard to the bus. It keeps its row, because a port that
       vanished says it does not exist, and routing to the IAC bus is how you
       reach another application on this machine. It is pressed, never played. */
    plays: false,
    note: 'a virtual bus for reaching another application on this machine',
  },
];

/** A trailing direction word an operating system adds to one end of a cable. */
const DIR = /[\s_-]+(in|out|input|output)$/i;

/**
 * What is this, as far as anybody here knows?
 *
 * ⚠️ A NAME NOTHING RECOGNISES IS ANSWERED HONESTLY RATHER THAN GUESSED. There
 * is no maker, no kind and no invented brand: the raw name comes back as the
 * label with its direction word trimmed, which is what `/bay/` already did, and
 * `known` is false so a caller can say so.
 *
 * @param {string} raw the port name the operating system gave
 * @returns {{raw:string, label:string, full:string, maker:string|null,
 *            model:string|null, kind:string|null, words:string[],
 *            plays:boolean, note:string, known:boolean}}
 */
export function describe(raw) {
  const s = String(raw ?? '').trim();
  const bare = s.replace(DIR, '').trim() || s || 'unnamed';
  const hit = DESK.find((d) => d.match.test(s));
  if (!hit) {
    return { raw: s, label: bare, full: bare, maker: null, model: null, kind: null,
      words: [bare], plays: true, note: '', known: false };
  }
  const full = `${hit.maker} ${hit.model}`;
  /**
   * 🔴 EVERY WORD A PERSON MIGHT SAY, MOST SPECIFIC FIRST, AND DEDUPLICATED.
   * This is what makes *"connect evolution to circuit"* work: the list holds
   * `Evolution MK-425C`, `Evolution`, `MK-425C`, `keyboard`, `controller`, and
   * the raw port name as well, because somebody reading the row may type what
   * they see. Order matters where a caller truncates.
   */
  const words = [...new Set([full, hit.maker, hit.model, hit.kind, ...(hit.also || []), bare])]
    .filter(Boolean);
  return { raw: s, label: full, full, maker: hit.maker, model: hit.model, kind: hit.kind,
    words, plays: hit.plays !== false, note: hit.note || '', known: true };
}

/** One line for a model's prompt, or nothing when there is nothing to add. */
export function alias(raw) {
  const d = describe(raw);
  if (!d.known) return '';
  const rest = d.words.filter((w) => w.toLowerCase() !== d.full.toLowerCase());
  return rest.length ? `also called: ${rest.join(', ')}` : '';
}

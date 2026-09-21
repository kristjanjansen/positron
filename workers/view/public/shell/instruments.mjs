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
// box, and `/circuit/`, `/twelve/` and `/evo/` each typed their own nameplate.
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
    /* 🔴 `present: false` AND IT IS NOT DECORATION. It is here because a
       purchased soundbank ships patches for it, and its patch header differs
       from the Circuit's at exactly one byte: offset 5 is 0x60 for the Circuit
       and 0x64 for the Tracks, so anything naming it should be able to say it
       is the wrong instrument. But it is NOT PLUGGED IN, and `resolve()` skips
       it, because every alias it shares with the Circuit (`Novation`, `drum
       machine`, `groovebox`) made it a second hit on every sentence that named
       the Circuit. An instrument nobody can patch must not be offered as one. */
    present: false,
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
   * Mackie Control, which is a mixer protocol, and `/twelve/` records that it
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
    /* 🔴 `Fast Track` IS IN THIS LIST ON EVIDENCE AND IT IS A FACT RATHER THAN A
       CONVENIENCE. MEASURED 2026-09-21: the word `Pro` is the one a speech model
       drops or replaces. *"fast track"* came back as itself from two models and
       as *"Fast-trap"* from the third, and *"the fast track pro is the recording
       input"* came back as *"The fast track row is the recording input."* Four
       misses across three models, all of them the same syllable. `Fast Track` is
       also what M-Audio calls the line, and there is exactly one of them on this
       desk, so somebody saying it means this box. */
    also: ['Fast Track', 'audio interface', 'converter'],
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

// ── hearing a name wrong ───────────────────────────────────────────────────
//
// 🔴 A SPEECH MODEL HEARS `tascam` AS `task am`, AND NOTHING DOWNSTREAM CAN
// RECOVER FROM THAT. Asked 2026-09-21: *"can you patch wish thinkg or
// transcding with simular-sounding lookups"*.
//
// 🔴 THE TRANSCRIPTION IS THE RIGHT STAGE AND THE THINKING IS THE WRONG ONE,
// which is worth stating because the ask offered both. The language model's
// `from` and `to` are an `enum` of REAL PORT IDS, so it physically cannot
// return a fuzzy name: handed a sentence naming nothing it recognises, it
// returns an empty list, which is what it did. MEASURED earlier: two synths
// that are not on this desk came back as no links in 496 ms rather than as an
// invention, and that is the schema working. So there is nothing to repair
// downstream; the repair belongs where the words are still words.
//
// ⚠️ AND IT SHOWS ITS WORK, WHICH IS NOT OPTIONAL HERE. Rewriting what somebody
// SAID is a larger liberty than repairing a model's key name, and that one is
// already printed in words. The transcript is an editable box, so a correction
// must be visible in it and reported beside it, or the page is putting words in
// a person's mouth.

/** Digits said out loud. Enough for a model number, not a general parser. */
const SPOKEN = { zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12',
  twenty: '2', thirty: '3', forty: '4', fifty: '5' };

/**
 * Down to the letters and digits that carry meaning.
 * ⚠️ `four twenty five` BECOMES `425` RATHER THAN `4205`, because a spoken model
 * number is a run of digits and not arithmetic. That is a deliberate narrowing:
 * this is for `MK-425C`, never for a quantity.
 */
export function normalise(s) {
  return tokenise(s).map((t) => t.word).join(' ');
}

/**
 * The same words `normalise()` produces, each one still knowing where in the
 * raw string it came from.
 *
 * 🔴 IT EXISTS BECAUSE A CORRECTION HAS TO LAND IN THE BOX A PERSON READS, AND
 * `normalise()` THROWS AWAY EVERYTHING NEEDED TO PUT IT THERE. `resolve()`
 * matches against lowercased, punctuation-free, digit-joined words; the
 * transcript on `/wish/` is a textarea holding what the speech model actually
 * returned, capital letters, full stops and all. Without an offset there is no
 * way back from *"the span `groove a box` matched"* to *"characters 8 to 20 of
 * what you are looking at"*, and a page that cannot say WHERE it changed
 * something is a page that changed it silently.
 *
 * ⚠️ **IT MUST PRODUCE EXACTLY WHAT `normalise()` PRODUCED, WHICH IS WHY
 * `normalise()` IS NOW WRITTEN IN TERMS OF IT RATHER THAN BESIDE IT.** Two
 * functions doing one string transform is this repository's most repeated
 * defect: `bay.mjs` derived one port list twice and the two could disagree with
 * nothing to catch it. One implementation cannot drift from itself.
 *
 * ⚠️ A JOINED DIGIT RUN KEEPS THE WHOLE SPAN. `four twenty five` is three words
 * in the raw text and one token here, so its range runs from the `f` to the
 * last `e`, separators included. That is what has to be replaced to replace the
 * number.
 *
 * @param {string} s
 * @returns {{word:string, at:number, to:number}[]} `at` and `to` index the RAW
 *   string, so `s.slice(at, to)` is the words as they were said.
 */
export function tokenise(s) {
  const raw = String(s ?? '');
  const out = [];
  for (const m of raw.matchAll(/[a-z0-9]+/gi)) {
    const w = m[0].toLowerCase();
    const word = SPOKEN[w] ?? w;
    const prev = out[out.length - 1];
    /* The digit join, which `normalise()` used to do with a lookbehind over the
       whole string. Same rule, one token at a time: a run of digits said out
       loud is one number. */
    if (prev && /^\d+$/.test(prev.word) && /^\d+$/.test(word)) {
      prev.word += word;
      prev.to = m.index + m[0].length;
      continue;
    }
    out.push({ word, at: m.index, to: m.index + m[0].length });
  }
  return out;
}

/**
 * A crude sound of a word, and crude is the point.
 *
 * ⚠️ NOT SOUNDEX AND NOT METAPHONE. Both are built for surnames and both keep
 * the first letter, which is the letter a speech model is most likely to get
 * wrong at a word boundary: `tascam` arrives as `task am` and `has come`. This
 * drops vowels after the first character, folds the consonants that a
 * microphone confuses, and collapses runs, which is enough to bring those three
 * together and little enough to explain in one comment.
 * 🔴 IT IS DELIBERATELY WEAK, because the cost of a false match here is putting
 * a word in somebody's mouth. Strength comes from the THRESHOLD below, never
 * from a cleverer key.
 */
export function sounds(s) {
  return normalise(s)
    .replace(/[^a-z0-9]/g, '')
    .replace(/[sz]/g, 's').replace(/[ckq]/g, 'k').replace(/[dt]/g, 't')
    .replace(/[bpv]/g, 'p').replace(/[fw]/g, 'f').replace(/[gj]/g, 'j')
    .replace(/(?!^)[aeiouyh]/g, '')
    .replace(/(.)\1+/g, '$1');
}

/** Damerau-Levenshtein, iterative, because a transposition is the commonest slip. */
function dist(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let prev2 = [], prev = [...Array(n + 1).keys()], cur;
  for (let i = 1; i <= m; i++) {
    cur = [i];
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
      }
    }
    prev2 = prev; prev = cur;
  }
  return prev[n];
}

/**
 * 🔴 THE THRESHOLD IS WHERE ALL THE SAFETY LIVES, AND IT IS PER LENGTH. One
 * edit in a three letter key is a different claim from one edit in ten. A flat
 * distance matches `bass` to `bus`; a flat ratio matches nothing short at all.
 * ⚠️ AND A KEY UNDER FOUR CHARACTERS IS NEVER MATCHED BY SOUND. `bus`, `desk`
 * and `pad` are ordinary English that appears in ordinary instructions, and the
 * whole failure mode being guarded against is a page hearing an instrument in a
 * sentence that did not name one.
 * 🔴 AND THE FLOOR APPLIES TO WHAT WAS SAID AS WELL AS TO THE KEY, WHICH IT DID
 * NOT UNTIL 2026-09-21 AND WHICH COST FOUR OF THE THIRTEEN FALSE POSITIVES
 * MEASURED AGAINST REAL WHISPER TRANSCRIPTS. `card` and `chord` both reduce to
 * `krt`, three characters, which is one edit from `kprt` (**keyboard**) and one
 * from `krkt` (**Novation Circuit**). So *"The sound card is on channel 1."*
 * found the keyboard and the Circuit, and *"Play a chord and hold it down."*,
 * which names nothing at all, found both of them too. The key was already
 * floored and the span was not, and a three character key is too little
 * information for one edit to mean anything whichever side of the comparison it
 * sits on. `research/name-lookups-2026-09-21.md` has all thirteen.
 */
const MIN_SOUND_LEN = 4;
const allowed = (len) => (len <= 5 ? 1 : len <= 9 ? 1 : 2);

/**
 * 🔴 THE WORDS AN INSTRUCTION IS MADE OF, AND THIS LIST IS THE REASON THE
 * MATCHER IS SAFE AT ALL. MEASURED, and every one of these was a real false
 * match from the first build: `connect` matched **Novation Circuit** at one
 * edit, because `circuit` reduces to `krkt` and `connect` to `knkt`; `machine
 * from` matched the Model 12's DAW control; and `keyboard` matched the
 * **M-Audio Fast Track Pro**. Reported from the other side in the same minute:
 * *"circuit gets mistaken for secury"*.
 * ⚠️ A CLEVERER PHONETIC KEY CANNOT FIX THIS AND MAKES IT WORSE. `connect` and
 * `circuit` genuinely do sound alike by any reduction that folds `k` and `c`,
 * and they share a first letter, so no threshold separates them. What separates
 * them is that ONE OF THEM IS A VERB. The sentences this page hears are
 * instructions, their verbs and prepositions are a small closed set, and none
 * of them is ever an instrument.
 * 🔴 AND A SPAN CONTAINING ONE IS REFUSED WHOLE, not just a token equal to one,
 * because the window slides: `machine from` is two tokens and only the second
 * is a verb.
 * 🔴 `control` JOINED THE LIST ON EVIDENCE, 2026-09-21, AND IT IS NOT A VERB.
 * It was the last false positive standing against real Whisper transcripts and
 * it stood on all three models: *"the tascam model twelve daw control does
 * nothing at all"* found the **Evolution MK-425C**, because `control` reduces to
 * `kntrl` and the keyboard's own alias `controller` reduces to `kntrlr`, one
 * edit apart. So a sentence about the mixer's control surface named the
 * keyboard. ⚠️ THE WORD IS IN THE DESK'S OWN VOCABULARY TWICE, which is what
 * makes it dangerous rather than merely common: it is the tail of one
 * instrument's name and the head of another's alias. Stopping it costs nothing,
 * because `controller` said properly is found by the EXACT branch, which never
 * consults this list.
 * ⚠️ The cost of a false NEGATIVE is that the model answers *nothing on this
 * desk*, which is honest and which a person fixes by editing one word in a box.
 * The cost of a false POSITIVE is a page putting words in somebody's mouth and
 * routing an instrument they never named. They are not the same size.
 */
const STOP = new Set(['connect', 'connects', 'connected', 'route', 'routes', 'send', 'sends',
  'play', 'plays', 'played', 'put', 'puts', 'make', 'makes', 'made', 'take', 'takes',
  'set', 'sets', 'add', 'adds', 'remove', 'removes', 'move', 'moves', 'turn', 'turns',
  'from', 'into', 'onto', 'with', 'and', 'the', 'a', 'an', 'to', 'on', 'off', 'up',
  'down', 'all', 'every', 'please', 'can', 'you', 'it', 'its', 'my', 'this', 'that',
  'then', 'now', 'also', 'again', 'but', 'for', 'of', 'in', 'out', 'at', 'by', 'as',
  'so', 'if', 'do', 'does', 'is', 'are', 'be', 'let', 'want', 'need', 'give',
  /* 🔴 ALL FOUR INFLECTIONS, BECAUSE TWO OF THEM WERE NOT ENOUGH AND A SWEEP
     SAID SO. `control` and `controls` went in first, and *"a controlled
     sound"* still found the keyboard. That is this project's substring lesson
     from the other end: a list of forms is as wrong as a substring test until
     somebody enumerates it. */
  'control', 'controls', 'controlled', 'controlling',
  /* 🔴 `bus` IS HERE FOR THE EXACT BRANCH, NOT FOR THE SOUND ONE, AND IT IS
     THE ONLY WORD ON THIS LIST THAT IS ALSO A REAL ALIAS ON THE DESK. The
     `sounds()` floor already refused it (`ps`, two characters), so no
     mis-hearing could ever reach the IAC Driver through it. An exact hearing
     could and did: **`the master bus`** and **`a bus compressor`** both
     resolved to the **Apple IAC Driver**, and both are ordinary mixing, not
     MIDI. `virtual bus` and `loopback` still reach it, and so does `Apple`. */
  'bus']);

const hasStop = (span) => span.split(' ').some((t) => STOP.has(t));

/**
 * Which instruments does this sentence name, including badly?
 *
 * ⚠️ **A HIT CARRIES WHERE IT WAS FOUND, `at` AND `to`, AND THEY INDEX THE RAW
 * STRING RATHER THAN THE NORMALISED ONE.** `text.slice(at, to)` is the words as
 * the speech model wrote them, which is what a reader is looking at and the
 * only thing a correction can replace. `said` is still the normalised span, so
 * every assert written before this stands.
 *
 * @param {string} text what was heard
 * @returns {{said:string, word:string, full:string, kind:string|null,
 *            how:'exact'|'sound', at:number, to:number, i:number, n:number,
 *            entry:object}[]} one hit per instrument,
 *   best first, never two hits for one instrument.
 */
export function resolve(text) {
  const raw = String(text ?? '');
  const tok = tokenise(raw);
  const tokens = tok.map((t) => t.word);
  const best = new Map();                 // full name -> hit

  const offer = (entry, word, said, how, cost, i, n) => {
    const key = `${entry.maker} ${entry.model}`;
    const prev = best.get(key);
    if (prev && (prev.how === 'exact' || prev.cost <= cost)) return;
    best.set(key, { said, word, full: key, kind: entry.kind, how, cost,
      i, n, at: tok[i].at, to: tok[i + n - 1].to, entry });
  };

  /**
   * Where a whole alias sits in the sentence, as a token index, or -1.
   * 🔴 IT REPLACES FOUR STRING TESTS THAT SAID THE SAME THING AND COULD NOT SAY
   * WHERE. `flat === w || flat.includes(' w ') || flat.startsWith('w ') ||
   * flat.endsWith(' w')` is exactly *"w appears as a whole run of tokens"*, and
   * a token scan answers the same question while knowing the index. Measured
   * identical over the whole corpus rather than argued.
   */
  const findWhole = (w) => {
    const want = w.split(' ');
    for (let i = 0; i + want.length <= tokens.length; i++) {
      let hit = true;
      for (let j = 0; j < want.length; j++) if (tokens[i + j] !== want[j]) { hit = false; break; }
      if (hit) return i;
    }
    return -1;
  };

  for (const entry of DESK) {
    if (entry.present === false) continue;
    const words = [...new Set([`${entry.maker} ${entry.model}`, entry.maker, entry.model,
      entry.kind, ...(entry.also || [])])].filter(Boolean);
    for (const word of words) {
      const w = normalise(word);
      if (!w) continue;
      /* 🔴 AN ALIAS THAT IS ONE STOP WORD NAMES NOTHING ON EITHER BRANCH, AND
         UNTIL 2026-09-21 THE STOP LIST GOVERNED ONLY THE SOUND ONE. MEASURED
         over ordinary studio vocabulary: `the master bus` and `a bus
         compressor` both resolved to the **Apple IAC Driver** at exact
         strength, where no threshold and no phonetic key can reach them. The
         test is the WHOLE alias rather than a token inside it, so `virtual
         bus` and `mackie control` are untouched and only the bare word goes. */
      if (!w.includes(' ') && STOP.has(w)) continue;
      /* Exact first and it wins outright: a sentence that named the thing
         properly must never be "corrected" to something else. */
      const whole = findWhole(w);
      if (whole >= 0) { offer(entry, word, w, 'exact', 0, whole, w.split(' ').length); continue; }

      const wk = sounds(word);
      if (wk.length < MIN_SOUND_LEN) continue;
      const span = w.split(' ').length;
      /* 🔴 THE WINDOW IS NOT THE KEY'S OWN WIDTH, AND WRITING IT AS `span` AND
         `span + 1` LOST TWO REAL INSTRUMENTS. MEASURED 2026-09-21 against real
         Whisper transcripts: a speech model JOINS tokens and SPLITS them, in
         both directions and by more than one.
         - `m k four twenty five c`, six spoken tokens, came back as **`MK425C`**,
           one token, from all three models. The key `mk 425 c` is three, so no
           window of three or four could ever contain it and the keyboard was
           missed on every model.
         - `groovebox`, one token, came back as **`groove a box`**, three. The
           key is one, so the same arithmetic missed it from the other side.
         So the range runs from one token to two past the key, and what keeps it
         safe is the three guards below rather than the width. */
      for (let n = 1; n <= span + 2; n++) {
        for (let i = 0; i + n <= tokens.length; i++) {
          const said = tokens.slice(i, i + n).join(' ');
          const sk = sounds(said);
          /**
           * 🔴 A STOP WORD VETOES A SPAN UNLESS IT PROVABLY DID NOT CONTRIBUTE
           * TO THE SOUND, AND THAT IS A TEST RATHER THAN A FEELING. Take the
           * stop words out: if the key is the SAME string, they added nothing
           * to it and cannot be what matched, so the veto has nothing to
           * protect. If the key CHANGES, they were part of it and the span goes.
           * MEASURED 2026-09-21, and the two halves are both real:
           * - *"put the groovebox through the audio interface"* came back from
           *   `@cf/openai/whisper` as **"put the groove a box through the audio
           *   interface."** The model split one word into three by inserting an
           *   article. `groove a box` and `groove box` both reduce to `jrpx`,
           *   because `sounds()` deletes a vowel anywhere but the first
           *   character, so the `a` is not in the key at all. The whole span
           *   veto was refusing a perfect match on the strength of a letter
           *   that was not being compared.
           * - *"crack the gate open"* is the negative control and it is not
           *   hypothetical: the OBVIOUS form of this repair, dropping stop
           *   words and comparing what is left, resolves it to the **Novation
           *   Circuit at distance 0**, because `crack gate` reduces to `krkt`
           *   and so does `circuit`. With the `the` left in, the span reduces
           *   to `krktkt`, which is a different string, so this test refuses it
           *   and the looser one does not.
           * ⚠️ MEASURED BOTH WAYS: this recovers one instrument across the
           * corpus and changes the answer on NONE of 132 ordinary studio
           * phrases. The looser form changes one of them, and changes it wrong.
           */
          if (hasStop(said)) {
            const kept = said.split(' ').filter((t) => !STOP.has(t)).join(' ');
            if (!kept || sounds(kept) !== sk) continue;
          }
          /* 🔴 THREE GUARDS, AND EACH ONE WAS BOUGHT BY A MEASURED FALSE MATCH.
             The first sound has to agree, because a speech model mishears a
             vowel far more readily than the consonant a word opens on. The
             lengths have to be close, or a short word matches inside a long
             key. And only then does the distance get a say. */
          if (!sk || sk.length < MIN_SOUND_LEN) continue;
          if (sk[0] !== wk[0]) continue;
          if (Math.abs(sk.length - wk.length) > 1) continue;
          const d = dist(sk, wk);
          if (d <= allowed(wk.length)) offer(entry, word, said, 'sound', d, i, n);
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => a.cost - b.cost);
}

/**
 * 🔴 WHAT A PAGE DOES WITH WHAT `resolve()` FOUND, AND THE PART THAT WAS OPEN
 * IS THE PART WHERE IT FOUND TWO THINGS.
 *
 * `HANDOFF.md` carried this as an unanswered design question: all three speech
 * models mangle `daw` four different ways, so *"the desk needs daw mode
 * switched on"* comes back naming the **TASCAM Model 12** and its **DAW control
 * surface** at once, and *"what a page does with two hits for one instruction
 * is a `/wish/` decision nobody has taken"*. Taken here, and taken as three
 * rules rather than one, because the measured corpus has three different shapes
 * in it and only one of them is really an ambiguity.
 *
 * 🔴 **1. A MORE SPECIFIC NAME BEATS A NAME INSIDE IT.** MEASURED: *"The tascam
 * model twelve daw control does nothing at all."* matches `tascam model 12 daw
 * control` over five tokens AND `tascam model 12` over three, and the second
 * span sits entirely inside the first. That is not two instruments being named,
 * it is one name containing another, and the longer one is the one somebody
 * said. A hit whose span is strictly inside another hit's span goes.
 *
 * 🔴 **2. AN INSTRUMENT THE CALLER DOES NOT HAVE IS REPORTED AND NEVER
 * SUBSTITUTED.** `DESK` describes this room; a page describes what is plugged
 * into it, and they are not the same list. MEASURED: *"Send the Novation to the
 * taskam."* names `TASCAM Model 12` and `TASCAM Model 12 DAW control` on one
 * span at the same cost, and `/wish/` has only the first, so for that page the
 * span is not ambiguous at all. Rewriting a name the caller cannot patch would
 * put a word in somebody's mouth AND still answer *nothing on this desk*, which
 * is both failures at once.
 *
 * 🔴 **3. TWO INSTRUMENTS THE CALLER REALLY HAS, ON ONE SPAN, IS NOT REPAIRED.
 * EVER.** MEASURED: `audio interface` is an alias of the TASCAM Model 12 and of
 * the M-Audio Fast Track Pro, at exact strength and distance 0, where no
 * threshold and no cleverer phonetic key can separate them. Picking one is a
 * coin toss printed as a fact. Both names are reported and the words are left
 * exactly as they were, and the person fixes it by typing one word, which is
 * the cheapest correction on the page and the reason the box is editable.
 *
 * ⚠️ **AND AN EXACT HEARING IS NEVER REWRITTEN**, which is `resolve()`'s own
 * rule arriving one layer up. A sentence that named the thing properly has
 * nothing to correct, so only `how: 'sound'` produces a replacement.
 *
 * ⚠️ **NOTHING HERE IS SILENT.** Every replacement comes back in `fixed` with
 * the words that were there before it, and the caller is expected to say so:
 * this is the same shape as `relabel()` in `workers/wish/src/wish.mjs`, which
 * repairs the one key a model always gets wrong and RETURNS the repair so the
 * page can print it. *A model proposes and a person presses* survives only if
 * the person can see what was actually said.
 *
 * @param {string} text what was heard
 * @param {{has?: (full:string) => boolean}} [opts] `has` answers whether an
 *   instrument is one the caller can actually patch. The default is that
 *   everything on `DESK` counts, which is the right answer for a caller with no
 *   opinion and the wrong one for a page with a port list.
 * @returns {{text:string, fixed:{was:string, full:string, at:number, to:number}[],
 *            unsure:{was:string, names:string[]}[],
 *            absent:{was:string, names:string[]}[], hits:object[]}}
 */
export function reword(text, opts = {}) {
  const raw = String(text ?? '');
  const has = opts.has || (() => true);
  const all = resolve(raw);

  /* Rule 1, before anything else looks at a group: a span strictly inside
     another span was never a second instrument. */
  const hits = all.filter((h) => !all.some((o) => o !== h
    && o.at <= h.at && o.to >= h.to && (o.to - o.at) > (h.to - h.at)));

  /* What is left, grouped by overlapping text. Sorted by position, because a
     group is built by walking left to right and a replacement is applied right
     to left. */
  const groups = [];
  for (const h of [...hits].sort((a, b) => a.at - b.at || a.to - b.to)) {
    const g = groups[groups.length - 1];
    if (g && h.at < g.to) { g.hits.push(h); g.to = Math.max(g.to, h.to); }
    else groups.push({ at: h.at, to: h.to, hits: [h] });
  }

  const fixed = [], unsure = [], absent = [];
  for (const g of groups) {
    const here = g.hits.filter((h) => has(h.full));
    const was = raw.slice(g.at, g.to);
    if (!here.length) { absent.push({ was, names: g.hits.map((h) => h.full) }); continue; }
    if (here.length > 1) { unsure.push({ was, names: here.map((h) => h.full) }); continue; }
    const h = here[0];
    if (h.how === 'sound') fixed.push({ was: raw.slice(h.at, h.to), full: h.full, at: h.at, to: h.to });
  }

  /* Right to left, so an earlier offset is still an offset into the string it
     was measured against. */
  let out = raw;
  for (const f of [...fixed].sort((a, b) => b.at - a.at)) {
    out = out.slice(0, f.at) + f.full + out.slice(f.to);
  }
  return { text: out, fixed, unsure, absent, hits };
}

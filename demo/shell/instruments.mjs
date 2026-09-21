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
  return String(s ?? '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((w) => SPOKEN[w] ?? w)
    .join(' ')
    .replace(/(?<=\d) (?=\d)/g, '')
    .trim();
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
  'so', 'if', 'do', 'does', 'is', 'are', 'be', 'let', 'want', 'need', 'give']);

const hasStop = (span) => span.split(' ').some((t) => STOP.has(t));

/**
 * Which instruments does this sentence name, including badly?
 *
 * @param {string} text what was heard
 * @returns {{said:string, word:string, full:string, kind:string|null,
 *            how:'exact'|'sound', entry:object}[]} one hit per instrument,
 *   best first, never two hits for one instrument.
 */
export function resolve(text) {
  const flat = normalise(text);
  const tokens = flat ? flat.split(' ') : [];
  const best = new Map();                 // full name -> hit

  const offer = (entry, word, said, how, cost) => {
    const key = `${entry.maker} ${entry.model}`;
    const prev = best.get(key);
    if (prev && (prev.how === 'exact' || prev.cost <= cost)) return;
    best.set(key, { said, word, full: key, kind: entry.kind, how, cost, entry });
  };

  for (const entry of DESK) {
    if (entry.present === false) continue;
    const words = [...new Set([`${entry.maker} ${entry.model}`, entry.maker, entry.model,
      entry.kind, ...(entry.also || [])])].filter(Boolean);
    for (const word of words) {
      const w = normalise(word);
      if (!w) continue;
      /* Exact first and it wins outright: a sentence that named the thing
         properly must never be "corrected" to something else. */
      if (flat === w || flat.includes(` ${w} `) || flat.startsWith(`${w} `)
        || flat.endsWith(` ${w}`)) { offer(entry, word, w, 'exact', 0); continue; }

      const wk = sounds(word);
      if (wk.length < MIN_SOUND_LEN) continue;
      const span = w.split(' ').length;
      /* Compared over a window of the SAME number of spoken words, because
         `task am` is two tokens where `tascam` is one and a token by token
         comparison can never bring them together. */
      for (const n of new Set([span, span + 1])) {
        for (let i = 0; i + n <= tokens.length; i++) {
          const said = tokens.slice(i, i + n).join(' ');
          if (hasStop(said)) continue;
          const sk = sounds(said);
          /* 🔴 THREE GUARDS, AND EACH ONE WAS BOUGHT BY A MEASURED FALSE MATCH.
             The first sound has to agree, because a speech model mishears a
             vowel far more readily than the consonant a word opens on. The
             lengths have to be close, or a short word matches inside a long
             key. And only then does the distance get a say. */
          if (!sk || sk[0] !== wk[0]) continue;
          if (Math.abs(sk.length - wk.length) > 1) continue;
          const d = dist(sk, wk);
          if (d <= allowed(wk.length)) offer(entry, word, said, 'sound', d);
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => a.cost - b.cost);
}

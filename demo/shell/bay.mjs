// demo/shell/bay.mjs — a patch bay: what exists, what may reach what, and the
// arithmetic that refuses the rest.
//
// 🔴 WHY THIS IS A MODULE AND NOT A PAGE. Everything here is pure. No socket,
// no Web MIDI, no DOM, no clock. So `node demo/shell/bay-test.mjs` can grade
// the validator against patches whose answers are known in advance, which is
// the one thing a validator living inside a page can never have: what a desk
// happens to be plugged into today is not a known answer.
//
// 🔴 THE DESIGN IS `plans/plan-patchbay.md` AND ITS ONE LOAD BEARING IDEA IS
// THAT A PORT DECLARES TWO DIFFERENT THINGS.
//   - `shape` is what the data IS. For audio, a rate, a channel count and a
//     frame size. For MIDI, a protocol.
//   - `accepts` is what the port CONSENTS TO, as a list of message classes.
// They are not the same question and conflating them is how a studio gets
// damaged: the Circuit's input is shaped for perfectly ordinary MIDI and must
// nevertheless never be sent SysEx, because one byte inside a SysEx message
// overwrites a patch on a device with no factory reset.
//
// 🔴 AND A SHAPE IS DECLARED, NEVER INFERRED. This repository has the scar
// already: 960 int16s is a valid 20 ms mono frame AND a valid 10 ms stereo one,
// and guessing wrong plays an octave down, which sounds like a broken
// instrument rather than a broken header. `board.mjs` solved it by making
// senders declare `audioChannels` and `frameMs` and receivers check one against
// the other. This checks the pair at CONNECT time instead of at play time.

/** What a link can carry. `clock` is its own medium: see the plan, §3.4. */
export const MEDIA = ['midi', 'audio', 'clock'];

/**
 * The classes of MIDI message a port may consent to.
 * ⚠️ `sysex` IS IN THIS LIST SO THAT IT CAN BE REFUSED BY NAME. A class nobody
 * can name is a class nobody can exclude.
 */
export const CLASSES = ['note', 'cc', 'bend', 'touch', 'program', 'clock', 'sysex'];

/**
 * A decoded message from `midi-decode.mjs`, as one of the classes above.
 * ⚠️ NOTE OFF IS A NOTE. A port that accepts notes and not note offs would hold
 * every key it was ever sent, which is this rig's measured MK-425C behaviour
 * wearing a different hat.
 */
export function classOf(m) {
  switch (m.kind) {
    case 'note on': case 'note off': return 'note';
    case 'control': return 'cc';
    case 'pitch bend': return 'bend';
    case 'poly touch': case 'channel touch': return 'touch';
    case 'program': return 'program';
    case 'sysex': return 'sysex';
    case 'clock': case 'start': case 'stop': case 'continue': return 'clock';
    default: return 'other';
  }
}

// ── transforms ────────────────────────────────────────────────────────────
//
// 🔴 A TRANSFORM IS A PLAIN OBJECT, NOT A FUNCTION, and that is what makes the
// text form in §4 of the plan possible: an object round trips to a line of text
// and back, and a closure does not. It also means a patch can be saved, sent
// over a wire and diffed.
//
// ⚠️ EVERY ONE OF THEM MAY DROP AN EVENT BY RETURNING NULL, and a filter is
// simply a transform that drops rather than a separate concept.

const OPS = {
  /** Put the event on one channel. The MK-425C's global channel is 2 and the
   *  Circuit's first synth listens on 1, so this is the transform the smallest
   *  useful patch in this repository needs. */
  channel: {
    args: ['to'], need: ['to'],
    help: 'put every message on MIDI channel N',
    eg: { op: 'channel', to: 1 },
    classes: (set) => set,
    run: (ev, a) => (ev.ch === null ? ev : { ...ev, ch: a.to }),
  },
  /** Move notes. `+1` is a real thing somebody wants on day one here: the
   *  MK-425C was measured a semitone flat. */
  transpose: {
    args: ['by'], need: ['by'],
    help: 'move notes by N semitones, N may be negative',
    eg: { op: 'transpose', by: -12 },
    classes: (set) => set,
    run: (ev, a) => {
      if (ev.cls !== 'note') return ev;
      const n = ev.d1 + a.by;
      // ⚠️ OUT OF RANGE IS A DROP, NOT A CLAMP. A clamp turns the top of a
      // keyboard into a pile of the same note, which sounds like a stuck key.
      return (n < 0 || n > 127) ? null : { ...ev, d1: n };
    },
  },
  /** Scale note-on velocity. A note off is left alone: its velocity is a
   *  release and scaling it makes a release that never reaches zero. */
  velocity: {
    args: ['scale'], need: ['scale'],
    help: 'multiply note-on velocity',
    eg: { op: 'velocity', scale: 0.5 },
    classes: (set) => set,
    run: (ev, a) => {
      if (ev.cls !== 'note' || ev.d2 === 0) return ev;
      return { ...ev, d2: Math.max(1, Math.min(127, Math.round(ev.d2 * a.scale))) };
    },
  },
  /** Keep one class and drop the rest. */
  only: {
    args: ['cls'], need: ['cls'],
    help: 'keep only that class of message and drop every other class',
    eg: { op: 'only', cls: 'note' },
    classes: (set, a) => new Set([...set].filter((c) => c === a.cls)),
    run: (ev, a) => (ev.cls === a.cls ? ev : null),
  },
  /** Drop one class and keep the rest. */
  drop: {
    args: ['cls'], need: ['cls'],
    help: 'drop that class of message and keep every other class',
    eg: { op: 'drop', cls: 'clock' },
    classes: (set, a) => new Set([...set].filter((c) => c !== a.cls)),
    run: (ev, a) => (ev.cls === a.cls ? null : ev),
  },
  /**
   * Move one controller number to another, optionally onto another channel.
   * 🔴 THIS IS THE SMALLEST TRANSFORM THAT PROVES THE `(channel, controller)`
   * KEY, which `plans/plan-device-layouts.md` §5.3 argues and the Circuit proves:
   * CC 80 is macro knob 1 on channel 1 and drum 4 pan on channel 10, in one
   * instrument. A remap that only knew about controller numbers would send a
   * mod wheel to both.
   */
  /**
   * 🔴 A KEYBOARD SPLIT, WHICH COULD NOT BE SAID AT ALL UNTIL 2026-09-21. The
   * owner asked for one in words: *"Split the keyboard into half. Lower part
   * plays synth 1 in the circuit and upper part plays synth 2"*, and the model
   * produced `{"op":"only","to":1}` twice, because `only` filters by CLASS and
   * was the nearest thing in the whole vocabulary to a filter. **It was not
   * wrong about the intent. There was no word for it.**
   * ⚠️ A SPLIT IS TWO LINKS, NOT ONE OP. `link()` already allows two links
   * between the same pair, so the lower half is one link with a range and a
   * channel and the upper half is another. That is how a real one is built.
   * 🔴 AND A NOTE OFF OUTSIDE THE RANGE IS DROPPED TOO, WHICH IS THE WHOLE
   * SAFETY OF IT. The filter is on the NOTE NUMBER, which is the same for the
   * on and the off, so a note that was never let through can never be left
   * hanging. A filter keyed on anything that differs between them stops notes.
   */
  /**
   * 🔴 ONE BOUND IS ENOUGH, AND THAT IS NOT A CONCESSION TO A MODEL. *Everything
   * above middle C* is how a person says a split out loud, and it was
   * unsayable here: `range lo=60 hi=127` names a top that is not a decision,
   * and the half that matters is buried beside a constant. An open end is the
   * honest form, and the closed one is still available.
   * ⚠️ **SO `need` IS EMPTY AND `oneOf` REPLACES IT.** A `range` with neither
   * bound passes every note and is a transform that does nothing, which reads
   * as a filter that is working. It is refused.
   */
  range: {
    args: ['lo', 'hi'], need: [], oneOf: ['lo', 'hi'],
    help: 'keep only notes whose NOTE NUMBER is between lo and hi, which is how a keyboard split is made and how one row of buttons is picked out of a control surface. Either bound may be left out and that end is then open',
    eg: { op: 'range', lo: 36, hi: 47 },
    classes: (set) => set,
    run: (ev, a) => {
      if (ev.cls !== 'note') return ev;
      const lo = a.lo === undefined ? 0 : a.lo;
      const hi = a.hi === undefined ? 127 : a.hi;
      return (ev.d1 < lo || ev.d1 > hi) ? null : ev;
    },
  },
  /**
   * 🔴 A VELOCITY LAYER: soft hits one instrument and hard hits another, which
   * is how a real split-by-touch is built.
   * 🔴 AND A NOTE OFF CARRIES VELOCITY 0, SO A NAIVE FILTER LEAVES EVERY NOTE
   * HANGING. `d2 === 0` is the off and it passes ALWAYS, whatever the window
   * is: dropping it would mean a note let through by a hard hit is never told
   * to stop, and a stuck note on a synth in another building is the worst thing
   * in this file. The test asserts the off passes a window it could not enter.
   */
  vrange: {
    args: ['lo', 'hi'], need: [], oneOf: ['lo', 'hi'],
    help: 'keep only notes whose VELOCITY is between lo and hi, which is how a soft layer and a hard layer are made. Either bound may be left out and that end is then open',
    eg: { op: 'vrange', lo: 1, hi: 63 },
    classes: (set) => set,
    run: (ev, a) => {
      if (ev.cls !== 'note' || ev.d2 === 0) return ev;
      const lo = a.lo === undefined ? 1 : a.lo;
      const hi = a.hi === undefined ? 127 : a.hi;
      return (ev.d2 < lo || ev.d2 > hi) ? null : ev;
    },
  },
  /**
   * 🔴 ONE VELOCITY FOR EVERY NOTE, WHICH THIS DESK'S OWN DRUMS ALREADY DO.
   * ✅ MEASURED and written in `research/measured-devices-2026-09-20.md`: the Circuit's
   * drum pads send notes 60, 62 and 64 at **velocity 96, fixed**. So this is
   * not an effect, it is how one instrument here behaves, and a link that wants
   * to feed it from a touch sensitive keyboard needs to say so.
   * ⚠️ AND IT LEAVES A NOTE OFF ALONE, for the reason above: rewriting a 0 to
   * 96 turns every release into a second note on.
   */
  fixed: {
    args: ['to'], need: ['to'],
    help: 'give every note the same velocity N, which is what this desk\'s drums already do at 96',
    eg: { op: 'fixed', to: 96 },
    classes: (set) => set,
    run: (ev, a) => {
      if (ev.cls !== 'note' || ev.d2 === 0) return ev;
      return { ...ev, d2: Math.max(1, Math.min(127, Math.round(a.to))) };
    },
  },
  cc: {
    args: ['from', 'to', 'ch'], need: ['from', 'to'],
    help: 'move the controller numbered from onto the controller numbered to, optionally onto channel ch',
    eg: { op: 'cc', from: 1, to: 74, ch: 10 },
    classes: (set) => set,
    run: (ev, a) => {
      if (ev.cls !== 'cc' || ev.d1 !== a.from) return ev;
      return { ...ev, d1: a.to, ...(a.ch === undefined ? {} : { ch: a.ch }) };
    },
  },
};

export const OP_NAMES = Object.keys(OPS);

/**
 * 🔴 THE WORDS A PERSON READS, AND UNTIL 2026-09-22 THERE WERE NONE, SO THE
 * REFUSALS WERE WRITTEN IN FIELD NAMES. REPORTED against a real reply:
 * *"MK-425C USB MIDI Keyboard to Circuit { only } / only takes "cls" and was
 * given "to" - its not for humans, i do not know what to do"*. `cls` and `to`
 * are keys in this file's own schema, and a sentence made of two of them tells
 * a reader which keys the validator compared and nothing about what to do.
 * ⚠️ **AND THAT LINE HAD ALREADY BEEN REPAIRED ONCE THE SAME DAY**, for a
 * different fault: it read `cc takes "from" and was given "to"` and accused a
 * correct argument of being wrong. That repair made it TRUE. True and
 * unreadable are different problems and only the first one was fixed.
 * 🔴 **`help` COULD NOT BE REUSED AND THAT IS THE REASON THIS TABLE EXISTS.**
 * `help` is what a language model reads in `workers/wish/src/wish.mjs`, and
 * `cc`'s reads *move the controller numbered from onto the controller numbered
 * to*, which carries two field names on purpose because the model is choosing
 * keys. A visitor is not.
 * 🔴 **IT IS ONE TABLE RATHER THAN THREE FIELDS PER OP SO THAT IT CAN BE
 * GRADED WHOLE.** `bay-test.mjs` asserts that every operator has a `does` and
 * that every argument of every operator has both a `part` and an `ask`, which
 * is the same guard `help` already has and for the same reason: a new
 * transform with no words beside it is this defect arriving again with nobody
 * noticing.
 *   - `does` finishes the sentence `<op> ...`, so it is a verb phrase.
 *   - `part` names an argument as a thing rather than as a key. It is the
 *     half that replaces `"cls"` and `"to"`.
 *   - `ask` is the SOLUTION line: one imperative naming real values. It is
 *     never the problem with *do not* in front of it.
 */
const SAYS = {
  channel: {
    does: 'puts every message on one MIDI channel',
    part: { to: 'the channel number' },
    ask: { to: 'Name a channel from 1 to 16, and the Circuit\'s first synth answers on 1.' },
  },
  transpose: {
    does: 'moves notes up or down the keyboard',
    part: { by: 'the number of semitones' },
    ask: { by: 'Name how many semitones to move, such as 1 up or -12 down.' },
  },
  velocity: {
    does: 'scales how hard every note was played',
    part: { scale: 'the amount to multiply by' },
    ask: { scale: 'Name what to multiply by, such as 0.5 for half as hard.' },
  },
  only: {
    does: 'keeps one kind of message and drops the rest',
    part: { cls: 'a kind of message' },
    ask: { cls: '' },                       // filled from CLASSES below
  },
  drop: {
    /* ⚠️ NOT `drops one kind of message`, or the sentence opens `drop drops`.
       An operator's name is the first word of its own problem line. */
    does: 'throws away one kind of message and keeps the rest',
    part: { cls: 'a kind of message' },
    ask: { cls: '' },
  },
  range: {
    does: 'keeps only the notes inside a stretch of the keyboard',
    part: { lo: 'the lowest note', hi: 'the highest note' },
    ask: {
      lo: 'Name the lowest note to keep, or the highest, or both, from 0 to 127.',
      hi: 'Name the lowest note to keep, or the highest, or both, from 0 to 127.',
    },
  },
  vrange: {
    does: 'keeps only the notes played inside a band of loudness',
    part: { lo: 'the softest hit', hi: 'the hardest hit' },
    ask: {
      lo: 'Name the softest hit to keep, or the hardest, or both, from 1 to 127.',
      hi: 'Name the softest hit to keep, or the hardest, or both, from 1 to 127.',
    },
  },
  fixed: {
    does: 'gives every note the same loudness',
    part: { to: 'the loudness to give them' },
    ask: { to: 'Name one loudness from 1 to 127, and this desk\'s drums send 96.' },
  },
  cc: {
    does: 'moves one controller onto another',
    part: { from: 'the controller it comes from', to: 'the controller it goes to',
            ch: 'the channel to send it on' },
    ask: {
      from: 'Name the controller it comes from, from 0 to 127, which is the number that knob sends.',
      to: 'Name the controller it goes to, from 0 to 127.',
      ch: 'Name the channel to send it on, from 1 to 16.',
    },
  },
};
/* ⚠️ DERIVED, NEVER TYPED. The list of kinds a link can carry is `CLASSES` and
   it is the one place it is declared, so a class added there arrives in the
   sentence that offers it without anybody remembering to come here. The
   brief's own example of a readable solution is this string. */
SAYS.only.ask.cls = `Name one of ${CLASSES.join(', ')}.`;
SAYS.drop.ask.cls = SAYS.only.ask.cls;

/** `transpose moves notes up or down the keyboard`, with no field name in it. */
const head = (op) => `${op} ${SAYS[op].does}`;
/** What an argument IS, in words. Falls back to nothing rather than to its key:
 *  a key printed as English is the whole of the defect this exists for. */
const part = (op, k) => SAYS[op]?.part?.[k] || 'what it needs';
const ask = (op, k) => SAYS[op]?.ask?.[k] || '';
/** The operators, offered as a list somebody can choose from. */
const PICK_AN_OP = () => `Name one of ${OP_NAMES.join(', ')}.`;

/** The visitor's vocabulary, exported so a test can grade it whole. */
export const OP_SAYS = SAYS;

/**
 * 🔴 THE VOCABULARY, IN THE ONE PLACE THE VOCABULARY IS DECLARED, BECAUSE IT
 * HAS ALREADY BEEN WRITTEN DOWN IN FOUR PLACES AND THE ONE A MODEL READS WENT
 * STALE. 2026-09-21: `range`, `vrange` and `fixed` were added here and to
 * `schemaFor()`'s `enum` and to the page's prose, and NOT to the operator table
 * in `systemFor()`, which is the part of the prompt that defines the format. So
 * the model was choosing from six transforms while the code accepted nine, and
 * it reported `{"op":"only","to":N}` for the third time, which is what a model
 * says when it means *filter* and the only filter it has been shown is `only`.
 * ⚠️ **THE SIGNATURE IS DERIVED FROM `args`, NEVER TYPED**, so it cannot
 * disagree with what `checkTransforms` enforces. `cls` is the one argument that
 * is not a number and `scale` is the one that is not an integer, which is the
 * whole of the mapping.
 * ⚠️ AND `help` IS REQUIRED OF EVERY OP, asserted in `bay-test.mjs`, because a
 * new transform with no sentence beside it is exactly the defect above arriving
 * again with nobody noticing.
 */
const PLACE = { cls: 'C', scale: 'F' };

export const OP_HELP = OP_NAMES.map((op) => ({
  op,
  args: OPS[op].args.slice(),
  need: OPS[op].need.slice(),
  oneOf: (OPS[op].oneOf || []).slice(),
  help: OPS[op].help,
  eg: { ...OPS[op].eg },
  sig: `${op} ${OPS[op].args.map((a) => `${a}=${PLACE[a] || 'N'}`).join(' ')}`,
  /**
   * 🔴 THE LINE A MODEL COPIES. MEASURED TWICE on 2026-09-21 against
   * `llama-3.3-70b`: shown `range lo=N hi=N` in a table and one worked example
   * carrying `"to"`, it wrote `{"op":"range","to":7}` on every run. It had the
   * argument names in front of it and copied the JSON instead, which is what
   * this file already records happening to `transpose`. **A sentence is read
   * and an example is copied**, so every transform now has one rather than the
   * two that happened to be spelled out.
   * ⚠️ AND THE EXAMPLE IS GRADED BY OUR OWN VALIDATOR, asserted in
   * `bay-test.mjs`: an example `checkTransforms` would refuse is a defect being
   * taught to a model on every call, and it would read as documentation.
   */
  json: JSON.stringify({ op, ...OPS[op].eg }),
}));

/**
 * 🔴 A TRANSFORM WITH ITS ARGUMENT UNDER THE WRONG KEY IS THE DEFECT THIS
 * FUNCTION EXISTS FOR, AND IT WAS FOUND BY MEASUREMENT RATHER THAN BY READING.
 * 2026-09-21, asking Workers AI to turn a spoken sentence into a patch, the
 * model returned `{ op: 'transpose', to: 1 }`. **`transpose` takes `by`.** The
 * object was perfectly valid against the JSON Schema it was generated under,
 * because that schema listed every argument any op could take and required only
 * `op`, so `to` was allowed on a transform that has no `to`.
 * ⚠️ **AND `apply()` WOULD HAVE SAID NOTHING.** `ev.d1 + undefined` is `NaN`,
 * which is not a throw and not a drop: it is a note number that no longer exists
 * arriving at an instrument, from a page that reported the link as connected.
 * 🔴 **SO THE CHECK LIVES HERE RATHER THAN IN THE SCHEMA.** A schema constrains
 * the SHAPE of what a model may say and it cannot constrain the MEANING. That is
 * the same rule this project already has about a shape being declared rather
 * than inferred, arriving from the direction of a language model.
 *
 * 🔴 IT ANSWERS IN TWO SENTENCES SINCE 2026-09-22, ASKED FOR AS *"can we have
 * cooncrete problem -> soluton texts?"*. `why` is what is wrong, in words;
 * `fix` is the thing a person can do, naming real values. Neither one is ever
 * the other with *do not* in front of it, which is the failure mode of every
 * problem-and-solution pair ever written.
 * ⚠️ AND A REFUSAL'S SOLUTION IS SOMETIMES THAT THERE IS NONE, WHICH IS THE
 * TEXT RATHER THAN A MISSING ONE. A blank second line reads as a sentence that
 * failed to load, so *this link cannot be made* is written out.
 * @returns {''|{why: string, fix: string}} '' when every transform is well
 *          formed, or the problem and what to do about it.
 */
export function checkTransforms(transforms) {
  for (const t of transforms || []) {
    if (!t || typeof t !== 'object') {
      return { why: 'one of the transforms is not an object with a transform name in it.',
               fix: 'There is nothing here to repair, so the instruction has to be asked again.' };
    }
    const op = OPS[t.op];
    if (!op) return { why: `there is no transform called "${t.op}".`, fix: PICK_AN_OP() };
    for (const k of op.need) {
      if (t[k] === undefined || t[k] === null) {
        /**
         * 🔴 A FIELD NAME IS QUOTED, OR THE SENTENCE READS AS BROKEN GRAMMAR.
         * This said `${t.op} needs ${k} and was given ${keys}`, which on the one
         * failure it is written for came out as **`transpose needs by and was
         * given to`** and was reported 2026-09-21 with the words *"what is
         * it?"*. Both `by` and `to` are FIELD NAMES, and printed bare they are
         * read as English, so a reader looks for the noun that is missing.
         * ⚠️ THE CHECK ITSELF IS UNCHANGED AND MUST STAY UNCHANGED. That object
         * is valid against the schema it was generated under, and without this
         * the code computes `note + undefined`, which is `NaN`: a note number
         * that does not exist arriving at an instrument down a link the page
         * called connected.
         */
        /**
         * 🔴 TWO DIFFERENT FAULTS WORE ONE SENTENCE UNTIL 2026-09-22, AND ON
         * THE SECOND OF THEM IT NAMED SOMETHING THAT WAS NOT WRONG.
         * REPORTED against `{ op: 'cc', to: 80 }` with the words *"do not get
         * this error"*, which came out as **`cc takes "from" and was given
         * "to"`**. That reads as *cc takes from, NOT to*, and it is false:
         * `cc` needs BOTH, it moves the controller numbered `from` onto the
         * controller numbered `to`, and **`to: 80` was exactly right**, 80
         * being the Circuit's first macro knob. The only fault was that
         * `from` was absent.
         * ✅ **SO THE SENTENCE SPLITS ON WHETHER THE GIVEN KEYS BELONG TO THIS
         * OP AT ALL.** A key the op does not have is a SWAP, and naming both
         * sides is the whole help: `transpose takes "by" and was given "to"`
         * is right and stays exactly as it was. Keys that all belong, with a
         * required one missing, is an OMISSION, and there the only useful
         * sentence says what is needed and which part did not arrive.
         * ⚠️ IT IS THE SAME LESSON THIS PROJECT KEEPS PAYING FOR, ARRIVING IN
         * PROSE RATHER THAN IN AN ASSERT: a message that measures something
         * NEXT TO the quantity in question sends a reader to the wrong place.
         * Here it sent one to delete an argument that was correct.
         */
        /**
         * 🔴 AND THE THREE CASES SURVIVE THE REWRITE, BECAUSE THEY ARE THREE
         * DIFFERENT THINGS A READER HAS TO DO. What changed on 2026-09-22 is
         * the words, not the split: a swap, a partial omission and an empty
         * object stay tellable apart, which `bay-test.mjs` grades directly.
         */
        const given = Object.keys(t).filter((x) => x !== 'op');
        const strange = given.filter((x) => !op.args.includes(x));
        /* ⚠️ THREE CASES, NOT TWO, AND THE THIRD WAS FOUND BY `bay-test.mjs`
           GOING RED IN ONE LINE. An empty object is neither a swap nor a
           partial omission: nothing arrived, so there is no other argument to
           point at and no half of the requirement to name. */
        if (!given.length) {
          return { why: `${head(t.op)}, and it was given nothing at all.`, fix: ask(t.op, k) };
        }
        if (strange.length) {
          /**
           * 🔴 THE SOLUTION IS THE REPAIRED OBJECT, WHICH IS THE ONE FORM THAT
           * NEEDS NO FIELD NAME IN PROSE. The JSON is already on the page
           * directly above this sentence, asked for as *"can it not be full
           * json(l) message?"*, so a corrected object beside it is read by
           * comparison rather than by parsing an English claim about two keys.
           * ⚠️ THE VALUE THAT ARRIVED IS CARRIED OVER, AND THE OBJECT IS ONLY
           * OFFERED WHEN IT CAN BE. The measured case is
           * `{ op: 'transpose', to: 1 }`, where the **1 was never wrong** and
           * only its name was, so `{"op":"transpose","by":1}` is a repair a
           * reader can check against the JSON above it. `{ op: 'only', to: 1 }`
           * is not: `1` is not a kind of message, so any object written here
           * would carry a value this file INVENTED and print it as if somebody
           * had asked for it. That one gets the list of real kinds instead,
           * which is the offer the report itself suggested.
           */
          const gaps = op.need.filter((n) => t[n] === undefined || t[n] === null);
          const spare = strange.map((x) => t[x]).find((v) => v !== undefined);
          const fits = gaps.length === 1 && (gaps[0] === 'cls'
            ? CLASSES.includes(spare)
            : typeof spare === 'number' && !Number.isNaN(spare));
          const mend = { op: t.op };
          for (const a of op.args) if (t[a] !== undefined && t[a] !== null) mend[a] = t[a];
          if (fits) mend[gaps[0]] = spare;
          return { why: `${head(t.op)}, and nothing it was given is ${part(t.op, k)}.`,
                   fix: fits ? `Write it as ${JSON.stringify(mend)}.` : ask(t.op, k) };
        }
        return { why: `${head(t.op)}, and ${part(t.op, k)} is missing.`, fix: ask(t.op, k) };
      }
      if (k === 'cls') {
        if (!CLASSES.includes(t.cls)) {
          return { why: `${head(t.op)}, and ${JSON.stringify(t.cls)} is not a kind of message.`,
                   fix: ask(t.op, 'cls') };
        }
      }
    }
    /**
     * 🔴 AT LEAST ONE OF A PAIR, WHICH `need` CANNOT SAY. `range` takes a low
     * bound, a high bound or both, because *everything above middle C* is a
     * real instruction and naming 127 as its top is noise. A `range` with
     * NEITHER passes every note, which is a filter that silently does nothing,
     * so it is refused by name here rather than allowed as a no-op.
     */
    if (op.oneOf && op.oneOf.every((k) => t[k] === undefined || t[k] === null)) {
      /* ⚠️ AND THE TWO WAYS IN ARE TOLD APART SINCE 2026-09-22. `{ op: 'range' }`
         was given nothing; `{ op: 'range', to: 7 }` was given something that is
         not a bound, and that second one is MEASURED rather than imagined: it
         is what `llama-3.3-70b` wrote eleven runs out of eleven. One sentence
         for both of them said `was given nothing` about an object that plainly
         had a number in it. */
      const stray = Object.keys(t).some((x) => x !== 'op' && !op.args.includes(x));
      const [lo, hi] = op.oneOf;
      return {
        why: stray
          ? `${head(t.op)}, and nothing it was given is ${part(t.op, lo)} or ${part(t.op, hi)}.`
          : `${head(t.op)}, and neither ${part(t.op, lo)} nor ${part(t.op, hi)} was given.`,
        fix: ask(t.op, lo),
      };
    }
    /**
     * 🔴 EVERY ARGUMENT THAT IS PRESENT IS TYPE CHECKED, NOT ONLY THE REQUIRED
     * ONES. This loop used to run over `need`, so the moment an argument became
     * optional it also became untyped: `{ op: 'range', lo: 36, hi: '47' }` would
     * have passed, and `ev.d1 > '47'` compares a number against a string, which
     * is not a throw and not a drop. That is the same `NaN` shape this whole
     * function exists for, one optional argument along.
     */
    for (const k of op.args) {
      if (t[k] === undefined || t[k] === null || k === 'cls') continue;
      if (typeof t[k] !== 'number' || Number.isNaN(t[k])) {
        return { why: `${head(t.op)}, and ${part(t.op, k)} came as ${JSON.stringify(t[k])} `
                      + 'rather than as a number.',
                 fix: ask(t.op, k) };
      }
    }
    /**
     * 🔴 A RANGE THAT CANNOT PASS ANYTHING IS A FILTER THAT READS AS WORKING.
     * `lo` above `hi` drops every note on the link, the page draws the arrow,
     * and the instrument is silent for a reason nothing on screen explains.
     */
    if (op.oneOf && t.lo !== undefined && t.hi !== undefined && t.lo > t.hi) {
      /* ⚠️ THE OFFER IS MADE TO A PERSON AND IS NEVER TAKEN BY THE CODE, which
         is the same line the two-bounds refusal below draws and for the same
         reason: the far end is an instrument in another building. Showing the
         swapped object is what lets somebody decide in one glance; swapping it
         here would be a guess nobody was told about. */
      return { why: `${head(t.op)}, and ${part(t.op, 'lo')} ${t.lo} is above `
                    + `${part(t.op, 'hi')} ${t.hi}, so nothing can ever pass.`,
               fix: `Turn them round: ${JSON.stringify({ op: t.op, lo: t.hi, hi: t.lo })}.` };
    }
  }
  /**
   * 🔴 TWO RANGES OPEN AT THE SAME END, WHICH IS ALWAYS ONE RANGE WRITTEN
   * WRONG. MEASURED 2026-09-21, eleven runs of `llama-3.3-70b`: asked to play a
   * row of buttons, it writes `{"op":"range","to":0}` then
   * `{"op":"range","to":7}`, spelling *range 0 to 7* as two transforms because
   * a link is `{"from": …, "to": …}` and that is the key in front of it.
   * 🔴 **AND THE COMPOSED RESULT IS THE WORST KIND OF WRONG**: two high bounds
   * in a row means the LOWER one wins, so the link passes notes up to 0 and the
   * second range is dead. It is well formed, it is allowed, and one button of
   * eight works. A refusal that names the correction is worth more than a patch
   * that looks fine.
   * ⚠️ **NOT MERGED, AND THAT IS DELIBERATE.** One run of the eleven produced
   * the pair DESCENDING, 23 then 7, so reading the first as a low bound and the
   * second as a high one is a guess that is sometimes backwards. A repair that
   * is right most of the time is worse here than a refusal, because the thing
   * on the far end is an instrument in another building.
   */
  for (const end of ['lo', 'hi']) {
    const same = (transforms || []).filter((t) => OPS[t?.op]?.oneOf
      && t[end] !== undefined && t[end === 'lo' ? 'hi' : 'lo'] === undefined);
    if (same.length > 1) {
      const op = same[0].op;
      const [a, b] = [same[0][end], same[1][end]];
      return {
        why: `two ${op}s each name only ${part(op, end)}, ${a} and ${b}, so the narrower `
             + 'one wins and the other does nothing.',
        fix: `One ${op} takes both ends: `
             + `${JSON.stringify({ op, lo: Math.min(a, b), hi: Math.max(a, b) })}.`,
      };
    }
  }
  return '';
}

/** Run an ordered list. Returns the event, or null if something dropped it. */
export function apply(transforms, ev) {
  let out = ev;
  for (const t of transforms || []) {
    const op = OPS[t.op];
    if (!op) throw new Error(`bay: no transform called ${t.op}`);
    out = op.run(out, t);
    if (!out) return null;
  }
  return out;
}

/** What classes could still come out the far end of this list. */
export function delivers(emits, transforms) {
  let set = new Set(emits);
  for (const t of transforms || []) {
    const op = OPS[t.op];
    if (!op) throw new Error(`bay: no transform called ${t.op}`);
    set = op.classes(set, t);
  }
  return set;
}

// ── the text form ─────────────────────────────────────────────────────────
//
// 🔴 IT IS A PROJECTION OF THE GRAPH AND NEVER A SECOND SOURCE OF TRUTH. Every
// line round trips to a link and back, and `bay-test.mjs` asserts that it does.
// The moment the text can say something the graph cannot, there are two models
// and they will disagree, which is this project's most expensive defect class.

/** One link as one line: `from -> to { op arg, op arg }` */
/**
 * 🔴 AN ABSENT OPTIONAL ARGUMENT PRINTS AS `*`, AND WITHOUT IT THE ROUND TRIP
 * BREAKS SILENTLY. This used to drop every `undefined`, which was exact while
 * every argument was required. `range` gained an open end on 2026-09-21, and
 * `{ range, hi: 7 }` would have printed `range 7` and read back as
 * `{ range, lo: 7 }`: the same words meaning the opposite filter, with nothing
 * to catch it because both are well formed. `bay-test.mjs` round trips it.
 * ⚠️ A TRAILING absent argument is still dropped, so `cc 1 74` is unchanged and
 * so is every line anybody has written by hand.
 */
export function printLink(link) {
  const t = (link.transforms || []).map((x) => {
    const args = OPS[x.op].args.map((k) => x[k]);
    while (args.length && args[args.length - 1] === undefined) args.pop();
    return [x.op, ...args]
      .map((v) => {
        if (v === undefined) return '*';
        return (typeof v === 'number' && v > 0 && x.op === 'transpose') ? `+${v}` : `${v}`;
      })
      .join(' ');
  }).join(', ');
  return `${link.from} -> ${link.to}${t ? ` { ${t} }` : ''}`;
}

/** The reverse. Throws with the offending text, because a parser that returns
 *  null makes every caller invent its own message for the same fault. */
export function parseLink(line) {
  const m = /^\s*([^\s>]+)\s*->\s*([^\s{]+)\s*(?:\{(.*)\})?\s*$/.exec(line);
  if (!m) throw new Error(`bay: cannot read "${line.trim()}". A link is "from -> to { op arg }"`);
  const [, from, to, body] = m;
  const transforms = (body || '').split(',').map((s) => s.trim()).filter(Boolean).map((chunk) => {
    const parts = chunk.split(/\s+/);
    const op = parts.shift();
    if (!OPS[op]) throw new Error(`bay: no transform called "${op}". There are ${OP_NAMES.join(', ')}`);
    const t = { op };
    OPS[op].args.forEach((k, i) => {
      if (parts[i] === undefined || parts[i] === '*') return;   // `*` is an open end
      const n = Number(parts[i]);
      t[k] = Number.isNaN(n) ? parts[i] : n;
    });
    return t;
  });
  return { from, to, transforms };
}

export function printPatch(links) { return links.map(printLink).join('\n'); }
export function parsePatch(text) {
  return String(text).split('\n')
    .map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean).map(parseLink);
}

// ── the bay ───────────────────────────────────────────────────────────────

/** How long since a heartbeat before a port is STALE, which is a third state
 *  and is not the same as absent. "I cannot ssh to it" is never "it is down". */
export const STALE_MS = 30_000;

export function createBay({ now = () => Date.now() } = {}) {
  const ports = new Map();          // id -> port
  const links = new Map();          // id -> link
  let nextLink = 1;

  /**
   * @param {object} p
   * @param {string} p.id      `site:node:port`. An id, never a name: a name is
   *                           what a replug changes, and CoreMIDI really does
   *                           rename a port to `Circuit 2` when it is held.
   * @param {string} p.label   what a person reads. Allowed to change.
   * @param {'in'|'out'} p.dir
   * @param {string} p.medium  one of MEDIA
   * @param {object} p.shape   what the data IS
   * @param {string[]} [p.accepts] in-ports: the classes it consents to
   * @param {string[]} [p.never]   in-ports: classes that make a link a HARD
   *                               REFUSAL rather than a quiet drop. See below.
   * @param {string[]} [p.emits]   out-ports: the classes it can produce
   * @param {Function} [p.deliver] in-ports: where a delivered event goes
   */
  function addPort(p) {
    if (!p.id) throw new Error('bay: a port needs an id');
    if (!MEDIA.includes(p.medium)) throw new Error(`bay: medium is one of ${MEDIA.join(', ')}, not ${p.medium}`);
    if (p.dir !== 'in' && p.dir !== 'out') throw new Error('bay: dir is "in" or "out"');
    ports.set(p.id, { accepts: [], never: [], emits: [], shape: {}, seenAt: now(), heard: 0, ...p });
    return ports.get(p.id);
  }
  function seen(id) { const p = ports.get(id); if (p) p.seenAt = now(); }
  function stale(p) { return now() - (p.seenAt ?? 0) > STALE_MS; }

  /**
   * 🔴 THE VALIDATOR IS THE WHOLE POINT AND IT IS ORDINARY CODE. Every refusal
   * carries a sentence, because a patch bay that answers "no" is a patch bay
   * nobody can use. It is also the half that stays useful if every language
   * model in §5 of the plan were deleted.
   *
   * 🔴 AND EVERY REFUSAL CARRIES A SECOND SENTENCE SINCE 2026-09-22: `fix` is
   * the thing a person can do about it. Several of these have no repair, and
   * saying so in words is what tells a reader to stop trying. A blank line
   * would read as a sentence that failed to load.
   * @returns {{ok:boolean, why:string, fix?:string, warn?:string}}
   */
  function validate(fromId, toId, transforms = []) {
    const a = ports.get(fromId), b = ports.get(toId);
    const NO_PORT = 'Nothing on this desk answers to that name, so this link cannot be made.';
    if (!a) return { ok: false, why: `there is no port called ${fromId}.`, fix: NO_PORT };
    if (!b) return { ok: false, why: `there is no port called ${toId}.`, fix: NO_PORT };
    if (a.dir !== 'out') {
      return { ok: false, why: `${a.label} is an input, so nothing leaves it.`,
               fix: `A link starts at something that sends, so name what should reach ${a.label} instead.` };
    }
    if (b.dir !== 'in') {
      return { ok: false, why: `${b.label} is an output, so nothing arrives at it.`,
               fix: `A link ends at something that receives, so name what ${b.label} should reach instead.` };
    }
    if (a.medium !== b.medium) {
      return { ok: false, why: `${a.label} carries ${a.medium} and ${b.label} takes ${b.medium}.`,
               fix: `Nothing here turns ${a.medium} into ${b.medium}, so this link cannot be made.` };
    }
    if (a.id === b.id) {
      return { ok: false, why: 'a port cannot feed itself.',
               fix: 'Name a different instrument at one end of the link.' };
    }

    /* Before anything about the ports: is the list of transforms even well
       formed. See `checkTransforms`, which exists because a model produced a
       schema valid transform with its argument under the wrong key. */
    const badT = checkTransforms(transforms);
    if (badT) return { ok: false, ...badT };

    // Shape. ⚠️ THE FIELD THAT DISAGREES IS NAMED. "incompatible" is a refusal
    // somebody has to debug; "48000 against 44100" is one they can fix.
    for (const k of Object.keys(b.shape || {})) {
      if (a.shape?.[k] === undefined) continue;
      if (a.shape[k] !== b.shape[k]) {
        return { ok: false,
                 why: `${k} does not match: ${a.label} is ${a.shape[k]} and ${b.label} wants ${b.shape[k]}.`,
                 fix: 'Nothing here can change what either end speaks, so this link cannot be made.' };
      }
    }

    /**
     * 🔴 CONSENT, AND IT IS TWO DIFFERENT QUESTIONS THAT THE FIRST BUILD
     * ANSWERED AS ONE. It refused any link that could deliver a class the
     * destination did not accept, and **that refused every real link on this
     * desk**: a MIDI source emits six classes, the Circuit takes three, so a
     * keyboard could never reach a synth at all. Found by `/wish/`, which put a
     * real model's real proposal through it and got `Circuit does not accept
     * touch` for a patch that was otherwise perfect.
     * ✅ **A CLASS A PORT SIMPLY DOES NOT HANDLE IS DROPPED AND REPORTED.** The
     * drop already happens at the destination in `send`, so nothing is sent
     * either way; what changes is that the link exists and the reader is told
     * what will not cross it.
     * 🔴 **A CLASS A PORT `never` TAKES IS STILL A HARD REFUSAL**, and that is
     * the list the Circuit's SysEx line lives on. The difference is between *I
     * do not use that* and *that damages me*.
     */
    let could;
    try { could = delivers(a.emits, transforms); }
    catch (e) { return { ok: false, why: e.message, fix: PICK_AN_OP() }; }
    for (const c of could) {
      if (b.never.includes(c)) {
        /**
         * 🔴 THIS ONE HAS A REPAIR AND IT IS THE PAGE'S OWN NEGATIVE CONTROL.
         * `/bay/` already asserts *and the same pair is allowed once SysEx is
         * dropped*, so the honest solution here is the transform that does it
         * rather than *there is no fix*: the Circuit's refusal is about what
         * reaches it, not about whether a keyboard may play it at all.
         * ⚠️ WHAT HAS NO REPAIR IS THE RULE ITSELF, and nothing here offers to
         * bend it. `never` is the list that carries an instrument's safety, and
         * the only thing on offer is not sending it that class.
         */
        return { ok: false,
                 why: `${b.label} does not accept ${c}, and this link could deliver it.`,
                 fix: `Stop the link carrying ${c}: ${JSON.stringify({ op: 'drop', cls: c })}.` };
      }
    }
    /* ⚠️ THE SOURCE BEING LEFT WITH NOTHING IS CHECKED BEFORE THE DESTINATION
       TAKING NONE OF IT, because they are two different faults and the second
       message is wrong about the first. Order matters here and a test caught
       it reading `Circuit takes none of what this link carries` about a link
       that carried nothing in the first place. */
    if (a.medium === 'midi' && could.size === 0) {
      const names = (transforms || []).map((t) => t.op);
      return { ok: false,
               why: 'these transforms drop everything, so the link would carry nothing.',
               fix: names.length
                 ? `The link runs ${names.join(', then ')}. Take one of them off.`
                 : `${a.label} sends nothing at all, so this link cannot be made.` };
    }
    const dropped = [...could].filter((c) => !b.accepts.includes(c));
    const carried = [...could].filter((c) => b.accepts.includes(c));
    if (a.medium === 'midi' && !carried.length) {
      return { ok: false, why: `${b.label} takes none of what this link carries.`,
               fix: b.accepts.length
                 ? `${b.label} takes ${b.accepts.join(', ')}, so send it one of those.`
                 : `${b.label} takes nothing at all, so nothing can ever reach it.` };
    }

    // Cycles, at node level, because hardware THRU can close one outside our view.
    if (reachesNode(nodeOf(b.id), nodeOf(a.id))) {
      return { ok: false, why: `that closes a loop: ${b.label} already reaches ${a.label}.`,
               fix: `Remove the link that already joins them, and then this one can be made.` };
    }
    const warns = [];
    if (stale(a) || stale(b)) {
      const p = stale(a) ? a : b;
      warns.push(`${p.label} has not been heard from for ${Math.round((now() - (p.seenAt ?? 0)) / 1000)}s`);
    }
    if (dropped.length) warns.push(`${b.label} will drop ${dropped.join(', ')}`);
    return { ok: true, why: '', ...(warns.length ? { warn: warns.join('. ') } : {}) };
  }

  /**
   * Can a signal standing at `startNode` reach `targetNode` through the links
   * that already exist.
   * 🔴 IT WALKS NODES, NOT PORTS, AND THE FIRST VERSION WALKED PORTS AND WAS
   * ALWAYS FALSE. It started from the proposed destination, which is an INPUT,
   * and then looked for links whose `from` was that port. No link ever starts
   * at an input, so the walk ended immediately and every cycle was allowed.
   * **The test caught it, which is what the test is for**: an arriving event is
   * at a NODE, and it leaves again through any output that node has.
   */
  function reachesNode(startNode, targetNode) {
    const seenNodes = new Set();
    const walk = (n) => {
      if (n === targetNode) return true;
      if (seenNodes.has(n)) return false;
      seenNodes.add(n);
      for (const l of links.values()) {
        if (nodeOf(l.from) !== n) continue;
        if (walk(nodeOf(l.to))) return true;
      }
      return false;
    };
    return walk(startNode);
  }
  const nodeOf = (id) => id.split(':').slice(0, 2).join(':');

  function link(fromId, toId, transforms = []) {
    const v = validate(fromId, toId, transforms);
    if (!v.ok) return { ok: false, why: v.why, fix: v.fix || '' };
    const id = `L${nextLink++}`;
    links.set(id, { id, from: fromId, to: toId, transforms, enabled: true, sent: 0, dropped: 0 });
    return { ok: true, id, why: '', warn: v.warn };
  }
  function unlink(id) { return links.delete(id); }

  /**
   * One event leaving one port.
   * 🔴 THE COUNTERS ARE AT BOTH ENDS ON PURPOSE. `link.sent` is what this side
   * queued and `port.heard` is what the far side took, and only the second one
   * is evidence: `createMidiLane`'s `scheduled()` counted what a page QUEUED and
   * read identically to delivery while every note was being scheduled fifty six
   * years out.
   */
  function send(fromId, ev) {
    seen(fromId);
    let out = 0;
    for (const l of links.values()) {
      if (l.from !== fromId || !l.enabled) continue;
      const e = apply(l.transforms, ev);
      if (!e) { l.dropped++; continue; }
      const dst = ports.get(l.to);
      if (!dst) continue;
      if (!dst.accepts.includes(e.cls)) { l.dropped++; continue; }   // the guard is at the destination
      l.sent++;
      dst.heard++;
      dst.deliver?.(e, l);
      out++;
    }
    return out;
  }

  return {
    addPort, validate, link, unlink, send, seen,
    port: (id) => ports.get(id),
    ports: () => [...ports.values()],
    links: () => [...links.values()],
    stale,
    text: () => printPatch([...links.values()]),
    /** Load a text patch. Returns every line that was refused, with its reason. */
    load(text) {
      const bad = [];
      for (const l of parsePatch(text)) {
        const r = link(l.from, l.to, l.transforms);
        if (!r.ok) bad.push({ line: printLink(l), why: r.why, fix: r.fix || '' });
      }
      return bad;
    },
  };
}

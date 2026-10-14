# workers-wish

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `workers/wish/src/index.js`

### index-header

Above `import { handle, corsFor, allowedOrigin } from './wish.mjs';`, lines 1 to 36 before the cut.

~~~js
// workers/wish — the deployable half. Everything it knows is in `wish.mjs`.
//
// 🔴 THIS FILE USED TO SAY THERE WAS NO HOSTNAME, AND THAT WAS THE RIGHT
// DEFAULT UNTIL SOMEBODY DECIDED OTHERWISE. Asked 2026-09-21: *"In bg can you
// take wish testing gindings, do fixes and do worker and make it working in
// prod"*, corrected to *"I meqn work in local dev"* and then corrected back to
// *"No actuall in prod"*. It is their account and their call, so this is on
// `wish.positron.studio` now, and the comment that used to sit here is the
// reason every line below exists.
//
// 🔴 WHAT IT COSTS TO CALL. Every request runs one Workers AI model on a paid
// account: `/hear` a Whisper and `/wish` a Llama. There is no cache, nothing is
// free, and a loop calling this spends money for as long as it runs.
//
// 🔴 SO THE FRONT DOOR IS DEFAULT DENY, IN THREE CHEAP LAYERS, AND ONLY ONE OF
// THEM IS WORTH ANYTHING AGAINST SOMEBODY TRYING.
//
//  1. **An `Origin` allowlist.** A browser sets that header and a page cannot
//     forge it, so this stops a stray tab on another site and a crawler, which
//     send the wrong origin or none at all. ⚠️ **IT IS NOT SECURITY AND MUST
//     NOT BE DESCRIBED AS SECURITY.** Anything that is not a browser sends
//     whatever it likes, so `curl -H 'origin: https://positron.studio'` walks
//     straight through. What it buys is that the accidents cannot happen.
//  2. **A rate limit per address.** This is the layer that bounds the bill when
//     somebody IS trying. ⚠️ Cloudflare's own documentation calls it
//     *"permissive, eventually consistent, and intentionally designed to not be
//     used as an accurate accounting system"*, and the counter is **per
//     location**: the real ceiling is this number times the number of data
//     centres a caller can reach, not this number. It is a brake, not a gate.
//  3. **A size ceiling on the body.** `/hear` carries base64 audio and the
//     older two models take a byte array at 3.57 bytes per byte, so an
//     unbounded body is an unbounded prompt on somebody else's meter.
//
// ⚠️ AND THE PAGE STILL POINTS AT `demo/wish-local.mjs` WHEN IT IS SERVED FROM
// THIS MACHINE. See `demo/wish/index.html`: the default follows where the page
// came from, and `?api=` overrides both.
~~~

### max-body

Above `const MAX_BODY = 1_000_000;`, lines 39 to 55 before the cut.

~~~js
/**
 * 🔴 A BODY LARGER THAN THIS IS REFUSED BEFORE IT IS PARSED, AND THE NUMBER IS
 * ARITHMETIC RATHER THAN A ROUND FIGURE.
 *
 * Whisper is billed by the **audio minute**: `whisper-large-v3-turbo` is 46.63
 * neurons a minute and neurons are $0.011 a thousand. MEASURED on this page's
 * own recordings, one spoken sentence is 12,863 bytes of webm/opus for 3.68 s,
 * which is about 28 kbit/s, so a megabyte of body is roughly **three and a half
 * minutes** of speech, 163 neurons, about **$0.0018** for one call.
 *
 * ⚠️ **THE FIRST DRAFT OF THIS SAID FOUR MEGABYTES AND THE ARITHMETIC IS WHY
 * IT DOES NOT.** At four megabytes one call is fourteen minutes of audio, and
 * the rate limit next door allows thirty of those a minute, which is about
 * **fifteen dollars an hour** from one address in one Cloudflare location. At
 * one megabyte the same worst case is about three. Neither number is a real
 * utterance: an instruction to a desk is a sentence.
 */
~~~

### refusal

Above `if (!allowedOrigin(origin)) {`, lines 72 to 73 before the cut.

~~~js
/* 🔴 THE REFUSAL SAYS WHAT IS WRONG AND NOT WHAT IS ALLOWED. A list of
   origins in an error body is a list of headers to try. */
~~~

### address

Above `if (env.WISH_RATE) {`, lines 82 to 85 before the cut.

~~~js
/* ⚠️ THE ADDRESS COMES FROM `cf-connecting-ip`, WHICH CLOUDFLARE SETS AND
   OVERWRITES. A header a caller supplies is a rate limit a caller opts out
   of. An empty one falls back to a single shared bucket rather than to no
   limit, because the default has to be the safe side. */
~~~

## `workers/wish/src/wish-test.mjs`

### test-header

Above `import { handle, relabel, PATCH, HEAR, hearPayload, allowedOrigin, corsFor } fro`..., lines 1 to 15 before the cut.

~~~js
// workers/wish/src/wish-test.mjs — the prompt and the repair, with no model and
// no browser.  `node workers/wish/src/wish-test.mjs`
//
// 🔴 IT EXISTS BECAUSE THE PAGE CANNOT REACH THIS CODE. `demo/wish/index.html`
// is served out of `demo/` and `build.mjs` only deploys what is under it, so a
// page importing `../../workers/wish/src/wish.mjs` would be a 404 on the deploy.
// The two things worth grading here are pure functions of their arguments, and a
// check nobody can run is a check nobody runs.
//
// 🔴 AND IT DRIVES `handle()` RATHER THAN THE INTERNALS. `systemFor` and
// `schemaFor` are not exported on purpose: what matters is the payload that
// actually leaves for a model, and asking about it on the far side of that
// boundary is the difference between counting what was queued and counting what
// was delivered. The runner is a stub that captures instead of calling, so this
// costs nobody's account anything.
~~~

### maker-name

Above `is('the maker a person would say is in the prompt', prompt.includes('Evolution')`..., lines 50 to 54 before the cut.

~~~js
/**
 * 🔴 THE WORD SOMEBODY ACTUALLY SAID HAS TO BE IN THERE. Reported 2026-09-21:
 * *"connect evolution to circuit"* came back with no links, because the maker's
 * name was in none of the strings this prompt is built from.
 */
~~~

### alias-negative

Above `const ALIAS = '      also called:';`, lines 61 to 67 before the cut.

~~~js
/* ⚠️ THE NEGATIVE HALF, and it is the one that stops this being a prompt that
   says `also called:` about everything. A port with nothing to add gets no
   line, so the model is not handed an empty list to match against. */
/* ⚠️ MATCHED ON THE INDENT AND NOT ON THE WORDS, WHICH THE FIRST BUILD OF THIS
   GOT WRONG: it read the line after the plain port, and that is the SENTENCE
   explaining alias lines, which contains the phrase `also called` in quotes. A
   substring of a sentence about a thing is not the thing. */
~~~

### alias-enum

Above `const items = sent.payload.response_format.json_schema.properties.links.items;`, lines 83 to 87 before the cut.

~~~js
/**
 * 🔴 AN ALIAS MUST NEVER BECOME A PORT ID. The `enum` is what stopped a Moog
 * and a Prophet, neither of them on that desk, coming back as inventions in
 * 496 ms. An alias in that list is the invention arriving by invitation.
 */
~~~

### table

Above `{`, lines 95 to 105 before the cut.

~~~js
/**
 * 🔴 THE CHECK THIS FILE DID NOT HAVE, AND IT WOULD HAVE GONE RED THE HOUR
 * `range` WAS ADDED. 2026-09-21 the vocabulary grew from six transforms to nine
 * in `bay.mjs` and in the `enum` below, and the operator TABLE in the prompt
 * kept listing six. Nothing anywhere compared the two, so the model spent half a
 * day unable to say three words the code was waiting for, and what it said
 * instead was `only` eight times in one patch.
 * ⚠️ IT ASSERTS THE TABLE LINE, not merely that the word appears somewhere: the
 * facts paragraph a page sends can mention a transform in prose, and prose after
 * a worked example is not what a model copies.
 */
~~~

### table-negative

Above `const named = lines`, lines 121 to 124 before the cut.

~~~js
/* 🔴 NEGATIVE CONTROL. A check that only ever looks for what is there would
   pass a table containing a transform nobody implemented, which is the same
   drift pointing the other way: a model told about `quantize` would send one
   and `checkTransforms` would refuse it. */
~~~

### repair

Above `const r = relabel([{ from: 'a', to: 'b', transforms: [{ op: 'transpose', to: 1 }`..., lines 143 to 147 before the cut.

~~~js
/**
 * The repair, both directions. `transpose` takes `by`; this model writes `to`
 * on every run, and the boundary relabels it and SAYS it did, because a repair
 * nobody is told about is a rewrite.
 */
~~~

### absence

Above `const both = relabel([{ from: 'a', to: 'b', transforms: [{ op: 'transpose', to: `..., lines 153 to 155 before the cut.

~~~js
/* ⚠️ AND IT ONLY EVER FILLS AN ABSENCE. A model that sends both keys is left
   exactly as it was and refused by the validator on the page, which is the
   honest answer to an ambiguous patch. */
~~~

### payloads

Above `const b64 = 'AAEC';`, lines 167 to 171 before the cut.

~~~js
/**
 * Three listening models, two payload shapes, and one shape was sent to all
 * three until 2026-09-21. `turbo` takes base64 and understands options; the two
 * older ones take an array of byte values and take no options at all.
 */
~~~

### allowlist

Above `is('the site is allowed, with and without www',`, lines 189 to 197 before the cut.

~~~js
// ── who may spend the account ───────────────────────────────────────────────
//
// 🔴 THE ALLOWLIST IS GRADED BOTH WAYS OR IT IS NOT GRADED. A rule that
// answered `true` to everything passes any check that only asks whether the
// site gets in, and this one guards a paid account on a public hostname.
// ⚠️ AND THE HONEST CLAIM IS NARROW: an `Origin` header is a fact about a
// BROWSER. Anything that is not one sends whatever it likes, so what these
// asserts grade is that a stray page and a crawler are refused, never that
// somebody trying is.
~~~

### negative

Above `const no = [null, '', 'null', 'https://evil.example',`, lines 207 to 211 before the cut.

~~~js
/* 🔴 NEGATIVE CONTROL, AND THE LAST TWO ARE THE ONES A NAIVE RULE LETS
   THROUGH. A `startsWith` on the site would pass `positron.studio.evil.com`;
   an `includes` would pass `https://evil.com/?x=positron.studio`; and a
   subdomain rule written without an anchor would pass a workers.dev name
   under somebody else's account. */
~~~

## `workers/wish/src/wish.mjs`

### header

Above `/**`, lines 1 to 19 before the cut.

~~~js
// workers/wish/src/wish.mjs — speech in, a proposed patch out.
//
// 🔴 ONE COPY, TWO RUNNERS. The Worker calls `handle()` with `env.AI.run`, and
// `demo/wish-local.mjs` calls it with a fetch to the REST API, because
// `wrangler dev` will not run detached on this machine. **The prompt, the
// schema and the model allowlists live here and nowhere else**: this repository
// has paid twice for two copies of one function, and a prompt that drifts
// between two files is that defect with nothing to catch it.
//
// 🔴 IT PROPOSES AND IT NEVER CONNECTS. `plans/plan-patchbay.md` §5 argues why,
// and the measurement of 2026-09-21 is the evidence: asked to put the mod wheel
// on the master filter, the 70B produced a perfectly valid patch pointed at the
// WRONG INSTRUMENT. A validator cannot catch that, because there is nothing
// invalid about it. Only somebody reading it can.
//
// ⚠️ A SCHEMA CONSTRAINS SHAPE, NOT MEANING. The same run returned
// `{ op: 'transpose', to: 1 }`, valid and meaningless, because `transpose` takes
// `by`. `demo/shell/bay.mjs`'s `checkTransforms` is the wall for that, and it is
// on the PAGE rather than here, where a caller could skip it.
~~~

### who-calls

Above `const SITE = ['https://positron.studio', 'https://www.positron.studio'];`, lines 21 to 46 before the cut.

~~~js
/**
 * 🔴 WHO MAY CALL THIS, AND IT WAS `*` UNTIL IT HAD A HOSTNAME. While the only
 * way to reach this code was `demo/wish-local.mjs` on a laptop, an open
 * `access-control-allow-origin` cost nothing. On `wish.positron.studio` it is
 * an invitation, because every call spends a paid Workers AI account.
 *
 * ⚠️ **AN ORIGIN HEADER IS A FACT ABOUT A BROWSER AND NOTHING ELSE.** A page
 * cannot forge it, which is the whole of what this buys: another site's tab
 * cannot spend this account, and a crawler that sends no origin at all is
 * refused. **Anything that is not a browser sends whatever it likes.** So this
 * stops the accidents and stops nobody who is trying, and the thing that bounds
 * the bill in that case is the rate limit in `index.js`.
 *
 * ⚠️ THREE KINDS OF CALLER ARE ALLOWED AND EACH ONE IS A PAGE THIS PROJECT
 * SERVES.
 * - **The site**, which is the point of deploying this at all.
 * - **A page this account deployed**, because `workers_dev` stays true across
 *   this repository so every old link keeps resolving, and `/wish/` on that
 *   mirror is the same page.
 * - **A page on this machine or this network**, which is `node
 *   demo/server.mjs` and a phone on the same wifi looking at it. A stray page
 *   on the internet is not on a private address, so this loosens nothing the
 *   paragraph above did not already concede, and without it a phone cannot be
 *   used to try the page at all: it can reach the deployed agent and it can
 *   never reach a laptop's `127.0.0.1`.
 */
~~~

### cors

Above `export function corsFor(origin) {`, lines 57 to 61 before the cut.

~~~js
/**
 * The reply headers for one caller.
 * ⚠️ IT ECHOES THE ORIGIN RATHER THAN ANSWERING `*`, and it says `vary: origin`
 * so a cache cannot hand one caller's permission to another.
 */
~~~

### hear-shape

Above `export const HEAR_SHAPE = {`, lines 80 to 97 before the cut.

~~~js
/**
 * 🔴 THREE LISTENING MODELS DO NOT SHARE ONE PAYLOAD, AND ONE SHAPE WAS SENT
 * TO ALL THREE. Reported 2026-09-21: choosing `whisper` answered *"oneOf at '/'
 * not met, 0 matches: Type mismatch of '/', 'string' not in 'object', Type
 * mismatch of '/audio', 'array' not in 'string'"*, which is that model's schema
 * listing both of its branches and refusing a base64 string under `audio` on
 * each of them. `turbo` was the default, `turbo` takes base64, so nothing ever
 * pressed the other two.
 * - `base64`: `turbo`. It also understands `task`, `language` and `vad_filter`.
 * - `bytes`: the original `whisper` and `whisper-tiny-en`. `audio` is an array
 *   of byte values and there are no options at all, so voice activity
 *   detection goes with them.
 * ⚠️ **AND A BYTE ARRAY IS NOT A FREE SUBSTITUTION.** MEASURED on a 12,863 byte
 * recording of one spoken sentence: the base64 body is **17,202 bytes** (1.34x
 * the audio) and the array body is **45,895** (3.57x), so the older two spend
 * **2.67 times** as many bytes for the same utterance and meet any request
 * ceiling at well under half the length `turbo` can carry.
 */
~~~

### hear-payload

Above `export function hearPayload(model, audio, language) {`, lines 104 to 112 before the cut.

~~~js
/**
 * The payload for one listening model, shaped for that model.
 * 🔴 IT IS ONE FUNCTION BECAUSE TWO WOULD DRIFT. The Worker and
 * `demo/wish-local.mjs` both reach a model through `handle()`, so the shaping
 * has to be inside it rather than at either caller.
 * @param {string} model     one of HEAR
 * @param {string} audio     base64, which is what a browser can cheaply make
 * @param {string} [language]
 */
~~~

### vad

Above `vad_filter: true,`, lines 126 to 128 before the cut.

~~~js
// Voice activity detection, because a studio microphone is open in a room
// with a synth in it. ⚠️ `turbo` ONLY: the two older models take no
// options, so they transcribe the room along with the voice.
~~~

### patch

Above `export const PATCH = [`, lines 132 to 139 before the cut.

~~~js
/**
 * What turns a sentence into a patch.
 * 🔴 IT WAS CALLED `THINK` UNTIL 2026-09-21: *"replace "think" with something
 * else, more related to task at hand"*. The label a visitor reads is the reason
 * for the rename, and this name moves with it so the allowlist, the row and the
 * refusal below all say one word. `PATCH` is already this project's own word
 * for the output, in `printLink` and in `/bay/`.
 */
~~~

### vocabulary

Above `import { OP_NAMES, OP_HELP, CLASSES } from '../../../demo/shell/bay.mjs';`, lines 148 to 164 before the cut.

~~~js
/**
 * 🔴 THE VOCABULARY IS IMPORTED, AND IT WAS TYPED OUT HERE THREE TIMES.
 * 2026-09-21, reported by the owner: a patch came back as eight `only`s and was
 * refused with `only takes "cls" and was given "to"`. **That is what a model
 * says when it means *filter* and the only filter it has been shown is `only`.**
 * `range`, `vrange` and `fixed` had been added to `bay.mjs` and to the `enum`
 * below that same day and NOT to the operator table in `systemFor()`, which is
 * the part of this prompt that defines the format. So the code accepted nine
 * transforms and the model was choosing from six, silently, and the page
 * refused a patch that was otherwise correct.
 * ⚠️ **`CLASSES` WAS A FOURTH COPY** and was identical, which is the state every
 * duplicated list is in right up until it is not.
 * ⚠️ AND THE IMPORT REACHES OUT OF THE WORKER ON PURPOSE. `demo/shell/bay.mjs`
 * is pure logic with no DOM in it, wrangler bundles it, and `demo/wish-local.mjs`
 * resolves the same path from node. The alternative is this file holding a
 * second opinion about what a transform is, which is the defect being repaired.
 */
~~~

### loose-schema

Above `const ARG_PROPS = Object.fromEntries(`, lines 167 to 179 before the cut.

~~~js
/**
 * 🔴 THE LOOSE SCHEMA IS THE ONE THAT WORKS, AND THAT IS A MEASUREMENT RATHER
 * THAN A PREFERENCE. A tight schema with `anyOf` and one branch per transform
 * took the 70B from **1.6 s to 10.2 s** and made it emit the same transform over
 * and over until it ran out of tokens. Three runs, all the same. Constrained
 * decoding through a union is apparently expensive and it is not worth what it
 * buys, because `checkTransforms` catches the same faults for nothing.
 */
/**
 * Every argument any transform takes, typed once. `cls` is the only one that is
 * not a number, which `bay.mjs` already encodes in the same place it declares
 * the argument, so adding an op adds its arguments here with nobody typing them.
 */
~~~

### op-enum

Above `op: { type: 'string', enum: OP_NAMES },`, lines 204 to 209 before the cut.

~~~js
// ⚠️ A SCHEMA THAT LISTS EVERY ARGUMENT ANY OP CAN TAKE AND
// REQUIRES ONLY `op` IS DELIBERATE and is argued above: the
// tight `anyOf` was measured at 10.2 s against 1.6 and
// repeated itself three runs of three. What is NOT deliberate
// is typing the list, which is how `range`, `vrange` and
// `fixed` reached this enum and never reached the prompt.
~~~

### synonym

Above `const SYNONYM = {`, lines 225 to 279 before the cut.

~~~js
/**
 * 🔴 THE ONE MISTAKE THIS MODEL MAKES EVERY TIME, REPAIRED AT THE BOUNDARY AND
 * REPORTED RATHER THAN HIDDEN. Asked 2026-09-21 after seeing it a fourth time:
 * *"can we please kill it"*, then *"to and by"*, then *"keep it to?"*
 *
 * **The language keeps `by` and that is the answer to the question.** `to` is
 * an ABSOLUTE target and `by` is a RELATIVE shift: `channel to 1` means put it
 * on channel 1, `transpose by 1` means move it up a semitone, and
 * `transpose to 1` would mean transpose to note number 1, which is meaningless.
 * Standardising on `to` would make the patch language wrong in order to agree
 * with a model.
 *
 * 🔴 AND THE PROMPT WAS NEVER THE PROBLEM. It already said, in those words,
 * *"Use the argument name given above. transpose takes by, not to."* The model
 * did it anyway on every run. The cause is the SCHEMA's own shape: a link's
 * destination field is called `to`, and `channel to=N` is the first transform
 * listed, so `to` sits beside `transpose` twice in the most prominent places
 * there are. It is pattern matching, not misreading, and no amount of telling
 * it fixes that.
 * ⚠️ AND A TIGHTER SCHEMA IS MEASURABLY WORSE, ALREADY PAID FOR HERE: an
 * `anyOf` with one branch per operation took this model from 1.6 s to 10.2 s
 * and made it repeat one transform until the tokens ran out, three runs of
 * three. The loose schema plus an ordinary validator wins.
 *
 * ✅ SO: a known synonym is relabelled in ordinary code, which is where MEANING
 * belongs, and the repair is RETURNED so the page can say it happened. Nothing
 * is silently rewritten: *a model proposes and a person presses* survives only
 * if the person can see what the model actually said.
 * ⚠️ IT REPAIRS ONLY WHERE THE RIGHT KEY IS ABSENT, so a model that sends both
 * is left alone and refused by the validator, which is the honest answer to an
 * ambiguous patch.
 */
/**
 * 🔴 AND `range` JOINED IT ON THE DAY IT BECAME REACHABLE, WHICH IS THE SAME
 * DEFECT ARRIVING ON A NEW WORD WITHIN THE HOUR. MEASURED 2026-09-21, eight
 * runs across four shapes of this prompt: told the argument names in a table,
 * shown `{"op":"range","lo":36,"hi":47}` beside them, given a two-link worked
 * example carrying `"lo"` and `"hi"` in JSON, and finally shown the wrong form
 * as a counter-example, `llama-3.3-70b` wrote `{"op":"range","to":N}` **every
 * single run**. The counter-example measured WORSE: three runs, two still
 * wrong and one returning no links at all.
 * 🔴 **THE CAUSE IS THE SAME ONE THIS FILE ALREADY NAMES AND IT IS STRUCTURAL.**
 * A link is `{"from": …, "to": …}` and the model has just written one, so `to`
 * is the key in front of it. It is not misreading the table. It is completing
 * the JSON it is already inside.
 * ✅ **SO `from` AND `to` ARE READ AS THE BOUNDS, WHICH COSTS THE LANGUAGE
 * NOTHING**: `cc from=A to=B` already uses that exact pair for a numeric pair
 * in this same vocabulary, so *range from 0 to 7* is consistent with what is
 * here rather than a concession. `range` is open ended at either end since the
 * same day, so a lone `{"op":"range","to":7}` reads as **notes 0 to 7**, which
 * is what was asked for.
 * ⚠️ AND IT IS REPORTED IN WORDS LIKE EVERY OTHER REPAIR. A patch that arrives
 * saying something different from what the model wrote is a rewrite, and the
 * person pressing the button has to be able to see it happened.
 */
~~~

### aliases

Above `function systemFor(ports, facts, outs, ins) {`, lines 307 to 333 before the cut.

~~~js
/**
 * 🔴 A PORT MAY CARRY THE OTHER NAMES ITS ROOM USES FOR IT, AND WITHOUT THEM A
 * CORRECT INSTRUCTION GETS NOTHING. Reported 2026-09-21 with a screenshot:
 * *"connect evolution to circuit"* answered with an empty list. The model was
 * right and the vocabulary was wrong: CoreMIDI calls that port `MK-425C USB
 * MIDI Keyboard`, the instrument is an **Evolution MK-425C**, and the maker's
 * name was in none of the strings this prompt was built from. The last line
 * below fired exactly as written.
 * ⚠️ THE NAMES ARRIVE FROM THE CALLER AND ARE NEVER INVENTED HERE. A page knows
 * what is plugged in; this file is deployed and must not hold a fact about one
 * room. A port with no `also` gets no extra line, which is why the sabotage
 * that proves this is a desk with no aliases at all.
 * ⚠️ AND AN ALIAS NEVER REACHES THE `enum`. `outs` and `ins` are built from
 * `p.id` and nothing else, so what the model must CHOOSE from is still the real
 * ids. That is measured: a Moog and a Prophet neither of which is on the desk
 * came back as no links in 496 ms rather than as inventions, and an alias in
 * that list would be the invention arriving by invitation.
 */
/**
 * 🔴 `outs` AND `ins` ARE DERIVED ONCE AND HANDED IN, BECAUSE THEY WERE DERIVED
 * TWICE. This function computed its own pair for the worked example while
 * `handle()` computed another for the `enum`, from the same field, so the list
 * the model is SHOWN and the list it may CHOOSE FROM could disagree with
 * nothing to catch it. Found by sabotage: leaking an alias into this copy left
 * `node workers/wish/src/wish-test.mjs` fully green, because the enum it reads
 * came from the other one.
 */
~~~

### generated-table

Above `'Transforms. Each one is an object, written exactly like the example beside it:'`..., lines 352 to 360 before the cut.

~~~js
/* 🔴 GENERATED FROM `bay.mjs`, BECAUSE THE TYPED VERSION OF THIS TABLE
   LISTED SIX OF NINE FOR HALF A DAY AND A REFUSED PATCH IS WHAT IT COST.
   A transform the code accepts and the prompt omits is a word the model
   cannot say, and what it does instead is reach for the nearest thing it
   WAS shown, which was `only` eight times over. */
/* ⚠️ THE LEFT COLUMN IS THE JSON ITSELF, NOT A SIGNATURE. Measured twice
   the same day: `range lo=N hi=N` in this column and one worked example
   carrying `"to"` produced `{"op":"range","to":7}` on every run. The
   argument names were in front of it and it copied the example. */
~~~

### example

Above `'One link up a semitone onto channel 1 looks exactly like this:',`, lines 364 to 368 before the cut.

~~~js
/* ⚠️ A WORKED EXAMPLE RATHER THAN A FOURTH SENTENCE TELLING IT. The line
   that used to sit here said *"transpose takes by, not to"* in those words
   and the model still sent `to` on every run. `relabel` is what actually
   fixes it; this is here because an example costs nine tokens and a
   repaired patch costs a line of explanation on the page. */
~~~

### split

Above `'A split is TWO links '`, lines 373 to 392 before the cut.

~~~js
/* 🔴 A SECOND WORKED EXAMPLE, AND IT IS HERE BECAUSE OF A MEASUREMENT
   RATHER THAN A HUNCH. 2026-09-21, the hour the operator table stopped
   listing six of nine: the 70B immediately started reaching for `range`,
   chose the right port, the right note rows and the right channel, and
   wrote `{"op":"range","to":23}` then `{"op":"range","to":7}` because the
   only transform JSON it had ever been shown carried `"to"`. It is the same
   pattern match this file already documents for `transpose`, arriving on
   the new word within minutes, and the same answer applies: the note above
   saying which word goes where had been in the prompt for hours and the
   model wrote `to` on every run anyway. **An example is copied. A sentence
   is not.** So the two-argument shape gets its own line of JSON.
   ⚠️ AND IT IS A SPLIT RATHER THAN A ROW OF BUTTONS, because a split is the
   general shape and the row of buttons is one desk's instance of it. An
   example built from the thing that was just reported teaches the report. */
/* ⚠️ A JSON COUNTER-EXAMPLE WAS TRIED HERE AND MEASURED WORSE, SO IT IS
   NOT IN THE PROMPT. It read *`{"op":"range","to":0}` then
   `{"op":"range","to":7}` is WRONG*, naming the exact form eight runs had
   produced. Three runs after it: still wrong twice, and once **no links at
   all**, which is the one answer worse than a refused patch. Showing a
   model the mistake is showing it the mistake. */
~~~

### handle

Above `export async function handle(path, body, run) {`, lines 405 to 410 before the cut.

~~~js
/**
 * @param {string} path  '/hear' or '/wish'
 * @param {object} body  the parsed request body
 * @param {(model:string, payload:object)=>Promise<object>} run  how to reach a model
 * @returns {Promise<{status:number, body:object}>}
 */
~~~

### job

Above `if (!PATCH.includes(model)) return bad('not a patch model: ${model}');`, lines 425 to 427 before the cut.

~~~js
/* ⚠️ THIS MESSAGE REACHES A READER. `blame()` on the page prints whatever
   this end says, so the refusal names the job the row is labelled with
   rather than the word that row used to carry. */
~~~

### shape

Above `let out = r.response;`, lines 445 to 447 before the cut.

~~~js
// ⚠️ THE RESPONSE IS AN OBJECT FROM SOME MODELS AND A STRING OF JSON FROM
// OTHERS. MEASURED on one account within one hour, both shapes, which is
// why this is two lines rather than one.
~~~

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
const SITE = ['https://positron.studio', 'https://www.positron.studio'];
const OURS = /^https:\/\/[a-z0-9-]+\.kristjan-jansen\.workers\.dev$/;
const NEAR = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

/** @param {string|null} origin the request's `Origin` header, or null */
export function allowedOrigin(origin) {
  if (!origin) return false;              // not a browser, or a crawler
  return SITE.includes(origin) || OURS.test(origin) || NEAR.test(origin);
}

/**
 * The reply headers for one caller.
 * ⚠️ IT ECHOES THE ORIGIN RATHER THAN ANSWERING `*`, and it says `vary: origin`
 * so a cache cannot hand one caller's permission to another.
 */
export function corsFor(origin) {
  return {
    'access-control-allow-origin': allowedOrigin(origin) ? origin : 'https://positron.studio',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

/** What this will run, by job. An allowlist, because the name arrives from a
 *  browser and somebody's account is being spent. */
export const HEAR = [
  '@cf/openai/whisper-large-v3-turbo',
  '@cf/openai/whisper',
  '@cf/openai/whisper-tiny-en',
];

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
export const HEAR_SHAPE = {
  '@cf/openai/whisper-large-v3-turbo': 'base64',
  '@cf/openai/whisper': 'bytes',
  '@cf/openai/whisper-tiny-en': 'bytes',
};

/**
 * The payload for one listening model, shaped for that model.
 * 🔴 IT IS ONE FUNCTION BECAUSE TWO WOULD DRIFT. The Worker and
 * `demo/wish-local.mjs` both reach a model through `handle()`, so the shaping
 * has to be inside it rather than at either caller.
 * @param {string} model     one of HEAR
 * @param {string} audio     base64, which is what a browser can cheaply make
 * @param {string} [language]
 */
export function hearPayload(model, audio, language) {
  if (HEAR_SHAPE[model] === 'bytes') {
    // `atob` is in both runtimes. The intermediate string is the only way
    // across without a Buffer, which a Worker does not have.
    const bin = atob(audio);
    const bytes = new Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { audio: bytes };
  }
  return {
    audio,
    task: 'transcribe',
    ...(language ? { language } : {}),
    // Voice activity detection, because a studio microphone is open in a room
    // with a synth in it. ⚠️ `turbo` ONLY: the two older models take no
    // options, so they transcribe the room along with the voice.
    vad_filter: true,
  };
}
/**
 * What turns a sentence into a patch.
 * 🔴 IT WAS CALLED `THINK` UNTIL 2026-09-21: *"replace "think" with something
 * else, more related to task at hand"*. The label a visitor reads is the reason
 * for the rename, and this name moves with it so the allowlist, the row and the
 * refusal below all say one word. `PATCH` is already this project's own word
 * for the output, in `printLink` and in `/bay/`.
 */
export const PATCH = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/meta/llama-4-scout-17b-16e-instruct',
];

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
import { OP_NAMES, OP_HELP, CLASSES } from '../../../demo/shell/bay.mjs';

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
const ARG_PROPS = Object.fromEntries(
  [...new Set(OP_HELP.flatMap((o) => o.args))]
    .map((a) => [a, a === 'cls' ? { type: 'string', enum: CLASSES } : { type: 'number' }]),
);

/** Width of the widest signature, so the table lines up without a magic number. */
const PAD = Math.max(...OP_HELP.map((o) => o.json.length));

function schemaFor(outs, ins) {
  return {
    type: 'object',
    properties: {
      links: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string', enum: outs },
            to: { type: 'string', enum: ins },
            transforms: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  // ⚠️ A SCHEMA THAT LISTS EVERY ARGUMENT ANY OP CAN TAKE AND
                  // REQUIRES ONLY `op` IS DELIBERATE and is argued above: the
                  // tight `anyOf` was measured at 10.2 s against 1.6 and
                  // repeated itself three runs of three. What is NOT deliberate
                  // is typing the list, which is how `range`, `vrange` and
                  // `fixed` reached this enum and never reached the prompt.
                  op: { type: 'string', enum: OP_NAMES },
                  ...ARG_PROPS,
                },
                required: ['op'],
              },
            },
          },
          required: ['from', 'to', 'transforms'],
        },
      },
    },
    required: ['links'],
  };
}

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
const SYNONYM = {
  transpose: { to: 'by' },
  range: { from: 'lo', to: 'hi' },
  vrange: { from: 'lo', to: 'hi' },
};

export function relabel(links) {
  const fixed = [];
  const out = (Array.isArray(links) ? links : []).map((l) => {
    const transforms = (Array.isArray(l?.transforms) ? l.transforms : []).map((t) => {
      const map = SYNONYM[t?.op];
      if (!map) return t;
      const next = { ...t };
      for (const [wrong, right] of Object.entries(map)) {
        if (next[wrong] !== undefined && next[right] === undefined) {
          next[right] = next[wrong];
          delete next[wrong];
          fixed.push({ op: t.op, said: wrong, read: right, value: next[right] });
        }
      }
      return next;
    });
    return { ...l, transforms };
  });
  return { links: out, fixed };
}

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
function systemFor(ports, facts, outs, ins) {
  const alsoOf = (p) => (Array.isArray(p.also) ? p.also : [])
    .filter((a) => typeof a === 'string' && a.trim());
  const line = (p) => {
    const head = `  ${p.id} : ${p.label}${p.dir === 'in' ? ' (receives)' : ' (sends)'}`;
    const also = alsoOf(p);
    return also.length ? `${head}\n      also called: ${also.join(', ')}` : head;
  };
  const anyAlso = ports.some((p) => alsoOf(p).length > 0);
  return [
    'You turn a spoken studio instruction into patch bay links. Output only links.',
    'The ports on this desk:',
    ...ports.map(line),
    /* Said once and only where it applies: a desk whose ports carry no other
       names must not be told to match against a list that is not there. */
    ...(anyAlso ? ['An "also called" line lists other names people in this room use for that '
      + 'instrument. Match an instruction against those as well as the label, and answer '
      + 'with the id.'] : []),
    /* 🔴 GENERATED FROM `bay.mjs`, BECAUSE THE TYPED VERSION OF THIS TABLE
       LISTED SIX OF NINE FOR HALF A DAY AND A REFUSED PATCH IS WHAT IT COST.
       A transform the code accepts and the prompt omits is a word the model
       cannot say, and what it does instead is reach for the nearest thing it
       WAS shown, which was `only` eight times over. */
    /* ⚠️ THE LEFT COLUMN IS THE JSON ITSELF, NOT A SIGNATURE. Measured twice
       the same day: `range lo=N hi=N` in this column and one worked example
       carrying `"to"` produced `{"op":"range","to":7}` on every run. The
       argument names were in front of it and it copied the example. */
    'Transforms. Each one is an object, written exactly like the example beside it:',
    ...OP_HELP.map((o) => `  ${o.json.padEnd(PAD)} ${o.help}`),
    `A class C is one of: ${CLASSES.join(', ')}.`,
    /* ⚠️ A WORKED EXAMPLE RATHER THAN A FOURTH SENTENCE TELLING IT. The line
       that used to sit here said *"transpose takes by, not to"* in those words
       and the model still sent `to` on every run. `relabel` is what actually
       fixes it; this is here because an example costs nine tokens and a
       repaired patch costs a line of explanation on the page. */
    'One link up a semitone onto channel 1 looks exactly like this:',
    `  {"from": "${outs[0]}", "to": "${ins[0]}", `
      + '"transforms": [{"op": "transpose", "by": 1}, {"op": "channel", "to": 1}]}',
    'Note "by" for transpose and "to" for channel. They are different words.',
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
    'A split is TWO links '
      + 'between the same pair of ports rather than one link with two ranges:',
    `  {"from": "${outs[0]}", "to": "${ins[0]}", `
      + '"transforms": [{"op": "range", "lo": 0, "hi": 59}, {"op": "channel", "to": 1}]}',
    `  {"from": "${outs[0]}", "to": "${ins[0]}", `
      + '"transforms": [{"op": "range", "lo": 60, "hi": 127}, {"op": "channel", "to": 2}]}',
    facts || '',
    'If the instruction names nothing on this desk, return an empty list of links.',
  ].join('\n');
}


/**
 * @param {string} path  '/hear' or '/wish'
 * @param {object} body  the parsed request body
 * @param {(model:string, payload:object)=>Promise<object>} run  how to reach a model
 * @returns {Promise<{status:number, body:object}>}
 */
export async function handle(path, body, run) {
  const bad = (error, status = 400) => ({ status, body: { error } });

  if (path === '/hear') {
    const model = body.model || HEAR[0];
    if (!HEAR.includes(model)) return bad(`not a listening model: ${model}`);
    if (!body.audio) return bad('audio is base64');
    const t0 = Date.now();
    const r = await run(model, hearPayload(model, body.audio, body.language));
    return { status: 200, body: { text: r.text ?? '', words: r.word_count ?? null, ms: Date.now() - t0, model } };
  }

  if (path === '/wish') {
    const model = body.model || PATCH[0];
    /* ⚠️ THIS MESSAGE REACHES A READER. `blame()` on the page prints whatever
       this end says, so the refusal names the job the row is labelled with
       rather than the word that row used to carry. */
    if (!PATCH.includes(model)) return bad(`not a patch model: ${model}`);
    const ports = Array.isArray(body.ports) ? body.ports : [];
    if (!ports.length) return bad('send the ports, or there is nothing to name');
    /* The one derivation. Both the worked example in the prompt and the `enum`
       the model must choose from read these, so they cannot drift apart. */
    const outs = ports.filter((p) => p.dir === 'out').map((p) => p.id);
    const ins = ports.filter((p) => p.dir === 'in').map((p) => p.id);
    if (!outs.length || !ins.length) return bad('a desk needs something that sends and something that receives');
    const t0 = Date.now();
    const r = await run(model, {
      messages: [
        { role: 'system', content: systemFor(ports, body.facts, outs, ins) },
        { role: 'user', content: String(body.text || '') },
      ],
      response_format: { type: 'json_schema', json_schema: schemaFor(outs, ins) },
      max_tokens: 400,
    });
    // ⚠️ THE RESPONSE IS AN OBJECT FROM SOME MODELS AND A STRING OF JSON FROM
    // OTHERS. MEASURED on one account within one hour, both shapes, which is
    // why this is two lines rather than one.
    let out = r.response;
    if (typeof out === 'string') { try { out = JSON.parse(out); } catch { out = null; } }
    const { links, fixed } = relabel(out?.links ?? []);
    return { status: 200, body: {
      links,
      /* What the model actually said, where this repaired it. The page prints
         it, because a repair nobody is told about is a rewrite. */
      fixed,
      raw: typeof r.response === 'string' ? r.response : null,
      usage: r.usage ?? null, ms: Date.now() - t0, model,
    } };
  }

  return bad('no such path', 404);
}

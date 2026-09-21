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

export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

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
export const THINK = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/meta/llama-4-scout-17b-16e-instruct',
];

const CLASSES = ['note', 'cc', 'bend', 'touch', 'program', 'clock', 'sysex'];

/**
 * 🔴 THE LOOSE SCHEMA IS THE ONE THAT WORKS, AND THAT IS A MEASUREMENT RATHER
 * THAN A PREFERENCE. A tight schema with `anyOf` and one branch per transform
 * took the 70B from **1.6 s to 10.2 s** and made it emit the same transform over
 * and over until it ran out of tokens. Three runs, all the same. Constrained
 * decoding through a union is apparently expensive and it is not worth what it
 * buys, because `checkTransforms` catches the same faults for nothing.
 */
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
                  op: { type: 'string', enum: ['channel', 'transpose', 'velocity', 'only', 'drop', 'cc'] },
                  to: { type: 'number' }, by: { type: 'number' }, scale: { type: 'number' },
                  cls: { type: 'string', enum: CLASSES }, from: { type: 'number' }, ch: { type: 'number' },
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
const SYNONYM = { transpose: { to: 'by' } };

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

function systemFor(ports, facts) {
  const outs = ports.filter((p) => p.dir === 'out').map((p) => p.id);
  const ins = ports.filter((p) => p.dir === 'in').map((p) => p.id);
  const line = (p) => `  ${p.id} : ${p.label}${p.dir === 'in' ? ' (receives)' : ' (sends)'}`;
  return [
    'You turn a spoken studio instruction into patch bay links. Output only links.',
    'The ports on this desk:',
    ...ports.map(line),
    'Transforms, each an object with "op" and its own argument:',
    '  channel to=N        put every message on MIDI channel N',
    '  transpose by=N      move notes by N semitones, N may be negative',
    '  velocity scale=F    multiply note-on velocity',
    '  only cls=C          keep only that class',
    '  drop cls=C          drop that class',
    '  cc from=A to=B ch=N move controller A to controller B, optionally onto channel N',
    /* ⚠️ A WORKED EXAMPLE RATHER THAN A FOURTH SENTENCE TELLING IT. The line
       that used to sit here said *"transpose takes by, not to"* in those words
       and the model still sent `to` on every run. `relabel` is what actually
       fixes it; this is here because an example costs nine tokens and a
       repaired patch costs a line of explanation on the page. */
    'One link up a semitone onto channel 1 looks exactly like this:',
    `  {"from": "${outs[0]}", "to": "${ins[0]}", `
      + '"transforms": [{"op": "transpose", "by": 1}, {"op": "channel", "to": 1}]}',
    'Note "by" for transpose and "to" for channel. They are different words.',
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
    const model = body.model || THINK[0];
    if (!THINK.includes(model)) return bad(`not a thinking model: ${model}`);
    const ports = Array.isArray(body.ports) ? body.ports : [];
    if (!ports.length) return bad('send the ports, or there is nothing to name');
    const outs = ports.filter((p) => p.dir === 'out').map((p) => p.id);
    const ins = ports.filter((p) => p.dir === 'in').map((p) => p.id);
    if (!outs.length || !ins.length) return bad('a desk needs something that sends and something that receives');
    const t0 = Date.now();
    const r = await run(model, {
      messages: [
        { role: 'system', content: systemFor(ports, body.facts) },
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

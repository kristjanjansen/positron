// Speech in, a proposed patch out. One copy, two runners (the Worker and demo/wish-local.mjs), so
// the prompt, schema and model allowlists live here only. It proposes and never connects: a valid
// patch can point at the wrong instrument, and bay.mjs's checkTransforms runs on the page.
// why: lessons/workers-wish.md#header

// Who may call: the site, this account's workers.dev mirrors, and a page on this machine or LAN
// (a phone on the wifi). An Origin header binds browsers only; the rate limit bounds the bill.
// why: lessons/workers-wish.md#who-calls
const SITE = ['https://positron.studio', 'https://www.positron.studio'];
const OURS = /^https:\/\/[a-z0-9-]+\.kristjan-jansen\.workers\.dev$/;
const NEAR = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

/** @param {string|null} origin the request's `Origin` header, or null */
export function allowedOrigin(origin) {
  if (!origin) return false;              // not a browser, or a crawler
  return SITE.includes(origin) || OURS.test(origin) || NEAR.test(origin);
}

// Echo the origin rather than `*`, with `vary: origin` so a cache cannot share a permission.
// why: lessons/workers-wish.md#cors
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

// Listening models take different payloads: `turbo` base64 (with task, language, vad_filter),
// the older two an array of byte values and no options. The array costs 3.57x the audio bytes.
// why: lessons/workers-wish.md#hear-shape
export const HEAR_SHAPE = {
  '@cf/openai/whisper-large-v3-turbo': 'base64',
  '@cf/openai/whisper': 'bytes',
  '@cf/openai/whisper-tiny-en': 'bytes',
};

// The payload for one listening model; one function so the Worker and wish-local cannot drift.
// Takes model (one of HEAR), audio (base64) and an optional language.
// why: lessons/workers-wish.md#hear-payload
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
    // Voice activity detection, since a studio microphone hears the synth. `turbo` only.
    // why: lessons/workers-wish.md#vad
    vad_filter: true,
  };
}
// The models that turn a sentence into a patch.
// why: lessons/workers-wish.md#patch
export const PATCH = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/meta/llama-4-scout-17b-16e-instruct',
];

// The transform vocabulary is imported from bay.mjs (pure logic, bundled by wrangler), never
// typed here: a copy that drifts is a transform the model cannot say.
// why: lessons/workers-wish.md#vocabulary
import { OP_NAMES, OP_HELP, CLASSES } from '../../../demo/shell/bay.mjs';

// The loose schema is measured: an `anyOf` per transform took the 70B from 1.6 s to 10.2 s and
// made it loop. Every argument any transform takes is typed once, from bay.mjs.
// why: lessons/workers-wish.md#loose-schema
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
                  // Lists every argument and requires only `op`, on purpose (see loose-schema); the
                  // list is derived.
                  // why: lessons/workers-wish.md#op-enum
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

// The model writes `to` where an op takes `by` (transpose) or `lo`/`hi` (range), every run, because
// a link's own field is `to`. A known synonym is relabelled here only when the right key is
// absent, and every repair is returned so the page can show it.
// why: lessons/workers-wish.md#synonym
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

// A port may carry its room's other names (`also`), from the caller, never invented here; aliases
// reach the prompt but never the enum. `outs` and `ins` are derived once and handed in.
// why: lessons/workers-wish.md#aliases
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
    // Generated from bay.mjs, so the prompt lists every transform the code accepts. The left column
    // is the JSON itself, because the model copies examples, not signatures.
    // why: lessons/workers-wish.md#generated-table
    'Transforms. Each one is an object, written exactly like the example beside it:',
    ...OP_HELP.map((o) => `  ${o.json.padEnd(PAD)} ${o.help}`),
    `A class C is one of: ${CLASSES.join(', ')}.`,
    // A worked example rather than a sentence: the model copies examples; relabel does the fixing.
    // why: lessons/workers-wish.md#example
    'One link up a semitone onto channel 1 looks exactly like this:',
    `  {"from": "${outs[0]}", "to": "${ins[0]}", `
      + '"transforms": [{"op": "transpose", "by": 1}, {"op": "channel", "to": 1}]}',
    'Note "by" for transpose and "to" for channel. They are different words.',
    // A second example with a two-argument shape, since an example is copied and a sentence is not.
    // A JSON counter-example measured worse (once no links at all), so it is not here.
    // why: lessons/workers-wish.md#split
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


// handle(path '/hear' or '/wish', parsed body, run(model, payload)) -> {status, body}.
// why: lessons/workers-wish.md#handle
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
    // This message reaches a reader through the page's `blame()`, so it names the job.
    // why: lessons/workers-wish.md#job
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
    // Some models return an object and others a string of JSON, measured within one hour.
    // why: lessons/workers-wish.md#shape
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

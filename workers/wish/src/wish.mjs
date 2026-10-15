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

// Whisper's prompt window is 224 tokens and a name is two or three, so 400 characters holds the
// site's names with room left and cannot become a second request body.
export const PROMPT_MAX = 400;

/** The words a page wants heard as written (Rhodes, not roads), as one `initial_prompt` string or ''. */
export function vocabularyPrompt(words) {
  const list = (Array.isArray(words) ? words : [])
    .filter((w) => typeof w === 'string').map((w) => w.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let out = '';
  for (const w of [...new Set(list)]) {
    const next = out ? `${out}, ${w}` : w;
    if (next.length > PROMPT_MAX) break;
    out = next;
  }
  return out;
}

// The payload for one listening model; one function so the Worker and wish-local cannot drift.
// Takes model (one of HEAR), audio (base64), an optional language and the page's vocabulary,
// which only `turbo` takes (as `initial_prompt`); the older two get none.
// why: lessons/workers-wish.md#hear-payload
export function hearPayload(model, audio, language, vocabulary) {
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
    ...(vocabularyPrompt(vocabulary) ? { initial_prompt: vocabularyPrompt(vocabulary) } : {}),
  };
}
// The models that turn a sentence into a patch.
// why: lessons/workers-wish.md#patch
// kimi-k2.6 first: 71% right against the 70B's 50% on the owner's 19 sentences, 2.4 s median, about
// $1.06 per 1000 asks (research/stt-and-patch-models-2026-10-15.md, 646 calls).
export const PATCH = [
  '@cf/moonshotai/kimi-k2.6',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/meta/llama-4-scout-17b-16e-instruct',
];

// Per model: a thinking model spends its tokens on thought unless told not to (all of them answered
// zero links at 400 tokens). 1500 because 400 cut 20 of 228 answers mid-JSON, which read as nothing proposed.
const PATCH_EXTRA = { '@cf/moonshotai/kimi-k2.6': { chat_template_kwargs: { thinking: false } } };
export const PATCH_MAX_TOKENS = 1500;

/** The JSON object in a model's text: the whole text, else a fenced block, else the outermost braces; null if none. */
export function jsonIn(text) {
  const t = String(text || '').trim();
  for (const c of [t, /```(?:json)?\s*([\s\S]*?)```/.exec(t)?.[1], t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)]) {
    if (!c) continue;
    try { const j = JSON.parse(c); if (j && typeof j === 'object') return j; } catch { /* the next shape */ }
  }
  return null;
}

/** Exact repeats of a link dropped (one model wrote a speaker link 8 times), the count said in `fixed`. */
export function dedupe(links, fixed = []) {
  const seen = new Set();
  const out = links.filter((l) => { const k = JSON.stringify([l.from, l.to, l.transforms]); if (seen.has(k)) return false; seen.add(k); return true; });
  const n = links.length - out.length;
  if (n) fixed.push({ op: 'links', said: `${n} repeated link${n === 1 ? '' : 's'}`, read: 'one of each', value: n });
  return out;
}

// The transform vocabulary is imported from bay.mjs (pure logic, bundled by wrangler), never
// typed here: a copy that drifts is a transform the model cannot say.
// why: lessons/workers-wish.md#vocabulary
import { OP_NAMES, OP_HELP, CLASSES } from '../../../demo/shell/bay.mjs';

// The loose schema is measured: an `anyOf` per transform took the 70B from 1.6 s to 10.2 s and
// made it loop. Every argument any transform takes is typed once, from bay.mjs.
// why: lessons/workers-wish.md#loose-schema
const ARG_PROPS = Object.fromEntries(
  [...new Set(OP_HELP.flatMap((o) => o.args))]
    .map((a) => [a, a === 'cls' ? { type: 'string', enum: CLASSES } : a === 'name' ? { type: 'string' } : { type: 'number' }]),
);

/** Width of the widest signature, so the table lines up without a magic number. */
const PAD = Math.max(...OP_HELP.map((o) => o.json.length));

function schemaFor(outs, ins, params = null) {
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
      // Rows like links, node and param from enums: a free object was filled with every param at 0
      // (2026-10-15). After links, not before: listed first, "make it darker" became a link into
      // value-in; listed here, it set cutoff 200 in 3 of 3 replays. Ranges are the page's to check.
      ...(params ? { settings: { type: 'array', items: { type: 'object', properties: {
        node: { type: 'string', enum: params.nodes }, param: { type: 'string', enum: params.names }, value: { type: 'number' },
      }, required: ['node', 'param', 'value'] } } } : {}),
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
  patch: { to: 'name' },
};

// A port's patch list reaches the worker in its label, `... midi-in (patches: Piano, Rhodes)`
// (demo/shell/patch-names.mjs withPatches), or as a `patches` array.
const PATCHES_RE = /\(patches: ([^)]*)\)/;
const MIDI_IN = /:midi-in(?:-\d+)?$/;
const patchesOf = (p) => (Array.isArray(p?.patches) ? p.patches
  : (PATCHES_RE.exec(String(p?.label || ''))?.[1] || '').split(',')).map((x) => String(x).trim()).filter(Boolean);
const nodeOfPort = (id) => String(id).replace(/:[^:]+$/, '');

/**
 * A patch transform on a link that is not into a midi-in (kimi wrote `plaits:audio-out -> mix:audio-in
 * { patch "Soft FM" }`) moves to the MIDI link into the node whose patch list has that name, or is dropped.
 */
export function movePatches(links, ports = [], fixed = []) {
  // With no ports there is nothing to read a patch list from, so nothing moves.
  if (!Array.isArray(ports) || !ports.length) return links;
  const lists = ports.filter((p) => p?.dir === 'in' && MIDI_IN.test(String(p.id)))
    .map((p) => ({ id: p.id, names: patchesOf(p) })).filter((p) => p.names.length);
  for (const l of links) {
    if (MIDI_IN.test(String(l.to))) continue;
    const stray = l.transforms.filter((t) => t?.op === 'patch');
    if (!stray.length) continue;
    l.transforms = l.transforms.filter((t) => t?.op !== 'patch');
    for (const t of stray) {
      const want = String(t.name ?? '').trim().toLowerCase();
      const hits = lists.filter((p) => p.names.some((n) => n.toLowerCase() === want));
      // The node the stray link leaves from first: plaits:audio-out names Plaits.
      const ports_ = [...hits.filter((p) => nodeOfPort(p.id) === nodeOfPort(l.from)), ...hits];
      const into = ports_.map((p) => ({ p, link: links.find((x) => x.to === p.id) })).find((x) => x.link);
      const said = `patch "${t.name}" on ${l.from} -> ${l.to}`;
      if (!into) { fixed.push({ op: 'patch', said, read: 'dropped: no MIDI link into an instrument with that patch', value: t.name }); continue; }
      const name = into.p.names.find((n) => n.toLowerCase() === want);
      if (!into.link.transforms.some((x) => x?.op === 'patch')) into.link.transforms.push({ op: 'patch', name });
      fixed.push({ op: 'patch', said, read: `on ${into.link.from} -> ${into.link.to}`, value: name });
    }
  }
  return links;
}

export function relabel(links, ports = []) {
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
  movePatches(out, ports, fixed);
  return { links: out, fixed };
}

// A port may carry its room's other names (`also`), from the caller, never invented here; aliases
// reach the prompt but never the enum. `outs` and `ins` are derived once and handed in.
// why: lessons/workers-wish.md#aliases
// A value-in whose label lists `params:` takes settings; the words and the example are said only then.
const PARAMS_RE = /\(params: ([^)]*)\)/;
const paramsPort = (ports) => ports.find((p) => p.dir === 'in' && PARAMS_RE.test(String(p.label || '')));
const PARAM_ROW = /^(.+?) (-?[\d.]+)\.\.(-?[\d.]+)$/;
/** The nodes whose value-in lists params, and every param name listed, or null when none does. */
export function paramsOf(ports) {
  const with_ = ports.filter((p) => p.dir === 'in' && PARAMS_RE.test(String(p.label || '')));
  if (!with_.length) return null;
  const names = with_.flatMap((p) => PARAMS_RE.exec(p.label)[1].split(',').map((x) => (PARAM_ROW.exec(x.trim())?.[1] ?? x.trim())));
  return { nodes: [...new Set(with_.map((p) => p.id.replace(/:[^:]+$/, '')))], names: [...new Set(names)].filter(Boolean) };
}

function systemFor(ports, facts, outs, ins, followUp = false) {
  const alsoOf = (p) => (Array.isArray(p.also) ? p.also : [])
    .filter((a) => typeof a === 'string' && a.trim());
  const line = (p) => {
    const head = `  ${p.id} : ${p.label}${p.dir === 'in' ? ' (receives)' : ' (sends)'}`;
    const also = alsoOf(p);
    return also.length ? `${head}\n      also called: ${also.join(', ')}` : head;
  };
  const anyAlso = ports.some((p) => alsoOf(p).length > 0);
  return [
    `You turn a spoken studio instruction into patch bay links. Output only links${paramsPort(ports) ? ' and, where asked, settings' : ''}.`,
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
    ...settingsLines(ports),
    facts || '',
    // The one sentence a follow-up adds: the answer replaces the patch, so it must carry what stays.
    ...(followUp ? [FOLLOW_UP] : []),
    'If the instruction names nothing on this desk, return an empty list of links.',
  ].join('\n');
}

export const FOLLOW_UP = 'This continues a conversation: answer with the whole new patch, keeping every link of the patch now '
  + 'that the instruction does not change, and give settings only for what it changes.';

function settingsLines(ports) {
  const p = paramsPort(ports);
  if (!p) return [];
  const node = p.id.replace(/:[^:]+$/, '');
  const first = PARAM_ROW.exec(PARAMS_RE.exec(p.label)[1].split(',')[0].trim());
  const mid = first ? +((Number(first[2]) + Number(first[3])) / 2).toPrecision(2) : 0;
  return [
    'A value-in whose label lists params takes settings, one row per param, the value a number inside its range. '
      + 'Give settings only when the instruction asks for a change in how something sounds; most answers have none. '
      + 'A named sound is a patch on the link, never a setting, and a setting is never a link into a value-in. '
      + 'A setting row looks exactly like this:',
    `  "settings": [{"node": "${node}", "param": "${first ? first[1] : 'name'}", "value": ${mid}}]`,
  ];
}

/** History turns and the patch now, as the page sends them: the last HISTORY_MAX, each capped. */
export const HISTORY_MAX = 4;
const LINKS_MAX = 48, SAID_MAX = 500;
const linkShape = (l) => l && typeof l.from === 'string' && typeof l.to === 'string'
  && (l.transforms === undefined || Array.isArray(l.transforms));
const linksOf = (links) => links.slice(0, LINKS_MAX).map((l) => ({ from: l.from, to: l.to, transforms: l.transforms || [] }));
/** Settings by node, as the page keeps them, written as the rows the model answers in. */
const rowsOf = (s) => (s && typeof s === 'object' && !Array.isArray(s)
  ? Object.entries(s).flatMap(([node, set]) => Object.entries(set || {}).map(([param, value]) => ({ node, param, value }))) : []);
const answerOf = (links, settings) => { const rows = rowsOf(settings); return JSON.stringify({ links: linksOf(links), ...(rows.length ? { settings: rows } : {}) }); };

// A named sound written as a setting ({"patch": "sawtooth"}, measured on the first follow-up run,
// 2026-10-15) is moved to a patch transform on the link into that node's midi-in, and said in `fixed`.
const SOUND_KEYS = ['patch', 'wave', 'preset', 'program', 'sound'];

/**
 * The model's settings by node, as the page applies them: from rows (the schema's shape) or from an
 * object of objects; a node written as its port id is read as the node.
 */
export function settingsFrom(out, fixed = [], links = []) {
  let s = out?.settings;
  if (Array.isArray(s)) {
    const by = {};
    for (const r of s) if (r && typeof r.node === 'string' && typeof r.param === 'string') (by[r.node] ||= {})[r.param] = r.value;
    s = by;
  }
  if (!s || typeof s !== 'object') return {};
  const clean = {};
  for (const [k, v] of Object.entries(s)) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
    const node = k.replace(/:value-in$/, '');
    if (node !== k) fixed.push({ op: 'settings', said: k, read: node, value: v });
    const keep = { ...v };
    for (const key of SOUND_KEYS) {
      const name = keep[key], into = links.filter((l) => l.to === `${node}:midi-in`);
      if (typeof name !== 'string' || !into.length) continue;
      for (const l of into) if (!l.transforms.some((t) => t?.op === 'patch')) l.transforms.push({ op: 'patch', name });
      delete keep[key];
      fixed.push({ op: 'settings', said: `${key} ${name}`, read: `a patch on the link into ${node}:midi-in`, value: name });
    }
    if (Object.keys(keep).length) clean[node] = { ...(clean[node] || {}), ...keep };
  }
  return clean;
}


// ── /code: a sentence in, one program out (plans/plan-text-to-code.md, slice 1) ──
// The contract is generated from the module whose program runs it, never typed here.
import { glslContract } from '../../../demo/shell/mirror-shader.mjs';
import { glslExamples } from '../../../demo/shell/glsl-examples.mjs';

/** The models that write a program; the first is the default. MEASURED 2026-10-15 on /shader/write/, ten
 *  sentences each: qwen2.5-coder compiled 20 of 20 first shot at 6.3 to 6.8 s median, qwen3-30b 18 of 20
 *  at 2.3 s but answers in its reasoning field, kimi 9 of 10 at 15.5 s, which is past the 15 s budget. */
export const CODE = [
  '@cf/qwen/qwen2.5-coder-32b-instruct',
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/moonshotai/kimi-k2.7-code',
  '@cf/qwen/qwen3.8-27b',
  '@cf/openai/gpt-oss-120b',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
];
/** The languages /code writes, each with the contract its runtime keeps. */
export const CODE_LANGS = { glsl: glslContract };
/** Short good programs per language, said after the contract; a page's own contract does not replace them. */
export const CODE_EXAMPLES = { glsl: glslExamples };
export const CODE_MAX_TOKENS = 1000;
/** A page may send its own contract, a previous program and a compiler error, each capped. */
export const CODE_TEXT_MAX = 12000;
// Per model: a thinking model spends max_tokens on thought unless told not to.
const CODE_EXTRA = {
  '@cf/moonshotai/kimi-k2.7-code': { chat_template_kwargs: { thinking: false } },
  '@cf/openai/gpt-oss-120b': { reasoning_effort: 'low' },
  '@cf/qwen/qwen3.8-27b': { chat_template_kwargs: { enable_thinking: false } },
  '@cf/qwen/qwen3-30b-a3b-fp8': { chat_template_kwargs: { enable_thinking: false } },
};
// One string field and nothing else: a grammar in a schema made the 70B loop (wish.mjs#loose-schema).
const CODE_SCHEMA = { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] };

const cap = (v) => (typeof v === 'string' ? v.slice(0, CODE_TEXT_MAX) : '');

/**
 * The messages for one attempt. `previous` with an `error` is a retry (fix it); `previous` alone is a
 * revision (change the program running now as the sentence says, rather than write a new one).
 */
export function codeMessages({ text, contract, examples = '', error, previous }) {
  const system = `${contract}${examples ? `\n\n${examples}` : ''}\nAnswer as JSON: {"code": "<the whole program>"}.`;
  if (previous && !error) {
    return [
      { role: 'system', content: system },
      { role: 'user', content: `This program is running now:\n${cap(previous)}\n\nChange it: ${String(text || '')}\n`
        + 'Keep everything the change does not mention, and answer with the whole program.' },
    ];
  }
  const msgs = [
    { role: 'system', content: system },
    { role: 'user', content: String(text || '') },
  ];
  if (previous) {
    msgs.push({ role: 'assistant', content: JSON.stringify({ code: cap(previous) }) });
    msgs.push({ role: 'user', content: `That program was refused: ${cap(error)}\nWrite the whole program again, fixed.` });
  }
  return msgs;
}

/** The text a model answered, across the shapes Workers AI returns (`response`, chat choices, responses output). */
export function textOf(r) {
  if (r == null) return '';
  if (r.response && typeof r.response === 'object') return JSON.stringify(r.response);
  const m = r.choices?.[0]?.message;
  // qwen3-30b with thinking off answers in `reasoning_content` and leaves `content` null, measured 2026-10-15.
  const said = [r.response, m?.content, r.output_text,
    (r.output || []).flatMap((o) => o?.content || []).map((x) => x?.text).filter((x) => typeof x === 'string').join(''),
    m?.reasoning_content, m?.reasoning];
  return said.find((x) => typeof x === 'string' && x.trim()) || '';
}

/** The program inside an answer: the `code` field, else a fenced block, else the text itself. */
export function codeOf(raw) {
  const t = String(raw || '').trim();
  try { const j = JSON.parse(t); if (typeof j?.code === 'string') return j.code; } catch { /* not JSON */ }
  const m = /\{\s*"code"\s*:\s*("(?:[^"\\]|\\.)*")/.exec(t);
  if (m) { try { return JSON.parse(m[1]); } catch { /* fall through */ } }
  const f = /```[a-z]*\n([\s\S]*?)```/.exec(t);
  return f ? f[1] : t;
}

// handle(path '/hear', '/wish' or '/code', parsed body, run(model, payload)) -> {status, body}.
// why: lessons/workers-wish.md#handle
export async function handle(path, body, run) {
  const bad = (error, status = 400) => ({ status, body: { error } });

  if (path === '/hear') {
    const model = body.model || HEAR[0];
    if (!HEAR.includes(model)) return bad(`not a listening model: ${model}`);
    if (!body.audio) return bad('audio is base64');
    const t0 = Date.now();
    const r = await run(model, hearPayload(model, body.audio, body.language, body.vocabulary));
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
    // A follow-up: earlier turns as user and assistant messages, and the patch now (hand-wired links too).
    const history = body.history ?? [];
    if (!Array.isArray(history) || !history.every((t) => t && typeof t.said === 'string' && Array.isArray(t.links) && t.links.every(linkShape))) {
      return bad('history is a list of { said, links }');
    }
    const current = body.current ?? null;
    if (current !== null && !(Array.isArray(current) && current.every(linkShape))) return bad('current is a list of links');
    const turns = history.slice(-HISTORY_MAX);
    const followUp = turns.length > 0 || (current?.length ?? 0) > 0;
    const text = String(body.text || '');
    const now = followUp && current !== null
      ? `The patch now, with any links wired by hand:\n${answerOf(current || [], body.currentSettings)}\n\n${text}` : text;
    const t0 = Date.now();
    let r;
    try {
      r = await run(model, {
        messages: [
          { role: 'system', content: systemFor(ports, body.facts, outs, ins, followUp) },
          ...turns.flatMap((t) => [
            { role: 'user', content: t.said.slice(0, SAID_MAX) },
            { role: 'assistant', content: answerOf(t.links, t.settings) },
          ]),
          { role: 'user', content: now },
        ],
        response_format: { type: 'json_schema', json_schema: schemaFor(outs, ins, paramsOf(ports)) },
        max_tokens: PATCH_MAX_TOKENS,
        ...(PATCH_EXTRA[model] || {}),
      });
    } catch (e) {
      return { status: 502, body: { error: `the model did not answer: ${e?.message || e}`, ms: Date.now() - t0, model } };
    }
    // An object, a string of JSON (measured within one hour), or chat choices (kimi): textOf reads them all.
    // why: lessons/workers-wish.md#shape
    const said = textOf(r);
    const out = r?.response && typeof r.response === 'object' ? r.response : jsonIn(said);
    const { links: told, fixed } = relabel(out?.links ?? [], ports);
    const links = dedupe(told, fixed);
    const settings = settingsFrom(out, fixed, links);
    return { status: 200, body: {
      links, settings, turns: turns.length,
      /* What the model actually said, where this repaired it. The page prints
         it, because a repair nobody is told about is a rewrite. */
      fixed,
      raw: r?.response && typeof r.response === 'object' ? null : said || null,
      usage: r?.usage ?? null, ms: Date.now() - t0, model,
    } };
  }

  if (path === '/code') {
    const model = body.model || CODE[0];
    if (!CODE.includes(model)) return bad(`not a writing model: ${model}`);
    const lang = body.lang || 'glsl';
    if (!Object.hasOwn(CODE_LANGS, lang)) return bad(`no contract for ${lang}`);
    const text = String(body.text || '').trim();
    if (!text) return bad('say what to write');
    const contract = cap(body.contract) || CODE_LANGS[lang]();
    const t0 = Date.now();
    let r;
    try {
      r = await run(model, {
        // The examples only on a retry or a revision: on a first try they doubled the time (7.5 to 10.8 s median)
        // and timed the 15 s loop out with no picture (2026-10-15).
        messages: codeMessages({ text, contract, examples: body.previous ? (CODE_EXAMPLES[lang]?.() || '') : '', error: body.error, previous: body.previous }),
        response_format: { type: 'json_schema', json_schema: CODE_SCHEMA },
        max_tokens: CODE_MAX_TOKENS,
        ...(CODE_EXTRA[model] || {}),
      });
    } catch (e) {
      return { status: 502, body: { error: `the model did not answer: ${e?.message || e}`, ms: Date.now() - t0, model } };
    }
    const raw = textOf(r);
    const code = codeOf(raw);
    // An empty program carries what the model did say (capped), so a reader can tell refusal from a shape we do not parse.
    return { status: 200, body: { code, ms: Date.now() - t0, model, usage: r?.usage ?? null,
      ...(code.trim() ? {} : { raw: raw.slice(0, 1000), keys: Object.keys(r || {}) }) } };
  }

  return bad('no such path', 404);
}

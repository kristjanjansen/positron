// node workers/wish/src/wish-test.mjs: the prompt and the repair, no model and no browser.
// Drives handle() with a capturing stub, so it grades the payload that would leave for a model.
// why: lessons/workers-wish.md#test-header

import { CODE, codeOf, textOf } from './wish.mjs';
import { glslContract, UNIFORMS } from '../../../demo/shell/mirror-shader.mjs';
import { handle, relabel, PATCH, HEAR, hearPayload, vocabularyPrompt, PROMPT_MAX, allowedOrigin, corsFor } from './wish.mjs';
import { OP_NAMES, OP_HELP } from '../../../demo/shell/bay.mjs';

let ok = 0;
const bad = [];
function is(what, pass, detail = '') {
  if (pass) { ok++; return; }
  bad.push(`${what}${detail ? `  · ${detail}` : ''}`);
}

/** The payload `handle` would have sent, without sending it. */
async function ask(ports, text = 'connect evolution to circuit') {
  let sent = null;
  const out = await handle('/wish', { model: PATCH[0], text, ports }, (model, payload) => {
    sent = { model, payload };
    return { response: { links: [] } };
  });
  return { sent, out };
}

const DESK = [
  { id: 'here:mk-425c-usb-midi-keyboard:out', dir: 'out', label: 'MK-425C USB MIDI Keyboard',
    also: ['Evolution', 'Evolution MK-425C', 'MK-425C', 'the keyboard'] },
  { id: 'here:circuit:in', dir: 'in', label: 'Circuit',
    also: ['Novation', 'Novation Circuit', 'the synth'] },
  // No `also` on purpose: a port whose room has nothing else to call it.
  { id: 'here:plain:in', dir: 'in', label: 'Plain' },
];

const { sent } = await ask(DESK);
const prompt = sent.payload.messages[0].content;
const lines = prompt.split('\n');

// The word somebody would say (the maker's name, Evolution) has to be in the prompt.
// why: lessons/workers-wish.md#maker-name
is('the maker a person would say is in the prompt', prompt.includes('Evolution'),
  lines.find((l) => l.includes('also called')) || 'no alias line at all');
is('every alias given for a port reaches the prompt',
  ['Evolution MK-425C', 'the keyboard', 'Novation Circuit', 'the synth']
    .every((a) => prompt.includes(a)));

// A port with nothing to add gets no alias line. Matched on the indent, not the words: the
// sentence explaining alias lines also contains `also called`.
// why: lessons/workers-wish.md#alias-negative
const ALIAS = '      also called:';
const plainLine = lines.findIndex((l) => l.includes('here:plain:in'));
const aliasLines = lines.filter((l) => l.startsWith(ALIAS));
is('a port with no other names adds no line',
  plainLine > 0 && !lines[plainLine + 1].startsWith(ALIAS) && aliasLines.length === 2,
  `${aliasLines.length} alias lines across 3 ports, and the line after the plain `
  + `port reads ${JSON.stringify(lines[plainLine + 1].slice(0, 40))}`);

/* And the sentence explaining the alias lines is only there when there are
   any: a desk of plain ports must not be told to match against a list that
   does not exist. */
const bare = await ask(DESK.map(({ also, ...p }) => p));
is('a desk with no aliases is told nothing about aliases',
  !bare.sent.payload.messages[0].content.includes('also called'));

// An alias must never become a port id: the enum is what keeps the model from inventing ports.
// why: lessons/workers-wish.md#alias-enum
const items = sent.payload.response_format.json_schema.properties.links.items;
const choices = [...items.properties.from.enum, ...items.properties.to.enum];
is('the model chooses from real port ids and nothing else',
  choices.join() === 'here:mk-425c-usb-midi-keyboard:out,here:circuit:in,here:plain:in'
  && !choices.some((c) => c === 'Evolution' || c === 'the synth'),
  choices.join());

// Asserts the operator table line for every transform bay.mjs accepts, not a mention in prose.
// why: lessons/workers-wish.md#table
{
  const head = (op) => `  {"op":"${op}"`;
  const table = lines.filter((l) => OP_NAMES.some((op) => l.startsWith(head(op))));
  const missing = OP_NAMES.filter((op) => !table.some((l) => l.startsWith(head(op))));
  is('every transform the code accepts has its own line in the prompt',
    missing.length === 0 && table.length === OP_NAMES.length,
    `missing ${missing.join(', ') || 'none'}, ${table.length} lines for ${OP_NAMES.length} ops`);

  /* And each line carries the ARGUMENT NAME, which is the half the model gets
     wrong. `only cls=C` on its own page is what `{"op":"only","to":N}` was
     missing. */
  const unnamed = OP_HELP.filter((o) => !prompt.includes(o.json));
  is('every transform is shown as the JSON object a model can copy',
    unnamed.length === 0, unnamed.map((o) => o.json).join(' | '));

  // Negative control: the table must not name a transform nobody implemented.
  // why: lessons/workers-wish.md#table-negative
  const named = lines
    .map((l) => /^ {2}\{"op":"([a-z]+)"/.exec(l))
    .filter(Boolean).map((m) => m[1]);
  const invented = named.filter((n) => !OP_NAMES.includes(n));
  is('NEGATIVE CONTROL: the prompt names no transform the code does not have',
    invented.length === 0, invented.join(', '));

  /* The schema and the table are two lists the model reads at once, and they
     came from one declaration precisely so they cannot part company. */
  const t = items.properties.transforms.items;
  is('the schema offers exactly the transforms the prompt describes',
    t.properties.op.enum.join() === OP_NAMES.join(), t.properties.op.enum.join());
  const args = [...new Set(OP_HELP.flatMap((o) => o.args))];
  const absent = args.filter((a) => t.properties[a] === undefined);
  is('every argument any transform takes is a property the model may send',
    absent.length === 0, absent.join(', '));
}

// The repair: `transpose` takes `by`, the model writes `to`, and the relabel says it did.
// why: lessons/workers-wish.md#repair
const r = relabel([{ from: 'a', to: 'b', transforms: [{ op: 'transpose', to: 1 }] }]);
is('transpose given `to` is read as `by`, and the repair is reported',
  r.links[0].transforms[0].by === 1 && r.links[0].transforms[0].to === undefined
  && r.fixed.length === 1 && r.fixed[0].said === 'to' && r.fixed[0].read === 'by',
  JSON.stringify(r));
// It only fills an absence; a model sending both keys is left for the page's validator.
// why: lessons/workers-wish.md#absence
const both = relabel([{ from: 'a', to: 'b', transforms: [{ op: 'transpose', to: 2, by: 3 }] }]);
is('a transform carrying both keys is left alone rather than picked between',
  both.links[0].transforms[0].to === 2 && both.links[0].transforms[0].by === 3
  && both.fixed.length === 0,
  JSON.stringify(both));
/* `channel` really does take `to`, so it must survive untouched. Without this
   the repair above could be widened into a rule that breaks the language. */
const ch = relabel([{ from: 'a', to: 'b', transforms: [{ op: 'channel', to: 1 }] }]);
is('channel keeps its `to`, which is the key it really takes',
  ch.links[0].transforms[0].to === 1 && ch.fixed.length === 0, JSON.stringify(ch));

// Three listening models, two payload shapes: `turbo` base64 with options, the others byte arrays.
// why: lessons/workers-wish.md#payloads
const b64 = 'AAEC';
is('the newest listening model is handed base64 and the options it understands',
  hearPayload(HEAR[0], b64).audio === b64 && hearPayload(HEAR[0], b64).vad_filter === true);
is('the two older ones are handed bytes and no options',
  [HEAR[1], HEAR[2]].every((m) => Array.isArray(hearPayload(m, b64).audio)
    && hearPayload(m, b64).vad_filter === undefined),
  JSON.stringify(hearPayload(HEAR[1], b64)));

// The site's names reach Whisper as `initial_prompt`, on turbo only, capped, and never invented.
{
  const words = ['Plaits', 'Circuit', 'Rhodes', 'SuperCollider', 'Rhodes', 7, '  ', 'Soft  FM'];
  const turbo = hearPayload(HEAR[0], b64, 'en', words);
  is('turbo is handed the page\'s names as initial_prompt, each once, in the page\'s order',
    turbo.initial_prompt === 'Plaits, Circuit, Rhodes, SuperCollider, Soft FM', JSON.stringify(turbo.initial_prompt));
  is('NEGATIVE CONTROL: the older two are handed no prompt, which they do not take',
    [HEAR[1], HEAR[2]].every((m) => hearPayload(m, b64, 'en', words).initial_prompt === undefined));
  is('NEGATIVE CONTROL: a request with no vocabulary keeps the old shape exactly',
    JSON.stringify(hearPayload(HEAR[0], b64)) === JSON.stringify({ audio: b64, task: 'transcribe', vad_filter: true }),
    JSON.stringify(hearPayload(HEAR[0], b64)));
  const long = vocabularyPrompt(Array.from({ length: 200 }, (_, i) => `name${i}`));
  is('NEGATIVE CONTROL: a long vocabulary is cut at a whole name within the cap',
    long.length <= PROMPT_MAX && long.length > PROMPT_MAX - 12 && !long.endsWith(','), `${long.length} chars`);
  let sent = null;
  await handle('/hear', { audio: b64, vocabulary: ['Rhodes'] }, (m, payload) => { sent = payload; return { text: 'Rhodes' }; });
  is('/hear passes the vocabulary through to the model', sent?.initial_prompt === 'Rhodes', JSON.stringify(sent));
}

// A patch name is a word in the schema, and `to` written for it is read as the name.
{
  const { sent } = await ask(DESK);
  const t = sent.payload.response_format.json_schema.properties.links.items.properties.transforms.items;
  is('the schema types a patch name as a string', t.properties.name?.type === 'string', JSON.stringify(t.properties.name));
  const r = relabel([{ from: 'a', to: 'b', transforms: [{ op: 'patch', to: 'Rhodes' }] }]);
  is('patch given `to` is read as `name`, and the repair is reported',
    r.links[0].transforms[0].name === 'Rhodes' && r.fixed[0]?.read === 'name', JSON.stringify(r));
}

/* A model nobody allowed must not be run, because the name arrives from a
   browser and somebody's account is being spent. */
const refused = await handle('/wish', { model: '@cf/somebody/else', ports: DESK }, () => {
  throw new Error('a model that is not on the list was run');
});
is('a model that is not on the list is refused before it is run',
  refused.status === 400 && /not a patch model/.test(refused.body.error),
  JSON.stringify(refused.body));

// Who may spend the account, graded both ways. An Origin header only binds a browser.
// why: lessons/workers-wish.md#allowlist
is('the site is allowed, with and without www',
  allowedOrigin('https://positron.studio') && allowedOrigin('https://www.positron.studio'));
is('a page served off this machine is allowed, on any port',
  allowedOrigin('http://127.0.0.1:8890') && allowedOrigin('http://localhost:3000')
  && allowedOrigin('http://192.168.0.20:8890'));
is('a page this account deployed is allowed',
  allowedOrigin('https://elektron-view.kristjan-jansen.workers.dev'));

{
  // Negative control: the last ones are what startsWith, includes or an unanchored subdomain pass.
  // why: lessons/workers-wish.md#negative
  const no = [null, '', 'null', 'https://evil.example',
    'https://positron.studio.evil.example', 'http://positron.studio',
    'https://evil.example/?x=https://positron.studio',
    'https://evil.kristjan-jansen.workers.dev.evil.example',
    'https://wish.someone-else.workers.dev',
    'http://8.8.8.8:8890', 'http://172.32.0.1:8890'];
  const through = no.filter((o) => allowedOrigin(o));
  is('NEGATIVE CONTROL: a stray page, a crawler and a lookalike hostname are all refused',
    through.length === 0, through.join(', '));
}

{
  /* A reply may not hand one caller's permission to another, and a cache is the
     thing that would do it. */
  const h = corsFor('http://127.0.0.1:8890');
  is('the reply echoes the caller rather than answering star, and varies on it',
    h['access-control-allow-origin'] === 'http://127.0.0.1:8890' && h.vary === 'origin',
    JSON.stringify(h));
  const r = corsFor('https://evil.example');
  is('NEGATIVE CONTROL: a refused caller is never named in the allow header',
    r['access-control-allow-origin'] === 'https://positron.studio',
    r['access-control-allow-origin']);
}

// ── /code: one program out, under the contract the running shader keeps ──
{
  const sent = [];
  const stub = (answer) => async (model, payload) => { sent.push({ model, payload }); return answer; };
  const out = await handle('/code', { text: 'slow blue waves', lang: 'glsl' }, stub({ response: { code: 'void main(){}' } }));
  const p = sent[0]?.payload;
  is('/code asks the default writing model and returns the program', out.status === 200 && out.body.code === 'void main(){}' && sent[0]?.model === CODE[0],
    JSON.stringify(out.body));
  is('the system prompt is the contract generated from the shader module', p?.messages?.[0]?.content.startsWith(glslContract())
    && UNIFORMS.every((u) => p.messages[0].content.includes(u.name)), p?.messages?.[0]?.content.slice(0, 80));
  const schema = p?.response_format?.json_schema;
  is('the schema is one string field and nothing else, no grammar in it', JSON.stringify(schema) === JSON.stringify({ type: 'object', properties: { code: { type: 'string' } }, required: ['code'] }),
    JSON.stringify(schema));
  is('the answer is capped near 1000 tokens', p?.max_tokens === 1000, `${p?.max_tokens}`);
  is('a first ask carries only the sentence', p?.messages?.length === 2 && p.messages[1].content === 'slow blue waves');

  sent.length = 0;
  await handle('/code', { text: 'slow blue waves', previous: 'void main(){ o = x; }', error: "ERROR: 0:1: 'x' : undeclared identifier" }, stub({ response: { code: 'ok' } }));
  const m = sent[0]?.payload?.messages || [];
  is('a retry carries the program that failed and the compiler\'s words', m.length === 4 && m[2].role === 'assistant' && m[2].content.includes('o = x')
    && m[3].content.includes("'x' : undeclared identifier"), JSON.stringify(m.slice(2)));

  const notOurs = await handle('/code', { text: 'x', model: '@cf/some/expensive-model' }, stub({}));
  is('NEGATIVE CONTROL: a model outside the allowlist is refused before anything runs', notOurs.status === 400 && /not a writing model/.test(notOurs.body.error)
    && sent.length === 1, notOurs.body.error);
  const noLang = await handle('/code', { text: 'x', lang: 'faust' }, stub({}));
  is('NEGATIVE CONTROL: a language with no contract is refused', noLang.status === 400 && /no contract/.test(noLang.body.error), noLang.body.error);
  const empty = await handle('/code', { text: '  ' }, stub({}));
  is('NEGATIVE CONTROL: an empty sentence asks nothing', empty.status === 400 && sent.length === 1, empty.body.error);
  const thrown = await handle('/code', { text: 'x' }, async () => { throw new Error('JSON Mode couldn\'t be met'); });
  is('a model that throws is a 502 with its own words, not a crash', thrown.status === 502 && /JSON Mode/.test(thrown.body.error), JSON.stringify(thrown.body));

  is('the shapes Workers AI answers in all give the text', textOf({ response: 'a' }) === 'a' && textOf({ choices: [{ message: { content: 'b' } }] }) === 'b'
    && textOf({ choices: [{ message: { content: null, reasoning_content: 'c' } }] }) === 'c' && textOf({ response: null, choices: [{ message: { content: '' } }] }) === '');
  is('NEGATIVE CONTROL: an empty response field does not hide the content beside it', textOf({ response: '', choices: [{ message: { content: 'd' } }] }) === 'd');
  is('the program comes out of JSON, out of a fence, or as the text', codeOf('{"code":"a\\nb"}') === 'a\nb' && codeOf('x\n```glsl\nvoid main(){}\n```') === 'void main(){}\n' && codeOf('plain') === 'plain');
}

// ── follow-ups and settings on /wish ──
{
  const { FOLLOW_UP, HISTORY_MAX, settingsFrom } = await import('./wish.mjs');
  const PORTS = [
    { id: 'web:keys:midi-out', dir: 'out', label: 'keyboard midi-out' },
    { id: 'web:synth:audio-out', dir: 'out', label: 'synth audio-out' },
    { id: 'web:synth:midi-in', dir: 'in', label: 'synth midi-in' },
    { id: 'web:synth:value-in', dir: 'in', label: 'synth value-in (params: cutoff 80..8000, q 0.7..15)' },
    { id: 'web:speaker:audio-in', dir: 'in', label: 'speakers audio-in' },
  ];
  const PLAIN = PORTS.filter((p) => !p.id.endsWith('value-in'));
  const LINKS = [{ from: 'web:keys:midi-out', to: 'web:synth:midi-in', transforms: [] }, { from: 'web:synth:audio-out', to: 'web:speaker:audio-in', transforms: [] }];
  const call = async (body, answer = { links: [] }) => {
    let sent = null;
    const out = await handle('/wish', { model: PATCH[0], text: 'make it darker', ...body }, (m, p) => { sent = p; return { response: answer }; });
    return { sent, out };
  };

  const old = await call({ ports: PLAIN });
  is('the old request shape is unchanged: a system message and the sentence, links only in the schema',
    old.sent.messages.length === 2 && old.sent.messages[1].content === 'make it darker'
      && Object.keys(old.sent.response_format.json_schema.properties).join() === 'links' && !old.sent.messages[0].content.includes(FOLLOW_UP),
    JSON.stringify(old.sent.messages.map((m) => m.role)));
  is('NEGATIVE CONTROL: with no params on any port the model is told nothing about settings', !/settings/.test(old.sent.messages[0].content));
  is('an answer with no settings returns an empty settings object beside the links', JSON.stringify(old.out.body.settings) === '{}' && old.out.body.turns === 0);

  const turn = { said: 'keys play the synth', links: LINKS };
  const fu = await call({ ports: PORTS, history: [turn], current: LINKS, currentSettings: { 'web:synth': { cutoff: 2000 } } });
  const m = fu.sent.messages;
  is('a follow-up is the system, each earlier sentence and its JSON answer, then the new sentence', m.length === 4
    && m.map((x) => x.role).join() === 'system,user,assistant,user' && m[1].content === 'keys play the synth'
    && JSON.parse(m[2].content).links.length === 2 && m[3].content.endsWith('make it darker'), m.map((x) => x.role).join());
  is('the patch now, hand-wired links and settings too, rides with the new sentence, settings as rows', /The patch now/.test(m[3].content)
    && m[3].content.includes('"web:speaker:audio-in"') && m[3].content.includes('{"node":"web:synth","param":"cutoff","value":2000}'), m[3].content.slice(0, 160));
  is('the follow-up sentence is said once, in the system message', m[0].content.split(FOLLOW_UP).length === 2);
  const rowSchema = fu.sent.response_format.json_schema.properties.settings;
  is('a value-in with params adds optional setting rows to the schema, node and param from its label, and an example from it',
    rowSchema?.type === 'array' && rowSchema.items.properties.node.enum.join() === 'web:synth' && rowSchema.items.properties.param.enum.join() === 'cutoff,q'
      && !fu.sent.response_format.json_schema.required.includes('settings')
      && m[0].content.includes('"settings": [{"node": "web:synth", "param": "cutoff", "value": 4000}]'), m[0].content.split('\n').find((l) => l.includes('"settings"')));

  const many = Array.from({ length: 7 }, (_, i) => ({ said: `turn ${i}`, links: LINKS }));
  const long = await call({ ports: PORTS, history: many });
  is(`only the last ${HISTORY_MAX} turns are sent`, long.sent.messages.length === 2 + 2 * HISTORY_MAX && long.sent.messages[1].content === 'turn 3');
  is('history with no current patch adds no patch-now line', !/The patch now/.test(long.sent.messages.at(-1).content));
  let called = 0;
  const badHist = await handle('/wish', { text: 'x', ports: PORTS, history: [{ said: 1 }] }, () => { called++; return {}; });
  const badCur = await handle('/wish', { text: 'x', ports: PORTS, current: [{ from: 'a' }] }, () => { called++; return {}; });
  is('NEGATIVE CONTROL: a malformed history or current is refused in words before any model runs', badHist.status === 400 && /history is a list/.test(badHist.body.error)
    && badCur.status === 400 && /current is a list of links/.test(badCur.body.error) && called === 0, `${badHist.body.error}; ${badCur.body.error}`);

  const rows = await call({ ports: PORTS, current: LINKS }, { links: LINKS, settings: [{ node: 'web:synth', param: 'cutoff', value: 400 }, { node: 'web:synth', param: 'q', value: 2 }] });
  is('setting rows come back by node, as the page applies them', JSON.stringify(rows.out.body.settings) === '{"web:synth":{"cutoff":400,"q":2}}', JSON.stringify(rows.out.body.settings));
  const got = await call({ ports: PORTS, current: LINKS }, { links: LINKS, settings: { 'web:synth:value-in': { cutoff: 400 } } });
  is('the model\'s settings come back keyed by node, a port id read as its node and said in fixed', got.out.body.settings['web:synth']?.cutoff === 400
    && got.out.body.fixed.some((f) => f.op === 'settings' && f.read === 'web:synth'), JSON.stringify(got.out.body));
  const sound = await call({ ports: PORTS }, { links: [{ from: 'web:keys:midi-out', to: 'web:synth:midi-in', transforms: [] }], settings: { 'web:synth': { patch: 'sawtooth', cutoff: 900 } } });
  is('a named sound written as a setting moves to a patch on the link into that midi-in, and the move is said', sound.out.body.links[0].transforms[0]?.name === 'sawtooth'
    && JSON.stringify(sound.out.body.settings) === '{"web:synth":{"cutoff":900}}' && sound.out.body.fixed.some((f) => /patch on the link/.test(f.read)), JSON.stringify(sound.out.body));
  const stray = settingsFrom({ settings: { 'web:plaits': { patch: 'Wind' } } }, [], []);
  is('NEGATIVE CONTROL: with no link into its midi-in the sound stays a setting, for the page to refuse', stray['web:plaits']?.patch === 'Wind', JSON.stringify(stray));
  is('NEGATIVE CONTROL: settings that are not rows or an object of objects come back empty', JSON.stringify(settingsFrom({ settings: [1] })) === '{}'
    && JSON.stringify(settingsFrom({ settings: { 'web:synth': 4 } })) === '{}');
}

// ── the default model, its payload, the answer shapes and repeated links on /wish ──
{
  const { PATCH_MAX_TOKENS, dedupe, jsonIn } = await import('./wish.mjs');
  const PORTS = [{ id: 'web:keys:midi-out', dir: 'out', label: 'keyboard' }, { id: 'web:synth:midi-in', dir: 'in', label: 'synth' },
    { id: 'web:synth:audio-out', dir: 'out', label: 'synth' }, { id: 'web:speaker:audio-in', dir: 'in', label: 'speakers' }];
  const go = async (model, answer) => { let sent = null; const out = await handle('/wish', { text: 'x', ports: PORTS, ...(model ? { model } : {}) }, (m, p) => { sent = { m, p }; return answer; }); return { sent, out }; };
  const k = await go(null, { response: { links: [] } });
  is('the default patch model is kimi-k2.6 with thinking off and room to answer', k.sent.m === '@cf/moonshotai/kimi-k2.6' && PATCH[0] === k.sent.m
    && k.sent.p.chat_template_kwargs?.thinking === false && k.sent.p.max_tokens === PATCH_MAX_TOKENS && PATCH_MAX_TOKENS >= 1500, JSON.stringify({ m: k.sent.m, t: k.sent.p.max_tokens }));
  const l = await go('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { response: { links: [] } });
  is('NEGATIVE CONTROL: llama stays allowed and gets no thinking switch', l.out.status === 200 && !('chat_template_kwargs' in l.sent.p));
  const ONE = { from: 'web:keys:midi-out', to: 'web:synth:midi-in', transforms: [] };
  const chat = await go(null, { choices: [{ message: { content: JSON.stringify({ links: [ONE] }) } }] });
  is('an answer in chat choices (how kimi answers) is read, and its text is the raw', chat.out.body.links.length === 1 && chat.out.body.links[0].to === ONE.to
    && typeof chat.out.body.raw === 'string', JSON.stringify(chat.out.body));
  const fenced = await go(null, { choices: [{ message: { content: 'Here:\n```json\n{"links": []}\n```' } }] });
  is('a fenced answer is read too, and NEGATIVE CONTROL: text with no JSON gives no links', fenced.out.status === 200 && jsonIn('no json here') === null
    && Array.isArray(fenced.out.body.links));
  const SPK = { from: 'web:synth:audio-out', to: 'web:speaker:audio-in', transforms: [] };
  const rep = await go(null, { response: { links: [ONE, SPK, SPK, SPK, { ...SPK }, ONE] } });
  is('exact repeats of a link are dropped after relabel, and how many is said in fixed', rep.out.body.links.length === 2
    && rep.out.body.fixed.some((f) => f.op === 'links' && f.value === 4 && /4 repeated links/.test(f.said)), JSON.stringify(rep.out.body.fixed));
  const twoWays = dedupe([ONE, { ...ONE, transforms: [{ op: 'transpose', by: 12 }] }], []);
  is('NEGATIVE CONTROL: two links that differ only in a transform are both kept', twoWays.length === 2);
  const thrown = await handle('/wish', { text: 'x', ports: PORTS }, async () => { throw new Error('5006 bad input'); });
  is('a patch model that throws is a 502 in its own words', thrown.status === 502 && /5006/.test(thrown.body.error), JSON.stringify(thrown.body));
}

// ── /code: the examples in the prompt, and a revision ──
{
  const { GLSL_EXAMPLES } = await import('../../../demo/shell/glsl-examples.mjs');
  const sent = [];
  const stub = async (model, payload) => { sent.push(payload); return { response: { code: 'ok' } }; };
  await handle('/code', { text: 'slow blue waves', contract: 'A PAGE CONTRACT' }, stub);
  const sys = sent[0]?.messages?.[0]?.content || '';
  is('/code puts every example after the contract, even when the page sends its own contract', sys.startsWith('A PAGE CONTRACT')
    && GLSL_EXAMPLES.every((e) => sys.includes(e.body)) && /Answer as JSON/.test(sys.split('\n').at(-1)), sys.slice(0, 120));
  sent.length = 0;
  await handle('/code', { text: 'heavier rain', previous: 'void main(){ o = vec4(1.0); }' }, stub);
  const rm = sent[0]?.messages || [];
  is('previous with no error is a revision: one user message carrying the program and the change', rm.length === 2 && rm[1].role === 'user'
    && rm[1].content.includes('o = vec4(1.0)') && /Change it: heavier rain/.test(rm[1].content) && !/refused/.test(rm[1].content), JSON.stringify(rm.slice(1)));
  sent.length = 0;
  await handle('/code', { text: 'heavier rain', previous: 'void main(){ o = x; }', error: 'ERROR: x' }, stub);
  is('NEGATIVE CONTROL: previous with an error is still a retry, not a revision', sent[0]?.messages?.length === 4 && /refused: ERROR: x/.test(sent[0].messages[3].content));
}

// ── the per-visitor cap on the paid routes ──
{
  const { createLimiter, addressTag, BURST, PER_MINUTE, LIMITED } = await import('./limit.mjs');
  let t = 0;
  const lim = createLimiter({ now: () => t });
  const takeN = (n, who, path = '/code') => Array.from({ length: n }, () => lim.take(who, path));
  const first = takeN(BURST.n, 'a');
  const over = lim.take('a', '/code');
  is('a burst is let through and the next one is a 429 with a plain reason and a wait', first.every((x) => x === null) && over?.status === 429
    && /too many requests from here: at most 6 in 10 s, try again in \d+ s/.test(over.error) && over.retryAfter >= 1, JSON.stringify(over));
  is('/wish counts against the same visitor as /code', lim.take('a', '/wish')?.status === 429);
  is('NEGATIVE CONTROL: another visitor is not refused for the first one\'s burst', lim.take('b', '/code') === null);
  is('NEGATIVE CONTROL: /hear is not counted here', LIMITED.join() === '/code,/wish' && lim.take('a', '/hear') === null);
  t += BURST.ms;
  is('the burst frees itself once its window has passed', lim.take('a', '/code') === null);
  // Spread under the burst until the minute fills: 30 in a minute, then a refusal naming the minute.
  let lim2t = 0;
  const lim2 = createLimiter({ now: () => lim2t });
  let refused = null;
  for (let i = 0; i < PER_MINUTE.n + 1; i++) { refused = lim2.take('c', '/code'); lim2t += 1900; }
  is('past 30 in a minute the refusal names the minute', refused?.status === 429 && /at most 30 in 60 s/.test(refused.error), JSON.stringify(refused));
  const tagA = await addressTag('203.0.113.5');
  is('an address is kept as 8 hex of its hash, and two addresses differ', /^[0-9a-f]{8}$/.test(tagA) && tagA !== await addressTag('203.0.113.6') && !tagA.includes('203'));
}

for (const line of bad) console.log(`FAIL  ${line}`);
console.log(`${ok}/${ok + bad.length} ok`);
process.exit(bad.length ? 1 : 0);

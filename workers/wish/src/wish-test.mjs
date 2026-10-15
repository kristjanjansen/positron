// node workers/wish/src/wish-test.mjs: the prompt and the repair, no model and no browser.
// Drives handle() with a capturing stub, so it grades the payload that would leave for a model.
// why: lessons/workers-wish.md#test-header

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

for (const line of bad) console.log(`FAIL  ${line}`);
console.log(`${ok}/${ok + bad.length} ok`);
process.exit(bad.length ? 1 : 0);

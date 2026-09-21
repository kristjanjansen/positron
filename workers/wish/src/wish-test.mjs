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

import { handle, relabel, PATCH, HEAR, hearPayload, allowedOrigin, corsFor } from './wish.mjs';
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

/**
 * 🔴 THE WORD SOMEBODY ACTUALLY SAID HAS TO BE IN THERE. Reported 2026-09-21:
 * *"connect evolution to circuit"* came back with no links, because the maker's
 * name was in none of the strings this prompt is built from.
 */
is('the maker a person would say is in the prompt', prompt.includes('Evolution'),
  lines.find((l) => l.includes('also called')) || 'no alias line at all');
is('every alias given for a port reaches the prompt',
  ['Evolution MK-425C', 'the keyboard', 'Novation Circuit', 'the synth']
    .every((a) => prompt.includes(a)));

/* ⚠️ THE NEGATIVE HALF, and it is the one that stops this being a prompt that
   says `also called:` about everything. A port with nothing to add gets no
   line, so the model is not handed an empty list to match against. */
/* ⚠️ MATCHED ON THE INDENT AND NOT ON THE WORDS, WHICH THE FIRST BUILD OF THIS
   GOT WRONG: it read the line after the plain port, and that is the SENTENCE
   explaining alias lines, which contains the phrase `also called` in quotes. A
   substring of a sentence about a thing is not the thing. */
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

/**
 * 🔴 AN ALIAS MUST NEVER BECOME A PORT ID. The `enum` is what stopped a Moog
 * and a Prophet, neither of them on that desk, coming back as inventions in
 * 496 ms. An alias in that list is the invention arriving by invitation.
 */
const items = sent.payload.response_format.json_schema.properties.links.items;
const choices = [...items.properties.from.enum, ...items.properties.to.enum];
is('the model chooses from real port ids and nothing else',
  choices.join() === 'here:mk-425c-usb-midi-keyboard:out,here:circuit:in,here:plain:in'
  && !choices.some((c) => c === 'Evolution' || c === 'the synth'),
  choices.join());

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

  /* 🔴 NEGATIVE CONTROL. A check that only ever looks for what is there would
     pass a table containing a transform nobody implemented, which is the same
     drift pointing the other way: a model told about `quantize` would send one
     and `checkTransforms` would refuse it. */
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

/**
 * The repair, both directions. `transpose` takes `by`; this model writes `to`
 * on every run, and the boundary relabels it and SAYS it did, because a repair
 * nobody is told about is a rewrite.
 */
const r = relabel([{ from: 'a', to: 'b', transforms: [{ op: 'transpose', to: 1 }] }]);
is('transpose given `to` is read as `by`, and the repair is reported',
  r.links[0].transforms[0].by === 1 && r.links[0].transforms[0].to === undefined
  && r.fixed.length === 1 && r.fixed[0].said === 'to' && r.fixed[0].read === 'by',
  JSON.stringify(r));
/* ⚠️ AND IT ONLY EVER FILLS AN ABSENCE. A model that sends both keys is left
   exactly as it was and refused by the validator on the page, which is the
   honest answer to an ambiguous patch. */
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

/**
 * Three listening models, two payload shapes, and one shape was sent to all
 * three until 2026-09-21. `turbo` takes base64 and understands options; the two
 * older ones take an array of byte values and take no options at all.
 */
const b64 = 'AAEC';
is('the newest listening model is handed base64 and the options it understands',
  hearPayload(HEAR[0], b64).audio === b64 && hearPayload(HEAR[0], b64).vad_filter === true);
is('the two older ones are handed bytes and no options',
  [HEAR[1], HEAR[2]].every((m) => Array.isArray(hearPayload(m, b64).audio)
    && hearPayload(m, b64).vad_filter === undefined),
  JSON.stringify(hearPayload(HEAR[1], b64)));

/* A model nobody allowed must not be run, because the name arrives from a
   browser and somebody's account is being spent. */
const refused = await handle('/wish', { model: '@cf/somebody/else', ports: DESK }, () => {
  throw new Error('a model that is not on the list was run');
});
is('a model that is not on the list is refused before it is run',
  refused.status === 400 && /not a patch model/.test(refused.body.error),
  JSON.stringify(refused.body));

// ── who may spend the account ───────────────────────────────────────────────
//
// 🔴 THE ALLOWLIST IS GRADED BOTH WAYS OR IT IS NOT GRADED. A rule that
// answered `true` to everything passes any check that only asks whether the
// site gets in, and this one guards a paid account on a public hostname.
// ⚠️ AND THE HONEST CLAIM IS NARROW: an `Origin` header is a fact about a
// BROWSER. Anything that is not one sends whatever it likes, so what these
// asserts grade is that a stray page and a crawler are refused, never that
// somebody trying is.
is('the site is allowed, with and without www',
  allowedOrigin('https://positron.studio') && allowedOrigin('https://www.positron.studio'));
is('a page served off this machine is allowed, on any port',
  allowedOrigin('http://127.0.0.1:8890') && allowedOrigin('http://localhost:3000')
  && allowedOrigin('http://192.168.1.14:8890'));
is('a page this account deployed is allowed',
  allowedOrigin('https://elektron-view.kristjan-jansen.workers.dev'));

{
  /* 🔴 NEGATIVE CONTROL, AND THE LAST TWO ARE THE ONES A NAIVE RULE LETS
     THROUGH. A `startsWith` on the site would pass `positron.studio.evil.com`;
     an `includes` would pass `https://evil.com/?x=positron.studio`; and a
     subdomain rule written without an anchor would pass a workers.dev name
     under somebody else's account. */
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

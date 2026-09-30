// demo/shell/code-lang-test.mjs: the highlighter's tables and its parameter
// finder, with no browser.
//
//   node demo/shell/code-lang-test.mjs
//
// 🔴 GRADED AGAINST THE COMPILERS, NOT AGAINST ITSELF. Every current preset of
// `/fau/`, `/collide/` and `/und/` is read from the page or module that ships
// it (never a copy here), and what the finder calls a parameter is compared
// with what a compiler this file did not write reports:
//   Faust          libfaust 2.89.2 out of `demo/fau/vendor/`, compiled in node,
//                  and the labels in its UI JSON
//   SuperCollider  `sclang-lite.mjs`'s `controls`
//   Csound score   `timeline/csound.mjs`'s `csoundPart`, whose note rows carry
//                  the line they came from, against the lines this table
//                  colours an `i` statement on
// ⚠️ libfaust's glue writes a temporary module NEXT TO the `.js` it is handed,
// so the 157 kB `.js` is copied to the system temporary directory first and
// `demo/fau/vendor/` is only ever read.
//
// 🔴 A NAMED PROPORTION ARE NEGATIVE CONTROLS, marked `NEGATIVE CONTROL`,
// written so the defect they name fails them. `CODE_LANG_MODULE=<path>` runs
// this file against another copy of the module, which is how each was PROVED
// able to fail rather than argued. MEASURED 2026-09-30, 45 ok on the real
// module, then eleven sabotaged copies, each one line:
//
//   a plain run loses its last character before a token   13 red, every round trip
//   the finder names every quoted string                   9 red
//   `<` and `>` not escaped in the drawn HTML              7 red, every `<:` preset
//   no metadata or path stripped off a Faust label         2 red
//   a Faust call in a comment counted                      2 red
//   a named control in a comment counted                   2 red
//   a dead Faust match resumed AFTER itself, not one on    1 red, `real` lost
//   the comma coloured as composition                      1 red
//   a statement letter matched anywhere on the line        1 red, the label `e`
//   a hue drawn on a parameter with no knob                1 red
//   a vanished name keeps its hue                          1 red
//
// ⚠️ THE HUE AND THE STATEMENT LETTER SABOTAGES WERE GREEN ON THE FIRST
// SABOTAGE RUN, and the tests were what was weak: the hue check matched only
// a numeric `data-hue`, so `data-hue="null"` slipped past it, and nothing had
// ever asked for a one-letter label. Both were tightened and re-run red.
// ⚠️ AND THE FIRST STRING FIXTURE FOUND A REAL DEFECT: a dead match skipped by
// resuming after it swallowed the real call beyond the string's closing quote.
//
// ⚠️ WHAT THIS CANNOT GRADE: where a glyph lands. That needs a document, and
// `/kit/`'s CODE BOX block asserts it (drawn text equals the textarea's, the
// metrics equal, a hue only on a knob parameter).

import { readFileSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESETS as SC_PRESETS } from '../collide/presets.mjs';
import { compile as sclCompile } from './sclang-lite.mjs';
import { csoundPart } from '../../timeline/csound.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const M = await import(process.env.CODE_LANG_MODULE || './code-lang.mjs');
const { tokenize, render, findParams, faust, sclang, csoundSco, langOf, createHueBook, PARAM_HUES } = M;

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? `  (${detail})` : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `  (${detail})` : ''}`); }
};

// ── the texts, read from what ships ─────────────────────────────────────────

/** `/fau/`'s presets live inside its page as template literals. */
function fauPresets() {
  const html = readFileSync(join(HERE, '../fau/index.html'), 'utf8');
  const at = html.indexOf('const PRESETS = [');
  if (at < 0) throw new Error('no PRESETS in demo/fau/index.html');
  const out = [];
  const re = /\bid: '([^']+)'[\s\S]*?\bcode: `((?:[^`\\]|\\.)*)`/g;
  re.lastIndex = at;
  let m;
  // the list ends at the first `];` at the start of a line after it
  const end = html.indexOf('\n  ];', at);
  while ((m = re.exec(html)) && m.index < end) out.push({ id: m[1], code: eval('`' + m[2] + '`') });
  return out;
}
/** `/und/`'s one score, also inside its page, as an array joined with newlines. */
function undScore() {
  const html = readFileSync(join(HERE, '../und/index.html'), 'utf8');
  const m = html.match(/const DEFAULT_SCORE = (\[[\s\S]*?\])\.join\('\\n'\);/);
  if (!m) throw new Error('no DEFAULT_SCORE in demo/und/index.html');
  return eval(m[1]).join('\n');
}

const FAU = fauPresets();
const UND = undScore();
ok('the presets were found where they ship', FAU.length >= 4 && SC_PRESETS.length >= 3 && UND.length > 100,
  `${FAU.length} Faust, ${SC_PRESETS.length} SuperCollider, a ${UND.split('\n').length} line score`);

const texts = [
  ...FAU.map((p) => ['faust', `fau ${p.id}`, p.code]),
  ...SC_PRESETS.map((p) => ['sclang', `collide ${p.id}`, p.code]),
  ['csound-sco', 'und score', UND],
];

// ── the round trip ──────────────────────────────────────────────────────────

const unhtml = (h) => h.replace(/<[^>]*>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
/** Tokens tile the text: contiguous, in order, none empty, and joined they are it. */
function tiles(src, toks) {
  let at = 0;
  for (const t of toks) { if (t.from !== at || t.to <= t.from) return false; at = t.to; }
  return at === src.length && toks.map((t) => src.slice(t.from, t.to)).join('') === src;
}

for (const [lang, name, src] of texts) {
  const toks = tokenize(src, langOf(lang));
  const r = render(src, lang, { hueOf: () => 205 });
  ok(`round trip, ${name}: the tokens tile the text and the drawn HTML reads back as it`,
    tiles(src, toks) && unhtml(r.html) === src,
    `${src.length} characters, ${toks.length} tokens`);
}
// Half-typed states: every prefix of one preset of each language.
for (const [lang, name, src] of [texts[0], texts[FAU.length], texts[texts.length - 1]]) {
  let bad = -1;
  for (let n = 0; n <= src.length && bad < 0; n++) {
    const s = src.slice(0, n);
    if (!tiles(s, tokenize(s, langOf(lang))) || unhtml(render(s, lang, { hueOf: () => 205 }).html) !== s) bad = n;
  }
  ok(`round trip on every half-typed prefix of ${name}, which is what a highlighter actually meets`, bad < 0,
    bad < 0 ? `${src.length + 1} prefixes` : `broke at ${bad} characters`);
}

// ── the tables colour what they claim to ────────────────────────────────────

const types = (src, lang) => {
  const m = new Map();
  for (const t of tokenize(src, langOf(lang))) if (t.type) m.set(t.type, [...(m.get(t.type) || []), src.slice(t.from, t.to)]);
  return m;
};
{
  const t = types(FAU[0].code, 'faust');
  ok('Faust: a comment, a string, a library prefix, process, hslider and a composition operator are each told apart',
    t.get('comment')?.length && t.get('string')?.includes('"stdfaust.lib"') && t.get('lib')?.includes('os')
      && t.get('keyword')?.includes('process') && t.get('builtin')?.includes('hslider') && t.get('compose')?.length,
    [...t.keys()].join(' '));
  ok('NEGATIVE CONTROL: Faust leaves the comma plain, which the prototype lit inside every hslider call',
    !(t.get('compose') || []).includes(','), (t.get('compose') || []).join(''));
}
{
  const t = types(SC_PRESETS[0].code, 'sclang');
  ok('SuperCollider: a class, a rate, a symbol, a keyword label and var are each told apart',
    t.get('class')?.includes('EnvGen') && t.get('rate')?.includes('.ar') && t.get('symbol')?.includes('\\rel')
      && t.get('key')?.includes('doneAction') && t.get('keyword')?.includes('var') && t.get('comment')?.length,
    [...t.keys()].join(' '));
}
{
  // 🔴 SECOND SOURCE: the notes `csoundPart` read, by the line they came from,
  // against the lines this table colours an `i` on. `m` and `n` are not notes.
  const t = tokenize(UND, csoundSco);
  const lineOf = (i) => UND.slice(0, i).split('\n').length;
  const iLines = new Set(t.filter((x) => x.type === 'keyword' && UND[x.from] === 'i').map((x) => lineOf(x.from)));
  const notes = new Set(csoundPart(UND).part.rows.filter((r) => r.kind === 'note').map((r) => r.line));
  ok('Csound score: an i is coloured on exactly the lines csound.mjs read a note from',
    iLines.size > 0 && iLines.size === notes.size && [...notes].every((l) => iLines.has(l)),
    `${iLines.size} coloured, ${notes.size} notes, lines ${[...notes].join(' ')}`);
  const ty = types(UND, 'csound-sco');
  ok('Csound score: the label after m and n, the carries and the ; comments are told apart',
    ty.get('label')?.includes('theme') && ty.get('carry')?.includes('+') && ty.get('carry')?.includes('.')
      && ty.get('comment')?.some((c) => c.startsWith(';')),
    [...ty.keys()].join(' '));
  const lab = tokenize('m e\ni 1 0 1\nn e\n', csoundSco).filter((x) => x.type === 'keyword').length;
  ok('NEGATIVE CONTROL: a statement letter counts only at the start of a line, so a label called e is a label',
    lab === 3, `${lab} statement letters in three lines`);
  ok('NEGATIVE CONTROL: an i in the middle of a comment is not a statement',
    !tokenize('t 0 60 ; i said so\n', csoundSco).some((x) => x.type === 'keyword' && x.from > 2));
}

// ── parameters, graded against the compilers ────────────────────────────────

let faustCompiler = null, tmp = null;
try {
  const { instantiateFaustModuleFromFile, LibFaust, FaustCompiler } = await import('../fau/vendor/faustwasm.mjs');
  const V = join(HERE, '../fau/vendor/');
  tmp = mkdtempSync(join(tmpdir(), 'code-lang-faust-'));
  copyFileSync(join(V, 'libfaust-wasm.js'), join(tmp, 'libfaust-wasm.js'));
  const mod = await instantiateFaustModuleFromFile(join(tmp, 'libfaust-wasm.js'),
    join(V, 'libfaust-wasm.data.txt'), join(V, 'libfaust-wasm.wasm'));
  faustCompiler = new FaustCompiler(new LibFaust(mod));
} catch (e) {
  console.log(`  skip the Faust compiler could not be started here, so the Faust finder goes unmeasured: ${e.message}`);
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
/** Every control label in a compiled program's UI JSON. */
const faustLabels = async (code) => {
  let f = null;
  try { f = await faustCompiler.createMonoDSPFactory('clt', code, '-ftz 2'); }
  catch (e) { return [`(libfaust refused it: ${String(e.message).split('\n')[0]})`]; }
  if (!f) throw new Error(faustCompiler.getErrorMessage());
  const out = [];
  const walk = (items) => { for (const it of items) { if (it.items) walk(it.items); else out.push(it.label); } };
  walk(JSON.parse(f.json).ui);
  return out;
};
const same = (a, b) => { const A = [...new Set(a)].sort(), B = [...new Set(b)].sort(); return A.join() === B.join(); };

if (faustCompiler) {
  ok('the Faust compiler in node is the version the page pins', faustCompiler.version() === '2.89.2', faustCompiler.version());
  // ⚠️ A CONTROL DECLARED INSIDE A LIBRARY HAS NO SNIPPET IN THE BOX.
  // `pm.djembe_ui_MIDI` builds six sliders in `physmodels.lib` and the text
  // holds none of them, so there is nothing there to colour. The grade is
  // therefore two halves: every name found is a control libfaust built, and
  // every control libfaust built that was NOT found has no quoted label
  // anywhere in the program outside a comment.
  for (const p of FAU) {
    const found = findParams(p.code, 'faust').map((x) => x.name);
    const said = await faustLabels(p.code);
    const code = tokenize(p.code, faust).filter((t) => t.type !== 'comment').map((t) => p.code.slice(t.from, t.to)).join('');
    const missed = said.filter((n) => !found.includes(n));
    const inText = missed.filter((n) => new RegExp(`"[^"]*\\b${n}\\b[^"]*"`).test(code));
    ok(`Faust, ${p.id}: every parameter found is a control libfaust built, and none it built is written in the text unfound`,
      found.every((n) => said.includes(n)) && inText.length === 0,
      `found ${found.join(' ') || 'none'}, libfaust ${said.join(' ') || 'none'}`
        + (missed.length ? `, ${missed.length} from a library with no text here` : ''));
  }
  const tricky = 'import("stdfaust.lib");\n'
    + '// hslider("ghost", 1, 0, 2, 0.1) is only a comment\n'
    + '/* hslider("alsoghost", 1, 0, 2, 1) in a block comment */\n'
    + 'cut = hslider("h:filter/cutoff[unit:Hz][style:knob]", 1200, 40, 8000, 1);\n'
    + 'process = no.noise * cut / 8000 * checkbox("on");';
  const found = findParams(tricky, 'faust').map((x) => x.name);
  const said = await faustLabels(tricky);
  ok('NEGATIVE CONTROL: an hslider in a line or a block comment is not a parameter, and a path and metadata come off the name as libfaust takes them off',
    same(found, said) && !found.includes('ghost') && !found.includes('alsoghost'),
    `found ${found.join(' ')}, libfaust ${said.join(' ')}`);
}

for (const p of SC_PRESETS) {
  const found = findParams(p.code, 'sclang').map((x) => x.name);
  const r = sclCompile(p.code);
  const said = r.ok ? r.controls.map((c) => c.name) : null;
  ok(`SuperCollider, ${p.id}: the parameters found are the controls sclang-lite compiled`,
    said && same(found, said), `found ${found.join(' ')}, sclang-lite ${said ? said.join(' ') : r.error}`);
}
{
  // ⚠️ sclang-lite has no strings, so the compiler grades the comment case and
  // the string case is graded on the finder alone, on the same program.
  const src = String.raw`// \ghost.kr(3) is only a comment
{ |freq = 220, amp = 0.1, gate = 1|
    /* and \ghost2.kr(3) in a block comment */
    var env = EnvGen.kr(Env.adsr(0.01, 0.1, 0.5, \rel.kr(0.3)), gate, doneAction: 2);
    SinOsc.ar(freq, 0, amp) * env
}`;
  const found = findParams(src, 'sclang').map((x) => x.name);
  const r = sclCompile(src);
  ok('NEGATIVE CONTROL: a named control in a line or a block comment is not a parameter',
    r.ok && same(found, r.controls.map((c) => c.name)) && !found.some((n) => n.startsWith('ghost')),
    `found ${found.join(' ')}, sclang-lite ${r.ok ? r.controls.map((c) => c.name).join(' ') : r.error}`);
  const withString = src.replace('SinOsc', '"\\alsoghost.kr(4)"; SinOsc');
  const fs2 = findParams(withString, 'sclang').map((x) => x.name);
  ok('NEGATIVE CONTROL: a named control inside a string is not a parameter either',
    withString.includes('"\\alsoghost.kr(4)"') && same(fs2, found), fs2.join(' '));
  {
    // A dead match runs from inside the string across its closing quote into
    // the real call, so a finder that resumed after it lost `real`. MEASURED.
    const fsrc = 'x = "see hslider("; process = hslider("real", 1, 0, 2, 0.1);';
    ok('NEGATIVE CONTROL: a call opened inside a string is skipped and the real call after it is still found',
      same(findParams(fsrc, 'faust').map((q) => q.name), ['real']));
  }
  const argSrc = '{ arg freq = 220, amp = 0.1; SinOsc.ar(freq, 0, amp) }';
  const ar = sclCompile(argSrc);
  const af = findParams(argSrc, 'sclang').map((x) => x.name);
  ok('SuperCollider: arg ...; is the same list as |...|', ar.ok && same(af, ar.controls.map((c) => c.name)),
    `found ${af.join(' ')}, sclang-lite ${ar.ok ? ar.controls.map((c) => c.name).join(' ') : ar.error}`);
}
ok('NEGATIVE CONTROL: a finder that took every quoted string would name the import, and this one does not',
  !findParams(FAU[0].code, 'faust').some((x) => x.name === 'stdfaust.lib'));
ok('a Csound score has no parameters, since p-fields are positions', findParams(UND, 'csound-sco').length === 0);

// ── snippets and hues ───────────────────────────────────────────────────────

{
  const src = 'q = hslider("cutoff", 1200, 40, 8000, 1) + hslider("freq", 1, 0, 2, 0.1);';
  const ps = findParams(src, 'faust');
  const cut = ps.find((x) => x.name === 'cutoff');
  ok('a Faust snippet is the whole call, and its name is the quoted label',
    cut && src.slice(cut.from, cut.to) === 'hslider("cutoff", 1200, 40, 8000, 1)'
      && src.slice(cut.nameFrom, cut.nameTo) === '"cutoff"', cut && src.slice(cut.from, cut.to));
  const half = findParams('q = hslider("cutoff", 12', 'faust')[0];
  ok('a call still being typed ends its snippet after the label rather than running to the end',
    half && half.to === 'q = hslider("cutoff"'.length, half && `${half.from} to ${half.to}`);
  const book = createHueBook().assign(['cutoff']);
  const h = render(src, 'faust', { hueOf: book.hueOf }).html;
  const hued = [...h.matchAll(/data-param="(\w+)"( data-hue="[^"]*")?/g)].map((m) => [m[1], !!m[2]]);
  ok('a hue goes only on a parameter that has a knob, and the one a key plays is drawn without one',
    JSON.stringify(hued) === JSON.stringify([['cutoff', true], ['freq', false]]), JSON.stringify(hued));
}
{
  const book = createHueBook();
  book.assign(['cutoff', 'res', 'rel']);
  const first = book.names().map(book.hueOf);
  book.assign(['cutoff', 'rel', 'drive']);
  ok('a name keeps its hue while it exists, a vanished one frees its hue, and a new name takes the first free one',
    JSON.stringify(first) === JSON.stringify(PARAM_HUES.slice(0, 3))
      && book.hueOf('cutoff') === first[0] && book.hueOf('rel') === first[2]
      && book.hueOf('res') === null && book.hueOf('drive') === first[1],
    `${first.join(' ')} then cutoff ${book.hueOf('cutoff')} rel ${book.hueOf('rel')} drive ${book.hueOf('drive')}`);
  book.clear().assign(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  ok('past six a name gets no hue and the book says so',
    book.hueOf('f') === PARAM_HUES[5] && book.hueOf('g') === null && book.cuts.length === 1 && /^g:/.test(book.cuts[0]),
    book.cuts.join('; '));
  ok('NEGATIVE CONTROL: no hue is yellow, red or the green of a passing mark',
    PARAM_HUES.every((h) => !(h >= 40 && h <= 70) && !(h <= 12 || h >= 350) && !(h >= 125 && h <= 155)),
    PARAM_HUES.join(' '));
}
ok('an unknown language is refused by name rather than drawn as plain text',
  (() => { try { langOf('cobol'); return false; } catch (e) { return /no language called cobol/.test(e.message); } })());

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);

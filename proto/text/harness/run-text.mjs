// proto/text/harness/run-text.mjs — headless verification of the TEXT PERFORMER.
// ONE Chrome, one tab, port 8889.
//
//   node proto/text/harness/run-text.mjs
//
// The synthetic performance is driven through the REAL browser input pipeline
// (CDP Input.dispatchKeyEvent / Input.insertText / editing commands), so the
// page sees genuine `beforeinput` events. It deliberately includes every case
// the five ancestors failed:
//
//   1  plain typing
//   2  backspace
//   3  ARROW-KEY cursor moves, then insertion MID-STRING
//   4  MULTI-LINE: Enter, then ArrowUp, then insert on the line above
//   5  SELECTION REPLACE: shift+Arrow to select, then type over it
//   6  PASTE (real clipboard, via the paste editing command)
//   7  Input.insertText — the emoji-keyboard / IME-commit path
//   8  Input.imeSetComposition — real composition, if the platform allows it
//
// Asserts:
//   A  final document reproduced CHARACTER-FOR-CHARACTER by replay
//   B  C2 on real text: reduce(prefix<=t) === document after play(0->t), x3
//   C  selection restored on seek (DOM selectionStart/End), x3
//   D  pause holds
//   E  rate 2x halves the wall duration of a fixed span
//   F  the two lanes stayed identical throughout
//   G  zero console errors / exceptions
//
// Machine rules: port 8889 only, CDP 9329, chrome user-data-dir prefix
// text-udd, kills only its own processes.

import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { openSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDP } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SCRATCH = '/private/tmp/claude-501/-Users-s32863-personal-positron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8889;
const BASE = `http://127.0.0.1:${PORT}`;
const DBG = 9329;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (c) => { try { return execSync(c, { encoding: 'utf8' }); } catch (e) { return (e && e.stdout) || ''; } };
const kids = [];
function run(cmd, argv, name) {
  const fd = openSync(join(SCRATCH, `text-${name}.log`), 'a');
  const p = spawn(cmd, argv, { stdio: ['ignore', fd, fd] });
  kids.push(p);
  return p;
}

const R = { at: new Date().toISOString(), node: process.version, asserts: [], numbers: {} };
let pass = 0, fail = 0;
function check(name, ok, detail) {
  R.asserts.push({ name, ok: !!ok, detail });
  if (ok) { pass++; console.log(`  PASS ${name} — ${detail}`); }
  else { fail++; console.log(`  FAIL ${name} — ${detail}`); }
}
const show = (s) => JSON.stringify(String(s).length > 90 ? String(s).slice(0, 90) + '…' : s);

// ---------------------------------------------------------------------------
// input driver
// ---------------------------------------------------------------------------

const VK = { Backspace: 8, Enter: 13, End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
function codeFor(ch) {
  if (ch === ' ') return 'Space';
  if (/[a-zA-Z]/.test(ch)) return 'Key' + ch.toUpperCase();
  if (/[0-9]/.test(ch)) return 'Digit' + ch;
  return '';
}
function vkFor(ch) {
  if (ch === ' ') return 32;
  if (/[a-zA-Z0-9]/.test(ch)) return ch.toUpperCase().charCodeAt(0);
  return 0;
}

let page;
async function typeChar(ch) {
  const base = { key: ch, code: codeFor(ch), windowsVirtualKeyCode: vkFor(ch), nativeVirtualKeyCode: vkFor(ch) };
  await page.send('Input.dispatchKeyEvent', { ...base, type: 'keyDown', text: ch, unmodifiedText: ch });
  await page.send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
}
async function typeStr(s, msPerChar = 62, jitter = 26) {
  for (const ch of s) { await typeChar(ch); await sleep(msPerChar + Math.random() * jitter); }
}
async function special(name, { modifiers = 0, text = null, commands = null, gap = 55 } = {}) {
  const base = { key: name, code: name, windowsVirtualKeyCode: VK[name] || 0, nativeVirtualKeyCode: VK[name] || 0, modifiers };
  const down = { ...base, type: text != null ? 'keyDown' : 'rawKeyDown' };
  if (text != null) { down.text = text; down.unmodifiedText = text; }
  if (commands) down.commands = commands;
  await page.send('Input.dispatchKeyEvent', down);
  await page.send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  await sleep(gap);
}
async function repeat(n, fn) { for (let i = 0; i < n; i++) await fn(); }
/** an editing command dispatched on a modifier chord — the same path a real
 *  keybinding takes, which is what makes the paste a REAL paste. */
async function command(cmds, { key = 'v', code = 'KeyV', vk = 86, modifiers = 4 } = {}) {
  await page.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers, commands: cmds,
  });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, modifiers });
  await sleep(90);
}

// ---------------------------------------------------------------------------

let chrome;

async function main() {
  await mkdir(join(ROOT, 'results'), { recursive: true });
  sh(`pkill -f 'text-udd' 2>/dev/null`);
  sh(`pkill -f 'proto/text/server.mjs' 2>/dev/null`);
  await sleep(400);

  run('node', [join(ROOT, 'server.mjs')], 'server');
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/time-local'); break; } catch { await sleep(250); } }
  console.log(`server up :${PORT}`);

  chrome = run(CHROME, [
    '--headless=new', `--user-data-dir=${SCRATCH}/text-udd`, `--remote-debugging-port=${DBG}`,
    '--no-first-run', '--no-default-browser-check', '--window-size=1400,1300',
    '--force-device-scale-factor=1', '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required',
    `${BASE}/text.html`,
  ], 'chrome');

  page = await new CDP().connect(DBG, 'text.html');
  const consoleErrors = [];
  page.on('Runtime.exceptionThrown', (p) => consoleErrors.push('exception: ' +
    String(p?.exceptionDetails?.exception?.description || p?.exceptionDetails?.text).slice(0, 300)));
  page.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') consoleErrors.push('console.error: ' + JSON.stringify(p.args?.[0]?.value ?? '').slice(0, 300)); });
  page.on('Log.entryAdded', (p) => { if (p.entry?.level === 'error') consoleErrors.push('log: ' + String(p.entry.text).slice(0, 300)); });
  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('Page.enable');

  for (let i = 0; i < 60; i++) { if (await page.eval('!!window.textReady')) break; await sleep(250); }
  console.log('page ready\n');

  // ------------------------------------------------------------------
  // THE SYNTHETIC PERFORMANCE
  // ------------------------------------------------------------------
  await page.eval('text.arm()');
  await sleep(120);
  const marks = {};

  console.log('[perform] 1 typing');
  await typeStr('the recorder records');

  console.log('[perform] 2 backspace x7');
  await sleep(340); marks.gap1 = true;
  await repeat(7, () => special('Backspace', { gap: 95 }));         // -> "the recorder"

  console.log('[perform] 3 arrow-key move then insert mid-string');
  await sleep(300);
  await repeat(9, () => special('ArrowLeft', { gap: 48 }));          // caret 12 -> 3
  await typeStr(' own');                                            // "the own recorder"
  await sleep(340);

  console.log('[perform] 4 multi-line: End, Enter, type, ArrowUp, insert');
  await command(['moveToEndOfDocument'], { key: 'ArrowDown', code: 'ArrowDown', vk: 40 });
  await special('Enter', { text: '\r', gap: 110 });
  await typeStr('records the act of');
  await sleep(320);
  await special('ArrowUp', { gap: 90 });                            // back to line 1
  await typeStr('!');                                               // insert on the line above
  await sleep(340);

  console.log('[perform] 5 selection replace (shift+ArrowLeft x2, then type)');
  await command(['moveToEndOfDocument'], { key: 'ArrowDown', code: 'ArrowDown', vk: 40 });
  await repeat(2, () => special('ArrowLeft', { modifiers: 8, gap: 70 }));   // select "of"
  await typeStr('recording');                                       // replaces the selection

  console.log('[perform] 6 paste (real clipboard, paste editing command)');
  await sleep(320);
  await page.eval(`text.stageClip(" — 2026")`);
  await sleep(60);
  await command(['copy'], { key: 'c', code: 'KeyC', vk: 67 });
  await page.eval('text.setCaret(text.dom().value.length)');
  await sleep(120);
  await command(['paste']);

  console.log('[perform] 7 Input.insertText (emoji-keyboard / IME-commit path)');
  await sleep(260);
  await page.send('Input.insertText', { text: ' ✓' });
  await sleep(200);

  console.log('[perform] 8 Input.imeSetComposition (real composition)');
  let imeNote = 'not attempted';
  try {
    await page.send('Input.imeSetComposition', { text: 'ter', selectionStart: 3, selectionEnd: 3 });
    await sleep(140);
    await page.send('Input.imeSetComposition', { text: 'tere', selectionStart: 4, selectionEnd: 4 });
    await sleep(140);
    await page.send('Input.insertText', { text: 'tere' });
    imeNote = 'dispatched';
  } catch (e) { imeNote = 'CDP refused: ' + String(e.message).slice(0, 120); }
  await sleep(280);

  // ground truth = what the BROWSER itself has in the textarea
  const truth = await page.eval('JSON.stringify(text.dom())').then(JSON.parse);
  console.log(`\n[truth] ${show(truth.value)}  sel=[${truth.selStart},${truth.selEnd}]`);

  const stop = await page.eval('JSON.stringify(text.disarm())').then(JSON.parse);
  await sleep(250);
  const st0 = await page.eval('JSON.stringify(text.state())').then(JSON.parse);
  R.numbers.capture = {
    ops: st0.ops, deckItems: st0.deckItems, schedTotal: st0.schedTotal, durationMs: st0.durationMs,
    truthChars: truth.value.length, truthLines: truth.value.split('\n').length,
  };
  R.numbers.provenance = st0.prov;
  R.numbers.caps = st0.caps;
  R.numbers.ime = { note: imeNote, inputTypes: st0.prov.inputTypes, compositionOps: st0.prov.composition };
  R.truth = truth;
  console.log(`[capture] ops=${st0.ops} deckItems=${st0.deckItems} sched=${st0.schedTotal} duration=${st0.durationMs} ms`);
  console.log(`[inputTypes] ${JSON.stringify(st0.prov.inputTypes)}`);

  // ------------------------------------------------------------------
  // A — final document, character-for-character
  // ------------------------------------------------------------------
  await page.eval('text.S.deck.seek(text.S.deck.range[1])');
  await sleep(220);
  const endSeek = await page.eval('JSON.stringify(text.state())').then(JSON.parse);
  check('A0 seek-to-end-exact', endSeek.dom.value === truth.value,
    `seek(end) DOM ${endSeek.dom.value === truth.value ? 'matches' : 'DIFFERS from'} the browser's own text (${truth.value.length} chars)`);

  const full = await page.eval(`text.replayTo(text.S.deck.range[1] - 2, 3).then(JSON.stringify)`).then(JSON.parse);
  R.numbers.replay = { chars: full.played.text.length, fires: full.fires, assertsDuringPlay: full.assertsDuringPlay, stoppedAt: full.stoppedAt };
  check('A replay-character-for-character', full.played.text === truth.value,
    `replay at 3x produced ${full.played.text.length} chars via ${full.fires} actuate() calls, ${full.assertsDuringPlay} asserts; ` +
    (full.played.text === truth.value ? 'identical to the browser' : `got ${show(full.played.text)} want ${show(truth.value)}`));
  check('A2 replay-selection', full.played.selection[0] === truth.selStart && full.played.selection[1] === truth.selEnd,
    `selection after replay [${full.played.selection}] vs browser [${truth.selStart},${truth.selEnd}]`);

  // ------------------------------------------------------------------
  // B — C2 on real text, at three mid-performance times
  // ------------------------------------------------------------------
  const probes = await page.eval('JSON.stringify(text.quietProbes(3))').then(JSON.parse);
  console.log(`\n[probes] ${probes.map((p) => `${p.pos.toFixed(0)}ms (in a ${p.gapMs.toFixed(0)}ms silence)`).join(' · ')}`);
  const c2 = [];
  for (const pr of probes) {
    const r = await page.eval(`text.replayTo(${pr.pos}, 3).then(JSON.stringify)`).then(JSON.parse);
    const okText = r.played.text === r.reducedAtT.text && r.played.text === r.reducedAtStop.text;
    const okSel = r.played.selection[0] === r.reducedAtT.selection[0] && r.played.selection[1] === r.reducedAtT.selection[1];
    c2.push({ pos: pr.pos, gapMs: pr.gapMs, stoppedAt: r.stoppedAt, chars: r.played.text.length,
              ops: r.reducedAtT.ops, okText, okSel, played: r.played.text, reduced: r.reducedAtT.text });
    console.log(`  t=${pr.pos.toFixed(0)}ms  played=${show(r.played.text)}  reduce=${okText ? 'IDENTICAL' : show(r.reducedAtT.text)}  sel ${okSel ? 'ok' : 'MISMATCH'}`);
  }
  R.numbers.c2 = c2.map(({ played, reduced, ...k }) => k);
  R.c2Texts = c2.map((c) => ({ pos: c.pos, text: c.played }));
  check('B C2-on-real-text', c2.every((c) => c.okText) && c2.length === 3,
    `reduce(prefix<=t) === play(0->t) at ${c2.map((c) => `${c.pos.toFixed(0)}ms/${c.chars}ch`).join(', ')}`);
  check('B2 C2-selection', c2.every((c) => c.okSel),
    `folded selection matches the played selection at all ${c2.length} probes`);

  // ------------------------------------------------------------------
  // C — selection restored on seek (read back off the DOM)
  // ------------------------------------------------------------------
  const seeks = [];
  for (const pr of probes) {
    const s = await page.eval(`JSON.stringify(text.seekProbe(${pr.pos}))`).then(JSON.parse);
    await sleep(60);
    const dom = await page.eval('JSON.stringify(text.dom())').then(JSON.parse);
    seeks.push({
      pos: s.pos, reduced: s.reduced.selection, dom: [dom.selStart, dom.selEnd],
      textOk: dom.value === s.reduced.text,
      selOk: dom.selStart === s.reduced.selection[0] && dom.selEnd === s.reduced.selection[1],
    });
  }
  R.numbers.seek = seeks;
  for (const s of seeks) console.log(`[seek] ${s.pos.toFixed(0)}ms  DOM sel [${s.dom}] vs reduce sel [${s.reduced}]  text ${s.textOk ? 'ok' : 'MISMATCH'}`);
  check('C seek-restores-selection', seeks.every((s) => s.selOk && s.textOk),
    `assertState() set value + setSelectionRange at all ${seeks.length} seeks`);

  // ------------------------------------------------------------------
  // D — pause holds
  // ------------------------------------------------------------------
  const hold = await page.eval('text.pauseHolds(400).then(JSON.stringify)').then(JSON.parse);
  R.numbers.pause = hold;
  check('D pause-holds', Math.abs(hold.driftMs) < 0.001 && hold.rate === 0 && hold.textStable,
    `position ${hold.before.toFixed(3)} -> ${hold.after.toFixed(3)} over 400 ms (drift ${hold.driftMs}), rate=${hold.rate}, document unchanged=${hold.textStable}`);

  // ------------------------------------------------------------------
  // E — rate 2x
  // ------------------------------------------------------------------
  const span = [Math.min(...probes.map((p) => p.pos)), Math.max(...probes.map((p) => p.pos))];
  const t1 = await page.eval(`text.traverse(${span[0]}, ${span[1]}, 1).then(JSON.stringify)`).then(JSON.parse);
  const t2 = await page.eval(`text.traverse(${span[0]}, ${span[1]}, 2).then(JSON.stringify)`).then(JSON.parse);
  const ratio = t1.wallMs / t2.wallMs;
  R.numbers.rate = { spanMs: +(span[1] - span[0]).toFixed(1), rate1: t1, rate2: t2, ratio: +ratio.toFixed(3) };
  console.log(`[rate] 1x ${t1.wallMs} ms · 2x ${t2.wallMs} ms · ratio ${ratio.toFixed(3)}`);
  check('E rate-2x', ratio > 1.85 && ratio < 2.15,
    `${(span[1] - span[0]).toFixed(0)} ms span: ${t1.wallMs} ms @1x vs ${t2.wallMs} ms @2x -> ${ratio.toFixed(3)}x`);

  // ------------------------------------------------------------------
  // F — the two lanes
  // ------------------------------------------------------------------
  const st = await page.eval('JSON.stringify(text.state())').then(JSON.parse);
  R.numbers.lanes = st.lane;
  R.numbers.adapter = st.adapter;
  R.numbers.catchUpReduces = st.catchUpReduces;
  R.numbers.audio = st.audio;
  console.log(`[lanes] ${st.lane.compares} compares (${st.lane.playCompares} while playing), ${st.lane.divergences} divergences, ${st.lane.lags} dispatch lags, ${st.lane.skips} settling skips`);
  check('F two-lanes-identical', st.lane.divergences === 0 && st.lane.compares > 500 && st.lane.playCompares > 0,
    `lane A (actuate, op-at-a-time) === lane B (reduce, whole prefix) over ${st.lane.compares} frame samples: ${st.lane.divergences} divergences, ${st.lane.lags} samples one dispatch apart${st.lane.last ? ' :: ' + JSON.stringify(st.lane.last).slice(0, 200) : ''}`);

  // ------------------------------------------------------------------
  // jsonl round-trip
  // ------------------------------------------------------------------
  const rt = await page.eval(`(() => {
    const s = text.exportJsonl();
    const before = JSON.stringify(text.S.log);
    const r = text.importJsonl(s);
    return JSON.stringify({ bytes: s.length, lines: s.split('\\n').length, items: r.items,
      same: JSON.stringify(text.S.log) === before });
  })()`).then(JSON.parse);
  await sleep(200);
  await page.eval('text.S.deck.seek(text.S.deck.range[1])');
  await sleep(200);
  const afterRt = await page.eval('JSON.stringify(text.dom())').then(JSON.parse);
  R.numbers.jsonl = { ...rt, reimportedMatches: afterRt.value === truth.value };
  check('H jsonl-round-trip', rt.same && afterRt.value === truth.value,
    `${rt.bytes} bytes / ${rt.lines} lines exported, re-imported to ${rt.items} items, document identical`);

  // ------------------------------------------------------------------
  // G — console errors
  // ------------------------------------------------------------------
  R.numbers.errors = { cdp: consoleErrors, page: st.errors };
  check('G zero-console-errors', consoleErrors.length === 0 && st.errors.length === 0,
    `cdp=${consoleErrors.length} page=${st.errors.length}${consoleErrors.length ? ' :: ' + consoleErrors[0] : ''}`);

  // ------------------------------------------------------------------
  // target-ranges probe + screenshot
  // ------------------------------------------------------------------
  await page.eval('text.ceArm()');
  await sleep(120);
  await typeChar('Z'); await sleep(140);
  await special('Backspace', { gap: 140 });
  const tr = await page.eval('JSON.stringify(text.ceRead())').then(JSON.parse);
  R.numbers.targetRanges = tr;
  console.log(`[getTargetRanges] textarea: ${tr.textarea.nonEmpty}/${tr.textarea.seen} non-empty · contenteditable: ${JSON.stringify(tr.contenteditable)}`);
  check('I target-ranges-measured', tr.textarea.seen > 0 && tr.contenteditable.length > 0,
    `<textarea> gave ${tr.textarea.nonEmpty}/${tr.textarea.seen} non-empty getTargetRanges(); contenteditable gave ` +
    tr.contenteditable.map((c) => `${c.inputType}:${c.targetRanges}${c.targetRanges > 0 ? `[${c.start},${c.end}]` : ''}`).join(' '));

  await page.eval(`(() => {
    document.activeElement && document.activeElement.blur();
    text.S.deck.pause(); text.S.deck.seek(${(st0.durationMs * 0.72).toFixed(2)}); text.S.deck.setRate(1);
    window.scrollTo(0, 0);
  })()`);
  await sleep(500);
  await page.eval('window.scrollTo(0, 0)');
  await sleep(120);
  const png = await page.screenshot();
  const shot = join(ROOT, 'results', 'text-verify.png');
  await writeFile(shot, png);
  R.screenshot = shot;
  console.log(`\nscreenshot -> ${shot}`);

  R.summary = { pass, fail };
  await writeFile(join(ROOT, 'results', 'verify.json'), JSON.stringify(R, null, 2));
  console.log(`\n${pass} pass / ${fail} fail`);
}

main().catch((e) => { console.error('HARNESS ERROR', e); fail++; })
  .finally(async () => {
    try { page && page.close(); } catch {}
    for (const k of kids) { try { process.kill(k.pid, 'SIGTERM'); } catch {} }
    await sleep(400);
    sh(`pkill -f 'text-udd' 2>/dev/null`);
    sh(`pkill -f 'proto/text/server.mjs' 2>/dev/null`);
    process.exit(fail ? 1 : 0);
  });

// demo/shell/link-options-test.mjs: a video link's size and rate, with no
// browser, no socket and no board.
//
//   node demo/shell/link-options-test.mjs
//
// What is graded: the option table, the refusals in words, the text form
// round trip through `bay.mjs`'s `parseLink`/`printLink`, that the bay stores
// and refuses options per medium, and that a link with no options asks the
// board for exactly the message `openers.mjs` hard coded before.
// What is NOT graded here: `openers.mjs`'s `video()` itself, which needs a
// document, a WebSocket and a board. Its one claim gradable from source (no
// literal size left in it) is asserted over code with the comments stripped.
//
// NEGATIVE CONTROLS: 13 of them, each a value or a line that must be refused,
// and each asserts the REASON, because a checker that refuses everything for
// one reason is the same bug from the other side.
// MEASURED 2026-10-09 against 34 green, one fault at a time on a scratch copy:
//   range check removed in checkOptions            6 of 34 red
//   even check removed                             1 of 34 red
//   bay.mjs validate ignores checkOptions          4 of 34 red
//   checkOptions ignores the medium                2 of 34 red
//   default width changed to 1920                  2 of 34 red

import { readFileSync } from 'node:fs';
import { LINK_OPTIONS, OPTION_NAMES, isOption, checkOptions, resolveOptions, videoStart }
  from './link-options.mjs';
import { createBay, parseLink, printLink, OP_NAMES } from './bay.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ` (${detail})` : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` (${detail})` : ''}`); }
};
const why = (m, o) => checkOptions(m, o).why || '';

console.log('== the table ==');
ok('defaults are today\'s hard coded values, 1280x720 at 30',
  JSON.stringify(resolveOptions('video')) === '{"w":1280,"h":720,"fps":30}', JSON.stringify(resolveOptions('video')));
ok('ceilings are the board\'s clamps, 1920, 1080 and 60',
  LINK_OPTIONS.video.w.hi === 1920 && LINK_OPTIONS.video.h.hi === 1080 && LINK_OPTIONS.video.fps.hi === 60);
ok('no option name is also a transform name, so a body word means one thing',
  OPTION_NAMES.every((k) => !OP_NAMES.includes(k)), OPTION_NAMES.join(','));
ok('isOption knows w, h, fps and not transpose', isOption('w') && isOption('fps') && !isOption('transpose'));

console.log('== the message to the board ==');
ok('a link with no options asks exactly what openers.mjs sent before',
  JSON.stringify(videoStart()) === JSON.stringify({ type: 'video.start', w: 1280, h: 720, fps: 30 }), JSON.stringify(videoStart()));
ok('and undefined options are the same as none', JSON.stringify(videoStart(undefined)) === JSON.stringify(videoStart({})));
ok('a link with options asks for them, and a missing one keeps its default',
  JSON.stringify(videoStart({ w: 640, h: 360 })) === '{"type":"video.start","w":640,"h":360,"fps":30}');

console.log('== the checker ==');
ok('nothing to check is fine', checkOptions('video') === '' && checkOptions('audio', {}) === '');
ok('640x360 at 15 is fine', checkOptions('video', { w: 640, h: 360, fps: 15 }) === '');
ok('the ceilings themselves are fine', checkOptions('video', { w: 1920, h: 1080, fps: 60 }) === '');
ok('NEGATIVE CONTROL: w 2560 is refused and the board\'s ceiling is named',
  /w 2560 is outside 16 to 1920, which is as much as the board will draw/.test(why('video', { w: 2560 })), why('video', { w: 2560 }));
ok('NEGATIVE CONTROL: fps 120 is refused with its range', /fps 120 is outside 1 to 60/.test(why('video', { fps: 120 })), why('video', { fps: 120 }));
ok('NEGATIVE CONTROL: fps 0 is refused, the floor is a floor', /fps 0 is outside 1 to 60/.test(why('video', { fps: 0 })), why('video', { fps: 0 }));
ok('NEGATIVE CONTROL: an odd height is refused as odd, not as out of range',
  /h 721 is odd/.test(why('video', { h: 721 })) && /720 or 722/.test(checkOptions('video', { h: 721 }).fix), why('video', { h: 721 }));
ok('NEGATIVE CONTROL: a word is refused and quoted', /w is the width in pixels .* and big is not/.test(why('video', { w: 'big' })), why('video', { w: 'big' }));
ok('NEGATIVE CONTROL: a fraction is refused', /and 29.97 is not/.test(why('video', { fps: 29.97 })), why('video', { fps: 29.97 }));
ok('NEGATIVE CONTROL: no value is refused as no value', /given no value/.test(why('video', { w: undefined })), why('video', { w: undefined }));
ok('NEGATIVE CONTROL: options on an audio link are refused by medium',
  /an? audio link has no options, and this one was given w/.test(why('audio', { w: 640 })), why('audio', { w: 640 }));

console.log('== the text form, through bay.mjs ==');
const line = 'studio-1:gpu:video -> web-xx:screen:video { w 640, h 360, fps 15 }';
const p = parseLink(line);
ok('parseLink puts w, h, fps in options and none in transforms',
  p.transforms.length === 0 && JSON.stringify(p.options) === '{"w":640,"h":360,"fps":15}', JSON.stringify(p));
ok('printLink writes them back in the same body', printLink(p) === line, printLink(p));
ok('a line with no body has no options key and prints unchanged',
  !('options' in parseLink('a:b:video -> c:d:video')) && printLink(parseLink('a:b:video -> c:d:video')) === 'a:b:video -> c:d:video');
ok('options and via together round trip',
  printLink(parseLink('a:b:video -> c:d:video { fps 15 } via relay-h264')) === 'a:b:video -> c:d:video { fps 15 } via relay-h264');
ok('a transform and an option in one body both survive parsing',
  (() => { const q = parseLink('a:b:out -> c:d:in { channel 2, fps 15 }'); return q.transforms[0]?.op === 'channel' && q.options?.fps === 15; })());
let threw = '';
try { parseLink('a:b:video -> c:d:video { w 640, w 320 }'); } catch (e) { threw = e.message; }
ok('NEGATIVE CONTROL: an option given twice is refused at parse', /w is given twice/.test(threw), threw);
threw = '';
try { parseLink('a:b:video -> c:d:video { w 640 480 }'); } catch (e) { threw = e.message; }
ok('NEGATIVE CONTROL: an option with two values is refused at parse', /w takes one value/.test(threw), threw);

console.log('== the bay keeps and refuses them ==');
function desk() {
  const b = createBay();
  b.addPort({ id: 'rig:gpu:video', label: 'GPU video', dir: 'out', medium: 'video', shape: {} });
  b.addPort({ id: 'home:page:video', label: 'home video', dir: 'in', medium: 'video', shape: {} });
  b.addPort({ id: 'rig:mic:audio', label: 'mic', dir: 'out', medium: 'audio', shape: {} });
  b.addPort({ id: 'home:page:audio', label: 'home audio', dir: 'in', medium: 'audio', shape: {} });
  return b;
}
{
  const b = desk();
  const r = b.link('rig:gpu:video', 'home:page:video', [], { options: { w: 640, h: 360, fps: 15 } });
  const lk = b.links().find((x) => x.id === r.id);
  ok('a video link with options is made and keeps them', r.ok && lk?.options?.fps === 15, r.why);
  ok('and the bay prints them', printLink(lk) === 'rig:gpu:video -> home:page:video { w 640, h 360, fps 15 }', printLink(lk));
  const plain = b.link('rig:gpu:video', 'home:page:video');
  ok('a link with no options has no options key, as before', plain.ok && !('options' in b.links().find((x) => x.id === plain.id)));
  const big = b.link('rig:gpu:video', 'home:page:video', [], { options: { w: 4096 } });
  ok('NEGATIVE CONTROL: the bay refuses w 4096 in words', !big.ok && /w 4096 is outside 16 to 1920/.test(big.why), big.why);
  const aud = b.link('rig:mic:audio', 'home:page:audio', [], { options: { fps: 15 } });
  ok('NEGATIVE CONTROL: the bay refuses fps on an audio link', !aud.ok && /audio link has no options/.test(aud.why), aud.why);
}
{
  const b = desk();
  const bad = b.load('rig:gpu:video -> home:page:video { fps 15 }\nrig:gpu:video -> home:page:video { fps 90 }');
  ok('load takes a text line\'s options and refuses the bad one by its reason',
    bad.length === 1 && /fps 90 is outside 1 to 60/.test(bad[0].why) && b.links()[0]?.options?.fps === 15, JSON.stringify(bad));
  ok('and the bay\'s text is the line it loaded', b.text() === 'rig:gpu:video -> home:page:video { fps 15 }', b.text());
}

console.log('== the opener ==');
{
  const src = readFileSync(new URL('./openers.mjs', import.meta.url), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  ok('openers.mjs asks through videoStart(l.options)', /videoStart\(l\.options\)/.test(code));
  ok('and has no literal 1280x720 at 30 left in its code',
    !/w:\s*1280/.test(code) && !/fps:\s*30/.test(code) && !/width\s*=\s*1280/.test(code));
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}\n`);
process.exit(fail ? 1 : 0);

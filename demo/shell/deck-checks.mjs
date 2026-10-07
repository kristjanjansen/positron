// demo/shell/deck-checks.mjs: the synths deck's own checks, plans/plan-live-slides.md section 7.
//
// 🔴 THEY LIVED ON /kit/slides/ UNTIL 2026-10-06, when the deck left that page,
// asked as *"SYNTHS DECK - rm from slides kit page"*. They run on the deck's own
// page now, https://positron.studio/slides/synths/, from `deckPage` in
// `decks.mjs`, behind `?selfcheck=1` like every check, and AFTER that page's own
// three, because these are the only ones that fetch anything: Start imports the
// Faust runtime and fetches the compiled program, and after an edit the live
// compiler loads. The visit and a step open nothing, asserted before the press.
// ⚠️ ONE CHECK DID NOT MOVE: the half width player's footer showing the deck's
// title as a link. That player is the front page's, and the deck page plays the
// deck at full width with the ordinary count, which `deckChecks` asserts.
// Every reading is the far side of a boundary: the resource list the browser
// keeps, the count of contexts `audio.mjs` has made, an analyser on the graph,
// the context's own `state`.

import { plain, lintWords } from './slide.mjs';
import { PANEL_H } from './slide-synth.mjs';
import { contexts as audioContexts, audioOwner } from './audio.mjs';
import { unmapSpec } from './param-knobs.mjs';
import { SYNTH_STEPS } from './synth-steps.mjs';

export async function synthChecks(d, p) {
  const nap = (ms) => new Promise((r) => setTimeout(r, ms));
  const frames = (n) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  // 🔴 NO STRETCH OF THESE CHECKS IS SILENT FOR LONGER THAN THE HARNESS
  // WAITS. `verify.mjs` stops collecting after 2.0 s with no new assert, and
  // on 2026-10-06 a wedged AudioContext made slide 3's three level waits run
  // out back to back, 4.7 s of silence, so the six asserts after them were
  // never made and the run read 92/94 rather than 92/100. Every wait here
  // is cut to what is left of QUIET_MS since the last assert, so a red lands
  // as a red and the asserts after it still run. The longest quiet stretch
  // is measured and printed on the last assert, so a check creeping towards
  // the limit is visible before it is cut.
  const QUIET_MS = 1800;
  let said = performance.now(), quietest = 0;
  const assert0 = d.assert;
  d.assert = (...a) => { const t = performance.now(); quietest = Math.max(quietest, t - said); said = t; return assert0(...a); };
  const left = () => Math.max(0, QUIET_MS - (performance.now() - said));
  const until = async (f, ms) => { const t0 = performance.now(), cap = Math.min(ms, left()); while (!f() && performance.now() - t0 < cap) await nap(25); return f(); };
  const settled = (x) => Promise.race([x.idle.settled(), nap(left())]);
  const ENGINE = /\/fau\/vendor\/|\/resources\/faust\/|\/shell\/faust\.mjs/;
  const COMPILER = /\/fau\/vendor\/libfaust-wasm/;
  const names = () => performance.getEntriesByType('resource').map((e) => e.name);
  const engine = () => names().filter((n) => ENGINE.test(new URL(n).pathname));
  const compiler = () => performance.getEntriesByType('resource').filter((e) => COMPILER.test(new URL(e.name).pathname));
  const toneIdx = p.slides.findIndex((s) => s.ctl && s.ctl.tone);
  // every slide with an instrument on it, read off the deck rather than typed
  const inst = p.slides.map((s, i) => (s.ctl ? i : -1)).filter((i) => i >= 0);
  const FLOOR = 0.01;

  // 1. a visit loaded no engine and made no sound device, and the title is two lines at the top step
  const atVisit = engine();
  const intro = p.slides[0];
  const lines = intro.parts.lines;
  d.assert('SYNTHS: the visit loaded no Faust engine and made no AudioContext, and the title is two lines at step 5 with a caption and no body',
    atVisit.length === 0 && audioContexts() === 0 && p.slides.length === 1 + SYNTH_STEPS.filter((st) => !st.hidden).length && toneIdx === 1 && p.at() === 0
      && lines.length === 2 && lines.every((l) => l.dataset.step === '5') && plain(lines.map((l) => l.textContent).join(' ')) === 'Synths in code'
      && !intro.parts.say && !intro.parts.text && !intro.parts.slot && !!intro.parts.cap && lintWords(intro.spec.cap).length === 0,
    `${atVisit.length} engine request(s)${atVisit.length ? `: ${atVisit.slice(0, 2).join(', ')}` : ''}, `
    + `${audioContexts()} context(s) made, ${p.slides.length} slides, the instrument on slide ${toneIdx + 1}, `
    + `the title ${lines.map((l) => `"${l.textContent}" at step ${l.dataset.step}`).join(' over ')}, caption "${intro.spec.cap}"`);

  // 2. a step through the whole deck opened nothing, and every slide fits at this width
  const resAt = performance.getEntriesByType('resource').length;
  const spills = [];
  let sw = 0;
  for (let i = 0; i < p.slides.length; i++) {
    p.go(i);
    await frames(3);
    // the shown slide's width, read while it is shown: a hidden one is 0
    sw = p.slides[i].el.getBoundingClientRect().width;
    const inn = p.slides[i].el.querySelector('.sl-in');
    if (inn.scrollHeight > inn.clientHeight + 1 || inn.scrollWidth > inn.clientWidth + 1) spills.push(p.slides[i].spec.name);
  }
  const stepped = performance.getEntriesByType('resource').slice(resAt).map((e) => e.name)
    .filter((n) => !(new URL(n).pathname === '/_log' || /^\/shell\/vendor\/[^/]+\.woff2$/.test(new URL(n).pathname)));
  d.assert('SYNTHS: stepping through every slide fetched nothing and made no AudioContext, and no slide spills at this width',
    stepped.length === 0 && engine().length === 0 && audioContexts() === 0 && spills.length === 0 && p.at() === p.slides.length - 1,
    `${p.slides.length} slides at ${sw.toFixed(0)} px wide, ${stepped.length} request(s)${stepped.length ? `: ${stepped.slice(0, 2).join(', ')}` : ''}, `
    + `${audioContexts()} context(s)${spills.length ? `, SPILLING: ${spills.join(', ')}` : ''}`);

  // 3. the instrument is one panel, scope, editable code and a FAU plate with Start at its right end
  const S = p.slides[toneIdx], c = S.ctl;
  p.go(toneIdx);
  await frames(3);
  p.el.scrollIntoView({ block: 'center' });
  await frames(2);
  {
    const shape = c.panel.shape().join(' ');
    const plateRow = c.panel.plateRow;
    const pr = plateRow.getBoundingClientRect(), tr = c.tone.getBoundingClientRect();
    const plateText = plateRow.querySelector('.panel-plate')?.textContent.trim();
    const inSlot = S.parts.slot.contains(c.panel.el) && S.parts.slot.contains(c.code.el) && !S.parts.words.contains(c.code.el);
    const noKeys = !S.el.querySelector('.kbd, .keys, .pos-knob, .sld-knob');
    d.assert('SYNTHS: the slot holds one instrument panel, scope then editable code then a FAU plate with Start at its right end, and no keys or knobs',
      shape === 'viz controls plate' && inSlot && noKeys && !c.code.input.readOnly && c.code.value() === c.shipped
        && /os\.osc\(440\)/.test(c.shipped) && plateText === 'FAU' && plateRow.contains(c.tone) && !plateRow.contains(c.idle.el) && c.code.el.contains(c.idle.el) && tr.left > pr.left + pr.width / 2,
      `rows ${shape}, ${inSlot ? 'in the slot' : 'NOT in the slot'}, ${noKeys ? 'no keys or knobs' : 'KEYS OR KNOBS FOUND'}, `
      + `the code ${c.code.input.readOnly ? 'READ ONLY' : 'editable'}, the plate "${plateText}", Test tone ${(tr.left - pr.left).toFixed(0)} to ${(tr.right - pr.left).toFixed(0)} px of a ${pr.width.toFixed(0)} px plate`);
  }

  // 4. a key typed in the code box is the box's; NEGATIVE, the same key on the slide steps
  {
    const at0 = p.at();
    for (const key of ['ArrowRight', ' ', 'PageDown']) {
      c.code.input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    }
    const afterBox = p.at();
    p.slides[at0].el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    const afterSlide = p.at();
    p.go(toneIdx);
    await frames(2);
    d.assert('SYNTHS: arrows, space and Page Down typed in the code box leave the deck where it is, and the same keys on the slide step it',
      afterBox === at0 && afterSlide === at0 - 1 && p.at() === toneIdx,
      `on slide ${at0 + 1}, after three keys in the box on ${afterBox + 1}, after ArrowLeft on the slide on ${afterSlide + 1}`);
  }

  // 5. Test tone with the shipped code sounds from the ahead of time file, no compiler, and the scope draws
  const ctx = c.context.bind(c);
  c.tone.click();
  await until(() => c.sounding() || c.error(), 3000);
  await until(() => c.level() > FLOOR, 1200);
  const d0 = c.draws();
  await frames(8);
  const lvl = c.level(), hz = c.hz(), drew = c.draws() - d0;
  const fetched = engine();
  d.assert('SYNTHS: Start sounds the shipped sine from its ahead of time file, RMS read off an analyser above a floor, 440 Hz, and no compiler fetched',
    c.sounding() && lvl > FLOOR && Math.abs(hz - 440) < 5 && compiler().length === 0 && fetched.some((n) => /\/resources\/faust\/sine\.wasm$/.test(n))
      && audioContexts() === 1 && audioOwner() === c && c.tone.getAttribute('aria-pressed') === 'true' && c.idle.el.hidden,
    `${c.error() ? `it FAILED: ${c.error()}, ` : ''}RMS ${lvl.toFixed(4)} against a floor of ${FLOOR}, ${hz.toFixed(1)} Hz, `
    + `${fetched.length} engine file(s) (${fetched.map((n) => new URL(n).pathname.split('/').pop()).join(', ')}), ${compiler().length} compiler file(s), `
    + `${audioContexts()} context(s), armed in ${c.lastArmMs()?.toFixed(0)} ms`);
  d.assert('SYNTHS: the scope draws the output while it sounds, a measured trace in the panel’s top row',
    drew >= 4 && /drawn as measured/.test(c.scope.canvas.getAttribute('aria-label') || '') && c.panel.viz.contains(c.scope.el),
    `${drew} frame(s) drawn in 8, the scope says "${c.scope.canvas.getAttribute('aria-label')}"`);

  // 6. a second press switches it off, lets go of the sound and suspends the context, and the scope stops
  c.tone.click();
  await until(() => ctx()?.state === 'suspended', 1000);
  const d1 = c.draws();
  await frames(6);
  d.assert('SYNTHS: Stop silences it, lets go of the sound, suspends the context and stops the scope',
    !c.sounding() && c.tone.getAttribute('aria-pressed') === 'false' && audioOwner() === null && ctx()?.state === 'suspended' && c.draws() === d1,
    `${c.sounding() ? 'STILL SOUNDING' : 'off'}, the owner ${audioOwner() === null ? 'none' : 'STILL SET'}, the context ${ctx()?.state}, ${c.draws() - d1} frame(s) drawn after`);

  // 7. an edit compiles ITSELF once the typing stops (the kit's compile on a
  // pause, as on /fau/), loading the compiler once, breathing `Compiling` in
  // the code box's corner and not on the plate; Start then plays it
  {
    c.code.set(c.shipped.replace('os.osc(440)', 'os.osc(660)'));
    c.code.input.dispatchEvent(new Event('input', { bubbles: true }));
    const t0 = performance.now();
    const shown = await until(() => !c.idle.el.hidden, 4000);
    const said = c.idle.el.textContent;
    await settled(c);
    const wall = performance.now() - t0;
    const compiledAlone = c.compiles() === 1 && !c.sounding();
    c.tone.click();
    await until(() => c.sounding() || c.error(), 5000);
    await until(() => c.level() > FLOOR, 1200);
    // ⚠️ UNTIL THE READING IS 660, NOT A FIXED FEW FRAMES: compiled before the
    // press, Start sounds at once, and the analyser still holds the earlier
    // 440 tone from before the context was suspended, so a reading four
    // frames in measured a mix (444 to 492 Hz) twice on 2026-10-06
    await until(() => Math.abs(c.hz() - 660) < 8, 1500);
    const lv = c.level(), hz2 = c.hz();
    const files = compiler();
    const bytes = files.reduce((a, e) => a + (e.transferSize || e.encodedBodySize || 0), 0);
    d.assert('SYNTHS: an edit compiles itself once the typing stops, Compiling breathing in the code box, and Start plays it, 660 Hz measured',
      shown && said === 'Compiling' && compiledAlone && c.code.el.contains(c.idle.el)
        && c.sounding() && lv > FLOOR && Math.abs(hz2 - 660) < 8 && files.length === 3 && new Set(files.map((e) => e.name)).size === 3
        && c.compiles() === 1,
      `${c.error() ? `it FAILED: ${c.error()}, ` : ''}the note ${shown ? `said "${said}"` : 'NEVER SHOWED'}, ${compiledAlone ? 'compiled before any press' : 'NOT COMPILED ALONE'}, `
      + `RMS ${lv.toFixed(4)}, ${hz2.toFixed(1)} Hz, ${files.length} compiler file(s), ${(bytes / 1e6).toFixed(2)} MB on this origin, `
      + `edit to compiled ${wall.toFixed(0)} ms of which the compile ${c.lastCompileMs()?.toFixed(0)} ms`);
    // and while it sounds, a new edit replaces it as soon as it compiles
    c.code.set(c.shipped.replace('os.osc(440)', 'os.osc(330)'));
    c.code.input.dispatchEvent(new Event('input', { bubbles: true }));
    await until(() => Math.abs(c.hz() - 330) < 8, 4000);
    const hz3 = c.hz();
    d.assert('SYNTHS: an edit compiled while it sounds replaces the sound with no press, 330 Hz measured',
      c.sounding() && Math.abs(hz3 - 330) < 8, `${c.sounding() ? 'sounding' : 'SILENT'} at ${hz3.toFixed(1)} Hz`);
    c.tone.click();
    await until(() => ctx()?.state === 'suspended', 1000);
  }

  // 8. NEGATIVE: a broken edit says why in words, sounds nothing and does not load the compiler again
  {
    c.code.set('import("stdfaust.lib");\n\nprocess = os.osc(440 * 0.1;');
    c.code.input.dispatchEvent(new Event('input', { bubbles: true }));
    await until(() => !c.idle.el.hidden, 4000);
    await settled(c);
    const noteSays = c.idle.el.textContent;
    c.tone.click();
    await until(() => c.sounding() || c.error(), 5000);
    // suspending is asynchronous: wait for it, as the off check does
    await until(() => ctx()?.state === 'suspended', 1000);
    const said = c.scope.canvas.getAttribute('aria-label') || '';
    d.assert('SYNTHS: NEGATIVE, a broken edit shows the compiler’s error in words in the panel and sounds nothing',
      !!c.error() && /syntax error/i.test(c.error()) && said.includes(c.error()) && noteSays === 'Did not compile'
        && !c.sounding() && c.tone.getAttribute('aria-pressed') === 'false' && audioOwner() === null && ctx()?.state === 'suspended'
        && compiler().length === 3 && c.compiles() >= 3,
      `the panel says "${c.error()}", the note "${noteSays}", ${c.sounding() ? 'SOUNDING' : 'silent'}, the context ${ctx()?.state}, `
      + `${compiler().length} compiler file(s) in all, ${c.compiles()} compile(s)`);
    c.code.set(c.shipped);
    c.code.input.dispatchEvent(new Event('input', { bubbles: true }));
    c.stop();
  }

  // 9. SLIDE 3, the sine's 0.5 as a slider, drawn as a knob between the code
  // and the plate (*"slode 3: make 0.5 into knob 0..1"*). Every level is read
  // off the analyser, every value the node holds off the node itself.
  {
    const vIdx = p.slides.findIndex((s) => s.ctl?.step?.id === 'volume');
    const V = p.slides[vIdx], v = V.ctl;
    const VOL = /\/resources\/faust\/volume\.(json|wasm)$/;
    const volFetched = () => names().filter((n) => VOL.test(new URL(n).pathname));
    const comp0 = compiler().length;
    const res0 = performance.getEntriesByType('resource').length;
    p.go(vIdx);
    await frames(3);
    p.el.scrollIntoView({ block: 'center' });
    await frames(2);
    const stepRes = performance.getEntriesByType('resource').slice(res0).map((e) => e.name)
      .filter((n) => !(new URL(n).pathname === '/_log' || /^\/shell\/vendor\/[^/]+\.woff2$/.test(new URL(n).pathname)));
    const row = v.knobRow();
    const dial = () => row?.querySelector('.pos-knob[data-param="volume"] .pos-knob-dial');
    const shows = () => row?.querySelector('.pos-knob[data-param="volume"] .pos-knob-v')?.textContent;
    const shape = v.panel.shape().join(' ');
    const cr = v.codeRow.getBoundingClientRect(), kr = row?.getBoundingClientRect(), pr = v.panel.plateRow.getBoundingClientRect();
    d.assert('SYNTHS: slide 3 draws its volume knob from the text between the code and the plate, at 0.50, and the visit and the step fetched nothing',
      vIdx === 2 && !!row && getComputedStyle(row).display !== 'none' && shape === 'viz controls controls plate' && v.panel.controls()[1] === row
        && kr.top >= cr.bottom - 1 && kr.bottom <= pr.top + 1 && v.knobs.names().join() === 'volume' && v.knobs.value('volume') === 0.5 && shows() === '0.50'
        && /volume = hslider\("volume", 0\.5, 0, 1, 0\.01\);/.test(v.shipped) && v.code.value() === v.shipped
        && volFetched().length === 0 && stepRes.length === 0 && !v.sounding() && !V.parts.say
        && V.parts.text?.querySelector('code.sl-var[data-var="volume"]')?.dataset.hue === String(v.book.hueOf('volume'))
        && !('hue' in (V.parts.text?.querySelector('code.sl-var[data-var="process"]')?.dataset ?? { hue: 1 })),
      `slide ${vIdx + 1}, rows ${shape}, the knob row ${kr ? `${kr.top.toFixed(0)} to ${kr.bottom.toFixed(0)} px under code ending ${cr.bottom.toFixed(0)}, over the plate at ${pr.top.toFixed(0)}` : 'MISSING'}, `
      + `knobs ${v.knobs.names().join(', ') || 'none'} showing "${shows()}", the word volume in hue ${V.parts.text?.querySelector('code.sl-var[data-var="volume"]')?.dataset.hue} against the book's ${v.book.hueOf('volume')}, `
      + `${volFetched().length} volume file(s), ${stepRes.length} request(s) on the step`);

    // the synths deck's splits are 1:2 with the words on the foot of their
    // column (*"use 1:2 cols layout"*, *"align text to bottom of slide"*)
    {
      const sr = V.el.getBoundingClientRect(), wr = V.parts.words.getBoundingClientRect(), xr = V.parts.slot.getBoundingClientRect();
      const divide = (wr.right + xr.left) / 2 - sr.left;
      const dark = parseFloat(getComputedStyle(V.el, '::before').width);
      const tr = (V.parts.text || V.parts.say).getBoundingClientRect();
      // ⚠️ THE HEADLINE'S TOP ON EVERY INSTRUMENT SLIDE, each read while it
      // is shown: the longest words are the ones that climb out of the column
      let sayTop = Infinity;
      for (const i of inst) {
        p.go(i);
        await frames(2);
        const S2 = p.slides[i];
        sayTop = Math.min(sayTop, (S2.parts.say || S2.parts.text).getBoundingClientRect().top - S2.parts.words.getBoundingClientRect().top);
      }
      p.go(vIdx);
      await frames(2);
      const sayR = { top: wr.top + sayTop };
      const both = inst.every((i) => p.slides[i].el.dataset.cols === '1:2' && 'bottom' in p.slides[i].el.dataset);
      d.assert('SYNTHS: every instrument slide split 1:2, the divide a third of the way across in the middle of the gap, the darker ground two thirds, the words on the foot of their column',
        both && Math.abs(divide - sr.width / 3) < 1 && Math.abs(dark - (sr.width * 2) / 3) < 1 && Math.abs(tr.bottom - wr.bottom) < 1.5
          && sayR.top >= wr.top - 0.5 && Math.abs((xr.left - wr.right) - 2 * (wr.left - sr.left)) < 1,
        `the divide at ${divide.toFixed(1)} of ${sr.width.toFixed(1)} px (a third is ${(sr.width / 3).toFixed(1)}), the darker ground ${dark.toFixed(1)} px, `
        + `the words end ${(wr.bottom - tr.bottom).toFixed(1)} px above their column's foot and start at least ${sayTop.toFixed(1)} px down it on every instrument slide, `
        + `the gap ${(xr.left - wr.right).toFixed(1)} px against an inset of ${(wr.left - sr.left).toFixed(1)}`);
    }

    // slides 2, 3 and 4 draw the instrument at ONE scale (*"2 and 3 use
    // same size of fau"*), PANEL_H being the tallest of them. ⚠️ EACH HEIGHT
    // IS READ WHILE ITS SLIDE IS SHOWN: a hidden slide's panel measures 0,
    // and until 2026-10-06 this compared slide 2 at 0 px, which any height
    // passes
    {
      const ks = [], hs = [];
      for (const i of inst) {
        p.go(i);
        await frames(2);
        ks.push(p.slides[i].ctl.fb.fit());
        hs.push(p.slides[i].ctl.fb.inner.offsetHeight);
      }
      p.go(vIdx);
      await frames(2);
      // ONE PANEL HEIGHT since 2026-10-06 (*"keep same fau size!!! knobs
      // condense code area"*): every panel is PANEL_H tall, a knob row
      // takes its height from the code row
      d.assert('SYNTHS: every instrument slide draw the FAU panel at one scale and one height, PANEL_H, the knobs taking room from the code',
        ks[0] > 0 && ks.every((k) => Math.abs(k - ks[0]) < 0.001) && hs.every((h) => Math.abs(h - PANEL_H) <= 1),
        hs.map((h, j) => `slide ${inst[j] + 1} at ${ks[j].toFixed(4)} (panel ${h} px)`).join(', ') + `, PANEL_H ${PANEL_H}`);
    }

    // a turn before Start is kept and is what Start plays: Home, the bottom, 0
    const at0 = p.at();
    dial().dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    const before = v.knobs.value('volume'), shownBefore = shows(), sendsBefore = v.paramSends();
    v.tone.click();
    await until(() => v.sounding() || v.error(), 3000);
    await nap(300);
    // ⚠️ THE NODE'S VALUE IS AN AudioParam's, WHICH MOVES WHEN THE CONTEXT
    // RENDERS: read once, it said 0.5 over a silent tone on 2026-10-06
    await until(() => v.nodeValue('volume') === 0, 600);
    const silent = v.level();
    d.assert('SYNTHS: on slide 3 the knob turned to 0 before Start is kept, and Start plays that from the volume artefact with no compile, silent',
      before === 0 && shownBefore === '0.00' && sendsBefore === 0 && p.at() === at0 && v.sounding() && silent < 1e-4 && v.nodeValue('volume') === 0
        && volFetched().some((n) => /volume\.wasm$/.test(n)) && compiler().length === comp0 && v.compiles() === 0 && audioOwner() === v,
      `${v.error() ? `it FAILED: ${v.error()}, ` : ''}the knob at ${before} showing "${shownBefore}" with ${sendsBefore} sends before, the deck on slide ${p.at() + 1}, `
      + `RMS ${silent.toFixed(5)}, the node holds ${v.nodeValue('volume')}, ${volFetched().length} volume file(s), ${compiler().length - comp0} new compiler file(s), ${v.compiles()} compile(s)`);

    // 0.5, then the top, 1: the RMS doubles; then the bottom again silences it
    v.knobs.knob('volume').set(0.5);
    await until(() => Math.abs(v.level() - 0.3536) < 0.01, 1500);
    await nap(100);
    const half = v.level(), hz = v.hz();
    dial().dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    await until(() => Math.abs(v.level() - 0.7071) < 0.01, 1500);
    await nap(100);
    const full = v.level(), fullShows = shows(), fullNode = v.nodeValue('volume');
    dial().dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    await until(() => v.level() < 1e-4, 1500);
    const zero = v.level();
    d.assert('SYNTHS: turning slide 3’s knob to 1 while it plays doubles the measured RMS against 0.5, and turning it to 0 silences it',
      Math.abs(half - 0.3536) < 0.01 && Math.abs(hz - 440) < 5 && Math.abs(full - 0.7071) < 0.01 && Math.abs(full / half - 2) < 0.05
        && fullShows === '1.00' && fullNode === 1 && zero < 1e-4 && v.sounding() && p.at() === vIdx,
      `RMS ${half.toFixed(4)} at 0.5 (${hz.toFixed(1)} Hz), ${full.toFixed(4)} at 1 showing "${fullShows}" with the node at ${fullNode}, `
      + `${(full / half).toFixed(3)}x, ${zero.toFixed(5)} at 0, ${v.paramSends()} setParamValue in all`);

    // an edit that takes the slider out takes the knob row out; putting it back brings the row back.
    // ⚠️ TWO ASSERTS AND NOT ONE: each edit is 600 ms of idle and a compile,
    // and two of them before one assert was more silence than the harness
    // waits (2.0 s), so the first run lost this check without a word
    v.knobs.knob('volume').set(0.5);
    v.code.set('import("stdfaust.lib"); // has os.osc\n\nprocess = os.osc(440) * 0.5;');
    v.code.input.dispatchEvent(new Event('input', { bubbles: true }));
    await settled(v);
    await until(() => Math.abs(v.level() - 0.3536) < 0.01, 1500);
    const goneDisplay = getComputedStyle(row).display, goneKnobs = v.knobs.names().length, goneLvl = v.level();
    const goneFound = !!v.panel.el.querySelector('.pos-knob[data-param]');
    d.assert('SYNTHS: an edit on slide 3 that takes the slider out takes the knob row out, and the tone it compiles plays at 0.5',
      !v.error() && goneDisplay === 'none' && goneKnobs === 0 && !goneFound && Math.abs(goneLvl - 0.3536) < 0.01 && v.compiles() === 1,
      `${v.error() ? `it FAILED: ${v.error()}, ` : ''}with no slider the row ${goneDisplay === 'none' ? 'is not drawn' : `IS DRAWN (${goneDisplay})`}, ${goneKnobs} knob(s), `
      + `RMS ${goneLvl.toFixed(4)}, ${v.compiles()} compile(s)`);
    v.code.set(v.shipped);
    v.code.input.dispatchEvent(new Event('input', { bubbles: true }));
    await settled(v);
    await frames(2);
    const backDisplay = getComputedStyle(row).display, backShows = shows();
    d.assert('SYNTHS: putting slide 3’s slider back brings its knob row back, at 0.50',
      !v.error() && backDisplay !== 'none' && v.knobs.names().join() === 'volume' && backShows === '0.50' && v.compiles() === 1,
      `${v.error() ? `it FAILED: ${v.error()}, ` : ''}the row ${backDisplay === 'none' ? 'STILL GONE' : 'drawn'} showing "${backShows}", ${v.compiles()} compile(s)`);
    v.stop();
    p.go(0);
  }

  // 10. SLIDE 4, slide 3's program plus one line, its 440 on a second slider
  // (*"slide 4 is freq"*, *"this order, progressing"*): volume then freq,
  // one row, each knob in its own hue. Every frequency is read off the
  // analyser, every value the node holds off the node itself.
  {
    const fIdx = p.slides.findIndex((s) => s.ctl?.step?.id === 'pitch');
    const F = p.slides[fIdx], f = F.ctl;
    const PITCH = /\/resources\/faust\/pitch\.(json|wasm)$/;
    const pitchFetched = () => names().filter((n) => PITCH.test(new URL(n).pathname));
    const comp0 = compiler().length;
    const res0 = performance.getEntriesByType('resource').length;
    p.go(fIdx);
    await frames(3);
    p.el.scrollIntoView({ block: 'center' });
    await frames(2);
    const stepRes = performance.getEntriesByType('resource').slice(res0).map((e) => e.name)
      .filter((n) => !(new URL(n).pathname === '/_log' || /^\/shell\/vendor\/[^/]+\.woff2$/.test(new URL(n).pathname)));
    const row = f.knobRow();
    const knobEl = (n) => row?.querySelector(`.pos-knob[data-param="${n}"]`);
    const shows = (n) => knobEl(n)?.querySelector('.pos-knob-v')?.textContent;
    const hueOn = (n) => knobEl(n)?.style.getPropertyValue('--param-hue');
    const codeHue = (n) => f.code.el.querySelector(`[data-param="${n}"]`)?.dataset.hue;
    const wordHue = (n) => F.parts.text?.querySelector(`code.sl-var[data-var="${n}"]`)?.dataset.hue;
    const hv = f.book.hueOf('volume'), hf = f.book.hueOf('freq');
    const vr = knobEl('volume')?.getBoundingClientRect(), fr = knobEl('freq')?.getBoundingClientRect();
    const shape = f.panel.shape().join(' ');
    d.assert('SYNTHS: slide 4 draws volume then freq in one knob row from the text, each in its own hue in the knob, the code and the words, and the step fetched nothing',
      fIdx === 3 && !!row && shape === 'viz controls controls plate' && f.knobs.names().join() === 'volume,freq'
        && f.knobs.value('volume') === 0.5 && f.knobs.value('freq') === 440 && shows('volume') === '0.50' && shows('freq') === '440'
        && Number.isFinite(hv) && Number.isFinite(hf) && hv !== hf && hueOn('volume') === String(hv) && hueOn('freq') === String(hf)
        && codeHue('volume') === String(hv) && codeHue('freq') === String(hf)
        && wordHue('volume') === String(hv) && wordHue('freq') === String(hf)
        && getComputedStyle(F.parts.text.querySelector('code.sl-var[data-var="freq"]')).color
          === getComputedStyle(f.code.el.querySelector('.pos-tk-pvar[data-param="freq"]') || F.parts.text).color
        && !!vr && !!fr && Math.abs(vr.top - fr.top) < 1 && fr.left > vr.right
        && /volume = hslider\("volume", 0\.5, 0, 1, 0\.01\);[\s\S]*freq = hslider\("freq", 440, 50, 2000, 1\);[\s\S]*process = os\.osc\(freq\) \* volume;/.test(f.shipped)
        && pitchFetched().length === 0 && stepRes.length === 0 && !f.sounding() && !F.parts.say,
      `slide ${fIdx + 1}, rows ${shape}, knobs ${f.knobs.names().join(', ') || 'none'} showing "${shows('volume')}" and "${shows('freq')}", `
      + `hues ${hv} and ${hf} on the knobs as ${hueOn('volume')} and ${hueOn('freq')}, in the code as ${codeHue('volume')} and ${codeHue('freq')}, in the words as ${wordHue('volume')} and ${wordHue('freq')}, `
      + `the knobs' tops ${vr && fr ? (fr.top - vr.top).toFixed(1) : 'MISSING'} px apart, ${pitchFetched().length} pitch file(s), ${stepRes.length} request(s) on the step`);

    // a turn of freq to 880 before Start is kept and is what Start plays
    const at0 = p.at();
    const spec = { min: 50, max: 2000, step: 1 };
    f.knobs.knob('freq').set(unmapSpec(880, spec));
    const before = f.knobs.value('freq'), shownBefore = shows('freq'), sendsBefore = f.paramSends();
    f.tone.click();
    await until(() => f.sounding() || f.error(), 3000);
    // ⚠️ AND THE LEVEL TOO: the analyser's window still holds the silence
    // from before Start for a few frames, which read RMS 0.1774, half, on
    // 2026-10-06 while the frequency in the sounding half was already right
    await until(() => Math.abs(f.hz() - 880) < 5 && f.nodeValue('freq') === 880 && Math.abs(f.level() - 0.3536) < 0.01, 1500);
    const hzHigh = f.hz(), lvHigh = f.level(), nodeHigh = f.nodeValue('freq');
    d.assert('SYNTHS: on slide 4 freq turned to 880 before Start is kept, and Start plays 880 Hz from the pitch artefact with no compile',
      before === 880 && shownBefore === '880' && sendsBefore === 0 && p.at() === at0 && f.sounding()
        && Math.abs(hzHigh - 880) < 5 && Math.abs(lvHigh - 0.3536) < 0.01 && nodeHigh === 880
        && pitchFetched().some((n) => /pitch\.wasm$/.test(n)) && compiler().length === comp0 && f.compiles() === 0 && audioOwner() === f,
      `${f.error() ? `it FAILED: ${f.error()}, ` : ''}freq at ${before} showing "${shownBefore}" with ${sendsBefore} sends before, `
      + `${hzHigh.toFixed(1)} Hz at RMS ${lvHigh.toFixed(4)}, the node holds ${nodeHigh}, ${pitchFetched().length} pitch file(s), `
      + `${compiler().length - comp0} new compiler file(s), ${f.compiles()} compile(s)`);

    // and back to 440 while it plays: half the frequency, the same level
    f.knobs.knob('freq').set(unmapSpec(440, spec));
    await until(() => Math.abs(f.hz() - 440) < 5, 1500);
    await nap(100);
    const hzLow = f.hz(), lvLow = f.level();
    d.assert('SYNTHS: turning slide 4’s freq from 880 to 440 while it plays halves the measured frequency and leaves the level alone',
      Math.abs(hzLow - 440) < 5 && Math.abs(hzHigh / hzLow - 2) < 0.02 && Math.abs(lvLow - lvHigh) < 0.01
        && shows('freq') === '440' && f.sounding() && p.at() === fIdx,
      `${hzHigh.toFixed(1)} Hz at 880, ${hzLow.toFixed(1)} Hz at 440, ${(hzHigh / hzLow).toFixed(3)}x, `
      + `RMS ${lvHigh.toFixed(4)} then ${lvLow.toFixed(4)}, ${f.paramSends()} setParamValue in all, `
      + `the longest quiet stretch in the SYNTHS checks ${(Math.max(quietest, performance.now() - said)).toFixed(0)} ms of ${QUIET_MS}`);
    f.stop();
    p.go(0);
  }

  // 10b. THE FILTER AND THE LFO ON IT, 2026-10-06 (*"do filter, lfo (for
  // filter?)"*). The filter slide is the saw through a two pole low pass at
  // `cutoff`: the offline render reads RMS 0.2663 at its 2000 Hz default
  // (`build-faust-aot.mjs`), and at 100 Hz a 440 Hz saw keeps almost nothing,
  // so the level read off the analyser has to FALL, which only a filter that
  // is really in the signal can do. The LFO slide is graded on what it adds:
  // two more knobs from the text and a sound from its own artefact.
  {
    const fiIdx = p.slides.findIndex((s) => s.ctl?.step?.id === 'filter');
    const lfIdx = p.slides.findIndex((s) => s.ctl?.step?.id === 'lfo');
    const FI = p.slides[fiIdx], fi = FI.ctl;
    const fetched = (id) => names().filter((n) => new RegExp(`/resources/faust/${id}\\.wasm$`).test(new URL(n).pathname));
    const comp0 = compiler().length;
    p.go(fiIdx);
    await frames(3);
    const knobsOf = (c) => c.knobs.names().join();
    fi.tone.click();
    await until(() => fi.sounding() || fi.error(), 3000);
    await until(() => Math.abs(fi.level() - 0.2663) < 0.015, 1500);
    const lvOpen = fi.level();
    d.assert('SYNTHS: the filter slide draws volume, freq and cutoff from the text, and Start plays the filtered saw from its artefact with no compile, RMS 0.266 at 2000 Hz',
      fiIdx > 0 && knobsOf(fi) === 'volume,freq,cutoff' && fi.knobs.value('cutoff') === 2000 && fi.sounding()
        && Math.abs(lvOpen - 0.2663) < 0.015 && fetched('filter').length > 0 && compiler().length === comp0 && fi.compiles() === 0,
      `${fi.error() ? `it FAILED: ${fi.error()}, ` : ''}slide ${fiIdx + 1}, knobs ${knobsOf(fi) || 'none'}, cutoff ${fi.knobs.value('cutoff')}, `
      + `RMS ${lvOpen.toFixed(4)}, ${fetched('filter').length} filter file(s), ${compiler().length - comp0} new compiler file(s), ${fi.compiles()} compile(s)`);

    fi.knobs.knob('cutoff').set(unmapSpec(100, { min: 100, max: 8000, step: 1 }));
    await until(() => fi.level() < lvOpen / 3, 1500);
    await nap(100);
    const lvShut = fi.level();
    d.assert('SYNTHS: turning the cutoff from 2000 to 100 Hz while it plays takes the measured level below a third',
      fi.knobs.value('cutoff') === 100 && fi.nodeValue('cutoff') === 100 && lvShut < lvOpen / 3 && lvShut > 0 && fi.sounding(),
      `RMS ${lvOpen.toFixed(4)} at 2000 Hz, ${lvShut.toFixed(4)} at ${fi.nodeValue('cutoff')} Hz, ${(lvOpen / Math.max(lvShut, 1e-9)).toFixed(1)}x down`);
    fi.stop();

    const LF = p.slides[lfIdx], lf = LF.ctl;
    p.go(lfIdx);
    await frames(3);
    lf.tone.click();
    await until(() => (lf.sounding() && lf.level() > 0.1) || lf.error(), 3000);
    const lvLfo = lf.level();
    d.assert('SYNTHS: the LFO slide adds rate and depth to the knob row from the text, and Start plays it from its artefact with no compile',
      lfIdx === fiIdx + 1 && knobsOf(lf) === 'volume,freq,cutoff,rate,depth' && lf.knobs.value('rate') === 2 && lf.knobs.value('depth') === 0.5
        && lf.sounding() && lvLfo > 0.1 && fetched('lfo').length > 0 && compiler().length === comp0 && lf.compiles() === 0,
      `${lf.error() ? `it FAILED: ${lf.error()}, ` : ''}slide ${lfIdx + 1}, knobs ${knobsOf(lf) || 'none'}, rate ${lf.knobs.value('rate')}, depth ${lf.knobs.value('depth')}, `
      + `RMS ${lvLfo.toFixed(4)}, ${fetched('lfo').length} lfo file(s), ${compiler().length - comp0} new compiler file(s)`);
    lf.stop();
    p.go(0);
  }

  // 11. SLIDE 6, slide 4's program with a third control, an `nentry` whose
  // `[style:radio{...}]` the slot draws as the kit's choice (*"how to make
  // it a radio (sawtooth?)"*): volume, freq and wave in one row, in that
  // order, wave in its own hue. Every level is read off the analyser, every
  // value the node holds off the node itself. A sine of amplitude 0.5 is
  // RMS 0.354 and the band limited saw 0.286 (`build-faust-aot.mjs` EXPECT).
  // ⚠️ ONLY WHILE THE SLIDE IS IN THE DECK: `wave` is hidden since 2026-10-06
  const wIdx = p.slides.findIndex((s) => s.ctl?.step?.id === 'wave');
  if (wIdx >= 0) {
    const W = p.slides[wIdx], w = W.ctl;
    const WAVE = /\/resources\/faust\/wave\.(json|wasm)$/;
    const waveFetched = () => names().filter((n) => WAVE.test(new URL(n).pathname));
    const SINE = 0.3536, SAW = 0.2860;
    const comp0 = compiler().length;
    const res0 = performance.getEntriesByType('resource').length;
    p.go(wIdx);
    await frames(3);
    p.el.scrollIntoView({ block: 'center' });
    await frames(2);
    const stepRes = performance.getEntriesByType('resource').slice(res0).map((e) => e.name)
      .filter((n) => !(new URL(n).pathname === '/_log' || /^\/shell\/vendor\/[^/]+\.woff2$/.test(new URL(n).pathname)));
    const row = w.knobRow();
    const r = w.radios().get('wave');
    const cell = r?.cell;
    const btn = (i) => r?.choice.buttons[i];
    const knobEl = (n) => row?.querySelector(`.pos-knob[data-param="${n}"]`);
    const mid = (e) => { const b = e?.getBoundingClientRect(); return b ? (b.top + b.bottom) / 2 : NaN; };
    const vr = knobEl('volume')?.getBoundingClientRect(), fr = knobEl('freq')?.getBoundingClientRect(), cr = cell?.getBoundingClientRect(), rr = row?.getBoundingClientRect();
    const hv = w.book.hueOf('volume'), hf = w.book.hueOf('freq'), hw = w.book.hueOf('wave');
    const ink = (e) => (e ? getComputedStyle(e).color : '');
    const lab = cell?.querySelector('.sl-radio-lab');
    const codeHue = w.code.el.querySelector('[data-param="wave"]')?.dataset.hue;
    const wordEl = W.parts.text?.querySelector('code.sl-var[data-var="wave"]');
    const dialMid = mid(knobEl('volume')?.querySelector('.pos-knob-dial')), segMid = mid(cell?.querySelector('.pos-choice-seg'));
    const labBottom = (e) => e?.getBoundingClientRect().bottom ?? NaN;
    const noRadioBefore = [2, 3, 4].every((i) => p.slides[i].ctl.radios().size === 0 && !p.slides[i].el.querySelector('.sl-radio'));
    d.assert('SYNTHS: slide 6 draws volume, freq and wave in one row in that order, wave as a choice of sine and saw in its own hue in the row, the code and the words, the step fetching nothing',
      wIdx === 5 && p.slides.length === 6 && !!row && !!cell && row.contains(cell) && w.panel.shape().join(' ') === 'viz controls controls plate'
        && w.knobs.names().join() === 'volume,freq' && [...w.radios().keys()].join() === 'wave'
        && r.choice.buttons.map((b) => b.textContent).join() === 'sine,saw' && r.choice.get() === 0 && r.value === 0
        && btn(0).getAttribute('aria-pressed') === 'true' && btn(1).getAttribute('aria-pressed') === 'false'
        && !!vr && !!fr && vr.right <= fr.left && fr.right <= cr.left && cr.top >= rr.top - 0.5 && cr.bottom <= rr.bottom + 0.5
        && Math.abs(segMid - dialMid) < 1.5 && Math.abs(labBottom(lab) - labBottom(knobEl('volume')?.querySelector('.pos-knob-lab'))) < 1
        && Number.isFinite(hw) && new Set([hv, hf, hw]).size === 3 && cell.style.getPropertyValue('--param-hue') === String(hw)
        && ink(btn(0)) === ink(lab) && ink(btn(0)) !== ink(btn(1)) && codeHue === String(hw) && wordEl?.dataset.hue === String(hw)
        && ink(wordEl) === ink(w.code.el.querySelector('.pos-tk-pvar[data-param="wave"]') || W.parts.text)
        && /wave = nentry\("wave\[style:radio\{'sine':0;'saw':1\}\]", 0, 0, 1, 1\);[\s\S]*process = select2\(wave, os\.osc\(freq\), os\.sawtooth\(freq\)\) \* volume;/.test(w.shipped)
        && /`nentry`[\s\S]*`wave`[\s\S]*`select2`/.test(W.spec.text) && lintWords(W.spec.text).length === 0
        && waveFetched().length === 0 && stepRes.length === 0 && !w.sounding() && noRadioBefore,
      `slide ${wIdx + 1} of ${p.slides.length}, knobs ${w.knobs.names().join(', ')}, radios ${[...w.radios().keys()].join(', ') || 'NONE'} offering ${r?.choice.buttons.map((b) => b.textContent).join(' and ')}, `
      + `lefts ${[vr, fr, cr].map((x) => x?.left.toFixed(0)).join(', ')} in a row ${rr?.top.toFixed(0)} to ${rr?.bottom.toFixed(0)}, the choice centred ${(segMid - dialMid).toFixed(2)} px off the dials, `
      + `hues ${hv}, ${hf}, ${hw}, the armed option ${ink(btn(0))} and its name ${ink(lab)}, in the code ${codeHue}, in the words ${wordEl?.dataset.hue}, `
      + `slides 3 to 5 ${noRadioBefore ? 'draw no radio' : 'DRAW A RADIO'}, ${waveFetched().length} wave file(s), ${stepRes.length} request(s) on the step`);

    // a pick before the first Start is kept, and handed to the node Start
    // makes before it is heard: saw, RMS 0.286, from the artefact, no compile
    btn(1).click();
    const keptValue = r.value, sendsBefore = w.paramSends(), pressedBefore = btn(1).getAttribute('aria-pressed');
    w.tone.click();
    await until(() => w.sounding() || w.error(), 3000);
    await until(() => Math.abs(w.level() - SAW) < 0.01 && w.nodeValue('wave') === 1, 1500);
    const lvKept = w.level(), hzKept = w.hz(), nodeKept = w.nodeValue('wave');
    d.assert('SYNTHS: on slide 6 saw picked before Start is kept, and Start plays the saw from the wave artefact with no compile, RMS 0.286 at 440 Hz',
      keptValue === 1 && pressedBefore === 'true' && sendsBefore === 0 && w.paramSends() > 0 && w.sounding()
        && Math.abs(lvKept - SAW) < 0.01 && Math.abs(hzKept - 440) < 5 && nodeKept === 1 && p.at() === wIdx
        && waveFetched().some((n) => /wave\.wasm$/.test(n)) && compiler().length === comp0 && w.compiles() === 0 && audioOwner() === w,
      `${w.error() ? `it FAILED: ${w.error()}, ` : ''}picked ${keptValue} with ${sendsBefore} sends before Start, RMS ${lvKept.toFixed(4)} at ${hzKept.toFixed(1)} Hz after it with the node at ${nodeKept}, `
      + `${waveFetched().length} wave file(s), ${compiler().length - comp0} new compiler file(s), ${w.compiles()} compile(s)`);

    // while it plays, sine, then saw, then sine: the level follows the pick at the same pitch
    const sends0 = w.paramSends();
    btn(0).click();
    await until(() => Math.abs(w.level() - SINE) < 0.01 && w.nodeValue('wave') === 0, 1500);
    const lvSine = w.level();
    btn(1).click();
    await until(() => Math.abs(w.level() - SAW) < 0.01 && w.nodeValue('wave') === 1, 1500);
    const lvSaw = w.level(), hzSaw = w.hz(), nodeSaw = w.nodeValue('wave');
    btn(0).click();
    await until(() => Math.abs(w.level() - SINE) < 0.01 && w.nodeValue('wave') === 0, 1500);
    const lvBack = w.level();
    d.assert('SYNTHS: picking on slide 6 while it plays moves the measured RMS between the sine’s 0.354 and the saw’s 0.286 at the same pitch, and back',
      Math.abs(lvSine - SINE) < 0.01 && Math.abs(lvSaw - SAW) < 0.01 && Math.abs(hzSaw - 440) < 5 && nodeSaw === 1
        && Math.abs(lvBack - SINE) < 0.01 && w.nodeValue('wave') === 0 && r.value === 0 && btn(0).getAttribute('aria-pressed') === 'true'
        && w.paramSends() - sends0 === 3 && w.sounding() && p.at() === wIdx,
      `RMS ${lvSine.toFixed(4)} on sine, ${lvSaw.toFixed(4)} on saw at ${hzSaw.toFixed(1)} Hz with the node at ${nodeSaw}, ${lvBack.toFixed(4)} on sine again, `
      + `${w.paramSends() - sends0} setParamValue for the three picks`);

    // and Start with the sine picked plays the sine, the shipped default
    w.stop();
    await until(() => ctx()?.state === 'suspended', 1000);
    w.tone.click();
    await until(() => w.sounding() || w.error(), 3000);
    await until(() => Math.abs(w.level() - SINE) < 0.01 && Math.abs(w.hz() - 440) < 5, 1500);
    const lvStart = w.level(), hzStart = w.hz();
    d.assert('SYNTHS: Start on slide 6 with sine picked plays the sine, RMS 0.354 at 440 Hz, with no compile',
      w.sounding() && Math.abs(lvStart - SINE) < 0.01 && Math.abs(hzStart - 440) < 5 && w.nodeValue('wave') === 0
        && w.compiles() === 0 && compiler().length === comp0 && audioOwner() === w,
      `${w.error() ? `it FAILED: ${w.error()}, ` : ''}RMS ${lvStart.toFixed(4)} at ${hzStart.toFixed(1)} Hz, the node's wave ${w.nodeValue('wave')}, ${w.compiles()} compile(s), `
      + `the longest quiet stretch in the SYNTHS checks ${(Math.max(quietest, performance.now() - said)).toFixed(0)} ms of ${QUIET_MS}`);
    btn(0).click();
    w.stop();
    p.go(0);
  }
}

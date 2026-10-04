// rig/pico/sim/run-router.mjs: the C router of rig/pico/firmware/ on an
// emulated Pico, driven over its MIDI UART and its four keys, graded step by
// step, with a screenshot after each.
//
//   ../firmware/build.sh pico      # builds ../firmware/build-pico/router.uf2 in Docker
//   node run-router.mjs            # router-0.png .. router-6.png, router-font-*.png
//
// MIDI goes in through UART0's RX FIFO (rp2040js `feedByte`) and comes out of
// UART0's data register (`onByte`), which is the pin pair GP1 and GP0 on the
// board. The emulated UART has no baud timing: a byte is in the FIFO the moment
// it is fed, so 31250 baud is set by the firmware and not exercised here.
//
// The screen is READ BACK through the display model, not trusted from the
// firmware. The fonts are parsed out of the same ui.c and font headers the
// firmware compiles, and a phrase counts as on the panel only when every pixel
// of its character cells matches exactly, lit on dark or dark on lit (which is
// how the inverted header, banner and footer cell are told apart). The bars,
// dots, arrow and meter are checked as pixels too.
//
// Then once per compiled font: the same UF2 with ONE flash byte patched (the
// byte after "UIFONT" in main.c's FONT_PICK) boots in that font, and the real
// screen is shot in scene 2 and in the hold state, router-font-<name>.png and
// router-font-<name>-hold.png.
//
// Exits 1 on any FAIL.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pico } from './pico.mjs';
import { BOOTROM, fetchAll } from './fetch.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const FW = join(here, '..', 'firmware');
const UF2 = join(FW, 'build-pico', 'router.uf2');
if (!existsSync(UF2)) {
  console.error(`no ${UF2}: run ../firmware/build.sh pico first`);
  process.exit(2);
}
await fetchAll(); // the bootrom; the MicroPython image it also fetches is unused here
const { bootromB1 } = await import(`./firmware/${BOOTROM}`);

// ── the fonts, from the sources the firmware compiles ──
const FONTS = []; // in UI_FONTS order, which is what FONT_PICK indexes
let DEFAULT;
{
  const ui = readFileSync(join(FW, 'ui.c'), 'utf8');
  const defs = new Map();
  for (const m of ui.matchAll(/const ui_font (UI_FONT_\w+)\s*=\s*\{\s*"(\w+)",\s*(\w+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\s*\}/g)) {
    defs.set(m[1], { name: m[2], table: m[3], w: +m[4], h: +m[5], adv: +m[6], top: +m[7], cap: +m[8] });
  }
  const headers = readdirSync(FW).filter((n) => /^font.*\.h$/.test(n)).map((n) => readFileSync(join(FW, n), 'utf8'));
  for (const id of ui.match(/UI_FONTS\[\] = \{([^}]*)\}/)[1].match(/UI_FONT_\w+/g)) {
    const F = defs.get(id);
    const src = headers.find((s) => s.includes(` ${F.table}[`));
    const body = src.slice(src.indexOf(` ${F.table}[`), src.indexOf('};', src.indexOf(` ${F.table}[`)));
    const bytes = [...body.slice(body.indexOf('{')).matchAll(/0x([0-9a-f]{2})/gi)].map((m) => parseInt(m[1], 16));
    F.glyph = (c) => bytes.slice((c - 32) * F.w, (c - 32) * F.w + F.w);
    FONTS.push(F);
  }
  DEFAULT = defs.get(ui.match(/UI_FONT_DEFAULT = &(UI_FONT_\w+)/)[1]);
}

// ── reading the panel ──
// `col(x, y)` is the h pixels of column x from row y down, as bits, so a cell
// compares as w numbers instead of w*h pixels.
function panel(px, F) {
  // Rows 0 .. top+cap-1 of the cell, the band the capitals live in. The
  // descender row below is left out: on a tight layout it can touch the next
  // line, and nothing on this screen descends but a comma's tail.
  const rows = F.top + F.cap;
  const mask = (1 << rows) - 1;
  const col = (x, y) => { let b = 0; for (let j = 0; j < rows; j++) b |= px[(y + j) * 128 + x] << j; return b; };
  const cols = (s) => {
    const out = [];
    for (const ch of s) { const g = F.glyph(ch.charCodeAt(0)); for (let i = 0; i < F.adv; i++) out.push(i < F.w ? g[i] & mask : 0); }
    return out;
  };
  // Every place `text` is drawn, as { x, y (top of its capitals), inv }.
  function find(text) {
    const want = cols(text).slice(0, text.length * F.adv - 1), hits = []; // ui_text_w: no trailing gap
    for (let y = 0; y + rows <= 64; y++) {
      for (let x = 0; x + want.length <= 128; x++) {
        for (const inv of [false, true]) {
          let ok = true;
          for (let i = 0; i < want.length && ok; i++) ok = col(x + i, y) === (inv ? ~want[i] & mask : want[i]);
          if (ok) hits.push({ x, y: y + F.top, inv });
        }
      }
    }
    return hits;
  }
  // Everything legible, as runs of characters, for the log. Only what this
  // screen draws: capitals, digits and a little punctuation, so a lower case
  // glyph whose top half equals some edge is not read. Where two glyphs share
  // the cap band (O and a Q whose tail is below it) the first listed wins.
  const READABLE = 'ABCDEFGHIJKLMNOPRSTUVWXYZQ0123456789+/:,';
  function read() {
    const hits = [];
    for (let y = 0; y + rows <= 64; y++) {
      for (let x = 0; x < 128; x++) {
        // past the right edge reads as dark, so right-aligned text keeps its last character
        const here = []; for (let i = 0; i < F.adv; i++) here.push(x + i < 128 ? col(x + i, y) : 0);
        for (const ch of READABLE) {
          const c = ch.charCodeAt(0);
          const g = cols(ch);
          if (g.every((v, i) => here[i] === v)) { hits.push({ x, y, inv: false, c }); break; }
          if (g.every((v, i) => here[i] === (~v & mask))) { hits.push({ x, y, inv: true, c }); break; }
        }
      }
    }
    hits.sort((a, b) => a.y - b.y || a.inv - b.inv || a.x - b.x);
    const runs = [];
    for (const h of hits) {
      const r = runs.at(-1);
      const ch = String.fromCharCode(h.c);
      if (r && r.y === h.y && r.inv === h.inv && h.x === r.end + F.adv) { r.text += ch; r.end = h.x; }
      else if (r && r.y === h.y && r.inv === h.inv && h.x === r.end + 2 * F.adv) { r.text += ' ' + ch; r.end = h.x; }
      else runs.push({ x: h.x, y: h.y, inv: h.inv, end: h.x, text: ch });
    }
    return runs.filter((r) => r.text.length > 1);
  }
  const lit = (x, y) => px[y * 128 + x];
  // The header: the top cap+4 rows, which ui_header fills.
  const headerLit = () => { let n = 0; for (let y = 0; y < F.cap + 4; y++) for (let x = 0; x < 128; x++) n += lit(x, y); return n / (128 * (F.cap + 4)); };
  // The activity dot left of a label at (x, y): a 5x5 disc is 21 pixels, its ring 12.
  const dot = (h) => {
    let n = 0;
    for (let y = h.y - 1; y <= h.y + F.cap; y++) for (let x = h.x - 8; x <= h.x - 4; x++) if (y >= 0 && y < 64 && x >= 0) n += lit(x, y);
    return n >= 18 ? 'on' : n >= 10 ? 'off' : 'none';
  };
  // The arrow: a lit run that touches neither edge, the boxes' borders do.
  const arrow = () => {
    let best = 0;
    for (let y = F.cap + 5; y < 64 - F.cap - 4; y++) {
      for (let x = 1; x < 127; x++) {
        if (!lit(x, y) || lit(x - 1, y)) continue;
        let e = x; while (e < 127 && lit(e + 1, y)) e++;
        if (e < 126) best = Math.max(best, e - x + 1);
        x = e;
      }
    }
    return best;
  };
  // The deny meter: border at x 0, a dark gap, the fill from x 2.
  const meter = () => {
    for (let y = F.cap + 5; y < 64 - F.cap - 4; y++) {
      if (!(lit(0, y) && !lit(1, y) && lit(2, y))) continue;
      let e = 2; while (lit(e + 1, y)) e++;
      let r = e + 1; while (r < 128 && !lit(r, y)) r++;
      if (r < 128) return (e - 1) / (r - 2 - 1); // fill over the inside
    }
    return null;
  };
  return { find, read, headerLit, dot, arrow, meter, has: (t, inv) => find(t).some((h) => inv === undefined || h.inv === inv), at: (t, inv) => find(t).find((h) => h.inv === inv) };
}

// ── one emulated board ──
let pico, uart, tx = [], feeder, rxQueue = [];
function start(fontIndex, keysRight = false) {
  pico = new Pico({ uf2: UF2, bootrom: bootromB1 });
  if (fontIndex !== undefined || keysRight) {
    const flash = Buffer.from(pico.mcu.flash.buffer, pico.mcu.flash.byteOffset, pico.mcu.flash.length);
    const at = flash.indexOf('UIFONT');
    if (at < 0 || flash.indexOf('UIFONT', at + 1) >= 0) throw new Error('FONT_PICK marker not found exactly once in flash');
    if (fontIndex !== undefined) flash[at + 6] = fontIndex;
    if (keysRight) flash[at + 7] = 1;   // the key labels in a column down the right
  }
  uart = pico.mcu.uart[0];
  tx = []; rxQueue = [];
  uart.onByte = (b) => tx.push(b);
  feeder = setInterval(() => {
    while (rxQueue.length && !uart.rxFIFO.full) uart.feedByte(rxQueue.shift());
  }, 0);
}
function stop() { clearInterval(feeder); pico?.stop(); }

const hex = (a) => a.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
const bytes = (s) => s.trim().split(/\s+/).map((h) => parseInt(h, 16));
async function send(s) {
  rxQueue.push(...bytes(s));
  while (rxQueue.length) await pico.sleep(1);
  await pico.sleep(20); // the main loop parses, routes and drains
}
function take() { const t = tx; tx = []; return t; }

async function press(k, ms = 60) {
  await pico.hold(k, ms);
  pico.release(k);
  await pico.sleep(60); // past the 20 ms debounce on the way up too
}

// ── grading ──
let fails = 0;
function check(step, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? `\n      ${detail}` : ''}`);
  if (!ok) fails++;
}
const look = (F) => panel(pico.oled.pixels(), F);
async function shot(name, F) {
  await pico.sleep(80); // a redraw is due within 30 ms and takes 8 page writes
  writeFileSync(join(here, name), pico.oled.png(4));
  const s = look(F);
  console.log(`      ${name} (${F.name}):`);
  for (const r of s.read()) console.log(`        y ${String(r.y).padStart(2)} x ${String(r.x).padStart(3)} ${r.inv ? 'inv' : '   '} ${r.text}`);
  return s;
}
const says = (s, list) => list.filter(([t, inv]) => !s.has(t, inv)).map(([t, inv]) => `${inv ? 'inverted ' : ''}"${t}"`);
const missing = (m) => (m.length ? `not on the panel: ${m.join(', ')}` : '');

const REPLACE_PATCH = 'F0 00 20 29 01 60 01 05 10 20 30 40 50 60 70 F7';
const ALL_OFF = Array.from({ length: 16 }, (_, ch) => `${(0xb0 | ch).toString(16).toUpperCase()} 7B 00`).join(' ');
const FOOTER = [['PREV', false], ['NEXT', false], ['STOP', false]];
// main.c's ladder, longest first: the banner draws the first that fits on one line.
const HOLD_WORDS = ['HOLD: REPLACE PATCH', 'HOLD: PATCH', 'PATCH?'];

try {
  // ── the default font, every behaviour ──
  const F = DEFAULT;
  start();
  pico.boot(); // no USB on this firmware: the CDC never connects, nothing waits for it
  await pico.sleep(300);
  let s = await shot('router-0.png', F);
  let m = says(s, [['SCENE 1/2', true], ['THRU', true], ['DIN IN', false], ['DIN OUT', false], ['THRU CH1', false], ...FOOTER, ['OK', false], ['IN 0', false], ['OUT 0', false]]);
  check(`boot: header bar SCENE 1/2 THRU, the link DIN IN to DIN OUT with THRU CH1, footer PREV NEXT STOP OK (font ${F.name}, the default)`,
    s.headerLit() > 0.6 && s.arrow() >= 8 && !m.length, `${missing(m)} header ${(s.headerLit() * 100).toFixed(0)}% lit, arrow ${s.arrow()} px, TX at boot: [${hex(take())}]`);
  check('boot: both activity dots dark', s.dot(s.at('IN 0', false)) === 'off' && s.dot(s.at('OUT 0', false)) === 'off');

  await send('90 3C 64');
  await send('80 3C 00');
  let out = take();
  check('scene 1: note on and off C4 ch 1 pass unchanged', hex(out) === '90 3C 64 80 3C 00', `TX [${hex(out)}]`);
  s = await shot('router-1.png', F);
  m = says(s, [['IN 2', false], ['OUT 2', false]]);
  check('scene 1: counters IN 2 OUT 2, and no DROP while nothing dropped', !m.length && !s.has('DROP 0'), missing(m));
  check('scene 1: both dots lit within 150 ms of the traffic', s.dot(s.at('IN 2', false)) === 'on' && s.dot(s.at('OUT 2', false)) === 'on',
    `IN ${s.dot(s.at('IN 2', false))} OUT ${s.dot(s.at('OUT 2', false))}`);
  await pico.sleep(300);
  s = look(F);
  check('scene 1: both dots dark again 300 ms later', s.dot(s.at('IN 2', false)) === 'off' && s.dot(s.at('OUT 2', false)) === 'off');

  await press(2);
  out = take();
  // The diff: unlinking scene 1 releases what it played. The note is already
  // off, so no note off, but channel 1 had a note on it, so CC 123 there.
  check('K2: scene 2, and the unlink sends CC 123 on ch 1 only', hex(out) === 'B0 7B 00', `TX [${hex(out)}]`);
  await send('90 3C 64');
  out = take();
  check('scene 2: 90 3C 64 comes out as 91 48 64', hex(out) === '91 48 64', `TX [${hex(out)}]`);
  s = await shot('router-2.png', F);
  m = says(s, [['SCENE 2/2', true], ['OCTAVE UP', true], ['+12 CH2', false], ['DIN IN', false], ['DIN OUT', false]]);
  check('scene 2: header SCENE 2/2 OCTAVE UP, +12 CH2 on the arrow', !m.length && !s.has('THRU CH1') && s.arrow() >= 8, missing(m));

  await send(REPLACE_PATCH);
  out = take();
  check('Replace Patch SysEx (byte 6 = 01) is held: nothing on TX', out.length === 0, `TX [${hex(out)}]`);
  s = await shot('router-3.png', F);
  m = says(s, [['HOLD: REPLACE PATCH', true], ['TAP OK, HOLD NO', false], ['OK/NO', true], ...FOOTER]);
  check('screen: banner HOLD: REPLACE PATCH replaces the link, K4 cell filled OK/NO', !m.length && !s.has('DIN IN'), missing(m));

  await press(4);
  out = take();
  check('K4 short: the held SysEx goes out whole', hex(out) === REPLACE_PATCH, `TX [${hex(out)}]`);
  s = await shot('router-4.png', F);
  check('screen: banner gone, the link and a plain OK are back',
    !s.has('HOLD: REPLACE PATCH') && !s.has('OK/NO') && s.has('DIN IN', false) && s.has('OK', false));

  await press(3);
  out = take();
  check('K3 panic: CC 123 on all 16 channels', hex(out) === ALL_OFF, `TX [${hex(out)}]`);
  s = look(F); // 100 ms after the panic, inside the dot's 150 ms
  const o21 = s.at('OUT 21', false), i4 = s.at('IN 4', false);
  check('screen 100 ms after panic: OUT 21 with its dot lit, IN 4 with its dot dark', o21 && i4 && s.dot(o21) === 'on' && s.dot(i4) === 'off',
    `OUT 21 ${o21 ? s.dot(o21) : 'not found'}, IN 4 ${i4 ? s.dot(i4) : 'not found'}`);
  s = await shot('router-5.png', F);

  // Two more than the brief asked for, each one line.
  await send('90 3C 64 3E 64');
  out = take();
  check('extra: running status 90 3C 64 3E 64 routes as two notes', hex(out) === '91 48 64 91 4A 64', `TX [${hex(out)}]`);
  await send('90 7A 64'); // 122 + 12 is past 127: the transpose drops it rather than clamp
  out = take();
  await pico.sleep(40);
  s = look(F);
  check('extra: note 122 in scene 2 is dropped, nothing on TX, DROP 1 appears between the counts', out.length === 0 && s.has('DROP 1', false), `TX [${hex(out)}]`);
  await send('F0 00 20 29 01 60 00 05 F7');
  out = take();
  check('extra: Replace CURRENT Patch (byte 6 = 00) passes at once', hex(out) === 'F0 00 20 29 01 60 00 05 F7', `TX [${hex(out)}]`);
  await send(REPLACE_PATCH);
  await pico.hold(4, 520);
  s = await shot('router-6.png', F); // K4 still down, 600 ms into the 1 s
  const fill = s.meter();
  check('screen: K4 held 600 ms fills the deny meter part way, NO at its end', fill !== null && fill > 0.35 && fill < 0.85 && s.has('NO', false) && s.has('HOLD: REPLACE PATCH', true),
    `meter ${fill === null ? 'not found' : `${(fill * 100).toFixed(0)}% full`}`);
  await pico.sleep(600);
  pico.release(4);
  await pico.sleep(60);
  out = take();
  s = look(F);
  check('extra: K4 held 1.2 s denies, nothing on TX, banner gone', out.length === 0 && !s.has('HOLD: REPLACE PATCH') && s.has('DIN IN', false), `TX [${hex(out)}]`);
  stop();

  // ── every font, the real screen ──
  for (let i = 0; i < FONTS.length; i++) {
    const G = FONTS[i];
    start(i);
    pico.boot();
    await pico.sleep(300);
    await press(2);
    await send('90 3C 64');
    take();
    s = await shot(`router-font-${G.name}.png`, G);
    const left = s.has('SCENE 2/2', true) ? 'SCENE 2/2' : '2/2';
    // A footer label too wide for its cell is cut by ui_footer, never overlapped.
    const foot = FOOTER.map(([t]) => (s.has(t, false) ? [t, false] : [t.slice(0, 3), false]));
    m = says(s, [[left, true], ['OCTAVE UP', true], ['DIN IN', false], ['DIN OUT', false], ['+12 CH2', false], ...foot, ['OK', false]]);
    const ins = s.find('IN 1').concat(s.find('1')).find((h) => !h.inv && h.x < 40 && s.dot(h) !== 'none');
    check(`font ${G.name}: header ${left} OCTAVE UP, link, +12 CH2, footer, IN dot lit`,
      s.headerLit() > 0.6 && s.arrow() >= 8 && !m.length && ins && s.dot(ins) === 'on', `${missing(m)} arrow ${s.arrow()} px`);
    await send(REPLACE_PATCH);
    s = await shot(`router-font-${G.name}-hold.png`, G);
    // ONE LINE, NEVER TWO: whichever wording fitted, and no second banner line.
    const said = HOLD_WORDS.find((t) => s.has(t, true));
    const k4 = s.has('OK/NO', true) ? 'OK/NO' : 'OK';
    const hint = s.has('TAP OK, HOLD NO', false) || s.has('HOLD = NO', false);
    check(`font ${G.name}: hold banner on one line reading ${said}, K4 cell ${k4} filled, hint ${hint ? 'shown' : 'left out for room'}`,
      !!said && !s.has('REPLACE PATCH', true) === (said !== 'HOLD: REPLACE PATCH') && s.has(k4, true) && !s.has('DIN IN'));
    stop();
  }

  // ── the key labels down the right, every font ──
  // The module's four buttons sit in a column beside the screen, so byte 7
  // moves the labels there. Graded as pixels: one full height rule, the four
  // labels in top to bottom order inside the column, nothing of the link or
  // the header reaching past the rule, and K4's cell filled while held.
  // ⚠️ A NEGATIVE CONTROL FIRST: the default boot must have NO such rule, or a
  // check that finds one proves nothing about byte 7.
  // The column's rule runs from under the header to the foot: every row from
  // 16 down lit, which no box side, arrow or footer divider is.
  const ruleAt = (px) => { for (let x = 127; x > 64; x--) { let n = 0; for (let y = 16; y < 64; y++) n += px[y * 128 + x]; if (n === 48) return x; } return -1; };
  start();
  pico.boot();
  await pico.sleep(300);
  await pico.sleep(80);
  check('keys: the default boot draws no right hand column (the control for the checks below)', ruleAt(pico.oled.pixels()) === -1, `rule at ${ruleAt(pico.oled.pixels())}`);
  stop();
  for (let i = 0; i < FONTS.length; i++) {
    const G = FONTS[i];
    start(i, true);
    pico.boot();
    await pico.sleep(300);
    await press(2);
    await send('90 3C 64');
    take();
    s = await shot(`router-right-${G.name}.png`, G);
    const px = pico.oled.pixels();
    const rx = ruleAt(px);
    const order = ['PREV', 'NEXT', 'STOP', 'OK'].map((t) => {
      const h = s.find(t).find((q) => !q.inv && q.x > rx) || s.find(t.slice(0, 3)).find((q) => !q.inv && q.x > rx);
      return h ? h.y : -1;
    });
    const ordered = order.every((y, k) => y >= 0 && (k === 0 || y > order[k - 1]));
    // every label inside its own cell, four equal cells under the header
    const hh = G.cap + 4, cell = (k) => hh + Math.floor((k * (64 - hh)) / 4);
    const level = order.every((y, k) => y >= cell(k) && y + G.cap <= cell(k + 1));
    const right = s.find('DIN OUT').concat(s.find('OUT')).filter((h) => !h.inv);
    const clear = right.length > 0 && right.every((h) => h.x + 3 * G.adv <= rx);
    // the header runs the full width, over the column
    let over = 0; for (let x = rx; x < 128; x++) over += px[1 * 128 + x];
    check(`keys right, font ${G.name}: header across the top, rule at x ${rx} under it, labels top to bottom in their cells, the link stops before the rule`,
      rx > 64 && ordered && level && clear && s.headerLit() > 0.6 && over === 128 - rx, `label tops ${order.join(' ')}, OUT at ${right.map((h) => h.x).join(' ')}`);
    await send(REPLACE_PATCH);
    s = await shot(`router-right-${G.name}-hold.png`, G);
    const okCell = s.find('OK').find((q) => q.inv && q.x > rx && q.y >= 48);
    const said = HOLD_WORDS.find((t) => s.has(t, true));
    const wrapped = s.has('REPLACE PATCH', true) && said !== 'HOLD: REPLACE PATCH';
    check(`keys right, font ${G.name}: hold banner on one line left of the column (${said}), OK cell filled at the bottom`,
      !!okCell && !!said && !wrapped && ruleAt(pico.oled.pixels()) === rx);
    stop();
  }

  console.log(fails ? `${fails} FAIL` : 'all PASS');
  process.exitCode = fails ? 1 : 0;
} catch (e) {
  console.error(e.stack || e.message);
  process.exitCode = 1;
} finally {
  stop();
}

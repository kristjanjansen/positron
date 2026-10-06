// demo/shell/oled-view.mjs, the router's 128x64 panel drawn on a page.
//
// 🔴 LIFTED OUT OF `/kit/`, 2026-10-06, FOR THE KIT SPLIT (plans/plan-kit-split.md
// section 7 step 1). These were page functions in `demo/kit/index.html` and two
// parts read them: HARDWARE draws the emulator's screen and the screen parts
// with them, and SLIDES draws the OLED slide with them. Once the parts are
// separate pages they cannot share a page function, so the helpers are a
// module and both pages import it.
// ⚠️ MOVED VERBATIM, comments included. The only change is that `hwPartsLoad`
// and `hwPart` used to close over the page's `hw` object and its `d.log`, so
// they are made by `createOledParts(hw, { log })` and read the same fields of
// the same object: a page that writes `hw.oled`, `hw.parts`, `hw.partsFetched`
// and `hw.partsFrom` keeps writing them, and its checks keep reading them.
// ⚠️ `/kit/` STILL CARRIES ITS OWN COPIES until step 4 of that plan, when the
// monolith becomes the SLIDES page. That duplication is temporary and named in
// the plan so nobody tidies it early.
// ⚠️ THE STYLES ARE `.kit-oled`, `.kit-oled-pair` and `.kit-oled-fig` in
// `demo/shell/kit-page.css`, beside the other `.kit-*` rules they came with.

import { el } from './shell.mjs';
import { W as OLED_W, H as OLED_H, createOledUi } from './pico.mjs';

// The panel's two inks, rig/pico/sim/ssd1306.mjs's: the cyan blue of a blue
// SSD1306, and an unlit panel that is not quite black.
export const OLED_LIT = [0x4f, 0xc3, 0xff], OLED_DARK = [0x05, 0x07, 0x0c];

// 128x64 ones and zeros into a 128x64 canvas, one canvas pixel per panel pixel.
export function drawOled(cv, px) {
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(OLED_W, OLED_H);
  for (let i = 0; i < px.length; i++) {
    const c = px[i] ? OLED_LIT : OLED_DARK;
    img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
/**
 * 🔴 PIXEL EXACT, SO THE SCALE IS A WHOLE NUMBER. The canvas holds 128x64
 * and is drawn `image-rendering: pixelated` at k times that, where k is the
 * largest whole number that fits the box, 1 to 4. A fractional scale would
 * make some panel pixels one screen pixel wider than their neighbours, which
 * on a 5 pixel glyph is a letter visibly wider on one side.
 * ⚠️ AND A BOX WITH NO WIDTH YET IS NOT A NARROW BOX: inside a closed tab the
 * stack measures 0, and that is skipped rather than read as a phone.
 */
export function oledScreen(fitTo, { across = 1, gap = 18 } = {}) {
  const screen = el('div', 'kit-oled');
  const cv = document.createElement('canvas');
  cv.width = OLED_W; cv.height = OLED_H;
  screen.append(cv);
  drawOled(cv, new Uint8Array(OLED_W * OLED_H));
  const fit = () => {
    // the CONTENT width: `clientWidth` carries the host's padding as well
    const cs = getComputedStyle(fitTo);
    const w = fitTo.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (!(w > 0)) return;
    // ⚠️ THE FRAME'S OWN PADDING AND BORDER, READ AS STYLE AND NOT AS
    // `screen.offsetWidth - cv.offsetWidth`: the frame is `max-width: 100%`,
    // so once the canvas is wider than the box that difference goes
    // negative and asks for a BIGGER scale. MEASURED at 375 px: a 512 px
    // panel in a 310 px box, 179 px of the page dragged sideways.
    const sc = getComputedStyle(screen);
    const chrome = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
      .reduce((n, k) => n + parseFloat(sc[k]), 0);
    /* ⚠️ SEVERAL PANELS IN ONE ROW SHARE THE ROW, so each is sized off the
       row and not off its own cell: a cell sized by the canvas inside it is a
       loop, and MEASURED at 756 px it settled with the second panel a scale
       larger than the first and 154 px of the page dragged sideways. Two to a
       row only while both fit at 2x, else one under the other. */
    const n = across > 1 && w >= across * (2 * OLED_W + chrome) + (across - 1) * gap ? across : 1;
    const k = Math.max(1, Math.min(4, Math.floor(((w - (n - 1) * gap) / n - chrome) / OLED_W)));
    screen.style.setProperty('--oled-k', String(k));
  };
  new ResizeObserver(fit).observe(fitTo);
  return { screen, cv };
}
// Text into a 128x64 buffer in a firmware font. `y` is the top of the
// capitals, as ui.h has it, so two fonts line up on the same y.
export function oledText(px, F, x, y, text) {
  for (const ch of text) {
    const g = F.glyph(ch.charCodeAt(0));
    for (let i = 0; i < F.w; i++) {
      for (let j = 0; j < F.h; j++) {
        if (!((g[i] >> j) & 1)) continue;
        const X = x + i, Y = y - F.top + j;
        if (X >= 0 && X < OLED_W && Y >= 0 && Y < OLED_H) px[Y * OLED_W + X] = 1;
      }
    }
    x += F.adv;
  }
  return x;
}

/**
 * 🔴 THE ROUTER'S SCREEN, ONE PART AT A TIME, 2026-10-04. Asked as *"Break
 * down hw ui some more on kit"*. Every picture below is drawn by
 * `rig/pico/firmware/ui.c` itself, compiled a second time to WebAssembly
 * (`/resources/pico/oled-ui.wasm`, 7.7 KB, no imports), not by a JavaScript
 * copy of it. `rig/pico/firmware/wasm/test.mjs` compares the two compilations
 * with the emulated board pixel for pixel, and a check at the foot of this
 * file does it again here.
 * ⚠️ FETCHED WITH THE FIRMWARE, WHEN HARDWARE IS OPENED, NEVER ON A VISIT.
 * 🔴 OR WHEN SLIDES IS OPENED, SINCE 2026-10-05, because the OLED slide shows
 * ui.c's LINK screen (*"oled"*, from the slides list, item 7). A tab press is
 * a person's press either way. Once, whichever tab asks first: the second
 * caller finds `partsFetched` set and returns, and the first one's arrival
 * draws every registered part, the slide's included. `partsFrom` says which.
 *
 * `hw` is the page's own state object and these two read and write the fields
 * they always did: `oled`, `parts`, `partsFetched` and `partsFrom`.
 */
export function createOledParts(hw, { log = () => {}, url = '/resources/pico/oled-ui.wasm' } = {}) {
  async function hwPartsLoad(from) {
    if (hw.oled || hw.partsFetched) return;
    try {
      hw.partsFetched++;
      hw.partsFrom = from;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`oled-ui.wasm answered ${res.status}`);
      hw.oled = await createOledUi(await res.arrayBuffer());
    } catch (e) {
      log(`the screen parts did not load: ${e.message}`, 'bad');
      return;
    }
    for (const p of hw.parts) { p.px = hw.oled.screen(-1, p.paint); drawOled(p.cv, p.px); }
  }
  // One or two panels in a row, each with a line under it saying which case it is.
  function hwPart(box, specs) {
    const pair = el('div', 'kit-oled-pair');
    for (const [name, note, paint] of specs) {
      const fig = el('div', 'kit-oled-fig');
      // every part at one scale, whether its block shows one panel or two
      const { screen, cv } = oledScreen(box, { across: 2 });
      fig.append(screen, el('div', 'kit-cut', note));
      pair.append(fig);
      hw.parts.push({ name, cv, paint, px: null });
    }
    box.append(pair);
  }
  return { hwPartsLoad, hwPart };
}

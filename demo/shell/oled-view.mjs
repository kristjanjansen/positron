// demo/shell/oled-view.mjs: the router's 128x64 panel drawn on a page, shared by the kit parts.
// createOledParts(hw, { log }) reads and writes hw.oled, hw.parts, hw.partsFetched and hw.partsFrom.
// Styles: .kit-oled, .kit-oled-pair and .kit-oled-fig in demo/shell/kit-page.css.
// why: lessons/kit-oled-view.md#header

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
 * A blank 128x64 canvas in box, drawn pixelated at the largest whole scale that fits (1 to 4), so every
 * panel pixel is the same size. A box of width 0 (a closed tab) is skipped, not read as a phone.
 * why: lessons/kit-oled-view.md#oled-canvas
 */
export function oledCanvas(box) {
  const cv = document.createElement('canvas');
  cv.width = OLED_W; cv.height = OLED_H;
  drawOled(cv, new Uint8Array(OLED_W * OLED_H));
  box.append(cv);
  new ResizeObserver(() => {
    const k = Math.max(1, Math.floor(Math.min(box.clientWidth / OLED_W, box.clientHeight / OLED_H)));
    cv.style.width = `${k * OLED_W}px`; cv.style.height = `${k * OLED_H}px`;
  }).observe(box);
  return cv;
}

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
    // The frame's padding and border are read as style: once the canvas outgrows the box, offset widths
    // go negative and ask for a bigger scale (179 px of overflow at 375 px).
    // why: lessons/kit-oled-view.md#frame-chrome
    const sc = getComputedStyle(screen);
    const chrome = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
      .reduce((n, k) => n + parseFloat(sc[k]), 0);
    // Panels in one row are sized off the row, not their own cells. Two to a row only while both fit at 2x.
    // why: lessons/kit-oled-view.md#shared-row
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
 * The router's screen one part at a time, drawn by rig/pico/firmware/ui.c compiled to WebAssembly
 * (oled-ui.wasm, 7.7 KB). Fetched once when HARDWARE or SLIDES is opened, never on a visit.
 * why: lessons/kit-oled-view.md#create-oled-parts
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

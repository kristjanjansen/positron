// demo/shell/panel-screen.mjs: what the Pi's 0.96" OLED shows, drawn by the firmware's UI kit compiled
// to WebAssembly (oled-ui.wasm), so rig/board/panel.mjs and /remote/oled/'s simulated screen make the
// same 1024 bytes. Change `drawPanel` here: the page shows it on reload, the Pi after push.sh.
// No DOM and no Pico emulator, so node imports it too (oled-view.mjs would load pico.mjs, 216 KB).
// why: lessons/kit-panel-screen.md#header

export const W = 128, H = 64;
/** The four keys as printed on the module, K1 to K4 (measured 2026-10-15). */
export const KEY_SYMBOLS = ['^', 'v', '#', '*'];
// The panel's two inks, oled-view.mjs's OLED_LIT and OLED_DARK.
const LIT = [0x4f, 0xc3, 0xff], DARK = [0x05, 0x07, 0x0c];

/**
 * The layout, in the firmware kit's calls. `state` is what the board knows:
 * `{ text, held }`, `held` the keys down as numbers 1 to 4.
 */
export function drawPanel(ui, state) {
  const top = ui.header('pi-1', 'oled');
  // the message, word wrapped to the width, three lines at most
  const per = Math.max(1, Math.floor(W / ui.adv)), lines = [''];
  for (const w of String(state.text || '').split(/\s+/)) {
    const next = lines.at(-1) ? `${lines.at(-1)} ${w}` : w;
    if (next.length > per && lines.at(-1)) lines.push(w.slice(0, per)); else lines[lines.length - 1] = next.slice(0, per);
  }
  lines.slice(0, 3).forEach((ln, i) => ui.text(0, top + 4 + i * (ui.cap + 4), ln));
  // the keys as the firmware's footer, a held key lit
  let hot = 0;
  for (const k of state.held || []) hot |= 1 << (k - 1);
  ui.footer(KEY_SYMBOLS, hot);
}

/** oled-ui.wasm's bytes to `{ frame(state) }`, a 1024 byte page major frame as the SSD1306 takes it. */
export async function loadPanelUi(bytes) {
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const U = instance.exports;
  const mem = () => new Uint8Array(U.memory.buffer);
  const put = (i, s = '') => { const at = U.str(i), b = new TextEncoder().encode(String(s).slice(0, 63)); mem().set(b, at); mem()[at + b.length] = 0; };
  const four = (labels) => { for (let i = 0; i < 4; i++) put(i, labels[i] ?? ''); };
  // The kit's calls (rig/pico/firmware/ui.h), as pico.mjs's createOledUi names them.
  const ui = {
    get cap() { return U.font_cap(); },
    get adv() { return U.font_adv(); },
    header: (l, r) => { put(0, l); put(1, r); return U.header(); },
    text: (x, y, s) => { put(0, s); return U.text(x, y); },
    textBig: (x, y, s) => { put(0, s); return U.text_big(x, y); },
    textInv: (x, y, w, s) => { put(0, s); U.text_inv(x, y, w); },
    textW: (s) => { put(0, s); return U.text_w(); },
    box: (x, y, w, h, s) => { put(0, s); U.box(x, y, w, h); },
    meter: (x, y, w, h, level, max) => U.meter(x, y, w, h, level, max),
    dot: (x, y, on) => U.dot(x, y, on ? 1 : 0),
    banner: (y, h, s) => { put(0, s); U.banner(y, h); },
    rect: (x, y, w, h) => U.rect(x, y, w, h),
    fill: (x, y, w, h, c = 1) => U.fill(x, y, w, h, c),
    footer: (labels, hot = 0) => { four(labels); return U.footer(hot); },
    footerH: () => U.footer_h(),
  };
  return {
    frame(state) {
      U.begin(-1);
      drawPanel(ui, state);
      return mem().slice(U.fb(), U.fb() + (W * H) / 8);
    },
  };
}

/** A page major frame painted into a 128x64 canvas, one canvas pixel per panel pixel. */
export function paintFrame(cv, frame) {
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = (frame[(y >> 3) * W + x] >> (y & 7)) & 1 ? LIT : DARK, i = (y * W + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

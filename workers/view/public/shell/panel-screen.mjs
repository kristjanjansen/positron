// demo/shell/panel-screen.mjs: what the Pi's 0.96" OLED shows, drawn by the firmware's UI kit compiled
// to WebAssembly (oled-ui.wasm), so rig/board/panel.mjs and /remote/oled/'s simulated screen make the
// same 1024 bytes. Change `drawPanel` here: the page shows it on reload, the Pi after push.sh.
// No DOM and no Pico emulator, so node imports it too (oled-view.mjs would load pico.mjs, 216 KB).
// why: lessons/kit-panel-screen.md#header

export const W = 128, H = 64;
/** The four keys as printed on the module, K1 to K4 (measured 2026-10-15). */
export const KEY_SYMBOLS = ['^', 'v', '#', '*'];
// The lit ink is oled-view.mjs's OLED_LIT; unlit is black, as an OLED pixel that is off (asked darker).
const LIT = [0x4f, 0xc3, 0xff], DARK = [0, 0, 0];

/**
 * The layout, in the firmware kit's calls. `state` is what the board knows:
 * `{ text, held }`, `held` the keys down as numbers 1 to 4.
 */
export function drawPanel(ui, state) {
  // The keys down the right edge, ^ at the top, level with the module's buttons: no rules, a 14 px square
  // per key that fills while it is held. No header: at 0.96" its line is too small to read.
  const held = new Set(state.held || []), SQ = 14, sx = W - SQ, cell = H / 4;
  for (let i = 0; i < 4; i++) {
    const cy = Math.round(cell * (i + 0.5)), cx = sx + SQ / 2;
    if (i < 2) chevron(ui, cx, cy, i ? 'down' : 'up');
    else { const w = ui.textW(KEY_SYMBOLS[i]); ui.text(Math.round(cx - w / 2), Math.round(cy - ui.cap / 2), KEY_SYMBOLS[i]); }
    // held: the square flipped, a lit square with the glyph cut out of it
    if (held.has(i + 1)) ui.fill(sx, cy - SQ / 2, SQ, SQ, 2);
  }
  const right = sx - 2;
  // the message in what is left, word wrapped, as many lines as fit
  const per = Math.max(1, Math.floor((right - 3) / ui.adv)), step = ui.cap + 4, lines = [''];
  for (const w of String(state.text || '').split(/\s+/)) {
    const next = lines.at(-1) ? `${lines.at(-1)} ${w}` : w;
    if (next.length > per && lines.at(-1)) lines.push(w.slice(0, per)); else lines[lines.length - 1] = next.slice(0, per);
  }
  lines.slice(0, Math.floor((H - 2) / step)).forEach((ln, i) => ui.text(1, 2 + i * step, ln));
}

// A 7 by 4 chevron two pixels thick, centred on (cx, cy).
const CHEVRON = [[3, 3], [2, 4], [1, 2, 4, 5], [0, 1, 5, 6]];
function chevron(ui, cx, cy, dir) {
  CHEVRON.forEach((runs, r) => {
    const y = cy - 2 + (dir === 'up' ? r : 3 - r);
    for (let i = 0; i < runs.length; i += 2) ui.fill(cx - 3 + runs[i], y, runs[i + 1] - runs[i] + 1, 1, 1);
  });
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
    keysRight: (labels, hot = 0, top = 0) => { four(labels); return U.keys_right(hot, top); },
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

// workers/view/og/render.mjs: SVG to PNG in Node, through resvg compiled to
// wasm, with the site's two faces as TTFs and no system fonts. eccm's
// src/og/render.mjs (itself trip's renderer) moved to build time: the same
// @resvg/resvg-wasm 2.6.2, the same `fontBuffers` and `loadSystemFonts: false`,
// initialised once per process because a second initWasm throws.
//
// ⚠️ NO BROWSER ANYWHERE IN THIS PATH, asked 2026-10-13: *"What headless
// chrome?!!?"*. The SVG is written by demo/shell/share-card.mjs and
// demo/shell/bay-svg.mjs from data and font metrics; this file only rasterises.
// ⚠️ THE WASM IS VENDORED, NOT INSTALLED. vendor/resvg-wasm/ is index.mjs,
// index_bg.wasm and package.json copied byte for byte from the npm package
// @resvg/resvg-wasm 2.6.2 (MPL-2.0, its package.json beside it). It lives here
// and not under demo/ so the build never deploys 2.48 MB nobody fetches.
// ⚠️ THE FACES ARE fonts/*.ttf, made by og-fonts.py from demo/shell/vendor/.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initWasm, Resvg } from './vendor/resvg-wasm/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FACES = ['jetbrains-mono-latin-400-normal', 'jetbrains-mono-latin-600-normal', 'geist-latin-400-normal', 'geist-latin-600-normal'];

let ready = null, fonts = null;

/** The ink box of what `svg` draws, `{ x, y, width, height }`, resvg's own
 *  `getBBox()`, so a mark can be centred on its glyphs rather than on its line. */
export async function inkBox(svg) {
  await (ready ??= readFile(join(HERE, 'vendor/resvg-wasm/index_bg.wasm')).then((b) => initWasm(b)));
  fonts ??= await Promise.all(FACES.map((f) => readFile(join(HERE, 'fonts', `${f}.ttf`)).then((b) => new Uint8Array(b))));
  const r = new Resvg(svg, { font: { fontBuffers: fonts, loadSystemFonts: false, defaultFontFamily: 'JetBrains Mono' } });
  const b = r.getBBox();
  return b && { x: b.x, y: b.y, width: b.width, height: b.height };
}

/** `svg` rasterised to a PNG `width` px wide, as a Uint8Array. */
export async function renderPng(svg, width) {
  await (ready ??= readFile(join(HERE, 'vendor/resvg-wasm/index_bg.wasm')).then((b) => initWasm(b)));
  fonts ??= await Promise.all(FACES.map((f) => readFile(join(HERE, 'fonts', `${f}.ttf`)).then((b) => new Uint8Array(b))));
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontBuffers: fonts, loadSystemFonts: false, defaultFontFamily: 'JetBrains Mono' },
  }).render().asPng();
}

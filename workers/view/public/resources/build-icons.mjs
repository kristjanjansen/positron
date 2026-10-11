// demo/resources/build-icons.mjs, writes demo/shell/icons.mjs from the Feather
// set as Iconify publishes it.
//
//   node demo/resources/build-icons.mjs                     # fetch the pinned package from npm, then write
//   node demo/resources/build-icons.mjs path/to/icons.json  # write from a copy already on disk
//
// NODE ONLY, AND IT IS THE ONLY THING THAT EVER ASKS NPM. Asked 2026-10-10:
// *"see ../eccm icon system. We need one from icones. Make a sample sheet in
// one of kit pages called icons."* eccm picked Feather on 2026-10-02 over six
// other sets (eccm `archive/icon-sets.md`) and vendors it into one sprite with
// `tools/feather.mjs`; positron uses the same set and vendors it too, as a
// plain ES module, because pages here import `/shell/*.mjs` with no bundler
// and a page must not ask the Iconify API, or anybody else's server, for a
// picture at visit time.
//
// ⚠️ TO ADD AN ICON: find its Feather name on https://icones.js.org/collection/feather,
// add `[positron name, feather name]` to a group below, run this, and add the
// name to nothing else. `/kit/icons/` draws every name in `NAMES`.
// ⚠️ WHAT CHANGES FROM THE PUBLISHED BODY, AND IT IS ONLY PAINT: every
// `fill`, `stroke`, `stroke-width`, `stroke-linecap` and `stroke-linejoin` is
// taken off the shapes and a `<g>` wrapper Iconify adds to carry them is
// unwrapped, so `icon()` sets them once on the `<svg>` and a caller can change
// the weight. The geometry is Feather's, untouched (eccm squares Feather's
// small corners for a site with no radius; positron's controls are rounded at
// 4 px, so the corners stay).
// ⚠️ TWO NAMES MAY NOT SHARE ONE FEATHER ICON. A second name for the same
// picture is a synonym the reader of the sheet cannot tell apart, so this
// throws, and `/kit/icons/` asserts the bodies are all different.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PACKAGE = '@iconify-json/feather';
const VERSION = '1.2.1';

// [positron name, Feather name], grouped the way the sample sheet reads
export const GROUPS = [
  ['transport', [
    ['play', 'play'], ['pause', 'pause'], ['stop', 'square'], ['record', 'circle'],
    ['skip-back', 'skip-back'], ['skip-forward', 'skip-forward'], ['rewind', 'rewind'],
    ['fast-forward', 'fast-forward'], ['loop', 'repeat'], ['shuffle', 'shuffle'],
  ]],
  ['sound', [
    ['volume', 'volume-2'], ['volume-low', 'volume-1'], ['mute', 'volume-x'], ['mic', 'mic'],
    ['mic-off', 'mic-off'], ['headphones', 'headphones'], ['speaker', 'speaker'],
    ['music', 'music'], ['waveform', 'activity'], ['radio', 'radio'],
  ]],
  ['picture', [
    ['camera', 'camera'], ['video', 'video'], ['video-off', 'video-off'], ['screen', 'monitor'],
    ['cast', 'cast'], ['fullscreen', 'maximize'], ['fullscreen-exit', 'minimize'], ['image', 'image'],
  ]],
  ['wiring', [
    ['link', 'link'], ['sliders', 'sliders'], ['settings', 'settings'], ['board', 'cpu'],
    ['power', 'power'], ['wifi', 'wifi'],
  ]],
  ['files', [
    ['upload', 'upload'], ['download', 'download'], ['file', 'file'], ['folder', 'folder'],
    ['save', 'save'], ['copy', 'copy'], ['trash', 'trash-2'], ['edit', 'edit-2'],
  ]],
  ['people', [
    ['chat', 'message-square'], ['send', 'send'], ['user', 'user'], ['users', 'users'], ['lock', 'lock'],
    ['unlock', 'unlock'], ['eye', 'eye'], ['eye-off', 'eye-off'],
  ]],
  ['state', [
    ['info', 'info'], ['warning', 'alert-triangle'], ['error', 'alert-circle'], ['check', 'check'],
    ['close', 'x'], ['help', 'help-circle'],
  ]],
  ['moving around', [
    ['plus', 'plus'], ['minus', 'minus'], ['arrow-left', 'arrow-left'], ['arrow-right', 'arrow-right'],
    ['chevron-left', 'chevron-left'], ['chevron-right', 'chevron-right'], ['chevron-down', 'chevron-down'],
    ['menu', 'menu'], ['more', 'more-horizontal'], ['search', 'search'], ['refresh', 'refresh-cw'],
    ['external', 'external-link'], ['home', 'home'], ['grid', 'grid'], ['list', 'list'], ['clock', 'clock'],
  ]],
];

function loadSet(path) {
  if (path) return JSON.parse(readFileSync(path, 'utf8'));
  const dir = mkdtempSync(join(tmpdir(), 'positron-icons-'));
  try {
    const tgz = execFileSync('npm', ['pack', `${PACKAGE}@${VERSION}`, '--pack-destination', dir, '--silent'], { encoding: 'utf8' }).trim().split('\n').pop();
    execFileSync('tar', ['xzf', join(dir, tgz), '-C', dir]);
    return JSON.parse(readFileSync(join(dir, 'package', 'icons.json'), 'utf8'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const PAINT = /\s(fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)="[^"]*"/g;
const strip = (body) => body.replace(PAINT, '').replace(/^<g>([\s\S]*)<\/g>$/, '$1').trim();

const set = loadSet(process.argv[2]);
if (set.prefix !== 'feather') throw new Error(`expected the feather set, got ${set.prefix}`);
const seen = new Map();
const rows = [];
for (const [group, icons] of GROUPS) for (const [name, src] of icons) {
  const ico = set.icons[src];
  if (!ico) throw new Error(`Feather has no icon called ${src} (for ${name})`);
  if (seen.has(src)) throw new Error(`${name} and ${seen.get(src)} are both Feather's ${src}`);
  if (rows.some((r) => r.name === name)) throw new Error(`${name} is listed twice`);
  seen.set(src, name);
  const body = strip(ico.body);
  if (!/<(path|circle|rect|line|polyline|polygon|ellipse)\b/.test(body)) throw new Error(`${src} has no shape left after stripping`);
  rows.push({ group, name, src, body });
}

const out = `// demo/shell/icons.mjs, the kit's icons. GENERATED by
// demo/resources/build-icons.mjs from ${PACKAGE}@${VERSION}: Feather Icons by
// Cole Bemis, MIT (https://github.com/feathericons/feather/blob/master/LICENSE),
// as Iconify publishes it (https://icones.js.org/collection/feather).
// DO NOT EDIT BY HAND. To add an icon, add [name, feather name] to GROUPS in
// that script and run \`node demo/resources/build-icons.mjs\`.
//
// \`icon(name, { size, title, stroke })\` answers an inline <svg> on Feather's
// 24 unit grid, drawn in \`currentColor\` so it takes the ink of the text it
// sits in. With a \`title\` it is a picture with a name (role img, aria-label
// and a <title>); without one it is decoration and is aria-hidden, which is
// right inside a button that already carries its own aria-label. An unknown
// name THROWS, naming the set, because an empty square is a picture of a
// missing icon that reads as an icon.

const SVG_NS = 'http://www.w3.org/2000/svg';

/** [group, [names]] in the order the sample sheet shows them. */
export const GROUPS = ${JSON.stringify(GROUPS.map(([g, icons]) => [g, icons.map(([n]) => n)]))};

/** Each name's Feather name, so the sheet can say where it came from. */
export const SOURCE = {
${rows.map((r) => `  ${JSON.stringify(r.name)}: ${JSON.stringify(r.src)},`).join('\n')}
};

/** The shapes inside each icon's <svg>, paint taken off. */
export const BODIES = {
${rows.map((r) => `  ${JSON.stringify(r.name)}: ${JSON.stringify(r.body)},`).join('\n')}
};

export const NAMES = Object.keys(BODIES);
export const hasIcon = (name) => Object.hasOwn(BODIES, name);

/**
 * @param {string} name one of NAMES
 * @param {object} [o]
 * @param {number} [o.size=16]    CSS px, both sides
 * @param {string} [o.title]      a name for the picture; omit it when the label is elsewhere
 * @param {number} [o.stroke=1.5] in grid units, so 1.5 is 1 px at 16 and 2 px at 32
 * @returns {SVGSVGElement}
 */
export function icon(name, { size = 16, title, stroke = 1.5 } = {}) {
  if (!hasIcon(name)) throw new Error(\`no icon called "\${name}" in the kit's Feather set; add it to demo/resources/build-icons.mjs\`);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'pos-ico');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(stroke));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('focusable', 'false');
  svg.dataset.icon = name;
  svg.innerHTML = BODIES[name];
  if (title) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', title);
    const t = document.createElementNS(SVG_NS, 'title');
    t.textContent = title;
    svg.prepend(t);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  return svg;
}
`;

writeFileSync(new URL('../shell/icons.mjs', import.meta.url), out);
console.log(`${rows.length} icons from ${PACKAGE}@${VERSION} (${set.info?.license?.spdx || 'MIT'}) in ${GROUPS.length} groups, written to demo/shell/icons.mjs`);

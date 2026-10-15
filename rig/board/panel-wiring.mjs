// node rig/board/panel-wiring.mjs: the 0.96" OLED with four keys on the Pi 4's header, through a
// breadboard, as panel-wiring.svg. Pins from plans/plan-pi-oled.md 1.2; module order from
// rig/pico/oled/wiring.yml (GND VCC SCL SDA K4 K3 K2 K1, keys printed in reverse).

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const C = { v3: '#d63b3b', v5: '#e0457b', gnd: '#222', sda: '#2f7bd6', scl: '#f08a24', key: '#8a4fd1' };
// module pin (left to right) -> Pi physical pin, signal, wire colour
const WIRES = [
  { mod: 'GND', pin: 6, sig: 'GND', c: C.gnd },
  { mod: 'VCC', pin: 1, sig: '3V3', c: C.v3 },
  { mod: 'SCL', pin: 5, sig: 'GPIO3 SCL', c: C.scl },
  { mod: 'SDA', pin: 3, sig: 'GPIO2 SDA', c: C.sda },
  { mod: 'K4', pin: 37, sig: 'GPIO26', c: C.key },
  { mod: 'K3', pin: 33, sig: 'GPIO13', c: C.key },
  { mod: 'K2', pin: 31, sig: 'GPIO6', c: C.key },
  { mod: 'K1', pin: 29, sig: 'GPIO5', c: C.key },
];
const LABEL = { 2: '5V', 4: '5V' };

const P = 24;                                   // one header pitch in px
const HX = 80, HY = 150;                        // header's pin 1 column x, outer row y
// Pin n: column (n+1)>>1 from the left; even pins on the outer (top) row, odd on the inner row.
const pinXY = (n) => [HX + (((n + 1) >> 1) - 1) * P, HY + (n % 2 ? P : 0)];

const W = 1120, H = 740;
const o = [];
o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="ui-monospace, Menlo, monospace">`);
o.push(`<rect width="100%" height="100%" fill="#f4f1ea"/>`);
o.push(`<text x="40" y="40" font-size="20" font-weight="700" fill="#222">0.96" OLED + 4 keys on the Raspberry Pi 4</text>`);
o.push(`<text x="40" y="64" font-size="13" fill="#555">8 jumpers, female on the Pi, male in the breadboard. Power comes from the Pi's 3.3 V. The breadboard's own supply stays OFF.</text>`);

// the Pi's edge and header
o.push(`<rect x="${HX - 40}" y="${HY - 30}" width="${20 * P + 60}" height="${P + 60}" rx="6" fill="#2e7d4f"/>`);
o.push(`<text x="${HX - 34}" y="${HY - 44}" font-size="12" fill="#555">Pi header, seen from above. Outer row is even pins. Pin 1 is the end AWAY from the USB ports</text>`);
const used = new Map(WIRES.map((w) => [w.pin, w]));
for (let n = 1; n <= 40; n++) {
  const [x, y] = pinXY(n);
  const w = used.get(n), bad = n === 2 || n === 4;
  o.push(`<rect x="${x - 8}" y="${y - 8}" width="16" height="16" rx="${n === 1 ? 0 : 3}" fill="${w ? w.c : bad ? '#fff' : '#cfc9b8'}" stroke="${bad ? C.v5 : '#111'}" stroke-width="${bad ? 2 : 1}"/>`);
  if (w) o.push(`<text x="${x}" y="${y + 3.5}" font-size="${n > 9 ? 8 : 10}" text-anchor="middle" fill="#fff" font-weight="700">${n}</text>`);
  if (LABEL[n]) {
    const above = n % 2 === 0;
    o.push(`<text x="${x}" y="${above ? y - 13 : y + 22}" font-size="10" text-anchor="middle" fill="${bad ? C.v5 : '#fff'}" font-weight="700">${LABEL[n]}</text>`);
  }
}
o.push(`<text x="${HX - 30}" y="${HY + P + 5}" font-size="11" fill="#fff" text-anchor="end">1</text>`);
o.push(`<text x="${HX - 30}" y="${HY + 5}" font-size="11" fill="#fff" text-anchor="end">2</text>`);
o.push(`<text x="${HX + 19 * P + 28}" y="${HY + P + 5}" font-size="11" fill="#fff">39</text>`);
o.push(`<text x="${HX + 19 * P + 28}" y="${HY + 5}" font-size="11" fill="#fff">40</text>`);

// breadboard: 8 columns of 5 tied holes (a to e), module in row e
const BX = 760, BY = HY + P + 200, BP = 22, MY_ = BY + 4 * BP + 18;
const colX = (i) => BX + 20 + i * 38;
o.push(`<rect x="${BX - 20}" y="${BY - 20}" width="${7 * 38 + 40}" height="${5 * BP + 40}" rx="6" fill="#fbfbf8" stroke="#c9c5bb"/>`);
o.push(`<text x="${BX - 20}" y="${MY_ + 210}" font-size="12" fill="#555">breadboard: holes a to e in one column are one wire</text>`);
'abcde'.split('').forEach((r, j) => o.push(`<text x="${BX - 10}" y="${BY + j * BP + 4}" font-size="10" fill="#999" text-anchor="end">${r}</text>`));
WIRES.forEach((w, i) => {
  for (let j = 0; j < 5; j++) o.push(`<rect x="${colX(i) - 4}" y="${BY + j * BP - 4}" width="8" height="8" fill="#555"/>`);
  o.push(`<line x1="${colX(i)}" y1="${BY}" x2="${colX(i)}" y2="${BY + 4 * BP}" stroke="${w.c}" stroke-width="2" opacity=".35"/>`);
});

// the module, pins down into row e
const MY = BY + 4 * BP + 18;
o.push(`<rect x="${colX(0) - 26}" y="${MY}" width="${colX(7) - colX(0) + 52}" height="190" rx="6" fill="#1a3a6b"/>`);
o.push(`<rect x="${colX(0)}" y="${MY + 44}" width="${colX(7) - colX(0)}" height="96" fill="#05070b" stroke="#444"/>`);
o.push(`<text x="${(colX(0) + colX(7)) / 2}" y="${MY + 96}" font-size="12" fill="#7fd" text-anchor="middle">SSD1306 128x64, I2C 0x3C</text>`);
WIRES.forEach((w, i) => {
  o.push(`<line x1="${colX(i)}" y1="${BY + 4 * BP}" x2="${colX(i)}" y2="${MY + 8}" stroke="#bbb" stroke-width="3"/>`);
  o.push(`<text x="${colX(i)}" y="${MY + 26}" font-size="11" fill="#fff" text-anchor="middle" font-weight="700">${w.mod}</text>`);
});
o.push(`<text x="${(colX(0) + colX(7)) / 2}" y="${MY + 172}" font-size="11" fill="#cde" text-anchor="middle">4 keys under the screen</text>`);

// jumpers: header pin to row a of its column
WIRES.forEach((w, i) => {
  const [x, y] = pinXY(w.pin), tx = colX(i), ty = BY;
  const out = w.pin % 2 === 0 ? -1 : 1;           // even pins leave upward over the edge
  const lane = HY + P + 60 + i * 14;               // each wire its own horizontal lane
  const edge = HX + 20 * P + 10;                   // even pins run right along the header's outer margin
  const d = out < 0
    ? `M${x} ${y - 9} L${x} ${HY - 21} L${edge} ${HY - 21} L${edge} ${lane} L${tx} ${lane} L${tx} ${ty - 8}`
    : `M${x} ${y + 9} L${x} ${lane} L${tx} ${lane} L${tx} ${ty - 8}`;
  o.push(`<path d="${d}" fill="none" stroke="${w.c}" stroke-width="3.5" stroke-linejoin="round"/>`);
});

// the table
const TY = HY + P + 230;
o.push(`<text x="40" y="${TY}" font-size="14" font-weight="700" fill="#222">module pin   Pi pin   signal</text>`);
WIRES.forEach((w, i) => {
  const y = TY + 26 + i * 24;
  o.push(`<rect x="40" y="${y - 12}" width="14" height="14" fill="${w.c}"/>`);
  o.push(`<text x="64" y="${y}" font-size="14" fill="#222" xml:space="preserve">${w.mod.padEnd(9)}${String(w.pin).padStart(4)}     ${w.sig}</text>`);
});
const NY = TY + 26 + 8 * 24 + 16;
[
  'Never pins 2 or 4 (5 V). At 5 V the module\'s pull-ups put 5 V on GPIO2/3.',
  'Keys pull to GND inside the module; the Pi\'s internal pull-ups do the rest.',
  'Breadboard is only a holder here. Female-female jumpers straight to the',
  'module pins work too.',
].forEach((t, i) => o.push(`<text x="40" y="${NY + i * 20}" font-size="12" fill="${i === 0 ? C.v5 : '#444'}">${t}</text>`));
o.push('</svg>');

const out = fileURLToPath(new URL('./panel-wiring.svg', import.meta.url));
writeFileSync(out, o.join('\n'));
console.log(out);

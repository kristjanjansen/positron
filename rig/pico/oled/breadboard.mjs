// rig/pico/oled/breadboard.mjs - draw the Pico 2 WH, the OLED module and the
// hub power on an 830 hole breadboard, as breadboard.svg.
//
//   node rig/pico/oled/breadboard.mjs           # hub powered: breadboard.svg
//   node rig/pico/oled/breadboard.mjs mb102     # MB102 power module: breadboard-mb102.svg
//
// wiring.yml (WireViz) says WHICH pin goes to which; this says WHERE each wire
// goes on the board, hole by hole, so the board can be built by copying it.
// Pins are the Pico's physical numbers and the module's printed labels, the
// same as wiring.yml. Plain SVG, no dependency, nothing native (ThreatLocker).
//
// THE BOARD. MB-102, 63 columns, rows a to e above the centre gap and f to j
// below, a + and - rail along each long edge. Columns a-e are joined per
// column, f-j likewise, and each rail is one strip along the board.
// THE PICO straddles the gap at 0.7 inch, pins in row c and row h, USB to the
// left. With USB left, pins 1 to 20 run along the BOTTOM (pin 1 by the USB)
// and pins 40 to 21 along the TOP (pin 40 by the USB), so column n holds pin n
// in row h and pin 41-n in row c.
// THE OLED MODULE's 8 pin header sits in row j, columns 40 to 47, its body
// hanging off the bottom edge: GND VCC SCL SDA K4 K3 K2 K1, as printed.
// POWER, two ways. Default: a spare port of the powered hub through a USB-A
// plug to screw terminal adapter, 5 V into VBUS (pin 40) and ground to the
// rail. `mb102`: the breadboard power module on the right hand end, its top
// jumper on 5 V (the top rails feed VBUS) and its bottom jumper on 3.3 V (the
// bottom rails feed the OLED), so the Pico's own 3V3 out is wired to nothing.
// ⚠️ The module's layout is the common MB102's, INFERRED: the shop page gives
// only 6.5 to 12 V in, 3.3 V or 5 V out, 700 mA.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MB102 = process.argv[2] === 'mb102';

const P = 16;                         // one hole pitch, 0.1 inch, in px
const COLS = 63;
const X0 = 150, Y0 = 150;             // the board's top left corner
const holeX = (c) => X0 + 30 + (c - 1) * P;
// rows top to bottom: rail +, rail -, a..e, gap, f..j, rail -, rail +
const ROW_Y = {};
{
  let y = Y0 + 22;
  ROW_Y['T+'] = y; y += P; ROW_Y['T-'] = y; y += P * 1.6;
  for (const r of 'abcde') { ROW_Y[r] = y; y += P; }
  y += P * 1.4;
  for (const r of 'fghij') { ROW_Y[r] = y; y += P; }
  y += P * 0.6;
  ROW_Y['B-'] = y; y += P; ROW_Y['B+'] = y;
}
const W = 30 * 2 + (COLS - 1) * P, H = ROW_Y['B+'] - Y0 + 22;
const at = (row, col) => [holeX(col), ROW_Y[row]];

const C = { v5: '#e0457b', v3: '#d63b3b', gnd: '#222', sda: '#2f7bd6', scl: '#f08a24', key: '#8a4fd1' };
const out = [];
const svgW = X0 * 2 + W + (MB102 ? 60 : 0), svgH = Y0 + H + 300;
out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" font-family="ui-monospace, Menlo, monospace">`);
out.push(`<rect width="100%" height="100%" fill="#f4f1ea"/>`);

// the board
out.push(`<rect x="${X0}" y="${Y0}" width="${W}" height="${H}" rx="8" fill="#fbfbf8" stroke="#c9c5bb"/>`);
out.push(`<rect x="${X0 + 6}" y="${(ROW_Y.e + ROW_Y.f) / 2 - 4}" width="${W - 12}" height="8" fill="#e6e2d8"/>`);
for (const [r, col] of [['T+', C.v3], ['T-', '#3a6fd6'], ['B-', '#3a6fd6'], ['B+', C.v3]]) {
  out.push(`<line x1="${X0 + 14}" x2="${X0 + W - 14}" y1="${ROW_Y[r] + (r.endsWith('+') ? -9 : 9) * (r[0] === 'T' ? 1 : -1)}" y2="${ROW_Y[r] + (r.endsWith('+') ? -9 : 9) * (r[0] === 'T' ? 1 : -1)}" stroke="${col}" stroke-width="1.5"/>`);
  out.push(`<text x="${X0 + 8}" y="${ROW_Y[r] + 4}" font-size="11" fill="${col}" text-anchor="middle">${r.slice(1)}</text>`);
}
for (const r of Object.keys(ROW_Y)) {
  for (let c = 1; c <= COLS; c++) {
    if (r.length === 2 && c % 6 === 0) continue;          // rails come in groups of five
    out.push(`<rect x="${holeX(c) - 2.5}" y="${ROW_Y[r] - 2.5}" width="5" height="5" fill="#8d8a82"/>`);
  }
  if (r.length === 1) {
    out.push(`<text x="${X0 + 14}" y="${ROW_Y[r] + 4}" font-size="10" fill="#9a968c" text-anchor="middle">${r}</text>`);
    out.push(`<text x="${X0 + W - 12}" y="${ROW_Y[r] + 4}" font-size="10" fill="#9a968c" text-anchor="middle">${r}</text>`);
  }
}
for (const c of [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]) {
  out.push(`<text x="${holeX(c)}" y="${ROW_Y.a - 11}" font-size="9" fill="#9a968c" text-anchor="middle">${c}</text>`);
  out.push(`<text x="${holeX(c)}" y="${ROW_Y.j + 17}" font-size="9" fill="#9a968c" text-anchor="middle">${c}</text>`);
}

// the Pico, columns 1..20, rows c..h
{
  const x1 = holeX(1) - 9, x2 = holeX(20) + 9, y1 = ROW_Y.c - 12, y2 = ROW_Y.h + 12;
  out.push(`<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="4" fill="#1f7a3a" opacity="0.92"/>`);
  out.push(`<rect x="${x1 - 14}" y="${(y1 + y2) / 2 - 11}" width="20" height="22" rx="2" fill="#b9bcc2" stroke="#7b7f86"/>`);
  out.push(`<text x="${x1 - 22}" y="${(y1 + y2) / 2 + 4}" font-size="11" fill="#333" text-anchor="end">USB, to the hub</text>`);
  out.push(`<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + 5}" font-size="14" fill="#fff" text-anchor="middle">Raspberry Pi Pico 2 WH</text>`);
  for (let n = 1; n <= 20; n++) {
    const top = 41 - n;
    out.push(`<circle cx="${holeX(n)}" cy="${ROW_Y.h}" r="3.6" fill="#e8c35a"/>`);
    out.push(`<circle cx="${holeX(n)}" cy="${ROW_Y.c}" r="3.6" fill="#e8c35a"/>`);
    out.push(`<text x="${holeX(n)}" y="${ROW_Y.h - 7}" font-size="7" fill="#d8f0de" text-anchor="middle">${n}</text>`);
    out.push(`<text x="${holeX(n)}" y="${ROW_Y.c + 12}" font-size="7" fill="#d8f0de" text-anchor="middle">${top}</text>`);
  }
}

// the OLED module, header in row j, columns 40..47, body off the BOTTOM edge,
// so its wires stay in the f-j half with the Pico's GPIO pins and none of them
// crosses the centre gap. ⚠️ AT ITS REAL SIZE, about 37 by 27 mm (15 by 11
// holes, INFERRED from the shop photo, not measured): an 8 pin header on one
// edge of a board that size cannot lie on a breadboard without covering the
// holes its own wires need, so it overhangs the edge by about 1.5 cm. The
// screen is on the left and the four keys ^ v # * are a column on the right.
const OLED = ['GND', 'VCC', 'SCL', 'SDA', 'K4', 'K3', 'K2', 'K1'];
{
  const x1 = holeX(39) - 2, x2 = x1 + 15 * P, y1 = ROW_Y.j - 7, y2 = y1 + 11 * P;
  out.push(`<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="5" fill="#25456e" opacity="0.93"/>`);
  const sx = x1 + 10, sy = y1 + 46, sw = 9.5 * P, sh = (y2 - sy) - 10;
  out.push(`<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="#0b0e14"/>`);
  out.push(`<text x="${sx + sw / 2}" y="${sy + sh / 2 + 4}" font-size="10" fill="#5cc8ff" text-anchor="middle">0.96" OLED</text>`);
  ['^', 'v', '#', '*'].forEach((g, i) => {
    const cy = sy + 8 + i * (sh - 16) / 3, cx = x2 - 22;
    out.push(`<circle cx="${cx}" cy="${cy}" r="7" fill="#d9d9d9" stroke="#888"/>`);
    out.push(`<text x="${cx}" y="${cy + 3.5}" font-size="9" fill="#333" text-anchor="middle">${g}</text>`);
  });
  OLED.forEach((name, i) => {
    const x = holeX(40 + i);
    out.push(`<circle cx="${x}" cy="${ROW_Y.j}" r="3.6" fill="#e8c35a"/>`);
    out.push(`<text x="${x}" y="${ROW_Y.j + 13}" font-size="7" fill="#fff" text-anchor="start" transform="rotate(90 ${x} ${ROW_Y.j + 13})">${name}</text>`);
  });
}

// the power, either the hub dongle on the left or the MB102 on the right end
let pwr5 = null, pwrG = null;
if (!MB102) {
  // the hub power adapter, off the board on the left
  const PWR = { x: X0 - 110, y: ROW_Y.a - 120 };
  out.push(`<rect x="${PWR.x}" y="${PWR.y}" width="86" height="54" rx="4" fill="#2b2b2b"/>`);
  out.push(`<rect x="${PWR.x - 34}" y="${PWR.y + 14}" width="36" height="26" rx="2" fill="#b9bcc2" stroke="#7b7f86"/>`);
  out.push(`<text x="${PWR.x + 43}" y="${PWR.y - 8}" font-size="10" fill="#333" text-anchor="middle">USB-A to screw terminals,</text>`);
  out.push(`<text x="${PWR.x + 43}" y="${PWR.y - 20}" font-size="10" fill="#333" text-anchor="middle">plugged into a hub port</text>`);
  out.push(`<text x="${PWR.x + 30}" y="${PWR.y + 32}" font-size="10" fill="#fff" text-anchor="middle">5V</text>`);
  out.push(`<text x="${PWR.x + 64}" y="${PWR.y + 32}" font-size="10" fill="#fff" text-anchor="middle">GND</text>`);
  pwr5 = [PWR.x + 30, PWR.y + 54]; pwrG = [PWR.x + 64, PWR.y + 54];
} else {
  const x1 = holeX(59) - 8, x2 = X0 + W + 70, y1 = Y0 - 14, y2 = Y0 + H + 14;
  out.push(`<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="5" fill="#1d4f8f" opacity="0.93"/>`);
  out.push(`<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" font-size="11" fill="#fff" text-anchor="middle">MB102</text>`);
  out.push(`<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + 8}" font-size="9" fill="#cfe0f5" text-anchor="middle">power module</text>`);
  // barrel jack, switch, USB socket, on the overhanging end
  out.push(`<rect x="${x2 - 30}" y="${(y1 + y2) / 2 - 46}" width="40" height="26" rx="3" fill="#111"/>`);
  out.push(`<text x="${x2 + 16}" y="${(y1 + y2) / 2 - 30}" font-size="10" fill="#333">9 V adapter in</text>`);
  out.push(`<rect x="${x2 - 24}" y="${(y1 + y2) / 2 + 24}" width="18" height="14" rx="2" fill="#ddd" stroke="#888"/>`);
  out.push(`<text x="${x2 + 16}" y="${(y1 + y2) / 2 + 35}" font-size="10" fill="#333">on/off</text>`);
  // the two rail jumpers
  for (const [r, word] of [['T+', '5 V'], ['B+', '3.3 V']]) {
    const y = r === 'T+' ? (ROW_Y['T+'] + ROW_Y['T-']) / 2 : (ROW_Y['B+'] + ROW_Y['B-']) / 2;
    out.push(`<rect x="${holeX(60)}" y="${y - 7}" width="26" height="14" rx="2" fill="#f2c94c"/>`);
    out.push(`<text x="${holeX(60) + 34}" y="${y + 4}" font-size="11" fill="#fff">jumper on ${word}</text>`);
  }
  // its pins in the four rails
  for (const r of ['T+', 'T-', 'B-', 'B+']) for (const c of [61, 62]) out.push(`<circle cx="${holeX(c)}" cy="${ROW_Y[r]}" r="3.4" fill="#e8c35a"/>`);
  out.push(`<text x="${X0 + 14}" y="${ROW_Y['T+'] - 12}" font-size="10" fill="${C.v5}">top + rail is 5 V</text>`);
  out.push(`<text x="${X0 + 14}" y="${ROW_Y['B+'] + 20}" font-size="10" fill="${C.v3}">bottom + rail is 3.3 V</text>`);
}

// wires: [from, to, colour, label]; a point is [x, y] or [row, col]
const pt = (p) => (typeof p[0] === 'string' ? at(p[0], p[1]) : p);
const SIGNALS = [
  [['i', 7], ['h', 42], C.scl, 'GP5 SCL, pin 7'],
  [['j', 6], ['g', 43], C.sda, 'GP4 SDA, pin 6'],
  [['i', 17], ['h', 44], C.key, 'GP13 to K4, pin 17'],
  [['j', 16], ['g', 45], C.key, 'GP12 to K3, pin 16'],
  [['i', 15], ['f', 46], C.key, 'GP11 to K2, pin 15'],
  [['j', 14], ['f', 47], C.key, 'GP10 to K1, pin 14'],
];
const WIRES = MB102 ? [
  [['T+', 1], ['a', 1], C.v5, '5 V into VBUS, pin 40'],
  [['a', 3], ['T-', 3], C.gnd, 'pin 38 GND'],
  [['i', 18], ['B-', 18], C.gnd, 'pin 18 GND to the bottom rail'],
  [['i', 40], ['B-', 37], C.gnd, 'OLED GND'],
  [['i', 41], ['B+', 36], C.v3, 'OLED VCC, 3.3 V'],
  // ⚠️ only if the board's rails are split in the middle: bridge each one
  ...['T+', 'T-', 'B-', 'B+'].map((r) => [[r, 29], [r, 35], r.endsWith('+') ? (r[0] === 'T' ? C.v5 : C.v3) : C.gnd,
    'only if the rail is split']),
  ...SIGNALS,
] : [
  [pwr5, ['a', 1], C.v5, '5 V into VBUS, pin 40'],
  [pwrG, ['T-', 2], C.gnd, 'ground'],
  [['a', 3], ['T-', 3], C.gnd, 'pin 38 GND'],
  [['b', 5], ['T+', 5], C.v3, 'pin 36 3V3 out'],
  [['i', 18], ['B-', 18], C.gnd, 'pin 18 GND to the bottom rail'],
  [['i', 40], ['B-', 37], C.gnd, 'OLED GND'],
  [['i', 41], ['T+', 41], C.v3, 'OLED VCC, 3.3 V only'],
  ...SIGNALS,
];
for (const [a, b, col] of WIRES) {
  const [x1, y1] = pt(a), [x2, y2] = pt(b);
  // a gentle arc so crossing wires stay tellable apart
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.min(60, Math.abs(x2 - x1) / 6);
  out.push(`<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${col}" stroke-width="3.2" stroke-linecap="round" opacity="0.9"/>`);
  for (const [x, y] of [[x1, y1], [x2, y2]]) out.push(`<circle cx="${x}" cy="${y}" r="3" fill="${col}" stroke="#fff" stroke-width="1"/>`);
}

// the key, under the board
{
  let y = Y0 + H + 110;
  out.push(`<text x="${X0}" y="${y}" font-size="13" fill="#222">Every wire, hole to hole (row letter, column number)</text>`);
  y += 8;
  const hole = (p) => (typeof p[0] === 'string' ? `${p[0]}${p[1]}` : 'adapter')
    .replace(/^T-/, 'top - rail ').replace(/^T\+/, 'top + rail ').replace(/^B-/, 'bottom - rail ').replace(/^B\+/, 'bottom + rail ');
  WIRES.forEach(([a, b, col, label], i) => {
    const cx = X0 + (i % 2) * 470, cy = y + 22 + Math.floor(i / 2) * 22;
    out.push(`<rect x="${cx}" y="${cy - 9}" width="22" height="6" rx="3" fill="${col}"/>`);
    const from = hole(a), to = hole(b);
    out.push(`<text x="${cx + 30}" y="${cy - 2}" font-size="11" fill="#333">${from} to ${to}   ${label}</text>`);
  });
}
out.push('</svg>');

const file = fileURLToPath(new URL(MB102 ? './breadboard-mb102.svg' : './breadboard.svg', import.meta.url));
writeFileSync(file, out.join('\n'));
console.log(`wrote ${file}`);

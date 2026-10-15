// node rig/board/panel-wiring.mjs: the 0.96" OLED with four keys on the Pi 4's header, eight
// female to female jumpers, drawn as the board lies in the owner's photo of 2026-10-15 (header along
// the top, pin 1 bottom left, USB ports off to the right), as panel-wiring.svg. Pins from
// plans/plan-pi-oled.md 1.2; module order as printed on the module: GND VCC SCL SDA K4 K3 K2 K1.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const C = { v3: '#d63b3b', v5: '#ff1a1a', gnd: '#222', sda: '#ffffff', scl: '#f08a24', key: '#9b5cf0' };
// module pin, left to right as printed -> Pi physical pin, wire colour
const WIRES = [
  { mod: 'GND', pin: 6, c: C.gnd, what: 'ground, the return for power and signals', long: 'Ground' },
  { mod: 'VCC', pin: 1, c: C.v3, what: 'power in, 3.3 V from the Pi', long: 'power supply Voltage' },
  { mod: 'SCL', pin: 5, c: C.scl, what: 'I2C clock (GPIO3), the Pi sets the pace', long: 'Serial CLock' },
  { mod: 'SDA', pin: 3, c: C.sda, what: 'I2C data (GPIO2), pictures to the screen', long: 'Serial DAta' },
  { mod: 'K4', pin: 37, c: C.key, what: 'button 4 (GPIO26)', long: 'Key 4, a button' },
  { mod: 'K3', pin: 33, c: C.key, what: 'button 3 (GPIO13)', long: 'Key 3, a button' },
  { mod: 'K2', pin: 31, c: C.key, what: 'button 2 (GPIO6)', long: 'Key 2, a button' },
  { mod: 'K1', pin: 29, c: C.key, what: 'button 1 (GPIO5)', long: 'Key 1, a button' },
];

const W = 1200, H = 1150;
const P = 32;                                  // header pitch in px
const HX = 480, TOP = 190, BOT = TOP + P;      // pin 1's column; top row (even pins), bottom row (odd)
// Pin n: column (n+1)>>1 from the left; odd pins on the bottom row, toward the middle of the board.
const pinXY = (n) => [HX + (((n + 1) >> 1) - 1) * P, n % 2 ? BOT : TOP];
const MX = 70, MY = 450, MP = 40;              // module's first pin x, its top edge, pin pitch
const modX = (i) => MX + i * MP;

const o = [];
const t = (x, y, s, { size = 14, fill = '#222', weight = 400, anchor = 'start', rot = 0, halo = '' } = {}) =>
  o.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}"${halo ? ` stroke="${halo}" stroke-width="4" paint-order="stroke"` : ''}${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${s}</text>`);
o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif">`);
o.push(`<rect width="100%" height="100%" fill="#f4f1ea"/>`);
t(40, 48, '0.96" OLED with 4 keys on the Raspberry Pi 4', { size: 24, weight: 700 });
t(40, 76, 'Drawn the way the Pi lies in your photo. Eight female to female jumpers, Pi pin straight to module pin. Unplug the Pi before wiring.', { size: 14, fill: '#555' });

// the Pi: header along its top edge
const bx = HX - 80, bw = 20 * P + 130;
o.push(`<rect x="${bx}" y="${TOP - 40}" width="${bw}" height="320" rx="14" fill="#2e7d4f"/>`);
o.push(`<rect x="${HX - 18}" y="${TOP - 18}" width="${20 * P + 4}" height="${P + 36}" rx="3" fill="#1b1b1b"/>`);
t(bx + bw - 14, TOP + 232, 'USB and Ethernet', { size: 13, fill: '#dfe', anchor: 'end' });
t(bx + bw - 14, TOP + 250, 'ports this side', { size: 13, fill: '#dfe', anchor: 'end' });
t(bx + 16, TOP + 262, 'USB-C power', { size: 13, fill: '#dfe' });
const used = new Map(WIRES.map((w) => [w.pin, w]));
for (let n = 1; n <= 40; n++) {
  const [x, y] = pinXY(n), w = used.get(n), bad = n === 2 || n === 4;
  o.push(`<rect x="${x - 10}" y="${y - 10}" width="20" height="20" rx="3" fill="${w ? w.c : bad ? '#fff' : '#bdb6a3'}" stroke="${bad ? C.v5 : '#000'}" stroke-width="${bad ? 3 : 1}"/>`);
  if (w) t(x, y + 5, n, { size: n > 9 ? 10 : 12, fill: w.c === '#ffffff' ? '#000' : '#fff', weight: 700, anchor: 'middle' });
  if (bad) o.push(`<g stroke="${C.v5}" stroke-width="3"><line x1="${x - 7}" y1="${y - 7}" x2="${x + 7}" y2="${y + 7}"/><line x1="${x + 7}" y1="${y - 7}" x2="${x - 7}" y2="${y + 7}"/></g>`);
  // the signal's name beside its pin, on the side its wire arrives from
  const name = w ? w.mod : bad ? '5V' : '';
  if (name) {
    // white on a dark halo: a wire's own colour on the green board does not read
    const fill = w ? '#fff' : C.v5, halo = w ? '#000' : '#fff';
    if (n % 2) t(x + 13, y + 20, name, { size: 14, fill, weight: 700, rot: 90, halo });
    // a used top-row pin's wire comes down through the spot above it, so its name sits to the right
    else if (w) t(x + 14, y - 13, name, { size: 12, fill, weight: 700, halo });
    else t(x, y - 16, name, { size: 12, fill, weight: 700, anchor: 'middle', halo });
  }
}
t(HX - 26, BOT + 5, 'pin 1', { size: 13, fill: '#fff', weight: 700, anchor: 'end' });
t(HX - 26, TOP + 5, 'pin 2', { size: 13, fill: '#fff', anchor: 'end' });
t(pinXY(2)[0] + P / 2, TOP - 40, '5 V: never', { size: 15, fill: C.v5, weight: 700, anchor: 'middle' });

// the module, pins up, in its printed order
o.push(`<rect x="${MX - 34}" y="${MY}" width="${7 * MP + 68}" height="250" rx="10" fill="#111"/>`);
o.push(`<rect x="${MX - 10}" y="${MY + 60}" width="${5 * MP}" height="120" fill="#05070b" stroke="#444"/>`);
t(MX + 2.5 * MP - 10, MY + 125, 'SSD1306 128x64', { size: 12, fill: '#7fd', anchor: 'middle' });
for (const [i, s] of ['^', 'v', '#', '*'].entries()) {
  o.push(`<rect x="${MX + 5 * MP + 14}" y="${MY + 58 + i * 34}" width="44" height="24" rx="3" fill="#ddd"/>`);
  t(MX + 5 * MP + 72, MY + 76 + i * 34, s, { size: 16, fill: '#fff', weight: 700 });
}
WIRES.forEach((w, i) => {
  o.push(`<rect x="${modX(i) - 3}" y="${MY - 34}" width="6" height="40" fill="#c8a24a"/>`);
  t(modX(i), MY + 24, w.mod, { size: 12, fill: '#fff', weight: 700, anchor: 'middle' });
});
t(MX - 34, MY + 280, 'module pins, left to right as printed on it', { size: 13, fill: '#555' });

// jumpers: up from the module pin to a lane of its own, across, then into the pin
WIRES.forEach((w, i) => {
  const [x, y] = pinXY(w.pin), mx = modX(i), my = MY - 40;
  // GND is on the top row, so it comes over the header's top edge
  const lane = w.pin % 2 ? BOT + 80 + i * 10 : TOP - 90;
  const d = `M${mx} ${my} L${mx} ${lane} L${x} ${lane} L${x} ${w.pin % 2 ? y + 12 : y - 12}`;
  // a white casing under every wire, so purple and black read on the green board
  o.push(`<path d="${d}" fill="none" stroke="${w.c === '#ffffff' ? '#444' : '#fff'}" stroke-width="8" stroke-linejoin="round"/>`);
  o.push(`<path d="${d}" fill="none" stroke="${w.c}" stroke-width="4" stroke-linejoin="round"/>`);
  o.push(`<rect x="${mx - 7}" y="${my - 20}" width="14" height="20" rx="2" fill="#333"/>`);
});

// the table, counted the way the photo is read
const ord = (k) => `${k}${k === 1 ? 'st' : k === 2 ? 'nd' : k === 3 ? 'rd' : 'th'}`;
const rows = [['module', 'stands for', 'Pi pin', 'row', 'where', 'what it does'], ...WIRES.map((w) => {
  const col = (w.pin + 1) >> 1;
  return [w.mod, w.long, String(w.pin), w.pin % 2 ? 'bottom' : 'top', w.pin < 10 ? `${ord(col)} from the left` : `${ord(21 - col)} from the right`, w.what];
})];
const TX = 40, TY = 790;
rows.forEach((r, i) => {
  const y = TY + i * 26, w = WIRES[i - 1];
  if (w) o.push(`<rect x="${TX}" y="${y - 13}" width="14" height="14" fill="${w.c}" stroke="#444"/>`);
  [0, 70, 250, 320, 400, 560].forEach((dx, j) => t(TX + 24 + dx, y, r[j], { size: 15, weight: i ? 400 : 700 }));
});
t(TX, TY + 9 * 26 + 10, 'I2C (Inter-Integrated Circuit) is the two wire bus the screen talks on. GPIO (General Purpose Input/Output) is a Pi pin a program reads or sets.', { size: 13, fill: '#555' });
t(TX, TY + 9 * 26 + 30, 'Nothing on the top row but GND. Pin 35, 3rd from the right on the bottom row, stays empty.', { size: 13, fill: '#555' });
t(TX, TY + 9 * 26 + 50, 'Which K is which of the ^ v # * buttons is not printed on the module: pressing each one and reading the pins tells. A press should read low; not measured yet.', { size: 13, fill: '#555' });
t(TX, TY + 9 * 26 + 70, 'The two top-left pins are 5 V and would put 5 V on the screen and the Pi\'s I2C pins.', { size: 13, fill: C.v5 });
o.push('</svg>');

const out = fileURLToPath(new URL('./panel-wiring.svg', import.meta.url));
writeFileSync(out, o.join('\n'));
console.log(out);

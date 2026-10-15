// rig/board/panel.mjs: the 0.96" OLED and its four keys on the header (plans/plan-pi-oled.md), for
// /devices/screen/. The layout is demo/shell/panel-screen.mjs, shared with the page's simulated screen and
// reloaded here whenever that file changes (rig/board/panel-sync.mjs copies it over on every save).
// Nothing runs unless the screen answers at 0x3c, so a board without one is unchanged.
// why: lessons/rig-board-panel.md#header

import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, existsSync, statSync } from 'node:fs';

const BUS = '1', ADDR = '0x3c', T = '/usr/sbin/i2ctransfer';
// GPIO line -> key, MEASURED 2026-10-15 by press: K1 ^, K2 v, K3 #, K4 *; a press reads low.
export const KEYS = { 5: { k: 1, sym: '^' }, 6: { k: 2, sym: 'v' }, 13: { k: 3, sym: '#' }, 26: { k: 4, sym: '*' } };
const WASM = new URL('../../demo/resources/pico/oled-ui.wasm', import.meta.url);
const LAYOUT = new URL('../../demo/shell/panel-screen.mjs', import.meta.url);
// rig/pico/firmware/ssd1306.c's init, so the panel is lit as the Pico lights it.
const INIT = [0xAE, 0x20, 0x00, 0x40, 0xA1, 0xA8, 63, 0xC8, 0xD3, 0x00, 0xDA, 0x12, 0xD5, 0x80,
  0xD9, 0xF1, 0xDB, 0x30, 0x81, 0xFF, 0xA4, 0xA6, 0x8D, 0x14, 0xAF];

const hex = (b) => `0x${b.toString(16).padStart(2, '0')}`;
// Async: the board's process also streams audio, and a frame is nine writes.
const run = promisify(execFile);
const write = (bytes) => run(T, ['-y', BUS, `w${bytes.length}@${ADDR}`, ...bytes.map(hex)]);

/** The panel, or null when no screen answers. `onKey({ k, sym, gpio, down })`. */
export async function openPanel({ log = () => {}, onKey = () => {} } = {}) {
  if (!existsSync(T) || !existsSync(WASM) || !existsSync(LAYOUT)) { log('panel: no i2ctransfer, oled-ui.wasm or panel-screen.mjs, no screen'); return null; }
  try { await write([0x00, 0xE3]); } catch { log(`panel: nothing answers at ${ADDR} on i2c-${BUS}, no screen`); return null; }
  const wasm = readFileSync(WASM);
  // The layout module, imported again under a new query whenever the file's mtime moves.
  let ui = null, loadedAt = 0;
  async function layout() {
    const m = statSync(LAYOUT).mtimeMs;
    if (ui && m === loadedAt) return false;
    const mod = await import(`${LAYOUT.href}?v=${m}`);
    ui = await mod.loadPanelUi(wasm);
    loadedAt = m;
    return true;
  }
  await layout();
  for (let i = 0; i < INIT.length; i += 16) await write([0x00, ...INIT.slice(i, i + 16)]);

  const state = { text: 'waiting for a tab', held: new Set(), shown: 0, layoutAt: 0 };
  // One draw at a time; a change during a draw is drawn once it ends.
  let busy = false, again = false;
  async function draw() {
    if (busy) { again = true; return; }
    busy = true;
    try {
      const fb = ui.frame({ text: state.text, held: [...state.held] });
      await write([0x00, 0x21, 0, 127, 0x22, 0, 7]);
      for (let p = 0; p < 8; p++) await write([0x40, ...fb.subarray(p * 128, p * 128 + 128)]);
      state.shown++;
    } catch (e) {
      log(`panel: draw failed: ${e.message}`);
    } finally {
      busy = false;
      if (again) { again = false; draw(); }
    }
  }
  // A saved layout redraws within a second; a broken one is logged and the old one kept.
  setInterval(() => {
    layout().then((changed) => { if (changed) { state.layoutAt = Date.now(); log('panel: layout reloaded'); draw(); } })
      .catch((e) => log(`panel: the new layout did not load, keeping the old one: ${e.message}`));
  }, 1000).unref?.();

  // The keys: gpiomon prints `<line> <edge>` per edge, debounced 10 ms; the module pulls each line up.
  let mon = null;
  function watch() {
    // stdbuf -oL: into a pipe gpiomon buffers its lines, and a press would wait for the buffer to fill.
    mon = spawn('stdbuf', ['-oL', 'gpiomon', '-c', 'gpiochip0', '-e', 'both', '-p', '10ms', '-F', '%o %E', ...Object.keys(KEYS)]);
    let buf = '';
    mon.stderr.on('data', (d) => log(`panel: gpiomon: ${String(d).trim()}`));
    mon.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const [line, edge] = buf.slice(0, i).trim().split(/\s+/);
        buf = buf.slice(i + 1);
        const key = KEYS[line];
        if (!key) continue;
        const down = edge === 'falling';
        if (down) state.held.add(key.k); else state.held.delete(key.k);
        onKey({ k: key.k, sym: key.sym, gpio: Number(line), down });
        draw();
      }
    });
    mon.on('exit', (code) => { log(`panel: gpiomon exited ${code}, watching again in 2 s`); mon = null; setTimeout(watch, 2000).unref?.(); });
  }
  watch();
  draw();
  log(`panel: the screen answers at ${ADDR}, keys on GPIO ${Object.keys(KEYS).join(', ')}`);
  return {
    text(s) { state.text = String(s ?? '').slice(0, 120) || ' '; draw(); return state.shown; },
    status: () => ({ text: state.text, held: [...state.held], shown: state.shown, layoutAt: state.layoutAt }),
    close() { mon?.kill(); write([0x00, 0xAE]).catch(() => {}); },
  };
}

// demo/capture/common.mjs: what the four tabs of `/capture/` would otherwise
// each type out: a row of buttons that is not `.pos-controls`, a generated
// picture with an optional camera under it, and the MediaRecorder duration
// dance. Four pages carried four copies of the last two (`take`, `record`,
// `keep`, `show`, plus `capture` itself), so the merge is the moment to keep one.
//
// 🔴 THE BUTTON ROW IS HERE AND NOT IN `demo/shell/` ONLY BECAUSE THIS AGENT
// MAY NOT TOUCH `demo/shell/`. Every tabbed page needs it (`tab-page.mjs` rule
// 4: a tab's controls never go in `.pos-controls`, because the harness presses
// that row by position across the whole document), and `/sync/`, `/time/` and
// `/wire/` will each want the same thing. It belongs in the kit beside
// `createTabPage`; reported, not done.

import { el } from '/shell/shell.mjs';
import { burn, drawCamera } from '/shell/pattern.mjs';

/**
 * Requests this page made whose URL matches `test`, started before `beforeMs`
 * when given, from resource timing: what the browser fetched, not what a tab
 * remembered to count. Read by every tab's "building this tab opened nothing"
 * check and by ROUND TRIP's relay ask.
 *
 * ⚠️ A REQUEST STILL IN FLIGHT HAS NO ENTRY YET. MEASURED 2026-10-04 by
 * sabotage: an ask made while ROUND TRIP was being built, one frame before the
 * check pressed Send and receive, read `0 before it` and stayed green, while
 * the same ask made when the module loaded went red on both checks (2 of 73).
 * So this sees an ask on LOAD, which is the defect it exists for, and can miss
 * one made a few milliseconds before the press.
 */
export function requests(test, beforeMs = null) {
  return performance.getEntriesByType('resource')
    .filter((e) => test(e.name) && (beforeMs == null || e.startTime < beforeMs)).length;
}

export const W = 1280;
export const H = 720;
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * A row of plain buttons for one tab, with the shell's busy treatment: a
 * handler that returns a promise disables its button and sets `data-busy`
 * (the sweep in shell.css, `button[data-busy="1"]`) until it settles.
 *
 * ⚠️ NOT `.pos-controls`, ON PURPOSE. See the header. The class is `cap-row`
 * and the page's stylesheet lays it out the way the shell lays out its own row.
 *
 * @param {Array<{id:string,label:string,primary?:boolean,end?:boolean}>} spec
 * @param {(msg:string, kind?:string)=>void} log  the tab's log
 */
export function createButtonRow(spec, log) {
  const row = el('div', 'cap-row');
  const made = new Map();
  const handlers = new Map();
  for (const c of spec) {
    const b = el('button', c.primary ? 'pos-pri' : '', c.label, { type: 'button' });
    b.dataset.id = c.id;
    if (c.end) b.dataset.end = '1';
    made.set(c.id, b);
    b.addEventListener('click', () => { press(c.id); });
    row.append(b);
  }
  /** Run a button's handler as a press would, and return what it returned. */
  async function press(id) {
    const b = made.get(id);
    const fn = handlers.get(id);
    if (!b || !fn || b.disabled) return undefined;
    let out;
    try { out = fn(b); } catch (e) { log(String(e?.message || e), 'bad'); return undefined; }
    if (!out || typeof out.then !== 'function') return out;
    b.dataset.busy = '1';
    b.disabled = true;
    b.setAttribute('aria-busy', 'true');
    try { return await out; } catch (e) { log(String(e?.message || e), 'bad'); return undefined; } finally {
      delete b.dataset.busy;
      b.disabled = false;
      b.removeAttribute('aria-busy');
    }
  }
  return {
    el: row,
    on: (id, fn) => { handlers.set(id, fn); },
    button: (id) => made.get(id),
    press,
  };
}

/**
 * The generated test picture on a 1280x720 canvas, with the camera drawn UNDER
 * it on request so the burned clock survives either way.
 *
 * 🔴 IT DRAWS ONLY WHILE SOMEBODY COULD BE LOOKING OR SOMETHING IS READING IT.
 * Four tabs each running a 25 fps burn of a 1280 canvas behind closed panels is
 * four pictures nobody sees. `alive()` says when a hidden tab still needs its
 * frames (a recording, a WHIP leg): a captured stream off a canvas that is not
 * redrawn simply stops, which would freeze a far end for a reason that is not
 * the network's.
 *
 * @param {object} o
 * @param {() => object} o.opts   burn options per frame (hue, position, ...)
 * @param {() => boolean} [o.alive]  true when frames are needed while hidden
 * @param {object} [o.media]  getUserMedia video constraints
 */
export function createSource({ opts, alive = () => false, media = { width: 640, height: 360, frameRate: 25 } }) {
  const canvas = el('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  const cam = el('video', '', null, { playsinline: '', muted: '' });
  cam.muted = true;
  let stream = null, frame = 0;

  const draw = () => {
    const on = stream && cam.readyState >= 2 && drawCamera(g, cam, W, H);
    burn(g, W, H, frame++, { field: !on, ...opts() });
  };
  setInterval(() => {
    const seen = canvas.isConnected && !canvas.closest('[hidden]');
    if (seen || alive()) draw();
  }, 40);
  draw();

  /** Ask for the camera. Never on load: only a press calls this. */
  async function camera(log) {
    if (stream) { log('camera already on'); return true; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: media, audio: false });
      cam.srcObject = stream;
      await cam.play().catch(() => {});
      log(`camera on: ${stream.getVideoTracks()[0].label || 'default'}`, 'hi');
      return true;
    } catch (e) {
      // the capability, not an error string; the generated picture stays the source
      stream = null;
      log(`camera: ${e.name}, staying on the generated picture`, 'bad');
      return false;
    }
  }
  return { canvas, g, camera, draw, cameraOn: () => !!stream };
}

/**
 * A MediaRecorder file reports duration Infinity, which leaves a transport bar
 * with no range to scrub. Seek far past the end, let the browser resolve the
 * real duration, then come back. Milliseconds, or null.
 */
export async function resolveDuration(video) {
  await new Promise((res) => {
    if (video.readyState >= 1) { res(); return; }
    video.addEventListener('loadedmetadata', res, { once: true });
    setTimeout(res, 4000);
  });
  if (!Number.isFinite(video.duration)) {
    video.currentTime = 1e6;
    await new Promise((res) => {
      const on = () => { if (Number.isFinite(video.duration)) { video.removeEventListener('timeupdate', on); res(); } };
      video.addEventListener('timeupdate', on);
      setTimeout(res, 3000);
    });
    video.currentTime = 0;
  }
  return Number.isFinite(video.duration) ? video.duration * 1000 : null;
}

/** A slot in a tab's stack for a block built later (a bar after a recording).
 *  Hidden while empty, so it takes no gap and paints no edge. */
export function slot() {
  const s = el('div', 'cap-slot');
  s.hidden = true;
  return s;
}

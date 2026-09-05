// Which build is this? Replaced by workers/view/build.mjs in the DEPLOYED
// copy only, so a page always says what it is. Asked for after a run whose
// result could not be attributed: without a stamp there is no way to tell a
// fix that did not work from a fix that was never loaded.
export const BUILD = 'dev';
// demo/shell/shell.mjs — page frame + the __demo contract.
//
// mount() builds the whole chrome and returns the only API a demo needs.
// Everything it shows a human it has already published for a CDP script on
// window.__demo — that is the point: one page, both audiences.
//
//   const d = mount({ n:'01', name:'transport', what:'…', readout:{drift:'ms'} });
//   d.set('drift', 0.4);  d.log('seeked');  d.ready();

const LOG_CAP = 400;

export function mount({
  n = '--',
  name = 'demo',
  what = '',
  readout = {},          // key -> unit string ('ms', 's', '' …)
  controls = [],         // [{id, label, primary?}]
  index = '/',
} = {}) {
  document.title = `POSITRON · ${n} ${name}`;
  favicon();

  const head = el('div', 'd-head');
  if (index) head.append(el('a', 'd-back', '← demos', { href: index }));
  const title = el('div', 'd-title');
  title.append(el('span', 'd-n', n), el('h1', 'd-name', name));
  head.append(title);
  if (what) head.append(el('p', 'd-what', what));

  // readout — every key gets a cell, all pending until set()
  const cells = new Map();
  const rb = el('div', 'd-readout');
  for (const [k, unit] of Object.entries(readout)) {
    const cell = el('div', 'd-cell');
    const v = el('span', 'd-v', '—');
    v.dataset.state = 'pending';
    cell.append(el('span', 'd-k', k), v);
    if (unit) v.append(el('span', 'd-u', unit));
    cells.set(k, v);
    rb.append(cell);
  }

  const cbar = el('div', 'd-controls');
  const handlers = new Map();
  for (const c of controls) {
    const b = el('button', c.primary ? 'd-pri' : '', c.label);
    b.type = 'button';
    b.dataset.id = c.id;
    b.addEventListener('click', () => handlers.get(c.id)?.(b));
    cbar.append(b);
  }

  const body = el('div', 'd-body');
  const logEl = el('pre', 'd-log');

  document.body.append(head, rb, cbar, body, logEl);

  // ── the machine contract ────────────────────────────────────────────────
  const api = {
    n, name,
    ready: false,
    failed: null,
    readout: Object.fromEntries(Object.keys(readout).map((k) => [k, null])),
    logs: [],
    asserts: [],
    transport: null,           // filled by transport-bar when one is attached
  };
  window.__demo = api;

  function set(k, value, state) {
    if (!cells.has(k)) throw new Error(`readout '${k}' was not declared in mount()`);
    api.readout[k] = value;
    const v = cells.get(k);
    const unit = v.querySelector('.d-u');
    v.textContent = value === null || value === undefined ? '—'
      : typeof value === 'number' ? fmtNum(value) : String(value);
    if (unit) v.append(unit);
    v.dataset.state = state || (value === null ? 'pending' : '');
    return value;
  }

  function log(msg, kind) {
    const line = { t: performance.now(), msg: String(msg), kind: kind || 'info' };
    api.logs.push(line);
    if (api.logs.length > LOG_CAP) api.logs.shift();
    const tag = kind === 'bad' ? 'i' : kind === 'hi' ? 'b' : 'span';
    const row = document.createElement(tag);
    row.textContent = `${(line.t / 1000).toFixed(2).padStart(7)}  ${line.msg}\n`;
    logEl.append(row);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function assert(label, pass, detail) {
    api.asserts.push({ label, pass: !!pass, detail: detail ?? null });
    log(`${pass ? 'ok  ' : 'FAIL'} ${label}${detail !== undefined ? ` — ${detail}` : ''}`, pass ? 'info' : 'bad');
    return !!pass;
  }

  return {
    el: body,
    head,
    set, log, assert,
    on: (id, fn) => handlers.set(id, fn),
    button: (id) => cbar.querySelector(`[data-id="${id}"]`),
    ready: () => { api.ready = true; log('ready', 'hi'); },
    fail: (e) => { api.failed = String(e?.stack || e); log(String(e?.message || e), 'bad'); },
    api,
  };
}

/**
 * Inline favicon — otherwise every demo logs a /favicon.ico 404.
 *
 * e+ : the positron. Same geometry as workers/view/build.mjs plots into
 * favicon.ico — a ring with a lower-right aperture, a crossbar to make it an
 * 'e', and the superscript plus that is the charge and the name.
 */
function favicon() {
  if (document.querySelector('link[rel="icon"]')) return;
  const BG = '%230b0e14', HI = '%23ffd400';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    `<rect width="32" height="32" fill="${BG}"/>` +
    `<circle cx="12.2" cy="19.6" r="7.45" fill="none" stroke="${HI}" stroke-width="4.3"/>` +
    `<path d="M12.2 19.6L23.3 24.1L32 32L12.6 32Z" fill="${BG}"/>` +
    `<rect x="3.6" y="17.7" width="17.2" height="3.2" fill="${HI}"/>` +
    `<rect x="21" y="7" width="9" height="3" fill="${HI}"/>` +
    `<rect x="24" y="4" width="3" height="9" fill="${HI}"/></svg>`;
  document.head.append(el('link', '', null, { rel: 'icon', href: 'data:image/svg+xml,' + svg }));
}

// ── helpers ───────────────────────────────────────────────────────────────
export function el(tag, cls, text, attrs) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = text;
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  return e;
}

export function fmtNum(x) {
  if (!Number.isFinite(x)) return String(x);
  // a count is a count: 32, not 32.0
  if (Number.isInteger(x)) return Math.abs(x) >= 10000 ? x.toLocaleString('en-US') : String(x);
  const a = Math.abs(x);
  if (a >= 1000) return Math.round(x).toLocaleString('en-US');
  if (a >= 100) return x.toFixed(0);
  if (a >= 10) return x.toFixed(1);
  if (a >= 1) return x.toFixed(2);
  return x.toFixed(3);
}

/**
 * ARM A VIDEO INSIDE THE GESTURE.
 *
 * iOS grants autoplay only while a user activation is live. Every live demo
 * here does work first — wait for the publisher, wait for the manifest or the
 * whip leg, negotiate WHEP — and by the time it calls play() the activation
 * is long gone. On a real iPhone that produced:
 *
 *   11.65  WHEP negotiated in 1952 ms
 *   11.65  play refused: NotAllowedError
 *
 * with the connection healthy behind it (rtt 16 ms, 31 fps) and a black box
 * in front. Calling play() synchronously in the handler, before any await,
 * spends the activation while it still exists; the element then keeps playing
 * when a source arrives later.
 */
export function armVideo(v) {
  v.muted = true;                 // property, not just the attribute
  v.playsInline = true;
  v.autoplay = true;
  // rejects on an element with no source yet, which is fine and expected —
  // the point is to consume the activation, not to start anything
  try { const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch { /* no source */ }
}

/**
 * Play, or ask. A refused play() must never leave a black rectangle with no
 * explanation — that is indistinguishable from a broken stream.
 */
/**
 * Play, and offer a tap ONLY if the browser refused for policy reasons.
 *
 * It used to prompt on any rejection, which produced a second full-width
 * yellow button competing with the page's own primary control — and worse, a
 * button that could not work: the measured iOS failure rejected play() for
 * having no data, and no amount of tapping conjures a fragment. Only
 * NotAllowedError is a permission problem. Everything else is the player's
 * job and its watchdogs are already on it.
 */
export async function playOrPrompt(v, d) {
  try { await v.play(); return true; } catch (e) {
    if (e.name !== "NotAllowedError") {
      d?.log(`play failed (${e.name}) — not a permission problem, leaving it to the player`, "bad");
      return false;
    }
    d?.log("autoplay refused — tap to start", "bad");
    const tap = el("button", "d-tap", "tap to play");
    tap.type = "button";
    const go = async () => {
      try { await v.play(); tap.remove(); d?.log("playing"); }
      catch (err) { d?.log(`still refused: ${err.name}`, "bad"); }
    };
    tap.addEventListener("click", go);
    v.addEventListener("click", go);
    v.parentNode?.insertBefore(tap, v.nextSibling);
    return false;
  }
}

/** Surface a thrown error instead of a silently dead page. */
export function guard(d) {
  addEventListener('error', (e) => d.fail(e.error || e.message));
  addEventListener('unhandledrejection', (e) => d.fail(e.reason));
}

/**
 * Batched, fire-and-forget device reporting.
 *
 * A phone cannot be attached to a debugger, so the page posts instead. The sink
 * is the publisher Durable Object, whose lifetime is already "somebody is
 * watching": POST /log, read back with GET /logs?format=text.
 *
 * Lives here because two demos have now needed it and the second one called it
 * before noticing it was local to the first. Diagnostics must never be able to
 * make the page worse than the problem being diagnosed, hence the swallowed
 * failure, the 2 s batch, and the repeat collapsing — one phone sent the same
 * fragLoadError ~30x in a run and pushed everything useful out of the ring.
 */
export function createShipper(url = 'https://pub.positron.studio/log') {
  const pending = [];
  let timer = null, lastKey = '', repeat = 0;
  return function ship(line) {
    const key = String(line).slice(0, 60);
    if (key === lastKey) { repeat++; return; }
    if (repeat) { pending.push(`  (previous line x${repeat + 1})`); repeat = 0; }
    lastKey = key;
    pending.push(`${(performance.now() / 1000).toFixed(2)} ${line}`);
    if (timer) return;
    timer = setTimeout(async () => {
      timer = null;
      const batch = pending.splice(0, pending.length).join('\n');
      if (!batch) return;
      try {
        await fetch(url, {
          method: 'POST', body: batch, keepalive: true,
          headers: { 'content-type': 'text/plain' },
        });
      } catch { /* diagnostics are never load-bearing */ }
    }, 2000);
  };
}

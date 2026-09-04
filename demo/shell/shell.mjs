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
  index = '/demo/',
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

/** Surface a thrown error instead of a silently dead page. */
export function guard(d) {
  addEventListener('error', (e) => d.fail(e.error || e.message));
  addEventListener('unhandledrejection', (e) => d.fail(e.reason));
}

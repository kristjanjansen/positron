// demo/shell/transport-bar.mjs — the ONE transport control.
//
// Factory is the primitive; <positron-transport> is a thin wrapper over it that
// exists only for disconnectedCallback. No shadow DOM: shell.css cascades in,
// and document.querySelector keeps working for CDP.
//
// Rules it enforces so no page has to remember them:
//   · playhead from observePosition() — never a page-local rAF loop
//   · scrub holds deck.range and re-derives when deck.rangeGen() moves
//   · rates rendered FROM caps.rates, intersected across kinds; no lattice
//     declared -> a static 1x label, never a slider
//   · seek always via deck.seek() (two-phase: reduce + assertState)
//   · any {degraded, reason} lands in the badge, never swallowed

import { observePosition } from '/timeline/transport.mjs';
import { el } from './shell.mjs';

export function createTransportBar(host, deck, { absolute = false } = {}) {
  const bar = el('div', 'tbar');

  const toggle = el('button', 'tbar-toggle', '', { type: 'button', 'aria-label': 'play/pause' });
  const scrub = el('div', 'tbar-scrub', '', { role: 'slider', tabindex: '0', 'aria-label': 'position' });
  const fill = el('div', 'tbar-fill');
  const headDot = el('div', 'tbar-head');
  scrub.append(fill, headDot);
  const time = el('output', 'tbar-time', '0:00.000');
  const rates = el('div', 'tbar-rates');
  const badge = el('span', 'tbar-badge');
  bar.append(toggle, scrub, time, rates, badge);
  host.append(bar);

  // ── rates: intersect every declared caps.rates lattice ──────────────────
  const lattice = latticeFor(deck);
  if (lattice && lattice.length) {
    for (const r of lattice) {
      const b = el('button', '', `${r}x`, { type: 'button', 'aria-pressed': 'false' });
      b.addEventListener('click', () => applyRate(r));
      b.dataset.rate = String(r);
      rates.append(b);
    }
  } else {
    rates.append(el('span', 'tbar-rate1', '1x'));   // honest: no lattice, no choice
  }

  const seekable = Number.isFinite(deck.durationMs) && deck.durationMs > 0;
  bar.dataset.seekable = seekable ? '1' : '0';

  // ── state the bar owns; everything else is read from the deck ───────────
  let gen = deck.rangeGen?.() ?? 0;
  let range = deck.range;
  let dragging = false;

  function applyRate(r) {
    const res = deck.setRate(r);
    if (res && res.degraded) note(res.reason);
    else clearNote();
    syncRates();
  }

  function syncRates() {
    const cur = typeof deck.rate === 'function' ? deck.rate() : deck.rate;
    for (const b of rates.querySelectorAll('button')) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.rate) === cur));
    }
  }

  function note(msg) { badge.textContent = msg ? String(msg).slice(0, 60) : ''; }
  function clearNote() { badge.textContent = ''; }

  function posToFrac(pos) {
    const [a, b] = range;
    return b > a ? Math.min(1, Math.max(0, (pos - a) / (b - a))) : 0;
  }
  function fracToPos(f) {
    const [a, b] = range;
    return a + f * (b - a);
  }

  function paint({ pos }) {
    if (deck.rangeGen && deck.rangeGen() !== gen) { gen = deck.rangeGen(); range = deck.range; }
    if (!dragging && seekable) {
      const f = posToFrac(pos);
      fill.style.width = `${f * 100}%`;
      headDot.style.left = `${f * 100}%`;
    }
    time.textContent = seekable
      ? `${clock(pos, absolute)} / ${clock(range[1] - range[0], false)}`
      : clock(pos, absolute);
    const playing = deck.playing?.() ?? false;
    toggle.dataset.state = playing ? 'playing' : 'paused';
  }

  // ── interaction ─────────────────────────────────────────────────────────
  toggle.addEventListener('click', () => (deck.playing?.() ? deck.pause() : deck.play()));

  function seekFromEvent(e) {
    const r = scrub.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    fill.style.width = `${f * 100}%`;
    headDot.style.left = `${f * 100}%`;
    return fracToPos(f);
  }
  scrub.addEventListener('pointerdown', (e) => {
    if (!seekable) return;
    dragging = true; scrub.setPointerCapture(e.pointerId); seekFromEvent(e);
  });
  scrub.addEventListener('pointermove', (e) => { if (dragging) seekFromEvent(e); });
  scrub.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    doSeek(seekFromEvent(e));
  });

  function doSeek(pos) {
    const res = deck.seek(pos);
    if (res && res.degraded) note(res.reason);
  }

  // ONE keyboard table for every demo in the project
  function onKey(e) {
    // ignore only genuine text entry; a window-dispatched key has target=window
    const tg = e.target;
    if (tg instanceof HTMLElement &&
        (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
    const [a, b] = range;
    const span = b - a;
    const cur = deck.position();
    const step = e.shiftKey ? span * 0.1 : span * 0.02;
    if (e.key === ' ') { e.preventDefault(); deck.playing?.() ? deck.pause() : deck.play(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); doSeek(Math.min(b, cur + step)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); doSeek(Math.max(a, cur - step)); }
    else if (/^[0-9]$/.test(e.key)) { e.preventDefault(); doSeek(fracToPos(Number(e.key) / 10)); }
    else return;
  }
  addEventListener('keydown', onKey);

  // ── published for CDP; the plan's whole point ───────────────────────────
  const api = {
    get position() { return deck.position(); },
    get playing() { return deck.playing?.() ?? false; },
    get rate() { return typeof deck.rate === 'function' ? deck.rate() : deck.rate; },
    get range() { return deck.range; },
    get rangeGen() { return deck.rangeGen?.() ?? 0; },
    get lattice() { return lattice; },
    get degraded() { return badge.textContent || null; },
    get seekable() { return seekable; },
  };
  if (window.__demo) window.__demo.transport = api;

  const stop = observePosition(deck.transport, paint, { hz: 60 });
  syncRates();
  paint({ pos: deck.position() });

  return {
    el: bar,
    api,
    note,
    destroy() {
      stop();
      removeEventListener('keydown', onKey);
      bar.remove();
      if (window.__demo && window.__demo.transport === api) window.__demo.transport = null;
    },
  };
}

/** Intersection of every declared caps.rates lattice. null = none declared. */
function latticeFor(deck) {
  const kinds = deck.adapters instanceof Map ? [...deck.adapters.keys()] : Object.keys(deck.adapters || {});
  let acc = null;
  for (const k of kinds) {
    const c = deck.caps?.(k);
    const r = c && Array.isArray(c.rates) ? c.rates : null;
    if (!r) continue;
    acc = acc === null ? [...r] : acc.filter((x) => r.includes(x));
  }
  return acc;
}

export function clock(ms, absolute) {
  if (absolute) return new Date(ms).toISOString().slice(11, 23);
  const neg = ms < 0; const t = Math.abs(ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const f = Math.floor(t % 1000);
  return `${neg ? '-' : ''}${m}:${String(s).padStart(2, '0')}.${String(f).padStart(3, '0')}`;
}

// ── the element: lifecycle only ───────────────────────────────────────────
class PositronTransport extends HTMLElement {
  #bar = null;
  set deck(d) {
    this.#bar?.destroy();
    this.#bar = d ? createTransportBar(this, d, {
      absolute: this.getAttribute('labels') === 'absolute',
    }) : null;
  }
  get bar() { return this.#bar; }
  disconnectedCallback() { this.#bar?.destroy(); this.#bar = null; }
}
if (!customElements.get('positron-transport')) {
  customElements.define('positron-transport', PositronTransport);
}

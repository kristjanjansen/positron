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
import { createChoice } from './choice.mjs';

/**
 * `scrub: false` — ONE POSITION SURFACE PER PAGE.
 *
 * A page that also mounts a strip has two horizontal time axes stacked on each
 * other, at different scales, with different left origins, and no way for a
 * reader to know they are the same axis. The strip is strictly the better of
 * the two: it carries the content as well as the position, and it has always
 * seeked on press AND on drag, which this bar did not. So where there is a
 * strip, the bar keeps what only it has — play/pause, the clock, the rates, the
 * degraded badge — and gives up the slider.
 */
export function createTransportBar(host, deck, {
  absolute = false, scrub: wantScrub = true, extras = [], fmt = null, live = false,
  // A LIVE DECK HAS NO END. The bar arms a one-shot at range[1] and, when it
  // fires, pauses the deck and parks the playhead there — right for a
  // recording, wrong for a window whose right-hand end is the present moment,
  // where that instant arrives a few seconds after play. Default unchanged.
  endStop = true,
  // WHO OWNS POSITION. On a deck driven by a media element the deck is a
  // FOLLOWER: a control that writes to the follower is undone by the master's
  // next tick, silently and within a few hundred milliseconds. Such a page
  // passes { play, pause, seek } that drive the element instead, and the deck
  // follows as it always does. Defaults to the deck's own methods, so every
  // existing caller behaves exactly as before.
  command = null,
} = {}) {
  const cmd = {
    play: () => (command?.play ? command.play() : deck.play()),
    pause: () => (command?.pause ? command.pause() : deck.pause()),
    seek: (pos) => (command?.seek ? command.seek(pos) : deck.seek(pos)),
  };
  const bar = el('div', 'tbar');

  const toggle = el('button', 'tbar-toggle', '', { type: 'button', 'aria-label': 'play/pause' });
  const scrub = el('div', 'tbar-scrub', '', { role: 'slider', tabindex: '0', 'aria-label': 'position' });
  const fill = el('div', 'tbar-fill');
  const headDot = el('div', 'tbar-head');
  scrub.append(fill, headDot);
  // `extras` — page buttons that belong to the TRANSPORT rather than beside it.
  // Recording is the case that earned this: on `take` it is a transport verb,
  // not a side control, and putting it in `.pos-controls` would have said it was
  // something you do to the page rather than to the playhead. They sit next to
  // the toggle and are returned by id so a page can relabel or disable one.
  const extraEls = new Map();
  for (const x of extras) {
    // `word: true` says the label is a WORD, not a glyph — it gets width from
    // its text instead of the 38px square, and the uppercase treatment the
    // rest of the furniture uses. A square sized for one glyph either clips a
    // word or is padded around it, and both read as a mistake.
    const b = el('button', `tbar-x${x.primary ? ' pos-pri' : ''}${x.word ? ' tbar-word' : ''}`,
      x.label, { type: 'button' });
    // The label is a GLYPH, so it is not a name. `aria` is what a screen reader
    // reads and what a test looks for; without it the control is "●".
    b.setAttribute('aria-label', x.aria ?? x.label);
    if (x.title) b.title = x.title;
    b.addEventListener('click', () => x.onClick?.(b));
    extraEls.set(x.id, b);
  }

  const time = el('output', 'tbar-time', '0:00.000');
  const rates = el('div', 'tbar-rates');
  const badge = el('span', 'tbar-badge');
  /**
   * 🔴 A LIVE SOURCE HAS NO CLOCK WORTH PRINTING. On an Icecast mount the left
   * half of `19:33:46.098 / 3:00.000` is the wall clock, which the machine
   * already shows, and the right half is a duration a live stream does not
   * have. REPORTED as *"transport timers are pointless here. what about LIVE
   * label"*, and they were: two numbers, neither of which anybody can act on.
   *
   * ⚠️ IT SAYS `SLOWED` WHEN IT IS SLOWED. A chip reading LIVE while the
   * listener is half a minute behind the station is the confident-wrong kind of
   * readout this repo minds most, and the bar already knows the armed rate, so
   * it costs nothing to tell the truth. How far behind is a number, and a number
   * belongs in a readout cell — the page's BEHIND — not in a chip.
   */
  const liveChip = live ? el('span', 'tbar-live', 'LIVE') : null;
  bar.append(toggle, ...extraEls.values(), scrub, ...(live ? [liveChip] : [time]), rates, badge);
  host.append(bar);

  // ── rates: intersect every declared caps.rates lattice ──────────────────
  // Rebuilt whenever the adapter registry moves. A nest registers its adapter
  // on the parent AFTER this bar is constructed, and a page that swaps one
  // arrangement for another changes the answer again — so a lattice computed
  // once describes a deck that has not been assembled yet.
  let lattice = null, agen = -1;
  /**
   * 🔴 THE RATES ARE A RADIO GROUP, FROM `choice.mjs`, LIKE EVERY OTHER SET OF
   * MUTUALLY EXCLUSIVE OPTIONS IN THIS REPO. This built its own loose buttons
   * with its own `aria-pressed` bookkeeping and its own CSS block, which is the
   * fourth hand-rolled copy of a control that has been a component since
   * `choice.mjs` landed — and CLAUDE.md says to build from the kit and to stop
   * and ask rather than make another one. REPORTED as *"rate controls should be
   * radiobuttons everywhere. you keep breaking the rule"*, which is fair: this
   * page's own speed picker WAS a `createChoice` before it moved in here, and
   * moving it into the bar is where it lost its component.
   *
   * ⚠️ SEGMENTED, NOT SPACED, is part of what the component carries — gaps make
   * four options look like four unrelated controls. The old `.tbar-rates` block
   * set `gap: 4px` and did exactly that.
   */
  let rateChoice = null;
  function buildRates() {
    agen = deck.adapterGen?.() ?? 0;
    lattice = latticeFor(deck);
    rates.replaceChildren();
    rateChoice = null;
    if (lattice && lattice.length) {
      rateChoice = createChoice({
        options: lattice.map((r) => [`${r}x`, r]),
        at: Math.max(0, lattice.indexOf(deck.targetRate?.() ?? 1)),
        onPick: (r) => applyRate(r),
      });
      // The harness and `syncRates` both read `data-rate` off the buttons, and
      // the component does not know about rates — so it is stamped here.
      rateChoice.buttons.forEach((b, i) => { b.dataset.rate = String(lattice[i]); });
      rates.append(rateChoice.el);
    } else {
      rates.append(el('span', 'tbar-rate1', '1x'));   // honest: no lattice, no choice
    }
    syncRates();
  }
  buildRates();

  const seekable = Number.isFinite(deck.durationMs) && deck.durationMs > 0;
  bar.dataset.seekable = seekable ? '1' : '0';
  // seekable stays TRUE with the slider hidden: the deck is still seekable, by
  // the strip and by the keyboard table below. Hiding a control is not a
  // capability change, and `api.seekable` is what the harness reads.
  bar.dataset.scrub = seekable && wantScrub ? '1' : '0';

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

  // `targetRate`, which is the library's own answer and was here all along:
  // "the rate play() would resume at — WHAT A PAUSED UI DISPLAYS"
  // (transport.mjs, beside setRate). `deck.rate()` is 0 while paused, because a
  // paused transport genuinely advances at zero, so comparing buttons against
  // it selected none of them exactly when someone is reading the row deciding
  // what to press — and worse, pressing one changed nothing visible, since
  // setRate on a paused deck arms the rate and stays paused. An earlier fix
  // here tracked its own "last real rate", which reinvented targetRate and got
  // it wrong: it only ever updated while rolling.
  function syncRates() {
    const armed = deck.targetRate?.() ?? (typeof deck.rate === 'function' ? deck.rate() : deck.rate);
    // ⚠️ `set(i, quiet)` — QUIET, or syncing the picture would fire the handler
    // that changes the rate, which is a control that acts on being told what it
    // already is.
    if (rateChoice && lattice) {
      const i = lattice.indexOf(armed);
      if (i >= 0) rateChoice.set(i, true);
      else rateChoice.buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    }
    if (liveChip) {
      const slow = Number.isFinite(armed) && armed > 0 && armed !== 1;
      liveChip.textContent = slow ? 'SLOWED' : 'LIVE';
      liveChip.dataset.slow = slow ? '1' : '0';
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
    if (deck.adapterGen && deck.adapterGen() !== agen) buildRates();   // one integer compare

    if (!dragging && seekable) {
      const f = posToFrac(pos);
      fill.style.width = `${f * 100}%`;
      headDot.style.left = `${f * 100}%`;
    }
    // `fmt` — a page may say how a position READS. `0:03.910` is the right
    // answer for a deck of seconds and a meaningless one for a deck of 1965,
    // where the position is a date. Default unchanged; a page that needs
    // calendar time supplies a formatter rather than the bar guessing.
    time.textContent = fmt ? fmt(pos, range) : seekable
      ? `${clock(pos, absolute)} / ${clock(range[1] - range[0], false)}`
      : clock(pos, absolute);
    const playing = deck.playing?.() ?? false;
    toggle.dataset.state = playing ? 'playing' : atEnd ? 'ended' : 'paused';
  }

  // ── the end of a bounded piece ──────────────────────────────────────────
  // A BOUNDARY IS A COMMITTED ONE-SHOT, NEVER A POLL. This used to live inside
  // paint(), which observePosition drives off requestAnimationFrame — so in a
  // hidden tab it never ran: measured, a 20 s deck reached 91,001 ms and was
  // still reporting `playing: true`, while the bar's clock sat frozen at
  // 0:00.000. The deck's own scheduler was keeping perfect time throughout;
  // the only broken thing was asking the renderer to enforce a rule.
  //
  // CAVEAT, because it should not be discovered later: this timer is a plain
  // setTimeout on the main thread, so a hidden tab clamps it to ~1 Hz and the
  // stop can be up to a second late. That is a bounded error instead of an
  // unbounded one. The exact fix is to arm it on the scheduler's own worker
  // host, which createDeck does not currently expose.
  let endTimer = null, atEnd = false;
  const clearEnd = () => { if (endTimer) { clearTimeout(endTimer); endTimer = null; } };

  function hitEnd() {
    endTimer = null;
    if (!endStop || !deck.playing?.()) return;
    cmd.pause();
    cmd.seek(range[1]);
    atEnd = true;
    // no badge: the toggle already turned into a restart glyph, and a word
    // saying the same thing beside it is the second copy of one fact
  }

  function armEnd() {
    clearEnd();
    if (!endStop || !seekable || !(deck.playing?.() ?? false)) return;
    const rate = typeof deck.rate === 'function' ? deck.rate() : deck.rate;
    if (!(rate > 0)) return;                       // paused or reversed: no end to reach
    const t = deck.transport;
    const due = t?.timeAt ? t.timeAt(range[1]) : null;
    if (due === null || due === undefined) return;
    const delay = due - t.clock.now();
    if (delay <= 0) return hitEnd();
    endTimer = setTimeout(hitEnd, delay);
  }
  // re-armed on every play / pause / rate / seek, because each one moves the
  // instant at which range[1] arrives
  const offState = deck.transport?.onState
    ? deck.transport.onState(() => { armEnd(); syncRates(); })
    : null;

  // ── interaction ─────────────────────────────────────────────────────────
  // Parked at the end, the play button REPLAYS. This is what a sequencer does:
  // stop at the end and leave the playhead there — the final state is worth
  // looking at, and here it is literally the fold of every event — then send
  // the transport back to the start when you ask for play again. Restarting is
  // well defined in this library in a way it is not for a media element: a
  // backward seek replays each event exactly once.
  toggle.addEventListener('click', () => {
    if (deck.playing?.()) return cmd.pause();
    if (endStop && (atEnd || (seekable && deck.position() >= range[1]))) leaveEnd(range[0]);
    cmd.play();
  });
  function leaveEnd(to) { atEnd = false; clearNote(); cmd.seek(to); }

  function seekFromEvent(e) {
    const r = scrub.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    fill.style.width = `${f * 100}%`;
    headDot.style.left = `${f * 100}%`;
    return fracToPos(f);
  }
  // SCRUB LIVE, NOT ON RELEASE. seekFromEvent() only repaints this bar's own
  // fill; until pointerup the deck never moved, so the strip's playhead, the
  // readout and every lane sat still while the handle slid — the bar looked
  // like the only thing on the page connected to anything.
  //
  // Coalesced to one seek per frame: a pointermove stream can arrive faster
  // than a frame, and deck.seek() is two-phase (reduce + assertState), so
  // seeking per event asks a lane to re-fold work nobody will ever see.
  let pendingSeek = null, seekRaf = 0;
  function liveSeek(pos) {
    pendingSeek = pos;
    if (seekRaf) return;
    seekRaf = requestAnimationFrame(() => {
      seekRaf = 0;
      if (pendingSeek !== null) doSeek(pendingSeek);
      pendingSeek = null;
    });
  }
  function endDrag() {
    dragging = false;
    if (seekRaf) { cancelAnimationFrame(seekRaf); seekRaf = 0; }
    pendingSeek = null;
  }

  scrub.addEventListener('pointerdown', (e) => {
    if (!seekable) return;
    dragging = true;
    try { scrub.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    liveSeek(seekFromEvent(e));
  });
  scrub.addEventListener('pointermove', (e) => { if (dragging) liveSeek(seekFromEvent(e)); });
  scrub.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    const pos = seekFromEvent(e);
    endDrag();
    doSeek(pos);          // land exactly where the finger lifted, uncoalesced
  });
  // A cancelled gesture (the page took the scroll, the window lost focus) used
  // to leave `dragging` true forever, which silently froze the playhead paint.
  scrub.addEventListener('pointercancel', endDrag);

  function doSeek(pos) {
    if (atEnd && pos < range[1]) { atEnd = false; clearNote(); }
    const res = cmd.seek(pos);
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
    if (e.key === ' ') { e.preventDefault(); deck.playing?.() ? cmd.pause() : cmd.play(); }
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
    /** what this bar was built with — so a page can assert the setting it
     *  passed rather than an effect that has to be waited for. */
    endStop, commanded: !!command,
    /** an `extras` button by id, so a page can relabel or disable it */
    extra: (id) => extraEls.get(id) || null,
    note,
    destroy() {
      stop();
      clearEnd();
      offState && offState();
      removeEventListener('keydown', onKey);
      bar.remove();
      if (window.__demo && window.__demo.transport === api) window.__demo.transport = null;
    },
  };
}

/**
 * Intersection of every declared caps.rates lattice. null = none declared.
 *
 * READ THE LIVE REGISTRY, not `deck.adapters`. That property is the object
 * handed to `createDeck` and it never holds an adapter registered afterwards —
 * which is every adapter a NEST installs on its parent. So a nest parent's
 * lattice read as "none declared" and the bar showed its honest static 1x for
 * a deck that could in fact be played at four rates. `transport.mjs` says as
 * much beside `deck.adapter()`; the bar was the one client not listening.
 *
 * `deck.caps()` with no kind returns `{kind: caps}` over everything currently
 * registered, which is the question actually being asked.
 */
function latticeFor(deck) {
  let capsByKind = null;
  try { capsByKind = typeof deck.caps === 'function' ? deck.caps() : null; } catch { capsByKind = null; }
  const list = capsByKind && typeof capsByKind === 'object' && !Array.isArray(capsByKind)
    ? Object.values(capsByKind)
    : (deck.adapters instanceof Map ? [...deck.adapters.keys()] : Object.keys(deck.adapters || {}))
        .map((k) => deck.caps?.(k));
  let acc = null;
  for (const c of list) {
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

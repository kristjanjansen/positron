// demo/shell/transport-bar.mjs: the one transport control. The factory is the primitive;
// <positron-transport> wraps it only for disconnectedCallback. No shadow DOM, so shell.css
// cascades in and CDP can query it.
// why: lessons/kit-transport-bar.md#header

import { observePosition } from '/timeline/transport.mjs';
import { el } from './shell.mjs';
import { createChoice } from './choice.mjs';
// The toggle's faces are icons from the kit's set, not font glyphs. See FACES.
// why: lessons/kit-transport-bar.md#toggle-icons
import { icon } from './icons.mjs';
// The live chip is a presence badge, the project's one online indicator. See ON_AIR.
// why: lessons/kit-transport-bar.md#live-chip-import
import { createPresence } from './presence.mjs';
// looper.mjs owns the loop-direction vocabulary; it imports nothing, so no cycle.
// why: lessons/kit-transport-bar.md#loop-ways-import
import { WAY_GLYPH, WAY_SAYS, LOOP_TURN, LOOP_WAYS } from './looper.mjs';

/**
 * What a live source's badge says: presence.mjs words about the source, not the player.
 * The widest word sets the badge width; `checking` is left out of ON_AIR_CAN.
 * why: lessons/kit-transport-bar.md#on-air
 */
export const ON_AIR = {
  online: 'on air',
  offline: 'off air',
  coming: 'tuning in',
  checking: 'checking',
  unknown: 'unknown',
};
/** Which of those this badge can reach, which is what its width is measured on. */
export const ON_AIR_CAN = ['online', 'coming', 'offline', 'unknown'];

/**
 * `scrub: false`: one position surface per page. Where a strip is mounted, the bar keeps
 * play/pause, the clock, the rates and the badge, and gives up the slider.
 * why: lessons/kit-transport-bar.md#scrub-false
 */

/**
 * A button for `right` and `left`, built by the bar so a page never types its classes.
 * It is `.tbar-x`, which the harness presses; a button the suite must not press goes in `loopSlot`.
 * @param {object} o
 * @param {string} o.label      the word, or the glyph when `word` is false.
 * @param {boolean} [o.word]    true for a word, which is the standard button.
 * @param {string} [o.aria]     what a screen reader and a check read.
 * @param {string} [o.title]    the hover line.
 * @param {boolean} [o.primary] the record treatment. Rarely what you want.
 * @param {(btn: HTMLButtonElement) => void} [o.onPress]
 * @returns {HTMLButtonElement} ready for `right: [...]` or `left: [...]`.
 * why: lessons/kit-transport-bar.md#bar-button
 */
export function barButton({
  label = '', word = false, aria, title, primary = false, onPress,
} = {}) {
  const b = el('button', `tbar-x${primary ? ' pos-pri' : ''}${word ? ' tbar-word' : ''}`,
    label, { type: 'button' });
  // The label may be a glyph, and a glyph is not a name. Same reasoning as
  // `extras` below: without this the control is announced as "●".
  b.setAttribute('aria-label', aria ?? label);
  if (title) b.title = title;
  if (onPress) b.addEventListener('click', () => onPress(b));
  return b;
}

export function createTransportBar(host, deck, {
  absolute = false, scrub: wantScrub = true, extras = [], right = [],
  fmt = null, live = false, publish = true,
  // 'play' (the default), 'record', or TWO WORDS as an array: what the toggle
  // says it does. See the note on the toggle itself.
  verb = 'play',
  // `false` leaves the loop button off, for a page with no passage worth hearing twice.
  // why: lessons/kit-transport-bar.md#loop-false
  loop: wantLoop = true,
  /**
   * `false` leaves the play button off. `api.toggles` says so, `api.playing` is forced false,
   * space stops toggling and the end-stop never arms. A page using it must not put its checks
   * behind a press: verify.mjs skips the play drill and nothing else presses.
   * why: lessons/kit-transport-bar.md#toggle-false
   */
  toggle: wantToggle = true,
  /**
   * `false` drops the clock, for a page whose strip already shows the position.
   * Defaults on; it does not touch the live chip or a page's own `chip`.
   * why: lessons/kit-transport-bar.md#time-false
   */
  time: wantTime = true,
  /**
   * What takes the loop button's place on a bar with no loop. Same shape as `extras`
   * (`{ id, label, aria, title, word, onPress }`), reachable as `bar.slot(id)`.
   * why: lessons/kit-transport-bar.md#loop-slot
   */
  loopSlot = [],
  /**
   * Buttons that act on a loop, right of LOOP, shown only while one runs.
   * `[{ id, label, aria, title, always, onPress(btn) }]`; `always: true` keeps one that
   * sets what the next loop does (the direction) on the bar with no loop running.
   * why: lessons/kit-transport-bar.md#loop-extras
   */
  loopExtras = [],
  /**
   * The three loop directions for a loop the deck plays; the bar drives a reversed lap
   * itself (transport.setRate refuses negative rates). Not for a media-backed deck.
   * why: lessons/kit-transport-bar.md#loop-ways
   */
  loopWays = false,
  /**
   * An element in the live chip's place; the bar takes a chip or `live`, never both.
   * why: lessons/kit-transport-bar.md#chip
   */
  chip = null,
  // `false` for a live deck, whose end is the present moment and arrives seconds after play.
  // why: lessons/kit-transport-bar.md#end-stop
  endStop = true,
  // Who owns position: a media-driven deck is a follower, so such a page passes
  // { play, pause, seek } that drive the element. Defaults to the deck's own methods.
  // why: lessons/kit-transport-bar.md#command
  command = null,
  /**
   * Called with the new rate the instant a rate button is pressed, so a page need not poll
   * `deck.targetRate()`. `applyRate` is the one funnel for rate changes.
   * why: lessons/kit-transport-bar.md#on-rate
   */
  onRate = null,
  /**
   * `() => boolean`: is the armed rate not yet audible? Only the sound source knows;
   * a deck that gives nothing gets no pulse.
   * why: lessons/kit-transport-bar.md#settling
   */
  settling = null,
  /**
   * Called when the loop changes or comes round: `('fill'|'set'|'wrap'|'off', a, b)`.
   * On `fill` the page starts keeping sound for the window `a` to `b`; the bar holds no audio.
   * why: lessons/kit-transport-bar.md#on-loop
   */
  onLoop = null,
  /** `(way)` — 'round' | 'back' | 'pingpong', when the direction button is
   *  pressed. A page that says what its loop is doing elsewhere reads it here;
   *  the button's own face already carries the state. */
  onWay = null,
  /**
   * How much live sound one loop may hold, in ms. 20 s is a default, not a measurement;
   * a page holding its own ring passes that ring's length.
   * why: lessons/kit-transport-bar.md#live-window
   */
  liveWindowMs = 20000,
  /**
   * Where the playhead is inside a running loop, 0..1, and `null` once when there is none.
   * Pushed from this bar's paint, so a page needs no rAF loop of its own.
   * why: lessons/kit-transport-bar.md#on-loop-pos
   */
  onLoopPos = null,
} = {}) {
  const cmd = {
    play: () => (command?.play ? command.play() : deck.play()),
    pause: () => (command?.pause ? command.pause() : deck.pause()),
    seek: (pos) => (command?.seek ? command.seek(pos) : deck.seek(pos)),
  };
  const bar = el('div', 'tbar');

  /**
   * `verb: 'record'` or `verb: ['start', 'stop']` changes the toggle's face and label only;
   * the `.tbar-toggle` element and its `data-state` stay, so the play drill still works.
   * Both words sit in one grid cell so the button keeps one width; anything but two words throws.
   * why: lessons/kit-transport-bar.md#verb
   */
  const WORDS = Array.isArray(verb) ? verb : null;
  if (WORDS && (WORDS.length !== 2 || WORDS.some((w) => typeof w !== 'string' || !w.trim()))) {
    throw new Error('createTransportBar: verb as words is exactly two non-empty strings'
      + ` (got ${JSON.stringify(verb)})`);
  }
  const RECORD = verb === 'record';
  /**
   * `verb: 'stop'` shows the kit's stop icon for a second press that stops and rewinds.
   * A class and an aria label only, like `verb: 'record'`.
   * why: lessons/kit-transport-bar.md#verb-stop
   */
  const STOPS = verb === 'stop';
  const toggle = el('button',
    `tbar-toggle${RECORD ? ' tbar-rec' : ''}${STOPS ? ' tbar-stop' : ''}${WORDS ? ' tbar-word' : ''}`, '',
    { type: 'button',
      'aria-label': WORDS ? `${WORDS[0]}/${WORDS[1]}`
        : RECORD ? 'record/stop' : STOPS ? 'play/stop' : 'play/pause' });
  // Two spans, not one rewritten: the stylesheet shows one from `data-state`.
  // why: lessons/kit-transport-bar.md#two-spans
  if (WORDS) toggle.append(el('span', 'tbar-w0', WORDS[0]), el('span', 'tbar-w1', WORDS[1]));
  /**
   * Every icon face is in the toggle at once and shell.css shows one from `data-state`,
   * so a check that sets `data-state` by hand sees the face it set. `buffering` is not
   * written by this bar today; its face exists so that state is not an empty square.
   * why: lessons/kit-transport-bar.md#faces
   */
  const FACES = RECORD ? { rest: 'record', playing: 'stop', ended: 'record', buffering: 'clock' }
    : { rest: 'play', playing: STOPS ? 'stop' : 'pause', ended: 'refresh', buffering: 'clock' };
  if (!WORDS) {
    toggle.classList.add('pos-icobtn');
    toggle.dataset.glyph = '1';
    for (const [face, name] of Object.entries(FACES)) {
      const svg = icon(name, { size: 16 });
      svg.dataset.face = face;
      toggle.append(svg);
    }
  }
  const scrub = el('div', 'tbar-scrub', '', { role: 'slider', tabindex: '0', 'aria-label': 'position' });
  const fill = el('div', 'tbar-fill');
  const headDot = el('div', 'tbar-head');
  // The loop's own ground on the scrub, UNDER the fill and the head, so the
  // playhead is never behind it. A loop you cannot see the extent of is a
  // number in somebody's head.
  const loopSpan = el('div', 'tbar-loopspan');
  loopSpan.hidden = true;
  scrub.append(loopSpan, fill, headDot);
  // `extras`: page buttons that belong to the transport (record on `take`), by the toggle,
  // returned by id so a page can relabel or disable one.
  // why: lessons/kit-transport-bar.md#extras
  let wayAt = 0;                                  // an index into LOOP_TURN
  const wayName = () => LOOP_WAYS[LOOP_TURN[wayAt]][1];
  const wayEntry = {
    id: 'way', label: WAY_GLYPH[LOOP_WAYS[LOOP_TURN[0]][1]], always: true,
    aria: 'which way the loop plays', title: WAY_SAYS[LOOP_WAYS[LOOP_TURN[0]][1]],
    onPress: () => cycleWay(),
  };
  const loopExtraEls = new Map();
  for (const x of (loopWays ? [wayEntry, ...loopExtras] : loopExtras)) {
    const b = el('button', 'tbar-x', x.label,
      { type: 'button', 'aria-label': x.aria || x.id, 'aria-pressed': 'false' });
    b.dataset.id = x.id;
    if (x.title) b.title = x.title;
    if (x.always) b.dataset.always = '1';
    b.hidden = !x.always;            // until there is a loop for them to act on
    b.addEventListener('click', () => x.onPress?.(b));
    loopExtraEls.set(x.id, b);
  }

  /**
   * A loop and a loop slot share one position, so both together throw at construction.
   * why: lessons/kit-transport-bar.md#loop-slot-refused
   */
  if (loopSlot.length && wantLoop) {
    throw new Error('createTransportBar: loopSlot needs loop: false'
      + ` (${loopSlot.length} button(s) asked for the loop's place while the loop is on)`);
  }
  const loopSlotEls = new Map();
  for (const x of loopSlot) {
    /**
     * `tbar-slot`, not `tbar-x`, so verify.mjs never presses it (a full screen slot would
     * spoil every later check). `word: true` makes it a label, as the loop button it replaces.
     * why: lessons/kit-transport-bar.md#tbar-slot
     */
    const b = el('button', `tbar-slot${x.word ? ' tbar-word' : ''}`, x.label,
      { type: 'button', 'aria-label': x.aria || x.id });
    b.dataset.id = x.id;
    if (x.title) b.title = x.title;
    // Never hidden, unlike `loopExtras`.
    // why: lessons/kit-transport-bar.md#slot-never-hidden
    b.addEventListener('click', () => x.onPress?.(b));
    loopSlotEls.set(x.id, b);
  }

  const extraEls = new Map();
  /**
   * `end: true` puts an extra at the start of the right group, just left of LOOP,
   * with the `data-end` marker.
   * why: lessons/kit-transport-bar.md#end-extras
   */
  const endExtraEls = [];
  for (const x of extras) {
    // `word: true`: the label is a word, sized by its text rather than the 38px square.
    // why: lessons/kit-transport-bar.md#extra-word
    const b = el('button', `tbar-x${x.primary ? ' pos-pri' : ''}${x.word ? ' tbar-word' : ''}`,
      x.label, { type: 'button' });
    // The label is a GLYPH, so it is not a name. `aria` is what a screen reader
    // reads and what a test looks for; without it the control is "●".
    b.setAttribute('aria-label', x.aria ?? x.label);
    if (x.title) b.title = x.title;
    // Both spellings, `onPress` first: a misspelled handler is a silent dead button, and
    // seven pages pass `onClick`. Write `onPress`.
    // why: lessons/kit-transport-bar.md#on-press-on-click
    b.addEventListener('click', () => (x.onPress ?? x.onClick)?.(b));
    extraEls.set(x.id, b);
    if (x.end) endExtraEls.push(b);
  }

  // Two lines, not one: `0:00.902 / 3:55.076` was the widest fixed thing on the bar and
  // pushed the rates onto a second row.
  // why: lessons/kit-transport-bar.md#two-line-clock
  const time = el('output', 'tbar-time');
  const timeNow = el('span', 'tbar-now', '0:00.000');
  const timeAll = el('span', 'tbar-all', '');
  time.append(timeNow, timeAll);
  const rates = el('div', 'tbar-rates');
  const badge = el('span', 'tbar-badge');
  /**
   * A live source shows an `on air` badge instead of a clock. It is measured, not declared:
   * the page calls `api.live.follow()` once and `seen()` whenever sound arrives, and a page
   * that feeds it nothing shows `unknown`.
   * why: lessons/kit-transport-bar.md#live-chip
   */
  const liveChip = live
    ? createPresence({ mode: 'badge', says: ON_AIR, can: ON_AIR_CAN, state: 'unknown' })
    : null;
  // Loop is one button pressed three times: start, end, off. It is disabled, not hidden, on a
  // deck that cannot loop; a live deck loops over a window it fills (see the live window).
  // why: lessons/kit-transport-bar.md#loop-button
  const loopBtn = el('button', 'tbar-loop tbar-word', 'Loop',
    { type: 'button', 'aria-label': 'loop' });
  loopBtn.dataset.loop = 'off';
  loopBtn.title = live
    ? 'press to hold the live sound from here. it closes and plays when the window is full, or press again to end it sooner'
    : 'press to mark where a loop starts, again to mark the end, again to take it off';
  /**
   * The loop extras and LOOP are one segmented control: two buttons sharing an edge.
   * No group when there are no extras.
   * why: lessons/kit-transport-bar.md#loop-group
   */
  const loopPair = loopExtraEls.size && wantLoop ? el('div', 'tbar-loopgrp pos-seg') : null;
  if (loopPair) loopPair.append(loopBtn, ...loopExtraEls.values());
  if (chip && live) {
    throw new Error('createTransportBar: chip and live want the same position '
      + '(pass live: false, or drop the chip and feed api.live, which is the '
      + 'same presence badge with the same words)');
  }
  // the loop's position: whatever was put in the slot, or the loop itself
  const endSide = loopSlotEls.size ? [...loopSlotEls.values()]
    : loopPair ? [loopPair] : [...(wantLoop ? [loopBtn] : []), ...loopExtraEls.values()];
  /**
   * `right` is a caller's own control in the right group, beside the rates. The first member
   * from the loop rightwards takes `data-end`, which holds the gap in the middle of the bar;
   * without it a bar with no scrub and no clock packs left (LOOP at 57 px, 375 px empty, at 1280).
   * why: lessons/kit-transport-bar.md#data-end
   */
  const endRow = [...endExtraEls, ...endSide];
  if (endRow[0]) endRow[0].dataset.end = '1';
  else if (right[0]) right[0].dataset.end = '1';
  bar.append(...(wantToggle ? [toggle] : []),
    ...[...extraEls.values()].filter((x) => !endExtraEls.includes(x)), scrub,
    ...(chip ? [chip] : live ? [liveChip.el] : wantTime ? [time] : []),
    ...endRow, rates, ...right, badge);
  host.append(bar);

  // ── rates: intersect every declared caps.rates lattice ──────────────────
  // Rebuilt whenever the adapter registry moves: a nest registers its adapter after this bar
  // is built, so a lattice computed once describes an unassembled deck.
  // why: lessons/kit-transport-bar.md#rates
  let lattice = null, agen = -1;
  /**
   * The rates are a segmented radio group from `choice.mjs`, not hand-rolled buttons.
   * why: lessons/kit-transport-bar.md#rate-choice
   */
  let rateChoice = null;
  // Declared before `buildRates()`, which runs at construction and clears it; a later `let`
  // would be in its temporal dead zone and throw.
  // why: lessons/kit-transport-bar.md#was-settling
  let wasSettling = null;
  function buildRates() {
    agen = deck.adapterGen?.() ?? 0;
    lattice = latticeFor(deck);
    rates.replaceChildren();
    rateChoice = null;
    /**
     * `> 1`, not `length`: a lattice of one value is not a choice and draws nothing.
     * why: lessons/kit-transport-bar.md#lattice-of-one
     */
    if (lattice && lattice.length > 1) {
      rateChoice = createChoice({
        // No `x` suffix: it is the same on every button and pushed the group onto a second line.
        // why: lessons/kit-transport-bar.md#no-x
        options: lattice.map((r) => [String(r), r]),
        at: Math.max(0, lattice.indexOf(deck.targetRate?.() ?? 1)),
        onPick: (r) => applyRate(r),
      });
      // The harness and `syncRates` both read `data-rate` off the buttons, and
      // the component does not know about rates — so it is stamped here.
      rateChoice.buttons.forEach((b, i) => { b.dataset.rate = String(lattice[i]); });
      rates.append(rateChoice.el);
    }
    // A deck with no rate lattice shows nothing, not a lone 1 that can never change.
    // why: lessons/kit-transport-bar.md#no-lone-one
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
    // Before `syncRates`, so the page has armed its rate before the pulse is decided;
    // the other order flickers on every press.
    // why: lessons/kit-transport-bar.md#on-rate-order
    onRate?.(r);
    syncRates();
  }

  // Compared against `targetRate`, the rate play() would resume at. `deck.rate()` is 0
  // while paused, which would select no button.
  // why: lessons/kit-transport-bar.md#target-rate
  function syncRates() {
    const armed = deck.targetRate?.() ?? (typeof deck.rate === 'function' ? deck.rate() : deck.rate);
    // ⚠️ `set(i, quiet)` — QUIET, or syncing the picture would fire the handler
    // that changes the rate, which is a control that acts on being told what it
    // already is.
    if (rateChoice && lattice) {
      const i = lattice.indexOf(armed);
      if (i >= 0) rateChoice.set(i, true);
      else rateChoice.buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      // A rebuilt group is a fresh set of buttons with no pulse on any of them,
      // so the remembered answer no longer describes the DOM.
      wasSettling = null;
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
    // `fmt`: a page may say how a position reads (a date on /tapes/). It gets the whole line,
    // not split on a slash it did not write.
    // why: lessons/kit-transport-bar.md#fmt
    if (fmt) { timeNow.textContent = fmt(pos, range); timeAll.textContent = ''; }
    else {
      timeNow.textContent = clock(pos, absolute);
      timeAll.textContent = seekable ? clock(range[1] - range[0], false) : '';
    }
    // `rolling()`, not `deck.playing()`: a reversed lap runs with the deck
    // paused and the bar seeking it, and a PAUSE glyph over a moving playhead
    // is a control lying about the state it is in.
    const playing = rolling();
    // The glyph is the toggle's own state and there is no toggle to carry it on
    // a bar built without one. Painting a detached button is not an error, it is
    // silence, so it is skipped rather than written into nothing.
    if (wantToggle) toggle.dataset.state = playing ? 'playing' : atEnd ? 'ended' : 'paused';
    // The wrap is rate-limited: a seek is not instant, so the next frame can still read past
    // the end and ask again, a seek storm. Only while rolling, and not while the lap driver owns it.
    // why: lessons/kit-transport-bar.md#wrap
    if (!lapRaf && loopA != null && loopB != null && playing && pos >= loopB) {
      const t = performance.now();
      if (t - lastWrap > 150) { lastWrap = t; doSeek(loopA); onLoop?.('wrap', loopA, loopB); }
    }
    // AND THE OTHER HALF OF THE SAME RULE, for a bar built with `endStop: false`
    // and for a deck whose end arrives without the timer: a start with no end,
    // rolling, that reaches the end of the source closes there and engages.
    if (playing && loopA != null && loopB == null && !filling && pos >= range[1]) closeAtEnd();
    // A loop cannot outlive its range. On a live deck only the left edge counts: the right edge
    // is published once a second, so a window ending at the live edge reads up to 1 s past it.
    // why: lessons/kit-transport-bar.md#outrun
    const outrunsEnd = !live && (loopB ?? loopA) > range[1];
    if (loopA != null && (loopA < range[0] || outrunsEnd)) {
      clearLoop('the loop ran off the back of what is still held');
    }
    // The last quarter of the opened window blinks the button (see setBlink).
    // why: lessons/kit-transport-bar.md#warn-blink
    setBlink(filling && fillEnds != null && loopA != null
      && pos >= fillEnds - (fillEnds - loopA) * LIVE_WARN_FRAC);
    reportLoopPos(pos);
    syncPending();
  }

  /**
   * The armed rate button pulses until the speed is audible. Runs on the 60 Hz paint, so the
   * DOM is touched only on a change, or the CSS animation restarts every frame.
   * why: lessons/kit-transport-bar.md#sync-pending
   */
  function syncPending() {
    if (!rateChoice) return;
    const now = settling ? !!settling() : false;
    if (now === wasSettling) return;
    wasSettling = now;
    rateChoice.pending(now ? rateChoice.get() : null);
  }

  // ── the end of a bounded piece ──────────────────────────────────────────
  // A committed one-shot timer, never a check in paint(): rAF does not run in a hidden tab.
  // A hidden tab clamps setTimeout to ~1 Hz, so the stop can be up to 1 s late.
  // why: lessons/kit-transport-bar.md#end-one-shot
  let endTimer = null, atEnd = false;
  const clearEnd = () => { if (endTimer) { clearTimeout(endTimer); endTimer = null; } };

  /**
   * One press is enough: a start mark with no end closes at the end of the source and plays.
   * A zero-length loop is refused, and a live deck (filling) has its own way of closing.
   * why: lessons/kit-transport-bar.md#close-at-end
   */
  function closeAtEnd() {
    if (!seekable || filling || loopA == null || loopB != null) return false;
    if (range[1] - loopA < 1) return false;
    startLoop(loopA, range[1]);
    return true;
  }

  function hitEnd() {
    endTimer = null;
    if (!endStop || !wantToggle || !deck.playing?.()) return;
    // A running loop owns the wrap, and its end may BE the end of the source,
    // which is the one case where this timer and that wrap are due at the same
    // instant. Pausing here would stop a loop that is working.
    if (loopA != null && loopB != null) return;
    if (closeAtEnd()) return;
    cmd.pause();
    cmd.seek(range[1]);
    atEnd = true;
    // no badge: the toggle already turned into a restart glyph, and a word
    // saying the same thing beside it is the second copy of one fact
  }

  function armEnd() {
    clearEnd();
    if (!endStop || !wantToggle || !seekable || !(deck.playing?.() ?? false)) return;
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
  // instant at which range[1] arrives — and the instant a live window is full,
  // which is the same kind of boundary and gets the same kind of one-shot
  const offState = deck.transport?.onState
    ? deck.transport.onState(() => { armEnd(); armFill(); syncRates(); })
    : null;

  // ── interaction ─────────────────────────────────────────────────────────
  // Parked at the end, the play button replays from the start, as a sequencer does.
  // Space goes through this too, so a key never skips `stopLap()` or `leaveEnd()`.
  // why: lessons/kit-transport-bar.md#replay-at-end
  function pressToggle() {
    // A reversed lap is playing even though the deck is not, so pausing one is
    // stopping the driver rather than pausing a transport that is already
    // stopped. Pressing play again picks the lap up where it left off.
    if (lapRaf) { stopLap(); return; }
    if (deck.playing?.()) return cmd.pause();
    if (loopA != null && loopB != null && wayName() !== 'round') return startLap();
    if (endStop && (atEnd || (seekable && deck.position() >= range[1]))) leaveEnd(range[0]);
    cmd.play();
  }
  toggle.addEventListener('click', pressToggle);
  function leaveEnd(to) { atEnd = false; clearNote(); cmd.seek(to); }

  function seekFromEvent(e) {
    const r = scrub.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    fill.style.width = `${f * 100}%`;
    headDot.style.left = `${f * 100}%`;
    return fracToPos(f);
  }
  // Scrub seeks while dragging, not on release, coalesced to one seek per frame because
  // deck.seek() is two-phase and a pointermove stream outpaces frames.
  // why: lessons/kit-transport-bar.md#scrub-live
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

  // ── the loop ────────────────────────────────────────────────────────────
  let loopA = null, loopB = null, lastWrap = 0;

  /**
   * A live loop is a window filled in real time: the first press opens it, it plays when full.
   * The bar holds no audio; the page keeps the sound on `onLoop('fill')`.
   * why: lessons/kit-transport-bar.md#live-loop
   */
  let filling = false, fillEnds = null, fillTimer = null;
  // The blink's own state, so the DOM is touched only when the answer changes.
  // Same rule `syncPending` follows for the rate pulse, for the same reason: at
  // 60 Hz, restarting an animation every frame renders as a still.
  let blinking = false, blinkAnim = null;
  let lastLoopFrac = null;
  // The last quarter of the window is the warning. A FRACTION rather than a
  // fixed number of seconds, so a page that passes a short window gets a
  // warning in proportion to it instead of one longer than the loop itself.
  const LIVE_WARN_FRAC = 0.25;
  const BLINK_MS = 640;
  const lessMotion = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)') : null;

  /**
   * A warning, not a countdown. It animates opacity only, so nothing beside it moves;
   * reduced motion gets a steady dim, built here because shell.css switches animations off.
   * why: lessons/kit-transport-bar.md#set-blink
   */
  function setBlink(on) {
    if (on === blinking) return;
    blinking = on;
    blinkAnim?.cancel();
    blinkAnim = null;
    loopBtn.style.opacity = '';
    if (!on) return;
    if (!lessMotion?.matches) {
      blinkAnim = loopBtn.animate?.([
        { opacity: 1, offset: 0 }, { opacity: 1, offset: 0.49 },
        { opacity: 0.24, offset: 0.5 }, { opacity: 0.24, offset: 1 },
      ], { duration: BLINK_MS, iterations: Infinity }) ?? null;
    }
    if (!blinkAnim) loopBtn.style.opacity = '0.62';
  }

  /** 0..1 through a running loop, or null. Pushed only when it changes to or
   *  from nothing, so a page is not told "no loop" sixty times a second. */
  function reportLoopPos(pos) {
    let f = null;
    if (loopA != null && loopB != null && loopB > loopA && pos != null) {
      f = Math.min(1, Math.max(0, (pos - loopA) / (loopB - loopA)));
    }
    if (f === null && lastLoopFrac === null) return;
    lastLoopFrac = f;
    onLoopPos?.(f);
  }

  const clearFill = () => { if (fillTimer) { clearTimeout(fillTimer); fillTimer = null; } };

  /**
   * A committed one-shot like `armEnd`, re-armed from `onState`; a paused deck gets no timer.
   * why: lessons/kit-transport-bar.md#arm-fill
   */
  function armFill() {
    clearFill();
    if (!filling || fillEnds == null) return;
    const t = deck.transport;
    const due = t?.timeAt ? t.timeAt(fillEnds) : null;
    if (due === null || due === undefined) return;
    const delay = due - t.clock.now();
    if (delay <= 0) return closeWindow();
    fillTimer = setTimeout(closeWindow, delay);
  }

  /** The window is full, so the loop is finished and it starts playing. */
  function closeWindow() {
    fillTimer = null;
    if (!filling || fillEnds == null || loopA == null) return;
    startLoop(loopA, fillEnds);
  }

  /**
   * The bar drives backward laps itself: the deck is paused and seeked once a frame, since
   * setRate refuses negative rates. `rolling()` counts a lap as playing, for the toggle's face.
   * why: lessons/kit-transport-bar.md#lap
   */
  let lapRaf = 0, lapAt = 0, lapPrev = 0;
  const rolling = () => (deck.playing?.() ?? false) || !!lapRaf;

  function lapRate() {
    const r = typeof deck.targetRate === 'function' ? deck.targetRate() : deck.targetRate;
    const n = Math.abs(Number(r));
    return n > 0 ? n : 1;
  }

  function startLap() {
    stopLap();
    if (loopA == null || loopB == null || loopB - loopA <= 0) return;
    if (deck.playing?.()) cmd.pause();
    // Pick the lap up where the playhead already is, so changing direction
    // mid-loop does not jump the sound or the picture back to a mark.
    const span = loopB - loopA;
    const at = Math.min(Math.max(deck.position(), loopA), loopB);
    const into = wayName() === 'back' ? loopB - at : at - loopA;
    lapAt = performance.now() - into / lapRate();
    lapPrev = into;
    lapRaf = requestAnimationFrame(driveLap);
  }

  function stopLap() {
    if (lapRaf) cancelAnimationFrame(lapRaf);
    lapRaf = 0;
  }

  function driveLap(now) {
    lapRaf = 0;
    if (loopA == null || loopB == null || wayName() === 'round') return;
    const span = loopB - loopA;
    if (!(span > 0)) return;
    const gone = Math.max(0, (now - lapAt) * lapRate());
    let pos;
    if (wayName() === 'back') {
      const p = gone % span;
      if (p < lapPrev) onLoop?.('wrap', loopA, loopB);
      lapPrev = p;
      pos = loopB - p;
    } else {
      const p = gone % (span * 2);
      if (p < lapPrev) onLoop?.('wrap', loopA, loopB);
      lapPrev = p;
      pos = p < span ? loopA + p : loopB - (p - span);
    }
    doSeek(pos);
    lapRaf = requestAnimationFrame(driveLap);
  }

  /** One press of the button glued to LOOP: the three directions, in turn. */
  function cycleWay() {
    wayAt = (wayAt + 1) % LOOP_TURN.length;
    const name = wayName();
    const b = loopExtraEls.get('way');
    if (b) { b.textContent = WAY_GLYPH[name]; b.title = WAY_SAYS[name]; b.setAttribute('aria-label', WAY_SAYS[name]); }
    onWay?.(name);
    if (loopA == null || loopB == null) return;      // it acts on the NEXT loop
    if (name === 'round') { stopLap(); if (!deck.playing?.()) cmd.play(); }
    else startLap();
  }

  /** Both marks are known: arm the loop, go back to its start and roll. */
  function startLoop(a, b) {
    filling = false; fillEnds = null;
    clearFill();
    setBlink(false);
    loopA = a; loopB = b;
    drawLoop();
    clearNote();
    doSeek(loopA);
    if (wayName() === 'round') { if (!(deck.playing?.() ?? false)) cmd.play(); }
    else startLap();
    onLoop?.('set', loopA, loopB);
  }

  function drawLoop() {
    const on = loopA != null && loopB != null;
    // The word never changes, so the button never resizes; state is in `data-loop` and the aria
    // label. A filling window is the `armed` state plus the blink.
    // why: lessons/kit-transport-bar.md#loop-word
    loopBtn.dataset.loop = on ? 'on' : loopA != null ? 'armed' : 'off';
    // `deck.setLoopView` tells a strip on the same deck about the loop, in this button's word.
    // why: lessons/kit-transport-bar.md#set-loop-view
    deck.setLoopView?.(loopA == null ? null
      : { a: loopA, b: loopB, state: on ? 'on' : 'armed', filling });
    // they act on a loop, so they exist while there is one and not before —
    // unless they were declared `always`, which means they act on the NEXT one.
    for (const b of loopExtraEls.values()) if (!b.dataset.always) b.hidden = !on;
    loopBtn.setAttribute('aria-label',
      on ? 'looping. press to take the loop off'
        : filling ? 'holding the live sound. press to end the loop here'
        : loopA != null ? 'press to mark where the loop ends' : 'loop');
    if (!on || !seekable) { loopSpan.hidden = true; return; }
    const fa = posToFrac(loopA), fb = posToFrac(loopB);
    loopSpan.hidden = false;
    loopSpan.style.left = `${Math.min(fa, fb) * 100}%`;
    loopSpan.style.width = `${Math.abs(fb - fa) * 100}%`;
  }

  function clearLoop(why) {
    const wasLive = live && loopA != null;
    stopLap();
    loopA = loopB = null;
    filling = false; fillEnds = null;
    clearFill();
    setBlink(false);
    drawLoop();
    reportLoopPos(null);
    onLoop?.('off', null, null);
    // A live source goes back to now when its loop ends.
    // why: lessons/kit-transport-bar.md#live-loop-off
    if (wasLive) doSeek(deck.range[1]);
    /**
     * `why` names which path cleared the loop, for the reader; the badge says nothing about it.
     * why: lessons/kit-transport-bar.md#no-loop-note
     */
    clearNote();
  }

  /**
   * The loop says nothing in words: a deck with no end gets a disabled button instead.
   * why: lessons/kit-transport-bar.md#no-loop-words
   */
  loopBtn.disabled = !seekable;
  if (!seekable) loopBtn.title = 'this source has no end to come back to';

  loopBtn.addEventListener('click', () => {
    // Asked of the deck: `seekable` is the flag the scrub and the harness also read.
    // why: lessons/kit-transport-bar.md#seekable
    if (!seekable) return;
    const pos = deck.position();
    if (loopA == null) {
      /**
       * A press on a stopped transport starts it; parked at the end, it means from the top.
       * why: lessons/kit-transport-bar.md#press-starts
       */
      let at = pos;
      const rolling = deck.playing?.() ?? false;
      if (!rolling && !live && endStop && (atEnd || pos >= range[1])) {
        leaveEnd(range[0]);
        at = range[0];
      }
      loopA = at; loopB = null;
      // On a live deck the press opens a window ahead of it and the page is told at once.
      // why: lessons/kit-transport-bar.md#live-window-ahead
      filling = live;
      fillEnds = live ? loopA + liveWindowMs : null;
      drawLoop();
      if (filling) { onLoop?.('fill', loopA, fillEnds); armFill(); }
      else if (!rolling) cmd.play();
      return;
    }
    if (loopB == null) {
      // A loop marked backwards is swapped; only a zero-length one is refused.
      // why: lessons/kit-transport-bar.md#backwards-loop
      const a = Math.min(loopA, pos), b = Math.max(loopA, pos);
      // Silently, and it stays armed: a second press on the same frame means nothing.
      // why: lessons/kit-transport-bar.md#zero-length
      if (b - a < 1) return;
      startLoop(a, b);
      return;
    }
    clearLoop();
  });

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
    /**
     * A key aimed at another bar is that bar's, and a bar inside a hidden `data-own-keys` panel
     * (tab-page.mjs) hears nothing. A key from the body still reaches every bar.
     * why: lessons/kit-transport-bar.md#own-keys
     */
    if (tg instanceof Element) { const owner = tg.closest('.tbar'); if (owner && owner !== bar) return; }
    if (bar.closest('[data-own-keys][hidden]')) return;
    const [a, b] = range;
    const span = b - a;
    const cur = deck.position();
    const step = e.shiftKey ? span * 0.1 : span * 0.02;
    // No space key on a bar with no toggle.
    // why: lessons/kit-transport-bar.md#no-space
    if (e.key === ' ') { if (!wantToggle) return; e.preventDefault(); pressToggle(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); doSeek(Math.min(b, cur + step)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); doSeek(Math.max(a, cur - step)); }
    else if (/^[0-9]$/.test(e.key)) { e.preventDefault(); doSeek(fracToPos(Number(e.key) / 10)); }
    else return;
  }
  addEventListener('keydown', onKey);

  /**
   * ── published for CDP ───────────────────────────────────────────────────
   * This is `window.__demo.transport`. The return value of `createTransportBar` carries it as
   * `.api`; never assign the return value there, it has no `position`.
   * why: lessons/kit-transport-bar.md#api
   */
  const api = {
    /**
     * The bar's own element, so a check presses this bar and not the first in the document.
     * why: lessons/kit-transport-bar.md#api-el
     */
    el: bar,
    /**
     * The `on air` badge, or null. `seen()` only when sound arrives, never on a press or timer.
     * why: lessons/kit-transport-bar.md#api-live
     */
    live: liveChip,
    get position() { return deck.position(); },
    /**
     * Forced false on a bar with no toggle: it does not own a deck started elsewhere.
     * why: lessons/kit-transport-bar.md#api-playing
     */
    get playing() { return wantToggle ? (deck.playing?.() ?? false) : false; },
    /** whether this bar has a play button at all. `demo/verify.mjs` reads it
     *  before pressing one. */
    get toggles() { return wantToggle; },
    get rate() { return typeof deck.rate === 'function' ? deck.rate() : deck.rate; },
    get range() { return deck.range; },
    get rangeGen() { return deck.rangeGen?.() ?? 0; },
    get lattice() { return lattice; },
    get degraded() { return badge.textContent || null; },
    get seekable() { return seekable; },
    /** null when there is none; `[a, b]` while one is running. The harness
     *  grades the loop from here rather than from the button's label. */
    get loop() { return loopA != null && loopB != null ? [loopA, loopB] : null; },
    /** which way the next lap runs: 'round' | 'back' | 'pingpong'. A check
     *  reads this rather than the glyph on the button. */
    get way() { return wayName(); },
    get loopArmed() { return loopA != null && loopB == null; },
    /** live only: the window is open and the live edge is filling it. */
    get loopFilling() { return filling; },
    /** where the window will close, so a check can say how much is left */
    get loopFillEnds() { return fillEnds; },
    /** how much live sound one loop may hold, in ms */
    get loopWindowMs() { return liveWindowMs; },
    /**
     * The warning is running. Graded here, since the blink is JavaScript with no class.
     * why: lessons/kit-transport-bar.md#api-loop-blinking
     */
    get loopBlinking() { return blinking; },
    /** 0..1 through a running loop, or null. The same number `onLoopPos` pushes. */
    get loopFrac() { return lastLoopFrac; },
    /** press it the way a finger does, so a check drives the real handler */
    pressLoop() { loopBtn.click(); },
    /**
     * A `loopExtras` button by id. On `api` as well as the return value, because `api` is the
     * only handle a CDP check has.
     * why: lessons/kit-transport-bar.md#api-loop-extra
     */
    loopExtra: (id) => loopExtraEls.get(id) || null,
    /** a `loopSlot` button by id. Always on the bar; see the option. */
    slot: (id) => loopSlotEls.get(id) || null,
  };
  /**
   * A page with two bars says which is its transport with `publish: false` on the other;
   * opt-out, so every one-bar page keeps publishing.
   * why: lessons/kit-transport-bar.md#publish
   */
  if (window.__demo && publish !== false) window.__demo.transport = api;

  const stop = observePosition(deck.transport, paint, { hz: 60 });
  syncRates();
  drawLoop();
  paint({ pos: deck.position() });

  // What the page holds, not what the harness reads (see `api`).
  // why: lessons/kit-transport-bar.md#return-value
  return {
    el: bar,
    api,
    /** the `on air` badge, or null. The same object as `api.live`; see there. */
    live: liveChip,
    /** what this bar was built with — so a page can assert the setting it
     *  passed rather than an effect that has to be waited for. */
    endStop, commanded: !!command,
    /** an `extras` button by id, so a page can relabel or disable it */
    extra: (id) => extraEls.get(id) || null,
    /** a `loopExtras` button by id. It is hidden unless a loop is running, or
     *  it was declared `always`, in which case it is always on the bar. */
    loopExtra: (id) => loopExtraEls.get(id) || null,
    /** a `loopSlot` button by id. Always on the bar; see the option. */
    slot: (id) => loopSlotEls.get(id) || null,
    note,
    destroy() {
      stop();
      stopLap();          // a frame loop outliving its bar seeks a dead deck
      clearEnd();
      clearFill();
      setBlink(false);
      // `follow()` runs an interval of its own, and one outliving its bar is a
      // timer deriving a state nothing will ever draw.
      liveChip && liveChip.stop();
      offState && offState();
      removeEventListener('keydown', onKey);
      bar.remove();
      if (window.__demo && window.__demo.transport === api) window.__demo.transport = null;
    },
  };
}

/**
 * Intersection of every declared caps.rates lattice. null = none declared.
 * Reads the live registry via `deck.caps()`, not `deck.adapters`, which misses adapters a
 * nest registers later.
 * why: lessons/kit-transport-bar.md#lattice-for
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

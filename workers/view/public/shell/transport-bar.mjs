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
//   · a LIVE deck loops over a window that fills at the live edge — the bar
//     owns the two numbers and the page owns the sound (see `liveWindowMs`)

import { observePosition } from '/timeline/transport.mjs';
import { el } from './shell.mjs';
import { createChoice } from './choice.mjs';
// 🔴 ONE TABLE FOR WHICH WAY A LOOP RUNS, AND IT ALREADY EXISTS. `looper.mjs`
// owns the vocabulary because it owns the audio version of this control; a
// second copy of the three glyphs here is how two pages end up disagreeing
// about what the middle one means. `looper.mjs` imports nothing, so this is a
// leaf dependency and not a cycle.
import { WAY_GLYPH, WAY_SAYS, LOOP_TURN, LOOP_WAYS } from './looper.mjs';

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
  absolute = false, scrub: wantScrub = true, extras = [], fmt = null, live = false, publish = true,
  // 'play' (the default), 'record', or TWO WORDS as an array: what the toggle
  // says it does. See the note on the toggle itself.
  verb = 'play',
  // 🔴 `false` LEAVES THE LOOP BUTTON OFF, the way `scrub: false` already
  // leaves the slider off. A loop is a claim that hearing a passage twice is
  // worth a control, and that is true of a tape and of a live window and false
  // of a page whose subject is whether a file arrived intact. `/crate/` plays
  // an upload once to prove it came back whole, and LOOP there was a button
  // nobody had a reason to press.
  loop: wantLoop = true,
  /**
   * 🔴 `false` LEAVES THE PLAY BUTTON OFF, AND IT IS THE THIRD OF THIS FAMILY
   * AFTER `scrub: false` AND `loop: false`. Asked for 2026-09-16: *"bring
   * transport bar to keys but no play button, just online badge"*.
   *
   * WHY A BAR MAY HAVE NO TOGGLE. Play, pause and seek are all claims about a
   * POSITION inside a sound: somewhere it has got to, somewhere it could be
   * put instead. `/keys/` has none. A note sounds while a key is held, there is
   * nothing to start, nothing to resume, and stopping is not a state the page
   * can be in. A toggle there would be a control whose only honest behaviour is
   * to do nothing, which is the shape of control this project calls a lie. What
   * the bar still carries is the thing that IS true of the source: whether the
   * instrument in the other building is answering. That is the chip.
   *
   * ⚠️ IT DISARMS EVERY OTHER CLAIM THAT DEPENDED ON PLAYING, rather than
   * leaving them to read false by luck. `api.toggles` says so in one boolean so
   * a check can ask; `api.playing` is FORCED false rather than derived, because
   * a deck nobody starts can still be playing if a page started it another way
   * and the bar has no business reporting that as its own state; the space bar
   * stops being a play/pause key, because a key that toggles an absent button
   * is worse than a missing shortcut; and the end-stop never arms, since there
   * is no end to arrive at.
   * ⚠️ AND `demo/verify.mjs` READS `api.toggles` BEFORE ITS PLAY DRILL. That
   * drill clicks `.tbar-toggle` and asserts the position advanced, so without
   * the flag a bar with no toggle would take the harness red on a page where
   * nothing is wrong. There is no such page in the suite today, since `/keys/`
   * is `built: false`, and the guard is here because the next one will be.
   *
   * 🔴 THE GUARD WAS PROVED BY BREAKING IT, AND THE BREAK FOUND A SECOND THING.
   * MEASURED 2026-09-16: forcing this getter false took `/knobs/` from 34/34 to
   * **11/11, still green** — the skip line printed, the two drill asserts went,
   * and TWENTY-ONE MORE went with them. That drill's click is what starts the
   * page: `/knobs/` declares `controls: []`, so the toggle is the only control
   * a harness presses, and every check it has sits behind `startNote()`.
   * ⚠️ SO A PAGE THAT PASSES `toggle: false` MUST NOT PUT ITS CHECKS BEHIND A
   * PRESS. There is no press. Nothing is wrong on `/keys/`, which declares no
   * asserts at all, and this is written down because the next page to take this
   * option will not be so lucky, and 23 asserts vanishing while the run stays
   * green is the worst shape a loss takes.
   */
  toggle: wantToggle = true,
  /**
   * 🔴 THE CLOCK IS OPTIONAL, AND A PAGE WITH A STRIP IS WHY. Asked 2026-09-18:
   * *"rm times from transport bar"*, on a page whose strip already carries the
   * position — the second half of the same report that took the slider off it
   * (*"no need for slider / times in transport lane"*).
   *
   * This is the standing "one position surface per page" rule reaching the one
   * control it had not reached. `scrub: false` already takes off the bar's
   * SLIDER where a strip is present, on the reasoning that two horizontal time
   * axes at different scales, stacked, is a contradiction rather than a
   * redundancy. The clock is the same quantity a third time, in digits: the
   * strip has a playhead, a ruler with numbers on it, and a gutter, so
   * `0:04.120 / 3:00.000` beside it is a number nobody reads off the bar.
   *
   * ⚠️ IT DEFAULTS ON, because a bar with NO strip is the common case and there
   * the clock is the only thing that can say where you are.
   * ⚠️ AND IT DOES NOT TOUCH THE LIVE CHIP OR A PAGE'S OWN `chip`, which sit in
   * the same slot and carry a different fact. Those are already exclusive of
   * each other and of the clock; this only says the clock's own case is off.
   */
  time: wantTime = true,
  /**
   * 🔴 WHAT TAKES THE LOOP BUTTON'S PLACE ON A BAR THAT HAS NO LOOP. Asked for
   * in those words, 2026-09-16: *"just replace looper with fullscreen button
   * (make component slot-able)"*, for `/videoradio/`, whose bar wants a ⛶ where
   * `/radio/` has LOOP.
   *
   * ⚠️ IT IS A SEPARATE OPTION FROM `loopExtras` BECAUSE THOSE TWO MEAN
   * DIFFERENT THINGS, and reusing one for the other would be a name that lies.
   * A `loopExtras` button acts ON a loop and is hidden until there is one; a
   * `loopSlot` button has nothing to do with looping and is simply what this bar
   * keeps in that position. `/videoradio/`'s ⛶ is not a loop control that
   * happens to be visible, it is the only thing in that slot.
   *
   * Same declaration shape as `extras`: `{ id, label, aria, title, onPress }`.
   * Reachable afterwards as `bar.slot(id)`, so a check can press the real
   * control and a page can relabel one.
   */
  loopSlot = [],
  /**
   * 🔴 BUTTONS THAT BELONG TO THE LOOP, SHOWN ONLY WHILE ONE IS RUNNING.
   * `extras` sit by the play toggle and are always there, which is right for a
   * transport verb like record and wrong for a thing that can only act on a
   * loop: a control that is visible and inert is this project's named failure.
   * These sit immediately RIGHT of the LOOP button, because that is the thing
   * they modify, and they appear and vanish with it. ⚠️ THEY WERE ON THE LEFT
   * AND WERE MOVED, ASKED FOR IN THOSE WORDS: *"move loop mode to right not
   * left"*. LOOP is the verb and the extra is what it does; reading `[LOOP|→]`
   * left to right gives the action and then its adverb, where `[→|LOOP]` gave
   * a glyph with nothing yet to modify.
   * `[{ id, label, aria, title, always, onPress(btn) }]`. `onPress` gets the
   * button, so a page can read and set `aria-pressed` and keep the state where
   * the DOM already holds it rather than in a second variable beside it.
   *
   * 🔴 `always: true` KEEPS ONE ON THE BAR WITH NO LOOP RUNNING, AND IT IS NOT
   * AN EXCEPTION TO THE RULE ABOVE. That rule is about a control that can do
   * nothing until there is a loop. A button that says WHICH WAY the next loop
   * will play can be pressed before there is one and changes what the next
   * press of LOOP does, so it is neither inert nor hidden: it is the same
   * distinction `caps.mjs` draws between a thing you cannot do and a thing you
   * have not done yet. `/radio/` uses it for the direction button glued to
   * LOOP, which is why the group below exists.
   */
  loopExtras = [],
  /**
   * 🔴 THE THREE DIRECTIONS, FOR A LOOP THE DECK ITSELF PLAYS. Asked for
   * 2026-09-16: *"in draw allow < > <> loop mode"*.
   *
   * A page with an `AudioContext` gets this from `looper.mjs`, which mirrors a
   * kept buffer and plays the copy. A page whose loop is a DECK has no buffer
   * to mirror, and the deck cannot help: `transport.setRate` throws on a
   * negative rate in as many words, `negative rate unsupported in v0`. So the
   * bar drives a reversed lap itself, from its own clock, seeking the deck
   * frame by frame while it is paused. See `startLap` below.
   *
   * ⚠️ NOT FOR A MEDIA-BACKED PAGE. `/replay/` refused these on the argument
   * that a picture only runs forwards, and that argument still holds wherever
   * the deck is a FOLLOWER of an element: seeking it backwards fights whatever
   * is mastering it. This is for a deck that IS the thing being played, which
   * on this site means a drawn record rather than a recording.
   */
  loopWays = false,
  /**
   * 🔴 AN ELEMENT IN THE LIVE CHIP'S PLACE. `/knobs/` asked for it in those
   * words: *"on knobs: replace live"*. That position holds the one fact about
   * the source that is not a number, and on a page playing an instrument in
   * another building the fact worth having there is whether the instrument is
   * answering at all. A `LIVE` chip and a presence badge are two claims about
   * one source in one slot, so the bar takes either and refuses both.
   */
  chip = null,
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
  /**
   * Called with the new rate the instant a rate button is pressed.
   *
   * 🔴 IT REPLACES A POLL, AND THE POLL WAS A THIRD OF A REPORTED DELAY.
   * `/radio/` owns the thing the rate actually acts on (an Icecast playout,
   * not this deck's playhead), and the only way it could learn about a press
   * was to read `deck.targetRate()` on a timer. That timer was 1 Hz — *"why
   * rate change is so slooooooooow"* — then 120 ms, which is better and is
   * still up to 120 ms of a control doing nothing before anything is even TOLD.
   * `applyRate` is the single funnel for every rate change in this bar (the
   * keyboard table has no rate keys), so a callback here is complete.
   */
  onRate = null,
  /**
   * `() => boolean` — is the armed rate not yet audible?
   *
   * ⚠️ THE BAR CANNOT KNOW THIS AND MUST NOT GUESS. Whether a speed has
   * arrived is a fact about whatever is making the sound: a media element is
   * there the same frame, and a stream with 600 ms of audio already scheduled
   * is not. A deck that says nothing gets no pulse, which is the honest
   * default — a bar that animated on a timer would be inventing a wait.
   */
  settling = null,
  /**
   * Called when the loop changes or comes round:
   * `('fill'|'set'|'wrap'|'off', a, b)`.
   * ⚠️ A WRAP IS AN EVENT AND THE BAR IS THE ONLY THING THAT KNOWS IT HAPPENED —
   * the deck is told to seek and has no idea why. A page that draws the audio
   * can put the moment on its own picture; `/tapes/` marks it on the wave.
   *
   * `fill` is the live case and it is the one a page must act on: the window
   * has opened at `a` and will close at `b`, so whatever is holding the sound
   * starts keeping it NOW. The bar holds no audio of its own.
   */
  onLoop = null,
  /** `(way)` — 'round' | 'back' | 'pingpong', when the direction button is
   *  pressed. A page that says what its loop is doing elsewhere reads it here;
   *  the button's own face already carries the state. */
  onWay = null,
  /**
   * How much live sound one loop may hold, in milliseconds.
   *
   * 🔴 A LIVE LOOP NEEDS A CEILING OR IT IS A RECORDING WITH NO END. The first
   * press opens the window and the live edge fills it at one second per second;
   * without a limit the only way it ever closes is a second press, which is a
   * control you can leave running.
   *
   * 20 s is long enough for a phrase of music or a spoken sentence and short
   * enough to sit through while it fills, and it is far inside the three minute
   * window the one live deck in this repo declares. ⚠️ IT IS A DEFAULT, NOT A
   * MEASUREMENT: the bar cannot know how many seconds a page can really keep.
   * A page that holds a ring of its own passes that ring's length here, and
   * then the button promises exactly what the page can deliver.
   */
  liveWindowMs = 20000,
  /**
   * Where the playhead is INSIDE a running loop, 0..1, and `null` once when
   * there is no loop. A page that draws the sound can run its own playhead
   * across a frozen picture from this; `grain-scope.mjs` takes exactly that.
   *
   * ⚠️ PUSHED FROM THIS BAR'S PAINT, NOT POLLED BY THE PAGE. `observePosition`
   * is already running at 60 Hz here, and a second rAF loop in a page is the
   * thing this file exists to stop.
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
   * 🔴 `verb: 'record'` MAKES THE TOGGLE A RECORD BUTTON. Asked 2026-09-18 for
   * `/stage/`: *"replace play with record button in controlroom"*. A control
   * room's one press does not start playback of anything, it puts a show on air
   * and writes it down, and a ▶ on it was describing the wrong verb.
   * ⚠️ IT IS A CLASS AND A LABEL, NOT A SECOND BUTTON. The element, its
   * `.tbar-toggle` class, its `data-state` and everything that presses it are
   * untouched, so `demo/verify.mjs`'s play drill and every page holding the bar
   * keep working. Only the glyph and what a screen reader hears change.
   */
  /**
   * 🔴 `verb: ['start', 'stop']` MAKES THE TOGGLE TWO WORDS INSTEAD OF A GLYPH.
   * Asked 2026-09-19 for `/stage/`: *"replace timeline-glued transport record
   * button with start | stop text labels (same w)"*. A red dot says WRITING,
   * and that bar's press also puts a show on air, so the dot described half of
   * it. A word can say the whole thing.
   *
   * 🔴 BOTH WORDS ARE IN THE BUTTON AT ONCE AND THE HIDDEN ONE STILL TAKES ITS
   * SPACE, which is what makes the two states the same width without anybody
   * measuring anything. `shell.css` puts them in one grid cell and hides the
   * inactive one with `visibility`, so the button is always as wide as the
   * longer word, in any font. The alternative, swapping `textContent`, is a
   * control that changes size under the pointer that just pressed it.
   * ⚠️ REFUSED AT CONSTRUCTION, WHERE THE STACK STILL SAYS WHO ASKED. One word,
   * three words, or a number would each fail in a different quiet way: one word
   * gives a toggle that never changes, and three render on top of each other.
   */
  const WORDS = Array.isArray(verb) ? verb : null;
  if (WORDS && (WORDS.length !== 2 || WORDS.some((w) => typeof w !== 'string' || !w.trim()))) {
    throw new Error('createTransportBar: verb as words is exactly two non-empty strings'
      + ` (got ${JSON.stringify(verb)})`);
  }
  const RECORD = verb === 'record';
  const toggle = el('button', `tbar-toggle${RECORD ? ' tbar-rec' : ''}${WORDS ? ' tbar-word' : ''}`, '',
    { type: 'button',
      'aria-label': WORDS ? `${WORDS[0]}/${WORDS[1]}` : RECORD ? 'record/stop' : 'play/pause' });
  // ⚠️ TWO SPANS, NOT ONE THAT GETS REWRITTEN. The stylesheet decides which one
  // is visible from `data-state`, which the bar already maintains, so there is
  // no second place that has to remember which word is showing.
  if (WORDS) toggle.append(el('span', 'tbar-w0', WORDS[0]), el('span', 'tbar-w1', WORDS[1]));
  const scrub = el('div', 'tbar-scrub', '', { role: 'slider', tabindex: '0', 'aria-label': 'position' });
  const fill = el('div', 'tbar-fill');
  const headDot = el('div', 'tbar-head');
  // The loop's own ground on the scrub, UNDER the fill and the head, so the
  // playhead is never behind it. A loop you cannot see the extent of is a
  // number in somebody's head.
  const loopSpan = el('div', 'tbar-loopspan');
  loopSpan.hidden = true;
  scrub.append(loopSpan, fill, headDot);
  // `extras` — page buttons that belong to the TRANSPORT rather than beside it.
  // Recording is the case that earned this: on `take` it is a transport verb,
  // not a side control, and putting it in `.pos-controls` would have said it was
  // something you do to the page rather than to the playhead. They sit next to
  // the toggle and are returned by id so a page can relabel or disable one.
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
   * 🔴 A BAR MAY NOT DECLARE BOTH A LOOP AND SOMETHING IN THE LOOP'S PLACE.
   * They render into one position, so the two together are an author asking for
   * a layout that does not exist, and the failure without this would be silent:
   * whichever came last in the append would win and the other would simply not
   * be on screen. Refuse at construction, where the stack still says who asked.
   */
  if (loopSlot.length && wantLoop) {
    throw new Error('createTransportBar: loopSlot needs loop: false'
      + ` (${loopSlot.length} button(s) asked for the loop's place while the loop is on)`);
  }
  const loopSlotEls = new Map();
  for (const x of loopSlot) {
    /**
     * 🔴 `tbar-slot`, NOT `tbar-x`, AND THE REASON IS THE HARNESS. `verify.mjs`
     * presses `.pos-controls button, .tbar-x` on every page, because `.tbar-x`
     * means "a button the PAGE put in the transport" and those are worth
     * exercising. This slot is not that: `/videoradio/` keeps a ⛶ in it, and a
     * suite that presses it leaves the page full screen for every check after
     * it, including the page's own full screen check, which would then find
     * somebody already full screen and decline to grade. The loop button is
     * kept out of that selector for exactly the same reason and says so in
     * `shell.css`.
     * ⚠️ IT LOOKS IDENTICAL. `shell.css` gives `.tbar-slot` the same rule as
     * `.tbar-x`; what differs is who presses it, not what it is.
     */
    const b = el('button', 'tbar-slot', x.label,
      { type: 'button', 'aria-label': x.aria || x.id });
    b.dataset.id = x.id;
    if (x.title) b.title = x.title;
    // ⚠️ NEVER HIDDEN. That is the whole difference from `loopExtras`, which
    // wait for a loop to act on.
    b.addEventListener('click', () => x.onPress?.(b));
    loopSlotEls.set(x.id, b);
  }

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

  // ⚠️ TWO LINES, NOT ONE. `0:00.902 / 3:55.076` is thirteen mono characters of
  // which one is a slash, and it was the widest fixed thing on the bar —
  // enough, with a LOOP button beside it, to push the rate group onto a second
  // row. Stacked it is half the width and the two numbers stop being one long
  // number with punctuation in the middle: where you are, and how long it is.
  const time = el('output', 'tbar-time');
  const timeNow = el('span', 'tbar-now', '0:00.000');
  const timeAll = el('span', 'tbar-all', '');
  time.append(timeNow, timeAll);
  const rates = el('div', 'tbar-rates');
  const badge = el('span', 'tbar-badge');
  /**
   * 🔴 A LIVE SOURCE HAS NO CLOCK WORTH PRINTING. On an Icecast mount the left
   * half of `19:33:46.098 / 3:00.000` is the wall clock, which the machine
   * already shows, and the right half is a duration a live stream does not
   * have. REPORTED as *"transport timers are pointless here. what about LIVE
   * label"*, and they were: two numbers, neither of which anybody can act on.
   *
   * ⚠️ IT SAYS `LIVE` AND NOTHING ELSE. It briefly read `SLOWED` at any armed
   * rate other than 1, and that is a second channel saying what the rate radio
   * group already says an inch to its right — the armed button IS the statement
   * that you are not at 1x. How far behind is a number and belongs in a readout
   * cell, which is the page's BEHIND. A chip carries one fact: this source has
   * no end.
   */
  const liveChip = live ? el('span', 'tbar-live', 'LIVE') : null;
  /**
   * 🔴 LOOP IS ON EVERY BAR, AND IT IS THREE PRESSES OF ONE BUTTON.
   *
   * Set the start, set the end, and the third press takes the loop off again.
   * One control rather than two, because two controls for the two ends of one
   * interval is a pair you can leave half-set — a start with no end is a
   * button that looks armed and does nothing, and there is no state in this
   * shape that isn't visible on the button's own face.
   *
   * ⚠️ IT IS NOT HIDDEN ON A DECK THAT CANNOT LOOP. A source with no end has
   * nothing to come back to, and the honest answer there is the button SAYING
   * so when it is pressed — the same rule `caps.mjs` follows for a demo a
   * browser cannot run. A control that vanishes says the feature does not
   * exist, which is a different and false statement.
   *
   * ⚠️ AND A LIVE SOURCE IS NO LONGER ONE OF THOSE. It used to answer *a live
   * station has no past to come back to*, which is true of the station and
   * false of the page: what a live loop plays is a window this bar opens and
   * the page fills. See the live-window block further down.
   */
  const loopBtn = el('button', 'tbar-loop tbar-word', 'LOOP',
    { type: 'button', 'aria-label': 'loop' });
  loopBtn.dataset.loop = 'off';
  loopBtn.title = live
    ? 'press to hold the live sound from here. it closes and plays when the window is full, or press again to end it sooner'
    : 'press to mark where a loop starts, again to mark the end, again to take it off';
  /**
   * 🔴 THE EXTRAS AND LOOP ARE ONE SEGMENTED CONTROL, NOT TWO BUTTONS WITH A
   * GAP. ASKED FOR IN THOSE WORDS: *"[→|LOOP] - two different buttons visually
   * together"*. They are two buttons and they stay two buttons — separate hit
   * areas, separate labels, separate aria — and what joins them is one shared
   * edge, because what the left one sets is a property OF the right one. At the
   * bar's ordinary 8 px gap the direction glyph read as another piece of
   * furniture that happened to be next to LOOP.
   * ⚠️ NO GROUP WHEN THERE IS NOTHING TO GROUP: a lone LOOP button goes
   * straight on the bar, so every page that declares no extras is untouched.
   */
  const loopPair = loopExtraEls.size && wantLoop ? el('div', 'tbar-loopgrp pos-seg') : null;
  if (loopPair) loopPair.append(loopBtn, ...loopExtraEls.values());
  if (chip && live) {
    throw new Error('createTransportBar: chip and live want the same position '
      + '(pass live: false, the chip can say LIVE itself if that is the fact)');
  }
  // the loop's position: whatever was put in the slot, or the loop itself
  const endSide = loopSlotEls.size ? [...loopSlotEls.values()]
    : loopPair ? [loopPair] : [...(wantLoop ? [loopBtn] : []), ...loopExtraEls.values()];
  /**
   * 🔴 THE ROW HAS ONE BOUNDARY AND THE FREE SPACE OPENS AT IT: EVERYTHING FROM
   * THE LOOP RIGHTWARDS SITS AT THE RIGHT END OF THE BAR. Asked 2026-09-19 as
   * *"reel: move loop to the right of transport"*, and it is a rule about this
   * row rather than a nudge on that page.
   *
   * The bar is two groups with a gap in the middle: the transport on the left
   * (play, a page's own verbs, the slider) and the loop, the rates and the
   * badge on the right. That was already true and was carried by whichever
   * member happened to be in the middle: the scrub grows (`flex: 1 1 56px`),
   * and `shell.css` gives the clock and the LIVE chip a `margin-right: auto`
   * with no slider present. Three members, three copies of one intention, and
   * a bar with NONE of them left had nobody holding the boundary: `/reel/`
   * passes `scrub: false` (it has a strip) and `time: false` (its position is a
   * date), so LOOP packed left against the ‹ › it used to sit a clock away
   * from. MEASURED at 1280: LOOP's left edge at 57 px with 375 px of empty bar
   * to the right of the rates.
   *
   * ⚠️ IT IS THE PROJECT'S EXISTING SPELLING FOR THIS, NOT A SECOND MECHANISM:
   * `data-end="1"` is what `.pos-controls` stamps for `end: true` in
   * `shell.mjs`, and it means the same thing here. `shell.css` says why the bar
   * needs its own selector for it.
   * ⚠️ AND IT IS UNCONDITIONAL, WHICH IS THE WHOLE POINT. Where something to the
   * left is already flexible the margin gets nothing and nothing moves: a
   * growing scrub eats the free space before auto margins are resolved, and the
   * clock's `margin-right: auto` shares the SAME gap, so half each lands the
   * group in exactly the same place. MEASURED both ways, unchanged to the
   * tenth of a pixel at 1280 and at 390.
   */
  if (endSide[0]) endSide[0].dataset.end = '1';
  bar.append(...(wantToggle ? [toggle] : []), ...extraEls.values(), scrub,
    ...(chip ? [chip] : live ? [liveChip] : wantTime ? [time] : []),
    ...endSide, rates, badge);
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
  // ⚠️ DECLARED UP HERE BECAUSE `buildRates()` RUNS AT CONSTRUCTION. It calls
  // `syncRates()`, which clears this — and a `let` further down the file is in
  // its temporal dead zone at that moment, so the constructor would throw
  // `Cannot access 'wasSettling' before initialization` and take the whole page
  // with it. That is exactly the failure HANDOFF records for the first attempt
  // at a rate lattice here: `__demo.ready — failed` and nothing else to go on.
  let wasSettling = null;
  function buildRates() {
    agen = deck.adapterGen?.() ?? 0;
    lattice = latticeFor(deck);
    rates.replaceChildren();
    rateChoice = null;
    /**
     * 🔴 `> 1`, NOT `length`. A LATTICE OF ONE IS NOT A CHOICE AND MUST DRAW
     * NOTHING. Found on `/replay/` 2026-09-16 and reported as *"what this
     * disconnected 1 does here?"* with a screenshot: its cue lane declared
     * `caps: { rates: [1] }`, the intersection came out as `[1]`, and
     * `createChoice` rendered a radio group with a single member, which is one
     * armed yellow button beside LOOP with nothing to choose it against.
     *
     * ⚠️ THE RULE WAS ALREADY WRITTEN AND WAS HONOURED FOR THE WRONG CASE. The
     * note on `latticeFor` says a deck with no rate lattice shows nothing
     * rather than a lone 1, and this guard enforced it only for an ABSENT
     * lattice. A lattice that exists and holds one value reaches the reader as
     * exactly the thing that note forbids.
     * ⚠️ CHECKED BEFORE CHANGING IT: `demo/jam/` and `demo/kit/` are the only
     * other places declaring a single rate, and neither asserts on the row, so
     * both simply stop drawing a button nobody could press meaningfully.
     */
    if (lattice && lattice.length > 1) {
      rateChoice = createChoice({
        // 🔴 NO `x`. Five buttons reading `0.25x 0.5x 1x 1.5x 2x` spend a fifth
        // of their width on a letter that is the same on every one of them —
        // and a row of numbers under a transport is already unambiguously a
        // speed. The suffix was also what pushed the group onto a second line
        // at ordinary widths, which is a bar that changes height for a unit
        // nobody was reading. The armed one is marked by colour and fill; the
        // page's own words say what it is.
        options: lattice.map((r) => [String(r), r]),
        at: Math.max(0, lattice.indexOf(deck.targetRate?.() ?? 1)),
        onPick: (r) => applyRate(r),
      });
      // The harness and `syncRates` both read `data-rate` off the buttons, and
      // the component does not know about rates — so it is stamped here.
      rateChoice.buttons.forEach((b, i) => { b.dataset.rate = String(lattice[i]); });
      rates.append(rateChoice.el);
    }
    // 🔴 A DECK WITH NO RATE LATTICE SHOWS NOTHING, NOT A LONE "1".
    // This printed a grey 1 to be honest that there was no choice, and honesty
    // was not the problem: a control that can only ever read 1 is a structural
    // constant wearing a measurement's clothes, which is the thing CLAUDE.md
    // throws a readout out for. It taught a reader to look at a spot where
    // nothing will ever happen. The absence of a rate group already says there
    // is no choice, and says it without occupying anything.
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
    // ⚠️ BEFORE `syncRates`, so the page has already armed whatever it owns by
    // the time the pulse is decided. The other order asks `settling()` about a
    // rate the page has not been told about yet, which reads as "arrived" for
    // one frame and then starts pulsing — a flicker on every press.
    onRate?.(r);
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
    // `fmt` — a page may say how a position READS. `0:03.910` is the right
    // answer for a deck of seconds and a meaningless one for a deck of 1965,
    // where the position is a date. Default unchanged; a page that needs
    // calendar time supplies a formatter rather than the bar guessing.
    // ⚠️ `fmt` STILL GETS THE WHOLE LINE. A page that supplies a formatter is
    // saying how a position READS — `/tapes/` prints a date — and splitting its
    // answer on a slash it did not put there would be this bar editing a page's
    // own words.
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
    // 🔴 THE WRAP, RATE-LIMITED, AND THE LIMIT IS NOT A SAFETY MARGIN — IT IS
    // THE FIX. A seek is not instant on every kind of deck, so the frame after
    // one is asked for can still report a position past the end, which asks
    // for another, which is a seek storm that reads as a stuck playhead. This
    // repo has the general form already written down: *a recovery action is
    // not free — rate-limit it.*
    // ⚠️ AND ONLY WHILE ROLLING. Wrapping a paused deck would drag the playhead
    // back under somebody who is scrubbing inside their own loop.
    // ⚠️ NOT WHILE THE LAP DRIVER HAS IT. That loop owns both edges and wraps
    // on its own clock; this one would wrap it a second time at the far end.
    if (!lapRaf && loopA != null && loopB != null && playing && pos >= loopB) {
      const t = performance.now();
      if (t - lastWrap > 150) { lastWrap = t; doSeek(loopA); onLoop?.('wrap', loopA, loopB); }
    }
    // AND THE OTHER HALF OF THE SAME RULE, for a bar built with `endStop: false`
    // and for a deck whose end arrives without the timer: a start with no end,
    // rolling, that reaches the end of the source closes there and engages.
    if (playing && loopA != null && loopB == null && !filling && pos >= range[1]) closeAtEnd();
    // A loop is a claim about a range, so it cannot outlive one. A live deck's
    // range walks forward and will eventually leave the marks behind it; saying
    // so is better than looping over ground that is no longer there.
    //
    // 🔴 ONLY THE LEFT EDGE ON A LIVE DECK, AND THIS WOULD HAVE THROWN EVERY
    // LIVE LOOP AWAY THE INSTANT IT WAS MADE. A live range's right edge is the
    // present moment as the PAGE last published it, and the station page
    // publishes it once a second — while the deck's own position runs
    // continuously. So a window that ends exactly at the live edge reads as up
    // to a second PAST `range[1]`, and the test below would have cleared it,
    // with a badge blaming a range nobody can see. A live range can only be
    // outrun at the back.
    const outrunsEnd = !live && (loopB ?? loopA) > range[1];
    if (loopA != null && (loopA < range[0] || outrunsEnd)) {
      clearLoop('the loop ran off the back of what is still held');
    }
    // THE WARNING, WHICH IS A BLINK AND NOT A NUMBER — see setBlink. The last
    // quarter of the window is when the button starts saying it is about to
    // close itself, measured against the window that was actually opened rather
    // than against the option, so the two can never disagree.
    setBlink(filling && fillEnds != null && loopA != null
      && pos >= fillEnds - (fillEnds - loopA) * LIVE_WARN_FRAC);
    reportLoopPos(pos);
    syncPending();
  }

  /**
   * The armed rate button pulses until the speed is actually audible.
   *
   * ⚠️ ON THE PAINT LOOP, AND THE DOM IS TOUCHED ONLY WHEN THE ANSWER CHANGES.
   * `observePosition` already runs this at 60 Hz; writing a dataset attribute
   * sixty times a second would restart the CSS animation on every frame, which
   * is an animation that renders as a still.
   */
  function syncPending() {
    if (!rateChoice) return;
    const now = settling ? !!settling() : false;
    if (now === wasSettling) return;
    wasSettling = now;
    rateChoice.pending(now ? rateChoice.get() : null);
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

  /**
   * 🔴 ONE PRESS IS ENOUGH: THE END IS THE SECOND MARK. ASKED FOR 2026-09-16:
   * *"if not pressing loop again and playback reaches the end, mark loop right
   * mark as end and consider the state 'loop engaged'"*.
   *
   * So a start with no end is not a half-set control waiting for a hand any
   * more. Press once and let it run, and what you get is a loop from there to
   * the end of the source, running, with the button on. Press a second time on
   * the way and you get the shorter loop you marked, which is what it always
   * did. ⚠️ A ZERO LENGTH ONE IS STILL REFUSED: a mark on the last frame has no
   * room in front of it, and the end behaves normally there.
   * ⚠️ AND NOT ON A LIVE DECK, where a start with no end is a window being
   * FILLED and already has its own way of closing. `filling` says which.
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
  // Parked at the end, the play button REPLAYS. This is what a sequencer does:
  // stop at the end and leave the playhead there — the final state is worth
  // looking at, and here it is literally the fold of every event — then send
  // the transport back to the start when you ask for play again. Restarting is
  // well defined in this library in a way it is not for a media element: a
  // backward seek replays each event exactly once.
  toggle.addEventListener('click', () => {
    // A reversed lap is playing even though the deck is not, so pausing one is
    // stopping the driver rather than pausing a transport that is already
    // stopped. Pressing play again picks the lap up where it left off.
    if (lapRaf) { stopLap(); return; }
    if (deck.playing?.()) return cmd.pause();
    if (loopA != null && loopB != null && wayName() !== 'round') return startLap();
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

  // ── the loop ────────────────────────────────────────────────────────────
  let loopA = null, loopB = null, lastWrap = 0;

  /**
   * 🔴 A LIVE SOURCE GETS A LOOP TOO, AND WHAT IT LOOPS OVER IS A WINDOW THAT
   * FILLS IN REAL TIME.
   *
   * This used to refuse at the press: *a live station has no past to come back
   * to*. That is true of the station and false of the page, which can keep the
   * last few seconds of what arrived. So the first press marks the start and
   * OPENS a window, the live edge fills it at one second per second, and when
   * it is full the loop is finished and starts playing. A second press before
   * that ends it early; a press after it takes it off.
   *
   * ⚠️ THE BAR HOLDS NO AUDIO, AND CANNOT. It owns the window in the deck's own
   * time and says when it opened, closed and came round; the page owns the
   * sound and hears those through `onLoop`. A page that does not listen gets a
   * playhead that loops over silence, which is why `fill` is an event and not
   * an internal state change.
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
   * 🔴 A WARNING, NOT A COUNTDOWN. A number ticking down is a readout: it asks
   * to be read, and there is nothing a reader can do with the digits. The blink
   * says the one thing there is to say, which is that the window is about to
   * close itself.
   *
   * ⚠️ IT ANIMATES OPACITY AND NOTHING ELSE. The word on the face never
   * changes, the padding never changes, and neither does the border — so the
   * rate picker and the clock beside it stay exactly where they are. That is
   * the rule this button already carries for its three states, and a blink that
   * grew a glow or a letter would break it in a new way.
   *
   * ⚠️ REDUCED MOTION GETS A STEADY DIM RATHER THAN NOTHING. Somebody who asked
   * for less movement still has to be told the window is closing. `shell.css`
   * already does exactly this for a busy button. It is built here rather than
   * in the stylesheet because the animation belongs to this control and to no
   * other, and because the global reduced-motion rule in `shell.css` switches
   * CSS animations off outright — which for a warning would be silence.
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
   * ⚠️ A COMMITTED ONE-SHOT, NOT A CHECK ON THE PAINT LOOP, for the same reason
   * `armEnd` is one: `observePosition` runs off requestAnimationFrame, so in a
   * hidden tab the window would go on filling forever and the loop would never
   * close. Re-armed from `onState` beside `armEnd`, because a play, a pause, a
   * rate or a seek each move the instant at which the window is full.
   *
   * A paused deck gets no timer at all, and that is right: nothing is arriving,
   * so nothing is filling.
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
   * 🔴 A LAP THE BAR DRIVES ITSELF, BECAUSE THE DECK WILL NOT RUN BACKWARDS.
   * `transport.setRate` throws `negative rate unsupported in v0`, so `←` and
   * `⇆` cannot be a rate. What they are instead: the deck is PAUSED and this
   * seeks it once a frame from the bar's own clock, which is the same
   * arithmetic `looper.mjs` does to a buffer and is the only place in this file
   * that owns a frame loop.
   *
   * ⚠️ `observePosition` KEEPS TICKING WHILE THE DECK IS PAUSED (it is a plain
   * rAF, checked rather than assumed), so the clock, the fill and the head in
   * this bar follow a reversed lap without a second painter.
   * ⚠️ AND THE TOGGLE HAS TO KNOW. `deck.playing()` is false for the whole of a
   * reversed lap, so `rolling()` below is what everything in this file asks
   * instead: a bar showing PAUSE over a moving playhead is a control lying
   * about the state it is in.
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
    // 🔴 THE WORD NEVER CHANGES, BECAUSE A CONTROL THAT RESIZES ITSELF MOVES
    // EVERY CONTROL BESIDE IT. It said LOOP, then END, then LOOP again, and
    // three characters against four is enough to shove the rate picker and the
    // clock sideways every time somebody pressed it. That is the same defect as
    // a live sentence reflowing under a picture: nothing that changes while you
    // are looking at it may change how much room it takes. State is carried by
    // `data-loop`, which paints, and by the label a screen reader is given,
    // which has no width.
    //
    // ⚠️ A FILLING WINDOW IS THE `armed` STATE AND KEEPS ITS PAINT. It is a
    // start with no end yet, which is what `armed` already means, so the live
    // case needs no fourth colour and no stylesheet of its own. What the live
    // case adds is the blink, which is opacity and takes no room.
    loopBtn.dataset.loop = on ? 'on' : loopA != null ? 'armed' : 'off';
    // 🔴 AND THE PICTURE IS TOLD. The bar owns the loop and keeps two numbers;
    // a strip drawing the same deck had no way to learn about them, so every
    // page with both drew a picture of time with the loop missing from it.
    // `deck.setLoopView` is the one object the two share. The state published
    // is the same word this button is wearing.
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
    // A LIVE SOURCE HAS ONE POSITION THAT MEANS ANYTHING ONCE THE LOOP IS OFF,
    // and it is now. Leaving the playhead where the loop was would park it in a
    // past the station has stopped sending, with a LIVE chip above it saying
    // otherwise.
    if (wasLive) doSeek(deck.range[1]);
    /**
     * 🔴 THE BADGE SAYS NOTHING ABOUT A LOOP ENDING. ASKED FOR, MORE THAN ONCE.
     *
     * `why` is still passed and is still the reason, because a caller reading
     * this code needs to know which of four paths cleared the loop. What it no
     * longer does is put that reason on screen. Every one of those sentences is
     * longer than the 60 characters the badge shows, so what a person actually
     * saw was `THE LOOP RAN OFF THE BACK OF WHAT IS ST…` sitting in the
     * transport, and CLAUDE.md is explicit that anything truncating with an
     * ellipsis is in the wrong place rather than in need of a wider box.
     *
     * It is also not news. The loop ending is visible: the LOOP button goes
     * dark, the band leaves the slider, the sound changes. A line of prose
     * saying so is a third channel repeating what two already carried.
     * ⚠️ THE BADGE ITSELF STAYS for the things it is right for, which are
     * states a page cannot see any other way: a degraded source, a refused
     * rate. Those are reported by their own callers and are not this.
     */
    clearNote();
  }

  /**
   * 🔴 THE LOOP SAYS NOTHING IN WORDS. ASKED FOR IN THOSE WORDS, 2026-09-16,
   * WITH A PHOTOGRAPH OF THE BADGE: *"rm all loop messages."*.
   *
   * Two sentences used to appear in the transport when a press was refused:
   * `this source has no end to come back to` and `the two marks are in the same
   * place`. Both were true and neither was worth a line of prose in a bar six
   * controls wide. A deck with no end gets a DISABLED button instead, which
   * says the same thing before you press rather than after; two marks in one
   * place is now almost unreachable, because a press on a stopped transport
   * starts it rather than leaving the playhead where the next press will land.
   * ⚠️ THE BADGE ITSELF STAYS for what it is right for, which is a degraded
   * source and a refused rate. Neither of those is about a loop.
   */
  loopBtn.disabled = !seekable;
  if (!seekable) loopBtn.title = 'this source has no end to come back to';

  loopBtn.addEventListener('click', () => {
    // ⚠️ ASKED OF THE DECK, NOT OF THE BAR. `seekable` is the one fact that
    // decides whether a loop can exist at all, and it is the same flag the
    // scrub and the harness read, so the three cannot disagree.
    if (!seekable) return;
    const pos = deck.position();
    if (loopA == null) {
      /**
       * 🔴 A PRESS ON A STOPPED TRANSPORT STARTS IT. ASKED FOR 2026-09-16:
       * *"when not playing and prssing loop, playback should start"*.
       *
       * The old shape needed the transport to be rolling already, and pressing
       * LOOP twice on a stopped deck put both marks in the same place, because
       * nothing moved between them. That is the state the badge was reporting.
       * ⚠️ PARKED AT THE END, A PRESS MEANS FROM THE TOP. Marking the start of
       * a loop at the last frame is a loop of nothing, and the play button
       * already treats a press at the end as a restart, so the two agree.
       */
      let at = pos;
      const rolling = deck.playing?.() ?? false;
      if (!rolling && !live && endStop && (atEnd || pos >= range[1])) {
        leaveEnd(range[0]);
        at = range[0];
      }
      loopA = at; loopB = null;
      // 🔴 A LIVE DECK HAS NOTHING BEHIND THIS PRESS, SO THE WINDOW IS AHEAD OF
      // IT. On a recording both marks are behind you and the second press picks
      // the end; on a station the sound the loop will play has not arrived yet,
      // so the press opens a window instead and the live edge fills it. The
      // page is told at once, because it is the thing that has to start keeping
      // the audio — the bar keeps only the two numbers.
      filling = live;
      fillEnds = live ? loopA + liveWindowMs : null;
      drawLoop();
      if (filling) { onLoop?.('fill', loopA, fillEnds); armFill(); }
      else if (!rolling) cmd.play();
      return;
    }
    if (loopB == null) {
      // 🔴 A LOOP MARKED BACKWARDS IS STILL A LOOP SOMEBODY MEANT. Pressing
      // the second time after seeking BACK gives an end before the start, and
      // refusing it is a control punishing somebody for the order they worked
      // in. Swapped; only a zero-length one is refused, because that is the
      // press that landed on the same frame as the first and means nothing.
      const a = Math.min(loopA, pos), b = Math.max(loopA, pos);
      // Silently, and it stays armed. The press landed on the same frame as the
      // first one and means nothing; a sentence in the transport saying so was
      // removed on instruction, and with a press now starting the transport
      // this is a hand that pressed twice rather than a state anybody is in.
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
    const [a, b] = range;
    const span = b - a;
    const cur = deck.position();
    const step = e.shiftKey ? span * 0.1 : span * 0.02;
    // ⚠️ NOT ON A BAR WITH NO TOGGLE. The space bar is the keyboard's name for
    // the play button, so on a page that has none it would be a shortcut to a
    // control nobody can see, and on `/keys/` the space bar is over a piano.
    if (e.key === ' ') { if (!wantToggle) return; e.preventDefault(); deck.playing?.() ? cmd.pause() : cmd.play(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); doSeek(Math.min(b, cur + step)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); doSeek(Math.max(a, cur - step)); }
    else if (/^[0-9]$/.test(e.key)) { e.preventDefault(); doSeek(fracToPos(Number(e.key) / 10)); }
    else return;
  }
  addEventListener('keydown', onKey);

  // ── published for CDP; the plan's whole point ───────────────────────────
  /**
   * 🔴 THIS OBJECT IS WHAT `window.__demo.transport` HOLDS. THE RETURN VALUE OF
   * `createTransportBar` IS A DIFFERENT AND LARGER OBJECT, AND THE TWO ARE NOT
   * INTERCHANGEABLE. The line at the bottom of this file publishes `api`
   * itself; the thing handed back to the page is `{ el, api, extra, loopExtra,
   * slot, note, destroy, … }`, which CARRIES `api` as a property rather than
   * being it.
   * ⚠️ SO A PAGE MUST NEVER ASSIGN THE RETURN VALUE TO `__demo.transport`. It
   * cost another session real time today: doing that replaces a published
   * object that has `position` with a wrapper that has none, and
   * `demo/verify.mjs` dies on `t0.pos.toFixed` while the page itself looks
   * perfectly well. The bar publishes itself and needs no help; a page with two
   * bars says which one with `publish: false` on the other, and that option is
   * the ONLY supported way to decide this.
   * ⚠️ AND THE TWO DRIFT SILENTLY, because nothing type-checks either of them.
   * `extra(id)` is on the return value and not here, which by the rule written
   * on `loopExtra` below is a control a CDP check cannot reach on a page with
   * more than one bar. Left as it is and written down rather than fixed
   * quietly: adding a member changes what every harness can see, and that is a
   * change somebody should ask for.
   */
  const api = {
    /**
     * 🔴 THE BAR'S OWN ELEMENT, SO A CHECK CAN PRESS THIS BAR RATHER THAN THE
     * FIRST ONE IN THE DOCUMENT. It was on the RETURN VALUE only, and the note
     * further down this object states the principle it broke: a control
     * reachable from one and not the other is a control the harness cannot
     * press. With one bar per page `document.querySelector` happened to agree;
     * `/stage/` has two and they are different elements.
     */
    el: bar,
    get position() { return deck.position(); },
    /** ⚠️ FORCED FALSE ON A BAR WITH NO TOGGLE rather than derived. Nothing on
     *  such a bar can start the deck, so "is the transport playing" is a
     *  question about this bar with one answer; reporting a deck a page happened
     *  to start elsewhere would be the bar claiming a state it does not own. */
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
     * The warning is running.
     *
     * ⚠️ GRADED FROM HERE AND NOT FROM A CLASS OR A COMPUTED STYLE. The blink
     * is built in JavaScript (see setBlink), so there is no class to look for,
     * and sampling opacity would be sampling whichever half of the cycle the
     * check happened to land in — a measurement that is right half the time.
     */
    get loopBlinking() { return blinking; },
    /** 0..1 through a running loop, or null. The same number `onLoopPos` pushes. */
    get loopFrac() { return lastLoopFrac; },
    /** press it the way a finger does, so a check drives the real handler */
    pressLoop() { loopBtn.click(); },
    /**
     * A `loopExtras` button by id, so a check can press the real control and
     * read the real face.
     *
     * ⚠️ IT IS ON THIS OBJECT AS WELL AS ON THE RETURN VALUE, and that is not a
     * duplicate. This is what `window.__demo.transport` points at, which is the
     * only handle a CDP check has; the return value is what the PAGE holds. A
     * control reachable from one and not the other is a control the harness
     * cannot press, which is how `/radio/`'s ways went ungraded.
     */
    loopExtra: (id) => loopExtraEls.get(id) || null,
    /** a `loopSlot` button by id. Always on the bar; see the option. */
    slot: (id) => loopSlotEls.get(id) || null,
  };
  /**
   * 🔴 A PAGE WITH TWO BARS HAS TO SAY WHICH ONE IS ITS TRANSPORT, AND UNTIL
   * 2026-09-18 IT COULD NOT. This line ran unconditionally, so `__demo.transport`
   * was simply whichever bar was BUILT LAST, which is an ordering fact about
   * the source rather than a statement about the page. `/stage/` gained a
   * second bar (a live show in the control room beside a recording in the
   * archive) and the wrong one won by being further down the file.
   * ⚠️ IT IS THE ONLY HANDLE A CDP CHECK HAS, so getting it wrong does not show
   * up as a missing feature: the suite presses one bar and asserts about
   * another, which fails where nothing is wrong and can pass for the wrong
   * reason just as easily.
   * ⚠️ `publish: false` IS OPT-OUT RATHER THAN OPT-IN, because every page that
   * predates this has exactly one bar and must keep publishing it without being
   * edited. A new option that silently switched a check off on forty pages is a
   * loss this suite has already taken once.
   */
  if (window.__demo && publish !== false) window.__demo.transport = api;

  const stop = observePosition(deck.transport, paint, { hz: 60 });
  syncRates();
  drawLoop();
  paint({ pos: deck.position() });

  // ⚠️ WHAT THE PAGE HOLDS, AND IT IS NOT WHAT THE HARNESS READS. See the note
  // over `api` above: `__demo.transport` is `api`, this is a wrapper around it,
  // and assigning this object there takes `position` away from every check.
  return {
    el: bar,
    api,
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

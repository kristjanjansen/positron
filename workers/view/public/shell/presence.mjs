// demo/shell/presence.mjs — is the thing on the other end there?
//
// Four pages ask this question and four pages answer it differently. `/knobs/`
// waits six seconds and writes a log line, `/grains/` waits for a `board.hello`
// and enables its buttons, `/keys/` watches for the same message and draws an
// instrument row, `/able/` waits on an agent on a Mac that may simply be off.
// None of them can SHOW the answer without reading the log, and none of them
// distinguishes the two greys: a thing that has gone quiet, and a thing nobody
// has asked yet.
//
// 🔴 FOUR STATES, NOT THREE, AND THE FOURTH IS THE HONEST ONE. CLAUDE.md is
// explicit that "we did not look" must not read as "it is missing", which is
// why `caps.mjs` answers `unknown` and why `unknown` never blocks anything.
// A badge that opens on `offline` is a page asserting a measurement it has not
// taken, about hardware in another building, in the two seconds before the
// first heartbeat lands. It is wrong exactly when somebody is watching.
//
//   unknown   nothing has answered and not enough time has passed to say
//   coming    something is on its way up, and this is the state that moves
//   online    it spoke inside the time it promised to speak in
//   offline   it was there and has gone quiet, or it was listened for and never came
//
// 🔴 THE PICTURE IS HERE; THE POLICY IS A PURE FUNCTION BESIDE IT, AND THE
// NUMBER BELONGS TO WHOEVER KNOWS THE HEARTBEAT. `presenceOf` takes a last-seen
// time and an expected interval and returns one of those four words. It holds
// no clock, no socket and no element, so the whole of the rule is gradable by
// `node demo/shell/presence-test.mjs` rather than by watching a board in
// another building and wondering. The board beats every 5 s (`rig/board/board.mjs`
// sends `board.alive` on a 5000 ms interval), so a page passes `everyMs: 5000`
// and does not invent a rule of its own.
//
// ⚠️ `lastSeenAt` IS WHEN YOU HEARD IT, NOT THE STAMP INSIDE THE MESSAGE. Every
// envelope on this project's relay carries `at`, written by the SENDER with its
// own `Date.now()`, and a board whose clock runs three minutes fast would read
// as freshly heard from forever after it died. Call `seen()` when the message
// arrives. A `lastSeenAt` later than `now` is answered `unknown` rather than
// `online`, because a measurement from the future is a mis-measurement and this
// file's whole subject is not dressing one of those up as a fact.

/** The four, most-present first. The order is the one the kit shows them in. */
export const PRESENCE_STATES = ['online', 'checking', 'coming', 'offline', 'unknown'];

/**
 * What a visitor reads. Plain words, no jargon, and none of them is a
 * mechanism: a person who has never heard of a heartbeat can read all four.
 * A page may shorten them (`says: { coming: 'starting' }`), which also shortens
 * the badge, because the reserved width is measured off whatever it can say.
 */
export const SAYS = {
  online: 'online',
  /**
   * 🔴 `checking` IS NOT `coming online`, AND THE DIFFERENCE IS WHAT WE KNOW.
   * Instructed 2026-09-16: *"its not 'coming online', it is likely online we
   * just check it"*. A page that has just opened is asking a question about a
   * thing that was probably there all along; a page showing `coming` is saying
   * the thing is on its way up, which is a claim nobody has made yet.
   *
   * So the badge reads on two axes. COLOUR says what is known: green for a
   * thing that spoke, grey for a thing that has not. MOTION says something is
   * happening: a question is out, or an instrument is starting. Grey and moving
   * is us; green and moving is it.
   * ⚠️ IT EXISTS BECAUSE THE STILL ALTERNATIVE LIES BY OMISSION. Asking takes
   * 300 ms when the board answers and about six seconds when it does not, and
   * six seconds of a motionless dot reads as a page that has stopped.
   */
  checking: 'checking',
  coming: 'coming online',
  offline: 'offline',
  // ⚠️ `unknown`, NOT `no word yet`. Instructed 2026-09-16 with a screenshot:
  // *"last is UNKNOWN"*. The old wording described the BADGE's situation rather
  // than the thing's, which is a label talking about itself.
  unknown: 'unknown',
};

/** How many expected beats may be missed before it is called gone. */
export const MISSES = 2;

/**
 * One of `PRESENCE_STATES`, from a last-seen time and the interval the thing
 * promised to speak on. Pure: no clock, no DOM, no socket.
 *
 * @param {object}  o
 * @param {number}  o.now          this moment, in ms, from the same clock as the rest
 * @param {number}  o.everyMs      how often it is expected to speak. REQUIRED
 * @param {?number} o.lastSeenAt   when it last spoke, or null if never
 * @param {number}  o.misses       beats it may miss before it is called gone
 * @param {?number} o.since        when this page started listening, or null
 * @param {?number} o.comingSince  when a deliberate start began, or null
 * @param {?number} o.comingMs     how long that start is allowed to take, null for no limit
 */
export function presenceOf({
  now,
  everyMs,
  lastSeenAt = null,
  misses = MISSES,
  since = null,
  comingSince = null,
  comingMs = null,
} = {}) {
  if (!Number.isFinite(now)) {
    throw new Error('presence: `now` must be a time in ms. Pass Date.now().');
  }
  /**
   * 🔴 NO DEFAULT FOR `everyMs`. A default of one second would call a board
   * with a five-second heartbeat offline between every beat, which is a badge
   * that flickers grey on working hardware and sends somebody to look at the
   * hardware. The interval is a fact about the far end and only the page knows
   * it, so a page that has not said what it is has a bug and hears about it on
   * the first call rather than in the field.
   */
  if (!Number.isFinite(everyMs) || everyMs <= 0) {
    throw new Error('presence: `everyMs` must say how often the thing speaks, in ms '
      + '(the board beats every 5000). There is no safe default for it.');
  }
  if (!Number.isFinite(misses) || misses < 1) {
    throw new Error('presence: `misses` must be at least 1. Zero would call it gone '
      + 'the instant a beat is due, and a beat is never exactly on time.');
  }

  const window = misses * everyMs;

  // Heard from the future: two clocks, not one measurement. See the header.
  if (lastSeenAt != null && lastSeenAt > now) return 'unknown';

  if (lastSeenAt != null && now - lastSeenAt < window) return 'online';

  /**
   * ⚠️ COMING LOSES TO `online` AND BEATS BOTH GREYS. A synth coming up on the
   * board takes ten to forty seconds, and for all of it the honest answer is
   * that something is happening. It must not read as offline, which would make
   * every press of Play look like a dead button for half a minute.
   * ⚠️ AND IT IS ALLOWED AN EXPIRY, because a thing that has been "coming
   * online" for ten minutes is not coming online. `comingMs: null` means the
   * page will clear it itself, which is right where the page gets a reply that
   * tells it the attempt failed.
   */
  const starting = comingSince != null && comingSince <= now
    && (comingMs == null || now - comingSince < comingMs);
  if (starting) return 'coming';

  // It spoke once and has stopped. This is a measurement, so it is grey INK
  // rather than grey absence: see the note on the two greys in shell.css.
  if (lastSeenAt != null) return 'offline';

  // Never heard, but listened for long enough that silence is an answer.
  if (since != null && now - since >= window) return 'offline';

  // Never heard, and not yet listened for long enough to say anything at all.
  return 'unknown';
}

/**
 * The same four words, read off a WebSocket rather than off a heartbeat.
 *
 * `openWire` in `wire.mjs` already knows three of the things a page needs and
 * every page re-derives them: `state()` is the raw `readyState`, `stats()`
 * carries `refusal` (why the last upgrade was refused, when the relay could be
 * asked) and `reconnects`. This turns those into a state and a sentence, so a
 * page gets a socket badge in one line instead of four handlers.
 *
 * ⚠️ A SOCKET AND THE THING AT THE FAR END ARE TWO SUBJECTS AND GET TWO BADGES.
 * The relay being reachable says nothing about whether the board is plugged in,
 * and `/knobs/` proves it: the socket opens in 200 ms and the board may be off.
 * Use this for the relay, `presenceOf` for whoever is meant to be in the room.
 *
 * ⚠️ A CLOSED SOCKET IS `offline` EVEN WHEN A RETRY IS SCHEDULED, on purpose.
 * Right now nothing can be reached, which is what a reader wants to know;
 * `openWire` backs off at 300 ms, so the badge turns to `coming` on its own
 * within a third of a second of the retry firing.
 */
export function wirePresence({ ready = null, refusal = null, reconnects = 0 } = {}) {
  if (ready == null) return { state: 'unknown', why: 'no socket has been opened' };
  if (ready === 0) {
    return { state: 'coming', why: reconnects > 0 ? 'the socket is coming back' : 'the socket is opening' };
  }
  if (ready === 1) return { state: 'online', why: null };
  if (ready === 2) return { state: 'offline', why: 'the socket is closing' };
  if (ready === 3) return { state: 'offline', why: refusal };
  throw new Error(`presence: readyState ${ready} is not one of 0, 1, 2, 3. `
    + 'Pass `wire.state()`, which answers exactly those.');
}

/**
 * A badge, or a dot inside something else.
 *
 * 🔴 ONE COMPONENT, TWO MODES, AND THE ONLY DIFFERENCE IS WHAT IS VISIBLE.
 * `mode: 'badge'` shows a dot, an optional fixed name and the word.
 * `mode: 'dot'` shows the dot alone and CLIPS the words rather than removing
 * them, so the accessible name is still "the board coming online" and the live
 * region still announces a change. A dot whose meaning exists only in colour is
 * a dot a screen reader cannot read at all, and `display: none` is exactly how
 * that happens by accident.
 *
 * 🔴 NOTHING HERE CHANGES SIZE WHILE IT REDRAWS. Two separate guards, because
 * there are two ways this could move: the animated part is the dot's FILL and
 * the only property that animates is `opacity`, which cannot affect layout; and
 * the word sits in a box whose `min-width` is reserved at build time from the
 * longest thing this instance can ever say, measured in `ch` of the mono face
 * it is set in. So the badge is the same width in all four states and the same
 * width at every moment of the animation. Graded in `/kit/`, by measuring four
 * badges rather than by pressing one through four states.
 *
 * ⚠️ NO LETTER-SPACING ON THE WORD. `ch` is the advance of `0`, and letter
 * spacing adds to every advance, so a tracked-out word would overflow a reserve
 * computed in `ch` by exactly one space per character.
 * ⚠️ THE EXAMPLE THAT USED TO STAND HERE IS GONE, WHICH IS WHY THE LINE MOVED.
 * It named `.tbar-live`, the transport bar's `LIVE` chip, as a tracked word
 * that got away with it because its word never changed. That chip is one of
 * these badges now (`ON_AIR` in `transport-bar.mjs`), so its word DOES change
 * and there is no tracking left on it anywhere. The rule is untouched; only
 * the thing it pointed at has stopped existing.
 */
export function createPresence({
  of = '',
  mode = 'badge',
  says = {},
  state = 'unknown',
  /**
   * 🔴 WHICH STATES THIS BADGE CAN EVER SHOW, because the reserve below is the
   * longest word among them and a badge that will only ever say one word should
   * not hold room for three. A live badge leaves this alone and keeps its
   * no-twitch guarantee; a fixed specimen passes its own single state and sits
   * at its own width, which is what makes a ROW of them evenly spaced.
   * REPORTED 2026-09-16 with a screenshot of four specimens: *"same spacing
   * between"*, and the uneven look was each of them reserving room for
   * `coming online`.
   */
  can = null,
  /**
   * 🔴 A SECOND FACT ON THE SAME BADGE, AND IT REFINES `online` RATHER THAN
   * REPLACING IT. Asked 2026-09-17: *"one board per person, private room. - so
   * do we need occupied status on online badge?"*, and then *"can we mark
   * agent-messing specially so we can distinguish"*.
   *
   * The answer to the first is yes, and not for the reason it looks like. One
   * board per person does not make this state unreachable, because the room is
   * not the unit of contention: the INSTRUMENT is, and your own second tab is
   * another client. MEASURED 2026-09-17 on this relay: a parked tab restating
   * `CC 7 = 22` every 500 ms held a shared synth a fortieth of its level, and
   * nothing anywhere said so, which is why it read as a hardware fault.
   *
   * ⚠️ IT IS A REFINEMENT OF `online`, NOT A SIXTH STATE. The presence word
   * answers "is it answering", which outranks everything: a board that has gone
   * offline is offline whether or not somebody was driving it a second ago.
   * ⚠️ AND THE RESERVE COVERS THESE TOO, so the badge cannot twitch when the
   * word changes. That is the whole reason this is done with words rather than
   * with a mark appearing beside the badge.
   */
  busyWords = null,
  /**
   * Which kind is driving AT BUILD, for a fixed specimen. A live badge leaves
   * this alone and calls `busy()`.
   * ⚠️ IT EXISTS BECAUSE `busy()` FADES, and a fade is 90 ms during which the
   * element still holds the old word. `/kit/`'s three specimens were built and
   * then switched, and the check that reads them ran inside that trough and
   * reported all three saying `online`. The page was right and the check was
   * early. A specimen that is born in its state has nothing to transition from.
   */
  busy = null,
  why = null,
  showName = null,
  onChange = null,
} = {}) {
  if (mode !== 'badge' && mode !== 'dot') {
    throw new Error(`presence: mode is 'badge' or 'dot', not ${JSON.stringify(mode)}.`);
  }
  const words = { ...SAYS, ...says };
  for (const s of PRESENCE_STATES) {
    if (typeof words[s] !== 'string' || !words[s]) {
      throw new Error(`presence: there is no word for "${s}". Every state a badge can reach needs one.`);
    }
    if (words[s].includes('—')) {
      throw new Error(`presence: "${words[s]}" carries an em dash, and this is read by a visitor.`);
    }
  }
  const named = showName == null ? (mode === 'badge' && !!of) : (showName && !!of);

  const root = document.createElement('span');
  root.className = 'pos-pres';
  root.dataset.mode = mode;
  // `status` + polite: a change is announced once, when it happens. It changes
  // on a transition and never on a tick, so this is not a thing that talks over
  // somebody sixty times a second.
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');

  /**
   * 🔴 THE DOT LEADS, AND IT WENT TO THE RIGHT FOR ONE BUILD. Asked for
   * (*"dot should not appear before text"*), tried, photographed, and asked
   * back (*"put dot back to left"*). The reason it failed is the reserve: the
   * widest phrase this badge can say is held on the WORD, so a dot after it
   * parks at the end of that reserved width rather than after the text. On
   * anything shorter than the longest state it floated off on its own with a
   * gap in between, which reads as a stray mark rather than as part of a label.
   * ⚠️ SO THE TWO POSITIONS ARE NOT EQUIVALENT: leading is the one that can be
   * fixed to the text, because the text grows to the right of it.
   */
  const dot = document.createElement('i');
  dot.className = 'pos-pres-dot';
  dot.setAttribute('aria-hidden', 'true');

  /**
   * 🔴 THE NAME AND THE STATE ARE ONE STRING. Instructed 2026-09-16:
   * *"rasperry pi online: all same string, shuould animat in same time (no
   * 'fixed' device name)"*.
   *
   * They were two elements, and the name was held still while only the state
   * faded. That reads as half a label twitching: `RASPBERRY PI` sitting fixed
   * while `ONLINE` dissolves under it is two things where a reader sees one
   * phrase. One element, one fade, one colour.
   * ⚠️ THE RESERVE NOW COVERS THE WHOLE PHRASE, name included, or the badge
   * would twitch on exactly the pages that name their subject.
   * ⚠️ AND NO LETTER-SPACING ON IT. The tracking used to live on the name,
   * where width did not matter; inside the reserve it would overflow by a space
   * per character, which is why the word never had it.
   */
  const word = document.createElement('span');
  word.className = 'pos-pres-w';
  // The reserve. Whatever this instance can say, at its longest, in characters
  // of its own monospace face. A page that shortens the words gets a shorter
  // badge for free, and a page that lengthens one cannot make the badge twitch.
  const reach = Array.isArray(can) && can.length ? can.filter((x) => PRESENCE_STATES.includes(x)) : PRESENCE_STATES;
  const busySay = busyWords && typeof busyWords === 'object' ? busyWords : null;
  if (busySay) {
    for (const [k, v] of Object.entries(busySay)) {
      if (typeof v !== 'string' || !v) throw new Error(`presence: busyWords.${k} must be a word.`);
      if (v.includes('—')) throw new Error(`presence: "${v}" carries an em dash, and this is read by a visitor.`);
    }
  }
  // `busy` names which kind of client is driving, or null. It only ever changes
  // the word while the state is `online`.
  // ⚠️ AND THE ATTRIBUTE IS SET AT BUILD TOO, not only by `busy()`. The
  // stylesheet greys the word off `data-busy`, so a badge born busy said the
  // right words in the right colour of the wrong state: the check comparing
  // inks read them identical and was right to.
  let busyKind = busy || null;
  const wordFor = (x) => (x === 'online' && busyKind && busySay?.[busyKind]) || words[x];
  const phrase = (x) => (named ? `${of} ${wordFor(x)}` : wordFor(x));
  // The reserve has to cover every phrase this badge can EVER say, which
  // includes the busy variants: a reserve measured on the idle words would let
  // the badge grow the first time somebody else touched the instrument, which
  // is the twitch the reserve exists to prevent.
  const widest = Math.max(...reach.map((x) => phrase(x).length),
    ...(busySay && reach.includes('online')
      ? Object.values(busySay).map((w) => (named ? `${of} ${w}`.length : w.length))
      : [0]));
  word.style.setProperty('--pres-ch', String(widest));
  if (busyKind) root.dataset.busy = busyKind;
  root.append(dot, word);

  let now = null, note = null;
  let timer = null, f = null;
  // A question is out. It outranks a derived `unknown` and nothing else: the
  // moment anything actually answers, what it said is the better fact.
  let asking = false;

  // 🔴 TWO LINES, NOT A MIDDOT, AND A `title` REALLY DOES BREAK ON `\n`.
  // Instructed 2026-09-19: no middots in anything a visitor reads. This one
  // reached every presence badge in the project, and it was gluing three facts
  // into one string: what the thing is, what it is doing, and the detail. The
  // first two are one phrase and are joined the way the badge's own visible
  // word already joins them, with a space (see `phrase` above, which has always
  // done it that way, so the middot here disagreed with the badge an inch
  // below it). The detail is a second fact and gets its own line, which is also
  // what CLAUDE.md's tooltip rule asks for: two or three short lines, never a
  // sentence with joins in it.
  function title() {
    const base = of ? `${of} ${wordFor(now)}` : wordFor(now);
    return note ? `${base}\n${note}` : base;
  }

  /**
   * 🔴 THE WORD CHANGES BY FADING THROUGH, AND THE REASONS ARE ALL ABOUT WHEN
   * IT HAPPENS. Asked 2026-09-16: *"how to animate online status srtings when
   * they change?"*.
   *
   * A state change is an EVENT, not a clock: it happens when something actually
   * happened, so unlike a live number this is allowed to move at all. What it
   * may not do is any of the three things this repo has already been bitten by.
   * It cannot change width, because the reserve holds the widest word this badge
   * can say and the swap happens inside it. It cannot slide, because a slide
   * needs room to slide through and this box has none. And it cannot be slow:
   * 90 ms out, swap, 90 ms back is under a fifth of a second, which is enough to
   * catch an eye that was elsewhere and too short to sit and watch.
   *
   * ⚠️ THE TEXT IS SWAPPED AT THE TROUGH, not at either end, so a reader never
   * sees two words in the same place. It is one element rather than two crossing
   * over, because two would need absolute positioning inside a reserve that is
   * already doing that job.
   * ⚠️ AND A SCREEN READER HEARS IT WITHOUT ANY OF THIS: the badge is a live
   * region, so the word is announced on change whether or not it faded.
   */
  const WORD_FADE_MS = 90;
  let fading = null, fadingTo = null;

  function paint() {
    root.dataset.state = now;
    root.title = title();
    const next = phrase(now);
    if (word.textContent === next) return;
    /**
     * 🔴 A FADE ALREADY RUNNING TO THIS WORD IS NOT RESTARTED, AND LEAVING THAT
     * OUT MADE THE BADGE DISAPPEAR. PHOTOGRAPHED 2026-09-16: a green dot with
     * nothing beside it and the reserve still holding the space.
     *
     * `/knobs/` calls `seen()` on every audio frame, which is fifty times a
     * second, and each call re-derived and repainted. During the 90 ms trough
     * the element still holds the OLD word, so every repaint saw a difference,
     * cleared the pending restore and started another: the text was swapped and
     * brought back only once the frames stopped. A state change is an event and
     * the fade belongs to the change, not to whoever asked again.
     */
    if (fadingTo === next) return;
    // First paint, or a browser that says no: swap it and say nothing more.
    if (!word.textContent || matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      word.textContent = next;
      return;
    }
    clearTimeout(fading);
    fadingTo = next;
    word.style.opacity = '0';
    fading = setTimeout(() => {
      word.textContent = next;
      word.style.opacity = '';
      fadingTo = null;
    }, WORD_FADE_MS);
  }

  function set(next, reason = null) {
    if (!PRESENCE_STATES.includes(next)) {
      throw new Error(`presence: "${next}" is not one of ${PRESENCE_STATES.join(', ')}.`);
    }
    const changed = next !== now || (reason ?? null) !== note;
    now = next;
    note = reason ?? null;
    paint();
    // Only on a real change: a callback per tick is a log line per tick, which
    // is the "slop log" this project already has a rule about.
    if (changed && onChange) onChange(now, note);
    return api;
  }

  function derive() {
    const d = presenceOf({ now: Date.now(), ...f });
    // ⚠️ ONLY OVER `unknown`. Asking while the board is already answering would
    // hide a live heartbeat behind a question nobody needs the answer to, and
    // asking while it is KNOWN silent would erase a measurement that was taken.
    set(asking && d === 'unknown' ? 'checking' : d, f.why);
  }

  const api = {
    el: root,
    set,
    state: () => now,
    why: () => note,
    says: (s = now) => words[s],
    /** The reserved width, in characters. Handy in a check. */
    reserve: () => widest,

    /**
     * Derive the state from a heartbeat instead of being told it.
     *
     * Idempotent: calling it again replaces the rule and the timer. It derives
     * ONCE before starting the timer, so a bad `everyMs` throws here rather
     * than inside an interval where nothing would ever see it.
     */
    follow(opts = {}) {
      api.stop();
      f = {
        everyMs: opts.everyMs,
        misses: opts.misses ?? MISSES,
        comingMs: opts.comingMs ?? null,
        since: opts.since === undefined ? Date.now() : opts.since,
        lastSeenAt: opts.lastSeenAt ?? null,
        comingSince: opts.comingSince ?? null,
        why: opts.why ?? null,
      };
      derive();
      // Fast enough that "gone" is noticed within a second of the deadline,
      // slow enough that nothing is doing arithmetic at frame rate.
      const tick = Math.min(1000, Math.max(200, f.everyMs / 4));
      timer = setInterval(derive, tick);
      return api;
    },

    /** It spoke. Stamp it with YOUR clock, at the moment it arrived. */
    /**
     * ⚠️ CHEAP ON PURPOSE. A page with audio calls this fifty times a second,
     * so it records the time and derives only when the answer could have
     * changed: while the thing is already `online` and nothing else is
     * pending, the next tick of `follow()` will say the same word anyway.
     */
    seen(at = Date.now()) {
      if (!f) throw new Error('presence: seen() needs follow() first, which is where the heartbeat interval is.');
      const wasComing = f.comingSince != null;
      f.lastSeenAt = at;
      f.comingSince = null;             // it is here; it is not on its way any more
      if (now !== 'online' || wasComing) derive();
      return api;
    },

    /** A deliberate start began, or ended without arriving. */
    /** A question is out and no answer has come back. Grey, and moving. */
    checking(on = true) {
      asking = !!on;
      derive();
      return api;
    },

    coming(on = true, at = Date.now()) {
      if (!f) throw new Error('presence: coming() needs follow() first.');
      f.comingSince = on ? at : null;
      derive();
      return api;
    },

    /**
     * Somebody else is driving the thing this badge is about, or nobody is.
     * `kind` is one of the keys of `busyWords`, or null for nobody.
     * ⚠️ IT DOES NOT TOUCH PRESENCE. A board being driven is still offline if it
     * has stopped answering, and this only ever changes the word while the state
     * is `online`.
     */
    busy(kind = null) {
      const next = kind && busySay?.[kind] ? kind : null;
      if (next === busyKind) return api;
      busyKind = next;
      root.dataset.busy = next || '';
      paint();
      return api;
    },

    /** Which kind is driving, or null. */
    get driver() { return busyKind; },

    /** A standing reason, kept across ticks. `wirePresence`'s `why` goes here. */
    because(text) {
      if (f) f.why = text ?? null;
      else note = text ?? null;
      if (f) derive(); else paint();
      return api;
    },

    stop() {
      if (timer != null) { clearInterval(timer); timer = null; }
      return api;
    },
  };

  set(state, why);
  return api;
}

/**
 * A primary control that IS the status, rather than a button beside one.
 *
 * 🔴 ASKED FOR 2026-09-21: *"replace listen primary buttons to somehign that
 * uses online status"*. A page that talks to an instrument in another room, or
 * on another cable, has two facts to show and had been showing one: `Listen`
 * says what pressing does and says nothing about whether anything answered. A
 * visitor who pressed it and saw no movement could not tell a silent instrument
 * from an absent one.
 *
 * ⚠️ **IT STAYS A PRESS, AND THAT IS NOT NEGOTIABLE.** A badge that connected
 * on its own would open MIDI, or a socket, on a VISIT, which is the rule this
 * project has paid for on four pages. So the control is a button whose face is
 * a live badge: `unknown` before anybody asks, `checking` while it looks,
 * then `online` or `offline` with a reason.
 *
 * ⚠️ **AND IT LIVES IN `.pos-controls`**, which is where `demo/verify.mjs`
 * presses. A status control outside that row is a control no harness drives,
 * and every check behind it would go silent while the suite stayed green.
 *
 * `of` names the thing, `press` is what the button does, and everything else is
 * handed to `createPresence`. Returns the presence api with `el` being the
 * BUTTON, plus `badge` for the element inside it.
 */
export function createPresenceButton({ of = '', press = () => {}, ...rest } = {}) {
  const badge = createPresence({ of, mode: 'badge', ...rest });
  const b = document.createElement('button');
  b.type = 'button';
  /* ⚠️ SECONDARY, NOT PRIMARY. Asked 2026-09-21: *"secodard button for
     status butotn"*. A primary button is the one thing a page wants you to
     do, and checking whether an instrument is plugged in is not it: the
     page is the instrument, and this is the thing you press once before
     using it. Filling it in also made a status the loudest object on a page
     whose whole subject is a panel. */
  b.className = 'pos-presence-btn';
  b.dataset.id = 'presence';
  b.append(badge.el);
  b.addEventListener('click', () => press());
  /* ⚠️ THE BADGE'S OWN LIVE REGION STAYS. Wrapping it in a button must not take
     the announcement away, so nothing here touches `aria-live`; what the button
     adds is a name for the ACTION, which the badge cannot carry. */
  b.setAttribute('aria-label', `check whether ${of || 'it'} is there`);
  let this_;
  /* 🔴 DELEGATED, NOT SPREAD. `{ ...badge }` reads every property ONCE at
     spread time, so `get driver()` would have been frozen at whatever it was
     the instant this was built and would never have changed again. A getter
     that silently stops getting is the quietest kind of dead code there is. */
  this_ = {
    el: b, button: b, badge: badge.el,
    set: (...a) => { badge.set(...a); return this_; },
    busy: (...a) => { badge.busy(...a); return this_; },
    because: (...a) => { badge.because(...a); return this_; },
    stop: () => { badge.stop(); return this_; },
    get state() { return badge.state; },
    get driver() { return badge.driver; },
  };
  return this_;
}

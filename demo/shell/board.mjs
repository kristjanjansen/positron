// demo/shell/board.mjs — the Raspberry Pi, from a browser.
//
// ⚠️ ONE PAGE USES THIS NOW. `/keys/` was retired on 2026-09-17 (`archive/keys/`)
// and `/knobs/` moved onto this module the same day, which is the opposite order
// from the one this header was written in. The reasoning below is kept because
// it is about WHY the merge was worth making and which half won each argument,
// and because the next page that plays a board should start here rather than
// hand-rolling the same six things a third time.
//
// Two pages played the same board over the same relay: `/keys/` sent notes and
// `/knobs/` sends controller values. Everything between the two of them was
// written twice — joining the room, working out which socket in it is the
// board, reading the 12-byte frame header, converting int16 to float, raising
// the `pcm-playout` worklet, choosing a cushion, checking that a frame is the
// shape the board says it is, and keeping a presence badge honest.
//
// 🔴 IT IS THE BETTER OF THE TWO HALVES, NEVER THE AVERAGE. Where the two pages
// disagreed, the one that had thought about it wins, and each case is named
// below. `/keys/` hand-rolled its WebSocket and as a result could not tell a
// FULL ROOM from a DEAD RELAY — a browser cannot read the HTTP status of a
// refused upgrade, so both arrive as the same silent close, and the relay
// answers the seventeenth socket `503 room full (16)` with nobody able to hear
// it. `openWire` asks `/stats` and says which it was. It also mints a new `from`
// per connection, counts what it sent against what came back, and THROWS on a
// payload field the envelope would overwrite. `/keys/` had none of that.
// It also never checked a frame's shape and never learned which socket the
// board was; both are here.
//
// 🔴 WHAT IT DOES NOT OWN. The page keeps its own instrument: which verbs it
// sends, what its log calls things, what it does with a frame after the playout
// has it. This is the wire, the sound coming back, and whether anybody is
// there. CLAUDE.md: a control that exists in one page and nowhere else is a
// component that has not been noticed yet.

import { openWire, randomId } from './wire.mjs';
import { createPresence } from './presence.mjs';

/** The board fixes these (rig/board/synth.mjs) and NOTHING in the chain
 *  resamples, so a page that asks for a different rate gets a pitch error and a
 *  ring that fills faster than it drains. */
export const BOARD_RATE = 48000;
export const BOARD_FRAME_MS = 20;
export const BOARD_CHANNELS = 1;

/** Where the worklet lives. One string, so a page cannot hold a stale path. */
export const PLAYOUT_URL = '/proto/jam/playout-worklet.js';

/** Bytes of header before the samples: a sequence number and the board's own
 *  `performance.now()`. The samples start at 12. */
export const FRAME_HEADER_BYTES = 12;

/**
 * Open a board.
 *
 * @param {string} room        the relay room. `studio-1` is the ADDRESS OF THE
 *                             RASPBERRY PI, not a rendezvous a page invented.
 * @param {string} [relay]     override the relay base, for a local worker.
 * @param {string} [of]        what the presence badge calls it.
 * @param {boolean} [showName] whether the badge PRINTS that name in front of
 *                             the word. Left alone it is today's behaviour,
 *                             which is to print it. See the note on it below.
 * @param {number} [cushionMs] the playout floor. See the note on it below.
 * @param {number} [maxCushionMs]
 * @param {number} [everyMs]   the board's heartbeat, 5 s. The badge THROWS
 *                             without one rather than guessing: a short guess
 *                             calls a working board gone between beats and
 *                             sends somebody to look at hardware that is fine.
 * @param {number} [comingMs]  how long a cold start may take before the badge
 *                             stops saying "on its way".
 * @param {function} [log]     `d.log`.
 * @param {function} [onPcm]   `(f32, { peak, seq, samples })` after the playout
 *                             has been given the frame. The page's own business.
 * @param {function} [onMessage] every JSON message that is not this page's echo.
 * @param {function} [onOpen]  the socket opened.
 */
export function createBoard({
  room,
  relay = undefined,
  of = 'Raspberry Pi',
  /**
   * 🔴 WHETHER THE BADGE PRINTS THE NAME, AND THE DEFAULT IS UNCHANGED.
   * `null` leaves `createPresence` to decide, which for a badge with an `of`
   * means it prints it, which is what every caller has had since this module
   * was written. `false` is the one new thing: the badge says `online` and the
   * name lives only in the tooltip.
   *
   * 🔴 IT IS AN OPTION HERE RATHER THAN A RULE IN A PAGE'S STYLESHEET BECAUSE
   * THE NAME IS PART OF A RESERVED WIDTH, NOT PART OF A STRING. `presence.mjs`
   * measures `--pres-ch` over every phrase this badge can EVER say, so a badge
   * that keeps its name reserves room for the longest one. MEASURED 2026-09-29
   * on a board badge built with the defaults and on the same badge with
   * `showName: false`: 26 ch and `min-width: 172.187px` against 13 ch and
   * `min-width: 86.0933px`, which is `Raspberry Pi coming online` against
   * `coming online`, and the badge round it 190.17 px against 104.08. Hiding
   * the words with CSS would leave all 172 px of reserve standing and a badge
   * holding air, and the reserve is the whole reason nothing in it moves while
   * it redraws.
   *
   * ⚠️ AND THE NAME IS NOT LOST TO A SCREEN READER. `presence.mjs`'s `title()`
   * is `${of} ${word}` whatever the badge shows, so the tooltip and the
   * accessible name still carry it. CONFIRMED in the same measurement: the
   * badge read `checking` and its `title` read `Raspberry Pi checking`.
   *
   * ⚠️ THE OPTION ALREADY EXISTED ONE LAYER DOWN AND ONLY THIS BUILDER COULD
   * NOT REACH IT. `demo/kit/index.html` and `demo/shell/instrument.mjs` both
   * pass `showName: false` to `createPresence` directly; `createBoard` handed
   * it `of` and `busyWords` and nothing else, so a page using a board had no
   * way to ask. That is the whole of this change.
   */
  showName = null,
  rate = BOARD_RATE,
  frameMs = BOARD_FRAME_MS,
  channels = BOARD_CHANNELS,
  cushionMs = 100,
  maxCushionMs = 250,
  everyMs = 5000,
  comingMs = 45000,
  log = () => {},
  onPcm = null,
  onMessage = () => {},
  onOpen = () => {},
  /**
   * 🔴 WHETHER A HARNESS RUN MAY DRIVE THE BOARD. Default `'refuse'`.
   *
   * The board is a shared Raspberry Pi in another building, and `verify.mjs`
   * presses every button in `.pos-controls` on every page on every run. So any
   * control that reaches the board is a control a suite run works, and a suite
   * run is dozens of Chromes. `/knobs/` has guarded itself with its own
   * `MAY_PLAY` flag since it was built, and that is exactly the shape this
   * moved here to fix: **a page-level guard protects the page that has one,
   * which is never the page where the mistake gets made.** `/draw/` and
   * `/grains/` build their own control rows and would not have carried it.
   *
   * ⚠️ IT REFUSES THE SEND, NOT THE SOCKET. A page under `?selfcheck=1` still
   * joins the room, still hears the board, still reports presence and still
   * grades everything that does not TOUCH the instrument. Refusing the
   * connection would take those checks away and make the harness blind rather
   * than polite.
   *
   * ⚠️ `?board=1` IS THE ESCAPE HATCH, the same shape as `DEMO_QUERY=base=…`
   * for the stand-ins: somebody who has been asked to drive the real board
   * passes it and the guard stands aside.
   */
  inSelfcheck = 'refuse',
  /**
   * 🔴 A DIRECT PATH TO THE BOARD, BESIDE THE RELAY, AND OFF UNLESS ASKED FOR.
   * `plans/plan-away-webrtc.md`: the relay was ~72 of the 93 ms from a key
   * press on `/away/` to its note arriving back. With this on, `goDirect()`
   * offers two WebRTC data channels to the board through the relay room, and
   * once they are open the audio arrives on `pcm` and every send leaves on
   * `ctl`. The relay stays joined throughout, for presence, for signalling and
   * as the fallback when no channel opens.
   * MEASURED 2026-09-30, P0, headless Chrome to the Pi on one network: host to
   * host over UDP, open in 158 ms, 200 of 200 frames echoed at p50 3.7 ms.
   * ⚠️ AN OFFER IS A SEND, so under `?selfcheck=1` it is refused like any
   * other: a harness never opens a peer on the board in another building.
   */
  direct = false,
  /** The cushion once the direct path is open. The relay's jitter is what the
   *  ordinary `cushionMs` is sized for; a channel four milliseconds away needs
   *  far less, and re-posting the floor also undoes any ratchet the switchover
   *  itself caused. Defaults to `cushionMs`, so nothing changes unless asked. */
  directCushionMs = null,
  iceUrl = 'https://pub.positron.studio/ice',
} = {}) {
  if (!room) throw new Error('board: a room is required. `studio-1` is the address of the Raspberry Pi.');
  if (!['refuse', 'allow'].includes(inSelfcheck)) {
    throw new Error(`board: inSelfcheck is 'refuse' or 'allow', not ${JSON.stringify(inSelfcheck)}`);
  }

  /** Is this run allowed to touch the instrument? Read once: a query string
   *  does not change under a running page, and re-reading it per message would
   *  make the answer depend on when it was asked. */
  const q = new URLSearchParams(location.search);
  // ⚠️ BOTH TIERS ARE A HARNESS (`selfcheck=1` ordinary, `selfcheck=2` deep, see
  // `demo/shell/selfcheck.mjs`), and a deep run is NOT permission to drive the
  // board: that is still `?board=1` and nothing else.
  const driving = !['1', '2'].includes(q.get('selfcheck')) || q.get('board') === '1' || inSelfcheck === 'allow';
  let refused = 0;

  // ── the badge ─────────────────────────────────────────────────────────────
  /**
   * 🔴 THE BADGE CARRIES A SECOND FACT: IS ANYBODY ELSE DRIVING THIS. Asked
   * 2026-09-17 and answered in two steps, because the first answer was not good
   * enough. *"one board per person, private room. - so do we need occupied
   * status on online badge?"* — yes, because the room is not the unit of
   * contention. The INSTRUMENT is, and your own second tab is another client.
   * Then: *"what is 'you' me as user in single widow or the agent messing with
   * verificiations etc. can we mark agent-messing specially so we can
   * distinguish"* — which is why there are two words rather than one.
   *
   * MEASURED 2026-09-17 and this is what it is for: a parked tab restating
   * `CC 7 = 22` every 500 ms held a shared synth at a fortieth of its level for
   * hours. Nothing on any page said so, the counters all read correct, and it
   * was hunted as a hardware fault. `under test` is the same fault wearing a
   * harness: `demo/verify.mjs` drives a real page, and without the declaration
   * in `wire.mjs` a suite run and a person sitting down are identical from here.
   */
  const pres = createPresence({
    of,
    showName,
    busyWords: { page: 'in use', tool: 'under test' },
  });
  pres.follow({ everyMs, comingMs });
  pres.checking();                    // a question is out before anything answers

  /**
   * How long a client counts as still driving after its last message.
   * ⚠️ LONGER THAN `RESTATE_MS`, WHICH IS 500. `cc-adapter.mjs` restates the
   * whole console every half second with nothing moving, so a page parked on a
   * slider sends at exactly that cadence; a window shorter than it would blink
   * the badge on and off rather than reporting a held instrument.
   */
  const DRIVING_MS = 1500;
  let droveAt = 0, droveBy = null, saidDriver = null;
  // What COUNTS as driving: changing the instrument, rather than asking it
  // something. A page polling `audio.status` is a spectator.
  const DRIVES = new Set(['ctl.set', 'note.on', 'note.off', 'note.panic',
                          'voice.select', 'params.set', 'params.random',
                          'fx.pappus', 'source.set']);

  function driverTick() {
    const on = droveAt && performance.now() - droveAt < DRIVING_MS;
    const kind = on ? droveBy : null;
    pres.busy(kind);
    if (kind !== saidDriver) {
      // A state change, which is what the log is for. Not a number and not a
      // sentence that rewrites itself: it moves when something happened.
      if (kind === 'tool') log('a harness is driving this instrument, so what you hear is a check rather than a person', 'warn');
      else if (kind === 'page') log('somebody else is driving this instrument: another window, which may be one of yours');
      else if (saidDriver) log('the instrument is yours again');
      saidDriver = kind;
    }
  }
  setInterval(driverTick, 250);

  /**
   * 🔴 ONLY THE BOARD COUNTS AS THE BOARD, AND ONE OF THESE PAGES GOT THIS
   * WRONG FOR REAL. The relay is VERBATIM: everything in the room reaches
   * everybody, so marking presence on any message that is not our own echo
   * paints the badge green when another tab, another page, or a harness run is
   * in the room while the Raspberry Pi is unplugged. A badge that somebody else
   * can satisfy is worse than no badge, because it is wrong in precisely the
   * case it exists for.
   *
   * The board is identified by the two messages only it sends — `board.hello`
   * when it joins and `board.alive` every five seconds. Its `from` is per SOCKET,
   * so it is learned rather than assumed, and learned again when it reconnects.
   * ⚠️ AND AUDIO COUNTS TOO. Nothing else puts PCM into this room, and frames
   * arrive fifty times a second against a heartbeat every five.
   */
  let boardFrom = null;

  // ── audio ─────────────────────────────────────────────────────────────────
  let ctx = null, playout = null, meterNode = null, meterBuf = null;
  let bufferedMs = 0, starved = 0, trimmed = 0, breaks = -1;
  let frames = 0, lost = 0, lastSeq = -1, firstFrameAt = 0, peak = 0;
  let told = null;                    // what `board.hello` announced, if we heard it
  let chIn = channels, shapeChecked = false, shapeWrong = 0, shapeSaid = '';

  async function startAudio() {
    if (ctx) return ctx;
    // ⚠️ ASK FOR THE BOARD'S RATE, BECAUSE NOTHING IN THIS CHAIN RESAMPLES. The
    // worklet writes the board's samples straight into a ring drained at the
    // context's own rate: on an output running at 44.1 kHz the pitch is wrong
    // by the ratio AND the ring fills faster than it drains, so the latency
    // guard trims several times a second. Periodic clicking, and every readout
    // green throughout, because frames per second is unaffected.
    ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: rate, latencyHint: 'interactive' });
    // ⚠️ Fire and move on. `resume()` waits on a user gesture in a real browser
    // and NEVER REJECTS, so awaiting it is a hang rather than an error.
    ctx.resume().catch(() => { /* a suspended context is allowed. Sound is late, not broken */ });
    /**
     * 🔴 AND IF IT NEVER STARTS, THE PAGE SAYS SO. REPRODUCED 2026-09-17 while
     * chasing *"Knobs is silent"*: with the browser's ordinary autoplay policy
     * and no user activation, the context stays `suspended`, the worklet is
     * built, frames keep arriving at fifty a second with a healthy peak, every
     * counter reads correct, `buffer` sits at 0 ms and NOTHING PLAYS. MEASURED
     * on the deployed page: arrived peak 0.136, output peak 0.000.
     *
     * That is the worst shape a fault can have here, and this module already
     * carries the same lesson about the board streaming silence. A suspended
     * context is a normal thing that happens to real people — a tab restored on
     * load, a gesture that did not count, an iPhone deciding otherwise — and the
     * only honest thing a page can do is name it, because no counter it displays
     * can.
     * ⚠️ IT IS NOT AN ERROR AND MUST NOT READ AS ONE while it is merely late.
     * `resume()` is fired and not awaited, so a context is briefly suspended on
     * every single start. The line waits a beat and speaks only if it is STILL
     * not running, and `statechange` takes it back when it starts.
     */
    /**
     * 🔴 ANY GESTURE RESUMES IT, AND THIS IS THE WHOLE BUG. PHOTOGRAPHED
     * 2026-09-17 on an iPhone: `sound out 0.000`, `buffer 0 ms`, and the page's
     * own log saying *"the audio is suspended. Press play again, or click
     * anywhere on the page"*. Clicking anywhere did nothing, because nothing was
     * listening: `resume()` was fired exactly once, inside `startAudio`, and if
     * that call did not take there was no second chance for the rest of the
     * page's life. The page printed instructions it could not honour.
     *
     * ⚠️ WEBKIT NEEDS THE CALL INSIDE A GESTURE HANDLER, not merely after one
     * has happened, and it will not resume a context on its own however many
     * times somebody taps. So every gesture the document sees gets one attempt
     * while the context is not running, and the listeners take themselves off as
     * soon as it is.
     * ⚠️ `touchend` AS WELL AS `pointerdown`. iOS grants activation on some
     * events and not others, and the cheap thing is to try on all of them rather
     * than to be clever about which.
     * ⚠️ AND THEY ARE PASSIVE AND CAPTURING, so they cannot block a scroll and
     * cannot be swallowed by a control that stops propagation.
     */
    const GESTURES = ['pointerdown', 'touchend', 'mousedown', 'keydown'];
    const offGestures = () => {
      for (const g of GESTURES) document.removeEventListener(g, tryResume, true);
    };
    function tryResume() {
      if (!ctx || ctx.state === 'running') { offGestures(); return; }
      ctx.resume().then(watchState).catch(() => { /* still not allowed; the next gesture tries again */ });
    }
    for (const g of GESTURES) document.addEventListener(g, tryResume, { capture: true, passive: true });

    let saidSuspended = false;
    const watchState = () => {
      if (!ctx) return;
      if (ctx.state === 'running') {
        offGestures();
        if (saidSuspended) { saidSuspended = false; log('the browser let the sound start'); }
        return;
      }
      if (saidSuspended) return;
      saidSuspended = true;
      // ⚠️ THE LINE PROMISES SOMETHING THE PAGE NOW DOES. It said "click
      // anywhere" while nothing listened for a click, which is worse than saying
      // nothing: it sent somebody tapping at a page that could not answer.
      log(`the sound is built and arriving but this browser has not let it start: the audio is ${ctx.state}. `
        + 'Tap anywhere on the page and it will start', 'bad');
    };
    ctx.addEventListener('statechange', watchState);
    setTimeout(watchState, 600);
    // A REQUEST, not a guarantee: a browser may hand back its device rate
    // anyway. No readout cell for it — a cell reading 48000 forever is a
    // constant wearing a measurement's clothes. It speaks when it has something
    // to say.
    if (ctx.sampleRate !== rate) {
      log(`this browser runs audio at ${ctx.sampleRate} Hz and the board sends ${rate}. Nothing in the chain resamples, so the pitch will be off by ${(rate / ctx.sampleRate).toFixed(3)}x and you will hear clicks`, 'bad');
    }
    await ctx.audioWorklet.addModule(PLAYOUT_URL);
    playout = new AudioWorkletNode(ctx, 'pcm-playout',
      { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
    playout.connect(ctx.destination);
    /**
     * 🔴 A METER ON WHAT LEAVES, BECAUSE EVERY NUMBER THESE PAGES SHOW IS ABOUT
     * WHAT ARRIVES. Frames, lost, cushion, and a peak computed from the bytes as
     * they come in are all upstream of the speaker, and 2026-09-17 was spent
     * inside that gap: a page reporting fifty frames a second, a healthy peak,
     * `lost 0` and a full cushion, while nothing at all was audible. Three
     * separate causes were found that day and each one presented identically.
     *
     * An analyser on the playout's OWN output answers the question a person is
     * actually asking. It costs one node and no callback: `getFloatTimeDomainData`
     * is pulled when somebody looks, rather than pushing anything.
     * ⚠️ IT IS TAPPED IN PARALLEL, not inserted. An analyser passes audio through
     * unchanged, but putting one in the path makes the sound depend on a
     * measurement, and a meter that can break what it measures is worse than no
     * meter.
     */
    meterNode = ctx.createAnalyser();
    meterNode.fftSize = 1024;
    playout.connect(meterNode);
    meterBuf = new Float32Array(meterNode.fftSize);
    /**
     * 🔴 THE COUNTERS EXISTED ALL ALONG AND NO PAGE HAD EVER READ ONE. They are
     * posted every 250 ms from inside the worklet; `/able/` sounded noisy for an
     * hour while six separate measurements said its stream was perfect, because
     * the defect was downstream of every quantity being measured. A statistic
     * nobody displays is not instrumentation.
     */
    playout.port.onmessage = (e) => {
      const st = e.data?.stats; if (!st) return;
      bufferedMs = st.bufferedMs;
      starved = st.underruns; trimmed = st.trimEvents;
      const b = starved + trimmed;
      if (b !== breaks) {
        const first = breaks < 0;
        breaks = b;
        // ONE number for a page to show and TWO words for the log, because the
        // two want OPPOSITE fixes: running dry wants a bigger cushion and being
        // trimmed wants a smaller one.
        if (!first) log(`${starved} ran dry, ${trimmed} trimmed · cushion ${Math.round(bufferedMs)} ms`, 'warn');
      }
    };
    /**
     * The cushion is OURS, not the browser's, which is the whole reason to
     * carry the samples rather than use WebRTC.
     *
     * ⚠️ THE DEFAULT IS THE SMALLER ONE AND A PAGE MAY RAISE IT. MEASURED off
     * this relay with a node client and no browser in the way: 992 frames in
     * 20 s, nothing lost, mean gap exactly 20.0 ms, p90 29.5, p99 43.5, worst
     * single gap 83.6 ms. A cushion has no restoring force, so the floor
     * RATCHETS when it is proved too small rather than being chosen once.
     */
    playout.port.postMessage({ cmd: 'floor', ms: cushionMs, adaptive: true, maxMs: maxCushionMs });
    return ctx;
  }

  /**
   * The shape of what arrived, checked rather than inferred.
   *
   * 🔴 A CHANNEL COUNT CANNOT BE READ OFF A PAYLOAD. 960 int16s is a valid
   * 20 ms mono frame AND a valid 10 ms stereo one, and guessing wrong plays an
   * octave down, which sounds like a broken instrument rather than a broken
   * header. The studio Mac sends stereo and this board sends mono, and both are
   * on this relay at once.
   *
   * ⚠️ THE BOARD ANNOUNCES IT IN `board.hello`, WHICH IT SENDS WHEN IT JOINS, SO
   * A PAGE THAT JOINS LATER NEVER HEARS IT, and there is no verb that asks for
   * it again. So the expectation is the board's PUBLISHED framing and the
   * arriving frames are checked against it: `samples / channels / rate` has to
   * come out at the frame length claimed. A live announcement overrides the
   * expectation the moment one arrives.
   */
  function checkShape(samples) {
    if (shapeChecked) return;
    shapeChecked = true;
    const want = told?.frameMs ?? frameMs;
    const implied = (samples / chIn / rate) * 1000;
    shapeSaid = `${samples} samples a frame works out at ${implied.toFixed(1)} ms as ${chIn === 2 ? 'stereo' : 'mono'}, against the ${want} ms ${told ? 'the board announced' : 'the board publishes'}`;
    if (Math.abs(implied - want) <= want * 0.02) return;
    const real = Math.max(1, Math.min(2, Math.round(samples / ((want / 1000) * rate))));
    shapeWrong++;
    chIn = real;
    playout?.port.postMessage({ cmd: 'inChannels', n: real });
    log(`${shapeSaid} · playing it as ${real === 2 ? 'stereo' : 'mono'} instead`, 'warn');
  }

  function onBinary(buf) {
    const s = new DataView(buf).getUint32(0, true);
    // ⚠️ A COUNTER IS ONLY EVIDENCE ON THE FAR SIDE OF A BOUNDARY. This counts
    // gaps in the BOARD's own sequence, so it measures what the relay dropped
    // rather than what this page asked for. Byte 4 carries the board's own
    // `performance.now()`.
    pres.seen();
    pres.checking(false);
    if (lastSeq >= 0 && s > lastSeq + 1) lost += s - lastSeq - 1;
    lastSeq = s;
    frames++;
    if (!firstFrameAt) firstFrameAt = performance.now();
    const pcm = new Int16Array(buf, FRAME_HEADER_BYTES);
    checkShape(pcm.length);
    const f32 = new Float32Array(pcm.length);
    // 🔴 THE LOUDEST SAMPLE, BECAUSE A FRAME COUNT CANNOT TELL SOUND FROM
    // SILENCE. The board captures its JACK graph continuously, so frames arrive
    // at fifty a second whether or not a note is sounding: `104 frames of audio`
    // read green through a reported silence. A level is the quantity in
    // question and a count is one adjacent to it.
    let hi = 0;
    for (let i = 0; i < pcm.length; i++) {
      f32[i] = pcm[i] / 32768;
      const a = f32[i] < 0 ? -f32[i] : f32[i];
      if (a > hi) hi = a;
    }
    if (hi > peak) peak = hi;
    // ⚠️ THE PAGE IS TOLD BEFORE THE BUFFER IS TRANSFERRED, because posting it
    // to the worklet DETACHES it. A page reading `f32` after the post would get
    // a zero-length array and no error at all.
    onPcm?.(f32, { peak: hi, seq: s, samples: pcm.length });
    playout?.port.postMessage({ pcm: f32 }, [f32.buffer]);
  }

  // ── the socket ────────────────────────────────────────────────────────────
  const waiters = [];

  const wire = openWire(room, {
    base: relay,
    onOpen: () => onOpen(),
    onClose: () => log('socket closed · reconnecting'),
    onMessage: (got) => {
      if (got.kind === 'binary') { if (via === 'relay') onBinary(got.data); return; }
      if (got.kind !== 'json') return;
      if (got.msg.from === wire.stats().from) return;    // our own line, echoed back
      /**
       * ⚠️ NOT THE BOARD, AND NOT US. The board's own replies come back through
       * here too and are not somebody driving it; neither is a page merely
       * asking a question. `by` is the sender's own declaration of what kind of
       * client it is, absent for an older page, which reads as `page`.
       */
      if (DRIVES.has(got.msg.type) && got.msg.from && got.msg.from !== boardFrom) {
        droveAt = performance.now();
        droveBy = got.msg.by === 'tool' ? 'tool' : 'page';
        driverTick();
      }
      heard(got.msg);
    },
  });

  /**
   * ⚠️ A QUESTION AND ITS ANSWER CARRY THE SAME `type` ON THIS RELAY. The relay
   * is a broadcast, so another listener merely ASKING looks exactly like the
   * board answering. The board stamps every answer with `re`, the id of the
   * message it answers, which is the only thing that tells them apart.
   */
  function heard(m) {
    for (let i = waiters.length - 1; i >= 0; i--) {
      const w = waiters[i];
      if (w.type !== m.type) continue;
      if (w.re && m.re !== w.re) continue;
      clearTimeout(w.timer); waiters.splice(i, 1); w.resolve(m);
    }
    // The board's stream announcement, if this page was connected when it
    // joined. A measurement outranks a repeated claim, so this only re-opens
    // the question when the claim CHANGES.
    if (m.type === 'board.hello' && m.audioChannels) {
      if (!told || told.audioChannels !== m.audioChannels || told.frameMs !== m.frameMs) {
        told = { audioChannels: m.audioChannels, frameMs: m.frameMs };
        chIn = m.audioChannels === 2 ? 2 : 1;
        shapeChecked = false;
        playout?.port.postMessage({ cmd: 'inChannels', n: chIn });
        log(`the board says it sends ${chIn === 2 ? 'two channels' : 'one channel'} at ${m.frameMs} ms a frame`);
      }
    }
    if (m.type === 'board.hello' || m.type === 'board.alive') {
      boardFrom = m.from || boardFrom;
      if ('direct' in m) boardDirect = !!m.direct;
    }
    // Addressed by the page's own random peer id, not by `boardFrom`, which a
    // page learns only from the next `board.alive`, up to five seconds away.
    if (dx && m.peer === dx.peer && /^rtc\.(answer|candidate|refused)$/.test(m.type)) onSignal(m);
    if (m.from && m.from === boardFrom) { pres.seen(); pres.checking(false); }
    onMessage(m);
  }

  /** Fire and forget. Returns the message's id, so a caller can match a reply
   *  itself, or null if the roof refused it or the socket is not open. */
  function send(msg) {
    /**
     * 🔴 THE GUARD, AND IT IS HERE RATHER THAN AT THE SOCKET. See
     * `inSelfcheck` above. It says so ONCE rather than per message, because a
     * page that sends a controller sixty times a second would otherwise bury
     * its own log, and the count is on `refusedToBoard()` for a check to read.
     */
    if (!driving) {
      if (refused === 0) {
        log('this run may not drive the board, so nothing is being sent to it. '
          + 'add board=1 to the address if you meant to', 'dim');
      }
      refused += 1;
      return null;
    }
    if (via !== 'relay' && dx?.ctl?.readyState === 'open') {
      const id = randomId();
      // ⚠️ NUMBERED, because `ctl` is unordered: the board refuses a note older
      // than the last one it applied to the same key (rig/board/rtc.mjs).
      const out = { ...msg, id, ...(msg.type === 'midi.send' ? { n: ++dxN } : {}) };
      try { dx.ctl.send(JSON.stringify(out)); } catch { return null; }
      return id;
    }
    const out = wire.send(msg);
    if (!out?.sent) return null;
    try { return JSON.parse(out.line).id; } catch { return null; }
  }

  /**
   * Wait for the next reply of a type, resolving null on a timeout rather than
   * hanging. A page that waits forever looks like a page that is still loading,
   * and "nobody answered" is the answer these pages most often have to give.
   */
  function waitFor(type, ms, re = null) {
    return new Promise((resolve) => {
      const w = { type, re, resolve };
      w.timer = setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); resolve(null); }, ms);
      waiters.push(w);
    });
  }

  async function ask(msg, type, ms = 8000) {
    // The id first, so the wait is for THIS answer rather than for the next
    // message of the same shape. On a shared board that can be somebody else's
    // question, or the reply to it.
    const id = send(msg);
    if (!id) return null;
    return waitFor(type, ms, id);
  }

  // ── the direct path ───────────────────────────────────────────────────────
  // `via` is 'relay' until a channel is open, then 'direct', or 'turn' when the
  // selected pair runs through a TURN server. Read from getStats, because a lag
  // measured over a TURN hop is not comparable with one measured direct.
  let via = 'relay', boardDirect = null, dx = null, dxN = 0, rttMs = null, rttTimer = null;

  function useRelay(why) {
    if (via !== 'relay') log(`direct path closed, ${why}. Back on the relay`, 'warn');
    via = 'relay';
    const was = dx; dx = null;
    try { was?.pc.close(); } catch { /* */ }
    told = told && { ...told, frameMs };     // the relay's frame again
    lastSeq = -1; shapeChecked = false;
    playout?.port.postMessage({ cmd: 'floor', ms: cushionMs, adaptive: true, maxMs: maxCushionMs });
  }

  async function onSignal(m) {
    const d = dx;
    if (!d) return;
    try {
      if (m.type === 'rtc.answer') await d.pc.setRemoteDescription({ type: 'answer', sdp: m.sdp });
      else if (m.type === 'rtc.candidate' && m.cand) await d.pc.addIceCandidate({ candidate: m.cand, sdpMid: m.mid || '0' });
      else if (m.type === 'rtc.refused') { d.refused = m.why || 'refused'; d.fail?.(d.refused); }
    } catch (e) { log(`direct path: ${e.message}`, 'dim'); }
  }

  async function pairKind(pc) {
    try {
      const st = await pc.getStats();
      let pair = null;
      st.forEach((r) => { if (r.type === 'transport' && r.selectedCandidatePairId) pair = st.get(r.selectedCandidatePairId); });
      if (!pair) st.forEach((r) => { if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') pair = r; });
      if (!pair) return null;
      const l = st.get(pair.localCandidateId), r = st.get(pair.remoteCandidateId);
      return (l?.candidateType === 'relay' || r?.candidateType === 'relay') ? 'turn' : 'direct';
    } catch { return null; }
  }

  /**
   * Offer the board a direct path. Resolves 'direct', 'turn', 'relay' (no
   * channel within `waitMs`, or the board has none) or 'refused' (this run may
   * not drive the board). Never throws: the relay is always there to fall to.
   */
  async function goDirect({ frameMs: want = 10, waitMs = 3000 } = {}) {
    if (!direct) return 'relay';
    if (!driving) { send({ type: 'rtc.offer' }); return 'refused'; }   // counted and said once, like any send
    if (dx) return via;
    if (boardDirect === false) { log('this board has no direct path, so the relay carries everything', 'dim'); return 'relay'; }
    if (typeof RTCPeerConnection === 'undefined') return 'relay';
    // TURN credentials on the press, never on load (plan §5.5). A failure to
    // fetch them costs only the case where direct needs TURN.
    let iceServers = [{ urls: 'stun:stun.cloudflare.com:3478' }];
    try { const r = await fetch(iceUrl); if (r.ok) iceServers = (await r.json()).iceServers || iceServers; } catch { /* stun only */ }
    const d = dx = { peer: `p${randomId(10)}`, pc: new RTCPeerConnection({ iceServers }), pcm: null, ctl: null, refused: null };
    dxN = 0;
    d.pcm = d.pc.createDataChannel('pcm', { ordered: false, maxRetransmits: 0 });
    d.ctl = d.pc.createDataChannel('ctl', { ordered: false });
    d.pcm.binaryType = 'arraybuffer';
    d.pc.onicecandidate = (e) => { if (e.candidate && dx === d) wire.send({ type: 'rtc.candidate', peer: d.peer, cand: e.candidate.candidate, mid: e.candidate.sdpMid }); };
    d.pc.onconnectionstatechange = () => {
      const st = d.pc.connectionState;
      if (dx === d && (st === 'failed' || st === 'closed')) useRelay(`the connection ${st}`);
    };
    d.pcm.onmessage = (e) => { if (dx === d && via !== 'relay') onBinary(e.data); };
    d.ctl.onmessage = (e) => {
      if (dx !== d) return;
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === 'rtc.hello') {
        told = { audioChannels: m.audioChannels || 1, frameMs: m.frameMs };
        chIn = told.audioChannels === 2 ? 2 : 1; lastSeq = -1; shapeChecked = false;
        playout?.port.postMessage({ cmd: 'inChannels', n: chIn });
        return;
      }
      if (m.type === 'rtc.pong') { if (Number.isFinite(m.t)) rttMs = performance.now() - m.t; return; }
      heard(m);
    };
    d.ctl.onclose = () => { if (dx === d) useRelay('the board closed it'); };
    await d.pc.setLocalDescription(await d.pc.createOffer());
    wire.send({ type: 'rtc.offer', peer: d.peer, sdp: d.pc.localDescription.sdp, frameMs: want });
    const t0 = performance.now();
    const opened = await new Promise((res) => {
      const both = () => d.pcm.readyState === 'open' && d.ctl.readyState === 'open';
      const timer = setTimeout(() => res(false), waitMs);
      d.fail = () => { clearTimeout(timer); res(false); };
      const check = () => { if (both()) { clearTimeout(timer); res(true); } };
      d.pcm.onopen = check; d.ctl.onopen = check;
    });
    if (dx !== d) return via;
    if (!opened) {
      useRelay(d.refused || `no channel opened in ${waitMs} ms`);
      log(`no direct path: ${d.refused || `nothing opened in ${(waitMs / 1000).toFixed(0)} s`}. The relay carries everything`, 'dim');
      return 'relay';
    }
    via = (await pairKind(d.pc)) || 'direct';
    lastSeq = -1; shapeChecked = false;
    playout?.port.postMessage({ cmd: 'floor', ms: directCushionMs ?? cushionMs, adaptive: true, maxMs: maxCushionMs });
    log(`direct path open in ${Math.round(performance.now() - t0)} ms, ${via === 'turn' ? 'through a TURN server' : 'straight to the board'}`, 'hi');
    return via;
  }

  /** Board round trip on whichever path is in use: `rtc.ping` over ctl, or an
   *  `audio.status` question over the relay. Both reach the board and come
   *  back, so the two numbers are the same measurement. */
  async function measureRtt() {
    if (!driving) return null;
    if (via !== 'relay' && dx?.ctl?.readyState === 'open') {
      try { dx.ctl.send(JSON.stringify({ type: 'rtc.ping', id: randomId(), t: performance.now() })); } catch { /* */ }
      return rttMs;
    }
    const t0 = performance.now();
    const r = await ask({ type: 'audio.status' }, 'audio.started', 3000);
    if (r && via === 'relay') rttMs = performance.now() - t0;
    return rttMs;
  }
  function watchRtt(everyMs = 2000) {
    clearInterval(rttTimer); rttTimer = null;
    if (!everyMs) return;                  // 0 stops it
    measureRtt();
    rttTimer = setInterval(measureRtt, everyMs);
  }

  return {
    /** the presence badge. `chip: board.presence.el` on a transport bar. */
    presence: pres,
    /** the openWire handle, for `stats()`, `state()` and `ping()`. */
    wire,
    send,
    /** Is this run allowed to touch the instrument, and how much it refused. */
    driving: () => driving,
    refusedToBoard: () => refused,
    ask,
    waitFor,
    startAudio,
    ping: (ms) => wire.ping(ms),
    state: () => wire.state(),
    /** Offer the direct path; see `direct` above. */
    goDirect,
    /** Keep `stats().rttMs` fresh on whichever path is in use. */
    watchRtt,
    /** which socket in the room is the board, or null if it has not spoken. */
    boardFrom: () => boardFrom,
    ctx: () => ctx,
    playout: () => playout,
    /** Everything measured, in one object, so a page's readout and its checks
     *  read the same numbers rather than two copies that can disagree. */
    stats: () => ({
      frames, lost, peak, firstFrameAt,
      /** `running`, `suspended` or null before there is a context at all. A page
       *  that wants to assert it is playing has to ask this, not the counters. */
      audioState: ctx ? ctx.state : null,
      bufferedMs, starved, trimmed, breaks,
      framesPerSec: firstFrameAt ? frames / Math.max(0.001, (performance.now() - firstFrameAt) / 1000) : 0,
      channels: chIn, shapeChecked, shapeWrong, shapeSaid,
      /** 'relay', 'direct' or 'turn', and the board's own answer time on it. */
      via, rttMs, boardDirect,
      told,
      /** Who else is driving the instrument: 'page', 'tool', or null. */
      driver: pres.driver,
      driverAgoMs: droveAt ? performance.now() - droveAt : null,
    }),
    /**
     * The loudest sample LEAVING the graph right now, 0 to 1, or null when there
     * is no graph yet. This is the only number here that a person can check
     * against their ears.
     */
    outLevel() {
      if (!meterNode || !meterBuf) return null;
      meterNode.getFloatTimeDomainData(meterBuf);
      let hi = 0;
      for (const v of meterBuf) { const a = v < 0 ? -v : v; if (a > hi) hi = a; }
      return hi;
    },

    /** `peak` is a running maximum; a page timing one note resets it. */
    resetPeak: () => { peak = 0; },
    close: () => { clearInterval(rttTimer); useRelay('closing'); pres.stop(); wire.close(); },
  };
}

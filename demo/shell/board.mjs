// demo/shell/board.mjs: the Raspberry Pi, from a browser. The wire, the sound coming back and
// whether anybody is there; the page keeps its own instrument. `openWire` tells a full room
// from a dead relay, which a hand-rolled socket cannot.
// why: lessons/kit-board.md#header

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
 * @param {string} room        the relay room. `studio-1` is the address of the Raspberry Pi.
 * @param {string} [relay]     override the relay base; left out, `openWire` uses `RELAY_BASE`,
 *                             which honours a loopback `?relay=` (`demo/fake-board.mjs`).
 * @param {string} [of]        what the presence badge calls it.
 * @param {boolean} [showName] whether the badge prints that name. See the note below.
 * @param {number} [cushionMs] the playout floor. See the note below.
 * @param {number} [maxCushionMs]
 * @param {number} [everyMs]   the board's heartbeat, 5 s. Required by the badge: a short guess
 *                             calls a working board gone between beats.
 * @param {number} [comingMs]  how long a cold start may take before the badge stops saying "on its way".
 * @param {function} [log]     `d.log`.
 * @param {function} [onPcm]   `(f32, { peak, seq, samples })` after the playout has the frame.
 * @param {function} [onMessage] every JSON message that is not this page's echo.
 * @param {function} [onOpen]  the socket opened.
 * why: lessons/kit-board.md#createboard
 */
export function createBoard({
  room,
  relay = undefined,
  of = 'Raspberry Pi',
  /**
   * Whether the badge prints the name. `null` lets `createPresence` decide (it prints it);
   * `false` keeps it to the tooltip. An option, not CSS, because the name is part of the
   * reserved width: 172.187 px against 86.0933 px. The title still carries the name.
   * why: lessons/kit-board.md#showname
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
   * Whether a harness run may drive the board. Default `'refuse'`: `verify.mjs` presses every
   * control, and the board is a shared Pi. It refuses the send, not the socket, so checks
   * still hear the board. `?board=1` is the escape hatch.
   * why: lessons/kit-board.md#inselfcheck
   */
  inSelfcheck = 'refuse',
  /**
   * A direct WebRTC path beside the relay, off unless asked: `goDirect()` opens `pcm` and `ctl`
   * channels, the relay stays for presence, signalling and fallback. Measured on one network:
   * open in 158 ms, 200 of 200 frames echoed at p50 3.7 ms. An offer is a send, refused in a check.
   * why: lessons/kit-board.md#direct
   */
  direct = false,
  /** The cushion once the direct path is open. The relay's jitter is what the
   *  ordinary `cushionMs` is sized for; a channel four milliseconds away needs
   *  far less, and re-posting the floor also undoes any ratchet the switchover
   *  itself caused. Defaults to `cushionMs`, so nothing changes unless asked. */
  directCushionMs = null,
  iceUrl = 'https://pub.positron.studio/ice',
  /**
   * The page's own AudioContext, so the board's sound can meet the page's (two contexts cannot
   * share a node). Left out, a 48 kHz context of its own. It must run at the board's rate:
   * nothing resamples, so any other rate is refused and `startAudio()` answers null.
   * why: lessons/kit-board.md#audiocontext
   */
  audioContext = null,
  /**
   * `false` builds the playout and its meter and connects them to nothing: the
   * page connects `playout()` where its links say. Default `true`, which is
   * what every caller had before the option existed.
   */
  toDestination = true,
} = {}) {
  if (!room) throw new Error('board: a room is required. `studio-1` is the address of the Raspberry Pi.');
  if (!['refuse', 'allow'].includes(inSelfcheck)) {
    throw new Error(`board: inSelfcheck is 'refuse' or 'allow', not ${JSON.stringify(inSelfcheck)}`);
  }

  /** Is this run allowed to touch the instrument? Read once: a query string
   *  does not change under a running page, and re-reading it per message would
   *  make the answer depend on when it was asked. */
  const q = new URLSearchParams(location.search);
  // Both tiers are a harness (`selfcheck=1` ordinary, `selfcheck=2` deep); only `?board=1`
  // permits driving the board.
  // why: lessons/kit-board.md#driving
  const driving = !['1', '2'].includes(q.get('selfcheck')) || q.get('board') === '1' || inSelfcheck === 'allow';
  let refused = 0;

  // ── the badge ─────────────────────────────────────────────────────────────
  /**
   * The badge carries a second fact: is anybody else driving this, a person or under test.
   * The instrument, not the room, is the unit of contention: a parked tab restating `CC 7 = 22`
   * every 500 ms once held a shared synth at a fortieth of its level for hours.
   * why: lessons/kit-board.md#busy
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
   * Longer than `RESTATE_MS` (500), or a parked page's restates blink the badge.
   * why: lessons/kit-board.md#driving-ms
   */
  const DRIVING_MS = 1500;
  let droveAt = 0, droveBy = null, saidDriver = null;
  // What COUNTS as driving: changing the instrument, rather than asking it
  // something. A page polling `audio.status` is a spectator.
  const DRIVES = new Set(['ctl.set', 'note.on', 'note.off', 'note.panic',
                          'voice.select', 'params.set', 'params.random',
                          'fx.pappus', 'source.set',
                          // the collide engine's (rig/board/scollide.mjs)
                          // why: lessons/kit-board.md#drives-collide
                          'sc.load', 'sc.hit', 'sc.set']);

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
  const driverTimer = setInterval(driverTick, 250);

  /**
   * Only the board counts as the board: the relay is verbatim, so any other message would paint
   * the badge green with the Pi unplugged. Learned from `board.hello` and `board.alive` (its
   * `from` is per socket), and from audio, which only the board sends.
   * why: lessons/kit-board.md#boardfrom
   */
  let boardFrom = null;

  // ── audio ─────────────────────────────────────────────────────────────────
  let ctx = null, playout = null, meterNode = null, meterBuf = null;
  let bufferedMs = 0, starved = 0, trimmed = 0, breaks = -1;
  // The floor the worklet is holding now (it ratchets 1.5x on each starve), and
  // the silence those starves cost. Read by remote/010 to split key to sound.
  let floorMs = null, starvedMs = 0;
  let frames = 0, lost = 0, lastSeq = -1, firstFrameAt = 0, peak = 0;
  let told = null;                    // what `board.hello` announced, if we heard it
  let chIn = channels, shapeChecked = false, shapeWrong = 0, shapeSaid = '';

  // One build shared by every caller. A failed build is forgotten, so the
  // next call tries again rather than handing back a context with no playout.
  let starting = null;
  function startAudio() {
    starting ||= buildAudio().catch((e) => {
      log(`the board's sound could not be built: ${e?.message || e}`, 'bad');
      if (ctx && ctx !== audioContext) ctx.close().catch(() => {});
      ctx = null; playout = null; meterNode = null; meterBuf = null;
      starting = null;
      return null;
    });
    return starting;
  }

  async function buildAudio() {
    if (audioContext && audioContext.sampleRate !== rate) {
      log(`this page's audio runs at ${audioContext.sampleRate} Hz and the board sends ${rate}. Nothing in the chain resamples, so the board's sound is not played into it`, 'bad');
      return null;
    }
    // Ask for the board's rate, because nothing resamples: at 44.1 kHz the pitch is wrong and the
    // ring overfills, so the guard trims and clicks while every readout stays green.
    // why: lessons/kit-board.md#rate
    ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)({ sampleRate: rate, latencyHint: 'interactive' });
    // Fire and move on: `resume()` waits on a gesture and never rejects, so awaiting it hangs.
    // why: lessons/kit-board.md#resume
    ctx.resume().catch(() => { /* a suspended context is allowed. Sound is late, not broken */ });
    /**
     * If the context never starts, the page says so: suspended, frames arriving and nothing plays
     * (measured: arrived peak 0.136, output peak 0.000). It waits a beat first, since every start
     * is briefly suspended, and `statechange` takes the line back.
     * why: lessons/kit-board.md#suspended
     */
    /**
     * Any gesture resumes it: WebKit needs the call inside a gesture handler, so every gesture gets
     * one attempt until running. `touchend` as well as `pointerdown`; passive and capturing, so
     * they cannot block a scroll or be swallowed.
     * why: lessons/kit-board.md#gestures
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
      // The line promises only what the page does: a click anywhere now resumes it.
      // why: lessons/kit-board.md#suspended-line
      log(`the sound is built and arriving but this browser has not let it start: the audio is ${ctx.state}. `
        + 'Tap anywhere on the page and it will start', 'bad');
    };
    ctx.addEventListener('statechange', watchState);
    setTimeout(watchState, 600);
    // A request, not a guarantee. No readout cell for it; it speaks only when the rate differs.
    // why: lessons/kit-board.md#rate-check
    if (ctx.sampleRate !== rate) {
      log(`this browser runs audio at ${ctx.sampleRate} Hz and the board sends ${rate}. Nothing in the chain resamples, so the pitch will be off by ${(rate / ctx.sampleRate).toFixed(3)}x and you will hear clicks`, 'bad');
    }
    await ctx.audioWorklet.addModule(PLAYOUT_URL);
    playout = new AudioWorkletNode(ctx, 'pcm-playout',
      { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
    if (toDestination) playout.connect(ctx.destination);
    /**
     * A meter on what leaves, because every other number is about what arrives, and a page once
     * showed fifty frames a second and a healthy peak while nothing was audible. Tapped in
     * parallel, not inserted, so a meter cannot break what it measures.
     * why: lessons/kit-board.md#meter
     */
    meterNode = ctx.createAnalyser();
    meterNode.fftSize = 1024;
    playout.connect(meterNode);
    meterBuf = new Float32Array(meterNode.fftSize);
    /**
     * The worklet posts its counters every 250 ms; a statistic nobody displays is not
     * instrumentation.
     * why: lessons/kit-board.md#playout-counters
     */
    playout.port.onmessage = (e) => {
      const st = e.data?.stats; if (!st) return;
      bufferedMs = st.bufferedMs; floorMs = st.floorMs ?? null; starvedMs = st.underrunMs ?? 0;
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
     * The cushion is ours, not the browser's. The default is the smaller one and a page may raise
     * it; measured off this relay: mean gap 20.0 ms, p99 43.5, worst 83.6 ms. The floor ratchets.
     * why: lessons/kit-board.md#cushion
     */
    playout.port.postMessage({ cmd: 'floor', ms: cushionMs, adaptive: true, maxMs: maxCushionMs });
    return ctx;
  }

  /**
   * The shape of what arrived, checked rather than inferred: 960 int16s is 20 ms mono or 10 ms
   * stereo, and a wrong guess plays an octave down. Checked against the board's published
   * framing, since `board.hello` is missed by a page that joins later.
   * why: lessons/kit-board.md#checkshape
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
    // Gaps in the board's own sequence, so this measures what the relay dropped.
    // Byte 4 carries the board's own `performance.now()`.
    // why: lessons/kit-board.md#sequence
    pres.seen();
    pres.checking(false);
    if (lastSeq >= 0 && s > lastSeq + 1) lost += s - lastSeq - 1;
    lastSeq = s;
    frames++;
    if (!firstFrameAt) firstFrameAt = performance.now();
    const pcm = new Int16Array(buf, FRAME_HEADER_BYTES);
    checkShape(pcm.length);
    const f32 = new Float32Array(pcm.length);
    // The loudest sample, because frames arrive at fifty a second whether or not a note sounds.
    // why: lessons/kit-board.md#peak
    let hi = 0;
    for (let i = 0; i < pcm.length; i++) {
      f32[i] = pcm[i] / 32768;
      const a = f32[i] < 0 ? -f32[i] : f32[i];
      if (a > hi) hi = a;
    }
    if (hi > peak) peak = hi;
    // The page is told before the transfer, which detaches the buffer to a zero-length array.
    // why: lessons/kit-board.md#onpcm-order
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
       * Not the board and not us; a page merely asking is not driving. `by` is the sender's own
       * declaration, absent for an older page, which reads as `page`.
       * why: lessons/kit-board.md#busy-sender
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
   * A question and its answer carry the same `type` on this broadcast relay; the board stamps
   * every answer with `re`, the id it answers.
   * why: lessons/kit-board.md#heard
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
     * The guard, at the send rather than the socket (see `inSelfcheck`). It says so once;
     * the count is on `refusedToBoard()`.
     * why: lessons/kit-board.md#send-guard
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
      // Numbered, because `ctl` is unordered: the board refuses a note older than the last on that
      // key (rig/board/rtc.mjs), or a note off overtaking its note on leaves a note held.
      // why: lessons/kit-board.md#numbered
      const out = { ...msg, id, ...(/^(midi\.send|note\.on|note\.off)$/.test(msg.type) ? { n: ++dxN } : {}) };
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

  /**
   * Ask on the direct link or not at all, for a secret such as the Pi camera's key: `ask` falls
   * back to the tokenless relay room, so this answers null instead.
   * why: lessons/kit-board.md#askdirect
   */
  async function askDirect(msg, type, ms = 3000) {
    if (!driving || via === 'relay' || dx?.ctl?.readyState !== 'open') return null;
    const id = randomId();
    try { dx.ctl.send(JSON.stringify({ ...msg, id })); } catch { return null; }
    return waitFor(type, ms, id);
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
  // The board's wall clock against this one, from `rtc.pong`'s `at`: board minus here, in ms,
  // at the round trip's middle. A property of the clocks, so it survives a fall back. Null until measured.
  // why: lessons/kit-board.md#clock-offset
  let clockOffsetMs = null;

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
      if (m.type === 'rtc.pong') {
        if (Number.isFinite(m.t)) {
          rttMs = performance.now() - m.t;
          if (Number.isFinite(m.at)) clockOffsetMs = m.at - (Date.now() - rttMs / 2);
        }
        return;
      }
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
    askDirect,
    waitFor,
    startAudio,
    ping: (ms) => wire.ping(ms),
    state: () => wire.state(),
    /** Offer the direct path; see `direct` above. */
    goDirect,
    /**
     * Another data channel on the open direct link, or null while there is none; the board sends
     * nothing on a listed label until asked over `ctl` (rig/board/rtc.mjs `channels`).
     * why: lessons/kit-board.md#channel
     */
    channel(label, opts = {}) {
      if (via === 'relay' || !dx?.pc) return null;
      try { const dc = dx.pc.createDataChannel(label, opts); dc.binaryType = 'arraybuffer'; return dc; } catch { return null; }
    },
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
      bufferedMs, floorMs, starved, starvedMs, trimmed, breaks,
      framesPerSec: firstFrameAt ? frames / Math.max(0.001, (performance.now() - firstFrameAt) / 1000) : 0,
      channels: chIn, shapeChecked, shapeWrong, shapeSaid,
      /** 'relay', 'direct' or 'turn', and the board's own answer time on it. */
      via, rttMs, boardDirect, clockOffsetMs,
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
    close: () => { clearInterval(rttTimer); clearInterval(driverTimer); useRelay('closing'); pres.stop(); wire.close(); },
  };
}

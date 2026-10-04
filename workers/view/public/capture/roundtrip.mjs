// ROUND TRIP, from the retired `/keep/` (2026-10-04, `plans/plan-demo-structure.md`
// §3.5). The picture you send goes out to Cloudflare over WHIP and comes back
// over WHEP, and what you record is the copy that came back. Every frame
// carries a clock written into the pixels before it left, so dragging the line
// and watching that clock move by the same amount proves the seek landed.
//
// 🔴 THE ROUND TRIP IS A DEEP CHECK. It holds a WHIP and a WHEP leg on
// Cloudflare Stream for 20 to 30 s and records two takes, which is Stream
// minutes on every run. An ordinary run (`selfcheck=1`) presses Send and
// receive, grades the one thing that needs no leg (the relay servers were asked
// for on the press and not on load), and stops with `left for the deep run`.
// `DEMO_DEEP=1 node demo/verify.mjs capture` runs `roundTripChecks()`, keep's
// fourteen, unchanged. A person's press is never affected.
//
// WHAT CHANGED IN THE MOVE:
//   - `keep` published four readout keys and hid the row. The round trip and
//     the route already sit on the received picture as panel values, so the
//     four are gone rather than drawn as a second copy.
//   - `keep` fetched its remembered R2 takes back on LOAD with `?r2=1`. A tab
//     opens nothing until a press (`tab-page.mjs` rule 1), so they come back on
//     the first press of Send and receive, and the log says so on open.

import { el, armVideo, recorderMime } from '/shell/shell.mjs';
import { putWhole, fetchBack } from '/shell/ingest.mjs';
import { whipPublish, whepPlay, whep, fetchIceServers, readIcePath } from '/shell/live.mjs';
import { createPanelValues } from '/shell/video-panel.mjs';
import { readBurnedFrom, videoHue } from '/shell/pattern.mjs';
import { createTransportBar } from '/shell/transport-bar.mjs';
import { createStripView } from '/shell/strip.mjs';
import { createDeck } from '/timeline/transport.mjs';
import { mediaMaster } from '/timeline/media-master.mjs';
import { ifSelfcheck, SELFCHECK, DEEP } from '/shell/selfcheck.mjs';
import { createButtonRow, createSource, resolveDuration, requests, wait } from './common.mjs';

const CAP_MS = 10_000;   // a backstop, not the mechanism: stop is manual
const SLICE_MS = 500;
const FPS = 25, FRAME_MS = 1000 / FPS;

// No readout: see the header.
export const readout = null;

export function build({ panel, assert, log }) {
  // R2 IS OPT-IN, by `?r2=1`, exactly as SEGMENTS does it: the caps are real.
  const useR2 = new URLSearchParams(location.search).get('r2') === '1';

  // WHAT SURVIVES A RELOAD: localStorage holds only what is needed to find the
  // R2 takes again, never the video, and anything past its six hours is
  // dropped on the way in rather than fetched and found missing.
  const REMEMBER = 'keep.takes.v1';
  const remembered = () => {
    try {
      const all = JSON.parse(localStorage.getItem(REMEMBER) || '[]');
      return all.filter((t) => t.expiresAt && new Date(t.expiresAt) > new Date());
    } catch { return []; }
  };
  const remember = (t) => {
    try { localStorage.setItem(REMEMBER, JSON.stringify([...remembered(), t])); } catch { /* full or off */ }
  };
  const forget = () => { try { localStorage.removeItem(REMEMBER); } catch { /* off */ } };

  const ink = (h, s, l, a = 1) => `hsl(${h} ${s}% ${l}% / ${a})`;

  // Declared above the source, whose first frame is drawn during build.
  const parts = [];      // { n, hue, mime, blobs[], bytes, lenMs, startMs, video }
  let totalMs = 0, recording = null, landing = null, active = null;
  let pub = null, sub = null, legs = [];
  const scratch = document.createElement('canvas');

  // ── the source: our own picture, published out ──────────────────────────
  // ALIVE WHILE A LEG IS UP: a captured stream off a canvas that stops being
  // drawn stops, and the far end would freeze for a reason that is not the
  // network's.
  const source = createSource({
    opts: () => ({ hue: videoHue(parts.length) }),
    alive: () => !!pub,
    media: true,
  });
  const stage = el('div', 'cap-pair');
  const srcFig = el('figure');
  srcFig.append(source.canvas, el('figcaption', 'pos-cap', 'sent'));
  const seqFig = el('figure');
  const seq = el('div', 'cap-seq');
  const live = el('video', '', null, { playsinline: '', muted: '' });
  live.muted = true;
  seq.append(live);
  const seqCap = el('figcaption', 'pos-cap', 'received');
  // THE ROUND TRIP AND THE ROUTE IT TOOK, AS TWO CELLS on the picture they
  // describe: `direct`, or `relay` when either leg went through Cloudflare's
  // TURN relay, because a relayed round trip is not comparable to a direct one.
  const legVals = createPanelValues([
    { key: 'rt', label: 'round trip', reserve: 7 },
    { key: 'path', label: '', reserve: 6 },
  ]);
  const median = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
  const legText = () => { legVals.set('rt', legs.length ? `+${Math.round(median(legs))} ms` : ''); };
  seqFig.append(seq, seqCap, legVals.el);
  stage.append(srcFig, seqFig);

  const row = createButtonRow([
    { id: 'go', label: 'Send and receive', primary: true },
    { id: 'camera', label: 'Use the camera' },
    { id: 'clear', label: 'Delete takes', end: true },
  ], log);
  panel.add(stage, row.el);

  row.on('camera', () => source.camera(log));

  row.on('clear', () => {
    if (checking) { log('the checks are using the takes, so they stay until those finish'); return; }
    if (recording) { log('stop recording first'); return; }
    for (const p of parts) { try { p.video.remove(); URL.revokeObjectURL(p.url); } catch { /* gone */ } }
    parts.length = 0; totalMs = 0; active = null; handovers = [];
    deck.setRange([0, CAP_MS]);
    deck.seek(0);
    live.hidden = false;
    legText();
    asserted = false; didClock = false;
    paint();
    forget();
    log('takes deleted, and forgotten. The R2 files stay until their six hours '
      + 'are up, but this tab will not pick them up again');
  });

  // ── the line ──────────────────────────────────────────────────────────────
  const deck = createDeck({ items: [], adapters: {}, range: [0, CAP_MS] });
  const inFlight = () => {
    const r = recording;
    if (!r) return null;
    return { ...r.part, lenMs: Math.min(CAP_MS, performance.now() - r.t0) };
  };
  const shown = () => { const l = inFlight() || landing; return l ? parts.concat([l]) : parts; };
  const partAt = (pos) => parts.find((p) => pos >= p.startMs && pos < p.startMs + p.lenMs);
  const localOf = (p, ms) => Math.max(0, Math.min((p.lenMs ?? 0) - 40, ms - p.startMs)) / 1000;

  // ── the round trip ────────────────────────────────────────────────────────
  // 🔴 RELAY SERVERS ARE ASKED FOR ON THE PRESS, NEVER ON LOAD, and handed to
  // both legs. `fetchIceServers` never throws: with no relay it returns STUN
  // alone and says why. ICE still picks the route.
  let ice = null, iceAsks = 0, pressAt = null;
  // Measured, not counted by this tab: every request the browser made to the
  // relay route, from resource timing, and how many started before the press.
  const iceLoadAsks = () => requests((u) => /\/ice(\?|$)/.test(u), pressAt);
  let paths = { out: null, back: null };
  const routeOf = () => {
    const { out, back } = paths;
    if (!out?.path || !back?.path) return null;
    return out.path === 'relay' || back.path === 'relay' ? 'relay' : 'direct';
  };
  async function readPaths() {
    if (!pub || !sub) return;
    const [out, back] = await Promise.all([readIcePath(pub.pc), readIcePath(sub.pc)]);
    const was = routeOf();
    paths = { out, back };
    const now = routeOf();
    legVals.set('path', now || '');
    if (now && now !== was) {
      const say = (p) => (p.path === 'relay' ? `relay over ${p.relayProtocol || p.protocol}` : `direct over ${p.protocol}`);
      log(`out ${say(out)}, back ${say(back)}`, 'hi');
    }
  }

  let restored = false;
  row.on('go', async () => {
    if (pub) { log('already sending'); return; }
    pressAt ??= performance.now();
    if (useR2 && !restored) { restored = true; await restore(); }
    iceAsks++;
    ice = await fetchIceServers({ log: (m) => log(m) });
    // 🔴 GRADED HERE, RIGHT AFTER THE PRESS: it is the one fact that needs no
    // leg, so it runs on an ordinary run as well.
    assert('relay servers were asked for on the press and not on load',
      iceAsks >= 1 && iceLoadAsks() === 0 && !!ice,
      `${iceAsks} ask(s) after the press, ${iceLoadAsks()} before it by resource timing, `
      + (ice.relay ? 'a relay came back' : `no relay: ${ice.why}`));
    // 🔴 THE ROUND TRIP IS A DEEP CHECK (see the header).
    if (SELFCHECK && !DEEP) {
      log('left for the deep run: the round trip through Cloudflare and its two takes (DEMO_DEEP=1)');
      return;
    }
    const noLegs = async (why) => {
      assert('both legs hold what the ask returned', false, why);
      assert('the path the media took is named beside the round trip', false, why);
      // red with the reason rather than missing, so the count does not move
      // with the network
      if (SELFCHECK) await roundTripChecks();
    };
    try {
      pub = await whipPublish(source.canvas.captureStream(FPS), { iceServers: ice.iceServers, log });
    } catch (e) { log(`send failed: ${e.message}`, 'bad'); await noLegs(`send failed: ${e.message}`); return; }
    try {
      sub = await whepPlay(whep(), live, { iceServers: ice.iceServers, log });
    } catch (e) { log(`receive failed: ${e.message}`, 'bad'); await noLegs(`receive failed: ${e.message}`); return; }
    armVideo(live);
    // a WHEP track exists before it carries anything, so wait for a frame
    for (let i = 0; i < 120 && !live.videoWidth; i++) await wait(250);
    log(live.videoWidth ? `receiving ${live.videoWidth}x${live.videoHeight}` : 'no picture arrived', live.videoWidth ? 'hi' : 'bad');
    legSampler();
    for (let i = 0; i < 8 && !routeOf(); i++) {
      await readPaths();
      if (!routeOf()) await wait(500);
    }
    setInterval(readPaths, 2000);
    const conf = [pub, sub].map((x) => (x.pc.getConfiguration().iceServers || []).flatMap((s) => [].concat(s.urls)));
    assert('both legs hold what the ask returned',
      conf.every((c) => c.length > 0 && (!ice.relay || c.some((u) => /^turns?:/.test(u)))),
      conf.map((c, i) => `${i ? 'back' : 'out'} ${c.length} url(s), ${c.filter((u) => /^turns?:/.test(u)).length} TURN`).join(', '));
    const shownPath = legVals.cell('path').textContent.trim();
    const route = routeOf();
    assert('the path the media took is named beside the round trip',
      (route === 'direct' || route === 'relay') && shownPath === route,
      route
        ? `${route}: out ${paths.out.local} over ${paths.out.protocol}, back ${paths.back.local} over ${paths.back.protocol}, cell ${JSON.stringify(shownPath)}`
        : 'the selected candidate pairs could not be read');
    // THE REST RUN FROM HERE, INSIDE THE PRESS, AND ONLY UNDER A HARNESS: the
    // button stays busy while they run, and the tab's check awaits the press.
    if (SELFCHECK) await roundTripChecks();
  });

  /**
   * HOW FAR THE PICTURE TRAVELLED, on one clock. The number in the received
   * frame was written by THIS machine before the picture left, so `now -
   * burned` is the whole round trip with no cross-machine offset to guess at.
   */
  let readable = 0, unreadable = 0;
  function legSampler() {
    setInterval(() => {
      if (!live.videoWidth) return;
      const e = readBurnedFrom(live, scratch);
      if (e === null) { unreadable++; return; }
      readable++;
      const ms = Date.now() - e;
      if (ms > 0 && ms < 10000) legs.push(ms);
      if (legs.length > 200) legs = legs.slice(-200);
      legText();
    }, 200);
  }

  // ── recording the RECEIVED picture ────────────────────────────────────────
  function startRecording() {
    if (recording || !sub) { if (!sub) log('nothing to record yet. Press Send and receive', 'bad'); return null; }
    const mime = recorderMime({ log });
    if (!mime) return null;
    // THE RECEIVER'S TRACK, not the source, and VIDEO ONLY: Cloudflare refuses a
    // single-track WHEP offer, so the subscription carries a live, forever
    // silent audio track, and a MediaRecorder handed it writes NOTHING.
    const vTracks = sub.inbound.getVideoTracks();
    if (!vTracks.length) { log('no video track to record', 'bad'); return null; }
    const rec = new MediaRecorder(new MediaStream(vTracks), { mimeType: mime, videoBitsPerSecond: 900_000 });
    rec.onerror = (ev) => log(`recorder: ${ev.error?.name ?? 'error'}`, 'bad');
    const part = { n: parts.length + 1, hue: videoHue(parts.length), mime,
                   blobs: [], chunks: [], bytes: 0, startMs: totalMs, lenMs: null, video: null };
    const t0 = performance.now();
    rec.ondataavailable = (e) => {
      if (!e.data || !e.data.size) return;
      part.blobs.push(e.data);
      part.bytes += e.data.size;
      paint();
    };
    let landed;
    part.done = new Promise((r) => { landed = r; });
    rec.onstop = async () => {
      try {
        landing = { ...part, lenMs: Math.round(performance.now() - t0) };
        recording = null;
        setRecUI(false);
        view.strip.state.wallAnchor = null;
        deck.setRange([0, Math.round(totalMs + landing.lenMs)]);
        await wait(250);
        await landPart(part);
        landing = null;
        await runChecks();
      } finally { landed(); }
    };
    recording = { rec, part, t0 };
    rec.start(SLICE_MS);
    setRecUI(true);
    view.strip.armWall(part.startMs);
    log(`take ${part.n}: recording what came back, ${CAP_MS / 1000}s cap`, 'hi');
    recording.capTimer = setTimeout(() => {
      if (recording?.rec === rec) { log(`take ${part.n}: hit the cap`); stopRecording(); }
    }, CAP_MS);
    return part.done;
  }
  function stopRecording() {
    if (!recording) return;
    clearTimeout(recording.capTimer);
    try { recording.rec.stop(); } catch { /* already */ }
  }
  function setRecUI(on) {
    const b = bar.extra('rec');
    if (!b) return;
    b.dataset.on = on ? '1' : '';
    b.textContent = on ? '■' : '●';
    b.setAttribute('aria-label', on ? 'Stop recording' : 'Record');
  }

  async function landPart(part) {
    if (!part.blobs.length) { log(`take ${part.n}: nothing recorded`, 'bad'); return; }
    // WHERE THE PICTURE COMES BACK FROM decides what this tab is claiming. In R2
    // mode the local copies are DROPPED and playback is fetched back. ONE FILE
    // PER TAKE: an eight-second take is about 900 KB, and slicing it buys
    // nothing while costing a dense sequence the worker would refuse whole.
    let blob = null;
    if (useR2) {
      const whole = new Blob(part.blobs, { type: part.mime });
      const put = await putWhole(whole, { log });
      if (put) {
        part.manifest = put.url;
        part.expiresAt = put.expiresAt;
        log(`take ${part.n}: ${Math.round(whole.size / 1024)} KiB stored as one file`, 'hi');
        blob = await fetchBack(put.url, part.mime, { log });
        if (blob) {
          part.blobs.length = 0;                       // the local copy is gone
          remember({ url: put.url, mime: part.mime, expiresAt: put.expiresAt });
        } else log(`take ${part.n}: could not fetch it back, keeping the local copy`, 'bad');
      }
    }
    part.from = blob ? 'r2' : 'local';
    part.url = URL.createObjectURL(blob || new Blob(part.blobs, { type: part.mime }));
    addVideo(part);
    part.lenMs = Math.round((await resolveDuration(part.video)) ?? (performance.now()));
    if (part.startMs !== totalMs) part.startMs = totalMs;
    totalMs += part.lenMs;
    parts.push(part);
    deck.setRange([0, Math.round(totalMs)]);
    if (!active) handOver(part, 0);
    startTicking();
    paint();
    log(`take ${part.n} landed: ${(part.lenMs / 1000).toFixed(2)}s at `
      + `${(part.startMs / 1000).toFixed(2)}s, playing from ${part.from === 'r2' ? 'R2' : 'memory'}`, 'hi');
    if (part.expiresAt) {
      const mins = Math.round((new Date(part.expiresAt) - Date.now()) / 60000);
      log(`this recording is deleted in ${Math.floor(mins / 60)}h ${mins % 60}m. Six hours is the cap, `
        + 'and a cron enforces it', 'hi');
    }
  }

  function addVideo(part) {
    const v = el('video', '', null, { playsinline: '', muted: '' });
    v.muted = true; v.hidden = true;
    // armed BEFORE the source: with no src, play() rejects and the activation is
    // consumed without starting anything (media-master L1, see TAKES)
    armVideo(v);
    v.autoplay = false;
    v.src = part.url;
    seq.append(v);
    part.video = v;
    v.addEventListener('seeked', () => {
      if (queuedSeek && queuedSeek.p === part) {
        const q = queuedSeek; queuedSeek = null;
        part.video.currentTime = q.want;
      }
    });
  }

  // ── one picture under the playhead at a time ──────────────────────────────
  const mm = mediaMaster(deck, () => {
    const p = active;
    if (!p || !p.video) return null;
    return { el: p.video, pos: p.startMs + p.video.currentTime * 1000, key: `take${p.n}` };
  }, {
    autoPlayPause: false,
    onEvent: (e) => log(`clock: ${e.reason}${e.key ? `, ${e.key}` : ''}`),
  });
  let rafOn = false, handovers = [];
  const startTicking = () => {
    if (!rafOn) { rafOn = true; (function loop() { requestAnimationFrame(loop); tick(); })(); }
  };
  function handOver(p, pos) {
    const from = active;
    if (from && from.video) { from.video.pause(); from.video.hidden = true; }
    active = p;
    p.video.hidden = false;
    live.hidden = true;
    const want = localOf(p, pos);
    if (Math.abs(p.video.currentTime - want) > 0.08) p.video.currentTime = want;
    mm.release('handover');
    handovers.push(`${from ? from.n : 'none'} to ${p.n} at ${Math.round(pos)}`);
  }
  // EVERY SEEK IS A COMMAND TO THE ELEMENT. Without this mirror the clock check
  // read the SAME frame twice: "playhead +2161 ms, picture +0 ms".
  let inServo = false, queuedSeek = null;
  deck.transport.onState((st) => {
    if (st.reason !== 'seek' || inServo || !parts.length) return;
    const pos = st.p0;
    const p = partAt(pos);
    if (!p) return;
    if (p !== active) handOver(p, pos);
    const want = localOf(p, pos);
    if (p.video.seeking) { queuedSeek = { p, want }; return; }
    queuedSeek = null;
    p.video.currentTime = want;
  });

  function tick() {
    if (!parts.length) return;
    const playing = deck.playing();
    let pos = deck.position();
    if (active && active.video.ended) {
      const next = parts[parts.indexOf(active) + 1];
      if (next) pos = next.startMs;
      else if (playing) { deck.pause(); log('the line ran out'); }
    }
    const want = partAt(pos);
    if (want && want !== active) handOver(want, pos);
    if (active && active.video) {
      if (playing && active.video.paused && !active.video.ended) active.video.play().catch(() => {});
      if (!playing && !active.video.paused) active.video.pause();
    }
    inServo = true;
    try { mm.tick(); } finally { inServo = false; }
  }

  // ── the picture of the line ───────────────────────────────────────────────
  const takeLane = {
    id: 'parts', kind: 'part', label: 'takes', height: 52, barPad: 8,
    as: 'spans', stack: false, barGap: 3, terse: true, alpha: 0.9, spanLine: false,
    colorOf: (sp) => ink(sp.row?.payload?.hue ?? 210, 62, 68),
    labelOf: (sp, { bw }) => {
      const p = sp.row?.payload || {};
      return bw > 110 ? `take ${p.n}, ${(p.lenMs / 1000).toFixed(2)}s` : `${p.n}`;
    },
    rows: () => shown().map((p) => ({
      at: p.startMs, id: `take${p.n}`, kind: 'part',
      payload: { durMs: p.lenMs, n: p.n, hue: p.hue, lenMs: p.lenMs, kib: Math.round(p.bytes / 1024) },
    })),
    describeRow: (r) => [`${r.payload.kib} KiB`, `${(r.payload.lenMs / 1000).toFixed(2)}s of the line`],
  };

  const tl = panel.stack().el;
  const bar = createTransportBar(tl, deck, {
    scrub: false,
    publish: false,
    extras: [{ id: 'rec', label: '●', aria: 'Record', primary: true,
               title: `stop when you like. ${CAP_MS / 1000}s cap`,
               onClick: () => {
                 if (checking) { log('the checks are recording, this press waits for them'); return; }
                 return recording ? stopRecording() : startRecording();
               } }],
  });
  const view = createStripView(tl, deck, {
    size: 'auto', follow: false, gutter: 150, wallStyle: 'head',
    lanes: [takeLane],
  });
  const stripCanvas = tl.querySelector('canvas.pos-strip');

  function paint() { view.strip.invalidate(); }
  setInterval(() => { if (recording) paint(); }, 40);

  // ── the checks ────────────────────────────────────────────────────────────
  let asserted = false, didClock = false, checking = false;

  /**
   * 🔴 EVERY CHECK `keep` HAS, DRIVEN TO THE END, FROM ONE PLACE. Called after
   * the round trip is up (or has failed), under SELFCHECK only: it records two
   * short takes of what came back and lets each land. Every assert is made
   * exactly once whatever happens, red with the reason when the network gave
   * nothing to record, so the count is the same on a run where WHEP media never
   * arrived. ⚠️ It waits for a READABLE frame first: Cloudflare ramps WHEP up
   * from 640x360, where the burned row cannot be read. 20 s at most.
   */
  async function roundTripChecks() {
    if (checking) return;
    checking = true;
    try {
      if (sub && live.videoWidth && sub.inbound.getVideoTracks().length) {
        for (let i = 0; i < 80 && readable === 0; i++) await wait(250);
        log(`checks: recording two takes, ${readable} clean frame(s) read so far`);
        for (const ms of [3000, 2500]) {
          const done = startRecording();
          if (!done) break;
          await wait(ms);
          stopRecording();
          await Promise.race([done, wait(15000)]);
        }
      }
      if (!asserted) await runChecks();
      if (!didClock) { didClock = true; await clockChecks(); }
    } finally { checking = false; }
  }

  async function runChecks() {
    if (!asserted) {
      asserted = true;
      assert('the picture went out and came back', !!pub && !!sub && live.videoWidth > 0,
        live.videoWidth ? `${live.videoWidth}x${live.videoHeight}` : 'no frame');
      assert('what was recorded is the RECEIVED track, not the source',
        !!recording || parts.length > 0
          ? sub.pc.getReceivers().some((r) => r.track && sub.inbound.getTracks().includes(r.track))
          : false,
        'by object identity against getReceivers()');
      assert('the round trip is a real number, not a guess', legs.length > 0 && median(legs) > 0,
        legs.length ? `${Math.round(median(legs))} ms, n=${legs.length}` : 'nothing read');
      // THE ROW NEEDS FULL RESOLUTION: WHEP ramps 640x360, 960x540, 1280x720
      // over the first half-minute, and the row is drawn on a 1280 grid.
      assert('the clock survived the round trip', readable > 0,
        `${readable} clean of ${readable + unreadable} read, now ${live.videoWidth}x${live.videoHeight}`);
      assert('the format was negotiated, not assumed', !!parts[0]?.mime, parts[0]?.mime || 'none');
      assert('the take is seekable: a finite range, not Infinity',
        Number.isFinite(deck.durationMs) && deck.durationMs > 0, `${deck.durationMs} ms`);
      // TWO SLOTS, ALWAYS, saying which mode they graded.
      const p0 = parts[0];
      assert('the upload leg did what the mode asked',
        useR2 ? !!p0?.manifest : !p0?.manifest,
        useR2 ? `R2: ${p0?.manifest ? 'stored' : 'NOT stored'}` : 'off (add ?r2=1)');
      assert('playback comes from where the mode says',
        useR2 ? (p0?.from === 'r2' && p0.blobs.length === 0) : p0?.from === 'local',
        `${p0?.from ?? 'none'}${useR2 ? `, ${p0?.blobs.length ?? '?'} local copies kept` : ''}`);
    }
    if (parts.length >= 2 && !didClock) { didClock = true; await clockChecks(); }
    else if (parts.length < 2) {
      log(`${parts.length} take on the line. The clock check needs a second one, so press record again.`);
    }
  }

  /**
   * THE CHECK THIS TAB EXISTS FOR. The number was written BEFORE the picture
   * crossed a real network and two encoders, and the receiving side cannot fake
   * it. Seek to two positions inside ONE take, read the clock out of the pixels
   * at each, and assert it advanced by as much as the playhead did. Across two
   * takes it would measure the pause between them, which the line throws away
   * and the pixels keep.
   */
  async function clockChecks() {
    if (parts.length < 2) {
      const why = `${parts.length} take(s) landed, the clock check needs two`;
      assert('takes are laid end to end: no gap, no overlap', false, why);
      assert('exactly one take is under the playhead', false, why);
      assert('the clock in the picture moved with the playhead', false, why);
      return;
    }
    assert('takes are laid end to end: no gap, no overlap',
      parts.every((p, i) => (i === 0 ? p.startMs === 0 : p.startMs === parts[i - 1].startMs + parts[i - 1].lenMs)),
      parts.map((p) => `${p.n}@${p.startMs}+${p.lenMs}`).join(' '));
    assert('exactly one take is under the playhead',
      parts.filter((p) => deck.position() >= p.startMs && deck.position() < p.startMs + p.lenMs).length === 1,
      `at ${Math.round(deck.position())} ms`);

    // 🔴 EVERYTHING BELOW DRIVES THE PLAYHEAD, so it waits for a harness.
    await ifSelfcheck(async () => {
      const readAt = async (pos) => {
        deck.seek(pos);
        await wait(700);
        const p = partAt(pos);
        return p ? readBurnedFrom(p.video, scratch) : null;
      };
      const long = parts.reduce((a, b) => (b.lenMs > a.lenMs ? b : a));
      const p1 = Math.round(long.startMs + long.lenMs * 0.2);
      const p2 = Math.round(long.startMs + long.lenMs * 0.75);
      const e1 = await readAt(p1), e2 = await readAt(p2);
      if (e1 === null || e2 === null) {
        assert('the clock in the picture moved with the playhead', false,
          `could not read the row back at ${e1 === null ? p1 : p2} ms`);
        return;
      }
      const err = (e2 - e1) - (p2 - p1);
      assert('the clock in the picture moved with the playhead',
        Math.abs(err) <= FRAME_MS * 3,
        `playhead +${p2 - p1} ms, picture +${e2 - e1} ms, ${err >= 0 ? '+' : ''}${Math.round(err)} ms apart`);
      // AND THE GAP THE LINE THREW AWAY IS STILL IN THE PIXELS. Reported, not
      // asserted: it depends on how long a person waited.
      const endOf1 = await readAt(Math.round(parts[0].startMs + parts[0].lenMs - 200));
      const startOf2 = await readAt(Math.round(parts[1].startMs + 120));
      if (endOf1 !== null && startOf2 !== null) {
        log(`the pause between take 1 and take 2 was ${((startOf2 - endOf1) / 1000).toFixed(2)}s. `
          + 'The line does not show it, the pixels still do', 'hi');
      }
    }, { log, say: 'the clock check sends the line to four places to read a frame at each, '
      + 'so it is left to the harness. Drag the bar and watch the number in the picture move with it' });
  }

  // ── pick up where the last visit left off, on the press ───────────────────
  async function restore() {
    const saved = remembered();
    if (!saved.length) return;
    // a note THIS BROWSER made to itself, not an index: another device sees none
    log(`${saved.length} recording${saved.length > 1 ? 's' : ''} still in R2, fetching them back. `
      + 'This list is a note this browser made; another device would see none of them', 'hi');
    for (const t of saved) {
      const blob = await fetchBack(t.url, t.mime, { log });
      if (!blob) continue;
      const part = { n: parts.length + 1, hue: videoHue(parts.length), mime: t.mime,
                     blobs: [], chunks: [], bytes: blob.size, startMs: totalMs,
                     lenMs: null, video: null, manifest: t.url, expiresAt: t.expiresAt, from: 'r2' };
      part.url = URL.createObjectURL(blob);
      addVideo(part);
      part.lenMs = Math.round((await resolveDuration(part.video)) ?? 0);
      if (!part.lenMs) continue;
      part.startMs = totalMs; totalMs += part.lenMs;
      parts.push(part);
      deck.setRange([0, Math.round(totalMs)]);
      if (!active) handOver(part, 0);
      startTicking();
      const mins = Math.round((new Date(t.expiresAt) - Date.now()) / 60000);
      log(`take ${part.n} back from R2, ${(part.lenMs / 1000).toFixed(2)}s, `
        + `${Math.floor(mins / 60)}h ${mins % 60}m left`, 'hi');
    }
    paint();
  }
  if (useR2 && remembered().length) {
    log(`${remembered().length} take(s) of yours are still in R2 and come back when you press Send and receive`, 'hi');
  }

  return {
    get bars() { return [{ name: 'round trip', bar, strip: stripCanvas }]; },
    /**
     * Presses Send and receive. An ordinary run grades the relay ask and stops;
     * a deep run holds both legs and runs keep's fourteen inside the press.
     */
    async check({ A }) {
      A('building this tab opened nothing: no relay ask, no leg, no camera',
        iceAsks === 0 && iceLoadAsks() === 0 && !pub && !sub && !source.cameraOn(),
        `${iceLoadAsks()} relay ask(s) before a press, legs ${pub || sub ? 'UP' : 'down'}`);
      await row.press('go');
    },
  };
}

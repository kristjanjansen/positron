// proto/instrument/harness/run-instrument.mjs — end-to-end verification of the
// remote-instrument platform, in ONE headless Chrome with three tabs:
//
//   tab 1  host.html   the owner, driving a SYNTHETIC synth stand-in
//                      (remote-synth.js's percussive WebAudio voice) so the run
//                      needs no hardware; a real rig swaps in output.send()
//   tab 2  play.html   the player: registers nothing, browses, asks, plays
//   tab 3  play.html   a SECOND player — must be rejected honestly
//
// Both pages calibrate against the rig server's /time-local (same-host truth,
// sub-ms) instead of the worker's /time, so the reported one-way MIDI number is
// the transport and not the clock. In the field the pages default to the
// worker's /time and the number carries ±(min RTT)/2.
//
//   node harness/run-instrument.mjs [--notes 64]
//
// Kills only its own: the `instr-` process prefix and the instr-udd profile.

import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { openSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CDP } from '../../jam/harness/cdp.mjs';     // reused verbatim, not copied

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SCRATCH = '/private/tmp/claude-501/-Users-s32863-personal-elektron/596385e3-9b74-4f17-837f-b4eb2eb5a254/scratchpad';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8899, DBG = 9241;
const BASE = `http://127.0.0.1:${PORT}`;
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes('--' + n) ? args[args.indexOf('--' + n) + 1] : d);
const NOTES = +opt('notes', 64);
const INST = 'verify-' + Math.random().toString(36).slice(2, 7);
const DL = join(SCRATCH, 'instr-downloads');
// the owner token, for the harness's own owner-side calls (audio put, the
// tokenless-vs-token delete comparison). Same source the rig server uses.
const TOKEN = ((await readFile(join(ROOT, '..', '..', '.env'), 'utf8').catch(() => ''))
  .match(/^INSTRUMENT_TOKEN=(.*)$/m) || [, ''])[1].trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (c) => { try { return execSync(c, { encoding: 'utf8' }); } catch (e) { return (e.stdout || '') + ''; } };
const q = JSON.stringify;
const kids = [];
function spawnLogged(cmd, argv, name) {
  const fd = openSync(join(SCRATCH, `instr-${name}.log`), 'a');
  const p = spawn(cmd, argv, { stdio: ['ignore', fd, fd] });
  kids.push(p);
  console.log(`spawned ${name} pid=${p.pid}`);
  return p;
}

const CHECKS = [];
const NOTES_OUT = [];
function check(name, ok, detail) {
  CHECKS.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  — ' + (typeof detail === 'string' ? detail : q(detail)) : ''}`);
}

async function waitFor(cdp, expr, label, tries = 80) {
  for (let i = 0; i < tries; i++) {
    const v = await cdp.eval(expr, { awaitPromise: false }).catch(() => null);
    if (v) return v;
    await sleep(500);
  }
  throw new Error('timeout waiting for ' + label);
}

let cdpH, cdpP, cdpB;
async function main() {
  await mkdir(join(ROOT, 'results'), { recursive: true });
  await mkdir(DL, { recursive: true });
  sh(`pkill -f 'instr-udd' 2>/dev/null`);
  sh(`pkill -f 'proto/instrument/server.mjs' 2>/dev/null`);
  await sleep(300);

  spawnLogged('node', [join(ROOT, 'server.mjs')], 'server');
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/time-local'); break; } catch { await sleep(250); } }

  // one browser. --disable-renderer-backgrounding + friends keep every tab's
  // main thread unthrottled, which the ct->epoch map and the panel's 33 ms
  // draw loop both depend on.
  const flags = [
    '--headless=new', `--user-data-dir=${SCRATCH}/instr-udd`, `--remote-debugging-port=${DBG}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-features=IntensiveWakeUpThrottling,CalculateNativeWinOcclusion,WebRtcHideLocalIpsWithMdns',
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-devices',
    // headless=new denies getUserMedia even with the fake-ui flag; the explicit
    // auto-accept switch (and the CDP grant below) is what actually opens it
    '--auto-accept-camera-and-microphone-capture',
    '--window-size=1500,1000',
  ];
  // headless Chrome takes exactly ONE url on the command line ("Multiple
  // targets are not supported in headless mode") — the other two tabs are
  // opened afterwards through the DevTools /json/new endpoint, same browser.
  const common = `clock=local&ice=none`;
  // rec=av arms the OWNER's consent at its widest rung (audio + panel video)
  // for the first session. The page default is OFF and is never persisted; the
  // sessions below step it down to audio and then to off, which is the consent
  // matrix.
  spawnLogged(CHROME, [
    ...flags,
    `${BASE}/host.html?${common}&instrument=${INST}&name=${encodeURIComponent('Verification DIMI')}&auto=1&rec=av`,
  ], 'chrome');

  cdpH = await new CDP().connect(DBG, 'host.html');
  cdpP = await connectTo(await newTab(`${BASE}/play.html?${common}&name=alice`));
  cdpB = await connectTo(await newTab(`${BASE}/play.html?${common}&name=bob`));
  await cdpH.send('Page.enable').catch(() => {});
  await cdpP.send('Page.enable').catch(() => {});
  await cdpH.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }).catch(() => {});
  await cdpP.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }).catch((e) => console.log('dl behavior:', e.message));
  await cdpH.send('Browser.grantPermissions', { origin: BASE, permissions: ['audioCapture', 'videoCapture', 'midi'] })
    .catch((e) => console.log('grantPermissions:', e.message));
  // Network domain on both pages: the durability test cuts the wire with
  // Network.emulateNetworkConditions({offline:true}) mid-session.
  for (const c of [cdpH, cdpP, cdpB]) await c.send('Network.enable').catch((e) => console.log('Network.enable:', e.message));

  await waitFor(cdpH, 'window.hostReady === true', 'hostReady');
  await waitFor(cdpP, 'window.playerReady === true', 'playerReady(alice)');
  await waitFor(cdpB, 'window.playerReady === true', 'playerReady(bob)');
  console.log('pages ready; instrument id =', INST);

  // ---- 1. the owner's rig: audio constraints, then register + go online ----
  const mic = await cdpH.eval('window.host.openAudio()').catch((e) => ({ error: e.message }));
  console.log('audio in settings:', q(mic));
  check('audio input opens with echo/AGC/noise processing OFF',
    mic && mic.echoCancellation === false && mic.autoGainControl === false && mic.noiseSuppression === false,
    { ec: mic && mic.echoCancellation, agc: mic && mic.autoGainControl, ns: mic && mic.noiseSuppression, err: mic && mic.error });
  // 48 kHz is asked for and audited by the page, but Chrome's
  // --use-fake-device-for-media-stream is 44.1 kHz by construction, so this
  // one is REPORTED, not gated. The page shows it red, which is the correct
  // thing for a real interface stuck at 44.1.
  NOTES_OUT.push({ note: 'capture sample rate', value: mic && mic.sampleRate, want: 48000, gated: false, why: 'fake device is 44.1 kHz; the returned track in this run is the 48 kHz synthetic bus, not the mic' });
  console.log(`INFO  capture sample rate ${mic && mic.sampleRate} (want 48000; fake device, not gated)`);

  const reg = await cdpH.eval('window.host.register()');
  check('instrument registers', reg && reg.id === INST, reg && reg.id);
  await cdpH.eval('window.host.goOnline()');
  await sleep(800);

  // ---- 2. it appears in the public catalog, online ----
  const cat = await (await fetch('https://elektron-instrument.kristjan-jansen.workers.dev/instruments')).json();
  const mine = cat.instruments.find((i) => i.id === INST);
  check('appears in public GET /instruments as online', mine && mine.online === true && mine.busy === false, mine && { online: mine.online, busy: mine.busy, name: mine.name });

  // ---- 3. player browses, requests; the owner auto-accepts ----
  const seen = await cdpP.eval(`(async()=>{const c=await window.player.refresh();return c.some(i=>i.id===${q(INST)}&&i.online)})()`);
  check('player sees it in the browser-side catalog', seen === true);
  const t0 = Date.now();
  await cdpP.eval(`window.player.select(${q(INST)}); window.player.requestSession()`);
  await waitFor(cdpP, 'window.player.state().ch === "open"', 'player midi channel open', 90);
  const setupMs = Date.now() - t0;
  const ps0 = await cdpP.eval('window.player.state()');
  check('session accepted and media connected', ps0.pc === 'connected' && ps0.ch === 'open', { pc: ps0.pc, ch: ps0.ch, setupMs: ps0.setupMs });

  const busy = (await (await fetch('https://elektron-instrument.kristjan-jansen.workers.dev/instruments')).json())
    .instruments.find((i) => i.id === INST);
  check('registry now reports busy + who holds it', busy.busy === true && busy.player === 'alice', { busy: busy.busy, player: busy.player });

  // ---- 4. a SECOND player must be rejected honestly ----
  await cdpB.eval(`window.player.select(${q(INST)}); window.player.requestSession()`);
  await sleep(1500);
  const bob = await cdpB.eval('window.player.state()');
  check('second player rejected honestly (told who holds it)',
    !!bob.rejected && /busy/.test(bob.rejected) && /alice/.test(bob.rejected), bob.rejected);

  // ---- 5. play 64+ notes; audio must come back ----
  console.log(`playing ${NOTES} notes…`);
  const play = await cdpP.eval(`window.player.autoPlay(${NOTES}, 220, 90)`);
  console.log('autoPlay:', q(play));
  const ps = await cdpP.eval('window.player.state()');
  const hs = await cdpH.eval('window.host.state()');
  console.log('player:', q(ps));
  console.log('host  :', q(hs));
  check(`${NOTES}+ notes reached the instrument`, hs.midiRecv >= NOTES * 2 * 0.98, { sentFrames: ps.sent, hostRecv: hs.midiRecv, actuated: hs.actuated });
  check('audio returned and was heard (onsets detected)', ps.onsets >= NOTES * 0.5, { onsets: ps.onsets, notes: NOTES });
  check('HUD has a one-way MIDI number', !!ps.oneWayMidiMs && ps.oneWayMidiMs.n > 0, ps.oneWayMidiMs);
  check('HUD has a key→ear round-trip number', !!ps.keyToEarMs && ps.keyToEarMs.n > 0, ps.keyToEarMs);
  check('no stuck notes on the instrument', hs.held === 0, { held: hs.held, watchdog: hs.watchdogFired });

  // ---- 6. screenshots, while the session is LIVE ----
  await shoot(cdpH, join(ROOT, 'results', 'instr-host.png'));
  await shoot(cdpP, join(ROOT, 'results', 'instr-play.png'));

  // ---- 7. download the session, then replay it through the same path ----
  const jsonl = await cdpP.eval('window.player.sessionJsonl()');
  await writeFile(join(ROOT, 'results', 'instr-session.jsonl'), jsonl);
  const recs = jsonl.trim().split('\n').map((l) => JSON.parse(l));
  const midiRows = recs.filter((r) => r.kind === 'midi');
  check('session log is a flat timeline (at/kind/source/raw/display)',
    midiRows.length > 0 && midiRows.every((r) => r.at && r.kind === 'midi' && r.source && Array.isArray(r.raw) && r.display),
    { rows: recs.length, midi: midiRows.length, sample: midiRows[0] });
  check('audio span recorded alongside the MIDI', recs.some((r) => r.kind === 'audio-span' && r.at && r.endAt !== undefined),
    recs.find((r) => r.kind === 'audio-span'));
  await cdpP.eval('window.player.download()');
  await sleep(1200);
  const files = (await readdir(DL).catch(() => [])).filter((f) => f.startsWith('instrument-session-') && f.endsWith('.jsonl'));
  check('"Download session" writes a real file', files.length > 0, files[0]);

  const hBefore = (await cdpH.eval('window.host.state()')).midiRecv;
  const rep = await cdpP.eval('window.player.replay(6)');
  await sleep(900);
  const hAfter = (await cdpH.eval('window.host.state()')).midiRecv;
  console.log('replay:', q(rep), 'host midiRecv', hBefore, '→', hAfter);
  check('replay fires every logged event through the same send path', rep.fired === midiRows.length, { fired: rep.fired, logged: midiRows.length });
  check('replay does not re-enter the log (overdub rule)', rep.grew === 0, { grew: rep.grew });
  check('replayed notes actually reach the instrument', hAfter - hBefore >= midiRows.length * 0.9, { delta: hAfter - hBefore, expected: midiRows.length });

  // ---- 8. end the session: all-notes-off must fire ----
  const panicsBefore = (await cdpH.eval('window.host.state()')).panics;
  await cdpP.eval('window.player.end()');
  await sleep(1200);
  const hEnd = await cdpH.eval('window.host.state()');
  check('all-notes-off fires when the session ends', hEnd.panics > panicsBefore, { before: panicsBefore, after: hEnd.panics });
  check('instrument returns to free in the registry',
    !(await (await fetch('https://elektron-instrument.kristjan-jansen.workers.dev/instruments')).json()).instruments.find((i) => i.id === INST).busy);

  // ==========================================================================
  // 8b. SESSION STORAGE — the notes are durable, the audio is in R2, and both
  //     are deletable by either party.
  // ==========================================================================
  const WK = 'https://elektron-instrument.kristjan-jansen.workers.dev';
  const SID = await cdpP.eval('window.player.sid()');
  console.log('session id =', SID);
  // let the last flush + /end + the host's recorder finalize land
  for (let i = 0; i < 40; i++) {
    const st = await cdpP.eval('window.player.state()');
    const hr = await cdpH.eval('window.host.state()');
    if (st.store.ended && !st.store.pending && hr.rec.state === 'done' && !hr.hostLog.pending) break;
    await sleep(500);
  }
  const pstore = (await cdpP.eval('window.player.state()')).store;
  const hstore = await cdpH.eval('window.host.state()');
  console.log('player store:', q(pstore), '\nhost rec:', q(hstore.rec), '\nhost log:', q(hstore.hostLog));

  const stored = await (await fetch(`${WK}/session/${SID}?limit=20000`)).json();
  const sEvents = stored.events;
  const sPlayerMidi = sEvents.filter((e) => e.kind === 'midi' && e.source === 'player');
  const sHostMidi = sEvents.filter((e) => e.kind === 'midi-actuated' && e.source === 'instrument');
  const sSpans = sEvents.filter((e) => e.kind === 'media-span');

  check('session events persisted — every logged note reached the DO',
    sPlayerMidi.length === midiRows.length && pstore.rejected === 0,
    { sentByPage: midiRows.length, storedRows: sPlayerMidi.length, appended: pstore.appended, rejected: pstore.rejected });
  check('session end is stamped in the DO', !!stored.session.endedAt && stored.session.endedAt > stored.session.startedAt,
    { startedAt: stored.session.startedAt, endedAt: stored.session.endedAt, noteCount: stored.session.noteCount });
  check('GET /session returns the events in time order',
    sEvents.every((e, i) => i === 0 || e.at >= sEvents[i - 1].at),
    { rows: stored.total, lanes: stored.lanes });
  check('host lane present: the instrument logged what it ACTUALLY did',
    sHostMidi.length >= sPlayerMidi.length * 0.98 && sHostMidi.every((e) => Number.isFinite(e.ref)),
    { hostActuated: sHostMidi.length, playerNotes: sPlayerMidi.length, sample: sHostMidi[0] });
  // the two lanes ARE the drift channel: pair on ref, subtract, and you have
  // the one-way latency again — from storage, without any live telemetry.
  const bySeq = new Map(sPlayerMidi.map((e) => [e.seq, e.at]));
  const paired = sHostMidi.filter((e) => bySeq.has(e.ref)).map((e) => (e.at - bySeq.get(e.ref)) / 1000);
  paired.sort((a, b) => a - b);
  const pairedP50 = paired.length ? +paired[Math.floor(paired.length / 2)].toFixed(2) : null;
  check('the two lanes pair on `ref` — stored logs reproduce one-way latency',
    paired.length >= sPlayerMidi.length * 0.9 && pairedP50 !== null && Math.abs(pairedP50) < 50,
    { paired: paired.length, p50ms: pairedP50, liveP50ms: ps.oneWayMidiMs && ps.oneWayMidiMs.p50 });

  // ---- audio: consent was ON for this session ----
  const audio = await (await fetch(`${WK}/session/${SID}/audio`)).json();
  const audioChunks = (audio.objects || []).filter((o) => /chunk-\d+\.webm$/.test(o.key));
  check('audio manifest + chunks present in R2 when consent is ON',
    !!stored.session.audioPrefix && audioChunks.length > 0 && audio.objects.some((o) => o.key.endsWith('manifest.json')) && hstore.rec.finalized,
    { audioPrefix: stored.session.audioPrefix, chunks: audioChunks.length, bytes: audio.bytes, verified: hstore.rec.audio.verified, mime: hstore.rec.audio.mime });
  check('media-span start AND end markers are on the log (media by reference)',
    sSpans.some((e) => e.payload && e.payload.phase === 'start' && e.payload.mediaRef)
    && sSpans.some((e) => e.payload && e.payload.phase === 'end' && Number.isFinite(e.payload.durUs)),
    sSpans.map((e) => e.payload && e.payload.phase));

  // ---- replay FROM STORAGE, through the same actuate path ----
  const rBefore = (await cdpH.eval('window.host.state()')).midiRecv;
  const loaded = await cdpP.eval(`window.player.loadSession(${q(SID)})`);
  console.log('loaded:', q(loaded));
  const rep2 = await cdpP.eval('window.player.replayStored(6)');
  await sleep(900);
  const rAfter = (await cdpH.eval('window.host.state()')).midiRecv;
  console.log('replay from storage:', q(rep2), 'host midiRecv', rBefore, '→', rAfter);
  check('replay FROM STORAGE fires the stored events through the same send path',
    rep2.fired === sHostMidi.length && rep2.master === 'host',
    { fired: rep2.fired, storedHostLane: sHostMidi.length, master: rep2.master });
  check('storage replay drives off the HOST lane and pulls the audio with it',
    rep2.master === 'host' && rep2.audio > 0 && rep2.audioOffsetS !== null,
    { master: rep2.master, audioBytes: rep2.audio, audioOffsetS: rep2.audioOffsetS, lane: rep2.lane });
  check('the concatenated R2 chunks decode as one media stream',
    loaded.audio && loaded.audio.readyState >= 1 && loaded.audio.bytes > 0,
    loaded.audio);

  // ==========================================================================
  // 8c. VIDEO CAPTURE — the panel/camera the player actually saw, recorded in
  //     ONE MediaRecorder alongside the audio, as its own lane with its own
  //     media-span. Consent for this run was 'audio+video', so BOTH lanes ran.
  // ==========================================================================
  const av = await (await fetch(`${WK}/session/${SID}/av`)).json();
  const avChunks = (av.objects || []).filter((o) => /chunk-\d+\.webm$/.test(o.key));
  const avSpans = sSpans.filter((e) => e.payload && e.payload.kind === 'av');
  const audSpans = sSpans.filter((e) => e.payload && (e.payload.kind || 'audio') === 'audio');
  const avRec = hstore.rec.av;
  console.log('A/V lane:', q({ mime: avRec.mime, chunks: avChunks.length, bytes: av.bytes, probe: avRec.probe }));
  check('A/V recorded: one webm carrying BOTH tracks, chunked into R2 under instrument/<sid>/av/',
    !!stored.session.avPrefix && avChunks.length > 0 && av.objects.some((o) => o.key.endsWith('manifest.json'))
      && avRec.finalized && /video\/webm/.test(avRec.mime || '') && /opus/.test(avRec.mime || ''),
    { avPrefix: stored.session.avPrefix, chunks: avChunks.length, bytes: av.bytes,
      mime: avRec.mime, verified: avRec.verified, degraded: avRec.degraded });
  check('the A/V span is a SECOND media-span, distinguishable from the audio-only one by `kind`',
    avSpans.length === 2 && audSpans.length === 2
      && avSpans.every((e) => e.payload.mediaRef ? /\/av\/$/.test(e.payload.mediaRef.prefix) : true)
      && avSpans.some((e) => e.payload.phase === 'start' && e.payload.mediaRef
        && (e.payload.mediaRef.tracks || []).includes('video')),
    { avSpans: avSpans.map((e) => e.payload.phase), audioSpans: audSpans.map((e) => e.payload.phase),
      avRef: (avSpans.find((e) => e.payload.phase === 'start') || {}).payload });
  check('replay PREFERS the A/V span: a <video> element with real dimensions, and time advances',
    rep2.mediaLane === 'av' && rep2.videoWidth > 0 && rep2.videoHeight > 0 && rep2.advanced > 0,
    { mediaLane: rep2.mediaLane, w: rep2.videoWidth, h: rep2.videoHeight,
      currentTimeAdvancedS: rep2.advanced, offsetS: rep2.audioOffsetS });

  // ==========================================================================
  // 8d. CONSENT MATRIX — audio+video (above), then audio, then off.
  // ==========================================================================
  await cdpH.eval('window.host.setConsent("audio")');
  await cdpB.eval(`window.player.select(${q(INST)}); window.player.requestSession()`);
  await waitFor(cdpB, 'window.player.state().ch === "open"', 'bob midi channel open', 60);
  await cdpB.eval('window.player.autoPlay(6, 200, 80)');
  const SID2 = await cdpB.eval('window.player.sid()');
  const TOK2 = await cdpB.eval('window.player.token()');
  await cdpB.eval('window.player.end()');
  for (let i = 0; i < 30; i++) {
    if ((await cdpH.eval('window.host.state()')).rec.state === 'done') break;
    await sleep(500);
  }
  const stored2 = await (await fetch(`${WK}/session/${SID2}?limit=5000`)).json();
  const audio2 = await (await fetch(`${WK}/session/${SID2}/audio`)).json();
  const av2 = await (await fetch(`${WK}/session/${SID2}/av`)).json();
  console.log('session 2 (consent audio):', SID2, 'audio', audio2.count, 'av', av2.count);
  check('consent AUDIO: the audio lane records, the A/V lane does NOT',
    !!stored2.session.audioPrefix && audio2.count > 0 && !stored2.session.avPrefix && av2.count === 0
      && stored2.events.filter((e) => e.kind === 'media-span' && e.payload && e.payload.kind === 'av').length === 0,
    { id: SID2, audioObjects: audio2.count, avObjects: av2.count, avPrefix: stored2.session.avPrefix });
  check('a second, separate session id was minted for the second player',
    SID2 && SID2 !== SID, { first: SID, second: SID2 });

  await cdpH.eval('window.host.setConsent("off")');
  await cdpB.eval('window.player.requestSession()');
  await waitFor(cdpB, 'window.player.state().ch === "open"', 'bob midi channel open (3)', 60);
  await cdpB.eval('window.player.autoPlay(4, 200, 80)');
  const SID3 = await cdpB.eval('window.player.sid()');
  await cdpB.eval('window.player.end()');
  await sleep(2500);
  const stored3 = await (await fetch(`${WK}/session/${SID3}?limit=5000`)).json();
  const audio3 = await (await fetch(`${WK}/session/${SID3}/audio`)).json();
  const av3 = await (await fetch(`${WK}/session/${SID3}/av`)).json();
  console.log('session 3 (consent OFF):', SID3, q(stored3.lanes), 'audio', audio3.count, 'av', av3.count);
  check('consent OFF: notes still stored, NO prefixes and NO R2 objects in either lane',
    stored3.total > 0 && !stored3.session.audioPrefix && !stored3.session.avPrefix
      && audio3.count === 0 && av3.count === 0
      && stored3.events.filter((e) => e.kind === 'media-span').length === 0,
    { id: SID3, rows: stored3.total, audioObjects: audio3.count, avObjects: av3.count });

  // ==========================================================================
  // 8e. ACCESS CONTROL — per-session capability tokens (see DEPLOYED.md).
  //     Right token passes, wrong/absent token is refused, on the three routes
  //     that carry a capability: player-delete, owner-delete, media upload.
  //     And a tombstone still beats a perfectly valid token.
  // ==========================================================================
  const OTOK3 = await cdpH.eval('window.host.token()');           // owner's, session 3
  const WRONG = '0'.repeat(32);
  const post = (u, h, b) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: b });

  // (a) media upload: no token / wrong token refused, ownerToken accepted
  const upNone = await post(`${WK}/session/${SID3}/av/0`, {}, new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2]));
  const upWrong = await post(`${WK}/session/${SID3}/av/0`, { 'X-Session-Token': WRONG }, new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2]));
  const upRight = await post(`${WK}/session/${SID3}/av/0`, { 'X-Session-Token': OTOK3 }, new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2]));
  const upBearer = await post(`${WK}/session/${SID3}/av/0`, { Authorization: 'Bearer ' + TOKEN }, new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2]));
  check('media upload: absent 403 · wrong token 403 · ownerToken 200 · INSTRUMENT_TOKEN still 200',
    upNone.status === 403 && upWrong.status === 403 && upRight.status === 200 && upBearer.status === 200,
    { absent: upNone.status, wrong: upWrong.status, ownerToken: upRight.status, instrumentToken: upBearer.status });

  // (b) player delete: the id alone is NO LONGER enough
  const pdNone = await post(`${WK}/session/${SID2}/delete`, {}, q({ by: 'player' }));
  const pdWrong = await post(`${WK}/session/${SID2}/delete`, { 'X-Session-Token': WRONG }, q({ by: 'player' }));
  const before2 = await (await fetch(`${WK}/session/${SID2}`)).json();
  const pdRight = await post(`${WK}/session/${SID2}/delete`, { 'X-Session-Token': TOK2 }, q({ by: 'player' }));
  const pdJ = await pdRight.json();
  const afterR = await fetch(`${WK}/session/${SID2}`);
  const afterJ = await afterR.json();
  const reapp = await post(`${WK}/session/${SID2}/events`, {},
    q({ events: [{ seq: 9999, at: 9_000_000, kind: 'midi', source: 'player', raw: [144, 62, 90], display: 'D4' }] }));
  check('player delete: absent 403 · wrong token 403 · this session\'s playerToken 200',
    pdNone.status === 403 && pdWrong.status === 403 && pdRight.status === 200,
    { absent: pdNone.status, wrong: pdWrong.status, right: pdRight.status });
  check('delete by PLAYER drops the event rows and purges the R2 media',
    pdJ.eventsDropped === before2.total && pdJ.audioObjectsPurged >= 1,
    { before: before2.total, dropped: pdJ.eventsDropped, purged: pdJ.audioObjectsPurged });
  check('a deleted session reads as a TOMBSTONE, not as data',
    afterR.status === 410 && afterJ.tombstone === true && afterJ.deletedBy === 'player' && !afterJ.events,
    { status: afterR.status, body: { deletedBy: afterJ.deletedBy, tombstone: afterJ.tombstone } });
  check('a deleted session cannot be resurrected by a later append',
    reapp.status === 410, { status: reapp.status });

  // (c) owner delete: ownerToken alone works, tokenless does not — and
  //     INSTRUMENT_TOKEN still works, because owning the hardware is a claim
  //     over every session on it.
  const odNone = await post(`${WK}/session/${SID3}/delete`, {}, q({ by: 'owner' }));
  const odWrong = await post(`${WK}/session/${SID3}/delete`, { 'X-Session-Token': WRONG }, q({ by: 'owner' }));
  const odRight = await post(`${WK}/session/${SID3}/delete`, { 'X-Session-Token': OTOK3 }, q({ by: 'owner' }));
  const odJ = await odRight.json();
  check('owner delete: absent 403 · wrong token 403 · this session\'s ownerToken 200 (no INSTRUMENT_TOKEN needed)',
    odNone.status === 403 && odWrong.status === 403 && odRight.status === 200 && odJ.deletedBy === 'owner',
    { absent: odNone.status, wrong: odWrong.status, right: odRight.status, body: odJ });
  // (d) the tombstone outranks the capability
  const tombUp = await post(`${WK}/session/${SID3}/av/1`, { 'X-Session-Token': OTOK3 }, new Uint8Array([1, 2, 3, 4]));
  const tombDel = await post(`${WK}/session/${SID3}/delete`, { 'X-Session-Token': OTOK3 }, q({ by: 'owner' }));
  const tombRead = await fetch(`${WK}/session/${SID3}`);
  check('the TOMBSTONE still wins over a perfectly valid token',
    tombUp.status === 410 && tombRead.status === 410 && (await tombDel.json()).already === true,
    { uploadWithValidToken: tombUp.status, read: tombRead.status });
  check('tokens are never echoed back by a read — only the fact that they exist',
    afterJ.playerToken === undefined && afterJ.ownerToken === undefined
      && stored.session.playerToken === undefined && stored.session.guarded === true,
    { guarded: stored.session.guarded });

  // ==========================================================================
  // 8f. DURABILITY — cut the wire mid-session with CDP for ~15 s. Nothing that
  //     was logged or recorded may be lost: the IndexedDB backstop parks it and
  //     drains it oldest-first on reconnect.
  // ==========================================================================
  const OFFLINE_MS = 15000;
  await cdpH.eval('window.host.setConsent("audio+video")');
  if (!(await cdpH.eval('window.host.state()')).online) { await cdpH.eval('window.host.goOnline()'); await sleep(800); }
  // both counters are cumulative over the page's life — snapshot them so the
  // "nothing lost" comparison is about THIS session only
  const actBefore = (await cdpH.eval('window.host.state()')).actuated;
  const loggedBefore = (await cdpP.eval('window.player.state()')).loggedMidi;
  await cdpP.eval(`window.player.select(${q(INST)}); window.player.requestSession()`);
  await waitFor(cdpP, 'window.player.state().ch === "open"', 'alice midi channel open (offline run)', 60);
  const SID4 = await cdpP.eval('window.player.sid()');
  console.log('durability session', SID4, '— playing, then cutting the network for', OFFLINE_MS, 'ms');
  await cdpP.eval('window.__auto = window.player.autoPlay(40, 220, 90)', { awaitPromise: false });
  await waitFor(cdpP, 'window.player.state().sent >= 20', 'first notes sent', 40);
  await sleep(3000);                                    // let a media chunk or two land first
  const offAt = Date.now();
  for (const c of [cdpH, cdpP]) {
    await c.send('Network.emulateNetworkConditions',
      { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 }).catch((e) => console.log('offline:', e.message));
  }
  await sleep(OFFLINE_MS);
  for (const c of [cdpH, cdpP]) {
    await c.send('Network.emulateNetworkConditions',
      { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch((e) => console.log('online:', e.message));
  }
  const onAt = Date.now();
  console.log('network restored after', onAt - offAt, 'ms');
  await cdpP.eval('window.__auto').catch(() => null);   // the play loop finishes
  await cdpP.eval('window.player.end()').catch(() => null);
  await cdpH.eval('window.host.stopRec("durability run")').catch(() => null);
  for (let i = 0; i < 90; i++) {
    const ps4 = await cdpP.eval('window.player.state()');
    const hs4 = await cdpH.eval('window.host.state()');
    if (!ps4.store.pending && !ps4.store.backstop.items && !hs4.hostLog.pending
        && !hs4.hostLog.backstop.items && hs4.rec.state === 'done') break;
    await cdpP.eval('window.player.flush()').catch(() => {});
    await sleep(500);
  }
  const ps4 = await cdpP.eval('window.player.state()');
  const hs4 = await cdpH.eval('window.host.state()');
  const bks = await cdpH.eval('window.host.backstops()');
  const stored4 = await (await fetch(`${WK}/session/${SID4}?limit=20000`)).json();
  const s4player = stored4.events.filter((e) => e.kind === 'midi' && e.source === 'player').length;
  const s4host = stored4.events.filter((e) => e.kind === 'midi-actuated').length;
  const audio4 = await (await fetch(`${WK}/session/${SID4}/audio`)).json();
  const av4 = await (await fetch(`${WK}/session/${SID4}/av`)).json();
  const a4c = (audio4.objects || []).filter((o) => /chunk-\d+\.webm$/.test(o.key)).length;
  const v4c = (av4.objects || []).filter((o) => /chunk-\d+\.webm$/.test(o.key)).length;
  const playerLogged = ps4.loggedMidi - loggedBefore;
  const hostActuated = hs4.actuated - actBefore;
  const OFFLINE = {
    sessionId: SID4, offlineMs: onAt - offAt,
    events: { playerLogged, playerStored: s4player, hostActuated, hostStored: s4host },
    chunks: { audioProduced: hs4.rec.audio.chunks, audioInR2: a4c, avProduced: hs4.rec.av.chunks, avInR2: v4c,
      audioDegraded: hs4.rec.audio.degraded, avDegraded: hs4.rec.av.degraded,
      audioMissing: hs4.rec.audio.missing, avMissing: hs4.rec.av.missing },
    backstops: {
      playerEvents: ps4.store.backstop, hostEvents: bks.events, hostAudio: bks.audio, hostAv: bks.av,
    },
  };
  console.log('OFFLINE WINDOW:', JSON.stringify(OFFLINE, null, 2));
  check('offline window: ZERO player events lost — everything logged reached the DO',
    playerLogged > 0 && s4player === playerLogged,
    { logged: playerLogged, stored: s4player, parked: ps4.store.backstop.parked, drained: ps4.store.backstop.sentDrained });
  check('offline window: ZERO host-lane events lost — the instrument lane is whole too',
    s4host > 0 && s4host === hostActuated,
    { actuated: hostActuated, stored: s4host, parked: bks.events.parked, drained: bks.events.sentDrained });
  check('offline window: ZERO media chunks lost, on BOTH lanes, nothing degraded',
    hs4.rec.audio.chunks > 0 && a4c === hs4.rec.audio.chunks && !hs4.rec.audio.degraded
      && hs4.rec.av.chunks > 0 && v4c === hs4.rec.av.chunks && !hs4.rec.av.degraded,
    OFFLINE.chunks);
  check('the IndexedDB backstop actually took the load (parked > 0) and drained it',
    (ps4.store.backstop.parked + bks.events.parked + bks.audio.parked + bks.av.parked) > 0
      && ps4.store.backstop.items === 0 && bks.events.items === 0 && bks.audio.items === 0 && bks.av.items === 0,
    { parked: { player: ps4.store.backstop.parked, hostEvents: bks.events.parked, audio: bks.audio.parked, av: bks.av.parked },
      drainMs: { player: ps4.store.backstop.drainMs, hostEvents: bks.events.drainMs, audio: bks.audio.drainMs, av: bks.av.drainMs },
      hwm: { playerBytes: ps4.store.backstop.hwmBytes, audioBytes: bks.audio.hwmBytes, avBytes: bks.av.hwmBytes } });

  // reclaim the durability run's R2 bytes: the first session is the kept proof
  const cleanup4 = await cdpH.eval(`window.host.deleteSession(${q(SID4)})`).catch(() => null);
  console.log('durability session purged:', q(cleanup4));

  // ---- the catalog-level view ----
  const slist = await (await fetch(`${WK}/sessions?instrument=${INST}`)).json();
  check('GET /sessions lists this instrument\'s sessions, tombstones included',
    slist.count >= 2 && slist.sessions.some((s) => s.id === SID && !s.deletedAt)
      && slist.sessions.some((s) => s.id === SID3 && s.deletedBy === 'owner'),
    { count: slist.count, ids: slist.sessions.map((s) => s.id) });
  check('the session store is pinned to the EU jurisdiction',
    slist.jurisdiction === 'eu' && slist.euPinned === true,
    { jurisdiction: slist.jurisdiction, euPinned: slist.euPinned, euId: slist.euId, unpinnedId: slist.unpinnedId });

  const STORAGE = {
    sessionId: SID, consentAudioId: SID2, consentOffId: SID3, durabilityId: SID4,
    playerLaneRows: sPlayerMidi.length, hostLaneRows: sHostMidi.length,
    storedTotalRows: stored.total, lanes: stored.lanes,
    endedAt: stored.session.endedAt,
    pairedOneWayMs: { n: paired.length, p50: pairedP50 },
    audio: { prefix: stored.session.audioPrefix, chunks: audioChunks.length, bytes: audio.bytes,
      mime: hstore.rec.audio.mime, verified: hstore.rec.audio.verified, manifest: hstore.rec.audio.manifestKey },
    avLane: { prefix: stored.session.avPrefix, chunks: avChunks.length, bytes: av.bytes,
      mime: avRec.mime, codecProbe: avRec.probe, verified: avRec.verified, manifest: avRec.manifestKey,
      spans: avSpans.map((e) => e.payload.phase) },
    replayFromStorage: rep2,
    consentMatrix: {
      'audio+video': { id: SID, audio: audioChunks.length, av: avChunks.length },
      audio: { id: SID2, audio: audio2.count, av: av2.count },
      off: { id: SID3, rows: stored3.total, audio: audio3.count, av: av3.count },
    },
    offlineWindow: OFFLINE,
    euJurisdiction: { pinned: slist.euPinned, euId: slist.euId, unpinnedId: slist.unpinnedId },
  };

  // ---- 9. owner offline -> auto-offline via socket close ----
  await cdpH.eval('window.host.goOffline()');
  await sleep(1200);
  const off = (await (await fetch('https://elektron-instrument.kristjan-jansen.workers.dev/instruments')).json()).instruments.find((i) => i.id === INST);
  check('auto-offline on socket close', off.online === false, { online: off.online });

  // ---- 10. the owner can leave the catalog entirely ----
  await cdpH.eval('window.host.unlist()');
  await sleep(800);
  const gone = (await (await fetch('https://elektron-instrument.kristjan-jansen.workers.dev/instruments')).json()).instruments;
  check('unlist removes it from the public catalog', !gone.find((i) => i.id === INST), { remaining: gone.length });

  // ---- 11. console cleanliness (read AFTER everything, including storage) ----
  const hFinal = await cdpH.eval('window.host.state()');
  const pFinal = await cdpP.eval('window.player.state()');
  check('no page errors on the host', hFinal.errors.length === 0, hFinal.errors.slice(0, 3));
  check('no page errors on the player', pFinal.errors.length === 0, pFinal.errors.slice(0, 3));

  const summary = {
    at: new Date().toISOString(), instrument: INST, notes: NOTES,
    clockSource: 'local (rig /time-local, same-host truth)',
    sessionSetupMs: { fromRequestToChannelOpen: setupMs, pcOfferToChannelOpen: ps.setupMs, hostAnswerToConnected: hs.setupMs },
    oneWayMidiMs: ps.oneWayMidiMs, keyToEarMs: ps.keyToEarMs,
    hostOneWayMs: hs.owMs,
    counts: { framesSent: ps.sent, hostRecv: hs.midiRecv, actuated: hs.actuated, acks: ps.acks, onsets: ps.onsets, logged: ps.logged, replayFired: rep.fired },
    hostActuation: { late: hs.late, filteredRealtime: hs.filtered, dupDropped: hs.dup, watchdogFired: hs.watchdogFired, panics: hEnd.panics },
    micSettings: hs.micSettings, usingSyntheticSynth: hs.usingSynthetic,
    playerClock: ps.clock, hostClock: hs.clock,
    storage: STORAGE,
    notes: NOTES_OUT,
    checks: CHECKS,
    pass: CHECKS.every((c) => c.ok),
  };
  await writeFile(join(ROOT, 'results', 'instr-verify.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({ ...summary, checks: undefined }, null, 2));
  console.log(`\n${CHECKS.filter((c) => c.ok).length}/${CHECKS.length} checks passed`);
  return summary.pass;
}

async function newTab(url) {
  for (const method of ['PUT', 'POST', 'GET']) {
    const r = await fetch(`http://127.0.0.1:${DBG}/json/new?${encodeURIComponent(url)}`, { method }).catch(() => null);
    if (r && r.ok) return await r.json();
  }
  throw new Error('could not open tab ' + url);
}
async function connectTo(target) {
  const c = new CDP();
  c.ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { c.ws.onopen = res; c.ws.onerror = rej; });
  c.ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && c.pending.has(m.id)) { c.pending.get(m.id)(m); c.pending.delete(m.id); }
  };
  return c;
}
async function shoot(cdp, file) {
  await cdp.send('Page.bringToFront').catch(() => {});
  await sleep(400);
  await cdp.screenshot(file);
  console.log('screenshot', file);
}

let ok = false;
try { ok = await main(); }
catch (e) { console.error('RUN FAILED:', e.stack || e.message); }
finally {
  for (const c of [cdpH, cdpP, cdpB]) if (c) c.close();
  for (const p of kids) { try { p.kill(); } catch {} }
  await sleep(500);
  sh(`pkill -f 'instr-udd' 2>/dev/null`);
  sh(`pkill -f 'proto/instrument/server.mjs' 2>/dev/null`);
  console.log('cleanup done');
  process.exit(ok ? 0 : 1);
}

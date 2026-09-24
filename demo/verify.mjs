// demo/verify.mjs — drives every BUILT demo through the __demo contract.
//
//   node demo/verify.mjs            # all built demos
//   node demo/verify.mjs transport loops   # just these, by slug
//
// This file is what replaces the ~25 harness pages: it asserts on
// window.__demo, never on DOM ids, so it does not care how any page is built.
// Raw CDP over node's global WebSocket, no deps — house harness style.

import { spawn, execFileSync } from 'node:child_process';
import { rm, readFile } from 'node:fs/promises';
import { serve, PORT as HTTP_PORT } from './server.mjs';
import { DEMOS } from './manifest.mjs';
import { claimProfile } from './harness-profile.mjs';
import { startStation } from './fake-station.mjs';
import { startTapes } from './fake-tapes.mjs';
import { startErr } from './fake-err.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// 🔴 A FIXED PORT IS A SHARED MUTABLE GLOBAL, and this file still had two of
// them. CLAUDE.md records the same bug in `verify-gl.mjs` — it attached to a
// Chrome left over from a previous run and reported THAT run's flags, which is
// how a SwiftShader test reported ANGLE Metal — and the fix ("let the OS choose
// and read back what you got") was applied to the HTTP port here and never to
// these two. So two harnesses started at once did not collide loudly: the
// second found 9333 already answering, attached to the FIRST's browser, and
// drove someone else's tabs while reporting its own slugs. With agents running
// in parallel that is not a rare race, it is the normal case — and it is the
// likeliest explanation for a `cdp timeout` that took a full suite out today on
// a demo that is 16/16 when run alone.
//
// ⚠️ The profile has to become per-run IN THE SAME CHANGE, not as tidiness.
// Chrome writes the port it actually got into `DevToolsActivePort` inside the
// profile, so reading it back from a SHARED directory would find whichever
// browser wrote there last — a per-run port with a shared profile still lands
// on somebody else's browser. A shared profile is also a shared HTTP cache,
// which is the opaque-response bug this file already deletes `Default/Cache`
// to avoid.
const CDP_PORT = 0;                       // 0 = let the OS pick; read back below
// The profile is claimed rather than named: `claimProfile` removes it when this
// run ends however it ends, and SWEEPS the ones left by runs that were killed.
// See demo/harness-profile.mjs — 229 of these had accumulated to ~20 GB.
const { dir: PROFILE, swept: SWEPT } = claimProfile('demo-verify-udd');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const want = process.argv.slice(2);
// ⚠️ A `gl: true` DEMO IS NOT THIS HARNESS'S SUBJECT, AND FAILING IT HERE WOULD
// BE A LIE. This file launches Chrome with `--disable-gpu` (see the flags
// below), where `getContext('webgl2')` returns null — so a visual demo reports
// `__demo.ready` false and the suite goes red for a page that is perfectly
// fine. Hand them to demo/verify-gl.mjs and SAY SO, rather than counting a
// subject this harness cannot reach as a failure.
const all = DEMOS.filter((d) => d.built && (!want.length || want.includes(d.name)));
const handedOff = all.filter((d) => d.gl);
const targets = all.filter((d) => !d.gl);
if (handedOff.length) {
  const n = handedOff.length;
  console.log(`(${handedOff.map((d) => d.name).join(', ')} ${n === 1 ? 'needs' : 'need'} a GPU — this harness runs --disable-gpu; use node demo/verify-gl.mjs)`);
}
if (!targets.length) { console.error('nothing for this harness to verify'); process.exit(handedOff.length ? 0 : 1); }

// 🔴 COUNT THE OTHER BROWSERS BEFORE BLAMING THE CODE. Three runs in one
// session read broken because of processes of MY OWN: a full suite went
// 429/429, then 420/429 with nine failures, then 429/429 again with no code in
// between, and all nine were in the demos that need something off this machine.
// Today the same thing took the suite out entirely — a `cdp timeout` on
// `replay`, which is 16/16 when run alone. CLAUDE.md has carried this as a rule
// to remember since session 18, and a rule to remember is the weakest kind of
// guard: it only fires if the person reading the red output happens to recall
// it. This makes the harness SAY IT, at the moment the output is being read.
//
// ⚠️ `-f` IS REQUIRED HERE AND IT IS THE TRAP. The flags we are looking for are
// on the command line, so an exact-name match cannot see them — but a `-f`
// pattern also matches the process doing the asking, which is LESSONS #39's
// shape (`pgrep -f h264_v4l2m2m` answering "still held" about itself). So our
// OWN pid is excluded explicitly, and after launch our own debugging port is
// too. Informational, NEVER fatal: a harness that refuses to run because
// something else is open is worse than the problem it is guarding against.
const peerBrowsers = (excludePort) => {
  try {
    return execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })
      .split('\n')
      .filter((l) => /Google Chrome/.test(l) && /--remote-debugging-port=(\d+)/.test(l))
      // ⚠️ ONE BROWSER IS ABOUT TEN PROCESSES. Chrome's renderer, GPU and
      // utility helpers inherit the whole command line, `--user-data-dir` and
      // `--remote-debugging-port` included, so a naive count of matching
      // processes reported **19 other headless Chromes** for two — and a
      // warning that overstates by 10x is worse than no warning, because the
      // next reader learns to ignore it. The browser process is the one with no
      // `--type=`; every helper has one.
      .filter((l) => !/--type=/.test(l))
      .filter((l) => Number(l.trim().split(/\s+/)[0]) !== process.pid)
      .filter((l) => !(excludePort && l.includes(`--remote-debugging-port=${excludePort}`)))
      .map((l) => {
        const port = (l.match(/--remote-debugging-port=(\d+)/) || [])[1];
        const udd = (l.match(/--user-data-dir=(\S+)/) || [])[1] || '?';
        return { port, udd };
      })
      // and a browser is its PORT: a relaunch on the same port is still one
      .filter((p, i, a) => a.findIndex((q) => q.port === p.port) === i);
  } catch { return []; }            // ps is not the subject; never fail on it
};
const peersAtStart = peerBrowsers(null);
if (peersAtStart.length) {
  const where = [...new Set(peersAtStart.map((p) => p.udd))];
  console.log(`⚠️  ${peersAtStart.length} other headless Chrome${peersAtStart.length === 1 ? '' : 's'} `
    + `already running (${where.slice(0, 3).join(', ')}${where.length > 3 ? ', …' : ''}).`);
  console.log('   A demo that needs the relay, the board or bandwidth can read RED for that reason alone.');
  console.log('   Run any failing demo ALONE before believing it: node demo/verify.mjs <slug>');
}

/**
 * 🔴 FOUR PAGES ARE GRADED AGAINST STAND-INS, NEVER AGAINST THE REAL THING, AND
 * THE HARNESS DOES IT RATHER THAN THE PERSON REMEMBERING TO.
 *
 * Every station `/radio/` offers is an ERR mount, and ERR told us our listeners
 * were corrupting their audience figures: the standing rule is that a connection
 * to one is opened only when a PERSON is going to listen. That made the page's
 * own thirty-four checks unrunnable, so `node demo/verify.mjs radio` either
 * never happened or happened at somebody else's expense. `demo/fake-station.mjs`
 * serves real MP3 frames with real ICY headers at the page's own `?base=`, so
 * the decode path, the loop and the whole self-check run against a mount that is
 * nobody's radio station.
 *
 * 🔴 AND `/tapes/` IS THE SAME PROBLEM WITHOUT THE BROADCASTER, WHICH IS WHY IT
 * WENT UNNOTICED FOR LONGER. It plays twenty-four recordings off archive.org,
 * and the argument that this was safe, *"it uses archive.org, not ERR"*, got
 * the reply *"stil: super careful with external sources, better avoid"*. The
 * rule is about whose server it is, not about which harm has been named yet. A
 * plain `node demo/verify.mjs` with no arguments pulled real recordings down,
 * which is the way it happens by accident. `demo/fake-tapes.mjs` serves the same
 * paths at the lengths `corpus.json` measured.
 *
 * 🔴 AND `/now/` AND `/flipper/` ARE THE SAME BROADCASTER AS `/radio/`, WHICH
 * IS WHY THE LAST FULL SUITE SKIPPED BOTH IN WRITING. They sweep ERR's live HLS
 * two bytes at a time to find where the rights refusals start, which is thirty
 * probes on one page and eight per channel on the other, plus a ten minute
 * back-seek that pulls another stretch of the window down. `demo/fake-err.mjs`
 * serves the same playlists on the same sliding window, with the three refusal
 * shapes ERR was measured to have, so both pages can be run as often as
 * anybody likes.
 *
 * ⚠️ IT IS AUTOMATIC BECAUSE THE ALTERNATIVE IS A RULE SOMEBODY HAS TO
 * REMEMBER, and a rule that is only in a document is a rule that gets broken on
 * the day somebody is in a hurry. `DEMO_QUERY=base=…` still wins, because
 * `URLSearchParams.get` returns the first occurrence and `DEMO_QUERY` is put
 * first: that is the escape hatch for somebody who has been ASKED to check the
 * real relay or the real archive.
 */
/** slug -> the `?base=` its page is pointed at, filled in as each one comes up. */
const standIn = new Map();
const standIns = [];
if (all.some((t) => t.name === 'radio')) {
  const station = startStation({ port: 0, quiet: true });
  if (!station) {
    console.log('⚠️  the stand-in station needs ffmpeg and could not be built, so `radio` '
      + 'will be graded against nothing rather than against ERR.');
  } else {
    await new Promise((r) => station.on('listening', r));
    standIn.set('radio', `http://127.0.0.1:${station.address().port}`);
    standIns.push(station);
    console.log(`stand-in station ${standIn.get('radio')} (nobody's radio)`);
  }
}
if (all.some((t) => t.name === 'tapes')) {
  const archive = startTapes({ port: 0, quiet: true });
  if (!archive) {
    console.log('⚠️  the stand-in archive needs ffmpeg and could not be built, so `tapes` '
      + 'will be graded against nothing rather than against archive.org.');
  } else {
    await new Promise((r) => archive.on('listening', r));
    standIn.set('tapes', `http://127.0.0.1:${archive.address().port}`);
    standIns.push(archive);
    console.log(`stand-in archive ${standIn.get('tapes')} (nobody's archive)`);
  }
}
// ⚠️ ONE SERVER FOR BOTH PAGES, because it is one broadcaster. Two would build
// the same hundred megabytes of picture twice and hold two copies of it open.
const ERR_PAGES = ['now', 'flipper'];
if (all.some((t) => ERR_PAGES.includes(t.name))) {
  const err = startErr({ port: 0, quiet: true });
  if (!err) {
    console.log('⚠️  the stand-in broadcaster needs ffmpeg and could not be built, so `now` '
      + 'and `flipper` will be graded against nothing rather than against ERR.');
  } else {
    await new Promise((r) => err.on('listening', r));
    const at = `http://127.0.0.1:${err.address().port}`;
    /**
     * 🔴 THE TWO PAGES ARE POINTED AT TWO ARRANGEMENTS OF THE SAME BROADCASTER,
     * BECAUSE THEY WANT OPPOSITE THINGS FROM IT AND BOTH OPEN CHANNEL 0.
     *
     * `/flipper/` is about finding where the rights refusals start: it sweeps
     * back from the live edge, starts the picture ninety seconds behind the
     * boundary and stops loading when it reaches it. None of that runs on a
     * channel whose edge is served, so it gets `/wall`, which is the
     * arrangement ERR was measured wearing on 2026-09-06.
     *
     * `/now/` is about a live picture on a line, and it has NO path for a
     * refused live edge. Pointed at `/wall` it shows black and takes six
     * asserts red, all downstream of a clock that never starts. So it gets the
     * default arrangement, where channel 0 plays and the refusals are at the
     * old end of the window where its sweep still finds them.
     *
     * ⚠️ THAT ASYMMETRY IS A FINDING ABOUT `/now/`, NOT A SETTING. It is in
     * `BACKLOG.md`; the fix is `/flipper/`'s `servedStart` at startup.
     */
    standIn.set('now', at);
    standIn.set('flipper', `${at}/wall`);
    standIns.push(err);
    console.log(`stand-in broadcaster ${at} (nobody's ERR)`);
  }
}

// DEMO_BASE=https://positron.studio node demo/verify.mjs  -> verify the DEPLOY
const server = process.env.DEMO_BASE ? null : await serve(HTTP_PORT);
// The port ACTUALLY bound, which may not be the one asked for — see
// serve()'s comment about a dev server already holding it.
const BASE = process.env.DEMO_BASE || `http://127.0.0.1:${server.address().port}`;
// (`server` is null only when DEMO_BASE is set, and then it is not read.)
console.log(`base ${BASE}`);
if (SWEPT) console.log(`(swept ${SWEPT} profile dir(s) left by killed runs)`);

// EMPTY CACHE EVERY RUN. A media element loading `video.src = <m3u8>` stores a
// no-cors (opaque) entry for that URL; when a demo later switches to hls.js,
// its XHR for the SAME url is served from that entry and rejected as a CORS
// failure — on a URL that answers 200 with `access-control-allow-origin: *`.
// Two demos read red for exactly that reason and nothing in the page was wrong.
await rm(`${PROFILE}/Default/Cache`, { recursive: true, force: true }).catch(() => {});

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--autoplay-policy=no-user-gesture-required', '--mute-audio',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});

let wsUrl = null, cdpPort = null;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await sleep(250);
  try {
    // the port we ACTUALLY got, from our own profile — never guessed
    if (!cdpPort) cdpPort = Number((await readFile(`${PROFILE}/DevToolsActivePort`, 'utf8')).split('\n')[0]);
    if (!Number.isFinite(cdpPort) || !cdpPort) { cdpPort = null; continue; }
    wsUrl = (await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json()).webSocketDebuggerUrl;
  } catch {}
}
if (!wsUrl) { chrome.kill(); server?.close(); throw new Error('chrome did not come up'); }

const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let msgId = 0;
const pending = new Map();
const listeners = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
  } else if (m.method) for (const fn of listeners) fn(m);
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    setTimeout(() => { if (pending.delete(id)) reject(new Error('cdp timeout: ' + method)); }, 30000);
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable'); await S('Log.enable'); await S('Network.enable');

let errors = [];
let failedReqs = [];
let abortedReqs = [];
let edgeMisses = [];   // LL-HLS live-edge part 404s: expected churn, capped
// Upstream refusals a demo asks for ON PURPOSE — today that is ERR's
// rights-blocked segments, which `flipper` sweeps for. Counted and capped,
// never ignored: the label has to name what they are, or the next reader
// believes a refusal was a radio station.
//
// The WHEP single-track branch below is kept but has no caller since `tracks`
// was removed on 2026-09-08. Cloudflare still refuses such an offer, so the
// allowance stays correct for whatever asks next.
let probed = [];
const reqUrl = new Map();   // requestId -> url, so a failure can be attributed
/**
 * 🔴 WHOSE SERVERS A DEMO ACTUALLY TOUCHED, COUNTED. `DEMO_HOSTS=1`.
 *
 * The standing rule here is about whose server a run spends, and until this
 * existed there was no way to check it: a page pointed at a stand-in and a page
 * pointed at the real thing produce identical output. This is the instrument,
 * and it is `Network.requestWillBeSent`, which fires for every request the
 * renderer makes rather than for the ones a page remembered to log.
 *
 *   DEMO_HOSTS=1 node demo/verify.mjs tapes
 *
 * ⚠️ OFF BY DEFAULT AND PRINTED PER DEMO. Most demos here legitimately talk to
 * the relay, to Cloudflare or to ERR, so a line on every run would be noise
 * around the one run where it is the answer.
 */
const SHOW_HOSTS = process.env.DEMO_HOSTS === '1';
let hostHits = new Map();

/**
 * 🔴 A RIGHTS REFUSAL IS RECOGNISED BY WHERE IT CAME FROM, AND THERE ARE TWO
 * PLACES NOW. Both classifiers below used to test the URL for `live.err.ee`,
 * which was the whole address of the only thing that sent one. `fake-err.mjs`
 * sends the same 403 with the same missing `access-control-allow-origin` from
 * `127.0.0.1`, so the day the harness stopped pointing these pages at ERR,
 * every deliberate refusal became an unexplained console error and two pages
 * that were working read red.
 *
 * ⚠️ IT IS THE STAND-IN'S OWN ADDRESS PLUS THE SEGMENT PATH, NOT A LOOPBACK
 * TEST. Anything looser would swallow a real failure from the dev server, and
 * the whole value of this bucket is that it is narrow enough to be trusted.
 *
 * ⚠️ AND IT IS GIVEN THE WHOLE LOG LINE, NOT ONLY `entry.url`. Chrome files a
 * CORS violation with an EMPTY url and the address inside the message text, so
 * a version of this that only read the url classified the `loadingFailed`
 * events correctly and left the console entries for the same segments sitting
 * in `errors`. MEASURED: 22 refusals recognised and `no console errors` still
 * red, which reads as one bug and was two.
 */
const errRefusal = (s) => /live\.err\.ee/.test(s)
  || (standIn.has('now') && s.includes(standIn.get('now'))
      && /\/live\/[a-z0-9]+\/seg-\d+\.ts/.test(s));
listeners.push((m) => {
  if (m.sessionId !== sessionId) return;
  if (m.method === 'Network.requestWillBeSent') {
    const u = m.params.request?.url || '';
    reqUrl.set(m.params.requestId, u);
    if (SHOW_HOSTS) {
      // `data:` and `blob:` have no host and are this machine's own memory.
      try { const h = new URL(u).host; if (h) hostHits.set(h, (hostHits.get(h) || 0) + 1); }
      catch { /* not a URL with a host */ }
    }
  }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    const e = m.params.entry;
    // A 404 on an LL-HLS PART is normal at the live edge — players request
    // parts as they are born and hls.js retries; src/low-latency-player.js
    // says so where it sets fragLoadingMaxRetry. Same treatment as
    // ERR_ABORTED above: recorded separately, NOT ignored. The assert below
    // still fails past a ceiling, because silence here would hide a real
    // outage as "normal churn".
    if (/seg_\d+_part|_part_all\.mp4|\.m4s(\?|$)/.test(e.url || '') && /\b404\b/.test(e.text || '')) {
      edgeMisses.push(e.url);
    } else if (/webRTC\/play/.test(e.url || '') && /\b409\b/.test(e.text || '')) {
      // 🔴 A 409 ON A WHEP PLAY URL MEANS NOTHING IS PUBLISHING TO THAT INPUT,
      // which is a fact about the rig being off rather than about the page.
      // `demo/shell/live.mjs` records the same 409 for the same reason: an
      // input has to be fed by WHIP before it can be played by WHEP.
      // MEASURED 2026-09-15 against Cloudflare directly, outside any browser:
      // a bare POST to that play URL answered 409 while `keep` read 13/14 run
      // after run on an otherwise clear machine.
      // ⚠️ RECORDED AND CAPPED, NEVER IGNORED, which is the whole difference.
      // Silence here would turn "the studio rig is not running" into a green
      // run, and the next person to look would have no way to tell that from a
      // page that had stopped asking at all.
      probed.push(e.url);
    } else if (/webRTC\/play/.test(e.url || '') && /\b400\b/.test(e.text || '')) {
      // Cloudflare WHEP refuses a single-track offer with a 400, both ways.
      // `tracks` used to assert on that refusal; it is gone, so nothing sends
      // one today. Kept because the fact has not changed and the next page to
      // probe it should not read as broken. Capped like the others.
      probed.push(e.url);
    } else if (/shout\.positron\.studio/.test(e.url || '') && /\b50[02]\b/.test(e.text || '')) {
      // 🔴 A 502 FROM `shout` IS THE RELAY SAYING AN ORIGIN IS DOWN, and the
      // page whose job is six radio stations handles it by falling back and
      // saying so. MEASURED repeatedly today: four of eight mounts 502 while
      // the other four answered 200 through the identical worker, and this
      // laptop reached every one of them directly at `icecast.err.ee`. So the
      // failure is upstream of us, it is not constant, and a demo that cycles
      // stations meets it as a matter of course.
      // ⚠️ CAPPED, NEVER IGNORED, AND THAT MATTERS MORE HERE THAN ELSEWHERE.
      // Past the ceiling this stops being one flapping mount and becomes OUR
      // relay being down, which is the opposite diagnosis and the one a reader
      // of this suite most needs told apart. `shout.positron.studio/health`
      // answers per station and is the thing to look at.
      probed.push(e.url);
    } else if (/positron-vain\.[^/]+\.workers\.dev|vain\.positron\.studio/.test(e.url || '')
               && /\b(404|413|415)\b/.test(e.text || '')) {
      // 🔴 `vain` ASKS ITS OWN ARCHIVE TO REFUSE, THREE TIMES, ON PURPOSE: a
      // file over the cap (413), a JPEG named `.mp3` (415), and the sidecar
      // before it exists (404). All three are asserted ON the page and none
      // writes a byte, which is the point of asking.
      // ⚠️ NO PAGE-SIDE CHANGE CAN REMOVE THESE. Chrome logs a resource error
      // for any 4xx and does it identically for `fetch` and `XMLHttpRequest`,
      // MEASURED both ways rather than reasoned about. A check that cannot be
      // made without a console error is exactly what this allowance is for.
      // Capped like the others, never ignored: past the ceiling these stop
      // being three deliberate refusals and become an archive that is refusing
      // everything.
      probed.push(e.url);
    } else if (/\.archive\.org/.test(e.url || '') && /\b5\d\d\b/.test(e.text || '')) {
      // 🔴 archive.org 5xx ON A METADATA PROBE IS THEIR SERVER, NOT THIS PAGE.
      // `/tapes/` asks all 24 recordings how long they are so a bar can be as
      // wide as its tape, four at a time, straight at whichever node
      // archive.org hands out. MEASURED across ten runs: two of them drew a 500
      // from `dn720304.ca.archive.org` on one probe, and the other eight drew
      // none, with no code between them.
      // ⚠️ CAPPED LIKE THE OTHERS AND NEVER IGNORED. Past the ceiling this stops
      // being one flaky node and becomes an archive that is down, which is
      // something a reader of this suite needs to be told rather than have
      // folded into "expected churn".
      probed.push(e.url);
    } else if (errRefusal(`${e.url || ''} ${e.text || ''}`)
               && /\b403\b|CORS|ERR_FAILED/.test(e.text || '')) {
      // A rights refusal is a 403 with no ACAO, so the browser reports CORS.
      // `flipper` probes for this deliberately and says in its readout how much
      // was refused, and `now` walks its playhead into it on purpose; the
      // requests are expected from both. Capped, not ignored: past the ceiling
      // this is an outage, not rights.
      probed.push(e.url);
    } else errors.push(e.text);
  }
  if (m.method === 'Network.loadingFailed') {
    // ERR_ABORTED is what a media element's in-flight segment requests do
    // when the page unloads — it means WE navigated, not that the page
    // failed. Every page that plays media produces these on teardown, so
    // counting them made a working demo look broken. Recorded separately
    // rather than ignored.
    const url = reqUrl.get(m.params.requestId) || '';
    if (m.params.errorText === 'net::ERR_ABORTED') abortedReqs.push(m.params.errorText);
    else if (m.params.corsErrorStatus && errRefusal(url)) probed.push(url);
    else failedReqs.push(`${m.params.errorText}${url ? ` ${url.slice(0, 70)}` : ''}`);
  }
});

async function ev(expr) {
  const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

/**
 * Drag across every `[data-gesture]` element on the page, with real pointer
 * events. Returns how many surfaces were drawn on.
 *
 * THE PATH IS A LISSAJOUS, not a straight line, and the reason is measurement:
 * a straight drag is reconstructed exactly by every interpolator, so a page
 * comparing hold against linear against a spline would grade all three as
 * perfect and its whole subject would vanish into a tie. A curve separates
 * them.
 *
 * ⚠️ TIMESTAMPS ARE SUPPLIED. `Input.dispatchMouseEvent` takes one, and
 * without it every sample would be stamped when the round trip happened —
 * so the gesture's input rate would be a measurement of this harness's
 * latency rather than of anything on the page. `ev.timeStamp` in the page is
 * what a capture gate reads, so it has to be the honest one.
 */
async function gesture() {
  const n = await ev(`document.querySelectorAll('[data-gesture]').length`);
  if (!n) return 0;
  const STEPS = 200, STEP_MS = 16;          // 200 samples over 3.2 s
  for (let k = 0; k < n; k++) {
    // ⚠️ SCROLL IT INTO VIEW FIRST, AND RE-READ THE RECTANGLE AFTER. Headless
    // Chrome's default viewport is 800x600 and these pages are taller than
    // that, so a canvas half way down the page has a bounding rectangle whose
    // lower half is BELOW THE VIEWPORT — and an input event dispatched at a
    // y past the viewport lands on nothing at all, silently. The first run of
    // this helper read `page asserted something — 0` for exactly that, while
    // the identical drag in a 900px window produced 200 moves and 5 asserts.
    const b = await ev(`(() => {
      const e = document.querySelectorAll('[data-gesture]')[${k}];
      e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height,
               vw: innerWidth, vh: innerHeight };
    })()`);
    if (!b || b.w < 20 || b.h < 20) continue;
    // and clamp to what is actually on screen, for a surface taller than the
    // viewport even after scrolling
    const top = Math.max(0, b.y), bot = Math.min(b.vh, b.y + b.h);
    if (bot - top < 20) continue;
    b.y = top; b.h = bot - top;
    // inset, so the ends of the path are not clamped against the edges
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const ax = b.w * 0.40, ay = b.h * 0.38;
    const at = (i) => {
      const u = i / STEPS;
      return { x: cx + ax * Math.sin(2 * Math.PI * u + 0.4), y: cy + ay * Math.sin(4 * Math.PI * u) };
    };
    // TimeSinceEpoch, in SECONDS, which is what the CDP Input domain wants.
    const t0 = Date.now() / 1000;
    const p0 = at(0);
    await S('Input.dispatchMouseEvent', { type: 'mousePressed', x: p0.x, y: p0.y, button: 'left', clickCount: 1, buttons: 1, timestamp: t0 });
    for (let i = 1; i <= STEPS; i++) {
      const p = at(i);
      await S('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, button: 'left', buttons: 1, timestamp: t0 + (i * STEP_MS) / 1000 });
    }
    const pn = at(STEPS);
    await S('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pn.x, y: pn.y, button: 'left', clickCount: 1, buttons: 0, timestamp: t0 + (STEPS * STEP_MS) / 1000 });
    await sleep(120);
  }
  return n;
}

/**
 * Type into every `[data-typing]` element, with real key events.
 *
 * The twin of `gesture()` above, and it exists for the same reason: a page
 * whose subject is TYPING was a subject this harness could not reach, because
 * a click produces no `input` event and a drag produces no text. `typist`
 * found two real bugs the first time it was driven this way — a fold at
 * position 0 emptying the box the first letter had just gone into, and a strip
 * that fits itself once and so drew six of seventy-one edits — neither of
 * which any button press could have surfaced.
 *
 * The sequence is not a word, it is the three things five previous text
 * adapters got wrong: characters, a BACKSPACE (which never says what it
 * removed), and an ARROW KEY (which moves the caret with no input event at
 * all). A page that only ever sees appended characters is a page whose whole
 * argument goes untested.
 *
 * ⚠️ UNLIKE THE DRAG, THE TIMING HERE IS REAL. `Input.insertText` takes no
 * timestamp, so the recorded intervals are this harness's round trips. That is
 * acceptable because no claim on this page is about input RATE — but it would
 * not be on a page that measured one, and the difference is worth knowing
 * before reusing this.
 */
async function typing() {
  const n = await ev(`document.querySelectorAll('[data-typing]').length`);
  if (!n) return 0;
  let done = 0;
  const focus = (k) => ev(`(() => {
    const e = document.querySelectorAll('[data-typing]')[${k}];
    if (!e || e.disabled || e.readOnly) return false;
    e.scrollIntoView({ block: 'center' });
    e.focus();
    return document.activeElement === e;
  })()`);
  for (let k = 0; k < n; k++) {
    let ok = await focus(k);
    // ⚠️ A PAGE MAY HAVE TO BE ARMED BEFORE IT CAN BE TYPED INTO, and the
    // PRIMARY control is this shell's convention for the main path. `typist`
    // starts on a shipped recording with the box read-only, and the control
    // loop above leaves it there because the last button pressed put it back.
    // So: if every field refuses focus, press the primary once and ask again.
    //
    // 🔴 AND THE COUNT REPORTED IS THE NUMBER ACTUALLY TYPED INTO, not the
    // number found. The first version returned the number of elements and
    // printed "typed into 1 field" about a read-only box it had skipped — a
    // harness reporting work it did not do, which is worse than reporting none.
    if (!ok) {
      await ev(`document.querySelector('.pos-controls button.pos-pri')?.click()`);
      await sleep(400);
      ok = await focus(k);
    }
    if (!ok) continue;
    done++;
    for (const step of [
      { text: 'the harness types' },
      { key: 'Backspace' }, { key: 'Backspace' }, { key: 'Backspace' },
      { text: 'ed this' },
      { key: 'ArrowLeft' }, { key: 'ArrowLeft' }, { key: 'ArrowLeft' }, { key: 'ArrowLeft' },
      { text: 'really ' },
    ]) {
      if (step.text) {
        await S('Input.insertText', { text: step.text });
      } else {
        // a named key needs both halves; `windowsVirtualKeyCode` is what makes
        // Backspace and the arrows act rather than merely arrive
        const code = { Backspace: 8, ArrowLeft: 37, ArrowRight: 39 }[step.key];
        for (const type of ['keyDown', 'keyUp']) {
          await S('Input.dispatchKeyEvent', {
            type, key: step.key, code: step.key,
            windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
          });
        }
      }
      await sleep(40);
    }
    await sleep(200);
  }
  return done;
}

// ── run ─────────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
// ⚠️ `·` RATHER THAN AN EM DASH, AND THIS IS THE SOURCE OF EVERY ONE IN A SUITE
// RUN. A sweep of 418 strings across 62 files could not reach it, because the
// dash is not in any page: it is added here, to every line, as it is printed.
// The rule is about anything a reader looks at, and a suite run is read more
// often than most pages.
const ok = (label, cond, detail) => {
  if (cond) { pass++; console.log(`  ok    ${label}${detail !== undefined ? `  · ${detail}` : ''}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail !== undefined ? `  · ${detail}` : ''}`); }
};

for (const t of targets) {
  console.log(`\n[${t.name}]`);
  errors = []; failedReqs = []; abortedReqs = []; edgeMisses = []; probed = []; reqUrl.clear();
  hostHits = new Map();
  // DEMO_QUERY appends to every page, so a BRANCH can be verified rather than
  // only the default. Added when moq's publisher started PROBING for a codec:
  // the probe picks AV1, every recorded MoQ number was taken on VP8, and a
  // fallback the harness cannot select is a fallback nobody has run.
  //   DEMO_QUERY='codec=vp8' node demo/verify.mjs moq
  // 🔴 A FIXED ROOM NAME IS A SHARED MUTABLE GLOBAL, and this repo learned that
  // about PORTS and never applied it to rooms. `serve()` takes the next free
  // port and `verify-gl` reads back the CDP port it got, precisely because a
  // fixed one meant a harness attached to the previous run's Chrome and
  // reported that run's flags. Every demo here defaults to a NAMED room —
  // `cues-demo`, `jam-demo`, `scene-demo`, `room-demo` — so two runs of the
  // suite, or a run and a visitor, land in the same one and see each other's
  // traffic. That is the same bug in the WebSocket layer.
  //
  // So a harness run gets a room of its own, per demo, per run. It costs one
  // query parameter and it removes a whole class of "I was competing with
  // myself", which this project has paid for twice: nine orphaned Chromes
  // filled `studio-1` and took a live demo down (LESSONS #56), and a full run
  // went 429 -> 420 -> 429 with no code between.
  //
  // ⚠️ TWO ROOMS ARE NOT LIKE THAT AND MUST NOT BE OVERRIDDEN. `room: 'fixed'`
  // in the manifest means the name is not a rendezvous this page invented, it
  // is the ADDRESS OF A MACHINE — `studio-1` is where the Raspberry Pi is and
  // `m1-1` is where the studio Mac's agent is — or a room whose SUBJECT is the
  // history it shares (`wire` reads its own backlog back). Renaming those does
  // not isolate a run, it points it at nothing.
  //
  // ⚠️ AND A DEVICE IS STILL EXCLUSIVE. A private room does not give a second
  // client its own Raspberry Pi: there is one JACK graph and one instrument, so
  // board-bound demos still have to take turns. Rooms were never that problem;
  // conflating the two is what made them look like one.
  /**
   * A private room per run, so two runs cannot see each other's rows and
   * neither can see the real page's.
   *
   * ⚠️ `<demo>-test-<hash>`, NOT `v-<demo>-<hash>`. The `v` stood for verify and
   * was obvious to nobody — asked, in those words: *"What is v- prefix?"*. A
   * room name is read by somebody looking at a store wondering what all these
   * rows are, and `items-test-4f2a` answers that where `v-items-4f2a` needs a
   * footnote. It also cannot be mistaken for the real room by a rule that has to
   * tell them apart: `workers/items` will only announce from the room named
   * `items`, because one FCM topic means one room may use it — a harness room
   * that reached real phones is exactly how this came up.
   */
  const own = t.room === 'fixed' ? '' : `room=${t.name}-test-${Math.random().toString(36).slice(2, 8)}`;
  // 🔴 THE HARNESS SAYS SO, SO A PAGE CAN KEEP ITS DESTRUCTIVE CHECKS OUT OF A
  // VISIT. `radio` proves a station button works by pressing another station
  // and pressing back, and proves the transport stops by stopping it — on the
  // decoded path both are a decoder teardown and rebuild, so both are a hole in
  // the sound. They ran for every listener, three times, in the first seconds of
  // a visit, and were REPORTED as such twice. A page that can only check itself
  // by breaking itself needs to know whether anybody is collecting the answer.
  //
  // ⚠️ EVERY DEMO GETS IT AND ALMOST NONE READ IT, which is the point — the flag
  // is a fact about the run, not a per-demo setting to keep in step. A page that
  // needs it opts in by reading it.
  const q = [process.env.DEMO_QUERY, own, 'selfcheck=1',
    standIn.has(t.name) ? `base=${standIn.get(t.name)}` : ''].filter(Boolean).join('&');
  const query = q ? `?${q}` : '';
  await S('Page.navigate', { url: `${BASE}/${t.name}/${query}` });
  await sleep(1400);

  // ready, with a bounded wait — never a bare sleep
  let ready = false;
  for (let i = 0; i < 40 && !ready; i++) {
    ready = await ev('!!(window.__demo && window.__demo.ready)');
    if (!ready) await sleep(150);
  }
  ok('__demo.ready', ready);
  if (!ready) {
    /* 🔴 SAY WHETHER THE OBJECT IS THERE AT ALL, BECAUSE THE TWO CAUSES LOOK
       IDENTICAL FROM HERE. `__demo` missing means the module never finished;
       `__demo` present with `ready` falsy means the shell mounted and the page
       did not get to the end. Both printed `failed: null` and `console:
       nothing`, and 2026-09-22 was spent bisecting the difference by hand. */
    console.log(`        __demo: ${await ev('typeof window.__demo')}`
      + `, ready ${await ev('window.__demo ? typeof window.__demo.ready : "n/a"')}`
      + `, asserts ${await ev('(window.__demo && window.__demo.asserts && window.__demo.asserts.length) ?? "n/a"')}`);
    console.log(`        failed: ${await ev('window.__demo && window.__demo.failed')}`);
    /**
     * 🔴 AND WHAT THE CONSOLE SAID, BECAUSE THIS IS EXACTLY WHEN IT MATTERS.
     * The `no console errors` check runs much later and this `continue` skips
     * it, so a page that dies before `ready` reported ONE line — `failed: null`
     * — and threw its actual reason away. MEASURED 2026-09-17: two separate
     * dangling references on `/stage/`, each an ordinary ReferenceError sitting
     * in the console, each taking a round of manual bisecting to find, because
     * the harness knew and did not say.
     * ⚠️ A page that never becomes ready is the one case where the console is
     * the whole story: there are no asserts to read, no readout to inspect, and
     * `failed` is only set by a page that got far enough to set it.
     */
    for (const e of errors.slice(0, 5)) console.log(`        console: ${String(e).split('\n')[0].slice(0, 160)}`);
    if (!errors.length) console.log('        console: nothing, so it is hanging rather than throwing');
    continue;
  }

  const meta = await ev('({ name: __demo.name, keys: Object.keys(__demo.readout), hasT: !!__demo.transport, readoutOptOut: !!__demo.readoutOptOut })');
  ok('identity matches manifest', meta.name === t.name, meta.name);
  // ⚠️ A PAGE MAY DECLARE THAT IT HAS NOTHING TO PUT IN A READOUT, but it has
  // to SAY SO — `readout: null` rather than an omitted field, so "this page's
  // subject is visible rather than numeric" cannot be confused with "somebody
  // forgot". `typist` is the case: the document IS the readout, and a row of
  // cells repeating the letters and the cursor position was the same facts
  // twice. An absent field is still a failure.
  ok(meta.readoutOptOut ? 'declares that it has no readout, on purpose' : 'declares a readout',
    meta.readoutOptOut || meta.keys.length > 0,
    meta.readoutOptOut ? 'the page itself is the readout' : meta.keys.join(','));

  if (meta.hasT) {
    const t0 = await ev('({ pos: __demo.transport.position, playing: __demo.transport.playing, seekable: __demo.transport.seekable, lattice: __demo.transport.lattice, rate: __demo.transport.rate, toggles: __demo.transport.toggles !== false })');
    ok('transport published', typeof t0.pos === 'number', `pos ${t0.pos}`);
    ok('rate lattice from caps', t0.lattice === null || Array.isArray(t0.lattice), JSON.stringify(t0.lattice));

    /**
     * 🔴 A BAR MAY HAVE NO PLAY BUTTON, AND THIS DRILL IS THE WHOLE REASON THAT
     * OPTION HAD TO ANNOUNCE ITSELF. `transport-bar.mjs` takes `toggle: false`
     * for a page whose sound has no position to start or resume — `/keys/`
     * holds a note while a key is down and has nothing to play. Clicking a
     * `.tbar-toggle` that was never appended throws on `null`, and asserting
     * that the position advanced would fail on a page where nothing is wrong.
     *
     * ⚠️ `!== false` RATHER THAN A TRUTH TEST, so a bar built before the option
     * existed — where the getter is `undefined` — still gets the drill. A new
     * property must not silently switch checks off on every page that predates
     * it, which is the shape of loss this suite has already had once: 27
     * asserts became 17, every one of them green.
     */
    if (!t0.toggles) console.log('        this bar has no play button, so the play/pause drill is skipped');
    else {
    /**
     * 🔴 THE TOGGLE OF THE BAR THIS DRILL IS GRADING, NOT THE FIRST ONE IN THE
     * DOCUMENT. This read `document.querySelector(".tbar-toggle")` while every
     * assert around it reads `__demo.transport`, which is the same element only
     * while a page has exactly ONE bar. `/stage/` grew a second on 2026-09-18,
     * and the two disagree by construction: the DOM query takes whichever comes
     * first in document order, and `__demo.transport` is whichever was BUILT
     * last, so on a tabbed page they are routinely different bars. The drill
     * would have pressed one control and asserted about another, which fails
     * while nothing is wrong and passes for the wrong reason just as easily.
     */
    const TOGGLE = '__demo.transport.el.querySelector(".tbar-toggle")';
    // play advances position
    await ev(`${TOGGLE}.click()`);
    await sleep(500);
    const t1 = await ev('({ pos: __demo.transport.position, playing: __demo.transport.playing })');
    ok('play advances position', t1.playing && t1.pos > t0.pos, `${t0.pos.toFixed(0)} -> ${t1.pos.toFixed(0)}`);

    // pause holds it
    await ev(`${TOGGLE}.click()`);
    await sleep(300);
    const a = await ev('__demo.transport.position');
    await sleep(300);
    const b = await ev('__demo.transport.position');
    ok('pause holds position', !(await ev('__demo.transport.playing')) && Math.abs(b - a) < 1, `${a.toFixed(1)} == ${b.toFixed(1)}`);
    }

    // seek via the keyboard table the component owns
    if (t0.seekable) {
      await ev('document.body.focus(); window.dispatchEvent(new KeyboardEvent("keydown",{key:"5",bubbles:true}))');
      await sleep(250);
      const mid = await ev('__demo.transport.position');
      const rng = await ev('__demo.transport.range');
      const target = rng[0] + (rng[1] - rng[0]) * 0.5;
      ok('keyboard seek lands', Math.abs(mid - target) < (rng[1] - rng[0]) * 0.02, `${mid.toFixed(0)} ~ ${target.toFixed(0)}`);
    }
  }

  const strip = await ev('!!document.querySelector("canvas.pos-strip")');
  if (strip) {
    // SAMPLE AFTER A FRAME, and more than once. `resize()` in strip.mjs assigns
    // canvas.width, which CLEARS the canvas, and only then schedules a redraw —
    // so there is a real window in which a working strip is blank, and a
    // ResizeObserver can open it at any time (a readout value getting wider, a
    // log line wrapping). Sampling one instant caught that window about one run
    // in ten and reported `0 lit samples`, which reads as a dead page.
    //
    // This is a retry, not a tolerance: a strip that never draws still fails,
    // because every try lands after a fresh frame. The count is in the detail
    // so a strip that needs several tries is visible rather than silently
    // passing.
    const sample = () => ev(`(async () => {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const c = document.querySelector('canvas.pos-strip');
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4 * 53) if (d[i] + d[i+1] + d[i+2] > 90) lit++;
      return lit;
    })()`);
    let ink = 0, tries = 0;
    for (; tries < 3 && !ink; tries++) ink = await sample();
    ok('strip has ink', ink > 0, `${ink} lit samples${tries > 1 ? ` (${tries} tries)` : ''}`);
  }

  // exercise every control the demo declared, in order — a multi-step demo
  // (arm, then measure) does not put its asserts behind the first button.
  //
  // `.tbar-x` too: a page may put a control INSIDE the transport bar when it is
  // a transport verb rather than a side action (`take` puts Record there). A
  // control the harness cannot press is a subject the suite cannot reach, which
  // is how three pages stayed green while never playing a frame.
  // ── a page whose input is a DRAG ────────────────────────────────────────
  //
  // 🔴 `element.click()` FIRES NO POINTER EVENTS, so a page that is drawn on
  // rather than pressed was a subject this harness could not reach at all.
  // `draw` carried a `Draw one for me` button purely so that something here
  // had something to press — a page answering its own question, and the line
  // it graded was not the line the page is about.
  //
  // Any element marked `data-gesture` gets a real drag instead: CDP mouse
  // events, which Chrome turns into genuine pointerdown/move/up with
  // `getCoalescedEvents` and all. The TIMESTAMPS are supplied explicitly and
  // are 16 ms apart, so the page sees a gesture at a plausible input rate
  // regardless of how fast the round trips happen to go — a drag paced by the
  // CDP transport would be a measurement of the CDP transport.
  const SEL = '.pos-controls button, .tbar-x';
  const labels = await ev(`[...document.querySelectorAll(${JSON.stringify(SEL)})].map(b => b.textContent)`);
  for (let i = 0; i < (labels || []).length; i++) {
    await ev(`document.querySelectorAll(${JSON.stringify(SEL)})[${i}].click()`);
    // A demo whose first control brings up LIVE infrastructure needs that to
    // finish before the later controls mean anything. settleMs is declared per
    // demo in the manifest rather than guessed here. Note it lands on control 0
    // ONLY — and that it now does a second job further down, sizing the wait for
    // a page's first assert. A demo whose slow control is not the first gets
    // nothing from it here and is carried entirely by that second use.
    await sleep(i === 0 && t.settleMs ? t.settleMs : 650);
  }
  if (labels?.length) console.log(`        (pressed ${labels.map((l) => JSON.stringify(l)).join(', ')})`);

  // 🔴 INPUT COMES AFTER THE CONTROLS, BOTH KINDS. A page that has to be ARMED
  // before it will record has to be armed before it is drawn on — `draw` grew
  // a record button and immediately reported `page asserted something — 0`,
  // because the drag was still running first and the page dutifully recorded
  // nothing. The drag used to go first for the opposite reason (draw's only
  // control CLEARED the canvas), and that reason is gone.
  const drawn = await gesture();
  if (drawn) console.log(`        (drew on ${drawn} surface${drawn > 1 ? 's' : ''})`);
  const typed = await typing();
  if (typed) console.log(`        (typed into ${typed} field${typed > 1 ? 's' : ''})`);

  // 🔴 A PAGE WHOSE CONTROL IS STILL RUNNING HAS NOT FINISHED, AND THE HARNESS
  // USED TO WALK OFF ANYWAY. The press loop sleeps a fixed 650 ms after each
  // button and does not await the handler, so a control that takes longer was
  // still working while the stabiliser below decided the page had nothing more
  // to say. The case that found it was the retired `seek` page, kept at
  // archive/demos/seek-index.html, whose sweep was five jumps at 700 ms
  // apiece. It did not show
  // up before because every such page carried a "Run the checks" BUTTON, which
  // gave the checks a slot of their own; taking those buttons off the pages
  // (they are harness machinery showing through, `shout` argues it) took the
  // slot with them and eleven pages quietly lost their asserts.
  //
  // `shell.mjs` already marks a running control `data-busy="1"` — it is what
  // draws the sweep across the button — so the answer was on the page the whole
  // time. ⚠️ CAPPED: a handler that never settles must cost one demo a wait,
  // not the run.
  const busyCount = () =>
    ev(`document.querySelectorAll('.pos-controls button[data-busy="1"]').length`);
  let waited = 0;
  for (let i = 0; i < 100 && (await busyCount()) > 0; i++) { await sleep(400); waited += 400; }
  if (waited) console.log(`        (waited ${(waited / 1000).toFixed(1)} s for a control to finish)`);

  // Some checks are async (`replay` fetches the manifest before asserting), so
  // a fixed sleep either flakes or wastes time. Wait for the assert count to
  // stop growing instead.
  //
  // BUT ZERO NEVER GROWS. The loop below used to exit the moment the count
  // stopped changing, and a count of 0 stops changing immediately — so a demo
  // whose FIRST assert sits behind a wait reported "asserted nothing", which
  // reads as a broken page rather than a slow one. CLAUDE.md records the trap;
  // the loop did not honour it. `take` made it concrete: recording runs to a
  // 10 s cap and every assert is behind it.
  //
  // So there are two phases. While the count is still zero, wait — then fall
  // back to the cheap "stop when it stops growing" once anything has landed.
  //
  // CAPPED, and not at `settleMs`. That number sizes a COLD CONTAINER (`tracks`
  // declares 125 s), which is a control-0 concern and has already been waited
  // out above. Reusing it here makes a page that will never assert — because
  // its live leg is down — burn the whole budget a SECOND time, turning one
  // demo into four minutes of a run. What this phase covers is a first assert
  // sitting behind work the PAGE does (`take` records to a 10 s cap), which is
  // a much smaller quantity, so it gets its own ceiling.
  const FIRST_ASSERT_CEIL = 30000;
  const countAsserts = () => ev('(window.__demo && __demo.asserts.length) || 0');
  let n = await countAsserts();
  /**
   * 🔴 THE WAIT IS ARMED BY `d.ready()`, NOT BY THE COUNT BEING ZERO, AND THAT
   * DISTINCTION BLINDED THE SUITE.
   *
   * This loop used to run `while (n === 0)`, on the reasoning that once
   * anything has landed the cheap growth loop below can take over. That held
   * only while nothing asserted early. The moment the SHELL gained two asserts
   * of its own, every page in the suite had a non-zero count at t+0, this phase
   * fell through on its first test, and a page was left with 12 tries at 400 ms
   * to produce everything it had.
   *
   * MEASURED the day it landed: `/radio/` makes 34 asserts and the suite
   * collected **2**, then reported **13/13 green**. That is this project's worst
   * failure shape, a green suite with no coverage, and it hit 28 demos at once
   * because 28 declare `settleMs`.
   *
   * ⚠️ `ready` IS THE RIGHT SIGNAL BECAUSE IT IS THE PAGE'S OWN CLAIM TO BE
   * FINISHED. A count cannot distinguish "two asserts because the page has
   * barely started" from "two asserts because that is all there are"; `ready`
   * can, since a page calls it when its checks are done. The count is still the
   * fallback for a page that never calls it, so nothing hangs.
   */
  const isReady = () => ev('!!(window.__demo && window.__demo.ready)');
  const firstBudget = Math.ceil(Math.min(t.settleMs || 0, FIRST_ASSERT_CEIL) / 400);
  // ⚠️ ONE LOOP, NOT TWO. The old pair was a "wait while nothing has landed"
  // phase followed by a "stop when it stops growing" phase, and the handover
  // between them was the defect: the first fell through the instant ANY assert
  // existed, so two asserts from the shell at t+0 handed every page straight to
  // a loop that allows 4.8 s in total. A page is done when it says it is ready
  // AND its count has stopped moving. Both conditions, or a page that calls
  // `ready()` before driving its own checks (`/radio/` does, from inside
  // the granulator's boot) is cut off at the moment it starts working.
  // ⚠️ "THE PAGE HAS NOT ASSERTED YET" IS NOT "THE COUNT IS ZERO". The shell
  // makes two of its own at t+0 on every shelled page, so a zero test answered
  // false immediately and this phase stopped running at all. `shellAsserts` is
  // the shell saying how many of the rows are its, which is the only thing that
  // separates a page that has barely started from one that is finished.
  const shellN = await ev('(window.__demo && window.__demo.shellAsserts) || 0');
  for (let i = 0; i < firstBudget && n <= shellN; i++) {
    await sleep(400);
    n = await countAsserts();
  }
  /**
   * Then the cheap one: stop when it has stopped growing AND the page says it
   * is ready.
   *
   * 🔴 `isReady` WAS DECLARED HERE AND NEVER CALLED, FOR AS LONG AS IT HAD
   * EXISTED, WHICH MADE THE PARAGRAPH ABOVE A DESCRIPTION OF CODE NOBODY
   * WROTE. It says in capitals that a page is done when it says it is ready
   * AND its count has stopped moving, `Both conditions`, and only one of them
   * was ever tested. A dead guard reads as finished work, which is this
   * project's most expensive kind of defect.
   *
   * 🔴 AND THE HALF THAT ACTUALLY COST SOMETHING IS THE PATIENCE, NOT THE
   * READY. A check block that waited longer than ONE 400 ms poll without
   * asserting was cut off, and everything after it was lost in silence.
   * MEASURED 2026-09-22 on `/muta/`, which grew a sustain check holding a note
   * for 700 ms and its release for 900 ms: the count stood still across one
   * poll, this loop exited, and **two asserts stopped running**, one of them a
   * voice stealing check that had been there for a day. The suite read
   * **40/40 green** before and after, because an assert that never runs cannot
   * fail. Raising `settleMs` from 8 s to 14 s changed nothing, which is what
   * said the settle window was not the cause.
   *
   * ⚠️ AND `ready` ALONE WOULD NOT HAVE SAVED IT, WHICH IS WHY BOTH ARE HERE.
   * `/muta/` calls `ifSelfcheck(...)` WITHOUT awaiting it and then `d.ready()`
   * on the next line, so `ready` is true a few milliseconds in and stays true
   * through every check the page makes. The paragraph above already knew
   * `/radio/` does the same from inside the granulator's boot. A page's own
   * claim to be finished is worth reading and is not worth trusting alone.
   *
   * ⚠️ AND `__demo.ready` IS A REAL BOOLEAN, WHICH WAS CHECKED AFTER GETTING IT
   * WRONG. It was read here as *the method a page calls*, on the strength of
   * `ready:` appearing twice in `shell.mjs`, and `shell.mjs` was changed to
   * publish a separate flag. **The two `ready` keys are on two different
   * objects**: `api`, which is what `window.__demo` is, carries the boolean,
   * and the page-facing object returned by `mount()` carries the method that
   * sets it. The change was reverted. A key name appearing twice in a file is
   * not two declarations of one thing.
   *
   * ⚠️ IT COSTS TWO EXTRA POLLS ON A PAGE THAT REALLY HAS FINISHED, which is
   * 800 ms a page and about 48 s across a full suite. That is the price of not
   * silently dropping the tail of a check block, and this project's own rules
   * already rank a green run with no coverage as the worse of the two.
   */
  // Three quiet polls, not one: a page may legitimately take a second between
  // asserts, and 12 tries only ever allowed 4.8 s in total.
  // ⚠️ FIVE AND NOT ONE, WHICH IS 2.0 s OF SILENCE TOLERATED AND COSTS 1.6 s A
  // PAGE. A DSP page that holds a note, lets it go and measures the difference
  // is quiet for over a second BY DESIGN, and that is the check rather than a
  // delay in it. `/muta/` lost four asserts to a patience of one and two more
  // to a patience of three, every time silently and every time still green.
  // ⚠️ AND `ready` CANNOT REPLACE IT, WHICH WAS TRIED. Moving that page's
  // `d.ready()` to the end of its checks made it fail the 7.4 s boot wait above
  // and be graded not at all, because the same flag answers two questions: *is
  // this page up* and *has it finished*. Splitting them is a change to the
  // shell contract and to four harnesses, and is in BACKLOG.md.
  // ⚠️ 60 TRIES IS A 24 s CEILING AND COSTS A FAST PAGE NOTHING, because the
  // loop leaves the moment a page is quiet and ready. 30 was reached by
  // `/muta/`, whose DSP checks hold notes, release them and wait for envelopes
  // for about twelve seconds in total, and reaching the ceiling drops whatever
  // has not asserted yet without a word. That is the same silent truncation as
  // a patience of one, arriving from the other end of the same loop.
  const GROWTH_PATIENCE = 5, GROWTH_TRIES = 60;
  let prev = -1, quiet = 0, done = await isReady();
  for (let i = 0; i < GROWTH_TRIES && (quiet < GROWTH_PATIENCE || !done); i++) {
    prev = n;
    await sleep(400);
    n = await countAsserts();
    quiet = n === prev ? quiet + 1 : 0;
    done = await isReady();
  }

  const asserts = await ev('__demo.asserts');
  ok('page asserted something', (asserts || []).length > 0, String((asserts || []).length));
  for (const a of asserts || []) ok(`page: ${a.label}`, a.pass, a.detail ?? undefined);

  // Folded into this one assert rather than added as a new one: a conditional
  // assert would make the suite total vary run to run, and a shrinking total
  // is exactly how four asserts went missing unnoticed earlier.
  const EDGE_CEILING = 25;
  // TWO DEMOS ASK ERR FOR SEGMENTS ON PURPOSE, and an unexplained ceiling is
  // how the next reader mistakes a real outage for expected churn:
  //   flipper  sweeps 8 points per probe, twice
  //   now      sweeps 13 points across the window, once, capped at 30 in-page
  // plus hls.js's own retries on whatever comes back refused.
  const PROBE_CEILING = 60;
  // ⚠️ AND THE LINE HAS TO SAY WHICH KIND, or a reader sees a number with no
  // meaning. `keep` and `take` ask WHEP for an input the rig feeds; when the
  // rig is off that is a 409 every time, and an unexplained ceiling is how the
  // next reader mistakes a real outage for expected churn.
  const edgeOk = edgeMisses.length <= EDGE_CEILING;
  const probedOk = probed.length <= PROBE_CEILING;
  ok('no console errors', errors.length === 0 && edgeOk && probedOk,
    (errors.slice(0, 2).join(' | ') || '0')
    + (edgeMisses.length ? `  (+${edgeMisses.length} live-edge part 404${edgeMisses.length > 1 ? 's' : ''}`
      + `${edgeOk ? ', normal' : ` — OVER the ceiling of ${EDGE_CEILING}`})` : '')
    + (probed.length ? `  (+${probed.length} upstream refusal${probed.length > 1 ? 's' : ''} the demos probe for`
      + `${probedOk ? ', expected' : ` — OVER the ceiling of ${PROBE_CEILING}`})` : ''));
  ok('no failed requests', failedReqs.length === 0, failedReqs.slice(0, 2).join(' | ') || '0');
  if (SHOW_HOSTS) {
    const hosts = [...hostHits.entries()].sort((x, y) => y[1] - x[1]);
    console.log(`        hosts: ${hosts.length ? hosts.map(([h, n]) => `${h} x${n}`).join(', ') : 'none'}`);
  }
  if (abortedReqs.length) {
    console.log(`        (${abortedReqs.length} aborted on teardown — expected for a media page)`);
  }
}

console.log(`\n${pass}/${pass + fail} green${fail ? `  (${fail} FAILED)` : ''}`);
// ⚠️ ASKED AGAIN AT THE END, not only at the start — a browser that appeared
// halfway through is the one most likely to have caused the failure being read,
// and it would not have been in the opening count. Printed only when something
// FAILED, because on a green run it is noise about a problem that did not
// happen.
if (fail) {
  const peersNow = peerBrowsers(cdpPort);
  const n = Math.max(peersAtStart.length, peersNow.length);
  if (n) {
    console.log(`\n⚠️  ${n} other headless Chrome${n === 1 ? ' was' : 's were'} running alongside this suite`
      + `${peersAtStart.length !== peersNow.length ? ` (${peersAtStart.length} at the start, ${peersNow.length} now)` : ''}.`);
    console.log('   THIS RUN IS NOT EVIDENCE OF A REGRESSION until the failing demos are re-run alone.');
  }
}
ws.close(); server?.close();
// 🔴 WAIT FOR CHROME TO ACTUALLY BE GONE BEFORE THE PROFILE IS REMOVED.
// `kill()` asks; it does not stop. MEASURED: with a plain `kill()` the exit
// handler deleted the directory and a still-shutting-down Chrome recreated it
// on the way out, so a run that cleaned up correctly still left 250 MB behind
// — a cleanup that runs, reports nothing, and does nothing. SIGKILL and await
// the process's own `exit`, capped so a wedged browser cannot hang the suite
// (the startup sweep collects it next time either way).
chrome.kill('SIGKILL');
await Promise.race([
  new Promise((r) => chrome.once('exit', r)),
  new Promise((r) => setTimeout(r, 3000)),
]);
// The stand-ins go with the run. A server left listening on a port is the small
// version of the thing this harness exists to avoid.
for (const s of standIns) s.close();
process.exit(fail ? 1 : 0);

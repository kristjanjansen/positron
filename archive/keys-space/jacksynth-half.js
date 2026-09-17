// SPACE — a reverb, as an insert. The opposite kind of insert to pappus.
//
// Pappus REPLACES the signal with a grain cloud, and a cloud has no note-off,
// so every instrument's envelope died inside it. This one PASSES the dry signal
// and adds a tail: let go of the key and the note still stops.
//
//   off:  instrument -> posbox (the capture)
//   on:   instrument -> positron-space:in_1/in_2 ... out_1/out_2 -> posbox
//
// It is Csound, and it is NOT a key in JACK_SYNTHS above — for the same reason
// Pappus is not: everything in that table is offered to clients as an
// instrument (box.mjs puts `Object.keys(JACK_SYNTHS)` straight into
// `box.hello`), and an effect listed beside yoshimi reads as a second sound
// source. The descriptor below carries the same fields that table uses so
// it reads the same, and lives here with the code that raises it.
// ─────────────────────────────────────────────────────────────────────────────

const SPACE = {
  needs: ['csound', 'jackd'],
  client: 'positron-space',
  // Beside this module, not an /opt path typed out again: the service runs from
  // /opt/positron-box/rig/box and a checkout runs from anywhere, and the
  // orchestra is always the one next to the code that spawns it.
  csd: new URL('./csd/space.csd', import.meta.url).pathname,
  portMatch: /^positron-space:out_1$/,
  portMatch2: /^positron-space:out_2$/,
  inMatch: /^positron-space:in_1$/,
  // ⚠️ NOT pappus's 30000. sclang compiles a 2,030-line class library; Csound
  // compiles this orchestra in 5 ms and had all four JACK ports registered
  // 222 ms after spawn, with the performance loop answering 381 ms after spawn
  // (measured on the board, three runs). This is a CEILING for the port poll,
  // not a sleep — twenty times the measurement, so a cold board still fits.
  warmup: 8000,
  // ⚠️ NOT OSC, unlike pappus, and the difference is a dependency. `OSClisten`
  // needs Csound's liblo plugin; `--port=N` is in the core binary, takes
  // `@<channel> <value>` in one datagram with no compilation, and is therefore
  // the cheapest thing to drive from node — see spaceSend().
  oscCmd: false,
};

/** What a client may ask for, and the far end of every clamp. */
export const SPACE_RANGE = { mix: [0, 1], room: [0, 1], damp: [1000, 12000], chorus: [0, 1] };

let spaceProc = null;          // the csound we started, and whose stdout we read
let spacePort = 0;             // its UDP control port
let spaceUdp = null;
let spaceOn = false;           // patched into the capture, rather than merely running
let spaceNonce = 0;
let spaceHeard = null;         // the last audio measurement, kept so a reply can quote it
let spaceFed = null;           // the instrument ports it is wrapping, for the death path
let spaceStopping = false;     // so an orderly teardown is not reported as a death
const spaceWaiters = new Map();
const spaceSaid = new Map();   // how often the engine has said each thing, for the throttle
// Defaults that match the orchestra's own init block, so the first reply and
// the first k-cycle cannot disagree about what is set.
const spaceParams = { mix: 0.35, room: 0.5, damp: 5000, chorus: 0 };

export function spaceAvailable() { return SPACE.needs.every(have) && existsSync(SPACE.csd); }

/**
 * Every JACK connection, parsed once.
 *
 * `jack_lsp -c <name>` takes its argument as a SUBSTRING over every port, so
 * asking about one port can print several and "is a connected to b" gets the
 * wrong answer from the wrong block. The whole graph is one exec and is not
 * ambiguous: a flush-left line is a port, an indented line is one of its
 * connections.
 */
function jackLinks() {
  const map = new Map();
  let cur = null;
  for (const raw of sh('jack_lsp -c 2>/dev/null').split('\n')) {
    if (!raw.trim()) continue;
    if (/^\s/.test(raw)) { if (cur) map.get(cur).push(raw.trim()); }
    else { cur = raw.trim(); if (!map.has(cur)) map.set(cur, []); }
  }
  return map;
}
const jackLinked = (a, b, links = jackLinks()) => (links.get(a) || []).includes(b);

/**
 * Patch, then CHECK. `jack_connect` failing is invisible from here — it writes
 * its complaint to stderr and exits non-zero, `execSync` throws, and sh()
 * returns an empty string that reads exactly like success. That is how the
 * first run of this probe measured silence through a working reverb and
 * reported "connected": the ports are `out_1`/`in_1` only because the orchestra
 * asks for the trailing underscore, and Csound's default naming is `out1`.
 */
function jackPatch(a, b, onLog) {
  if (!a || !b) return false;
  sh(`jack_connect "${a}" "${b}" 2>&1`);
  const ok = jackLinked(a, b);
  if (!ok) onLog?.(`could not patch ${a} -> ${b}`);
  return ok;
}

/**
 * Several links, then ONE look at the graph.
 *
 * ⚠️ AN EXEC IS NOT FREE ON THIS BOARD. `jack_lsp -c` connects to the server,
 * enumerates every port and exits, and under a loaded Pi that is 150-200 ms.
 * Checking each link as it was made put two and a half seconds into switching
 * the insert on — more than the engine, the probe and the measurement
 * together. Make them all, look once, and report the ones that did not take.
 */
function jackPatchAll(pairs, onLog, drop = []) {
  const real = pairs.filter(([a, b]) => a && b);
  // ⚠️ ONE SHELL FOR ALL OF IT. Measured on the board: `jack_connect` costs
  // 43 ms and `jack_lsp -c` 118 ms — each of them opens a JACK client of its
  // own — so a re-patch made one call at a time cost 750 ms of a switch that
  // has to feel like a switch. The disconnects are not asked about first:
  // dropping a link that is not there fails harmlessly and asking costs more
  // than doing.
  const cmds = [
    ...drop.filter(([a, b]) => a && b).map(([a, b]) => `jack_disconnect "${a}" "${b}" 2>/dev/null`),
    ...real.map(([a, b]) => `jack_connect "${a}" "${b}" 2>/dev/null`),
    'true',
  ];
  sh(cmds.join('; '));
  const links = jackLinks();
  const missed = real.filter(([a, b]) => !jackLinked(a, b, links));
  for (const [a, b] of missed) onLog?.(`could not patch ${a} -> ${b}`);
  return { ok: missed.length === 0, missed };
}

/**
 * One line to the running engine, over Csound's own UDP server.
 *
 * ⚠️ WHY THIS ROUTE. Three were available and this is the cheapest to drive
 * from node. `--port=N` is in the core binary (no plugin, no liblo, no npm),
 * and one datagram of `@<channel> <value>` sets a named channel that `chnget`
 * reads on the next k-cycle — 750 of those a second here, so a knob lands
 * within 1.3 ms of arrival and costs NOTHING on the graph. Measured on the
 * board, all three work on Csound 6.18: `@mix 0.42` set the channel, `$i2 0
 * 0.1` fired an instrument, and bare orchestra text (`chnset 0.77, "mix"`) also
 * worked but recompiles a line of orchestra per knob turn. OSC (`OSClisten`)
 * needs the liblo plugin, which is a package this box does not have to have.
 * A re-patch — pappus's route for anything structural — costs a gap in the
 * sound, which is exactly what this insert exists to avoid.
 */
function spaceSend(line) {
  if (!spaceUdp || !spacePort) return false;
  const b = Buffer.from(line);
  spaceUdp.send(b, 0, b.length, spacePort, '127.0.0.1');
  return true;
}

/**
 * 🔴 PROOF THAT A KNOB REACHED A RUNNING ENGINE.
 *
 * A datagram that has been SENT is not a datagram that has been HEARD, and a
 * UDP server that is listening is not an orchestra that is performing. So the
 * box writes a fresh number to the `echo` channel and waits for the engine's
 * own performance loop to print it back (`printf` under `changed`, in
 * space.csd's instr 1). The number comes off csound's stdout — the far side of
 * the wire — so nothing here can fake it.
 *
 * A FRESH number every time, because `changed` fires on a change: re-sending
 * the same value proves nothing and would hang.
 */
function spaceConfirm(ms = 400) {
  if (!spaceUdp || !spaceProc) return Promise.resolve(false);
  const n = ++spaceNonce;
  const got = new Promise((res) => {
    spaceWaiters.set(n, res);
    setTimeout(() => { if (spaceWaiters.delete(n)) res(false); }, ms).unref?.();
  });
  spaceSend(`@echo ${n}`);
  return got;
}

/** Clamp at the far end — video.mjs's `set()`, with this engine's ranges. */
export function spaceClamp(patch = {}) {
  const out = {};
  for (const [k, [lo, hi]] of Object.entries(SPACE_RANGE)) {
    if (!Number.isFinite(patch[k])) continue;
    out[k] = Math.max(lo, Math.min(hi, patch[k]));
  }
  return out;
}

/**
 * Set any of mix/room/damp/chorus on the RUNNING engine, and prove it landed.
 *
 * No re-patch, no restart, no gap in the sound: four datagrams and a nonce.
 * `ok` here means the engine answered AFTER the values went out, not that a
 * socket accepted them.
 */
export async function spaceSet(patch = {}, { onLog } = {}) {
  const wanted = spaceClamp(patch);
  const named = Object.keys(wanted);     // which of the four the caller actually asked for
  if (!spaceProc) {
    Object.assign(spaceParams, wanted);        // remembered for the next start
    return { ok: false, reason: 'the reverb is not running — nothing to set it on', params: { ...spaceParams }, named };
  }
  Object.assign(spaceParams, wanted);
  for (const k of Object.keys(SPACE_RANGE)) spaceSend(`@${k} ${spaceParams[k]}`);
  // One retry: a lost datagram on loopback is rare and a lost ANSWER is not
  // worth reporting a working engine as broken over.
  const heard = (await spaceConfirm()) || (await spaceConfirm(600));
  if (!heard) onLog?.('space: the engine did not answer after a parameter change');
  return { ok: heard, params: { ...spaceParams }, named, confirmed: heard,
           ...(heard ? {} : { reason: 'the values were sent and the engine did not answer' }) };
}

/**
 * 🔴 PROOF THAT AUDIO IS PASSING, which is the whole point of this function.
 *
 * `fx.pappus` answered ok when a JACK PORT APPEARED — about seven seconds
 * before its engine could be heard — and everything sent in that gap vanished
 * with no error anywhere. A port is a registration; it says nothing about
 * whether the process callback is running or whether anything comes out.
 *
 * So this pushes a real signal in and listens for it coming out, on the far
 * side of the insert:
 *
 *   jack_metro -> positron-space:in_1 ... positron-space:out_1 -> a private
 *   ffmpeg JACK client, whose s16 bytes are summed here into an RMS.
 *
 * That is the product's own claim — signal in, signal out — rather than a
 * proxy for it. MEASURED on the board: silence baseline rms 0.00000 / peak
 * 0.0000, tone through the insert rms 0.04591 / peak 0.1589. The threshold
 * below sits an order of magnitude under the signal and above the floor.
 *
 * It runs BEFORE the insert is patched into the capture, on a subgraph nobody
 * is listening to, so the probe tone never reaches the stream.
 *
 * Where `jack_metro` is missing it falls back to the orchestra's own burst
 * (instr 2, fired over the control port), which proves the engine is producing
 * sound but NOT that its input reaches its output. The reply says which claim
 * was made; it does not quietly present the weaker one as the stronger.
 */
const SPACE_FLOOR = { rms: 0.005, peak: 0.02 };

async function spaceProbe({ onLog } = {}) {
  // A fresh client name per run. A leftover probe from a crashed one would
  // otherwise take the name, JACK would rename ours, and this would report
  // silence about a working reverb.
  const tag = `spcheck${process.pid}${Math.floor(Math.random() * 1000)}`;
  const t0 = Date.now();
  // ⚠️ BOTH AT ONCE. These two have nothing to do with each other and each
  // takes about half a second to appear on the graph; starting them in
  // sequence put a second on every press of the button, and this whole probe
  // sits between a client's request and its reply.
  const cap = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'jack', '-i', tag,
    '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let tone = have('jack_metro')
    // ⚠️ TEN CLICKS A SECOND, not four. The window below is a fifth of a
    // second, and at four a second how many clicks land inside it is luck —
    // measured, the same working chain read rms 0.028 one run and 0.048 the
    // next, which is a third of the way to a threshold. At ten a second the
    // window always holds two or three and the number stops wobbling.
    // (`-D` must stay under the click period or jack_metro refuses to start:
    // `invalid duration (tone length = 4800, wave length = 4800)`.)
    ? spawn('jack_metro', ['-b', '600', '-D', '40', '-f', '660', '-A', '0.3', '-n', `${tag}tone`], { stdio: ['ignore', 'pipe', 'pipe'] })
    : null;
  const done = (r) => {
    try { cap.kill('SIGKILL'); } catch { /* gone */ }
    if (tone) { try { tone.kill('SIGKILL'); } catch { /* gone */ } }
    return { ...r, ms: Date.now() - t0 };
  };
  let up = false, tonePort = null;
  for (let i = 0; i < 80 && !(up && (tonePort || !tone)); i++) {
    const l = sh('jack_lsp 2>/dev/null').split('\n');
    up = l.some((p) => p === `${tag}:input_1`);
    tonePort = l.find((p) => p.startsWith(`${tag}tone:`)) || null;
    if (!(up && (tonePort || !tone))) await wait(100);
  }
  if (!up) return done({ ok: false, reason: 'the listener could not attach to JACK, so nothing was measured' });
  if (!jackPatch(`${SPACE.client}:out_1`, `${tag}:input_1`, onLog)) {
    return done({ ok: false, reason: 'could not listen to the reverb output, so nothing was measured' });
  }
  // ⚠️ That one IS verified, because a probe that cannot hear reads exactly
  // like an engine that makes no sound. The tone's own connection below is
  // NOT checked first — the measurement checks it far better than jack_lsp
  // does, and the graph is only consulted if nothing arrives, where it turns
  // "no sound" into "the tone never reached the input".

  const listen = (ms) => new Promise((res) => {
    let sum = 0, n = 0, peak = 0;
    const on = (b) => {
      for (let i = 0; i + 1 < b.length; i += 2) {
        const v = b.readInt16LE(i) / 32768;
        sum += v * v; n++;
        if (Math.abs(v) > peak) peak = Math.abs(v);
      }
    };
    cap.stdout.on('data', on);
    setTimeout(() => { cap.stdout.off('data', on); res({ rms: +(n ? Math.sqrt(sum / n) : 0).toFixed(5), peak: +peak.toFixed(4), samples: n }); }, ms);
  });

  const floor = await listen(200);        // what the insert puts out with nothing going in

  let how = 'the orchestra\'s own burst — the input leg is NOT covered by this';
  if (tone && tonePort) {
    sh(`jack_connect "${tonePort}" "${SPACE.client}:in_1" 2>&1`);
    how = 'a tone pushed through in_1 and heard on out_1';
  } else if (tone) { try { tone.kill('SIGKILL'); } catch { /* gone */ } tone = null; }
  if (!tone) spaceSend('$i2 0 0.5');
  await wait(150);
  const heard = await listen(250);

  const ok = heard.rms > SPACE_FLOOR.rms && heard.peak > SPACE_FLOOR.peak && heard.rms > floor.rms;
  // Only when it failed is it worth an exec to find out which leg was missing.
  const why = ok ? null
    : (tone && tonePort && !jackLinked(tonePort, `${SPACE.client}:in_1`))
      ? 'the probe tone never reached in_1, so this says nothing about the engine'
      : `nothing came out of the reverb: rms ${heard.rms} against a floor of ${floor.rms}`;

  // ⚠️ AND CLEAR UP AFTER THE MEASUREMENT, WHICH IS NOT FREE. `reverbsc` is a
  // feedback delay network: the probe tone is still circulating inside it after
  // the tone has gone, and `mix` only decides how much of that reaches the
  // output. Patch the insert in while that is still ringing and the first thing
  // a listener hears is a 660 Hz swell — the measurement arriving on air.
  //
  // So: drop the tail (room 0 shortens it, mix 0 mutes it while it dies), let
  // it die, then put `mix` back and LISTEN AGAIN. The reply carries what that
  // second listen heard, because "the probe left nothing behind" is a claim
  // like any other and belongs with a number rather than with a sleep.
  if (tone) { try { tone.kill('SIGKILL'); } catch { /* gone */ } tone = null; }
  spaceSend('@mix 0'); spaceSend('@room 0');
  await wait(250);
  spaceSend(`@mix ${spaceParams.mix}`); spaceSend(`@room ${spaceParams.room}`);
  let tail = await listen(150);
  if (tail.rms > 0.002) { spaceSend('@mix 0'); await wait(700); spaceSend(`@mix ${spaceParams.mix}`); tail = await listen(250); }
  onLog?.(`space: ${how} — rms ${heard.rms} peak ${heard.peak} against a floor of ${floor.rms}; tail left behind ${tail.rms}`);
  return done({
    ok, how, heard, floor, tail, at: Date.now(),
    ...(ok ? {} : { reason: why }),
  });
}

/** Any csound of OURS still holding the graph — an orphan from a restart. */
function spaceOrphans() {
  return sh('pgrep -x csound 2>/dev/null').split('\n').map((s) => s.trim()).filter(Boolean).filter((pid) => {
    // ⚠️ /proc, not `pkill -f`. `pkill -f csound.*space.csd` matches the very
    // `sh -c` that runs it and kills its own shell — LESSONS' `-x, never -f`
    // in another costume.
    try { return readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes('space.csd'); } catch { return false; }
  });
}

/**
 * Raise the engine, and do not return until it has been heard.
 *
 * ⚠️ AN ORPHAN IS KILLED RATHER THAN ADOPTED. `pappusFx` adopts a running
 * sclang because starting one costs thirty seconds — it pays for that with a
 * branch where nothing can be proved, since the engine's stdout belongs to a
 * process that has gone. Csound is ready in under half a second, so the honest
 * thing is cheaper here: kill what we cannot hear and start something we can.
 */
async function spaceStart({ onLog } = {}) {
  const orphans = spaceOrphans();
  if (orphans.length) {
    onLog?.(`space: killing ${orphans.length} orphaned csound — its answers would not reach this process`);
    for (const pid of orphans) { try { process.kill(+pid, 'SIGKILL'); } catch { /* gone already */ } }
    await wait(400);
  }
  // The JACK server's period decides the floor for -B: rtjack refuses to start
  // with a software buffer under twice it, and refusing looks exactly like a
  // broken orchestra from the outside. Read it rather than repeat it.
  const period = parseInt(sh('jack_bufsize 2>/dev/null').trim(), 10) || 1024;
  const B = Math.max(2048, period * 2);
  // A port nobody else holds. If the pick collides the engine simply never
  // answers the nonce below, which is reported rather than assumed away.
  spacePort = 41000 + Math.floor(Math.random() * 8000);
  const t0 = Date.now();
  spaceStopping = false;
  spaceProc = spawn('csound', [`--port=${spacePort}`, '-B', String(B), SPACE.csd],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  spaceUdp = createSocket('udp4');
  spaceHeard = null;
  const line = (raw) => {
    for (const l of String(raw).split('\n')) {
      // Csound colours its output; the escapes would hide the match.
      const t = l.replace(/\x1b\[[0-9;]*m/g, '').trim();
      if (!t) continue;
      const m = t.match(/^SPACE ECHO (\d+)/);
      if (m) { const w = spaceWaiters.get(+m[1]); if (w) { spaceWaiters.delete(+m[1]); w(true); } continue; }
      // ⚠️ THROTTLED. A loaded board emits `rtjack: xrun` several times a
      // second, and forwarding each one buried every other line in the
      // journal — 400 identical lines in one insert. Say it once, then say
      // how many more there were, which is the number that actually means
      // something.
      if (/error|rtjack|overall samples out of range/i.test(t)) {
        const key = t.replace(/[0-9.]+/g, '#');
        const seen = spaceSaid.get(key) || { n: 0, at: 0 };
        seen.n++;
        if (Date.now() - seen.at > 10000) {
          onLog?.(`csound: ${t}${seen.n > 1 ? ` (${seen.n} of these so far)` : ''}`);
          seen.at = Date.now();
        }
        spaceSaid.set(key, seen);
      }
    }
  };
  spaceProc.stdout?.on('data', line);
  spaceProc.stderr?.on('data', line);
  spaceProc.on('exit', (code, sig) => {
    if (spaceStopping) { spaceProc = null; return; }        // an orderly teardown is not news
    onLog?.(`⚠ the reverb exited (${sig ?? code}) — anything it was wrapping is no longer reaching the stream`);
    spaceProc = null;
    // Put the instrument back on the capture, or the death of an EFFECT is
    // silence rather than a dry signal. jacksynth already learned this shape
    // from `alsa_in`: the graph looks healthy and carries nothing.
    if (spaceOn && spaceFed?.port) {
      jackPatch(spaceFed.port, spaceCapture, onLog);
      if (spaceFed.portR) jackPatch(spaceFed.portR, spaceCapture, onLog);
    }
    spaceOn = false;
  });

  let ports = false;
  while (!ports && Date.now() - t0 < SPACE.warmup) {
    const l = sh('jack_lsp 2>/dev/null').split('\n');
    // Every port that is about to be patched, not just the first one: the
    // right channel and the input arrive in the same breath as the left, and
    // waiting for one of three is waiting for none of them if that changes.
    ports = [SPACE.portMatch, SPACE.portMatch2, SPACE.inMatch].every((re) => l.some((p) => re.test(p)));
    if (!ports) await wait(50);
  }
  if (!ports) { stopSpace(); return { ok: false, reason: `csound registered no JACK port in ${SPACE.warmup} ms` }; }
  const portMs = Date.now() - t0;

  // ...and now wait for the PERFORMANCE, which the port cannot tell you about.
  // A fresh nonce each try, because the first ones land before instr 1 has run
  // a single k-cycle and nothing prints them back: measured, the answer came on
  // the third try, 381 ms after spawn.
  let alive = false;
  while (!alive && Date.now() - t0 < SPACE.warmup) alive = await spaceConfirm(150);
  if (!alive) { stopSpace(); return { ok: false, reason: 'csound came up and its performance loop never answered' }; }
  onLog?.(`space: ports in ${portMs} ms, performing in ${Date.now() - t0} ms`);
  // ⚠️ Csound's rtjack AUTO-CONNECTS its adc to the first physical capture it
  // finds. On the dummy driver that is silence, but on a board with a real
  // soundcard it would mix a microphone into every instrument, which nobody
  // asked for and nobody would look for. Undo it.
  sh(`jack_disconnect system:capture_1 ${SPACE.client}:in_1 2>/dev/null; ` +
     `jack_disconnect system:capture_2 ${SPACE.client}:in_2 2>/dev/null; true`);
  return { ok: true, portMs, readyMs: Date.now() - t0, udp: spacePort };
}

// Where the box listens. A PARAMETER with a default rather than a constant
// spelled into four places: it is what `startJackSynth` raises, and taking it
// as an argument is what lets the insert be exercised end to end — probe tone,
// patch, bypass — against a private listener while the board is on air.
const CAPTURE = 'posbox:input_1';
let spaceCapture = CAPTURE;

/**
 * Put the reverb in, or take it out.
 *
 * `on` is answered `ok: true` only after a real signal has been measured coming
 * out of the engine — see spaceProbe(). `on: false` is answered `ok: true` only
 * after the instrument is verified back on the capture, because the failure
 * that matters when bypassing is silence.
 */
export async function spaceFx(on, { instrumentPort, instrumentPortR, capture = CAPTURE, onLog } = {}) {
  spaceCapture = capture;
  const IN = [`${SPACE.client}:in_1`, `${SPACE.client}:in_2`];
  const OUT = [`${SPACE.client}:out_1`, `${SPACE.client}:out_2`];
  if (!on) {
    const port = instrumentPort ?? spaceFed?.port, portR = instrumentPortR ?? spaceFed?.portR;
    // ⚠️ AND CHECK IT. The failure that matters when bypassing is SILENCE — the
    // instrument taken out of the chain and not put back — so `ok` here means
    // the graph was looked at afterwards.
    const back = jackPatchAll([[port, capture], [portR, capture]], onLog,
      [...OUT.map((o) => [o, capture]), ...IN.flatMap((i) => [[port, i], [portR, i]])]).ok;
    spaceOn = false; spaceFed = null;
    onLog?.('space bypassed');
    // The engine is left RUNNING on purpose — it is 25 MB and a switch back
    // costs nothing, where killing it makes the next press pay the start again.
    return { ok: back, on: false, running: !!spaceProc,
             ...(back ? {} : { reason: 'could not put the instrument back on the capture — check jack_lsp' }) };
  }

  if (!spaceAvailable()) return { ok: false, on: false, reason: 'csound or the orchestra is not installed on this box' };
  if (!sh('jack_lsp 2>/dev/null').trim()) return { ok: false, on: false, reason: 'no JACK server — start an instrument first' };

  const t0 = Date.now();
  const took = { start: 0, probe: 0, patch: 0, set: 0 };
  if (!spaceProc) {
    const r = await spaceStart({ onLog });
    took.start = Date.now() - t0;
    if (!r.ok) return { ...r, on: false };
    spaceHeard = null;
  }

  // The measurement, on a subgraph nothing is listening to. Skipped only when
  // the insert is ALREADY carrying the stream, where firing a probe tone would
  // put it on air.
  const already = jackLinked(OUT[0], capture);
  if (!already) {
    const tP = Date.now();
    const p = await spaceProbe({ onLog });
    took.probe = Date.now() - tP;
    spaceHeard = p;
    if (!p.ok) return { ok: false, on: false, reason: `the reverb is running and nothing came out of it — ${p.reason}`, probe: p };
  }

  // Only now, with the engine proven audible, does anything downstream move.
  // A mono instrument feeds BOTH sides, or half the reverb has nothing to work
  // with and the tail arrives on one side of a stereo field. And both output
  // channels go into the one mono capture input — many ports into one input SUM
  // in JACK, the same reason startJackSynth patches a stereo instrument's right
  // channel in as well.
  const tPatch = Date.now();
  const { ok: patched, missed } = jackPatchAll([
    [instrumentPort, IN[0]],
    [instrumentPort ? (instrumentPortR || instrumentPort) : null, IN[1]],
    [OUT[0], capture], [OUT[1], capture],
  ], onLog, [[instrumentPort, capture], [instrumentPortR, capture]]);
  spaceOn = patched;
  spaceFed = instrumentPort ? { port: instrumentPort, portR: instrumentPortR ?? null } : spaceFed;

  took.patch = Date.now() - tPatch;
  // Restore the parameters the probe muted, and prove they landed.
  const tSet = Date.now();
  const set = await spaceSet({}, { onLog });
  took.set = Date.now() - tSet;
  took.total = Date.now() - t0;
  onLog?.(patched ? `space inserted${instrumentPort ? '' : ', with nothing feeding it'}` : 'space could not be patched in');
  return {
    ok: patched && set.ok, on: patched, fed: !!instrumentPort,
    params: { ...spaceParams },
    // What the claim above is actually made of, so nobody has to take it on
    // trust: how it was proved, and the numbers.
    heard: spaceHeard
      ? { how: spaceHeard.how, rms: spaceHeard.heard?.rms, peak: spaceHeard.heard?.peak,
          floor: spaceHeard.floor?.rms, tail: spaceHeard.tail?.rms, ms: spaceHeard.ms,
          // ⚠️ HOW OLD THE PROOF IS. Re-inserting something already inserted
          // does not re-measure — a probe tone would go out on the stream —
          // so the age is printed rather than letting a minutes-old
          // measurement read as one taken just now.
          agoMs: Date.now() - spaceHeard.at }
      : 'not measured on this call',
    confirmed: set.confirmed ?? false,
    // Where the wait went. A client is held for all of this — `ok` cannot be
    // sent before the sound has been heard — so the breakdown is the thing
    // anyone shortening it would need, and it is measured rather than guessed.
    took,
    // NAME the link that did not take. "check jack_lsp" is a chore handed to
    // somebody in another city; `yoshimi:left -> positron-space:in_1` is the
    // answer they would have gone and looked up.
    ...(patched && set.ok ? {} : {
      reason: patched ? set.reason
        : `the JACK graph would not take ${missed.map(([a, b]) => `${a} -> ${b}`).join(', ')}`,
    }),
  };
}

/**
 * What the box knows about the reverb, for a status reply.
 *
 * ⚠️ `on` IS READ OFF THE GRAPH, not off a variable. A variable saying "the
 * insert is in" goes stale the moment anything else re-patches: stopping the
 * instrument takes the capture client down with it, and every link into it goes
 * with it — so a remembered `true` would describe a chain that no longer
 * exists. The link either is there or it is not, and asking costs one exec.
 */
export function spaceState() {
  return {
    available: spaceAvailable(), running: !!spaceProc, udp: spacePort || null,
    on: !!spaceProc && jackLinked(`${SPACE.client}:out_1`, spaceCapture),
    params: { ...spaceParams },
    heard: spaceHeard ? { how: spaceHeard.how, rms: spaceHeard.heard?.rms, peak: spaceHeard.heard?.peak,
                          agoMs: Date.now() - spaceHeard.at } : null,
    range: SPACE_RANGE,
  };
}

export function stopSpace() {
  spaceOn = false; spaceFed = null; spaceStopping = true;
  for (const [n, res] of spaceWaiters) { spaceWaiters.delete(n); res(false); }
  if (spaceProc) { try { spaceProc.kill('SIGTERM'); } catch { /* gone */ } spaceProc = null; }
  if (spaceUdp) { try { spaceUdp.close(); } catch { /* already */ } spaceUdp = null; }
  for (const pid of spaceOrphans()) { try { process.kill(+pid, 'SIGKILL'); } catch { /* gone */ } }
}

/** snd-virmidi's raw device, and the sequencer client that mirrors it. */

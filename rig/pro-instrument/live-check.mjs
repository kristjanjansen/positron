// live-check.mjs — is the Ableton Live rig actually set up, or does it only
// look like it?
//
//   node rig/pro-instrument/live-check.mjs                 # against mbp
//   LIVE_HOST=… PRO_SSH=… node rig/pro-instrument/live-check.mjs
//   node rig/pro-instrument/live-check.mjs --json          # for the relay agent
//
// Every link in the chain gets its own line, with the value it read. A chain
// where eight of nine links report "fine" and the ninth is never tested is the
// shape of failure this rig has already produced twice: a deaf capture read as
// "Live is silent", and a missing plugin folder read as "Arturia is
// unlicensed". Both were wrong, both were confident, and both were retracted.
//
// 🔴 THE LAST CHECK IS THE ONLY ONE THAT MATTERS, and it is the only one that
// crosses the whole chain: hold a chord, capture the audio device, and compare
// it against a silence baseline taken the same way seconds earlier. Everything
// above it is diagnosis for when that one fails.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ask } from './live-osc.mjs';

const run = promisify(execFile);
// `PRO_SSH=local` means "you are already ON the studio machine" — which is how
// rack-agent.mjs runs, and it must not ssh to itself. That is not a tidiness
// point: `ssh localhost` needs Remote Login to accept a key for this user, and
// when it does not the check reports "the studio machine answers: no ssh" about
// the machine it is running on. MEASURED, first run of the agent.
const SSH = process.env.PRO_SSH || 'mbp';
const LOCAL = SSH === 'local' || SSH === 'localhost';
const TRACK = Number(process.env.LIVE_TRACK || 0);
const JSON_OUT = process.argv.includes('--json');

const results = [];
const ok = (name, detail = '') => results.push({ name, ok: true, detail });
const bad = (name, detail = '', fix = '') => results.push({ name, ok: false, detail, fix });

const sh = async (cmd, timeout = 15000) => {
  try {
    const { stdout } = LOCAL
      ? await run('/bin/zsh', ['-lc', cmd], { timeout })
      : await run('ssh', ['-o', 'ConnectTimeout=8', '-o', 'BatchMode=yes', SSH, cmd], { timeout });
    return stdout.trim();
  } catch { return null; }
};

/**
 * Run something in the user's LOGIN session rather than in this ssh session.
 *
 * ⚠️ A CAPTURE STARTED OVER SSH IS DEAF — measured, the same device and the
 * same ffmpeg reading -91.0 dB over ssh and a real room in the session. The
 * trick is not to START something in the session but to ASK SOMETHING ALREADY
 * IN IT: an AppleEvent to the terminal the user already has open. That is why
 * iTerm2 is a dependency of this check and says so when it is missing.
 */
const inSession = async (cmd) => {
  // Already in the session: run it, and do not go round by AppleEvent. That
  // also drops the iTerm2 dependency entirely for the agent, which is the
  // difference between "needs a terminal window open" and "needs to be started
  // once from one".
  if (LOCAL) { await sh(cmd, 30000); return; }
  const esc = cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  await sh(`osascript -e 'tell application "iTerm2" to tell current window to tell current session to write text "${esc}"' >/dev/null 2>&1`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dB = (text, which = 'mean') => {
  const m = text?.match(new RegExp(`${which}_volume: (-?[\\d.]+) dB`));
  return m ? Number(m[1]) : null;
};

// ── 1. the machine ────────────────────────────────────────────────────────
const host = await sh('hostname -s');
if (host) ok('the studio machine answers', host);
else { bad('the studio machine answers', `no ssh to ${SSH}`, `check the Mac is awake and on the network`);
       report(); }

// ── 2. Live itself ────────────────────────────────────────────────────────
// -x would miss it: the binary is "Live" inside an .app, so the pattern has to
// be the path. -f is right HERE and wrong for ffmpeg, where it matches its own
// ssh command line — the two rules are not in conflict, they are about
// different patterns.
const livePid = await sh(`pgrep -f 'Ableton Live.*MacOS/Live' | head -1`);
if (livePid) ok('Ableton Live is running', `pid ${livePid}`);
else bad('Ableton Live is running', 'no process', 'open Ableton Live on the studio Mac');

// ── 3. the remote-control surface, which is not the same as installed ─────
const names = await ask('/live/song/get/track_names');
if (names) ok('Live answers remote control', `${names.length} tracks — ${names.join(', ')}`);
else bad('Live answers remote control', `nothing on ${process.env.LIVE_HOST || '127.0.0.1'}:11000`,
         'Live > Preferences > Link/MIDI > Control Surface = AbletonOSC (installing the folder is not enough)');

// ── 4..7. the track, only if Live is talking ──────────────────────────────
if (names) {
  const one = async (addr) => (await ask(addr, [TRACK]))?.[1];
  const devices = await ask('/live/track/get/devices/name', [TRACK]);
  const instruments = (devices || []).slice(1).filter(Boolean);
  if (instruments.length) ok('the track carries an instrument', instruments.join(', '));
  else bad('the track carries an instrument', 'none',
           `node rig/pro-instrument/live-setup.mjs "Stage-73 V2" ${TRACK}`);

  // "All Ins" is a superset of IAC and is what a fresh track has, so it PASSES
  // — refusing it would fail a rig that works. Named explicitly is better only
  // because it cannot be stolen by another device plugging in.
  const inType = await one('/live/track/get/input_routing_type');
  if (inType === 'All Ins') ok('the track will hear the IAC bus', `input "All Ins" — a superset, so IAC reaches it`);
  else if (/IAC/i.test(String(inType))) ok('the track will hear the IAC bus', `input "${inType}"`);
  else bad('the track will hear the IAC bus', `input "${inType}"`,
           `set the track input to IAC Driver (Bus 1) or All Ins`);

  const armed = await one('/live/track/get/arm');
  const mon = await one('/live/track/get/current_monitoring_state');   // 0 In, 1 Auto, 2 Off
  const monName = ['In', 'Auto', 'Off'][mon] ?? String(mon);
  if (armed && mon !== 2) ok('armed, and monitoring passes input through', `armed, monitoring ${monName}`);
  else bad('armed, and monitoring passes input through', `armed ${armed}, monitoring ${monName}`,
           'arm the track; monitoring In or Auto, never Off');

  const muted = await one('/live/track/get/mute');
  const vol = await one('/live/track/get/volume');
  if (!muted && vol > 0.05) ok('not muted, and the fader is up', `volume ${vol.toFixed(2)}`);
  else bad('not muted, and the fader is up', `muted ${muted}, volume ${vol}`, 'unmute and raise the track fader');
}

// ── 8. the audio devices, BY NAME ─────────────────────────────────────────
// 🔴 NEVER BY INDEX. This check exists because `-i ":0"` meant the microphone
// when the README was written and means BlackHole today — the same reading,
// -91.0 dB, once proved "the capture is deaf" and once proved "nothing is
// playing", which are opposite conclusions from an identical number. A device
// index is a shared mutable global exactly like a fixed port.
await sh('rm -f /tmp/pc-dev.txt');
await inSession('ffmpeg -hide_banner -nostdin -f avfoundation -list_devices true -i "" 2>/tmp/pc-dev.txt; echo DONE >> /tmp/pc-dev.txt');
let devText = '';
for (let i = 0; i < 12 && !devText.includes('DONE'); i++) { await sleep(700); devText = (await sh('cat /tmp/pc-dev.txt 2>/dev/null')) || ''; }

const audio = {};
let inAudio = false;
for (const line of devText.split('\n')) {
  if (/AVFoundation audio devices/.test(line)) { inAudio = true; continue; }
  if (/AVFoundation video devices/.test(line)) { inAudio = false; continue; }
  const m = inAudio && line.match(/\[(\d+)\]\s+(.+?)\s*$/);
  if (m) audio[m[2]] = Number(m[1]);
}
const idxOf = (want) => {
  const key = Object.keys(audio).find((k) => k.toLowerCase().includes(want.toLowerCase()));
  return key === undefined ? null : audio[key];
};
const blackhole = idxOf('BlackHole');
const mic = idxOf('MacBook Pro Microphone') ?? idxOf('Microphone');

if (!Object.keys(audio).length) {
  bad('the capture route is open', 'ffmpeg listed no audio devices',
      'is iTerm2 running on the studio Mac? the AppleEvent needs a window it can write to');
} else if (blackhole === null) {
  bad('a loopback device exists to capture', `found: ${Object.keys(audio).join(', ')}`,
      'install BlackHole 2ch and set Live\'s output to it (or to a Multi-Output that contains it)');
} else {
  ok('the audio devices resolve by name', Object.entries(audio).map(([n, i]) => `${i}:${n}`).join(' · '));
}

// ── 9. the deafness control, on the RIGHT device ──────────────────────────
// ⚠️ THE MICROPHONE, BECAUSE IT CANNOT BE DIGITALLY SILENT IN A ROOM. If this
// reads -91.0 the capture is deaf and every level below it is meaningless —
// which is the one thing a silent BlackHole reading cannot tell you on its own.
if (mic !== null) {
  await sh('rm -f /tmp/pc-mic.txt');
  await inSession(`ffmpeg -hide_banner -nostdin -f avfoundation -i ":${mic}" -t 2 -af volumedetect -f null - 2>/tmp/pc-mic.txt; echo DONE >> /tmp/pc-mic.txt`);
  let t = ''; for (let i = 0; i < 12 && !t.includes('DONE'); i++) { await sleep(700); t = (await sh('cat /tmp/pc-mic.txt 2>/dev/null')) || ''; }
  const peak = dB(t, 'max');
  if (peak !== null && peak > -80) ok('the capture is not deaf', `microphone peaks ${peak} dB — a real room`);
  else bad('the capture is not deaf', `microphone reads ${peak ?? 'nothing'} dB`,
           'grant iTerm2 microphone permission, or check that iTerm2 is the app the AppleEvent reached');
}

// ── 10. the whole chain ───────────────────────────────────────────────────
if (blackhole !== null) {
  const built = await sh('test -x /tmp/midisend && echo yes');
  if (!built) {
    const src = new URL('./midisend.c', import.meta.url).pathname;
    if (LOCAL) await run('cp', [src, '/tmp/midisend.c']).catch(() => {});
    else await run('scp', ['-q', src, `${SSH}:/tmp/midisend.c`]).catch(() => {});
    await sh('cd /tmp && clang -O2 -o midisend midisend.c -framework CoreMIDI -framework CoreFoundation 2>&1 | head -3');
  }
  const haveSend = await sh('test -x /tmp/midisend && echo yes');
  if (!haveSend) {
    bad('a note reaches Live and comes back as sound', 'midisend would not build',
        'needs the Command Line Tools: xcode-select --install');
  } else {
    // Baseline first, same device, same ffmpeg, seconds apart — the only way a
    // level means anything. A number with no control is not a measurement.
    await sh('rm -f /tmp/pc-silence.txt /tmp/pc-note.txt /tmp/pc-done');
    await sh(`cat > /tmp/pc-note.sh <<'SH'
#!/bin/zsh
ffmpeg -hide_banner -nostdin -f avfoundation -i ":${blackhole}" -t 2 -af volumedetect -f null - 2>/tmp/pc-silence.txt
( sleep 0.6; printf "on 60 110\\non 64 100\\non 67 100\\n"; sleep 2.2; printf "off 60\\noff 64\\noff 67\\n"; sleep 0.3 ) | /tmp/midisend IAC >/dev/null 2>&1 &
ffmpeg -hide_banner -nostdin -f avfoundation -i ":${blackhole}" -t 3 -af volumedetect -f null - 2>/tmp/pc-note.txt
wait
echo DONE > /tmp/pc-done
SH
chmod +x /tmp/pc-note.sh`);
    await inSession('/tmp/pc-note.sh');
    let done = ''; for (let i = 0; i < 25 && !done; i++) { await sleep(900); done = (await sh('cat /tmp/pc-done 2>/dev/null')) || ''; }
    const sil = dB(await sh('cat /tmp/pc-silence.txt 2>/dev/null'), 'max');
    const note = dB(await sh('cat /tmp/pc-note.txt 2>/dev/null'), 'max');
    const noteMean = dB(await sh('cat /tmp/pc-note.txt 2>/dev/null'), 'mean');
    if (note !== null && sil !== null && note - sil > 20) {
      ok('a note reaches Live and comes back as sound',
         `silence ${sil} dB -> a held chord ${note} dB peak, ${noteMean} dB mean — ${(note - sil).toFixed(1)} dB apart`);
      // Worth saying even when it passes: a peak at 0.0 is clipping, and a demo
      // that streams this would ship the distortion with it.
      if (note > -0.5) bad('there is headroom to stream it', `peak ${note} dB — at full scale, so it is clipping`,
                           'lower the track fader or the instrument output before streaming');
      else ok('there is headroom to stream it', `peak ${note} dB`);
    } else {
      bad('a note reaches Live and comes back as sound',
          `silence ${sil} dB, with a chord held ${note} dB — no separation`,
          'is Live\'s OUTPUT device BlackHole (or a Multi-Output containing it)? There is no OSC API for that, so it is set by hand in Preferences > Audio');
    }
  }
}

report();

function report() {
  if (JSON_OUT) { console.log(JSON.stringify({ at: new Date().toISOString(), results }, null, 1)); process.exit(0); }
  console.log('\n== the Ableton Live rig, checked end to end ==\n');
  for (const r of results) {
    console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.detail ? '  ' + r.detail : ''}`);
    if (!r.ok && r.fix) console.log(`       -> ${r.fix}`);
  }
  const good = results.filter((r) => r.ok).length;
  console.log(`\n${good}/${results.length}${good === results.length ? ' — the rig is set up' : ' — see the arrows'}\n`);
  process.exit(good === results.length ? 0 : 1);
}

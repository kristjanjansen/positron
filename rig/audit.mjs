// rig/audit.mjs — what these machines need, why, and whether they still have it.
//
//   node rig/audit.mjs              every machine
//   node rig/audit.mjs box          just the Pi
//   node rig/audit.mjs pro --fix    print the commands that would close the gap
//
// 🔴 WHY THIS EXISTS. `setup.sh` installs `alsa-utils curl git` and node. That
// is all it has ever installed. Every instrument on the board — JACK, Yoshimi,
// SuperCollider, its sc3-plugins, ffmpeg — was put
// there BY HAND at some point and written down nowhere, so a fresh Pi would
// come up with the service running and every instrument reporting
// "unavailable", which reads as a code fault.
//
// The drift is not historical. Csound went on this board by hand at 06:00 on
// 2026-09-12, by me, an hour before this file was written, for the reverb
// insert. That is the whole argument: a machine that is set up by typing is a
// machine nobody can rebuild.
//
// ⚠️ A LIST IS NOT A CHECK. A document saying what should be installed rots the
// first time somebody installs something else, and nothing says so. This is
// runnable: it asks each machine what it actually has and prints the
// difference, so the record cannot quietly stop being true.
//
// ⚠️ AND IT DOES NOT PIN VERSIONS. `seen` is what was there on a day it worked,
// reported as drift rather than enforced as a requirement — pinning Debian
// point releases would make this fail on every routine upgrade and teach
// everyone to ignore it. A version that moved is worth a line, not a refusal.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

export const MACHINES = {
  box: {
    what: 'the Raspberry Pi that IS the instrument',
    ssh: process.env.BOX_SSH || 'positron@192.168.1.213',
    // ⚠️ Ask port 22, not mDNS — `positron-box.local` does not resolve from
    // this sandbox. CLAUDE.md has the sweep.
    apt: [
      ['jackd2',            '1.9.22~dfsg-4',        'the audio graph every instrument is patched into; the insert lives on it'],
      // 🔴 FOUR PACKAGES LEFT THIS LIST ON 2026-09-16 and they are named here so
      // a rebuilt board does not quietly get them back: `fluidsynth`,
      // `fluid-soundfont-gm`, `dssi-host-jack` and `hexter`. Nothing on the
      // board spawns either instrument any more, so installing them costs
      // 141 MB of soundfont and a plugin host for something that cannot be
      // reached. `archive/box-fluidsynth-hexter/` has the code and the reason.
      ['yoshimi',           '2.3.3.3-1',            '911 instruments in 24 banks, as its own JACK client'],
      ['yoshimi-data',      null,                   'those banks; without it yoshimi starts and has nothing to play'],
      ['supercollider',     '1:3.13.0+repack-3',    'scsynth and sclang — what pappus, the granular engine, runs in'],
      ['sc3-plugins',       null,                   'the extra UGens pappus uses; core SuperCollider is not enough for it'],
      ['csound',            '1:6.18.1+dfsg-4',      'the reverb insert (rig/box/csd/space.csd). ⚠️ INSTALL WITH --no-install-recommends: the recommends pull tcl/tk onto a headless board'],
      ['ffmpeg',            '8:7.1.5-0+deb13u1+rpt2','encodes the camera and the rendered picture; h264_v4l2m2m is the hardware path'],
      ['alsa-utils',        '1.2.14-1+rpt1',        'aconnect, which is how MIDI ports are read and patched'],
      ['v4l-utils',         '1.30.1-1',             'v4l2-ctl — how the camera is asked what modes it has'],
      ['nodejs',            '24.21.0-1nodesource1', 'the service itself; from NodeSource, not Debian, which ships an older one'],
      ['build-essential',   null,                   'gcc, to build rig/vis on the board rather than cross-compiling'],
      ['git',               null,                   'setup.sh wants it'],
    ],
    // Not packages: things this repo puts there, or that are built on arrival.
    files: [
      ['/opt/positron-box/rig/box/box.mjs',  'the service itself. ⚠️ NOT ~/positron — that copy is stale and reading it tells you nothing'],
      ['/opt/positron-box/rig/vis/v3dpipe',  'the shader renderer, COMPILED ON THE BOARD by push.sh when its source is newer'],
      ['/etc/systemd/system/positron-box.service', 'what makes it come back after a power cut'],
    ],
    devices: [
      ['/dev/video11', 'the hardware H.264 encoder. ⚠️ SINGLE AND EXCLUSIVE — when it wedges nothing kills it and recovery is a reboot'],
      ['/dev/dri/renderD128', 'the GPU, reached headless through EGL over GBM'],
    ],
  },

  m1: {
    what: 'the M1 Pro MacBook that runs Ableton Live — PARKED, see rig/m1/README.md',
    ssh: process.env.M1_SSH || 'mbp',
    // ⚠️ `m1`, NOT `pro`. BOTH Macs here are "Pro" — MEASURED: the studio one is
    // an Apple M1 Pro (MacBookPro18,3) and the machine this repo is edited on is
    // an Apple M2 Pro. "the Pro" named neither of them unambiguously and was
    // used for both.
    mac: true,
    // ⚠️ NOT RESTORABLE FROM THIS REPO, and that is the point of listing them.
    // Four of these are Preferences clicks with no API at all, which is why
    // that rig is parked rather than automated.
    manual: [
      ['Ableton Live 11',          'the instrument. Not installable from here'],
      ['AbletonOSC',               'a Remote Script, in ~/Music/Ableton/User Library/Remote Scripts/ — and it must be SELECTED as a Control Surface in Preferences, which installing does not do'],
      ['Arturia Stage-73 V2',      'the electric piano on track 0; licensed, activated'],
      ['BlackHole 2ch',            'a loopback device, because macOS has none — this is how anything hears what Live plays'],
      ['a Multi-Output Device',    'so the room hears it too; built in Audio MIDI Setup'],
      ['IAC Driver Bus 1',         'enabled in Audio MIDI Setup, and switched on for Track input in Live'],
      ['Preferences > Audio > Output = BlackHole', '🔴 THE LIVE OBJECT MODEL HAS NO AUDIO-DEVICE API. This one cannot be scripted at all'],
    ],
    files: [
      ['~/positron-rack/live-check.mjs', 'the checkup; copied by hand, not deployed by anything'],
      ['~/positron-rack/rack-agent.mjs', 'answers rack.status over the relay. ⚠️ must be started from a terminal IN the login session — a capture started over ssh is deaf'],
      ['/tmp/midisend',            'CoreMIDI sender, built from rig/m1/midisend.c. ⚠️ IN /tmp, so it does NOT survive a reboot — live-check.mjs rebuilds it'],
    ],
  },
};

const sh = async (ssh, cmd, mac = false) => {
  try {
    const { stdout } = await run('ssh', ['-o', 'ConnectTimeout=8', '-o', 'BatchMode=yes', ssh, cmd], { timeout: 30000 });
    return stdout.trim();
  } catch { return null; }
};

async function auditBox(m, fix) {
  const rows = [];
  // ⚠️ `|| true`, AND IT IS NOT COSMETIC. `dpkg-query` exits non-zero when ANY
  // name it is given is unknown, and the unknown ones are exactly the case this
  // tool exists to find — so without this, one missing package made the query
  // fail, the map come back empty, and EVERY package report MISSING. Caught by
  // breaking it on purpose: adding one bogus name turned sixteen ok rows red.
  // A checker whose false-alarm mode is that broad is one people stop reading.
  const q = await sh(m.ssh, `dpkg-query -W -f='\${Package} \${Version} \${Status}\\n' ${m.apt.map((a) => a[0]).join(' ')} 2>/dev/null || true`);
  const have = new Map();
  for (const line of (q || '').split('\n')) {
    const [pkg, ver, ...st] = line.split(' ');
    if (pkg) have.set(pkg, { ver, installed: st.join(' ').includes('installed') });
  }
  for (const [pkg, seen, why] of m.apt) {
    const got = have.get(pkg);
    if (!got?.installed) rows.push(['MISSING', pkg, why, `sudo apt-get install -y --no-install-recommends ${pkg}`]);
    else if (seen && got.ver !== seen) rows.push(['drift', pkg, `${seen} -> ${got.ver}`, null]);
    else rows.push(['ok', pkg, '', null]);
  }
  for (const [path, why] of m.files) {
    const ok = await sh(m.ssh, `test -e ${path} && echo y`);
    rows.push([ok ? 'ok' : 'MISSING', path, ok ? '' : why, null]);
  }
  for (const [dev, why] of m.devices || []) {
    const ok = await sh(m.ssh, `test -e ${dev} && echo y`);
    rows.push([ok ? 'ok' : 'MISSING', dev, ok ? '' : why, null]);
  }
  return rows;
}

async function auditPro(m) {
  const rows = [];
  const alive = await sh(m.ssh, 'hostname -s');
  if (!alive) return [['unreachable', m.ssh, 'the Mac is asleep or off the network — everything below is unknown, not absent', null]];
  for (const [path, why] of m.files) {
    const ok = await sh(m.ssh, `test -e ${path.replace('~', '$HOME')} && echo y`);
    rows.push([ok ? 'ok' : 'MISSING', path, ok ? '' : why, null]);
  }
  // ⚠️ EVERY `manual` ITEM IS REPORTED AS UNCHECKABLE RATHER THAN AS PRESENT.
  // A Preferences setting cannot be read over ssh, and a row that guessed would
  // be worse than a row that says it did not look — that is the difference
  // between "we checked and it is fine" and "we did not check", which this
  // project has a rule about.
  for (const [what, why] of m.manual) rows.push(['by hand', what, why, null]);
  return rows;
}

const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const fix = process.argv.includes('--fix');
const names = want.length ? want : Object.keys(MACHINES);
let missing = 0;
const fixes = [];

for (const name of names) {
  const m = MACHINES[name];
  if (!m) { console.log(`no machine called "${name}" — try: ${Object.keys(MACHINES).join(', ')}`); continue; }
  console.log(`\n== ${name} — ${m.what}\n   ${m.ssh}\n`);
  const rows = m.mac ? await auditPro(m) : await auditBox(m, fix);
  for (const [state, what, why, cmd] of rows) {
    const mark = state === 'ok' ? 'ok     ' : state === 'drift' ? 'drift  ' : state === 'by hand' ? 'by hand' : 'MISSING';
    console.log(`  ${mark} ${what}${why ? `\n            ${why}` : ''}`);
    if (state === 'MISSING') { missing++; if (cmd) fixes.push(cmd); }
  }
}

if (fix && fixes.length) {
  console.log('\n== to close the gap\n');
  for (const c of fixes) console.log(`  ${c}`);
}
console.log(missing ? `\n${missing} missing. Run with --fix for the commands.\n`
                    : '\nnothing missing.\n');
process.exit(missing ? 1 : 0);

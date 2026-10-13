// archive/yoshimi/jacksynth-entry.mjs: Yoshimi's entry in JACK_SYNTHS, verbatim.
//
// Cut out of rig/board/jacksynth.mjs on 2026-10-13, when Yoshimi left the
// Raspberry Pi (archive/yoshimi/README.md). A valid module so it parses and
// archive/yoshimi/test-half.mjs can read `YOSHIMI_ARGS`; nothing on the board
// imports it. To restore, paste `YOSHIMI_ARGS` above `export const JACK_SYNTHS =
// {` in rig/board/jacksynth.mjs, paste the `yoshimi: {...}` entry inside that
// table, and add `import { ensureBoardInstance } from './yoshimi.mjs';` there.
// (`sourcesOf` came from yoshimi.mjs too and comes from './alsa.mjs' now; leave
// that import as it is.) The only change from the original is `warmup: 13000`,
// which replaces a name test that stood in startJackSynth.
import { spawn } from 'node:child_process';
import { ensureBoardInstance } from './yoshimi.mjs';

/**
 * Yoshimi's command line. `-a` with no device: the device list only matters on
 * `Fixed`, and the instance says `External` (yoshimi.mjs `externalMidi`), so
 * the board's `aconnect` is the one connection. No `-K`, which would turn the
 * JACK auto connect back on, and no `-k`, which would start a second jackd.
 */
export const YOSHIMI_ARGS = Object.freeze(['-i', '-a', '-J', '-b=256']);

export const JACK_SYNTHS_YOSHIMI = {
  yoshimi: {
    needs: ['yoshimi', 'jackd', 'ffmpeg'],
    // -i no GUI, -a ALSA MIDI (so virmidi can reach it), -J JACK audio
    // `ensureBoardInstance` first: see yoshimi.mjs. Without it Yoshimi exits 1
    // on a jackd that owns a card capture only, since there is no playback,
    // and subscribes itself to every MIDI source on the box, the Circuit too.
    spawn: () => { try { ensureBoardInstance(); } catch { /* yoshimi says why if it matters */ }
                   return spawn('yoshimi', YOSHIMI_ARGS, { stdio: ['ignore','pipe','pipe'] }); },
    portMatch: /^yoshimi:left/i,
    portMatch2: /^yoshimi:right/i,
    // It appears on the graph well before it has read 911 instruments off the
    // disk, so this is waited AFTER the port is there rather than instead of it.
    settle: 6000,
    // The 13 s ceiling was a name test in startJackSynth (`name === 'yoshimi' ? 13000 : 6000`)
    // until 2026-10-13; it travels with the entry now, as `warmup`, which that code reads first.
    warmup: 13000,
    alsaMatch: /yoshimi/i,
    osc: false,
  },
};

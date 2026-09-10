// Put Live into a state where it can be played remotely — no clicking.
//
//   LIVE_HOST=192.168.1.241 node live-setup.mjs [instrument] [track]
//
// Everything here is reachable over OSC, including loading the instrument, which
// AbletonOSC alone cannot do (abletonosc-ext/browser.py adds it). The ONE thing
// that is not reachable is Live's audio OUTPUT device: the Live Object Model has
// no audio-device API, so BlackHole has to be selected by hand in
// Preferences > Audio. See the README.
import { ask } from './live-osc.mjs';

const INSTRUMENT = process.argv[2] || 'Drift';
const TRACK = Number(process.argv[3] || 0);
const show = (label, v) => console.log(`  ${label.padEnd(12)} ${JSON.stringify(v)}`);

const names = await ask('/live/song/get/track_names');
if (!names) { console.log('Live did not answer on', process.env.LIVE_HOST || '127.0.0.1'); process.exit(1); }

// An instrument first: a track with no device makes no sound however well the
// MIDI arrives, and every other step here would still read as "configured".
const loaded = await ask('/live/browser/load', [TRACK, INSTRUMENT]);
show('instrument', loaded);

await ask('/live/track/set/input_routing_type', [TRACK, 'IAC Driver (Bus 1)']);
await ask('/live/track/set/arm', [TRACK, 1]);
await ask('/live/track/set/current_monitoring_state', [TRACK, 0]);   // 0 = In

// Read back rather than trusting the setters, which do not reply at all.
show('input', await ask('/live/track/get/input_routing_type', [TRACK]));
show('armed', await ask('/live/track/get/arm', [TRACK]));
show('monitoring', await ask('/live/track/get/current_monitoring_state', [TRACK]));
show('devices', await ask('/live/track/get/devices/name', [TRACK]));
console.log('\nStill manual: Live > Preferences > Audio > Output Device = BlackHole 2ch');
console.log('(or a Multi-Output Device, if you also want to hear it on the Pro)');
process.exit(0);

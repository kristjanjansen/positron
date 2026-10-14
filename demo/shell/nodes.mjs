// demo/shell/nodes.mjs: the one catalogue of the node TYPES the site's own
// pages build in a browser tab, read off every concept page's addNode and
// addPort on 2026-10-14 (plans/plan-node-catalogue.md, step 1). Pure and import
// free, so a test and the build can read it.
//
// Left out on purpose: the Pi side (`boardGraph()` in graph-registry.mjs), and
// the relay and Stream hops (cf-relay, cf-shout, cf-stream, cf-moq).
//
// An entry's key is the catalogue NAME. `node` is the id's second segment when
// it is not the name (three different things are called `shader` on three
// pages), and `site` is the id's first segment when it is not the page's.
// A port's key is its name; `dir` and `medium` come from it (`value-in-2` is
// value, in) unless the port says otherwise (`cutoff-in` is audio).
// `optional` ports are added only when a page passes a deliver or an override
// for them. `pages` are the pages that build the type today, `labels` the
// pages that label it something other than `label`. `match` names a
// per-instance id a page may pass as a plain string (`knob-cutoff`), and
// `instance` says in words how an instance is named.

const P = (o = {}) => o;
const NOTE = { emits: ['note'] }, TAKES_NOTE = { accepts: ['note'] };
const PARAM = { shape: { of: 'param' } }, TEXT = { shape: { of: 'text' } }, INDEX = { shape: { of: 'index' } };
const PAGE = { transports: ['page'] }, HTTPS = { transports: ['https'] };

export const NODES = {
  // ── people and the controls they hold ───────────────────────────────────
  keys: {
    kind: 'person', label: 'keyboard',
    ports: {
      'midi-out': P({ ...NOTE }),
      'midi-in': P({ ...TAKES_NOTE, optional: true }),
      'value-in': P({ optional: true }),
      'value-in-2': P({ optional: true }),
    },
    pages: ['synth/keyboard', 'synth/recorder', 'synth/timeline', 'synth/dots', 'synth/sound', 'code/faust',
      'code/collide', 'code/plaits', 'code/piano', 'remote/circuit', 'remote/collide', 'remote/piano',
      'radio/key', 'room/words'],
  },
  typing: {
    node: 'keys', kind: 'person', label: 'keyboard',
    instance: 'keys, or keys-<k> for typist k on typist/score, labelled typist <k>',
    ports: { 'value-out': P({ ...TEXT }) },
    pages: ['typist/paper', 'typist/typewriter', 'typist/machines', 'typist/playback', 'typist/score'],
    labels: { 'typist/score': 'typist <k>' },
  },
  midi: {
    kind: 'device', label: 'MIDI keyboard', match: ['midi', 'midi-<n>'],
    instance: 'one per plugged-in MIDI input: midi, midi-2, midi-3 in plug order (createMidiDevices), labelled with the input\'s own name',
    ports: { 'midi-out': P({ ...NOTE }) },
    pages: ['synth/keyboard', 'code/plaits', 'code/piano', 'remote/circuit'],
  },
  knob: {
    kind: 'person', label: '<name>', match: ['knob-<name>'],
    instance: 'knob-<name>, one per parameter, labelled with the parameter (the default) or "knob"',
    ports: { 'value-out': P({ ...PARAM }), 'value-in': P({ optional: true }) },
    pages: ['synth/sound', 'code/faust', 'code/collide', 'code/plaits', 'granulator/grains', 'granulator/beat',
      'remote/circuit', 'remote/collide', 'video/shader', 'shader/mirror', 'shader/landscape', 'shader/remote',
      'typist/machines', 'drums/knobs'],
    labels: { 'synth/sound': 'knob', 'video/shader': 'knob', 'shader/mirror': 'knob', 'shader/remote': 'knob',
      'remote/circuit': 'macro <n>', 'drums/knobs': '<drum> <param>', 'granulator/grains': 'wet/dry (knob-mix)',
      'granulator/beat': 'wet/dry (knob-mix)' },
  },
  'knob-volume': {
    kind: 'person', label: 'knob',
    ports: { 'midi-out': P({ emits: ['cc'] }) },
    pages: ['synth/dots'],
  },
  // ⚠️ A knob drawn as an ENGINE: the grain pages' knob-mix is a person.
  'knob-mix': {
    kind: 'engine', label: 'mix knob',
    ports: { 'value-out': P() },
    pages: ['radio/live', 'radio/tempo', 'radio/key'],
  },
  fader: {
    kind: 'person', label: 'fader',
    ports: { 'value-out': P({ ...PARAM }) },
    pages: ['remote/collide', 'drums/remote'],
  },
  dial: {
    kind: 'person', label: 'dial',
    ports: { 'value-out': P({ ...PARAM }) },
    pages: ['radio/tuner'],
  },
  patch: {
    kind: 'person', label: 'patch',
    ports: { 'midi-out': P({ emits: ['program'] }) },
    pages: ['code/piano', 'remote/circuit', 'remote/piano'],
  },
  pick: {
    kind: 'person', label: 'machine',
    ports: { 'value-out': P({ ...INDEX }) },
    pages: ['typist/machines'],
  },
  machines: {
    kind: 'person', label: 'machines',
    instance: 'one value-out per typist: value-out, value-out-2 .. value-out-<n>',
    ports: { 'value-out': P({ ...INDEX, repeat: true }) },
    pages: ['typist/score'],
  },
  code: {
    kind: 'person', label: 'code box',
    ports: { 'program-out': P({ shape: { of: 'glsl' } }) },
    pages: ['shader/remote'],
  },
  invert: {
    kind: 'person', label: 'invert',
    ports: { 'value-out': P({ ...PARAM }) },
    pages: ['drums/camera'],
  },
  scale: {
    kind: 'person', label: '1x or 2x',
    ports: { 'value-out': P({ ...PARAM }) },
    pages: ['drums/camera'],
  },
  chat: {
    kind: 'person', label: 'chat',
    instance: 'on the tab\'s own random site, web-<4 letters>',
    ports: { 'value-out': P(), 'value-in': P() },
    pages: ['room/chat', 'room/broadcast', 'room/history'],
  },
  admin: {
    kind: 'person', label: 'admin',
    ports: { 'value-out': P() },
    pages: ['room/broadcast', 'room/history'],
  },

  // ── engines: what makes or changes a sound, a picture or an event ───────
  synth: {
    kind: 'engine', label: 'saw',
    ports: { 'midi-in': P({ ...TAKES_NOTE }), 'audio-out': P() },
    pages: ['synth/keyboard', 'synth/recorder', 'synth/timeline', 'synth/dots', 'room/words'],
    labels: { 'synth/keyboard': 'sine', 'room/words': 'saw synth' },
  },
  osc: {
    kind: 'engine', label: 'oscillator',
    ports: { 'midi-in': P({ ...TAKES_NOTE }), 'value-in': P({ shape: { of: 'param', names: ['freq', 'detune', 'wave'] } }), 'audio-out': P() },
    pages: ['synth/sound'],
  },
  filter: {
    kind: 'engine', label: 'lowpass filter',
    ports: {
      'audio-in': P(),
      // Named for the parameter it moves, plans/plan-synth-patch.md §3 option A.
      'cutoff-in': P({ dir: 'in', medium: 'audio' }),
      'value-in': P({ shape: { of: 'param', names: ['cutoff', 'q'] } }),
      'audio-out': P(),
    },
    pages: ['synth/sound'],
  },
  amp: {
    kind: 'engine', label: 'amp and envelope',
    ports: { 'audio-in': P(), 'midi-in': P({ ...TAKES_NOTE }),
      'value-in': P({ shape: { of: 'param', names: ['attack', 'decay', 'sustain', 'release'] } }), 'audio-out': P() },
    pages: ['synth/sound'],
  },
  lfo: {
    kind: 'engine', label: 'lfo',
    ports: { 'value-in': P({ shape: { of: 'param', names: ['rate', 'depth'] } }), 'audio-out': P() },
    pages: ['synth/sound'],
  },
  fau: {
    kind: 'engine', label: 'Faust',
    ports: { 'midi-in': P({ ...TAKES_NOTE }), 'value-in': P({ ...PARAM }), 'audio-out': P() },
    pages: ['code/faust'],
  },
  collide: {
    kind: 'engine', label: 'SuperCollider',
    ports: { 'midi-in': P({ ...TAKES_NOTE }), 'value-in': P({ ...PARAM }), 'audio-out': P() },
    pages: ['code/collide', 'remote/collide'],
    labels: { 'remote/collide': 'SuperCollider here' },
  },
  plaits: {
    kind: 'engine', label: 'Plaits',
    ports: { 'midi-in': P({ ...TAKES_NOTE }), 'value-in': P({ ...PARAM }), 'audio-out': P() },
    pages: ['code/plaits'],
  },
  sampler: {
    kind: 'engine', label: 'SuperCollider sampler',
    ports: { 'midi-in': P({ accepts: ['note', 'program'] }), 'file-in': P(), 'audio-out': P() },
    pages: ['code/piano'],
  },
  'midi-state': {
    node: 'midi', kind: 'engine', label: 'midi state',
    ports: { 'midi-in': P({ accepts: ['note', 'cc'] }), 'value-out': P() },
    pages: ['synth/dots'],
  },
  pico: {
    kind: 'device', label: 'Pico (emulated)',
    ports: { 'midi-in': P({ accepts: ['note', 'cc'] }), 'video-out': P() },
    pages: ['synth/dots'],
  },
  shader: {
    kind: 'engine', label: 'mirror shader',
    ports: {
      'value-in': P({ shape: { of: 'param', names: ['segments'] } }),
      'program-in': P({ shape: { of: 'glsl' }, optional: true }),
      'video-out': P({ ...PAGE }),
    },
    pages: ['shader/mirror', 'shader/remote'],
    labels: { 'shader/remote': 'mirror shader here' },
  },
  'shader-dots': {
    node: 'shader', kind: 'engine', label: 'shader',
    ports: { 'value-in': P(), 'video-out': P() },
    pages: ['synth/dots'],
  },
  'shader-dither': {
    node: 'shader', kind: 'engine', label: 'dither shader',
    ports: { 'video-in': P(), 'video-out': P({ ...PAGE }), 'value-in': P({ shape: { of: 'param', names: ['size'] } }) },
    pages: ['video/shader'],
  },
  'shader-landscape': {
    node: 'shader', kind: 'engine', label: 'scan landscape',
    ports: { 'audio-in': P(), 'value-in': P(), 'video-out': P({ ...PAGE }) },
    pages: ['shader/landscape'],
  },
  pixelate: {
    kind: 'engine', label: 'squares, dithered',
    ports: { 'video-in': P(), 'video-out': P({ ...PAGE }), 'value-out': P({ shape: { of: 'pattern' } }),
      'value-in': P({ shape: { of: 'param', names: ['invert', 'scale'] } }) },
    pages: ['drums/camera'],
  },
  radio: {
    kind: 'engine', label: 'radio',
    ports: { 'file-in': P(), 'audio-out': P() },
    pages: ['granulator/grains', 'granulator/beat', 'shader/landscape'],
  },
  player: {
    kind: 'engine', label: 'player',
    ports: { 'file-in': P(), 'audio-out': P() },
    pages: ['radio/tempo'],
  },
  'player-video': {
    node: 'player', kind: 'engine', label: 'player',
    ports: { 'file-in': P(), 'video-out': P({ ...PAGE }) },
    pages: ['video/recorder'],
  },
  level: {
    kind: 'engine', label: 'level',
    ports: { 'audio-in': P(), 'audio-out': P(), 'value-out': P({ optional: true }) },
    pages: ['radio/live', 'radio/key'],
  },
  grains: {
    kind: 'engine', label: 'grain ring',
    ports: { 'audio-in': P(), 'audio-out': P(), 'value-in': P(), 'value-out': P(),
      'tempo-in': P({ dir: 'in', medium: 'value', optional: true }) },
    pages: ['granulator/grains', 'granulator/beat'],
  },
  granulator: {
    kind: 'engine', label: 'granulator',
    ports: { 'audio-in': P(), 'audio-out': P(), 'value-out': P() },
    pages: ['shader/landscape'],
  },
  'patch-values': {
    node: 'patch', kind: 'engine', label: 'patch',
    ports: { 'value-out': P(), 'value-out-2': P() },
    pages: ['granulator/grains', 'granulator/beat'],
  },
  bpm: {
    kind: 'engine', label: 'tempo detector',
    ports: { 'audio-in': P(), 'value-out': P() },
    pages: ['radio/live', 'radio/tempo'],
  },
  tempo: {
    kind: 'engine', label: 'tempo detector',
    ports: { 'audio-in': P(), 'value-out': P() },
    pages: ['granulator/beat'],
  },
  key: {
    kind: 'engine', label: 'key detector',
    ports: { 'audio-in': P(), 'value-out': P() },
    pages: ['radio/key'],
  },
  fx: {
    kind: 'engine', label: 'low-pass filter',
    ports: { 'audio-in': P(), 'audio-out': P() },
    pages: ['room/words'],
  },
  'fx-click': {
    node: 'fx', kind: 'engine', label: 'low cut and click',
    ports: { 'audio-in': P(), 'value-in': P(), 'value-in-2': P(), 'audio-out': P() },
    pages: ['radio/live', 'radio/tempo'],
  },
  'fx-typewriter': {
    node: 'fx', kind: 'engine', label: 'fx',
    instance: 'fx, or fx-<k> for typist k on typist/score, labelled fx <k>',
    ports: { 'audio-in': P(), 'value-in': P({ ...INDEX }), 'value-in-2': P({ ...PARAM, optional: true }), 'audio-out': P() },
    pages: ['typist/machines', 'typist/score'],
    labels: { 'typist/score': 'fx <k>' },
  },
  typewriter: {
    kind: 'engine', label: 'typewriter',
    instance: 'typewriter, or typewriter-<k> for typist k on typist/score, labelled typewriter <k>',
    ports: { 'value-in': P({ ...TEXT }), 'file-in': P({ optional: true }), 'value-in-2': P({ ...INDEX, optional: true }),
      'value-in-3': P({ ...PARAM, optional: true }), 'audio-out': P() },
    pages: ['typist/typewriter', 'typist/machines', 'typist/playback', 'typist/score'],
    labels: { 'typist/score': 'typewriter <k>' },
  },
  autoplay: {
    kind: 'engine', label: 'autoplay',
    ports: { 'value-in': P(), 'midi-out': P({ emits: ['note', 'cc'] }), 'value-out': P(), 'midi-out-2': P({ emits: ['note', 'cc'] }) },
    pages: ['radio/key'],
  },
  bass: {
    kind: 'engine', label: 'bass',
    ports: { 'midi-in': P({ accepts: ['note', 'cc'] }), 'audio-out': P() },
    pages: ['radio/key'],
  },
  pad: {
    kind: 'engine', label: 'pad synth',
    ports: { 'midi-in': P({ accepts: ['note', 'cc'] }), 'midi-out': P({ ...NOTE }), 'audio-out': P(), 'value-in': P() },
    pages: ['radio/key'],
  },
  mixer: {
    kind: 'engine', label: 'wet / dry',
    ports: { 'audio-in': P(), 'audio-in-2': P(), 'value-in': P(), 'audio-out': P() },
    pages: ['radio/key'],
  },
  xfade: {
    kind: 'engine', label: 'crossfader',
    ports: { 'value-in': P({ shape: { of: 'param', names: ['x'] } }), 'audio-in': P(), 'audio-in-2': P(), 'audio-out': P() },
    pages: ['remote/collide', 'drums/remote'],
  },
  'blend-fader': {
    node: 'fader', kind: 'engine', label: 'crossfader',
    ports: { 'audio-in': P(), 'audio-out': P() },
    pages: ['radio/blend'],
  },
  noise: {
    kind: 'engine', label: 'noise',
    ports: { 'audio-out': P() },
    pages: ['radio/tuner'],
  },
  tuner: {
    kind: 'engine', label: 'tuner',
    ports: { 'audio-in': P(), 'audio-out': P(), 'value-in': P({ shape: { of: 'param', names: ['tune'] } }) },
    pages: ['radio/tuner'],
  },
  sequencer: {
    kind: 'engine', label: 'sequencer',
    ports: { 'midi-out': P({ ...NOTE }), 'value-in': P({ shape: { of: 'pattern' }, optional: true }) },
    pages: ['drums/machine', 'drums/knobs', 'drums/samples', 'drums/camera', 'drums/remote'],
  },
  drum: {
    kind: 'engine', label: '<drum>, SuperCollider',
    instance: 'one per voice, named by the voice key (kick, snare, hho, hhc, clap ...; s0 .. s63 on drums/samples), labelled "<voice label>, SuperCollider"',
    ports: { 'midi-in': P({ ...TAKES_NOTE }), 'audio-out': P(), 'value-in': P({ ...PARAM, optional: true }) },
    pages: ['drums/machine', 'drums/knobs', 'drums/samples', 'drums/camera', 'drums/remote'],
  },
  mix: {
    kind: 'engine', label: 'drums mixed',
    ports: { 'audio-in': P(), 'audio-out': P() },
    pages: ['drums/remote'],
  },
  timeline: {
    kind: 'engine', label: 'timeline',
    ports: { 'value-out': P(), 'clock-in': P() },
    pages: ['history/newsreels'],
  },

  // ── stores in the tab ───────────────────────────────────────────────────
  rec: {
    kind: 'store', label: 'recorder',
    ports: { 'midi-in': P({ ...TAKES_NOTE }), 'midi-out': P({ ...NOTE }) },
    pages: ['synth/recorder', 'synth/timeline', 'synth/dots', 'room/words'],
  },
  'rec-text': {
    node: 'rec', kind: 'store', label: 'recorder',
    ports: { 'value-in': P({ ...TEXT }), 'value-out': P({ ...TEXT }) },
    pages: ['typist/playback'],
  },
  // ⚠️ An ENGINE here, where every other recorder is a store.
  'rec-video': {
    node: 'rec', kind: 'engine', label: 'recorder',
    ports: { 'video-in': P(), 'file-out': P() },
    pages: ['video/recorder'],
  },
  looper: {
    kind: 'store', label: 'looper',
    ports: { 'midi-in': P({ accepts: ['note', 'cc'] }), 'midi-out': P({ ...NOTE }) },
    pages: ['code/piano'],
  },
  store: {
    kind: 'store', label: 'this browser',
    ports: { 'file-in': P(), 'file-out': P() },
    pages: ['video/recorder'],
  },

  // ── screens, speakers and cameras ───────────────────────────────────────
  speaker: {
    kind: 'screen', label: 'speakers',
    ports: { 'audio-in': P(), 'value-in': P({ optional: true }), 'clock-in': P({ optional: true }) },
    pages: ['synth/keyboard', 'synth/recorder', 'synth/timeline', 'synth/dots', 'synth/sound', 'code/faust',
      'code/collide', 'code/plaits', 'code/piano', 'granulator/grains', 'granulator/beat', 'remote/circuit',
      'remote/collide', 'remote/piano', 'radio/blend', 'radio/tuner', 'radio/tempo', 'radio/live', 'radio/key',
      'shader/landscape', 'room/words', 'typist/typewriter', 'typist/machines', 'typist/playback', 'typist/score',
      'drums/machine', 'drums/knobs', 'drums/samples', 'drums/camera', 'drums/remote', 'history/newsreels'],
  },
  scope: {
    kind: 'screen', label: 'waveform', match: ['scope-<name>'],
    instance: 'scope; scope-pi beside it on remote/collide (Pi waveform); scope-<drum> per voice on drums/knobs (scope)',
    ports: { 'audio-in': P(), 'audio-in-2': P({ optional: true }), 'midi-in': P({ ...TAKES_NOTE, optional: true }),
      'value-in': P({ optional: true }) },
    pages: ['synth/sound', 'code/faust', 'code/collide', 'code/plaits', 'remote/circuit', 'remote/collide',
      'remote/piano', 'drums/knobs', 'drums/remote', 'room/words'],
    labels: { 'remote/collide': 'waveform here', 'drums/knobs': 'scope', 'drums/remote': 'waveforms', 'room/words': 'scope' },
  },
  wave: {
    kind: 'screen', label: 'wave', match: ['wave-<name>'],
    instance: 'wave; wave-<station> per station on radio/blend (ERR wave, Ida wave)',
    ports: { 'audio-in': P(), 'value-in': P({ optional: true }), 'value-in-2': P({ optional: true }) },
    pages: ['radio/blend', 'radio/tuner', 'radio/tempo', 'radio/live', 'radio/key', 'granulator/grains', 'granulator/beat'],
    labels: { 'granulator/grains': 'source scope', 'granulator/beat': 'source scope', 'radio/blend': 'ERR wave, Ida wave' },
  },
  display: {
    kind: 'screen', label: 'tempo scope',
    ports: { 'value-in': P() },
    pages: ['radio/tempo', 'radio/live'],
  },
  screen: {
    kind: 'screen', label: 'original', match: ['screen-<name>'],
    instance: 'screen; a second picture beside it is its own node: screen-pi (Pi picture), dither (dithered), playback, loopback (WebRTC), hls (LL-HLS), moq (MoQ), pixels',
    ports: { 'video-in': P(), 'value-in': P({ optional: true }), 'clock-out': P({ optional: true }) },
    pages: ['synth/dots', 'shader/mirror', 'shader/remote', 'shader/landscape', 'video/camera', 'video/shader',
      'video/recorder', 'video/webrtc', 'video/llhls', 'video/moq', 'drums/camera', 'remote/circuit', 'history/newsreels'],
    labels: { 'synth/dots': 'picture', 'video/camera': 'picture', 'remote/circuit': 'picture', 'history/newsreels': 'picture',
      'shader/mirror': 'screen', 'shader/landscape': 'screen', 'shader/remote': 'picture here', 'video/recorder': 'camera' },
  },
  oled: {
    kind: 'screen', label: 'OLED',
    ports: { 'video-in': P() },
    pages: ['synth/dots'],
  },
  paper: {
    kind: 'screen', label: 'paper',
    instance: 'paper, or paper-<k> for typist k on typist/score, labelled paper <k>',
    ports: { 'value-in': P({ ...TEXT }) },
    pages: ['typist/paper', 'typist/typewriter', 'typist/machines', 'typist/playback', 'typist/score'],
    labels: { 'typist/score': 'paper <k>' },
  },
  notice: {
    kind: 'screen', label: 'broadcast',
    ports: { 'value-in': P() },
    pages: ['room/broadcast', 'room/history'],
  },
  camera: {
    kind: 'device', label: 'camera',
    instance: 'one per tab; the label becomes the camera\'s own name once it is on',
    ports: { 'video-out': P() },
    pages: ['video/camera', 'video/shader', 'video/recorder', 'video/webrtc', 'video/llhls', 'video/moq', 'drums/camera'],
  },

  // ── somewhere else: a bucket, a store, a broadcaster ────────────────────
  recording: {
    site: 'cf-r2', place: 'cloudflare', net: 'cloudflare', kind: 'store', label: '<station> recording',
    instance: 'one per recording in the bucket: raadio2, raadio4, ida (Raadio 2 recording ...); the file-out carries its URL as address',
    ports: { 'file-out': P({ ...HTTPS }) },
    pages: ['granulator/grains', 'granulator/beat', 'shader/landscape', 'radio/tempo'],
  },
  'piano-samples': {
    node: 'piano', site: 'cf-r2', place: 'cloudflare', net: 'cloudflare', kind: 'store', label: 'piano samples',
    ports: { 'file-out': P({ ...HTTPS }) },
    pages: ['code/piano', 'remote/piano'],
  },
  'rhodes-samples': {
    node: 'rhodes', site: 'cf-r2', place: 'cloudflare', net: 'cloudflare', kind: 'store', label: 'Rhodes samples',
    ports: { 'file-out': P({ ...HTTPS }) },
    pages: ['code/piano', 'remote/piano'],
  },
  'typewriter-samples': {
    node: 'typewriter', site: 'cf-r2', place: 'cloudflare', net: 'cloudflare', kind: 'store', label: 'samples',
    ports: { 'file-out': P({ ...HTTPS }) },
    pages: ['typist/typewriter', 'typist/machines', 'typist/score'],
  },
  'history-store': {
    node: 'history', site: 'cf-store', place: 'cloudflare', net: 'cloudflare', kind: 'store', label: 'history',
    ports: { 'value-in': P({ transports: ['relay'] }), 'value-out': P({ ...HTTPS }) },
    pages: ['room/history'],
  },
  station: {
    place: 'site', net: 'site', kind: 'external', label: '<station>',
    instance: 'a live station on its broadcaster\'s site: err:vikerraadio, err:klassikaraadio, err:raadio2, err:raadio4, ida:tallinn',
    ports: { 'audio-out': P({ ...HTTPS }) },
    pages: ['radio/blend', 'radio/tuner', 'radio/live', 'radio/key'],
    labels: { 'radio/live': 'ERR Raadio 2 (with the broadcaster)', 'radio/key': 'ERR Raadio 2 (with the broadcaster)' },
  },
  newsreel: {
    site: 'err', place: 'err', net: 'err', kind: 'external', label: 'newsreel',
    ports: { 'video-out': P({ ...HTTPS }) },
    pages: ['history/newsreels'],
  },
  'err-radio': {
    node: 'radio', site: 'err', place: 'err', net: 'err', kind: 'external', label: 'radio',
    ports: { 'audio-out': P({ ...HTTPS }) },
    pages: ['history/newsreels'],
  },
};

/** `value-in-2` is value, in; a port named otherwise says its own. */
export function portOf(name, p = {}) {
  const [medium, dir] = name.split('-');
  return { medium: p.medium ?? medium, dir: p.dir ?? dir };
}

const CATALOGUE = 'demo/shell/nodes.mjs NODES';
const patternRe = (pat) => new RegExp(`^${pat.replace(/<[^>]+>/g, '[A-Za-z0-9_.]+(?:-[A-Za-z0-9_.]+)*')}$`);

/** The catalogue name a plain string means: a name, or an instance one entry matches. */
export function typeOf(name) {
  if (Object.hasOwn(NODES, name)) return name;
  const hits = Object.keys(NODES).filter((k) => (NODES[k].match || []).some((m) => patternRe(m).test(name)));
  return hits.length === 1 ? hits[0] : null;
}

/**
 * Add catalogue nodes and their ports to a bay.
 * @param {object} bay        a createBay()
 * @param {string} site       the page's site, `web`
 * @param {Array<string|{name, as?, site?, label?}>} names  a catalogue name, an
 *   instance it matches (`knob-cutoff`), or `{ name: 'drum', as: 'kick' }`
 * @param {object} [o.deliver]  `{ '<node>:<port>': fn }`, attached to that port
 * @param {object} [o.label]    `{ '<node>': 'sine' }`, this page's label
 * @param {object} [o.ports]    `{ '<node>:<port>': { ...fields } }` merged onto
 *   that port; it also asks for an optional port or a repeat (`value-out-3`)
 * @returns {{ nodes: string[], ports: string[] }} the ids added
 */
export function addNodes(bay, site, names, { deliver = {}, label = {}, ports = {} } = {}) {
  const added = { nodes: [], ports: [] };
  const used = new Set();
  const pick = (map, node, id) => {
    for (const k of [id, node]) if (Object.hasOwn(map, k)) { used.add(`${map === deliver ? 'd' : map === label ? 'l' : 'p'} ${k}`); return map[k]; }
    return undefined;
  };
  for (const n of names) {
    const o = typeof n === 'string' ? { name: n } : n;
    const type = typeof n === 'string' ? typeOf(o.name) : (Object.hasOwn(NODES, o.name) ? o.name : null);
    if (!type) throw new Error(`nodes: no node type called ${JSON.stringify(o.name)} in ${CATALOGUE}`);
    const e = NODES[type];
    const seg = o.as ?? (type === o.name ? e.node ?? o.name : o.name);
    const s = o.site ?? e.site ?? site;
    const id = `${s}:${seg}`;
    const where = (v) => (v === 'site' ? s : v);
    const own = e.label.includes('<') ? seg.replace(/^knob-/, '') : e.label;
    bay.addNode({ id, kind: e.kind, label: pick(label, seg, id) ?? o.label ?? own, place: where(e.place ?? 'browser'),
      ...(e.net ? { net: where(e.net) } : {}) });
    added.nodes.push(id);
    const want = (pname) => {
      const key = `${seg}:${pname}`, pid = `${id}:${pname}`;
      return { d: pick(deliver, key, pid), x: pick(ports, key, pid) };
    };
    const add = (pname, p, d, x) => {
      const { optional, repeat, ...fields } = p;
      const port = bay.addPort({ id: `${id}:${pname}`, ...portOf(pname.replace(/-\d+$/, ''), p), ...fields, ...(x || {}), ...(d ? { deliver: d } : {}) });
      added.ports.push(port.id);
    };
    for (const [pname, p] of Object.entries(e.ports)) {
      const { d, x } = want(pname);
      if (!p.optional || d || x) add(pname, p, d, x);
      if (!p.repeat) continue;
      for (const k of [...Object.keys(ports), ...Object.keys(deliver)]) {
        const m = k.match(new RegExp(`^(?:${id}|${seg}):(${pname}-(\\d+))$`));
        if (m && !added.ports.includes(`${id}:${m[1]}`)) { const w = want(m[1]); add(m[1], p, w.d, w.x); }
      }
    }
  }
  // A deliver, label or override naming nothing here is a typo that would
  // otherwise leave a port silently unwired.
  for (const [tag, map, what] of [['d', deliver, 'deliver'], ['l', label, 'label'], ['p', ports, 'ports']]) {
    for (const k of Object.keys(map)) {
      if (used.has(`${tag} ${k}`)) continue;
      throw new Error(`nodes: ${what} names ${JSON.stringify(k)}, which none of ${names.length} nodes from ${CATALOGUE} has`);
    }
  }
  return added;
}

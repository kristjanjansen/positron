// demo/concepts/list.mjs: every concept page, in teaching order. The index draws
// its cards from it and each page's prev / next links walk it, so a new page is
// one row here. `n` is `<group>/<number>`, the folder under demo/concepts/ and
// the URL, /concepts/synth/000/ (asked 2026-10-11, *"/concepts/group/0x"*, three
// digits counting in tens inside a group, old URLs dead). The group places a
// card under its heading on the index, in the order the groups first appear
// here; prev and next walk this order. There is no page per group.
export const CONCEPTS = [
  // room/040 Patch from words is off the index since 2026-10-10 (*"hide concepts/001 now"*);
  // the page stays at /concepts/room/040/.
  { n: 'synth/000', title: 'Keyboard', say: 'The on-screen keyboard, or a MIDI keyboard when one is plugged in, patched to a sine synth.' },
  { n: 'synth/010', title: 'Recorder', say: 'The keyboard and synth with a recorder you can play back.' },
  { n: 'synth/020', title: 'Timeline', say: 'The recorder on the kit transport bar and timeline.' },
  { n: 'synth/030', title: 'Dot piano', say: 'The same notes drawn by a shader and by C firmware on an emulated Pico.' },
  { n: 'synth/040', title: 'Synth', say: 'A WebAudio synth built one patched module at a time.' },
  { n: 'synth/060', title: 'Yoshimi', say: 'The keyboard and knobs playing Yoshimi on the Raspberry Pi in another building.' },
  { n: 'synth/070', title: 'Circuit', say: 'The keyboard and a patch selector playing the Novation Circuit plugged into the Raspberry Pi.' },
  { n: 'synth/080', title: 'Faust synth', say: 'A Faust synth voice played from the keyboard with every parameter a knob of its own.' },
  { n: 'synth/090', title: 'Collide synth', say: 'A small SuperCollider program played from the keyboard with two knobs, bright and decay.' },
  { n: 'synth/100', title: 'Collide on Pi', say: 'The same SuperCollider voice played in this tab and on the Raspberry Pi side by side, the Pi simulated for now.' },
  { n: 'synth/110', title: 'Plaits synth', say: 'Emilie Gillet\'s Plaits in this tab, played from a patch picker with timbre and morph on the patchbay.' },
  { n: 'synth/120', title: 'Plaits panel', say: 'The same Plaits voice played from the keyboard, with every one of its controls a knob on the patchbay.' },
  // draw, after synth because its first page is the synth/040 voice under a pad
  // (asked 2026-10-12, *"make draw concept group and move xy concept and draw demo
  // there"*). draw/000 was synth/050 until then; /concepts/synth/050/ forwards.
  { n: 'draw/000', title: 'XY filter', say: 'The synth with an XY pad that sweeps its filter.' },
  { n: 'radio/000', title: 'Radio', say: 'Two stations on one crossfader, patched from the stations to the speakers.' },
  { n: 'radio/010', title: 'Tuner', say: 'Four stations and a noise source tuned through one crackly AM dial.' },
  { n: 'radio/020', title: 'Tempo', say: 'Recordings of Raadio 2, Raadio 4 and Ida played from our own bucket into a tempo detector.' },
  { n: 'radio/030', title: 'Live tempo', say: 'The same tempo detector listening to live Raadio 2, Raadio 4 and Ida through our relay.' },
  { n: 'radio/040', title: 'Live key', say: 'The live stations into a key detector that shows their key on a keyboard you can play along on.' },
  { n: 'video/000', title: 'Camera', say: 'The local camera patched to a picture on this page.' },
  { n: 'video/010', title: 'Camera shader', say: 'The local camera beside the same picture through a two tone dither shader.' },
  { n: 'video/020', title: 'Camera recorder', say: 'The local camera recorded for up to ten seconds into this browser and played back on a timeline.' },
  { n: 'video/030', title: 'Camera loopback', say: 'The local camera beside the same picture after a round trip through Cloudflare Stream by WHIP and back by WHEP.' },
  { n: 'video/040', title: 'TV', say: 'ETV and ETV2 live through one crossfader into a single dithered picture.' },
  { n: 'shader/000', title: 'Mirror shader', say: 'The kaleidoscope from /mirror/ running in this tab with only the number of mirrors left to turn.' },
  { n: 'shader/010', title: 'Shader on Pi', say: 'The mirror shader drawn in this tab and on the Raspberry Pi, the Pi simulated until it is reachable.' },
  { n: 'device/000', title: 'Pico router', say: 'The keyboard plays a sine synth through an emulated Pico whose screen shows each note crossing it.' },
  { n: 'room/000', title: 'Chat', say: 'A multi-user chat built from patchbay blocks.' },
  // room/001 Chat UI removed 2026-10-12 (*"001room rm it"*); room/002 keeps the frame.
  { n: 'room/002', title: 'Chat UI wired', say: 'The chat window wired to the patchbay, so tabs in one room talk to each other.' },
  { n: 'room/003', title: 'Broadcast chat', say: 'The chat window with the first one in the room broadcasting to everybody in a column of its own.' },
  { n: 'room/004', title: 'Chat timeline', say: 'The broadcast chat with a timeline that plays the room\'s history back until you join.' },
  // room/010 History and room/020 Admin removed 2026-10-11 (*"rm room 010 020
  // 030. since we cover it right?"*): room/004 keeps the history, room/003 the
  // admin. Their pages are in git history before that commit.
  // room/030 Broadcast removed 2026-10-12 (*"rm 030room"*); video/030 keeps the WHIP and WHEP round trip.
  { n: 'typist/000', title: 'Paper', say: 'A sheet of white paper you can type on.' },
  { n: 'typist/010', title: 'Typewriter', say: 'The same paper with a real typewriter sounding every key.' },
  { n: 'typist/020', title: 'Typewriters', say: 'The same typewriter through an fx box that turns every number into a different machine.' },
  { n: 'typist/030', title: 'Playback', say: 'One paper whose typing is kept on a timeline and played back from the first key to the last.' },
  { n: 'typist/040', title: 'Multi typer', say: 'Up to six papers typing sample texts side by side, each through a typewriter of its own.' },
  { n: 'sampler/000', title: 'Sampler', say: 'A SuperCollider piano and Rhodes behind a looper you start, overdub and stop with the sustain pedal.' },
  // sampler/010, 020 and 040 merged into 000 2026-10-12 (*"merge 000 and 010 with sc piano (and put it looper too)"*); their URLs 404 (no forwarding).
  // sampler/015 Sustain debugger archived 2026-10-12 (*"arcive/move to md the sampler015"*): archive/concepts/sampler-015.md.
  { n: 'sampler/030', title: 'Pi piano', say: 'The piano and Rhodes sampler running on the Raspberry Pi, heard back over the relay or a direct path with the time from key to sound read out.' },
  { n: 'clock/000', title: 'Lag', say: 'The keyboard plays a synth over the relay and every note shows how long it took to arrive.' },
  { n: 'clock/010', title: 'Scheduling', say: 'One pattern played by a timer that wakes up and plays, and by the sound card told each note\'s time in advance, with how late each lands.' },
  { n: 'clock/020', title: 'Shared clock', say: 'Two places agree on the time once and then play the same beat with nothing sent per beat.' },
  // misc, last (asked 2026-10-11, *"move bay and tutorial to last misc group"*):
  // bay/000, bay/010 and tutorial/000 until then, those URLs now 404.
  // misc/000 Announce and misc/010 Mirror archived 2026-10-12 (*"archve/md misc 000 and 010"*): archive/concepts/misc-000.md, misc-010.md.
  // misc/020 Tutorial slide moved to /archive/ 2026-10-12 (*"make "/arhive" page and move
  // csound and tutotial slide there"*): the page stays deployed, its card is on
  // /archive/ (demo/archive/index.html), and misc has no concept page left.
];

// The front page's demos on this index (asked 2026-10-12, *"inegrate fronpage
// index and concepts, prefering the latter"*). Every listed, built row of
// DEMOS in demo/manifest.mjs is here once, under a GROUP. A concept group puts
// it beside the concept pages as a demo card; a group in CASE_GROUPS puts it
// below them as a use case card. Moving a demo between the two is changing its
// group, one word. Kept out of CONCEPTS on purpose, so nav.mjs's pager walks
// the concept pages only. `say` is the card's short line; the manifest's `one`
// stays the front page's. `supersededBy: '<group>/<number>'` marks a concept
// like demo whose idea a concept page now shows (asked 2026-10-12, *"add label
// "no needed" on conceptlike demo boxes that are superceded by simular/newer
// concept"*): its card reads `not needed` and names that page. Delete the field
// to take the label off.
export const CONCEPT_GROUPS = ['synth', 'draw', 'radio', 'video', 'shader', 'streaming', 'device', 'room', 'typist', 'sampler', 'clock'];
export const CASE_GROUPS = ['archives', 'performances', 'stations', 'instruments'];
export const DEMO_CARDS = {
  // concept like: one mechanism or technology each
  // csound is on /archive/ since 2026-10-12, unlisted in the manifest and off this index.
  fau: { group: 'synth', say: 'A synth typed in Faust and compiled as you type.', supersededBy: 'synth/080' },
  collide: { group: 'synth', say: 'A synth typed in a small SuperCollider and compiled as you type.', supersededBy: 'synth/090' },
  muta: { group: 'synth', say: 'Eight voices of the Plaits firmware compiled to WebAssembly.', supersededBy: 'synth/120' },
  mirror: { group: 'shader', say: 'One shader drawn by this browser and by a Raspberry Pi.', supersededBy: 'shader/010' },
  llhls: { group: 'streaming', say: 'The tuned low latency HLS player against a live input.' },
  webrtc: { group: 'streaming', say: 'The same live picture delivered over WHEP.', supersededBy: 'video/030' },
  moq: { group: 'streaming', say: 'A test picture sent from this browser over MoQ and back.' },
  cam: { group: 'streaming', say: 'One webcam beside what comes back over WebRTC, MoQ and LL-HLS.' },
  flipper: { group: 'streaming', say: 'ETV and ETV2 live, each over a line ending at the present.' },
  capture: { group: 'streaming', say: 'Recording what came over a link, near or far.' },
  circuit: { group: 'device', say: 'A Novation Circuit on screen, moving when the real one moves.' },
  evo: { group: 'device', say: 'An Evolution MK-425C on screen, moving when the real one moves.' },
  twelve: { group: 'device', say: 'A TASCAM Model 12 on screen, moving when the real one moves.' },
  dump: { group: 'device', say: 'Every message an instrument sends, as raw bytes and a reading.' },
  pack: { group: 'device', say: 'The patches, sessions and samples inside a Circuit pack.' },
  wire: { group: 'room', say: 'A message as the bytes that travel and how late it lands.', supersededBy: 'clock/000' },
  patchbay: { group: 'room', say: 'One patchbay linking notes, sound, video and code to the Pi.' },
  // typist, the front page demo, archived 2026-10-12 (*"archive/mdfy typist"*): archive/typist.md.
  nola: { group: 'sampler', say: 'A piano and a Rhodes from one keyboard over a roll of chords.', supersededBy: 'sampler/000' },
  tom: { group: 'sampler', say: 'A 16 step grid playing the samples out of a pack.' },
  time: { group: 'clock', say: 'The clock every page runs on and what is built on it.', supersededBy: 'clock/010' },
  sync: { group: 'clock', say: 'Four ways two places agree on when something happens.' },
  draw: { group: 'draw', say: 'A line drawn by hand, recorded against the clock.' },
  // use cases: actual content, played with the wiring in view
  reel: { group: 'archives', say: 'Every 1965 newsreel in ERR\'s archive on one line of days.' },
  floor: { group: 'archives', say: 'Every 1965 newsreel face up on a floor you walk over.' },
  resources: { group: 'archives', say: 'Every reachable source for Erkki Kurenniemi\'s work.' },
  tapes: { group: 'archives', say: 'Every Kurenniemi recording laid end to end as one tape.' },
  making: { group: 'archives', say: 'What outlived MIMproject\'s own website.' },
  partitur: { group: 'performances', say: 'Moholy-Nagy\'s 1924 score played as a timeline.' },
  held: { group: 'performances', say: 'Held in Human played back from its own score.' },
  stage: { group: 'performances', say: 'A 2011 MIMproject church scene broadcast live.' },
  weight: { group: 'performances', say: 'One sentence broken across four walls.' },
  radio: { group: 'stations', say: 'Six live stations granulated by hand or by sliders.' },
  videoradio: { group: 'stations', say: 'A radio station fed through a granulator.' },
  knobs: { group: 'instruments', say: 'A synthesizer on a Raspberry Pi in another building.' },
  away: { group: 'instruments', say: 'A Novation Circuit in another building, played and heard.' },
  shape: { group: 'instruments', say: 'A Circuit\'s sound edited while it plays.' },
  wish: { group: 'instruments', say: 'Say which instrument plays which and a model wires it.' },
};

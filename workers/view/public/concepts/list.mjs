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
  { n: 'synth/000', title: 'Keyboard', say: 'Play a sine synthesizer from the on-screen keys or a MIDI keyboard plugged into this computer.' },
  { n: 'synth/010', title: 'Recorder', say: 'Record what you play and play it back, every note in a table with its time, velocity and length.' },
  { n: 'synth/020', title: 'Timeline', say: 'The same recorder drawn on a timeline, so a take shows as notes in time and plays from its start.' },
  { n: 'synth/030', title: 'Dot piano', say: 'Each note draws an arc on a ring, by a shader in this tab and by C firmware on an emulated Pico.' },
  { n: 'synth/040', title: 'Synth', say: 'A synth built one module at a time, from a bare sine to a filter, an envelope and an LFO.' },
  { n: 'synth/060', title: 'Yoshimi', say: 'Play Yoshimi on a Raspberry Pi in another building and see how long each key takes to sound here.' },
  { n: 'synth/070', title: 'Circuit', say: 'Play the Novation Circuit plugged into the Raspberry Pi and pick any of its 64 synth patches.' },
  { n: 'synth/080', title: 'Faust synth', say: 'A Faust synth voice compiled in this tab on your first key, with a knob for each of its parameters.' },
  { n: 'synth/090', title: 'Collide synth', say: 'Play a small SuperCollider program from the keys and edit its code, recompiled when you stop typing.' },
  { n: 'synth/100', title: 'Collide on Pi', say: 'Play one SuperCollider program in this tab and on the Raspberry Pi at once, crossfading the two.' },
  { n: 'synth/110', title: 'Plaits synth', say: 'Emilie Gillet\'s Plaits plays one looping four note line, and a patch picker changes only the sound.' },
  { n: 'synth/120', title: 'Plaits panel', say: 'The same Plaits voice played from the keys or a MIDI keyboard, with all ten controls as knobs.' },
  // draw, after synth because its first page is the synth/040 voice under a pad
  // (asked 2026-10-12, *"make draw concept group and move xy concept and draw demo
  // there"*). draw/000 was synth/050 until then; /concepts/synth/050/ forwards.
  { n: 'draw/000', title: 'XY filter', say: 'Drag the pad over a held note. Left to right opens the filter, bottom to top raises its resonance.' },
  { n: 'radio/000', title: 'Radio', say: 'Listen to Vikerraadio and Ida Radio Tallinn live and blend between them on a crossfader.' },
  { n: 'radio/010', title: 'Tuner', say: 'Turn one dial across four live stations, as on an old AM set, with noise and a whistle in between.' },
  { n: 'radio/020', title: 'Tempo', say: 'Find the tempo of recordings of Raadio 2, Raadio 4 and Ida, with the beats it hears on the wave.' },
  { n: 'radio/030', title: 'Live tempo', say: 'The same tempo detector on Raadio 2, Raadio 4 or Ida live, one station at a time through our relay.' },
  { n: 'radio/040', title: 'Live key', say: 'Hear a live station, see the key a detector finds in it lit on a keyboard, and play along in it.' },
  { n: 'video/000', title: 'Camera', say: 'Turn on your camera and see it on the page while the patchbay holds the link from camera to screen.' },
  { n: 'video/010', title: 'Camera shader', say: 'Your camera beside itself through a two tone dither shader, with one knob for how coarse it is.' },
  { n: 'video/020', title: 'Camera recorder', say: 'Record up to ten seconds of your camera and play it back on a timeline, kept in this browser.' },
  { n: 'video/030', title: 'Camera loopback', say: 'Your camera back from Cloudflare over WebRTC and LL-HLS beside the original, each delay timed.' },
  { n: 'video/050', title: 'MoQ loopback', say: 'Your camera over MoQ to Cloudflare\'s relay and back beside the original, with the delay timed.' },
  // video/040 TV moved to /archive/ 2026-10-12 (*"arhice https://positron.studio/concepts/video/040/"*).
  { n: 'shader/000', title: 'Mirror shader', say: 'The kaleidoscope from /mirror/ with one knob for its mirrors, and code that recompiles as you edit.' },
  { n: 'shader/010', title: 'Shader on Pi', say: 'The same kaleidoscope in this tab and on the Raspberry Pi, each change timed to its first frame.' },
  // device/000 Pico router moved to /archive/ 2026-10-12 (*"archive https://positron.studio/concepts/device/000/"*).
  { n: 'room/000', title: 'Chat', say: 'A chat built from nothing but patchbay links, every line crossing the room along a link you can see.' },
  // room/001 Chat UI removed 2026-10-12 (*"001room rm it"*); room/002 keeps the frame.
  { n: 'room/002', title: 'Chat UI wired', say: 'The same chat in a proper chat window, with the patchbay still doing the wiring underneath.' },
  { n: 'room/003', title: 'Broadcast chat', say: 'Whoever joins first is admin and broadcasts in a column of their own while the rest chat beside.' },
  { n: 'room/004', title: 'Chat timeline', say: 'The broadcast chat with a memory: until you join, the room\'s last fifty lines replay at their pace.' },
  // room/010 History and room/020 Admin removed 2026-10-11 (*"rm room 010 020
  // 030. since we cover it right?"*): room/004 keeps the history, room/003 the
  // admin. Their pages are in git history before that commit.
  // room/030 Broadcast removed 2026-10-12 (*"rm 030room"*); video/030 keeps the WHIP and WHEP round trip.
  { n: 'typist/000', title: 'Paper', say: 'A sheet of white paper to type on, with a blocky cursor and a page that opens full screen.' },
  { n: 'typist/010', title: 'Typewriter', say: 'The same paper, now sounding like a Hermes Precisa 305 typewriter, bell and all.' },
  { n: 'typist/020', title: 'Typewriters', say: 'The typewriter through an effects box where every number gives a different machine.' },
  { n: 'typist/030', title: 'Playback', say: 'Everything you type, deletions included, is kept and played back as the page writes itself again.' },
  { n: 'typist/040', title: 'Multi typer', say: 'Up to six papers typed at once from a written score, each through a typewriter of its own.' },
  { n: 'sampler/000', title: 'Sampler', say: 'A grand piano and a Rhodes on SuperCollider, looped by the sustain pedal with no tempo and no grid.' },
  // sampler/010, 020 and 040 merged into 000 2026-10-12 (*"merge 000 and 010 with sc piano (and put it looper too)"*); their URLs 404 (no forwarding).
  // sampler/015 Sustain debugger archived 2026-10-12 (*"arcive/move to md the sampler015"*): archive/concepts/sampler-015.md.
  { n: 'sampler/030', title: 'Pi piano', say: 'The same piano and Rhodes played by the Pi in another building, over the relay or a direct link.' },
  { n: 'rhythm/000', title: 'Drum machine', say: 'Four SuperCollider drums on 16 steps, each on a patchbay wire that silences it when taken away.' },
  { n: 'rhythm/010', title: 'Drum knobs', say: 'The same drum machine with a knob and a scope for each drum, heard from the next hit.' },
  { n: 'rhythm/020', title: 'Sample drums', say: 'The drum machine playing samples from a default kit, or from a Circuit pack or WAVs you drop on it.' },
  { n: 'rhythm/030', title: 'Drums on the Pi', say: 'Play one drum pattern in this tab and on the Raspberry Pi at the same moment, and crossfade the two.' },
  { n: 'rhythm/050', title: 'Camera drums', say: 'Point your camera and its picture plays as a 16 by 9 drum pattern, where brighter areas play busier.' },
  // clock, renumbered 2026-10-12 (*"do a cricical read on clock concepts. order it in a way it makes sense (simper -> complex, local -> remote) etc. reduce number if needed. clearer titles and descs"*):
  // one machine first, then the relay, then two places on one clock. Old 070 Join late merged into Shared clock;
  // old 040 Follow is archived at /archive/clock-follow/. The old numbers 404 (no forwarding).
  { n: 'clock/000', title: 'Scheduling', say: 'A JavaScript timer and the sound card play one rhythm. Make the page busy and the timer lands late.' },
  { n: 'clock/010', title: 'Message lag', say: 'Play a synth through our relay and see how long each note took to arrive, timed on one clock.' },
  { n: 'clock/020', title: 'Audio cushion', say: 'A test tone over the relay waits in a cushion you set from 20 to 300 ms, trading delay for dropouts.' },
  { n: 'clock/030', title: 'Shared clock', say: 'Two places in this tab, one clock set wrong on purpose, agree the time once and then share one beat.' },
  // clock/040 MIDI clock and clock/050 Clock drift moved to /archive/ 2026-10-12 (*"still too many clock demos, i can not distinguish"*, *"move less relevant to archive"*).
  // clock/060 Play together and clock/070 Replay moved to /archive/ 2026-10-12 (*"arvhice http://127.0.0.1:8890/concepts/clock/060/ http://127.0.0.1:8890/concepts/clock/070/"*).
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
export const CONCEPT_GROUPS = ['synth', 'draw', 'radio', 'video', 'shader', 'streaming', 'device', 'room', 'typist', 'sampler', 'rhythm', 'clock'];
export const CASE_GROUPS = ['archives', 'performances', 'stations', 'instruments'];
export const DEMO_CARDS = {
  // concept like: one mechanism or technology each
  // csound is on /archive/ since 2026-10-12, unlisted in the manifest and off this index.
  fau: { group: 'synth', say: 'A synth you write in Faust, compiled in this tab whenever you stop typing.', supersededBy: 'synth/080' },
  collide: { group: 'synth', say: 'A synth you write in a small subset of SuperCollider, compiled in this tab whenever you stop typing.', supersededBy: 'synth/090' },
  muta: { group: 'synth', say: 'Emilie Gillet\'s Plaits firmware compiled unmodified to WebAssembly, eight voices played over MIDI.', supersededBy: 'synth/120' },
  mirror: { group: 'shader', say: 'A kaleidoscope drawn by this browser and by a Raspberry Pi side by side, or hung in a headset.', supersededBy: 'shader/010' },
  llhls: { group: 'streaming', say: 'A live test picture over low latency HLS, counting how far behind it plays, its stalls and switches.' },
  webrtc: { group: 'streaming', say: 'The same live test picture delivered over WebRTC by WHEP, with the network ping and route shown.', supersededBy: 'video/030' },
  moq: { group: 'streaming', say: 'A test picture sent to Cloudflare\'s MoQ relay and back, its glass to glass delay read off a clock.' },
  cam: { group: 'streaming', say: 'Your webcam beside what comes back over WebRTC, MoQ and LL-HLS, each with its glass to glass delay.' },
  // flipper archived 2026-10-12 (*"archive flipper"*): archive/demos/flipper-index.html.
  capture: { group: 'streaming', say: 'Four ways of keeping what came over a link, from takes recorded end to end to what a receiver got.' },
  // circuit, evo, twelve and pack archived 2026-10-12 (*"arvhice circuit pack evo twelev to their own group"*):
  // still served at their URLs, listed on /archive/ under devices.
  dump: { group: 'device', say: 'Every message a MIDI instrument plugged in here sends, as raw bytes beside a plain reading.' },
  // wire and patchbay archived 2026-10-12 (*"archive wire and patchbay"*): still served, listed on /archive/.
  // typist, the front page demo, archived 2026-10-12 (*"archive/mdfy typist"*): archive/typist.md.
  nola: { group: 'sampler', say: 'A piano and a 1977 Rhodes from one keyboard, over chords you type in or teach it by playing.', supersededBy: 'sampler/000' },
  tom: { group: 'rhythm', say: 'Drop a Circuit pack or a set of samples and its sounds become the rows of a 16 step grid.' },
  time: { group: 'clock', say: 'The clock every page here runs on, in five tabs from scheduling to dates two thousand years long.', supersededBy: 'clock/000' },
  sync: { group: 'clock', say: 'Four ways two places agree when something happens, from on arrival to lined up after on a recording.', supersededBy: 'clock/030' },
  draw: { group: 'draw', say: 'Draw a line and play it back from a recording, to see how much of the gesture playback has to guess.' },
  // use cases: actual content, played with the wiring in view
  reel: { group: 'archives', say: 'A year of ERR\'s AK filmikroonika, each silent film played with that day\'s radio where it survives.' },
  floor: { group: 'archives', say: 'ERR\'s 1965 newsreels face up as a floor with no edge, to walk over in the browser or in a headset.' },
  resources: { group: 'archives', say: 'Every source for Erkki Kurenniemi\'s work that could be reached, with its date, holder and licence.' },
  tapes: { group: 'archives', say: 'Every Erkki Kurenniemi recording that still plays, end to end, each block as long as its recording.' },
  making: { group: 'archives', say: 'What survives of MIMproject without its website: 26 videos from 2008 to 2018 and recovered pictures.' },
  partitur: { group: 'performances', say: 'László Moholy-Nagy\'s 1924 score sketch for a mechanical variety act, played as a timeline.' },
  held: { group: 'performances', say: 'Held in Human, a 2024 mixed reality piece, played back from its own score across its eight scenes.' },
  stage: { group: 'performances', say: 'A church scene from MIMproject\'s 2011 MIM goes Sustainable, run live from a control room.' },
  weight: { group: 'performances', say: 'One sentence, "If these walls could talk", round four walls, each word as big as it is short.' },
  radio: { group: 'stations', say: 'Eight live radio stations from Tallinn and Helsinki, broken into grains by hand or by sliders.' },
  videoradio: { group: 'stations', say: 'A live radio station playing itself through a granulator, looping a few seconds of what is on air.' },
  knobs: { group: 'instruments', say: 'Yoshimi on a Raspberry Pi in another building, played from the keys here and heard over the relay.' },
  away: { group: 'instruments', say: 'A Novation Circuit on a desk in another building, played from this page and heard back through a Pi.' },
  shape: { group: 'instruments', say: 'Edit a Novation Circuit\'s sound as it plays, plugged in here or on a Pi in another building.' },
  wish: { group: 'instruments', say: 'Say or type which instrument plays which, and a language model on Cloudflare makes the connection.' },
};

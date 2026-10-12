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
  { n: 'synth/000', title: 'Keyboard', say: 'Play a simple sine synthesizer from the on-screen keys or from a MIDI keyboard plugged into this computer.' },
  { n: 'synth/010', title: 'Recorder', say: 'Record what you play on the keys and play it back. Every note lands in a table with its time, velocity and length.' },
  { n: 'synth/020', title: 'Timeline', say: 'The same recorder drawn on a timeline, so a take shows as notes in time and plays back from its start.' },
  { n: 'synth/030', title: 'Dot piano', say: 'Every note draws an arc on its own ring as the picture turns. The same rings are drawn twice, by a shader in this tab and by C firmware on an emulated Pico screen.' },
  { n: 'synth/040', title: 'Synth', say: 'A synthesizer built up one module at a time, from a bare sine to a filter, an envelope and an LFO. Step through it and hear what each new module and its knobs change.' },
  { n: 'synth/060', title: 'Yoshimi', say: 'Play Yoshimi running on a Raspberry Pi in another building, with filter cutoff and resonance on two knobs. Its sound comes back over the relay, and the time from key to sound is read out.' },
  { n: 'synth/070', title: 'Circuit', say: 'Play the Novation Circuit plugged into the Raspberry Pi and pick any of its 64 synth patches. The patch name is read back from the instrument.' },
  { n: 'synth/080', title: 'Faust synth', say: 'A synth voice written in Faust, compiled in this tab on the first key and played from the keyboard. Each of its ten parameters is a knob.' },
  { n: 'synth/090', title: 'Collide synth', say: 'Play a small SuperCollider program from the keyboard and turn its two knobs, bright and decay. Edit the code and it recompiles when you stop typing.' },
  { n: 'synth/100', title: 'Collide on Pi', say: 'Play one SuperCollider program in this tab and on the Raspberry Pi at once, and crossfade between the two sounds. When no board answers, a copy in this tab stands in for the Pi.' },
  { n: 'synth/110', title: 'Plaits synth', say: 'Emilie Gillet\'s Plaits plays one looping four note line, and a patch picker changes only the sound. Timbre and morph are two knobs.' },
  { n: 'synth/120', title: 'Plaits panel', say: 'Play the same Plaits voice from the keys or a MIDI keyboard, with all ten of its controls on one scrolling row of knobs.' },
  // draw, after synth because its first page is the synth/040 voice under a pad
  // (asked 2026-10-12, *"make draw concept group and move xy concept and draw demo
  // there"*). draw/000 was synth/050 until then; /concepts/synth/050/ forwards.
  { n: 'draw/000', title: 'XY filter', say: 'Press play for a held note and drag across the pad. Left to right opens the filter and bottom to top raises its resonance.' },
  { n: 'radio/000', title: 'Radio', say: 'Listen to Vikerraadio and Ida Radio Tallinn live and move a crossfader to blend between them. Each station draws its own wave as it plays.' },
  { n: 'radio/010', title: 'Tuner', say: 'Turn one dial across four live stations, as on an old AM set. Between stations you hear noise and a whistle, and the neighbours bleed in faintly.' },
  { n: 'radio/020', title: 'Tempo', say: 'Find the tempo of short recordings of Raadio 2, Raadio 4 and Ida, with the beats it hears drawn over the wave. A mix knob thins the music under a click on those beats.' },
  { n: 'radio/030', title: 'Live tempo', say: 'The same tempo detector on Raadio 2, Raadio 4 or Ida as they broadcast, one station at a time through our relay.' },
  { n: 'radio/040', title: 'Live key', say: 'Hear a live station and see the key a detector finds in it, lit on a keyboard. Play along on the keys, or let Autoplay play chords in that key.' },
  { n: 'video/000', title: 'Camera', say: 'Turn on your camera and see it on the page. The picture shows only while the patchbay holds the link from camera to screen.' },
  { n: 'video/010', title: 'Camera shader', say: 'Your camera beside the same picture through a two tone dither shader. One knob sets how coarse the dither is.' },
  { n: 'video/020', title: 'Camera recorder', say: 'Record up to ten seconds of your camera and play it back on a timeline. The take stays in this browser, even after a reload.' },
  { n: 'video/030', title: 'WebRTC loopback', say: 'Send your camera to Cloudflare Stream over WebRTC and watch it come back beside the original for twenty seconds. The two pictures show the delay by eye, and the footer reads the return connection\'s round trip time.' },
  { n: 'video/040', title: 'TV', say: 'ETV and ETV2 live, each in its own picture, crossfaded into one blend shown plain and through a dither.' },
  { n: 'shader/000', title: 'Mirror shader', say: 'The kaleidoscope from /mirror/ with one knob left, the number of mirrors. Its shader code is on the page and recompiles as you edit it.' },
  { n: 'shader/010', title: 'Shader on Pi', say: 'The same kaleidoscope drawn in this tab and on the Raspberry Pi, with each knob turn and code edit timed to the first frame that shows it. When the Pi does not answer, the page simulates it and says so.' },
  { n: 'device/000', title: 'Pico router', say: 'Play a sine synth through a Raspberry Pi Pico running its own C firmware in an emulator. Its small screen shows each note crossing the router, and one toggle sends every note up an octave.' },
  { n: 'room/000', title: 'Chat', say: 'A chat built from nothing but patchbay links. Join from two tabs and every line you type crosses the room along a link you can see.' },
  // room/001 Chat UI removed 2026-10-12 (*"001room rm it"*); room/002 keeps the frame.
  { n: 'room/002', title: 'Chat UI wired', say: 'The same chat in a proper chat window, with the patchbay still doing the wiring underneath. Open it in two tabs to talk between them.' },
  { n: 'room/003', title: 'Broadcast chat', say: 'Whoever joins the room first becomes its admin and broadcasts to everyone in a column of their own. Everyone else reads the broadcast and chats beside it.' },
  { n: 'room/004', title: 'Chat timeline', say: 'The broadcast chat with a memory. Before you join, the room\'s last fifty lines play back on a timeline at the pace they were written, and joining carries on live.' },
  // room/010 History and room/020 Admin removed 2026-10-11 (*"rm room 010 020
  // 030. since we cover it right?"*): room/004 keeps the history, room/003 the
  // admin. Their pages are in git history before that commit.
  // room/030 Broadcast removed 2026-10-12 (*"rm 030room"*); video/030 keeps the WHIP and WHEP round trip.
  { n: 'typist/000', title: 'Paper', say: 'A sheet of white paper to type on, with a blocky cursor and a page that opens full screen.' },
  { n: 'typist/010', title: 'Typewriter', say: 'The same paper, now sounding like a typewriter. Every key, space and return plays a recording of a Hermes Precisa 305, and the bell rings near the end of a line.' },
  { n: 'typist/020', title: 'Typewriters', say: 'The typewriter\'s sound runs through an effects box where a number picks the machine. Every number gives a different typewriter, and a knob sets how far apart they sound.' },
  { n: 'typist/030', title: 'Playback', say: 'Everything you type, deletions included, is kept on a timeline. Play it back and the page writes itself again from the first key to the last, typewriter sounds and all.' },
  { n: 'typist/040', title: 'Multi typer', say: 'Up to six papers typed at once from a written score, each through a typewriter of its own. Press play to hear them fill, or type into any paper yourself.' },
  { n: 'sampler/000', title: 'Sampler', say: 'A grand piano and a Rhodes played on SuperCollider in this tab, from the keys or a MIDI keyboard. The sustain pedal records a loop, overdubs it and clears it, with no tempo and no grid.' },
  // sampler/010, 020 and 040 merged into 000 2026-10-12 (*"merge 000 and 010 with sc piano (and put it looper too)"*); their URLs 404 (no forwarding).
  // sampler/015 Sustain debugger archived 2026-10-12 (*"arcive/move to md the sampler015"*): archive/concepts/sampler-015.md.
  { n: 'sampler/030', title: 'Pi piano', say: 'The same piano and Rhodes played by the Raspberry Pi in another building. Switch between the relay and a direct connection and compare the time from key to sound.' },
  { n: 'rhythm/000', title: 'Drum machine', say: 'Program a 16 step pattern for four drums made in SuperCollider: kick, snare and two hats. Each drum hangs on a wire of its own in the patchbay, and taking a wire away silences that drum.' },
  { n: 'rhythm/010', title: 'Drum knobs', say: 'The same drum machine with a knob and a scope for each drum. Turn the kick\'s pitch, the snare\'s snap, the open hat\'s length or the closed hat\'s brightness and hear it from the next hit.' },
  { n: 'rhythm/020', title: 'Sample drums', say: 'The drum machine playing samples, starting from a default kit. Drop a Circuit pack or your own WAVs on the page to replace it, and set pitch and length for each row.' },
  { n: 'rhythm/030', title: 'Drums on the Pi', say: 'Play one drum pattern in this tab and on the Raspberry Pi at the same moment, and crossfade between the two. When the board does not answer, the Pi side is simulated in this tab.' },
  { n: 'rhythm/050', title: 'Camera drums', say: 'Point your camera and the picture becomes the drum pattern, cut into 16 by 9 squares with one drum for each of the nine rows. Brighter areas play busier, and 2x doubles it to 32 by 18 squares and eighteen drums.' },
  // clock, renumbered 2026-10-12 (*"do a cricical read on clock concepts. order it in a way it makes sense (simper -> complex, local -> remote) etc. reduce number if needed. clearer titles and descs"*):
  // one machine first, then the relay, then two places on one clock. Old 070 Join late merged into Shared clock;
  // old 040 Follow is archived at /archive/clock-follow/. The old numbers 404 (no forwarding).
  { n: 'clock/000', title: 'Scheduling', say: 'One rhythm played twice at two pitches, by a JavaScript timer that wakes up to play and by the sound card told each note\'s time in advance. Make the page busy and the timer\'s notes land tens of milliseconds late while the sound card\'s stay on time.' },
  { n: 'clock/010', title: 'Message lag', say: 'Play a synth through our relay and see how long each note took to arrive. The keys and the synth are two places in this tab, so one clock times the whole trip.' },
  { n: 'clock/020', title: 'Audio cushion', say: 'A test tone crosses the relay in 20 ms pieces and waits in a cushion before it plays. Set the cushion between 20 and 300 ms and hear the trade between delay and dropouts.' },
  { n: 'clock/030', title: 'Shared clock', say: 'Two places in this tab, one with its clock set wrong on purpose, agree the time once over the relay and then play one beat with nothing sent per beat. Press Join while it runs and a third place comes in on the beat.' },
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
  fau: { group: 'synth', say: '`fau/index.html:356`. Still the only editable Faust page, since synth/080 is read only', supersededBy: 'synth/080' },
  collide: { group: 'synth', say: '`collide/index.html:122`', supersededBy: 'synth/090' },
  muta: { group: 'synth', say: '`muta/index.html:384`, `:288`, `:370`, `:124`. No on-screen keyboard', supersededBy: 'synth/120' },
  mirror: { group: 'shader', say: 'A kaleidoscope drawn by this browser and by a Raspberry Pi side by side. Step through its looks, or hang both pictures in a headset.', supersededBy: 'shader/010' },
  llhls: { group: 'streaming', say: '`llhls/index.html:82` readout keys, `:83-87` toggle, `:709` burned clock' },
  webrtc: { group: 'streaming', say: '`webrtc/index.html:62-65` no glass to glass claim on purpose, `:144-152` ping and route', supersededBy: 'video/030' },
  moq: { group: 'streaming', say: '`moq/index.html:24-26` one clock both ends, `:115`, `:381-383`' },
  cam: { group: 'streaming', say: '`cam/index.html:202-213`, `:232` read off the burned clock' },
  flipper: { group: 'streaming', say: '`flipper/index.html:42-57`, `:130-138` loop, `:297-300` schedule lane, `:414` seek. Read, not played' },
  capture: { group: 'streaming', say: '`capture/index.html:98-101` four tabs; `takes.mjs:1-4`, `segments.mjs:1-12`, `roundtrip.mjs:1-5`, `farend.mjs:1-4`' },
  circuit: { group: 'device', say: 'A Novation Circuit drawn on screen that follows the real one when it is plugged into this computer. The page only listens, and nothing is sent back.' },
  evo: { group: 'device', say: 'An Evolution MK-425C keyboard controller drawn control for control. Plug one in and every key, knob and slider you touch lights up here.' },
  twelve: { group: 'device', say: 'A TASCAM Model 12 mixer drawn with only the controls it sends as MIDI in DAW control mode. Plug one in and its faders, pans and transport move with the real ones.' },
  dump: { group: 'device', say: 'Listen to any MIDI instrument plugged into this computer and see every message it sends, as raw bytes beside a plain reading. Clock ticks are counted instead of filling the list.' },
  pack: { group: 'device', say: 'Drop in a Novation Circuit pack or a zip of WAVs to look inside its patches, sessions and samples. The file is read in this browser and a sample plays when you press it.' },
  wire: { group: 'room', say: 'A message shown as the exact bytes it becomes on its way out and back. A second tab plays notes into another browser and shows how late each one lands.', supersededBy: 'clock/010' },
  patchbay: { group: 'room', say: 'Write a link between two ports, say from a keyboard to the Pi\'s Circuit, and the patchbay checks it before it opens. A link that cannot work is refused with the reason, on an example desk or on the studio\'s live one.' },
  // typist, the front page demo, archived 2026-10-12 (*"archive/mdfy typist"*): archive/typist.md.
  nola: { group: 'sampler', say: 'A piano and a 1977 Rhodes played from one keyboard, over a roll of chords you type in or teach it by playing.', supersededBy: 'sampler/000' },
  tom: { group: 'rhythm', say: 'Drop a Circuit pack or a set of samples on the page and its sounds become the rows of a 16 step grid.' },
  time: { group: 'clock', say: 'The clock every page here runs on, shown in five tabs: scheduling, outputs, loops, a score and dates two thousand years long.', supersededBy: 'clock/000' },
  sync: { group: 'clock', say: 'Four ways two places agree on when something happens: on arrival, on a shared clock, by following a late video, and lined up afterwards on a recording.', supersededBy: 'clock/030' },
  draw: { group: 'draw', say: 'Draw a line with a finger or a mouse and play it back from a recording. Fewer samples and less smoothing show how much of the gesture the playback has to guess.' },
  // use cases: actual content, played with the wiring in view
  reel: { group: 'archives', say: 'owner draft corrected, see above. Read, not played' },
  floor: { group: 'archives', say: '`floor/index.html:111-121` 298 films on 300 slots repeated, `:244-248` Run in VR and the window, `:802-820` press plays' },
  resources: { group: 'archives', say: '`resources/index.html:66-70`. The row count is left out, it changes (333 in `corpus.json`, 334 in a comment)' },
  tapes: { group: 'archives', say: '`tapes/index.html:131-136` widths from measured durations, press loads; files from archive.org (`:57`)' },
  making: { group: 'archives', say: '`mimproject.json` 26 items 2008 to 2018; `mimproject-images.json` 63 images from the Wayback Machine; `making/index.html:228`' },
  partitur: { group: 'performances', say: 'owner draft corrected, see above; `partitur/score.mjs:184-190` lanes' },
  held: { group: 'performances', say: '`held-in-human.json` meta (Unity mixed reality, 2024, eight scenes); `held/index.html:484-777` lanes. Authors left out on the owner\'s instruction (`manifest.mjs:291-297`)' },
  stage: { group: 'performances', say: '`mimproject.json` item dated 2011; `stage/index.html:174-188` Audience and Control room, `:11-13`, `:1238` question and answer lanes' },
  weight: { group: 'performances', say: 'owner draft corrected, see above; `:1732-1733` Run in VR and AR, drag on screen' },
  radio: { group: 'stations', say: '`radio/index.html:289-340` EIGHT stations; `:2544-2548` sliders under a saw. ⚠️ the page\'s `what` (`:447`) and the manifest `one` still say six' },
  videoradio: { group: 'stations', say: '`videoradio/index.html:186-191`' },
  knobs: { group: 'instruments', say: '`knobs/index.html:84`, `:408`, `:414`, `:2251`, `:2297`' },
  away: { group: 'instruments', say: '`away/index.html:72-73`, `:182`' },
  shape: { group: 'instruments', say: '`shape/index.html:312`, `:1403-1415` Web MIDI, `:903` panels' },
  wish: { group: 'instruments', say: '`wish/index.html:691-710` Whisper and Llama or Mistral models, `:474-503` Interpret, Hold to talk, answer shown and made' },
};

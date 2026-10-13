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
  // synth/040 Synth removed 2026-10-13 (*"can split https://positron.studio/concepts/synth/040/ apart to
  // different conecepts, do not dupe with existing ones (so only some last steps?). rm 040 later."*). Its
  // sine and freq knob are synth/000's, and its wave knob is the oscillator's own setting rather than a
  // module; its filter, envelope and LFO are 050, 060 and 070. The old URL 404s (no forwarding).
  // 050, 060 and 070 were used before (draw/000, remote/000 and remote/010); those old pages are gone.
  { n: 'synth/050', title: 'Filter', say: 'A sawtooth from the keys through a low-pass filter, with knobs for its cutoff and resonance.' },
  { n: 'synth/060', title: 'Envelope', say: 'Play the keys through an envelope and set how slowly each note fades in and how long it rings on.' },
  { n: 'synth/070', title: 'LFO', say: 'An oscillator too slow to hear moves the filter\'s cutoff, so a held note opens and closes by itself.' },
  { n: 'synth/080', title: 'Faust synth', say: 'A Faust synth voice compiled in this tab on your first key, with a knob for each of its parameters.' },
  { n: 'synth/090', title: 'Collide synth', say: 'Play a small SuperCollider program from the keys and edit its code, recompiled when you stop typing.' },
  { n: 'synth/110', title: 'Plaits synth', say: 'Emilie Gillet\'s Plaits plays one looping four note line, and a patch picker changes only the sound.' },
  { n: 'synth/120', title: 'Plaits panel', say: 'The same Plaits voice played from the keys or a MIDI keyboard, with all ten controls as knobs.' },
  // Asked 2026-10-13: *"rename synth to instruments"*, *"move sampler to instruments"*,
  // *"make granulator its own group"*. A row's `group` sets the heading it shows under;
  // its folder and URL stay where they are, so no address changed.
  { n: 'sampler/000', group: 'synth', title: 'Sampler', say: 'A grand piano and a Rhodes on SuperCollider, looped by the sustain pedal with no tempo and no grid.' },
  { n: 'sampler/060', group: 'granulator', title: 'Granulator', say: 'Our radio recordings granulated in this tab, each grain marked on the wave where it read the sound.' },
  // sampler/050, the Pappus granulator, moved to /archive/ 2026-10-13 when the owner chose the light one (*"but we got rid of pappus?!? 060 ???"*): /archive/pappus/, still working.
  // synth/130 MIDI dump removed 2026-10-13 (*"rm https://positron.studio/concepts/synth/130/"*); /dump/ is not marked not needed any more.
  // remote, after synth (asked 2026-10-13, *"make group remote synths and move pi-playing ones there"*,
  // then *"yea, move them all to remote instruments or stm"*): every concept page that plays on the
  // Raspberry Pi. remote/000 to 050 were synth/060, synth/070, synth/100, sampler/030, rhythm/030 and
  // shader/010 until then; the old URLs 404 (no forwarding), except synth/060 and 070, which are
  // other pages since 2026-10-13 (the split of synth/040).
  // remote/000 Yoshimi archived 2026-10-13 with Yoshimi (*"discard yoshimi"*): archive/concepts/remote-000.md.
  // The gap stays; /concepts/remote/000/ is a 404.
  { n: 'remote/010', title: 'Circuit on Pi', say: 'A Novation Circuit in another building, played from here through its Pi. Keys, MIDI and 8 macros.' },
  { n: 'remote/020', title: 'Collide on Pi', say: 'SuperCollider here and on a Pi in another building at once. Crossfade between the two.' },
  { n: 'remote/030', title: 'Pi piano', say: 'A piano and a Rhodes on a Pi in another building, played from here over the relay or direct.' },
  { n: 'remote/040', title: 'Drums on the Pi', say: 'One drum pattern here and on a Pi in another building at the same moment. Crossfade the two.' },
  { n: 'remote/050', title: 'Shader on Pi', say: 'A kaleidoscope shader here and on a Pi in another building, each change timed to its first frame.' },
  // draw, after synth because its first page is the synth/040 voice under a pad
  // (asked 2026-10-12, *"make draw concept group and move xy concept and draw demo
  // there"*). draw/000 was synth/050 until then; /concepts/synth/050/ is the Filter page since 2026-10-13.
  // draw/000 XY filter moved to /archive/ 2026-10-12 (*"Revert xy changes, archive cy and draw"*), and the draw group with it.
  { n: 'radio/000', title: 'Radio', say: 'Listen to Vikerraadio and Ida Radio Tallinn live and blend between them on a crossfader.' },
  { n: 'radio/010', title: 'Tuner', say: 'Turn one dial across four live stations, as on an old AM set, with noise and a whistle in between.' },
  { n: 'radio/020', title: 'Tempo', say: 'Find the tempo of recordings of Raadio 2, Raadio 4 and Ida, with the beats it hears on the wave.' },
  { n: 'radio/030', title: 'Live tempo', say: 'The same tempo detector on Raadio 2, Raadio 4 or Ida live, one station at a time through our relay.' },
  { n: 'radio/040', title: 'Live key', say: 'Hear a live station, see the key a detector finds in it lit on a keyboard, and play along in it.' },
  { n: 'video/000', title: 'Camera', say: 'Turn on your camera and see it on the page while the patchbay holds the link from camera to screen.' },
  { n: 'video/010', title: 'Camera shader', say: 'Your camera beside itself through a two tone dither shader, with one knob for how coarse it is.' },
  { n: 'video/020', title: 'Camera recorder', say: 'Record up to ten seconds of your camera and play it back on a timeline, kept in this browser.' },
  { n: 'video/030', title: 'WebRTC loopback', say: 'Your camera over WebRTC to Cloudflare Stream and back beside the original, with the delay timed.' },
  // video/060 split out of video/030 2026-10-12 (*"Split hls and webrtc loopbacks"*). Not 040: /archive/ labels the archived TV page `video 040`.
  { n: 'video/060', title: 'LL-HLS loopback', say: 'Your camera to Cloudflare Stream and back as LL-HLS beside the original, with the delay timed.' },
  { n: 'video/050', title: 'MoQ loopback', say: 'Your camera over MoQ to Cloudflare\'s relay and back beside the original, with the delay timed.' },
  // video/040 TV moved to /archive/ 2026-10-12 (*"arhice https://positron.studio/concepts/video/040/"*).
  { n: 'shader/000', title: 'Mirror shader', say: 'A kaleidoscope shader with one knob for its mirrors, and code that recompiles as you edit.' },
  // shader/010 moved to remote/050 2026-10-13 (*"yea, move them all to remote instruments or stm"*); the old URL 404s (no forwarding).
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
  // sampler/010, 020 and 040 merged into 000 2026-10-12 (*"merge 000 and 010 with sc piano (and put it looper too)"*); their URLs 404 (no forwarding).
  // sampler/015 Sustain debugger archived 2026-10-12 (*"arcive/move to md the sampler015"*): archive/concepts/sampler-015.md.
  // sampler/030 moved to remote/030 2026-10-13 (*"yea, move them all to remote instruments or stm"*); the old URL 404s (no forwarding).
  { n: 'rhythm/000', title: 'Drum machine', say: 'Four SuperCollider drums on 16 steps, each on a patchbay wire that silences it when taken away.' },
  { n: 'rhythm/010', title: 'Drum knobs', say: 'The same drum machine with a knob and a scope for each drum, heard from the next hit.' },
  { n: 'rhythm/020', title: 'Sample drums', say: 'Drop a Circuit pack or WAVs and each sample becomes a named row. Drag across the grid to draw hits.' },
  // rhythm/030 moved to remote/040 2026-10-13 (*"yea, move them all to remote instruments or stm"*); the old URL 404s (no forwarding).
  { n: 'rhythm/050', title: 'Camera drums', say: 'Point your camera and its picture plays as a 16 by 9 drum pattern, where brighter areas play busier.' },
  // clock, renumbered 2026-10-12 (*"do a cricical read on clock concepts. order it in a way it makes sense (simper -> complex, local -> remote) etc. reduce number if needed. clearer titles and descs"*):
  // one machine first, then the relay, then two places on one clock. Old 070 Join late merged into Shared clock;
  // old 040 Follow is archived at /archive/clock-follow/. The old numbers 404 (no forwarding).
  { n: 'clock/000', title: 'Scheduling', say: 'A JavaScript timer and the sound card play one rhythm. Make the page busy and the timer lands late.' },
  { n: 'clock/010', title: 'Message lag', say: 'Play a synth through our relay and see how long each note took to arrive, timed on one clock.' },
  { n: 'clock/020', title: 'Audio cushion', say: 'A test tone over the relay waits in a cushion you set from 20 to 300 ms, trading delay for dropouts.' },
  // clock/030 Shared clock moved to /archive/ 2026-10-12 (*"Cut it"*): both places were simulated in one tab.
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
export const CONCEPT_GROUPS = ['synth', 'granulator', 'remote', 'radio', 'video', 'shader', 'room', 'typist', 'sampler', 'rhythm', 'clock'];
// A group's heading on /concepts/ is its slug, unless it is named here. `remote`
// reads as the owner asked for it, *"remote instruments"* (2026-10-13).
export const GROUP_TITLES = { synth: 'instruments', remote: 'remote instruments' };
export const CASE_GROUPS = ['archives', 'performances', 'stations', 'instruments'];
export const DEMO_CARDS = {
  // concept like: one mechanism or technology each
  // csound is on /archive/ since 2026-10-12, unlisted in the manifest and off this index.
  // fau, collide and muta archived 2026-10-13 (*"archve fau collide muta"*): still served, listed on /archive/.
  // mirror, dump and the streaming group (llhls, webrtc, moq, cam, capture) archived 2026-10-13
  // (*"arhcive mirror, streamin group (kill / stop their workers not needed), dump"*): still served, listed on /archive/.
  // flipper archived 2026-10-12 (*"archive flipper"*): archive/demos/flipper-index.html.
  // circuit, evo, twelve and pack archived 2026-10-12 (*"arvhice circuit pack evo twelev to their own group"*):
  // still served at their URLs, listed on /archive/ under devices.
  // wire and patchbay archived 2026-10-12 (*"archive wire and patchbay"*): still served, listed on /archive/.
  // typist, the front page demo, archived 2026-10-12 (*"archive/mdfy typist"*): archive/typist.md.
  // nola archived 2026-10-13 (*"arvhice nola"*): still served, listed on /archive/.
  // tom archived 2026-10-13 (*"archvie tom"*): still served, listed on /archive/.
  // time and sync archived 2026-10-12 (*"archive time and sync demos"*): still served, listed on /archive/.
  // draw archived 2026-10-12 with XY filter: still served, listed on /archive/.
  // use cases: actual content, played with the wiring in view
  reel: { group: 'archives', say: 'A year of ERR\'s AK filmikroonika, each silent film played with that day\'s radio where it survives.' },
  floor: { group: 'archives', say: 'ERR\'s 1965 newsreels face up as a floor with no edge, to walk over in the browser or in a headset.' },
  // resources archived 2026-10-13 (*"archvie resourves"*): still served, listed on /archive/.
  // tapes archived 2026-10-13 (*"archive tapes and deck"*): still served, listed on /archive/.
  // making archived 2026-10-13 (*"archive making"*): still served, listed on /archive/.
  partitur: { group: 'performances', say: 'László Moholy-Nagy\'s 1924 score sketch for a mechanical variety act, played as a timeline.' },
  held: { group: 'performances', say: 'Held in Human, a 2024 mixed reality piece, played back from its own score across its eight scenes.' },
  // stage archived 2026-10-13 (*"archive weight stage"*): still served, listed on /archive/.
  // weight archived 2026-10-13 (*"archive weight stage"*): still served, listed on /archive/.
  // radio archived 2026-10-13 (*"archive wish, away, radio."*): still served, listed on /archive/.
  videoradio: { group: 'stations', say: 'A live radio station playing itself through a granulator, looping a few seconds of what is on air.' },
  // knobs archived 2026-10-13 with Yoshimi: archive/demos/knobs-index.html, /knobs/ is a 404.
  // away archived 2026-10-13 (*"archive wish, away, radio."*): still served, listed on /archive/.
  // shape archived 2026-10-12 (*"archiev shape"*): still served, listed on /archive/ under devices.
  // wish archived 2026-10-13 (*"archive wish, away, radio."*): still served, listed on /archive/.
};

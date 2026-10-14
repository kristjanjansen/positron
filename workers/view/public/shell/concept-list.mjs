// demo/shell/concept-list.mjs: every concept page, in teaching order. The front
// page (demo/index.html) draws its cards from it and each page's prev / next
// links walk it, so a new page is one row here.
// 🔴 `id` IS `<group>/<slug>`, THE FOLDER UNDER demo/ AND THE URL, /synth/keyboard/,
// SINCE 2026-10-13: *"when all is done, move concepts to frontpage ... rename all
// with group/slug, rm numbers"*. It was `n`, `<group>/<number>` under /concepts/
// (asked 2026-10-11, *"/concepts/group/0x"*), and every one of those addresses is
// a 404 now, with no forwarding (positron-concepts). No number is shown anywhere
// a visitor looks.
// 🔴 THE SLUG IS ONE PLAIN LOWERCASE WORD, SINCE THE SAME EVENING: *"Resolve
// clashes. Avoid dashes on names."* No hyphen, unique in its group, never the
// group's own name (no /granulator/granulator/), and chosen from the title rather
// than spelling it out: Circuit on Pi is /remote/circuit/. The title keeps its
// words. The dashed addresses of that afternoon (/remote/circuit-on-pi/) are 404s,
// no forwarding. demo/shell/concept-list-test.mjs checks all of it.
// The URL group is the folder (CONCEPT_DIRS below); `group` sets the heading a
// card shows under when that is not the folder (`history` shows as archives).
// prev and next walk this order. There is no page per group.
export const CONCEPTS = [
  // room/040 Patch from words is off the index since 2026-10-10 (*"hide concepts/001 now"*);
  // the page stays at /room/words/.
  { id: 'synth/keyboard', title: 'Keyboard', say: 'Play a sine synthesizer from the on-screen keys or a MIDI keyboard plugged into this computer.' },
  { id: 'synth/recorder', title: 'Recorder', say: 'Record what you play and play it back, every note in a table with its time, velocity and length.' },
  { id: 'synth/timeline', title: 'Timeline', say: 'The same recorder drawn on a timeline, so a take shows as notes in time and plays from its start.' },
  // synth/040 Synth removed 2026-10-13 (*"can split https://positron.studio/concepts/synth/040/ apart to
  // different conecepts, do not dupe with existing ones (so only some last steps?). rm 040 later."*). Its
  // sine and freq knob are synth/000's, and its wave knob is the oscillator's own setting rather than a
  // module; its filter, envelope and LFO are 050. The old URL 404s (no forwarding).
  // 050, 060 and 070 were used before (draw/000, remote/000 and remote/010); those old pages are gone.
  { id: 'synth/sound', title: 'Sound design', say: 'One voice from the keys through a filter, an envelope and an LFO, every knob on a wire of its own.' },
  // synth/060 Envelope and synth/070 LFO removed 2026-10-13 into synth/050 Sound design (*"combine
  // filter+envelope+lfo to single sound design concept"*). Their URLs 404 (no forwarding).
  { id: 'code/faust', title: 'Faust synth', say: 'A Faust synth voice compiled in this tab on your first key, with a knob for each of its parameters.' },
  { id: 'code/collide', title: 'Collide synth', say: 'Play a small SuperCollider program from the keys and edit its code, recompiled when you stop typing.' },
  // synth/110 Plaits patches moved to /archive/plaits-patches/ 2026-10-13 (*"arhvie plaits patches"*).
  // Plaits (titled Plaits keys until 2026-10-13, *"rm keys from name"*) and Piano and Rhodes under instruments in code (asked 2026-10-13, *"move plaits keys, sampler to in code instuments"*).
  { id: 'code/plaits', title: 'Plaits', say: 'The same Plaits voice played from the keys or a MIDI keyboard, with all ten controls as knobs.' },
  // Asked 2026-10-13: *"rename synth to instruments"*, *"move sampler to instruments"*,
  // *"make granulator its own group"*. A row's `group` sets the heading it shows under;
  // its folder and URL stay where they are, so no address changed.
  { id: 'code/piano', title: 'Piano and Rhodes', say: 'A grand piano and a Rhodes on SuperCollider, looped by the sustain pedal with no tempo and no grid.' },
  // Dot piano last in its group (asked 2026-10-13, *"dot piano is last in group"*).
  { id: 'synth/dots', title: 'Dot piano', say: 'Each note draws an arc on a ring, by a shader in this tab and by C firmware on an emulated Pico.' },
  { id: 'granulator/grains', title: 'Granulator', say: 'Our radio recordings granulated in this tab, each grain marked on the wave where it read the sound.' },
  // sampler/070 (asked 2026-10-13, *"make followup demo with ida, dub and add tempo detection and feed it into granulator"*).
  { id: 'granulator/beat', title: 'Beat granulator', say: 'The Ida recording granulated on Dub, its echo and grains put on the beat a tempo detector hears.' },
  // sampler/050, the Pappus granulator, moved to /archive/ 2026-10-13 when the owner chose the light one (*"but we got rid of pappus?!? 060 ???"*): /archive/pappus/, still working.
  // synth/130 MIDI dump removed 2026-10-13 (*"rm https://positron.studio/concepts/synth/130/"*); /dump/ is not marked not needed any more.
  // remote, after synth (asked 2026-10-13, *"make group remote synths and move pi-playing ones there"*,
  // then *"yea, move them all to remote instruments or stm"*): every concept page that plays on the
  // Raspberry Pi. remote/000 to 050 were synth/060, synth/070, synth/100, sampler/030, rhythm/030 and
  // shader/010 until then; the old URLs 404 (no forwarding). synth/060 and 070 were briefly
  // the Envelope and LFO pages of the synth/040 split, folded into synth/050 the same day.
  // remote/000 Yoshimi archived 2026-10-13 with Yoshimi (*"discard yoshimi"*): archive/concepts/remote-000.md.
  // The gap stays; /concepts/remote/000/ is a 404.
  { id: 'remote/circuit', title: 'Circuit on Pi', say: 'A Novation Circuit in another building, played from here through its Pi. Keys, MIDI and 8 macros.' },
  { id: 'remote/collide', title: 'Collide on Pi', say: 'SuperCollider here and on a Pi in another building at once. Crossfade between the two.' },
  { id: 'remote/piano', title: 'Piano and Rhodes on Pi', say: 'A piano and a Rhodes on a Pi in another building, played from here over the relay or direct.' },
  // draw, after synth because its first page is the synth/040 voice under a pad
  // (asked 2026-10-12, *"make draw concept group and move xy concept and draw demo
  // there"*). draw/000 was synth/050 until then; /synth/sound/ is Sound design since 2026-10-13.
  // draw/000 XY filter moved to /archive/ 2026-10-12 (*"Revert xy changes, archive cy and draw"*), and the draw group with it.
  { id: 'radio/blend', title: 'Blend', say: 'Listen to Vikerraadio and Ida Radio Tallinn live and blend between them on a crossfader.' },
  { id: 'radio/tuner', title: 'Tuner', say: 'Turn one dial across four live stations, as on an old AM set, with noise and a whistle in between.' },
  { id: 'radio/tempo', title: 'Tempo', say: 'Find the tempo of recordings of Raadio 2, Raadio 4 and Ida, with the beats it hears on the wave.' },
  { id: 'radio/live', title: 'Live tempo', say: 'The same tempo detector on Raadio 2, Raadio 4 or Ida live, one station at a time through our relay.' },
  { id: 'radio/key', title: 'Live key', say: 'Hear a live station, see the key a detector finds in it lit on a keyboard, and play along in it.' },
  // clock/000, 010 and 020 moved to /archive/ 2026-10-13 (*"archvie clock group"*), the clock group with them.
  { id: 'video/camera', title: 'Camera', say: 'Turn on your camera and see it on the page while the patchbay holds the link from camera to screen.' },
  { id: 'video/shader', title: 'Camera shader', say: 'Your camera beside itself through a two tone dither shader, with one knob for how coarse it is.' },
  { id: 'video/recorder', title: 'Camera recorder', say: 'Record up to ten seconds of your camera and play it back on a timeline, kept in this browser.' },
  { id: 'video/webrtc', title: 'WebRTC loopback', say: 'Your camera over WebRTC to Cloudflare Stream and back beside the original, with the delay timed.' },
  // video/060 split out of video/030 2026-10-12 (*"Split hls and webrtc loopbacks"*). Not 040: /archive/ labels the archived TV page `video 040`.
  { id: 'video/llhls', title: 'LL-HLS loopback', say: 'Your camera to Cloudflare Stream and back as LL-HLS beside the original, with the delay timed.' },
  { id: 'video/moq', title: 'MoQ loopback', say: 'Your camera over MoQ to Cloudflare\'s relay and back beside the original, with the delay timed.' },
  // video/040 TV moved to /archive/ 2026-10-12 (*"arhice https://positron.studio/concepts/video/040/"*).
  { id: 'shader/mirror', title: 'Mirror shader', say: 'A kaleidoscope shader with one knob for its mirrors, and code that recompiles as you edit.' },
  // shader/020 and not 010: 010's old address 404s on purpose, so it is not reused for a different page.
  { id: 'shader/landscape', title: 'Scan landscape', say: 'A radio recording drawn as a scan landscape. Six knobs shape the ridges.' },
  // remote/shader moved here as shader/remote 2026-10-13 (*"Move pi shader to remote shaders under shaders"*); the old URL 404s.
  { id: 'shader/remote', title: 'Shader on Pi', say: 'A kaleidoscope shader here and on a Pi in another building, each change timed to its first frame.' },
  // shader/010 moved to remote/050 2026-10-13 (*"yea, move them all to remote instruments or stm"*); the old URL 404s (no forwarding).
  // device/000 Pico router moved to /archive/ 2026-10-12 (*"archive https://positron.studio/concepts/device/000/"*).
  { id: 'room/chat', title: 'Chat', say: 'A chat window whose every line crosses the room along a patchbay link, drawn underneath.' },
  // room/001 Chat UI removed 2026-10-12 (*"001room rm it"*); room/002 keeps the frame.
  // room/window Chat UI wired moved to room/chat 2026-10-13 (*"Move chat ui wired to chat.
  // Rm chat ui wired"*): the patchbay-only chat it replaced is gone, /room/window/ is a 404.
  { id: 'room/broadcast', title: 'Broadcast chat', say: 'Whoever joins first is admin and broadcasts in a column of their own while the rest chat beside.' },
  { id: 'room/history', title: 'Chat timeline', say: 'The broadcast chat with a memory: until you join, the room\'s last fifty lines replay at their pace.' },
  // room/010 History and room/020 Admin removed 2026-10-11 (*"rm room 010 020
  // 030. since we cover it right?"*): room/004 keeps the history, room/003 the
  // admin. Their pages are in git history before that commit.
  // room/030 Broadcast removed 2026-10-12 (*"rm 030room"*); video/030 keeps the WHIP and WHEP round trip.
  { id: 'typist/paper', title: 'Paper', say: 'A sheet of white paper to type on, with a blocky cursor and a page that opens full screen.' },
  { id: 'typist/typewriter', title: 'Typewriter', say: 'The same paper, now sounding like a Hermes Precisa 305 typewriter, bell and all.' },
  { id: 'typist/machines', title: 'Typewriters', say: 'The typewriter through an effects box where every number gives a different machine.' },
  { id: 'typist/playback', title: 'Playback', say: 'Everything you type, deletions included, is kept and played back as the page writes itself again.' },
  { id: 'typist/score', title: 'Multi typer', say: 'Up to six papers typed at once from a written score, each through a typewriter of its own.' },
  // sampler/010, 020 and 040 merged into 000 2026-10-12 (*"merge 000 and 010 with sc piano (and put it looper too)"*); their URLs 404 (no forwarding).
  // sampler/015 Sustain debugger archived 2026-10-12 (*"arcive/move to md the sampler015"*): archive/concepts/sampler-015.md.
  // sampler/030 moved to remote/030 2026-10-13 (*"yea, move them all to remote instruments or stm"*); the old URL 404s (no forwarding).
  { id: 'drums/machine', title: 'Drum machine', say: 'Four SuperCollider drums on 16 steps, each on a patchbay wire that silences it when taken away.' },
  { id: 'drums/knobs', title: 'Drum knobs', say: 'The same drum machine with a knob and a waveform for each drum, heard from the next hit.' },
  { id: 'drums/samples', title: 'Sample drums', say: 'Drop a Circuit pack or WAVs and each sample becomes a named row. Drag across the grid to draw hits.' },
  // rhythm/030 moved to remote/040 2026-10-13 (*"yea, move them all to remote instruments or stm"*); the old URL 404s (no forwarding).
  { id: 'drums/camera', title: 'Camera drums', say: 'Point your camera and its picture plays as a 16 by 9 drum pattern, where brighter areas play busier.' },
  // remote/drums moved here as drums/remote 2026-10-13 (*"Move drums on pi into remote drums"*), and the rhythm group became drums (*"Renamw rythm group into drums"*); the old URLs 404.
  { id: 'drums/remote', title: 'Drums on the Pi', say: 'One drum pattern here and on a Pi in another building at the same moment. Crossfade the two.' },
  // clock, renumbered 2026-10-12 (*"do a cricical read on clock concepts. order it in a way it makes sense (simper -> complex, local -> remote) etc. reduce number if needed. clearer titles and descs"*):
  // one machine first, then the relay, then two places on one clock. Old 070 Join late merged into Shared clock;
  // old 040 Follow is archived at /archive/clock-follow/. The old numbers 404 (no forwarding).
  // clock/030 Shared clock moved to /archive/ 2026-10-12 (*"Cut it"*): both places were simulated in one tab.
  // clock/040 MIDI clock and clock/050 Clock drift moved to /archive/ 2026-10-12 (*"still too many clock demos, i can not distinguish"*, *"move less relevant to archive"*).
  // clock/060 Play together and clock/070 Replay moved to /archive/ 2026-10-12 (*"arvhice http://127.0.0.1:8890/concepts/clock/060/ http://127.0.0.1:8890/concepts/clock/070/"*).
  // archives (asked 2026-10-13, *"make archives concept group. do reel-demo-like patchbay version"*):
  // /reel/ with the newsreel and the radio as two boxes, on /reel/'s line (demo/shell/reel-line.mjs).
  { id: 'history/newsreels', group: 'archives', title: 'Newsreels', say: 'ERR\'s 1965 newsreels on a line, each silent film played with that day\'s surviving radio.' },
  // misc, last (asked 2026-10-11, *"move bay and tutorial to last misc group"*):
  // bay/000, bay/010 and tutorial/000 until then, those URLs now 404.
  // misc/000 Announce and misc/010 Mirror archived 2026-10-12 (*"archve/md misc 000 and 010"*): archive/concepts/misc-000.md, misc-010.md.
  // misc/020 Tutorial slide moved to /archive/ 2026-10-12 (*"make "/arhive" page and move
  // csound and tutotial slide there"*): the page stays deployed, its card is on
  // /archive/ (demo/archive/index.html), and misc has no concept page left. It is
  // /archive/tutorial-slide/ since 2026-10-13, beside the other archived pages.
];

// The folders under demo/ that hold concept pages, and so the first segment of
// their URLs. workers/view/build.mjs deploys each one whole and REFUSES the build
// when one is also a demo slug in demo/manifest.mjs, a file the build lists, or
// a row's id names a folder not here: a concept group may never take over a
// still-served address. The radio concepts were `stations` for one afternoon
// because the archived radio demo still answered at /radio/; asked *"Resolve
// clashes"*, that demo moved to /archive/radio/ and the group took `radio`.
// `room` was the archived /room/ demo until 2026-10-01 (archive/demos/room-index.html);
// /room/ itself stays a 404, only /room/<slug>/ answers. `archive` is not here:
// the tutorial slide moved to /archive/tutorial-slide/ with the archived pages.
export const CONCEPT_DIRS = ['synth', 'code', 'granulator', 'remote', 'radio', 'video', 'shader', 'room', 'typist', 'drums', 'history'];

// The demos on the front page (asked 2026-10-12, *"inegrate fronpage
// index and concepts, prefering the latter"*). Every listed, built row of
// DEMOS in demo/manifest.mjs is here once, under a GROUP. A concept group puts
// it beside the concept pages as a demo card; a group in CASE_GROUPS puts it
// below them as a use case card. Moving a demo between the two is changing its
// group, one word. Kept out of CONCEPTS on purpose, so concept-nav.mjs's pager walks
// the concept pages only. `say` is the card's short line; the manifest's `one`
// stays the front page's. `supersededBy: '<group>/<slug>'`, a concept id, marks a concept
// like demo whose idea a concept page now shows (asked 2026-10-12, *"add label
// "no needed" on conceptlike demo boxes that are superceded by simular/newer
// concept"*): its card reads `not needed` and names that page. Delete the field
// to take the label off.
// room last (asked 2026-10-13, *"move room into last group"*).
export const CONCEPT_GROUPS = ['synth', 'code', 'granulator', 'remote', 'drums', 'radio', 'video', 'shader', 'typist', 'sampler', 'archives', 'room'];
// `archives` is also the first of CASE_GROUPS; as a concept group it keeps the same place on
// the front page (right after rhythm) and its demo rows would draw as demo cards beside /history/newsreels/.
// A group's heading on the front page is its key, unless it is named here. `remote`
// reads as the owner asked for it, *"remote instruments"* (2026-10-13).
// performances shows as timelines (asked 2026-10-13, *"performances = timelines"*).
// Asked 2026-10-13: *"split instruments group into 'building instruments' and
// 'instruments in code'"*: Faust synth and Collide synth, the two whose code is on the page, show under `code`.
// archives shows as history (asked 2026-10-13, *"archives = hisotry"*).
export const GROUP_TITLES = { archives: 'history', synth: 'building instruments', code: 'instruments in code', remote: 'remote instruments', performances: 'timelines' };
export const CASE_GROUPS = ['archives', 'performances', 'stations', 'instruments'];
export const DEMO_CARDS = {
  // kit listed 2026-10-13 (*"Bring kit card to frontpage"*): its own heading, last.
  kit: { group: 'kit', plain: true, title: 'Kit', say: 'Every part these pages are built from, one page per part.' },
  social: { group: 'kit', plain: true, title: 'Social', say: 'Pictures and reels the site makes of itself. Download one and post it.' },
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
  // reel archived 2026-10-13 (*"archive reel and floor"*): still served, listed on /archive/.
  // floor archived 2026-10-13 (*"archive reel and floor"*): still served, listed on /archive/.
  // resources archived 2026-10-13 (*"archvie resourves"*): still served, listed on /archive/.
  // tapes archived 2026-10-13 (*"archive tapes and deck"*): still served, listed on /archive/.
  // making archived 2026-10-13 (*"archive making"*): still served, listed on /archive/.
  // partitur archived 2026-10-13 (*"sorry, archvie partitur again"*): still served, listed on /archive/.
  // held archived 2026-10-13 (*"Move held to archive"*): still served, listed on /archive/.
  held: { group: 'performances', say: 'Held in Human, a 2024 mixed reality piece, played back from its own score across its eight scenes.' },
  // stage archived 2026-10-13 (*"archive weight stage"*): still served, listed on /archive/.
  // weight archived 2026-10-13 (*"archive weight stage"*): still served, listed on /archive/.
  // radio archived 2026-10-13 (*"archive wish, away, radio."*): still served, listed on /archive/.
  // videoradio archived 2026-10-13 (*"archvie videoradio"*): still served, listed on /archive/; its picture lives on as /shader/landscape/.
  // knobs archived 2026-10-13 with Yoshimi: archive/demos/knobs-index.html, /knobs/ is a 404.
  // away archived 2026-10-13 (*"archive wish, away, radio."*): still served, listed on /archive/.
  // shape archived 2026-10-12 (*"archiev shape"*): still served, listed on /archive/ under devices.
  // wish archived 2026-10-13 (*"archive wish, away, radio."*): still served, listed on /archive/.
};

# Card descriptions on /concepts/, rewritten and verified

Status (2026-10-14): done. Applied in commit 593becda to demo/shell/concept-list.mjs, with the rules in .claude/skills/positron-describe/SKILL.md, and later trimmed in bc817a57.

2026-10-12. Asked in the owner's editorial brief (BACKLOG, *"Rewrite every card
description, verified, and a writing skill"*). Every `say` in
`demo/concepts/list.mjs`, both `CONCEPTS` and `DEMO_CARDS`, read against its
page before it was rewritten. The rules the rewrite follows are in
`.claude/skills/positron-describe/SKILL.md`.

**Count, taken from the file and not remembered:** 48 concept rows and 37 demo
cards, 85 in all, on 2026-10-12 after the clock agent archived clock Play
together and Replay (commit 07e0a6ac). Those two had descriptions drafted
before they left; they are kept at the foot in case they return.

**How each was verified.** Every page's source was read, and the line that
backs each claim is named. Headless runs, against the local server only, on
the pages where a claim was about behaviour: device/000 (the emulated Pico
booting and routing), clock/000 (idle and busy), clock/030 (our relay, three
places), rhythm/050 (Chrome's fake camera). Nothing was played from ERR, a
station, archive.org or the real Pi; those claims rest on the code.

**Not applied yet.** list.mjs is applied by the session. Several of these are
two sentences, which is the owner's new shape for a card and supersedes the
CLAUDE.md one sentence rule for `say`; the rule in CLAUDE.md is updated with
the skill.

## Corrections to the owner's drafts

| card | draft | what was wrong | evidence | corrected |
| --- | --- | --- | --- | --- |
| synth/040 Synth | Build a synthesizer by connecting sound modules. Hear how each new connection changes the instrument. | The visitor connects nothing. A step picker loads six fixed patches, the patchbay is a picture, and there is no keyboard (play holds a test tone). | `synth/040/modules.mjs:100-107`, `index.html:53-57`, `:109-118`, `shell/patchbay.mjs:1-13` | A synthesizer built up one module at a time, from a bare sine to a filter, an envelope and an LFO. Step through it and hear what each new module and its knobs change. |
| synth/100 Collide on Pi | Play the same SuperCollider synth in your browser and on a remote Raspberry Pi. Compare the two, or use a simulation when the Pi is offline. | "Use a simulation" reads as a choice. The fallback is automatic, with no switch. "Compare" was vague: the page compares through a crossfader. | `synth/100/index.html:150-202`, `:66-71` | Play one SuperCollider program in this tab and on the Raspberry Pi at once, and crossfade between the two sounds. When no board answers, a copy in this tab stands in for the Pi. |
| video/030 WebRTC loopback | Send your camera through Cloudflare Stream and watch it return beside the original. Compare the delay introduced by the WebRTC round trip. | The page does not measure the delay between the pictures. Its `rtt` cell is the return connection's network round trip only, and a press lasts 20 s. | `video/030/index.html:214-220`, `:48-54` | Send your camera to Cloudflare Stream over WebRTC and watch it come back beside the original for twenty seconds. The two pictures show the delay by eye, and the footer reads the return connection's round trip time. |
| rhythm/050 Camera drums | Turn your camera into a drum sequencer. The brightness of sixteen sections of the picture determines which beats play. | Not sixteen sections: 16 by 9 squares, one drum per row, and 2x makes 32 by 18 with eighteen drums. Brightness passes through a 4x4 dither, so brighter plays busier rather than deciding each beat. | `rhythm/050/index.html:37-69`, `:90-96`, headless run with the fake camera (9 rows, 8 of 9 drums hit within 4 s) | Point your camera and the picture becomes the drum pattern, cut into 16 by 9 squares with one drum for each of the nine rows. Brighter areas play busier, and 2x doubles it to 32 by 18 squares and eighteen drums. |
| clock/000 Scheduling | Play the same rhythm using two timing methods: a JavaScript timer and audio scheduled in advance. Hear the difference and see how late each note arrives. | Nothing arrives: one tab, no relay, the page measures how late a note sounds. On an idle page the timer is at most 3 ms late, so the difference is heard only with the busy switch. The two play at once, at two pitches. | `clock/000/index.html:18-19`, `:115-140`, `:233-236`; run idle worst 3.33 ms, busy worst 42 ms, sound card 0 | One rhythm played twice at two pitches, by a JavaScript timer that wakes up to play and by the sound card told each note's time in advance. Make the page busy and the timer's notes land tens of milliseconds late while the sound card's stay on time. |
| clock/030 Shared clock | Synchronize two computers and start a rhythm on both. They keep playing together without exchanging every beat, and another computer can join while the rhythm is running. | Not computers: three places in one tab, each on its own socket over the real relay, one sound card. The second clock is set wrong on purpose, and the third comes in by a Join button in the same tab. | `clock/030/index.html:16-45`; run: web-2 175 ms fast found as -176, then 1.35 ms apart; web-3 joined 0.55 ms from web-1 | Two places in this tab, one with its clock set wrong on purpose, agree the time once over the relay and then play one beat with nothing sent per beat. Press Join while it runs and a third place comes in on the beat. |
| reel | Explore a year of Estonian newsreels on a single timeline. Every film from 1965 sits on the day it belongs to. | Not every film: one series, AK filmikroonika, with 16 other 1965 films left out on purpose. The day is the day it went out. And it missed the idea: the films were shot silent and play with that day's radio. | `reel/index.html:271-277`, `:296-300`, `:174-179` | A year of Estonian newsreels, ERR's 1965 AK filmikroonika, laid on one line at the days they went out. The films were shot silent, so each one plays with that day's radio where a programme survives. |
| weight | A single sentence stretches across four walls. Move through the space to read it. | You read it by turning round, not by moving through. And it dropped the proposition: each word is as big as it is short. | `weight/index.html:289-296`, `:306-309` | One sentence, "If these walls could talk", set a word at a time across the four walls of a room, so it closes only when you turn all the way round. Each word is as big as it is short, and a word you retype takes the size of its new length. |
| partitur | Explore László Moholy-Nagy's 1924 score as a timeline, turning a historical notation into something that unfolds in time. | The second clause is decoration and slightly false: the score's own key already reads time downward. It missed the WALL tab. | `research/moholy-nagy-partiturskizze-2026-10-04.md` §2, `partitur/index.html:40-45` | László Moholy-Nagy's 1924 score sketch for a mechanical variety act, played as a timeline of its two stages, its light and its sirens. Any other screen can join as the wall its light is thrown on. |

Drafts that held: synth/000 (MIDI input is real, `synth/000/index.html:123-176`; "sine" added) and radio/000 (station names and the per-station waves added).

## synth

| n | title | before | after | verified |
| --- | --- | --- | --- | --- |
| synth/000 | Keyboard | The on-screen keyboard, or a MIDI keyboard when one is plugged in, patched to a sine synth. | Play a simple sine synthesizer from the on-screen keys or from a MIDI keyboard plugged into this computer. | `:34` sine, `:114-117` keys, `:123-176` requestMIDIAccess, one node per input |
| synth/010 | Recorder | The keyboard and synth with a recorder you can play back. | Record what you play on the keys and play it back. Every note lands in a table with its time, velocity and length. | `:112-180` record and play, table columns, rows lit in playback |
| synth/020 | Timeline | The recorder on the kit transport bar and timeline. | The same recorder drawn on a timeline, so a take shows as notes in time and plays back from its start. | `:29-33`, `:153-174` stop rewinds and fits; `:188` `scrub: false, loop: false`, so no scrubbing claimed |
| synth/030 | Dot piano | The same notes drawn by a shader and by C firmware on an emulated Pico. | Every note draws an arc on its own ring as the picture turns. The same rings are drawn twice, by a shader in this tab and by C firmware on an emulated Pico screen. | `:99-105` a ring per pitch, 0.7 rad/s, 3 s fade; `:211-262` rp2040js runs `rig/pico/rings/main.c` |
| synth/040 | Synth | A WebAudio synth built one patched module at a time. | A synthesizer built up one module at a time, from a bare sine to a filter, an envelope and an LFO. Step through it and hear what each new module and its knobs change. | owner draft corrected, see above |
| synth/060 | Yoshimi | The keyboard and knobs playing Yoshimi on the Raspberry Pi in another building. | Play Yoshimi running on a Raspberry Pi in another building, with filter cutoff and resonance on two knobs. Its sound comes back over the relay, and the time from key to sound is read out. | `:32-34` relay both ways, `:63-64` CC 74 and 71, `:140-207` key to sound per press |
| synth/070 | Circuit | The keyboard and a patch selector playing the Novation Circuit plugged into the Raspberry Pi. | Play the Novation Circuit plugged into the Raspberry Pi and pick any of its 64 synth patches. The patch name is read back from the instrument. | `:37-49` program change 0 to 63, a dump request only, nothing writes flash; `:224-260` name from the Circuit's answer |
| synth/080 | Faust synth | A Faust synth voice played from the keyboard with every parameter a knob of its own. | A synth voice written in Faust, compiled in this tab on the first key and played from the keyboard. Each of its ten parameters is a knob. | `:24-46` compiled on first press, `:53-77` ten knobs, `:341` code read only |
| synth/090 | Collide synth | A small SuperCollider program played from the keyboard with two knobs, bright and decay. | Play a small SuperCollider program from the keyboard and turn its two knobs, bright and decay. Edit the code and it recompiles when you stop typing. | `:159-200` editable, recompiles 600 ms after the last key, a failed compile keeps the last good one. The old line missed the editing |
| synth/100 | Collide on Pi | The same SuperCollider voice played in this tab and on the Raspberry Pi side by side, simulated here when no board answers. | Play one SuperCollider program in this tab and on the Raspberry Pi at once, and crossfade between the two sounds. When no board answers, a copy in this tab stands in for the Pi. | owner draft corrected, see above; `:37-47` real board when it answers |
| synth/110 | Plaits synth | Emilie Gillet's Plaits in this tab, played from a patch picker with timbre and morph on the patchbay. | Emilie Gillet's Plaits plays one looping four note line, and a patch picker changes only the sound. Timbre and morph are two knobs. | `:32-61` a fixed A F C G loop, the same notes for every patch; the visitor does not play the notes, which the old line implied |
| synth/120 | Plaits panel | The same Plaits voice played from the keyboard, with every one of its controls a knob on the patchbay. | Play the same Plaits voice from the keys or a MIDI keyboard, with all ten of its controls on one scrolling row of knobs. | `:27-55` keys and MIDI, ten knobs, a patch picker that sets them all |

Card demos in synth:

| slug | before | after | verified |
| --- | --- | --- | --- |
| fau | A synth typed in Faust and compiled as you type. | A synth you write in Faust, compiled in this tab whenever you stop typing. | `fau/index.html:356`. Still the only editable Faust page, since synth/080 is read only |
| collide | A synth typed in a small SuperCollider and compiled as you type. | A synth you write in a small subset of SuperCollider, compiled in this tab whenever you stop typing. | `collide/index.html:122` |
| muta | Eight voices of the Plaits firmware compiled to WebAssembly. | Emilie Gillet's Plaits firmware compiled unmodified to WebAssembly, eight voices played from a MIDI keyboard or a test tone. | `muta/index.html:384`, `:288`, `:370`, `:124`. No on-screen keyboard |

## draw

| n or slug | title | before | after | verified |
| --- | --- | --- | --- | --- |
| draw/000 | XY filter | The synth with an XY pad that sweeps its filter. | Press play for a held note and drag across the pad. Left to right opens the filter and bottom to top raises its resonance. | `:28-34` pad cabled to the filter, `:46-61` x cutoff, y resonance upward, `:94-109` play holds an A2 |
| draw | Draw | A line drawn by hand, recorded against the clock. | Draw a line with a finger or a mouse and play it back from a recording. Fewer samples and less smoothing show how much of the gesture the playback has to guess. | `draw/index.html:85-98` every sample kept beside the thinned record, `:242-255` smoothing, `:976-980` sample every 10 to 300 ms, `:63` readout kept, invented, off by |

## radio

| n | title | before | after | verified |
| --- | --- | --- | --- | --- |
| radio/000 | Radio | Two stations on one crossfader, patched from the stations to the speakers. | Listen to Vikerraadio and Ida Radio Tallinn live and move a crossfader to blend between them. Each station draws its own wave as it plays. | `:54-55` both through the relay, `:74` a wave each, `:231-232` crossfader |
| radio/010 | Tuner | Four stations and a noise source tuned through one crackly AM dial. | Turn one dial across four live stations, as on an old AM set. Between stations you hear noise and a whistle, and the neighbours bleed in faintly. | `:61-64` four stations on the dial, `:126-151` clear band, faint echo band, noise, a whistle near a carrier, `:316` dial |
| radio/020 | Tempo | Recordings of Raadio 2, Raadio 4 and Ida played from our own bucket into a tempo detector. | Find the tempo of short recordings of Raadio 2, Raadio 4 and Ida, with the beats it hears drawn over the wave. A mix knob thins the music under a click on those beats. | `:44-71` three minute recordings in our R2, never reaching ERR; `:109-117`, `:467-486` click and mix; `:196` beat lines |
| radio/030 | Live tempo | The same tempo detector listening to live Raadio 2, Raadio 4 and Ida through our relay. | The same tempo detector on Raadio 2, Raadio 4 or Ida as they broadcast, one station at a time through our relay. | `:46-62` one station open at a time, opened only on play |
| radio/040 | Live key | The live stations into a key detector that shows their key on a keyboard you can play along on. | Hear a live station and see the key a detector finds in it, lit on a keyboard. Play along on the keys, or let Autoplay play chords in that key. | `:97-98`, `:134-137` keys lit, `:196`, `:249-250` keys play a pad, `:265` Autoplay |

## video

| n | title | before | after | verified |
| --- | --- | --- | --- | --- |
| video/000 | Camera | The local camera patched to a picture on this page. | Turn on your camera and see it on the page. The picture shows only while the patchbay holds the link from camera to screen. | `:37-43` nothing leaves the machine, `:104-105` picture follows the link |
| video/010 | Camera shader | The local camera beside the same picture through a two tone dither shader. | Your camera beside the same picture through a two tone dither shader. One knob sets how coarse the dither is. | `:39-48` 4x4 Bayer two tone, `:61-63` one knob, 2 to 16 px |
| video/020 | Camera recorder | The local camera recorded for up to ten seconds into this browser and played back on a timeline. | Record up to ten seconds of your camera and play it back on a timeline. The take stays in this browser, even after a reload. | `:46-49` MediaRecorder into IndexedDB, `:66-70` read back after reload; `:384` `scrub: false`, so no scrubbing claimed |
| video/030 | WebRTC loopback | The local camera beside the same picture after a WebRTC round trip through Cloudflare Stream, up by WHIP and back by WHEP. | Send your camera to Cloudflare Stream over WebRTC and watch it come back beside the original for twenty seconds. The two pictures show the delay by eye, and the footer reads the return connection's round trip time. | owner draft corrected, see above |
| video/040 | TV | ETV and ETV2 live on one crossfader, shown as each channel, a plain blend and a dithered fx blend. | ETV and ETV2 live, each in its own picture, crossfaded into one blend shown plain and through a dither. | `:52-63` raw panels, plain and dithered blends; `:79-82` sound crossfades too. Read, not played |

## shader

| n or slug | title | before | after | verified |
| --- | --- | --- | --- | --- |
| shader/000 | Mirror shader | The kaleidoscope from /mirror/ running in this tab with only the number of mirrors left to turn. | The kaleidoscope from /mirror/ with one knob left, the number of mirrors. Its shader code is on the page and recompiles as you edit it. | `:32-55` one knob 1 to 32, `:162-163` a failed edit keeps the last picture, `:261` compiles when typing stops |
| shader/010 | Shader on Pi | The mirror shader drawn in this tab and on the Raspberry Pi, the Pi simulated until it is reachable. | The same kaleidoscope drawn in this tab and on the Raspberry Pi, with each knob turn and code edit timed to the first frame that shows it. When the Pi does not answer, the page simulates it and says so. | `:62-66` fps and lag both sides, `:334-343` real board or the simulation, footer says which, `:345-353` Pi lag by frame comparison |
| mirror | Mirror | One shader drawn by this browser and by a Raspberry Pi. | A kaleidoscope drawn by this browser and by a Raspberry Pi side by side. Step through its looks, or hang both pictures in a headset. | `mirror/index.html:204`, `:576-580` looks, `:125`, `:138` VR and AR |

## streaming (demo cards)

| slug | before | after | verified |
| --- | --- | --- | --- |
| llhls | The tuned low latency HLS player against a live input. | Start a live test picture and watch it over low latency HLS, with the player tuned to stay near the live edge. The readout counts how far behind it plays, its stalls and its quality switches. | `llhls/index.html:82` readout keys, `:83-87` toggle, `:709` burned clock |
| webrtc | The same live picture delivered over WHEP. | The same live test picture as the HLS pages, delivered over WebRTC by WHEP. The footer shows the network ping and whether the route is direct or relayed. | `webrtc/index.html:62-65` no glass to glass claim on purpose, `:144-152` ping and route |
| moq | A test picture sent from this browser over MoQ and back. | A test picture sent from this browser to Cloudflare's MoQ relay and back. A clock burned into each frame gives the exact glass to glass delay. | `moq/index.html:24-26` one clock both ends, `:115`, `:381-383` |
| cam | One webcam beside what comes back over WebRTC, MoQ and LL-HLS. | Your webcam beside what comes back over WebRTC, MoQ and LL-HLS. Each returned picture shows its own glass to glass delay. | `cam/index.html:202-213`, `:232` read off the burned clock |
| flipper | ETV and ETV2 live, each over a line ending at the present. | ETV and ETV2 live in two pictures, each over a line of clock time that ends at the present with ERR's schedule beside it. Go back along the line, loop a stretch, or return to live. | `flipper/index.html:42-57`, `:130-138` loop, `:297-300` schedule lane, `:414` seek. Read, not played |
| capture | Recording what came over a link, near or far. | Four ways of keeping what came over a link: takes recorded end to end, segments uploaded as they close, a copy sent to Cloudflare and back, and what a WebRTC receiver actually got. | `capture/index.html:98-101` four tabs; `takes.mjs:1-4`, `segments.mjs:1-12`, `roundtrip.mjs:1-5`, `farend.mjs:1-4` |

## device

| n or slug | title | before | after | verified |
| --- | --- | --- | --- | --- |
| device/000 | Pico router | The keyboard plays a sine synth through an emulated Pico whose screen shows each note crossing it. | Play a sine synth through a Raspberry Pi Pico running its own C firmware in an emulator. Its small screen shows each note crossing the router, and one toggle sends every note up an octave. | `rig/pico/patch/main.c:1-35`, `index.html:226` octave toggle. RUN: one C4 6 bytes in, 6 out, 47 frames; K2 then C4 12 in, 15 out (the CC 123 on a route change), 95 frames; first screen 170 ms after the press |
| circuit | Circuit | A Novation Circuit on screen, moving when the real one moves. | A Novation Circuit drawn on screen that follows the real one when it is plugged into this computer. The page only listens, and nothing is sent back. | `circuit/index.html:903-920` inputs only, no SysEx; `:957` "this page only listens" |
| evo | Evo | An Evolution MK-425C on screen, moving when the real one moves. | An Evolution MK-425C keyboard controller drawn control for control. Plug one in and every key, knob and slider you touch lights up here. | `evo/index.html:850-860`, no `.send(` in the file |
| twelve | Twelve | A TASCAM Model 12 on screen, moving when the real one moves. | A TASCAM Model 12 mixer drawn with only the controls it sends as MIDI in DAW control mode. Plug one in and its faders, pans and transport move with the real ones. | `twelve/index.html:674-680`, `:765-770` non-MIDI controls removed, `:1097-1102` Web MIDI |
| dump | MIDI dump | Every message an instrument sends, as raw bytes and a reading. | Listen to any MIDI instrument plugged into this computer and see every message it sends, as raw bytes beside a plain reading. Clock ticks are counted instead of filling the list. | `dump/index.html:145-146`, `:189-196`, `:116-119`, `:340` |
| pack | Pack | The patches, sessions and samples inside a Circuit pack. | Drop in a Novation Circuit pack or a zip of WAVs to look inside its patches, sessions and samples. The file is read in this browser and a sample plays when you press it. | `pack/index.html:210-220` nothing fetched by default, `:272-291` drop box, `:676-678` sample on press; sessions have no play button (assert `:2818`) |

## room

| n or slug | title | before | after | verified |
| --- | --- | --- | --- | --- |
| room/000 | Chat | A multi-user chat built from patchbay blocks. | A chat built from nothing but patchbay links. Join from two tabs and every line you type crosses the room along a link you can see. | `:38-43` two `*` links and "No chat code beyond drawing", `:131` Join |
| room/002 | Chat UI wired | The chat window wired to the patchbay, so tabs in one room talk to each other. | The same chat in a proper chat window, with the patchbay still doing the wiring underneath. Open it in two tabs to talk between them. | `:44-90` room/000's links plus `createChatWindow` |
| room/003 | Broadcast chat | The chat window with the first one in the room broadcasting to everybody in a column of its own. | Whoever joins the room first becomes its admin and broadcasts to everyone in a column of their own. Everyone else reads the broadcast and chats beside it. | `:36-47` earliest joiner is admin, the next takes over; only the admin gets the broadcast box |
| room/004 | Chat timeline | The broadcast chat with a timeline that plays the room's history back until you join. | The broadcast chat with a memory. Before you join, the room's last fifty lines play back on a timeline at the pace they were written, and joining carries on live. | `:173-199` `history?last=50`, `:260-264` playback before Join, `:307` Join goes live; `:351` `scrub: false` |
| wire | Wire | A message as the bytes that travel and how late it lands. | A message shown as the exact bytes it becomes on its way out and back. A second tab plays notes into another browser and shows how late each one lands. | `wire/index.html:60-64` MESSAGES and KEYBOARD tabs, `wire/bytes.mjs:28`, `wire/notes.mjs:45` |
| patchbay | Patchbay | One patchbay linking notes, sound, video and code to the Pi. | Write a link between two ports, say from a keyboard to the Pi's Circuit, and the patchbay checks it before it opens. A link that cannot work is refused with the reason, on an example desk or on the studio's live one. | `patchbay/index.html:131-141` example links, `:276` link field, `:351-353`, `:500-503` refusals, `:264`, `:296`, `:441` example or live |

## typist

| n | title | before | after | verified |
| --- | --- | --- | --- | --- |
| typist/000 | Paper | A sheet of white paper you can type on. | A sheet of white paper to type on, with a blocky cursor and a page that opens full screen. | `:10-16`, `:143` `fullMode: 'footer'`. No sound |
| typist/010 | Typewriter | The same paper with a real typewriter sounding every key. | The same paper, now sounding like a typewriter. Every key, space and return plays a recording of a Hermes Precisa 305, and the bell rings near the end of a line. | `:2-8` nine CC0 recordings, `sampler.mjs:17-21`, `BELL_AT = 56`, `:90` |
| typist/020 | Typewriters | The same typewriter through an fx box that turns every number into a different machine. | The typewriter's sound runs through an effects box where a number picks the machine. Every number gives a different typewriter, and a knob sets how far apart they sound. | `:2-12`, `fx.mjs:1-15` one rule for every number, `:367` number, `:373` `distinct` knob |
| typist/030 | Playback | One paper whose typing is kept on a timeline and played back from the first key to the last. | Everything you type, deletions included, is kept on a timeline. Play it back and the page writes itself again from the first key to the last, typewriter sounds and all. | `:2-8` in memory only, `:302-310` `strike()` sounds insertions and deletions |
| typist/040 | Multi typer | Up to six papers typing sample texts side by side, each through a typewriter of its own. | Up to six papers typed at once from a written score, each through a typewriter of its own. Press play to hear them fill, or type into any paper yourself. | `:54` `MAX = 6`, `:67-74` the score, `:267`, `:330`, `:350` a paper being typed into is left alone |

## sampler

| n or slug | title | before | after | verified |
| --- | --- | --- | --- | --- |
| sampler/000 | Sampler | A SuperCollider piano and Rhodes behind a looper you start, overdub and stop with the sustain pedal. | A grand piano and a Rhodes played on SuperCollider in this tab, from the keys or a MIDI keyboard. The sustain pedal records a loop, overdubs it and clears it, with no tempo and no grid. | `:19-35` Salamander and jRhodes3d on wasm scsynth, `:37-64` press 1 records, 2 closes at its exact length, 3 and 4 overdub, a long hold clears. The old line said the pedal stops it; it clears |
| sampler/030 | Pi piano | The piano and Rhodes sampler running on the Raspberry Pi, heard back over the relay or a direct path with the time from key to sound read out. | The same piano and Rhodes played by the Raspberry Pi in another building. Switch between the relay and a direct connection and compare the time from key to sound. | `:21-29`, `:31-40` relay or direct, `:147-215` key to sound cell, `:242-260` MIDI keyboard |
| nola | Nola | A piano and a Rhodes from one keyboard over a roll of chords. | A piano and a 1977 Rhodes played from one keyboard, over a roll of chords you type in or teach it by playing. | `nola/index.html:366`, `:2014` learn and type modes |

## rhythm

| n or slug | title | before | after | verified |
| --- | --- | --- | --- | --- |
| rhythm/000 | Drum machine | A 16 step grid playing four SuperCollider drums, kick, snare and two hats, each on a wire of its own. | Program a 16 step pattern for four drums made in SuperCollider: kick, snare and two hats. Each drum hangs on a wire of its own in the patchbay, and taking a wire away silences that drum. | `drum-machine.mjs:7-23` one link per voice, "Take a wire away and that drum stops"; `voices.mjs:137-140` |
| rhythm/010 | Drum knobs | The same drum machine with one knob per drum, kick pitch, snare snap, open hat length and closed hat brightness. | The same drum machine with a knob and a scope for each drum. Turn the kick's pitch, the snare's snap, the open hat's length or the closed hat's brightness and hear it from the next hit. | `:22-35` four scopes, a turn heard from the next hit; `voices.mjs:49-53` |
| rhythm/020 | Sample drums | The drum machine playing samples on SuperCollider, a default kit or any pack or WAVs you drop, with pitch and length per row. | The drum machine playing samples, starting from a default kit. Drop a Circuit pack or your own WAVs on the page to replace it, and set pitch and length for each row. | `:26-41` default kit on first play, a drop replaces it, files read in the tab |
| rhythm/030 | Drums on the Pi | The drum machine played in this tab and on the Raspberry Pi at the same moment, with a crossfader between them. | Play one drum pattern in this tab and on the Raspberry Pi at the same moment, and crossfade between the two. When the board does not answer, the Pi side is simulated in this tab. | `:48-74` one time for both, a second scsynth here when no answer, `:456` crossfader. Real Pi run is BACKLOG's (same: true for all four voices) |
| rhythm/050 | Camera drums | The local camera cut into sixteen squares across, whose lit squares play the drum grid. | Point your camera and the picture becomes the drum pattern, cut into 16 by 9 squares with one drum for each of the nine rows. Brighter areas play busier, and 2x doubles it to 32 by 18 squares and eighteen drums. | owner draft corrected, see above. ⚠️ the page was being changed by another agent while this was read: re-read it before applying |
| tom | Tom | A 16 step grid playing the samples out of a pack. | Drop a Circuit pack or a set of samples on the page and its sounds become the rows of a 16 step grid. | `tom/index.html:237` `STEPS = 16`, `:497-515` drop, `:200-209` nothing fetched without `?pack=` |

## clock

| n | title | before | after | verified |
| --- | --- | --- | --- | --- |
| clock/000 | Scheduling | One pattern played by a timer that wakes up and by the sound card told the time ahead, and how late each lands. | One rhythm played twice at two pitches, by a JavaScript timer that wakes up to play and by the sound card told each note's time in advance. Make the page busy and the timer's notes land tens of milliseconds late while the sound card's stay on time. | owner draft corrected, see above |
| clock/010 | Message lag | Keys play a synth over the relay and each note shows how long it took to arrive. | Play a synth through our relay and see how long each note took to arrive. The keys and the synth are two places in this tab, so one clock times the whole trip. | `:11-21` two sockets in one tab, one clock, `:164-180` timeline |
| clock/020 | Audio cushion | Sound over the relay waits in a cushion you set, trading lag for gaps. | A test tone crosses the relay in 20 ms pieces and waits in a cushion before it plays. Set the cushion between 20 and 300 ms and hear the trade between delay and dropouts. | `:11-31`, `:52` `CUSHIONS` 20 to 300; BACKLOG: 20 ms 69 ms lag 25 dropouts, 300 ms 321 ms none |
| clock/030 | Shared clock | Two places agree the time once and play the same beat with nothing sent per beat, and a third can join mid-beat. | Two places in this tab, one with its clock set wrong on purpose, agree the time once over the relay and then play one beat with nothing sent per beat. Press Join while it runs and a third place comes in on the beat. | owner draft corrected, see above |
| clock/040 | MIDI clock | The same beat sent as 24 ticks a beat or as one anchor, and how far each lands from the beat. | One beat sent to a second place two ways at once, as MIDI clock's 24 ticks a beat and as a single shared start time. See how far each lands from the beat when every tick crosses the relay. | `:11-28`, readout `:72`; BACKLOG: ticks 73 ms late median, 119 worst, anchor -0.05 ms |
| clock/050 | Clock drift | Two clocks a few parts per million apart drift off the beat until they agree the time again. | The second place's clock runs fast by a chosen amount, up to 1000 parts per million, so the shared beat slowly drifts apart. Choose how often the two agree the time again and watch the drift reset. | `:11-27`, `:204-205` ppm 0, 50, 200, 1000 and resync off, 10 s, 60 s; BACKLOG: 1.0 ms a second at 1000 ppm |
| time | Time | The clock every page runs on and what is built on it. | The clock every page here runs on, shown in five tabs: scheduling, outputs, loops, a score and dates two thousand years long. | `time/index.html:72-77` five tabs, `dates.mjs:44` |
| sync | Sync | Four ways two places agree on when something happens. | Four ways two places agree on when something happens: on arrival, on a shared clock, by following a late video, and lined up afterwards on a recording. | `sync/index.html:66-74`, `:97-100` |

Drafted for the two clock pages archived the same afternoon (07e0a6ac), kept in case they return: clock Play together, *"Play the keys and each note sounds in two places at the same moment, because the link carries the shared clock and a time to play. Switch the link to on arrival and the two fall apart by the relay's delay."* (3.5 ms against 36 to 44 ms); clock Replay, *"Record keys and a picture that flashes on every key, then play the take back with the video as the clock. The readout shows how far each note lands from its flash."* (the picture is a canvas, not a camera).

## archives

| slug | before | after | verified |
| --- | --- | --- | --- |
| reel | Every 1965 newsreel in ERR's archive on one line of days. | A year of Estonian newsreels, ERR's 1965 AK filmikroonika, laid on one line at the days they went out. The films were shot silent, so each one plays with that day's radio where a programme survives. | owner draft corrected, see above. Read, not played |
| floor | Every 1965 newsreel face up on a floor you walk over. | ERR's 1965 newsreels laid face up as a floor with no edge, to walk over in the browser or in a headset. Press a film and it plays where it lies. | `floor/index.html:111-121` 298 films on 300 slots repeated, `:244-248` Run in VR and the window, `:802-820` press plays |
| resources | Every reachable source for Erkki Kurenniemi's work. | Every source for Erkki Kurenniemi's work that could be reached, each with its date, holder and stated licence. Nothing is copied, and the places that refused are listed with their answers. | `resources/index.html:66-70`. The row count is left out, it changes (333 in `corpus.json`, 334 in a comment) |
| tapes | Every Kurenniemi recording laid end to end as one tape. | Every Erkki Kurenniemi recording that still plays, laid end to end as one long tape where each block is as long as its recording. Press a block to hear it. | `tapes/index.html:131-136` widths from measured durations, press loads; files from archive.org (`:57`) |
| making | What outlived MIMproject's own website. | What survives of MIMproject now its own website is gone: 26 videos from 2008 to 2018 and pictures recovered from archived copies of its pages. | `mimproject.json` 26 items 2008 to 2018; `mimproject-images.json` 63 images from the Wayback Machine; `making/index.html:228` |

## performances

| slug | before | after | verified |
| --- | --- | --- | --- |
| partitur | Moholy-Nagy's 1924 score played as a timeline. | László Moholy-Nagy's 1924 score sketch for a mechanical variety act, played as a timeline of its two stages, its light and its sirens. Any other screen can join as the wall its light is thrown on. | owner draft corrected, see above; `partitur/score.mjs:184-190` lanes |
| held | Held in Human played back from its own score. | Held in Human, a 2024 mixed reality piece, played back from its own score as one timeline of its eight scenes, rooms, spoken lines and events. | `held-in-human.json` meta (Unity mixed reality, 2024, eight scenes); `held/index.html:484-777` lanes. Authors left out on the owner's instruction (`manifest.mjs:291-297`) |
| stage | A 2011 MIMproject church scene broadcast live. | A church scene from MIMproject's 2011 performance MIM goes Sustainable, run as a live show from a control room to an audience. The control room can ask the audience a question, and the recording keeps every answer. | `mimproject.json` item dated 2011; `stage/index.html:174-188` Audience and Control room, `:11-13`, `:1238` question and answer lanes |
| weight | One sentence broken across four walls. | One sentence, "If these walls could talk", set a word at a time across the four walls of a room, so it closes only when you turn all the way round. Each word is as big as it is short, and a word you retype takes the size of its new length. | owner draft corrected, see above; `:1732-1733` Run in VR and AR, drag on screen |

## stations

| slug | before | after | verified |
| --- | --- | --- | --- |
| radio | Six live stations granulated by hand or by sliders. | Eight live radio stations from Tallinn and Helsinki, broken into grains in this tab. Play the grains by hand, or let the sliders sweep themselves back and forth. | `radio/index.html:289-340` EIGHT stations; `:2544-2548` sliders under a saw. ⚠️ the page's `what` (`:447`) and the manifest `one` still say six |
| videoradio | A radio station fed through a granulator. | A live radio station playing itself through a granulator, with nothing set by hand. It loops a few seconds of whatever is on air, up to three loops at once over the station still coming in. | `videoradio/index.html:186-191` |

## instruments

| slug | before | after | verified |
| --- | --- | --- | --- |
| knobs | A synthesizer on a Raspberry Pi in another building. | Yoshimi, a software synthesizer on a Raspberry Pi in another building, played from the keys here with two knobs, cutoff and resonance. Its sound comes back over the relay. | `knobs/index.html:84`, `:408`, `:414`, `:2251`, `:2297` |
| away | A Novation Circuit in another building, played and heard. | A Novation Circuit on a desk in another building, played from this page. A Raspberry Pi captures its sound and sends it back, drawn as it arrives. | `away/index.html:72-73`, `:182` |
| shape | A Circuit's sound edited while it plays. | Edit a Novation Circuit's sound while it plays, plugged into this computer or on a Raspberry Pi in another building. The sliders can also move by themselves. | `shape/index.html:312`, `:1403-1415` Web MIDI, `:903` panels |
| wish | Say which instrument plays which and a model wires it. | Say or type which instrument should play which, and a language model on Cloudflare makes the MIDI connection on the desk. The answer is shown in words and as a picture. | `wish/index.html:691-710` Whisper and Llama or Mistral models, `:474-503` Interpret, Hold to talk, answer shown and made |

## Found on the way, not card text

- radio: the page's `what` and the manifest `one` say six stations; the list has eight.
- synth/090's old card missed that its code is editable; synth/110's implied you play the notes; sampler/000's said the pedal stops the loop (a long hold clears it).
- `demo/concepts/synth/100/index.html:100-103` still says the Pi has not run scollide.mjs; BACKLOG says it has.
- `demo/concepts/typist/030/index.html` header says nothing makes a sound; it plays the typewriter samples.
- `demo/concepts/device/000/index.html` `<title>` reads `POSITRON concept 070`.
- `demo/concepts/video/030/index.html:45`, `:58`, `:81` point at /concepts/room/030/, removed 2026-10-12.
- room/004 fetches the store's history on load, which the owner asked for, against the open-nothing-on-a-visit rule.
- Titles: none wrong. Suggested only: synth/040 `Synth` is generic beside eleven synths (`Synth in steps`), synth/030 `Dot piano` draws rings.

## Cut to 100 characters (2026-10-12, afternoon)

Asked on a crop of the WebRTC loopback card, five lines at 214 characters:
*"too long. make a rule to skill"* (BACKLOG, "Card descriptions too long"). The
rule is at the top of `.claude/skills/positron-describe/SKILL.md`, and
`node demo/concepts/list-test.mjs` enforces it: at most 100 characters, no em
dash, middot, semicolon or backtick.

**Why 100.** MEASURED with `demo/shot.mjs` on /concepts/: the card text column
is 312 px at 1280 and 317 px at 375, at 13.5 px, and three 99 to 101 character
sentences set 3 lines at 1280 and 2 or 3 at 375, on all three card kinds.

**The test before and after.** Against the committed `list.mjs` (HEAD
a67e7e33): 83 cards, **81 failing**, median 136, longest 248. Of those, 67 were
over 100, partitur and weight failed on a semicolon only, and **23 demo cards
carried this file's evidence column instead of their text** (`fau/index.html:356`
on the fau card, *"owner draft corrected, see above"* on reel, partitur and
weight). That was a column applied by mistake in 593becda and was live on the
index; the backtick check is in the test because of it. Without the backtick
check the same file fails 69. After: 82 cards (device/000 Pico router left for
/archive/ the same afternoon), **0 failing**, median 97, longest 100.

**How each was cut.** From the verified text in the tables above and its
evidence column, never fresh: one fact that sets the card apart from its
neighbour, the second sentence kept only where both fit. No claim was added.
Qualifiers that keep a claim true stayed (reel keeps *"where it survives"*).
What went is mostly the second sentence: the patch name read back (synth/070),
the simulated Pi fallback (synth/100, shader/010, rhythm/030), Autoplay
(radio/040), the Join button (clock/030), partitur's wall, weight's turning
round. Each is still true and is on the page.

Every changed card, the committed text with its length, then the new one. A
card that carried the evidence column is cut from the verified text in the
section for its group above.

| card | before | after |
| --- | --- | --- |
| synth/000 | Play a simple sine synthesizer from the on-screen keys or from a MIDI keyboard plugged into this computer. (106) | Play a sine synthesizer from the on-screen keys or a MIDI keyboard plugged into this computer. (94) |
| synth/010 | Record what you play on the keys and play it back. Every note lands in a table with its time, velocity and length. (114) | Record what you play and play it back, every note in a table with its time, velocity and length. (96) |
| synth/020 | The same recorder drawn on a timeline, so a take shows as notes in time and plays back from its start. (102) | The same recorder drawn on a timeline, so a take shows as notes in time and plays from its start. (97) |
| synth/030 | Every note draws an arc on its own ring as the picture turns. The same rings are drawn twice, by a shader in this tab and by C firmware on an emulated Pico screen. (163) | Each note draws an arc on a ring, by a shader in this tab and by C firmware on an emulated Pico. (96) |
| synth/040 | A synthesizer built up one module at a time, from a bare sine to a filter, an envelope and an LFO. Step through it and hear what each new module and its knobs change. (166) | A synth built one module at a time, from a bare sine to a filter, an envelope and an LFO. (89) |
| synth/060 | Play Yoshimi running on a Raspberry Pi in another building, with filter cutoff and resonance on two knobs. Its sound comes back over the relay, and the time from key to sound is read out. (187) | Play Yoshimi on a Raspberry Pi in another building and see how long each key takes to sound here. (97) |
| synth/070 | Play the Novation Circuit plugged into the Raspberry Pi and pick any of its 64 synth patches. The patch name is read back from the instrument. (142) | Play the Novation Circuit plugged into the Raspberry Pi and pick any of its 64 synth patches. (93) |
| synth/080 | A synth voice written in Faust, compiled in this tab on the first key and played from the keyboard. Each of its ten parameters is a knob. (137) | A Faust synth voice compiled in this tab on your first key, with a knob for each of its parameters. (99) |
| synth/090 | Play a small SuperCollider program from the keyboard and turn its two knobs, bright and decay. Edit the code and it recompiles when you stop typing. (148) | Play a small SuperCollider program from the keys and edit its code, recompiled when you stop typing. (100) |
| synth/100 | Play one SuperCollider program in this tab and on the Raspberry Pi at once, and crossfade between the two sounds. When no board answers, a copy in this tab stands in for the Pi. (177) | Play one SuperCollider program in this tab and on the Raspberry Pi at once, crossfading the two. (96) |
| synth/110 | Emilie Gillet's Plaits plays one looping four note line, and a patch picker changes only the sound. Timbre and morph are two knobs. (131) | Emilie Gillet's Plaits plays one looping four note line, and a patch picker changes only the sound. (99) |
| synth/120 | Play the same Plaits voice from the keys or a MIDI keyboard, with all ten of its controls on one scrolling row of knobs. (120) | The same Plaits voice played from the keys or a MIDI keyboard, with all ten controls as knobs. (94) |
| draw/000 | Press play for a held note and drag across the pad. Left to right opens the filter and bottom to top raises its resonance. (122) | Drag the pad over a held note. Left to right opens the filter, bottom to top raises its resonance. (98) |
| radio/000 | Listen to Vikerraadio and Ida Radio Tallinn live and move a crossfader to blend between them. Each station draws its own wave as it plays. (138) | Listen to Vikerraadio and Ida Radio Tallinn live and blend between them on a crossfader. (88) |
| radio/010 | Turn one dial across four live stations, as on an old AM set. Between stations you hear noise and a whistle, and the neighbours bleed in faintly. (145) | Turn one dial across four live stations, as on an old AM set, with noise and a whistle in between. (98) |
| radio/020 | Find the tempo of short recordings of Raadio 2, Raadio 4 and Ida, with the beats it hears drawn over the wave. A mix knob thins the music under a click on those beats. (167) | Find the tempo of recordings of Raadio 2, Raadio 4 and Ida, with the beats it hears on the wave. (96) |
| radio/030 | The same tempo detector on Raadio 2, Raadio 4 or Ida as they broadcast, one station at a time through our relay. (112) | The same tempo detector on Raadio 2, Raadio 4 or Ida live, one station at a time through our relay. (99) |
| radio/040 | Hear a live station and see the key a detector finds in it, lit on a keyboard. Play along on the keys, or let Autoplay play chords in that key. (143) | Hear a live station, see the key a detector finds in it lit on a keyboard, and play along in it. (96) |
| video/000 | Turn on your camera and see it on the page. The picture shows only while the patchbay holds the link from camera to screen. (123) | Turn on your camera and see it on the page while the patchbay holds the link from camera to screen. (99) |
| video/010 | Your camera beside the same picture through a two tone dither shader. One knob sets how coarse the dither is. (109) | Your camera beside itself through a two tone dither shader, with one knob for how coarse it is. (95) |
| video/020 | Record up to ten seconds of your camera and play it back on a timeline. The take stays in this browser, even after a reload. (124) | Record up to ten seconds of your camera and play it back on a timeline, kept in this browser. (93) |
| video/030 | Send your camera to Cloudflare Stream over WebRTC and watch it come back beside the original for twenty seconds. The two pictures show the delay by eye, and the footer reads the return connection's round trip time. (214) | Watch your camera return from Cloudflare Stream over WebRTC beside the original and see the delay. (98) |
| video/040 | ETV and ETV2 live, each in its own picture, crossfaded into one blend shown plain and through a dither. (103) | ETV and ETV2 live, each in its own picture, crossfaded into a blend shown plain and dithered. (93) |
| shader/000 | The kaleidoscope from /mirror/ with one knob left, the number of mirrors. Its shader code is on the page and recompiles as you edit it. (135) | The kaleidoscope from /mirror/ with one knob for its mirrors, and code that recompiles as you edit. (99) |
| shader/010 | The same kaleidoscope drawn in this tab and on the Raspberry Pi, with each knob turn and code edit timed to the first frame that shows it. When the Pi does not answer, the page simulates it and says so. (202) | The same kaleidoscope in this tab and on the Raspberry Pi, each change timed to its first frame. (96) |
| room/000 | A chat built from nothing but patchbay links. Join from two tabs and every line you type crosses the room along a link you can see. (131) | A chat built from nothing but patchbay links, every line crossing the room along a link you can see. (100) |
| room/002 | The same chat in a proper chat window, with the patchbay still doing the wiring underneath. Open it in two tabs to talk between them. (133) | The same chat in a proper chat window, with the patchbay still doing the wiring underneath. (91) |
| room/003 | Whoever joins the room first becomes its admin and broadcasts to everyone in a column of their own. Everyone else reads the broadcast and chats beside it. (154) | Whoever joins first is admin and broadcasts in a column of their own while the rest chat beside. (96) |
| room/004 | The broadcast chat with a memory. Before you join, the room's last fifty lines play back on a timeline at the pace they were written, and joining carries on live. (162) | The broadcast chat with a memory: until you join, the room's last fifty lines replay at their pace. (99) |
| typist/010 | The same paper, now sounding like a typewriter. Every key, space and return plays a recording of a Hermes Precisa 305, and the bell rings near the end of a line. (161) | The same paper, now sounding like a Hermes Precisa 305 typewriter, bell and all. (80) |
| typist/020 | The typewriter's sound runs through an effects box where a number picks the machine. Every number gives a different typewriter, and a knob sets how far apart they sound. (169) | The typewriter through an effects box where every number gives a different machine. (83) |
| typist/030 | Everything you type, deletions included, is kept on a timeline. Play it back and the page writes itself again from the first key to the last, typewriter sounds and all. (168) | Everything you type, deletions included, is kept and played back as the page writes itself again. (97) |
| typist/040 | Up to six papers typed at once from a written score, each through a typewriter of its own. Press play to hear them fill, or type into any paper yourself. (153) | Up to six papers typed at once from a written score, each through a typewriter of its own. (90) |
| sampler/000 | A grand piano and a Rhodes played on SuperCollider in this tab, from the keys or a MIDI keyboard. The sustain pedal records a loop, overdubs it and clears it, with no tempo and no grid. (185) | A grand piano and a Rhodes on SuperCollider, looped by the sustain pedal with no tempo and no grid. (99) |
| sampler/030 | The same piano and Rhodes played by the Raspberry Pi in another building. Switch between the relay and a direct connection and compare the time from key to sound. (162) | The same piano and Rhodes played by the Pi in another building, over the relay or a direct link. (96) |
| rhythm/000 | Program a 16 step pattern for four drums made in SuperCollider: kick, snare and two hats. Each drum hangs on a wire of its own in the patchbay, and taking a wire away silences that drum. (186) | Four SuperCollider drums on 16 steps, each on a patchbay wire that silences it when taken away. (95) |
| rhythm/010 | The same drum machine with a knob and a scope for each drum. Turn the kick's pitch, the snare's snap, the open hat's length or the closed hat's brightness and hear it from the next hit. (185) | The same drum machine with a knob and a scope for each drum, heard from the next hit. (85) |
| rhythm/020 | The drum machine playing samples, starting from a default kit. Drop a Circuit pack or your own WAVs on the page to replace it, and set pitch and length for each row. (165) | The drum machine playing samples from a default kit, or from a Circuit pack or WAVs you drop on it. (99) |
| rhythm/030 | Play one drum pattern in this tab and on the Raspberry Pi at the same moment, and crossfade between the two. When the board does not answer, the Pi side is simulated in this tab. (178) | Play one drum pattern in this tab and on the Raspberry Pi at the same moment, and crossfade the two. (100) |
| rhythm/050 | Point your camera and the picture becomes the drum pattern, cut into 16 by 9 squares with one drum for each of the nine rows. Brighter areas play busier, and 2x doubles it to 32 by 18 squares and eighteen drums. (211) | Point your camera and its picture plays as a 16 by 9 drum pattern, where brighter areas play busier. (100) |
| clock/000 | One rhythm played twice at two pitches, by a JavaScript timer that wakes up to play and by the sound card told each note's time in advance. Make the page busy and the timer's notes land tens of milliseconds late while the sound card's stay on time. (248) | A JavaScript timer and the sound card play one rhythm. Make the page busy and the timer lands late. (99) |
| clock/010 | Play a synth through our relay and see how long each note took to arrive. The keys and the synth are two places in this tab, so one clock times the whole trip. (159) | Play a synth through our relay and see how long each note took to arrive, timed on one clock. (93) |
| clock/020 | A test tone crosses the relay in 20 ms pieces and waits in a cushion before it plays. Set the cushion between 20 and 300 ms and hear the trade between delay and dropouts. (170) | A test tone over the relay waits in a cushion you set from 20 to 300 ms, trading delay for dropouts. (100) |
| clock/030 | Two places in this tab, one with its clock set wrong on purpose, agree the time once over the relay and then play one beat with nothing sent per beat. Press Join while it runs and a third place comes in on the beat. (215) | Two places in this tab, one clock set wrong on purpose, agree the time once and then share one beat. (100) |
| fau | (evidence column by mistake: 86; cut from the verified text above) | A synth you write in Faust, compiled in this tab whenever you stop typing. (74) |
| collide | (evidence column by mistake: 24; cut from the verified text above) | A synth you write in a small subset of SuperCollider, compiled in this tab whenever you stop typing. (100) |
| muta | (evidence column by mistake: 68; cut from the verified text above) | Emilie Gillet's Plaits firmware compiled unmodified to WebAssembly, eight voices played over MIDI. (98) |
| mirror | A kaleidoscope drawn by this browser and by a Raspberry Pi side by side. Step through its looks, or hang both pictures in a headset. (132) | A kaleidoscope drawn by this browser and by a Raspberry Pi side by side, or hung in a headset. (94) |
| llhls | (evidence column by mistake: 72; cut from the verified text above) | A live test picture over low latency HLS, counting how far behind it plays, its stalls and switches. (100) |
| webrtc | (evidence column by mistake: 87; cut from the verified text above) | The same live test picture delivered over WebRTC by WHEP, with the network ping and route shown. (96) |
| moq | (evidence column by mistake: 62; cut from the verified text above) | A test picture sent to Cloudflare's MoQ relay and back, its glass to glass delay read off a clock. (98) |
| cam | (evidence column by mistake: 58; cut from the verified text above) | Your webcam beside what comes back over WebRTC, MoQ and LL-HLS, each with its glass to glass delay. (99) |
| flipper | (evidence column by mistake: 100; cut from the verified text above) | ETV and ETV2 live over a line of clock time ending now, to go back along, loop or return to live. (97) |
| capture | (evidence column by mistake: 114; cut from the verified text above) | Four ways of keeping what came over a link, from takes recorded end to end to what a receiver got. (98) |
| circuit | A Novation Circuit drawn on screen that follows the real one when it is plugged into this computer. The page only listens, and nothing is sent back. (148) | A Novation Circuit on screen that follows the real one plugged in here, and sends nothing back. (95) |
| evo | An Evolution MK-425C keyboard controller drawn control for control. Plug one in and every key, knob and slider you touch lights up here. (136) | An Evolution MK-425C drawn control for control, lighting up as you touch the real one plugged in. (97) |
| twelve | A TASCAM Model 12 mixer drawn with only the controls it sends as MIDI in DAW control mode. Plug one in and its faders, pans and transport move with the real ones. (162) | A TASCAM Model 12 drawn with only its MIDI controls, moving with the real one when it is plugged in. (100) |
| dump | Listen to any MIDI instrument plugged into this computer and see every message it sends, as raw bytes beside a plain reading. Clock ticks are counted instead of filling the list. (178) | Every message a MIDI instrument plugged in here sends, as raw bytes beside a plain reading. (91) |
| pack | Drop in a Novation Circuit pack or a zip of WAVs to look inside its patches, sessions and samples. The file is read in this browser and a sample plays when you press it. (169) | Look inside a Novation Circuit pack or a zip of WAVs you drop in: its patches, sessions and samples. (100) |
| wire | A message shown as the exact bytes it becomes on its way out and back. A second tab plays notes into another browser and shows how late each one lands. (151) | A message as the exact bytes it becomes, and notes played into a second tab, each timed on landing. (99) |
| patchbay | Write a link between two ports, say from a keyboard to the Pi's Circuit, and the patchbay checks it before it opens. A link that cannot work is refused with the reason, on an example desk or on the studio's live one. (216) | Write a link between two ports and the patchbay checks it, and says why when one cannot work. (93) |
| nola | A piano and a 1977 Rhodes played from one keyboard, over a roll of chords you type in or teach it by playing. (109) | A piano and a 1977 Rhodes from one keyboard, over chords you type in or teach it by playing. (92) |
| tom | Drop a Circuit pack or a set of samples on the page and its sounds become the rows of a 16 step grid. (101) | Drop a Circuit pack or a set of samples and its sounds become the rows of a 16 step grid. (89) |
| time | The clock every page here runs on, shown in five tabs: scheduling, outputs, loops, a score and dates two thousand years long. (125) | The clock every page here runs on, in five tabs from scheduling to dates two thousand years long. (97) |
| sync | Four ways two places agree on when something happens: on arrival, on a shared clock, by following a late video, and lined up afterwards on a recording. (151) | Four ways two places agree when something happens, from on arrival to lined up after on a recording. (100) |
| draw | Draw a line with a finger or a mouse and play it back from a recording. Fewer samples and less smoothing show how much of the gesture the playback has to guess. (160) | Draw a line and play it back from a recording, to see how much of the gesture playback has to guess. (100) |
| reel | (evidence column by mistake: 50; cut from the verified text above) | A year of ERR's AK filmikroonika, each silent film played with that day's radio where it survives. (98) |
| floor | (evidence column by mistake: 119; cut from the verified text above) | ERR's 1965 newsreels face up as a floor with no edge, to walk over in the browser or in a headset. (98) |
| resources | (evidence column by mistake: 108; cut from the verified text above) | Every source for Erkki Kurenniemi's work that could be reached, with its date, holder and licence. (98) |
| tapes | (evidence column by mistake: 102; cut from the verified text above) | Every Erkki Kurenniemi recording that still plays, end to end, each block as long as its recording. (99) |
| making | (evidence column by mistake: 125; cut from the verified text above) | What survives of MIMproject without its website: 26 videos from 2008 to 2018 and recovered pictures. (100) |
| partitur | (evidence column by mistake: 68; cut from the verified text above) | László Moholy-Nagy's 1924 score sketch for a mechanical variety act, played as a timeline. (90) |
| held | (evidence column by mistake: 170; cut from the verified text above) | Held in Human, a 2024 mixed reality piece, played back from its own score across its eight scenes. (98) |
| stage | (evidence column by mistake: 132; cut from the verified text above) | A church scene from MIMproject's 2011 MIM goes Sustainable, run live from a control room. (89) |
| weight | (evidence column by mistake: 79; cut from the verified text above) | One sentence, "If these walls could talk", round four walls, each word as big as it is short. (93) |
| radio | (evidence column by mistake: 143; cut from the verified text above) | Eight live radio stations from Tallinn and Helsinki, broken into grains by hand or by sliders. (94) |
| videoradio | (evidence column by mistake: 31; cut from the verified text above) | A live radio station playing itself through a granulator, looping a few seconds of what is on air. (98) |
| knobs | (evidence column by mistake: 55; cut from the verified text above) | Yoshimi on a Raspberry Pi in another building, played from the keys here and heard over the relay. (98) |
| away | (evidence column by mistake: 31; cut from the verified text above) | A Novation Circuit on a desk in another building, played from this page and heard back through a Pi. (100) |
| shape | (evidence column by mistake: 60; cut from the verified text above) | Edit a Novation Circuit's sound as it plays, plugged in here or on a Pi in another building. (92) |
| wish | (evidence column by mistake: 120; cut from the verified text above) | Say or type which instrument plays which, and a language model on Cloudflare makes the connection. (98) |

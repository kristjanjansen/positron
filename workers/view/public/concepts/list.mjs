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
  { n: 'synth/050', title: 'XY filter', say: 'The synth with an XY pad that sweeps its filter.' },
  { n: 'synth/060', title: 'Yoshimi', say: 'The keyboard and knobs playing Yoshimi on the Raspberry Pi in another building.' },
  { n: 'synth/070', title: 'Circuit', say: 'The keyboard and a patch selector playing the Novation Circuit plugged into the Raspberry Pi.' },
  { n: 'synth/080', title: 'Faust synth', say: 'A Faust synth voice played from the keyboard with every parameter a knob of its own.' },
  { n: 'radio/000', title: 'Radio', say: 'Two stations on one crossfader, patched from the stations to the speakers.' },
  { n: 'radio/010', title: 'Tuner', say: 'Four stations and a noise source tuned through one crackly AM dial.' },
  { n: 'radio/020', title: 'Tempo', say: 'Recordings of Raadio 2, Raadio 4 and Ida played from our own bucket into a tempo detector.' },
  { n: 'radio/030', title: 'Live tempo', say: 'The same tempo detector listening to live Raadio 2, Raadio 4 and Ida through our relay.' },
  { n: 'radio/040', title: 'Key', say: 'The live stations into a key detector that shows their key on a keyboard you can play along on.' },
  { n: 'video/000', title: 'Camera', say: 'The local camera patched to a picture on this page.' },
  { n: 'video/010', title: 'Camera shader', say: 'The local camera beside the same picture through a two tone dither shader.' },
  { n: 'video/020', title: 'Camera recorder', say: 'The local camera recorded for up to ten seconds into this browser and played back on a timeline.' },
  { n: 'video/030', title: 'Camera loopback', say: 'The local camera beside the same picture after a round trip through Cloudflare Stream by WHIP and back by WHEP.' },
  { n: 'video/040', title: 'TV', say: 'ETV and ETV2 live through one crossfader into a single dithered picture.' },
  { n: 'device/000', title: 'Pico router', say: 'The keyboard plays a sine synth through an emulated Pico whose screen shows each note crossing it.' },
  { n: 'room/000', title: 'Chat', say: 'A multi-user chat built from patchbay blocks.' },
  { n: 'room/001', title: 'Chat UI', say: 'The chat as a framed window with its messages and a compose box.' },
  { n: 'room/002', title: 'Chat UI wired', say: 'The chat window wired to the patchbay, so tabs in one room talk to each other.' },
  { n: 'room/003', title: 'Broadcast chat', say: 'The chat window with the first one in the room broadcasting to everybody in a column of its own.' },
  { n: 'room/004', title: 'Chat timeline', say: 'The broadcast chat with a timeline that plays the room\'s history back until you join.' },
  // room/010 History and room/020 Admin removed 2026-10-11 (*"rm room 010 020
  // 030. since we cover it right?"*): room/004 keeps the history, room/003 the
  // admin. Their pages are in git history before that commit.
  { n: 'room/030', title: 'Broadcast', say: 'The admin chat with a camera the admin can put on air.' },
  { n: 'typist/000', title: 'Paper', say: 'A sheet of white paper you can type on.' },
  { n: 'typist/010', title: 'Typewriter', say: 'The same paper with a real typewriter sounding every key.' },
  { n: 'typist/020', title: 'Typewriters', say: 'The same typewriter through an fx box that turns every number into a different machine.' },
  { n: 'typist/030', title: 'Playback', say: 'One paper whose typing is kept on a timeline and played back from the first key to the last.' },
  { n: 'typist/040', title: 'Multi typer', say: 'Up to six papers typing sample texts side by side, each through a typewriter of its own.' },
  { n: 'sampler/000', title: 'Piano', say: 'The keyboard playing a sampler of piano recordings that come from our R2 bucket.' },
  { n: 'sampler/010', title: 'Piano and Rhodes', say: 'The same sampler holding a piano and a Rhodes that a patch node switches by program change.' },
  { n: 'sampler/015', title: 'Sustain', say: 'Every message a sustain pedal sends with its timing and the presses it makes.' },
  { n: 'sampler/020', title: 'Looper', say: 'The piano sampler behind a looper you start and stop with the sustain pedal.' },
  { n: 'sampler/030', title: 'Pi piano', say: 'The piano and Rhodes sampler running on the Raspberry Pi, heard back over the relay or a direct path with the time from key to sound read out.' },
  { n: 'sampler/040', title: 'SuperCollider piano', say: 'The same piano and Rhodes played by the Raspberry Pi\'s SuperCollider sampler running in this tab.' },
  { n: 'sampler/050', title: 'Loop clock', say: 'The looper with its loop drawn as a clock, time around the circle and pitch out from the middle.' },
  // misc, last (asked 2026-10-11, *"move bay and tutorial to last misc group"*):
  // bay/000, bay/010 and tutorial/000 until then, those URLs now 404.
  { n: 'misc/000', title: 'Announce', say: 'Every port the studio room can hear.' },
  { n: 'misc/010', title: 'Mirror', say: 'The mirror demo as the patchbay sees it.' },
  { n: 'misc/020', title: 'Tutorial slide', say: 'A tutorial step as one 16:9 slide frame holding its words, its build area and its patchbay.' },
];

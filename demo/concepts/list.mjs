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
  { n: 'synth/000', title: 'Keyboard', say: 'The on-screen keyboard patched to a sine synth.' },
  { n: 'synth/010', title: 'Recorder', say: 'The keyboard and synth with a recorder you can play back.' },
  { n: 'synth/020', title: 'Timeline', say: 'The recorder on the kit transport bar and timeline.' },
  { n: 'synth/030', title: 'Dot piano', say: 'The same notes drawn by a shader and by C firmware on an emulated Pico.' },
  { n: 'synth/040', title: 'Synth', say: 'A WebAudio synth built one patched module at a time.' },
  { n: 'synth/050', title: 'XY filter', say: 'The synth with an XY pad that sweeps its filter.' },
  { n: 'synth/060', title: 'Yoshimi', say: 'The keyboard and knobs playing Yoshimi on the Raspberry Pi in another building.' },
  { n: 'synth/070', title: 'Circuit', say: 'The keyboard, knobs and a patch selector playing the Novation Circuit plugged into the Raspberry Pi.' },
  { n: 'synth/080', title: 'Faust synth', say: 'A Faust synth voice played from the keyboard with every parameter a knob of its own.' },
  { n: 'radio/000', title: 'Radio', say: 'Two stations on one crossfader, patched from the stations to the speakers.' },
  // radio/020 Granulator is off the index since 2026-10-10 (*"hide 031 for now and backlog"*);
  // the page stays at /concepts/radio/020/, row: { n: 'radio/020', title: 'Granulator', say: 'One station into a granulator that a BPM detector keeps in tempo.' }
  { n: 'radio/010', title: 'Tuner', say: 'Four stations and a noise source tuned through one crackly AM dial.' },
  { n: 'video/000', title: 'Camera', say: 'The local camera patched to a picture on this page.' },
  { n: 'video/010', title: 'Camera shader', say: 'The local camera beside the same picture through a two tone dither shader.' },
  { n: 'video/020', title: 'Camera recorder', say: 'The local camera recorded for up to ten seconds into this browser and played back on a timeline.' },
  { n: 'video/030', title: 'Camera loopback', say: 'The local camera beside the same picture after a round trip through Cloudflare Stream by WHIP and back by WHEP.' },
  { n: 'video/040', title: 'TV', say: 'ETV and ETV2 live side by side with a crossfader between their sound.' },
  { n: 'device/000', title: 'Pico router', say: 'The keyboard plays a sine synth through an emulated Pico whose screen shows each note crossing it.' },
  { n: 'room/000', title: 'Chat', say: 'A multi-user chat built from patchbay blocks.' },
  { n: 'room/001', title: 'Chat UI', say: 'The chat as a framed window with its messages and a compose box.' },
  { n: 'room/002', title: 'Chat UI wired', say: 'The chat window wired to the patchbay, so tabs in one room talk to each other.' },
  { n: 'room/010', title: 'History', say: 'The same chat, with a store that keeps what was said.' },
  { n: 'room/020', title: 'Admin', say: 'The chat with an admin line every tab shows on top.' },
  { n: 'room/030', title: 'Broadcast', say: 'The admin chat with a camera the admin can put on air.' },
  { n: 'bay/000', title: 'Announce', say: 'Every port the studio room can hear.' },
  { n: 'bay/010', title: 'Mirror', say: 'The mirror demo as the patchbay sees it.' },
  { n: 'tutorial/000', title: 'Tutorial slide', say: 'A tutorial step as one 16:9 slide frame holding its words, its build area and its patchbay.' },
];

// demo/concepts/list.mjs: every concept page, in teaching order. The index draws
// its cards from it and each page's prev / next links walk it, so a new page is
// one row here. `n` is the page number, the folder under demo/concepts/.
// `group` places a card under its heading on the index, in the order the
// groups first appear here; prev and next walk this order.
export const CONCEPTS = [
  // 001 Patch from words is off the index since 2026-10-10 (*"hide concepts/001 now"*);
  // the page stays at /concepts/001/.
  { n: '010', group: 'synths', title: 'Keyboard', say: 'The on-screen keyboard patched to a sine synth.' },
  { n: '012', group: 'synths', title: 'Recorder', say: 'The keyboard and synth with a recorder you can play back.' },
  { n: '013', group: 'synths', title: 'Timeline', say: 'The recorder on the kit transport bar and timeline.' },
  { n: '014', group: 'synths', title: 'Dot piano', say: 'The same notes drawn by a shader and by C firmware on an emulated Pico.' },
  { n: '015', group: 'synths', title: 'Synth', say: 'A WebAudio synth built one patched module at a time.' },
  { n: '016', group: 'synths', title: 'XY filter', say: 'The synth with an XY pad that sweeps its filter.' },
  { n: '017', group: 'synths', title: 'Yoshimi', say: 'The keyboard and knobs playing Yoshimi on the Raspberry Pi in another building.' },
  { n: '018', group: 'synths', title: 'Faust synth', say: 'A Faust synth voice played from the keyboard with every parameter a knob of its own.' },
  { n: '030', group: 'radio', title: 'Radio', say: 'Two stations on one crossfader, patched from the stations to the speakers.' },
  { n: '031', group: 'radio', title: 'Granulator', say: 'One station into a granulator that a BPM detector keeps in tempo.' },
  { n: '032', group: 'radio', title: 'Tuner', say: 'Four stations and a noise source tuned through one crackly AM dial.' },
  { n: '060', group: 'video', title: 'Camera', say: 'The local camera patched to a picture on this page.' },
  { n: '061', group: 'video', title: 'Camera shader', say: 'The local camera beside the same picture through a two tone dither shader.' },
  { n: '062', group: 'video', title: 'Camera recorder', say: 'The local camera recorded for up to ten seconds into this browser and played back on a timeline.' },
  { n: '065', group: 'video', title: 'Camera loopback', say: 'The local camera beside the same picture after a round trip through Cloudflare Stream by WHIP and back by WHEP.' },
  { n: '066', group: 'video', title: 'TV', say: 'ETV and ETV2 live side by side with a crossfader between their sound.' },
  { n: '070', group: 'pico', title: 'Pico router', say: 'The keyboard plays a sine synth through an emulated Pico whose screen shows each note crossing it.' },
  { n: '003', group: 'chat', title: 'Chat', say: 'A multi-user chat built from patchbay blocks.' },
  { n: '004', group: 'chat', title: 'History', say: 'The same chat, with a store that keeps what was said.' },
  { n: '005', group: 'chat', title: 'Admin', say: 'The chat with an admin line every tab shows on top.' },
  { n: '006', group: 'chat', title: 'Broadcast', say: 'The admin chat with a camera the admin can put on air.' },
  { n: '090', group: 'misc', title: 'Announce', say: 'Every port the studio room can hear.' },
  { n: '091', group: 'misc', title: 'Mirror', say: 'The mirror demo as the patchbay sees it.' },
  { n: '092', group: 'misc', title: 'Tutorial slide', say: 'A tutorial step as one 16:9 slide frame holding its words, its build area and its patchbay.' },
];

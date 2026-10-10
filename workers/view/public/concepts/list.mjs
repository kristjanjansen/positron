// demo/concepts/list.mjs: every concept page, in teaching order. The index draws
// its cards from it and each page's prev / next links walk it, so a new page is
// one row here. `n` is the page number, the folder under demo/concepts/.
export const CONCEPTS = [
  { n: '010', title: 'Announce', say: 'Every port the studio room can hear.' },
  { n: '020', title: 'Mirror', say: 'The mirror demo as the patchbay sees it.' },
  { n: '030', title: 'Chat', say: 'A multi-user chat built from patchbay blocks.' },
  { n: '040', title: 'History', say: 'The same chat, with a store that keeps what was said.' },
  { n: '050', title: 'Admin', say: 'The chat with an admin line every tab shows on top.' },
  { n: '060', title: 'Broadcast', say: 'The admin chat with a camera the admin can put on air.' },
  { n: '070', title: 'Pico router', say: 'The keyboard plays a sine synth through an emulated Pico whose screen shows each note crossing it.' },
  { n: '100', title: 'Keyboard', say: 'The on-screen keyboard patched to a sine synth.' },
  { n: '110', title: 'Effects', say: 'The keyboard and a saw synth with MIDI and audio effects.' },
  { n: '120', title: 'Recorder', say: 'The keyboard and synth with a recorder you can play back.' },
  { n: '130', title: 'Timeline', say: 'The recorder on the kit transport bar and timeline.' },
  { n: '140', title: 'Shader', say: 'The same notes drawn by a shader and by C firmware on an emulated Pico.' },
  { n: '300', title: 'Radio', say: 'Two stations on one crossfader, patched from the stations to the speakers.' },
  { n: '310', title: 'Granulator', say: 'One station into a granulator that a BPM detector keeps in tempo.' },
  { n: '320', title: 'Tuner', say: 'Four stations and a noise source tuned through one crackly AM dial.' },
  { n: '400', title: 'Synth', say: 'A WebAudio synth built one patched module at a time.' },
  { n: '410', title: 'XY filter', say: 'The synth with an XY pad that sweeps its filter.' },
  { n: '500', title: 'Tutorial slide', say: 'A tutorial step as one 16:9 slide frame holding its words, its build area and its patchbay.' },
  { n: '600', title: 'Camera', say: 'The local camera patched to a picture on this page.' },
  { n: '610', title: 'Camera shader', say: 'The local camera beside the same picture through a two tone dither shader.' },
  { n: '650', title: 'Camera loopback', say: 'The local camera beside the same picture after a round trip through Cloudflare Stream by WHIP and back by WHEP.' },
];

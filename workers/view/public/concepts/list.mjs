// demo/concepts/list.mjs: every concept page, in teaching order. The index draws
// its cards from it and each page's prev / next links walk it, so a new page is
// one row here. `n` is the page number, the folder under demo/concepts/.
export const CONCEPTS = [
  { n: '001', title: 'Announce', say: 'Every port the studio room can hear.' },
  { n: '002', title: 'Mirror', say: 'The mirror demo as the patchbay sees it.' },
  { n: '003', title: 'Chat', say: 'A multi-user chat built from patchbay blocks.' },
  { n: '004', title: 'History', say: 'The same chat, with a store that keeps what was said.' },
  { n: '005', title: 'Admin', say: 'The chat with an admin line every tab shows on top.' },
  { n: '006', title: 'Broadcast', say: 'The admin chat with a camera the admin can put on air.' },
  { n: '007', title: 'Pico router', say: 'The keyboard plays a sine synth through an emulated Pico whose screen shows each note crossing it.' },
  { n: '080', title: 'TV', say: 'ETV and ETV2 live side by side with a crossfader between their sound.' },
  { n: '010', title: 'Keyboard', say: 'The on-screen keyboard patched to a sine synth.' },
  { n: '011', title: 'Effects', say: 'The keyboard and a saw synth with MIDI and audio effects.' },
  { n: '012', title: 'Recorder', say: 'The keyboard and synth with a recorder you can play back.' },
  { n: '013', title: 'Timeline', say: 'The recorder on the kit transport bar and timeline.' },
  { n: '014', title: 'Shader', say: 'The same notes drawn by a shader and by C firmware on an emulated Pico.' },
  { n: '030', title: 'Radio', say: 'Two stations on one crossfader, patched from the stations to the speakers.' },
  { n: '031', title: 'Granulator', say: 'One station into a granulator that a BPM detector keeps in tempo.' },
  { n: '032', title: 'Tuner', say: 'Four stations and a noise source tuned through one crackly AM dial.' },
  { n: '040', title: 'Synth', say: 'A WebAudio synth built one patched module at a time.' },
  { n: '045', title: 'XY filter', say: 'The synth with an XY pad that sweeps its filter.' },
  { n: '050', title: 'Tutorial slide', say: 'A tutorial step as one 16:9 slide frame holding its words, its build area and its patchbay.' },
  { n: '060', title: 'Camera', say: 'The local camera patched to a picture on this page.' },
  { n: '061', title: 'Camera shader', say: 'The local camera beside the same picture through a two tone dither shader.' },
  { n: '062', title: 'Camera recorder', say: 'The local camera recorded for up to ten seconds into this browser and played back on a timeline.' },
  { n: '065', title: 'Camera loopback', say: 'The local camera beside the same picture after a round trip through Cloudflare Stream by WHIP and back by WHEP.' },
];

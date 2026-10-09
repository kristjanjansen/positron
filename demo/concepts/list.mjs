// demo/concepts/list.mjs: every concept page, in teaching order. The index draws
// its cards from it and each page's prev / next links walk it, so a new page is
// one row here. `n` is the page number, the folder under demo/concepts/.
export const CONCEPTS = [
  { n: 1, title: 'Announce', say: 'Every port the studio room can hear.' },
  { n: 2, title: 'Mirror', say: 'The mirror demo as the patchbay sees it.' },
  { n: 3, title: 'Chat', say: 'A multi-user chat built from patchbay blocks.' },
  { n: 4, title: 'History', say: 'The same chat, with a store that keeps what was said.' },
  { n: 5, title: 'Admin', say: 'The chat with an admin line every tab shows on top.' },
  { n: 6, title: 'Broadcast', say: 'The admin chat with a camera the admin can put on air.' },
  { n: 10, title: 'Keyboard', say: 'The on-screen keyboard patched to a sine synth.' },
  { n: 11, title: 'Effects', say: 'The keyboard and a saw synth with MIDI and audio effects.' },
  { n: 12, title: 'Recorder', say: 'The keyboard and synth with a recorder you can play back.' },
  { n: 13, title: 'Timeline', say: 'The recorder on the kit transport bar and timeline.' },
  { n: 14, title: 'Shader', say: 'The same notes drawn by a shader and by C firmware on an emulated Pico.' },
];

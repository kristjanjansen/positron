// demo/shell/rt-typing.mjs: the runtime of a `typing` node on /connect/
// (node-runtime.mjs). Its face is /typist/'s sheet of paper (typist/paper.mjs);
// every input on it leaves on typing:value-out as `{ of: 'text', text, kind,
// column }`, kind being the InputEvent's inputType. Typing is a person's press,
// so it starts the page's sound.

import { createPaper } from '/typist/paper.mjs';

export function make({ send, wake }) {
  let sent = 0;
  const paper = createPaper({ label: 'the paper', onInput: (e) => {
    wake();
    sent++;
    send('value-out', { of: 'text', text: e.data || '', kind: e.inputType || '', column: paper.column() });
  } });
  const face = document.createElement('div');
  face.className = 'cn-paper';
  face.append(paper.el);
  return {
    face, slot: 'picture', paper,
    heard: () => sent,
    close() { face.remove(); },
  };
}

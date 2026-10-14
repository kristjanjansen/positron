// demo/shell/rt-typing.mjs: a `typing` node on /connect/, whose face is /typist/'s paper.
// Every input leaves on typing:value-out as `{ of: 'text', text, kind, column }` (kind is the
// inputType); typing is a press, so it starts the page's sound.
// why: lessons/kit-rt-typing.md#header

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

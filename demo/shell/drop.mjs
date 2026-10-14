// demo/shell/drop.mjs: drop a file anywhere on the page and it opens: read in the tab, never sent.
// A visible resting area invites the drop. Count dragenter minus dragleave; preventDefault on
// dragover and drop; the cover is pointer-events none; refusals in words; a button for keyboards.
// why: lessons/kit-drop.md#header

import { el } from './shell.mjs';

/**
 * @param {object} o
 * @param {string[]} [o.accept]   extensions, lowercase with the dot. Empty takes anything.
 * @param {(files:{name:string,size:number,bytes:Uint8Array}[])=>any} o.onOpen
 * @param {(msg:string, kind?:string)=>void} [o.says]   words for the page's log
 * @param {string} [o.title]      a heading over the area. Empty means none.
 * @param {string} [o.label]      the button's own words. It says `open`.
 * @param {string} [o.beside]     words on the same line as the button, for the
 *                                other way in. `or drag a file here`.
 * @param {string} [o.hint]       what the area says UNDER the button at rest,
 *                                and what the cover says while a drag is in
 *                                flight. The extensions are appended to the
 *                                first and left off the second.
 * @param {string} [o.empty]      the footer's words before anything is opened.
 *                                `''` means NO FOOTER until there is something
 *                                to say, which is what a caller wants when an
 *                                empty strip would paint a rule nobody wrote.
 * @param {boolean} [o.area]      false for a bare button with no resting area.
 *                                The default is the area, because a component
 *                                whose only visible part appears mid-drag is the
 *                                defect this one was reported for.
 * @param {Document|HTMLElement} [o.on]  what listens. The document by default,
 *                                       because the ask was a page-wide target.
 * @param {number} [o.maxBytes]
 */
export function createDrop({
  accept = [],
  onOpen,
  says = () => {},
  title = '',
  label = 'open a file',
  beside = '',
  hint = 'drop it anywhere on this page',
  empty = 'nothing has been opened',
  area = true,
  on = document,
  maxBytes = 64 * 1024 * 1024,
} = {}) {
  if (typeof onOpen !== 'function') throw new Error('createDrop needs an onOpen');
  const exts = accept.map((s) => s.toLowerCase());

  let opens = 0, refused = 0, depth = 0, alive = true;

  const input = el('input', 'pos-drop-input');
  input.type = 'file';
  input.multiple = true;
  if (exts.length) input.accept = exts.join(',');
  // `hidden`, not a class, so a stylesheet cannot reveal it; the button is the only way in.
  // why: lessons/kit-drop.md#input
  input.hidden = true;

  const button = el('button', 'pos-drop-btn', label);
  button.type = 'button';
  button.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    take([...input.files]);
    // Clearing it means opening the SAME file twice in a row still fires a
    // change event, which it does not otherwise, and that reads as the second
    // press doing nothing.
    input.value = '';
  });

  /**
   * The area is the resting state and names the extensions it takes, so a refusal is never news.
   * The note line is part of the component, so every caller gets refusal and confirmation there.
   * why: lessons/kit-drop.md#area
   */
  /**
   * The note is a footer spanning the block, and exists only when it has words:
   * `hidden`, since `.pos-drop-note` has a `min-height` that would paint an empty seam.
   * why: lessons/kit-drop.md#note
   */
  const note = el('div', 'pos-drop-note', empty);
  note.hidden = !empty;
  const root = el('div', area ? 'pos-drop pos-drop-area' : 'pos-drop');
  if (area) {
    /**
     * The hint sits under the button; the extensions stay in the area's text, which /kit/ and /pack/ assert.
     * why: lessons/kit-drop.md#hint
     */
    // The body is a wrapper so the footer can span the block outside its padding.
    // why: lessons/kit-drop.md#body
    const body = el('div', 'pos-drop-body');
    if (title) body.append(el('div', 'pos-drop-title', title));
    const row = el('div', 'pos-drop-row');
    row.append(button);
    if (beside) row.append(el('span', 'pos-drop-beside', beside));
    const words = exts.length
      ? `${hint} (${exts.join(', ')})`
      : hint;
    body.append(row, el('div', 'pos-drop-hint', words));
    root.append(body, note);
  } else {
    root.append(button, note);
  }
  root.append(input);

  const cover = el('div', 'pos-drop-cover');
  cover.append(el('div', 'pos-drop-say', hint));

  // Area and cover light up together. `data-over` is deleted, not emptied: it matches on presence.
  // why: lessons/kit-drop.md#show
  function show() {
    if (!cover.isConnected) document.body.append(cover);
    root.dataset.over = '1';
  }
  function hide() {
    depth = 0;
    cover.remove();
    delete root.dataset.over;
  }

  // Everything said goes through here, so the line and the page's log agree, and the footer
  // comes and goes with its words.
  // why: lessons/kit-drop.md#tell
  const tell = (msg, kind) => {
    note.textContent = msg;
    note.hidden = !msg;
    says(msg, kind);
  };

  const okName = (name) => !exts.length || exts.some((e) => name.toLowerCase().endsWith(e));

  async function take(files) {
    if (!files.length) return;
    const good = [];
    for (const f of files) {
      if (!okName(f.name)) {
        refused++;
        tell(`${f.name} is not ${exts.join(' or ')}, so it was not opened`, 'bad');
        continue;
      }
      if (f.size > maxBytes) {
        refused++;
        tell(`${f.name} is ${(f.size / 1048576).toFixed(1)} MB and the limit here is ${(maxBytes / 1048576) | 0} MB`, 'bad');
        continue;
      }
      good.push({ name: f.name, size: f.size, bytes: new Uint8Array(await f.arrayBuffer()) });
    }
    if (!good.length) return;
    opens += good.length;
    await onOpen(good);
  }

  // The document listeners; both `preventDefault` calls are load bearing.
  // why: lessons/kit-drop.md#listeners
  const onOver = (e) => { e.preventDefault(); };
  const onEnter = (e) => { e.preventDefault(); depth++; show(); };
  const onLeave = () => { depth--; if (depth <= 0) hide(); };
  const onDrop = (e) => {
    e.preventDefault();
    hide();
    take([...(e.dataTransfer?.files || [])]);
  };
  // A drag ending off the window may fire neither `dragleave` nor `drop`.
  // why: lessons/kit-drop.md#onend
  const onEnd = () => hide();

  on.addEventListener('dragover', onOver);
  on.addEventListener('dragenter', onEnter);
  on.addEventListener('dragleave', onLeave);
  on.addEventListener('drop', onDrop);
  window.addEventListener('dragend', onEnd);
  window.addEventListener('blur', onEnd);

  return {
    el: root,
    button,
    input,
    cover,
    /** The component's own line, so a page can assert what a reader was told. */
    note,
    /** Words into the area and the caller's log at once. */
    say: tell,
    /** Live, so a page can assert that a visit opened nothing. */
    get opens() { return opens; },
    /** Live. A stand-in that refused everything would otherwise read as working. */
    get refused() { return refused; },
    get dragging() { return cover.isConnected; },
    /** For a check: the same path a drop takes, with no drag to simulate. */
    open: (files) => take(files),
    destroy() {
      if (!alive) return;
      alive = false;
      on.removeEventListener('dragover', onOver);
      on.removeEventListener('dragenter', onEnter);
      on.removeEventListener('dragleave', onLeave);
      on.removeEventListener('drop', onDrop);
      window.removeEventListener('dragend', onEnd);
      window.removeEventListener('blur', onEnd);
      hide();
      root.remove();
    },
  };
}

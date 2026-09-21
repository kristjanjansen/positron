// demo/shell/drop.mjs — drop a file anywhere on the page and it OPENS.
//
// 🔴 IT IS `open`, NOT `upload`, AND THE WORD IS THE POINT.
// Nothing leaves the machine. The file is read into an `ArrayBuffer` in the tab
// and handed to the caller, and this module names no network API at all: no
// `fetch`, no `XMLHttpRequest`, no `WebSocket`, no form. A purchased soundbank
// lives in `purchased/` precisely because it is not ours to publish, and a
// control called *upload* invites somebody to build the thing that gitignore
// exists to prevent. The label a visitor reads says **open**.
// ⚠️ `plans/plan-pack-page.md` §3 specifies `FileReader`. `file.arrayBuffer()`
// is the same locality with fewer moving parts and it returns a promise, so a
// read that fails propagates instead of landing in an `onerror` nobody wrote.
//
// 🔴 IT HAS A VISIBLE AREA, AND THE FIRST VERSION DID NOT. THAT WAS THE DEFECT.
// It shipped with a button and a cover, and the cover is `position: fixed` and is
// inserted into the document ONLY while a drag is already in flight. So a reader
// who had not started dragging had nothing on screen telling them they could:
// **the affordance appeared after the gesture it exists to invite.** Reported
// 2026-09-21 as *"i just do not get funcionality why there is no upload aread /
// button, global component i am asking"*, which is exactly right.
// ⚠️ THE PLAN SPECIFIED THE DRAG, THE REFUSAL, THE KEYBOARD PATH AND THE COVER,
// AND SPECIFIED NO RESTING STATE. Every one of those is about what happens after
// somebody has decided to drop something. Nothing said what the page looks like
// before that, so nothing was built, and each piece was correct on its own.
//
// 🔴 FIVE THINGS TO GET RIGHT AND FOUR WERE ALREADY MEASURED ELSEWHERE HERE.
//
// 1. `dragleave` FIRES ON EVERY CHILD, so a boolean flickers: the pointer
//    crossing a table row leaves the row and enters the next one, and a cover
//    keyed on a boolean blinks all the way down the page. Keep a COUNTER of
//    enter minus leave.
// 2. `preventDefault` ON BOTH `dragover` AND `drop`, ON THE DOCUMENT. Without
//    the first the drop event never fires at all; without the second the
//    browser NAVIGATES TO THE FILE and the page is gone with whatever was on it.
// 3. THE COVER IS `position: fixed; inset: 0` AND IS OVER THE CONTROLS, which
//    is the `/weight/` and `/floor/` lesson: a full page cover sat over the row
//    holding the button that got you out. So it is in the document only while a
//    drag is in flight, and it is `pointer-events: none` for its whole life.
// 4. A REFUSED FILE SAYS SO IN WORDS AND IN THE LOG. Dropping a JPEG has to read
//    as *this is not a pack*, never as nothing happening, which is the same rule
//    `unzip.mjs` states about an encrypted entry.
// 5. AND IT TAKES A KEYBOARD PATH, because a drop target that is the only way in
//    is a page somebody cannot use. One `<input type="file">` behind a button,
//    on the same handler, so there is one code path rather than two.

import { el } from './shell.mjs';

/**
 * @param {object} o
 * @param {string[]} [o.accept]   extensions, lowercase with the dot. Empty takes anything.
 * @param {(files:{name:string,size:number,bytes:Uint8Array}[])=>any} o.onOpen
 * @param {(msg:string, kind?:string)=>void} [o.says]   words for the page's log
 * @param {string} [o.label]      the button's own words. It says `open`.
 * @param {string} [o.hint]       what the area says at rest and what the cover
 *                                says while a drag is in flight
 * @param {string} [o.empty]      the area's own line before anything is opened
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
  hint = 'drop it anywhere on this page',
  empty = '',
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
  // ⚠️ `hidden` RATHER THAN `display: none` ON A CLASS, so a stylesheet cannot
  // accidentally reveal it, and so the button below is the only way in.
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
   * 🔴 THE AREA IS THE COMPONENT'S RESTING STATE AND IT SAYS WHAT MAY BE DROPPED
   * ON IT. A dashed edge is a target; the words inside name the extensions, so a
   * refusal is never the first time a reader learns what this takes.
   * ⚠️ THE NOTE LINE IS PART OF IT RATHER THAN THE PAGE'S, so every caller gets
   * the refusal and the confirmation in the same place with nothing to remember.
   * It is NEVER EMPTY: it says `nothing has been opened` before anything is, and
   * that is not politeness. `/wish/` reserved a picture's room with `min-height`
   * and MEASURED the host at 0 px and `display: none`, beaten by
   * `.pos-stack > div:empty { display: none }` at (0,2,1), so the log moved on
   * every answer for hours while the source read as correct. A box with words in
   * it cannot lose that fight.
   */
  const note = el('div', 'pos-drop-note', empty);
  const root = el('div', area ? 'pos-drop pos-drop-area' : 'pos-drop');
  /**
   * 🔴 ONLY THE DASHED AREA IS A TARGET, AND THE RESULT IS A FOOTER GLUED UNDER
   * IT. Asked 2026-09-21 as *"only dashed area is file drop target"* and *"if
   * file dropped, it will be glued footer to upload component"*. A result
   * sitting inside the invitation reads as part of the invitation.
   * 🔴 AND THERE IS NO FOOTER AT ALL UNTIL SOMETHING IS SAID, asked as *"rm
   * nothing has been opened and footer when no files"*. It used to open reading
   * `nothing has been opened`, because `/wish/` lost a reserved box to
   * `.pos-stack > div:empty { display: none }`. ⚠️ THAT LESSON IS ABOUT A BOX
   * THAT MUST BE VISIBLE AND GOT COLLAPSED, which is not this: here the element
   * is not in the document at all, so no selector decides anything.
   */
  const wrap = el('div', 'pos-drop-wrap');
  if (area) {
    const words = exts.length ? `${hint} (${exts.join(', ')})` : hint;
    // ⚠️ THE BUTTON AND THE WORDS BESIDE IT ARE ONE ROW, because `[browse
    // files] or drag a file here` is one sentence with a control in it.
    const row = el('div', 'pos-drop-row');
    row.append(button, el('span', 'pos-drop-or', 'or drag a file here'));
    if (title) root.append(el('div', 'pos-drop-title', title));
    root.append(el('div', 'pos-drop-hint', words), row);
  } else {
    root.append(button);
  }
  root.append(input);
  wrap.append(root);
  if (empty) wrap.append(note);

  const cover = el('div', 'pos-drop-cover');
  cover.append(el('div', 'pos-drop-say', hint));

  // ⚠️ THE AREA AND THE COVER LIGHT UP TOGETHER, so a drag that starts far from
  // the area still points at it. `data-over` is DELETED rather than set empty:
  // `[data-over]` matches on PRESENCE, and `= ''` is how `video-panel.mjs` kept
  // a panel in full screen state for the rest of a page's life.
  function show() {
    if (!cover.isConnected) document.body.append(cover);
    root.dataset.over = '1';
  }
  function hide() {
    depth = 0;
    cover.remove();
    delete root.dataset.over;
  }

  // Everything the component has to say goes through here, so its own line and
  // the page's log can never disagree about what happened.
  // ⚠️ THE FOOTER JOINS THE DOCUMENT ON ITS FIRST WORD, not at build time, so a
  // component nobody has used has no footer to read.
  const tell = (msg, kind) => {
    note.textContent = msg;
    if (!note.isConnected) wrap.append(note);
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

  // 🔴 THE DOCUMENT LISTENERS, AND BOTH `preventDefault` CALLS ARE LOAD BEARING.
  const onOver = (e) => { e.preventDefault(); };
  const onEnter = (e) => { e.preventDefault(); depth++; show(); };
  const onLeave = () => { depth--; if (depth <= 0) hide(); };
  const onDrop = (e) => {
    e.preventDefault();
    hide();
    take([...(e.dataTransfer?.files || [])]);
  };
  // ⚠️ A DRAG THAT ENDS OFF THE WINDOW FIRES NEITHER `dragleave` NOR `drop` in
  // every browser, and a cover left standing is a page that looks frozen.
  const onEnd = () => hide();

  on.addEventListener('dragover', onOver);
  on.addEventListener('dragenter', onEnter);
  on.addEventListener('dragleave', onLeave);
  on.addEventListener('drop', onDrop);
  window.addEventListener('dragend', onEnd);
  window.addEventListener('blur', onEnd);

  return {
    el: wrap,
    area: root,
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

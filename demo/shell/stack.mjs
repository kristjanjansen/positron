// demo/shell/stack.mjs — the page is a STACK of blocks, and the stack owns the
// air between them.
//
// 🔴 WHY THIS IS A COMPONENT AND NOT A RULE ANYBODY CAN FOLLOW. The rhythm was
// one line in shell.css — `.pos-body > * + * { margin-top: 40px }` — and it
// reaches DIRECT CHILDREN of one element. Everything else on the page was
// outside it, and a page fell out of the rhythm three different ways without
// anybody noticing:
//
//   1. a WRAPPER. Two controls in a div is one block to the rhythm and two
//      elements with nothing between them inside it.
//   2. an INSERT. `/keys/` built its patch row and did
//      `controls.parentNode.insertBefore(picks, controls)`, which puts it on
//      `document.body` beside the shell's own blocks, where no rhythm ran at
//      all. MEASURED before this file existed: head 16, patch 14, page 14.
//   3. a component's own `margin` SHORTHAND. `.kbd { margin: 0 0 10px }` is
//      (0,1,0) and sits later in shell.css than the rhythm, which is (0,1,0)
//      too — so source order decided it and the keyboard's top margin computed
//      to ZERO. MEASURED on `/keys/`: **0.0 px between the transport bar and
//      the keys**, which is the screenshot that bought this file. CLAUDE.md
//      already records the same defect on `.tbar` and on `.pos-dg`; three
//      times is a structure, not three mistakes.
//
// So the gap stops being something a page can be careful about. A STACK is any
// element carrying `.pos-stack`, and shell.css gives its children one gap on
// BOTH sides: `margin-top` on every child but the first, `margin-bottom: 0` on
// every child but the last. Two consequences that are the whole point:
//
//   • A child cannot set the gap and cannot remove it. The rules are (0,2,0)
//     and (0,3,0), so a component's own single-class margin loses on
//     SPECIFICITY rather than on where its rule happens to sit in the file.
//   • The gap is EXACTLY the gap. Under the old rule a neighbour's larger
//     bottom margin collapsed through and won: `/vclick/` measured 53.5 px
//     between its field and its transport bar, and nothing on the page said so.
//
// `mount()` makes two stacks: the page's whole column (`document.body`) and the
// page's own blocks (`.pos-body`). A page that appends to `d.el`, or inserts
// before the control row, is already in one of them and needs nothing from this
// file. `createStack()` is for the case that is still open — a page building a
// BLOCK that itself holds blocks.
//
// ⚠️ A PAIR THAT BELONGS TIGHT IS ONE BLOCK, NOT A SMALLER GAP. A caption over
// a picture, a label over a field: put the two in a plain element and put THAT
// in the stack. The inside of a block is the block's own business, and a stack
// has nothing to say about it. That is the only escape and it is the honest
// one — a page asking for 14 px here and 22 px there is how the project got
// four different rhythms in the first place.
//
// ⚠️ THE NUMBER IS `--pos-gap`, DECLARED ONCE ON `:root` IN shell.css. Nothing
// in this file knows it and no page has ever been told it. Changing the
// project's spacing is one line in one stylesheet, which is what was asked for:
// *"make a rule and update others in bg: make it easy to change later"*.
//
// ⚠️ AND THIS FILE IMPORTS NOTHING, BECAUSE `shell.mjs` IMPORTS IT. shell.mjs
// is the frame every page mounts and carries a standing note that its only
// import is a leaf; a `createElement` here rather than borrowing `el()` keeps
// that true and keeps a cycle out of the frame.

export const STACK = 'pos-stack';

/**
 * Make an element a stack, or make a new one.
 *
 * @param {Element} [host] an element to adopt. Omit it and a `<div>` is made,
 *   which is the "a block holding blocks" case.
 * @param {string} [cls] extra classes for a stack this call creates.
 */
export function createStack(host, cls) {
  const el = host || document.createElement('div');
  el.classList.add(STACK);
  if (cls) for (const c of cls.split(/\s+/)) if (c) el.classList.add(c);

  /**
   * Append blocks, IN ORDER, which is the whole interface.
   *
   * ⚠️ `null` AND `undefined` ARE SKIPPED ON PURPOSE. A page asks for its
   * blocks in one call — `page.add(bar, picks, keys)` — and one of them is
   * often conditional. Without this every such call grows an `if`, and an `if`
   * around an append is exactly how a block ends up somewhere else.
   */
  const add = (...blocks) => {
    for (const b of blocks) if (b) el.append(b.el || b);
    return api;
  };

  const api = {
    el,
    add,
    /** Put blocks in front of a block already in this stack. `/keys/` opens
     *  with its online bar, which is built after the row it has to precede. */
    before(ref, ...blocks) {
      const at = ref && (ref.el || ref);
      for (const b of blocks) if (b) el.insertBefore(b.el || b, at && at.parentNode === el ? at : null);
      return api;
    },
    /** Put blocks at the FRONT. The common case of `before`, named, because
     *  `before(el.firstChild)` is not what anybody means. */
    first(...blocks) {
      let mark = el.firstChild;
      for (const b of blocks) if (b) el.insertBefore(b.el || b, mark);
      return api;
    },
    /**
     * 🔴 A HEADING AND WHAT IT LABELS, AS ONE BLOCK. Asked for 2026-09-17:
     * *"add heading support for createStack and stop messing around"*, after a
     * screenshot of a caption sitting on the dashed edge of the box it labelled.
     *
     * The rule this implements was already written at the top of this file: a
     * pair that belongs tight is ONE BLOCK, not a smaller gap. Every page that
     * needed one was rolling it by hand, and `/kit/` rolled it wrong: MEASURED
     * on the live page, all FOUR of its captions read a gap of 0.0 px to their
     * specimen, because a caption with `line-height: 1` has a box tight to its
     * letters and the thing under it starts at that edge.
     *
     * So the component owns both distances: the small one between a heading and
     * what it labels, and the ordinary one between this group and its
     * neighbours. A page states a title and its blocks, and can get neither
     * wrong.
     * ⚠️ THE SECTION IS ITSELF A STACK, so several blocks under one heading are
     * spaced by the same rhythm as everything else. The heading is excluded from
     * it by name in shell.css, the way `.pos-head` and `.pos-how` already are,
     * and carries its own smaller margin instead.
     */
    titled(text, ...blocks) {
      const sec = document.createElement('section');
      sec.className = `${STACK} pos-sec`;
      const h = document.createElement('h3');
      h.className = 'pos-sec-h';
      // Uppercased by the stylesheet whatever is typed, and typed uppercase on
      // the page anyway so the source reads like what it renders.
      h.textContent = text;
      sec.append(h);
      for (const b of blocks) if (b) sec.append(b.el || b);
      el.append(sec);
      return sec;
    },

    /**
     * A nested stack, added to this one and returned: one block of the page
     * that is itself a column of blocks, at the same gap.
     */
    stack(cls2) {
      const s = createStack(undefined, cls2);
      el.append(s.el);
      return s;
    },
    /** How many blocks are in it, for a check that wants to say so. */
    get length() { return el.children.length; },
  };
  return api;
}

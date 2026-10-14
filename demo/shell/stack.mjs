// demo/shell/stack.mjs: the page is a stack of blocks and the stack owns the air between them.
// shell.css gives .pos-stack children one gap, --pos-gap, at a specificity a child's own margin
// loses to. A pair that belongs tight is one block. Imports nothing: shell.mjs imports it.
// why: lessons/kit-stack.md#header

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
   * Append blocks in order; null and undefined are skipped so a conditional block needs no if.
   * why: lessons/kit-stack.md#add
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
     * A heading and what it labels as one block: the component owns the small gap under the
     * heading and the ordinary one around the group. The section is itself a stack.
     * why: lessons/kit-stack.md#titled
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

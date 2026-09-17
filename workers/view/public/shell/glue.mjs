// demo/shell/glue.mjs — two or more blocks as ONE surface.
//
// 🔴 ASKED FOR 2026-09-18: *"do same treatment as for readout/logs for
// transport + timeline: can be separate or glued togehter"*. The readout and
// the log already had it (`mount({ joined: true })`), and the look they invented
// turned out not to be about readouts or logs at all: one border round the lot,
// a 1 px seam of `--line` between the parts, and the children giving up their
// own border and radius to the box. That is now `.pos-glue` in shell.css and
// this file is the way a page reaches it.
//
// ⚠️ SEPARATE IS STILL THE DEFAULT, on both pairs, and that is the point of the
// word "can" in the ask. Two blocks 22 px apart are two surfaces and the page
// stack already spaces them; gluing is a CLAIM that they are one object, which
// is true of a strip sitting on the transport bar that drives it and false of
// most other neighbours. A page that does not ask keeps what it has.
//
// ⚠️ WHY THIS IS NOT `createStack(host, 'pos-glue')`. A stack owns the AIR
// between blocks and a glue owns the absence of it: `.pos-stack`'s children
// carry `margin-top: var(--pos-gap)`, so an element that is both would space
// its parts by the page rhythm and then draw a seam in the middle of that gap.
// They are opposites wearing the same shape, and one function that did both
// would take a flag saying which.
//
// ⚠️ AND A GLUE OF ONE BLOCK IS THAT BLOCK, UNWRAPPED. A box drawn round a
// single child is a second border over the one the child already has, which is
// the doubled-edge defect `.pos-report` exists to avoid at the other end (a
// report holding only a log draws one border and no seam). A page building its
// blocks conditionally therefore cannot accidentally gain an edge.

import { el } from './shell.mjs';

/**
 * Glue blocks into one surface, in the order given.
 *
 * @param {...(Element|{el: Element}|null)} blocks the parts, top to bottom.
 *   `null` and `undefined` are SKIPPED, the same way `createStack().add` skips
 *   them and for the same reason: a page asks for its parts in one call and one
 *   of them is usually conditional, and an `if` around an append is how a block
 *   ends up somewhere else.
 * @returns {Element|null} the surface, the single block itself when only one
 *   survived, or `null` when none did — because a container with nothing in it
 *   must not paint its edges.
 */
export function createGlue(...blocks) {
  const parts = blocks.filter(Boolean).map((b) => b.el || b);
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];
  const box = el('div', 'pos-glue');
  box.append(...parts);
  return box;
}

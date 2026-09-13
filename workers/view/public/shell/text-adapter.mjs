// demo/shell/text-adapter.mjs — the `text-op` kind: a STATEFUL-DOCUMENT
//
// 🔴 PROMOTED FROM proto/text/text-adapter.js, UNCHANGED BELOW THIS HEADER. It
// was finished and measured and had never been given a page: 73 edits recorded
// through a real browser fold to the browser's own text character for
// character (48/48, cursor [48,48]), all 10 deletions had a range no event
// reported, and 62 of 62 ranges were settled by the post-edit cursor rather
// than by the raw diff. `demo/typist/` is the page.
//
// (was: the `text-op` kind: a STATEFUL-DOCUMENT adapter for
// timeline/transport.mjs.)
//
// This is the fifth attempt in this lineage at a text adapter and the first one
// that is allowed to seek. The four ancestors — time/public/demo2.html,
// demo12.html, demo-timeline-component.html, demo/pages/keyboard.vue and
// keyboard2.vue — all listened to `keydown` and tried to rebuild a cursor by
// hand, which is why every one of them carries an apologetic comment refusing
// arrow keys, and why the newest of them regressed to append-only.
// research/timeline-own-prior-art-2026-08.md §2:
//
//     "Replay needs the editing model, not the input stream. […] For text kinds
//      capture the semantic op/diff (or result), not keystrokes."
//
// So: CAPTURE THE OPERATION, NOT THE KEY.
//
//   FIX-1  the unit of the log is a document-model edit
//          `{type:'insert'|'delete'|'select', range:[start,end], text?}` —
//          an absolute range into the plain-text document, never a keycode.
//          Arrow keys are therefore not a special case; they are not even
//          visible to the capture (they produce no `beforeinput`), they only
//          move the selection, which rides as its own op.
//   FIX-2  the range is DERIVED FROM THE DOCUMENT, not reconstructed from the
//          key. `beforeinput` snapshots (value, selection); `input` reads the
//          new value; the op is the minimal contiguous replacement between
//          them, disambiguated by the POST-edit caret. This is exact for every
//          inputType the browser can produce — paste, drag, IME composition,
//          autocorrect, undo — because all of them are, in the end, one
//          contiguous replacement in a plain-text document.
//   FIX-3  NO RESOLVED MODIFIERS ARE EVER STORED. The double-application bug
//          (`shift ? key.toUpperCase() : key` written at capture AND re-applied
//          at replay, present in four ancestor files) cannot occur here: the
//          log stores the *resulting characters* the browser produced, and
//          replay splices them in verbatim. There is no modifier field.
//   FIX-4  reduce(prefix <= t) folds the ops into `{text, selection}` — a whole
//          document. THIS is what finally makes seek work for text: the state
//          at t is a pure function of the prefix, so the library's C2 property
//          (`assertState(reduce(prefix<=t)) === state after play(0->t)`) holds
//          on real text, selection included.
//
// Plain ESM, no deps, browser+node.

export const OP_INSERT = 'insert';
export const OP_DELETE = 'delete';
export const OP_SELECT = 'select';

// ---------------------------------------------------------------------------
// inputType policy. The document model of this kind is PLAIN TEXT, so the
// handled/unhandled split is not a list of special cases — it is one rule:
//
//   handled     = every inputType that changes the plain-text content
//   unhandled   = every inputType that changes only rich-text ATTRIBUTES or
//                 BLOCK STRUCTURE, because those produce no plain-text diff and
//                 there is nowhere in `{text, selection}` to put them.
//
// The handled set is open: an inputType nobody has heard of still arrives as a
// value diff and is still folded correctly. The unhandled set is closed and
// enumerated, so "we do not do rich text" is a declaration and not a silence.
// ---------------------------------------------------------------------------

export const UNHANDLED_INPUT_TYPES = new Set([
  // attribute-only: no plain-text diff exists to record
  'formatBold', 'formatItalic', 'formatUnderline', 'formatStrikeThrough',
  'formatSuperscript', 'formatSubscript', 'formatJustifyFull', 'formatJustifyCenter',
  'formatJustifyRight', 'formatJustifyLeft', 'formatIndent', 'formatOutdent',
  'formatRemove', 'formatSetBlockTextDirection', 'formatSetInlineTextDirection',
  'formatBackColor', 'formatFontColor', 'formatFontName',
  // block structure: not expressible in a flat string
  'insertOrderedList', 'insertUnorderedList', 'insertHorizontalRule',
]);

/** Coarse family used for op typing and for the performance timbre. */
export function classify(inputType = '') {
  if (UNHANDLED_INPUT_TYPES.has(inputType)) return 'unhandled';
  if (inputType.startsWith('delete')) return 'delete';
  if (inputType.startsWith('insert')) return 'insert';
  if (inputType === 'historyUndo' || inputType === 'historyRedo') return 'history';
  return 'other';
}

/** Composition inputTypes — kept as ordinary ops (see NOTES.md: an IME
 *  performance's intermediate states ARE part of the performance). */
export const COMPOSITION_INPUT_TYPES = new Set([
  'insertCompositionText', 'insertFromComposition', 'deleteByComposition',
]);

// ---------------------------------------------------------------------------
// deriveOp — the whole trick, in twenty lines.
//
// Between two values of a plain-text document produced by ONE editing action
// there is always exactly one contiguous replaced range. Common-prefix /
// common-suffix finds a range that produces the right text but is AMBIGUOUS
// when the edit touches repeated characters ("aa" + "a" could be at 0, 1 or 2)
// — and that ambiguity is precisely what corrupts the cursor. The post-edit
// caret disambiguates it: after an insert of L characters the caret sits at
// start + L; after a delete it sits at start. So we propose that window first
// and only fall back to the naive diff if the proposal does not reproduce the
// new value exactly.
// ---------------------------------------------------------------------------

/**
 * @param oldText  document before the edit (snapshotted at `beforeinput`)
 * @param newText  document after the edit (read at `input`)
 * @param caret    post-edit selectionStart — the disambiguator
 * @returns {type, range:[start,end], text?} | null when nothing changed
 */
export function deriveOp(oldText, newText, caret, inputType = '') {
  if (oldText === newText) return null;
  const oldLen = oldText.length, newLen = newText.length;
  let p = 0;
  const maxP = Math.min(oldLen, newLen);
  while (p < maxP && oldText.charCodeAt(p) === newText.charCodeAt(p)) p++;
  let s = 0;
  const maxS = Math.min(oldLen - p, newLen - p);
  while (s < maxS && oldText.charCodeAt(oldLen - 1 - s) === newText.charCodeAt(newLen - 1 - s)) s++;

  let removed = oldLen - p - s;
  let inserted = newLen - p - s;
  let start = p;
  let anchor = 'diff';

  const cand = caret - inserted;
  if (Number.isInteger(cand) && cand >= 0 && cand + removed <= oldLen && cand + inserted <= newLen) {
    const ins = newText.slice(cand, cand + inserted);
    if (oldText.slice(0, cand) + ins + oldText.slice(cand + removed) === newText) {
      start = cand; anchor = 'caret';
    }
  }

  const text = newText.slice(start, start + inserted);
  if (inserted === 0) return { type: OP_DELETE, range: [start, start + removed], inputType, anchor };
  return { type: OP_INSERT, range: [start, start + removed], text, inputType, anchor };
}

export function selectOp(start, end, dir = 'none') {
  return { type: OP_SELECT, range: [Math.min(start, end), Math.max(start, end)], dir };
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const clampRange = (r, n) => {
  const a = clamp(r[0] | 0, 0, n), b = clamp(r[1] | 0, 0, n);
  return a <= b ? [a, b] : [b, a];
};

// ---------------------------------------------------------------------------
// The reducer. `reduce(prefix <= t)` for a stateful-document kind returns the
// WHOLE DOCUMENT — this is the shape the library did not have a name for
// (a pointer's reduce returns a position, a note lane's returns a held-key Set;
// a text lane's returns a value). See NOTES.md, THE STATEFUL-DOCUMENT SEAM.
//
// Folds forward from the empty document over the complete ordered prefix the
// library guarantees (SEAM 5). Non-commutative by construction — which is
// exactly why SEAM 5 had to exist before this adapter could be written.
// ---------------------------------------------------------------------------

export function foldOps(payloads) {
  let text = '', sel = [0, 0], dir = 'none';
  let inserts = 0, deletes = 0, selects = 0, chars = 0, deleted = 0;
  for (const p of payloads) {
    const op = p && p.op;
    if (!op) continue;
    if (op.type === OP_SELECT) {
      sel = clampRange(op.range, text.length);
      dir = op.dir || 'none';
      selects++;
      continue;
    }
    const [a, b] = clampRange(op.range, text.length);
    if (op.type === OP_INSERT) {
      const t = op.text || '';
      text = text.slice(0, a) + t + text.slice(b);
      sel = [a + t.length, a + t.length]; dir = 'none';
      inserts++; chars += t.length; deleted += b - a;
    } else if (op.type === OP_DELETE) {
      text = text.slice(0, a) + text.slice(b);
      sel = [a, a]; dir = 'none';
      deletes++; deleted += b - a;
    }
  }
  return { text, selection: sel, dir, counts: { inserts, deletes, selects, chars, deleted }, ops: payloads.length };
}

// ---------------------------------------------------------------------------
// The adapter.
//
//   caps.discrete       — ops happen AT instants; nothing is defined between
//                         two of them (the opposite of proto/paths' pointer)
//   caps.catchUp        — 'reduce': a burst of stale keystrokes is meaningless
//                         for a document; folding them is the only right answer
//   caps.stateful       — NEW capability word. The surface carries state the
//                         individual events do not: you cannot actuate op #40
//                         onto a document that has not seen ops #1..#39.
//                         reduce()+assertState() is therefore MANDATORY, not
//                         an optimisation.
// ---------------------------------------------------------------------------

export function makeTextOpAdapter({ apply, assert, audio, source = 'text' } = {}) {
  const adapter = {
    source,
    fires: 0, reduceCalls: 0, assertCalls: 0, lastState: null, lastInfo: null,

    caps: {
      // --- shape of the kind ---
      discrete: true,
      continuous: false,
      interpolate: false,          // there is no half a character
      stateful: true,              // the document is state between the events
      documentModel: 'plain-text',
      captureModel: 'semantic-op', // beforeinput/input diff — NOT keydown
      // --- transport capability declaration (plan-timeline C3) ---
      seek: true,
      rate: true,
      catchUp: 'reduce',
      assertOnSeek: true,
      seekReduce: 'document',      // reduce() returns {text, selection}, not a scalar
      // --- provenance (plan-timeline §5b reconstruction spectrum) ---
      tier: 0,                     // tier 0: nothing is invented; every character is attested
      evidence: 'attested-ops',
      deviates: false,             // the renderer never deviates from the log
      // --- capture contract (§3 addenda) ---
      swallowOriginal: false,      // beforeinput is observed, never preventDefault'ed:
                                   // the browser stays the editor, we only watch it
      unhandledInputTypes: [...UNHANDLED_INPUT_TYPES],
    },

    /** Forward playback: apply ONE op to the live document, incrementally.
     *  This is the lane that must end up identical to the folded lane. */
    actuate(payload, rec, when) {
      adapter.fires++;
      apply && apply(payload, rec, when);
    },

    /** SEAM 5's complete ordered prefix, folded to a document. */
    reduce(payloads, pos, info) {
      adapter.reduceCalls++;
      const st = foldOps(payloads);
      st.pos = pos;
      return st;
    },

    /** Idempotent absolute assertion: set the value, then setSelectionRange. */
    assertState(state, info) {
      adapter.assertCalls++;
      adapter.lastState = state;
      adapter.lastInfo = info;
      assert && assert(state, info);
    },
  };
  if (audio && audio.ctx) adapter.caps.audio = { ctx: audio.ctx, leadMs: audio.leadMs ?? 0 };
  return adapter;
}

// ---------------------------------------------------------------------------
// jsonl round-trip. One row per line; the header row carries the session.
// ---------------------------------------------------------------------------

export function toJsonl(rows, header = {}) {
  return [JSON.stringify({ v: 1, kind: 'text-op', ...header }), ...rows.map((r) => JSON.stringify(r))].join('\n');
}

export function fromJsonl(str) {
  const lines = String(str).split('\n').map((l) => l.trim()).filter(Boolean);
  let header = null;
  const rows = [];
  for (const l of lines) {
    const o = JSON.parse(l);
    if (o.v && !o.op) { header = o; continue; }
    if (o.op) rows.push(o);
  }
  return { header, rows };
}

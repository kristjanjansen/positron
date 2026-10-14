// demo/shell/text-adapter.mjs: the `text-op` kind, a stateful-document adapter for
// timeline/transport.mjs. It captures the edit operation `{type, range, text?}`, never the
// key, so arrows and modifiers are not special cases and reduce(prefix <= t) is the document.
// why: lessons/kit-text-adapter.md#header

export const OP_INSERT = 'insert';
export const OP_DELETE = 'delete';
export const OP_SELECT = 'select';

// inputType policy: the model is plain text, so every inputType that changes the text is
// handled (an unknown one still arrives as a value diff), and the closed set below only
// changes rich-text attributes or block structure.
// why: lessons/kit-text-adapter.md#input-types

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

// deriveOp: one edit is one contiguous replaced range. A prefix/suffix diff is ambiguous on
// repeated characters, so the window implied by the post-edit caret is tried first.
// why: lessons/kit-text-adapter.md#derive-op

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

// The reducer: folds forward from the empty document over the ordered prefix (SEAM 5) and
// returns the whole document. Non-commutative by construction.
// why: lessons/kit-text-adapter.md#fold-ops

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

// The adapter: `discrete` (ops happen at instants), catchUp `reduce`, and `stateful`, which
// makes reduce()+assertState() mandatory: op 40 needs a document that has seen ops 1 to 39.
// why: lessons/kit-text-adapter.md#adapter

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

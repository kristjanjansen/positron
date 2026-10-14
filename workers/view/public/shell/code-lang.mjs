// demo/shell/code-lang.mjs: one tokenizer, a rule table per language, and the parameter finder.
// Pure, graded in node. It never throws and never drops a character: tokens joined are the input.
// A language is data, `{ name, rules: [[RegExp, type]], params?(src) }`; first sticky match wins.
// why: lessons/kit-code-lang.md#header

// ── the engine ──────────────────────────────────────────────────────────────

/**
 * @param {string} src
 * @param {{rules: [RegExp, string][]}} lang
 * @returns {{from: number, to: number, type: string}[]}  covering src exactly
 */
export function tokenize(src, lang) {
  const rules = lang._sticky ??= lang.rules.map(([re, type]) =>
    [new RegExp(re.source, re.flags.replace(/[gy]/g, '') + 'y'), type]);
  const out = [];
  let i = 0, plainFrom = 0;
  const flush = (to) => { if (to > plainFrom) out.push({ from: plainFrom, to, type: '' }); };
  while (i < src.length) {
    let hit = null;
    for (const [re, type] of rules) {
      re.lastIndex = i;
      const m = re.exec(src);
      if (m && m[0].length) { hit = { from: i, to: i + m[0].length, type }; break; }
    }
    if (hit) { flush(i); out.push(hit); i = hit.to; plainFrom = i; }
    else i++;
  }
  flush(src.length);
  return out;
}

/** A predicate: is offset `i` inside a comment or a string of this language. */
function deadZones(src, lang) {
  const d = tokenize(src, lang).filter((t) => t.type === 'comment' || t.type === 'string');
  return (i) => d.some((t) => i >= t.from && i < t.to);
}

/**
 * The index just after the `)` closing the `(` at `open`, skipping strings and
 * comments. -1 while the call is still being typed, which the finders answer
 * by ending the snippet after its name rather than running it to the end.
 */
function closeParen(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"') { i = src.indexOf('"', i + 1); if (i < 0) return -1; continue; }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) return -1; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2); if (i < 0) return -1; i++; continue; }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i + 1;
  }
  return -1;
}

// ── Faust ──
// Word lists read from Grame's own Monarch tokenizer for the Faust IDE.
// why: lessons/kit-code-lang.md#faust

const FAUST_KW = 'import|component|library|environment|declare|with|letrec|where|process|effect'
  + '|seq|par|sum|prod|inputs|outputs';
const FAUST_PRIM = 'mem|prefix|int|float|rdtable|rwtable|select2|select3|ffunction|fconstant|fvariable'
  + '|attach|button|checkbox|hslider|vslider|nentry|hgroup|vgroup|tgroup|hbargraph|vbargraph'
  + '|soundfile|waveform|route|sin|cos|tan|asin|acos|atan|atan2|exp|log|log10|pow|sqrt|abs'
  + '|min|max|fmod|remainder|floor|ceil|rint';

/** The Faust UI primitives that make a control a person can set. */
const FAUST_CONTROL = /\b(hslider|vslider|nentry|checkbox|button)\s*\(\s*"([^"\n]*)"/g;

/**
 * What Faust's own UI JSON calls a control whose label is `raw`: metadata in
 * square brackets removed, and a group path (`h:osc/freq`) down to its last
 * part. MEASURED against libfaust 2.89.2: `"h:g/cut[unit:Hz]"` is `cut`.
 */
export function faustName(raw) {
  return raw.replace(/\[[^\]]*\]/g, '').split('/').pop().replace(/^[hvt]:/, '').trim();
}

export const faust = {
  name: 'faust',
  rules: [
    [/\/\/[^\n]*/, 'comment'],
    [/\/\*[\s\S]*?(?:\*\/|$)/, 'comment'],
    [/"(?:[^"\\\n]|\\.)*"?/, 'string'],
    // os. en. fi. de. no. pm. ma. si. ba.: dimmed, so `osc` stands out rather than `os`
    [/\b[a-z]{2,3}(?=\.[A-Za-z_])/, 'lib'],
    [new RegExp(`\\b(?:${FAUST_KW})\\b`), 'keyword'],
    [new RegExp(`\\b(?:${FAUST_PRIM})\\b`), 'builtin'],
    [/\b\d+(?:\.\d*)?(?:[eE][-+]?\d+)?|\.\d+(?:[eE][-+]?\d+)?/, 'number'],
    // The comma is left plain: colouring it lit every `hslider(...)` argument list.
    // why: lessons/kit-code-lang.md#comma
    [/<:|:>|[:~]/, 'compose'],
    [/[A-Za-z_][A-Za-z0-9_]*/, ''],
  ],
  /**
   * `hslider("cutoff", 1200, 40, 8000, 1)`: the whole call is the snippet and
   * the quoted label is the name. A call inside a comment or a string is not
   * a parameter. A call with no `)` yet ends after its label.
   */
  params(src) {
    const dead = deadZones(src, faust), out = [];
    FAUST_CONTROL.lastIndex = 0;
    let m;
    while ((m = FAUST_CONTROL.exec(src))) {
      // Resume one character on, not after the match: a dead match can cross a closing quote.
      // why: lessons/kit-code-lang.md#resume
      if (dead(m.index)) { FAUST_CONTROL.lastIndex = m.index + 1; continue; }
      const open = src.indexOf('(', m.index);
      const q = src.indexOf('"', open);
      const nameTo = q + m[2].length + 2;
      const end = closeParen(src, open);
      out.push({ name: faustName(m[2]), from: m.index, to: end < 0 ? nameTo : end,
                 nameFrom: q, nameTo, kind: m[1] });
    }
    return out;
  },
};

// ── SuperCollider, the subset `sclang-lite.mjs` compiles ──
// Shaped on Prism's `supercollider` (MIT); `sclang-lite`'s `lex()` throws and drops comments.
// Nested `/* /* */ */` is not handled; no preset nests.
// why: lessons/kit-code-lang.md#sclang

export const sclang = {
  name: 'sclang',
  rules: [
    [/\/\/[^\n]*/, 'comment'],
    [/\/\*[\s\S]*?(?:\*\/|$)/, 'comment'],
    [/"(?:[^"\\]|\\.)*"?/, 'string'],
    [/\\[A-Za-z_]\w*|'(?:[^'\\\n]|\\.)*'?/, 'symbol'],
    [/\$\\?./, 'string'],                                  // $a, a character literal
    [/\b(?:arg|var|classvar|const|this|nil|true|false|inf|pi)\b/, 'keyword'],
    [/\b[a-z_]\w*(?=\s*:(?!:))/, 'key'],                    // doneAction:
    [/\b[A-Z]\w*/, 'class'],                                // SinOsc, EnvGen, Env
    [/\b\d+(?:\.\d+)?(?:[eE][-+]?\d+)?(?:pi)?\b/, 'number'],
    [/~[a-z]\w*/, 'env'],
    // the rate is what the compiler most often refuses, so it is coloured apart
    [/\.(?:ar|kr|ir|tr)\b/, 'rate'],
    [/[A-Za-z_]\w*/, ''],
  ],
  /**
   * Two shapes. The function's own arguments, `|freq = 220, amp = 0.1|` or
   * `arg freq = 220;`, where the snippet is `name = default`. And a named
   * control, `\cutoff.kr(1200)`, where the snippet is the whole expression and
   * the name is the symbol.
   */
  params(src) {
    const dead = deadZones(src, sclang), out = [];
    let brace = -1;
    for (let i = src.indexOf('{'); i >= 0; i = src.indexOf('{', i + 1)) if (!dead(i)) { brace = i; break; }
    if (brace >= 0) {
      // skip white space and comments between the { and the argument list
      let k = brace + 1;
      for (;;) {
        const ws = /\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\//y;
        ws.lastIndex = k;
        if (!ws.exec(src)) break;
        k = ws.lastIndex;
      }
      const lm = /\|([^|]*)\||arg\b([^;]*);/y;
      lm.lastIndex = k;
      const m = lm.exec(src);
      if (m) {
        const body = m[1] ?? m[2];
        const bodyFrom = k + (m[1] != null ? 1 : 3);
        const re = /([A-Za-z_]\w*)(?:\s*=\s*(?:-?[\d.]+(?:[eE][-+]?\d+)?|-?[A-Za-z_]\w*))?/g;
        let a;
        while ((a = re.exec(body))) {
          const from = bodyFrom + a.index;
          out.push({ name: a[1], from, to: from + a[0].length,
                     nameFrom: from, nameTo: from + a[1].length, kind: 'arg' });
        }
      }
    }
    const nc = /\\([A-Za-z_]\w*)\.(kr|ar|ir|tr)\b/g;
    let m;
    while ((m = nc.exec(src))) {
      if (dead(m.index)) { nc.lastIndex = m.index + 1; continue; }
      const after = m.index + m[0].length;
      const end = src[after] === '(' ? closeParen(src, after) : after;
      out.push({ name: m[1], from: m.index, to: end < 0 ? after : end,
                 nameFrom: m.index, nameTo: m.index + 1 + m[1].length, kind: 'named' });
    }
    return out.sort((x, y) => x.from - y.from);
  },
};

// ── Csound score ──
// A score, not an orchestra: a statement letter, then p-fields. No parameters, p-fields are positions.
// why: lessons/kit-code-lang.md#csound-sco

export const csoundSco = {
  name: 'csound-sco',
  rules: [
    [/;[^\n]*|\/\/[^\n]*/, 'comment'],
    [/\/\*[\s\S]*?(?:\*\/|$)/, 'comment'],
    [/"(?:[^"\\\n]|\\.)*"?/, 'string'],
    [/(?<=^[ \t]*)[abCdefimnqrstvxy](?=[ \t\n]|$)/m, 'keyword'],   // the statement letter
    [/(?<=^[ \t]*[mn][ \t]+)[A-Za-z_]\w*/m, 'label'],             // m theme, n theme
    [/[+^<>!]|\.(?!\d)|np\d+|pp\d+/, 'carry'],                    // a carried or ramped p-field; `.5` is a number
    [/-?\d+(?:\.\d*)?(?:[eE][-+]?\d+)?|-?\.\d+/, 'number'],
    [/[A-Za-z_]\w*/, ''],
  ],
  /**
   * What a line is (`part`, `event`, `tempo`), so a page can draw it in its strip lane's colour.
   * Comments keep their own ink.
   * why: lessons/kit-code-lang.md#linekind
   */
  lineKind: (line) => {
    const m = /^[ \t]*([a-zA-Z])(?=[ \t]|$)/.exec(line);
    if (!m) return null;
    return m[1] === 'i' ? 'event' : m[1] === 't' ? 'tempo' : (m[1] === 'm' || m[1] === 'n') ? 'part' : null;
  },
};

export const LANGS = { faust, sclang, 'csound-sco': csoundSco };

/** A language by name, or a table handed in whole. Throws on an unknown name. */
export function langOf(language) {
  if (language && typeof language === 'object' && Array.isArray(language.rules)) return language;
  const lang = LANGS[language];
  if (!lang) throw new Error(`code-lang: no language called ${language}; there is ${Object.keys(LANGS).join(', ')}`);
  return lang;
}

/** The parameters a program declares, `[{ name, from, to, nameFrom, nameTo, kind }]`. */
export function findParams(src, language) {
  const lang = langOf(language);
  return lang.params ? lang.params(String(src ?? '')) : [];
}

// ── drawing ─────────────────────────────────────────────────────────────────

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The class a token of `type` is drawn with. Colour only, see `shell.css`. */
export const tokenClass = (type) => `pos-tk-${type}`;

/**
 * The program as HTML: one span per coloured token, and one span around each
 * parameter's snippet. Tokens that straddle a snippet's edge are split there.
 * A parameter always gets its span with `data-param`, so a knob can find it;
 * it gets a `data-hue` and `--param-hue` only when `hueOf(name)` answers a number,
 * which is how a key-driven parameter stays uncoloured.
 * @param {string} src
 * @param {string|object} language
 * @param {{hueOf?: (name: string) => number|null, active?: Set<string>}} [o]
 */
export function render(src, language, { hueOf = () => null, active = null } = {}) {
  src = String(src ?? '');
  const lang = langOf(language);
  const toks = tokenize(src, lang);
  // Overlapping snippets cannot both be one span: the later one is dropped.
  const params = [];
  for (const p of findParams(src, lang)) {
    if (p.to <= p.from) continue;
    if (params.length && p.from < params[params.length - 1].to) continue;
    params.push(p);
  }
  // The variable a knob's control is bound to wears the knob's hue, and so does every use of it.
  // Only a bare identifier token is matched.
  // why: lessons/kit-code-lang.md#bound
  const bound = new Map();
  for (const p of params) {
    const hue = hueOf(p.name);
    if (!(typeof hue === 'number' && Number.isFinite(hue))) continue;
    if (p.kind === 'arg') { bound.set(p.name, { name: p.name, hue }); continue; }
    const lineStart = src.lastIndexOf('\n', p.from - 1) + 1;
    const m = /(?:^|[^\w.])([A-Za-z_]\w*)\s*=\s*$/.exec(src.slice(lineStart, p.from));
    // Only when it is the only control in that definition; a mix of two gets no hue.
    // why: lessons/kit-code-lang.md#only-control
    const semi = src.indexOf(';', p.to);
    const end = semi < 0 ? src.length : semi;
    const alone = !params.some((o) => o !== p && o.from >= lineStart && o.from < end);
    if (m && alone) bound.set(m[1], { name: p.name, hue });
  }
  const cuts = new Set();
  for (const p of params) for (const k of [p.from, p.to, p.nameFrom, p.nameTo]) cuts.add(k);
  const pieces = [];
  for (const t of toks) {
    let a = t.from;
    for (let k = t.from + 1; k < t.to; k++) if (cuts.has(k)) { pieces.push({ ...t, from: a, to: k }); a = k; }
    pieces.push({ ...t, from: a });
  }
  // The kind of the line each offset sits on, when the language says (see
  // `csoundSco.lineKind`). A token takes the kind of the line it starts on.
  const starts = [0];
  if (lang.lineKind) for (let k = 0; k < src.length; k++) if (src[k] === '\n') starts.push(k + 1);
  const kinds = lang.lineKind ? starts.map((a, n) => lang.lineKind(src.slice(a, n + 1 < starts.length ? starts[n + 1] - 1 : src.length))) : [];
  let ln = 0;
  const kindAt = (i) => { while (ln + 1 < starts.length && starts[ln + 1] <= i) ln++; return kinds[ln]; };
  let html = '', pi = 0, open = null;
  for (const t of pieces) {
    if (open && t.from >= open.to) { html += '</span>'; open = null; }
    while (!open && pi < params.length && params[pi].to <= t.from) pi++;
    if (!open && pi < params.length && t.from >= params[pi].from) {
      open = params[pi++];
      const hue = hueOf(open.name);
      const hued = typeof hue === 'number' && Number.isFinite(hue);
      html += `<span class="pos-tk-p" data-param="${esc(open.name)}"`
        + (hued ? ` data-hue="${hue}" style="--param-hue:${hue}"` : '')
        + (active?.has(open.name) ? ' data-active="1"' : '') + '>';
    }
    const txt = esc(src.slice(t.from, t.to));
    const isName = open && t.from >= open.nameFrom && t.to <= open.nameTo;
    const kind = lang.lineKind && t.type && t.type !== 'comment' ? kindAt(t.from) : null;
    const cls = [t.type && tokenClass(t.type), isName && 'pos-tk-pname', kind && `pos-ln-${kind}`].filter(Boolean).join(' ');
    const v = !t.type && !isName ? bound.get(src.slice(t.from, t.to)) : null;
    if (v) {
      html += `<span class="pos-tk-pvar" data-param="${esc(v.name)}" data-hue="${v.hue}" style="--param-hue:${v.hue}"`
        + (active?.has(v.name) ? ' data-active="1"' : '') + `>${txt}</span>`;
      continue;
    }
    html += cls ? `<span class="${cls}">${txt}</span>` : txt;
  }
  if (open) html += '</span>';
  return { html, params, tokens: toks.length };
}

// ── one hue per knob parameter ──────────────────────────────────────────────

/**
 * Six hues, neighbours far apart on the wheel; every `hsl(h 75% 72%)` is above 6:1 on `--bg`.
 * No yellow, no red, no green near 145: those are `--hi`, `--bad`, `--ok`.
 * why: lessons/kit-code-lang.md#param-hues
 */
export const PARAM_HUES = [205, 330, 168, 278, 28, 250];

/**
 * The one map from parameter name to hue, shared by code box and knob row. `assign(names)` on a
 * successful compile only; `clear()` on a preset; past six a name gets none and `cuts` says so.
 * why: lessons/kit-code-lang.md#createhuebook
 */
export function createHueBook({ hues = PARAM_HUES } = {}) {
  const book = new Map();
  const listeners = new Set();
  const cuts = [];
  const changed = () => { for (const f of listeners) f(); };
  return {
    hues: [...hues],
    cuts,
    assign(names) {
      const want = [...new Set(names)];
      let moved = false;
      for (const n of [...book.keys()]) if (!want.includes(n)) { book.delete(n); moved = true; }
      for (const n of want) {
        if (book.has(n)) continue;
        const used = new Set(book.values());
        const free = hues.find((h) => !used.has(h));
        if (free === undefined) { cuts.push(`${n}: no hue left, ${hues.length} are in use`); continue; }
        book.set(n, free);
        moved = true;
      }
      if (moved) changed();
      return this;
    },
    clear() { if (book.size) { book.clear(); changed(); } return this; },
    hueOf: (name) => (book.has(name) ? book.get(name) : null),
    names: () => [...book.keys()],
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
  };
}

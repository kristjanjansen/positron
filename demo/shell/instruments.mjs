// demo/shell/instruments.mjs: what the things on this desk are called. A port name is what the OS
// calls a cable, not the object, its maker or its kind. It is data, never derived from the string,
// and the raw name is always kept. Test: `node demo/shell/instruments-test.mjs`.
// why: lessons/kit-instruments.md#header

/** What kind of thing it is, in a word a visitor would use. */
export const KINDS = ['keyboard', 'synth', 'drum machine', 'mixer', 'soundcard', 'bus'];

/**
 * The desk. Every entry is a thing somebody can point at, except the last.
 * `match` the likely port name, `maker` the brand, `model` the maker's name, `kind` one of `KINDS`,
 * `also` other words in order of likelihood, `plays` false if nobody presses a key, `note` one sentence.
 * why: lessons/kit-instruments.md#desk
 */
export const DESK = [
  {
    match: /mk-?4\d\dc|evolution/i,
    maker: 'Evolution', model: 'MK-425C', kind: 'keyboard',
    also: ['controller', 'midi keyboard'],
    // Measured: 25 keys, notes 47 to 71, global channel 2, no sound engine (empty `accepts` on /bay/).
    // why: lessons/kit-instruments.md#evolution
    note: 'a 25 key controller with no sound engine of its own',
  },
  {
    match: /^\s*circuit\s*$/i,
    maker: 'Novation', model: 'Circuit', kind: 'synth',
    /* Both words are true and both get used about it, so both are offered. */
    also: ['drum machine', 'groovebox'],
    note: 'two synth voices and four drum parts, and it has no factory reset',
  },
  {
    match: /circuit\s*tracks/i,
    maker: 'Novation', model: 'Circuit Tracks', kind: 'synth',
    also: ['drum machine', 'groovebox'],
    // Not plugged in, so `resolve()` skips it; its aliases would double every Circuit hit.
    // Kept because its patch header differs from the Circuit's at byte 5 (0x64 vs 0x60).
    // why: lessons/kit-instruments.md#tracks
    present: false,
    note: 'a different and later instrument, not the one on this desk',
  },
  /**
   * The DAW control port must come first, because `find` stops at the first match.
   * It is a different thing: it speaks Mackie Control, the MIDI pair carries notes and controllers.
   * why: lessons/kit-instruments.md#daw-control
   */
  {
    match: /model\s*12.*daw|daw.*model\s*12/i,
    maker: 'TASCAM', model: 'Model 12 DAW control', kind: 'mixer',
    also: ['Model 12', 'desk', 'mackie control'],
    note: 'the mixer control surface, which sends nothing unless DAW mode is on',
  },
  {
    match: /model\s*12/i,
    maker: 'TASCAM', model: 'Model 12', kind: 'mixer',
    also: ['desk', 'audio interface'],
    note: 'twelve channels, and its DAW control has to be switched on to send anything',
  },
  {
    match: /fast\s*track/i,
    maker: 'M-Audio', model: 'Fast Track Pro', kind: 'soundcard',
    // `Fast Track` is here on evidence: speech models drop or mangle `Pro` (4 misses in 3 models).
    // why: lessons/kit-instruments.md#fast-track
    also: ['Fast Track', 'audio interface', 'converter'],
    // Measured: the Circuit's left output is capture channel 1 at 48 kHz 16 bit.
    // why: lessons/kit-instruments.md#fast-track-capture
    note: 'two in and two out, and it carries the Circuit into a recording',
  },
  {
    match: /\biac\b|loopback|virtual/i,
    maker: 'Apple', model: 'IAC Driver', kind: 'bus',
    also: ['loopback', 'virtual bus'],
    // `plays: false` is behaviour: a loopback echoes what is sent, so /bay/ would link it as played.
    // It keeps its row; it is pressed, never played.
    // why: lessons/kit-instruments.md#iac
    plays: false,
    note: 'a virtual bus for reaching another application on this machine',
  },
];

/** A trailing direction word an operating system adds to one end of a cable. */
const DIR = /[\s_-]+(in|out|input|output)$/i;

/**
 * What is this, as far as anybody here knows? An unknown name gets no maker, kind or brand:
 * the raw name with its direction word trimmed, and `known: false`.
 * @param {string} raw the port name the operating system gave
 * @returns {{raw:string, label:string, full:string, maker:string|null, model:string|null, kind:string|null, words:string[], plays:boolean, note:string, known:boolean}}
 * why: lessons/kit-instruments.md#describe
 */
export function describe(raw) {
  const s = String(raw ?? '').trim();
  const bare = s.replace(DIR, '').trim() || s || 'unnamed';
  const hit = DESK.find((d) => d.match.test(s));
  if (!hit) {
    return { raw: s, label: bare, full: bare, maker: null, model: null, kind: null,
      words: [bare], plays: true, note: '', known: false };
  }
  const full = `${hit.maker} ${hit.model}`;
  /**
   * Every word a person might say, most specific first, deduplicated, raw port name included.
   * Order matters where a caller truncates.
   * why: lessons/kit-instruments.md#words
   */
  const words = [...new Set([full, hit.maker, hit.model, hit.kind, ...(hit.also || []), bare])]
    .filter(Boolean);
  return { raw: s, label: full, full, maker: hit.maker, model: hit.model, kind: hit.kind,
    words, plays: hit.plays !== false, note: hit.note || '', known: true };
}

/** One line for a model's prompt, or nothing when there is nothing to add. */
export function alias(raw) {
  const d = describe(raw);
  if (!d.known) return '';
  const rest = d.words.filter((w) => w.toLowerCase() !== d.full.toLowerCase());
  return rest.length ? `also called: ${rest.join(', ')}` : '';
}

// Hearing a name wrong. Repair belongs at the transcription, not the model: its `from` and `to`
// are an enum of real port ids, so it cannot return a fuzzy name.
// A correction must be visible in the editable transcript and reported beside it.
// why: lessons/kit-instruments.md#hearing

/** Digits said out loud. Enough for a model number, not a general parser. */
const SPOKEN = { zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12',
  twenty: '2', thirty: '3', forty: '4', fifty: '5' };

/**
 * Down to the letters and digits that carry meaning.
 * `four twenty five` becomes `425`, not `4205`: a spoken model number, never a quantity.
 * why: lessons/kit-instruments.md#normalise
 */
export function normalise(s) {
  return tokenise(s).map((t) => t.word).join(' ');
}

/**
 * The same words `normalise()` produces, each with its offset in the raw string, so a correction
 * can land in the box a person reads. `normalise()` is written in terms of this, so they cannot drift.
 * A joined digit run keeps the whole span, separators included.
 * @param {string} s
 * @returns {{word:string, at:number, to:number}[]} `at` and `to` index the RAW string, so `s.slice(at, to)` is the words as they were said.
 * why: lessons/kit-instruments.md#tokenise
 */
export function tokenise(s) {
  const raw = String(s ?? '');
  const out = [];
  for (const m of raw.matchAll(/[a-z0-9]+/gi)) {
    const w = m[0].toLowerCase();
    const word = SPOKEN[w] ?? w;
    const prev = out[out.length - 1];
    /* The digit join, which `normalise()` used to do with a lookbehind over the
       whole string. Same rule, one token at a time: a run of digits said out
       loud is one number. */
    if (prev && /^\d+$/.test(prev.word) && /^\d+$/.test(word)) {
      prev.word += word;
      prev.to = m.index + m[0].length;
      continue;
    }
    out.push({ word, at: m.index, to: m.index + m[0].length });
  }
  return out;
}

/**
 * A crude sound of a word: drop vowels after the first character, fold consonants a microphone
 * confuses, collapse runs. Not Soundex or Metaphone. Deliberately weak: safety is in the threshold.
 * why: lessons/kit-instruments.md#sounds
 */
export function sounds(s) {
  return normalise(s)
    .replace(/[^a-z0-9]/g, '')
    .replace(/[sz]/g, 's').replace(/[ckq]/g, 'k').replace(/[dt]/g, 't')
    .replace(/[bpv]/g, 'p').replace(/[fw]/g, 'f').replace(/[gj]/g, 'j')
    .replace(/(?!^)[aeiouyh]/g, '')
    .replace(/(.)\1+/g, '$1');
}

/** Damerau-Levenshtein, iterative, because a transposition is the commonest slip. */
function dist(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let prev2 = [], prev = [...Array(n + 1).keys()], cur;
  for (let i = 1; i <= m; i++) {
    cur = [i];
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
      }
    }
    prev2 = prev; prev = cur;
  }
  return prev[n];
}

/**
 * The threshold is where the safety lives, and it is per length. A key or a heard span under four
 * characters is never matched by sound: `card` and `chord` reduce to `krt`, one edit from two instruments.
 * why: lessons/kit-instruments.md#threshold
 */
const MIN_SOUND_LEN = 4;
const allowed = (len) => (len <= 5 ? 1 : len <= 9 ? 1 : 2);

/**
 * The words an instruction is made of; every one was a real false match (`connect` vs `circuit`).
 * A span containing one is refused whole. `control` is here because it is one edit from `controller`.
 * A false negative costs one edited word; a false positive routes an instrument nobody named.
 * why: lessons/kit-instruments.md#stop
 */
const STOP = new Set(['connect', 'connects', 'connected', 'route', 'routes', 'send', 'sends',
  'play', 'plays', 'played', 'put', 'puts', 'make', 'makes', 'made', 'take', 'takes',
  'set', 'sets', 'add', 'adds', 'remove', 'removes', 'move', 'moves', 'turn', 'turns',
  'from', 'into', 'onto', 'with', 'and', 'the', 'a', 'an', 'to', 'on', 'off', 'up',
  'down', 'all', 'every', 'please', 'can', 'you', 'it', 'its', 'my', 'this', 'that',
  'then', 'now', 'also', 'again', 'but', 'for', 'of', 'in', 'out', 'at', 'by', 'as',
  'so', 'if', 'do', 'does', 'is', 'are', 'be', 'let', 'want', 'need', 'give',
  // All four inflections: `a controlled sound` still found the keyboard with two.
  // why: lessons/kit-instruments.md#stop-control
  'control', 'controls', 'controlled', 'controlling',
  // `bus` is here for the exact branch: `the master bus` resolved to the IAC Driver.
  // `virtual bus`, `loopback` and `Apple` still reach it.
  // why: lessons/kit-instruments.md#stop-bus
  'bus']);

const hasStop = (span) => span.split(' ').some((t) => STOP.has(t));

/**
 * Which instruments does this sentence name, including badly? `at` and `to` index the raw
 * string, so `text.slice(at, to)` is what a correction replaces; `said` is the normalised span.
 * @param {string} text what was heard
 * @returns {{said:string, word:string, full:string, kind:string|null, how:'exact'|'sound', at:number, to:number, i:number, n:number, entry:object}[]} one hit per instrument, best first, never two hits for one instrument.
 * why: lessons/kit-instruments.md#resolve
 */
export function resolve(text) {
  const raw = String(text ?? '');
  const tok = tokenise(raw);
  const tokens = tok.map((t) => t.word);
  const best = new Map();                 // full name -> hit

  const offer = (entry, word, said, how, cost, i, n) => {
    const key = `${entry.maker} ${entry.model}`;
    const prev = best.get(key);
    if (prev && (prev.how === 'exact' || prev.cost <= cost)) return;
    best.set(key, { said, word, full: key, kind: entry.kind, how, cost,
      i, n, at: tok[i].at, to: tok[i + n - 1].to, entry });
  };

  /**
   * Where a whole alias sits in the sentence, as a token index, or -1.
   * why: lessons/kit-instruments.md#findwhole
   */
  const findWhole = (w) => {
    const want = w.split(' ');
    for (let i = 0; i + want.length <= tokens.length; i++) {
      let hit = true;
      for (let j = 0; j < want.length; j++) if (tokens[i + j] !== want[j]) { hit = false; break; }
      if (hit) return i;
    }
    return -1;
  };

  for (const entry of DESK) {
    if (entry.present === false) continue;
    const words = [...new Set([`${entry.maker} ${entry.model}`, entry.maker, entry.model,
      entry.kind, ...(entry.also || [])])].filter(Boolean);
    for (const word of words) {
      const w = normalise(word);
      if (!w) continue;
      // An alias that is one stop word names nothing on either branch; a multi-word alias is untouched.
      // why: lessons/kit-instruments.md#stop-alias
      if (!w.includes(' ') && STOP.has(w)) continue;
      /* Exact first and it wins outright: a sentence that named the thing
         properly must never be "corrected" to something else. */
      const whole = findWhole(w);
      if (whole >= 0) { offer(entry, word, w, 'exact', 0, whole, w.split(' ').length); continue; }

      const wk = sounds(word);
      if (wk.length < MIN_SOUND_LEN) continue;
      const span = w.split(' ').length;
      // The window runs from one token to two past the key: speech models join (`MK425C`) and split
      // (`groove a box`) tokens. The three guards below keep it safe, not the width.
      // why: lessons/kit-instruments.md#window
      for (let n = 1; n <= span + 2; n++) {
        for (let i = 0; i + n <= tokens.length; i++) {
          const said = tokens.slice(i, i + n).join(' ');
          const sk = sounds(said);
          /**
           * A stop word vetoes a span unless removing it leaves the key unchanged (`groove a box`).
           * Negative control: `crack the gate open` must not become the Circuit. 0 of 132 ordinary phrases change.
           * why: lessons/kit-instruments.md#veto
           */
          if (hasStop(said)) {
            const kept = said.split(' ').filter((t) => !STOP.has(t)).join(' ');
            if (!kept || sounds(kept) !== sk) continue;
          }
          // Three guards, each bought by a measured false match: first sound agrees, lengths are close,
          // and only then the distance.
          // why: lessons/kit-instruments.md#guards
          if (!sk || sk.length < MIN_SOUND_LEN) continue;
          if (sk[0] !== wk[0]) continue;
          if (Math.abs(sk.length - wk.length) > 1) continue;
          const d = dist(sk, wk);
          if (d <= allowed(wk.length)) offer(entry, word, said, 'sound', d, i, n);
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => a.cost - b.cost);
}

/**
 * What a page does with what `resolve()` found. A hit strictly inside another's span goes; an
 * instrument the caller lacks is reported, never substituted; two real instruments on one span are
 * left as said. Only `how: 'sound'` is rewritten, and every change comes back in `fixed`.
 * @param {string} text what was heard
 * @param {{has?: (full:string) => boolean}} [opts] `has` answers whether an instrument is one the caller can actually patch. The default is everything on `DESK`.
 * @returns {{text:string, fixed:{was:string, full:string, at:number, to:number}[], unsure:{was:string, names:string[]}[], absent:{was:string, names:string[]}[], hits:object[]}}
 * why: lessons/kit-instruments.md#reword
 */
export function reword(text, opts = {}) {
  const raw = String(text ?? '');
  const has = opts.has || (() => true);
  const all = resolve(raw);

  /* Rule 1, before anything else looks at a group: a span strictly inside
     another span was never a second instrument. */
  const hits = all.filter((h) => !all.some((o) => o !== h
    && o.at <= h.at && o.to >= h.to && (o.to - o.at) > (h.to - h.at)));

  /* What is left, grouped by overlapping text. Sorted by position, because a
     group is built by walking left to right and a replacement is applied right
     to left. */
  const groups = [];
  for (const h of [...hits].sort((a, b) => a.at - b.at || a.to - b.to)) {
    const g = groups[groups.length - 1];
    if (g && h.at < g.to) { g.hits.push(h); g.to = Math.max(g.to, h.to); }
    else groups.push({ at: h.at, to: h.to, hits: [h] });
  }

  const fixed = [], unsure = [], absent = [];
  for (const g of groups) {
    const here = g.hits.filter((h) => has(h.full));
    const was = raw.slice(g.at, g.to);
    if (!here.length) { absent.push({ was, names: g.hits.map((h) => h.full) }); continue; }
    if (here.length > 1) { unsure.push({ was, names: here.map((h) => h.full) }); continue; }
    const h = here[0];
    if (h.how === 'sound') fixed.push({ was: raw.slice(h.at, h.to), full: h.full, at: h.at, to: h.to });
  }

  /* Right to left, so an earlier offset is still an offset into the string it
     was measured against. */
  let out = raw;
  for (const f of [...fixed].sort((a, b) => b.at - a.at)) {
    out = out.slice(0, f.at) + f.full + out.slice(f.to);
  }
  return { text: out, fixed, unsure, absent, hits };
}

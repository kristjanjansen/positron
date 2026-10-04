// demo/shell/route-core.mjs: the routing core, L0 of `plans/plan-route-core.md`.
//
// A table of ports and links, a closed list of ops, and a gate at the
// destination. It knows nothing about any instrument, any input method or any
// computer, and it is written so that a C port can be a line by line copy:
// integers only, no strings on the hot path beyond the op name lookup, no
// clock of its own, and no feedback of what it writes back into its inputs.
//
// 🔴 THE CONTRACT IS `demo/shell/route-vectors/*.json`, NOT THIS FILE. Every
// expected output in there was derived by hand, and `route-core-test.mjs` runs
// them. A behaviour that is not in a vector is not a promise, and a second
// implementation that passes the vectors and disagrees with this file on
// something else has found a missing vector, not a bug in itself.
//
// ⚠️ `bay.mjs` STAYS THE VALIDATOR IN FRONT OF THIS. It refuses with a reason
// and a fix in words; this refuses with a short code, because a microcontroller
// has no room for the words. The op names and arguments are bay's where the two
// overlap (`channel`, `transpose`, `velocity`, `only`, `drop`, `range`,
// `vrange`, `fixed`, `cc`), so a bay link's transforms are this core's ops
// without translation. `scale`, `toggle`, `thin`, `curve`, `velcurve` and
// `notecc` are the plan's §4 ops that bay does not have yet.
//
// ⚠️ TWO OPS CARRY STATE (`toggle`, `thin`) AND ONE READS TIME (`thin`), so the
// core is a pure function of the event, the link AND that link's state. The
// plan says "a pure function of the event and the link", which was true of
// every op except the two it listed itself.
//
// Imports only `midi-kinds.mjs`, which imports nothing, so `rig/board/push.sh`
// can ship the pair by following direct imports.

import { KINDS, canonKind, kindOf } from './midi-kinds.mjs';

/** What a port's gate may say about a message. */
export const VERBS = ['allow', 'confirm', 'deny'];

/** The codes a link is refused with. The words are bay's job. */
export const REFUSALS = ['duplicate', 'unknown-port', 'direction', 'unknown-op', 'bad-args', 'cycle'];

/**
 * ⚠️ THE DEFAULT FOR A PORT WITH NO PROFILE, from the plan's §6: allow for
 * everything except SysEx, which is confirm. A precaution, not a wall.
 */
const DEFAULT_VERB = (kind) => (kind === 'sysex' ? 'confirm' : 'allow');

/** Kinds `thin` counts. Notes, clock, transport, program and SysEx it never touches. */
const CONTINUOUS = new Set(['cc', 'bend', 'touch']);

// ── bytes ─────────────────────────────────────────────────────────────────

/** "90 3C 64" to [0x90, 0x3C, 0x64]. Vectors carry bytes as hex so a person can derive them. */
export function fromHex(s) {
  return String(s).trim().split(/\s+/).filter(Boolean).map((h) => parseInt(h, 16));
}

/** [0x90, 0x3C, 0x64] to "90 3C 64". */
export function toHex(bytes) {
  return [...bytes].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
}

const isNote = (b) => (b[0] & 0xF0) === 0x80 || (b[0] & 0xF0) === 0x90;
/** ⚠️ A NOTE ON AT VELOCITY 0 IS A RELEASE, here and everywhere below. */
const isNoteOn = (b) => (b[0] & 0xF0) === 0x90 && b[2] > 0;
const isChannel = (b) => b[0] >= 0x80 && b[0] < 0xF0;
const chOf = (b) => b[0] & 0x0F;                     // 0..15 on the wire

/**
 * Integer division rounded to nearest, ties AWAY FROM ZERO, which is what the
 * vectors are derived with. `Math.round` rounds -0.5 towards zero, so it is
 * not used: a C port and this file must agree on the tie.
 */
function divRound(num, den) {
  const s = num < 0 ? -1 : 1;
  return s * Math.floor((Math.abs(num) * 2 + den) / (2 * den));
}

const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const opt = (v, lo, hi) => v === undefined || int(v, lo, hi);

/** The most points a curve table holds, `ROUTE_CURVE_POINTS` in `route_core.h`. */
export const CURVE_POINTS = 16;

/** 2 to 16 `[in, out]` pairs, each 0..127, the inputs rising strictly. */
const pointsOk = (p) => Array.isArray(p) && p.length >= 2 && p.length <= CURVE_POINTS
  && p.every((q, i) => Array.isArray(q) && q.length === 2 && int(q[0], 0, 127) && int(q[1], 0, 127)
    && (i === 0 || q[0] > p[i - 1][0]));

/**
 * A 7 bit point as a 14 bit bend value: p * 128, except 127, which is 16383.
 * ⚠️ SO 64 IS THE BEND'S CENTRE 8192 AND 127 ITS TOP, and an identity table
 * leaves every bend exactly as it was (vector 24). Read as a plain p * 128, a
 * table's top would be 16256 and a bend at full could never get there.
 */
const wide = (p) => (p === 127 ? 16383 : p << 7);
const narrow = (p) => p;

/**
 * `x` through the points by straight lines, rounded as `scale` rounds. Below
 * the first point it is the first out, above the last the last out. `at` maps
 * a point onto the value's own scale: `narrow` for 7 bits, `wide` for a bend.
 */
function curveAt(points, x, at) {
  if (x <= at(points[0][0])) return at(points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const x1 = at(points[i][0]);
    if (x <= x1) {
      const x0 = at(points[i - 1][0]), y0 = at(points[i - 1][1]), y1 = at(points[i][1]);
      return y0 + divRound((x - x0) * (y1 - y0), x1 - x0);
    }
  }
  return at(points[points.length - 1][1]);
}

// ── ops ───────────────────────────────────────────────────────────────────
//
// Each op is `ok(args)` for link time and `run(bytes, args, state, t)` for the
// hot path, which returns new bytes or null to drop. An op passes anything it
// is not about unchanged, which is bay's rule and the reason ops compose.

const OPS = {
  /** Every channel message onto channel `to`, or only those on `from` when it is given. */
  channel: {
    ok: (a) => int(a.to, 1, 16) && opt(a.from, 1, 16),
    run: (b, a) => {
      if (!isChannel(b)) return b;
      if (a.from !== undefined && chOf(b) !== a.from - 1) return b;
      return [(b[0] & 0xF0) | (a.to - 1), ...b.slice(1)];
    },
  },
  /** Move notes. Out of range is a drop, not a clamp, as in bay. */
  transpose: {
    ok: (a) => int(a.by, -127, 127),
    run: (b, a) => {
      if (!isNote(b)) return b;
      const n = b[1] + a.by;
      return (n < 0 || n > 127) ? null : [b[0], n, b[2]];
    },
  },
  /**
   * Scale note on velocity. ⚠️ ONLY A NOTE ON: bay tests `d2 === 0`, so it
   * would scale an 8n note off's release velocity. Harmless, and different.
   * 🔴 IN EXACT INTEGER THOUSANDTHS, NOT A FLOAT, as `route_core.c` does it.
   * `Math.round(45 * 0.7)` is 31, because the product is 31.499999999999996 in
   * a double, and the tie 31.5 rounds to 32. MEASURED 2026-10-03: 28 scales
   * from 0.001 to 4.000 disagreed with the C on a float tie, every one rounded
   * down here. Vector 20 holds two of them. A scale that is under half a
   * thousandth rounds to 0 and is refused, as the C refuses it.
   */
  velocity: {
    ok: (a) => typeof a.scale === 'number' && int(Math.round(a.scale * 1000), 1, 65535),
    run: (b, a) => {
      if (!isNoteOn(b)) return b;
      const v = Math.floor((b[2] * Math.round(a.scale * 1000) + 500) / 1000);
      return [b[0], b[1], Math.max(1, Math.min(127, v))];
    },
  },
  /** Keep one kind and drop the rest. bay names the argument `cls`. */
  only: {
    ok: (a) => canonKind(a.cls) !== null,
    run: (b, a, s, t, kind) => (kind === canonKind(a.cls) ? b : null),
  },
  /** Drop one kind and keep the rest. */
  drop: {
    ok: (a) => canonKind(a.cls) !== null,
    run: (b, a, s, t, kind) => (kind === canonKind(a.cls) ? null : b),
  },
  /** Notes whose number is in lo..hi, either end open. bay's split. The plan's `split`. */
  range: {
    ok: (a) => (a.lo !== undefined || a.hi !== undefined) && opt(a.lo, 0, 127) && opt(a.hi, 0, 127),
    run: (b, a) => {
      if (!isNote(b)) return b;
      return (b[1] < (a.lo ?? 0) || b[1] > (a.hi ?? 127)) ? null : b;
    },
  },
  /** Note ons whose velocity is in lo..hi. A release always passes. */
  vrange: {
    ok: (a) => (a.lo !== undefined || a.hi !== undefined) && opt(a.lo, 1, 127) && opt(a.hi, 1, 127),
    run: (b, a) => {
      if (!isNoteOn(b)) return b;
      return (b[2] < (a.lo ?? 1) || b[2] > (a.hi ?? 127)) ? null : b;
    },
  },
  /** One velocity for every note on. A release is left alone. */
  fixed: {
    ok: (a) => int(a.to, 1, 127),
    run: (b, a) => (isNoteOn(b) ? [b[0], b[1], a.to] : b),
  },
  /** CC `from` becomes CC `to`, optionally onto channel `ch`. */
  cc: {
    ok: (a) => int(a.from, 0, 127) && int(a.to, 0, 127) && opt(a.ch, 1, 16),
    run: (b, a) => {
      if ((b[0] & 0xF0) !== 0xB0 || b[1] !== a.from) return b;
      const st = a.ch === undefined ? b[0] : (0xB0 | (a.ch - 1));
      return [st, a.to, b[2]];
    },
  },
  /**
   * A CC value from lo..hi onto lo2..hi2, clamped first, ties away from zero.
   * 🔴 LO2 ABOVE HI2 INVERTS, AND THAT IS THE WHOLE REASON THERE ARE FOUR
   * ARGUMENTS. Only CC `cc` when it is given, every CC when it is not.
   * ⚠️ NAMED `scale` AND NOT THE PLAN'S `range`, because `range` in bay is
   * already the note number filter, and one word meaning two ops in two files
   * is the vocabulary problem `midi-kinds.mjs` was written to end.
   */
  scale: {
    ok: (a) => int(a.lo, 0, 127) && int(a.hi, 0, 127) && a.lo < a.hi
      && int(a.lo2, 0, 127) && int(a.hi2, 0, 127) && opt(a.cc, 0, 127),
    run: (b, a) => {
      if ((b[0] & 0xF0) !== 0xB0) return b;
      if (a.cc !== undefined && b[1] !== a.cc) return b;
      const v = Math.max(a.lo, Math.min(a.hi, b[2]));
      return [b[0], b[1], a.lo2 + divRound((v - a.lo) * (a.hi2 - a.lo2), a.hi - a.lo)];
    },
  },
  /**
   * Each press of `note` flips CC `cc` between `on` and `off`, first press on,
   * on the note's own channel. The release is dropped. State per channel.
   */
  toggle: {
    ok: (a) => int(a.note, 0, 127) && int(a.cc, 0, 127) && opt(a.on, 0, 127) && opt(a.off, 0, 127),
    run: (b, a, s) => {
      if (!isNote(b) || b[1] !== a.note) return b;
      if (!isNoteOn(b)) return null;
      const ch = chOf(b);
      s.lit = s.lit || 0;
      s.lit ^= (1 << ch);
      return [0xB0 | ch, a.cc, (s.lit & (1 << ch)) ? (a.on ?? 127) : (a.off ?? 0)];
    },
  },
  /**
   * At most `hz` continuous values a second, one budget per link.
   * ⚠️ MEASURED FROM THE LAST ONE KEPT, and in integers: `(t - kept) * hz >= 1000`.
   * ⚠️ IT DROPS THE LAST VALUE OF A FAST SWEEP, which leaves the destination
   * short of where the knob stopped. A trailing send needs a tick, and the core
   * has no clock; that is an open question in the plan, not settled here.
   * 🔴 A t EARLIER THAN THE LAST KEPT IS KEPT, AND THE BUDGET RESTARTS FROM IT
   * (vector 22). Until 2026-10-03 this file dropped it and the C kept it. Read
   * as "no time has passed" instead, a clock that restarts at 0 under a core
   * that does not would silence every knob on the link until the new clock
   * passed the old one, which could be hours. Kept, the worst case is one value
   * too many. The C's unsigned difference, there for its 49 day wrap, already
   * read it this way.
   */
  thin: {
    ok: (a) => int(a.hz, 1, 1000),
    run: (b, a, s, t, kind) => {
      if (!CONTINUOUS.has(kind)) return b;
      if (s.kept !== undefined && t >= s.kept && (t - s.kept) * a.hz < 1000) return null;
      s.kept = t;
      return b;
    },
  },
  /**
   * A CC, touch or bend value through `points`, a table of up to 16 `[in, out]`
   * pairs (vectors 23 and 24). `cls` narrows it to one of the three kinds and
   * `cc` to one CC number; with neither it curves all three.
   * ⚠️ A BEND IS CURVED IN ITS OWN 14 BITS, with each point read through `wide`,
   * so a table drawn once in 0..127 serves a knob and a wheel alike.
   * ⚠️ A CHANNEL TOUCH (Dn) CARRIES ITS PRESSURE IN THE SECOND BYTE, a poly touch
   * (An) in the third.
   * ⚠️ THE TABLE IS COPIED WHEN THE LINK IS MADE, as `route_core.c` copies it
   * into its table store, so changing the authored array later changes nothing.
   */
  curve: {
    ok: (a) => pointsOk(a.points) && opt(a.cc, 0, 127)
      && (a.cls === undefined || CONTINUOUS.has(canonKind(a.cls)))
      && (a.cc === undefined || a.cls === undefined || canonKind(a.cls) === 'cc'),
    run: (b, a, s, t, kind) => {
      if (!CONTINUOUS.has(kind)) return b;
      if (a.cls !== undefined && kind !== canonKind(a.cls)) return b;
      if (a.cc !== undefined && (kind !== 'cc' || b[1] !== a.cc)) return b;
      if (kind === 'bend') {
        const v = curveAt(a.points, b[1] | (b[2] << 7), wide);
        return [b[0], v & 127, v >> 7];
      }
      if ((b[0] & 0xF0) === 0xD0) return [b[0], curveAt(a.points, b[1], narrow)];
      return [b[0], b[1], curveAt(a.points, b[2], narrow)];
    },
  },
  /**
   * A note on's velocity through `points`, the same table and arithmetic as
   * `curve` (vector 25). 🔴 CLAMPED TO 1..127 AFTER, so a table that reaches 0
   * cannot turn a note on into a release. A release is left alone.
   */
  velcurve: {
    ok: (a) => pointsOk(a.points),
    run: (b, a) => {
      if (!isNoteOn(b)) return b;
      return [b[0], b[1], Math.max(1, curveAt(a.points, b[2], narrow))];
    },
  },
  /**
   * Note `note` becomes CC `cc` on the note's own channel: a press sends `on`
   * (127 when left out, the velocity when it is `'vel'`), a release sends `off`
   * (0 when left out). Every other note passes (vector 26). No state, so every
   * press sends on, which is what tells it from `toggle`.
   */
  notecc: {
    ok: (a) => int(a.note, 0, 127) && int(a.cc, 0, 127)
      && (a.on === undefined || a.on === 'vel' || int(a.on, 0, 127)) && opt(a.off, 0, 127),
    run: (b, a) => {
      if (!isNote(b) || b[1] !== a.note) return b;
      const ch = chOf(b);
      if (!isNoteOn(b)) return [0xB0 | ch, a.cc, a.off ?? 0];
      return [0xB0 | ch, a.cc, a.on === 'vel' ? b[2] : (a.on ?? 127)];
    },
  },
};

export const OP_NAMES = Object.keys(OPS);

// ── the core ──────────────────────────────────────────────────────────────

/**
 * A port: `{ id, dir: 'in'|'out'|'both', accepts?: [kind], policy?: {kind: verb},
 * rules?: [{ match: [byte|null], do: verb }] }`. A rule's match is a byte
 * prefix and `null` in it matches any byte. The first rule that matches wins
 * over the per kind policy, and only the first chunk of a SysEx is read.
 *
 * A link: `{ id, from, to, ops: [{ op, ...args }] }`.
 * An event: `{ port, t, bytes }`. What comes out is `{ port, t, bytes, link }`.
 */
export function createCore() {
  const ports = new Map();
  const links = [];                       // in the order they were made
  const openSx = new Map();               // input port id to true while a SysEx is open on it

  function addPort(p) {
    const accepts = p.accepts ? new Set(p.accepts.map(canonKind)) : null;
    if (accepts?.has(null)) throw new Error(`route-core: ${p.id} accepts a kind that is not one of ${KINDS.join(', ')}`);
    // ⚠️ A POLICY KEY GOES THROUGH `canonKind` TOO, so `{ pitchbend: 'deny' }`
    // denies bend (vector 21). It was read verbatim until 2026-10-03, and the
    // older spelling was silently ignored, which reads as a gate that works.
    const policy = {};
    for (const [k, verb] of Object.entries(p.policy || {})) {
      const ck = canonKind(k);
      if (ck === null) throw new Error(`route-core: ${p.id} has a policy for a kind that is not one of ${KINDS.join(', ')}`);
      policy[ck] = verb;
    }
    ports.set(p.id, {
      id: p.id, dir: p.dir, accepts,
      policy,
      rules: (p.rules || []).map((r) => ({ match: r.match, do: r.do })),
      held: [],                           // { chunks: [bytes], state: 'held'|'allowed'|'denied' }
    });
  }

  /** Can `to` reach `from` along the links already made. */
  function reaches(to, from) {
    const seen = new Set();
    const stack = [to];
    while (stack.length) {
      const p = stack.pop();
      if (p === from) return true;
      if (seen.has(p)) continue;
      seen.add(p);
      for (const l of links) if (l.from === p) stack.push(l.to);
    }
    return false;
  }

  /** Make a link, or answer why not with one of `REFUSALS`. */
  function link(l) {
    if (links.some((x) => x.id === l.id)) return { ok: false, reason: 'duplicate' };
    const from = ports.get(l.from), to = ports.get(l.to);
    if (!from || !to) return { ok: false, reason: 'unknown-port' };
    if (from.dir === 'out' || to.dir === 'in') return { ok: false, reason: 'direction' };
    for (const o of l.ops || []) {
      const op = OPS[o.op];
      if (!op) return { ok: false, reason: 'unknown-op' };
      if (!op.ok(o)) return { ok: false, reason: 'bad-args' };
    }
    // 🔴 A LINK THAT CLOSES A LOOP IS REFUSED NOW, NOT FOUND LATER. A self
    // link is the smallest loop and `reaches(x, x)` says so at once.
    if (reaches(l.to, l.from)) return { ok: false, reason: 'cycle' };
    links.push({
      id: l.id, from: l.from, to: l.to,
      ops: (l.ops || []).map((o) => (o.points ? { ...o, points: o.points.map((q) => [...q]) } : { ...o })),
      state: (l.ops || []).map(() => ({})),
      sounding: new Set(),                // ch * 128 + note, as delivered
      chans: new Set(),                   // channels a note on was delivered on
      sx: null,                           // the held entry of the SysEx stream in flight on this link
      sxVerb: null,
    });
    return { ok: true };
  }

  function verbFor(port, kind, bytes) {
    if (kind === 'sysex' && bytes[0] === 0xF0) {
      for (const r of port.rules) {
        // ⚠️ A FIRST CHUNK SHORTER THAN THE RULE IS JUDGED ON WHAT IT HAS. A
        // head too short to read byte 6 matches the confirm rule rather than
        // slipping past it.
        const n = Math.min(r.match.length, bytes.length);
        let hit = true;
        for (let i = 0; i < n; i++) if (r.match[i] !== null && r.match[i] !== bytes[i]) { hit = false; break; }
        if (hit) return r.do;
      }
    }
    return port.policy[kind] || DEFAULT_VERB(kind);
  }

  function track(l, b) {
    if (!isNote(b)) return;
    const key = chOf(b) * 128 + b[1];
    if (isNoteOn(b)) { l.sounding.add(key); l.chans.add(chOf(b)); } else l.sounding.delete(key);
  }

  /** One event in, the events out, in link order. */
  function input(ev) {
    const bytes = [...ev.bytes];
    const t = ev.t ?? 0;
    let kind = kindOf(bytes);
    let cont = false;
    // 🔴 A CHUNK THAT IS ONLY F7, OR STARTS WITH ONE, IS THE OPEN STREAM'S LAST
    // CHUNK (vector 19). F7 is a status byte, so it reads as kind 'other', and
    // until 2026-10-03 such a chunk was dropped and left the stream open: the
    // terminator never reached anyone and the next stray data bytes were taken
    // as more of that stream. With no stream open it is still dropped.
    if (bytes[0] < 0x80 || bytes[0] === 0xF7) {
      if (!openSx.get(ev.port)) return [];  // data with no status and no open SysEx
      kind = 'sysex'; cont = true;
    }
    if (kind === 'sysex') openSx.set(ev.port, !bytes.includes(0xF7));
    if (kind === 'other') return [];
    const out = [];
    for (const l of links) {
      if (l.from !== ev.port) continue;
      // A continuation chunk has no status byte, so its kind is carried, not read.
      const kindNow = (b) => (cont ? 'sysex' : kindOf(b));
      let b = bytes;
      for (let i = 0; i < l.ops.length && b; i++) b = OPS[l.ops[i].op].run(b, l.ops[i], l.state[i], t, kindNow(b));
      if (!b) continue;
      const k = kindNow(b);
      const dest = ports.get(l.to);
      if (dest.accepts && !dest.accepts.has(k)) continue;
      // ── the gate, at the destination ──
      let verb;
      if (cont) {
        verb = l.sxVerb;
        if (l.sx && l.sx.state === 'held') { l.sx.chunks.push(b); verb = 'held'; }
        else if (l.sx) verb = l.sx.state === 'allowed' ? 'allow' : 'deny';
      } else {
        verb = verbFor(dest, k, b);
        if (k === 'sysex') { l.sx = null; l.sxVerb = verb; }
        if (verb === 'confirm') {
          const entry = { chunks: [b], state: 'held' };
          dest.held.push(entry);
          if (k === 'sysex') l.sx = entry;
          verb = 'held';
        }
      }
      if (verb !== 'allow') continue;
      track(l, b);
      out.push({ port: l.to, t, bytes: b, link: l.id });
    }
    return out;
  }

  /**
   * Remove a link and release what it left sounding: a note off per held note
   * (channel then note ascending), then CC 123 on every channel it ever
   * delivered a note on. ⚠️ THE RELEASE SKIPS THE GATE ON PURPOSE. It is the
   * safety message, and a port that took the notes takes their release.
   */
  function unlink(id, t = 0) {
    const i = links.findIndex((l) => l.id === id);
    if (i < 0) return [];
    const [l] = links.splice(i, 1);
    const out = [];
    for (const key of [...l.sounding].sort((a, b) => a - b)) {
      out.push({ port: l.to, t, bytes: [0x80 | (key >> 7), key & 127, 0], link: l.id });
    }
    for (const ch of [...l.chans].sort((a, b) => a - b)) {
      out.push({ port: l.to, t, bytes: [0xB0 | ch, 123, 0], link: l.id });
    }
    return out;
  }

  /** A person said yes: release everything held at `portId`, at time `t`. Once. */
  function confirm(portId, t = 0) {
    const p = ports.get(portId);
    if (!p) return [];
    const out = [];
    for (const e of p.held) {
      if (e.state !== 'held') continue;
      e.state = 'allowed';
      for (const c of e.chunks) out.push({ port: portId, t, bytes: c });
    }
    p.held = [];
    return out;
  }

  /** A person said no: drop everything held at `portId`. Answers how many. */
  function deny(portId) {
    const p = ports.get(portId);
    if (!p) return 0;
    let n = 0;
    for (const e of p.held) if (e.state === 'held') { e.state = 'denied'; n++; }
    p.held = [];
    return n;
  }

  /** How many messages or SysEx streams are waiting at `portId`. */
  const held = (portId) => (ports.get(portId)?.held || []).filter((e) => e.state === 'held').length;

  return { addPort, link, unlink, input, confirm, deny, held, links: () => links.map((l) => l.id) };
}

// demo/shell/bay.mjs — a patch bay: what exists, what may reach what, and the
// arithmetic that refuses the rest.
//
// 🔴 WHY THIS IS A MODULE AND NOT A PAGE. Everything here is pure. No socket,
// no Web MIDI, no DOM, no clock. So `node demo/shell/bay-test.mjs` can grade
// the validator against patches whose answers are known in advance, which is
// the one thing a validator living inside a page can never have: what a desk
// happens to be plugged into today is not a known answer.
//
// 🔴 THE DESIGN IS `plans/plan-patchbay.md` AND ITS ONE LOAD BEARING IDEA IS
// THAT A PORT DECLARES TWO DIFFERENT THINGS.
//   - `shape` is what the data IS. For audio, a rate, a channel count and a
//     frame size. For MIDI, a protocol.
//   - `accepts` is what the port CONSENTS TO, as a list of message classes.
// They are not the same question and conflating them is how a studio gets
// damaged: the Circuit's input is shaped for perfectly ordinary MIDI and must
// nevertheless never be sent SysEx, because one byte inside a SysEx message
// overwrites a patch on a device with no factory reset.
//
// 🔴 AND A SHAPE IS DECLARED, NEVER INFERRED. This repository has the scar
// already: 960 int16s is a valid 20 ms mono frame AND a valid 10 ms stereo one,
// and guessing wrong plays an octave down, which sounds like a broken
// instrument rather than a broken header. `board.mjs` solved it by making
// senders declare `audioChannels` and `frameMs` and receivers check one against
// the other. This checks the pair at CONNECT time instead of at play time.

/** What a link can carry. `clock` is its own medium: see the plan, §3.4. */
export const MEDIA = ['midi', 'audio', 'clock'];

/**
 * The classes of MIDI message a port may consent to.
 * ⚠️ `sysex` IS IN THIS LIST SO THAT IT CAN BE REFUSED BY NAME. A class nobody
 * can name is a class nobody can exclude.
 */
export const CLASSES = ['note', 'cc', 'bend', 'touch', 'program', 'clock', 'sysex'];

/**
 * A decoded message from `midi-decode.mjs`, as one of the classes above.
 * ⚠️ NOTE OFF IS A NOTE. A port that accepts notes and not note offs would hold
 * every key it was ever sent, which is this rig's measured MK-425C behaviour
 * wearing a different hat.
 */
export function classOf(m) {
  switch (m.kind) {
    case 'note on': case 'note off': return 'note';
    case 'control': return 'cc';
    case 'pitch bend': return 'bend';
    case 'poly touch': case 'channel touch': return 'touch';
    case 'program': return 'program';
    case 'sysex': return 'sysex';
    case 'clock': case 'start': case 'stop': case 'continue': return 'clock';
    default: return 'other';
  }
}

// ── transforms ────────────────────────────────────────────────────────────
//
// 🔴 A TRANSFORM IS A PLAIN OBJECT, NOT A FUNCTION, and that is what makes the
// text form in §4 of the plan possible: an object round trips to a line of text
// and back, and a closure does not. It also means a patch can be saved, sent
// over a wire and diffed.
//
// ⚠️ EVERY ONE OF THEM MAY DROP AN EVENT BY RETURNING NULL, and a filter is
// simply a transform that drops rather than a separate concept.

const OPS = {
  /** Put the event on one channel. The MK-425C's global channel is 2 and the
   *  Circuit's first synth listens on 1, so this is the transform the smallest
   *  useful patch in this repository needs. */
  channel: {
    args: ['to'], need: ['to'],
    classes: (set) => set,
    run: (ev, a) => (ev.ch === null ? ev : { ...ev, ch: a.to }),
  },
  /** Move notes. `+1` is a real thing somebody wants on day one here: the
   *  MK-425C was measured a semitone flat. */
  transpose: {
    args: ['by'], need: ['by'],
    classes: (set) => set,
    run: (ev, a) => {
      if (ev.cls !== 'note') return ev;
      const n = ev.d1 + a.by;
      // ⚠️ OUT OF RANGE IS A DROP, NOT A CLAMP. A clamp turns the top of a
      // keyboard into a pile of the same note, which sounds like a stuck key.
      return (n < 0 || n > 127) ? null : { ...ev, d1: n };
    },
  },
  /** Scale note-on velocity. A note off is left alone: its velocity is a
   *  release and scaling it makes a release that never reaches zero. */
  velocity: {
    args: ['scale'], need: ['scale'],
    classes: (set) => set,
    run: (ev, a) => {
      if (ev.cls !== 'note' || ev.d2 === 0) return ev;
      return { ...ev, d2: Math.max(1, Math.min(127, Math.round(ev.d2 * a.scale))) };
    },
  },
  /** Keep one class and drop the rest. */
  only: {
    args: ['cls'], need: ['cls'],
    classes: (set, a) => new Set([...set].filter((c) => c === a.cls)),
    run: (ev, a) => (ev.cls === a.cls ? ev : null),
  },
  /** Drop one class and keep the rest. */
  drop: {
    args: ['cls'], need: ['cls'],
    classes: (set, a) => new Set([...set].filter((c) => c !== a.cls)),
    run: (ev, a) => (ev.cls === a.cls ? null : ev),
  },
  /**
   * Move one controller number to another, optionally onto another channel.
   * 🔴 THIS IS THE SMALLEST TRANSFORM THAT PROVES THE `(channel, controller)`
   * KEY, which `plans/plan-device-layouts.md` §5.3 argues and the Circuit proves:
   * CC 80 is macro knob 1 on channel 1 and drum 4 pan on channel 10, in one
   * instrument. A remap that only knew about controller numbers would send a
   * mod wheel to both.
   */
  /**
   * 🔴 A KEYBOARD SPLIT, WHICH COULD NOT BE SAID AT ALL UNTIL 2026-09-21. The
   * owner asked for one in words: *"Split the keyboard into half. Lower part
   * plays synth 1 in the circuit and upper part plays synth 2"*, and the model
   * produced `{"op":"only","to":1}` twice, because `only` filters by CLASS and
   * was the nearest thing in the whole vocabulary to a filter. **It was not
   * wrong about the intent. There was no word for it.**
   * ⚠️ A SPLIT IS TWO LINKS, NOT ONE OP. `link()` already allows two links
   * between the same pair, so the lower half is one link with a range and a
   * channel and the upper half is another. That is how a real one is built.
   * 🔴 AND A NOTE OFF OUTSIDE THE RANGE IS DROPPED TOO, WHICH IS THE WHOLE
   * SAFETY OF IT. The filter is on the NOTE NUMBER, which is the same for the
   * on and the off, so a note that was never let through can never be left
   * hanging. A filter keyed on anything that differs between them stops notes.
   */
  range: {
    args: ['lo', 'hi'], need: ['lo', 'hi'],
    classes: (set) => set,
    run: (ev, a) => {
      if (ev.cls !== 'note') return ev;
      return (ev.d1 < a.lo || ev.d1 > a.hi) ? null : ev;
    },
  },
  /**
   * 🔴 A VELOCITY LAYER: soft hits one instrument and hard hits another, which
   * is how a real split-by-touch is built.
   * 🔴 AND A NOTE OFF CARRIES VELOCITY 0, SO A NAIVE FILTER LEAVES EVERY NOTE
   * HANGING. `d2 === 0` is the off and it passes ALWAYS, whatever the window
   * is: dropping it would mean a note let through by a hard hit is never told
   * to stop, and a stuck note on a synth in another building is the worst thing
   * in this file. The test asserts the off passes a window it could not enter.
   */
  vrange: {
    args: ['lo', 'hi'], need: ['lo', 'hi'],
    classes: (set) => set,
    run: (ev, a) => {
      if (ev.cls !== 'note' || ev.d2 === 0) return ev;
      return (ev.d2 < a.lo || ev.d2 > a.hi) ? null : ev;
    },
  },
  /**
   * 🔴 ONE VELOCITY FOR EVERY NOTE, WHICH THIS DESK'S OWN DRUMS ALREADY DO.
   * ✅ MEASURED and written in `measured-devices-2026-09-20.md`: the Circuit's
   * drum pads send notes 60, 62 and 64 at **velocity 96, fixed**. So this is
   * not an effect, it is how one instrument here behaves, and a link that wants
   * to feed it from a touch sensitive keyboard needs to say so.
   * ⚠️ AND IT LEAVES A NOTE OFF ALONE, for the reason above: rewriting a 0 to
   * 96 turns every release into a second note on.
   */
  fixed: {
    args: ['to'], need: ['to'],
    classes: (set) => set,
    run: (ev, a) => {
      if (ev.cls !== 'note' || ev.d2 === 0) return ev;
      return { ...ev, d2: Math.max(1, Math.min(127, Math.round(a.to))) };
    },
  },
  cc: {
    args: ['from', 'to', 'ch'], need: ['from', 'to'],
    classes: (set) => set,
    run: (ev, a) => {
      if (ev.cls !== 'cc' || ev.d1 !== a.from) return ev;
      return { ...ev, d1: a.to, ...(a.ch === undefined ? {} : { ch: a.ch }) };
    },
  },
};

export const OP_NAMES = Object.keys(OPS);

/**
 * 🔴 A TRANSFORM WITH ITS ARGUMENT UNDER THE WRONG KEY IS THE DEFECT THIS
 * FUNCTION EXISTS FOR, AND IT WAS FOUND BY MEASUREMENT RATHER THAN BY READING.
 * 2026-09-21, asking Workers AI to turn a spoken sentence into a patch, the
 * model returned `{ op: 'transpose', to: 1 }`. **`transpose` takes `by`.** The
 * object was perfectly valid against the JSON Schema it was generated under,
 * because that schema listed every argument any op could take and required only
 * `op`, so `to` was allowed on a transform that has no `to`.
 * ⚠️ **AND `apply()` WOULD HAVE SAID NOTHING.** `ev.d1 + undefined` is `NaN`,
 * which is not a throw and not a drop: it is a note number that no longer exists
 * arriving at an instrument, from a page that reported the link as connected.
 * 🔴 **SO THE CHECK LIVES HERE RATHER THAN IN THE SCHEMA.** A schema constrains
 * the SHAPE of what a model may say and it cannot constrain the MEANING. That is
 * the same rule this project already has about a shape being declared rather
 * than inferred, arriving from the direction of a language model.
 * @returns {string} '' when every transform is well formed, or the reason.
 */
export function checkTransforms(transforms) {
  for (const t of transforms || []) {
    if (!t || typeof t !== 'object') return 'a transform must be an object with an op';
    const op = OPS[t.op];
    if (!op) return `no transform called "${t.op}". There are ${OP_NAMES.join(', ')}`;
    for (const k of op.need) {
      if (t[k] === undefined || t[k] === null) {
        /**
         * 🔴 A FIELD NAME IS QUOTED, OR THE SENTENCE READS AS BROKEN GRAMMAR.
         * This said `${t.op} needs ${k} and was given ${keys}`, which on the one
         * failure it is written for came out as **`transpose needs by and was
         * given to`** and was reported 2026-09-21 with the words *"what is
         * it?"*. Both `by` and `to` are FIELD NAMES, and printed bare they are
         * read as English, so a reader looks for the noun that is missing.
         * ⚠️ THE CHECK ITSELF IS UNCHANGED AND MUST STAY UNCHANGED. That object
         * is valid against the schema it was generated under, and without this
         * the code computes `note + undefined`, which is `NaN`: a note number
         * that does not exist arriving at an instrument down a link the page
         * called connected.
         */
        const given = Object.keys(t).filter((x) => x !== 'op');
        return `${t.op} takes "${k}" and was given `
          + (given.length ? given.map((x) => `"${x}"`).join(', ') : 'nothing');
      }
      if (k === 'cls') {
        if (!CLASSES.includes(t.cls)) return `${t.op} was given cls "${t.cls}", which is not one of ${CLASSES.join(', ')}`;
      } else if (typeof t[k] !== 'number' || Number.isNaN(t[k])) {
        return `${t.op} needs "${k}" to be a number, and it is ${JSON.stringify(t[k])}`;
      }
    }
  }
  return '';
}

/** Run an ordered list. Returns the event, or null if something dropped it. */
export function apply(transforms, ev) {
  let out = ev;
  for (const t of transforms || []) {
    const op = OPS[t.op];
    if (!op) throw new Error(`bay: no transform called ${t.op}`);
    out = op.run(out, t);
    if (!out) return null;
  }
  return out;
}

/** What classes could still come out the far end of this list. */
export function delivers(emits, transforms) {
  let set = new Set(emits);
  for (const t of transforms || []) {
    const op = OPS[t.op];
    if (!op) throw new Error(`bay: no transform called ${t.op}`);
    set = op.classes(set, t);
  }
  return set;
}

// ── the text form ─────────────────────────────────────────────────────────
//
// 🔴 IT IS A PROJECTION OF THE GRAPH AND NEVER A SECOND SOURCE OF TRUTH. Every
// line round trips to a link and back, and `bay-test.mjs` asserts that it does.
// The moment the text can say something the graph cannot, there are two models
// and they will disagree, which is this project's most expensive defect class.

/** One link as one line: `from -> to { op arg, op arg }` */
export function printLink(link) {
  const t = (link.transforms || []).map((x) =>
    [x.op, ...OPS[x.op].args.map((k) => x[k]).filter((v) => v !== undefined)]
      .map((v) => (typeof v === 'number' && v > 0 && x.op === 'transpose' ? `+${v}` : `${v}`))
      .join(' ')).join(', ');
  return `${link.from} -> ${link.to}${t ? ` { ${t} }` : ''}`;
}

/** The reverse. Throws with the offending text, because a parser that returns
 *  null makes every caller invent its own message for the same fault. */
export function parseLink(line) {
  const m = /^\s*([^\s>]+)\s*->\s*([^\s{]+)\s*(?:\{(.*)\})?\s*$/.exec(line);
  if (!m) throw new Error(`bay: cannot read "${line.trim()}". A link is "from -> to { op arg }"`);
  const [, from, to, body] = m;
  const transforms = (body || '').split(',').map((s) => s.trim()).filter(Boolean).map((chunk) => {
    const parts = chunk.split(/\s+/);
    const op = parts.shift();
    if (!OPS[op]) throw new Error(`bay: no transform called "${op}". There are ${OP_NAMES.join(', ')}`);
    const t = { op };
    OPS[op].args.forEach((k, i) => {
      if (parts[i] === undefined) return;
      const n = Number(parts[i]);
      t[k] = Number.isNaN(n) ? parts[i] : n;
    });
    return t;
  });
  return { from, to, transforms };
}

export function printPatch(links) { return links.map(printLink).join('\n'); }
export function parsePatch(text) {
  return String(text).split('\n')
    .map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean).map(parseLink);
}

// ── the bay ───────────────────────────────────────────────────────────────

/** How long since a heartbeat before a port is STALE, which is a third state
 *  and is not the same as absent. "I cannot ssh to it" is never "it is down". */
export const STALE_MS = 30_000;

export function createBay({ now = () => Date.now() } = {}) {
  const ports = new Map();          // id -> port
  const links = new Map();          // id -> link
  let nextLink = 1;

  /**
   * @param {object} p
   * @param {string} p.id      `site:node:port`. An id, never a name: a name is
   *                           what a replug changes, and CoreMIDI really does
   *                           rename a port to `Circuit 2` when it is held.
   * @param {string} p.label   what a person reads. Allowed to change.
   * @param {'in'|'out'} p.dir
   * @param {string} p.medium  one of MEDIA
   * @param {object} p.shape   what the data IS
   * @param {string[]} [p.accepts] in-ports: the classes it consents to
   * @param {string[]} [p.never]   in-ports: classes that make a link a HARD
   *                               REFUSAL rather than a quiet drop. See below.
   * @param {string[]} [p.emits]   out-ports: the classes it can produce
   * @param {Function} [p.deliver] in-ports: where a delivered event goes
   */
  function addPort(p) {
    if (!p.id) throw new Error('bay: a port needs an id');
    if (!MEDIA.includes(p.medium)) throw new Error(`bay: medium is one of ${MEDIA.join(', ')}, not ${p.medium}`);
    if (p.dir !== 'in' && p.dir !== 'out') throw new Error('bay: dir is "in" or "out"');
    ports.set(p.id, { accepts: [], never: [], emits: [], shape: {}, seenAt: now(), heard: 0, ...p });
    return ports.get(p.id);
  }
  function seen(id) { const p = ports.get(id); if (p) p.seenAt = now(); }
  function stale(p) { return now() - (p.seenAt ?? 0) > STALE_MS; }

  /**
   * 🔴 THE VALIDATOR IS THE WHOLE POINT AND IT IS ORDINARY CODE. Every refusal
   * carries a sentence, because a patch bay that answers "no" is a patch bay
   * nobody can use. It is also the half that stays useful if every language
   * model in §5 of the plan were deleted.
   * @returns {{ok:boolean, why:string, warn?:string}}
   */
  function validate(fromId, toId, transforms = []) {
    const a = ports.get(fromId), b = ports.get(toId);
    if (!a) return { ok: false, why: `there is no port called ${fromId}` };
    if (!b) return { ok: false, why: `there is no port called ${toId}` };
    if (a.dir !== 'out') return { ok: false, why: `${a.label} is an input, so nothing leaves it` };
    if (b.dir !== 'in') return { ok: false, why: `${b.label} is an output, so nothing arrives at it` };
    if (a.medium !== b.medium) {
      return { ok: false, why: `${a.label} carries ${a.medium} and ${b.label} takes ${b.medium}` };
    }
    if (a.id === b.id) return { ok: false, why: 'a port cannot feed itself' };

    /* Before anything about the ports: is the list of transforms even well
       formed. See `checkTransforms`, which exists because a model produced a
       schema valid transform with its argument under the wrong key. */
    const badT = checkTransforms(transforms);
    if (badT) return { ok: false, why: badT };

    // Shape. ⚠️ THE FIELD THAT DISAGREES IS NAMED. "incompatible" is a refusal
    // somebody has to debug; "48000 against 44100" is one they can fix.
    for (const k of Object.keys(b.shape || {})) {
      if (a.shape?.[k] === undefined) continue;
      if (a.shape[k] !== b.shape[k]) {
        return { ok: false, why: `${k} does not match: ${a.label} is ${a.shape[k]} and ${b.label} wants ${b.shape[k]}` };
      }
    }

    /**
     * 🔴 CONSENT, AND IT IS TWO DIFFERENT QUESTIONS THAT THE FIRST BUILD
     * ANSWERED AS ONE. It refused any link that could deliver a class the
     * destination did not accept, and **that refused every real link on this
     * desk**: a MIDI source emits six classes, the Circuit takes three, so a
     * keyboard could never reach a synth at all. Found by `/wish/`, which put a
     * real model's real proposal through it and got `Circuit does not accept
     * touch` for a patch that was otherwise perfect.
     * ✅ **A CLASS A PORT SIMPLY DOES NOT HANDLE IS DROPPED AND REPORTED.** The
     * drop already happens at the destination in `send`, so nothing is sent
     * either way; what changes is that the link exists and the reader is told
     * what will not cross it.
     * 🔴 **A CLASS A PORT `never` TAKES IS STILL A HARD REFUSAL**, and that is
     * the list the Circuit's SysEx line lives on. The difference is between *I
     * do not use that* and *that damages me*.
     */
    let could;
    try { could = delivers(a.emits, transforms); }
    catch (e) { return { ok: false, why: e.message }; }
    for (const c of could) {
      if (b.never.includes(c)) {
        return { ok: false, why: `${b.label} does not accept ${c}, and this link could deliver it` };
      }
    }
    /* ⚠️ THE SOURCE BEING LEFT WITH NOTHING IS CHECKED BEFORE THE DESTINATION
       TAKING NONE OF IT, because they are two different faults and the second
       message is wrong about the first. Order matters here and a test caught
       it reading `Circuit takes none of what this link carries` about a link
       that carried nothing in the first place. */
    if (a.medium === 'midi' && could.size === 0) {
      return { ok: false, why: 'these transforms drop everything, so the link would carry nothing' };
    }
    const dropped = [...could].filter((c) => !b.accepts.includes(c));
    const carried = [...could].filter((c) => b.accepts.includes(c));
    if (a.medium === 'midi' && !carried.length) {
      return { ok: false, why: `${b.label} takes none of what this link carries` };
    }

    // Cycles, at node level, because hardware THRU can close one outside our view.
    if (reachesNode(nodeOf(b.id), nodeOf(a.id))) {
      return { ok: false, why: `that closes a loop: ${b.label} already reaches ${a.label}` };
    }
    const warns = [];
    if (stale(a) || stale(b)) {
      const p = stale(a) ? a : b;
      warns.push(`${p.label} has not been heard from for ${Math.round((now() - (p.seenAt ?? 0)) / 1000)}s`);
    }
    if (dropped.length) warns.push(`${b.label} will drop ${dropped.join(', ')}`);
    return { ok: true, why: '', ...(warns.length ? { warn: warns.join('. ') } : {}) };
  }

  /**
   * Can a signal standing at `startNode` reach `targetNode` through the links
   * that already exist.
   * 🔴 IT WALKS NODES, NOT PORTS, AND THE FIRST VERSION WALKED PORTS AND WAS
   * ALWAYS FALSE. It started from the proposed destination, which is an INPUT,
   * and then looked for links whose `from` was that port. No link ever starts
   * at an input, so the walk ended immediately and every cycle was allowed.
   * **The test caught it, which is what the test is for**: an arriving event is
   * at a NODE, and it leaves again through any output that node has.
   */
  function reachesNode(startNode, targetNode) {
    const seenNodes = new Set();
    const walk = (n) => {
      if (n === targetNode) return true;
      if (seenNodes.has(n)) return false;
      seenNodes.add(n);
      for (const l of links.values()) {
        if (nodeOf(l.from) !== n) continue;
        if (walk(nodeOf(l.to))) return true;
      }
      return false;
    };
    return walk(startNode);
  }
  const nodeOf = (id) => id.split(':').slice(0, 2).join(':');

  function link(fromId, toId, transforms = []) {
    const v = validate(fromId, toId, transforms);
    if (!v.ok) return { ok: false, why: v.why };
    const id = `L${nextLink++}`;
    links.set(id, { id, from: fromId, to: toId, transforms, enabled: true, sent: 0, dropped: 0 });
    return { ok: true, id, why: '', warn: v.warn };
  }
  function unlink(id) { return links.delete(id); }

  /**
   * One event leaving one port.
   * 🔴 THE COUNTERS ARE AT BOTH ENDS ON PURPOSE. `link.sent` is what this side
   * queued and `port.heard` is what the far side took, and only the second one
   * is evidence: `createMidiLane`'s `scheduled()` counted what a page QUEUED and
   * read identically to delivery while every note was being scheduled fifty six
   * years out.
   */
  function send(fromId, ev) {
    seen(fromId);
    let out = 0;
    for (const l of links.values()) {
      if (l.from !== fromId || !l.enabled) continue;
      const e = apply(l.transforms, ev);
      if (!e) { l.dropped++; continue; }
      const dst = ports.get(l.to);
      if (!dst) continue;
      if (!dst.accepts.includes(e.cls)) { l.dropped++; continue; }   // the guard is at the destination
      l.sent++;
      dst.heard++;
      dst.deliver?.(e, l);
      out++;
    }
    return out;
  }

  return {
    addPort, validate, link, unlink, send, seen,
    port: (id) => ports.get(id),
    ports: () => [...ports.values()],
    links: () => [...links.values()],
    stale,
    text: () => printPatch([...links.values()]),
    /** Load a text patch. Returns every line that was refused, with its reason. */
    load(text) {
      const bad = [];
      for (const l of parsePatch(text)) {
        const r = link(l.from, l.to, l.transforms);
        if (!r.ok) bad.push({ line: printLink(l), why: r.why });
      }
      return bad;
    },
  };
}

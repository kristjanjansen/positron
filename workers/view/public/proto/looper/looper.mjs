// proto/looper/looper.mjs — a MIDI looper on the timeline primitives.
//
// DOM-free on purpose, and the ONLY implementation: index.html plays it on a
// real clock with real audio, measure.mjs runs the same functions on a virtual
// clock, verify.mjs drives the same page headlessly. The page cannot display a
// number the headless run did not earn (proto/loops' rule, kept).
//
// ---------------------------------------------------------------------------
// WHY A LOOPER IS THE RIGHT TEST OF THIS LIBRARY
// ---------------------------------------------------------------------------
// proto/loops proved a loop plays a tape that already existed. A looper has to
// make the tape WHILE the tape is playing, which is the first client to put
// capture, projection, quotation and actuation on the same clock at the same
// time. Everything the library claims meets its hardest case here:
//
//   · stamp at SOURCE (the law three repos in the lineage died without) is no
//     longer a slogan — the source stamp is a key press and the number is the
//     distance to the handler that hears it;
//   · `caps.loopState: 'rearm'` stops being an abstract flag and becomes "no
//     stuck notes", audible in one bar if it is wrong;
//   · `caps.audio` puts the note on the sample grid instead of the tick grid;
//   · rule 7g ("a deck has one position") decides what an overdub layer IS;
//   · and C10's trace/authoring boundary turns out to be the looper's whole
//     user interface. See THE STRUCTURE below.
//
// ---------------------------------------------------------------------------
// THE STRUCTURE — C10 is not a constraint here, it is the feature
// ---------------------------------------------------------------------------
// C10 says a timeline is a TRACE and never an authoring format; §8.1 says a
// loop is therefore a SCORE concept and never a log concept. A looper looks
// like the counter-example — "record" plainly authors something — and it is
// not. It splits exactly along that seam, and the split is the classic looper
// pedal's own workflow:
//
//   TRACE   every input event, stamped at source, in absolute wall time,
//           append-only, never looped. Pass 1 of a Boss RC is exactly this: you
//           are not yet in a loop, you are being recorded.
//   SCORE   pressing the pedal a second time does not modify the recording. It
//           declares a QUOTATION of it — `{ref, in: 0, out: L, repeat:
//           'infinite'}` — where L is the length you just played.
//
// So the loop length is knowable BEFORE the quotation exists, and nothing has
// to be retro-edited. That matters because `nest.add()` fixes `{in, out,
// repeat}` and there is no `nest.retrigger()` (proto/loops/NOTES.md, "what
// loops still cannot express"). A looper appeared to need the missing feature
// and does not: **you record a trace, then you author a quotation of it.** The
// gesture a looper is named for falls out of the existing mechanism with no new
// vocabulary, which is the strongest evidence so far that §8.1's placement of
// `repeat` in the score was right.
//
// The projection trace → loop material is a real transformation and is named
// and versioned like one (`loop-phase@1`), in the same spirit as `when.rule`
// (§7.4): a position produced by a rule says which rule produced it. It is NOT
// a §5b reconstruction — nothing is invented, every row keeps its source stamp
// in `origin` — but it IS lossy in one specific way, and the loss is recorded
// rather than hidden: a phase position forgets WHICH PASS you played it on.
//
// ---------------------------------------------------------------------------
// LAYERS ARE TAPE MACHINES (rule 7g, again)
// ---------------------------------------------------------------------------
// nested.mjs forbids two overlapping quotations of ONE deck, because a deck has
// one position. proto/loops hit this and concluded phasing needs two decks the
// way Reich needed two tape machines. An overdub is the same shape: layer 2
// plays at the same instant as layer 1, so layer 2 is its own deck. A looper
// pedal with N overdubs is N tape machines running in lock-step, and the
// abstraction says so without being told.
//
// ---------------------------------------------------------------------------
// THE NOTE THAT STRADDLES THE SPLICE
// ---------------------------------------------------------------------------
// A note held across the loop point has an on inside [0, L) and an off after
// it. §8.8 settled the joint: hard cut, no parameter. So the projection
// TRUNCATES that note at `out` and records `trimmed: true` on the row with the
// duration it lost. Declared, countable, and never silent — the alternative is
// a note whose off arrives in a pass that already re-armed, i.e. the stuck note
// every looper has shipped at least once.

import { createDeck } from '../../timeline/transport.mjs';
import { createNest } from '../../timeline/nested.mjs';
import { refDeck, loopPhase, parseScore, loadScore } from '../../timeline/score.mjs';

/** The projection's versioned name. A row positioned by a rule says which rule
 *  positioned it — §7.4's convention, applied to the position axis of a loop. */
export const PHASE_RULE = 'loop-phase@1';

/** Session envelope version — the score inside carries its own SCORE_VERSION. */
export const SESSION_VERSION = 1;

/** Default loop length when a caller does not set one by playing. */
export const DEFAULT_LOOP_MS = 2000;

// ===========================================================================
// THE TRACE — what actually happened, stamped at source
// ===========================================================================

/**
 * A row of the session trace. `at` is the SOURCE stamp (MIDIMessageEvent /
 * KeyboardEvent `.timeStamp`, both of which are `performance.now()`-domain
 * instants taken by the UA when the input arrived), never the instant our
 * handler ran. `handlerAt` is kept beside it precisely so the distance between
 * them is measurable rather than assumed — see NOTES.md M1.
 */
export function inputRow({ at, handlerAt, type, note, vel = 100, value, ctrl, source = 'kbd', layer = 0 }) {
  const r = { at: +at, handlerAt: handlerAt == null ? null : +handlerAt, type, source, layer };
  if (note !== undefined) r.note = note | 0;
  if (type === 'note-on') r.vel = vel | 0;
  if (ctrl !== undefined) { r.ctrl = ctrl | 0; r.value = +value; }
  r.stampSkewMs = r.handlerAt === null ? null : +(r.handlerAt - r.at).toFixed(3);
  return r;
}

export const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

// ===========================================================================
// THE PROJECTION — trace → loop material
// ===========================================================================

/**
 * Project absolute-time input rows onto the phase domain [0, L) of one loop.
 *
 * Pairs note-on with note-off so the loop carries NOTES (on + duration), not
 * two unrelated edges: a duration survives the wrap as one truncatable object,
 * whereas an orphan off is exactly the row that arrives after the lane
 * re-armed and does nothing, which is how loopers ship stuck notes.
 *
 * @returns {{items, trimmed, orphanOffs, notes, ccs, rule}}
 */
export function projectToPhase(rows, { origin, loopMs, rule = PHASE_RULE, layer = 0, noteMode = 'paired', graceMs = 0 } = {}) {
  if (!(loopMs > 0)) throw new Error('projectToPhase needs a positive loopMs');
  const items = [];
  const open = new Map();               // note -> row being built
  let trimmed = 0, orphanOffs = 0, notes = 0, ccs = 0, beforeOrigin = 0;

  // loopPhase returns {iter, off, x, past} — `off` is the position inside the
  // pass and `iter` is which pass it was. A looper keeps the first and records
  // the second as provenance; that asymmetry IS the projection's loss.
  //
  // The negative branch is the GRACE WINDOW and it exists because of latency
  // compensation: pulling a note back by the monitoring delay can put a note
  // played just after the pedal slightly BEFORE the origin. Musically that is a
  // pickup landing on the downbeat and it belongs at the end of the loop, so
  // inside the window it wraps (a loop is a circle; the modulo is the whole
  // map). Outside it, a pre-origin row still predates the session and is still
  // refused — `loopPhase` would answer 0 and stack the lot into a chord.
  const phaseOf = (at) => {
    const x = at - origin;
    return x >= 0 ? loopPhase(x, loopMs).off : ((x % loopMs) + loopMs) % loopMs;
  };
  /** which pass of the loop this absolute instant fell in — the thing a phase
   *  position forgets, kept as provenance so the loss is recorded, not hidden */
  const passOf = (at) => (at >= origin ? loopPhase(at - origin, loopMs).iter : -1);

  for (const r of rows) {
    // A row BEFORE the origin is not a row at a negative phase — it is a row
    // that predates the loop. `loopPhase` answers 0 for it (its `!(x > 0)`
    // clause), which would silently stack every such row on the downbeat, so
    // the projection refuses them and COUNTS them instead. Found by a test that
    // rotated the origin forwards and got a chord where a figure should be.
    if (r.at < origin - graceMs) { beforeOrigin++; continue; }
    if (r.type === 'note-on') {
      // A re-attack of a note already held: close the old one first, exactly as
      // a MIDI merge would. Never leave two voices on one key.
      if (open.has(r.note)) closeNote(open.get(r.note), r.at);
      const ph = phaseOf(r.at);
      const item = {
        at: ph, kind: 'note', id: `L${layer}n${items.length}`,
        payload: {
          note: r.note, vel: r.vel, hz: midiHz(r.note), layer,
          // `phase` is the payload's own copy of its position, so reduce() can
          // decide whether a PAIRED note is still sounding at an arbitrary
          // position without being handed the event object.
          phase: ph, durMs: null, trimmed: false, srcAt: r.at, pass: passOf(r.at), rule,
        },
      };
      open.set(r.note, item); items.push(item); notes++;
    } else if (r.type === 'note-off') {
      const item = open.get(r.note);
      if (!item) { orphanOffs++; continue; }
      open.delete(r.note);
      if (closeNote(item, r.at)) trimmed++;
    } else if (r.type === 'cc') {
      items.push({
        at: phaseOf(r.at), kind: 'cc', id: `L${layer}c${items.length}`,
        payload: { ctrl: r.ctrl, value: r.value, layer, srcAt: r.at, pass: passOf(r.at), rule },
      });
      ccs++;
    }
  }
  // Anything still held when recording stopped runs to the splice.
  for (const item of open.values()) if (closeNote(item, origin + Infinity)) trimmed++;

  /** @returns {boolean} whether the note was cut at the splice */
  function closeNote(item, offAt) {
    const onAbs = item.payload.srcAt;
    const rawDur = offAt - onAbs;
    const room = loopMs - item.at;           // distance from the on to `out`
    let cut = false;
    if (!(rawDur < room)) {                  // straddles the splice → hard cut
      item.payload.durMs = +room.toFixed(3);
      item.payload.trimmed = true;
      item.payload.lostMs = Number.isFinite(rawDur) ? +(rawDur - room).toFixed(3) : null;
      cut = true;
    } else {
      item.payload.durMs = +rawDur.toFixed(3);
    }
    if (noteMode === 'edges') {
      // THE NEGATIVE CONTROL. A live MIDI stream is two independent edges, and
      // an off that fell past the splice simply does not exist in [0, L) — so
      // in this mode a trimmed note has NO off at all and rings forever unless
      // the wrap re-arms the lane. That is §8.3's claim with something at stake.
      if (!cut) {
        items.push({
          at: item.at + item.payload.durMs, kind: 'note', id: `${item.id}off`,
          payload: { note: item.payload.note, layer, off: true, phase: item.at + item.payload.durMs, rule },
        });
      }
      item.payload.durMs = null;             // open-ended: the off is a row now
    }
    return cut;
  }

  items.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
  return { items, trimmed, orphanOffs, notes, ccs, beforeOrigin, rule };
}

// ===========================================================================
// THE INSTRUMENT — adapters
// ===========================================================================

/**
 * The `note` adapter: EDGE-valued, so it re-arms at every wrap.
 *
 * `caps.audio = {ctx}` is the whole reason this sounds like an instrument
 * rather than like a tick: the wall lane hands `actuate()` a third argument
 * carrying the intended instant IN AUDIOCONTEXT SECONDS, so the voice is
 * `start()`ed on the sample grid even though the decision was made on a 25 ms
 * tick. The A/B is measured (NOTES.md M3) — this is not taken on faith.
 *
 * `reduce()` returns the set of notes held at a position. That is MIDI chase,
 * by its DAW name (§7.5), and it is what makes a seek into the middle of a
 * sustained chord sound like the chord instead of like silence.
 */
export function noteAdapter(voices, { ctx = null, leadMs = 0, ref = null, reducer = true } = {}) {
  // `reducer: false` is the NEGATIVE CONTROL, and it is the honest one.
  // nested.mjs is explicit that the wrap's re-arm is step 2 — `child.seek(in)`,
  // a real seek whose reduce+assertState re-states every edge lane — while the
  // `loopWrap()` callback (step 1) is opt-in and exists only so a lane can
  // flush BEFORE the fold. A lane with no reducer is not touched by step 2 at
  // all ("transport's assertAt skips it") and rings across the boundary exactly
  // as tracker's does. So the way to show what keeps a looper free of stuck
  // notes is to take the REDUCER away, not the callback.
  const base = {
    caps: {
      // the transport REFUSES catchUp:'reduce' without a reduce() — so the
      // no-reducer arm is a fire-and-forget lane, which is exactly tracker's
      // and exactly the shape nested.mjs says rings across a wrap
      valued: 'edge', loopState: 'rearm', catchUp: reducer ? 'reduce' : 'drop',
      reducible: reducer, seekable: true, deterministic: true, rates: null,
      absentState: 'silence', ...(ctx ? { audio: { ctx, leadMs } } : {}),
    },
    actuate(p, rec, when) {
      if (p.off) voices.noteOff(p, rec, when, ref);
      else voices.noteOn(p, rec, when, ref);
    },
    /**
     * THE HELD SET AT `pos` — MIDI chase by its DAW name (§7.5), and the reason
     * a seek into the middle of a sustained chord sounds like the chord.
     *
     * Both note shapes fold here and they fold differently, which is the whole
     * argument for pairing:
     *   PAIRED — a note is held iff `pos` is inside [phase, phase+durMs). The
     *            prefix alone decides it; a lost row cannot strand a voice.
     *   EDGES  — an `off` row deletes; an `on` row inserts. Correct only if
     *            every off survived the projection, which for a note across the
     *            splice it did not.
     * Last attack wins on a repeated note, because that is what a keyboard does.
     */
    reduce(payloads, pos) {
      const held = new Map();
      for (const p of payloads) {
        if (p.off) { held.delete(p.note); continue; }
        if (p.durMs != null && Number.isFinite(pos) && pos >= p.phase + p.durMs) { held.delete(p.note); continue; }
        held.set(p.note, p);
      }
      return [...held.values()];
    },
    assertState(present, info) { voices.assert(present || [], info); },
    /** §8.3's re-arm, opted into: silence anything the previous pass left
     *  ringing BEFORE the fold, so a real synth flushes ahead of the seek. */
    loopWrap(info) { voices.wrap(info); },
    silence(info) { voices.allOff(info); },
  };
  if (!reducer) { delete base.reduce; delete base.assertState; }
  return base;
}

/**
 * The `cc` adapter: LEVEL-valued, so it CARRIES across the wrap (§8.3). A
 * filter sweep set in repetition 3 is still there in repetition 4 — the exact
 * counter-example to the note lane, on the same deck, at the same wrap. Having
 * both in one instrument is the point: one boundary, two correct behaviours,
 * chosen by the adapter and not by the loop.
 */
export function ccAdapter(voices, { ref = null } = {}) {
  return {
    caps: {
      valued: 'level', loopState: 'carry', catchUp: 'reduce', reducible: true,
      seekable: true, deterministic: true, continuous: true, tier: 0,
      interpolate: 'linear', rates: null,
    },
    actuate(p, rec, when) { voices.cc(p, rec, when, ref); },
    reduce(payloads) { return payloads.length ? payloads[payloads.length - 1] : null; },
    assertState(present) { if (present) voices.cc(present, null, null); },
    interpolate(a, b, t) {
      if (!a) return b; if (!b) return a;
      return { ...a, value: a.value + (b.value - a.value) * t };
    },
  };
}

// ===========================================================================
// THE LOOPER
// ===========================================================================

/**
 * @param {object} o
 * @param {object} o.voices  the instrument (synth.mjs, or a logging stub)
 * @param {function} o.newHost  a fresh TickHost per deck — the wrap must be a
 *        COMMITTED one-shot, never polled (proto/loops' headline defect)
 */
/**
 * DEFAULT LEAD — 30 ms, and it is not a tuning preference.
 *
 * A note is decided on a coarse timer and rendered on the audio clock. If the
 * decision lands even slightly late there is no future instant left to render
 * at, so the note is thrown at "now" and inherits the timer's wobble — measured
 * at up to ~17 ms, which is audible as sloppiness. A declared lead is the
 * headroom that lets every note reach the audio clock: measured, it takes the
 * wobble from ~14-17 ms of spread down to ~1 ms, in exchange for a FIXED 30 ms
 * delay on the loop path.
 *
 * That trade is free here and nowhere else: a constant shift of every note in a
 * loop moves the whole circle and nothing inside it, so there is nothing left
 * for a listener to hear it against. The live monitor path does NOT take the
 * lead — you hear your own playing immediately — which is why the two paths in
 * synth.mjs are separate.
 */
export const DEFAULT_LEAD_MS = 30;

export function createLooper({
  clock, newHost, voices, ctx = null, leadMs = null,
  loopMs = DEFAULT_LOOP_MS, horizonMs = 60 * 60 * 1000,
  noteMode = 'paired', reducer = true, compensate = true, toleranceMs = 5,
  onLayer = null, onWrap = null,
} = {}) {
  // NO AUDIO CONTEXT, NO LEAD. The lead is headroom for the wall->audio bridge;
  // without a context there is no bridge to give headroom to, and applying one
  // anyway would shift every recorded note by 30 ms in a rig that has no output
  // to be late. (It did exactly that for one run of the virtual-clock suite,
  // which is how this line came to exist rather than being foreseen.)
  const lead = leadMs == null ? (ctx ? DEFAULT_LEAD_MS : 0) : leadMs;
  const trace = [];                 // THE LOG: absolute, append-only, never looped
  const layers = [];                // THE SCORE: one deck + one quotation each
  const onsets = [];                // every playback fire, for measurement
  let origin = null;                // set when the first pass starts
  let armedAt = null;               // when RECORD was pressed
  let recording = false;
  let loopLen = loopMs;
  let lengthSetByPlaying = false;

  // The parent is a bare deck: it holds no items, it only carries position for
  // the nest. Its range is opened wide AND re-based on the origin the moment
  // one exists — the position domain here is wall time (epoch ms, ~1.7e12), so
  // a range of [0, horizon] would put every real origin past the parent's end
  // and `nest.add` refuses that in words. Wall time as the position domain is
  // the right choice for a looper (it is what jam-core's epoch grid needs), and
  // the cost is exactly this: the range is a window on it, not a duration.
  const parent = createDeck({ clock, tickHost: newHost(), range: [0, horizonMs], items: [] });
  const rebaseParent = (o) => parent.setRange([o - loopLen, o + horizonMs]);
  // THE SERVO'S DEAD BAND IS A CROSS-PEER FLAM. Solo it is invisible: one
  // child parks anywhere within ±toleranceMs of ideal and every lane on it is
  // wrong by the same amount, so nothing is audible. Shared, two peers park
  // INDEPENDENTLY inside their own dead bands and the difference is heard —
  // measured at 8.3 ms of systematic offset between two tabs at the default 5.
  // A remote session buys the tighter band with more corrections; that is the
  // trade, and it is a number, not a preference.
  const nest = createNest(parent, { toleranceMs, hardSeekMs: 250, tickHost: newHost() });

  const offWrap = nest.onWrap((info) => {
    const L = layers.find((l) => l.id === info.span);
    if (L) L.wraps = info.to;
    onWrap && onWrap(info);
  });

  /**
   * THE MONITORING DELAY — how long after a note is *meant* to sound does the
   * performer actually hear it. Two terms, both known:
   *   · `leadMs`      the loop path's declared lead (30 ms by default)
   *   · output latency  what the UA reports: base + output, ~37 ms here
   * NOT included, because it cannot be measured from inside a page: the delay
   * between the physical key going down and the UA stamping the event. That
   * term is real and is silently folded into the performer's own timing. Saying
   * so is the honest version; pretending the compensation is complete is not.
   */
  function monitorDelayMs() {
    if (!compensate) return 0;
    const l = voices.latency ? voices.latency() : null;
    return lead + (l && Number.isFinite(l.totalMs) ? l.totalMs : 0);
  }

  /**
   * THE SOURCE STAMP ENTERS HERE AND IS NEVER RE-STAMPED — but it IS shifted,
   * once, by a declared amount, and the raw stamp is kept beside it.
   *
   * WHY THE ORIGIN MUST NOT MOVE WITH IT, which is the trap in this fix:
   * a *uniform* shift of every timestamp including the origin changes nothing at
   * all — phases are differences, so the constant cancels and the overdub stays
   * exactly as late as it was. The compensation only works because it moves the
   * NOTES and leaves the ORIGIN at the pedal.
   *
   * What that buys, in one line: a compensated layer 0 SOUNDS at the instant its
   * key went down (the −delay in the recording cancels the +delay in playback),
   * so a performer overdubbing in unison with what they hear lands on the same
   * phase rather than a monitoring delay behind it. Layer 0 alone is unaffected
   * in any audible way — the whole loop rotates by 67 ms, and a circle has
   * nothing to rotate against.
   */
  function capture(row) {
    const d = monitorDelayMs();
    const r = inputRow(row);
    if (d) { r.rawAt = r.at; r.compensatedMs = +d.toFixed(3); r.at = r.at - d; }
    trace.push(r);
    // Live monitoring is deliberately NOT the loop's path: you hear your own
    // playing immediately, at `ctx.currentTime`, because a performer's own note
    // must not wait for a 25 ms lookahead tick. The loop's copy of the same
    // note goes through the scheduler like everything else. Two paths, and the
    // difference between them is measured rather than assumed (NOTES.md M3).
    if (r.type === 'note-on') voices.monitorOn(r);
    else if (r.type === 'note-off') voices.monitorOff(r);
    else if (r.type === 'cc') voices.monitorCc(r);
    return r;
  }

  /** Press RECORD. Pass 1 is a trace, not a loop — nothing is quoted yet. */
  function armRecord(atMs) {
    if (recording) return null;
    armedAt = atMs;
    if (origin === null) { origin = atMs; rebaseParent(origin); }   // the first pass defines the origin
    recording = true;
    return { origin, armedAt };
  }

  /**
   * Press RECORD again. THIS is where authoring happens, and it is the only
   * place: the trace since `armedAt` is projected onto [0, L) and a quotation
   * of it is added to the score.
   *
   * @param {number} atMs  when the pedal was pressed (source-stamped)
   * @param {number|null} explicitLoopMs  override; null = the length you played
   */
  function commitLayer(atMs, explicitLoopMs = null) {
    if (!recording) return null;
    recording = false;
    const isFirst = layers.length === 0;
    if (isFirst) {
      // THE FIRST PASS SETS THE LENGTH — the gesture a looper is named for, and
      // it needs no library feature at all, because the quotation is authored
      // AFTER the trace exists. C10 doing useful work.
      loopLen = explicitLoopMs ?? Math.max(1, atMs - armedAt);
      lengthSetByPlaying = explicitLoopMs === null;
    }
    // The window is widened by the compensation: a note played just after the
    // pedal has been pulled BACK across it, and it is still that layer's note.
    const grace = monitorDelayMs();
    const rows = trace.filter((r) => r.at >= armedAt - grace && r.at <= atMs && r.layer === layers.length);
    const proj = projectToPhase(rows, { origin, loopMs: loopLen, layer: layers.length, noteMode, graceMs: grace });

    // The child's range starts ONE UNIT BEFORE `in`: a wrap seeks a hair before
    // `in` so a note sitting exactly on the downbeat is still pending and
    // fires. If `in` were the range start that seek clamps and every pass loses
    // its first note. proto/loops paid for this line; it is not re-derivable
    // from the docs alone.
    const id = `L${layers.length}`;
    // The adapters need to be able to ask the deck where it is, and the deck
    // does not exist until they are built. One mutable holder, filled in on the
    // next line — the alternative is registering adapters after construction,
    // which the nest could not see before v0.6.
    const ref = { deck: null, id, layer: layers.length, iter: () => nest.loop(id).iter };
    const deck = createDeck({
      clock, tickHost: newHost(), range: [-1, loopLen], items: proj.items,
      adapters: { note: noteAdapter(voices, { ctx, leadMs: lead, ref, reducer }), cc: ccAdapter(voices, { ref }) },
    });
    ref.deck = deck;
    refDeck(deck, `layer-${layers.length}`);

    // rule 7g: its own deck, because it plays at the same instant as its
    // siblings. N overdubs = N tape machines.
    nest.add({ id, at: origin, rate: 1, deck, in: 0, out: loopLen, repeat: 'infinite' });

    // ⚠ SEAM (reported in NOTES.md). `nest.add()` ends with `sp.deck.pause()`
    // and schedules an `enter` item at `at` on the PARENT. A looper always adds
    // a layer while the parent is already running PAST `at` — you pressed the
    // pedal a loop length after you pressed it the first time — so that enter
    // item is in the past and never fires, and the child sits paused at rate 0
    // while the nest cheerfully counts wraps around it. Silent, and it cost an
    // hour.
    //
    // A seek to the position the parent is ALREADY at is the fix, and it is not
    // a hack: a seek is a STATE operation (proto/loops' second law), so it
    // re-folds every span's presence from the position rather than from an edge
    // that has been spent. This is the same class of bug nested.mjs's own
    // comment at assertSpan() describes — "absence is a POSITION, not an edge
    // event" — one level up, on entry rather than on exit.
    parent.seek(parent.position());
    nest.servo();     // and run the servo NOW, so entry does not wait for the
                      // client's next loop — see NOTES.md M-entry, where not
                      // doing this costs exactly one late event in pass 1.

    const layer = {
      id, index: layers.length, deck, ...proj, loopMs: loopLen, wraps: 0,
      spanMs: +(atMs - armedAt).toFixed(3), muted: false,
    };
    layers.push(layer);
    onLayer && onLayer(layer);
    return layer;
  }

  /** Start the next overdub: subsequent captures are tagged with a new layer. */
  function armOverdub(atMs) { return armRecord(atMs); }

  function start(atMs = null) {
    if (origin === null) { origin = atMs ?? 0; }
    rebaseParent(origin);
    parent.seek(origin);
    parent.play(1);
    return origin;
  }

  /** Record a playback onset. Called by the synth so the ledger holds the
   *  AUDIO-domain instant, not just the wall one. */
  function logOnset(row) { onsets.push(row); }

  return {
    parent, nest, layers, trace, onsets, logOnset,
    capture, armRecord, armOverdub, commitLayer, start,
    origin: () => origin,
    loopMs: () => loopLen,
    lengthSetByPlaying: () => lengthSetByPlaying,
    recording: () => recording,
    layer: (i) => layers[i] || null,
    /** the pass index the parent is in right now */
    pass: () => (origin === null ? 0 : loopPhase(parent.position() - origin, loopLen).iter),
    /** phase inside the current pass */
    phase: () => (origin === null ? 0 : loopPhase(parent.position() - origin, loopLen).off),
    setLayerMuted(i, m) { const L = layers[i]; if (L) { L.muted = m; voices.setLayerMuted(i, m); } },
    /** §8.3's two behaviours, reported per lane so a demo can SHOW the split */
    loopLanes: (i) => {
      const L = layers[i]; if (!L) return null;
      const l = nest.loop(L.id);
      return { ...l.lanes, boundary: l.boundary, joint: l.joint };
    },
    stats() {
      return {
        layers: layers.length, loopMs: loopLen, origin,
        traceRows: trace.length, onsets: onsets.length,
        notes: layers.reduce((a, l) => a + l.notes, 0),
        trimmed: layers.reduce((a, l) => a + l.trimmed, 0),
        orphanOffs: layers.reduce((a, l) => a + l.orphanOffs, 0),
        wraps: layers.map((l) => nest.loop(l.id).wraps),
        lengthSetByPlaying,
      };
    },
    /**
     * SAVE. A session is a SCORE plus the MATERIAL its refs name — and the
     * split is not an implementation detail, it is score.mjs's rule showing
     * through: *a quotation names its source by IDENTITY, never by object*
     * (`loadScore` refuses to run without a resolver, in those words).
     *
     * Which is exactly why this is also the wire format for the remote looper
     * (plan-looper.md §1). A committed layer is a value: ~6 KB of JSON that can
     * take 30 ms or 300 ms to arrive without changing a note of what is heard,
     * because the receiving peer plays it from its own clock against a shared
     * epoch-anchored origin. Sending this object IS the loop plane.
     */
    toSession({ id = null, meta = null } = {}) {
      return {
        v: SESSION_VERSION,
        id, meta,
        origin, loopMs: loopLen, lengthSetByPlaying,
        // the arrangement — quotations only, no material
        score: nest.toScore({ id, meta }),
        // the material, keyed by the ref each quotation names
        material: layers.map((l) => ({
          ref: `layer-${l.index}`, index: l.index,
          items: l.items, notes: l.notes, trimmed: l.trimmed,
          orphanOffs: l.orphanOffs, beforeOrigin: l.beforeOrigin, rule: l.rule,
          spanMs: l.spanMs, muted: l.muted,
        })),
      };
    },
    toSessionJSON(opts) { return JSON.stringify(this.toSession(opts)); },
    dispose() {
      offWrap(); nest.dispose();
      for (const l of layers) l.deck.dispose();
      parent.dispose();
    },
  };
}

/**
 * LOAD. Rebuild the decks the score's refs name, then let `loadScore` do the
 * arranging — so the loader exercises the same path a remote peer will, and a
 * session that round-trips locally is a session that transmits.
 *
 * Note what is NOT restored: the TRACE. A session carries the score and the
 * material it quotes, not the absolute-time log of what was played. That is the
 * C10 boundary again, and it is the right cut for a wire format — the trace is
 * the performer's own record and nobody else's business, while the quotation is
 * the thing that has to be shared to be heard.
 */
export function loadSession(input, {
  clock, newHost, voices, ctx = null, leadMs = null, noteMode = 'paired', reducer = true,
  horizonMs = 60 * 60 * 1000, originOverride = null, toleranceMs = 5, onWrap = null,
} = {}) {
  const lead = leadMs == null ? (ctx ? DEFAULT_LEAD_MS : 0) : leadMs;
  const s = typeof input === 'string' ? JSON.parse(input) : input;
  if (!s || s.v !== SESSION_VERSION) throw new Error(`loadSession: unknown session version ${s && s.v} (want ${SESSION_VERSION})`);
  const origin = originOverride ?? s.origin;
  const loopLen = s.loopMs;

  const parent = createDeck({ clock, tickHost: newHost(), range: [origin - loopLen, origin + horizonMs], items: [] });
  const nest = createNest(parent, { toleranceMs, hardSeekMs: 250, tickHost: newHost() });
  const layers = [];
  // NOTE: no `onsets` array here, deliberately. A loaded session shares the
  // caller's voice engine, so every onset it produces is reported through THAT
  // engine's `onOnset` callback and lands in the caller's log. A second array
  // on this object would be permanently empty and would read as "the loaded
  // loop played nothing" — which is exactly how it read for one run of
  // remote-verify, while the audio render thread was hearing it perfectly well.
  const offWrap = nest.onWrap((info) => {
    const L = layers.find((l) => l.id === info.span);
    if (L) L.wraps = info.to;
    onWrap && onWrap(info);
  });

  // Build one deck per material entry, ref it by the name the score uses, and
  // hand `loadScore` a resolver over those refs. If the score names a ref the
  // material does not carry, loadScore throws IN WORDS naming what is missing.
  const byRef = new Map();
  for (const m of s.material) {
    const id = `L${m.index}`;
    const ref = { deck: null, id, layer: m.index, iter: () => nest.loop(id).iter };
    const deck = createDeck({
      clock, tickHost: newHost(), range: [-1, loopLen], items: m.items,
      adapters: { note: noteAdapter(voices, { ctx, leadMs: lead, ref, reducer }), cc: ccAdapter(voices, { ref }) },
    });
    ref.deck = deck;
    refDeck(deck, m.ref);
    byRef.set(m.ref, deck);
    layers.push({ id, index: m.index, deck, items: m.items, notes: m.notes, trimmed: m.trimmed,
                  orphanOffs: m.orphanOffs, beforeOrigin: m.beforeOrigin, rule: m.rule,
                  loopMs: loopLen, wraps: 0, spanMs: m.spanMs, muted: !!m.muted });
  }

  const score = typeof s.score === 'string' ? parseScore(s.score) : s.score;
  const loaded = loadScoreInto(score, byRef, nest);

  return {
    parent, nest, layers, trace: [], report: loaded.report,
    origin: () => origin,
    loopMs: () => loopLen,
    lengthSetByPlaying: () => !!s.lengthSetByPlaying,
    recording: () => false,
    layer: (i) => layers[i] || null,
    pass: () => loopPhase(parent.position() - origin, loopLen).iter,
    phase: () => loopPhase(parent.position() - origin, loopLen).off,
    start(atMs = null) {
      parent.seek(atMs ?? origin);
      parent.play(1);
      // the same entry rule the live looper needs: a span whose `at` is already
      // behind the playhead is entered by a seek, never by its enter event
      parent.seek(parent.position()); nest.servo();
      return origin;
    },
    setLayerMuted(i, m) { const L = layers[i]; if (L) { L.muted = m; voices.setLayerMuted(i, m); } },
    loopLanes: (i) => { const L = layers[i]; if (!L) return null;
      const l = nest.loop(L.id); return { ...l.lanes, boundary: l.boundary, joint: l.joint }; },
    stats() {
      return { layers: layers.length, loopMs: loopLen, origin, traceRows: 0,
               notes: layers.reduce((a, l) => a + l.notes, 0),
               trimmed: layers.reduce((a, l) => a + l.trimmed, 0),
               orphanOffs: layers.reduce((a, l) => a + l.orphanOffs, 0),
               wraps: layers.map((l) => nest.loop(l.id).wraps),
               lengthSetByPlaying: !!s.lengthSetByPlaying };
    },
    dispose() { offWrap(); nest.dispose(); for (const l of layers) l.deck.dispose(); parent.dispose(); },
  };
}

/** `loadScore` with a Map as the resolver. Kept as one line so the error a
 *  missing ref produces is the LIBRARY'S — it names every ref the score needs —
 *  and not a re-worded copy of it. */
function loadScoreInto(score, byRef, nest) {
  return loadScore(score, (ref) => byRef.get(ref) || null, { nest });
}

// ===========================================================================
// Measurement helpers — shared by measure.mjs, verify.mjs and the page, so a
// number shown in one place is computed by the same code everywhere.
// ===========================================================================

export function stats(xs) {
  const s = xs.filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b);
  if (!s.length) return { n: 0, p50: null, p95: null, max: null, mean: null };
  const at = (q) => s[Math.min(s.length - 1, Math.floor(s.length * q))];
  return {
    n: s.length, p50: at(0.5), p95: at(0.95),
    max: Math.max(...s.map(Math.abs)),
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    min: s[0],
  };
}

/** least-squares slope through the origin — "does the error accumulate?" */
export function slope(xs, ys) {
  let sxx = 0, sxy = 0;
  for (let i = 0; i < xs.length; i++) { sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
  return sxx === 0 ? 0 : sxy / sxx;
}

/** Round-trip check: every projected note must come back at the phase it was
 *  recorded at, in every pass. Returns per-onset phase error in ms. */
export function phaseErrors(onsets, { loopMs }) {
  return onsets.map((o) => {
    const want = o.phase;                            // where the projection put it
    const got = loopPhase(o.childPos, loopMs).off;   // where the deck actually was
    let d = got - want;
    if (d > loopMs / 2) d -= loopMs;
    if (d < -loopMs / 2) d += loopMs;
    return d;
  });
}

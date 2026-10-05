// demo/und/score.mjs: the SCORE tab of /und/, the page as it was until
// 2026-10-05, when *"merge click and und, no need for 'mobile screen' /
// theme"* made `/click/` its second tab (`./click.mjs`).
//
// WHAT CHANGED ON THE WAY IN, AND WHY:
//   1  The checks moved from load into the page's one SELFCHECK pass
//      (`tab-page.mjs` rule 3). They are the same checks, word for word, and
//      still all on data compiled in the page, plus the typing and the seek.
//   2  🔴 THE READOUT IS DRAWN NOW, AND TWO CELLS LEFT SO IT COULD BE. The old
//      page published six cells with `showReadout: false`, because `rows` and
//      `uses` repeat what the part and event lanes already say in their
//      gutters. A tab's report draws what it declares, so those two went and
//      the four the strip does not say stayed.
//   3  `hide()` pauses the deck, so leaving for CLICK stops the notes.
//
// A WRITTEN SCORE, MADE SEEKABLE: demo/notes/uuu-positron.md §3, on the
// container 04 introduces. vClick conducts an ensemble from a Csound score,
// and the format has two gaps that only appear when someone asks to start in
// the middle:
//
//   1  The tempo map is the INTEGRAL of 60/tempo, because Csound interpolates
//      tempo linearly in BEAT. The lane below draws bpm against time, and the
//      check compares the integral against the mean-tempo shortcut, which
//      looks fine and puts every later note early by a growing amount.
//   2  `m`/`n` is a repeat, and a repeat is a REFERENCE. It compiles to a use
//      in the document, not to four more lines of notes.
//
// THE DOCUMENT AND THE DECK ARE DIFFERENT THINGS, and this tab is where the
// difference bites. plan-timeline C10: the timeline is a TRACE format, never
// an AUTHORING one. A score is a program, the timeline is what a performance
// of it leaves behind. So the document keeps the repeat as ONE use, and the
// deck is built from the EXPANDED compile with every note at its real time.
//
// It has to be. Under a changing tempo "that passage again" is not the same
// passage in time: the second pass here spans 4.75 beats of a ramp and comes
// out 578 ms longer than the first. Playing it as a quotation at rate 1
// replays the FIRST pass's millisecond spacing, shifted, which is what this
// page did until it was measured against `compileCsound(expand: true)`, and
// the last note landed 578 ms early. A single `rate` on the quotation cannot
// fix that either: a scalar is a constant speed and the tempo is moving
// inside the span, so it would match the ends and drift through the middle.
//
// And the seek is the claim nothing else here makes: a score file cannot
// answer "what is in force at bar 9". It carries events, not state.
// `deck.reduceAt(kind, pos)` answers it at any position.

import { el } from '/shell/shell.mjs';
import { createTransportBar } from '/shell/transport-bar.mjs';
import { createStripView } from '/shell/strip.mjs';
import { createDeck } from '/timeline/transport.mjs';
import { scoreDoc, quotation, scoreDocToJSONL } from '/timeline/score.mjs';
import { csoundPart, compileCsound, tempoMap } from '/timeline/csound.mjs';
import { createCompileIdle, IDLE_MS, NOTE_SAYS } from '/shell/compile-idle.mjs';
import { createCodeBox } from '/shell/code-box.mjs';

/** Under the tab row, in the page's one fixed box. */
export const about = 'A Csound score you can edit, compiled when you stop typing, whose every note plays where its slowing tempo puts it, even after a jump into the repeat.';

export const readout = { bend: 'ms', beat: '', fold: '', sounded: '' };

const DEFAULT_SCORE = [
  '; a fragment in the shape vClick scores are written in',
  't 0 120  4.75 120  9.5 72   ; steady through part 1, then eases to 72 across part 2',
  '',
  'm theme',
  'i 1 0    0.5  8000 440',
  'i 1 +    .    .    550',
  'i 1 +    .    .    660',
  'i 1 +    1.0  .    880',
  '',
  'i 2 4    0.25 6000 220',
  'i 2 +    .    .    .',
  'i 2 +    .    .    .',
  'n theme                 ; and again, a reference, not seven more lines',
].join('\n');

export function build({ panel, d, assert, log, set }) {
  const host = panel.el;

  // ── ink: the part is slate in the strip and in the document (since
  // 2026-09-30, it was yellow), and yellow is kept for a note that has
  // SOUNDED, with its dim twin for one that has not yet ─────────────────────
  const INK = { on: '#ffd400', off: '#6b5a12' };
  const DERIVED = '#6f7d94';        // 02 and 03's slate: shown, never measured

  const parent = createDeck({ items: [], adapters: {}, range: [0, 1000] });

  let doc = null, part = null, tm = null, compiled = null, structural = null, bendMs = 0;
  // the TRACE: every note of the expanded compile, at the time it really sounds
  let traceItems = [];
  let LINES = [], lineEls = [], lineOfRow = new Map(), lineOfUse = new Map();
  const plays = new Map();
  let sounded = 0, ctx = null, soundAsserted = false;

  const code = createCodeBox({
    language: 'csound-sco',
    rows: DEFAULT_SCORE.split('\n').length,
    value: DEFAULT_SCORE,
    ariaLabel: 'the Csound score this tab compiles',
  });
  const ta = code.input;
  // The host is the box the compile note sits in the corner of. See below.
  const editor = code.el;
  editor.classList.add('und-editor');
  editor.style.setProperty('--ln-on', INK.on);
  editor.style.setProperty('--ln-off', INK.off);
  editor.style.setProperty('--ln-derived', DERIVED);
  host.append(editor);
  const warnEl = el('div', 'warn');
  host.append(warnEl);

  /* 🔴 THE BAR'S PLAY IS THE SOUND'S GESTURE SINCE 2026-09-30. `command.play`
     runs inside the click (or the space bar), so the AudioContext is made and
     resumed in the gesture a browser asks for, and then the deck plays. The
     resume is NOT awaited: a context resumed outside a gesture neither
     resolves nor rejects, it waits, and awaiting it left the deck unbuilt
     while the page looked fine. The sound may be late; the timeline is not.
     ⚠️ THIS IS THE PAGE'S ONE PUBLISHED BAR. CLICK's is `publish: false`. */
  let playOpened = false;
  const bar = createTransportBar(host, parent, { scrub: false,
    command: { play: () => {
      openAudio();
      /* ⚠️ GRADED ON THE FIRST PRESS, INSIDE IT. Before 2026-09-30 a
         `Play with sound` button did this and the harness pressed it; that
         control is gone, so the claim is read where it now lives. */
      if (!playOpened) {
        playOpened = true;
        assert('the transport’s own play opens the sound inside its press, with no second button',
          ctx !== null && bus !== null && ctx.state !== 'closed' && !d.el.querySelector('.pos-controls button'),
          `context ${ctx?.state}, voice bus ${bus ? 'built' : 'missing'}`);
      }
      parent.play();
    } } });

  const pre = el('pre', 'sc');

  /** bpm at a beat, interpolated linearly IN BEAT exactly as Csound does */
  function bpmAtBeat(points, beat) {
    if (!points.length) return 60;
    for (let i = 0; i < points.length; i++) {
      const [b0, m0] = points[i], next = points[i + 1];
      if (!next) return m0;
      if (beat <= next[0]) {
        const span = next[0] - b0;
        return span <= 0 ? m0 : m0 + ((next[1] - m0) * (beat - b0)) / span;
      }
    }
    return points[points.length - 1][1];
  }

  /** does the tempo actually go anywhere? a flat line is a constant, not a fact */
  const tempoVaries = (points) => points.length > 1
    && points.some(([, m]) => Math.abs(m - points[0][1]) > 1e-9);

  const view = createStripView(host, parent, {
    size: 'auto', follow: false, gutter: 150,
    lanes: [
      /* 🔴 SLATE, NOT YELLOW, SINCE 2026-09-30: *"make pat lane less yellow,
         use same color as csound score in other demo"*, which is CLICK's
         `words` lane, `#6f7d94`, already this tab's DERIVED. Yellow stays on
         what is lit NOW: a sounded note and the current line. */
      { id: 'deck-span', kind: 'deck-span', label: 'part', height: 46, barPad: 7,
        as: 'spans', stack: false, barGap: 3, terse: true, color: DERIVED,
        // Each use measured THROUGH THE TEMPO MAP, so a part that falls under
        // the ramp draws wider than the one that does not, which is the whole
        // point and used to be invisible, because both were drawn from the
        // same un-stretched material.
        rows: () => {
          if (!doc || !tm) return [];
          return doc.uses.map((u) => {
            const b0 = Number(u.at), b1 = b0 + (Number(u.out) - Number(u.in));
            const from = tm.msAt(b0), to = tm.msAt(b1);
            return { at: from, id: u.id, kind: 'deck-span',
                     payload: { durMs: to - from, use: u.id, beats: b1 - b0 } };
          });
        },
        labelOf: (s, { bw } = {}) => {
          const id = s.row?.payload?.use || '';
          return bw && bw < 84 ? id.slice(0, 6) : id;
        },
        describeRow: (r) => {
          const p = r.payload || {};
          const line = lineOfUse.get(p.use);
          return [`${p.use}, ${Math.round(p.durMs)} ms`,
                  line === undefined ? 'a use' : `line ${line}`];
        } },
      { id: 'rows', kind: 'note', label: 'event', height: 42, width: 2, as: 'ticks',
        color: INK.off, terse: true,
        // the notes the deck will actually fire, at the times it will fire them
        rows: () => traceItems.map((it) => ({ at: it.at, id: it.id, kind: 'note',
                                              payload: it.payload })),
        colorOfRow: (r) => (plays.get(r.payload?.row) ? INK.on : INK.off),
        describeRow: (r) => {
          const p = r.payload || {};
          const line = lineOfRow.get(p.row);
          const n = plays.get(p.row) || 0;
          return [`line ${line}, beat ${Math.round(p.beat * 100) / 100}`,
                  n ? `played ${n}x` : 'not played yet'];
        } },
      // THE TEMPO, AND IT IS DERIVED. The map is a function; sampling it into
      // rows to draw it is deriving a picture, not observing one. So it takes
      // the slate 02 and 03 use for "shown, never measured" and the gutter says
      // so. The lane is REMOVED, not flattened, when the tempo does not vary:
      // a flat line is a constant dressed as a measurement.
      { id: 'tempo', kind: 'note', label: 'tempo', height: 46, as: 'continuous',
        color: DERIVED, terse: true, dots: false, show: false,
        value: (p) => p.bpm,
        rows: () => {
          if (!doc || !tm) return [];
          const pts = doc.tempo;
          if (!tempoVaries(pts)) return [];
          const [lo, hi] = parent.range;
          const out = [];
          for (let i = 0; i <= 120; i++) {
            const ms = lo + ((hi - lo) * i) / 120;
            out.push({ at: ms, id: `t${i}`, kind: 'note',
                       payload: { bpm: bpmAtBeat(pts, tm.beatAtMs(ms)) } });
          }
          return out;
        },
        describeRow: (r) => [`${Math.round(r.payload?.bpm ?? 0)} bpm`, 'read off the score'] },
    ],
  });

  host.append(pre);

  // ── highlighting, from the deck and never from a timer ──────────────────
  const fading = new Map();
  const setState = (i, st) => { const l = lineEls[i]; if (l) l.dataset.state = st; };

  function lightRow(rowId) {
    const i = lineOfRow.get(rowId);
    if (i === undefined) return;
    setState(i, 'now');
    clearTimeout(fading.get(i));
    fading.set(i, setTimeout(() => { setState(i, 'played'); fading.delete(i); }, 450));
  }

  /** A use line lights because a note INSIDE it fired, not because a timer
   *  noticed the playhead was in range. It stays lit until a different use
   *  takes over, since a use lasts as long as its notes do. */
  let litUse = null;
  function lightUse(useId) {
    if (useId === undefined || useId === litUse) return;
    if (litUse !== undefined && litUse !== null) {
      const prev = lineOfUse.get(litUse);
      if (prev !== undefined) setState(prev, 'played');
    }
    litUse = useId;
    const i = lineOfUse.get(useId);
    if (i !== undefined) setState(i, 'now');
  }

  /**
   * 🔴 A WARMER VOICE SINCE 2026-09-30, AND THE ONSET IS STILL A CLICK'S.
   * Asked as *"make und nicer-sounding"*. It was one triangle, 8 ms up and gone
   * by 280 ms, straight into the speakers. Now two sawtooths 7 cents either
   * side of the note, through a lowpass that opens bright and closes over the
   * note, a decay of about a second, and a short room made in the page.
   * ⚠️ THE ATTACK STAYS 4 ms. This tab's claim is WHERE each note lands under
   * a changing tempo, and a soft attack would smear exactly the instant being
   * claimed, so everything warmer happens after the onset.
   * ⚠️ THE ROOM IS NOISE WITH A DECAY WRITTEN INTO A BUFFER, NO FETCH. An
   * impulse off a server would be a visit costing somebody a request.
   * ⚠️ QUIET ON PURPOSE: 0.09 a voice into a bus at 0.7 and a compressor at
   * -10 dB, because the repeat under the ramp overlaps notes and eight
   * sawtooths summed at the old 0.2 would clip.
   */
  let bus = null;
  function openAudio() {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume().catch(() => {});
    if (bus) return;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 4;
    comp.connect(ctx.destination);
    bus = ctx.createGain();
    bus.gain.value = 0.7;
    bus.connect(comp);
    const room = ctx.createConvolver();
    const len = Math.round(ctx.sampleRate * 1.1);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    room.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    bus.connect(room); room.connect(wet); wet.connect(comp);
  }

  /** One note per row, so a seek is audible as well as assertable. */
  function voice(p) {
    if (!ctx || !bus) return;
    const freq = Number(p[4]);
    if (!Number.isFinite(freq) || freq <= 0) return;
    const t = ctx.currentTime;
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.8;
    lp.frequency.setValueAtTime(Math.min(freq * 8, 9000), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.5, 300), t + 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    lp.connect(g); g.connect(bus);
    for (const cents of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = cents;
      o.connect(lp);
      o.start(t); o.stop(t + 1.15);
    }
    sounded++;
    set('sounded', sounded, 'ok');
    // Asserted WHEN THE EVIDENCE ARRIVES, not at load: at load nothing has
    // sounded and the claim would be false, and waiting for it with a tolerant
    // "sounded > 0 || not started" is how 03 spent its life not looping.
    if (!soundAsserted) {
      soundAsserted = true;
      assert('notes actually sounded', sounded > 0, `${sounded} voices`);
    }
  }

  const noteAdapter = {
    caps: { rates: [0.25, 0.5, 1, 2], continuous: false, assertOnSeek: true },
    actuate(payload) {
      plays.set(payload.row, (plays.get(payload.row) || 0) + 1);
      lightRow(payload.row);
      lightUse(payload.use);
      voice(payload.p);
      view.strip.invalidate();
    },
    // The fold: how many notes have sounded by a position. It is what makes
    // "start at bar 9" answerable, and the checks probe it either side of
    // every note.
    reduce: (rows) => ({ count: rows.length }),
    assertState: (s) => s,
  };

  // one deck, one adapter, registered once. Registering bumps the scheduler's
  // adapter generation, which is what lets the transport bar find this deck's
  // rate lattice, and the bar is built before any of this exists.
  parent.sched.registerAdapter('note', noteAdapter);

  /**
   * CSOUND'S m/n INTO THE CONTAINER'S `uses`.
   *
   * A repeat spans mark to here and LANDS here, so the written material and the
   * replay never overlap in parent time, which matters, because rule 7g says
   * one deck has one position and two uses of it may not be present at the same
   * instant. So the score is partitioned: everything up to the repeat, then the
   * quoted span again, then whatever follows, each placed end to end.
   */
  function usesFor(cp, lastBeat) {
    const uses = [];
    let cursor = 0, at = 0, i = 0;
    for (const r of [...cp.repeats].sort((a, b) => a.atBeat - b.atBeat)) {
      if (r.atBeat > cursor) {
        uses.push(quotation({ id: `part${++i}`, ref: 'theme', at, in: cursor, out: r.atBeat }));
        at += r.atBeat - cursor;
        cursor = r.atBeat;
      }
      const span = r.outBeat - r.inBeat;
      if (span > 0) {
        uses.push(quotation({ id: `part${++i}`, ref: 'theme', at, in: r.inBeat, out: r.outBeat }));
        at += span;
      }
    }
    if (lastBeat > cursor) uses.push(quotation({ id: `part${++i}`, ref: 'theme', at, in: cursor, out: lastBeat }));
    return uses;
  }

  function teardown() {
    for (const t of fading.values()) clearTimeout(t);
    fading.clear();
    plays.clear();
    litUse = null;
  }

  /**
   * The textarea is editable, so a compile failure is a normal thing for a
   * human to cause and not a page fault. Keep the last good document, say what
   * was wrong, and let them fix the line.
   */
  function compile() {
    let cp, exp, str;
    try {
      cp = csoundPart(ta.value);
      exp = compileCsound(ta.value, { expand: true });
      str = compileCsound(ta.value, { expand: false });
    } catch (e) {
      warnEl.textContent = `score did not compile: ${String(e?.message ?? e)}`;
      log(`score did not compile: ${String(e?.message ?? e)}`, 'bad');
      return false;
    }
    if (!cp.part.rows.length) {
      warnEl.textContent = 'the score compiled to no rows';
      return false;
    }

    parent.pause();
    teardown();

    compiled = exp; structural = str;
    part = cp.part;
    const lastBeat = Math.max(...cp.part.rows.map((r) => r.at + Math.max(0, r.dur)), 1);
    doc = scoreDoc({ id: 'sound', tempo: cp.tempo.length ? cp.tempo : [[0, 60]],
      parts: { theme: cp.part }, uses: usesFor(cp, lastBeat) });
    tm = tempoMap(doc.tempo);

    // the document, one record per line, coloured by the part it belongs to
    LINES = scoreDocToJSONL(doc).split('\n');
    lineOfRow = new Map();
    lineOfUse = new Map();
    pre.replaceChildren();
    lineEls = LINES.map((text, i) => {
      const rec = JSON.parse(text);
      const row = el('span', 'sc-l');
      // the part's hue, the same as its lane in the strip (slate since 2026-09-30)
      if (rec.t === 'row' || rec.t === 'part' || rec.t === 'use') row.style.borderLeftColor = DERIVED;
      if (rec.t === 'row') lineOfRow.set(rec.id, i);
      else if (rec.t === 'use' && rec.id) lineOfUse.set(rec.id, i);
      row.append(el('span', 'sc-n', String(i).padStart(2, ' ') + '  '),
                 document.createTextNode(text));
      pre.append(row);
      return row;
    });

    // ── THE TRACE. Every note the expanded compile produces, at the time the
    // tempo map puts it. A repeat under a ramp is genuinely different material
    // in time, which is why Csound expands it and why quoting the first pass at
    // rate 1 was wrong by 578 ms at the end.
    //
    // The join back to the document is the SOURCE LINE: an expanded note keeps
    // the line it was written on, so the second pass lights the same seven
    // lines the first one did. Expanding for playback is what preserves the
    // one-line repeat, not what breaks it.
    const rowIdByLine = new Map(cp.part.rows.map((r) => [r.line, r.id]));
    const useSpans = doc.uses.map((u) => ({
      id: u.id, from: Number(u.at), to: Number(u.at) + (Number(u.out) - Number(u.in)),
    }));
    const useAtBeat = (b) => {
      const hit = useSpans.find((u) => b >= u.from - 1e-9 && b < u.to - 1e-9);
      return (hit || useSpans[useSpans.length - 1] || {}).id;
    };

    parent.sched.clear();
    traceItems = exp.items.map((it, i) => ({
      at: it.at, kind: 'note', id: `t${i + 1}`,
      payload: { row: rowIdByLine.get(it.payload.line), use: useAtBeat(it.payload.beat),
                 p: it.payload.p, beat: it.payload.beat },
    }));
    for (const it of traceItems) parent.schedule(it);

    const endBeat = Math.max(...doc.uses.map((u) => Number(u.at) + (Number(u.out) - Number(u.in))));
    parent.setRange([0, Math.ceil(tm.msAt(endBeat) + 300)]);

    // THE BEND, against the shortcut. Seconds-per-beat is linear in beat, so
    // the true curve is the trapezoid of 60/tempo; averaging the tempo gives a
    // straight line. The difference is the error a mean-tempo compiler ships:
    // every note lands, slightly early, and nothing in the output shows it.
    const pts = doc.tempo;
    const meanBpm = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    bendMs = tm.msAt(lastBeat) - (60000 * lastBeat) / meanBpm;

    // the tempo lane appears only when the tempo goes somewhere
    const varies = tempoVaries(pts);
    const tempoLane = view.strip.lanes().find((l) => l.id === 'tempo');
    if (tempoLane) {
      tempoLane.show = varies;
      tempoLane.subLabel = varies
        ? [`${Math.round(pts[0][1])} → ${Math.round(pts[pts.length - 1][1])} bpm`, 'drawn from the score']
        : null;
    }
    const partLane = view.strip.lanes().find((l) => l.id === 'deck-span');
    if (partLane) partLane.subLabel = [`${doc.uses.length} of them,`,
      structural.repeats.length
        ? `${structural.repeats.length} a repeat, played slower`
        : 'none a repeat'];
    const eventLane = view.strip.lanes().find((l) => l.id === 'rows');
    if (eventLane) eventLane.subLabel = [`${part.rows.length} written,`, 'each one a line below'];

    set('bend', Math.round(bendMs));
    set('sounded', sounded);
    warnEl.textContent = compiled.warnings.length
      ? compiled.warnings.map((w) => `warning: ${w}`).join('\n') : '';

    view.strip.fit();
    view.strip.invalidate();
    return true;
  }

  // ── compiling what was typed, once the typing stops ─────────────────────
  // 🔴 THE KIT'S IDLE COMPILE SINCE 2026-09-30, the same module `/fau/` uses
  // (*"unify compilation in ui logic on this and fau"*). It waits `IDLE_MS`
  // after the last keystroke, never runs two at once, and breathes
  // `Compiling` in the box's bottom right corner, then leaves `Did not
  // compile` standing if the score is refused. The full reason is still this
  // tab's to print, in the warning line under the box.
  // ⚠️ NO `notNow`. A compile here pauses the deck and rebuilds it, which is
  // what it always did; there is no held note to take away.
  const idle = createCompileIdle({
    input: ta,
    host: editor,
    compile: () => {
      if (!compile()) return { ok: false, error: warnEl.textContent };
      log(`recompiled, ${part.rows.length} rows`);
      return { ok: true };
    },
  });

  setInterval(() => {
    if (!tm || !traceItems.length) return;
    const pos = parent.position();
    set('beat', Math.round(tm.beatAtMs(pos) * 100) / 100);
    const fold = parent.reduceAt('note', pos);
    set('fold', fold && Number.isFinite(fold.count) ? fold.count : '');
  }, 200);

  // No "jump into the repeat" button. Seeking into the score IS this tab's
  // claim, but the button only did by hand what two asserts already do on
  // their own, and the strip is a position surface you can drag there yourself.
  compile();
  log('edit the score and it compiles when you stop, t bends the tempo lane and m/n becomes one use');

  return {
    deck: parent,
    show() { requestAnimationFrame(() => requestAnimationFrame(() => { view.strip.fit?.(); view.strip.invalidate?.(); })); },
    // Leaving the tab stops the notes: nothing new is scheduled once the deck
    // is paused, and a voice already sounding decays inside 1.15 s.
    hide() { parent.pause(); },

    async check({ A }) {
      // ── the checks, carried over from vclick and adapted to the container ──
      A('the score compiles to rows', part.rows.length > 0, `${part.rows.length} rows`);
      A('no warnings from a score this simple', compiled.warnings.length === 0,
        compiled.warnings.join(' | ') || 'none');

      // THE INTEGRAL, and the number this project paid for. Tempo 120 -> 72
      // over 16 beats is the TRAPEZOID of seconds-per-beat (Csound
      // interpolates 60/tempo linearly in beat, verified against csound 6.18);
      // the mean-tempo shortcut is a straight line through the same endpoints.
      // Until 2026-09-09 this said "closed form" and meant a logarithmic
      // integral of a linearly-interpolated TEMPO, which was a third, also
      // wrong answer. See timeline/lab/csound-oracle.mjs.
      const bend = Math.round(bendMs);
      A('the tempo map bends away from the mean-tempo line', Math.abs(bend) > 20,
        `${bend} ms by the end`);

      A('the repeat compiled to a use, not to more rows',
        structural.repeats.length > 0
          && doc.uses.length === structural.repeats.length + 1
          && part.rows.length === structural.items.length,
        `${structural.repeats.length} repeat, ${doc.uses.length} uses, ${part.rows.length} rows written`);

      // THE GUARD FOR THE BUG THIS PAGE SHIPPED WITH. Every note has to be
      // scheduled where the tempo map puts it, not where the same material
      // landed on its first pass. Quoting the first pass at rate 1 satisfies
      // "the repeat is one use" and every structural check, and still plays the
      // second pass 578 ms early.
      {
        let worst = 0;
        for (const t of traceItems) worst = Math.max(worst, Math.abs(t.at - tm.msAt(t.payload.beat)));
        // where the last note would land if the repeat merely replayed the
        // first pass's spacing, shifted: the wrong answer, quantified
        const late = traceItems[traceItems.length - 1];
        const firstUse = doc.uses[0] && doc.uses[0].id;
        const firstPass = new Map();
        for (const t of traceItems) if (t.payload.use === firstUse && !firstPass.has(t.payload.row)) firstPass.set(t.payload.row, t.at);
        const lateUse = doc.uses.find((u) => u.id === late.payload.use);
        const naive = lateUse && firstPass.has(late.payload.row)
          ? tm.msAt(Number(lateUse.at)) + firstPass.get(late.payload.row) - tm.msAt(Number(doc.uses[0].at))
          : null;
        const stretch = naive === null ? null : Math.round(late.at - naive);
        A('every note is scheduled where the tempo map puts it', worst < 2,
          `worst ${worst.toFixed(2)} ms`
          + (stretch === null ? '' : `, the repeat is stretched ${stretch} ms, not merely moved`));
      }

      A('the deck spans the score', parent.range[1] > 0
        && Math.abs(parent.range[1] - compiled.durationMs) < 1500,
        `${parent.range[1]} vs ${Math.round(compiled.durationMs)} ms`);

      // THE FOLD, either side of every note: the same probe 15 seek runs
      // against a recording, run here against a written score.
      {
        let wrong = 0, probes = 0;
        for (const it of traceItems) {
          for (const at of [it.at - 1, it.at, it.at + 1]) {
            if (at < 0) continue;
            probes++;
            const want = traceItems.filter((x) => x.at <= at).length;
            const got = parent.reduceAt('note', at);
            if (!got || got.count !== want) wrong++;
          }
        }
        A('the fold is exact either side of every note', wrong === 0,
          `${probes} probes, ${wrong} wrong`);
      }

      // ── the idle compile, graded by typing into the real box ────────────
      // 🔴 BEFORE `ready` AND AWAITED, AND THAT IS NOT CAUTION. A compile
      // pauses the deck, and `demo/verify.mjs` presses the transport's play
      // after the page says it is ready and asserts the position moved. A
      // compile landing inside that drill would stop it and take the drill red
      // on a page doing what it should.
      // ⚠️ TWO EDITS CLOSER THAN `IDLE_MS`, then ONE compile, and the rows it
      // produced are the SECOND edit's: the count is what says the last text won.
      {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const typeInto = (text) => { ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); };
        const rows0 = part.rows.length, runs0 = idle.runs();
        typeInto(`${DEFAULT_SCORE}\ni 1 20   0.5  8000 660`);
        await sleep(200);
        typeInto(`${DEFAULT_SCORE}\ni 1 20   0.5  8000 660\ni 1 21   0.5  8000 550`);
        await sleep(IDLE_MS / 2);
        A('typing compiles nothing while it goes on, and the corner stays empty until a compile starts',
          idle.runs() === runs0 && idle.state() === 'due' && idle.shown() === '',
          `${idle.runs() - runs0} compiles ${IDLE_MS / 2} ms after the last keystroke, ${idle.state()}, note "${idle.shown()}"`);
        await sleep(IDLE_MS / 2 + 150);
        const anim = getComputedStyle(idle.el).animationName;
        A('once the typing pauses the score compiles once, as it stood at the last keystroke, under a breathing Compiling note',
          idle.runs() === runs0 + 1 && part.rows.length === rows0 + 2
            && idle.shown() === NOTE_SAYS.compiling && anim === 'pos-cnote-breathe' && idle.el.tagName !== 'BUTTON',
          `${idle.runs() - runs0} compile, ${rows0} rows became ${part.rows.length}, note "${idle.shown()}" ${anim}`);
        await idle.settled();
        A('and then the note is gone, not drawn at all',
          idle.shown() === '' && getComputedStyle(idle.el).display === 'none',
          `"${idle.shown()}", display ${getComputedStyle(idle.el).display}`);
        // Put the score back the way a visitor finds it, without the note.
        code.set(DEFAULT_SCORE);
        compile();
        // 🔴 THE CODE BOX'S ONE INVARIANT, READ OFF THE RENDERED ELEMENTS: the
        // coloured layer holds exactly the textarea's text at its metrics, after
        // two typed edits and a set(). A statement letter on every note line.
        const cs = (e) => getComputedStyle(e);
        const PROPS = ['font-size', 'line-height', 'padding-top', 'padding-left', 'white-space'];
        const differ = PROPS.filter((p) => cs(code.ink).getPropertyValue(p) !== cs(ta).getPropertyValue(p));
        const letters = code.ink.querySelectorAll('.pos-tk-keyword').length;
        A('the score is drawn coloured over the box exactly as typed, at the box’s own metrics',
          code.ink.textContent === ta.value && differ.length === 0 && letters === 10,
          `${ta.value.length} characters, ${differ.length ? `differs in ${differ.join(' ')}` : 'metrics equal'}, `
          + `${letters} statement letters`);
      }

      // A seek that lands inside the repeat: the position the score cannot
      // describe. 🔴 AND IT DOES NOT PUT THE PLAYHEAD BACK, which is why it
      // lives here, under SELFCHECK: the harness plays from here and
      // `notes actually sounded` needs a note in that half second.
      {
        const rep = structural.repeats[0];
        const use = rep && [...doc.uses]
          .filter((u) => Math.abs(Number(u.in) - rep.inBeat) < 1e-9
                      && Math.abs(Number(u.out) - rep.outBeat) < 1e-9)
          .sort((a, b) => Number(b.at) - Number(a.at))[0];
        let mid = use ? tm.msAt(Number(use.at) + (Number(use.out) - Number(use.in)) / 2) : null;
        /* 🔴 JUST AHEAD OF A NOTE INSIDE THE REPEAT, NOT ON THE BARE MIDPOINT,
           SINCE 2026-09-30. 120 ms before the next note, and only where that
           note is still inside the repeat, so the claim below is unchanged. */
        const end = use ? tm.msAt(Number(use.at) + (Number(use.out) - Number(use.in))) : null;
        const next = mid !== null && traceItems.find((x) => x.at > mid && x.at < end);
        if (next) mid = Math.max(mid, next.at - 120);
        if (mid !== null) parent.seek(mid);
        const pos = parent.position();
        const want = traceItems.filter((x) => x.at <= pos).length;
        const got = parent.reduceAt('note', pos);
        A('a seek into the repeat folds correctly', !!got && got.count === want,
          `at ${Math.round(pos)} ms, fold ${got && got.count} of ${want}`);
      }

      A('this is the page’s one published transport', window.__demo?.transport === bar.api,
        window.__demo?.transport === bar.api ? 'the harness drills this bar' : 'another bar is published');
    },
  };
}

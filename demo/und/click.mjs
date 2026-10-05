// demo/und/click.mjs: the CLICK tab of /und/, from the old /click/ page,
// which retired on 2026-10-05 with no redirect when *"merge click and und, no
// need for 'mobile screen' / theme"* made it this tab.
//
// WHAT CHANGED ON THE WAY IN, AND WHY:
//   1  🔴 THE PLAYER'S SCREEN IS GONE, AND THE THEME SWITCH WITH IT. The old
//      page opened on a copy of vClick's phone client (`client/main.qml` in
//      tarmoj/vclick): a gradient ground, a tempo line, a bar and a beat
//      numeral and three lamps that lit and faded over one beat, in two paints,
//      `subtle` (the default) and `original`. The owner called it the "mobile
//      screen" and said there was no need for it or for the theme. The bar,
//      the beat and the tempo it showed are this tab's readout cells, the cue
//      words are the `word` lane, and the two scores still light line by line.
//      No assert read the screen or the theme, so none went with them.
//   2  The checks moved from load into the page's one SELFCHECK pass
//      (`tab-page.mjs` rule 3), word for word, and the offline check now also
//      allows `/und/`, where this module and its page are served from.
//   3  🔴 ITS BAR IS `publish: false`. SCORE owns the page's one published
//      transport; this one is listed in `bars` and drilled as page asserts.
//   4  `hide()` pauses the deck, so a click track does not run on in a tab
//      nobody is looking at.
//   5  It makes no sound, as the old page made none.
//
// ── THEIR SCORES, CARRIED RATHER THAN FETCHED ─────────────────────────────
//
// `server/test.sco` and `server/simple-4-4.sco` from tarmoj/vclick, GPL-3.0,
// (c) Tarmo Johannes, copied verbatim, tabs and comments included, because a
// score edited to suit the compiler would prove nothing about the compiler.
//
// ⚠️ EMBEDDED, NOT FETCHED, AND THAT IS THE POINT OF THE TAB. A click track
// that needs the network to tell it where the beat is has put the network
// back in the per-beat path. This tab makes NO request of any kind, no fetch
// and no socket, and the two scores are here so that stays true.

import { el } from '/shell/shell.mjs';
import { createChoice } from '/shell/choice.mjs';
import { createStepper } from '/shell/stepper.mjs';
import { createTransportBar } from '/shell/transport-bar.mjs';
import { createStripView } from '/shell/strip.mjs';
import { createDeck } from '/timeline/transport.mjs';
import { scoreDoc, quotation, scoreDocToJSONL, parseScoreDocJSONL } from '/timeline/score.mjs';
import { csoundPart, tempoMap } from '/timeline/csound.mjs';

const SCORES = {
  'test.sco': `; vClick score - for test and demo
#define TUTTI #0#
#define TEMPO1 #80#
#define TEMPO2 #52#
#define BEGIN #9#
#define REPTEMPO #$TEMPO1#

t 0 $TEMPO1
i 1 0 0 $TEMPO1 0
i "countdown" 0 4 4 $TUTTI
i "notification" 3 1 "READY"
s

;ADVANCE
t 0 $TEMPO1 4 $TEMPO1 12 $TEMPO2
i1 4 8 $TEMPO1 $TEMPO2 8
i1 12 0 $TEMPO2 0

i	2	0	4	4	4	0	1	$TUTTI
i	2	4	4	4	4	0	2	$TUTTI
i	2	8	4	4	4	0	3	$TUTTI
i	2	12	4	4	4	0	4	$TUTTI

i	2	18	1	1	4	0	5	$TUTTI
i	2	19	1.5	1	[8/3]	0	-5.2	$TUTTI
i	2	20.5	1	1	4	0	-5.3	$TUTTI

i	2	21.5	0.5	1	[16/3]	0	6	$TUTTI
i	2	22	0.75	1	4	0	-6.2	$TUTTI
i	2	22.75	0.5	1	4	0	7	$TUTTI
i	2	23.25	0.75	1	[16/3]	0	-7.2	$TUTTI

i	2	24	0.75	[16/3]	4	0	8	$TUTTI
i	2	24.75	0.5	1	4	0	-8.2	$TUTTI

i	2	25.25	0.75	[16/3]	4	0	9	$TUTTI
i	2	26	0.5	1	4	0	-9.2	$TUTTI

i	"notification"	0	2	"Go!"
i	"notification"	4	8	"Ritenuto"
i	"notification"	16	2	"Complex"
i	"notification"	18	3	"2+3+2/8"
i	"notification"	21.5	3	"5/16"
`,
  'simple-4-4.sco': `; vClick score template							
							
;count-down 								
								
								
#define TUTTI  #0#								
#define TEMPO1 #60#								
#define REPTEMPO #$TEMPO1# ; REPTEMPO for setting tempo for countdown (if starts from section in another tempo)								
#define BEGIN #5#								
								
								
t 0 $REPTEMPO								
i 1 0 0 $REPTEMPO 0								
i "countdown" 0 4 4 $TUTTI			; four click in four beats					
i "notification" 3 0.9 "READY"			; notification					
f 0 4 	; workaround – not to leave early – FIX IT							
s								
								
								
t	0	$TEMPO1						
								
i 	1	0	0	$TEMPO1	0	0	; set the tempo	
								
								
								
								
								
;ADVANCE		; do not change by hand!						
; a 0 0.01 < beats>								

							
; times bar by bar								
;i	instrnr	start	duration	number of beats	part of the whole note	subdivision	bar number	instruments
i	2	0	4	4	4	0	1	$TUTTI
i	2	4	4	4	4	0	2	$TUTTI
i	2	8	4	4	4	0	3	$TUTTI
i	2	12	4	4	4	0	4	$TUTTI
i	2	16	4	4	4	0	5	$TUTTI
i	2	20	4	4	4	0	6	$TUTTI
i	2	24	4	4	4	0	7	$TUTTI
i	2	28	4	4	4	0	8	$TUTTI
i	2	32	4	4	4	0	9	$TUTTI
i	2	36	4	4	4	0	10	$TUTTI
i	2	40	4	4	4	0	11	$TUTTI
i	2	44	4	4	4	0	12	$TUTTI
i	2	48	4	4	4	0	13	
i	2	52	4	4	4	0	14	
i	2	56	4	4	4	0	15	
i	2	60	4	4	4	0	16	
i	2	64	4	4	4	0	17	
i	2	68	4	4	4	0	18	
i	2	72	4	4	4	0	19	
i	2	76	4	4	4	0	20	
i	2	80	4	4	4	0	21	
i	2	84	4	4	4	0	22	
i	2	88	4	4	4	0	23	
i	2	92	4	4	4	0	24	
i	2	96	4	4	4	0	25	
i	2	100	4	4	4	0	26	
i	2	104	4	4	4	0	27	
i	2	108	4	4	4	0	28	
i	2	112	4	4	4	0	29	
i	2	116	4	4	4	0	30	
i	2	120	4	4	4	0	31	
i	2	124	4	4	4	0	32	
i	2	128	4	4	4	0	33	
i	2	132	4	4	4	0	34	
i	2	136	4	4	4	0	35	
i	2	140	4	4	4	0	36	
i	2	144	4	4	4	0	37	
i	2	148	4	4	4	0	38	
i	2	152	4	4	4	0	39	
i	2	156	4	4	4	0	40	
i	2	160	4	4	4	0	41	
i	2	164	4	4	4	0	42	
i	2	168	4	4	4	0	43	
i	2	172	4	4	4	0	44	
i	2	176	4	4	4	0	45	
i	2	180	4	4	4	0	46	
i	2	184	4	4	4	0	47	
i	2	188	4	4	4	0	48	
i	2	192	4	4	4	0	49	
i	2	196	4	4	4	0	50	
								
								
								
; CUES								
								
i	"playfile"	0	999	"test.wav"	0	; t1		
								
								
								
								
; NOTIFICATIONS								
								
i	"notification"	0	2	"Start"				
`,
};

/** Under the tab row, in the page's one fixed box. */
export const about = 'U:\u2019s vClick score worked out once in the page, so every player\u2019s screen could read the bar and the beat off its own clock instead of the hall\u2019s wifi.';

// 🔴 `bytes` REPLACED `rows`, AND IT IS THE WHOLE COMPARISON IN ONE CELL.
// `bytes` is what actually crosses the wire on this design, the score
// DOCUMENT, once, and it sits next to `pushed`, which is what vClick puts on
// the hall's wifi and which climbs for as long as the piece lasts. `late` is
// how far each flash landed from the moment the score asks for.
export const readout = { bar: '', beat: '', tempo: 'bpm', late: 'ms', pushed: '', bytes: 'B' };

export function build({ panel, log, set }) {
  const host = panel.el;

  // ── one deck, and it owns the clock ──────────────────────────────────────
  //
  // 🔴 THIS REPLACED A HAND-ROLLED `requestAnimationFrame` LOOP, AND THE LOOP
  // WAS THE DEFECT. MEASURED while building the old page: in a background tab
  // Chrome stops rAF outright, so the flashes arrived in clumps when the tab
  // was next painted, and `late` read 2487.2 ms of somebody else's throttling.
  // `createDeck` defaults to a WORKER tick host, which is the whole reason
  // that option exists.
  // ⚠️ It is still not a promise that this survives a locked phone. Their
  // client is a native app that keeps counting in a pocket; a page needs a
  // wake lock for that and this one has none.
  const deck = createDeck({ items: [], adapters: {}, range: [0, 1000] });

  // ── compiling, which is all the work there is ────────────────────────────
  let cp = null, tm = null, doc = null;
  let events = [];        // {ms, bar, beat, lamp, bpm} or {ms, text, durMs}
  let wouldSend = 0;      // messages their server would have pushed by now
  let worstLate = 0;
  let scoreName = 'test.sco';
  const warn = el('p', 'warn', '');

  /** A bar statement expands into its own beats.
   *
   *  From THEIR orchestra (`server/metro_sendosc.orc`, instr 2), not guessed:
   *  p4 is how many beats the bar has, p5 is the note value as a fraction of a
   *  whole note, p6 the subdivision, p7 the bar number. Their metronome runs at
   *  `tempo/60 * p5/4`, so beat k sits 4/p5 score-beats after the one before.
   *
   *  ⚠️ A NEGATIVE BAR NUMBER IS NOT A BAR BEFORE THE START. It means "do not
   *  flash red on the first beat", for a bar built out of unequal groups.
   *  2+3+2/8 is written as three statements, one per group, and only the first
   *  gets the red. The FRACTIONAL part carries the beat number to start
   *  counting from, so -5.2 is bar 5 counting from beat 2. Reading it as a
   *  number would put four bars of the piece before bar 1.
   *  ⚠️ `lamp` is kept on each beat though the lamps are gone: it is which
   *  lamp vClick would light, and it is part of what their server sends.
   */
  function barBeats(r) {
    const p = r.payload.p;
    const count = Math.max(1, Math.round(Number(p[3]) || 1));
    const value = Number(p[4]) || 4;
    const barNo = Number(p[6]) || 0;
    const shown = Math.abs(Math.trunc(barNo));
    const frac = Math.abs(barNo % 1);
    const first = frac === 0 ? 1 : Math.round(frac * 10);
    const step = 4 / value;
    const out = [];
    for (let k = 0; k < count; k++) {
      const gb = r.at + k * step;
      out.push({
        ms: tm.msAt(gb),
        bar: shown,
        beat: first + k,
        lamp: (k === 0 && barNo >= 0) ? 0 : 1,
        bpm: bpmAtBeat(gb),
        row: r.id,
      });
    }
    return out;
  }

  function bpmAtBeat(beat) {
    const a = tm.msAt(beat), b = tm.msAt(beat + 0.001);
    return b > a ? 60000 / ((b - a) * 1000) : 0;
  }

  function compileScore() {
    warn.textContent = '';
    let part;
    try { part = csoundPart(SCORES[scoreName]); }
    catch (e) { warn.textContent = `${scoreName} did not compile: ${e.message}`; return; }
    cp = part;
    tm = tempoMap(part.tempo.length ? part.tempo : [[0, 60]]);

    // 🔴 THE SCORE BECOMES A DOCUMENT, AND THE DOCUMENT IS WHAT WOULD CROSS.
    // The Csound rows keep their p-fields verbatim, and one use places the
    // part once. It round-trips byte-identically, which is what makes `bytes`
    // an honest number rather than an estimate of one.
    const lastBeat = part.part.rows.length
      ? Math.max(...part.part.rows.map((r) => r.at + (r.dur || 0))) : 0;
    doc = scoreDoc({
      id: scoreName.replace(/\W+/g, '-'),
      tempo: part.tempo.length ? part.tempo : [[0, 60]],
      parts: { click: part.part },
      uses: [quotation({ id: 'u1', ref: 'click', at: 0, in: 0, out: lastBeat || 1 })],
    });

    const ev = [];
    for (const r of part.part.rows) {
      const instr = String(r.payload.instr).replace(/"/g, '');
      const atMs = tm.msAt(r.at);
      const durMs = tm.msAt(r.at + (r.dur || 0)) - atMs;
      if (instr === '2') ev.push(...barBeats(r));
      else if (instr === 'countdown') {
        // a count-in: p4 clicks spread over p3, shown as negative numbers, and
        // the last one green rather than blue, their instr 18, exactly
        const clicks = Math.max(1, Math.round(Number(r.payload.p[3]) || 1));
        for (let k = 0; k < clicks; k++) {
          ev.push({ ms: atMs + (durMs * k) / clicks, bar: 0, beat: -(clicks - k),
                    lamp: k === clicks - 1 ? 1 : 2, bpm: bpmAtBeat(r.at), row: r.id });
        }
      } else if (instr === 'notification') {
        ev.push({ ms: atMs, text: String(r.payload.p[3] ?? '').replace(/"/g, ''), durMs, row: r.id });
      }
    }
    ev.sort((a, b) => a.ms - b.ms);
    events = ev;

    // hand the whole piece to the deck, once. This is the argument in one line:
    // everything the piece will ever ask for is scheduled up front, and nothing
    // crosses a network again.
    deck.sched.clear();
    let n = 0;
    for (const e of ev) {
      deck.schedule(e.text !== undefined
        ? { at: e.ms, kind: 'word', id: `w${n++}`, payload: { ...e } }
        : { at: e.ms, kind: 'flash', id: `f${n++}`, payload: { ...e } });
    }
    const end = ev.length ? ev[ev.length - 1].ms + 2000 : 1000;
    deck.setRange([0, Math.max(end, part.durationMs)]);
    view.strip.invalidate();
    drawDoc();

    // ⚠️ UTF-8 BYTES, not `String.length`, which counts UTF-16 code units, and
    // this repo has already paid for the difference once on the wire.
    set('bytes', new TextEncoder().encode(scoreDocToJSONL(doc)).length);
    // ⚠️ NOT 0. Nothing has been pushed because nothing has been played, and
    // a zero here would read as a measurement rather than as an empty cell.
    set('pushed', '');
    set('late', '');
    worstLate = 0; wouldSend = 0;
    if (part.part.warnings.length) warn.textContent = part.part.warnings.join(', ');
    log(`${scoreName}: ${part.part.rows.length} rows, ${ev.length} to show`, 'hi');
    lanesLabel();
  }

  // ── the adapters: what a scheduled thing DOES when its moment comes ───────
  const flashAdapter = {
    caps: { rates: [0.5, 1, 2], continuous: false, assertOnSeek: true },
    actuate(p) {
      set('tempo', Math.round(p.bpm));
      set('bar', p.bar);
      set('beat', p.beat);
      // 🔴 THE NUMBER THE TAB EXISTS TO REPORT. How late this flash was
      // against the millisecond the score asks for, not against the previous
      // flash, which would only measure the timer against itself.
      worstLate = Math.max(worstLate, Math.abs(deck.position() - p.ms));
      set('late', worstLate.toFixed(1));
      // what vClick would have put on the wire to reach one player: the
      // beat/bar pair and the lamp are two separate OSC messages in their
      // `instr send`, and there is one of each per beat, per player.
      wouldSend += 2;
      set('pushed', wouldSend);
      lightRow(p.row);
    },
    reduce: (rows) => ({ count: rows.length }),
    assertState: (s) => s,
  };
  const wordAdapter = {
    caps: { rates: [0.5, 1, 2], continuous: false, assertOnSeek: true },
    actuate(p) { lightRow(p.row); },
    // ⚠️ COUNT ONLY. The rows a reducer is handed are not the items that were
    // scheduled, and reaching into their payload once took the whole page down
    // from inside a seek. Reduce over what the deck guarantees.
    reduce: (rows) => ({ count: rows.length }),
    assertState: (s) => s,
  };
  deck.sched.registerAdapter('flash', flashAdapter);
  deck.sched.registerAdapter('word', wordAdapter);

  // ── the operator's half, first in the tab ────────────────────────────────
  // ⚠️ FIRST, not last. These pick WHAT you are looking at, so they belong
  // above the thing rather than under it.
  const op = el('div', 'op');
  const pick = createChoice({
    label: 'Score',
    options: Object.keys(SCORES).map((k) => [k, k]),
    at: 0,
    onPick: (id) => { scoreName = id; compileScore(); },
  });
  let startBar = 1;
  const barLabel = el('span', '', 'bar 1');
  const stepper = createStepper({
    what: 'the starting bar',
    prev: () => { startBar = Math.max(1, startBar - 1); barLabel.textContent = `bar ${startBar}`; seekBar(); },
    next: () => { startBar = startBar + 1; barLabel.textContent = `bar ${startBar}`; seekBar(); },
  });
  op.append(pick.el, el('label', '', 'Start from'), stepper.el, barLabel);
  host.append(op);

  // ⚠️ ONE POSITION SURFACE. The strip below seeks on press AND on drag, so the
  // bar's slider would be a second horizontal time axis at a different scale.
  // ⚠️ AND NOT PUBLISHED: SCORE's bar is the page's transport.
  const bar = createTransportBar(host, deck, { scrub: false, publish: false });

  const INK = { beat: '#ffd400', word: '#6f7d94' };

  const view = createStripView(host, deck, {
    size: 'auto', follow: true, gutter: 150,
    lanes: [
      { id: 'beats', kind: 'flash', label: 'beat', height: 44, width: 2, as: 'ticks',
        color: INK.beat, terse: true,
        rows: () => events.filter((e) => e.text === undefined)
          .map((e, i) => ({ at: e.ms, id: `f${i}`, kind: 'flash', payload: { ...e } })),
        describeRow: (r) => {
          const p = r.payload || {};
          return [`bar ${p.bar} beat ${p.beat}`, `${Math.round(p.bpm)} bpm`];
        } },
      { id: 'words', kind: 'word', label: 'word', height: 40, barPad: 6,
        as: 'spans', stack: false, barGap: 3, terse: true, color: INK.word,
        rows: () => events.filter((e) => e.text !== undefined)
          .map((e, i) => ({ at: e.ms, id: `w${i}`, kind: 'word',
                            payload: { ...e, durMs: e.durMs } })),
        labelOf: (s, { bw } = {}) => {
          const t = s.row?.payload?.text || '';
          return bw && bw < 60 ? t.slice(0, 4) : t;
        },
        describeRow: (r) => {
          const p = r.payload || {};
          return [p.text, `${Math.round(p.durMs)} ms`];
        } },
    ],
  });

  // ── theirs and ours, under the line that plays them ──────────────────────
  // Side by side because the claim is a TRANSLATION: the same moment lights in
  // both columns as it plays. One column on a narrow screen (see the page CSS).
  const two = el('div', 'two');
  const srcCol = el('div'), docCol = el('div');
  srcCol.append(el('h4', '', 'their score'));
  docCol.append(el('h4', '', 'our document'));
  const srcPre = el('pre', 'sc');
  const pre = el('pre', 'sc');
  srcCol.append(srcPre); docCol.append(pre);
  two.append(srcCol, docCol);
  host.append(two, warn);
  let lineOfRow = new Map();     // row id -> line index in OUR document
  let srcOfRow = new Map();      // row id -> line number in THEIR score

  /** Draw the document, and remember which line each row is on.
   *  ⚠️ Rebuilt only when the SCORE changes; the per-beat path just flips
   *  `data-state` on one element, because rewriting a block of text on every
   *  beat is a reflow on a clock. */
  function drawInto(box, lines) {
    box.textContent = '';
    lines.forEach((text, i) => {
      const line = el('span', 'sc-l');
      line.append(el('span', 'sc-n', String(i + 1).padStart(3, ' ') + '  '));
      line.append(document.createTextNode(text));
      box.append(line);
    });
  }

  function drawDoc() {
    // OURS: one JSON object a line, and which line each row is on
    const lines = scoreDocToJSONL(doc).split('\n').filter(Boolean);
    lineOfRow = new Map();
    drawInto(pre, lines);
    lines.forEach((text, i) => {
      try {
        const o = JSON.parse(text);
        if (o && o.t === 'row' && o.id) lineOfRow.set(o.id, i);
      } catch { /* a line that is not a row is not addressable, and that is fine */ }
    });
    // THEIRS: the file as the composer typed it, tabs and comments included.
    // `csoundPart` keeps each row's `line`, so the two columns are joined
    // without a second reading of the format.
    drawInto(srcPre, SCORES[scoreName].split('\n'));
    srcOfRow = new Map();
    for (const r of cp.part.rows) if (r.line) srcOfRow.set(r.id, r.line - 1);
  }

  /** Light the line a beat came from. Several beats belong to ONE bar
   *  statement, so the same line lights again, which is the honest picture:
   *  the document has one line there, not four. */
  function lightOne(box, i) {
    for (const e of box.children) if (e.dataset.state === 'now') e.dataset.state = 'played';
    if (i !== undefined && box.children[i]) box.children[i].dataset.state = 'now';
  }
  function lightRow(id) {
    lightOne(pre, lineOfRow.get(id));
    lightOne(srcPre, srcOfRow.get(id));
  }

  /** The per-lane numbers, in the lane's own gutter rather than in a table. */
  function lanesLabel() {
    const beats = events.filter((e) => e.text === undefined);
    const words = events.filter((e) => e.text !== undefined);
    const bl = view.strip.lanes().find((l) => l.id === 'beats');
    const wl = view.strip.lanes().find((l) => l.id === 'words');
    const bpms = beats.map((e) => Math.round(e.bpm)).filter((x) => x > 0);
    if (bl) bl.subLabel = [`${beats.length} of them,`,
      bpms.length && Math.min(...bpms) !== Math.max(...bpms)
        ? `${Math.min(...bpms)}–${Math.max(...bpms)} bpm` : `${bpms[0] ?? 0} bpm`];
    if (wl) wl.subLabel = [`${words.length} of them,`, 'shown, never sounded'];
  }

  /** Where in the piece a bar number starts.
   *
   *  🔴 THIS IS THE WHOLE ARGUMENT, IN ONE FUNCTION. Their server does it by
   *  rewriting the score text: find the line whose eighth field is the bar,
   *  replace a comment reading `;ADVANCE` with a skip statement, hunt backwards
   *  for the last tempo line and re-insert it with a patched time. Compiled,
   *  it is a search through a list and a `deck.seek()`, and the tempo needs no
   *  repair because the tempo is a map over the whole piece.
   */
  function msOfBar(n) {
    const hit = events.find((e) => e.bar === n && e.beat === 1);
    return hit ? hit.ms : null;
  }
  function seekBar() {
    const at = msOfBar(startBar);
    if (at === null) { log(`bar ${startBar} is not in ${scoreName}`, 'bad'); return; }
    worstLate = 0; wouldSend = 0;
    deck.seek(at);
    log(`bar ${startBar} is ${Math.round(at)} ms in`, 'hi');
  }

  compileScore();
  seekBar();
  log('press \u25b6 on the bar, or step the bar number to start anywhere', 'hi');

  return {
    deck,
    bars: [{ name: 'the click', bar, strip: view.el }],
    show() { requestAnimationFrame(() => requestAnimationFrame(() => { view.strip.fit?.(); view.strip.invalidate?.(); })); },
    hide() { deck.pause(); },

    check({ A }) {
      A('their real score compiles', !!cp && cp.part.rows.length === 25,
        cp ? `${cp.part.rows.length} rows` : 'did not compile');
      A('it compiles with nothing to warn about', !!cp && cp.part.warnings.length === 0,
        (cp?.part.warnings || []).join(', ') || 'no warnings');
      A('every bar statement expanded into its own beats', events.length > cp.part.rows.length,
        `${cp.part.rows.length} rows became ${events.length} things to show`);
      // the document is the thing that would cross, so it has to survive the trip
      A('the score document round-trips byte-identically',
        scoreDocToJSONL(parseScoreDocJSONL(scoreDocToJSONL(doc))) === scoreDocToJSONL(doc),
        `${new TextEncoder().encode(scoreDocToJSONL(doc)).length} B`);
      {
        // ⚠️ Counted on the DECK's side of the boundary, not on the page's: a
        // count of what we handed over is a count of our own intention.
        const on = deck.eventsOf('flash').length + deck.eventsOf('word').length;
        A('the whole piece is on the deck', on === events.length,
          `${on} scheduled of ${events.length}`);
      }

      // A bar's first beat must land on the row's own millisecond: the
      // expansion walks the tempo map by hand, so this is the one place it
      // could disagree with the compiler that produced the row.
      {
        let worst = 0;
        for (const r of cp.part.rows) {
          if (String(r.payload.instr).replace(/"/g, '') !== '2') continue;
          worst = Math.max(worst, Math.abs(barBeats(r)[0].ms - tm.msAt(r.at)));
        }
        A('each bar\u2019s first beat lands on the row\u2019s own time', worst < 1e-6,
          `worst ${worst.toExponential(2)} ms over ${cp.part.rows.length} rows`);
      }

      // 🔴 The claim about starting anywhere, checked rather than stated:
      // every bar the score names can be seeked to, and the fold says what has
      // sounded by then, which is what their `;ADVANCE` surgery is for.
      {
        const barsIn = [...new Set(events.filter((e) => e.beat === 1 && e.bar > 0).map((e) => e.bar))];
        const found = barsIn.filter((b) => msOfBar(b) !== null);
        A('every bar in the score can be started from', barsIn.length > 0 && found.length === barsIn.length,
          `${found.length} of ${barsIn.length} bars: ${barsIn.join(', ')}`);
        let wrong = 0;
        for (const b of barsIn) {
          const at = msOfBar(b);
          const want = events.filter((e) => e.text === undefined && e.ms <= at).length;
          const got = deck.reduceAt('flash', at);
          if (!got || got.count !== want) wrong++;
        }
        A('and the count of what has sounded is exact at every one', wrong === 0,
          `${barsIn.length} bars probed, ${wrong} wrong`);
      }

      // The score declares its tempo twice and the two must agree, or the
      // number a player reads is not the number the beats are spaced by.
      {
        const rows = cp.part.rows.filter((r) => String(r.payload.instr) === '1'
          && Number(r.payload.p[3]) > 0);
        let worst = 0;
        for (const r of rows) worst = Math.max(worst, Math.abs(bpmAtBeat(r.at) - Number(r.payload.p[3])));
        A('the two ways the score states its tempo agree', rows.length > 0 && worst < 1.5,
          `${rows.length} tempo rows, worst ${worst.toFixed(2)} bpm apart`);
      }

      // The offline claim, asserted rather than assumed: plan-uuu-local P2.
      // The kit, the timeline, and this page's own directory, nothing else.
      // ⚠️ AND `/_log` IS LET THROUGH, BY NAME. It is the shell's local log
      // tap (`shell.mjs`, TAP_LOCAL): a POST to the dev server on 127.0.0.1
      // only, never made on the deploy. The old page asserted at load, before
      // the tap's first 250 ms flush, so it never saw one; this check runs in
      // the SELFCHECK pass, after it, and went red on exactly two of them.
      {
        const own = new URL('.', import.meta.url).pathname;
        const res = performance.getEntriesByType('resource');
        const away = res.filter((r) => {
          const p = new URL(r.name, location.href).pathname;
          return !(p.startsWith('/shell/') || p.startsWith('/timeline/') || p.startsWith(own)
            || (p === '/_log' && /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(location.hostname)));
        });
        A('the page asked the network for nothing', away.length === 0,
          away.length ? `asked for ${away.map((r) => r.name).join(', ')}` : `${res.length} resources, all local code`);
      }
    },
  };
}

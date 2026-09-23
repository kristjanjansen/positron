// demo/shell/roll.mjs. A vertical piano roll, drawn above the keys it names.
//
// 🔴 ASKED FOR 2026-09-23: *"add component that can be glued top of it that is
// vertical piano roll that supports dots (simular to dots on active keyboard
// keys) and vertical (auto)scrolling like piano rythm games. keep it simple and
// Cmaj/6 etc labels next to dots. intially no autoscroll, just allow multiple
// dot rows"*, and then *"rm these keyboards"* about the row of chord charts it
// replaces on `/nola/`.
//
// ── THE ONE THING THIS COMPONENT HAS TO GET RIGHT ──────────────────────────
//
// 🔴 A ROLL THAT DOES NOT LINE UP WITH THE KEYS UNDER IT IS NOT A ROLL. That
// is not a nicety, it is the whole function: you read a dot, your eye drops
// down the column, and your finger is on the key. `/nola/` shipped chord charts
// that were the same width and the same key size as the instrument and STILL
// did not line up, because they had a different base, and the report was that a
// shape could not be carried down the page.
// ✅ SO THE GEOMETRY IS NOT COPIED. `placeKey` and `SHARP_OFF` are imported
// from `keyboard.mjs`, which is the drawing this one has to agree with, and the
// grid template is the same `--k-cols` and `--k-min`/`--k-max` pair the keys
// use. Two drawings, one arithmetic. ⚠️ AND THE PAGE STILL ASSERTS IT, as a
// COLUMN POSITION IN PIXELS rather than as a base number, which is how that
// defect was caught the first time.
//
// ── WHAT IT IS NOT ────────────────────────────────────────────────────────
//
// ⚠️ IT IS NOT `note-grid.mjs`, which draws a Circuit pattern: sixteen steps
// across, one row per pattern, pitch on the y axis, and its own header says in
// capitals that it is deliberately NOT a piano roll of a session. This is the
// other axis and another subject: pitch across, time down, one row per chord.
// ⚠️ AND IT DOES NOT PARSE ANYTHING. `demo/shell/chords.mjs` turns `Cmaj`,
// `C9`, `F/C` and `Fm6/C` into notes and numerals, and `chords-test.mjs`
// grades that with no browser in it. ⚠️ THE COUNT IS NOT WRITTEN HERE ON
// PURPOSE: three comments in two files carried three different counts for that
// one command on 2026-09-23, 36 and 27 and 49, and all three were true when
// they were written. Run it. A caller hands over rows of notes and a label; this file
// decides where a dot goes and nothing else.
// ⚠️ NO AUTOSCROLL YET, WHICH IS WHAT WAS ASKED FOR AND IS THE RIGHT SIZE.
// A static stack of rows is gradable with no clock in it at all. When it does
// arrive, `positron-ui`'s rule is that nothing redrawing while somebody is
// looking may change how much room it takes, so the rows will move inside a
// window whose height does not.

import { placeKey } from './keyboard.mjs';

/**
 * @param {HTMLElement} host   where to draw it
 * @param {object} o
 * @param {number} o.base      MIDI note of the leftmost key. Pass the keyboard's.
 * @param {string[]} o.keys    the key ids, in order, as the keyboard has them
 * @param {Record<string, number>} o.map   key id -> semitones above `base`
 * @param {Set<string>} o.sharps           which ids are black keys
 * @param {Array<{label?: string, notes: number[]}>} [o.rows]
 * @param {boolean} [o.prepend] put it FIRST inside `host` rather than last,
 *   which is what glues it on top of a keyboard. See below.
 * @param {HTMLElement} [o.scroller] the key row, whose sideways scroll this
 *   follows. Pass a keyboard's `keysEl`.
 * @param {(row:object|null, i:number)=>void} [o.onPick] a row was picked, or
 *   unpicked, in which case `row` is null. See below.

 * @returns {{el, setRows, setBase, rows, dotsOf, destroy}}
 */
export function createRoll(host, { base = 60, keys = [], map = {}, sharps = new Set(),
                                   rows = [], prepend = false, scroller = null,
                                   onPick = null, lines = true, minRows = 0 } = {}) {
  const el = document.createElement('div');
  el.className = 'roll';
  /**
   * 🔴 FAINT RULES WHERE THE WHITE KEYS DIVIDE, AND THE HISTORY IS THE LESSON.
   * Asked for with a doubt attached: *"add faint vertical lines to indicate
   * white key separatoes to piano roll. make this rollbackablge (not sure how
   * good idea)"*. Then *"make vertical lines on pianoroll continuous"*, which
   * was done by closing the row gap. Then *"no continous vertical bars on
   * pianoroll!"*, WHICH WAS READ HERE AS `remove them` AND MEANT `they are
   * still not continuous`, so they were deleted. Then, four words: *"you lost
   * vertical lines on piano roll"*.
   * ⚠️ THE MISTAKE IS WORTH MORE THAN THE FEATURE. A report with no verb is
   * ambiguous, and the reading that DESTROYS work is the one to check before
   * acting on it. Asking would have cost one line.
   * ✅ AND THE ROLLBACK SWITCH STAYS, because it is what made the round trip
   * cost one attribute both ways. `lines: false` turns them off.
   */
  if (lines) el.dataset.lines = '1';

  let at = base;
  let current = rows;
  /** which row is picked, or -1. A redraw forgets it: the rows are new rows. */
  let picked = -1;
  /** which row Tab would land on. Never -1 while there are rows, or the roll
   *  falls out of the tab order entirely and cannot be reached at all. */
  let focused = 0;
  /**
   * The seam a glued roll draws between itself and the keys.
   *
   * 🔴 DECLARED HERE AND NOT WHERE IT IS BUILT, BECAUSE `draw()` READS IT AND
   * `draw()` RUNS FIRST. Written below the first call it was in its temporal
   * dead zone, so the page threw before `ready` and `demo/verify.mjs` reported
   * `0/1` with nothing else to say. `positron-ui` records the same shape taking
   * seven asserts silent on `/twelve/`: a declaration shadows its whole block
   * from the top, and the symptom is never near the cause.
   */
  let seam = null;
  /** element -> note, so a check can read what a dot means without arithmetic */
  const noteOfDot = new Map();

  const draw = () => {
    el.textContent = '';
    noteOfDot.clear();
    /* 🔴 AN EMPTY ROLL DRAWS NOTHING AT ALL, NOT AN EMPTY BOX. `.roll` carries
       its own gap and a page puts it in a stack, so a childless one would paint
       a band nobody wrote. That is `an empty box is a line`, which this project
       has already paid for on `/typist/` and in `.pos-controls`.
       🔴 UNLESS THE CALLER ASKED FOR A FIXED HEIGHT, WHICH IS THE OPPOSITE CASE
       AND ARRIVED 2026-09-23 AS *"make piano roll h fixed to 5 items even when
       no data"*. A roll that LEARNS opens empty on purpose and fills one row at
       a time, so with no floor the page jumps when the first chord lands and
       again on every row after it. `positron-diagram` already carries this rule
       for a picture that repaints on a press, and it is the same rule: reserve
       the room before anything is in it.
       ⚠️ AND THE TWO CASES ARE BOTH RIGHT. A typed line is a function of what
       somebody typed, so nothing is coming and an empty box really is a band
       nobody wrote. `minRows` is opt in for that reason and defaults to 0. */
    el.hidden = current.length === 0 && minRows === 0;
    if (seam) seam.hidden = el.hidden;
    current.forEach((row, i) => {
      /**
       * 🔴 A ROW IS A `button`, WHICH IS THE WHOLE OF MAKING IT SELECTABLE.
       * Asked 2026-09-23: *"make pianoroll rows selectable. selecting puttign
       * gray dots on the keyboard"*. A div with a click handler would need a
       * role, a tabindex, and Enter and Space bound by hand, which is three
       * things to get wrong and one of them silently: a control only a mouse
       * can reach.
       * ⚠️ AND N ROWS ARE N TAB STOPS, which `table.mjs` refuses for a
       * sixty-three row list and solves with a roving tabindex. A line of
       * chords is four or five rows, so the simple thing is the right thing
       * here, and the moment somebody rolls a whole song through this it is not.
       */
      const r = document.createElement('button');
      r.type = 'button';
      r.className = 'roll-row';
      /* ⚠️ A ROW MAY SAY WHAT KIND OF ROW IT IS, AND THIS FILE DOES NOT KNOW
         WHAT THE KINDS ARE. `/nola/` has a chord it learned off the keys and a
         chord it is proposing, and those must not look the same; what they look
         like is that page's business and lives in that page's stylesheet.
         ⚠️ SET ONLY WHEN THERE IS ONE, because `[data-kind]` matches an EMPTY
         attribute and a row that was once a guess would keep matching for the
         rest of the page's life. That is already recorded in `positron-ui`
         about `video-panel.mjs`, measured. */
      if (row.kind) r.dataset.kind = row.kind;
      /* 🔴 ONE TAB STOP FOR THE WHOLE ROLL, NOT ONE PER ROW. `table.mjs`
         already refuses the alternative for a sixty-three row list, where
         tabbing past it costs sixty-three presses, and a line of chords is only
         short today. The roving tabindex is the standard answer: exactly one
         row is reachable by Tab and the arrows move between them. */
      r.tabIndex = i === focused ? 0 : -1;
      const lane = document.createElement('div');
      lane.className = 'roll-lane';
      let whites = 0;
      const notes = new Set(row.notes || []);
      for (const k of keys) {
        const sharp = sharps.has(k);
        const note = at + map[k];
        const cell = document.createElement('div');
        cell.className = `roll-cell${sharp ? ' sharp' : ''}${notes.has(note) ? ' on' : ''}`;
        whites = placeKey(cell, { sharp, whites, pitchClass: ((map[k] % 12) + 12) % 12 });
        if (notes.has(note)) noteOfDot.set(cell, note);
        lane.append(cell);
      }
      lane.style.setProperty('--k-cols', String(Math.max(1, whites)));
      r.append(lane);
      /* ⚠️ THE LABEL IS DRAWN OVER THE LANE RATHER THAN BESIDE IT, AND THAT IS
         THE ALIGNMENT RULE ARRIVING AS A LAYOUT DECISION. A label in its own
         column would take width off the key columns, and then every dot in the
         picture would sit a few pixels left of the key it names, which is the
         exact defect this component exists to avoid. It is absolute, so it
         costs the grid nothing. */
      if (row.label) {
        const t = document.createElement('span');
        t.className = 'roll-label';
        t.textContent = row.label;
        r.append(t);
      }
      /* 🔴 THE COMPONENT REPORTS THE PICK AND PAINTS ITSELF, AND NOTHING ELSE.
         What a picked chord DOES belongs to the page: on `/nola/` it lights the
         keys, which is a keyboard this file does not own and must not reach
         into. Same division the sustain toggle keeps. */
      r.onclick = () => {
        picked = picked === i ? -1 : i;
        paintPicked();
        onPick?.(picked === -1 ? null : current[picked], picked);
      };
      el.append(r);
    });
    /* 🔴 THE ROWS THAT HOLD THE ROOM OPEN, AND THEY ARE NOT ROWS. They carry
       the same lane so the height and the columns are identical to a real row
       rather than approximately it, and an approximate reservation is the
       `min-height` that never applied wearing different clothes.
       ⚠️ THEY ARE OUT OF EVERY READER'S WAY: no `button`, so nothing to press
       and nothing in the tab order, and `aria-hidden` so a screen reader is not
       told about five chords that do not exist. `rows`, `picked` and the arrow
       keys all count `current`, which does not include these. */
    for (let i = current.length; i < minRows; i++) {
      /* ⚠️ NOT `.roll-row`, AND THAT IS THE WHOLE POINT. Every check on
         `/nola/` and `/kit/` counts rows by querying `.roll-row`, so a
         placeholder wearing that class is a row as far as nine asserts are
         concerned. MEASURED the moment it was tried: nine red, each reporting
         5 rows where the page had 4 chords. It takes the height from the same
         custom property and nothing else. */
      const r = document.createElement('div');
      r.className = 'roll-rest';
      r.setAttribute('aria-hidden', 'true');
      const lane = document.createElement('div');
      lane.className = 'roll-lane';
      let whites = 0;
      for (const k of keys) {
        const sharp = sharps.has(k);
        const cell = document.createElement('div');
        cell.className = `roll-cell${sharp ? ' sharp' : ''}`;
        whites = placeKey(cell, { sharp, whites, pitchClass: ((map[k] % 12) + 12) % 12 });
        lane.append(cell);
      }
      lane.style.setProperty('--k-cols', String(Math.max(1, whites)));
      r.append(lane);
      el.append(r);
    }
    paintPicked();
  };

  /** ⚠️ `aria-pressed` AS WELL AS THE ATTRIBUTE THE STYLE READS, because a row
   *  that looks selected and does not say so is selected for one reader only. */
  const paintPicked = () => {
    /* ⚠️ REAL ROWS ONLY. The children may end with placeholders holding the
       roll's height open, and those are not selectable, so telling one it is
       `aria-pressed="false"` announces a chord that is not there. `current` is
       the list of rows that exist. */
    [...el.children].slice(0, current.length).forEach((r, i) => {
      if (i === picked) r.dataset.on = '1'; else delete r.dataset.on;
      r.setAttribute('aria-pressed', i === picked ? 'true' : 'false');
    });
  };

  draw();
  /**
   * 🔴 IT GOES INSIDE THE KEYBOARD'S OWN BOX, AND THAT IS WHAT MAKES IT LINE
   * UP RATHER THAN NEARLY LINE UP. Drawn as a sibling it inherits neither the
   * keyboard's content width nor its `--k-min`, and MEASURED on `/nola/` the
   * first time: columns at `0,29,52,91,104` px against `0,26,46,80,92` on the
   * instrument, because the box's 9 px padding and 1 px edge were not in the
   * roll's geometry and the floor fell back to the component default of 49.
   * Reported in the same minute as *"roll needs to line up with keys"*.
   * ✅ INSIDE, THE TWO GRIDS ARE THE SAME WIDTH BY CONSTRUCTION and the custom
   * properties inherit, so there is nothing left to keep in step. That is also
   * exactly what *"can be glued top of it"* asked for: one surface, the roll
   * above the keys it names.
   */
  /**
   * 🔴 A GLUED ROLL BRINGS ITS OWN SEAM, WHICH IS THE LOOK THIS PROJECT
   * ALREADY HAS A NAME FOR. Reported with a picture: *"leave space above
   * keyboard and add separator line edge to edge"*, then *"its 'glue' thing"*.
   * `glue.mjs` describes it exactly: one border round the lot, a 1 px seam of
   * `--line` between the parts, and the children giving up their own edges.
   * ⚠️ IT IS A SEPARATE ELEMENT AND NOT A `border-bottom` ON THE ROLL, because
   * the roll is a SCROLLER: a negative margin to reach the box's edges would
   * widen its scroll content by the padding, the lane would be sized against
   * that wider box, and every column would miss the keys. An element with
   * nothing in it can full-bleed for free.
   * ⚠️ AND THE BLEED IS READ OFF THE BOX RATHER THAN TYPED. `--kbd-pad` is
   * declared beside the padding it names, so a keyboard that changes its own
   * padding cannot leave a seam ending nine pixels short.
   */
  if (prepend) {
    seam = document.createElement('div');
    seam.className = 'roll-seam';
    host.prepend(seam);
    host.prepend(el);
  } else {
    host.append(el);
  }

  /**
   * 🔴 THE DOTS MOVE WITH THE KEYS, AND WITHOUT THIS THEY LIE. Reported with a
   * screenshot: *"dots should move along keyboard"*. A key row wider than the
   * page is a scroller, which is how a two octave instrument fits a phone, and
   * a roll that stayed still while it moved would point every dot at the wrong
   * note the moment somebody dragged the keys. **Lining up at rest and lying
   * under a finger is worse than never lining up**, because the first one is
   * believed.
   * ⚠️ ONE DIRECTION ONLY. The keys own the gesture and this follows; making
   * the roll draggable too would be two scrollers fighting over one position,
   * and a reader would have no way to know which one was right.
   * ⚠️ `passive`, because this never calls `preventDefault` and a listener that
   * might would put itself in the way of the platform's own scrolling.
   */
  /**
   * 🔴 THE ARROWS MOVE AND ENTER PICKS, WHICH IS NOT THE SAME KEY DOING BOTH.
   * Asked 2026-09-23: *"make pianoroll naigatable with keyboard"*. `table.mjs`
   * learned this the expensive way on `/making/`: an arrow that moved the
   * SELECTION called `onPick` per row, and that page's `onPick` fetches a
   * picture off a bucket, so a held-down arrow pulled sixty-three files nobody
   * asked to see. Moving focus is free; picking is a decision and gets its own
   * key. A row is a `button`, so Enter and Space already pick it and nothing
   * here has to handle them.
   * ⚠️ AND IT IS ON THE ROLL RATHER THAN ON EACH ROW, so the listener count
   * does not grow with the music.
   */
  const moveFocus = (to) => {
    const rows = [...el.children];
    if (!rows.length) return;
    focused = Math.max(0, Math.min(rows.length - 1, to));
    rows.forEach((r, i) => { r.tabIndex = i === focused ? 0 : -1; });
    rows[focused].focus();
  };
  el.addEventListener('keydown', (e) => {
    const rows = [...el.children];
    if (!rows.length) return;
    const at = rows.indexOf(document.activeElement);
    if (at < 0) return;
    const go = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: rows.length - 1 }[e.key];
    if (go === undefined) return;
    e.preventDefault();          // or the page scrolls under the arrows
    moveFocus(go);
  });

  const follow = scroller ? () => {
    el.scrollLeft = scroller.scrollLeft;
    /* ⚠️ AND THE PICKED ROW'S GROUND IS AS WIDE AS THE KEYS' OWN CONTENT.
       `shell.css` reads this; the alternative was a row sized to its content,
       which lets the grid take its ceiling width and misses every column. One
       measurement, written once, rather than two that agree today. */
    el.style.setProperty('--roll-w', `${scroller.scrollWidth}px`);
  } : null;
  if (follow) {
    scroller.addEventListener('scroll', follow, { passive: true });
    follow();
  }

  return {
    el,
    /** Replace every row. The whole picture is redrawn, which is cheap and has
     *  no state to get wrong: a roll is a function of its rows. */
    setRows(next) {
      current = next || [];
      picked = -1;
      /* ⚠️ AND THE LANDING ROW COMES BACK TO THE TOP. The rows are new rows, so
         a remembered index would point at a chord nobody typed. */
      focused = 0;
      draw();
      follow?.();
    },
    /**
     * Add a row at the bottom, KEEPING the selection and the landing row.
     *
     * 🔴 `setRows` CANNOT DO THIS AND IT IS RIGHT NOT TO. It resets `picked` to
     * -1 and `focused` to 0 because in the typed-chords mode the rows really
     * are new rows and a remembered index would point at a chord nobody typed.
     * ⚠️ IN A LEARNING MODE THE ROWS ARE THE OLD ROWS PLUS ONE, so the same
     * call would throw away the player's selection every time they held a new
     * chord long enough, which is the moment they are least expecting anything
     * to move. `research/chord-learning-2026-09-23.md` found this by reading
     * this file before anything was built.
     * ⚠️ AND AN APPEND IS THE ONLY CHANGE THAT MOVES NOTHING ALREADY ON SCREEN,
     * which is the other half of the same finding: MEASURED over 100 chords, a
     * list re-sorted on every chord changed 29 times with 22 of those being
     * pure re-sorts of the same four rows, and a list admitted and pinned
     * changed 4 times, every one of them an append.
     *
     * @returns {number} the new row's index
     */
    addRow(row) {
      current = [...current, row];
      draw();
      follow?.();
      return current.length - 1;
    },
    /**
     * Keep the first `n` rows and drop the rest.
     *
     * ⚠️ IT IS FOR A TAIL THE PAGE OWNS RATHER THAN FOR EDITING HISTORY.
     * `/nola/` keeps what it has learned at the top and two chords it is
     * proposing underneath, and the proposals are replaced whenever the line
     * grows. The kept rows do not move, so a selection inside them survives;
     * a selection inside the part being dropped cannot, and is cleared rather
     * than left pointing at a row that is gone.
     */
    trimRows(n) {
      const keep = Math.max(0, Math.min(n, current.length));
      if (keep === current.length) return keep;
      current = current.slice(0, keep);
      if (picked >= keep) picked = -1;
      if (focused >= keep) focused = Math.max(0, keep - 1);
      draw();
      follow?.();
      return keep;
    },
    /**
     * Pick a row from the page, or -1 for none.
     *
     * 🔴 IT TOGGLES, BECAUSE A PRESS TOGGLES. The first version set the index
     * and a page's own check went red calling it twice: `4 keys still lit`,
     * where a finger pressing the same row twice would have cleared them. **An
     * API that does not do what the gesture does is a second path nobody
     * grades**, and this project has already paid for a check that drove one.
     */
    pick(i) {
      const want = (i >= 0 && i < current.length) ? i : -1;
      picked = want === picked ? -1 : want;
      paintPicked();
      onPick?.(picked === -1 ? null : current[picked], picked);
      return picked;
    },
    picked: () => picked,
    /** Follow the keyboard when its octave moves, which is the other half of
     *  lining up: a roll that stayed put while the keys moved would be wrong in
     *  a way that looks like it is working. */
    setBase(next) { at = next; draw(); follow?.(); },
    rows: () => current,
    /**
     * Say what is being held, and any row that IS that chord lights up.
     *
     * 🔴 THE OTHER DIRECTION, ASKED FOR 2026-09-23: *"when i hit keys with
     * correct dots hilite the chord in piano roll"*. Picking a row puts a chord
     * on the keys; this is playing the keys and having the roll answer, which
     * is the same relationship read backwards and is the half that tells a
     * player they got it.
     * ⚠️ IT IS AN EXACT SET, NOT A SUBSET. Holding one note of a triad is not
     * playing the triad, and a row that lit on the first note would light three
     * rows at once on a shared root. Extra notes count too: `Cmaj` plus a
     * wrong D is not `Cmaj`.
     * ⚠️ AND IT IS A THIRD STATE, NOT A SECOND PICK. What you chose and what
     * you are playing are different facts and a row can be both, so they are
     * two attributes and the style shows both at once.
     *
     * 🔴 AND A CHORD YOU ARE HALF WAY INTO MARKS ITS OWN DOTS, ASKED FOR
     * 2026-09-23: *"when partial match with piano roll chord use faint yellow
     * on dots"*. The exact-set rule above is right about the ROW and leaves the
     * roll silent at the one moment somebody is reaching for a chord, which is
     * the least useful time for it to say nothing.
     * ⚠️ THE FLOOR IS TWO NOTES AND EVERY NOTE YOU HOLD BEING IN THAT CHORD,
     * and both halves are load bearing. One note in common is not reaching for
     * a chord, it is the note happening to be in it, and a root would light
     * every row that shares it. Allowing a note that is NOT in the chord would
     * light rows you are audibly not playing: holding a full `Cmaj` would part
     * match `Cmaj7` and `Amin7` and anything else containing a C, so a cluster
     * would light the whole roll. Inside the chord and at least two of it is
     * the smallest rule that means *on the way to this one*.
     * ⚠️ AND A FULL MATCH MARKS NO DOTS, because the row itself has lit and two
     * signals for one fact is the middot rule wearing a colour.
     */
    setHeld(notes) {
      const held = new Set(notes || []);
      [...el.children].slice(0, current.length).forEach((r, i) => {
        const want = current[i]?.notes || [];
        const same = want.length > 0 && want.length === held.size
          && want.every((n) => held.has(n));
        if (same) r.dataset.held = '1'; else delete r.dataset.held;
        /* Inside the chord, at least two of it, and not the whole of it. */
        const inside = held.size > 0 && [...held].every((n) => want.includes(n));
        const part = !same && inside && held.size >= 2;
        for (const cell of r.querySelectorAll('.roll-cell.on')) {
          const note = noteOfDot.get(cell);
          /* ⚠️ `delete`, NEVER `= ''`: `[data-part]` matches an EMPTY attribute,
             so a dot that was once half held would stay half held for the rest
             of the page's life. Measured once already in `video-panel.mjs`. */
          if (part && held.has(note)) cell.dataset.part = '1';
          else delete cell.dataset.part;
        }
      });
    },
    /** Move the keyboard's landing row, for a page's own check. */
    focus: (i) => moveFocus(i),
    focused: () => focused,
    /** every drawn dot, as element -> note, for a page's own check */
    dotsOf: () => new Map(noteOfDot),
    /** Put the rows where the keys are, for a page whose check moved the row. */
    sync: () => follow?.(),
    destroy() {
      if (follow) scroller.removeEventListener('scroll', follow);
      seam?.remove();
      el.remove();
    },
  };
}

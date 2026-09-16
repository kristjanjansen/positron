// Which build is this? Replaced by workers/view/build.mjs in the DEPLOYED
// copy only, so a page always says what it is. Asked for after a run whose
// result could not be attributed: without a stamp there is no way to tell a
// fix that did not work from a fix that was never loaded.
export const BUILD = 'f6539e6-205734-9384';
// demo/shell/shell.mjs — page frame + the __demo contract.
//
// mount() builds the whole chrome and returns the only API a demo needs.
// Everything it shows a human it has already published for a CDP script on
// window.__demo — that is the point: one page, both audiences.
//
//   const d = mount({ name:'transport', what:'…', readout:{drift:'ms'} });
//   d.set('drift', 0.4);  d.log('seeked');  d.ready();

// ⚠️ THE ONLY IMPORT IN THIS FILE, AND IT IS A LEAF. `shell.mjs` is the frame
// every page mounts, so a dependency here is a dependency everywhere;
// `symbol.mjs` imports nothing and touches nothing but the element it is handed.
import { centreSymbol } from './symbol.mjs';
// ⚠️ AND SO IS THIS ONE. `stack.mjs` imports nothing — it makes its own element
// with `createElement` rather than borrowing `el()` from here, which is what
// keeps a cycle out of the frame every page mounts.
import { createStack } from './stack.mjs';

const LOG_CAP = 400;

export function mount({
  name = 'demo',
  what = '',
  // key -> unit string ('ms', 's', '' …). ⚠️ `null` is DIFFERENT from `{}` and
  // from leaving it out: it says this page has deliberately no readout because
  // its subject is visible rather than numeric, and the harness checks for that
  // declaration rather than accepting an empty one. `typist` is the case — the
  // document IS the readout, and cells repeating the letters and the cursor
  // position were the same facts twice.
  readout = {},
  showReadout = true,    // false: published on __demo, not drawn — see below
  // 🔴 `false` REMOVES THE LOG BOX FROM THE PAGE AND KEEPS THE RECORD.
  // Lines still accumulate on `__demo.logs`, so a harness and an assert read
  // exactly what they read before; what goes is the surface. `videoradio` is
  // the case that bought this: it is a picture you watch, asked for full
  // screen, and a scrolling block of prose under it is the one element on the
  // page that is not the picture.
  // ⚠️ IT MUST NOT APPEND THE ELEMENT AT ALL rather than hide its contents.
  // `.pos-log` carries its own border, and CLAUDE.md already records a page
  // that opted out of a surface, kept its empty box, and painted a 2 px
  // full-width band nobody wrote. A container with nothing in it must not
  // paint its edges.
  showLog = true,
  // 🔴 `true` PUTS THE READOUT ON TOP OF THE LOG AS ONE SURFACE, AT THE FOOT.
  // Asked for 2026-09-16: *"combine readout with log component, put it top of
  // it. they can be used split or also be the same thing in bottom of page"*.
  // The split pair — a readout above the controls, a log under the page — is
  // still the default, so a page that does not ask keeps the layout it had.
  // `createReport()` below owns both arrangements and the empty cases; this
  // flag only chooses between them.
  joined = false,
  controls = [],         // [{id, label, primary?}]
  index = '/',
} = {}) {
  document.title = `POSITRON · ${name}`;
  favicon();
  markHeadset();

  const head = el('div', 'pos-head');
  if (index) head.append(el('a', 'pos-back', '← demos', { href: index }));
  const title = el('div', 'pos-title');
  title.append(el('h1', 'pos-name', name));
  // 🔴 EVERY SHELLED PAGE GETS THE FEEDBACK BUTTON, WHICH IS WHY IT IS HERE AND
  // NOT IN FORTY PAGES. It sits beside the title, pushed right, because the
  // title row is the one strip of every demo that means the same thing on all
  // of them: this page, and what you can do about this page.
  //
  // ⚠️ IT IS NOT A `.pos-controls` BUTTON AND THAT IS NOT AN ACCIDENT OF
  // LAYOUT. `verify.mjs` presses every control in that row on every page on
  // every run, and a feedback button wired like one would have sent forty real
  // messages per run — the FCM defect CLAUDE.md records at length, in new
  // clothes. The row it is in is only the first fence; the one that holds is
  // `isTrusted` below, and the server-side origin check behind it.
  const fbBtn = el('button', 'pos-fb-btn', 'Feedback', {
    type: 'button',
    'aria-haspopup': 'dialog',
    'aria-expanded': 'false',
    title: 'say something about this page',
  });
  fbBtn.dataset.slug = name;
  // 🔴 A SCRIPTED PRESS DOES NOTHING. `element.click()` — which is how this
  // project's harness presses every control it presses — produces an event with
  // `isTrusted: false`, and so does anything else a page can synthesise. A real
  // finger, a real mouse and a real keyboard produce `true`. So the one control
  // on the site that writes to a store a person is going to read can only be
  // worked by a person, and no future harness change can quietly start pressing
  // it. `aria-expanded` is flipped on the far side of the gate, which is both
  // correct markup for a disclosure button and the thing the check below reads.
  fbBtn.addEventListener('click', async (e) => {
    if (!e.isTrusted) return;
    fbBtn.setAttribute('aria-expanded', 'true');
    try {
      // Imported here rather than at the top of this file: `shell.mjs` is
      // mounted by every page, and a panel nobody opens should not cost every
      // page the module, the field and the wire on load. It also keeps this
      // file importing nothing but a leaf.
      const fb = await import('./feedback.mjs');
      fb.openFeedback({ log }, { slug: name });
    } catch (err) {
      fbBtn.setAttribute('aria-expanded', 'false');
      log(`the feedback box did not load (${err?.message || err})`, 'bad');
    }
  });
  title.append(fbBtn);
  head.append(title);
  if (what) head.append(el('p', 'pos-what', what));


  // The readout and the log, as two surfaces or as one. `createReport()` below
  // owns both arrangements, the cells, the lines and the empty cases; `mount()`
  // owns only what the page declared and what `__demo` reports about it.
  //
  // `showReadout: false` publishes the numbers on `__demo` without drawing the
  // row. It is for a page whose numbers have found a better home — 02 puts each
  // lane's figures in that lane's own gutter, beside its ink, which leaves the
  // row on top duplicating them a second time in a place with no context. The
  // MACHINE contract is unchanged: a CDP script still reads `__demo.readout`,
  // and `verify.mjs` still asserts the page declares one.
  const readoutOptOut = readout === null;
  if (readoutOptOut) readout = {};
  const report = createReport({ readout, showReadout, showLog, joined });
  const cells = report.cells;
  const logEl = report.logEl;

  const cbar = el('div', 'pos-controls');
  // ⚠️ A ROW WITH NOTHING IN IT STILL TAKES ITS MARGIN. `.pos-controls` carries
  // 14 px under it, so a page that declares no controls — `lanes`, and `draw`
  // now that its one button lives in its own footer row — got a band of dead
  // space between the readout and the page, which reads as something that
  // failed to render rather than as nothing being there.
  if (!controls.length) cbar.hidden = true;
  const handlers = new Map();
  // every control this shell made, by id, so `button(id)` survives a page
  // moving one somewhere else. See the note on `button` below.
  const made = new Map();
  for (const c of controls) {
    const b = el('button', c.primary ? 'pos-pri' : '', c.label);
    b.type = 'button';
    b.dataset.id = c.id;
    made.set(c.id, b);
    // 🔴 A GLYPH BUTTON IS A SQUARE, AND THE SHELL DECIDES IT — NOT THE PAGE.
    // Three pages carried `.pos-controls button.ico { width: 34px; height: 34px }`
    // in their own <style>, and `mount()` has never put an `ico` class on
    // anything: the rule matched nothing, on every page, for as long as it
    // existed. The ⛶ kept the row's `0 14px` padding and came out about 41 by
    // 34 — a rectangle pretending to be an icon, reported twice, fixed twice in
    // a place that could not work.
    // ⚠️ THE TEST IS ON THE LABEL, not on a flag a page has to remember. One
    // character that is not a letter or a digit is an icon by construction;
    // everything else is a word and gets a word's box. A page cannot forget to
    // pass something it does not pass.
    if ([...String(c.label)].length === 1 && !/[\p{L}\p{N}]/u.test(c.label)) {
      b.dataset.glyph = '1';
      // ⚠️ AND CENTRED ON ITS INK, not on its box. `place-items: center` centres
      // the ADVANCE and the BASELINE — the right rectangle for a letter and the
      // wrong one for a picture: ⛶ is drawn small and high in a box sized for a
      // capital, so it sat up and left in its square. `symbol.mjs` measures the
      // glyph in the face it will actually be drawn in and moves it.
      centreSymbol(b);
      // The label is a picture, so it is not a name. Without this the control
      // reads as "⛶" to a screen reader and to anything looking for it.
      b.setAttribute('aria-label', c.aria || 'full screen');
      if (!b.title) b.title = c.aria || 'full screen';
    }
    // `end: true` pushes a control to the far right of the row. It is for the
    // destructive one — deleting what you just made should not sit shoulder to
    // shoulder with the button that makes it, where a mis-aimed click lands on
    // the wrong one.
    if (c.end) b.dataset.end = '1';
    // A CONTROL THAT IS WORKING SAYS SO, and the shell does it rather than every
    // page inventing its own. If a handler returns a promise the button goes
    // busy until it settles: disabled, so a second press cannot start a second
    // run, and swept by a moving highlight so there is something to watch.
    //
    // No spinner and no label change ON PURPOSE — both resize the button, the
    // row reflows, and the thing you were about to click moves out from under
    // the pointer. The sweep is paint only.
    b.addEventListener('click', async () => {
      const fn = handlers.get(c.id);
      if (!fn || b.disabled) return;
      let out;
      try { out = fn(b); } catch (e) { log(String(e?.message || e), 'bad'); return; }
      if (!out || typeof out.then !== 'function') return;
      b.dataset.busy = '1';
      b.disabled = true;
      b.setAttribute('aria-busy', 'true');
      try { await out; } catch (e) { log(String(e?.message || e), 'bad'); }
      finally {
        delete b.dataset.busy;
        b.disabled = false;
        b.removeAttribute('aria-busy');
      }
    });
    cbar.append(b);
  }

  const body = el('div', 'pos-body');

  /**
   * 🔴 TWO STACKS, AND BETWEEN THEM THEY COVER EVERY WAY A BLOCK REACHES A
   * PAGE. The rhythm used to be one CSS rule on the children of `.pos-body`,
   * so a page that wrapped two controls in a div, or spliced a row in with
   * `insertBefore`, or appended a block anywhere else, fell out of it silently
   * — and nobody found out until somebody photographed a keyboard sitting flush
   * against a transport bar. demo/shell/stack.mjs carries the three measured
   * cases and the argument.
   *
   *   column   `document.body` — the head, the surfaces, the control row, the
   *            page, the diagram, and anything a page inserts between them
   *   page     `.pos-body` — the blocks the demo itself draws
   *
   * ⚠️ IT CHANGES NO EXISTING CALL. `d.el` is the same element it always was,
   * so `d.el.append(x)` now gets the rhythm rather than needing it. The stack
   * handle is returned as `d.stack` for a page that wants to state its blocks
   * in one line, which is the form the order of a page should be readable in.
   */
  const column = createStack(document.body);
  const page = createStack(body);

  // ⚠️ THE ORDER IS THE ARRANGEMENT, AND SPLIT IS UNCHANGED TO THE ELEMENT.
  // `report.top` is the readout when the two are split and NOTHING when they
  // are joined; `report.foot` is the log when they are split, the one joined
  // surface when they are not, and `null` when there is nothing to draw.
  column.add(head, report.top, cbar, body, report.foot);

  // ── the machine contract ────────────────────────────────────────────────
  const api = {
    name,
    ready: false,
    failed: null,
    readout: Object.fromEntries(Object.keys(readout).map((k) => [k, null])),
    // the DECLARATION, so a harness can tell "no cells on purpose" from "none yet"
    readoutOptOut,
    // the DECLARATION again, so a check can tell "no log on purpose" from
    // "a log that never got a line"
    logOptOut: !showLog,
    how: null,
    logs: [],
    asserts: [],
    transport: null,           // filled by transport-bar when one is attached
  };
  window.__demo = api;

  // ── the feedback control, checked on every page, on every run ────────────
  //
  // 🔴 THE SECOND ONE PROVES THE GUARD BY BREAKING IT. CLAUDE.md: prove a guard
  // fires, break the thing on purpose once. This presses the button the way a
  // script presses a button and asserts that nothing opened — and it
  // discriminates, because `aria-expanded` is set on the far side of the
  // `isTrusted` check, so removing the check turns this assert red rather than
  // leaving it green about nothing. It costs one synthetic click at load and it
  // is the difference between believing the suite cannot write feedback and
  // knowing it.
  assert('every page carries a feedback button, beside its title',
    head.contains(fbBtn) && fbBtn.dataset.slug === name, `.pos-head · ${name}`);
  fbBtn.click();
  assert('only a person can open it, so a harness press does nothing',
    fbBtn.getAttribute('aria-expanded') === 'false' && !document.querySelector('.pos-fb'),
    `a scripted press left it aria-expanded=${fbBtn.getAttribute('aria-expanded')}`);
  /**
   * 🔴 HOW MANY OF THESE THE SHELL MADE, SO THE HARNESS CAN TELL THEM FROM THE
   * PAGE'S. `demo/verify.mjs` waits for a page to produce its first assert
   * before it starts timing out, and the test for "has it produced one yet" was
   * `asserts.length === 0`. These two land at t+0 on EVERY shelled page, so
   * that test became false immediately and the wait never engaged again.
   *
   * MEASURED the day they landed: `/radio/` makes 34 asserts, the suite
   * collected **2**, and reported **13/13 green**. A green suite with no
   * coverage, across the 28 demos that declare `settleMs`, and nothing about it
   * looked wrong from the outside.
   *
   * ⚠️ IT IS A COUNT, NOT A FLAG ON EACH ROW. The harness only needs to know
   * where the page's own asserts begin, and a count says that without changing
   * the shape of `asserts`, which other things read.
   */
  api.shellAsserts = api.asserts.length;

  // Both of these are thin now: the cell and the line are written by
  // `setCell()` and `addLine()`, which `createReport()` hands to `/kit/` too,
  // so a specimen in the sandbox is filled by the same code a demo is. What
  // stays here is the half that belongs to the page rather than to the
  // surface: the declaration check, the published value and the capped record.
  function set(k, value, state) {
    setCell(cells, k, value, state);      // throws if the page never declared it
    api.readout[k] = value;
    return value;
  }

  function log(msg, kind) {
    const line = { t: performance.now(), msg: String(msg), kind: kind || 'info' };
    api.logs.push(line);
    if (api.logs.length > LOG_CAP) api.logs.shift();
    addLine(logEl, line.msg, line.kind, line.t);
  }

  // 🔴 A PASSING CHECK IS NOT A MESSAGE. Every assert used to write a prose
  // line into the log, so a page with nine checks opened with nine sentences
  // nobody reads — `ok their real score compiles — 25 rows` — and a real event
  // afterwards had to be found among them. Reported as "slop log", and the
  // word is right: the log is for things that HAPPENED, at the moment they
  // happened. A check that passed did not happen, it held.
  // ⚠️ A FAILURE IS a message, and keeps its line — that is the asymmetry, and
  // it is the whole rule. The tally goes out once, from `ready()`.
  // ⚠️ Nothing parses these lines: the harness reads `__demo.asserts`, which is
  // unchanged, so per-demo counts are unaffected by this.
  function assert(label, pass, detail) {
    api.asserts.push({ label, pass: !!pass, detail: detail ?? null });
    // ⚠️ `·`, NOT AN EM DASH, AND THIS ONE LINE STAMPED THEM EVERYWHERE. Every
    // failing assert on every shelled page came through here, so a sweep of 418
    // reader-facing strings could not have caught the formatter that puts one
    // back on each of them. `·` is already this project's separator inside these
    // same log lines.
    if (!pass) log(`FAIL ${label}${detail !== undefined ? ` · ${detail}` : ''}`, 'bad');
    return !!pass;
  }

  return {
    el: body,
    /**
     * The page's own blocks, as a stack: `d.stack.add(bar.el, picks, keys.el)`
     * states the order of a page in one line and gets the project's one gap
     * between every pair of them. `d.el` is the same element, so nothing that
     * appends to it has to change.
     */
    stack: page,
    /** The whole page column, for a block that has to sit OUTSIDE the page —
     *  above the control row, or under the log. Same rhythm, same number. */
    column,
    head,
    // 🔴 THE CONTROL ROW ITSELF, so a page can MOVE it rather than build a
    // second one. `videoradio` wants its buttons inside the picture's box and
    // under the screen, the way a player's chrome sits; hand-rolling that row
    // would give the project a fourth set of buttons and would take them out
    // of `.pos-controls`, which is what `verify.mjs` presses on every page.
    controls: cbar,
    /**
     * The two surfaces the shell made, and the box round them when they are
     * joined (`null` when they are not).
     *
     * 🔴 HANDED OVER RATHER THAN LOOKED UP, BECAUSE THE LOOK-UP DOES NOT WORK.
     * `/crate/` wants its readout inside its own upload block and asks for it
     * with `d.el.querySelector('.pos-readout')` — and `d.el` is `.pos-body`
     * while the readout is a SIBLING of it, so that query has always answered
     * `null`: the class is added to nothing, the row is never moved, and the
     * `hidden` that was meant to keep four empty cells off the page until an
     * upload runs is never set. It is the same shape as `d.button(id)`
     * searching the control row for a button a page had moved. A page that
     * wants a surface somewhere else is told where it is.
     */
    readoutEl: report.readoutEl,
    logEl: report.logEl,
    report: report.report,
    set, log, assert,
    // `how()` is gone. A demo's intro is now ONE paragraph of three or four
    // sentences in `what`, not a lead line plus a second paragraph of mechanism:
    // two blocks meant the mechanism went unread and the lead said too little.
    on: (id, fn) => handlers.set(id, fn),
    /**
     * Run a registered handler without a button.
     *
     * 🔴 THIS EXISTS SO THAT "RUN THE CHECKS" CAN STOP BEING A BUTTON. Eleven
     * pages carried one, and it is harness machinery showing through into a
     * page a person is meant to read — `shout` already wrote the argument down
     * beside its own: *it made the asserts OPTIONAL, which is the wrong default
     * for the only thing that can say it worked.* A handler is a named piece of
     * work; a control is one way to start it, and it was never the only way.
     * The checks now run at the end of whatever produced the numbers they read,
     * which is also the first moment they can be true.
     */
    run: (id) => handlers.get(id)?.(),
    /**
     * A control this shell built, by id, WHEREVER THE PAGE HAS PUT IT.
     *
     * 🔴 IT USED TO SEARCH THE CONTROL ROW ONLY, AND MOVING A BUTTON BROKE IT
     * SILENTLY. Pages move controls on purpose and are told to: `/videoradio/`
     * moved `Run in VR` under its sentence, `/tapes/` moves its own row, and
     * `/radio/` moved `Automate` into the granulator block on instruction. The
     * button still worked; `d.button(id)` returned null, so every check that
     * read its state reported `no button` about a control plainly on the page.
     * MEASURED as three red asserts the moment `Automate` moved.
     *
     * ⚠️ A MAP BUILT AT MOUNT, NOT A DOCUMENT QUERY. `[data-id]` is not unique
     * to this row: a transport bar's extras carry one too, and a page could
     * easily own a third. The shell knows exactly which elements it made, so it
     * remembers them instead of going looking.
     */
    button: (id) => made.get(id) || cbar.querySelector(`[data-id="${id}"]`),
    /** Empty the log and the `logs` array together. A control that clears what
     *  a page HOLDS should clear what the page SAID about it too, or the lines
     *  left behind describe a state that no longer exists. */
    clearLog: () => { api.logs.length = 0; logEl.textContent = ''; },
    ready: () => {
      api.ready = true;
      const n = api.asserts.length;
      const bad = api.asserts.filter((a) => !a.pass).length;
      // one line, and it is a real message: how many checks this page ran on
      // itself and whether any of them are worth scrolling up for
      log(n ? `ready · ${n - bad}/${n} checks` : 'ready', bad ? 'bad' : 'hi');
    },
    fail: (e) => { api.failed = String(e?.stack || e); log(String(e?.message || e), 'bad'); },
    api,
  };
}

/**
 * THE READOUT AND THE LOG, AS ONE COMPONENT.
 *
 * 🔴 IT LIVES HERE RATHER THAN IN `demo/shell/<name>.mjs`, AND THAT IS A
 * DELIBERATE BREAK WITH THE ONE-FILE-PER-COMPONENT CONVENTION. Every other kit
 * module — slider, choice, table, presence — starts with
 * `import { el } from './shell.mjs'`, so a file of its own here would make
 * `shell.mjs` import a module that imports `shell.mjs` back. A cycle in the
 * frame every page mounts is not worth a filename, and the alternative (a third
 * file holding `el` and `fmtNum` so the cycle can be broken) is a new module
 * whose only job is to work around this one. These two surfaces are also not
 * controls a page drops in: no page has ever built one, `mount()` has always
 * made both, and the 120 lines of measured comment about them were already in
 * this file. So the COMPONENT is `createReport`, exported, and `/kit/` builds
 * its specimens with the same call `mount()` makes.
 *
 * Two arrangements, and a page chooses with one flag:
 *
 *   split (default)   `top` is the readout, above the controls
 *                     `foot` is the log, under the page
 *   joined            `top` is nothing, `foot` is ONE surface at the bottom of
 *                     the page with the readout sitting on top of the log
 *
 * 🔴 AND A CONTAINER WITH NOTHING IN IT MUST NOT PAINT ITS EDGES, WHICH IS THE
 * WHOLE REASON THIS FUNCTION DECIDES WHAT GETS APPENDED RATHER THAN THE PAGE.
 * `readout: null` used to leave a childless `<div class="pos-readout">` on the
 * page, and shell.css gives that div `border: 1px solid var(--line)`: MEASURED
 * on `/typist/` at **2.0 px tall with 0 children**, a full-width band made
 * entirely of a box's own two borders, 24 px above the controls. A horizontal
 * rule nobody wrote, reported as "old UI creeping in". Joining the two
 * surfaces gives that trap two new faces and both are answered here: a joined
 * report holding only a log, or only a readout, draws ONE border and no seam,
 * because a `display: none` child takes no `gap` in a flex column; and a joined
 * report holding NEITHER is never appended at all, so there is no box to paint.
 */
export function createReport({
  readout = {}, showReadout = true, showLog = true, joined = false,
} = {}) {
  // 🔴 AN EVEN NUMBER OF CELLS, AND WHEN IT IS ODD THE ANSWER IS TO CUT ONE.
  // The row was `repeat(auto-fit, minmax(96px, 1fr))` when this rule was
  // written, so a phone got two columns and an odd count left a HOLE in the
  // last row — a slot of a different colour with nothing in it, which reads as
  // a cell that failed to load rather than as a cell that does not exist. The
  // row is flex now and fills at every width, so the rule is EDITORIAL: a
  // readout with an odd cell always has a weakest cell — usually one that
  // cannot change (a constant read out of a playlist, a codec name) or one a
  // neighbour already implies — and being made to find it is the point.
  // Padding with a blank is the wrong repair: it adds a thing to look at that
  // says nothing. Thirteen pages were odd when this landed and every one of
  // them got BETTER for losing a cell.
  //
  // It throws rather than warns so the suite catches it on the next run: every
  // demo is driven by `verify.mjs`, so a page that breaks this cannot reach a
  // visitor without going red first.
  const keys = Object.keys(readout);
  if (keys.length % 2) {
    throw new Error(
      `readout has ${keys.length} cells and wants an even number — ` +
      `drop the weakest one (${keys.join(', ')}), do not add a filler`);
  }

  const cells = new Map();
  const readoutEl = el('div', 'pos-readout');
  // hidden, not absent: `/crate/` and `/videoradio/` both reach for this
  // element, and shell.css gives `.pos-readout[hidden]` an explicit
  // `display: none` because `display: flex` beats the UA's own `[hidden]` rule.
  if (!showReadout || !keys.length) readoutEl.hidden = true;
  for (const [k, unit] of Object.entries(readout)) {
    const cell = el('div', 'pos-cell');
    const v = el('span', 'pos-v', '');
    v.dataset.state = 'pending';
    cell.append(el('span', 'pos-k', k), v);
    // ⚠️ THE UNIT IS PART OF THE VALUE, SO IT IS HIDDEN WHILE THERE IS NONE.
    // A pending cell reading a lone `%` or `px` is a unit with nothing under
    // it — it looks like the number went missing, when in truth it has not been
    // measured yet. CSS hides it on `[data-state="pending"]`; it stays in the
    // DOM so `set()` can re-append it without rebuilding the cell.
    if (unit) v.append(el('span', 'pos-u', unit));
    cells.set(k, v);
    readoutEl.append(cell);
  }

  const logEl = el('pre', 'pos-log');

  const r = {
    joined, readoutEl, logEl, cells,
    report: null, top: null, foot: null,
    set: (k, value, state) => setCell(cells, k, value, state),
    line: (msg, kind, t) => addLine(logEl, msg, kind, t),
  };

  if (!joined) {
    // The readout goes on even when it is hidden: pages reach for it, and this
    // is exactly the DOM every page has had, element for element.
    r.top = readoutEl;
    r.foot = showLog ? logEl : null;
    return r;
  }

  const rep = el('div', 'pos-report');
  rep.append(readoutEl);
  if (showLog) rep.append(logEl);
  if (!readoutEl.hidden || showLog) { r.report = rep; r.foot = rep; }
  return r;
}

/**
 * Write one readout cell.
 *
 * 🔴 NOTHING MEASURED PRINTS AS ABSENT, AND THAT INCLUDES `''` AND `NaN`.
 * `null` always did; the empty string did not, so `d.set('invented', '')`
 * emptied the cell and left the unit standing alone — a `%` with no number in
 * front of it. And a page that pre-sets a counter to 0 before anything has
 * happened is worse: a zero reads as a very confident measurement. Pages hand
 * over `''`/`null` until they have something; this turns all three into one
 * pending cell: EMPTY, with the unit hidden too.
 *
 * ⚠️ EMPTY, NOT AN EM DASH — 2026-09-13. The placeholder used to be `—`, on the
 * reasoning that a cell has to show it is a cell. It does not: the key above it
 * and the box around it already say that, and four dashes in a row read as four
 * failed readings rather than as four cells waiting. The empty cell is quiet
 * and says the same thing.
 */
export function setCell(cells, k, value, state) {
  const v = cells.get(k);
  if (!v) throw new Error(`readout '${k}' was not declared in mount()`);
  const unit = v.querySelector('.pos-u');
  const blank = value === null || value === undefined || value === ''
    || (typeof value === 'number' && !Number.isFinite(value));
  v.textContent = blank ? ''
    : typeof value === 'number' ? fmtNum(value) : String(value);
  if (unit) v.append(unit);
  v.dataset.state = state || (blank ? 'pending' : '');
  return value;
}

/**
 * Write one log line.
 *
 * ⚠️ THREE CELLS, NOT ONE PADDED STRING. A line was time + text in one node, so
 * a message longer than the box wrapped back to COLUMN ZERO — the continuation
 * started under the timestamp and read as a new entry with no time.
 * Photographed on `mirror`: "…spans 157" then "of 255" hanging off the left
 * margin. A grid gives the message its own column to wrap inside.
 */
export function addLine(logEl, msg, kind, t) {
  const row = el('span', `pos-line${kind && kind !== 'info' ? ' ' + kind : ''}`);
  row.append(el('span', 'pos-t', ((t ?? performance.now()) / 1000).toFixed(2)));
  row.append(el('span', 'pos-m', String(msg)));
  logEl.append(row);
  logEl.scrollTop = logEl.scrollHeight;
  return row;
}

/**
 * Inline favicon — otherwise every demo logs a /favicon.ico 404.
 *
 * e+ : the positron. Same geometry as workers/view/build.mjs plots into
 * favicon.ico — KEEP THE TWO IN SYNC.
 *
 * A ring with a lower-right aperture, a crossbar to make it an 'e', and the
 * superscript plus that is the charge and the name. The aperture is a WEDGE
 * FROM THE CENTRE, **11° to 38°**.
 *
 * It was 5° to 62°, and that is 57 degrees of missing bowl: it cut the arc away
 * from just under the crossbar right past five o'clock, took the terminal with
 * it, and clipped the RIGHT END OF THE CROSSBAR on the way — so bar and ring
 * ended in one straight diagonal and the letter read as a bitten circle. It was
 * reported as "I still do not see a full e".
 *
 * 11° clears the crossbar's underside (y 20.4 at the bar's right end); 38° is
 * where a real 'e' terminates. Chosen by rendering four apertures at 150 px and
 * at 16 px side by side and looking, which is what the note below says to do.
 *
 * The .ico is a SEPARATE IMPLEMENTATION — a pixel loop, not a rasteriser — so
 * matching parameters do not guarantee a matching picture, and it has to be
 * LOOKED AT rather than reasoned about. Rendered at 16x and compared against
 * three alternatives: too large a ring squashed the counter to a sliver and
 * curled the terminal into a hook, while touching the left edge. These numbers
 * leave ~4 px of margin on every side and an open bowl.
 */
function favicon() {
  if (document.querySelector('link[rel="icon"]')) return;
  const BG = '%230b0e14', HI = '%23ffd400';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    `<rect width="32" height="32" rx="6" fill="${BG}"/>` +
    `<circle cx="13.5" cy="19.3" r="7" fill="none" stroke="${HI}" stroke-width="3.2"/>` +
    `<path d="M13.5 19.3L35.1 23.5L30.8 32.8Z" fill="${BG}"/>` +
    `<rect x="5.6" y="17.9" width="15.4" height="2.5" fill="${HI}"/>` +
    `<rect x="21.3" y="6.9" width="6.4" height="2.2" fill="${HI}"/>` +
    `<rect x="23.4" y="4.8" width="2.2" height="6.4" fill="${HI}"/></svg>`;
  document.head.append(el('link', '', null, { rel: 'icon', href: 'data:image/svg+xml,' + svg }));
}

// ── helpers ───────────────────────────────────────────────────────────────
export function el(tag, cls, text, attrs) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = text;
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  return e;
}

export function fmtNum(x) {
  if (!Number.isFinite(x)) return String(x);
  // a count is a count: 32, not 32.0
  if (Number.isInteger(x)) return Math.abs(x) >= 10000 ? x.toLocaleString('en-US') : String(x);
  const a = Math.abs(x);
  if (a >= 1000) return Math.round(x).toLocaleString('en-US');
  if (a >= 100) return x.toFixed(0);
  if (a >= 10) return x.toFixed(1);
  if (a >= 1) return x.toFixed(2);
  return x.toFixed(3);
}

/**
 * ARM A VIDEO INSIDE THE GESTURE.
 *
 * iOS grants autoplay only while a user activation is live. Every live demo
 * here does work first — wait for the publisher, wait for the manifest or the
 * whip leg, negotiate WHEP — and by the time it calls play() the activation
 * is long gone. On a real iPhone that produced:
 *
 *   11.65  WHEP negotiated in 1952 ms
 *   11.65  play refused: NotAllowedError
 *
 * with the connection healthy behind it (rtt 16 ms, 31 fps) and a black box
 * in front. Calling play() synchronously in the handler, before any await,
 * spends the activation while it still exists; the element then keeps playing
 * when a source arrives later.
 */
export function armVideo(v) {
  v.muted = true;                 // property, not just the attribute
  v.playsInline = true;
  v.autoplay = true;
  // rejects on an element with no source yet, which is fine and expected —
  // the point is to consume the activation, not to start anything
  try { const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch { /* no source */ }
}

/**
 * Play, or ask. A refused play() must never leave a black rectangle with no
 * explanation — that is indistinguishable from a broken stream.
 */
/**
 * Play, and offer a tap ONLY if the browser refused for policy reasons.
 *
 * It used to prompt on any rejection, which produced a second full-width
 * yellow button competing with the page's own primary control — and worse, a
 * button that could not work: the measured iOS failure rejected play() for
 * having no data, and no amount of tapping conjures a fragment. Only
 * NotAllowedError is a permission problem. Everything else is the player's
 * job and its watchdogs are already on it.
 */
export async function playOrPrompt(v, d) {
  try { await v.play(); return true; } catch (e) {
    if (e.name !== "NotAllowedError") {
      d?.log(`play failed (${e.name}) — not a permission problem, leaving it to the player`, "bad");
      return false;
    }
    d?.log("autoplay refused — tap to start", "bad");
    const tap = el("button", "pos-tap", "tap to play");
    tap.type = "button";
    const go = async () => {
      try { await v.play(); tap.remove(); d?.log("playing"); }
      catch (err) { d?.log(`still refused: ${err.name}`, "bad"); }
    };
    tap.addEventListener("click", go);
    v.addEventListener("click", go);
    v.parentNode?.insertBefore(tap, v.nextSibling);
    return false;
  }
}

/**
 * The mime a MediaRecorder will actually accept here, WebKit included.
 *
 * Three demos each carried the same WebM-only list and `d.fail()`d when nothing
 * matched — `record`, `capture` and `show`. **WebKit records MP4/H.264 and
 * never WebM**, so on a phone all three did not degrade: they stopped. And
 * `verify.mjs` could not see it, because desktop Chrome matches the first
 * candidate and never reaches the branch. Exactly the shape of the
 * `canPlayType` bug that left 291 asserts green across three pages that had
 * never played a frame.
 *
 * WebM first where it exists, because everything downstream was built and
 * measured against it; MP4 after, so a WebKit browser records something rather
 * than nothing.
 *
 * WHAT THIS DOES NOT PROMISE: that the result plays back through this project's
 * replay paths on WebKit. MSE's appetite for fragmented MP4 is a separate
 * question and is unverified here — no iOS device has ever run these pages.
 * This fixes recording, and claims only that.
 */
/**
 * Keep a <video> the shape of what is INSIDE it.
 *
 * An element with a width and no height uses the intrinsic ratio — but only
 * once metadata has arrived. Before that a video is 300x150, so a 16:9 stream
 * starts life in a 2:1 box and the page jumps when the first frame lands; a
 * portrait phone stream jumps further. And any page that pins a height gets a
 * letterbox inside a box that is the wrong shape to begin with.
 *
 * So: a stated ratio up front, replaced by the real one as soon as the source
 * says what it is, and again if it CHANGES — an SFU can switch a sender's
 * resolution mid-call, and `resize` is the only event that reports it.
 */
export function matchAspect(v, fallback = '16 / 9') {
  const apply = () => {
    const w = v.videoWidth, h = v.videoHeight;
    v.style.aspectRatio = w && h ? `${w} / ${h}` : fallback;
  };
  apply();
  v.addEventListener('loadedmetadata', apply);
  v.addEventListener('resize', apply);          // the sender changed resolution
  return v;
}

export function recorderMime(d, kinds = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8',
  'video/webm', 'video/mp4;codecs=avc1.42E01E', 'video/mp4']) {
  const MR = window.MediaRecorder;
  if (!MR || typeof MR.isTypeSupported !== 'function') {
    d?.log('MediaRecorder is not available in this browser', 'bad');
    return null;
  }
  const mime = kinds.find((m) => MR.isTypeSupported(m)) || null;
  // report the CAPABILITY, never an error string — the lesson @moq/net taught
  if (mime) d?.log(`recording as ${mime}`);
  else d?.log(`no recordable format here — tried ${kinds.join(', ')}`, 'bad');
  return mime;
}

/** Surface a thrown error instead of a silently dead page. */
export function guard(d) {
  addEventListener('error', (e) => d.fail(e.error || e.message));
  addEventListener('unhandledrejection', (e) => d.fail(e.reason));
}

/**
 * Batched, fire-and-forget device reporting.
 *
 * A phone cannot be attached to a debugger, so the page posts instead. The sink
 * is the publisher Durable Object, whose lifetime is already "somebody is
 * watching": POST /log, read back with GET /logs?format=text.
 *
 * Lives here because two demos have now needed it and the second one called it
 * before noticing it was local to the first. Diagnostics must never be able to
 * make the page worse than the problem being diagnosed, hence the swallowed
 * failure, the 2 s batch, and the repeat collapsing — one phone sent the same
 * fragLoadError ~30x in a run and pushed everything useful out of the ring.
 */
export function createShipper(url = 'https://pub.positron.studio/log') {
  const pending = [];
  let timer = null, lastKey = '', repeat = 0;
  return function ship(line) {
    const key = String(line).slice(0, 60);
    if (key === lastKey) { repeat++; return; }
    if (repeat) { pending.push(`  (previous line x${repeat + 1})`); repeat = 0; }
    lastKey = key;
    pending.push(`${(performance.now() / 1000).toFixed(2)} ${line}`);
    if (timer) return;
    timer = setTimeout(async () => {
      timer = null;
      const batch = pending.splice(0, pending.length).join('\n');
      if (!batch) return;
      try {
        await fetch(url, {
          method: 'POST', body: batch, keepalive: true,
          headers: { 'content-type': 'text/plain' },
        });
      } catch { /* diagnostics are never load-bearing */ }
    }, 2000);
  };
}


/**
 * Give a demo page the headset layout when it is being read through one.
 *
 * ⚠️ THE INDEX ALREADY DID THIS AND THE DEMOS DID NOT, which is backwards: the
 * index is a list you scan once and a demo is a page you stand in front of
 * while a number changes. The reason it matters is a measurement, not a
 * preference — the Quest Browser opens in DESKTOP MODE by default, it IGNORES
 * `<meta viewport>`, and its window is 1280 x 670 CSS pixels. 670 is about half
 * a laptop viewport, so a page's paragraph, readout, controls and log are not
 * on screen together, and a readout that scrolls out of view mid-measurement is
 * exactly the thing that gets reported as "the page is broken".
 *
 * ⚠️ The sizes were UNCONFIRMED until 2026-09-14, when /floor/ was photographed
 * in the Quest browser and the readout came back with a 20 px band of line
 * colour between every cell — the one `.xr` rule that touched the GAP rather
 * than the cells. shell.css says which numbers to move, and now says why that
 * one is not among them.
 *
 * Capability, never a user-agent string: a headset browser is Chromium wearing
 * a Chromium UA, and research/quest-xr §1.7 measured that a Quest 3 and a 3S
 * cannot be told apart by user agent at all.
 */
async function markHeadset() {
  try {
    if (!navigator.xr?.isSessionSupported) return;
    if (await navigator.xr.isSessionSupported('immersive-vr')) {
      document.documentElement.classList.add('xr');
    }
  } catch { /* a browser that will not answer is not a headset we can style for */ }
}

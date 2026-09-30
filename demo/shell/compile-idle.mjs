// demo/shell/compile-idle.mjs: compile what somebody typed once they stop
// typing, and say so with a quiet note in the corner of the box.
//
// 🔴 ONE BEHAVIOUR FOR EVERY PAGE THAT COMPILES WHAT A VISITOR TYPES. Asked
// 2026-09-30: *"unify compilation in ui logic on this and fau ant othes.
// trigger on inactivity? Small breating "Compiling" note (not button) on right
// bottom i the plae complile button is in fau. a kit comopnent?"*. Two pages
// did it two ways: `/und/` recompiled 400 ms after typing stopped and said so
// only in the log, and `/fau/` compiled only when a Compile button was pressed.
// This module owns the timer, the wait under a held note, the queue and the
// note; a page owns what compiling MEANS and when it must not happen.
//
// 🔴 IT REVERSES `/fau/`'s *"no autocompile"* OF 2026-09-26, AND KEEPS THE ONE
// THING THE OLD fau TIMER GOT RIGHT: `notNow()`. A compile on `/fau/` builds a
// new worklet node and forgets every held key, so a compile that lands under a
// held note takes the note away. The page supplies the predicate, this module
// asks it at the moment a compile is due and asks again every `POLL_MS` until
// it answers false. Nothing is dropped: the compile waits, it does not skip.
//
// 🔴 TWO COMPILES NEVER OVERLAP AND THE LAST TEXT TYPED IS THE ONE THAT WINS.
// Typing during a compile marks the text dirty; when the compile finishes, a
// dirty text with no timer left running compiles again at once. The text is
// read at the moment a compile STARTS, never when the keystroke landed, so
// three edits during one slow compile cost one more compile rather than three.
//
// ⚠️ THE NOTE IS NOT A BUTTON. It is a `role="status"` span with no tab stop,
// and nothing about it can be pressed. It breathes (a slow pulse of its ink
// colour over a ground of its own, so nothing near it can move and the code
// under it never shows through) while a compile runs or
// is held back by `notNow()`, and is `hidden` when there is nothing to say. It
// does NOT show during the idle wait itself: a note that lit on every keystroke
// would breathe the whole time somebody types, which says nothing. A failed compile
// leaves `Did not compile` standing, still, with the compiler's own message in
// its `title`, until a compile succeeds. That is a decision, not a default:
// the instrument keeps playing the LAST GOOD compile on a failure, so without
// the note a visitor with a typo hears the old sound and has no sign why. The
// full message is the page's to print (its log, its warning line), because a
// compiler error is a paragraph and this corner has room for three words.
//
// ⚠️ A MINIMUM SHOWING OF `MIN_SHOW_MS`, because most compiles here are shorter
// than a frame the eye can hold: a Csound score parses in single milliseconds
// and a warm Faust compile takes tens. A note that appears for 20 ms is a
// flicker, and `choice.mjs` records a pulse being REPORTED as exactly that. So
// once shown it stays for half a breath, which is long enough to be read as
// "that compiled" and short enough not to outlast the next keystroke.
//
// ⚠️ `track(promise)` IS FOR THE COMPILES A PAGE STARTS ITSELF: `/fau/`'s load
// compile and a preset pick. They go through the page's own queue, not this
// one, and the note simply shows while they are open and reports how they
// ended. `cancel()` drops a pending idle compile, which a page calls when it
// replaces the text wholesale (a preset) so the timer does not compile the
// preset a second time.

import { el } from './shell.mjs';

/**
 * 🔴 600 ms, ONE NUMBER FOR BOTH PAGES. `/und/` used 400 and `/fau/`'s old idle
 * compile used 800. The gap between keystrokes inside a word, for somebody
 * typing at 40 to 80 words a minute, is about 150 to 300 ms, so 400 was close
 * enough to fire inside a hesitation on a long identifier; 800 made a changed
 * number feel ignored. A compile on `/fau/` also blocks the thread it runs on:
 * MEASURED 2026-09-30 in `node demo/verify.mjs fau` on this desk, twenty
 * compiles of the six presets and typed text read 1 to 321 ms, most of them
 * 30 to 140. Fired inside a word, that is a stall under the next keystroke.
 * 600 is past any gap inside a word and still reads as a reply to the pause.
 * It is not sized to the compile: the compile is what happens after it.
 */
export const IDLE_MS = 600;
/** How often a compile held back by `notNow()` asks again. */
export const POLL_MS = 100;
/** Half of the note's 1.6 s breath, see the header. */
export const MIN_SHOW_MS = 800;

export const NOTE_SAYS = { compiling: 'Compiling', error: 'Did not compile' };

/**
 * @param {object} o
 * @param {HTMLTextAreaElement|HTMLInputElement} o.input  what a visitor types into
 * @param {(text: string) => any} o.compile  sync or async; a result of
 *   `{ ok: false, error }` or a throw is a failure, anything else a success
 * @param {() => boolean} [o.notNow]  true while a compile must wait
 * @param {HTMLElement} [o.host]  the box the note sits in the corner of
 * @param {number} [o.delay]
 */
export function createCompileIdle({ input, compile, notNow = () => false, host = null,
                                    delay = IDLE_MS } = {}) {
  if (!input) throw new Error('createCompileIdle: no input to watch');
  if (typeof compile !== 'function') throw new Error('createCompileIdle: no compile function');

  const note = el('span', 'pos-cnote', null, { role: 'status', 'aria-live': 'polite' });
  note.hidden = true;

  let timer = null, dirty = false, running = false, waiting = false, tracked = 0;
  let lastError = '', shownAt = 0, hideTimer = null;
  let runs = 0, held = 0;
  const idlers = [];

  const busy = () => running || waiting || tracked > 0;

  function paint() {
    if (busy()) {
      clearTimeout(hideTimer); hideTimer = null;
      if (note.dataset.state !== 'compiling') {
        note.dataset.state = 'compiling';
        note.textContent = NOTE_SAYS.compiling;
        note.removeAttribute('title');
        shownAt = performance.now();
      }
      note.hidden = false;
      return;
    }
    const left = MIN_SHOW_MS - (performance.now() - shownAt);
    if (note.dataset.state === 'compiling' && left > 0) {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { hideTimer = null; paint(); }, left);
      return;
    }
    if (lastError) {
      note.dataset.state = 'error';
      note.textContent = NOTE_SAYS.error;
      note.title = lastError;
      note.hidden = false;
    } else {
      delete note.dataset.state;
      note.textContent = '';
      note.removeAttribute('title');
      note.hidden = true;
    }
    wake();
  }

  function wake() {
    if (timer || dirty || busy() || hideTimer) return;
    for (const r of idlers.splice(0)) r();
  }

  function record(out, thrown) {
    if (thrown !== undefined) lastError = String(thrown?.message || thrown).split('\n')[0];
    else if (out && out.ok === false) lastError = String(out.error || 'the compiler refused it');
    else lastError = '';
  }

  function fire() {
    timer = null;
    if (!dirty || running) { paint(); return; }
    if (notNow()) {
      if (!waiting) held++;
      waiting = true;
      paint();
      timer = setTimeout(fire, POLL_MS);
      return;
    }
    waiting = false;
    start();
  }

  async function start() {
    dirty = false;
    running = true;
    runs++;
    paint();
    let out, thrown;
    try { out = await compile(input.value); } catch (e) { thrown = e ?? 'failed'; }
    running = false;
    record(out, thrown);
    if (dirty && !timer) fire();
    else paint();
    return out;
  }

  const onInput = () => {
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(fire, delay);
  };
  input.addEventListener('input', onInput);

  function attach(to) {
    to.classList.add('pos-cnote-host');
    to.append(note);
  }
  if (host) attach(host);

  return {
    el: note,
    attach,
    /** Compile now, skipping the wait. Still waits for `notNow()` and the queue. */
    now() {
      dirty = true;
      clearTimeout(timer);
      fire();
      return this.settled();
    },
    /** Show the note over a compile the page started itself, and keep how it ended. */
    track(p) {
      tracked++;
      paint();
      return Promise.resolve(p).then(
        (out) => { tracked--; record(out); paint(); return out; },
        (e) => { tracked--; record(undefined, e ?? 'failed'); paint(); throw e; });
    },
    /** Drop a pending idle compile, for a page that has just replaced the text. */
    cancel() {
      clearTimeout(timer); timer = null;
      dirty = false; waiting = false;
      paint();
    },
    /** 'idle', 'due', 'waiting', 'compiling' or 'error': the machine, not the note. */
    state() {
      if (running || tracked) return 'compiling';
      if (waiting) return 'waiting';
      if (timer) return 'due';
      return lastError ? 'error' : 'idle';
    },
    /** What the note is showing now, '' when it is not drawn. */
    shown: () => (note.hidden ? '' : note.textContent),
    runs: () => runs,
    held: () => held,
    error: () => lastError,
    /** Resolves when nothing is due, waiting, running or still showing. */
    settled() {
      return new Promise((r) => { idlers.push(r); wake(); });
    },
    destroy() {
      clearTimeout(timer); clearTimeout(hideTimer);
      input.removeEventListener('input', onInput);
      note.remove();
    },
  };
}

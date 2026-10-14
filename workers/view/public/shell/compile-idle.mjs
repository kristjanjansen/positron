// demo/shell/compile-idle.mjs: compile what somebody typed once they stop, with a quiet note in the
// box's corner. Waits while `notNow()` (a held note); never two compiles at once, last text wins.
// The note is a `role=status` span, not a button, shown at least `MIN_SHOW_MS`.
// why: lessons/kit-compile-idle.md#header

import { el } from './shell.mjs';

/**
 * 600 ms: past any gap between keystrokes inside a word (150 to 300 ms at 40 to 80 wpm),
 * still a reply to the pause. A /fau/ compile blocks its thread for 1 to 321 ms.
 * why: lessons/kit-compile-idle.md#idle-ms
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

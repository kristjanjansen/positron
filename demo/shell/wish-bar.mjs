// demo/shell/wish-bar.mjs: the wish field and its pills, the one bar /connect/, /shader/wish/ and
// /code/wish/ share. One field with one button inside it (the microphone while empty, send once there
// is text), a row of pills on one scrolling line whose last pill is a reset hidden until there is
// something to reset, one centred line for what came of a wish, and the speech switcher under it.
// Speech opens on a press, never on a visit; under ?selfcheck no engine is started.
// Styles are `.pos-wish*` and `.pos-pill` in shell.css.

import { el } from './shell.mjs';
import { createField } from './field.mjs';
import { createIconButton } from './icon-button.mjs';
import { createChoice } from './choice.mjs';

export const MIC_LABEL = 'Speak: hold Option or Caps Lock, or the sustain pedal, and let go to send';
export const ENGINES = ['chrome', 'whisper'];
const STORE = 'pos-wish-speech';

/** The browser's own recognizer, or null where it has none. */
export const browserRecognition = () => globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;

const join = (...parts) => parts.map((p) => String(p || '').trim()).filter(Boolean).join(' ');

/**
 * Chrome's speech: words shown as they are heard, held open while the key is down. Chrome ends a
 * session on its own after a silence, so while still held a new one starts and keeps what was said.
 */
function chromeEngine({ Recognition, onWords, log }) {
  let rec = null, said = '', held = false, restarts = 0, done = null, fatal = '';
  const begin = () => {
    let finals = '', live = '';
    rec = new Recognition();
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true;
    rec.onresult = (e) => {
      finals = ''; live = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finals += r[0].transcript; else live += r[0].transcript;
      }
      onWords(join(said, finals, live));
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') { fatal = e.error; held = false; }
      if (e.error !== 'no-speech' && e.error !== 'aborted') log(`the browser could not hear: ${e.error}`, 'warn');
    };
    rec.onend = () => {
      said = join(said, finals, live);
      if (held && restarts++ < 30) { try { begin(); return; } catch { /* fall through to done */ } }
      done?.();
    };
    rec.start();
  };
  return {
    start() { held = true; said = ''; restarts = 0; fatal = ''; begin(); },
    /** Resolves with the final text once Chrome has ended the session, or after 3 s regardless. */
    stop() {
      held = false;
      return new Promise((resolve) => {
        const end = () => { clearTimeout(t); done = null; resolve({ text: said, error: fatal }); };
        const t = setTimeout(end, 3000);
        done = end;
        try { rec?.stop(); } catch { end(); }
      });
    },
  };
}

/** Whisper on the wish worker's /hear: recorded here, heard there with the page's vocabulary. */
function whisperEngine({ api, vocabulary }) {
  let stream = null, rec = null, chunks = [];
  return {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.start();
    },
    async stop() {
      if (rec && rec.state !== 'inactive') await new Promise((r) => { rec.onstop = r; rec.stop(); });
      stream?.getTracks().forEach((t) => t.stop()); stream = null;
      const blob = new Blob(chunks, { type: rec?.mimeType || 'audio/webm' }); rec = null;
      if (!blob.size) return { text: '' };
      const buf = new Uint8Array(await blob.arrayBuffer());
      let b = '';
      for (let i = 0; i < buf.length; i += 0x8000) b += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const r = await fetch(`${api}/hear`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ audio: btoa(b), vocabulary: vocabulary() }) });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(out.error || `HTTP ${r.status}`);
      return { text: out.text || '', note: `${(blob.size / 1024).toFixed(1)} KB, ${out.ms ?? '?'} ms by ${out.model ?? '?'}` };
    },
    cancel() { stream?.getTracks().forEach((t) => t.stop()); stream = null; if (rec && rec.state !== 'inactive') rec.stop(); rec = null; },
  };
}

/**
 * @param {object} o
 * @param {(text: string, how: { how: 'typed'|'voice'|'pill', by: HTMLElement }) => Promise<any>} o.onAsk
 * @param {{ say: string, title?: string, onPress?: (b: HTMLButtonElement, e: Event) => void }[]} [o.pills]
 *   a pill with onPress runs it and asks nothing
 * @param {{ say: string, title?: string, onPress: () => void }} [o.reset]  the last pill, hidden until showReset(true)
 * @param {string} [o.placeholder]
 * @param {string} [o.api]  the wish worker, for /hear
 * @param {() => string[]} [o.vocabulary]  names Whisper should hear as written
 * @param {(line: string, kind?: string) => void} [o.log]
 * @param {(line: string) => void} [o.ship]  the device log, given what was heard
 * @param {boolean} [o.selfcheck]  starts no speech engine
 * @param {boolean} [o.keys]  hold-to-talk on Caps Lock, Option and the sustain pedal (default true)
 * @param {object} [o.engines]  { chrome, whisper } factories standing in for the real ones (a check's fakes)
 * @param {Function|null} [o.Recognition]  the browser's recognizer class; default the real one
 */
export function createWishBar({ onAsk, pills = [], reset = null, placeholder = '', api = 'https://wish.positron.studio',
  vocabulary = () => [], log = () => {}, ship = () => {}, selfcheck = false, keys = true,
  engines = null, Recognition = browserRecognition() }) {
  const root = el('div', 'pos-wish');
  const row = el('form', 'pos-wish-row');
  const field = createField({ placeholder });
  const button = createIconButton({ icon: 'mic', label: MIC_LABEL, small: true, pressed: false,
    onPress: () => (field.value().trim() ? row.requestSubmit() : micOn ? stopMic() : startMic()) });
  button.el.type = 'submit';
  const showBtn = () => { const typed = !!field.value().trim(); button.set(typed ? 'arrow-up' : 'mic', typed ? 'Ask' : MIC_LABEL); };
  field.input.addEventListener('input', showBtn);
  row.append(field.el, button.el);
  const pillRow = el('div', 'pos-pills');
  const line = el('p', 'pos-wish-say');
  line.hidden = true;

  let inFlight = false;
  /** Ask once; the pressed thing shimmers until the answer is in. A second ask while one runs is dropped. */
  async function ask(text, how = 'typed', by = button.el) {
    text = String(text || '').trim();
    if (!text || inFlight) return null;
    inFlight = true;
    by.dataset.busy = '1';
    // The field empties so the one button is the mic again; the wish stays visible as the placeholder.
    field.set(''); field.input.placeholder = text; showBtn();
    try { return await onAsk(text, { how, by }); } finally { inFlight = false; delete by.dataset.busy; }
  }
  row.addEventListener('submit', (e) => { e.preventDefault(); ask(field.value(), 'typed'); });

  const pillButtons = pills.map((p) => {
    const b = el('button', 'pos-pill', p.say, { type: 'button', ...(p.title ? { title: p.title } : {}) });
    b.addEventListener('click', (e) => {
      if (p.onPress) { p.onPress(b, e); return; }
      if (inFlight) return;
      ask(p.say, 'pill', b);
    });
    pillRow.append(b);
    return b;
  });
  // The reset is always the last pill, and is not drawn until there is something to reset.
  const resetBtn = reset ? el('button', 'pos-pill', reset.say, { type: 'button', ...(reset.title ? { title: reset.title } : {}) }) : null;
  if (resetBtn) {
    resetBtn.hidden = true;
    resetBtn.addEventListener('click', () => reset.onPress());
    pillRow.append(resetBtn);
  }
  pillRow.hidden = !pillButtons.length && !resetBtn;

  // Which engine hears speech. Temporary switcher (2026-10-15): remove once one engine is chosen;
  // the line to remove it is in BACKLOG.md. Remembered per browser, chrome by default where it exists.
  const has = { chrome: !!(engines?.chrome || Recognition), whisper: true };
  const stored = (() => { try { return localStorage.getItem(STORE); } catch { return null; } })();
  let engine = ENGINES.includes(stored) && has[stored] ? stored : has.chrome ? 'chrome' : 'whisper';
  const switcher = createChoice({ label: 'speech', options: ENGINES.map((n) => [n, n]), at: ENGINES.indexOf(engine),
    title: (v) => (v === 'chrome' ? (has.chrome ? 'this browser\'s own recognition, words appear as they are heard' : 'this browser has no speech recognition')
      : 'recorded, then heard by Whisper on the wish worker'),
    onPick: (v) => setEngine(v) });
  if (!has.chrome) switcher.buttons[0].disabled = true;
  function setEngine(name) {
    if (!ENGINES.includes(name) || !has[name]) return engine;
    engine = name;
    switcher.set(ENGINES.indexOf(name), true);
    try { localStorage.setItem(STORE, name); } catch { /* private window: not remembered */ }
    return engine;
  }
  const engineRow = el('div', 'pos-wish-engine');
  engineRow.append(switcher.el);
  root.append(row, pillRow, line, engineRow);

  // Spoken requests: the chosen engine listens while held; its text is asked as typed on release.
  const make = {
    chrome: engines?.chrome || ((o) => chromeEngine({ Recognition, ...o })),
    whisper: engines?.whisper || ((o) => whisperEngine({ api, vocabulary, ...o })),
  };
  let micOn = false, cur = null, curName = '', starting = null, cancel = false, pressAt = 0, recAt = 0, stopAt = 0;
  const started = { chrome: 0, whisper: 0 };
  async function startMic() {
    if (micOn || inFlight) return;
    pressAt = performance.now();
    micOn = true; button.el.setAttribute('aria-pressed', 'true');
    if (selfcheck) return;
    curName = engine;
    const typedBefore = field.value();
    cur = make[curName]({ log, onWords: (t) => { field.set(join(typedBefore, t)); showBtn(); } });
    started[curName]++;
    starting = Promise.resolve().then(() => cur.start());
    try { await starting; } catch (e) {
      cur = null; micOn = false; button.el.setAttribute('aria-pressed', 'false');
      log(`no microphone: ${e.message}`, 'warn'); return;
    }
    recAt = performance.now();
    log(`listening to the microphone (${curName})`);
  }
  async function stopMic() {
    if (!micOn) return;
    stopAt = performance.now();
    micOn = false; button.el.setAttribute('aria-pressed', 'false');
    const c = cur, name = curName;
    cur = null;
    if (!c) return;
    try { await starting; } catch { return; }
    if (cancel) {
      cancel = false; if (c.cancel) c.cancel(); else c.stop().catch(() => {});
      log('the talk key was part of a shortcut, so nothing was sent'); return;
    }
    button.el.dataset.busy = '1';
    try {
      const out = await c.stop();
      const text = String(out.text || '').trim();
      const ms = Math.round(performance.now() - stopAt);
      ship(`[voice] heard "${text}" by ${name}, ${ms} ms from release to final text, mic opened ${Math.round(recAt - pressAt)} ms after the press, held ${Math.round(stopAt - recAt)} ms${out.note ? `, ${out.note}` : ''}`);
      delete button.el.dataset.busy;
      if (!text) { log(out.error ? `nothing was heard: ${out.error}` : 'nothing was heard, so nothing was asked'); return; }
      field.set(text); showBtn();
      ask(text, 'voice');
    } catch (e) {
      delete button.el.dataset.busy;
      log(`could not hear that: ${e.message}`, 'warn');
    }
  }
  // Hold to talk: Caps Lock (on macOS Chrome its down fires on turning on, its up on turning off,
  // so there it is press, press), Option held alone, or a plugged keyboard's sustain pedal
  // (rt-midi.mjs announces `pos-sustain`). Option with another key is a shortcut, not a talk.
  let altAlone = false;
  const onDown = (e) => {
    if (e.repeat) return;
    if (e.key === 'CapsLock') { startMic(); return; }
    if (e.key === 'Alt') { altAlone = true; startMic(); return; }
    if (altAlone) { altAlone = false; if (micOn) { cancel = true; stopMic(); } }
  };
  const onUp = (e) => {
    if (e.key === 'CapsLock') stopMic();
    if (e.key === 'Alt' && altAlone) { altAlone = false; stopMic(); }
  };
  const onPedal = (e) => (e.detail?.down ? startMic() : stopMic());
  if (keys) { addEventListener('keydown', onDown); addEventListener('keyup', onUp); addEventListener('pos-sustain', onPedal); }

  return {
    el: root, field, button, pills: pillButtons, reset: resetBtn, row: pillRow, switcher,
    ask,
    /** Show or hide the reset pill: shown while there is something to reset. */
    showReset(v) { if (resetBtn) resetBtn.hidden = !v; },
    /** Say what came of an ask, centred under the pills; '' hides the line. */
    say(text, kind = '') { line.textContent = text || ''; line.dataset.kind = kind; line.hidden = !text; },
    said: () => (line.hidden ? '' : line.textContent),
    busy: () => inFlight,
    engine: () => engine,
    setEngine,
    has: () => ({ ...has }),
    mic: { start: startMic, stop: stopMic, on: () => micOn, started: () => ({ ...started }) },
    destroy() { removeEventListener('keydown', onDown); removeEventListener('keyup', onUp); removeEventListener('pos-sustain', onPedal); stopMic(); },
  };
}

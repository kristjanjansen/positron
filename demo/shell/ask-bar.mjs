// demo/shell/ask-bar.mjs: the ask field and example pills /connect/ grew, as a kit piece. One field
// with one button inside it (the microphone while empty, send once there is text), a row of pills
// that each ask their own sentence, and one centred line under them for what came of it.
// Speech goes to the wish worker's /hear on a press, never on a visit; under ?selfcheck no
// microphone is opened. Styles are `.pos-ask*` and `.pos-pill` in shell.css.

import { el } from './shell.mjs';
import { createField } from './field.mjs';
import { createIconButton } from './icon-button.mjs';

export const MIC_LABEL = 'Speak: hold Option or Caps Lock, or the sustain pedal, and let go to send';

/**
 * @param {object} o
 * @param {(text: string, how: { how: 'typed'|'voice'|'pill', by: HTMLElement }) => Promise<any>} o.onAsk
 * @param {{ say: string, title?: string }[]} [o.pills]
 * @param {string} [o.placeholder]
 * @param {string} [o.api]  the wish worker, for /hear
 * @param {() => string[]} [o.vocabulary]  names Whisper should hear as written
 * @param {(line: string, kind?: string) => void} [o.log]
 * @param {(line: string) => void} [o.ship]  the device log, given what was heard
 * @param {boolean} [o.selfcheck]  opens no microphone
 * @param {boolean} [o.keys]  hold-to-talk on Caps Lock, Option and the sustain pedal (default true)
 */
export function createAskBar({ onAsk, pills = [], placeholder = '', api = 'https://wish.positron.studio',
  vocabulary = () => [], log = () => {}, ship = () => {}, selfcheck = false, keys = true }) {
  const root = el('div', 'pos-ask');
  const row = el('form', 'pos-ask-row');
  const field = createField({ placeholder });
  const button = createIconButton({ icon: 'mic', label: MIC_LABEL, small: true, pressed: false,
    onPress: () => (field.value().trim() ? row.requestSubmit() : micOn ? stopMic() : startMic()) });
  button.el.type = 'submit';
  const showBtn = () => { const typed = !!field.value().trim(); button.set(typed ? 'arrow-up' : 'mic', typed ? 'Ask' : MIC_LABEL); };
  field.input.addEventListener('input', showBtn);
  row.append(field.el, button.el);
  const pillRow = el('div', 'pos-pills');
  const line = el('p', 'pos-ask-say');
  line.hidden = true;
  root.append(row, pillRow, line);

  let inFlight = false;
  /** Ask once; the pressed thing shimmers until the answer is in. A second ask while one runs is dropped. */
  async function ask(text, how = 'typed', by = button.el) {
    text = String(text || '').trim();
    if (!text || inFlight) return null;
    inFlight = true;
    by.dataset.busy = '1';
    try { return await onAsk(text, { how, by }); } finally { inFlight = false; delete by.dataset.busy; }
  }
  row.addEventListener('submit', (e) => { e.preventDefault(); ask(field.value(), 'typed'); });

  const pillButtons = pills.map((p) => {
    const b = el('button', 'pos-pill', p.say, { type: 'button', ...(p.title ? { title: p.title } : {}) });
    b.addEventListener('click', () => { if (inFlight) return; field.set(p.say); showBtn(); ask(p.say, 'pill', b); });
    pillRow.append(b);
    return b;
  });
  pillRow.hidden = !pillButtons.length;

  // Spoken requests: recorded here, heard by /hear (Whisper), then asked as typed.
  let micOn = false, rec = null, stream = null, chunks = [], cancel = false, recAt = 0, pressAt = 0, stopAt = 0;
  async function startMic() {
    if (micOn || inFlight) return;
    pressAt = performance.now();
    micOn = true; button.el.setAttribute('aria-pressed', 'true');
    if (selfcheck) return;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) {
      micOn = false; button.el.setAttribute('aria-pressed', 'false'); log(`no microphone: ${e.message}`, 'warn'); return;
    }
    if (!micOn) { stream.getTracks().forEach((t) => t.stop()); return; }
    chunks = [];
    rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = heard;
    rec.start();
    recAt = performance.now();
    log('listening to the microphone');
  }
  function stopMic() {
    if (!micOn) return;
    stopAt = performance.now();
    micOn = false; button.el.setAttribute('aria-pressed', 'false');
    if (rec && rec.state !== 'inactive') rec.stop(); else { stream?.getTracks().forEach((t) => t.stop()); }
  }
  async function heard() {
    stream?.getTracks().forEach((t) => t.stop()); stream = null;
    const blob = new Blob(chunks, { type: rec?.mimeType || 'audio/webm' }); rec = null;
    if (cancel) { cancel = false; log('the talk key was part of a shortcut, so nothing was sent'); return; }
    if (!blob.size) return;
    button.el.dataset.busy = '1';
    try {
      const buf = new Uint8Array(await blob.arrayBuffer());
      let b = '';
      for (let i = 0; i < buf.length; i += 0x8000) b += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const r = await fetch(`${api}/hear`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ audio: btoa(b), vocabulary: vocabulary() }) });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(out.error || `HTTP ${r.status}`);
      const text = (out.text || '').trim();
      ship(`[voice] heard "${text}" from ${(blob.size / 1024).toFixed(1)} KB, mic opened ${Math.round(recAt - pressAt)} ms after the press, recorded ${Math.round(stopAt - recAt)} ms, in ${out.ms ?? '?'} ms by ${out.model ?? '?'}`);
      delete button.el.dataset.busy;
      if (!text) { log('nothing was heard, so nothing was asked'); return; }
      field.set(text); showBtn();
      ask(text, 'voice');
    } catch (e) {
      delete button.el.dataset.busy;
      log(`could not hear that: ${e.message}`, 'warn');
    }
  }
  // Hold to talk: Caps Lock (on macOS Chrome its down fires on turning on), Option held alone, or
  // a plugged keyboard's sustain pedal (rt-midi.mjs announces `pos-sustain`).
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
    el: root, field, button, pills: pillButtons,
    ask,
    /** Say what came of an ask, centred under the pills; '' hides the line. */
    say(text, kind = '') { line.textContent = text || ''; line.dataset.kind = kind; line.hidden = !text; },
    said: () => (line.hidden ? '' : line.textContent),
    busy: () => inFlight,
    mic: { start: startMic, stop: stopMic, on: () => micOn },
    destroy() { removeEventListener('keydown', onDown); removeEventListener('keyup', onUp); removeEventListener('pos-sustain', onPedal); stopMic(); },
  };
}

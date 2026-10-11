// demo/shell/chat-ui.mjs: the chat's pieces, one module for every page that
// draws a chat (asked 2026-10-11, *"copy broadcast message rendering to 003"*,
// *"(make it reusable) as all chat ui elements"*). Lifted from
// /concepts/room/001/ to /concepts/room/004/, where each page had its own copy.
//
//   createChatLog()        lines, newest at the bottom, scrolling inside itself
//   createChatSign()       one line on show, centred both ways, balanced, brand face
//   createChatCompose(o)   the box: grows to six lines, Enter sends, Shift and
//                          Enter is a new line, the send icon in its bottom right,
//                          hidden until enabled (no chat box before Join)
//   createChatColumn(o)    a heading, a body (a log or a sign) and a compose box;
//                          `ink` colours your own name and the box's focus edge
//   createChatWindow(o)    the frame: the kit's video panel holding one column
//                          full width, or two with the second a third wide;
//                          a phone stacks two columns, each half the stage
//
// Nothing here opens anything: a page wires the send and the arrivals.

import { el } from './shell.mjs';
import { createVideoPanel } from './video-panel.mjs';
import { createField } from './field.mjs';
import { createIconButton } from './icon-button.mjs';

const CSS = `
  .pos-chat { position: absolute; inset: 0; display: grid; grid-template-columns: minmax(0, 1fr);
              gap: 1px; background: var(--line); }
  .pos-chat.two { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
  .pos-chat > * { min-width: 0; min-height: 0; background: var(--card); display: flex; flex-direction: column; }
  .pos-chat-h { margin: 0; padding: 12px 16px 0; }

  .pos-chat-log { flex: 1 1 auto; min-height: 0; overflow-y: auto;
                  display: flex; flex-direction: column; gap: 12px; padding: 12px 16px 14px; }
  .pos-chat-log > :first-child { margin-top: auto; }
  .pos-chat-msg { display: flex; flex-direction: column; gap: 3px; }
  .pos-chat-msg-h { display: flex; gap: 10px; align-items: baseline; }
  .pos-chat-who { font: 500 12px/1.3 var(--mono); color: var(--fg); }
  .pos-chat-when { font: 400 11px/1.3 var(--mono); color: var(--dim2); }
  .pos-chat-text { margin: 0; font-size: 14px; line-height: 1.45; color: var(--dim);
                   overflow-wrap: anywhere; white-space: pre-wrap; }
  /* Your own name, in the column's ink: the site yellow unless a column says otherwise. */
  .pos-chat-msg.me .pos-chat-who { color: var(--chat-ink, var(--hi)); }

  /* One line on show: centred both ways in what is left of the column,
     balanced, at most 32 characters and 70 per cent of the area a line,
     newlines kept, long words broken, scrolling only past the area. */
  .pos-chat-sign { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column;
                   align-items: center; justify-content: center; padding: 16px 24px; text-align: center; }
  .pos-chat-sign-t { margin: 0; max-width: min(32ch, 70%); font: 600 clamp(18px, 3vw, 28px)/1.3 var(--brand);
                     color: var(--fg); text-wrap: balance; overflow-wrap: anywhere; white-space: pre-line; }

  .pos-chat-compose { position: relative; padding: 10px 12px 12px; }
  .pos-chat-compose[hidden] { display: none; }
  .pos-chat-compose .pos-field { display: block; margin: 0; }
  /* .pos-field.tall textarea is (0,2,1); this matches it and wins on order. */
  .pos-chat-compose .pos-field textarea { display: block; width: 100%; resize: none; overflow-y: hidden;
                         max-height: calc(6 * 1.45em + 16px); padding-right: 44px; line-height: 1.45; }
  .pos-chat-compose .pos-field textarea:focus-visible { border-color: var(--chat-ink, var(--hi)); }
  .pos-chat-send { position: absolute; right: 18px; bottom: 18px; }

  /* A phone stacks two columns, each half a taller stage. After the base rules. */
  @media (max-width: 560px) {
    .pos-chat-win.two .pos-vp-stage { --vp-aspect: 3 / 5; }
    .pos-chat-win.one .pos-vp-stage { --vp-aspect: 4 / 5; }
    .pos-chat.two { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) minmax(0, 1fr); }
  }
`;
let styled = false;
const style = () => {
  if (styled) return;
  document.head.append(Object.assign(document.createElement('style'), { textContent: CSS }));
  styled = true;
};
const clock = (at = Date.now()) => new Date(at).toTimeString().slice(0, 5);

/** Lines, newest at the bottom. `add({ who, at, text, me })`. */
export function createChatLog() {
  style();
  const box = el('div', 'pos-chat-log');
  return {
    el: box,
    add({ who, at, text, me = false }) {
      const m = el('div', `pos-chat-msg${me ? ' me' : ''}`);
      const h = el('div', 'pos-chat-msg-h');
      h.append(el('span', 'pos-chat-who', who), el('span', 'pos-chat-when', clock(at)));
      m.append(h, el('p', 'pos-chat-text', text));
      box.append(m);
      box.scrollTop = box.scrollHeight;
    },
    clear() { box.replaceChildren(); },
  };
}

/** One line on show, a new one replaces it. `add({ text })`. */
export function createChatSign() {
  style();
  const box = el('div', 'pos-chat-sign');
  const t = el('p', 'pos-chat-sign-t', '');
  box.append(t);
  return {
    el: box,
    add({ text }) { t.textContent = text; },
    clear() { t.textContent = ''; },
    text: () => t.textContent,
  };
}

/**
 * The compose box. Hidden and off until `enable(true)`.
 * @param {object} o
 * @param {string} o.placeholder  what the box says when on
 * @param {(text: string) => void} o.onSend
 * @param {string} [o.label]      the accessible name, the placeholder by default
 */
export function createChatCompose({ placeholder, onSend, label = placeholder } = {}) {
  style();
  const wrap = el('div', 'pos-chat-compose');
  const field = createField({ rows: 2, placeholder });
  const ta = field.input;
  ta.rows = 1;
  ta.setAttribute('aria-label', label);
  const grow = () => {
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight + 2}px`;
    ta.style.overflowY = ta.scrollHeight > ta.clientHeight + 2 ? 'auto' : 'hidden';
  };
  const b = createIconButton({ icon: 'send', label: 'Send', small: true, onPress: () => send() });
  b.el.classList.add('pos-chat-send');
  const send = () => {
    const text = ta.value.trim();
    if (!text || ta.disabled) return;
    onSend(text);
    field.set('');
    grow();
    ta.focus();
  };
  ta.addEventListener('input', grow);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
  });
  let on = null;
  const enable = (v) => {
    if (v === on) return;
    on = v;
    field.disabled(!v);
    b.el.disabled = !v;
    wrap.hidden = !v;
    // a box that was hidden measured 0 tall, so it measures again once it shows
    requestAnimationFrame(grow);
    if (v) ta.focus();
  };
  enable(false);
  wrap.append(field.el, b.el);
  return { el: wrap, input: ta, enable, enabled: () => !!on };
}

/**
 * A heading, a body and an optional compose box.
 * @param {object} o
 * @param {string} [o.title]
 * @param {{ el: Element }} o.body       a chat log or a chat sign
 * @param {{ el: Element }} [o.compose]
 * @param {string} [o.ink]               colour of your own name and the focus edge
 */
export function createChatColumn({ title = '', body, compose = null, ink = '' } = {}) {
  style();
  const col = el('div', 'pos-chat-col');
  if (ink) col.style.setProperty('--chat-ink', ink);
  const head = el('h3', 'pos-sec-h pos-chat-h', title);
  head.hidden = !title;
  col.append(head, body.el, ...(compose ? [compose.el] : []));
  return {
    el: col,
    title(t) { head.textContent = t; head.hidden = !t; },
  };
}

/**
 * The frame: the kit's video panel with the chat as its picture.
 * @param {object} o
 * @param {Array<{ el: Element }>} o.columns  one or two
 * @param {Element|false} [o.footer]          the footer's left slot
 */
export function createChatWindow({ columns = [], footer = false } = {}) {
  style();
  const two = columns.length > 1;
  const grid = el('div', `pos-chat${two ? ' two' : ''}`);
  grid.append(...columns.map((c) => c.el));
  const panel = createVideoPanel({ left: footer, fullMode: 'footer' });
  panel.el.classList.add('pos-chat-win', two ? 'two' : 'one');
  panel.stage.append(grid);
  return { el: panel.el, panel, grid };
}

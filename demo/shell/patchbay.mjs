// demo/shell/patchbay.mjs: a bay as a block of a page. A `patchbay` heading
// with a `See details` link button right after it, the picture `createBayView`
// draws, and behind the button the links and the ports as tables. Generic:
// it reads `nodes()`, `ports()` and `links()` and nothing a page types, so
// any bay, or `heldPicture()` of one, can be handed to it.
//
// Traffic is drawn on the wires by `createBayTraffic`: an event medium pulses
// once per event a link delivered (its own `sent`) and once per `pulse(from,
// to)` a page calls for a leg the bay does not count (a raw room message, a
// line a store played back); a stream medium is lit while `flowing(link,
// medium)` answers true, which only the page can know. A wire is keyed by its
// printed link, not by the bay's id, so a page that builds a fresh bay per
// action keeps its wires. Call `refresh()` after the links change.

import { el } from './shell.mjs';
import { createTable } from './table.mjs';
import { MEDIA, printLink } from './bay.mjs';
import { createBayView, BAY_VIEW_CSS } from './bay-view.mjs';
import { createBayTraffic, STREAMY } from './bay-traffic.mjs';
import { createPortInk } from './port-ink.mjs';
import { createLinkButton } from './link-button.mjs';

// The medium colours, one place for every page that draws a bay.
export const MEDIUM_COLOURS = {
  midi: '#6fb8e8', audio: '#ee9a4d', clock: '#c9ced6', value: '#9ad16b',
  video: '#e07a5f', program: '#c39af0', file: '#d68fc6', state: '#8a9fc4',
};
const CSS = `
  :root { ${Object.entries(MEDIUM_COLOURS).map(([m, c]) => `--md-${m}: ${c};`).join(' ')} }
  ${MEDIA.map((m) => `.md-${m} { color: var(--md-${m}); }`).join('\n  ')}
  .pb { display: flex; flex-direction: column; gap: 12px; }
  .pb-head { display: flex; align-items: baseline; gap: 12px; }
  .pb-head .pos-linkbtn { font-size: 13px; }
  .pb-h { margin: 0; font-size: 14px; color: var(--dim); font-weight: 500; }
  .pb-more { display: flex; flex-direction: column; gap: 12px; }
  .pb-more[hidden] { display: none; }
  ${BAY_VIEW_CSS}
`;
let styled = false;

const DIR = { in: '→○', out: '○→' };
const nodeOf = (id) => id.split(':').slice(0, 2).join(':');
const siteOf = (id) => id.split(':')[0];
const list = (xs) => (xs && xs.length ? xs.join(', ') : '');

/**
 * @param {object} source  a bay, or anything with `nodes()`, `ports()`, `links()`
 * @param {object} [o]
 * @param {string} [o.title]      the heading, `patchbay`
 * @param {Function} [o.detail]   `(node) => fields` for a box, see createBayView; the node's label by default
 * @param {Function} [o.flowing]  `(link, medium) => boolean` for a stream wire
 * @param {boolean} [o.open]      details shown from the start
 */
export function createPatchbay(source, { title = 'patchbay', detail, flowing = () => false, open = false } = {}) {
  if (!styled) { document.head.append(Object.assign(document.createElement('style'), { textContent: CSS })); styled = true; }
  // The view sees every link under its printed form, so the same link read
  // from a fresh bay is the same wire.
  let latest = new Map();          // key -> the link object read last
  const keyOf = (l) => printLink(l);
  const keyed = {
    nodes: () => source.nodes(),
    ports: () => source.ports(),
    links: () => source.links().map((l) => ({ ...l, id: keyOf(l) })),
  };
  const pending = new Map();       // key -> pulses a page asked for
  const view = createBayView(keyed, { detail: detail || ((n) => [{ text: n.label || '', sans: true }]) });
  const ink = createPortInk(source, MEDIA);
  const traffic = createBayTraffic();
  const traced = new Set();

  const more = createLinkButton({ label: open ? 'Hide details' : 'See details', expanded: open, onPress: () => toggle() });
  const button = more.el;
  const head = el('div', 'pb-head');
  head.append(el('h3', 'pb-h', title), button);

  const linksT = createTable({ columns: [
    { key: 'line', label: 'link', grow: true, hi: true, clip: true, hover: 'line' },
    { key: 'medium', label: 'medium', width: 72 },
    { key: 'where', label: 'where', width: 104 },
    { key: 'by', label: 'transport', width: 96 },
  ] });
  const portsT = createTable({ columns: [
    { key: 'id', label: 'port', grow: true, hi: true, clip: true, hover: 'id' },
    { key: 'node', label: 'node', width: 120, clip: true },
    { key: 'dir', label: 'dir', width: 48 },
    { key: 'medium', label: 'medium', width: 72 },
    { key: 'cls', label: 'messages', width: 120, clip: true, hover: 'cls' },
    { key: 'by', label: 'transport', width: 96, clip: true },
  ] });
  const box = el('div', 'pb-more');
  box.append(el('h3', 'pb-h', 'links'), linksT.el, el('h3', 'pb-h', 'ports'), portsT.el);
  box.hidden = !open;

  const root = el('div', 'pb');
  root.append(head, view.el, box);

  function toggle() {
    box.hidden = !box.hidden;
    more.expanded(!box.hidden);
    more.label(box.hidden ? 'See details' : 'Hide details');
    tables();
    ink.paint(root);
  }

  const mediumOf = (ports, id) => ports.find((p) => p.id === id)?.medium || '';
  // A light link has no session: inside one site the bay hands the event over
  // itself, across sites it rides the room as one `bay.event`.
  const whereOf = (l) => l.session?.where || (siteOf(l.from) === siteOf(l.to) ? 'machine' : 'internet');
  const byOf = (l) => l.session?.transport || l.via || (siteOf(l.from) === siteOf(l.to) ? 'bay' : 'relay');

  function tables() {
    if (box.hidden) return;
    const ports = source.ports(), links = source.links();
    const label = new Map(source.nodes().map((n) => [n.id, n.label || '']));
    linksT.set(links.map((l) => ({ line: printLink(l), medium: mediumOf(ports, l.from) || mediumOf(ports, l.to),
      where: whereOf(l), by: byOf(l) })));
    portsT.set(ports.map((p) => ({ id: p.id, node: label.get(nodeOf(p.id)) || nodeOf(p.id).split(':')[1],
      dir: DIR[p.dir] || p.dir, medium: p.medium,
      cls: list(p.dir === 'in' ? p.accepts : p.emits), by: list(p.transports) })));
    for (const t of [linksT, portsT]) {
      for (const cell of t.el.querySelectorAll('.pos-tbl-body .pos-tbl-c')) {
        if (MEDIA.includes(cell.textContent)) cell.classList.add(`md-${cell.textContent}`);
      }
    }
  }

  function trace() {
    const ports = source.ports();
    latest = new Map(source.links().map((l) => [keyOf(l), l]));
    for (const [key, l] of latest) {
      if (traced.has(key)) continue;
      traced.add(key);
      const medium = mediumOf(ports, l.from) || mediumOf(ports, l.to);
      let was = l, seen = l.sent || 0;
      traffic.add(view, key, medium, STREAMY.includes(medium)
        ? () => ({ flowing: !!(latest.get(key) && flowing(latest.get(key), medium)) })
        : () => {
          const now = latest.get(key);
          if (now !== was) { was = now; seen = now?.sent || 0; }
          const n = Math.max(0, (now?.sent || 0) - seen) + (pending.get(key) || 0);
          seen = now?.sent || 0;
          pending.delete(key);
          return { n };
        });
    }
  }

  /** One event along every drawn link from `from` to `to`, for a leg the bay does not count. */
  function pulse(from, to) {
    for (const [key, l] of latest) if (l.from === from && l.to === to) pending.set(key, (pending.get(key) || 0) + 1);
  }

  /** Redraw after the links changed. Cheap enough to call after every send. */
  function refresh() {
    view.render();
    trace();
    tables();
    ink.paint(root);
  }
  refresh();
  return { el: root, view, button, refresh, pulse, linksT, portsT, ink };
}

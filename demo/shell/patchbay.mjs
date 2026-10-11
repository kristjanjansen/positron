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
import { MEDIA, HEAVY, printLink } from './bay.mjs';
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
  .pb { display: flex; flex-direction: column; }
  .pb-more { margin-top: 24px; }
  .pb-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 10px; }
  .pb-head .pos-linkbtn { font-size: 12px; }
  /* The kit's section heading (.pos-sec-h, uppercase mono), asked 2026-10-10:
     *"patchbay title should be standard heading, uppercase mono"*. Its own
     10 px margin is the gap to what it names; in the head row the row's
     baseline alignment does that job, so it gives the margin up there. */
  .pb-head .pos-sec-h { margin: 0; }
  .pb-more { display: flex; flex-direction: column; gap: 24px; }
  .pb-more[hidden] { display: none; }
  ${BAY_VIEW_CSS}
`;
let styled = false;

const DIR = { in: '→○', out: '○→' };
const nodeOf = (id) => id.split(':').slice(0, 2).join(':');
const siteOf = (id) => id.split(':')[0];
const mediumOf = (ports, id) => ports.find((p) => p.id === id)?.medium || '';
const list = (xs) => (xs && xs.length ? xs.join(', ') : '');

/**
 * @param {object} source  a bay, or anything with `nodes()`, `ports()`, `links()`
 * @param {object} [o]
 * @param {string} [o.title]      the heading, `patchbay`
 * @param {Function} [o.detail]   `(node) => fields` for a box, see createBayView; the node's label by default
 * @param {Function} [o.flowing]  `(link, medium) => boolean` for a stream wire
 * @param {boolean} [o.open]      details shown from the start
 * @param {string} [o.room]       the relay room, named on the relay's box, `cf-relay:<room>`
 */
export function createPatchbay(raw, { title = 'patchbay', detail, flowing = () => false, open = false, details = false, room = 'room' } = {}) {
  /* 🔴 THE RELAY IS DRAWN AS A BOX, 2026-10-11. Asked: *"why relay can no be
     another box?"*, *"why it can have standard node naming?"*, then, after a
     prototype on /concepts/room/000/, *"ok do it and update patcbays"*. Every
     link the relay carries is drawn as two hops through `cf-relay:<room>`,
     named like any node (as `cf-store:history`), with one in and one out port
     per medium it carries. PICTURE ONLY: the bay still holds and routes the
     one link, and the relay announces nothing, because it passes messages on
     without reading them. A link counts as carried by the relay when its
     session or `via` says `relay` (`relay`, `relay-h264`), or when it is a
     LIGHT link between two sites with neither, which rides the room as one
     `bay.event`. A heavy link with no session is not guessed at: an ERR
     stream or a WHIP leg is not the relay. */
  const RELAY = `cf-relay:${room}`;
  const mediumIn = (ports, l) => mediumOf(ports, l.from) || mediumOf(ports, l.to);
  const relayed = (ports, l) => {
    const by = l.session?.transport || l.via;
    if (by) return String(by).startsWith('relay');
    return siteOf(l.from) !== siteOf(l.to) && !HEAVY.includes(mediumIn(ports, l));
  };
  // 🔴 A HOP KEEPS ONE OBJECT ACROSS READS. The traffic layer counts a wire's
  // events as the change in `sent` on the SAME object, and treats a new object
  // as a new wire; a hop built afresh on every read was a new wire every time,
  // so no MIDI ever pulsed on a relayed link (found 2026-10-11 on
  // /concepts/synth/070/, *"i do not see midi animation on circuilt patchbay"*).
  const hopCache = new Map();
  const drawn = () => {
    const ports = raw.ports(), links = [], extra = new Map(), hops = new Map();
    for (const l of raw.links()) {
      if (!relayed(ports, l)) { links.push(l); continue; }
      const md = mediumIn(ports, l);
      const rin = `${RELAY}:${md}-in`, rout = `${RELAY}:${md}-out`;
      extra.set(rin, { id: rin, dir: 'in', medium: md }); extra.set(rout, { id: rout, dir: 'out', medium: md });
      for (const [from, to] of [[l.from, rin], [rout, l.to]]) {
        const k = `${from} -> ${to}`;
        const h = hops.get(k);
        if (h) { h.origs.push(l); h.sent += l.sent || 0; continue; }
        let hop = hopCache.get(k);
        if (!hop) {
          hop = { ...l, from, to, via: 'relay' };
          delete hop.id; delete hop.session;
          hopCache.set(k, hop);
        }
        hop.origs = [l]; hop.sent = l.sent || 0;
        hops.set(k, hop); links.push(hop);
      }
    }
    const nodes = raw.nodes();
    if (extra.size) nodes.push({ id: RELAY, label: 'Cloudflare', kind: 'service' });
    return { nodes, ports: [...ports, ...extra.values()], links };
  };
  const source = { nodes: () => drawn().nodes, ports: () => drawn().ports, links: () => drawn().links };
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
  const fields = detail || ((n) => [{ text: n.label || '', sans: true }]);
  const view = createBayView(keyed, { detail: (n) => (n.id === RELAY ? [{ text: 'Cloudflare', sans: true }] : fields(n)) });
  const ink = createPortInk(source, MEDIA);
  const traffic = createBayTraffic();
  const traced = new Set();

  const more = createLinkButton({ label: open ? 'Hide details' : 'See details', expanded: open, onPress: () => toggle() });
  const button = more.el;
  const head = el('div', 'pb-head');
  // ⚠️ THE DETAILS ARE ARCHIVED, NOT DELETED, 2026-10-10: *"archive see details
  // of patchbay component. revisit later"*. The link and the two tables are
  // built as before and left off the page unless a caller passes
  // `details: true`. BACKLOG.md carries the revisit.
  head.append(el('h3', 'pos-sec-h', title), ...(details ? [button] : []));

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
  // A heading and its table are one block; the blocks are spaced, the pair is not.
  const block = (name, t) => { const b = el('div'); b.append(el('h3', 'pos-sec-h', name), t.el); return b; };
  box.append(block('links', linksT), block('ports', portsT));
  box.hidden = !open;

  const root = el('div', 'pb');
  root.append(head, view.el, ...(details ? [box] : []));

  function toggle() {
    box.hidden = !box.hidden;
    more.expanded(!box.hidden);
    more.label(box.hidden ? 'See details' : 'Hide details');
    tables();
    ink.paint(root);
  }

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
        ? () => { const now = latest.get(key); return { flowing: !!(now && flowing(now.origs?.[0] || now, medium)) }; }
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
    // A relayed link is drawn as two hops, and a pulse on the link lights both.
    const is = (l) => l.from === from && l.to === to;
    for (const [key, l] of latest) if (is(l) || l.origs?.some(is)) pending.set(key, (pending.get(key) || 0) + 1);
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

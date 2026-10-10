// demo/concepts/20/port-ink.mjs: colours the port part of every port id on the
// page (`web:keys:midi-out`) in its medium's colour, read from the bay's own
// port, without touching the text. The CSS Custom Highlight API paints ranges
// over the existing text nodes, so a cell still holds plain ASCII that copies,
// clips and sorts as it did; no spans are added. A browser without
// `CSS.highlights` shows the text uncoloured.

const ID = /[\w.*-]+:[\w.-]+:[\w.-]+/g;

export function createPortInk(bay, media) {
  const css = media.map((m) => `::highlight(md-${m}) { color: var(--md-${m}); }`).join('\n');
  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));

  /** Re-scan `root` and repaint. Call after anything under it re-renders. */
  function paint(root) {
    if (!globalThis.CSS?.highlights) return;
    const medium = new Map(bay.ports().map((p) => [p.id, p.medium]));
    const ranges = new Map(media.map((m) => [m, []]));
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = walk.nextNode(); t; t = walk.nextNode()) {
      for (const m of t.data.matchAll(ID)) {
        const md = medium.get(m[0]);
        if (!md || !ranges.has(md)) continue;
        const r = new Range();
        const start = m.index + m[0].lastIndexOf(':') + 1;
        r.setStart(t, start);
        r.setEnd(t, m.index + m[0].length);
        ranges.get(md).push(r);
      }
    }
    for (const [m, rs] of ranges) CSS.highlights.set(`md-${m}`, new Highlight(...rs));
  }
  return { paint };
}

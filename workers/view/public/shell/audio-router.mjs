// demo/shell/audio-router.mjs: wire a WebAudio graph from the audio links a bay holds.
// Disconnect every out first, then connect exactly what is held, so an unlinked edge goes silent.
// An in may be a node or an AudioParam; pure apart from connect and disconnect, so it tests with fakes.
// why: lessons/kit-audio-router.md#header

/**
 * @param {object} o
 * @param {Array<{from: string, to: string}>} o.edges  the audio links to make, already filtered to this tab
 * @param {(portId: string) => (AudioNode | null | undefined)} o.out    the node an out port is
 * @param {(portId: string) => (AudioNode | AudioParam | null | undefined)} o.input  the node or param an in port is
 * @param {Iterable<AudioNode>} o.outs  every out that exists now, connected or not
 * @returns {Array<{from: string, to: string}>} the edges that were connected
 */
export function routeAudio({ edges, out, input, outs }) {
  for (const o of outs) {
    if (!o) continue;
    try { o.disconnect(); } catch { /* not connected */ }
  }
  const made = [];
  for (const e of edges) {
    const src = out(e.from), dst = input(e.to);
    if (!src || !dst) continue;
    src.connect(dst);
    made.push(e);
  }
  return made;
}

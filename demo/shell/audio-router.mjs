// demo/shell/audio-router.mjs: wire a WebAudio graph from the audio links a bay
// holds. Lifted 2026-10-14 from `route()` in demo/synth/patch-synth.mjs
// (plans/plan-connect-ui.md slice 0), which lifted it from /radio/blend/.
//
// THE RULE: disconnect every out first, then connect exactly what is held, so
// an edge that was unlinked goes silent with no bookkeeping of what changed.
// An in may be a node or an AudioParam (`filter:cutoff-in` is the filter's
// detune, plans/plan-synth-patch.md §3 option A); `connect()` takes either.
//
// Pure apart from the `connect` and `disconnect` it calls on what it is
// handed, so node-runtime-test.mjs grades it with fake nodes and no browser.

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

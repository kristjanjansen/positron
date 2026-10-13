// demo/remote/path.mjs: the relay or direct choice of a remote
// instrument page, written once for remote/020, 040 and 050.
//
// Asked 2026-10-13: *"add direct option to all remote instruments."* (BACKLOG).
// remote/010 Circuit on Pi and remote/030 Pi piano carry this inline; these
// three pages take it from here so they cannot drift from each other, and it is
// the same control, the same URL and the same fall back as those two:
//
//   - `createChoice` labelled `path`, `relay` and `direct`, relay the default.
//   - `?path=direct` opens on direct, and the URL follows the choice.
//   - `connecting()` sweeps the `direct` segment while the link is being made
//     (board.mjs `goDirect`, which gives up after 3 s).
//   - `fellBack()` lights `relay` and drops `?path=direct` when direct did not
//     open or dropped, so the choice shows the path in use, not the one asked.
//   - `rewire(bay, path, isPi)` re-lays every link between the page and the Pi
//     with `via: 'datachannel'` while direct (or through TURN) and `via: 'relay'`
//     otherwise, so the patchbay draws the wire that carries it.
//
// A change of choice calls `onPick(mode)`; the page tears its board down and,
// if it was playing, plays again on the new path, as 030 does.
import { createChoice } from '/shell/choice.mjs';

/** `datachannel` for a direct or TURN path, `relay` for everything else. */
export const viaOf = (path) => (path === 'direct' || path === 'turn' ? 'datachannel' : 'relay');

/** The `path` cell's hover: remote/010's words, and `model` for a Pi simulated
 *  in this tab (`simulated` is cut to `simula…` in a cell at 1280). */
export const PATH_HINT = 'direct is a WebRTC link to the Pi\nrelay is the Cloudflare room\nmodel is the Pi simulated in this tab';
/** The `network` cell's hover, as remote/010. */
export const NETWORK_HINT = 'a message to the Pi and back, no sound in it';

/** Put a hover on a readout cell by its key, as remote/010's `hint`. */
export function hintCell(d, key, text) {
  for (const c of d.readoutEl?.querySelectorAll('.pos-cell') || []) if (c.querySelector('.pos-k')?.textContent === key) c.title = text;
}

export function createPathChoice({ log = () => {}, onPick = () => {} } = {}) {
  let mode = new URLSearchParams(location.search).get('path') === 'direct' ? 'direct' : 'relay';
  const url = (m) => {
    const u = new URL(location.href);
    if (m === 'direct') u.searchParams.set('path', 'direct'); else u.searchParams.delete('path');
    history.replaceState(null, '', u);
  };
  const choice = createChoice({ label: 'path', options: [['relay', 'relay'], ['direct', 'direct']],
    at: mode === 'direct' ? 1 : 0,
    onPick: (v) => { if (v === mode) return; mode = v; url(v); log(`mode: ${v}`); onPick(v); } });
  let wiredVia = null;
  return {
    el: choice.el,
    mode: () => mode,
    /** The direct segment sweeps while a direct link is being made. */
    connecting(on) { choice.pending(on ? 1 : null); },
    /** Direct did not open, or dropped: show relay, as the path in use. */
    fellBack() {
      if (mode === 'relay') return;
      mode = 'relay';
      choice.set(0, true);
      url('relay');
    },
    /**
     * Lay every link that touches the Pi again with the wire that carries it.
     * `isPi(link)` says which links are the board's; a file link to R2 is not.
     * Answers whether anything changed.
     */
    rewire(bay, path, isPi, warn = log) {
      const via = viaOf(path);
      if (via === wiredVia) return false;
      wiredVia = via;
      for (const l of bay.links()) {
        if (!isPi(l)) continue;
        bay.unlink(l.id);
        const r = bay.link(l.from, l.to, l.transforms || [], { via });
        if (!r.ok) warn(`${l.from} -> ${l.to} via ${via} refused: ${r.why}`, 'warn');
      }
      return true;
    },
    /** Forget the wire, so the next `rewire` lays it whatever it was. */
    reset() { wiredVia = null; },
  };
}

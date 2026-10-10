// demo/shell/bay-traffic.mjs: shows that something is passing along the
// wires a links view drew. Light shading travels out to in along a thin wire.
// On an event medium each event sends one short soft pulse along it; on a
// stream medium the line fades up while it flows, with a slow gradient moving
// along it, and fades down when it stops.
//
// A wire is fed by `read(t)`, answering `{ n, flowing }`: events since the
// last frame, and whether the stream is flowing now. A page passes real reads
// (a link's `sent` count, a synth's sounding voices) or stand-ins.

const NS = 'http://www.w3.org/2000/svg';
// Clock is 48 ticks a second, so it is drawn as the stream it looks like.
export const STREAMY = ['audio', 'video', 'clock', 'file', 'state'];
const N = 161;                       // gradient samples along a wire, fine enough for a narrow pulse
const W = 2;                         // every wire the same thin line
// An event pulse is narrow, so two events 30 ms apart (a knob turned) are two
// pulses on the wire, not one blob. Pulses that meet take the brighter, never sum.
const PULSE = { w: 0.025, ms: 900 };
// A stream line fades quickly but over a small range so it never flickers. An
// event line sits lighter, so a pulse is a small step up from it.
const IDLE = 0.35, FLOW = 0.45, FADE_MS = 150, EVENT_LINE = 0.55;
// While a stream flows, long bright bands move along it out to in: about one
// band to a wire, a slow sweep every two and a half seconds, full strength
// over a line that stays dim (asked 2026-10-10, *"make streamy connections
// animation waaaay longer"*). Half
// strength over a line raised to 0.8 was the same colour on the same colour and
// read as still, reported 2026-10-10: *"i still do not see audio / vide
// connector animation"*.
const WAVE = { k: 0.6, perSec: 0.4, depth: 1 };
let seq = 0;

export function createBayTraffic() {
  const wires = [];

  function attach(row) {
    const path = row.view.wires.get(row.linkId);
    if (!path || path === row.path) return !!path;
    const svg = path.ownerSVGElement;
    const defs = document.createElementNS(NS, 'defs');
    const g = document.createElementNS(NS, 'linearGradient');
    g.id = `lw-${row.i}`;
    g.setAttribute('gradientUnits', 'userSpaceOnUse');
    const len = path.getTotalLength(), a = path.getPointAtLength(0), b = path.getPointAtLength(len);
    g.setAttribute('x1', a.x); g.setAttribute('y1', a.y); g.setAttribute('x2', b.x); g.setAttribute('y2', b.y);
    row.stops = Array.from({ length: N }, (_, j) => {
      const st = document.createElementNS(NS, 'stop');
      st.setAttribute('offset', j / (N - 1));
      st.style.stopColor = `var(--md-${row.medium})`;
      st.style.stopOpacity = 0;
      g.append(st);
      return st;
    });
    defs.append(g);
    svg.prepend(defs);
    path.style.strokeWidth = W;
    path.style.opacity = row.streamy ? IDLE : EVENT_LINE;
    const glow = path.cloneNode();
    glow.removeAttribute('class');
    glow.setAttribute('fill', 'none');
    glow.setAttribute('stroke', `url(#${g.id})`);
    glow.style.strokeWidth = W;
    glow.style.opacity = 1;
    path.after(glow);
    row.path = path;
    return true;
  }

  let last = performance.now();
  function frame(t) {
    const dt = t - last; last = t;
    const asked = new Map();           // a read shared by several wires is asked once a frame
    for (const row of wires) {
      if (!asked.has(row.read)) asked.set(row.read, row.read(t));
      const { n = 0, flowing = false } = asked.get(row.read);
      if (!attach(row)) continue;
      const shade = new Array(N).fill(0);
      if (row.streamy) {
        row.level += ((flowing ? 1 : 0) - row.level) * Math.min(1, dt / FADE_MS);
        row.path.style.opacity = (IDLE + (FLOW - IDLE) * row.level).toFixed(3);
        const ph = (t / 1000) * WAVE.perSec;
        for (let j = 0; j < N; j++) {
          shade[j] = row.level * WAVE.depth * (0.5 + 0.5 * Math.sin(2 * Math.PI * ((j / (N - 1)) * WAVE.k - ph)));
        }
      } else {
        for (let k = 0; k < n; k++) row.pulses.push(t);
        row.pulses = row.pulses.filter((t0) => t - t0 < PULSE.ms);
        for (const t0 of row.pulses) {
          const p = -PULSE.w * 2 + (1 + PULSE.w * 4) * ((t - t0) / PULSE.ms);
          for (let j = 0; j < N; j++) {
            const x = j / (N - 1);
            shade[j] = Math.max(shade[j], Math.exp(-(((x - p) / PULSE.w) ** 2)));
          }
        }
      }
      row.stops.forEach((st, j) => { st.style.stopOpacity = shade[j].toFixed(3); });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /** Shade the wire `linkId` in `view`, fed by `read(t)`. */
  function add(view, linkId, medium, read) {
    wires.push({ i: ++seq, view, linkId, medium, read, streamy: STREAMY.includes(medium),
      path: null, stops: [], pulses: [], level: 0 });
  }
  return { add };
}

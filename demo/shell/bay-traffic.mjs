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
const W = 2;                         // every wire the same thin line
// An event pulse is narrow, so two events 30 ms apart (a knob turned) are two
// pulses on the wire, not one blob. Pulses that meet composite, so two at one
// place read as one bright one rather than a doubled blob.
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
/* 🔴 A FEW ELEMENTS MOVED, NEVER 161 STOPS REWRITTEN, 2026-10-11. Every wire
   used to carry a 161 stop gradient whose every `stop-opacity` was written
   every frame, so a picture of 31 wires restyled about 5,000 elements sixty
   times a second. MEASURED on /typist/score/?n=6 playing, headless,
   10 s: style recalculation took 35.0 % of the main thread with the patchbay
   on screen and 0.4 % with it gone. Now the SHAPE is fixed stops written once
   (a Gaussian for a pulse, one sine period with `spreadMethod="repeat"` for a
   stream) and only its PLACE moves, as one `gradientTransform` per moving
   gradient, plus one opacity per wire whose level changed. A pulse is its own
   short lived glow path from a small pool, so pulses coalesce per wire per
   frame, and nothing at all is written for a wire that is still, for a
   picture scrolled off screen, or for a tab nobody is looking at. */
const PULSE_STOPS = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];   // in pulse widths from the centre
const WAVE_STOPS = 12;              // one sine period, repeated along the wire
const POOL = 8;                     // pulses alive at once on one wire; 900 ms each is 9 a second
let seq = 0;

const make = (tag, attrs) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

export function createBayTraffic() {
  const wires = [];
  const seen = new WeakMap();        // svg -> on screen
  const io = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((es) => { for (const e of es) seen.set(e.target, e.isIntersecting); })
    : null;

  function gradient(row, id, stops, extra = {}) {
    const g = make('linearGradient', { id, gradientUnits: 'userSpaceOnUse', ...extra });
    for (const [off, op] of stops) {
      const st = make('stop', { offset: off.toFixed(4), 'stop-opacity': op.toFixed(3) });
      st.style.stopColor = `var(--md-${row.medium})`;
      g.append(st);
    }
    row.defs.append(g);
    return g;
  }

  function attach(row) {
    const path = row.view.wires.get(row.linkId);
    if (!path || path === row.path) return !!path;
    const svg = path.ownerSVGElement;
    if (io && !seen.has(svg)) { seen.set(svg, true); io.observe(svg); }
    row.defs = make('defs', {});
    svg.prepend(row.defs);
    const len = path.getTotalLength(), a = path.getPointAtLength(0), b = path.getPointAtLength(len);
    row.a = a; row.d = { x: b.x - a.x, y: b.y - a.y };
    path.style.strokeWidth = W;
    path.style.opacity = row.streamy ? IDLE : EVENT_LINE;
    row.op = null;
    const glow = (g) => {
      const e = path.cloneNode();
      e.removeAttribute('class');
      e.setAttribute('fill', 'none');
      e.setAttribute('stroke', `url(#${g.id})`);
      e.style.strokeWidth = W;
      e.style.opacity = 1;          // the clone carried the line's own dimmed opacity
      return e;
    };
    if (row.streamy) {
      // One period of the sine spans 1/k of the wire, and repeats past it.
      const stops = Array.from({ length: WAVE_STOPS + 1 }, (_, j) => [j / WAVE_STOPS, 0.5 + 0.5 * Math.sin(2 * Math.PI * (j / WAVE_STOPS))]);
      row.grad = gradient(row, `lw-${row.i}`, stops, { spreadMethod: 'repeat',
        x1: a.x, y1: a.y, x2: a.x + row.d.x / WAVE.k, y2: a.y + row.d.y / WAVE.k });
      row.glow = glow(row.grad);
      row.glow.style.opacity = 0;
      row.glowOp = '0';
      row.tf = '';
      path.after(row.glow);
    } else {
      // A Gaussian centred on the middle of the wire's own vector, moved by
      // translating the gradient; past either end it pads out to nothing.
      // The end stops are 0 rather than exp(-4), or the pad would tint the whole wire.
      const stops = PULSE_STOPS.map((x) => [0.5 + x * PULSE.w, Math.abs(x) === 2 ? 0 : Math.exp(-(x * x))]);
      row.pool = Array.from({ length: POOL }, (_, j) => {
        const g = gradient(row, `lw-${row.i}-${j}`, stops, { x1: a.x, y1: a.y, x2: a.x + row.d.x, y2: a.y + row.d.y });
        const e = glow(g);
        e.setAttribute('display', 'none');
        path.after(e);
        return { g, e, t0: 0, live: false };
      });
    }
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
      const shown = seen.get(row.path.ownerSVGElement) !== false;
      if (row.streamy) {
        row.level += ((flowing ? 1 : 0) - row.level) * Math.min(1, dt / FADE_MS);
        if (row.level < 0.002 && !flowing) row.level = 0;
        if (!shown) continue;
        const op = (IDLE + (FLOW - IDLE) * row.level).toFixed(3);
        if (op !== row.op) { row.path.style.opacity = op; row.op = op; }
        const gop = (row.level * WAVE.depth).toFixed(3);
        if (gop !== row.glowOp) { row.glow.style.opacity = gop; row.glowOp = gop; }
        if (row.level > 0) {
          // shade(x) = sin(2 pi (x k - ph)): the bands move out to in by ph / k of the wire
          const f = ((t / 1000) * WAVE.perSec) % 1 / WAVE.k;
          const tf = `translate(${(row.d.x * f).toFixed(2)} ${(row.d.y * f).toFixed(2)})`;
          if (tf !== row.tf) { row.grad.setAttribute('gradientTransform', tf); row.tf = tf; }
        }
      } else {
        // Events that arrive in one frame are one pulse: they would be drawn
        // on top of each other anyway. Off screen, nothing starts.
        if (n > 0 && shown) {
          const free = row.pool.find((p) => !p.live);
          if (free) { free.live = true; free.t0 = t; free.e.removeAttribute('display'); }
        }
        for (const p of row.pool) {
          if (!p.live) continue;
          const u = (t - p.t0) / PULSE.ms;
          if (u >= 1 || !shown) { p.live = false; p.e.setAttribute('display', 'none'); continue; }
          // from just before the outlet to just past the inlet, as before
          const c = -PULSE.w * 2 + (1 + PULSE.w * 4) * u - 0.5;
          p.g.setAttribute('gradientTransform', `translate(${(row.d.x * c).toFixed(2)} ${(row.d.y * c).toFixed(2)})`);
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /** Shade the wire `linkId` in `view`, fed by `read(t)`. */
  function add(view, linkId, medium, read) {
    wires.push({ i: ++seq, view, linkId, medium, read, streamy: STREAMY.includes(medium),
      path: null, level: 0 });
  }
  /** Stop shading the wire `linkId` in `view`: its row is no longer read
   *  and what it put in the picture goes. Answers how many rows went. */
  function remove(view, linkId) {
    let gone = 0;
    for (let i = wires.length - 1; i >= 0; i--) {
      const row = wires[i];
      if (row.view !== view || row.linkId !== linkId) continue;
      row.defs?.remove();
      row.glow?.remove();
      for (const p of row.pool || []) p.e.remove();
      wires.splice(i, 1);
      gone++;
    }
    return gone;
  }
  return { add, remove, size: () => wires.length };
}

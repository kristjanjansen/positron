// demo/sync/follow.mjs: the FOLLOW tab of /sync/, which was the whole of
// /sync/ until 2026-10-04 and moved here unchanged in behaviour
// (plans/plan-demo-structure.md §3.1, step 4).
//
// 🔴 ONE PAGE FOR plans/plan-routing-time.md, asked 2026-10-04 as *"Put to
// single demo"* after step 2 was offered as `/partitur/` plus `/wall/`. A
// score sends a cue every two seconds, and each cue belongs to a moment of a
// picture that reaches this screen late, by the lag positron MEASURED on the
// link chosen. Two walls take the same cues: the left fires each one the
// moment its message arrives, the right asks `demo/shell/timebase.mjs` when
// the picture will show that moment here and fires then.
//
// ⚠️ THE LINKS ARE MODELLED, NOT OPENED, AND THAT IS THE POINT OF THIS TAB.
// The picture is drawn in this tab and held back by a lag function shaped
// like the measurements (plan-routing-time §3): WebRTC 67 ms with a few ms of
// jitter, LL-HLS 4 s that steps to 6 s on a stall and back on a drift-seek,
// the Pi's audio 175 ms. The cue messages ride a light link of about 30 ms,
// the relay's measured pub to subscriber leg. So the tab opens nothing and
// asks no server for anything; what it grades is the timebase's policy
// against those shapes, which is what the plan's step 2 needed graded first.
//
// ⚠️ ONE MACHINE, SO THE PEER CLOCK IS THIS PAGE'S OWN: `setOffset(0)`.
// Between two machines it is `peer.offsetMs()`, which agrees to about 3 ms
// (MEASURED in the old /jam/, and graded on one machine in the AHEAD tab).
// The negative control below runs the same score with the offset left
// unagreed, and the following wall must then fire nothing.

import { createVideoPanel } from '/shell/video-panel.mjs';
import { createChoice } from '/shell/choice.mjs';
import { createTimebase } from '/shell/timebase.mjs';

const CUE_MS = 2000;           // one cue every two seconds of the score
const LIGHT_MS = 30;           // the relay leg a cue message rides, MEASURED 27 to 38 ms
const FRAME_MS = 1000 / 60;    // one observation of the picture per frame
const PALETTE = ['#e8b14a', '#4fc3ff', '#e0584f', '#7ccf6b', '#b48cf0', '#f0f0f0'];

// Each link: its lag at score time t (ms since the start), and the light
// link's own leg, both with a seeded jitter so the self check is repeatable.
const LINKS = {
  whep: { name: 'WebRTC', note: '67 ms', lag: (t, r) => 67 + (r() - 0.5) * 8 },
  llhls: {
    name: 'LL-HLS', note: '4 s, steps', lag: (t) => {
      // 4 s, a stall that adds 2 s at 10 s into every 18 s, a drift-seek back at 0
      const p = t % 18000;
      return p < 10000 ? 4000 : 6000;
    },
  },
  pcm: { name: 'Pi audio', note: '175 ms', lag: (t, r) => 175 + (r() - 0.5) * 12 },
};

function rng(seed) {   // mulberry32
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The whole model, one step at a time, with no clock and no element of its
 * own: the live tab steps it from requestAnimationFrame, the self check
 * steps it in a loop. Times are local ms; with offset 0 local IS shared.
 * Every surface is SEEN on a frame, so every time recorded is the frame on
 * which that surface changed: the picture when its score time crosses the
 * cue, the arrival wall when the message is in, the following wall when the
 * timebase's answer has come due. Timing one exactly and the others by frame
 * would grade a frame of rounding as an error of the policy.
 */
function createRun(key, start, { offset = 0, seed = 7 } = {}) {
  const L = LINKS[key], r = rng(seed);
  const tb = createTimebase({ offsetMs: offset });
  // The picture's stamps are score times on the shared clock: offset 0.
  tb.link('stage', { stampOffsetMs: 0 });
  const S = (k) => start + 1000 + k * CUE_MS;
  // `at` is the cue's moment on the shared clock, the same name it carries on
  // the wire; `sent` is the envelope's send stamp and is not used here.
  const cues = [];          // { k, at, arrives, arrivedAt, picAt, followAt, held }
  let next = 0, lastObs = -Infinity, lag = L.lag(0, r);
  const now = { picture: -1, arrival: -1, follow: -1, src: 0, lag: 0 };
  function step(t) {
    // The picture: what score time is on the glass now.
    if (t - lastObs >= FRAME_MS - 0.01) {
      lastObs = t;
      lag = L.lag(t - start, r);
      tb.observe('stage', { local: t, stamp: t - lag });
    }
    const src = t - lag;
    now.src = src - start; now.lag = lag;
    // Cues leave the score at their moment and arrive one leg later.
    while (S(next) <= t) {
      cues.push({ k: next, at: S(next), arrives: S(next) + LIGHT_MS + (r() - 0.5) * 8,
                  arrivedAt: null, picAt: null, followAt: null, held: '' });
      next++;
    }
    for (const c of cues) {
      // the frame the glass crossed it, or a drift-seek jumped past it
      if (c.picAt == null && src >= c.at) c.picAt = t;
      if (c.arrivedAt == null && t >= c.arrives) c.arrivedAt = t;
      if (c.arrivedAt != null && c.followAt == null) {
        const v = tb.decide({ at: c.at, follow: 'stage' }, t);
        if (v.act === 'fire' || v.act === 'missed') c.followAt = t;
        else if (v.act === 'hold') c.held = v.why;
      }
    }
    // What each surface shows: the newest cue it has reached.
    now.picture = Math.floor((src - start - 1000) / CUE_MS);
    now.arrival = -1; now.follow = -1;
    for (const c of cues) {
      if (c.arrivedAt != null && c.arrivedAt <= t) now.arrival = c.k;
      if (c.followAt != null && c.followAt <= t) now.follow = c.k;
    }
    return now;
  }
  // Per cue: how early the arrival wall was, and how far off the following one was.
  const done = () => cues.filter((c) => c.picAt != null && c.arrivedAt != null);
  const early = () => done().map((c) => c.picAt - c.arrivedAt);
  const off = () => done().filter((c) => c.followAt != null).map((c) => c.followAt - c.picAt);
  return { step, cues, early, off, tb, now, moves: () => tb.stats('stage').moves };
}

// The same model stepped in a loop over 40 s of score per link, one step a
// frame, so the numbers are the tab's own and not a paraphrase of them.
function simulate(k, { offset = 0, seconds = 40 } = {}) {
  const R = createRun(k, 0, { offset });
  for (let t = 0; t <= seconds * 1000; t += FRAME_MS) R.step(t);
  return R;
}
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const worst = (xs) => xs.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// What this tab is, in the fixed box under the tab row (`tab-page.mjs` rule 6).
export const about = 'A modelled picture arrives late, and two walls get the same cues, one firing on arrival and one waiting for the picture. Pick how the picture travels to change how late it is.';

export const readout = { 'picture late': 'ms', 'cue early': 'ms', 'off by': 'ms', 'delay jumps': '' };

export function build({ panel, log, set }) {
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d');
  const video = createVideoPanel({ media: canvas, left: false });

  let key = 'whep', run = createRun(key, performance.now());
  const link = createChoice({
    label: 'picture over', options: Object.entries(LINKS).map(([k, l]) => [l.name, k]), at: 0,
    title: (k) => `${LINKS[k].name}, ${LINKS[k].note} behind, as measured`,
    onPick: (k) => { key = k; run = createRun(key, performance.now()); log(`the picture now arrives over ${LINKS[k].name}, ${LINKS[k].note} behind`); },
  });
  panel.add(link.el, video.el);

  let W = 0, H = 0, dpr = 1;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = video.stage.getBoundingClientRect();
    // A closed tab measures 0: keep the last size rather than drawing for a
    // screen nobody has.
    if (!r.width) return;
    W = Math.max(240, Math.round(r.width));
    H = Math.max(140, Math.round(r.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  new ResizeObserver(size).observe(video.stage);
  size();

  const ink = (hex) => {
    const [r, gg, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return (r * 299 + gg * 587 + b * 114) / 1000 > 128 ? '#0b0e14' : '#f0f0f0';
  };
  const colour = (k) => (k < 0 ? '#0b0e14' : PALETTE[k % PALETTE.length]);
  const font = (px) => `${px}px ui-monospace, Menlo, monospace`;

  // Three surfaces: the picture across the top, the two walls under it.
  function paintBox(x, y, w, h, k, label) {
    g.fillStyle = colour(k);
    g.fillRect(x, y, w, h);
    g.fillStyle = k < 0 ? '#8a93a6' : ink(colour(k));
    g.font = font(Math.max(11, Math.round(h / 7)));
    g.fillText(label, x + 10, y + Math.max(16, Math.round(h / 6)));
    if (k >= 0) {
      g.font = font(Math.max(18, Math.round(h / 3)));
      g.fillText(`cue ${k + 1}`, x + 10, y + h - Math.max(12, Math.round(h / 6)));
    }
  }
  function paint(n) {
    if (!W) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0b0e14';
    g.fillRect(0, 0, W, H);
    const gap = 2, top = Math.round(H * 0.55);
    paintBox(0, 0, W, top - gap, n.picture, `picture, ${(Math.max(0, n.src) / 1000).toFixed(1)} s of the score`);
    const half = Math.floor((W - gap) / 2);
    paintBox(0, top, half, H - top, n.arrival, 'on arrival');
    paintBox(half + gap, top, W - half - gap, H - top, n.follow, 'following the picture');
  }

  const last = (xs) => (xs.length ? xs[xs.length - 1] : null);
  let frames = 0, raf = 0;
  function tick() {
    const t = performance.now();
    const n = run.step(t);
    paint(n);
    frames++;
    if (frames % 6 === 0) {
      const lag = run.tb.lag('stage', t);
      set('picture late', lag == null ? '' : Math.round(lag));
      const e = last(run.early()), o = last(run.off());
      set('cue early', e == null ? '' : Math.round(e));
      set('off by', o == null ? '' : Math.round(o));
      set('delay jumps', run.moves());
    }
    raf = requestAnimationFrame(tick);
  }

  return {
    // The model keeps its own time, so a tab nobody is looking at stops
    // drawing and loses nothing: the score is wall-clock, and the next frame
    // shows wherever it has got to.
    show() { if (!raf) raf = requestAnimationFrame(tick); },
    hide() { cancelAnimationFrame(raf); raf = 0; },

    async check({ A }) {
      // One frame on a steady link. Across a step, the three frames the
      // timebase waits before it believes one (stepCount), which is the price
      // of not moving a caption on one late reading.
      for (const k of Object.keys(LINKS)) {
        const R = simulate(k);
        const e = R.early(), o = R.off();
        const allow = k === 'llhls' ? 3 * FRAME_MS + 1 : FRAME_MS + 1;
        const same = o.filter((x) => Math.abs(x) < 1).length;
        A(`${LINKS[k].name}: the following wall lands within ${k === 'llhls' ? 'three frames' : 'one frame'} of the picture on every cue`,
          o.length >= 15 && o.length === e.length && worst(o) <= allow,
          `${o.length} cues, ${same} on the very frame the picture changed, worst ${worst(o).toFixed(1)} ms off, the arrival wall a median ${med(e).toFixed(0)} ms early, ${R.moves()} lag step(s) followed`);
      }
      // The arrival wall is early by the link's lag less the cue's own leg:
      // the instrument can tell the two walls apart, or the check above
      // proves nothing.
      const H2 = simulate('llhls');
      A('LL-HLS: the arrival wall is seconds early and the following wall follows both lag steps',
        med(H2.early()) > 3000 && H2.moves() >= 3 && worst(H2.off()) <= 3 * FRAME_MS + 1,
        `arrival a median ${med(H2.early()).toFixed(0)} ms early, ${H2.moves()} steps, following worst ${worst(H2.off()).toFixed(1)} ms`);
      // ⚠️ THE NEGATIVE CONTROL: no agreed peer clock, so nothing can be told
      // and the following wall must HOLD every cue rather than fire on a guess.
      const N = simulate('whep', { offset: null });
      const fired = N.cues.filter((c) => c.followAt != null).length;
      const why = (N.cues.find((c) => c.held) || {}).held || '';
      A('NEGATIVE CONTROL: with no peer clock agreed the following wall fires nothing and says why',
        fired === 0 && N.early().length >= 15 && /no peer clock/.test(why),
        `${fired} fired of ${N.cues.length}, held because "${why}"`);
      // The live tab: once the picture has reached cue 1 over WebRTC, the top
      // surface is that cue's colour and not the empty dark. Waited for rather
      // than slept, because the tab may have been built a moment ago.
      const by = performance.now() + 2500;
      while ((run.now.picture < 0 || frames < 10) && performance.now() < by) await sleep(50);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const px = g.getImageData(Math.round(20 * dpr), Math.round(H * 0.3 * dpr), 1, 1).data;
      const hex = '#' + [...px.slice(0, 3)].map((v) => v.toString(16).padStart(2, '0')).join('');
      A('the live tab draws: the picture shows a cue colour once it reaches cue 1',
        frames > 10 && PALETTE.includes(hex), `${frames} frames, the picture reads ${hex}`);
    },
  };
}

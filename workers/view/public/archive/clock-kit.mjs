// demo/archive/clock-kit.mjs: what clock/020 to clock/050 share (numbered
// as renumbered 2026-10-12), so four pages do not carry four copies of it. Written 2026-10-12 beside them.
//
// ⚠️ PAGE HELPERS, NOT KIT. It is what Shared clock (clock/030) first wrote inline (plain names on
// screen with the real id on hover, one sound card read against the true clock)
// lifted once. 000, 010, 060 and 070 keep their own copies,
// because another agent was editing them when this was written.
import { epochNow } from '/proto/looper/peer.mjs';

export const rand = (n) => Math.random().toString(36).slice(2, 2 + n).padEnd(n, '0');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const fmt = (x) => Math.round(x * 100) / 100;
export const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };
/** The value furthest from zero, sign kept. */
export const worst = (xs) => xs.reduce((w, v) => (Math.abs(v) > Math.abs(w) ? v : w), 0);
/** Green inside 3 ms, amber inside 20, red past it, as clock/030 colours a beat. */
export const band = (ms) => (Math.abs(ms) < 3 ? '#8fd6a8' : Math.abs(ms) < 20 ? '#ffd400' : '#e0908a');

export const graphOf = (site, label, nodes, ports) => ({ v: 1, site, place: 'browser', kind: 'browser', label, nodes, ports });

/**
 * One sound card for every place in the tab, read against the true clock.
 * `anchor` pairs an epoch ms with an audio time, the tightest of five reads,
 * so `audioOf(T)` is the audio time at which the TRUE clock reads `T`.
 */
export function soundCard({ sampleRate } = {}) {
  const S = { ctx: null, anchor: null, live: new Set() };
  S.open = async () => {
    if (S.ctx) return S.ctx;
    S.ctx = new AudioContext(sampleRate ? { latencyHint: 'interactive', sampleRate } : { latencyHint: 'interactive' });
    await S.ctx.resume();
    const t0 = S.ctx.currentTime;
    for (let i = 0; i < 40 && S.ctx.currentTime - t0 < 0.05; i++) await sleep(10);
    return S.ctx;
  };
  S.reanchor = () => {
    let best = null;
    for (let i = 0; i < 5; i++) {
      const w1 = epochNow(), a = S.ctx.currentTime, w2 = epochNow();
      if (!best || w2 - w1 < best.spread) best = { e: (w1 + w2) / 2, a, spread: w2 - w1 };
    }
    S.anchor = best;
  };
  S.audioOf = (T) => S.anchor.a + (T - S.anchor.e) / 1000;
  S.epochOf = (a) => S.anchor.e + (a - S.anchor.a) * 1000;
  /** A short click at audio time `at`, stopped on `hush()`. */
  S.click = (at, hz, gain = 0.2) => {
    const ctx = S.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = hz;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    o.connect(g).connect(ctx.destination);
    o.start(at); o.stop(at + 0.06);
    S.live.add(o); o.onended = () => S.live.delete(o);
  };
  S.hush = () => { for (const o of S.live) { try { o.stop(); } catch { /* not started */ } } S.live.clear(); };
  return S;
}

/**
 * Plain names on screen, the real ids on hover (clock/030's way, positron-concepts:
 * port names are simulated). `show` maps a real site id to `web-1`, `web-2`.
 * `extra(id)` may add a second hover line for one box.
 */
export function plainNames(show, room, extra = () => '') {
  const plain = (id) => { const [s, ...r] = String(id).split(':'); return [show.get(s) ?? s, ...r].join(':'); };
  const realOf = new Map();
  const named = (src) => ({
    nodes: () => src.nodes().map((n) => { const id = plain(n.id); realOf.set(id, n.id); return { ...n, id }; }),
    ports: () => src.ports().map((p) => ({ ...p, id: plain(p.id) })),
    links: () => src.links().map((l) => ({ ...l, from: plain(l.from), to: plain(l.to) })),
  });
  function hovers(root, relay) {
    const fix = () => {
      for (const g of root.querySelectorAll('.lv-box')) {
        if (g.querySelector('title')) continue;
        const id = g.querySelector('.lv-title')?.textContent || '';
        const isRelay = id === `cf-relay:${relay}`;
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        const more = isRelay ? '' : extra(id);
        t.textContent = isRelay ? `simulated name, real room ${room}`
          : `simulated name, real id ${realOf.get(id) || id}${more ? `\n${more}` : ''}`;
        g.prepend(t);
        if (isRelay) for (const f of g.querySelectorAll('.lv-f')) if (f.textContent === 'Cloudflare') f.textContent = 'relay room';
      }
    };
    new MutationObserver(fix).observe(root, { childList: true, subtree: true });
    fix();
  }
  return { plain, named, hovers };
}

// `fitOnResize` lived here until 2026-10-12. The strip's own `live` mode
// (timeline/strip.mjs `startLive`) fits the whole run at every width now.

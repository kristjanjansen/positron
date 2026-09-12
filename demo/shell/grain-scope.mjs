// demo/shell/grain-scope.mjs — see the grains, whoever is making them.
//
// Time runs left to right and falls off the left edge. The vertical axis is
// WHERE IN THE HELD SECONDS a grain read from, which is the axis you can hear:
// the scan head walking, the spray scattering around it, a freeze collapsing
// everything onto one line.
//
// 🔴 IT DOES NOT CARE WHERE THE GRAINS COME FROM, and that is the whole point.
// Three sources, three different amounts of knowledge, and the picture SAYS
// WHICH — because this project's colour rule is that a mark's colour reports
// HOW IT LANDED and never which lane it is in:
//
//   mark()    a source that STARTS grains told us about one.   green, filled
//             The browser granulator can do this; it is the code that fires
//             them. This is a measurement.
//
//   feed()    we only have the audio. An envelope, and onsets picked out of
//             it.                                              slate, hollow
//             The Raspberry Pi can only ever be this: it sends PCM and no
//             events, so "a grain fired" is inferred and might be a note, a
//             delay tap or a reverb swell. Slate is this project's colour for
//             "it happened and this lane cannot say how well".
//
//   expect()  nothing has happened yet; these are the grains the PARAMETERS
//             imply.                                           outline only
//             A picture drawn from settings is a CLAIM, not a measurement, and
//             it is drawn as an outline so it can never be mistaken for one.
//             This is the same rule as a strip's unplayed marks.
//
// ⚠️ AND IT SAYS SO IN WORDS. A legend of three colours is a legend; a line
// that reads `48 grains measured · from the browser engine` is the gutter rule
// — what this lane MEASURED, in the place the ink is, so nobody has to join a
// colour to a meaning across two elements.
//
// ⚠️ NOTHING IS INFERRED SILENTLY. If a page only has audio, the scope says
// "inferred from the sound" rather than drawing confident green marks. A
// visualiser that looks the same whether or not anybody is telling it the truth
// is decoration.

import { el } from './shell.mjs';

/**
 * @param {HTMLElement} host
 * @param {object} [o]
 * @param {number} [o.seconds]  how much history is on screen
 * @param {number} [o.height]   css pixels
 * @returns {object}
 */
export function createGrainScope(host, { seconds = 4, height = 150 } = {}) {
  const wrap = el('div', 'pos-scope');
  const canvas = el('canvas', 'pos-scope-c');
  const gut = el('div', 'pos-scope-gut', 'nothing yet');
  wrap.append(canvas, gut);
  host.append(wrap);

  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const tok = (n, fb) => (css.getPropertyValue(n) || '').trim() || fb;
  const C = {
    field: tok('--card', '#141922'),
    line: tok('--line', '#232c3a'),
    dim: tok('--dim2', '#7a879c'),
    measured: tok('--ok', '#6ee7a8'),
    inferred: tok('--dim', '#9aa7bd'),
    expected: tok('--line2', '#32405a'),
    hi: tok('--hi', '#ffd400'),
  };

  let dpr = 1, W = 0, H = 0;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = wrap.getBoundingClientRect();
    W = Math.max(200, Math.round(r.width));
    H = height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
  }
  size();
  new ResizeObserver(size).observe(wrap);

  // ── state ────────────────────────────────────────────────────────────────
  const marks = [];        // {t, dur, pos, pan, level, how}
  const env = [];          // {t, v} — the audio envelope, when that is all we have
  let expectation = null;  // {rate, sizeMs, scan, spray}
  let sourceName = '';
  let counts = { measured: 0, inferred: 0 };
  let t0 = performance.now() / 1000;
  const now = () => performance.now() / 1000 - t0;

  // Onset picking for the audio-only case. Deliberately crude and deliberately
  // LABELLED: a peak in a 5 ms envelope is "something started", and calling it
  // a grain would be inventing knowledge we do not have.
  let envAcc = 0, envN = 0, envLast = 0, envPrev = 0, envMed = 0;

  function push(m) {
    marks.push(m);
    if (m.how === 'measured') counts.measured++; else counts.inferred++;
    const cut = now() - seconds - 0.5;
    while (marks.length && marks[0].t < cut) marks.shift();
    while (env.length && env[0].t < cut) env.shift();
  }

  // ── the API ──────────────────────────────────────────────────────────────
  const api = {
    el: wrap, canvas,

    /** A source that STARTS grains reporting one. The only measured case. */
    mark(g) {
      push({ t: now(), dur: g.dur ?? 0.1, pos: g.pos ?? 0.5, pan: g.pan ?? 0,
             level: g.level ?? 1, how: 'measured' });
    },

    /** Many at once — a worklet batches, because one message per grain is a
     *  main thread doing plumbing instead of drawing. `ct` is the source's own
     *  clock; only the SPACING between them is trusted, since two clocks cannot
     *  be compared without a shared origin. */
    marks(list, ct) {
      if (!list?.length) return;
      const base = now();
      const last = list[list.length - 1].t;
      for (const g of list) {
        push({ t: base - (last - g.t), dur: g.dur, pos: g.pos, pan: g.pan,
               level: g.level, how: 'measured' });
      }
    },

    /**
     * Audio, and nothing else. Draws an envelope and picks onsets out of it,
     * both marked INFERRED — this is what a stream from another machine can
     * honestly support.
     */
    feed(pcm, rate = 48000) {
      const t = now();
      const win = Math.max(1, Math.round(rate * 0.005));
      for (let i = 0; i < pcm.length; i++) {
        envAcc += pcm[i] * pcm[i]; envN++;
        if (envN >= win) {
          const v = Math.sqrt(envAcc / envN);
          envAcc = 0; envN = 0;
          env.push({ t, v });
          // A running median stands in for a threshold, so a quiet passage does
          // not read as a stream of onsets and a loud one as none.
          envMed = envMed ? envMed * 0.995 + v * 0.005 : v;
          if (v > envMed * 1.9 && envPrev <= envMed * 1.9 && t - envLast > 0.012) {
            envLast = t;
            push({ t, dur: 0.05, pos: 0.5, pan: 0, level: Math.min(1, v / (envMed * 4 || 1)), how: 'inferred' });
          }
          envPrev = v;
        }
      }
      if (env.length > 4000) env.splice(0, env.length - 4000);
    },

    /** What the parameters imply. Outline only — it is a claim. */
    expect(p) { expectation = p; },

    /** Said in the gutter, so the picture is attributable. */
    source(name) { sourceName = name; },

    clear() { marks.length = 0; env.length = 0; counts = { measured: 0, inferred: 0 }; },
    stats: () => ({ ...counts, onScreen: marks.length }),
  };

  // ── paint ────────────────────────────────────────────────────────────────
  function paint() {
    const t = now();
    const x0 = t - seconds;
    const X = (tt) => ((tt - x0) / seconds) * W;
    const Y = (p) => 6 + (1 - p) * (H - 12);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = C.field; ctx.fillRect(0, 0, W, H);

    // Where in the held seconds. Three lines is enough to read a scan by, and
    // more would compete with the grains.
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    for (const p of [0, 0.5, 1]) {
      ctx.beginPath(); ctx.moveTo(0, Y(p) + 0.5); ctx.lineTo(W, Y(p) + 0.5); ctx.stroke();
    }

    // ── expected: WHEN the parameters say a grain is due, and only when ──
    // ⚠️ TIMING ONLY, ALONG THE BOTTOM EDGE. This first drew boxes at the scan
    // POSITION, and it was wrong in a way worth keeping a note about: a
    // granulator in follow mode reads at a fixed distance behind a write head
    // this component cannot see, so the marks drifted upward while the outline
    // sat flat at the middle — an outline claiming a position it has no way to
    // know, directly beside measured marks disagreeing with it. Rate IS
    // predictable from the settings. Position is not. So the claim is reduced
    // to the part that can be made honestly.
    if (expectation?.rate > 0) {
      const { rate } = expectation;
      const step = 1 / rate;
      // Above ~120 a second the ticks merge into a bar and say nothing.
      if (rate <= 120) {
        ctx.strokeStyle = C.expected; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let tt = Math.ceil(x0 / step) * step; tt < t; tt += step) {
          const x = X(tt) + 0.5;
          ctx.moveTo(x, H - 1); ctx.lineTo(x, H - 7);
        }
        ctx.stroke();
      }
    }

    // ── inferred: the envelope, as a band ────────────────────────────────
    if (env.length > 1) {
      let peak = 0; for (const e of env) if (e.v > peak) peak = e.v;
      const k = peak > 0 ? 1 / peak : 0;
      ctx.beginPath();
      ctx.moveTo(X(env[0].t), H - 1);
      for (const e of env) ctx.lineTo(X(e.t), H - 1 - e.v * k * (H * 0.42));
      ctx.lineTo(X(env[env.length - 1].t), H - 1);
      ctx.closePath();
      ctx.fillStyle = C.line; ctx.fill();
    }

    // ── the grains ───────────────────────────────────────────────────────
    for (const m of marks) {
      const x = X(m.t);
      if (x < -20 || x > W + 20) continue;
      const w = Math.max(1.5, (m.dur / seconds) * W);
      const y = Y(m.pos);
      // Pan is the mark's VERTICAL THICKNESS rather than a second colour: a
      // grain hard left and a grain hard right are the same event with a
      // different position in the field, and colour here already means how the
      // mark landed.
      const h = 2 + Math.abs(m.pan || 0) * 3;
      ctx.globalAlpha = 0.25 + 0.75 * Math.min(1, m.level ?? 1);
      if (m.how === 'measured') {
        ctx.fillStyle = C.measured;
        ctx.fillRect(x, y - h / 2, w, h);
      } else {
        ctx.strokeStyle = C.inferred; ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y - h / 2 + 0.5, w, h);
      }
    }
    ctx.globalAlpha = 1;

    // The present, so the picture has a right-hand edge that means something.
    ctx.strokeStyle = C.hi; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W - 0.5, 0); ctx.lineTo(W - 0.5, H); ctx.stroke();

    ctx.restore();

    // ⚠️ THE GUTTER SAYS WHAT THIS IS, because a picture of grains drawn from
    // parameters and a picture drawn from reported grains look alike and mean
    // completely different things.
    const per = marks.filter((m) => m.t > t - 1).length;
    gut.textContent = counts.measured
      ? `${per} grains a second, measured — ${sourceName || 'the engine reports each one as it fires'}`
      : counts.inferred
        ? `${per} onsets a second, inferred from the sound — ${sourceName || 'nothing here reports grains, so this is what the audio shows'}`
        : expectation
          ? `nothing measured yet — the outline is what the settings imply${sourceName ? ` · ${sourceName}` : ''}`
          : 'nothing yet';

    raf = requestAnimationFrame(paint);
  }
  let raf = requestAnimationFrame(paint);
  api.stop = () => cancelAnimationFrame(raf);
  return api;
}

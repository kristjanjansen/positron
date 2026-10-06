// demo/partitur/wall.mjs: the WALL tab of /partitur/, from the old /wall/.
//
// 🔴 A PROJECTION WALL ANY SCREEN CAN BECOME, asked 2026-10-04 after *"how
// universl patchbay and timeline relate"*: the smallest step is a timeline lane
// with a destination, and a destination has to exist first. Open this tab on a
// projector, a television's browser or a phone, press Become a wall, and it
// joins the studio's room as a patchbay node with one `light` input (a `value`
// of three channels) and one captions input. The SCORE tab links its light lane
// to it; `/patchbay/` draws it.
// 🔴 ONE PAGE WITH THE SCORE SINCE 2026-10-05, asked *"unify partitur and wall
// to tabbed page"*. `/wall/` is gone with no redirect, as the 2026-10-04
// regrouping did it.
// WHAT CHANGED ON THE WAY IN, AND WHY:
//   1  🔴 IT JOINS ON A PRESS, NOT ON LOAD. The old page sat in `studio-1` the
//      moment it opened. Building this tab opens nothing (`tab-page.mjs` rule 1).
//   2  🔴 THE ROOM IS THE PAGE'S `?room=` WHEN IT HAS ONE. The old page ignored
//      it and announced into the real `studio-1`, so every suite run put a fake
//      wall on the owner's patchbay (plans/plan-stage-patchbay.md F6). The
//      harness hands every run a room of its own; a person gets `studio-1`.
//   3  🔴 THE ROOM, THE ANNOUNCE AND THE RE-ANNOUNCE ARE `bay-node.mjs`'s SINCE
//      2026-10-06 (plans/plan-routing-migration.md step 1), and so is the
//      choice of room: `?room=`, or a room of the run's own under the harness
//      even when no `?room=` was passed, or `studio-1` for a person.
// ⚠️ IT ONLY LISTENS AND PAINTS. It asks nobody for anything, and a colour
// arrives only because somebody linked a lane to this wall.

import { createVideoPanel } from '/shell/video-panel.mjs';
import { createButtonGroup } from '/shell/button-group.mjs';
import { createBayNode, roomFor, randomSite } from '/shell/bay-node.mjs';

/** The studio's room, or the run's own under the harness. The SCORE tab reads this too, so both tabs meet in one. */
export const ROOM = roomFor({ slug: 'partitur' });

/** Under the tab row, in the page's one fixed box. */
export const about = 'Press Become a wall on the screen that should show the light, then pick that wall under light to in SCORE from any browser.';

export const readout = { colour: '', from: '' };

export function build({ panel, log, set }) {
  const SITE = randomSite('wall');
  const PORT = `${SITE}:wall:light`;
  const CUE = `${SITE}:wall:cue`;
  const NAME = `wall ${SITE.slice(5)}`;

  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d');
  const video = createVideoPanel({ media: canvas, left: false });
  let now = { hex: '#000000', parts: [] }, caption = '', heard = 0;
  function paint() {
    const r = video.stage.getBoundingClientRect();
    // Drawn at the screen's own density, so the words below are not soft on a phone.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(160, Math.round(r.width));
    const H = Math.max(90, Math.round(r.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = now.hex;
    g.fillRect(0, 0, W, H);
    for (const p of now.parts || []) {
      const [a, b] = p.across || [0, 0.1];
      g.fillStyle = p.hex;
      g.fillRect(Math.round(a * W), 0, Math.max(2, Math.round((b - a) * W)), H);
    }
    // The cue is set in the light's own opposite, so it reads on black and on
    // yellow alike: the wall is the light, the words are a caption on it.
    if (caption) {
      const [rr, gg, bb] = [1, 3, 5].map((i) => parseInt(now.hex.slice(i, i + 2), 16));
      g.fillStyle = (rr * 299 + gg * 587 + bb * 114) / 1000 > 128 ? '#000000' : '#ffffff';
      g.font = `${Math.max(14, Math.round(H / 14))}px ui-monospace, Menlo, monospace`;
      g.fillText(caption, Math.round(W * 0.04), Math.round(H * 0.92));
    }
    // 🔴 UNTIL A LIGHT ARRIVES THE WALL SAYS WHAT IT IS AND WHAT IT IS CALLED,
    // added 2026-10-05. It was a black box either side of the press, and the
    // name SCORE lists it under (`wall ab12`) was written nowhere on the wall,
    // so with two walls open nobody could tell which one to pick.
    if (!heard) {
      g.fillStyle = '#8a93a6';
      g.font = `${Math.max(13, Math.round(H / 22))}px ui-monospace, Menlo, monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const px = Math.max(13, Math.round(H / 22));
      const lines = onAir ? [`${NAME} in ${ROOM}`, 'waiting for SCORE to link its light here'] : ['not a wall yet'];
      lines.forEach((t, i) => g.fillText(t, W / 2, H / 2 + (i - (lines.length - 1) / 2) * px * 1.6));
      g.textAlign = 'start';
      g.textBaseline = 'alphabetic';
    }
  }
  new ResizeObserver(paint).observe(video.stage);

  const GRAPH = {
    v: 1, site: SITE, place: 'browser',
    nodes: [{ id: `${SITE}:wall`, kind: 'screen', label: `wall ${SITE.slice(5)}`, place: 'browser' }],
    ports: [{ id: PORT, label: `wall ${SITE.slice(5)}`, dir: 'in', medium: 'value', shape: { channels: 3 } },
            { id: CUE, label: `wall ${SITE.slice(5)} captions`, dir: 'in', medium: 'state', shape: { schema: 'cue' } }],
  };

  let onAir = null;
  const node = createBayNode({
    room: ROOM, graphs: [GRAPH],
    log: (line, kind) => log(line, kind),
    onJoin: () => { log(`on the patchbay in ${ROOM} as ${PORT}`, 'ok'); btns.button('join').disabled = true; paint(); },
    onMessage: (m) => {
      if (m.type === 'light.set' && m.to === PORT && /^#[0-9a-f]{6}$/i.test(m.hex || '')) {
        now = { hex: m.hex, parts: Array.isArray(m.parts) ? m.parts.filter((p) => /^#[0-9a-f]{6}$/i.test(p.hex || '')) : [] };
        heard++;
        paint();
        set('colour', m.name || m.hex);
        set('from', m.sender || '');
      }
      if (m.type === 'cue.set' && m.to === CUE && typeof m.text === 'string') {
        caption = m.text.slice(0, 80);
        paint();
      }
    },
  });
  /** Join the room as a wall. Answers once the room has heard the announce. */
  function join() {
    if (!onAir) onAir = node.join();
    return onAir;
  }
  function leave() {
    node.leave();
    onAir = null;
    btns.button('join').disabled = false;
    paint();
  }

  const btns = createButtonGroup({ buttons: [
    { id: 'join', label: 'Become a wall', primary: true, onPress: () => join() },
  ] });
  panel.add(btns.el, video.el);

  return {
    port: PORT, cue: CUE, graph: GRAPH, join, leave,
    state: () => ({ hex: now.hex, caption, heard }),
    show() { paint(); },
    async check({ A, page }) {
      A('the wall describes itself as a light input and a captions input on its own site',
        GRAPH.ports.length === 2 && GRAPH.ports.every((p) => p.id.startsWith(`${SITE}:`)));
      A('building the tab joined nothing, the room waits for a press', !node.joining() && !onAir,
        node.joining() ? 'a socket is open' : 'no socket');
      // The check pass runs only under the harness, so this is the harness's room.
      A('the harness is in a room of its own, never the studio\u2019s', ROOM !== 'studio-1', ROOM);

      // 🔴 THE ROUND TRIP THE TWO OLD PAGES NEVER HAD: SCORE and this tab join
      // the run's own room, SCORE hears the wall, links its light lane to it,
      // and a stripe chosen there arrives here. Only in this pass, and only in
      // the room the harness named, so nothing reaches `studio-1`.
      const score = page.built('score');
      if (!score) { A('SCORE was built before WALL, so the round trip can run', false, 'no SCORE handle'); return; }
      const until = async (ok, ms) => { const t0 = performance.now(); while (!ok() && performance.now() - t0 < ms) await new Promise((r) => setTimeout(r, 50)); return ok(); };
      await join();
      await score.join();
      const seen = await until(() => score.registry.merged().ports.some((p) => p.id === PORT && !p.stale), 6000);
      // ⚠️ NEGATIVE CONTROL: in the room and heard, but linked by nobody.
      score.drive();
      await new Promise((r) => setTimeout(r, 300));
      A('a wall nobody linked receives nothing', seen && heard === 0, seen ? `${heard} lights arrived` : 'SCORE never heard this wall');
      const r = score.setLink('light', PORT);
      const want = (score.hexOf('yellow') || '').toLowerCase();
      score.seekTo(score.middleOf('yellow'));
      score.drive();
      const got = await until(() => now.hex.toLowerCase() === want, 6000);
      A('a light lane linked in SCORE paints this wall through the room', r.ok && got,
        `${r.ok ? 'linked' : r.why}, the wall shows ${now.hex} and yellow is ${want}, in ${ROOM}`);
      score.seekTo(0);
      score.leave();
      leave();
    },
  };
}

// demo/partitur/score.mjs: the SCORE tab of /partitur/, the page as it was
// until 2026-10-05, when *"unify partitur and wall to tabbed page"* made the
// projection wall its second tab (`./wall.mjs`).
//
// WHAT CHANGED ON THE WAY IN, AND WHY:
//   1  🔴 IT JOINS THE ROOM ON A PRESS, NOT ON LOAD (`tab-page.mjs` rule 1):
//      Find walls, the first press on the transport bar, or a scene mark.
//   2  🔴 THE ROOM IS `?room=` WHEN THE PAGE HAS ONE, so a suite run no longer
//      announces a fake score into the owner's `studio-1`
//      (plans/plan-stage-patchbay.md F6).
//   3  The checks moved from load into the page's one SELFCHECK pass. They
//      are still all on data in hand, plus one round trip to a wall in WALL.

import { el } from '/shell/shell.mjs';
import { createTransportBar } from '/shell/transport-bar.mjs';
import { createStripView } from '/shell/strip.mjs';
import { createVideoPanel } from '/shell/video-panel.mjs';
import { createChoice } from '/shell/choice.mjs';
import { createButtonGroup } from '/shell/button-group.mjs';
import { createDeck } from '/timeline/transport.mjs';
import { openWire } from '/shell/wire.mjs';
import { createRegistry } from '/shell/graph-registry.mjs';
import { createBay } from '/shell/bay.mjs';
import { ROOM } from './wall.mjs';

/*
 * 🔴 L. MOHOLY-NAGY, PARTITURSKIZZE ZU EINER MECHANISCHEN EXZENTRIK, 1924,
 * the fold-out plate in Bauhausbücher 4 (1925), played as a positron timeline.
 * Asked 2026-10-04 as *"Do it. Better name"* after
 * `research/moholy-nagy-partiturskizze-2026-10-04.md`. The plate was
 * transcribed from the public-domain scan by
 * `demo/resources/build-moholy-partiturskizze.mjs`, every row marked `seen`
 * or `inferred`, and this page only draws and plays what that file holds.
 *
 * ⚠️ NOTHING HERE IS TYPED IN SECONDS. Every position is a fraction of the
 * plate, because Moholy gave no unit, no tempo and no total length. The total
 * is a choice this page makes and says it made: the length control is the
 * only place a duration enters, and everything scales from it.
 * ⚠️ AND IT OPENS NOTHING. The data is a file in this repository and the
 * sirens are oscillators in this tab, started only by pressing play.
 */
const SRC = '/resources/moholy-partiturskizze.json';
// A file in this repository, fetched when the page loads, as it always was.
const data = await (await fetch(SRC)).json();
const [c1, c2, light, music] = data.lanes;

/** Under the tab row, in the page's one fixed box. */
export const about = 'Moholy-Nagy\u2019s 1924 stage score as a timeline, with the picture showing its light at the playhead. Press play to run it, or Find walls to send the light to a screen in the WALL tab.';

// `length` was a cell until 2026-10-05 and repeated the length control two
// blocks up; `links` says what the visitor cannot otherwise see, whether any
// lane is reaching anything.
export const readout = { light: '', sirens: '', cue: '', links: '' };

export function build({ panel, log, set }) {

  // The plate's story was a THE SCORE block here until 2026-10-05; the tab's
  // `about` line says what it is now (*"rm top desriptions"*).


  // ── time ───────────────────────────────────────────────────────────────────
  const LENGTHS = [['5 min', 300], ['8 min', 480], ['10 min', 600]];
  let totalS = data.unit.suggested.totalSeconds;
  const ms = (f) => f * totalS * 1000;

  const deck = createDeck({ items: [], adapters: {}, range: [0, ms(1)] });

  const lightSpans = light.spans.filter((s) => !s.inside);
  const lightInside = light.spans.filter((s) => s.inside);
  const sirens = music.spans.filter((s) => !s.inside);
  const sirensInside = music.spans.filter((s) => s.inside);
  const spanAt = (list, f) => list.find((s) => f >= s.from && f < s.to) || null;
  const markText = (m) => m.folge ? `${m.folge.item} (${m.folge.how})` : m.label;

  // ── the picture: the light column at the playhead, on the projection wall ─
  //
  // ⚠️ WHITE PAPER READ AS WHITE LIGHT IS AN INFERENCE, AND THE TRANSCRIPTION
  // SAYS SO. The colours are the scan's sampled means, so they are the colour
  // of a 2014 JPEG of a 1925 print, not of any lamp.
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d');
  const video = createVideoPanel({ media: canvas, left: false });
  let W = 0, H = 0, dpr = 1, lastKey = '';
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = video.stage.getBoundingClientRect();
    W = Math.max(240, Math.round(r.width));
    H = Math.max(140, Math.round(r.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    lastKey = '';
  }
  /** Paint the wall at fraction `f` into any context. Answers what it drew. */
  function paint(ctx, w, h, f) {
    const s = spanAt(lightSpans, f) || lightSpans[lightSpans.length - 1];
    ctx.fillStyle = s.hex;
    ctx.fillRect(0, 0, w, h);
    // A narrow stripe inside a wide one is a partial light at the same moment,
    // by the key. It is drawn where it stands across the column, as a band.
    const parts = lightInside.filter((x) => f >= x.from && f < x.to);
    for (const x of parts) {
      const [a, b] = x.across || [0, 0.1];
      ctx.fillStyle = x.hex;
      ctx.fillRect(Math.round(a * w), 0, Math.max(2, Math.round((b - a) * w)), h);
    }
    return { colour: s.colour, hex: s.hex, parts: parts.length };
  }
  let drawn = null;
  function draw() {
    const f = deck.position() / ms(1);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawn = { f, ...paint(g, W, H, f) };
  }

  // ── the scenes lane: marks that recall a `/patchbay/` scene ───────────────
  //
  // 🔴 A MARK IS A RECALL AT A FRACTION OF THE SCORE, asked 2026-10-04. The
  // patchbay keeps scenes and lists their names in the room as `scene.list`;
  // a mark here sends `scene.recall` with one of those names when the playhead
  // passes it while PLAYING forward. A seek, a scrub or a length change moves the
  // playhead without passing anything, so it fires nothing.
  // ⚠️ MARKS LIVE IN THIS BROWSER, in `localStorage`, which may throw or come
  // back empty, so every read and write is wrapped and the lane works without it.
  const MARKS_KEY = 'positron.partitur.sceneMarks';
  function loadMarks() {
    try {
      const got = JSON.parse(localStorage.getItem(MARKS_KEY) || '[]');
      return Array.isArray(got) ? got.filter((m) => m && Number.isFinite(m.at) && m.at >= 0 && m.at <= 1 && typeof m.name === 'string') : [];
    } catch { return []; }
  }
  const sceneMarks = loadMarks();
  function keepMarks() {
    try { localStorage.setItem(MARKS_KEY, JSON.stringify(sceneMarks)); } catch { /* full, off or private */ }
  }
  /**
   * Which marks the playhead passed. Pure: it holds only the last fraction it
   * was told. `seek(f)` moves the playhead without passing anything; `at(f,
   * playing)` answers the marks in (last, f], and only while playing forward.
   */
  function createCrosser(marksOf) {
    let last = null;
    return {
      seek(f) { last = f; },
      at(f, playing) {
        const from = last;
        last = f;
        if (!playing || from === null || !(f > from)) return [];
        return marksOf().filter((m) => m.at > from && m.at <= f);
      },
    };
  }
  const crosser = createCrosser(() => sceneMarks);
  const marksSub = () => (sceneMarks.length ? `${sceneMarks.length} mark${sceneMarks.length === 1 ? '' : 's'}` : 'no marks');

  // ── lanes ──────────────────────────────────────────────────────────────────
  const markRows = (lane, kind) => () => lane.marks.map((m, i) => ({
    at: ms(m.at ?? m.from), id: `${kind}-${m.id ?? i}`, kind, payload: m,
  }));
  const spanRows = (list, kind) => () => list.map((s, i) => ({
    at: ms(s.from), id: `${kind}-${i}`, kind, payload: { ...s, durMs: ms(s.to - s.from) },
  }));
  const bands = (list, inside) => (ctx, L, C) => {
    const top = L.y + 3, h = L.height - 6;
    for (const s of list) {
      const xa = C.x(ms(s.from)), xb = C.x(ms(s.to));
      if (xb < 0 || xa > C.width) continue;
      ctx.fillStyle = s.hex || '#888';
      ctx.fillRect(xa, top, Math.max(1, xb - xa), h);
    }
    for (const s of inside) {
      const xa = C.x(ms(s.from)), xb = C.x(ms(s.to));
      const [a, b] = s.across || [0, 0.15];
      ctx.fillStyle = s.hex || '#888';
      ctx.fillRect(xa, top + a * h, Math.max(1, xb - xa), Math.max(2, (b - a) * h));
    }
  };
  const lanes = [
    // Plain English since 2026-10-05: the plate's own words (I. Bühne, II.
    // Bühne, Licht, Ton) stay in the transcription and in the hit text.
    { id: 'c1', kind: 'c1', label: 'stage 1', subLabel: 'form, motion', height: 30, as: 'ticks',
      rows: markRows(c1, 'c1') },
    { id: 'c2', kind: 'c2', label: 'stage 2', subLabel: 'and film', height: 30, as: 'ticks',
      rows: markRows(c2, 'c2') },
    { id: 'light', kind: 'light', label: 'light', subLabel: `${lightSpans.length} stripes`, height: 34, as: 'spans',
      rows: spanRows(lightSpans, 'light'), render: bands(lightSpans, lightInside) },
    { id: 'sirens', kind: 'sirens', label: 'sirens', subLabel: 'intended only', height: 26, as: 'spans',
      rows: spanRows(sirens, 'sirens'), render: (ctx, L, C) => {
        bands(sirens, sirensInside)(ctx, L, C);
        ctx.fillStyle = C.theme.ink;
        for (const m of music.marks) {
          const x = C.x(ms(m.at));
          if (x >= 0 && x <= C.width) ctx.fillRect(x, L.y + L.height - 5, 1, 4);
        }
      } },
    { id: 'scenes', kind: 'scenes', label: 'scenes', subLabel: marksSub(), height: 26, as: 'ticks',
      rows: () => sceneMarks.map((m, i) => ({ at: ms(m.at), id: `scenes-${i}`, kind: 'scenes', payload: m })) },
  ];

  const host = el('div');
  const bar = createTransportBar(host, deck, { scrub: false, loop: false });
  const view = createStripView(host, deck, {
    size: 'auto', follow: false, gutter: 110, lanes,
    footer: { lines: 1, empty: '' },
    describeHit: (hit) => {
      const p = hit?.row?.payload;
      if (!p) return '';
      if (hit.lane?.id === 'light') return `${p.colour}, ${p.reading?.text || ''} (${p.how})`.replace(', ()', '');
      if (hit.lane?.id === 'sirens') return `siren band, ${p.colour} (${p.how})`;
      if (hit.lane?.id === 'scenes') return `recalls ${p.name}`;
      return `${markText(p)}, ${p.how}`;
    },
  });

  const length = createChoice({
    label: 'length', options: LENGTHS, at: LENGTHS.findIndex(([, s]) => s === totalS),
    title: () => 'Moholy gave no length; this page chooses one',
    onPick: (s) => setLength(s),
  });

  // ── the light lane as a patchbay source ───────────────────────────────────
  //
  // 🔴 A LANE WITH A DESTINATION, asked 2026-10-04 (*"how universl patchbay
  // and timeline relate"*, then *"Yea"*). Moholy bound his columns to stages;
  // this binds the light lane to a port. The page announces the lane in the
  // studio's room as an out port, lists every wall it hears (the WALL tab), and a pick is a
  // link checked by `bay.mjs` like any other. Once linked, every change of
  // stripe at the playhead goes to that wall, playing or scrubbing.
  const SITE = `partitur-${Math.random().toString(36).slice(2, 6)}`;
  const OUT = `${SITE}:light:out`;
  /*
   * 🔴 THREE LANES, THREE OUT PORTS, asked 2026-10-04 (*"Do"*): the light lane
   * to a wall's light, the Ton lane's siren bands to any MIDI input in the room
   * (a board input like the Circuit, or a board synth), and the stage cues to a
   * wall's captions. Each pick is a link `bay.mjs` checks, and `/patchbay/` can
   * ask for the same link with `link.request`, which this page answers.
   */
  const SOURCES = {
    light: { port: OUT, label: 'light lane', dir: 'out', medium: 'value', shape: { channels: 3 }, choice: 'light to' },
    sirens: { port: `${SITE}:light:sirens`, label: 'siren lane', dir: 'out', medium: 'midi', emits: ['note'], choice: 'sirens to' },
    cues: { port: `${SITE}:light:cues`, label: 'stage cues', dir: 'out', medium: 'state', shape: { schema: 'cue' }, choice: 'cues to' },
  };
  const GRAPH = {
    v: 1, site: SITE, place: 'browser',
    nodes: [{ id: `${SITE}:light`, kind: 'person', label: 'Partiturskizze', place: 'browser' }],
    ports: Object.values(SOURCES).map(({ port, label, dir, medium, shape, emits }) =>
      ({ id: port, label, dir, medium, ...(shape ? { shape } : {}), ...(emits ? { emits } : {}) })),
  };

  const registry = createRegistry();
  registry.ingest({ type: 'graph.announce', from: 'self', graph: GRAPH });
  const linked = { light: '', sirens: '', cues: '' };
  let lastSent = '', me = null, lastCueSent = '', sirenOut = null, sirenNote = null;
  const wallHost = el('div', 'pt-text pt-links');
  const kindOfPort = (id) => Object.keys(SOURCES).find((k) => SOURCES[k].port === id);
  const targets = (k) => registry.merged().ports.filter((p) => p.dir === 'in' && !p.stale && !p.id.startsWith(`${SITE}:`)
    && p.medium === SOURCES[k].medium && (k !== 'cues' || p.shape?.schema === 'cue'));
  function drawChoices() {
    wallHost.replaceChildren(...Object.keys(SOURCES).map((k) => {
      const options = [['none', ''], ...targets(k).map((p) => [p.label, p.id])];
      const at = Math.max(0, options.findIndex(([, v]) => v === linked[k]));
      return createChoice({ label: SOURCES[k].choice, options, at, onPick: (v) => setLink(k, v) }).el;
    }));
  }
  /** Make or break one lane's link. Answers bay's result, or `{ ok: true }` for a break. */
  function setLink(k, to) {
    const src = SOURCES[k];
    if (k === 'sirens') { sirenOff(); try { sirenOut?.wire.close(); } catch { /* */ } sirenOut = null; }
    if (!to) { linked[k] = ''; showLinks(); log(`${src.label} is linked to nothing`); drawChoices(); return { ok: true }; }
    const bay = registry.fill(createBay());
    const r = bay.link(src.port, to);
    if (!r.ok) { log(`refused ${src.port} -> ${to}: ${r.why}`, 'bad'); return r; }
    linked[k] = to;
    showLinks();
    if (k === 'light') { lastSent = ''; lastKey = ''; }
    if (k === 'cues') { lastCueSent = ''; lastKey = ''; }
    if (k === 'sirens') {
      // A board synth takes `note.on` in the board's main room; a hardware input
      // takes raw MIDI through the gate in its own room (`/patchbay/` does the same).
      const dest = bay.port(to), engine = bay.node(to.split(':').slice(0, 2).join(':'))?.kind === 'engine';
      const ch = (dest.shape?.channels || [1])[0];
      const w = openWire(dest.address || to.split(':')[0], {});
      sirenOut = { wire: w, engine, ch };
    }
    log(`${src.port} -> ${to}, linked through the patchbay`, 'ok');
    drawChoices();
    return r;
  }
  function showLinks() {
    const n = Object.values(linked).filter(Boolean).length;
    set('links', n ? `${n} of 3` : 'none');
  }
  function sendLight(f) {
    if (!linked.light || !me) return;
    const s1 = spanAt(lightSpans, f) || lightSpans[lightSpans.length - 1];
    const parts = lightInside.filter((x) => f >= x.from && f < x.to).map((x) => ({ hex: x.hex, across: x.across }));
    const key = `${s1.hex}|${parts.map((x) => x.hex).join(',')}`;
    if (key === lastSent) return;
    lastSent = key;
    wire.send({ type: 'light.set', to: linked.light, hex: s1.hex, name: s1.colour, parts, sender: 'partitur' });
  }
  /* The siren bands as held notes, one at a time, only while playing. The pitch
     is per colour and is this page's reading: Moholy's sirens have no pitch. */
  const SIREN_NOTE = { blue: 48, yellow: 55, red: 60, grey: 43, 'dark red': 52 };
  function sirenMsg(on, note) {
    const { engine, ch } = sirenOut;
    return engine ? (on ? { type: 'note.on', note, vel: 90, channel: 0 } : { type: 'note.off', note, channel: 0 })
      : { type: 'midi.send', bytes: [(on ? 0x90 : 0x80) | (ch - 1), note, on ? 90 : 0] };
  }
  function sirenOff() { if (sirenOut && sirenNote !== null) sirenOut.wire.send(sirenMsg(false, sirenNote)); sirenNote = null; }
  function sendSiren(playing, sr) {
    if (!sirenOut) return;
    const want = playing && sr ? (SIREN_NOTE[sr.colour] ?? 50) : null;
    if (want === sirenNote) return;
    sirenOff();
    if (want !== null) { sirenOut.wire.send(sirenMsg(true, want)); sirenNote = want; }
  }
  function sendCue(text) {
    if (!linked.cues || !me || text === lastCueSent) return;
    lastCueSent = text;
    wire.send({ type: 'cue.set', to: linked.cues, text, sender: 'partitur' });
  }
  /*
   * 🔴 THE ROOM IS JOINED ON A PRESS, NOT ON LOAD: Find walls, the first press
   * on the transport bar, or a scene mark that needs the room. The old page
   * joined `studio-1` the moment it opened (`tab-page.mjs` rule 1).
   */
  let wire = null, joined = null;
  function join() {
    if (joined) return joined;
    joined = new Promise((resolve) => {
      wire = openWire(ROOM, {
        onOpen: (from) => {
          me = from;
          wire.send({ type: 'graph.announce', graph: GRAPH });
          wire.send({ type: 'graph.ask' });
          find.button('find').disabled = true;
          showJoined();
          log(`in ${ROOM}, listening for walls and instruments`, 'ok');
          resolve();
        },
        onMessage: (got) => {
          if (got.kind !== 'json' || got.msg.from === me) return;
          const m = got.msg;
          if (m.type === 'graph.ask') { wire.send({ type: 'graph.announce', graph: GRAPH }); return; }
          if (m.type === 'scene.list') {
            if (Array.isArray(m.scenes)) { heardScenes.set(m.from, m.scenes.filter((n) => typeof n === 'string')); drawMarkRow(); }
            return;
          }
          // `/patchbay/` asking for one of this page's links.
          if (m.type === 'link.request' && kindOfPort(m.source)) {
            const r = setLink(kindOfPort(m.source), m.open ? m.target : '');
            wire.send({ type: 'link.state', source: m.source, target: m.target, open: !!m.open && r.ok, why: r.why || '' });
            return;
          }
          if (registry.ingest(m)) drawChoices();
        },
      });
    });
    return joined;
  }
  function leave() {
    for (const k of Object.keys(linked)) if (linked[k]) setLink(k, '');
    try { wire?.close(); } catch { /* already gone */ }
    wire = null; me = null; joined = null;
    find.button('find').disabled = false;
    showJoined();
  }
  const find = createButtonGroup({ buttons: [
    { id: 'find', label: 'Find walls', onPress: () => join() },
  ] });
  drawChoices();
  setInterval(drawChoices, 15_000);

  // The scene names each patchbay in the room last listed, by sender.
  const heardScenes = new Map();
  const sceneNames = () => [...new Set([...heardScenes.values()].flat())];
  let markWith = '';
  const markHost = el('div', 'pt-text');
  function drawMarkRow() {
    const names = sceneNames();
    if (!names.includes(markWith)) markWith = names[0] || '';
    const options = names.length ? names.map((n) => [n, n]) : [['none heard', '']];
    const choice = createChoice({ label: 'scene', options, at: Math.max(0, names.indexOf(markWith)),
      title: (v) => (v ? `a scene saved in a patchbay in ${ROOM}` : `no patchbay in ${ROOM} has listed a scene`),
      onPick: (v) => { markWith = v; } });
    const here = el('button', '', 'Mark here', { type: 'button', title: 'a mark at the playhead that recalls this scene' });
    here.onclick = () => markHere();
    const clear = el('button', '', 'Clear marks', { type: 'button', title: 'remove every mark from the scenes lane' });
    clear.onclick = () => clearMarks();
    clear.disabled = !sceneMarks.length;
    const row = el('div', 'pt-mark');
    row.append(choice.el, here, clear);
    const say = el('p', 'pt-say', 'A mark on the scenes lane recalls a scene saved in ');
    say.append(el('a', '', '/patchbay/', { href: '/patchbay/' }), ' when playback passes it.');
    markHost.replaceChildren(say, row);
  }
  function marksChanged() {
    keepMarks();
    showJoined();
    const L = view.strip.lanes().find((x) => x.id === 'scenes');
    if (L) L.subLabel = marksSub();
    view.strip?.invalidate?.();
    drawMarkRow();
  }
  function markHere() {
    if (!markWith) { join(); log(`no scene heard yet, save one in a patchbay in ${ROOM} first`, 'warn'); return; }
    const f = deck.position() / ms(1);
    sceneMarks.push({ at: f, name: markWith });
    sceneMarks.sort((a, b) => a.at - b.at);
    // The mark is under the playhead now, so it is not passed until it is passed.
    crosser.seek(f);
    marksChanged();
    log(`a mark at ${(f * 100).toFixed(1)} per cent of the score recalls ${markWith}`, 'ok');
  }
  function clearMarks() {
    sceneMarks.length = 0;
    marksChanged();
    log('every scene mark removed');
  }
  function sendRecall(m) {
    if (!me) { log(`passed the mark for ${m.name}, and this page is not in ${ROOM} to ask for it`, 'warn'); return; }
    wire.send({ type: 'scene.recall', name: m.name });
    log(`passed the mark for ${m.name}, the room was asked to recall it`);
  }
  drawMarkRow();
  window.addEventListener('pagehide', () => sirenOff());

  /*
   * 🔴 THE PICTURE AND THE TIMELINE FIRST, ONE SURFACE, AND THE LINKING UNDER
   * THEM. Until 2026-10-05 the tab stacked the length, Find walls, three link
   * picks, a sentence about scenes and the mark row ABOVE the picture, about
   * 650 px at the desk and 960 on a phone before the thing a visitor came to
   * see, and the three picks read `none` with nothing to pick until the room
   * was joined. Now the picks and the scene marks appear when the room is
   * joined (or when this browser already keeps marks), so what a first visit
   * shows is the score, its length, and one button.
   */
  const links = el('div', 'pt-text');
  links.append(find.el, wallHost, markHost);
  function showJoined() {
    wallHost.hidden = !joined;
    markHost.hidden = !joined && !sceneMarks.length;
  }
  showJoined();
  showLinks();
  panel.add(video.glue(bar.el, view.surface), length.el, links);

  /** Rescale everything from fractions. The playhead keeps its place on the plate. */
  function setLength(s, quiet = false) {
    const f = deck.position() / ms(1);
    totalS = s;
    deck.setRange([0, ms(1)]);
    deck.seek(ms(f));
    view.strip?.invalidate?.();
    if (!quiet) log(`length ${Math.round(s / 60)} min, chosen here, because the score gives none`);
  }

  // ── sirens, only while playing ─────────────────────────────────────────────
  //
  // ⚠️ SOUND NEVER GATES THE WORK. The context is made on the first play press
  // and its resume is not awaited; the picture and the line run without it.
  let ac = null, voice = null;
  const SIREN_HZ = { blue: 330, yellow: 440, red: 550, grey: 262 };
  function siren(on, colour) {
    if (!on) { if (voice) { voice.g.gain.setTargetAtTime(0, ac.currentTime, 0.08); voice = null; } return; }
    if (!ac) return;
    if (voice?.colour === colour) return;
    if (voice) voice.g.gain.setTargetAtTime(0, ac.currentTime, 0.08);
    const o = ac.createOscillator(), lfo = ac.createOscillator(), depth = ac.createGain(), gn = ac.createGain();
    const base = SIREN_HZ[colour] || 392;
    o.type = 'sawtooth'; o.frequency.value = base;
    lfo.frequency.value = 0.4; depth.gain.value = base * 0.35;
    lfo.connect(depth).connect(o.frequency);
    gn.gain.value = 0; gn.gain.setTargetAtTime(0.05, ac.currentTime, 0.2);
    o.connect(gn).connect(ac.destination);
    o.start(); lfo.start();
    o.stop(ac.currentTime + 600); lfo.stop(ac.currentTime + 600);
    voice = { g: gn, colour };
  }
  bar.el.addEventListener('click', () => {
    join();
    if (!ac) { try { ac = new AudioContext(); ac.resume(); } catch { ac = null; } }
  }, true);

  // ── one loop for the wall, the readout and the sirens ─────────────────────
  let lastCue = '';
  const cueAt = (f) => {
    const cue = [...c1.marks, ...c2.marks].filter((m) => m.folge && (m.at ?? m.from) <= f)
      .sort((a, b) => (b.at ?? b.from) - (a.at ?? a.from))[0];
    return cue ? cue.folge.item : '';
  };
  /* 🔴 THE LANES' DESTINATIONS ARE DRIVEN FROM A TIMER TOO, NOT ONLY FROM THE
     ANIMATION FRAME. MEASURED 2026-10-04 with three tabs: /partitur/ behind
     another tab stopped sending entirely, because a browser pauses
     `requestAnimationFrame` in a hidden tab, while a wall in another room went
     on waiting. A timer still runs there, about once a second, so a wall keeps
     following a score that nobody is looking at. Each send is a no-op unless
     its value changed, so running it from both is free. */
  /* A seek or a scrub resets where the scenes lane last saw the playhead, so a
     mark it jumped over is not passed. A play starts just behind the playhead,
     so a mark exactly under it is passed on the way out. */
  deck.transport.onState((st) => {
    const f = deck.position() / ms(1);
    if (st.reason === 'seek' || st.reason === 'sync') crosser.seek(f);
    else if (st.reason === 'play') crosser.seek(f - 1e-9);
  });
  function drive() {
    const f = deck.position() / ms(1);
    for (const m of crosser.at(f, !!deck.playing?.())) sendRecall(m);
    sendLight(f);
    sendCue(cueAt(f));
    sendSiren(!!deck.playing?.(), spanAt(sirens, f));
  }
  setInterval(drive, 250);
  (function follow() {
    const f = deck.position() / ms(1);
    const key = `${Math.round(deck.position())}|${W}|${H}`;
    if (key !== lastKey) {
      lastKey = key;
      draw();
      set('light', drawn.colour);
      const sr = spanAt(sirens, f);
      set('sirens', sr ? sr.colour : '');
      const cueText = cueAt(f);
      if (cueText !== lastCue) { lastCue = cueText; set('cue', cueText); }
      siren(deck.playing?.() && !!sr, sr?.colour);
      drive();
    }
    requestAnimationFrame(follow);
  })();
  size();
  new ResizeObserver(size).observe(video.stage);

  return {
    deck, bar, join, leave, setLink, drive, linked, registry,
    /** the middle of the first stripe of a colour, as a fraction of the plate */
    middleOf: (colour) => { const s = lightSpans.find((x) => x.colour === colour); return s ? (s.from + s.to) / 2 : null; },
    seekTo: (f) => deck.seek(ms(f)),
    hexOf: (colour) => lightSpans.find((x) => x.colour === colour)?.hex || null,
    show() { size(); requestAnimationFrame(() => requestAnimationFrame(() => { view.strip.fit?.(); view.strip.invalidate?.(); })); },
    hide() { if (deck.playing?.()) deck.pause(); sirenOff(); siren(false); },
    async check({ A }) {
      A('building the tab joined nothing, the room waits for a press', !wire && !joined, wire ? 'a socket is open' : 'no socket');
      A('the light column covers the plate end to end with no gap',
        lightSpans[0].from === 0 && lightSpans.at(-1).to === 1
          && lightSpans.every((s, i) => i === 0 || Math.abs(s.from - lightSpans[i - 1].to) < 1e-9),
        `${lightSpans.length} stripes, ${lightInside.length} inside`);
      A('every row says whether it was seen or inferred',
        [...c1.marks, ...c2.marks, ...light.spans, ...music.spans, ...music.marks].every((r) => r.how === 'seen' || r.how === 'inferred'));
      A('the music lane is marked as intentions, as Moholy marked it', music.intent === true);
      A('the score gives no length and the page says it chose one',
        data.unit.given === false && LENGTHS.some(([, s]) => s === totalS), `${totalS} s`);
      {
        // ⚠️ NEGATIVE CONTROL: the wall at the start is the first stripe, black,
        // and at the longest darkness is black, and at a yellow stripe is not.
        const off = document.createElement('canvas').getContext('2d');
        const first = paint(off, 10, 10, 0);
        const yellow = lightSpans.find((s) => s.colour === 'yellow');
        const atYellow = paint(off, 10, 10, (yellow.from + yellow.to) / 2);
        A('the wall shows the light stripe at the playhead', first.hex === lightSpans[0].hex && atYellow.colour === 'yellow',
          `${first.colour} at 0, ${atYellow.colour} at a yellow stripe`);
      }
      {
        const before = deck.position();
        deck.seek(ms(0.5));
        const f0 = deck.position() / ms(1);
        setLength(300, true);
        const f1 = deck.position() / ms(1);
        setLength(data.unit.suggested.totalSeconds, true);
        deck.seek(before);
        A('changing the length keeps the playhead on the same place in the score', Math.abs(f0 - f1) < 0.001, `${f0.toFixed(3)} then ${f1.toFixed(3)}`);
      }
      {
        // A wall heard is a link the patchbay accepts, and a link from the lane to
        // something that is not a light input is refused. Fixtures, no socket.
        const reg = createRegistry();
        reg.ingest({ type: 'graph.announce', from: 'self', graph: GRAPH });
        reg.ingest({ type: 'graph.announce', from: 'w', graph: { v: 1, site: 'wall-test', place: 'browser',
          nodes: [{ id: 'wall-test:wall', kind: 'screen', label: 'wall', place: 'browser' }],
          ports: [{ id: 'wall-test:wall:light', label: 'wall', dir: 'in', medium: 'value', shape: { channels: 3 } },
                  { id: 'wall-test:wall:sound', label: 'wall', dir: 'in', medium: 'audio' }] } });
        const b = reg.fill(createBay());
        const ok = b.validate(OUT, 'wall-test:wall:light');
        const no = b.validate(OUT, 'wall-test:wall:sound');
        A('the light lane can be linked to a wall\u2019s light input', ok.ok, ok.why);
        A('and is refused into a sound input', !no.ok && /value/.test(no.why), no.why);
        const reg2 = createRegistry();
        reg2.ingest({ type: 'graph.announce', from: 'self', graph: GRAPH });
        reg2.ingest({ type: 'graph.announce', from: 'i', graph: { v: 1, site: 'desk', place: 'pi',
          nodes: [{ id: 'desk:synth', kind: 'engine', label: 'synth', place: 'pi' }, { id: 'desk:wall', kind: 'screen', label: 'wall', place: 'browser' }],
          ports: [{ id: 'desk:synth:in', label: 'synth', dir: 'in', medium: 'midi', accepts: ['note'], never: [] },
                  { id: 'desk:wall:cue', label: 'wall', dir: 'in', medium: 'state', shape: { schema: 'cue' } }] } });
        const b2 = reg2.fill(createBay());
        const toSynth = b2.validate(SOURCES.sirens.port, 'desk:synth:in');
        const toCaps = b2.validate(SOURCES.cues.port, 'desk:wall:cue');
        A('the siren lane can be linked to an instrument\u2019s MIDI input', toSynth.ok, toSynth.why);
        A('and the stage cues to a wall\u2019s captions', toCaps.ok, toCaps.why);
      }
      {
        // The scenes lane's crossing, as a pure helper on fixtures, no deck and no room.
        const marks = [{ at: 0.3, name: 'a' }];
        const play = createCrosser(() => marks);
        play.seek(0.29);
        const first = play.at(0.31, true), again = play.at(0.32, true);
        A('a scene mark passed while playing fires once', first.length === 1 && first[0].name === 'a' && again.length === 0,
          `${first.length} then ${again.length}`);
        // ⚠️ NEGATIVE CONTROLS: a seek over the mark, and a scrub over it while paused.
        const jump = createCrosser(() => marks);
        jump.seek(0.1);
        jump.seek(0.5);
        const afterSeek = jump.at(0.51, true);
        const scrub = createCrosser(() => marks);
        scrub.seek(0.29);
        const paused = scrub.at(0.31, false);
        A('a seek or a paused scrub over the mark fires nothing', afterSeek.length === 0 && paused.length === 0,
          `${afterSeek.length} after a seek, ${paused.length} scrubbing`);
      }
    },
  };
}

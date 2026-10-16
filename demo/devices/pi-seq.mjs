// The Pi's own sequencer, edited from a page and from the Pi's four keys, its steps on the Pi's screen.
// `target: 'drums'` plays the Pi's SuperCollider drums out of the Pi's PWM output (/devices/drums/);
// `target: 'circuit'` plays the Circuit's drums through the drum map (/devices/beat/). The tab plays nothing.
// The Pi is reached on the first play, never on load. why: lessons/page-devices.md#drums
import { conceptNav } from '/shell/concept-nav.mjs';
import { mount, el } from '/shell/shell.mjs';
import { SELFCHECK } from '/shell/selfcheck.mjs';
import { createButtonGroup } from '/shell/button-group.mjs';
import { createBoard } from '/shell/board.mjs';
import { createBoardCollide } from '/shell/board-collide.mjs';
import { BOARD_SITE, boardGraph, addBoardNode, PWM_PORTS } from '/shell/graph-registry.mjs';
import { createTable } from '/shell/table.mjs';
import { DRUM_MAPS, drumRows, plays } from '/shell/drum-maps.mjs';
import { patternOf } from '/shell/drum-pattern.mjs';
import { paintFrame, loadPanelUi } from '/shell/panel-screen.mjs';
import { stepCell } from '/shell/steps-oled.mjs';
import { createVideoPanel } from '/shell/video-panel.mjs';
import { createDrumMachine } from '/drums/drum-machine.mjs';
import { voices } from '/drums/voices.mjs';

export async function mountPiSeq({ target, name, id }) {
  // Eight rows: the four drums of /drums/machine/ and the first four of its extras, as many as the Pi's screen holds.
  const VOICES = voices({ extras: true }).slice(0, 8);
  const ON_DRUMS = target === 'drums';
  const d = mount({ name, what: '', readout: null, index: '/', indexLabel: 'positron' });
  conceptNav(id);

  const q = new URLSearchParams(location.search);
  const ROOM = q.get('room') || 'studio-1';
  const MAY_SEND = !SELFCHECK || q.get('board') === '1';
  // Two letters a row, the drum machine abbreviations: what fits beside 16 steps on 128 pixels.
  const SHORT = { kick: 'BD', snare: 'SD', hho: 'OH', hhc: 'CH' };
  const MAP = ON_DRUMS ? DRUM_MAPS.gm : DRUM_MAPS.circuit;
  const mute = (v) => !ON_DRUMS && !plays(MAP, v.note);
  // Closing the tab leaves the board's sequencer running; only a press on Stop stops it.
  let leaving = false;
  addEventListener('pagehide', () => { leaving = true; });
  const P = BOARD_SITE;
  const PISEQ = `${P}:sequencer`, DEST = `${P}:${target}`;
  const PISEQ_OUT = `${PISEQ}:midi-out`, PISEQ_IN = `${PISEQ}:value-in`, PISEQ_STEPS = `${PISEQ}:value-out`, DEST_IN = `${DEST}:midi-in`;
  const DRUMS_OUT = `${P}:drums:audio-out`, PWM_IN = `${P}:pwm:audio-in`;

  // ── the edit state the keys move: the row they edit, and a cursor while stopped ──
  let voice = 0, cursor = 0, edits = 0;
  function onKey(ev) {
    if (ev?.of !== 'key' || !ev.down) return;
    const a = m.api, g = a.grid, R = a.VOICES.length;
    if (ev.k === 1) voice = (voice + R - 1) % R;
    else if (ev.k === 2) voice = (voice + 1) % R;
    else if (ev.k === 3) {
      // playing: the step under the playhead; stopped: the cursor's, and the cursor moves on
      const s = a.playing() ? Math.max(0, g.step()) : cursor;
      g.set(voice, s, !g.get(voice, s), 'quiet');
      edits++;
      d.log(`${a.VOICES[voice].label} step ${s + 1} ${g.get(voice, s) ? 'on' : 'off'}`);
      if (!a.playing()) { cursor = (cursor + 1) % g.steps; g.at(cursor); }
    } else if (ev.k === 4) { if (a.playing()) a.stop(); else a.start(); }
    g.lit(voice);
  }

  // the page's own links, and when each last carried something (declared before the patchbay draws)
  const flash = new Map(), OURS = new Set();
  const m = createDrumMachine(d, { voices: VOICES, onValue: onKey,
    local: () => false, silent: mute,
    // The grid's clock only mirrors: each note goes along the drawn Pi link, which delivers nothing here.
    sequence: (ev) => bay.send(PISEQ_OUT, ev),
    hide: (hid) => /^web:/.test(hid) && VOICES.some((v) => hid === `web:${v.key}`) || hid === 'web:speaker',
    onStart: async () => { connect(); await boardPlay(); },
    onStop: () => { cursor = 0; if (!leaving) boardStop(); },
    flowing: (l, playing) => (flash.get(l.id) || 0) > performance.now()
      || (playing && (l.from === PISEQ_OUT || l.from === DRUMS_OUT)) });
  const bay = m.api.bay;

  // ── the screens and the keys, on the drum machine's own bay ──
  const SEQ_OUT = 'web:sequencer:value-out', SEQ_IN = 'web:sequencer:value-in';
  const PI_IN = `${P}:screen:value-in`, SIM_IN = 'web:screen:value-in';
  const KEYS_OUT = `${P}:keys:value-out`, SIMKEYS_OUT = 'web:keys:value-out';
  bay.addNode({ id: `${P}:screen`, kind: 'device', label: 'OLED 128x64', place: ROOM });
  bay.addNode({ id: `${P}:keys`, kind: 'device', label: 'four keys', place: ROOM });
  // Mirrored by name: web:screen and web:keys are this tab's copies of pi-1:screen and pi-1:keys.
  bay.addNode({ id: 'web:screen', kind: 'screen', label: 'simulated OLED', place: 'browser' });
  bay.addNode({ id: 'web:keys', kind: 'person', label: 'simulated keys', place: 'browser' });
  // The board's sequencer and the target as boardGraph announces them: the drum map is on the target's port.
  const G = boardGraph({ room: ROOM, gpu: false, sequencer: true, jack: true, instruments: { collide: true },
    drums: { circuit: DRUM_MAPS.circuit, drums: DRUM_MAPS.gm }, outputs: [{ device: 'hw:CARD=Headphones', jack: PWM_PORTS }],
    inputs: [{ name: 'circuit', channels: 2, midi: { port: 'Circuit', channels: [1, 2, 10] } }] });
  addBoardNode(bay, G, 'sequencer', { label: 'sequencer on the Pi', deliver: { 'value-in': (ev) => toBoard(ev) } });
  if (ON_DRUMS) {
    addBoardNode(bay, G, 'drums', { label: 'drums on the Pi', withPorts: false });
    bay.addPort({ ...G.ports.find((p) => p.id === DEST_IN), label: 'drums:midi-in' });
    bay.addPort({ ...G.ports.find((p) => p.id === DRUMS_OUT), label: 'drums:audio-out' });
    addBoardNode(bay, G, 'pwm', { label: 'PWM out' });
  } else {
    addBoardNode(bay, G, 'circuit', { label: 'Circuit on the Pi', withPorts: false });
    bay.addPort({ ...G.ports.find((p) => p.id === DEST_IN), label: 'circuit:midi-in' });
  }

  let board = null, connected = false, sent = 0, kit = null, drumsUp = false;
  const lit = (from) => { for (const l of bay.links()) if (l.from === from) flash.set(l.id, performance.now() + 250); };

  const simCv = Object.assign(document.createElement('canvas'), { width: 128, height: 64 });
  let ui = null, frames = 0, lastFrame = null;
  bay.addPort({ id: SEQ_OUT, dir: 'out', medium: 'value', emits: ['steps', 'pattern'], label: 'sequencer:value-out' });
  bay.addPort({ id: PI_IN, dir: 'in', medium: 'value', accepts: ['steps'], label: 'screen:value-in', deliver: () => {} });
  bay.addPort({ id: SIM_IN, dir: 'in', medium: 'value', accepts: ['steps'], label: 'screen:value-in',
    deliver: (ev) => { if (ev?.of === 'steps' && ui) { lastFrame = ui.frame({ mode: 'steps', steps: ev.steps }); paintFrame(simCv, lastFrame); frames++; } } });
  bay.addPort({ id: KEYS_OUT, dir: 'out', medium: 'value', emits: ['key'], label: 'keys:value-out' });
  bay.addPort({ id: SIMKEYS_OUT, dir: 'out', medium: 'value', emits: ['key'], label: 'keys:value-out' });
  for (const [from, to] of [[SEQ_OUT, SIM_IN], [KEYS_OUT, SEQ_IN], [SIMKEYS_OUT, SEQ_IN]]) {
    const r = bay.link(from, to);
    if (r.ok) OURS.add(r.id); else d.log(`${from} -> ${to} refused: ${r.why}`, 'warn');
  }
  // The pattern goes to the board's sequencer, its notes into the target by the drum map, the drums' sound
  // to the PWM output, and the Pi's screen follows the board's own clock.
  const PI_LINKS = [[SEQ_OUT, PISEQ_IN], [PISEQ_OUT, DEST_IN, [{ op: 'drummap', name: MAP.name }]], [PISEQ_STEPS, PI_IN],
    ...(ON_DRUMS ? [[DRUMS_OUT, PWM_IN]] : [])];
  let mapLink = null;
  for (const [from, to, tf] of PI_LINKS) {
    const r = bay.link(from, to, tf || [], { site: 'web' });
    if (!r.ok) { d.log(`${from} -> ${to} refused: ${r.why}`, 'warn'); continue; }
    if (to === DEST_IN) mapLink = bay.links().find((l) => l.id === r.id);
  }
  m.api.grid.lit(voice);

  // ── what the screens show: sent along the links whenever it changes ──
  function steps() {
    const a = m.api, g = a.grid;
    return {
      voices: a.VOICES.map((v) => SHORT[v.key] ?? v.label.slice(0, 2)),
      pattern: g.pattern().map((row) => Array.from(row, (x) => (x ? '1' : '0')).join('')),
      step: a.playing() ? g.step() : cursor, voice, playing: a.playing(), look,
    };
  }
  // One look on both screens, as the owner chose: dotted empty steps, the running step framed.
  const look = { empty: 'dot', head: 'frame' };
  let said = '', toldBoard = '';
  const patternNow = () => patternOf(VOICES.map((v) => v.key), m.api.grid.pattern(), m.api.bpm(), id);
  const screenNow = () => ({ voices: steps().voices, look });
  (function tick() {
    const s = steps(), sig = JSON.stringify(s);
    if (ui && sig !== said) { said = sig; sent++; lit(SEQ_OUT); bay.send(SEQ_OUT, { of: 'steps', cls: 'steps', steps: s }); }
    // A changed pattern or tempo goes to the board, which plays it from the next bar and draws it on its screen.
    if (board && connected) {
      const p = patternNow(), sc = screenNow(), psig = JSON.stringify([p, sc]);
      if (psig !== toldBoard) { toldBoard = psig; lit(SEQ_OUT); bay.send(SEQ_OUT, { of: 'pattern', cls: 'pattern', pattern: p, screen: sc }); }
    }
    requestAnimationFrame(tick);
  })();
  loadPanelUi(await (await fetch('/resources/pico/oled-ui.wasm')).arrayBuffer()).then((u) => { ui = u; });

  let opened = null, boardSaid = null, toBoardN = 0;
  function connect() {
    if (board || !MAY_SEND) return opened;
    let open;
    opened = new Promise((r) => { open = r; });
    board = createBoard({ room: ROOM, of: 'Raspberry Pi', showName: false, log: (line, kind) => d.log(line, kind),
      onOpen: () => { connected = true; said = ''; toldBoard = ''; open(true); d.log('the Pi is reached'); },
      // A key on the Pi is a `panel.key` to the whole room; it enters this bay at the keys' out-port.
      onMessage: (msg) => {
        if (msg.type !== 'panel.key') return;
        lit(KEYS_OUT);
        bay.send(KEYS_OUT, { of: 'key', cls: 'key', k: msg.k, sym: msg.sym, down: msg.down });
      } });
    d.log(`reaching ${ROOM}`);
    return opened;
  }
  /** What arrives at pi-1:sequencer:value-in leaves for the board as `seq.pattern`. */
  function toBoard(ev) {
    if (ev?.of !== 'pattern' || !board || !connected || !MAY_SEND) return;
    toBoardN++;
    board.send({ type: 'seq.pattern', pattern: ev.pattern, screen: ev.screen });
  }
  const said2 = (st) => (st?.ok ? `${st.running ? 'running' : 'stopped'} at ${st.bpm} bpm into ${st.target}, ${st.counts?.on ?? 0} notes, ${st.dropped ?? 0} dropped by the map${st.refused ? `, ${st.refused} not taken (${st.lastRefusal})` : ''}${st.late?.n ? `, timer late p50 ${st.late.p50} p99 ${st.late.p99} worst ${st.late.max} ms` : ''}`
    : `refused: ${st?.why || 'no answer'}`);
  /** The drums on the Pi's SuperCollider, all eight compiled there, and their sound linked to the PWM output. */
  async function drumsOnPi() {
    if (drumsUp) return true;
    kit ??= createBoardCollide({ board, log: (line, kind) => d.log(`Pi: ${line}`, kind) });
    const up = await kit.start();
    if (!up?.ok) { d.log(`the Pi did not start its drums: ${up?.reason ?? 'no answer'}`, 'warn'); return false; }
    for (const v of VOICES) {
      const r = await kit.load(v.name, v.program);
      if (!r?.ok) { d.log(`the Pi did not take ${v.name}: ${r?.reason ?? 'no answer'}`, 'warn'); return false; }
    }
    d.log(`the Pi compiled the eight drums: ${VOICES.map((v) => v.name).join(', ')}`, 'ok');
    const j = await board.ask({ type: 'jack.link', link: `${DRUMS_OUT} -> ${PWM_IN}` }, 'jack.linked', 8000);
    if (!j?.ok) { d.log(`the drums' sound did not reach the PWM output: ${(j?.problems || []).join(', ') || j?.hint || 'no answer'}`, 'warn'); return false; }
    d.log(`the Pi holds ${DRUMS_OUT} -> ${PWM_IN}`, 'ok');
    drumsUp = true;
    return true;
  }
  async function boardPlay() {
    if (!MAY_SEND) { d.log('this run may not drive the board, add board=1 to the address', 'dim'); return; }
    const ok = await Promise.race([opened, new Promise((r) => setTimeout(() => r(false), 6000))]);
    if (!ok) { d.log(`the Pi did not answer, so nothing is playing`, 'warn'); return; }
    if (ON_DRUMS && !await drumsOnPi()) return;
    toldBoard = JSON.stringify([patternNow(), screenNow()]);
    boardSaid = await board.ask({ type: 'seq.start', target, pattern: patternNow(), screen: screenNow() }, 'seq.state', 6000);
    d.log(`the Pi's sequencer: ${said2(boardSaid)}`, boardSaid?.ok ? '' : 'warn');
    if (boardSaid?.link) d.log(boardSaid.link);
  }
  async function boardStop() {
    if (!board || !connected) return;
    boardSaid = await board.ask({ type: 'seq.stop' }, 'seq.state', 6000);
    d.log(`the Pi's sequencer: ${said2(boardSaid)}`, boardSaid?.ok ? '' : 'warn');
  }

  // ── the simulated module: the screen and its four keys, as on /devices/text/ ──
  const SYMS = ['^', 'v', '#', '*'], ICONS = ['chevron-up', 'chevron-down', 'hash', null];
  const simKeys = createButtonGroup({ orient: 'column', buttons: SYMS.map((s, i) => ({ id: `k${i + 1}`,
    ...(ICONS[i] ? { icon: ICONS[i], label: `K${i + 1}, the ${s} key` } : { label: s }) })) });
  simKeys.button('k4').dataset.glyph = '1';
  const held = new Set();
  SYMS.forEach((s, i) => {
    const b = simKeys.button(`k${i + 1}`), k = i + 1;
    const edge = (down) => { if (down) held.add(k); else held.delete(k); lit(SIMKEYS_OUT); bay.send(SIMKEYS_OUT, { of: 'key', cls: 'key', k, sym: s, down }); };
    b.addEventListener('pointerdown', () => edge(true));
    for (const ev of ['pointerup', 'pointerleave']) b.addEventListener(ev, () => { if (held.has(k)) edge(false); });
  });
  const media = el('div', 'ol-media');
  const screenBox = el('div', 'ol-screen');
  const frame = el('div', 'ol-frame');
  frame.append(simCv);
  screenBox.append(frame);
  media.append(screenBox, simKeys.el);
  const ZOOMS = [1, 2, 4];
  let zi = 1;
  const scale = el('span', 'ol-say', '');
  const zoomBtns = createButtonGroup({ buttons: [
    { id: 'out', icon: 'zoom-out', label: 'zoom out', onPress: () => setZoom(zi - 1) },
    { id: 'in', icon: 'zoom-in', label: 'zoom in', onPress: () => setZoom(zi + 1) },
  ] });
  function setZoom(i) {
    zi = Math.max(0, Math.min(ZOOMS.length - 1, i));
    media.style.setProperty('--ol-k', String(ZOOMS[zi]));
    scale.textContent = `128×64 at ${ZOOMS[zi]}x`;
    zoomBtns.enable('out', zi > 0, 'smallest');
    zoomBtns.enable('in', zi < ZOOMS.length - 1, 'largest');
  }
  setZoom(zi);
  const simPanel = createVideoPanel({ media, left: scale, right: zoomBtns.el, aspect: 'auto' });
  const mapT = createTable({ columns: [{ key: 'line', label: `drummap ${MAP.name}`, grow: true, hi: true, clip: true, hover: 'line' }], minRows: 8 });
  const mapBox = el('div', 'cc-stack');
  mapBox.append(el('h3', 'pos-sec-h', 'drum map'), mapT.el);
  if (mapLink && !ON_DRUMS) mapT.set([...drumRows(mapLink.transforms[0]).map((x) => ({ line: x.line })),
    ...VOICES.filter((v) => !plays(MAP, v.note)).map((v) => ({ line: `${v.note} ${v.label}, no drum on the Circuit, silent` }))]);
  // The grid greys the rows the target has no drum for.
  const g0 = m.api.grid;
  for (let r = 0; r < m.api.VOICES.length; r++) for (let st = 0; st < g0.steps; st++) if (g0.get(r, st)) g0.set(r, st, true, 'quiet');
  m.api.refresh();
  d.stack.add(simPanel.el, m.surface, m.patchbay, ...(ON_DRUMS ? [] : [mapBox]));
  setInterval(() => { if (m.api.playing() || flash.size) m.api.refresh(); }, 200);
  window.__demo.bay = bay;
  window.__demo.grid = m.api.grid;
  window.__demo.probe = () => ({ connected, sent, frames, edits, voice, cursor, target, toBoard: toBoardN, board: boardSaid, drumsUp });

  if (SELFCHECK) {
    await new Promise((r) => setTimeout(r, 400));
    d.assert('three links of the page: the pattern to the simulated screen, both sets of keys to the sequencer', OURS.size === 3, [...OURS].join(', '));
    d.assert('the simulated screen drew the pattern', frames > 0 && !!lastFrame, `${frames} frames`);
    // the kick is on at step 1, so the middle of the grid's first cell is lit
    const k1 = stepCell(0, 0, VOICES.length), kx = k1.x + 2, ky = k1.y + (k1.h >> 1);
    d.assert('the kick on step 1 is lit on the screen', !!lastFrame && ((lastFrame[(ky >> 3) * 128 + kx] >> (ky & 7)) & 1) === 1);
    const was = m.api.grid.get(1, 0);
    bay.send(SIMKEYS_OUT, { of: 'key', cls: 'key', k: 2, down: true });
    bay.send(SIMKEYS_OUT, { of: 'key', cls: 'key', k: 3, down: true });
    d.assert('v then # on the keys toggles the snare\'s step 1 and moves the cursor', m.api.grid.get(1, 0) === !was && voice === 1 && cursor === 1);
    m.api.grid.set(1, 0, was, 'quiet'); voice = 0; cursor = 0; m.api.grid.at(0); m.api.grid.lit(0);
    d.assert('a visit reaches nothing until play', !board);
    const L = mapLink;
    d.assert(`the patchbay holds pi-1:sequencer -> ${DEST} with the ${MAP.name} drum map`,
      !!L && L.from === PISEQ_OUT && L.to === DEST_IN && L.transforms[0]?.op === 'drummap', L ? L.id : 'no link');
    d.assert('the pattern goes to the board\'s sequencer and the Pi\'s screen follows the board, not this tab',
      bay.links().some((l) => l.from === SEQ_OUT && l.to === PISEQ_IN) && bay.links().some((l) => l.from === PISEQ_STEPS && l.to === PI_IN)
      && !bay.links().some((l) => l.from === SEQ_OUT && l.to === PI_IN));
    const s0 = L.sent, d0 = L.dropped;
    bay.send(PISEQ_OUT, { cls: 'note', ch: 10, d1: 36, d2: 100 });
    bay.send(PISEQ_OUT, { cls: 'note', ch: 10, d1: 39, d2: 100 });
    if (ON_DRUMS) {
      d.assert('a kick and a clap both pass the gm map: the Pi has all eight drums', L.sent === s0 + 2 && L.dropped === d0, `sent ${L.sent - s0}, dropped ${L.dropped - d0}`);
      const out = bay.links().find((l) => l.from === DRUMS_OUT && l.to === PWM_IN);
      d.assert('the drums\' sound is drawn to the PWM output, by JACK on the Pi',
        !!out && JSON.stringify(out.session?.rows?.map((r) => r.to)) === JSON.stringify(PWM_PORTS), JSON.stringify(out?.session?.rows));
    } else {
      d.assert('the map\'s rows read 36 kick -> 60 drum 1', mapT.el.textContent.includes('36 kick -> 60 drum 1') && mapT.el.textContent.includes('46 open hat -> 65 drum 4'));
      d.assert('a kick passes the drawn map and a clap is dropped on it', L.sent === s0 + 1 && L.dropped === d0 + 1, `sent ${L.sent - s0}, dropped ${L.dropped - d0}`);
      const clapRow = VOICES.findIndex((v) => v.key === 'clap');
      m.api.grid.set(clapRow, 0, true, 'quiet');
      const pad = m.surface.querySelector(`.pos-pg-pad[data-row="${clapRow}"][data-step="0"]`);
      d.assert('a clap step is grey: the Circuit has no drum for it', pad?.dataset.mute === '1', pad ? JSON.stringify(pad.dataset) : 'no pad');
      m.api.grid.set(clapRow, 0, false, 'quiet');
    }
    d.assert('NEGATIVE CONTROL: the tab boots no SuperCollider of its own', !m.api.engine());
  }
  d.ready();
}

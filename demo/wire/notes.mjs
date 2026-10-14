// The NOTES tab of /wire/: a keyboard over the relay, sound here or on another
// machine. Room: `?notes=`, else `wire-notes-test-<6>` under selfcheck, else
// `instrument-demo`. Joins only on a press; the check stands in a second peer.
// See lessons/page-wire.md#wire-15

import { createVoices } from '/proto/looper/synth.mjs';
import { createKeyboard } from '/shell/keyboard.mjs';
import { openWire } from '/shell/wire.mjs';
import { createStripView } from '/shell/strip.mjs';
import { createDeck } from '/timeline/transport.mjs';
import { el } from '/shell/shell.mjs';
import { SELFCHECK } from '/shell/selfcheck.mjs';
import { offerLoopFor, inputNames, checkEvolutionLoop } from '/shell/midi.mjs';
import { howIn, gradeHow } from './how.mjs';

// What this tab is, in the fixed box under the tab row (`tab-page.mjs` rule 6).
export const about = 'Play the keyboard and every note travels through the relay to anyone else in the room. Open this tab in a second browser to play into this one and see how late the notes land.';

// Each readout key names its thing in a visitor's words. `readCell` reads two of
// them by key text, so a rename here moves it there.
// See lessons/page-wire.md#wire-16
export const readout = {
  'midi keyboard': '', 'sound from': '', 'notes out': '', 'notes in': '',
  'arrived after': 'ms', 'round trip': 'ms',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms, step = 25) => {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) { if (fn()) return true; await sleep(step); }
  return !!fn();
};

export function build({ panel, log, set, d }) {
  const q = new URLSearchParams(location.search);
  const ROOM = q.get('notes')
    || (SELFCHECK ? `wire-notes-test-${Math.random().toString(36).slice(2, 8)}` : 'instrument-demo');

  // ── the controls, in the tab ────────────────────────────────────────────
  // Not `.pos-controls`: the harness presses that row by position across the
  // whole document, blind to tabs. `check()` presses these itself.
  const acts = el('div', 'wire-acts');
  const handlers = new Map();
  const buttons = new Map();
  const run = async (id) => {
    const b = buttons.get(id);
    b.dataset.busy = '1';
    try { await handlers.get(id)(); }
    catch (e) { log(`${id}: ${e.message}`, 'bad'); }
    finally { delete b.dataset.busy; }
  };
  for (const s of [
    { id: 'start', label: 'Start audio and join', primary: true },
    { id: 'midi', label: 'Use a MIDI keyboard' },
    { id: 'remote', label: 'Hear the other machine' },
  ]) {
    const b = el('button', s.primary ? 'pos-pri' : '', s.label, { type: 'button' });
    b.onclick = () => { if (!b.dataset.busy) run(s.id); };
    buttons.set(s.id, b);
    acts.append(b);
  }
  const on = (id, fn) => handlers.set(id, fn);
  panel.add(acts);

  // Letters are heard on `window`, so a letter does nothing while the tab is hidden;
  // MIDI and a started loop still play, since starting them was somebody's choice.
  // See lessons/page-wire.md#wire-17
  let visible = true;

  const kb = createKeyboard(panel.el, {
    base: 60,
    loop: 'evolution',
    log: (line, kind) => log(line, kind),
    onDown: (note, how) => { if (visible || how !== 'key') press(note, how); },
    onUp: (note, how) => { if (visible || how !== 'key') release(note); },
  });
  const heardFrom = new Set();

  let ctx = null, voices = null, ws = null, sent = 0, received = 0, midiState = 'not yet';
  let midiAccess = null;
  let joins = 0;                        // sockets this tab has opened, for the check
  let lastLine = null;                  // the last note line that went out, verbatim
  const lat = [];

  // ── the notes, on a line ───────────────────────────────────────────────
  const deck = createDeck({ items: [], adapters: {}, range: [0, 8000] });
  const played = [];                    // {at, note, who}
  const T0 = performance.now();
  let view = null;
  function land(note, who) {
    const at = performance.now() - T0;
    played.push({ at, note, who });
    if (at + 2000 > deck.range[1]) deck.setRange([0, at + 4000]);
    view?.strip.invalidate();
  }

  // --- where the sound is made -------------------------------------------
  let source = 'here';
  let synth = null;                 // {from, ns} once announced
  let pc = null, remoteAudio = null;
  const ears = [];                  // key press -> sound arriving, one clock
  let earPending = null;
  // No `from` and no `sent` in a payload: wire.mjs stamps both and throws on either.
  // See lessons/page-wire.md#wire-18
  const send = (o) => {
    if (!ws || ws.state() !== 1) return null;
    const out = ws.send(o);
    return out;
  };

  /**
   * What crosses the wire is {note, vel}, a note number stamped by the sender.
   * Raw MIDI bytes never leave the page that owns the device.
   * See lessons/page-wire.md#wire-19
   */
  function press(note, how = 'key') {
    kb.lightNote(note, true);
    land(note, 'here');
    if (source === 'here') play(note, 100);
    else earPending = { t0: performance.now() };
    const out = send({ type: 'on', note, vel: 100, src: how === 'midi' ? 'midi' : 'touch' });
    if (out?.sent) lastLine = out.line;
    sent++;
    set('notes out', sent);
  }
  function release(note) {
    kb.lightNote(note, false);
    if (source === 'here') stop(note);
    send({ type: 'off', note });
  }

  /** notes handed to the voices, which is the far side of `press` for a check */
  let voiced = 0;
  function play(note) {
    if (!voices) return;
    voiced++;
    voices.monitorOn?.({ type: 'note-on', note, vel: 100, layer: 'mon' });
  }
  function stop(note) {
    if (!voices) return;
    voices.monitorOff?.({ type: 'note-off', note, layer: 'mon' });
  }

  on('start', async () => {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    // Not awaited before the work: `resume()` waits on a gesture and never rejects.
    // See lessons/page-wire.md#wire-20
    ctx.resume().catch(() => {});
    voices = createVoices(ctx, { dest: ctx.destination, gain: 0.14 });
    joins++;
    ws = openWire(ROOM, {
      onOpen: (from) => log(`joined ${ROOM} as ${from}`, 'hi'),
      onClose: () => log('relay closed, reconnecting', 'bad'),
      onMessage: (got) => {
        if (got.kind !== 'json') return;
        const m = got.msg;
        if (m.from === ws.stats().from) return;       // the relay echoes to us too
        if (m.type === 'here' && m.ns) {               // a machine offering to be the synth
          synth = { from: m.from, ns: m.ns };
          // The cell keeps `here`. An offer is not a sound yet, and `offered`
          // under `sound from` read as a place. The log line below says it.
          log(`a synth is here: ${m.from}`, 'hi');
          return;
        }
        if (m.type === 'answer' && pc && pc.signalingState === 'have-local-offer') {
          pc.setRemoteDescription({ type: 'answer', sdp: m.sdp });
          return;
        }
        if (m.type === 'on') {
          received++;
          if (Number.isFinite(m.sent)) { lat.push(Date.now() - m.sent); set('arrived after', lat[lat.length - 1]); }
          set('notes in', received);
          play(m.note);
          kb.lightNote(m.note, true, 'remote');
          land(m.note, 'there');
          if (!heardFrom.has(m.from)) {
            heardFrom.add(m.from);
            log(`${m.from} is playing, ${m.src === 'midi' ? 'off a MIDI device' : 'off a screen'}`, 'hi');
          }
        } else if (m.type === 'off') {
          stop(m.note);
          kb.lightNote(m.note, false, 'remote');
        }
      },
    });
    addEventListener('pagehide', () => { try { ws.close(); } catch { /* gone */ } });
  });

  /**
   * Hear the other machine. With nobody offering it says so in words. Reads
   * `ws.state()`: the openWire handle has no `readyState`.
   * See lessons/page-wire.md#wire-21
   */
  on('remote', async () => {
    if (!ws || ws.state() !== 1) { set('sound from', 'offline', 'bad'); return; }
    if (!synth) {
      source = 'here';
      set('sound from', 'here');
      log('nobody else is in this room, so the sound is made in this page', 'hi');
      return;
    }
    try { pc?.close(); } catch { /* already */ }
    pc = new RTCPeerConnection({ iceServers: [] });   // same room: host candidates
    pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.ontrack = (e) => {
      remoteAudio = remoteAudio || Object.assign(new Audio(), { autoplay: true });
      remoteAudio.srcObject = e.streams[0];
      source = 'remote';
      set('sound from', 'far end', 'ok');
      log(`the sound is now coming from ${synth.from}`, 'hi');
      listenForOnsets(e.streams[0]);
    };
    const o = await pc.createOffer(); await pc.setLocalDescription(o);
    await gathered(pc);
    send({ type: 'offer', sdp: pc.localDescription.sdp });
    log('asked the other machine for its sound');
  });

  /**
   * How late the sound is, as a round trip on one clock: pressed here, heard here.
   * A one-way stamp across two machines carries their offset, about 57 ms.
   * See lessons/page-wire.md#wire-22
   */
  let onsetsReady = null;
  async function listenForOnsets(stream) {
    const code = `class O extends AudioWorkletProcessor{constructor(){super();this.q=true;}
      process(i){const c=i[0]&&i[0][0];if(!c)return true;let p=0;
      for(let n=0;n<c.length;n++){const a=c[n]<0?-c[n]:c[n];if(a>p)p=a;}
      if(this.q&&p>0.02){this.q=false;this.port.postMessage(0);}else if(!this.q&&p<0.004){this.q=true;}
      return true;}}registerProcessor('onset',O);`;
    onsetsReady = (async () => {
      await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
      const w = new AudioWorkletNode(ctx, 'onset');
      const mute = ctx.createGain(); mute.gain.value = 0;
      ctx.createMediaStreamSource(stream).connect(w); w.connect(mute).connect(ctx.destination);
      w.port.onmessage = () => {
        if (!earPending) return;
        ears.push(performance.now() - earPending.t0);
        earPending = null;
        const s = [...ears].sort((a, b) => a - b);
        set('round trip', Math.round(s[Math.floor(s.length / 2)]));
      };
    })();
    await onsetsReady;
  }

  // MIDI is optional and its absence is REPORTED, not hidden.
  on('midi', async () => {
    if (!navigator.requestMIDIAccess) { midiState = 'no API'; set('midi keyboard', midiState, 'bad'); return; }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      midiAccess = access;
      offerLoopFor(kb, inputNames(access), log);
      access.onstatechange = () => offerLoopFor(kb, inputNames(access), log);
      const ins = [...access.inputs.values()];
      midiState = ins.length ? `${ins.length} found` : 'none';
      set('midi keyboard', midiState, ins.length ? 'ok' : '');
      for (const input of ins) {
        input.onmidimessage = ({ data }) => {
          const [status, n, v] = data;
          const cmd = status & 0xf0;
          if (!kb.keyOf(n)) return;
          if (cmd === 0x90 && v > 0) press(n, 'midi');
          else if (cmd === 0x80 || (cmd === 0x90 && v === 0)) release(n);
        };
      }
      log(`midi: ${midiState}`);
    } catch (e) { midiState = 'denied'; set('midi keyboard', midiState, 'bad'); log(`midi: ${e.name}`, 'bad'); }
  });

  view = createStripView(panel.el, deck, {
    size: 'auto', follow: true, gutter: 150,
    lanes: [
      { id: 'here', kind: 'here', label: 'this keyboard', height: 40, width: 2, as: 'ticks',
        color: '#ffd400', terse: true,
        rows: () => played.filter((p) => p.who === 'here')
          .map((p, i) => ({ at: p.at, id: `h${i}`, kind: 'here', payload: { note: p.note } })),
        describeRow: (r) => [`note ${r.payload.note}`, 'played here'] },
      { id: 'there', kind: 'there', label: 'over the relay', height: 40, width: 2, as: 'ticks',
        color: '#7fb8e0', terse: true,
        rows: () => played.filter((p) => p.who === 'there')
          .map((p, i) => ({ at: p.at, id: `t${i}`, kind: 'there', payload: { note: p.note } })),
        describeRow: (r) => [`note ${r.payload.note}`, 'arrived over the relay'] },
    ],
  });
  {
    const a = view.strip.lanes().find((l) => l.id === 'here');
    const b = view.strip.lanes().find((l) => l.id === 'there');
    if (a) a.subLabel = ['pressed on this page,', 'sounded at once'];
    // A blank, not a zero, while nobody else is in the room.
    // See lessons/page-wire.md#wire-23
    if (b) b.subLabel = ['nothing yet', 'needs a second machine'];
  }

  // The cells are filled before anything asserts on them.
  set('midi keyboard', midiState);
  set('sound from', 'here');
  log(`room ${ROOM}: open /wire/?notes=${ROOM}#notes in another browser to play into this one`);

  // ── how it works, last in the tab, drawn on its first showing ─────────────
  // Read off this file: `press` and `play`, `openWire` to the relay, and `remote`'s
  // offer and answer with the sound back as a WebRTC track (`startStandIn`).
  // See lessons/page-wire.md#wire-24
  const SPEC = {
    caption: 'Notes go through the relay as numbers, and sound from another machine comes back peer to peer.',
    // Order is layout, searched over all 72 arrangements: return paths must land on
    // each machine's bottom box. The far machine on the left leaves two, bottom to bottom.
    // See lessons/page-wire.md#wire-25
    nodes: [
      { id: 'far', label: 'Browser', sub: 'second machine', tech: 'browser', join: false,
        children: [
          { id: 'fkeys', label: 'keyboard', sub: 'notes in',
            note: 'Anybody else playing in the same room. Each note carries the moment it was sent, which '
                + 'is the arrived after cell.' },
          { id: 'synth', label: 'synth', sub: 'offers sound',
            note: 'Says it is here, makes a tone for every note the room sends, and answers an offer with '
                + 'that sound as a WebRTC track.' },
        ] },
      { id: 'you', label: 'Browser', sub: 'this tab', kind: 'here', tech: 'browser', join: false,
        children: [
          { id: 'keys', label: 'keyboard', sub: 'keys or MIDI',
            note: 'The drawn keys, the letter row, or a device through **Web MIDI**. Raw MIDI bytes never '
                + 'leave this page, only the note number.' },
          { id: 'audio', label: 'audio', sub: 'WebRTC track', tech: 'sound',
            note: 'The other machine\u2019s sound, played by an audio element once you ask for it. An '
                + '**AudioWorklet** hears each onset, so press to sound is timed on this clock alone.' },
          { id: 'voices', label: 'voices', sub: 'Web Audio', tech: 'sound',
            note: 'A synth on an **AudioContext** that sounds your own notes at once and plays the notes '
                + 'arriving from the room.' },
        ] },
      { id: 'cf', label: 'Cloudflare', sub: 'one worker', kind: 'cloud', tech: 'cloudflare',
        children: [
          { id: 'relay', label: 'Relay', sub: 'Durable Object', tech: 'relay',
            note: 'Sends each note to every socket in the room and keeps none. It also carries the WebRTC '
                + 'offer and answer, which is how the two machines find each other.' },
        ] },
    ],
    links: [
      { from: 'keys', to: 'voices',
        note: 'Your note sounds here at once, unless the other machine is making the sound.' },
      { from: 'keys', to: 'relay', label: 'note number',
        note: 'One JSON line of type on with the note and a velocity, in the envelope with sent and seq. '
            + 'A release is a second line, of type off.' },
      { from: 'relay', to: 'synth', label: 'notes', back: true,
        note: 'The same line, unchanged, to every other socket in the room.' },
      { from: 'fkeys', to: 'relay', label: 'notes',
        note: 'Their notes, in the same shape as yours.' },
      { from: 'relay', to: 'voices', label: 'notes', back: true,
        note: 'Played on the voices here and drawn on the over the relay lane, with how late each one '
            + 'arrived.' },
      { from: 'synth', to: 'audio', label: 'WebRTC',
        note: 'Audio straight between the two machines once the offer and answer have crossed the relay. '
            + 'Nothing in Cloudflare carries it.' },
    ],
  };
  const how = howIn(panel);
  // What the check found each box doing, filled in as it goes.
  const real = { keys: false, voices: false, relay: false, synth: false, fkeys: false, audio: false };

  return {
    show() { visible = true; how.draw(SPEC); },
    hide() { visible = false; },
    async check({ A }) {
      A('nothing is joined and no audio is made until a press in this tab',
        joins === 0 && ws === null && ctx === null,
        `${joins} socket(s), audio ${ctx ? ctx.state : 'none'} before the first press`);
      A('midi state reported honestly', !!readCell('midi keyboard'), String(readCell('midi keyboard')));
      A('says where the sound is made', !!readCell('sound from'), String(readCell('sound from')));
      A('both directions have a lane of their own', view.strip.lanes().length === 2,
        view.strip.lanes().map((l) => l.id).join(', '));

      // The octave pad is not pressable by the harness; `shiftOctave` is the
      // effect a press would have.
      {
        const wasBase = kb.base;
        const wasName = kb.keysEl.querySelector('.kn')?.textContent ?? '';
        const moved = kb.shiftOctave(1);
        const nowName = kb.keysEl.querySelector('.kn')?.textContent ?? '';
        kb.shiftOctave(-1);
        A('the octave buttons move every key on the keyboard',
          moved === wasBase + 12 && nowName !== wasName && kb.base === wasBase,
          `${wasName} became ${nowName} and came back, note ${wasBase} -> ${moved} -> ${kb.base}`);
      }

      await run('start');
      await until(() => ctx?.state === 'running', 3000);
      A('audio running', !!ctx && ctx.state === 'running', ctx?.state ?? 'none');
      const open = await until(() => ws?.state() === 1, 6000);
      A('relay open', open, open ? `1, room ${ROOM}` : `readyState ${ws?.state?.() ?? 'none'} after 6 s`);
      real.relay = open;

      await checkEvolutionLoop({ assert: A }, {
        keys: kb, heard: () => voiced,
        ports: (names) => offerLoopFor(kb, names, log), real: () => inputNames(midiAccess),
      });

      // The claim in the title, read off the line that actually went out.
      {
        const k = kb.keyOf(kb.base);
        kb.press(k, 'pointer'); await sleep(40); kb.release(k, 'pointer');
        let m = null;
        try { m = JSON.parse(lastLine || 'null'); } catch { /* asserted */ }
        const ok = !!m && m.type === 'on' && Number.isInteger(m.note) && m.note >= 0 && m.note < 128
          && !('data' in m) && !('status' in m) && !('bytes' in m);
        real.keys = ok && panel.el.contains(kb.keysEl);
        A('the wire carries note numbers, not MIDI bytes', ok,
          m ? `{${Object.keys(m).filter((x) => !['id', 'from', 'sent', 'seq', 'by'].includes(x)).join(', ')}} note ${m.note}` : 'no line went out');
      }

      await run('midi');
      A('says whether MIDI answered', midiState !== 'not yet', midiState);

      // With nobody offering, the button must say so and keep the sound here.
      await run('remote');
      A('with nobody offering, Hear the other machine keeps the sound here and says so',
        source === 'here' && readCell('sound from') === 'here' && pc === null,
        `${readCell('sound from')}, source ${source}, peer ${pc ? 'yes' : 'no'}`);

      // ── a second machine, standing in, inside this tab ──
      const far = await startStandIn(ROOM, log);
      try {
        const offered = await until(() => !!synth, 4000);
        await run('remote');
        const heard = await until(() => source === 'remote', 6000);
        real.synth = offered && heard;
        real.audio = heard && !!remoteAudio?.srcObject;
        A('a second peer offering sound is heard: its audio arrives and the page stops making its own',
          offered && heard && !!remoteAudio?.srcObject && (source === 'remote') === !!(pc && remoteAudio),
          `${offered ? 'offered' : 'nobody offered'}, ${heard ? 'track arrived' : 'no track'}, `
          + `ice ${pc?.iceConnectionState ?? 'none'}, sound ${readCell('sound from')}`);

        if (onsetsReady) await onsetsReady.catch(() => {});
        const before = ears.length;
        const k = kb.keyOf(kb.base + 7);
        kb.press(k, 'pointer'); await sleep(160); kb.release(k, 'pointer');
        const back = await until(() => ears.length > before, 2000);
        A('a press here comes back as sound from the other machine, timed on one clock',
          back && far.played() > 0 && Number.isFinite(ears[ears.length - 1]),
          back ? `${Math.round(ears[ears.length - 1])} ms press to sound, ${far.played()} note(s) made there`
            : `${far.played()} note(s) made there, no onset heard here`);

        const r0 = received;
        far.playInto(67);
        const came = await until(() => received > r0, 3000);
        real.fkeys = came;
        A('a note from the other machine lands here, with how late it was',
          came && Number.isFinite(lat[lat.length - 1]) && lat[lat.length - 1] >= 0
            && played.some((p) => p.who === 'there'),
          came ? `${lat[lat.length - 1]} ms after it was sent, on the over the relay lane` : 'nothing arrived');
      } finally {
        // Put the tab back the way a person would find it: the stand-in gone,
        // the sound made here again.
        far.close();
        try { pc?.close(); } catch { /* already */ }
        pc = null; synth = null; source = 'here';
        if (remoteAudio) remoteAudio.srcObject = null;
        set('sound from', 'here');
      }

      await gradeHow(A, how, SPEC);
      real.voices = voiced > 0 && !!voices;
      const missing = Object.entries(real).filter(([, ok]) => !ok).map(([k]) => k);
      A('its boxes are the parts this tab used: keys, voices, an open relay, and a second peer whose notes and sound arrived',
        missing.length === 0,
        missing.length ? `not seen doing its job: ${missing.join(', ')}` : `${voiced} note(s) voiced here, relay room ${ROOM}, peer sound over WebRTC`);
    },
  };

  // The tab's cells, read back from the DOM the report drew, because a tab's
  // readout is not `__demo.readout` (that is the page's, and it has none).
  function readCell(k) {
    const cell = [...panel.el.querySelectorAll('.pos-cell')]
      .find((c) => c.querySelector('.pos-k')?.textContent === k);
    const v = cell?.querySelector('.pos-v');
    if (!v) return null;
    const unit = v.querySelector('.pos-u')?.textContent ?? '';
    const t = v.textContent ?? '';
    return unit && t.endsWith(unit) ? t.slice(0, -unit.length) : t;
  }
}

/** Wait for host candidates to be gathered, with a ceiling. */
function gathered(pc, ms = 3000) {
  return new Promise((r) => {
    if (pc.iceGatheringState === 'complete') return r();
    const t = setTimeout(r, ms);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') { clearTimeout(t); r(); }
    });
  });
}

/**
 * The other machine, stand-in, only under a check: own socket and AudioContext,
 * speaks rig/m1/synth.html's `here`, `offer`, `answer` plus `on`/`off`. A note
 * becomes a short tone, since an onset detector over silence never fires.
 * See lessons/page-wire.md#wire-26
 */
async function startStandIn(room, log) {
  const ac = new AudioContext();
  ac.resume().catch(() => {});
  const dest = ac.createMediaStreamDestination();
  let made = 0;
  let pc2 = null;
  const tone = (note) => {
    made++;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = 440 * 2 ** ((note - 69) / 12);
    g.gain.setValueAtTime(0.3, ac.currentTime);
    g.gain.setValueAtTime(0, ac.currentTime + 0.12);
    o.connect(g).connect(dest);
    o.start(); o.stop(ac.currentTime + 0.15);
  };
  const w = openWire(room, {
    by: 'tool',
    onOpen: () => w.send({ type: 'here', ns: 'stand-in' }),
    onMessage: async (got) => {
      if (got.kind !== 'json') return;
      const m = got.msg;
      if (m.from === w.stats().from) return;
      if (m.type === 'on') { tone(m.note); return; }
      if (m.type === 'offer') {
        try { pc2?.close(); } catch { /* already */ }
        pc2 = new RTCPeerConnection({ iceServers: [] });
        for (const t of dest.stream.getAudioTracks()) pc2.addTrack(t, dest.stream);
        await pc2.setRemoteDescription({ type: 'offer', sdp: m.sdp });
        await pc2.setLocalDescription(await pc2.createAnswer());
        await gathered(pc2);
        w.send({ type: 'answer', sdp: pc2.localDescription.sdp, ns: 'stand-in' });
      }
    },
  });
  await until(() => w.state() === 1, 6000);
  log('a stand-in for the other machine joined the room, for this check only');
  return {
    played: () => made,
    playInto: (note) => { w.send({ type: 'on', note, vel: 100, src: 'touch' }); w.send({ type: 'off', note }); },
    close: () => { try { pc2?.close(); } catch { /* gone */ } w.close(); ac.close().catch(() => {}); },
  };
}

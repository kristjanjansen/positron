// demo/shell/openers.mjs: what opens a described link for real, chosen by the transport
// its session names (`relay-h264`, `relay`, `ingest`, `https`, `bytes`, ...), never by
// medium. Another page's port is opened by that page. Harness guards are the page's.
// why: lessons/kit-openers.md#header

import { el } from './shell.mjs';
import { createBoard } from './board.mjs';
import { createVideoPanel } from './video-panel.mjs';
import { createKeyboard, keyRange } from './keyboard.mjs';
import { createCore, toHex } from './route-core.mjs';
import { RELAY_BASE } from './wire.mjs';
import { openSession, createShipper, fetchBack, ARCHIVE_BASE } from './ingest.mjs';
import { checkOptions, videoStart } from './link-options.mjs';

/** The board drops a capture nobody renews; `/away/` measured 20 s as safe. */
export const RENEW_MS = 20_000;
/** A recording's pieces, which ingest stores four seconds at a time. */
export const SEG_MS = 4000;

/**
 * Which openers may take a link, by its session's transport. A transport missing here
 * is one nothing in this file opens yet, and says so.
 * why: lessons/kit-openers.md#by-transport
 */
export const BY_TRANSPORT = {
  bytes: ['keys', 'notes'],
  relay: ['listen', 'synth'],
  datachannel: ['listen', 'synth'],
  'relay-h264': ['video'],
  ingest: ['record'],
  https: ['play'],
  // A link inside one board's JACK graph: the board applies it.
  // why: lessons/kit-openers.md#jack-transport
  jack: ['jack'],
};

/**
 * A board capture lease: asked for, renewed every `everyMs`, dropped by the board when
 * nobody renews. Ask only once the socket is open; an earlier ask goes nowhere.
 * @param {object} o
 * @param {Function} o.ask     `board.ask`: `(msg, replyType, timeoutMs) => Promise<reply|null>`
 * @param {string} [o.type]    the verb, `input.want`
 * @param {string} [o.reply]   its answer, `input.wanted`
 * @param {string} [o.what]    what a log line calls the thing leased
 * @returns {{ stop(): void, renewals(): number, last(): object|null }}
 * why: lessons/kit-openers.md#create-lease
 */
export function createLease({ ask, type = 'input.want', reply = 'input.wanted', everyMs = RENEW_MS, timeoutMs = 6000,
  what = 'the capture', log = () => {} } = {}) {
  let n = 0, last = null, stopped = false;
  const want = async () => {
    if (stopped) return;
    n++;
    const r = await ask({ type }, reply, timeoutMs);
    last = r;
    if (!r) log(`nothing answered ${type} for ${what}`, 'warn');
    else if (r.started) log(`the board started ${what}`, 'ok');
  };
  want();
  const timer = setInterval(want, everyMs);
  return {
    stop() { stopped = true; clearInterval(timer); },
    renewals: () => n,
    last: () => last,
  };
}

/**
 * The openers for one page.
 * @param {object} o
 * @param {Function} o.log            `(line, kind)`
 * @param {HTMLElement} o.host        where a keyboard or a picture goes
 * @param {object} o.self             this page's own ends, each an id or a list
 *                                    of ids: `{ keys, screenAudio, screenVideo }`
 * @param {Function} [o.isRemote]     `(portId, bay) => bool`: a port another
 *                                    page owns and opens itself
 * @param {Function} [o.request]      `(source, target, open) => Promise<link.state|null>`,
 *                                    `bay-node.mjs`'s `request`
 * @param {object} [o.recordings]     `{ latest(), add(row) }`, the recordings
 *                                    this browser made, for `play`
 * @param {Function} [o.onCore]       called whenever a MIDI link's core moved a note
 */
export function createOpeners({ log = () => {}, host, self = {}, isRemote = () => false, request = async () => null,
  recordings = { latest: () => null, add: () => {} }, onCore = () => {} } = {}) {
  const is = (id, which) => [].concat(self[which] || []).includes(id);
  const nodeOf = (id) => id.split(':').slice(0, 2).join(':');
  const kindOfNode = (b, id) => b.node(nodeOf(id))?.kind;

  /**
   * Which opener takes this link, and why not when none does. Pure apart from
   * reading the bay, so a page grades it on a scratch bay.
   * @returns {{ kind: string|null, transport: string, why?: string }}
   */
  function pick(l, b) {
    const transport = l.session?.transport ?? 'bytes';
    if (isRemote(l.from, b)) return { kind: 'remote', transport };
    const a = b.port(l.from), z = b.port(l.to);
    if (!a || !z) return { kind: null, transport, why: `${!a ? l.from : l.to} is not on this desk any more` };
    const may = BY_TRANSPORT[transport];
    if (!may) return { kind: null, transport, why: `nothing here opens ${transport} yet` };
    const fits = {
      keys: () => a.medium === 'midi' && is(l.from, 'keys') && !!z.address && kindOfNode(b, l.to) !== 'engine',
      notes: () => a.medium === 'midi' && is(l.from, 'keys') && !!z.address && kindOfNode(b, l.to) === 'engine',
      listen: () => a.medium === 'audio' && is(l.to, 'screenAudio') && !!a.address && kindOfNode(b, l.from) !== 'engine'
        && kindOfNode(b, l.from) !== 'store',
      synth: () => a.medium === 'audio' && is(l.to, 'screenAudio') && !!a.address && kindOfNode(b, l.from) === 'engine',
      video: () => a.medium === 'video' && is(l.to, 'screenVideo') && !!a.address,
      record: () => a.medium === 'audio' && kindOfNode(b, l.to) === 'store' && !!a.address && kindOfNode(b, l.from) !== 'store',
      play: () => a.medium === 'audio' && kindOfNode(b, l.from) === 'store' && is(l.to, 'screenAudio'),
      jack: () => a.medium === 'audio' && Array.isArray(l.session?.rows) && !!l.session.address,
    };
    const kind = may.find((k) => fits[k]());
    return kind ? { kind, transport }
      : { kind: null, transport, why: `${transport} from ${l.from} to ${l.to} is not something this page opens` };
  }

  /** A board on `room`, resolved once its socket is open (or after 6 s). */
  async function boardOn(room, extra = {}) {
    let joined;
    const isOpen = new Promise((r) => { joined = r; });
    const board = createBoard({ room, of: 'Raspberry Pi', showName: false, log: (line, kind) => log(line, kind),
      onOpen: () => joined(), ...extra });
    await Promise.race([isOpen, new Promise((r) => setTimeout(r, 6000))]);
    return board;
  }

  /**
   * One board per sound, held by count; the last link to let go closes it. Silent until
   * a listen link puts the speaker edge back, so a record link alone plays nothing.
   * why: lessons/kit-openers.md#hold-source
   */
  const sources = new Map();          // room -> { users, ready, board, ctx, out, lease }
  function holdSource(room) {
    let s = sources.get(room);
    if (s) { s.users++; return s.ready.then(() => s); }
    s = { users: 1 };
    sources.set(room, s);
    s.ready = (async () => {
      let joined;
      const isOpen = new Promise((r) => { joined = r; });
      const board = createBoard({ room, of: 'Raspberry Pi', showName: false, cushionMs: 80, maxCushionMs: 250,
        direct: true, directCushionMs: 40, log: (line, kind) => log(line, kind), onOpen: () => joined() });
      const ctx = await board.startAudio();
      await Promise.race([isOpen, new Promise((r) => setTimeout(r, 6000))]);
      const out = board.playout();
      if (!out) { board.close(); throw new Error('the board gave no sound to tap'); }
      try { out.disconnect(ctx.destination); } catch { /* not connected */ }
      board.goDirect({ frameMs: 10 });
      const lease = createLease({ ask: (m, r, t) => board.ask(m, r, t), what: `the ${room} capture`, log });
      Object.assign(s, { board, ctx, out, lease });
    })();
    return s.ready.then(() => s, (e) => { sources.delete(room); throw e; });
  }
  function dropSource(room) {
    const s = sources.get(room);
    if (!s || --s.users > 0) return;
    sources.delete(room);
    s.lease?.stop();
    try { s.out?.disconnect(); } catch { /* */ }
    s.board?.close();
    s.ctx?.close().catch(() => { /* already closed */ });
  }

  // ── the openers. Each answers `{ kind, via(), state(), count(), close(), where?() }`.
  // `count()` is what arrived ON THE FAR SIDE, for `link-badge.mjs`, or null
  // where nothing on the far side can be counted from here.

  async function remote(l) {
    const r = await request(l.from, l.to, true);
    if (!r) throw new Error(`the page that owns ${l.from} did not answer`);
    if (!r.open) throw new Error(`the page that owns ${l.from} refused: ${r.why || 'no reason given'}`);
    return {
      kind: 'remote',
      via: () => 'its page',
      state: () => 'open, by its page',
      count: () => null,
      close: () => { request(l.from, l.to, false); },
    };
  }

  async function synth(l, b) {
    const room = b.port(l.from).address, source = b.node(nodeOf(l.from))?.label;
    const board = await boardOn(room, { cushionMs: 160, maxCushionMs: 300 });
    const ctx = await board.startAudio();
    const out = board.playout();
    if (out) { try { out.connect(ctx.destination); } catch { /* already */ } }
    // A cold synth takes seconds to start, so the wait is long and says so.
    board.ask({ type: 'audio.start', source }, 'audio.started', 20000).then((r) => {
      if (!r) log(`${source} did not answer within 20 s`, 'warn');
      else log(r.ok ? `${source} is playing on the board` : `the board said ${r.reason}`, r.ok ? 'ok' : 'warn');
    });
    return {
      kind: 'synth',
      via: () => board.stats().via || 'relay',
      state: () => `${board.stats().frames} fr`,
      count: () => board.stats().frames,
      close: () => {
        try { out?.disconnect(); } catch { /* */ }
        board.send({ type: 'audio.stop' }); board.close();
        ctx?.close().catch(() => { /* already closed */ });
      },
    };
  }

  async function video(l, b) {
    // The room is the board node's place, not the port's site (pi-1 lives in studio-1).
    // why: lessons/kit-openers.md#room-is-place
    const room = b?.node(nodeOf(l.from))?.place ?? l.from.split(':')[0];
    if (typeof VideoDecoder !== 'function') throw new Error('this browser has no WebCodecs, so the board’s video cannot be decoded here');
    // Size and rate are the link's (link-options.mjs), default 1280x720 at 30. Checked
    // again here because a link can be built without the bay, and the board clamps.
    // why: lessons/kit-openers.md#video-options
    const bad = checkOptions('video', l.options);
    if (bad) throw new Error(bad.why);
    const ask = videoStart(l.options);
    const board = await boardOn(room);
    const r = await board.ask(ask, 'video.started', 20000);
    if (!r || !r.ok) { board.close(); throw new Error(r ? (r.reason || 'the board refused') : 'the board did not answer within 20 s'); }
    // One encoder, so the first viewer's size wins; this link logs the shape it got.
    // why: lessons/kit-openers.md#first-viewer-wins
    if (r.w && (r.w !== ask.w || r.h !== ask.h || r.fps !== ask.fps)) {
      log(`asked for ${ask.w}x${ask.h} at ${ask.fps}, and the board is ${r.already ? 'already ' : ''}drawing ${r.w}x${r.h} at ${r.fps}, so that is what this link shows`, 'warn');
    }
    const canvas = document.createElement('canvas');
    canvas.width = r.w ?? ask.w; canvas.height = r.h ?? ask.h;
    const panel = createVideoPanel({ media: canvas, left: false });
    host.append(panel.el);
    const g = canvas.getContext('2d');
    let frames = 0;
    const decoder = new VideoDecoder({
      output: (vf) => { g.drawImage(vf, 0, 0, canvas.width, canvas.height); vf.close(); frames++; },
      error: (e) => log(`decode error ${String(e.message ?? e).slice(0, 80)}`, 'bad'),
    });
    decoder.configure({ codec: r.codec ?? 'avc1.42E01E', optimizeForLatency: true });
    // ⚠️ THE FRAME HEADER IS THE BOARD'S: a sequence number and a flags word,
    // eight bytes, and nothing decodes until a keyframe, as on `/mirror/`.
    let waitKey = true;
    const vws = new WebSocket(`${RELAY_BASE}/room/${r.room}/ws`);
    vws.binaryType = 'arraybuffer';
    vws.onmessage = (e) => {
      if (typeof e.data === 'string') return;
      const dv = new DataView(e.data);
      const seq = dv.getUint32(0, true), key = (dv.getUint32(4, true) & 1) === 1;
      if (waitKey) { if (!key) return; waitKey = false; }
      try { decoder.decode(new EncodedVideoChunk({ type: key ? 'key' : 'delta', timestamp: seq * 1e6 / (r.fps ?? ask.fps), data: new Uint8Array(e.data, 8) })); }
      catch { waitKey = true; }
    };
    // The board stops drawing when nobody says they are watching.
    const watch = setInterval(() => board.send({ type: 'video.watching' }), 10000);
    board.send({ type: 'video.watching' });
    return {
      kind: 'video',
      panel,
      via: () => 'relay-h264',
      state: () => `${frames} fr`,
      count: () => frames,
      close: () => { clearInterval(watch); try { vws.close(); } catch { /* */ } try { decoder.close(); } catch { /* */ } panel.el.remove(); board.close(); },
    };
  }

  async function listen(l, b) {
    const room = b.port(l.from).address;
    const s = await holdSource(room);
    s.out.connect(s.ctx.destination);
    return {
      kind: 'listen',
      via: () => s.board.stats().via || 'relay',
      state: () => `${s.board.stats().frames} fr`,
      count: () => s.board.stats().frames,
      close: () => { try { s.out.disconnect(s.ctx.destination); } catch { /* */ } dropSource(room); },
    };
  }

  // ── recording into the store, and playing it back ──────────────────────
  // Records the held source to WebM and ships 4 s pieces through ingest (open, seg, close).
  // WebM gets no HLS playlist, so playback joins every piece into one Blob.
  // why: lessons/kit-openers.md#record
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  async function record(l, b) {
    const room = b.port(l.from).address;
    if (typeof MediaRecorder !== 'function') throw new Error('this browser has no MediaRecorder');
    const choice = [['audio/webm;codecs=opus', 'webm'], ['audio/webm', 'webm'], ['audio/mp4', 'mp4']]
      .find(([m]) => MediaRecorder.isTypeSupported(m));
    if (!choice) throw new Error('this browser records neither WebM nor MP4 audio');
    const [mime, fmt] = choice;
    // The session first, so a refusal (five an hour per address) wakes nothing.
    const sess = await openSession({ log: (m, k) => log(m, k) });
    if (!sess) throw new Error('ingest gave no session, the line above says why');
    const s = await holdSource(room);
    const tap = s.ctx.createMediaStreamDestination();
    s.out.connect(tap);
    const ship = createShipper(sess.session, { fmt, log: (m, k) => log(m, k) });
    const rec = new MediaRecorder(tap.stream, { mimeType: mime, audioBitsPerSecond: 96000 });
    rec.ondataavailable = (e) => {
      ship.put(e.data);
      if (ship.stats().failed && rec.state === 'recording') rec.stop();
    };
    const startedAt = Date.now();
    rec.start(SEG_MS);
    const lives = `${ARCHIVE_BASE}/${sess.session}/`;
    log(`recording ${room} into ${lives}, ${SEG_MS / 1000} s pieces, kept ${sess.limits.ttlHours ?? 6} h`, 'ok');
    let stopping = false;
    return {
      kind: 'record',
      via: () => 'ingest',
      where: () => `recording to ${lives}`,
      state: () => {
        const st = ship.stats();
        return st.failed ? 'stopped, refused' : `${stopping ? 'closing' : 'rec'} ${st.segments}, ${kb(st.bytes)}`;
      },
      // Pieces ingest ANSWERED for, which is the far side of an upload.
      count: () => ship.stats().segments,
      close: () => {
        stopping = true;
        const stopped = new Promise((r) => { rec.addEventListener('stop', r, { once: true }); setTimeout(r, 3000); });
        try { if (rec.state !== 'inactive') rec.stop(); } catch { /* */ }
        stopped.then(async () => {
          try { s.out.disconnect(tap); } catch { /* */ }
          dropSource(room);
          const seconds = Math.round((Date.now() - startedAt) / 1000);
          const j = await ship.finish();
          if (!j) return;
          recordings.add({ session: sess.session, manifest: j.manifest, mime, seconds,
            segments: j.segments, bytes: j.bytes, expiresAt: sess.expiresAt, from: l.from });
          log(`recorded ${seconds} s of ${l.from}, ${j.segments} pieces, ${kb(j.bytes)}, lives at ${j.manifest} `
            + `until ${new Date(sess.expiresAt).toLocaleTimeString()}`, 'ok');
        });
      },
    };
  }

  /** The newest recording this page made, fetched back from R2 and played. */
  async function play() {
    const r = recordings.latest();
    if (!r) throw new Error('this browser has made no recording yet, so open a link into the recordings and close it first');
    const blob = await fetchBack(r.manifest, r.mime, { log: (m, k) => log(m, k) });
    if (!blob) throw new Error(`${r.manifest} did not come back, and a recording older than six hours has been deleted`);
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.src = url;
    audio.play().catch(() => log('the browser wants a press before it plays, so press Open again', 'warn'));
    log(`playing ${r.session}, ${r.seconds} s and ${kb(blob.size)} fetched back from R2`, 'ok');
    return {
      kind: 'play',
      via: () => 'R2',
      where: () => `playing ${r.manifest}`,
      // A WebM joined from pieces has no duration in its header, so the length
      // is the one measured while recording.
      state: () => (audio.ended ? 'played' : `${audio.paused ? 'paused' : 'play'} ${Math.round(audio.currentTime)} of ${r.seconds} s`),
      // Tenths of a second actually played here, the far side of a playback.
      count: () => Math.floor(audio.currentTime * 10),
      close: () => { audio.pause(); audio.removeAttribute('src'); URL.revokeObjectURL(url); },
    };
  }

  /**
   * Notes run through a routing core per MIDI link (keys in, instrument out, transforms
   * as ops, the instrument's `never` as gate). No `count()`: the board acks no note.
   * why: lessons/kit-openers.md#keys
   */
  function keys(l, b, notes = false) {
    const to = b.port(l.to);
    const ch = (to.shape?.channels || [1])[0];
    const core = createCore();
    core.addPort({ id: 'keys', dir: 'in' });
    core.addPort({ id: 'out', dir: 'out', accepts: to.accepts?.length ? to.accepts : undefined,
      policy: Object.fromEntries((to.never || []).map((k) => [k, 'deny'])) });
    // The link's own transforms, then the instrument's channel if none set one.
    const ops = [...(l.transforms || [])];
    if (!notes && !ops.some((o) => o.op === 'channel')) ops.push({ op: 'channel', to: ch });
    const made = core.link({ id: 'L', from: 'keys', to: 'out', ops });
    if (!made.ok) throw new Error(`the routing core refused the link: ${made.reason}`);
    const stats = { in: 0, out: 0, dropped: 0, last: '' };
    const board = createBoard({ room: to.address, of: 'Raspberry Pi', showName: false, log: (line, kind) => log(line, kind) });
    const send = (bytes) => {
      if (notes) {
        const on = (bytes[0] & 0xF0) === 0x90 && bytes[2] > 0;
        return board.send(on ? { type: 'note.on', note: bytes[1], vel: bytes[2], channel: 0 } : { type: 'note.off', note: bytes[1], channel: 0 });
      }
      return board.send({ type: 'midi.send', bytes });
    };
    const through = (bytes) => {
      stats.in++;
      const out = core.input({ port: 'keys', t: Math.round(performance.now()), bytes });
      if (!out.length) stats.dropped++;
      for (const e of out) { if (send(e.bytes)) stats.out++; stats.last = `${toHex(bytes)} became ${toHex(e.bytes)}`; }
      onCore();
    };
    const keyboard = createKeyboard(el('div'), {
      ...keyRange(), base: 48,
      onDown: (note) => { keyboard.lightNote(note, true); through([0x90, note, 100]); },
      onUp: (note) => { keyboard.lightNote(note, false); through([0x80, note, 0]); },
    });
    host.append(keyboard.el);
    return {
      kind: notes ? 'notes' : 'keys', core, ops, stats,
      via: () => 'relay',
      state: () => `${stats.out} out`,
      count: () => null,
      // Closing asks the core to release what it is holding: note offs, then
      // all notes off, which is vector 08 and 18 doing their job on a real wire.
      close: () => { for (const e of core.unlink('L', Math.round(performance.now()))) send(e.bytes); keyboard.el.remove(); board.close(); onCore(); },
    };
  }

  /**
   * A link inside the board's JACK graph: the page asks `jack.link`, the board resolves
   * and applies it; `count()` is the rows read back. Closing cuts only what nothing else wants.
   * why: lessons/kit-openers.md#jack
   */
  async function jack(l, b) {
    const room = l.session.address;
    const line = `${l.from} -> ${l.to}`;
    const board = await boardOn(room);
    const r = await board.ask({ type: 'jack.link', link: line }, 'jack.linked', 8000);
    if (!r || !r.ok) {
      board.close();
      throw new Error(!r ? 'the board did not answer within 8 s'
        : [...(r.problems ?? []), r.hint].filter(Boolean).join('. ') || 'the board read back something else');
    }
    const connected = (r.rows ?? []).filter((x) => (r.feeding?.[x.to] ?? []).includes(x.from)).length;
    log(`${line} is ${r.rows.length} JACK row${r.rows.length === 1 ? '' : 's'} on the board, ${r.says}, ${connected} read back`, 'ok');
    return {
      kind: 'jack',
      via: () => 'jack',
      state: () => `${connected} of ${r.rows.length} rows`,
      count: () => connected,
      rows: () => r.rows,
      close: () => {
        board.ask({ type: 'jack.unlink', link: line }, 'jack.unlinked', 8000).then((u) => {
          if (!u) log(`${line}: the board did not answer the unlink`, 'warn');
          else log(`${line} unlinked, ${u.cut?.length ?? 0} row(s) cut and ${u.kept?.length ?? 0} kept because the board still wants them`, u.ok ? 'ok' : 'warn');
        }).finally(() => board.close());
      },
    };
  }

  /** The table a page opens through, by kind. Every entry is `(link, bay) => Promise<handle>`. */
  const table = {
    remote: (l) => remote(l),
    listen: (l, b) => listen(l, b),
    synth: (l, b) => synth(l, b),
    video: (l, b) => video(l, b),
    keys: async (l, b) => keys(l, b),
    notes: async (l, b) => keys(l, b, true),
    record: (l, b) => record(l, b),
    play: () => play(),
    jack: (l, b) => jack(l, b),
  };

  return { pick, table, holdSource, dropSource, sources, boardOn };
}

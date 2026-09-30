// rig/board/inputs.mjs — hardware audio inputs, each streamed into a room of its own.
//
// Asked 2026-09-30: *"can we support both yoshimi and circuit? current setup
// does not scale"*. Until then the board had ONE audio slot and ONE room, so
// starting Yoshimi took the Circuit off the air and the other way round. The
// single slot was right about one thing and it stays right: two sources
// interleaved into ONE socket is corruption (board.mjs `startAudio` records
// the 5,495 dropped frames). What this file changes is the unit. An input is
// not a source in the instrument slot, it is a stream of its own, on a socket
// of its own, in a room of its own: `<room>-<name>`, the same shape the video
// already uses with `<room>-video`.
//
// 🔴 A PAGE ASKS FOR A NAME, NEVER A DEVICE. What `circuit` means on this
// board is configuration (`BOARD_INPUTS` in /etc/default/positron-board), so
// nothing that arrives over the relay can make this process open an arbitrary
// ALSA device.
//
// 🔴 AN INPUT RUNS ONLY WHILE SOMEBODY IS ASKING FOR IT. The board cannot see a
// listener: the relay forwards frames verbatim and never says who is there. So
// a listening page renews a lease with `input.want`, and the capture stops
// `LEASE_MS` after the last renewal. Streaming 50 frames a second into an empty
// room all day costs relay time for nothing.
//
// ⚠️ THE ROOM IS JOINED FOR GOOD, THE DEVICE IS NOT. The socket stays open and
// says `board.alive` every beat, so a page's presence badge reads `online`
// before anything is playing; only `arecord` comes and goes with the lease.

export const LEASE_MS = 60_000;
export const BEAT_MS = 5_000;
const NAME_RE = /^[a-z0-9]{1,24}$/;

/**
 * `BOARD_INPUTS` is JSON: `{"circuit":{"device":"hw:CARD=Pro,DEV=0","channels":2,"take":1}}`.
 * JSON rather than a delimited string because an ALSA device name already
 * contains `:` and `,`, which is where a hand-rolled format goes wrong.
 * Returns every valid input and a reason for every refused one; a bad entry
 * never takes the good ones down with it.
 */
export function parseInputs(text) {
  const inputs = new Map();
  const problems = [];
  if (!text || !String(text).trim()) return { inputs, problems };
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return { inputs, problems: [`BOARD_INPUTS is not JSON: ${e.message}`] }; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { inputs, problems: ['BOARD_INPUTS is an object of name to input'] };
  }
  for (const [name, v] of Object.entries(raw)) {
    if (!NAME_RE.test(name)) { problems.push(`${JSON.stringify(name)}: a name is 1 to 24 of a-z and 0-9`); continue; }
    const device = v?.device;
    if (typeof device !== 'string' || !device || /\s/.test(device)) { problems.push(`${name}: device is an ALSA name with no spaces`); continue; }
    const channels = Number(v.channels ?? 1);
    if (!Number.isInteger(channels) || channels < 1 || channels > 8) { problems.push(`${name}: channels is 1 to 8`); continue; }
    const take = Number(v.take ?? 1);
    if (!Number.isInteger(take) || take < 1 || take > channels) { problems.push(`${name}: take is 1 to ${channels}`); continue; }
    inputs.set(name, { name, device, channels, take });
  }
  return { inputs, problems };
}

/**
 * One channel out of an interleaved frame. `take` is 1-based.
 * ⚠️ Not a downmix: an input with nothing patched still has its gain up and
 * its own noise, and summing it in would put that under the instrument.
 */
export function takeChannel(all, channels, take, frame) {
  if (channels === 1) return all;
  const one = new Int16Array(frame);
  for (let i = 0; i < frame; i++) one[i] = all[i * channels + take - 1];
  return one;
}

/** Has the lease run out. Pure, so the sweep's one decision is graded. */
export function leaseExpired(lease, now) {
  return !(Number.isFinite(lease) && now < lease);
}

/**
 * The live half. Everything that touches a socket or a process comes in as an
 * argument, so a test can run it against fakes.
 */
export function createInputs({
  inputs, room, relay, frame, rate, name: boardName, id: boardId,
  spawn, WebSocket, format, parse, randomId, log = () => {}, now = () => Date.now(),
  leaseMs = LEASE_MS, beatMs = BEAT_MS,
}) {
  const live = new Map();

  function one(cfg) {
    const s = {
      cfg, room: `${room}-${cfg.name}`, from: `board-${cfg.name}-${randomId(6)}`,
      ws: null, seq: 0, aseq: 0, proc: null, lease: 0, frames: 0, startedAt: null, lastHeard: now(),
      backoff: 500, closed: false,
    };
    const send = (msg) => {
      if (s.ws?.readyState !== 1) return false;
      s.ws.send(format(msg, { from: s.from, seq: s.seq++ }));
      return true;
    };
    const shape = () => ({ name: boardName, id: boardId, input: cfg.name, audioChannels: 1, frameMs: 1000 * frame / rate });
    const alive = () => ({ type: 'board.alive', ...shape(), audio: s.proc ? cfg.name : null, frames: s.frames,
                           leaseLeftMs: s.proc ? Math.max(0, s.lease - now()) : 0 });
    const status = () => ({ ok: !!s.proc, source: cfg.name, room: s.room, device: cfg.device,
                            frames: s.frames, leaseLeftMs: s.proc ? Math.max(0, s.lease - now()) : 0,
                            ...(s.proc ? {} : { reason: 'nothing playing' }) });

    function sendPcm(int16) {
      if (s.ws?.readyState !== 1) return;
      const out = Buffer.allocUnsafe(12 + int16.byteLength);
      out.writeUInt32LE(s.aseq++, 0);
      out.writeDoubleLE(performance.now(), 4);
      Buffer.from(int16.buffer, int16.byteOffset, int16.byteLength).copy(out, 12);
      s.ws.send(out);
      s.frames++;
    }

    function startCapture() {
      if (s.proc) return;
      const p = spawn('arecord', ['-D', cfg.device, '-f', 'S16_LE', '-r', String(rate),
        '-c', String(cfg.channels), '-t', 'raw', '-q'], { stdio: ['ignore', 'pipe', 'pipe'] });
      const IN = frame * 2 * cfg.channels;
      let carry = Buffer.alloc(0);
      p.stdout.on('data', (chunk) => {
        carry = carry.length ? Buffer.concat([carry, chunk]) : chunk;
        while (carry.length >= IN) {
          const all = new Int16Array(carry.buffer.slice(carry.byteOffset, carry.byteOffset + IN));
          sendPcm(takeChannel(all, cfg.channels, cfg.take, frame));
          carry = carry.subarray(IN);
        }
      });
      // arecord's stderr is the only clue when a device is busy or gone.
      p.stderr.on('data', (d) => log(`${cfg.name} arecord:`, String(d).trim()));
      p.on('exit', (code) => {
        log(`${cfg.name}: arecord exited ${code} after ${s.frames} frames`);
        if (s.proc === p) s.proc = null;
        send(alive());
      });
      s.proc = p; s.startedAt = now();
      log(`${cfg.name}: capturing ${cfg.device} channel ${cfg.take} of ${cfg.channels} into ${s.room}`);
    }

    function stopCapture(why) {
      if (!s.proc) return false;
      const p = s.proc; s.proc = null;
      try { p.kill('SIGTERM'); } catch { /* already gone */ }
      log(`${cfg.name}: stopped, ${why}`);
      send(alive());
      return true;
    }

    function handle(msg) {
      const reply = (type, body) => send({ type, re: msg.id, ...body });
      if (msg.type === 'input.want') {
        s.lease = now() + leaseMs;
        const was = !!s.proc;
        startCapture();
        return reply('input.wanted', { ...status(), started: !was });
      }
      if (msg.type === 'input.stop') {
        s.lease = 0;
        return reply('input.stopped', { ok: stopCapture('asked'), source: cfg.name });
      }
      if (msg.type === 'audio.status') return reply('audio.started', status());
      return undefined;
    }

    function connect() {
      if (s.closed) return;
      const ws = new WebSocket(`${relay}/room/${s.room}/ws`);
      ws.binaryType = 'arraybuffer';
      s.ws = ws;
      ws.onopen = () => {
        s.backoff = 500; s.lastHeard = now();
        log(`${cfg.name}: joined ${s.room}`);
        send({ type: 'board.hello', ...shape() });
      };
      ws.onmessage = (e) => {
        s.lastHeard = now();
        if (typeof e.data !== 'string') return;
        const { kind, msg } = parse(e.data);
        if (kind !== 'json' || msg.from === s.from) return;
        try { handle(msg); } catch (err) { log(`${cfg.name}: handler threw`, err.message); }
      };
      ws.onclose = () => {
        if (s.ws === ws) s.ws = null;
        if (s.closed) return;
        log(`${cfg.name}: socket closed, retrying in ${s.backoff} ms`);
        setTimeout(connect, s.backoff);
        s.backoff = Math.min(s.backoff * 2, 30_000);
      };
      ws.onerror = () => {};
    }

    // The beat: proof of life for the page, the lease sweep, and the same
    // self-echo watchdog the main socket uses, because a dead socket does not
    // always close.
    function beat() {
      if (s.proc && leaseExpired(s.lease, now())) stopCapture('nobody renewed the lease');
      if (s.ws?.readyState === 1 && now() - s.lastHeard > 3 * beatMs + 1000) {
        log(`${cfg.name}: no echo, reconnecting`);
        try { s.ws.close(); } catch { /* the point */ }
        return;
      }
      send(alive());
    }

    return {
      s, connect, beat, handle, status, stopCapture,
      close() { s.closed = true; stopCapture('shutting down'); try { s.ws?.close(); } catch {} },
    };
  }

  for (const cfg of inputs.values()) live.set(cfg.name, one(cfg));
  let timer = null;

  return {
    start() {
      for (const x of live.values()) x.connect();
      timer = setInterval(() => { for (const x of live.values()) x.beat(); }, beatMs);
      timer.unref?.();
    },
    status: () => Object.fromEntries([...live].map(([k, x]) => [k, x.status()])),
    get: (name) => live.get(name),
    close() { clearInterval(timer); for (const x of live.values()) x.close(); },
  };
}

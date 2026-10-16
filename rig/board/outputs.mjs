// The board's own outputs beyond jackd's card: the Pi 4's 3.5 mm jack (PWM, ALSA card
// `Headphones`) bridged onto JACK by `alsa_out`, and two test signals from `jack_metro`.
// Each is a JACK client kept alive with a backoff; a link (`jack.link`) decides who hears what.
// alsa_out resamples between two clocks: a test signal, not a clean recording.

import { PHONES_JACK, TEST_SIGNALS } from '../../demo/shell/graph-registry.mjs';

export const PHONES = { name: 'phones', card: 'Headphones', device: 'hw:CARD=Headphones', channels: 2 };
export { PHONES_JACK };

// The tone is a 60 bpm beep held for 990 ms of each 1000: a near-steady 440 Hz.
const METRO = { click: ['-A', '0.5', '-D', '20'], tone: ['-A', '0.25', '-D', '990', '-a', '1', '-d', '1'] };
export const TEST_SOURCES = TEST_SIGNALS.map((t) => ({ ...t, args: ['-b', String(t.bpm), '-f', String(t.hz), ...METRO[t.name]] }));

/** The graph's facts: which outputs and test sources this board has. */
export function outputFacts({ phones }) {
  return { outputs: phones ? [{ device: PHONES.device, jack: PHONES_JACK }] : [],
           tests: TEST_SOURCES.map(({ name, label, jack }) => ({ name, label, jack })) };
}

/** The processes to keep alive, as `[cmd, args, what]`. */
export function clientsFor({ phones }) {
  return [
    ...(phones ? [['alsa_out', ['-j', PHONES.name, '-d', PHONES.device, '-r', '48000', '-c', String(PHONES.channels), '-p', '512', '-n', '3'], 'phones']] : []),
    ...TEST_SOURCES.map((t) => ['jack_metro', ['-n', `pos${t.name}`, ...t.args], t.name]),
  ];
}

// The jack's level: ALSA's `PCM` control on the card, in dB, -40 to 0 here (the card goes to +4).
export const LEVEL_RANGE = [-40, 0];
export const parseLevel = (text) => { const m = /\[(-?\d+(?:\.\d+)?)dB\]/.exec(String(text)); return m ? Number(m[1]) : null; };

export function createOutputs({ phones, spawn, jack, run = null, log = () => {}, setTimer = setTimeout, now = Date.now }) {
  const keep = clientsFor({ phones }).map(([cmd, args, what]) => ({ cmd, args, what, proc: null, at: 0, backoff: 2000, starts: 0 }));
  let closed = false;
  const quiet = (d) => String(d).split('\n').map((x) => x.trim())
    .filter((x) => x && !/^Cannot lock down \d+ byte memory area/.test(x)).join(' ');

  function start(k) {
    if (closed || k.proc) return;
    Promise.resolve(jack.ensure?.()).then((j) => {
      if (closed || k.proc) return;
      if (j && j.ok === false) { again(k, `no JACK server (${j.reason})`); return; }
      const p = spawn(k.cmd, k.args, { stdio: ['ignore', 'pipe', 'pipe'] });
      k.proc = p; k.at = now(); k.starts++;
      log(`${k.what}: ${k.cmd} up`);
      p.stdout?.on('data', () => {});
      p.stderr?.on('data', (d) => { const t = quiet(d); if (t) log(`${k.what}: ${t.slice(0, 200)}`); });
      p.on('error', (e) => log(`${k.what}: ${k.cmd} ${e.code || e.message}`));
      p.on('exit', (code, sig) => {
        if (k.proc === p) k.proc = null;
        if (closed) return;
        if (now() - k.at > 30_000) k.backoff = 2000;
        again(k, `${k.cmd} exited (${sig ?? code})`);
      });
    });
  }
  function again(k, why) {
    log(`${k.what}: ${why}, again in ${k.backoff / 1000} s`);
    setTimer(() => start(k), k.backoff);
    k.backoff = Math.min(k.backoff * 2, 60_000);
  }
  const amixer = (args) => run('amixer', ['-c', PHONES.card, ...args]);
  function level(db) {
    if (!phones || !run) return { ok: false, why: 'no 3.5 mm jack on this board' };
    if (db != null) {
      const v = Number(db);
      if (!Number.isFinite(v)) return { ok: false, why: 'db is a number' };
      const c = Math.round(Math.min(LEVEL_RANGE[1], Math.max(LEVEL_RANGE[0], v)));
      try { amixer(['sset', 'PCM', '--', `${c}dB`]); } catch (e) { return { ok: false, why: String(e.message).slice(0, 200) }; }
    }
    try { return { ok: true, db: parseLevel(amixer(['sget', 'PCM'])) }; } catch (e) { return { ok: false, why: String(e.message).slice(0, 200) }; }
  }
  return {
    level,
    start() { for (const k of keep) start(k); },
    status: () => keep.map((k) => ({ what: k.what, up: !!k.proc, starts: k.starts })),
    close() { closed = true; for (const k of keep) { try { k.proc?.kill('SIGTERM'); } catch {} } },
  };
}

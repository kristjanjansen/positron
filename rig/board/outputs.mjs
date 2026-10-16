// The Pi 4's own analogue output (PWM, ALSA card `Headphones`, the 3.5 mm socket), bridged onto the
// JACK graph by `alsa_out` beside jackd's card and announced as `pi-1:pwm`. A link (`jack.link`)
// decides what plays there. alsa_out resamples between two clocks: fine to listen to, not to record.

import { PWM_PORTS } from '../../demo/shell/graph-registry.mjs';

export const PWM = { name: 'pwm', card: 'Headphones', device: 'hw:CARD=Headphones', channels: 2 };

/** The graph's facts: the output, when this board has one. */
export function outputFacts({ pwm }) {
  return { outputs: pwm ? [{ device: PWM.device, jack: PWM_PORTS }] : [] };
}

/** The processes to keep alive, as `[cmd, args, what]`. */
export function clientsFor({ pwm }) {
  return pwm ? [['alsa_out', ['-j', PWM.name, '-d', PWM.device, '-r', '48000', '-c', String(PWM.channels), '-p', '512', '-n', '3'], 'pwm']] : [];
}

// The output's level: ALSA's `PCM` control on the card, in dB, -40 to 0 here (the card goes to +4).
export const LEVEL_RANGE = [-40, 0];
export const parseLevel = (text) => { const m = /\[(-?\d+(?:\.\d+)?)dB\]/.exec(String(text)); return m ? Number(m[1]) : null; };

export function createOutputs({ pwm, spawn, jack, run = null, log = () => {}, setTimer = setTimeout, now = Date.now }) {
  const keep = clientsFor({ pwm }).map(([cmd, args, what]) => ({ cmd, args, what, proc: null, at: 0, backoff: 2000, starts: 0 }));
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
  const amixer = (args) => run('amixer', ['-c', PWM.card, ...args]);
  function level(db) {
    if (!pwm || !run) return { ok: false, why: 'no PWM output on this board' };
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

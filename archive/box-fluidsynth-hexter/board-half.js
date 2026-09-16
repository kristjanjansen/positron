// archive/box-fluidsynth-hexter/board-half.js
//
// The board code that raised FluidSynth and hexter, verbatim and in the order
// it stood in. NOT A MODULE. Nothing here may be imported: it closes over
// names that exist only inside rig/box/jacksynth.mjs and rig/box/box.mjs.
// README.md says what it was and what would have to be true to bring it back.

// ── rig/box/jacksynth.mjs · the two JACK_SYNTHS entries ────────────────────

  hexter: {
    needs: ['jack-dssi-host', 'jackd', 'ffmpeg'],
    // -n: no plugin GUIs. Without it the host tries to start an X client.
    spawn: () => spawn('jack-dssi-host', ['-n', 'hexter.so'],
      { env: { ...process.env, DSSI_PATH: '/usr/lib/dssi' }, stdio: ['ignore','pipe','pipe'] }),
    portMatch: /hexter/i,
    alsaMatch: /hexter/i,
    // The DX7 factory cartridges, shipped in Debian main: ROM1A/1B/2A/2B.
    // Program 10 is ROM1A voice 11 — E.PIANO 1.
    after: (osc) => osc && [['-C', 'load', '/usr/share/hexter/dx7_roms.dx7'], ['-p', '0', '10']],
    osc: true,
  },

  // FluidSynth again, but as a JACK CLIENT rather than writing to a FIFO.
  // The FIFO path is cheaper — one process, no jackd — and is what plays
  // normally. This variant exists so the sampler can be wrapped by an insert:
  // an effect can only reach what is on the JACK graph, and the FIFO never is.
  // The box swaps between the two transparently when the effect is toggled.
  /**
   * FluidSynth ON JACK, and this is now what `fluidsynth` means.
   *
   * It used to write realtime PCM to a FIFO — one process, no jackd — and that
   * was kept for efficiency. MEASURED on the board, same binary, same
   * soundfont, same note: the pipe costs 12.8% of 400 against JACK's 12.3%, and
   * 84 ms to the ear against 74 ms. The efficiency argument was not a CPU
   * argument and JACK is the FASTER of the two; the FIFO's buffering costs more
   * than jackd's period does.
   *
   * What it buys is the whole reason to move: the granular insert is a JACK
   * insert, so on a pipe the 128 General MIDI instruments and the drum bank
   * could not be granulated at all. The pipe path is still here as `fluidpipe`,
   * because it is what let the whole of rig/box run in a container with no
   * sound hardware in existence — a claim that would need re-testing before
   * anything removed it.
   */
  fluidsynth: {
    needs: ['fluidsynth', 'jackd', 'ffmpeg'],
    // ⚠️ `-s` (SERVER), OR IT LOADS THE SOUNDFONT AND EXITS 0. `-i` means "do
    // not read commands from stdin", and without a shell to sit in and no MIDI
    // file to play, fluidsynth has nothing left to do and quits — registering
    // no JACK port, which is what the caller sees and is three steps from the
    // cause. Measured on the board: with `-s` it registers fluidsynth:left and
    // fluidsynth:right in under five seconds. The pipe path avoids this a
    // different way, by keeping its shell open on stdin, which is also how it
    // receives notes.
    spawn: (opt = {}) => spawn('fluidsynth', [
      '-a', 'jack', '-m', 'alsa_seq', '-i', '-s',
      '-o', 'audio.jack.id=fluidsynth',
      '-o', 'audio.jack.autoconnect=0',
      '-o', 'synth.lock-memory=0',
      '-o', `synth.sample-rate=${RATE}`,
      '-o', 'synth.gain=0.6',
      opt.soundfont || '/usr/share/sounds/sf2/FluidR3_GM.sf2',
    ], { stdio: ['ignore', 'pipe', 'pipe'] }),
    portMatch: /^fluidsynth:left/i,
    portMatch2: /^fluidsynth:right/i,
    alsaMatch: /fluid/i,
    osc: false,
  },

// ── rig/box/jacksynth.mjs · the FEEDER, raised only by the pappus entry ────
// A def with a `feeder` raised that instrument FIRST and patched it into its
// own inputs. Only `_pappus_removed` ever declared one and its feeder was
// hexter, so the whole mechanism left with hexter.

  _pappus_removed: {
    needs: ['sclang', 'jackd', 'ffmpeg', 'jack-dssi-host'],
    spawn: () => {
      // ⚠️ The unit sets PrivateTmp=true, so the service has its OWN /tmp. A
      // runtime dir created from an ssh session is not the one this process
      // sees, and Qt fails on a missing XDG_RUNTIME_DIR. Make it here.
      const rt = '/tmp/rt';
      try { mkdirSync(rt, { recursive: true, mode: 0o700 }); } catch { /* already there */ }
      return spawn('sclang', ['/opt/positron-box/rig/box/norns/run-pappus.scd'], {
        env: { ...process.env, XDG_RUNTIME_DIR: rt,
               QT_QPA_PLATFORM: 'offscreen', QTWEBENGINE_DISABLE_SANDBOX: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    },
    portMatch: /^SuperCollider:out_1/,
    alsaMatch: /hexter/i,          // notes go to the synth FEEDING it
    feeder: 'hexter',              // raised first, then patched into its inputs
    warmup: 30000,                 // sclang compiles a 2,030-line class library
    oscCmd: true,                  // driven by parameters, not by notes
    osc: false,
  },

  // 2. a feeder, for instruments that process rather than generate
  let feeder = null;
  if (def.feeder) {
    const fd = JACK_SYNTHS[def.feeder];
    feeder = fd.spawn();
    procs.push(feeder);
    await wait(6000);
    if (fd.after) {
      const oscPort = sh("ss -ulnp 2>/dev/null | grep jack-dssi-host | grep -oE ':[0-9]+' | tr -d ':' | head -1").trim();
      const url = oscPort && `osc.udp://localhost:${oscPort}/dssi/hexter/chan00`;
      for (const args of (fd.after(url) || [])) { sh(`dssi_osc_send ${args[0]} ${url} ${args.slice(1).join(' ')}`); await wait(300); }
    }
  }


  // and patch the feeder into it. Pappus reads In.ar on the HARDWARE inputs,
  // which is what SuperCollider:in_1 is — private busses would have it
  // granulating silence, which is exactly how it failed the first time.
  if (feeder) {
    const fp = sh('jack_lsp').split('\n').find((p) => JACK_SYNTHS[def.feeder].portMatch.test(p));
    if (!fp) onLog?.(`FEEDER ${def.feeder} registered no port — nothing to granulate`);
    else {
      const out = sh(`jack_connect "${fp}" SuperCollider:in_1 2>&1`);
      onLog?.(out.trim() ? `feeder patch said: ${out.trim().slice(0, 120)}` : `patched ${def.feeder} -> pappus`);
    }
  }

// ── rig/box/jacksynth.mjs · step 7, hexter's ROM cartridges over DSSI OSC ──

  // 7. anything the instrument wants said once it is up (hexter's ROM bank)
  if (def.osc) {
    const oscPort = sh("ss -ulnp 2>/dev/null | grep jack-dssi-host | grep -oE ':[0-9]+' | tr -d ':' | head -1").trim();
    const url = oscPort && `osc.udp://localhost:${oscPort}/dssi/hexter/chan00`;
    for (const args of (def.after?.(url) || [])) {
      // ⚠️ dssi_osc_send wants <option> <URL> <values> — URL second, not first.
      sh(`dssi_osc_send ${args[0]} ${url} ${args.slice(1).join(' ')}`);
      await wait(400);
    }
  }

// ── rig/box/box.mjs · what it imported from fluid.mjs ─────────────────────

import { VOICES, DEFAULT_SF, fluidAvailable, soundfontAt } from './fluid.mjs';

// ── rig/box/box.mjs · `sf.list`, the soundfonts on this board ─────────────
// The only verb a page used to discover what FluidSynth could be handed.

    case 'sf.list': {
      const dirs = (process.env.BOX_SF_DIRS || '/sf:/usr/share/sounds/sf2').split(':');
      const out = [], seen = new Set();
      for (const d of dirs) {
        try {
          for (const f of readdirSync(d)) if (/\.sf[23]$/i.test(f)) {
            const p = `${d}/${f}`;
            // Debian ships default-GM.sf2 as an ALTERNATIVES SYMLINK to
            // FluidR3_GM.sf2, so a naive listing offers one 141 MB file twice
            // under two names. Dedupe on the resolved path.
            let real; try { real = realpathSync(p); } catch { continue; }
            if (seen.has(real)) continue;
            seen.add(real);
            out.push({ path: real, name: f.replace(/\.sf[23]$/i, ''), mb: +(statSync(real).size / 1048576).toFixed(1) });
          }
        } catch { /* a directory that is not there is not an error, it is empty */ }
      }
      return reply('sf.listed', { soundfonts: out });

// ── rig/box/box.mjs · a General MIDI NAME as a patch ──────────────────────
// `voice.select {voice:'rhodes'}` resolved through fluid.mjs's VOICES table.
// Only FluidSynth's programs were General MIDI, so the name meant nothing
// once it left. A program NUMBER still works and is what every page sends.

    case 'voice.select': {
      // Every instrument here answers program change; only the MEANING of the
      // number differs. FluidSynth's are General MIDI, hexter's index the
      // loaded DX7 cartridge, Yoshimi's index its current bank — so a client
      // sends either a GM name (fluidsynth) or a program number (anything).
      if (inst) {
        const prog = typeof msg.voice === 'string' ? VOICES[msg.voice] : msg.program;
        if (prog === undefined) {
          // Two different mistakes, two different answers. A NAME that is not
          // in the GM table is worth listing the table for; no name and no
          // number is worth saying what to send instead. The pipe path used to
          // give the first and the JACK path the second, which meant the help
          // you got depended on which transport happened to be running.
          return reply('voice.selected', typeof msg.voice === 'string'
            ? { ok: false, reason: `unknown voice ${JSON.stringify(msg.voice)}`, known: Object.keys(VOICES), on: inst.source }
            : { ok: false, reason: 'send {program:<0-127>} or {voice:"<general midi name>"}', on: inst.source });
        }
        // ⚠️ BANK SELECT IS CC 32, AND THE NUMBER IS READ FROM YOSHIMI'S OWN

// ── rig/box/box.mjs · what `box.hello` advertised ─────────────────────────

    send({ type: 'box.hello', name: NAME, backend: s.backend, ports: s.ports.length, dry: DRY, since,
           audioChannels: 1, frameMs: 1000 * FRAME / RATE,
                 instruments: { synth: true, fluidsynth: fluidAvailable() && !!soundfontAt(), pappusFx: pappusAvailable(),
                                ...Object.fromEntries(Object.keys(JACK_SYNTHS).map((k) => [k, jackSynthAvailable(k)])) },
                 ...(s.error ? { error: s.error, hint: s.hint } : {}) });

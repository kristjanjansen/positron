// archive/box-fluidsynth-hexter/page-half.js
//
// The browser code for the sampled instrument and the DX7, verbatim and in
// the order it stood in `rig/box/listen.html` (the page now deployed at
// /keys/, which was /box/ until 2026-09-16).
//
// 🔴 NOT A MODULE AND IT MUST NOT BE IMPORTED. Almost all of it closes over
// names that exist only inside that page: `d`, `send`, `picks`, `fxWrap`,
// `current`, `patches`, `avail`, `startAudio`.

// ── the two fixed patch tables ────────────────────────────────────────────
// Yoshimi's library is enumerated by the BOARD, which is the only end that
// can see the files. These two instruments had no library to read: hexter
// carried one flat cartridge of 128 DX7 voices and the General MIDI
// soundfont carried 128 programs, the same on every board, so the names
// lived in the page.

  // Two kinds of instrument, and they need different walks.
  //
  // hexter and the sampled instruments carry a FIXED TABLE — 128 DX7 voices in
  // one flat cartridge, 128 General MIDI programs — which is the same on every
  // board, so it lives here. One continuous number is the whole story: hexter
  // has no banks at all and the GM soundfont has only bank 0 plus 128 for
  // drums, so a separate bank control would be clutter for two instruments out
  // of three.
  //
  // Yoshimi is not like that, and pretending it was is what made its patch
  // buttons do nothing. Its library on this board is 911 instruments in 24
  // banks; the banks are numbered 5, 10, 15 … 120 rather than 0, 1, 2, and the
  // slots inside them are sparse — the Rhodes bank holds 26 patches spread
  // across slots 1…68. Walking 0…127 lands on an empty slot most of the time,
  // and Yoshimi's answer to an empty slot is to carry on playing what it had.
  // So the BOX enumerates, because it is the only end that can see the files,
  // and this page steps through the list it is sent: `voices.list` ->
  // `voices.listed`, and then one entry per press.

  const GM = ('Grand Piano,Bright Piano,Electric Grand,Honky-tonk,Electric Piano 1,Electric Piano 2,Harpsichord,Clavi,'
   + 'Celesta,Glockenspiel,Music Box,Vibraphone,Marimba,Xylophone,Tubular Bells,Dulcimer,'
   + 'Drawbar Organ,Percussive Organ,Rock Organ,Church Organ,Reed Organ,Accordion,Harmonica,Tango Accordion,'
   + 'Nylon Guitar,Steel Guitar,Jazz Guitar,Clean Guitar,Muted Guitar,Overdrive Guitar,Distortion Guitar,Guitar Harmonics,'
   + 'Acoustic Bass,Finger Bass,Pick Bass,Fretless Bass,Slap Bass 1,Slap Bass 2,Synth Bass 1,Synth Bass 2,'
   + 'Violin,Viola,Cello,Contrabass,Tremolo Strings,Pizzicato,Harp,Timpani,'
   + 'String Ens 1,String Ens 2,Synth Strings 1,Synth Strings 2,Choir Aahs,Voice Oohs,Synth Voice,Orchestra Hit,'
   + 'Trumpet,Trombone,Tuba,Muted Trumpet,French Horn,Brass Section,Synth Brass 1,Synth Brass 2,'
   + 'Soprano Sax,Alto Sax,Tenor Sax,Baritone Sax,Oboe,English Horn,Bassoon,Clarinet,'
   + 'Piccolo,Flute,Recorder,Pan Flute,Blown Bottle,Shakuhachi,Whistle,Ocarina,'
   + 'Square Lead,Saw Lead,Calliope,Chiff,Charang,Voice Lead,Fifths,Bass+Lead,'
   + 'New Age Pad,Warm Pad,Polysynth Pad,Choir Pad,Bowed Pad,Metallic Pad,Halo Pad,Sweep Pad,'
   + 'Rain,Soundtrack,Crystal,Atmosphere,Brightness,Goblins,Echoes,Sci-Fi,'
   + 'Sitar,Banjo,Shamisen,Koto,Kalimba,Bagpipe,Fiddle,Shanai,'
   + 'Tinkle Bell,Agogo,Steel Drums,Woodblock,Taiko,Melodic Tom,Synth Drum,Reverse Cymbal,'
   + 'Fret Noise,Breath Noise,Seashore,Bird Tweet,Telephone,Helicopter,Applause,Gunshot').split(',');

  // hexter loads all four DX7 factory cartridges; ROM1A voice 11 is E.PIANO 1,
  // and programs are zero-indexed, so that is program 10.
  const DX7 = ('BRASS 1,BRASS 2,BRASS 3,STRINGS 1,STRINGS 2,STRINGS 3,ORCHESTRA,PIANO 1,PIANO 2,PIANO 3,'
   + 'E.PIANO 1,GUITAR 1,GUITAR 2,SYN-LEAD 1,BASS 1,BASS 2,E.ORGAN 1,PIPES 1,HARPSICH 1,CLAV 1,'
   + 'VIBE 1,MARIMBA,KOTO,FLUTE 1,ORCH-CHIME,TUB BELLS,STEEL DRUM,TIMPANI,REFS WHISL,VOICE 1,TRAIN,TAKE OFF').split(',');


// ── how a patch number was WALKED, per instrument ─────────────────────────

  const span = () => (listed() ? patches.length : current === 'hexter' ? 128 : 48 * 128);
  const patchName = (i) => {
    if (listed()) return patches[i]?.name ?? '—';
    const p = progOf(i);
    if (current === 'hexter') return DX7[p] ?? `voice ${p + 1}`;
    if (current?.startsWith('fluid')) return GM[p] ?? `program ${p}`;
    return `program ${p}`;
  };
  /** Dropdown index -> patch index. They coincide: a listed instrument is

// ── the soundfont list, and the armed instrument ──────────────────────────

  let soundfonts = [];

  // Drawn IMMEDIATELY rather than on a reply: gating the selector on the box's
  // answer left the page with no buttons at all whenever the box was busy.
  // A radio row: exactly one instrument is armed, and it is armed on load
  // rather than after the first click — a page that shows no selection while
  // something IS playing is lying about its own state.
  // ⚠️ THE BOX NAMES THE SAMPLED INSTRUMENT BY ITS FILE. `audio.started` sends
  // `soundfont: …/FluidR3_GM.sf2` and this page reduced that to `FluidR3_GM` —
  // which never equalled the source name `fluidsynth`, so an equality test
  // armed NOTHING whenever the sampled instrument was the one playing. There is
  // one sampled button now, so anything that is not a known JACK source is it.
  const arm = (name) => {
    if (!instPick) return;
    const src = !name ? null : (name === 'hexter' || name === 'yoshimi') ? name : 'fluidsynth';
    const i = instOpts.findIndex(([, v]) => v.src === src);
    // `set` is QUIET here: arming is reporting what the board says is playing,
    // not choosing — firing onPick would start the instrument all over again.
    if (i >= 0) instPick.set(i, true);
    // Nothing playing has no armed button, and `createChoice` cannot say "none"
    // — so say it here rather than leave a stale one lit.
    else instPick.buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
  };
  let instPick = null, instOpts = [];
  function drawInstruments() {
    // 🔴 ONE SEGMENTED GROUP, FROM THE KIT. These were loose flex buttons with
    // a 6 px gap, so three mutually exclusive choices read as three unrelated
    // controls — the exact complaint `choice.mjs` was written to answer, on the
    // page that complaint came from. Worse, the page's own
    // `.pick button[aria-pressed="true"]` then repainted the kit's chosen state
    // for the reverb and chorus rows too: same specificity as
    // `.pos-choice button[aria-pressed="true"]` and later in the cascade, so
    // every `createChoice` on this page silently lost its own look.
    const opts = [];
    instPick?.el.remove();
    instPick = null;
    // 🔴 ONE SAMPLED INSTRUMENT, NOT ONE PER FILE. This drew a button for every
    // soundfont on the board under its raw filename, so the row read
    // `FluidR3_GM` `sf_GMbank` `hexter` `yoshimi` — two of which are the SAME
    // instrument, General MIDI, twice, named after the files they happen to
    // live in. A visitor reading that has to know what a soundfont is before
    // they can tell that two of the four choices are one choice.
    //
    // They are picked between here instead of shown: the fullest General MIDI
    // set wins, because that is the only difference a listener could name.
    const best = soundfonts.slice().sort((a, b) =>
      (/fluidr3/i.test(b.name) ? 1 : 0) - (/fluidr3/i.test(a.name) ? 1 : 0)
      || (b.bytes || 0) - (a.bytes || 0))[0];
    /**
     * 🔴 THE BOARD IS LOCKED TO YOSHIMI. Instructed 2026-09-16: *"just lock to
     * yoshimi (disable sampled and hexter in box ui)"*.
     *
     * There is ONE JACK graph, ONE capture and ONE room, so whatever is playing
     * is what every listener on every page hears. Changing instrument here
     * takes it away from anybody else mid note, and it did: `/knobs/` was found
     * refusing to start because somebody had pressed `sampled` from this row,
     * and that page cannot work at all without yoshimi's filter.
     *
     * ⚠️ DISABLED WITH THE REASON ON THEIR FACE, NEVER REMOVED. `caps.mjs`
     * settles this for the whole project: a control that vanishes says the
     * feature does not exist, which is a different and false statement. The
     * board still has FluidSynth and hexter, they still work, and the day the
     * capture stops being shared they come back by deleting `LOCKED`.
     */
    const LOCKED = 'yoshimi';
    const WHY_LOCKED = 'one instrument at a time, and /knobs/ needs this one';
    opts.push(['sampled', { src: 'fluidsynth', slow: false, off: WHY_LOCKED, msg:
      best ? { type: 'audio.start', source: 'fluidsynth', soundfont: best.path }
           : { type: 'audio.start', source: 'fluidsynth' } }]);
    for (const k of ['hexter', 'yoshimi']) {
      if (avail && avail[k] === false) continue;
      opts.push([k, { src: k, slow: true, off: k === LOCKED ? null : WHY_LOCKED,
                      msg: { type: 'audio.start', source: k } }]);
    }
    instOpts = opts;
    instPick = createChoice({
      label: 'instrument',
      options: opts,
      onPick: async (v, label, i) => {
        // The lock, enforced where the press lands rather than only in the
        // paint: a disabled button that still acts is the shape of control this
        // project calls a lie.
        if (v.off) { d.log(`${label} is off: ${v.off}`, 'warn'); return; }
        await startAudio();
        arm(v.src);
        // Starting a JACK instrument takes ten to forty seconds, so the button
        // breathes until the board confirms — a control that just sits there
        // reads as a dead click.
        if (v.slow) { instPick.buttons[i].dataset.busy = '1'; d.log(`${label}: starting`, 'hi'); }
        send({ type: 'audio.stop' });
        setTimeout(() => send(v.msg), 400);
      },
    });
    /**
     * ⚠️ `createChoice` DISABLES ALL OR NONE, so the lock is applied to the
     * buttons it built. The reason goes in `title`, which is what a hand on a
     * mouse gets, and in `aria-disabled` alongside the real `disabled`, so it
     * is announced rather than simply unreachable.
     */
    opts.forEach(([label, v], i) => {
      const b = instPick.buttons[i];
      if (!b || !v.off) return;
      b.disabled = true;
      b.dataset.off = '1';
      b.title = `${label} is on the board and switched off here: ${v.off}`;
      b.setAttribute('aria-disabled', 'true');
    });
    picks.insertBefore(instPick.el, fxWrap);
    arm(armed);
  }
  let armed = null;
  drawInstruments();

// ── what the socket did with all of it ────────────────────────────────────

      if (m.type === 'box.hello') { avail = m.instruments ?? null; drawInstruments(); send({ type: 'sf.list' }); }
      if (m.type === 'sf.listed') { soundfonts = m.soundfonts || []; drawInstruments(); }

      }
      if (m.type === 'audio.started') {
        for (const c of picks.querySelectorAll('button')) delete c.dataset.busy;
        // Nothing playing on arrival: start the cheap instrument rather than
        // present a page where every control does nothing until you guess that
        // one of the buttons is a prerequisite.
        if (!m.ok && m.reason === 'nothing playing' && !autoStarted) {
          autoStarted = true;
          d.log('nothing was playing — starting the sampled instrument', 'hi');
          send({ type: 'audio.start', source: 'fluidsynth' });
          return;
        }
        if (m.ok) {
          current = m.source; lastBank = -1;
          // Arm by what the BOX reports, not by what was clicked — the box is
          // the authority on which instrument is sounding, and a page that
          // joins mid-session has clicked nothing.
          armed = m.soundfont ? m.soundfont.replace(/.*\//, '').replace(/\.sf[23]$/i, '') : m.source;
          arm(armed);

// ── the picture: two of the three instruments, and their links ────────────

        ] },
      /**
       * 🔴 THREE INSTRUMENTS, NOT ONE BOX CALLED `instruments`, AND `set: true`
       * BECAUSE THEY ARE ALTERNATIVES. Asked for 2026-09-16: *"can we sampled
       * (renamed to the collection name), hexter, yoshimi side by side in pi
       * box"*. Exactly one of them is up at any moment, so a default arrowhead
       * between them would claim that `FluidR3 GM` feeds `hexter`. A bracket
       * says they are parts of one machine, which is the true statement.
       *
       * ⚠️ `capture` IS THE EXCEPTION AND IT IS DECLARED. Each instrument has a
       * link to it, so the gap `yoshimi` shares with it gets an arrow rather
       * than a bracket and the other two run as lanes inside the container.
       * `dg.ties` is 2, which is what the two bracketed gaps are.
       *
       * ⚠️ AND THE NOTE ARROW LANDS ON THE MACHINE, NOT ON A BOX. A note goes
       * to whichever instrument is running, which the picture cannot know, so
       * pointing it at one of the three would be a guess drawn as a fact.
       */
      { id: 'pi', label: 'Raspberry Pi', sub: 'another building', kind: 'device', tech: 'board',
        set: true,
        children: [
          // 🔴 THE COLLECTION, BY NAME. The button on this page says `sampled`,
          // because one button beats four filenames a visitor has to know what
          // a soundfont is to read. The picture has room for the real thing:
          // 141 MB of General MIDI, and the board prefers this file over
          // anything else it finds.
          { id: 'sf', label: 'FluidR3 GM', sub: 'FluidSynth',
            note: 'The 128 General MIDI programs and a drum bank, 141 MB of samples played by '
                + '**FluidSynth** as a JACK client. It is loaded whole, because FluidSynth '
                + 'streams nothing from disk.' },
          { id: 'hexter', label: 'hexter', sub: 'DSSI, DX7',
            note: 'A Yamaha DX7 with its four factory ROM cartridges, 128 voices, run under '
                + '**jack-dssi-host**. Six-operator FM, so a patch is a set of ratios and '
                + 'envelopes rather than a recording.' },
          { id: 'yoshimi', label: 'yoshimi', sub: 'ZynAddSubFX',
            note: 'A fork of **ZynAddSubFX** carrying 911 patches in 24 banks on this board. '
                + 'The board enumerates them and sends the list, because it is the only end '
                + 'that can see the files.' },

      { from: 'sf', to: 'cap',
        note: 'Audio on the **JACK** graph, inside the board. Nothing crosses a network here '
            + 'and nothing is encoded.' },
      { from: 'hexter', to: 'cap',
        note: 'The same wire, made by one **jack_connect** when the instrument came up. Only '
            + 'one of the three is running, so only one of these carries anything.' },
      { from: 'yoshimi', to: 'cap',

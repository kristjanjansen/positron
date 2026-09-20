  /* 🔴 THIS BLOCK SITS ABOVE EVERY CONTROL IT SERVES, AND THAT IS NOT TIDINESS.
     It was below them, and `DEST[i]` read from a pad's own `title` at BUILD
     time threw a temporal dead zone error: `const` is hoisted and unreadable,
     so the whole page died at mount with `__demo.ready` red and no page assert
     ever running. Same shape as the `const lane` shadow on /rack/ that took
     seven asserts silent. */
  /**
   * 🔴 THIS PAGE CAN NOW SEND, AND THE FIRST THING BUILT WAS THE THING THAT
   * REFUSES. Asked 2026-09-21: *"make novation actually work, at least
   * transport and pads ans instr select. no record!"*, from somebody who has
   * spent this session protecting 32 sessions on a device with **no factory
   * reset**. So `no record` is not a preference about a button, it is the
   * constraint the sending half is built around.
   * ⚠️ **IT IS AN ALLOWLIST, NOT A DISABLED BUTTON.** A button that is switched
   * off is one edit away from being switched on, and the edit looks harmless.
   * What stops a record arming here is that `send` has no path for anything
   * except note on, note off and the three transport bytes: no control change,
   * no program change, no SysEx, on any channel. A record command cannot be
   * expressed, so it cannot be sent by accident.
   * ⚠️ AND THE REFUSAL IS COUNTED AND PROVED. The check hands it a record-shaped
   * message and asserts that it bounced, because a guard nobody has fired is a
   * guard nobody knows about.
   */
  const OUT_NAME = /circuit/i;
  const START = 0xfa, CONTINUE = 0xfb, STOP = 0xfc;
  const SYNTH_CH = [0, 1];               // channels 1 and 2, zero based
  const DRUM_NOTES = [60, 62, 64, 65];   // measured arriving on channel 10
  let out = null, sent = 0, refused = 0;

  function allowed(b) {
    const s = b[0];
    if (s === START || s === STOP || s === CONTINUE) return true;
    const hi = s & 0xf0, ch = s & 0x0f;
    if (hi !== 0x90 && hi !== 0x80) return false;
    return SYNTH_CH.includes(ch) || ch === DRUM_CH - 1;
  }
  function send(bytes) {
    if (!allowed(bytes)) {
      refused++;
      d.log(`refused to send ${bytes.map((b) => b.toString(16)).join(' ')}: `
          + 'this page sends notes and transport, nothing else', 'warn');
      return false;
    }
    sent++;
    try { out?.send(bytes); } catch (e) { d.log(`send failed: ${e.message}`, 'warn'); }
    d.set('sent', sent);
    return true;
  }

  /**
   * 🔴 WHICH TRACK IS ARMED IS THIS PAGE'S FACT, NOT THE DEVICE'S. Selecting a
   * track on a Circuit has no MIDI binding anybody has measured, so pressing
   * `Syn1` here does not move the hardware's own selection. What it does is
   * decide **where the next pad press is addressed**, which is the half that is
   * real and the half that makes the pads play the right instrument.
   * ⚠️ SAYING IT PLAINLY IS THE POINT. A button claiming to select a track on
   * the device, that does not, is the control this project calls a lie.
   * ⚠️ THE TWO SIDECHAIN BUTTONS ADDRESS NOTHING and stay inert, because a
   * sidechain is not an instrument to play notes at.
   */
  const DEST = [{ ch: 0 }, null, { ch: 1 }, null,
                ...DRUM_NOTES.map((note) => ({ ch: DRUM_CH - 1, note }))];
  let armed = 0;

  function arm(i) {
    if (!DEST[i]) return;
    armed = i;
    tracks.forEach((t, k) => t.set(k === i));
    d.set('armed', TRACKS[i][1]);
  }

  /**
   * ⚠️ A CHROMATIC RUN FROM 48, BOTTOM ROW LOWEST, AND IT IS A CHOICE RATHER
   * THAN A MEASUREMENT. Three notes out of thirty two have ever been seen from
   * this device, which is not a map, so the page picks a plain one and says so
   * instead of implying the hardware agrees.
   */
  const noteFor = (x, y) => 48 + x + (3 - y) * 8;



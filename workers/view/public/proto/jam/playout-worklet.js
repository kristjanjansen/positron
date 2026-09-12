// proto/jam/playout-worklet.js — PCM plumbing for the MoQ return path (C8).
//
// 'pcm-capture'  — taps a bus and posts every 128-frame render quantum
//                  (2.67 ms @48 k) to the main thread: {ct, pcm}. ct is the
//                  context time of the FIRST sample in the quantum; the main
//                  thread anchors epoch-µs media timestamps off it (edge-median
//                  ct->epoch map) and advances by exact sample count.
//
// 'pcm-playout'  — ring-buffer playout with a MINIMAL prebuffer floor.
//
//                  🔴 THE RING IS ALWAYS INTERLEAVED STEREO, whatever arrives
//                  and whatever the node was built with. Mono is upmixed ONCE,
//                  at append; a 1-channel node is downmixed ONCE, at output.
//                  Everything between — floor, trim, starve, every counter —
//                  is one shape, because the alternative is a channel branch in
//                  the starve path, which is the code that runs when things are
//                  already going wrong and is the hardest to test.
//                  `{cmd:'inChannels', n}` says how many channels the INCOMING
//                  pcm has; it defaults to 1, so every caller written before
//                  stereo existed keeps working untouched.
//
//                  ⚠️ A CHANNEL COUNT CANNOT BE INFERRED FROM A PAYLOAD. 960
//                  samples is a valid 20 ms mono frame AND a valid 10 ms stereo
//                  frame, and getting it wrong plays at half speed — an octave
//                  down, which sounds like a broken instrument rather than a
//                  broken header. It has to be ANNOUNCED. See the frameMs check
//                  in demo/rack, which is what makes a wrong announcement
//                  visible rather than merely audible.
//
//                  Counters below are in RING samples (2 per frame):
//                  waits until `floor` samples are buffered, then free-runs.
//                  A starve mid-stream = one underrun EVENT (plus silence-
//                  sample accounting) and the floor prebuffer re-arms; in
//                  adaptive mode each event grows the floor 1.5x up to maxMs.
//                  Messages in: {pcm} append | {silence: n} gap insert |
//                  {cmd:'floor', ms, adaptive, maxMs} | {cmd:'reset'}.
//                  Stats posted every ~250 ms: buffered samples, floorMs,
//                  underrun events/silence ms, appended/played counts.

class PcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) {
      const pcm = new Float32Array(ch); // copy — input buffer is reused
      this.port.postMessage({ ct: currentFrame / sampleRate, pcm }, [pcm.buffer]);
    }
    return true;
  }
}

class PcmPlayout extends AudioWorkletProcessor {
  constructor() {
    super();
    this.inCh = 1;              // channels in the ARRIVING pcm, announced
    this.cap = sampleRate * 20 * 2; // 20 s, interleaved stereo (7.7 MB)
    this.ring = new Float32Array(this.cap);
    this.rd = 0; this.wr = 0; this.buffered = 0;
    this.floor = Math.round(sampleRate * 0.02) * 2; // default 20 ms
    this.adaptive = false;
    this.maxFloor = Math.round(sampleRate * 0.25) * 2;
    // latency-creep guard: if a delivery burst overfills the ring (join
    // backlog, B-side headless render-ahead), trim the OLDEST samples back to
    // the floor target (counted, reported). Slack = trigger hysteresis.
    this.trimSlack = Math.round(sampleRate * 0.015) * 2;
    // 🔴 SLACK SMALLER THAN ONE FRAME TRIMS ON ORDINARY JITTER. MEASURED: a
    // 60 ms floor with 15 ms of slack trims at 75 ms, while frames arrive in
    // 20 ms lumps — so ONE frame landing early is enough to trip it, and each
    // trim throws away ~15 ms mid-note. That is a click, it repeats, and it
    // presents as a noisy, distorted stream whose samples measure bit-clean
    // against the source — which is exactly how it was found: `rack`'s audio
    // was identical to the tap's own capture (same pitch, same peak, zero
    // discontinuities) and still sounded wrong in the browser.
    //
    // The frame size is not configured, it is OBSERVED — every caller feeds a
    // different one and none of them knows to declare it. Two frames of room
    // means normal jitter never trims and only real backlog does.
    this.frameSeen = 0;
    this.trimmed = 0;
    this.trimEvents = 0;
    this.started = false;
    this.everStarted = false;    // so re-arm silence counts as underrun gap
    this.underruns = 0;          // starvation EVENTS (transitions to starving)
    this.underrunSilence = 0;    // samples of silence emitted while starving
    this.appended = 0; this.played = 0; this.dropped = 0;
    this.lastStats = 0;
    this.port.onmessage = (e) => {
      const d = e.data;
      if (d.pcm) this.append(d.pcm);
      else if (d.silence) this.appendSilence(d.silence);
      else if (d.cmd === 'inChannels') {
        const n = d.n === 2 ? 2 : 1;
        if (n !== this.inCh) {
          // Samples already in the ring were upmixed under the OLD count, so
          // they are the wrong shape now. Drop them rather than play them.
          this.inCh = n;
          this.rd = this.wr = this.buffered = 0;
          this.started = false; this.everStarted = false;
          this.port.postMessage({ inChannels: n });
        }
      }
      else if (d.cmd === 'floor') {
        this.floor = Math.round(sampleRate * (d.ms / 1000)) * 2;
        if (d.adaptive !== undefined) this.adaptive = d.adaptive;
        if (d.maxMs !== undefined) this.maxFloor = Math.round(sampleRate * (d.maxMs / 1000)) * 2;
        if (d.slackMs !== undefined) this.trimSlack = Math.round(sampleRate * (d.slackMs / 1000)) * 2;
        this.started = false; // re-arm prebuffer at the new floor
        this.everStarted = false; // config change: re-arm silence is not an underrun
      } else if (d.cmd === 'reset') {
        this.rd = this.wr = this.buffered = 0;
        this.started = false; this.everStarted = false;
        this.underruns = 0; this.underrunSilence = 0;
        this.trimmed = 0; this.trimEvents = 0;
        this.appended = 0; this.played = 0; this.dropped = 0;
      }
    };
  }
  put(v) {
    if (this.buffered >= this.cap) { this.dropped++; return; }
    this.ring[this.wr] = v;
    this.wr = (this.wr + 1) % this.cap;
    this.buffered++;
  }
  append(pcm) {
    // The ONE place mono becomes stereo. Writing each sample twice costs a
    // store; a branch further down would cost a branch per render quantum
    // forever, including inside the starve path.
    const ringLen = pcm.length * (this.inCh === 1 ? 2 : 1);
    if (ringLen > this.frameSeen) this.frameSeen = ringLen;
    if (this.inCh === 1) for (let i = 0; i < pcm.length; i++) { this.put(pcm[i]); this.put(pcm[i]); }
    else for (let i = 0; i < pcm.length; i++) this.put(pcm[i]);
    this.appended += ringLen;
    // hysteresis drain: only when occupancy exceeds floor + slack, and then
    // cut the OLDEST samples all the way back down to the floor target —
    // otherwise a join/burst backlog parks the occupancy at the ceiling
    // forever and the "floor" is a fiction (observed: buf ~60 ms at floor 10)
    const slack = Math.max(this.trimSlack, this.frameSeen * 2);
    if (this.buffered > this.floor + slack) {
      // ⚠️ Trim to a WHOLE number of frames. The ring is interleaved, so an odd
      // drop swaps left and right for good — silent on the dual-mono source
      // this was built against, and a real defect on anything panned.
      const drop = (this.buffered - this.floor) & ~1;
      if (!drop) return;
      this.rd = (this.rd + drop) % this.cap;
      this.buffered -= drop;
      this.trimmed += drop;
      this.trimEvents++;
    }
  }
  appendSilence(n) {
    // `n` counts samples in the SENDER's stream, so a gap is the same wall-clock
    // length whichever count it was sent under.
    const ring = Math.round(n / this.inCh) * 2;
    for (let i = 0; i < ring; i++) this.put(0);
    this.appended += ring;
  }
  process(_inputs, outputs) {
    const outs = outputs[0];
    const nOut = outs.length;
    const n = outs[0].length;
    const need = n * 2;              // ring samples for one render quantum
    const silence = () => { for (let c = 0; c < nOut; c++) outs[c].fill(0); };
    if (!this.started) {
      if (this.buffered >= this.floor) {
        this.started = true;
        if (this.everStarted && this.starveStart !== undefined) {
          this.port.postMessage({ starve: { ct: this.starveStart / sampleRate, durMs: ((currentFrame - this.starveStart) / sampleRate) * 1000 } });
          this.starveStart = undefined;
        }
        this.everStarted = true;
      } else {
        silence();
        if (this.everStarted) this.underrunSilence += need; // refilling after a starve
        this.tick();
        return true;
      }
    }
    if (this.buffered >= need) {
      if (nOut === 1) {
        // A 1-channel node — every caller written before stereo existed. Sum to
        // mono rather than take the left: taking one side drops a hard-panned
        // instrument to silence, which reads as the stream having failed.
        for (let i = 0; i < n; i++) {
          const l = this.ring[this.rd], r = this.ring[(this.rd + 1) % this.cap];
          outs[0][i] = (l + r) * 0.5;
          this.rd = (this.rd + 2) % this.cap;
        }
      } else {
        for (let i = 0; i < n; i++) {
          outs[0][i] = this.ring[this.rd];
          outs[1][i] = this.ring[(this.rd + 1) % this.cap];
          this.rd = (this.rd + 2) % this.cap;
        }
        for (let c = 2; c < nOut; c++) outs[c].fill(0);
      }
      this.buffered -= need;
      this.played += need;
    } else {
      // starved: one underrun event, silence out, re-arm the prebuffer
      silence();
      this.underruns++;
      this.underrunSilence += need;
      this.started = false;
      this.starveStart = currentFrame;
      if (this.adaptive) this.floor = Math.min(this.maxFloor, Math.round(this.floor * 1.5));
    }
    this.tick();
    return true;
  }
  tick() {
    if (currentFrame - this.lastStats >= sampleRate / 4) {
      this.lastStats = currentFrame;
      this.port.postMessage({
        stats: {
          ct: currentFrame / sampleRate,
          buffered: this.buffered / 2,
          bufferedMs: (this.buffered / 2 / sampleRate) * 1000,
          floorMs: (this.floor / 2 / sampleRate) * 1000,
          inChannels: this.inCh,
          started: this.started,
          underruns: this.underruns,
          underrunMs: (this.underrunSilence / 2 / sampleRate) * 1000,
          trimmedMs: (this.trimmed / 2 / sampleRate) * 1000,
          frameMs: (this.frameSeen / 2 / sampleRate) * 1000,
          trimEvents: this.trimEvents,
          appended: this.appended, played: this.played, dropped: this.dropped,
        },
      });
    }
  }
}

registerProcessor('pcm-capture', PcmCapture);
registerProcessor('pcm-playout', PcmPlayout);

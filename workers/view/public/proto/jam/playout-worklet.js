// proto/jam/playout-worklet.js — PCM plumbing for the MoQ return path (C8).
//
// 'pcm-capture'  — taps a bus and posts every 128-frame render quantum
//                  (2.67 ms @48 k) to the main thread: {ct, pcm}. ct is the
//                  context time of the FIRST sample in the quantum; the main
//                  thread anchors epoch-µs media timestamps off it (edge-median
//                  ct->epoch map) and advances by exact sample count.
//
// 'pcm-playout'  — mono ring-buffer playout with a MINIMAL prebuffer floor:
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
    this.cap = sampleRate * 20; // 20 s ring
    this.ring = new Float32Array(this.cap);
    this.rd = 0; this.wr = 0; this.buffered = 0;
    this.floor = Math.round(sampleRate * 0.02); // default 20 ms
    this.adaptive = false;
    this.maxFloor = Math.round(sampleRate * 0.25);
    // latency-creep guard: if a delivery burst overfills the ring (join
    // backlog, B-side headless render-ahead), trim the OLDEST samples back to
    // the floor target (counted, reported). Slack = trigger hysteresis.
    this.trimSlack = Math.round(sampleRate * 0.015);
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
      else if (d.cmd === 'floor') {
        this.floor = Math.round(sampleRate * (d.ms / 1000));
        if (d.adaptive !== undefined) this.adaptive = d.adaptive;
        if (d.maxMs !== undefined) this.maxFloor = Math.round(sampleRate * (d.maxMs / 1000));
        if (d.slackMs !== undefined) this.trimSlack = Math.round(sampleRate * (d.slackMs / 1000));
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
  append(pcm) {
    for (let i = 0; i < pcm.length; i++) {
      if (this.buffered >= this.cap) { this.dropped++; continue; }
      this.ring[this.wr] = pcm[i];
      this.wr = (this.wr + 1) % this.cap;
      this.buffered++;
    }
    this.appended += pcm.length;
    // hysteresis drain: only when occupancy exceeds floor + slack, and then
    // cut the OLDEST samples all the way back down to the floor target —
    // otherwise a join/burst backlog parks the occupancy at the ceiling
    // forever and the "floor" is a fiction (observed: buf ~60 ms at floor 10)
    if (this.buffered > this.floor + this.trimSlack) {
      const drop = this.buffered - this.floor;
      this.rd = (this.rd + drop) % this.cap;
      this.buffered -= drop;
      this.trimmed += drop;
      this.trimEvents++;
    }
  }
  appendSilence(n) {
    for (let i = 0; i < n; i++) {
      if (this.buffered >= this.cap) { this.dropped++; continue; }
      this.ring[this.wr] = 0;
      this.wr = (this.wr + 1) % this.cap;
      this.buffered++;
    }
    this.appended += n;
  }
  process(_inputs, outputs) {
    const out = outputs[0][0];
    const n = out.length;
    if (!this.started) {
      if (this.buffered >= this.floor) {
        this.started = true;
        if (this.everStarted && this.starveStart !== undefined) {
          this.port.postMessage({ starve: { ct: this.starveStart / sampleRate, durMs: ((currentFrame - this.starveStart) / sampleRate) * 1000 } });
          this.starveStart = undefined;
        }
        this.everStarted = true;
      } else {
        out.fill(0);
        if (this.everStarted) this.underrunSilence += n; // refilling after a starve
        this.tick();
        return true;
      }
    }
    if (this.buffered >= n) {
      for (let i = 0; i < n; i++) {
        out[i] = this.ring[this.rd];
        this.rd = (this.rd + 1) % this.cap;
      }
      this.buffered -= n;
      this.played += n;
    } else {
      // starved: one underrun event, silence out, re-arm the prebuffer
      out.fill(0);
      this.underruns++;
      this.underrunSilence += n;
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
          buffered: this.buffered,
          bufferedMs: (this.buffered / sampleRate) * 1000,
          floorMs: (this.floor / sampleRate) * 1000,
          started: this.started,
          underruns: this.underruns,
          underrunMs: (this.underrunSilence / sampleRate) * 1000,
          trimmedMs: (this.trimmed / sampleRate) * 1000,
          trimEvents: this.trimEvents,
          appended: this.appended, played: this.played, dropped: this.dropped,
        },
      });
    }
  }
}

registerProcessor('pcm-capture', PcmCapture);
registerProcessor('pcm-playout', PcmPlayout);

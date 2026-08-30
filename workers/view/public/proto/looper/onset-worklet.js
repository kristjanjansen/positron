// proto/looper/onset-worklet.js — THE EAR.
//
// Timestamps note attacks on the audio render thread with sample resolution, so
// "when did the note actually sound" is measured where the samples are, not
// where the main thread believes they were scheduled. Derived from
// timeline/lab/click-worklet.js, with one change that matters: a click is a
// one-sample impulse and trivially detectable, whereas a synth note has a 4 ms
// attack ramp. So this is an ENVELOPE-FOLLOWER edge detector, not a threshold
// crossing: it reports the frame at which the rectified signal starts rising
// through a floor, which is the perceptual attack.
//
// Reporting `currentFrame + i` (not `currentTime`) is the whole point — that
// index is the exact output sample, independent of when the main thread got
// around to asking.
class OnsetDetect extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'floor', defaultValue: 0.012, minValue: 0.0001, maxValue: 1 }];
  }
  constructor() {
    super();
    this.env = 0;
    this.armed = true;          // ready to report a new attack
    this.last = -1e9;
    this.buf = [];
    this.peak = 0;
    this.port.onmessage = (e) => {
      if (e.data === 'drain') { this.port.postMessage({ onsets: this.buf, peak: this.peak, sampleRate }); this.buf = []; this.peak = 0; }
    };
  }
  process(inputs, outputs, params) {
    const ch = inputs[0] && inputs[0][0];
    // Chrome hands an AudioWorklet an EMPTY input array when it latches the bus
    // silent — this is why synth.mjs keeps a started ConstantSourceNode(0) on
    // the output. Without it the ear goes deaf and reports nothing, which reads
    // as "the notes never sounded".
    if (!ch) return true;
    const floor = params.floor.length > 1 ? params.floor[0] : params.floor[0];
    const aUp = 0.35, aDown = 0.002;      // fast attack, slow release
    for (let i = 0; i < ch.length; i++) {
      const x = Math.abs(ch[i]);
      if (x > this.peak) this.peak = x;
      this.env += (x > this.env ? aUp : aDown) * (x - this.env);
      const t = (currentFrame + i) / sampleRate;
      if (this.armed && this.env > floor) {
        // 30 ms refractory: one attack per note, not one per cycle of the
        // waveform. Shorter than the shortest note in any fixture here.
        if (t - this.last > 0.03) { this.buf.push(+t.toFixed(6)); this.last = t; }
        this.armed = false;
      } else if (!this.armed && this.env < floor * 0.5) {
        this.armed = true;
      }
    }
    return true;
  }
}
registerProcessor('onset-detect', OnsetDetect);

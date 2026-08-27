// proto/jam/onset-worklet.js — sample-accurate acoustic onset detector.
//
// State machine per note: ARMED while the signal has been below offThr for
// >= silenceMs; the first sample >= onThr while armed IS the onset — reported
// at (currentFrame + i) / sampleRate, i.e. context-time to the sample. The
// main thread maps context time -> epoch µs with the rolling-min ct clock.
// Re-arms only after the signal returns below offThr for silenceMs (so one
// percussive voice = exactly one onset; overlapping chord voices merge into
// one onset by construction — the matcher marks trailing chord notes 'merged').

class OnsetDetector extends AudioWorkletProcessor {
  constructor(opts) {
    super();
    const p = (opts && opts.processorOptions) || {};
    this.onThr = p.onThr ?? 0.05;      // absolute sample value that fires an onset
    this.offThr = p.offThr ?? 0.015;   // must drop below this to start re-arming
    this.silenceN = Math.max(1, Math.round(((p.silenceMs ?? 5) / 1000) * sampleRate));
    this.below = this.silenceN;        // consecutive samples below offThr
    this.armed = true;
    this.onsets = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      const a = Math.abs(ch[i]);
      if (a < this.offThr) {
        if (++this.below >= this.silenceN && !this.armed) this.armed = true;
      } else {
        this.below = 0;
      }
      if (this.armed && a >= this.onThr) {
        this.armed = false;
        this.onsets++;
        this.port.postMessage({ ct: (currentFrame + i) / sampleRate, peak: a, n: this.onsets });
      }
    }
    return true;
  }
}
registerProcessor('onset-detector', OnsetDetector);

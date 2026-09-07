// demo/shell/impulse-worklet.js — the ear, for scheduling accuracy.
//
// Reports the exact OUTPUT SAMPLE at which a one-sample impulse appeared, so
// "when did this actually render" is answered where the samples are rather than
// where the main thread believes they were scheduled. Descended from
// timeline/lab/click-worklet.js; proto/looper/onset-worklet.js is its sibling
// and does the harder job of finding the attack of a real note.
//
// `currentFrame + i` is the whole point. It is the index of that sample in the
// output stream, independent of when anyone got round to asking — which is why
// this can resolve microseconds while everything on the main thread resolves
// milliseconds.
//
// A THRESHOLD, NOT AN ENVELOPE, because what it listens for is a single sample
// at full scale. An envelope follower has an attack time, and an attack time is
// a bias in exactly the quantity being measured. It is also why the page sends
// the ear its own silent impulse rather than letting it listen to the audible
// click: that click has a 2 ms ramp, and a threshold crossing on a ramp lags by
// about 0.75 ms — twenty times the effect under test.
class ImpulseDetect extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'threshold', defaultValue: 0.25, minValue: 1e-6, maxValue: 1 }];
  }

  constructor() {
    super();
    this.last = -1e9;
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    // Chrome hands an AudioWorklet an EMPTY input array when it latches a bus
    // silent — the caller keeps a started ConstantSourceNode(0) on the probe
    // bus for exactly this reason. Without it the ear goes deaf and reports
    // nothing, which reads as "the clicks never rendered".
    if (!ch) return true;
    const th = this.threshold ?? 0.25;
    for (let i = 0; i < ch.length; i++) {
      if (Math.abs(ch[i]) < th) continue;
      const t = (currentFrame + i) / sampleRate;
      // 50 ms refractory: one report per click, not one per sample of it
      if (t - this.last > 0.05) {
        this.last = t;
        this.port.postMessage({ at: +t.toFixed(6) });
      }
    }
    return true;
  }
}

registerProcessor('impulse-detect', ImpulseDetect);

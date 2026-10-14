// demo/shell/impulse-worklet.js: reports the output sample (`currentFrame + i`) at which a one-sample
// impulse appeared. A threshold, not an envelope, since an attack time biases the measurement; a 2 ms
// ramp lags a threshold by about 0.75 ms, so the page sends its own silent impulse.
// why: lessons/kit-impulse-worklet.md#header
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
    // Chrome hands an empty input when it latches a bus silent; the caller keeps a
    // ConstantSourceNode(0) running on the probe bus so the ear does not go deaf.
    // why: lessons/kit-impulse-worklet.md#empty-input
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

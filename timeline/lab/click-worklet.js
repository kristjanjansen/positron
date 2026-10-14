// Timestamps threshold crossings on the render thread: (currentFrame + i) / sampleRate, the exact
// time a sample rendered. 20 ms refractory (clicks are 100 ms apart).
// why: lessons/timeline-lab.md#cw-header
class ClickDetect extends AudioWorkletProcessor {
  constructor() {
    super();
    this.last = -1e9;
    this.buf = [];
    this.port.onmessage = (e) => {
      if (e.data === 'drain') { this.port.postMessage(this.buf); this.buf = []; }
    };
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        if (Math.abs(ch[i]) > 0.25) {
          const t = (currentFrame + i) / sampleRate;
          if (t - this.last > 0.02) { this.last = t; this.buf.push(t); }
        }
      }
    }
    return true;
  }
}
registerProcessor('click-detect', ClickDetect);

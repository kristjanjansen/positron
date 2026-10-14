// Chrome freezes a hidden silent page after 5 min on Energy Saver, workers too. Exemptions:
// a held Web Lock, or an audible page (a real tone, default gain 8e-4; gain 0 is not audible).
// keepAwake({ lock, audio }) -> { status(), release() }. catchUp 'reduce' recovers after one.
// why: lessons/timeline-misc.md#keepalive

export async function keepAwake({
  lock = true,
  audio = false,
  lockName = 'timeline-keepalive',
  gain = 0.0008,
  frequency = 40,
  ctx = null,
} = {}) {
  const st = { lock: false, lockName: null, audio: false, audioState: null, gain: null, errors: [] };
  let releaseLock = null, osc = null, gainNode = null, myCtx = null;

  if (lock) {
    try {
      if (!(navigator.locks && navigator.locks.request)) throw new Error('navigator.locks unavailable');
      // The lock is held until `release()` resolves the inner promise. Chrome's
      // freeze exemption is on HOLDING it, so it must never settle by itself.
      await new Promise((granted, failed) => {
        navigator.locks.request(lockName, { mode: 'exclusive' }, () =>
          new Promise((resolve) => { releaseLock = resolve; granted(); })).catch(failed);
      });
      st.lock = true; st.lockName = lockName;
    } catch (e) { st.errors.push(`lock: ${e.message}`); }
  }

  if (audio) {
    try {
      myCtx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (myCtx.state === 'suspended') await myCtx.resume();
      osc = myCtx.createOscillator();
      gainNode = myCtx.createGain();
      gainNode.gain.value = gain;
      osc.frequency.value = frequency;
      osc.connect(gainNode); gainNode.connect(myCtx.destination);
      osc.start();
      st.audio = true; st.audioState = myCtx.state; st.gain = gain;
    } catch (e) { st.errors.push(`audio: ${e.message}`); }
  }

  st.reasons = [
    st.lock ? 'held Web Lock (Chrome freeze exemption, published)' : null,
    st.audio ? `audible page at gain ${gain} (freeze + 1 Hz timer-clamp exemption; "audible" is Chrome's call, not ours)` : null,
  ].filter(Boolean);
  if (!st.reasons.length) st.reasons.push('NOTHING HELD — this page is freezable; rely on catchUp:\'reduce\' to wake up correct');

  return {
    status: () => ({ ...st, audioState: myCtx ? myCtx.state : null }),
    release() {
      try { if (releaseLock) releaseLock(); } catch {}
      try { if (osc) { osc.stop(); osc.disconnect(); } } catch {}
      try { if (gainNode) gainNode.disconnect(); } catch {}
      try { if (myCtx && !ctx) myCtx.close(); } catch {}
      st.lock = false; st.audio = false;
    },
  };
}

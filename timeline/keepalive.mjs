// timeline/keepalive.mjs — the two cheap, PUBLISHED exemptions that keep a
// hidden tab's clock alive. v0.6. Browser only, plain ESM, no deps.
//
// ===========================================================================
// WHY THIS FILE EXISTS. Our hidden-tab result (worker tick 8.5 ms p95 hidden
// vs main-thread 981 ms, rAF 9175 ms) defends against THROTTLING. Chrome 133
// added a second, different mechanism — FREEZING on Energy Saver — and a
// worker tick is not on its exemption list:
//
//   >5 min hidden + silent + CPU-intensive  ->  the page is FROZEN
//   exempt: mic/camera/screen-capture, a live RTCPeerConnection,
//           WebUSB / WebBluetooth / WebHID, or a HELD WEB LOCK
//   — https://developer.chrome.com/blog/freezing-on-energy-saver
//
// MEASURED HERE (timeline/lab/run-freeze.mjs, SIGSTOP on the renderer, which
// is what a freeze is): a dedicated worker is frozen WITH its page — its own
// `setInterval` log shows the same multi-minute gap the main thread does. The
// worker tick host buys nothing against freezing. So the mitigation has to be
// one of Chrome's own exemptions, and two of them are nearly free:
//
//   (1) A HELD WEB LOCK — explicitly on the exemption list, one line, no
//       audio device, no permission prompt, works with the tab muted.
//   (2) AN AUDIBLE PAGE — an audible page is exempt from freezing AND from
//       the 1 Hz background timer clamp, and Firefox additionally does not
//       throttle a tab containing an AudioContext at all.
//       ⚠️ HONEST CAVEAT: "audible" is Chrome's own determination and a
//       gain of literally 0 is NOT audible. This helper therefore emits a
//       real, tiny (default 8e-4) low-frequency tone rather than silence,
//       and reports the gain it used. If you cannot accept any output, use
//       the lock alone.
//
// AND THE THIRD OPTION, which is the one we actually rely on: ACCEPT THE
// FREEZE. `catchUp: 'reduce'` folds the whole missed prefix and re-asserts on
// the first task after resume — measured at 0.1 ms to correct state after a
// 20 s freeze and (see NOTES) at 5-minute scale. A frozen tab that wakes up
// CORRECT is a much cheaper guarantee than a tab that never freezes.
//
//   import { keepAwake } from './keepalive.mjs';
//   const ka = await keepAwake({ lock: true, audio: true });
//   ka.status();   // {lock, audio, reasons}
//   ka.release();
// ===========================================================================

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

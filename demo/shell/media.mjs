// demo/shell/media.mjs: the media-element facts every recording page needs. Five older pages
// still carry their own resolveDuration; moving them over is a BACKLOG line.
// why: lessons/kit-media.md#header

/**
 * Duration of a MediaRecorder file (reports Infinity): wait for metadata, seek far past the end,
 * come back to 0. Both waits capped, never rejects. @param {HTMLMediaElement} video
 * @param {{metaMs?: number, seekMs?: number}} [opts]  @returns {Promise<number|null>} ms or null
 * why: lessons/kit-media.md#resolve-duration
 */
export async function resolveDuration(video, { metaMs = 4000, seekMs = 3000 } = {}) {
  await new Promise((res) => {
    video.addEventListener('loadedmetadata', res, { once: true });
    setTimeout(res, metaMs);
  });
  if (!Number.isFinite(video.duration)) {
    video.currentTime = 1e6;
    await new Promise((res) => {
      const on = () => {
        if (Number.isFinite(video.duration)) { video.removeEventListener('timeupdate', on); res(); }
      };
      video.addEventListener('timeupdate', on);
      setTimeout(res, seekMs);
    });
    video.currentTime = 0;
  }
  return Number.isFinite(video.duration) ? video.duration * 1000 : null;
}

/**
 * Wait until a video element really carries pictures: a WHEP track exists before any frame.
 * Counts presented frames (requestVideoFrameCallback), else readyState plus videoWidth.
 * @returns {Promise<{frames: boolean, how: string, w: number, h: number}>}
 * why: lessons/kit-media.md#wait-for-first-frame
 */
export async function waitForFirstFrame(video, { timeoutMs = 15000 } = {}) {
  const size = () => ({ w: video.videoWidth || 0, h: video.videoHeight || 0 });
  if (typeof video.requestVideoFrameCallback === 'function') {
    const got = await new Promise((res) => {
      const t = setTimeout(() => res(false), timeoutMs);
      video.requestVideoFrameCallback(() => { clearTimeout(t); res(true); });
    });
    return { frames: got, how: 'requestVideoFrameCallback', ...size() };
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (video.readyState >= 2 && video.videoWidth > 0) {
      return { frames: true, how: 'readyState', ...size() };
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return { frames: false, how: 'readyState', ...size() };
}

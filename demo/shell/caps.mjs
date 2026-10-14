// demo/shell/caps.mjs: what this browser can actually do, asked rather than assumed, so the index
// stops linking pages that cannot run here. A capability test, never a brand check:
// nothing here reads `navigator.userAgent`.
// why: lessons/kit-caps.md#header

/**
 * One probe per capability: true, false or 'unknown'. A capability we could not test never
 * reads as missing: `unknown` keeps the link, only a hard `false` un-links.
 * why: lessons/kit-caps.md#probes
 */
export const PROBES = {
  webgl2: () => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2'));
    } catch { return 'unknown'; }
  },

  webcodecs: () => 'VideoDecoder' in globalThis && 'VideoEncoder' in globalThis,

  webtransport: () => 'WebTransport' in globalThis,

  mediarecorder: () => 'MediaRecorder' in globalThis,

  // Soft: every page that touches MIDI here also takes an on-screen keyboard,
  // and demo/instrument says so in its own words — "cannot tell a keyboard
  // from a tapped screen". So this annotates and never un-links.
  midi: () => 'requestMIDIAccess' in navigator,

  /**
   * A camera actually present: `getUserMedia` exists on machines with none. `enumerateDevices()`
   * reports kinds before permission; 'unknown' when enumeration is unavailable or refused.
   * why: lessons/kit-caps.md#camera
   */
  camera: async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return 'unknown';
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      if (!devs.length) return 'unknown';          // enumeration blocked, not empty
      return devs.some((d) => d.kind === 'videoinput');
    } catch { return 'unknown'; }
  },

  microphone: async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return 'unknown';
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      if (!devs.length) return 'unknown';
      return devs.some((d) => d.kind === 'audioinput');
    } catch { return 'unknown'; }
  },

  /**
   * A headset: `isSessionSupported('immersive-vr')` needs no gesture. A layout flag only;
   * a button uses `xr-caps.mjs`, which carries the third state and a reason.
   * why: lessons/kit-caps.md#xr
   */
  xr: async () => {
    if (!navigator.xr?.isSessionSupported) return false;
    try { return await navigator.xr.isSessionSupported('immersive-vr'); }
    catch { return 'unknown'; }
  },
};

/** Run every probe once. Returns { webgl2: true, camera: 'unknown', … }. */
export async function probe(names = Object.keys(PROBES)) {
  const out = {};
  await Promise.all(names.map(async (k) => {
    try { out[k] = await PROBES[k](); }
    catch { out[k] = 'unknown'; }
  }));
  return out;
}

/**
 * Which capability a manifest tag implies: derived from `tags`, with no second list to keep in step.
 * why: lessons/kit-caps.md#tag-cap
 */
export const TAG_CAP = {
  WebGL2: 'webgl2',
  WebCodecs: 'webcodecs',
  WebTransport: 'webtransport',
  MediaRecorder: 'mediarecorder',
  WebMIDI: 'midi',
  getUserMedia: 'camera',
};

/**
 * Capabilities whose absence makes a page unrunnable rather than degraded. Not `midi`
 * (pages keep playing on screen keys), not `mediarecorder` (`camera` carries those pages).
 * why: lessons/kit-caps.md#hard
 */
export const HARD = new Set(['webgl2', 'webcodecs', 'webtransport', 'camera']);

/** Plain-English reason, for a row that cannot be linked. Never a symbol. */
export const MISSING_SAYS = {
  webgl2: 'this browser draws no 3-D',
  webcodecs: 'no frame-by-frame video here',
  webtransport: 'this browser has no WebTransport',
  camera: 'no camera on this device',
  mediarecorder: 'this browser cannot record',
  midi: 'no MIDI here, but the on-screen keys still work',
};

/**
 * What a demo needs, and what is missing of it, given one probe result.
 *
 * Returns { needs: [...], missing: [...], blocked: bool }. `blocked` is true
 * only when something HARD came back a definite false — an `unknown` never
 * blocks, per the rule at the top of this file.
 */
export function verdict(demo, caps) {
  const needs = [...new Set((demo.tags || []).map((t) => TAG_CAP[t]).filter(Boolean))];
  const missing = needs.filter((c) => caps[c] === false);
  return { needs, missing, blocked: missing.some((c) => HARD.has(c)) };
}

/** The capabilities one demo row needs, read off its tags. */
export const needsOf = (d) =>
  [...new Set((d.tags || []).map((t) => TAG_CAP[t]).filter(Boolean))];

/**
 * Probe once, then mark up an index that is already rendered (baked or local), so there is
 * one copy of this logic. Rows carry `data-needs` from TAG_CAP. Returns the probe result.
 * why: lessons/kit-caps.md#markindex
 */
export async function markIndex(root = document) {
  const caps = await probe();

  // A headset gets a different LAYOUT, not a different list — the list is
  // decided by the probes below, which are true or false on a laptop too.
  root.documentElement?.classList.toggle('xr', caps.xr === true);
  if (caps.xr === true) offerHeadset(root);

  // `[data-needs]`, not `.pos-row[data-needs]`: cards and rows both carry the attribute.
  // why: lessons/kit-caps.md#data-needs
  for (const row of root.querySelectorAll('[data-needs]')) {
    const needs = row.dataset.needs.split(' ').filter(Boolean);
    const missing = needs.filter((c) => caps[c] === false);
    if (!missing.some((c) => HARD.has(c))) {
      // Soft misses still get said out loud — `midi` is the whole reason this
      // branch exists, and demo/instrument keeps working without it.
      const soft = missing.filter((c) => !HARD.has(c));
      if (soft.length) addWhy(row, soft.map((c) => MISSING_SAYS[c]).join(' · '), 'soft');
      continue;
    }
    // Un-link and say why; a vanished row says the demo does not exist. A card is the link,
    // a row contains one, so ask the element about itself first.
    // why: lessons/kit-caps.md#un-link
    const a = row.matches('a') ? row : row.querySelector('a');
    if (a) { a.removeAttribute('href'); }
    row.classList.add('todo', 'blocked');
    if (row.classList.contains('pos-card')) row.dataset.off = '1';
    addWhy(row, missing.map((c) => MISSING_SAYS[c]).join(' · '));
  }
  return caps;
}

function addWhy(row, text, kind) {
  const meta = row.querySelector('.pos-meta, .pos-card-f');
  if (!meta || !text) return;
  const el = document.createElement('span');
  // A card's why is `.pos-card-why`, a row's is `.pos-why`.
  // why: lessons/kit-caps.md#why-class
  const base = row.classList.contains('pos-card') ? 'pos-card-why' : 'pos-why';
  el.className = kind === 'soft' ? `${base} soft` : base;
  el.textContent = text;
  meta.append(el);
}


/**
 * In a headset, offer the page worth being in: typing a URL there is enough friction to lose a
 * measurement.
 * why: lessons/kit-caps.md#offerheadset
 */
// Removed: the headset pages are the first two rows on every index, so the card repeated them.
// why: lessons/kit-caps.md#offerheadset-removed
function offerHeadset() { /* the list itself does this now */ }

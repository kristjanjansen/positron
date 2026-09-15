// demo/shell/caps.mjs — what THIS browser can actually do, asked rather than
// assumed, so the index can stop linking pages that cannot run here.
//
// ⚠️ CAPABILITY TEST, NEVER A BRAND CHECK, and this project has paid for the
// other way twice. `canPlayType('application/vnd.apple.mpegurl')` answers
// "maybe" in Chrome AND Safari, so gating on its truthiness put Chrome on a
// path it cannot play. `@moq/net` blocks Safari by user agent, which is how a
// real WebKit flow-control bug got reported as a missing API. And a headset
// browser is Chromium wearing a Chromium user agent — research/quest-xr §1.7
// measured that you cannot tell a Quest 3 from a 3S by user agent at all.
//
// So nothing in this file reads `navigator.userAgent`. Every answer comes from
// asking the API whether it is there.

/**
 * One probe per capability. Each returns true, false, or 'unknown' — and
 * 'unknown' is a real third answer, not a polite false.
 *
 * ⚠️ A CAPABILITY WE COULD NOT TEST MUST NEVER READ AS "MISSING". Dropping a
 * link because a probe threw is the index telling the reader a page is broken
 * when what happened is that we did not look. `unknown` keeps the link and
 * says so; only a hard `false` un-links anything.
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
   * A camera that is actually present, not merely an API that exists.
   *
   * ⚠️ `navigator.mediaDevices.getUserMedia` is defined on machines with no
   * camera at all, so its presence answers the wrong question — the same shape
   * of mistake as reading `canPlayType`. `enumerateDevices()` reports KINDS
   * before any permission is granted (labels are blank, kinds are not), which
   * is the cheapest honest test and costs no permission prompt.
   *
   * Returns 'unknown' rather than false when enumeration is unavailable or
   * refused: a headset that gates device enumeration behind a prompt must not
   * have its camera pages struck off on that basis.
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
   * A headset, asked the only way that is honest.
   *
   * `navigator.xr.isSessionSupported('immersive-vr')` is the documented
   * capability call and it needs no user gesture — the gesture is required to
   * ENTER a session, not to ask about one. A desktop Chrome carrying the WebXR
   * emulator answers true here, which is correct: it can present the layout
   * this flag turns on, and the flag is about layout.
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
 * Which capability a manifest TAG implies.
 *
 * ⚠️ DERIVED FROM `tags`, WITH NO SECOND LIST TO KEEP IN STEP. manifest.mjs's
 * own header is about exactly this ("no second place to forget a row") and it
 * was aspirational once before: two copies of rowHTML existed and one printed
 * `undefined` over every demo name for an afternoon. A hand-kept `needs:` field
 * beside an existing `tags:` field is that bug with a new name, so a demo's
 * requirements are read off the tags it already declares.
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
 * Capabilities whose absence makes a page UNRUNNABLE rather than degraded.
 *
 * `midi` is deliberately not here: demo/instrument sets its own readout to
 * `unsupported` and keeps playing from the on-screen keyboard, so striking it
 * off would be the index inventing a failure the page does not have.
 * `mediarecorder` is not here either — the pages that record also need a
 * camera, and `camera` already carries them.
 */
export const HARD = new Set(['webgl2', 'webcodecs', 'webtransport', 'camera']);

/** Plain-English reason, for a row that cannot be linked. Never a symbol. */
export const MISSING_SAYS = {
  webgl2: 'this browser draws no 3-D',
  webcodecs: 'no frame-by-frame video here',
  webtransport: 'this browser has no WebTransport',
  camera: 'no camera on this device',
  mediarecorder: 'this browser cannot record',
  midi: 'no MIDI here — the on-screen keys still work',
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
 * Probe this browser once, then mark up an index that is ALREADY RENDERED.
 *
 * ⚠️ THE DEPLOYED INDEX IS BAKED AT BUILD TIME and the local one is rendered in
 * the page, so anything that needs a live browser to decide has to run after
 * both — otherwise there are two copies of this logic and one of them rots.
 * That has happened here before: `rowHTML` lived in two files and the copy
 * nobody fixed printed `undefined` over every demo name for an afternoon.
 *
 * Rows carry `data-needs`, written by `rowHTML` from the same TAG_CAP table
 * this file exports, so nothing is parsed out of visible text.
 *
 * Returns the probe result so a caller can show it.
 */
export async function markIndex(root = document) {
  const caps = await probe();

  // A headset gets a different LAYOUT, not a different list — the list is
  // decided by the probes below, which are true or false on a laptop too.
  root.documentElement?.classList.toggle('xr', caps.xr === true);
  if (caps.xr === true) offerHeadset(root);

  // ⚠️ `[data-needs]`, NOT `.pos-row[data-needs]`. The front page is cards now
  // and the sequence page is still rows; the capability logic is about the
  // ATTRIBUTE, which both carry, and keying it to one markup is how the other
  // one silently stops being marked at all.
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
    // Un-link, and SAY WHY. A row that quietly vanished would tell the reader
    // the demo does not exist, which is a different and false statement.
    // A card IS the link; a row CONTAINS one. Ask the element about itself
    // first, or a card keeps its href and stays pressable while saying it
    // cannot run.
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
  el.className = kind === 'soft' ? 'pos-why soft' : 'pos-why';
  el.textContent = text;
  meta.append(el);
}


/**
 * In a headset, hand over the page that is worth being in rather than making
 * someone find it.
 *
 * ⚠️ THE REASON IS TYPING. A URL with a query string on a virtual keyboard, in
 * a headset, is enough friction that a measurement does not get taken — and
 * scrolling a 35-row list with a hand-ray to find one slug is not much better.
 * The list still has every row in it and nothing is hidden; this is one link
 * placed above it, and it only exists where it is useful.
 *
 * One copy, here, because the deployed index is baked by build.mjs and the
 * local one renders itself — two copies of a thing both index pages need is
 * precisely how `rowHTML` printed `undefined` over every demo name for an
 * afternoon.
 */
// 🔴 REMOVED 2026-09-13 — `offerHeadset` used to insert a "you are in a
// headset" card above the list, pointing at `scene`. It was the right answer
// to a list where the two headset pages sat in the middle of thirty rows; they
// are now the FIRST TWO ROWS on every index (see `byNewest`), so the card
// repeated, in a bigger box, what the eye already lands on. A second way to
// reach the same page is not emphasis, it is a duplicate.
function offerHeadset() { /* the list itself does this now */ }

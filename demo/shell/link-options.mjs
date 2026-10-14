// demo/shell/link-options.mjs: settings a link carries that are not transforms. An option is read once by
// the opener and changes what it asks the far end for; absent means 1280, 720, 30 as before.
// Ceilings are the board's clamps (1920, 1080, 60) refused here; the floor of 16 and the even rule are not measured.
// why: lessons/kit-link-options.md#header

// ahead N: the sender stamps `at` = shared clock + N ms and the receiver fires at `at`. follow X: the
// receiver waits out heavy link X's lag as seen here (timebase.mjs). No default; absent delivers on arrival.
// The 10 s ceiling is this file's, not measured (the plan's budget is 250 ms).
// why: lessons/kit-link-options.md#timing
const TIMING = {
  ahead: { lo: 1, hi: 10000, def: undefined, even: false, says: 'milliseconds the sender schedules ahead on the shared clock' },
  follow: { link: true, says: 'heavy link whose lag here the receiver waits out' },
};
/** The timing option names, which `bay-view.mjs` writes on a wire. */
export const TIMING_NAMES = Object.keys(TIMING);

/** Each medium's options, with today's value as the default. */
export const LINK_OPTIONS = {
  video: {
    w: { lo: 16, hi: 1920, def: 1280, even: true, says: 'width in pixels' },
    h: { lo: 16, hi: 1080, def: 720, even: true, says: 'height in pixels' },
    fps: { lo: 1, hi: 60, def: 30, even: false, says: 'frames a second' },
  },
  midi: TIMING, clock: TIMING, value: TIMING, program: TIMING,
};

/** A link id or a port id: no space, comma or brace, so it survives the text form. */
const LINK_ID = /^[A-Za-z0-9_.*-]+(:[A-Za-z0-9_.*-]+)*$/;

/** Every option name, in the order they print. */
export const OPTION_NAMES = [...new Set(Object.values(LINK_OPTIONS).flatMap((o) => Object.keys(o)))];

/** Is this word the name of an option rather than of a transform. */
export const isOption = (name) => OPTION_NAMES.includes(name);

/**
 * Is this set of options right for a link of this medium. Answers `''` or
 * `{ why, fix }`, the same shape as `checkTransforms`, so a refusal names the
 * option and the value.
 * @param {string} medium
 * @param {object} [options]
 */
export function checkOptions(medium, options) {
  const names = Object.keys(options || {});
  if (!names.length) return '';
  const known = LINK_OPTIONS[medium];
  if (!known) {
    return { why: `a ${medium} link has no options, and this one was given ${names.join(', ')}.`,
             fix: `Take ${names.join(', ')} off the link. ${Object.keys(LINK_OPTIONS).join(', ')} links are the ones with options.` };
  }
  for (const k of names) {
    const o = known[k];
    if (!o) {
      return { why: `a ${medium} link has no option called ${k}.`,
               fix: `Use ${Object.keys(known).join(', ')}.` };
    }
    const v = options[k];
    if (o.link) {
      if (typeof v !== 'string' || !LINK_ID.test(v)) {
        return { why: `${k} names the ${o.says}, and ${v === undefined ? 'it was given no name' : `${JSON.stringify(v)} is not a link or port id`}.`,
                 fix: `Write ${k} and the id of the video or sound link to wait for, as in ${k} web-1:cam:video-out.` };
      }
      continue;
    }
    const range = `a whole number from ${o.lo} to ${o.hi}${o.even ? ', and even' : ''}`;
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      return { why: `${k} is the ${o.says} and must be ${range}, and ${v === undefined ? 'it was given no value' : `${v} is not`}.`,
               fix: o.def === undefined ? `Write ${k} and ${range}, or leave it out.` : `Write ${k} ${o.def}, which is what it is when it is left out.` };
    }
    if (v < o.lo || v > o.hi) {
      return { why: `${k} ${v} is outside ${o.lo} to ${o.hi}${v > o.hi ? ', which is as much as the board will draw' : ''}.`,
               fix: `Use ${range}.` };
    }
    if (o.even && v % 2) {
      return { why: `${k} ${v} is odd, and the board's encoder takes only an even ${o.says}.`,
               fix: `Use ${v - 1} or ${v + 1}.` };
    }
  }
  return '';
}

/** The options a link of this medium opens with: what it carries, else the default. */
export function resolveOptions(medium, options = {}) {
  const known = LINK_OPTIONS[medium] || {};
  return Object.fromEntries(Object.entries(known).map(([k, o]) => [k, options?.[k] ?? o.def]));
}

/** The board verb for a video link. With no options it is exactly the message
 *  `openers.mjs` sent before options existed. */
export function videoStart(options = {}) {
  return { type: 'video.start', ...resolveOptions('video', options) };
}

/** `w 640, h 360` in the fixed order, or `''`. Only what the link carries is
 *  printed, so a default is never written into a line that did not say it. */
export function printOptions(options, names = OPTION_NAMES) {
  return names.filter((k) => options && options[k] !== undefined)
    .map((k) => `${k} ${options[k]}`).join(', ');
}

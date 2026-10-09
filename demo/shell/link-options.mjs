// demo/shell/link-options.mjs: settings a link carries that are not transforms.
//
// 🔴 WHY THESE ARE NOT TRANSFORMS (2026-10-09, plans/plan-site-names.md §4e).
// The board's picture was asked for at 1280x720 and 30 a second, hard coded in
// `openers.mjs`. The size and the rate belong to the LINK, because two links to
// one encoder are the place where they could disagree. They are written in the
// same body as transforms, `studio-1:gpu:video -> web-xx:screen:video { w 640,
// h 360, fps 15 }`, but they are a different thing:
//   - a transform is a MIDI operation applied to every event (`apply`), and
//     `bay.mjs` refuses any transform on a non-MIDI link in words;
//   - an option is read ONCE, by whatever opens the link, and changes what it
//     asks the far end for. Nothing per event.
// Making them transforms would have meant an `apply` that does nothing to
// them, and a MIDI-only rule with an exception in it. So they sit beside the
// transforms as `link.options`, and only the medium that has them may carry
// them.
//
// ⚠️ ABSENT IS TODAY. A link with no options prints exactly as before and opens
// exactly as before, because every default here is the value that was hard
// coded: 1280, 720, 30.
//
// 🔴 THE CEILINGS ARE THE BOARD'S, READ FROM `rig/board/board.mjs`
// `case 'video.start'` ON 2026-10-09: `Math.min(msg.w ?? 1280, 1920)`,
// `Math.min(msg.h ?? 720, 1080)`, `Math.min(msg.fps ?? 30, 60)`. The board
// CLAMPS rather than refusing, so a page asking 2560 would get 1920 and go on
// believing 2560. Refusing at the link is what makes the number on the link the
// number on the wire.
// ⚠️ THE FLOORS AND THE EVEN RULE ARE NOT THE BOARD'S, AND NOT MEASURED. The
// board passes any value through to `rig/vis/v3dpipe` (`atoi`, no check) and to
// ffmpeg as `-s WxH` with `-pix_fmt yuv420p`, and yuv420p halves both axes for
// chroma, so an odd size is refused by ffmpeg rather than by anything here. The
// floor of 16 and the even rule are this file's, so nothing below that has ever
// been asked of the hardware encoder. Nothing between 16 and 1280 has been
// measured on the Pi either: 1280x720 at 30 is the one size `video.mjs` records.

/** Each medium's options, with today's value as the default. */
export const LINK_OPTIONS = {
  video: {
    w: { lo: 16, hi: 1920, def: 1280, even: true, says: 'width in pixels' },
    h: { lo: 16, hi: 1080, def: 720, even: true, says: 'height in pixels' },
    fps: { lo: 1, hi: 60, def: 30, even: false, says: 'frames a second' },
  },
};

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
    const range = `a whole number from ${o.lo} to ${o.hi}${o.even ? ', and even' : ''}`;
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      return { why: `${k} is the ${o.says} and must be ${range}, and ${v === undefined ? 'it was given no value' : `${v} is not`}.`,
               fix: `Write ${k} ${o.def}, which is what it is when it is left out.` };
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
export function printOptions(options) {
  return OPTION_NAMES.filter((k) => options && options[k] !== undefined)
    .map((k) => `${k} ${options[k]}`).join(', ');
}

// demo/shell/seed.mjs — one seeded generator, and one rule about it.
//
// THE SEED IS IN THE DOCUMENT AND THE OUTPUT IS NOT. `pappus` already works
// this way on the board — a roll names its character and carries its seed back,
// and `pappus-live.mjs` asserts the NEGATIVE CONTROL that the same seed is not
// distinguishable from itself. A generator whose output has to be stored is not
// generative, it is a file; a generator you can replay from four bytes is a
// document that fits in one relay message.
//
// mulberry32, the same one `timeline/render.mjs` uses. Chosen there and kept
// here for the reason that matters: it is twenty lines, it is not the platform's
// `Math.random` (which cannot be seeded at all), and two machines running it on
// the same seed produce the same numbers — which is the whole point when the
// seed is what crosses the wire.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A room, from one 32-bit number.
 *
 * ⚠️ EVERY NUMBER IS ROUNDED BEFORE IT ENTERS THE DOCUMENT. The generator is
 * deterministic, so the raw floats would already match — but the document is
 * compared BYTE FOR BYTE by the page's own negative control, and a byte
 * comparison over unrounded floats is a test of how two engines print doubles
 * rather than of whether the world is the same. Round at the boundary, once,
 * and the claim "the same seed rebuilds the same room" means what it says.
 */
export function world(seed) {
  const r = mulberry32(seed);
  const n = 10 + Math.floor(r() * 22);
  const hue = Math.round(r() * 1000) / 1000;
  const things = [];
  for (let i = 0; i < n; i++) {
    const ang = r() * Math.PI * 2;
    const rad = 1.4 + r() * 3.2;
    things.push({
      x: round(Math.cos(ang) * rad),
      y: round(0.3 + r() * 2.4),
      z: round(Math.sin(ang) * rad),
      s: round(0.12 + r() * 0.42),
      rx: round(r() * Math.PI),
      ry: round(r() * Math.PI),
      spin: round((r() - 0.5) * 0.7),
      // The palette is a rotation around the seed's hue rather than a free
      // colour per object: a room of unrelated colours reads as noise, and the
      // one thing a viewer should be able to see is that two rooms from two
      // seeds are DIFFERENT rooms rather than the same room reshuffled.
      c: round(hue + r() * 0.34),
    });
  }
  // Fixed key order, so `JSON.stringify` is canonical without a sort.
  return { v: 1, seed: seed >>> 0, hue, things };
}

const round = (x) => Math.round(x * 10000) / 10000;

/** The canonical bytes of a room. What the negative control compares. */
export const docOf = (w) => JSON.stringify(w);

/**
 * Would this document be accepted? The page sends one that would not, every
 * run, because a check that has never said no has not been shown to work.
 */
export function validate(doc) {
  if (!doc || doc.v !== 1) return 'not a room document';
  if (!Number.isInteger(doc.seed) || doc.seed < 0) return 'the seed is not a whole number';
  if (!Array.isArray(doc.things) || !doc.things.length) return 'a room with nothing in it';
  if (doc.things.length > 64) return `${doc.things.length} things — more than a room holds`;
  for (const t of doc.things) {
    if (![t.x, t.y, t.z, t.s].every(Number.isFinite)) return 'a thing with no place';
    if (t.s <= 0 || t.s > 2) return `a thing sized ${t.s}`;
    if (Math.hypot(t.x, t.z) > 12) return 'a thing outside the room';
  }
  return null;
}

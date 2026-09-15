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
/**
 * 🔴 THE UNIT, AND EVERYTHING ELSE IS A MULTIPLE OF IT. A builder needs a grid
 * or it is a pile: two bricks are either in the same system or they are two
 * objects that happen to be near each other. 0.2 m is a brick you can pick up
 * with a controller and stack four of before it is out of reach.
 */
export const UNIT = 0.2;
/**
 * 🔴 ONE SIZE, AND EVERY SIDE THE SAME. Three sizes were tried and they are the
 * wrong kind of variety here: mixed cubes on one grid make the grid hard to
 * read — you cannot tell at a glance whether two faces line up — and the snap
 * has to offset each brick by its OWN half, so two bricks of different sizes
 * sit on interleaved lattices that only meet every few units. One cube, one
 * lattice, every face on a line. Colour is what makes one brick different from
 * the next, which is one channel doing one job.
 */
export const BRICKS = [1];

/**
 * 🔴 A CURATED SET, NOT A ROTATION AROUND A RANDOM HUE. The old palette was
 * `hue + r() * 0.34` — a wedge of the colour wheel starting somewhere the seed
 * chose, which gave a coherent room and a DIFFERENT coherent room every roll,
 * including some muddy ones. These are picked: primaries a brick is actually
 * made in, plus a light and a dark neutral to build with. A seed chooses which
 * of them appear, never what they are.
 *
 * ⚠️ THEY ARE HUES ON `hueRGB`'s COSINE, not RGB triples, because that is what
 * the renderer takes — `0.45 + 0.55 * cos(2π(h + k))` per channel. Changing the
 * shader to accept RGB is a bigger change than this is worth, and the cosine
 * family is what makes them look like one set rather than six colours.
 */
export const PALETTE = [0.02, 0.09, 0.15, 0.36, 0.55, 0.72];

export function world(seed) {
  const r = mulberry32(seed);
  const n = 12 + Math.floor(r() * 16);
  const hue = Math.round(r() * 1000) / 1000;
  const things = [];
  for (let i = 0; i < n; i++) {
    // 🔴 ON THE GRID FROM THE START. A generator that scatters and a builder
    // that snaps disagree about where things belong, and the disagreement shows
    // the first time you pick something up: it jumps. Placed on the grid, the
    // first brick you move is already where the rule would have put it.
    const u = BRICKS[Math.floor(r() * BRICKS.length)];
    const half = u * UNIT / 2;
    const gx = Math.floor(r() * 21) - 10;        // a 21x21 plate of unit cells
    const gz = Math.floor(r() * 21) - 10;
    const lift = Math.floor(r() * 5);            // how many units off the floor
    things.push({
      x: round(gx * UNIT + half),
      // ⚠️ SITTING ON SOMETHING, NEVER FLOATING AT A FRACTION. `y` is the
      // CENTRE, so a brick resting on the floor has its centre at half its own
      // height — which is the one place the snap below will also put it.
      y: round(lift * UNIT + half),
      z: round(gz * UNIT + half),
      s: round(u * UNIT),
      // ⚠️ NO TUMBLING. `rx`, `ry` and `spin` are what made these look like
      // rubble; a brick is axis-aligned or it is not a brick. They are kept in
      // the document at zero rather than dropped, because the renderer and the
      // validator both still read them and a missing field is a different
      // document.
      rx: 0, ry: 0, spin: 0,
      c: PALETTE[Math.floor(r() * PALETTE.length)],
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

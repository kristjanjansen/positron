// demo/shell/seed.mjs: one seeded generator (mulberry32). The seed is in the document and the
// output is not, so a room replays from four bytes; Math.random cannot be seeded.
// why: lessons/kit-seed.md#header

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
 * The grid unit in metres; every length in the document is a multiple of it.
 * `PLATE` in demo/blocks/index.html is in metres and must move with it.
 * Rooms are rounded before they enter the document, which is compared byte for byte.
 * why: lessons/kit-seed.md#world-unit
 */
export const UNIT = 1.0;
/**
 * One size: mixed cubes sit on interleaved lattices and the grid stops reading. Colour varies.
 * why: lessons/kit-seed.md#bricks
 */
export const BRICKS = [1];

/**
 * Six close greys (1.6x top to bottom, under one cube's own shading span), so brightness stays
 * free to say pointed at and held.
 * why: lessons/kit-seed.md#palette
 */
export const PALETTE = [0.55, 0.62, 0.69, 0.76, 0.83, 0.90];

export function world(seed) {
  const r = mulberry32(seed);
  // Seven to thirteen things in eighty-one cells; counted in cells, so a bigger brick changes nothing.
  // why: lessons/kit-seed.md#count
  const n = 7 + Math.floor(r() * 7);
  const hue = Math.round(r() * 1000) / 1000;
  const things = [];
  // One cell each, redrawn until free (deterministic by seed), so nothing is pushed under the floor.
  // why: lessons/kit-seed.md#one-cell
  const taken = new Set();
  for (let i = 0; i < n; i++) {
    // On the grid from the start, so the first brick picked up does not jump to snap.
    // why: lessons/kit-seed.md#on-grid
    const u = BRICKS[Math.floor(r() * BRICKS.length)];
    const half = u * UNIT / 2;
    let gx = 0, gz = 0;
    for (let tries = 0; tries < 64; tries++) {
      gx = Math.floor(r() * 9) - 4;              // a 9x9 plate of unit cells
      gz = Math.floor(r() * 9) - 4;
      if (!taken.has(`${gx},${gz}`)) break;
    }
    taken.add(`${gx},${gz}`);
    things.push({
      x: round(gx * UNIT + half),
      // All on the floor at the start: `y` is the centre, so resting is half the brick's height.
      // why: lessons/kit-seed.md#on-floor
      y: round(half),
      z: round(gz * UNIT + half),
      s: round(u * UNIT),
      // Axis-aligned: rx, ry and spin stay in the document at zero because renderer and validator read them.
      // why: lessons/kit-seed.md#no-tumbling
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
  if (doc.things.length > 64) return `${doc.things.length} things, more than a room holds`;
  for (const t of doc.things) {
    if (![t.x, t.y, t.z, t.s].every(Number.isFinite)) return 'a thing with no place';
    if (t.s <= 0 || t.s > 2) return `a thing sized ${t.s}`;
    // 24 m, in metres: a full 8 m thumbstick push from a plate corner must stay legal.
    // why: lessons/kit-seed.md#room-radius
    if (Math.hypot(t.x, t.z) > 24) return 'a thing outside the room';
    // Nothing under the floor: `y` is the centre, and 1e-4 is the document's four-decimal rounding.
    // why: lessons/kit-seed.md#floor
    if (t.y < t.s / 2 - 1e-4) return 'a thing under the floor';
  }
  return null;
}

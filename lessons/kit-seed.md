# Kit lessons: seed.mjs

The long comments cut from `demo/shell/seed.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-seed.md#<anchor>`.

<a id="header"></a>

## seed.mjs, file header

demo/shell/seed.mjs — one seeded generator, and one rule about it.

THE SEED IS IN THE DOCUMENT AND THE OUTPUT IS NOT. `pappus` already works
this way on the board — a roll names its character and carries its seed back,
and `pappus-live.mjs` asserts the NEGATIVE CONTROL that the same seed is not
distinguishable from itself. A generator whose output has to be stored is not
generative, it is a file; a generator you can replay from four bytes is a
document that fits in one relay message.

mulberry32, the same one `timeline/render.mjs` uses. Chosen there and kept
here for the reason that matters: it is twenty lines, it is not the platform's
`Math.random` (which cannot be seeded at all), and two machines running it on
the same seed produce the same numbers — which is the whole point when the
seed is what crosses the wire.

<a id="world-unit"></a>

## seed.mjs, world and UNIT

A room, from one 32-bit number.

⚠️ EVERY NUMBER IS ROUNDED BEFORE IT ENTERS THE DOCUMENT. The generator is
deterministic, so the raw floats would already match — but the document is
compared BYTE FOR BYTE by the page's own negative control, and a byte
comparison over unrounded floats is a test of how two engines print doubles
rather than of whether the world is the same. Round at the boundary, once,
and the claim "the same seed rebuilds the same room" means what it says.
🔴 THE UNIT, AND EVERYTHING ELSE IS A MULTIPLE OF IT. A builder needs a grid
or it is a pile: two bricks are either in the same system or they are two
objects that happen to be near each other.

⚠️ HALF A METRE, ASKED FOR AFTER A HEADSET RUN. It was 0.2 m, argued as "a
brick you can pick up with a controller and stack four of before it is out of
reach", which is sound arithmetic about arm length and wrong about what the
room feels like: a 20 cm cube at arm's length is a handful of gravel, and two
dozen of them on a plate read as scatter rather than as building. At 0.5 m a
brick is an object you move with your whole arm, which is the gesture this
page is for. Two and a half fit in a reach instead of ten.

⚠️ AND A WHOLE METRE SINCE 2026-09-19, WHICH IS THE SAME INSTINCT ONE STEP
FURTHER: *"make blocks 2x bigger in each direction"*. The reasoning to check
afterwards has not changed, and it is still what a brick feels like at arm's
length. A metre cube is no longer an object you pick up, it is one you walk
round and push, so a reach holds one of them where it used to hold two and a
half, and eight of the floor's 12.5 cm dots fit across a face.

🔴 `PLATE` IN `demo/blocks/index.html` MOVES WITH THIS, ALWAYS. Every length
in the document is a multiple of this constant, so they all double on their
own. The plate is a distance in metres and does not, and leaving it where it
was would have taken the buildable floor from 9.6 bricks across to 4.8, which
is a doubling of the brick and a quartering of the room it goes in.

<a id="bricks"></a>

## seed.mjs, BRICKS

🔴 ONE SIZE, AND EVERY SIDE THE SAME. Three sizes were tried and they are the
wrong kind of variety here: mixed cubes on one grid make the grid hard to
read — you cannot tell at a glance whether two faces line up — and the snap
has to offset each brick by its OWN half, so two bricks of different sizes
sit on interleaved lattices that only meet every few units. One cube, one
lattice, every face on a line. Colour is what makes one brick different from
the next, which is one channel doing one job.

<a id="palette"></a>

## seed.mjs, PALETTE

🔴 GREY, AND BARELY DIFFERENT GREYS AT THAT. Six coloured bricks made every
room a different room, and colour is the one channel this page needs for
something else: what is under your pointer and what is in your hand are told
apart by brightness, which a red brick beside a blue one drowns out. These
are six steps of one grey, close enough that a stack reads as one material
and far enough that two faces meeting are two faces.

⚠️ THEY ARE SHADES ON `shadeRGB`, not hues, and the span is deliberately
narrow. Lighting already multiplies every face by 0.35 to 1.0, so a wide
palette would put one brick's dark face below another brick's bright one and
the grid would stop reading as flat ground. Top to bottom here is 1.6x, which
is under what one cube's own shading spans.

<a id="count"></a>

## seed.mjs, world, how many

⚠️ FEWER, BECAUSE THEY ARE BIGGER. Twenty-seven cubes on a nine-cell plate
is a wall, not a room to build in. The count is in CELLS rather than in
metres, so it survived the brick doubling untouched: seven to thirteen
things in eighty-one cells is the same room however big a cell is.

<a id="one-cell"></a>

## seed.mjs, world, one cell each

🔴 ONE CELL EACH, SO NOTHING HAS TO BE PUSHED ANYWHERE. Two bricks drawn
into the same cell are two bricks in the same place, and the only way out
of that is along an axis — which for a pair sitting flat means one of them
going UNDER the floor, because down is as short a way out as up. Drawing
again until the cell is free costs a handful of extra numbers out of the
generator (27 bricks into 441 cells collides about twice) and it is
deterministic, because the redraw order is fixed by the seed.

<a id="on-grid"></a>

## seed.mjs, world, on the grid

🔴 ON THE GRID FROM THE START. A generator that scatters and a builder
that snaps disagree about where things belong, and the disagreement shows
the first time you pick something up: it jumps. Placed on the grid, the
first brick you move is already where the rule would have put it.

<a id="on-floor"></a>

## seed.mjs, world, on the floor

🔴 ON THE FLOOR, ALL OF THEM, AT THE START. `lift` used to raise a
brick up to four units into the air, so a room opened as a cloud with
nothing under it — and the first thing anybody does to a floating brick
is drop it, which is a move the room should not have needed. `y` is the
CENTRE, so a brick resting on the floor has its centre at half its own
height, which is the one place the snap will also put it. Stacks are
what the builder is FOR; they are not what it hands you.

<a id="no-tumbling"></a>

## seed.mjs, world, no tumbling

⚠️ NO TUMBLING. `rx`, `ry` and `spin` are what made these look like
rubble; a brick is axis-aligned or it is not a brick. They are kept in
the document at zero rather than dropped, because the renderer and the
validator both still read them and a missing field is a different
document.

<a id="room-radius"></a>

## seed.mjs, validate, room radius

⚠️ IN METRES, SO IT DOUBLED WITH THE BRICK. It was 12 m against a 0.5 m
unit, and the page's own ceiling on how far a thumbstick may push a held
brick sat right under it: standing in a corner of the plate and pushing
the full 8 m put a thing 11.4 m out, a shade inside this. Both numbers
doubled together, so a push that used to be legal still is. Left at 12 it
would have refused the move silently, and a brick that stops following
your hand reads as a broken page rather than as a rule.

<a id="floor"></a>

## seed.mjs, validate, nothing under the floor

🔴 NOTHING GOES UNDER THE FLOOR, AND NOTHING STOPPED IT. This checked x
and z and never y, so the room had walls and no ground: a brick dragged
downward sank through the dots and out of reach, and the only way to get
it back was to roll the room. REPORTED from a headset.

⚠️ `y` IS THE CENTRE, so resting on the floor means `y === s / 2` and
anything below that is a brick with part of itself underground. The
tolerance is the document's own rounding: `r4` keeps four decimals, so a
legal stack can sit a ten-thousandth low and must not be refused for it.

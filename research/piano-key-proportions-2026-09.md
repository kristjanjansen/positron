# Piano key proportions on a screen, and where the black keys really go (2026-09-17)

**Outcome in one line: our widths are right and our POSITIONS are wrong.** A real
piano does not centre its black keys on the joins between the white keys, and
ours does. Fixing that moves nothing else: same key widths, same heights, same
number of keys on a phone, same hit test. It takes the narrowest strip of white
a finger can land on from **19.67 px to 27.00 px** and the spread between the
widest and narrowest from **14.66 px to 2.44 px**. Both numbers are MEASURED on
our own component at a 390 px viewport, before and after, in the same browser.

Asked for as *"do bg research on mobile and desktop virtual piano keyboards to
get the proportion of regular and sharp/flats right"*. Nothing in the repo was
changed: the proposed layout was applied from the harness, over the shipped
stylesheet, and measured.

**§5 answers the same questions against real MUSIC SOFTWARE** rather than web
keyboards: GarageBand on both an iPhone and an iPad, measured to the pixel off
screenshots whose device and scale are established, plus MuseScore, Ardour and
LMMS read from source, plus the KORG, Moog, Ableton and ROLI apps. It changes
nothing in the recommendation. GarageBand's black key is **0.649** of its white
one against our 0.66, and **it offsets its black keys by a constant 4.0 pt**.

Every claim below is tagged **MEASURED** (this machine did it), **READ** (a
source says so, linked at the end), or **INFERRED** (reasoned from something
measured or read, not itself checked).

---

## 0 · The footprint, because most of it is somebody else's server

- **Seven page loads across six URLs, in three headless Chrome runs.** One each
  for virtualpiano.net, recursivearts.com, apronus.com,
  kevinsqi.github.io/react-piano and onlinepianist.com, and two for musicca.com
  (the second is explained in §2.3). Three of the six returned no keyboard and
  none of those three was retried. Zero clicks on any of them, no accounts, no
  audio started, no loops.
- The phone pass on each site is a **resize of the page already loaded**, not a
  second request. It is a weaker instrument than a fresh load at 390 px and §2.4
  says where that matters.
- Four source files read from `raw.githubusercontent.com`, two GitHub API
  directory listings.
- Our own component was measured against a local server in the scratchpad, with
  no relay, no board and no room joined.
- **§5 was added later the same day** and cost: one call to Apple's public
  `itunes.apple.com/lookup` API, **one load per screenshot** from Apple's
  screenshot CDN (contact sheets at a small size to find which images contain a
  keyboard, then the keyboard-bearing ones at native resolution), one Apple
  support page, and five source files from GitHub. No app was installed, no
  account used, nothing clicked.

---

## 1 · The real instrument

### 1.1 The widths, and the span they come from

**READ**, Wikipedia's *Musical keyboard*, verbatim:

> Modern piano keyboards ordinarily have an octave span of 164–165 mm
> (6.46–6.50 in), resulting in the width of black keys averaging 13.7 mm
> (0.54 in) and white keys about 23.5 mm (0.93 in) at the base.

So the number already written in `demo/shell/keyboard.mjs` is right: **a real
black key is 13.7 mm against a 23.5 mm white key, a ratio of 0.583.** Seven
whites share the 164.5 mm octave, which is where 23.5 comes from.

The same article records that this is a convention rather than a law of nature:
historical keyboards ran from 125 mm to 170 mm per octave, and 140 mm, 152 mm and
130 mm octaves for smaller hands are made today by Steinbuhler, after Christopher
Donison's 7/8 size of the 1970s (**READ**).

### 1.2 The lengths

**NOT ESTABLISHED to one number.** Published figures disagree: one source says a
white key is about 140 mm long with black keys about 100 to 105 mm, another says
150 and 95. The ratio is the stabler part and it lands between **0.63 and 0.71**
across the sources seen, which is another way of saying the black key covers
roughly the back two thirds of the white one. What would establish it: a caliper
on a real instrument, or a manufacturer's published key specification, neither of
which this machine has.

For a flat on-screen keyboard that ratio is the number that matters, and 0.63 to
0.71 is enough to grade against. Ours is **0.622** (46 px of 74, **MEASURED**),
just under the bottom of it.

### 1.3 The offsets, which is the part virtual keyboards get wrong

Seven white keys have to make room for five black ones, and the five are not
evenly divisible into the seven. Wikipedia states the consequence plainly
(**READ**, verbatim):

> In a typical keyboard layout, black note keys have uniform width, and white
> note keys have uniform width and uniform spacing at the front of the keyboard.
> In the larger gaps between the black keys, the width of the natural notes C, D
> and E differ slightly from the width of keys F, G, A and B.

The arithmetic is worked out in full on mathpages (**READ**). Write `W` for the
white key width at the front, `B` for the black key width, and `c d e f g a b`
for the widths of the white keys at the BACK, the part between the black keys.
Two constraints hold by construction:

```
c + d + e + 2B = 3W        (the C-D-E group, two black keys)
f + g + a + b + 3B = 4W    (the F-G-A-B group, three black keys)
```

It is impossible to make all seven back widths equal. mathpages enumerates the
solutions by how badly they miss, and names the best one:

> set c=d=e=(W-2B/3) and f=g=a=b=(W-3B/4)

producing a worst mismatch of `B/12`, which it calls "the best possible given
that all the black keys are identical", and attributes to the Roland PC-100. The
cruder ones it lists are `B/2`, `B/4` (attributed to the Roland HP-70), `B/6` and
`B/8`. So a manufacturer picks a point on this ladder; the ladder itself is not
in dispute.

**The black key centre offsets fall straight out of that** (**INFERRED**,
arithmetic from the formulas above, and then MEASURED in §4 by building it):

| black key | centre sits | against the join between |
|---|---|---|
| C# | `B/6` to the LEFT | C and D |
| D# | `B/6` to the RIGHT | D and E |
| F# | `B/4` to the LEFT | F and G |
| G# | dead centre | G and A |
| A# | `B/4` to the RIGHT | A and B |

With the real instrument's `W = 23.5 mm` and `B = 13.7 mm`: **2.28 mm** for the
two-black group and **3.43 mm** for the three-black group. The back widths come
out **14.37 mm** for C, D and E and **13.23 mm** for F, G, A and B, differing by
`B/12` = 1.14 mm, which is about 8 percent.

### 1.4 What centring them instead gets wrong

Two things, and the second is the one a hand notices.

**The white keys stop being the same width where it matters.** Centred, the back
widths are `W - B/2` for C, E, F and B and `W - B` for D, G and A: with real
numbers, 16.65 mm against 9.80 mm, a ratio of **1.70**. On a real piano the same
ratio is 14.37 / 13.23 = **1.09** (**INFERRED**, arithmetic). D, G and A become
the narrow keys, at 59 percent of C's back width. A piano keeps every white key
between 92 and 100 percent of it.

**The black keys stop being evenly spaced.** Distances between adjacent black
key centres across one octave (**INFERRED**, arithmetic from §1.3):

| | C#→D# | D#→F# | F#→G# | G#→A# | A#→C# |
|---|---|---|---|---|---|
| real piano | 28.07 | 41.29 | 26.93 | 26.93 | 41.29 |
| centred on the joins | 23.50 | 47.00 | 23.50 | 23.50 | 47.00 |

Widest step over narrowest: **1.53 on a piano, 2.00 centred.** The real
instrument spreads its black keys almost evenly along the octave, and centring
bunches them into two tight clusters with a wide hole between. That is the thing
a player feels and a reader sees without being able to name it.

---

## 2 · What the field actually does

### 2.1 Read from source

| implementation | black / white width | black / white height | black keys centred on the joins? |
|---|---|---|---|
| acoustic piano | **0.583** (13.7 / 23.5) | 0.6 to 0.7 (length) | **no**, `B/6` and `B/4` |
| [react-piano](https://github.com/kevinsqi/react-piano) | **0.65** declared | **0.66** | **no**, a table of positions |
| [webaudio-keyboard](https://github.com/g200kg/webaudio-controls) | **0.583** (`7/12`) | **0.55** | **no**, a uniform lattice |
| [qwerty-hancock](https://github.com/stuartmemo/qwerty-hancock) | **0.50** | **0.667** (`height/1.5`) | **yes**, centred |
| positron `keyboard.mjs` | **0.66** | **0.622** | **yes**, centred |

**react-piano** (**READ**, `src/Key.js`) carries the offsets as a table of left
edges in units of white key width:

```js
accidentalWidthRatio: 0.65,
pitchPositions: { C: 0, Db: 0.55, D: 1, Eb: 1.8, E: 2, F: 3, Gb: 3.5,
                  G: 4, Ab: 4.7, A: 5, Bb: 5.85, B: 6 },
```

Those left edges put the black centres at **-0.125, +0.125, -0.175, +0.025,
+0.175** white key widths from their joins (**INFERRED**, arithmetic). Compare
the ideal for a 0.65 black key: `B/6` = 0.108 and `B/4` = 0.163. So react-piano
is the real piano's shape, rounded by hand and slightly overshot.

**webaudio-keyboard** (**READ**, `webaudio-controls.js`) does it differently and
in two lines:

```js
this.kp=[0,7/12,1,3*7/12,2,3,6*7/12,4,8*7/12,5,10*7/12,6];
this.bwidth=this.wwidth*7/12;
```

Every black key is `7/12` of a white key wide, and every one of the twelve
semitones sits on a uniform `7/12` lattice. That is the other classical answer:
even spacing of all twelve, rather than even white tails. Its offsets come out
**-0.125, +0.042, -0.208, -0.042, +0.125** and its back widths land within
`0.167W` of each other (**INFERRED**, arithmetic), which is worse than the `B/12`
optimum and far better than centring.

**qwerty-hancock** (**READ**, `src/keyboard.ts`) is the counter-example, and it
made the same two choices we did:

```js
const blackKeyWidth = Math.floor(whiteKeyWidth / 2);
const leftPosition = Math.floor((whiteKeyWidth + 1) * (i + 1) - blackKeyWidth / 2);
```

Left edge equals the join minus half a black key, which is centred, exactly.

### 2.2 Measured in a browser, ours and three others

All figures **MEASURED** 2026-09-17, headless Chrome, CSS pixels, one page load
each. Desktop is a 1400 px viewport, phone is 390 px with touch emulation.

| | white, desktop | black, desktop | white, phone | black, phone | width ratio | height ratio |
|---|---|---|---|---|---|---|
| **positron** | 87.38 x 74 | 57.66 x 46 | **49.00 x 74** | **32.33 x 46** | 0.660 | 0.622 |
| onlinepianist.com | 58.95 x 383 | 34.94 x 253 | 53.44 x 328 | 31.69 x 216 | 0.593 | 0.660 |
| musicca.com | 36.78 x 190 | 29.34 x 110 | 35.70 x 180 | 28.50 x 108 | 0.798 | 0.579 |
| react-piano demo | 39.61 x 123 | 26.36 x 81 | 19.05 x 61 | 13.00 x 40 | 0.665 | 0.660 |

react-piano's black key measures 0.665 rather than the 0.650 its source
declares, because its white keys carry a 1 px margin that the accidental's width
is not computed against (**INFERRED** from the source in §2.1).

And the offsets, as a fraction of a white key width, per octave. Each keyboard's
own ideal is `(B - gap)/6` and `(B - gap)/4` for ITS black key width, so the
rows are comparable:

| | C# | D# | F# | G# | A# |
|---|---|---|---|---|---|
| **positron** | **0.000** | **0.000** | **0.000** | **0.000** | **0.000** |
| onlinepianist.com (phone) | -0.073 | +0.094 | -0.145 | -0.003 | +0.138 |
| its own ideal | -0.093 | +0.093 | -0.139 | 0 | +0.139 |
| react-piano demo (desktop) | -0.117 | +0.137 | -0.173 | +0.031 | +0.183 |
| its own ideal | -0.107 | +0.107 | -0.160 | 0 | +0.160 |
| musicca.com | -0.039 | +0.050 | -0.101 | -0.004 | +0.094 |
| its own ideal | -0.133 | +0.133 | -0.199 | 0 | +0.199 |

**onlinepianist.com is the closest thing to a real piano measured here**: black
key 0.593 of a white, 0.660 as tall, and four of its five offsets within 0.35 px
of the mathematically optimal ones (its C# is 1.06 px short, the only one off by
more than half a pixel). **react-piano** overshoots the ideal slightly in the same
directions. **musicca.com** has the right SHAPE at 29 to 51 percent of the right
magnitude, plus an accumulating rounding error of **-0.65 px per octave** across
its three octaves (**MEASURED**: the same five relative offsets repeat to within
0.02 px in every octave while the octave's own mean drifts). **We are the only
one of the four measured with all five offsets at exactly zero.**

The consequence, in the units that matter, at a 390 px phone viewport
(**MEASURED**): the narrowest strip of white key left uncovered by its
neighbouring black keys.

| | narrowest white strip | widest | spread |
|---|---|---|---|
| **positron** | **19.67 px** | 34.34 px | **14.66 px** |
| onlinepianist.com | 30.86 px | 33.57 px | 2.71 px |
| musicca.com | 10.25 px | 20.38 px | 10.13 px |
| react-piano demo | 9.38 px | 12.02 px | 2.64 px |

**The comparison that decides this whole document is the second row against the
first.** onlinepianist's white key is 9 percent wider than ours and its black key
is 2 percent NARROWER, so its geometry is close enough to ours to compare
directly. Its narrowest white strip is **57 percent wider** than ours (30.86
against 19.67) and its spread is **5.4 times smaller** (2.71 against 14.66). All
of that difference is the offsets. None of it is key size.

### 2.3 musicca was loaded twice, on purpose

Its black key measured **0.798** of a white, which is far outside everything else
in the field and would have been irresponsible to publish on one reading. The
second load asked the box model rather than the rectangle: `padding: 0px`,
`border: 0px`, `box-sizing: border-box` on the black key, so the element is the
painted key and not a padded touch target around a smaller one. A screenshot of
the keyboard confirms it by eye: the black keys nearly touch, with thin white
slivers between them. **MEASURED**, and the surprise survived the check.

### 2.4 What could not be measured, and why

- **virtualpiano.net**: answered `Just a moment...` on both passes. A Cloudflare
  interstitial that headless Chrome does not clear. NOT retried, not worked
  around.
- **recursivearts.com/virtual-piano**: the keyboard is behind a
  `piano-load-button` that must be clicked. Not clicked. What would establish it:
  one click, which is a real interaction with their service and was not worth it
  for a fourth data point.
- **apronus.com/music/onlinepiano.htm**: 404 at that URL. Not hunted for.
- **quadibloc.com/other/cnv05.htm**, a page the search engine quotes on exactly
  this subject: **blocked by this machine's network**, which answered a
  Check Point `UserCheck` portal redirect at `192.168.1.2` and then timed out.
  Its substance is quoted second hand in the sources below and is not relied on
  for any number here.
- **Native mobile apps and desktop DAWs: ANSWERED IN §5**, which was added on
  the same day after the reader pointed out that everything in this section is a
  web toy or a teaching page. The route that made it measurable is the one
  guessed at here: a screenshot at a resolution that identifies the device.

---

## 3 · Touch targets, and whether a black key is allowed to break them

What the rules actually say:

- **Apple**, verbatim from [Apple's own design tips](https://developer.apple.com/design/tips/),
  under the heading *Hit Targets*: "Create controls that measure at least 44
  points x 44 points so they can be accurately tapped with a finger."
  (**READ**.) The Human Interface Guidelines carry the same 44 pt x 44 pt figure
  as a minimum tappable area.
- **Android / Material**: 48 dp x 48 dp minimum touch target (**READ**, from
  secondary sources; Material's own page is script rendered and this machine
  could not fetch its text, so the figure is not quoted verbatim from Google).
- **WCAG 2.2 SC 2.5.8 Target Size (Minimum), Level AA**, verbatim: "The size of
  the target for pointer inputs is at least 24 by 24 CSS pixels, except when:"
  and then five exceptions, of which two matter here (**READ**):
  - *Spacing*: undersized targets are fine if a 24 px circle centred on each does
    not touch another target's circle.
  - *Essential*: "A particular presentation of the target is essential or is
    legally required for the information being conveyed", where essential means
    something that "if removed, would fundamentally change the information or
    functionality of the content".
- **WCAG 2.1 SC 2.5.5 Target Size, Level AAA**: 44 by 44 CSS pixels (**READ**).

**Is a piano black key a routine and defensible exception? Yes, and the field
proves it rather than arguing it.** Every touch keyboard measured here is under
44 px at a phone width, and three of the four are under 44 px at a DESKTOP width
too (**MEASURED**):

| black key width at a 390 px viewport | |
|---|---|
| **positron** | **32.33 px** |
| onlinepianist.com | 31.69 px |
| musicca.com | 28.50 px |
| react-piano demo | 13.00 px |

So we are not an outlier. We have the **largest** black key of the four, and
react-piano's demo, which sets no minimum width at all, is under half of ours.

Three things are worth being precise about:

1. **We already clear the WCAG AA floor and always did.** 32.33 x 46 is bigger
   than 24 x 24 in both directions, so no exception has to be claimed for the
   black key. It is Apple's 44 and Google's 48, which are guidance rather than
   conformance, that a piano cannot meet.
2. **The white keys clear it too, but with less room than they look to have.**
   A white key is 49 x 74, and in the top 46 px of it the black keys eat into it
   from both sides. Our narrowest remaining strip is **19.67 px** wide
   (**MEASURED**), which is under 24. A 24 x 24 square still fits in the bottom
   28 px band, which is full width, so the criterion is met; but the strip a
   finger sees between two black keys is currently narrower than the minimum
   anything else on the page is held to.
3. **Making the black key hit 44 px is not available.** At our 0.66 ratio a 44 px
   black key needs a 66.7 px white key, which takes the eight columns from 413 px
   to 554 px and drops a 390 px phone from 7.6 visible white keys to 5.6
   (**INFERRED**, arithmetic). Keeping the 49 px white and widening the black to
   44 px instead means a ratio of 0.90, wider than musicca's already extreme
   0.798, and leaves white strips of 18 to 22 px even with the offsets applied.
   The existing trade in `keyboard.mjs` (a 32 x 46 target that wins the overlap)
   is the right one and this research does not disturb it.

---

## 4 · The recommendation, with the numbers it is based on

**Keep every width and every height. Move the five black keys.**

⚠️ **§5 re-tested this recommendation against real music software** (GarageBand,
MuseScore, Ardour, LMMS, the KORG and Moog apps) after the web survey above was
correctly called out as a field of toys. Nothing here changed. The witnesses got
better: GarageBand's own black key is 0.649 of its white one against our 0.66,
and it offsets its black keys on both the iPhone and the iPad.

All three rows below are **MEASURED** on our own component at a 390 px viewport,
in one page, by applying the candidate layout over the shipped stylesheet from
the harness. Nothing in the repo was modified.

| | black key | white strips (C,D,E / F,G,A,B) | narrowest | spread | row width |
|---|---|---|---|---|---|
| **A. shipped** | 32.33 x 46 | 34.34 / 19.67 / 34.34 · 34.34 / 19.67 / 19.67 / 34.34 | **19.67** | **14.66** | 413 px |
| **B. same widths, piano offsets** | 32.33 x 46 | **29.45 each / 27.00 each** | **27.00** | **2.44** | 413 px |
| **C. piano widths (0.583) and offsets** | 28.56 x 46 | 31.96 each / 29.83 each | 29.83 | 2.13 | 413 px |

**Take B.** The reasons, in order of weight:

1. **It costs nothing in fit.** The row is 413 px wide in all three cases
   (**MEASURED**, `scrollWidth`), because only the black keys move and the white
   grid is untouched. A 390 px phone scrolls the same 23 px it does today. The
   49 px floor, the eight columns and `KEY_MIN_PX` are all unaffected.
2. **It costs nothing in the hit test.** The black key still wins the overlap at
   its left edge, its centre and its right edge, for all five sharps, in all
   three layouts: **0 misses** out of 15 probes each (**MEASURED**, via
   `document.elementFromPoint` at the same y the component's own hit test uses).
3. **It fixes the worst piece of target on the page that nobody was counting.**
   The narrowest white strip goes 19.67 to 27.00 px, up 37 percent. That strip is
   the only part of the keyboard measuring under 24 CSS px, which is the floor
   every other control on the page is held to. The white key as a whole already
   met WCAG's criterion through its uncovered bottom band, so this is not a
   conformance fix; it is the difference between a key you aim at and a key you
   aim between.
4. **It is the picture people already know.** Four of the six virtual keyboards
   surveyed offset their black keys. The two that do not are qwerty-hancock and
   us.
5. **C is not worth it.** It buys 2.8 px on a white strip that B has already
   fixed, and pays 3.8 px off the black key, which is the smallest target on the
   page. The black key is the thing that needs the pixels, not the white.

### 4.1 The shift, exactly

The offsets in §1.3 are `B/6` and `B/4` of the black key's width. On our
keyboard a black key straddles a 3 px column gap, so the amount of WHITE it eats
is `B - gap`, and the shift that equalises the strips is `(B - gap)/6` and
`(B - gap)/4`. At 390 px that is **4.89 px** and **7.33 px**; at 1400 px it is
**9.11 px** and **13.66 px** (**MEASURED**, both).

It needs no JavaScript measurement and no breakpoint. One static CSS expression
covers every width, because a percentage inside `translateX` resolves against the
key's own box:

```css
/* --k-off is a unitless number per sharp: -1/6, +1/6, -1/4, 0, +1/4 */
.k.sharp { transform: translateX(calc(-50% - 1.5px + var(--k-off, 0) * (100% - 3px))); }
```

**MEASURED**: that expression produces geometry identical to the arithmetic
version to within 0.001 px, at both 390 px and 1400 px, in the same run.

Four notes for whoever implements it:

- **Read the offset off the PITCH CLASS, not the letter.** `noteOf(k) % 12` in
  `{1, 3, 6, 8, 10}` maps to `{-1/6, +1/6, -1/4, 0, +1/4}`, and anything else
  gets 0. The component's promise that "a caller that passes a different set of
  letters still gets a keyboard" survives that; a table keyed on `w e t y u`
  would not.
- **The `3px` in the expression is the column gap**, which is typed in
  `shell.css` on `.keys`. Two places holding one measurement is the
  `--sld-col` bug again; publish it as a custom property and read it in both.
- **The leading-sharp case still needs its escape.** `keyboard.mjs` already
  removes the transform from a sharp with no white key before it. That branch
  must clear the offset too, or a keyboard opening on a sharp hangs further
  outside its row than it does today.
- **Re-run the stacking assert after the change.** The existing check samples
  both sides of a black key because only the right side depends on paint order.
  With the blacks off centre, the left and right samples are no longer
  symmetric about the join, and the assert should be re-derived from the key's
  own rectangle rather than from the join.

### 4.2 What is NOT recommended

- **Do not change `BLACK_RATIO`.** 0.66 sits mid field (0.50 qwerty-hancock,
  0.583 piano and webaudio-keyboard, 0.593 onlinepianist, 0.65 react-piano,
  0.798 musicca) and it is the ratio that keeps the smallest target on the page
  as large as it can be. The comment in `keyboard.mjs` that calls 0.66 "wider
  than a piano's" is correct and remains the right trade.
- **Do not change the height ratio.** 0.622, against a real instrument's 0.63 to
  0.71 and a field running 0.55 to 0.667. It sits in the middle of the field and
  a hair under the instrument, and nothing measured here argues for moving it.
- **One proportion IS far from the instrument, and it is left alone
  deliberately.** Our white key is 49 x 74, an aspect of **1.51** tall over wide.
  Every other keyboard measured runs **3.1 to 6.5** (**MEASURED**), and a real
  piano's white key is around 6 to 1 (**INFERRED**, from the 23.5 mm width in
  §1.1 and the disputed lengths in §1.2). So our keys are about four times
  stubbier than the flattest thing in the field. That is a page height budget
  rather than a proportion error: a demo page cannot spend 300 px on a keyboard.
  Because the 0.622 height ratio is already right, a taller row would scale
  correctly with no other change, and the offsets recommended above are
  independent of height.

---

## 5 · Music software, which is the witness that counts (added 2026-09-17)

Everything in §2 is a web page. Reported by the reader in one line: *"i assumed
you look into music app keyboards?"*, and the point is right. react-piano and
musicca are teaching pages and toys; what a phone instrument should be measured
against is GarageBand, the KORG and Moog apps, and the keyboards inside real
DAWs. This section is the answer, and **it does not change the recommendation in
§4. It strengthens it.**

### 5.0 What a screenshot can and cannot establish

There are two different claims and they need different evidence.

- **A RATIO and an OFFSET survive any uniform scale.** Any undistorted
  screenshot answers "is the black key 0.6 or 0.8 of the white one" and "are the
  black keys centred". A perspective render or a tilted marketing composite
  answers neither, and three of the images opened here are exactly that.
- **A SIZE IN POINTS needs the device and the capture scale.** The chain used
  below: Apple requires an exact pixel size for each App Store screenshot slot,
  so an image that comes back at **2208 x 1242** is in the 5.5 inch slot
  (iPhone 8 Plus, **736 x 414 pt at @3x**), and one at **2732 x 2048** is in the
  12.9 inch iPad Pro slot (**1366 x 1024 pt at @2x**). Several of the source
  filenames name the device outright: `..._iPhone8Plus55_...`,
  `2._Alchemy-iPhone55-USA.png`, `2._Alchemy-129G2-USA.png`,
  `Model_D_iPhone_5_5in-02.png`, `Simulator_Screen_Shot_-_iPhone_8_Plus_-_...`.
  ⚠️ **The chain has one assumption and it is stated rather than hidden**: that
  the image is a real full screen capture and not a composite drawn at the same
  dimensions. For GarageBand it is safe (Apple's own app, pure UI, no device
  frame, no marketing text, the two shots agree with each other at two different
  scales). Where it is not safe, no point value is given below.

Everything measured here comes from **one load per image** through Apple's own
screenshot CDN, plus **five source files** read from GitHub.

### 5.1 GarageBand for iPhone, MEASURED

The whole geometry, read off the pixels of the 5.5 inch screenshot and divided
by 3. Key edges were found by run length encoding a scanline, so these are edge
positions rather than estimates.

| | pixels (@3x) | points |
|---|---|---|
| white key, visible width | 171 | **57.0 pt** |
| white key, pitch | 174 | **58.0 pt** |
| white key, length | 422 | **140.7 pt** |
| black key, width | 111 | **37.0 pt** |
| black key, length | 245 | **81.7 pt** |
| **black / white width** | 111 / 171 | **0.649** |
| **black / white length** | 245 / 422 | **0.581** |
| white keys across the 736 pt screen | | **12.7** |

**It offsets its black keys, and by a constant.** Black key centre minus the
join between the two white keys it sits on, MEASURED:

| C# | D# | F# | G# | A# |
|---|---|---|---|---|
| -12 px | +12 px | -12 px | **0** | +12 px |
| -4.0 pt | +4.0 pt | -4.0 pt | dead centre | +4.0 pt |

So GarageBand has the real instrument's SHAPE (the outer sharps of each group
pushed outward, G# centred) with ONE magnitude rather than the piano's two. It
is not the `B/12` optimum: 4.0 pt is 11 percent of its own black key width,
where the optimum would be 16.7 percent in the two-black group and 25 percent in
the three-black group. Its white strips come out **35 / 29 / 35 pt** and
**35 / 25 / 25 pt / 35 pt**, a spread of 10 pt.

### 5.2 GarageBand for iPad, MEASURED, and the offset is the same 4.0 pt

The same app on a 1366 x 1024 pt screen. **It draws TWO STACKED KEYBOARD ROWS**
covering different octaves (the screenshot labels the upper row C4, C5, C6 and
the lower row C2, C3, C4), which is a different answer to "an octave does not
fit" from anything in §2.

| | pixels (@2x) | points |
|---|---|---|
| white key, visible width | 130 | **65.0 pt** |
| white key, pitch | 132 | **66.0 pt** |
| white key, length | 546 | **273.0 pt** |
| black key, width | 78 | **39.0 pt** |
| black key, length | 345 | **172.5 pt** |
| **black / white width** | 78 / 130 | **0.600** |
| **black / white length** | 345 / 546 | **0.632** |
| white keys per row | | **20.7**, and there are two rows |

Offsets: **-8, +8, -8, 0, +8 px**, which at @2x is **the same ±4.0 pt as the
iPhone**. That is worth stating plainly: **GarageBand's black key offset is a
fixed 4.0 pt on both devices, not a fraction of the key width.** The key itself
grows by 14 percent from phone to tablet and the offset does not move.

### 5.3 Desktop, READ from source, which beats any screenshot

| | black / white width | black / white height | black keys centred? |
|---|---|---|---|
| **MuseScore 4** | **0.667** of the visible white | **0.656** | **no**, a table of five offsets |
| **Ardour 8** | **0.80** | **0.667** | **no**, exactly mathpages' `B/6` solution |
| **LMMS** | **0.80** | **0.667** | **yes**, centred |

**MuseScore 4** (`pianokeyboardview.cpp`): white key 30.0 plus 2.0 of spacing,
black key 20.0, white height 128.0, black height 84.0, and

```cpp
constexpr qreal offsets[12] {
    0.0, -13.0, 0.0, -7.0, 0.0, 0.0, -13.0, 0.0, -10.0, 0.0, -7.0, 0.0
};
```

applied against the left edge of the FOLLOWING white key. Worked through, the
five black keys land at **-2, +4, -2, +1, +4** from their joins on a 32 unit
pitch (**INFERRED**, arithmetic from the source). That is asymmetric, and it is
asymmetric because it approximates the OTHER classical answer: all twelve
semitones on one uniform lattice, the same scheme as webaudio-keyboard in §2.1.
Its `m_keyWidthScaling` is a user setting, so the key size is the reader's
choice and the keyboard scrolls.

**Ardour 8** (`pianokeyboard.cc`) is the one that lands exactly on a named rung
of the mathpages ladder:

```cpp
int black_key_width = key_width * 0.8;
// black_key_left_shift(): C# 2/3, D# 1/3, F# 2/3, G# 1/2, A# 1/3
```

Those shifts put the black centres at **-B/6, +B/6, -B/6, 0, +B/6**
(**INFERRED**, arithmetic), which gives white strips of `W-2B/3` for C, D, E, F
and B and `W-5B/6` for G and A. That is mathpages' **`B/6` solution**, verbatim:
*"set c=d=e=f=b=(W-2B/3) and g=a=(W-5B/6)"*. Ardour also **shrinks its keys to
fit** rather than scrolling: `key_width = width / number_of_white_keys`.

**LMMS** (`PianoView.cpp`) is the counter-example on the desktop side:
`PW_WHITE_KEY_WIDTH 10`, `PW_BLACK_KEY_WIDTH 8`, heights 57 and 38, and a hit
test that treats the black key as straddling the boundary by half its width on
each side, which is centred.

⚠️ **Ableton Live, Logic, Bitwig, Reason and the big sampler plugins are NOT
established here, and no number should be guessed for them.** They have no
readable source, and the only images of them available are marketing shots and
manual figures at unknown window scale and unknown display scaling. A RATIO
could still be taken from one, because a ratio survives scale, but only from an
image that is a true unscaled capture, and no such image was obtained. What
would establish it: a screenshot taken on a machine where the window size is
known, or the application open in front of somebody who can measure it. The
three above were chosen instead precisely because their source can be read,
which is better evidence than any screenshot.

### 5.4 The apps that do not draw a piano at all

This is the part of the field that §2 could not have found, because no web
keyboard does it.

- **Ableton Note**: **no piano keyboard appears in any of the six of its seven
  App Store screenshots that loaded**. Melodies are entered on a pad grid.
  (**INFERRED** that the product has no piano keyboard anywhere; screenshots are
  what was seen.) An app from the company that makes Live answers "a piano
  octave does not fit on a phone" by not drawing a piano.
- **KORG iM1 (iPad), MEASURED**: a **chromatic strip**, not a piano. White and
  black keys are the same length to within 3 px (**232 px** for a black,
  **229 px** for a white, both running the full height of the row) and sit side
  by side in one row. The light keys are
  **82 px = 41.0 pt** wide and the dark keys are **91 px = 45.5 pt**, so **the
  accidentals are WIDER than the naturals**, and the white key front edges are
  unevenly spaced (173 px from C to D, 87 px from E to F) because the exposed
  strips are equalised instead. It is the shape our own keyboard abandoned on
  2026-09-17, drawn by KORG, with the ratio inverted.
- **Animoog Z (Moog)**: a row of equal width cells filtered by a SCALE control,
  with labels reading G2, G#2, A#2, C3, C#3 (a scale, not a chromatic run).
  ⚠️ **The cell width could NOT be established**: a marketing banner covers the
  left of the strip and the cell separators are dark on dark, below any
  threshold that also separates the keys. What would establish it: a capture
  with the banner off, or the app on a device.
- **ROLI Seaboard 5D**: a continuous playing surface rather than discrete keys.
  Its own App Store caption (**READ**) says *"A control panel allows real-time
  octave shifting and XY modulation"*.
- **KORG Module**: a photo real **3D perspective render** of a grand piano
  keyboard. The offsets in it are the instrument's own, because it is a picture
  of the instrument. ⚠️ **No number can be taken from it**: the keyboard recedes
  in perspective, so key widths are not comparable across the image. An `Octave
  ◀ ▶` control sits at its left.
- **GarageBand itself has a non-piano mode.** Apple's user guide (**READ**): the
  Scale button changes the display so that *"the keyboard changes to show note
  bars rather than keys"*.

### 5.5 What they do when an octave does not fit on a phone

Five different answers, and our component has picked one of them.

| answer | who does it |
|---|---|
| octave stepper buttons | GarageBand (*"Octave Down"* / *"Octave Up"*, READ), KORG Module (`Octave ◀ ▶`), KORG iM1 (`− OCTAVE +`), **positron** |
| scroll the row | GarageBand (a *"Scroll"* mode, READ), MuseScore (READ, source), **positron** (a horizontal scroller) |
| shrink the keys to fit | Ardour (READ, source: `key_width = width / number_of_white_keys`) |
| two stacked rows of different octaves | GarageBand on iPad (MEASURED) |
| do not draw a piano | Ableton Note (pad grid), Animoog Z and KORG iM1 (chromatic strips), Seaboard (continuous surface), GarageBand's own Scale mode (note bars) |

🔴 **And one finding here is about our own component rather than about
proportion.** GarageBand resolves the swipe versus glissando conflict by making
it **a mode the player chooses**: one button cycles *"Glissando"* (the default),
*"Scroll"* and *"Pitch"* (**READ**, Apple's user guide, and the button is
visible in the screenshot reading `GLISSANDO` with three dots under it).
`demo/shell/keyboard.mjs` resolves the same conflict with an automatic verdict in
the first two animation frames. Both are defensible and they are NOT the same
bargain: ours costs a measured 33 ms before a note sounds on a touch and never
asks the player anything, theirs costs a control and a decision and has zero
latency. Both are worth knowing about, and GarageBand went the other way.

⚠️ The control names for KORG Module, KORG iM1 and Animoog Z in the table above
were read off their screenshots rather than out of a manual, so they are the
labels on the buttons and not a description of what the buttons do.

### 5.6 The 44 pt question, answered by Apple's own app

**GarageBand breaks Apple's own 44 pt guidance on its black keys, on both
devices** (MEASURED):

| | black key width | against Apple's 44 pt |
|---|---|---|
| GarageBand, iPhone | **37.0 pt** | **16 percent under** |
| GarageBand, iPad | **39.0 pt** | 11 percent under |
| KORG iM1, iPad | 45.5 pt | over (but it is not a piano) |
| **positron**, 390 px phone | **32.33 px** | 27 percent under |

So §3's conclusion holds and is now made by a better witness: the piano black key
is a target that real music software, including Apple's, does not hold to 44 pt.
We are further under than GarageBand is, and the reason is that our white key is
49 px against its 57 pt: the ratio we apply, 0.66, is barely different from its
0.649.

⚠️ **One number of ours is genuinely worse than GarageBand's and §4 fixes it.**
The narrowest white strip, as a fraction of the white key:

| | narrowest white strip | as a fraction of its own white key |
|---|---|---|
| GarageBand, iPhone | 25.0 pt of 57.0 | **0.439** |
| **positron, shipped** | 19.67 px of 49.0 | **0.401** |
| **positron, §4 recommendation** | 27.00 px of 49.0 | **0.551** |

### 5.7 What this does to the recommendation

**Nothing changes in §4, and two things about it get firmer.**

1. **Keep `BLACK_RATIO` at 0.66.** GarageBand's own phone keyboard is **0.649**
   and its iPad keyboard 0.600, MuseScore is 0.667, Ardour and LMMS are 0.80.
   The piano's 0.583 is the bottom of the field, not the middle of it. Our 0.66
   now has the best possible witness.
2. **Keep the height ratio at 0.622.** GarageBand 0.581 and 0.632, MuseScore
   0.656, Ardour and LMMS 0.667.
3. **Offset the black keys.** Of the six pieces of real music software examined
   here, every one that draws a piano at all offsets them except LMMS:
   GarageBand twice, MuseScore, Ardour, and KORG Module by being a picture of an
   instrument. Ours and LMMS are the two that centre.
4. **Keep the `B/6` and `B/4` pair rather than copying GarageBand's constant.**
   A constant `(B-gap)/6` on all four outer sharps, which is GarageBand's and
   Ardour's scheme, would take our narrowest white strip from 19.67 px to
   **24.56 px**. The `B/6` and `B/4` pair takes it to **27.00 px**
   (**INFERRED** for the first, **MEASURED** for the second). Both are large
   improvements; the pair is better by 2.4 px and costs exactly the same nothing.

---

## 6 · Sources

- [Musical keyboard, Wikipedia](https://en.wikipedia.org/wiki/Musical_keyboard):
  octave span 164-165 mm, black 13.7 mm, white 23.5 mm, and the sentence about C,
  D, E differing from F, G, A, B.
- [Piano Keys, mathpages](https://www.mathpages.com/home/kmath043.htm): the
  constraint equations, the ladder of solutions from `B/2` to `B/12`, and the
  keyboards each is attributed to.
- [The Size of the Piano Keyboard, quadibloc](http://www.quadibloc.com/other/cnv05.htm):
  quoted only second hand through a search engine, because this machine's network
  blocks the domain. Not relied on for any number here.
- [react-piano](https://github.com/kevinsqi/react-piano), `src/Key.js` and
  `src/styles.css`; demo at
  [kevinsqi.github.io/react-piano](https://kevinsqi.github.io/react-piano/).
- [webaudio-controls](https://github.com/g200kg/webaudio-controls),
  `webaudio-controls.js`, the `webaudio-keyboard` element.
- [qwerty-hancock](https://github.com/stuartmemo/qwerty-hancock), `src/keyboard.ts`
  and `src/styles.ts`.
- [musicca.com/piano](https://www.musicca.com/piano) and
  [onlinepianist.com/virtual-piano](https://www.onlinepianist.com/virtual-piano),
  measured in the browser.
- [Apple, design tips, Hit Targets](https://developer.apple.com/design/tips/):
  the 44 x 44 point sentence, verbatim.
- [WCAG 2.2, Understanding SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html):
  24 by 24 CSS pixels, Level AA, and the five exceptions.

Added for §5:

- **Apple's App Store screenshot metadata**, through the public
  `itunes.apple.com/lookup` API, for GarageBand (408709785), KORG Module
  (1048875111), KORG Module Pro (932191687), KORG iM1 (966030326), KORG Gadget 3
  (791077159), Moog Model 15 (1041465860), Minimoog Model D (1339418001),
  Animoog Z (1586841361), Ableton Note (1633243177), Seaboard 5D (1173937855)
  and AUM (1055636344). The images themselves came from Apple's screenshot CDN,
  one load each.
- [GarageBand for iPhone User Guide, Play the Keyboard](https://support.apple.com/guide/garageband-iphone/play-the-keyboard-chs39282dbe/ios):
  the Octave Down and Octave Up buttons, the Glissando / Scroll / Pitch modes,
  Sustain, the Arpeggiator, and the Scale button's note bars.
- [MuseScore 4](https://github.com/musescore/MuseScore),
  `src/notationscene/qml/MuseScore/NotationScene/pianokeyboard/pianokeyboardview.cpp`.
- [Ardour](https://github.com/Ardour/ardour), `gtk2_ardour/pianokeyboard.cc`.
- [LMMS](https://github.com/LMMS/lmms), `src/gui/instrument/PianoView.cpp` and
  `include/PianoView.h`.

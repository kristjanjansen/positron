# Video art techniques worth stealing next, for /videoradio/

2026-09-15. Research only. No code was changed for this document.

`/videoradio/` draws a live radio station going through a granular synthesiser in
WebGL2. Every claim below is tagged **READ** with a source, or **INFERRED**,
which means it is my reasoning about how a technique maps onto this page and
nobody has measured it.

## What the page already does, so nothing here re-describes it

Read out of `demo/videoradio/index.html`:

- an accumulate pass with a flow field of two crossed sine waves, screen-blended
  rather than added, decaying on a time constant
- a colour ramp, low saturation, cold blue through green-blue to warm near-white
- a Rutt-Etra style scan landscape: 64 horizontal rows placed at 64 depths,
  displaced by signal, projected by 1/z, travelling toward the viewer
- three video feedback taps at three zooms and three rotations, weighted by low,
  mid and high band energy
- a bright pass and a separable gaussian bloom at quarter resolution
- horizontal scanlines at a fixed pixel period, plus a slow roll
- glitch as horizontal band slip, gated on `jolt`, which is zero unless the
  sound or the station just changed

So Rutt-Etra, the Vasulkas and Paik feedback are applied. They are not in the
recommendations. Where a recommendation touches the same lineage it says what is
different about it.

## The brief, verbatim, because it rules out about half of this field

> *"do not go to neon, does not have to be sock synthwave. more like dreamy,
> floaty...some motion blur perhaps"*
> *"flowing multilayered fulcuating experience"*
> *"go 90deg for hoziz vintage scanlines feel"*

Two things follow. High-contrast black and white data aesthetics are out. Fast
reaction is out: a picture that tracks the audio at frame rate reads as
responsive, not as dreamy, and the page currently sets
`analyser.smoothingTimeConstant = 0` and feeds the raw per-frame band energies
straight into the three feedback weights (line 1029 and lines 668 to 670).

## The data available per frame

From the layout comment at line 255 and the row 3 writer at line 1653.

| where | what |
| --- | --- |
| row 0, x 0..63 | R grain count in bucket, G mean grain length, B voice index x32, A grains refused |
| row 1, x 0..22 | per-parameter value, base, and whether it is being modulated |
| row 2, x 0..63 | R scatter density at this bucket, G inside the read window, 0 where unknowable |
| row 3, x 0..5 | rms, low, mid, high, tone (spectral tilt), flux |
| row 3, x 6..21 | blend, grains got, grains lost, morph, from, to, loop state, loop head, station, since-switch, decay, voices, known, pulse, jolt, drift |

Two facts about this table drive several recommendations. **The accumulator's G
and B channels are unused**: the accumulate pass writes `vec4(vec3(acc), 1.0)`,
so two full channels of a full-size float-ish target are carrying a copy of the
red one. And **`A` on row 0 counts grains the page throws away and nothing draws
them**.

---

# Take first

## 1. Depth becomes time: slit-scan, applied to the landscape that already exists

**What it is.** Slit-scan exposes the frame through a moving slit, so each
column or row of the finished image is a different instant. **READ**: it comes
from 19th century still photography, using a mask with a slit in front of the
plate that moves during exposure, and Douglas Trumbull built the Star Gate
sequence of *2001: A Space Odyssey* (1968) with it, on a rig where the camera
crept toward a black mask with a four foot slit and one frame took five minutes
to shoot
([RedShark](https://www.redsharknews.com/douglas-trumbull-and-how-slit-scan-changed-sfx),
[Oseman](https://neiloseman.com/slit-scan-and-the-legacy-of-douglas-trumbull/)).
The video-era name for the same idea is **time displacement**, and Golan Levin
keeps the standing catalogue of the artworks
([flong](http://www.flong.com/archive/texts/lists/slit_scan/index.html)).

**What it looks like.** A receding corridor whose walls are made of successive
moments rather than of successive places. Movement in the source turns into
shape in the result: a thing that moved fast leaves a thin streak, a thing that
held still leaves a wide band.

**How it maps.** The scan landscape loop already samples `texture(uSrc, vec2(fx,
t))` where `t` is depth. Right now all 64 rows read the **same** field, so depth
is purely spatial and the landscape is one instant seen in perspective. Keep a
ring buffer of the field, 64 entries deep, one written per frame, and let row `i`
read the field from `i` frames ago. Depth then **is** time: the horizon is a
second ago, the near rows are now, and the landscape receding toward the horizon
is literally the past receding. **INFERRED**, and it is the single largest change
in the list because it changes what the existing picture means rather than
adding a fourth effect on top of it.

**Cost.** A 2D texture array or one atlas texture of 64 slices at field
resolution, plus one copy per frame. No new pass over the output. The loop body
changes by one line.

**Why it fits the brief.** It is the strongest possible reading of *"go 90deg for
hoziz vintage scanlines feel"*: each horizontal line becomes a separate moment,
which is what a scanline physically is on a CRT and what slit-scan is as a
technique. And it floats, because the material drifts backward in depth at
exactly the rate the frames arrive.

**The risk, named.** The page's checks grade where a grain landed against the
flat field, and the flat pass stays flat, so those are unaffected. The visual
risk is that 64 frames at 60 Hz is only about one second of history, which may
be too short to read. A stride (every third frame, giving three seconds) is the
knob.

## 2. Age as colour: the Sandin differentiator and P7 phosphor, in the two dead channels

**What it is, part one.** **READ**: between 1971 and 1973 Dan Sandin built the
**Sandin Image Processor**, a patch-programmable analogue computer for real-time
manipulation of video, modelled on the Moog and often called the video
equivalent of it. Its **differentiator** module generates an output from the
*rate of change* of the input, and it has **six inputs with progressively larger
time constants** responding to the edge rates of the source. Sandin and Phil
Morton published the full schematics as *Distribution Religion* so anyone could
build one, under Morton's COPY-IT-RIGHT anti-copyright ethic
([EVL](https://www.evl.uic.edu/research/1934),
[Video History Project](https://www.videohistoryproject.org/sandin-image-processor-excerpts-description-analog-ip-modules-pioneers-electronic-art)).

**What it is, part two.** **READ**: **P7 is a cascade phosphor with two layers**.
The beam strikes the outer layer, which flashes bright blue-white, and that light
excites an inner layer which emits yellow-green with a persistence of around a
minute. It was standard in early oscilloscopes and in radar
([TubeTime](https://tubetime.us/index.php/2015/10/31/crt-phosphor-video/),
[Oscilloclock](https://oscilloclock.com/archives/tag/phosphor)). So on real
long-persistence hardware **a trail changes hue as it ages**, from blue-white at
the strike to yellow-green in the tail.

**How it maps.** The accumulate pass currently keeps one trail at one decay rate
and writes it into all three channels. Keep **three** trails at three decay rates
in R, G and B of the same target, at no extra memory and no extra pass. Then:

- `R - G` is a temporal band-pass, which is Sandin's differentiator. It is
  bright where something *changed* recently and zero where a mark has been
  sitting still. That gives motion its own channel, which the page currently has
  no way to draw.
- `B / R` is the **age** of the material under this pixel. Feed that into a P7
  ramp: blue-white where grains landed this instant, cooling through to a soft
  yellow-green in the oldest tail.

**INFERRED**, and this is the recommendation with the best ratio of feel change
to lines written, because the storage is already allocated and being wasted.

**Why it fits the brief.** It is dreamy rather than neon: the P7 pair is
blue-white and yellow-green at low saturation, which is the opposite of a
synthwave magenta-cyan. It also fixes something specific. The out pass currently
loses a flat warm-first multiply per lap, `back *= vec3(0.957, 0.971, 0.987)`,
and the comment beside it says the eye reads cooler as further away. A phosphor
decay does the same job with a physical basis and a wider colour excursion.

## 3. Feedback that varies across the frame: MilkDrop's warp mesh

**What it is.** **READ**: **MilkDrop**, by Ryan Geiss, released 2001-11-05, is a
music visualiser built as a feedback loop with a decay pass, a warp and waveform
overlays, where the warp is parametric and scriptable. Its per-pixel equations
run over a coarse screen-space **warp mesh**, 32x24 by default, and the values
are interpolated between the four surrounding grid points
([Wikipedia](https://en.wikipedia.org/wiki/MilkDrop),
[geisswerks](https://www.geisswerks.com/milkdrop/milkdrop.html)).

**What it looks like.** Not a tunnel. A fluid. Because zoom and rotation are
functions of position rather than constants, different regions of the image flow
different ways at once, and the picture develops eddies, shear lines and folds
that a whole-frame transform can never produce.

**How it maps.** `fbTap` takes a scalar `zoom` and a scalar `ang` and applies one
affine transform to the whole frame. Make both functions of `uv`: for example
scale the zoom by the field density under that point, so a region with grains in
it pulls harder than an empty one, and let the rotation follow the same crossed
wave field the accumulate pass already computes for advection. The page then has
one flow field used in two places at two scales, which is a stronger design than
two unrelated motions. **INFERRED.**

**Cost.** No mesh needed. WebGL2 evaluates it per fragment, which is what
MilkDrop wanted and could not afford in 2001.

**The risk, named.** Three taps each with a spatially varying transform is three
independent fluids, and the page's own comment already warns that a busy passage
turns to soup. Vary the wide low-band tap most and the tight high-band tap least.

---

# Worth taking, in order

## 4. Two opposite rules about cycles: Wilfred against Whitney, plus Eno's clock

This is the cheapest structural change on the page and it is the one that makes
it dreamy over minutes rather than over seconds.

**Wilfred.** **READ**: Thomas Wilfred built the Clavilux and composed *lumia*,
silent moving light works, from 1919 onward. The cycle lengths are the point.
**Untitled, Opus 161** (1965) has a cycle of **1 year, 315 days and 12 hours**,
and **Lumia Suite, Opus 158**, commissioned by MoMA in 1963, has a cycle of
about **9 years, 127 days and 18 hours**; it hung at MoMA in near-continuous
view for 16 years after Wilfred died in 1968
([Getty](https://www.getty.edu/publications/keepitmoving/case-studies/4-snow/),
[Yale](https://artgallery.yale.edu/exhibitions/exhibition/lumia-thomas-wilfred-and-art-light)).
The mechanism is simple: form, colour and motion run on separate wheels whose
periods share no common factor, so the combination effectively never repeats.
The images have no hard edges at all.

**Whitney.** **READ**: John Whitney's *differential dynamics* is the opposite
claim. Objects moving at different rates make pattern, and **resolution into
order happens at points of resonance, specifically at whole number ratios**,
which is the thesis of *Digital Harmony* (1980) and what *Permutations* (1968)
and *Arabesque* (1975) demonstrate
([archive.org full text](https://archive.org/stream/DigitalHarmony_201611/Digital%20Harmony_djvu.txt),
[AWN on Whitney](https://www.awn.com/mag/issue2.5/2.5pages/2.5moritzwhitney.html)).

**Eno.** *Thursday Afternoon* (1984) and *77 Million Paintings* (2006) run the
same incommensurable-cycle trick at a speed chosen so you never catch a
transition happening.

**How it maps.** Three separate changes.

- The out pass derives almost everything that moves from **one** sawtooth,
  `drift`, at 0.06 Hz, plus `pulse`. That is why it will read as looping. Replace
  `drift` with a bank of five or six slow oscillators at irrational period ratios
  and give each consumer its own, so the glitch band phase, the landscape travel,
  the feedback rotation, the roll and the ramp lean never line up twice. That is
  Wilfred, and it is roughly ten lines in the uploader where `driftPhase` is
  computed. **INFERRED.**
- The landscape rows currently advance in lockstep,
  `fract((i + 0.5) / ROWS + drift)`. Give row `i` a rate of `1 + i * k` with `k`
  **rational** and the rows shear apart and periodically snap back into one
  figure. That is Whitney, and it is the thing that stops "never repeats" from
  becoming "never arrives anywhere". **INFERRED.**
- `wl`, `wm`, `wh` are raw per-frame band energies from an analyser with
  `smoothingTimeConstant = 0`. That is a reactive picture, not a floaty one.
  Smooth the three weights on time constants of a few seconds and let `flux` and
  `jolt` stay fast, so the page keeps its event response and loses its twitch.
  **INFERRED**, and of everything here it is the change most directly aimed at
  the word *dreamy*.

## 5. Domain warping, out of the demoscene and Shadertoy

**What it is.** Warp the sampling coordinate by a function of itself, then warp
*that* by another one. Two levels of it produce the billowing, curdling cloud
motion that a single sine field cannot. It is the standing idiom of the 4k intro
and Shadertoy lineage that runs from Future Crew's *Second Reality* (1993)
through Iñigo Quilez's distance-field work and *Elevated* (2009) to Shadertoy
(2013). **READ** for the works and dates as commonly documented; **INFERRED**
that it is the right tool here.

**How it maps.** The accumulate pass builds `flow` from two crossed sine waves
and the comment correctly says a wave has a direction a viewer can follow while
noise reads as boiling. Domain warping is the third option: the direction stays
legible because the base is still a wave, and the shape stops being regular
because its argument is being bent. Concretely, evaluate the existing crossed
waves once to get an offset, add that offset to `uv`, evaluate them again with a
different phase, and use the result. One extra sin and cos pair.

**Why it fits the brief.** *"flowing multilayered fulcuating"* is a description
of domain warping.

## 6. The beam-speed brightness law, from oscilloscope art

**What it is.** **READ**: Ben Laposky made *Oscillons* on an oscilloscope from
1950 to 1952, and Mary Ellen Bute used one for *Abstronic* (1952); the
contemporary version is Jerobeam Fenderson's XY-mode oscilloscope music. The
physical law that gives the look: the beam deposits energy per unit time, so
**brightness is inversely proportional to how fast the spot is travelling**.
Slow parts of the path glow, fast parts almost vanish, and the bright places are
the turning points.

**How it maps.** The 64 buckets carry a y-position each. Read them as a
**continuous path** rather than as 64 independent marks, draw the path, and light
each segment by `1 / length(delta)`. The result is that steady passages burn in
bright and fast scattering goes faint, which is the exact inverse of the current
accumulate pass, where a busy passage is the bright one. Run it as a low-weight
layer under the landscape rather than instead of it. **INFERRED.**

**Pairs with.** Recommendation 2. Phosphor persistence and the beam-speed law are
the same instrument.

## 7. Datamoshing, but honestly: stale advection on the jolt

**What it is.** **READ**: a P-frame carries motion vectors plus a residual, and
the vectors describe where 16x16 macroblocks moved. Deleting keyframes leaves the
motion applied to the wrong picture, so the old frame smears along the new
frame's movement. Takeshi Murata's *Monster Movie* (2005), sourced from the 1981
film *Caveman*, is the work that carried the technique into the art world and is
in the Smithsonian American Art Museum collection; Sven König's *aPpRoPiRaTe!*
(2005) is the other origin point
([SFMOMA](https://www.sfmoma.org/read/takeshi-murata-monster-movie/),
[SAAM](https://americanart.si.edu/artwork/monster-movie-86385),
[beyond resolution](https://beyondresolution.info/Datamoshing)).

**Honest verdict.** The real technique is unavailable. There is no video codec in
this pipeline and no P-frames to corrupt. Anything called datamoshing here would
be a costume.

**What is worth taking anyway.** The *mechanism*, which is motion applied to a
picture that is no longer the right one. The page already has both halves: a flow
field, and a `jolt` value that is zero except when the sound or the station
changes. On a jolt, **freeze the field and keep advecting the previous output by
the last known flow**, at a quantised block resolution. The picture then smears
along movement that has stopped existing, which is what datamoshing looks like,
and it does it for the same reason. **INFERRED.**

**Why it may be better than what is there.** The current glitch is a hard
horizontal band slip. A smear is closer to *dreamy* than a tear is, and it uses
the same gate.

## 8. Belson's radial composition, for what the frame is shaped like

**What it is.** **READ**: Jordan Belson was Visual Director of the Vortex
Concerts at San Francisco's Morrison Planetarium from 1957 to 1959, and made
*Allures* (1961) and *Samadhi* (1967). His rig was deliberately rudimentary: a
plywood frame around an old X-ray stand with **rotating tables, variable speed
motors and variable intensity lights**, manipulated live rather than animated
frame by frame. He described *Allures* as creating a feeling of moving into the
void
([Center for Visual Music](https://www.centerforvisualmusic.org/BelsonFilmNotes.html),
[C3A](https://www.c3a.es/documents/51713/84660/Hoja+Sala+(eng)+JORDAN+BELSON/faab15d1-07f5-4735-a6f3-5bb8ba0c3ccb)).

**What it looks like.** Centred, radial, nebular. Soft luminous forms that
breathe in and out along the radius, no hard edge anywhere, and the composition
organised around a point rather than around a horizon.

**How it maps.** The page is currently organised on a **horizon**, which the
landscape needs, and on a **tunnel centre**, which the feedback creates, and the
two do not agree with each other: the vanishing point of the landscape sits at
`HOR = 0.30` while the feedback zooms about `0.5, 0.5`. Putting the feedback
centre on the landscape's vanishing point costs one line and would make the two
motions read as one space. **INFERRED**, and it is the smallest item in this
document with a visible payoff.

## 9. Semiconductor: draw the grains you are throwing away

**What it is.** **READ**: Semiconductor is Ruth Jarman and Joe Gerhardt.
*Brilliant Noise* (2006) was made from hundreds of thousands of files out of open
solar astronomy archives, and it keeps the energetic particles and solar wind
visible as a rain of white noise instead of cleaning them off. *20 Hz* (2011)
observes a geomagnetic storm from CARISMA radio array data
([semiconductorfilms](https://semiconductorfilms.com/art/brilliant-noise/),
[WRO](https://wrocenter.pl/en/20hz/)).

**The method worth stealing.** Do not clean the data. The artefact is the
evidence that the instrument is real.

**How it maps.** Row 0 channel A counts **grains refused because the count
channel saturated**, and row 3 x 8 counts grains lost since the last upload. The
page measures both and draws neither. Scatter the refusals into the field as
noise, at the bucket they were refused in. The picture then shows the moments
when the instrument was running past what the display can carry, which is
information no readout cell currently conveys. **INFERRED.**

**Caveat.** Noise is the one thing that fights *dreamy* hardest. Keep it very
low, and do not let it survive the trail.

---

# Which ones do not suit, and why

**Ryoji Ikeda.** **READ**: *test pattern* (2008) is a system converting any data
into barcode and binary patterns, driven as 16 channels of sound mapped onto a
grid, running at **some hundreds of frames per second at points**, explicitly to
test the limit of the device and the threshold of perception
([ryojiikeda.com](https://www.ryojiikeda.com/project/testpattern/),
[Forma](https://forma.org.uk/projects/test-pattern)). That is pure black and
white, maximum contrast, maximum rate. It is the exact opposite of every word in
the brief. There is one transferable idea, which is Ikeda's discipline about
scale contrast, tiny precise marks against a vast field. Take that and leave the
strobe.

**Scanimate's look, as opposed to its control model.** **READ**: Lee Harrison III
built ANIMAC in 1962 and, at Computer Image Corporation in Denver, the Scanimate
from around 1969 into the mid 1980s; eight systems were built and they produced a
large share of the video animation on television through the 1970s
([Wikipedia](https://en.wikipedia.org/wiki/Scanimate),
[History of Information](https://www.historyofinformation.com/detail.php?entryid=4469)).
The signature Scanimate image is a glowing, hard-outlined, colour-cycling,
stretching television logo. That is exactly the *sock synthwave* register the
user refused. **The control model is a different matter and is worth taking**: a
Scanimate has no keyframes, only rates, and every parameter is driven by an
oscillator you patch. That is the same idea as recommendation 4 and is already
covered there.

**Steina's Machine Vision, as a moving camera.** **READ**: Steina began the
Machine Vision research in 1975, and *Allvision* (1976) put two live
closed-circuit cameras on a mechanical structure rotating them around a spherical
mirror, deliberately removing point of view from human intention
([Fondation Langlois](https://www.fondation-langlois.org/html/e/page.php?NumPage=423)).
Moving this page's virtual camera on a mechanical path would be the obvious
translation, and I think it would fail: the file's own comment already records
that a constant rotation reads as a screensaver, and a camera path that is not
driven by the sound is one more thing moving for no reason. The transferable part
of Steina's idea is stricter than "move the camera": the machine's motion has to
be legible **as machine motion**, periodic and mechanical rather than smoothly
random, so a viewer can tell it apart from the material. If the camera ever does
move here, it should be on the grain clock.

**Real datamoshing.** Covered under recommendation 7. No codec, no P-frames, no
authentic version available. Only the mechanism transfers.

**Rutt-Etra, Paik, the Vasulkas' raster work.** Already applied, and applied for
the right stated reason: the material genuinely is a raster of a signal.

**Straight raymarched signed distance fields.** The demoscene's other great
export does not fit. An SDF scene is a geometry you author and then light; this
page's subject is 64 buckets of measured data with no geometry in it, and giving
it a marched geometry would mean inventing a world for the data to decorate.
Domain warping, recommendation 5, is the part of that lineage that applies here,
because it is about warping a field rather than about defining a solid.

---

# If only three things get built

1. **Depth becomes time** in the existing scan landscape. Slit-scan, Trumbull,
   1968. Largest change in the document per line written, and it reinterprets a
   feature the page already has rather than adding a fourth effect.
2. **Three decay rates in the accumulator's dead G and B channels**, differenced
   for motion and read as age for colour. Sandin's differentiator, 1973, plus P7
   phosphor. Free storage, and it replaces the flat feedback tint with something
   that has a physical basis.
3. **Spatially varying feedback.** MilkDrop, 2001. Turns one tunnel into a fluid.

And the cheapest item that most directly answers the brief, which is not in that
three because it is a control change rather than a picture change: **smooth the
three band weights and split the single `drift` sawtooth into a bank of
incommensurable oscillators** (recommendation 4).

## Sources

- [Getty, conserving Wilfred's Lumia Suite Opus 158](https://www.getty.edu/publications/keepitmoving/case-studies/4-snow/)
- [Yale University Art Gallery, Lumia: Thomas Wilfred and the Art of Light](https://artgallery.yale.edu/exhibitions/exhibition/lumia-thomas-wilfred-and-art-light)
- [Wikipedia, Scanimate](https://en.wikipedia.org/wiki/Scanimate)
- [History of Information, Lee Harrison's Scanimate](https://www.historyofinformation.com/detail.php?entryid=4469)
- [EVL, Sandin Image Processor](https://www.evl.uic.edu/research/1934)
- [Video History Project, Sandin IP analog module descriptions](https://www.videohistoryproject.org/sandin-image-processor-excerpts-description-analog-ip-modules-pioneers-electronic-art)
- [John Whitney, Digital Harmony, full text](https://archive.org/stream/DigitalHarmony_201611/Digital%20Harmony_djvu.txt)
- [AWN, Digital Harmony: The Life of John Whitney](https://www.awn.com/mag/issue2.5/2.5pages/2.5moritzwhitney.html)
- [Semiconductor, Brilliant Noise](https://semiconductorfilms.com/art/brilliant-noise/)
- [WRO Art Center, Semiconductor 20 Hz](https://wrocenter.pl/en/20hz/)
- [Center for Visual Music, Jordan Belson film notes](https://www.centerforvisualmusic.org/BelsonFilmNotes.html)
- [C3A, Jordan Belson: Allures + Samadhi](https://www.c3a.es/documents/51713/84660/Hoja+Sala+(eng)+JORDAN+BELSON/faab15d1-07f5-4735-a6f3-5bb8ba0c3ccb)
- [Wikipedia, MilkDrop](https://en.wikipedia.org/wiki/MilkDrop)
- [Geisswerks, MilkDrop](https://www.geisswerks.com/milkdrop/milkdrop.html)
- [TubeTime, CRT phosphor video](https://tubetime.us/index.php/2015/10/31/crt-phosphor-video/)
- [Oscilloclock, phosphor archives](https://oscilloclock.com/archives/tag/phosphor)
- [SFMOMA, Takeshi Murata Monster Movie](https://www.sfmoma.org/read/takeshi-murata-monster-movie/)
- [Smithsonian American Art Museum, Monster Movie](https://americanart.si.edu/artwork/monster-movie-86385)
- [Beyond Resolution, Datamoshing](https://beyondresolution.info/Datamoshing)
- [RedShark, Douglas Trumbull and how slit-scan changed SFX](https://www.redsharknews.com/douglas-trumbull-and-how-slit-scan-changed-sfx)
- [Neil Oseman, Slit-scan and the legacy of Douglas Trumbull](https://neiloseman.com/slit-scan-and-the-legacy-of-douglas-trumbull/)
- [Golan Levin, An Informal Catalogue of Slit-Scan Video Artworks](http://www.flong.com/archive/texts/lists/slit_scan/index.html)
- [Fondation Daniel Langlois, Steina: Machine Vision](https://www.fondation-langlois.org/html/e/page.php?NumPage=423)
- [ryojiikeda.com, test pattern](https://www.ryojiikeda.com/project/testpattern/)
- [Forma, Ryoji Ikeda test pattern](https://forma.org.uk/projects/test-pattern)

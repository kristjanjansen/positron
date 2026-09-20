# plan-held-in-human-2d, the piece as a picture on a flat screen

Written 2026-09-20, in answer to one line from Kristjan: *"In bg plan and
implement basic held visualization in 2d. We have typing info, hue,
ligtness…"*

Read `plan-held-in-human-score.md` for what the score SAYS and
`plan-held-in-human-3d.md` for what a headset could DO with it. This is the
third question and it has a different answer from both: **what can a flat
screen show, and what does showing it flat quietly change?**

Every claim is one of three things and is labelled: **READ** (a file says it
and I am quoting), **MEASURED** (I computed it from
`demo/resources/held-in-human.json` or from pixels this page drew), or
**INFERRED**.

🔴 **The piece is Liis Vares and Taavet Jansen's.** Nothing here is a
reproduction of it and nothing here may be shown as one. The page this plan
describes is a reading, and it says so on its own face.

---

## 🔴 What shipped is not what §1 and §5 recommend, and the document is kept anyway

Amended 2026-09-20, the same day it was written, twice over. **Read this before
§1 and §5, both of which describe a page that no longer exists.**

1. **There is no `/veil/`.** Asked for as *"rm veil demo and integrate it into
   held begore timeljne"*, so the picture is a 16:9 video panel above `/held/`'s
   own line, on one deck, with the line still the page's only position surface.
   §5's three reasons for a separate page were answered rather than overruled:
   its readout became no readout at all, its scene picker became the line, and
   its transport became `/held/`'s.
2. 🔴 **Only ONE arithmetic is drawn, and it is `three gains`.** §1 recommends
   drawing the same instant twice, side by side, so the reader can SEE what a
   web page in a headset cannot do. That was built and then cut, on the reader's
   verdict rather than on a measurement: *"I do not het 2scrrrns just go single
   16;9 videopanel"*, then *"Single videopanel. I sid not get two panels
   reasoning. Keep ot simple."* **The comparison had to be taught before it
   could be looked at, and a reader not getting it is the verdict on the idea.**
3. **The argument in §1 is still true and is kept here in full, which is what a
   plan is for.** What survives on the page is one log line and the comment over
   `TABLES` in `demo/held/index.html`. ⚠️ The wording is load bearing wherever it
   appears: it is *a web page in a headset*, never *a headset*, because Held in
   Human is a Unity application and really does put a colour table on the camera
   image.
4. **§2's eleven grey steps were required by the two-picture argument and are
   not required by one.** A gain and a lift are indistinguishable on one flat
   tone, so telling them apart needed a range; with nothing to tell apart, the
   count is only a question of how the band reads. The page draws nine and
   nothing depends on the number.
5. **§6's sabotage list changes with it.** Checks 3 and 4 there compared the two
   pictures and are gone. What now carries the page's main claim is *a colour
   table is three gains, so under green the channels come apart and black stays
   black*, with *under neutral the room keeps its own greys* as its negative
   control, and both go red when `neutral` is made something other than the
   identity.

---

## 0. One line

Two of the three things the ask names are the score's two channels and the
third is its intro, so the picture is those three and nothing else: **a room
dimmed and coloured on the score's own clock, with 318 keystrokes typing
themselves over it.** The one thing worth building beyond that is the
disclosure, and the disclosure is best made by drawing it rather than writing
it.

---

## 1. The honesty problem, which decides the whole design

`plan-held-in-human-3d.md` §1.2 settles the arithmetic. In an `alpha-blend`
session the visitor sees

```
out = c * a  +  room * (1 - a)
```

so the room reaches the eye multiplied by `(1 - a)`, **one scalar shared by
red, green and blue**. A colour lookup table is at minimum three independent
transfer functions. So the channel the piece is built out of is the one channel
a WEB PAGE in a headset cannot have.

⚠️ **The limit is the web page and not the headset, and getting that wrong
would move a limit of the platform onto the work.** Held in Human is a Unity
application and really does put a colour table on the camera image. So this
document and the page both say `a web page in a headset` and never `a
headset`.

🔴 **On a flat screen both channels are free, and that is the trap.** A canvas
can give the three colours three different gains as easily as it can dim them,
so a 2D picture of this piece will show the colour channel working perfectly
and will be, by exactly that, a picture of something the piece's own medium
could not do. A page that draws it and says nothing has misled its reader about
the only interesting limit in the material.

**Three ways to answer that, and only one of them is any good.**

1. **Write a sentence under the picture.** Cheapest, and the weakest: a
   paragraph saying a picture is wrong is read once and then the picture is
   believed for the rest of the visit.
2. **Refuse the colour channel** and draw only the dimming, on the grounds that
   dimming is the reachable half. That is honest and it throws away half the
   score and the half the ask named first.
3. 🔴 **Draw the same instant twice, by the two arithmetics, side by side.**
   The left picture applies the colour table as what a table is, three gains.
   The right picture applies the only operation a web page in a headset has,
   one alpha plus a colour laid over. The difference is then a thing a reader
   can look at rather than a claim they have to take, and it is measurable,
   which means it can be asserted.

**Take 3.** It costs one more pane and it converts the plan's best measured
finding into the page's subject.

---

## 2. What the room is made of, and why it is a wedge

The picture needs something to dim and colour, and there is no honest picture
of the gallery: the room is Mari Möldre's, `maze.json` is not in the score, and
a drawn stand-in that looked like a room would be inventing a room design the
file credits to somebody else.

🔴 **The stand-in is a grey step wedge, and that is required by the argument
rather than chosen for looks.** A gain and a lift are indistinguishable on a
flat field. Multiply a flat 0.45 grey by 0.6 and add nothing; or multiply it by
0.15 and add 0.27; both land on the same pixel, and a reader looking at one
tone cannot tell which happened. **It takes a RANGE of tones to tell them
apart**, because a gain holds black at black while a lift pushes black up. So
the room stand-in is eleven grey steps from black to white, and the difference
the page exists to show lives in the darkest two of them.

MEASURED, on the cylinder, where the score asks for the room at 0.15 with the
green table:

| | darkest step | brightest step |
|---|---|---|
| three gains | near black in all three channels | dark green |
| one alpha plus a wash | **green pinned high everywhere** | green |

That is `plan-held-in-human-3d.md` §1.3 turned into two rectangles.

⚠️ **The flat band above the wedge is for the text**, because white type on a
step wedge is unreadable at the bright end, and the type is the third of the
three things the ask named.

---

## 3. The four table names are ours and the score defines none of them

READ, `demo/resources/held-in-human.json`: `channels.lut.values` is
`["blue", "green", "neutral", "red"]` and every point carries a NAME. There is
no table, no curve, no coefficient, and no image anywhere in the file. So four
words are all the score gives, and any three numbers this page multiplies by
are its own invention.

Two consequences the page has to carry:

- **The gains are declared in one place, named as a reading**, and the page
  asserts that the score carries no definition to disagree with. An assert that
  reads the absence is worth more than a sentence claiming it.
- 🔴 **`neutral` is the identity, and that is a reading too.** In colour work a
  neutral table is usually the one that changes nothing, which is why the page
  takes it that way, and a scene under it shows the room's own tones with only
  the dimming on them. If the piece's neutral is a look rather than a bypass,
  every neutral scene here is wrong and nothing in the file would say so.

---

## 4. What is on screen, and what is refused

The score is explicit about two text surfaces and silent about the rest, and
the page draws exactly the two.

| when | what is drawn | why |
|---|---|---|
| intro, 0 to 142.3 s | the typed text so far, from the 318 keystroke events, with the caret | READ, the track is in the file with per event delays |
| outro, +30.0 s to the end | the outro paragraph with the author's own line breaks | READ, `outro:outro-text` at 30.0 s |
| everything else | the room alone | the spoken lines are a VOICE, and captioning them would invent a text surface the score does not have |

🔴 **The river is drawn as nothing and that is the point.** Fifteen fragments,
one to seventy-nine words, 120 seconds, and no timing in the block at all. It
is ambiguity `river-pacing` and it is `settled: false`, so pacing them to fill
the scene would be this page deciding the one thing the score refuses to.

🔴 **The maze has no width, at any zoom, ever.** `durationHow: 'absent'`,
`durationMs: null`. The axis is `piece.knownMs`, 775177 ms, which is the
running order with the maze taken out, and it is read from the file rather than
summed here. `/held/` draws the maze as a hatched column whose width is in
PIXELS; this page has no axis to put a column on, so it does the other honest
thing and does not place it at all, with one line in the log saying so.

⚠️ **The text is not graded, in either pane.** The score sets
`text color 1.0,1.0,1.0`, one white for the whole piece, and the colour table
is on the camera image rather than on the page's own drawing. So both channels
act on the room and the type stays white on top of it, which is what a page in
a headset would also do and is the one place the two panes must agree.

---

## 5. Where it goes, and what it is called

**A new page, not a second surface on `/held/`.** Three reasons, in order of
weight:

1. They answer different questions. `/held/` is the score's STRUCTURE on a
   line, with the maze as a break and nine refusals placed on it. This is what
   one visit LOOKS like. A reader wanting one is not wanting the other.
2. `/held/` was instructed on 2026-09-19 into `readout: null` and
   `controls: []`, with its facts moved onto the line itself. This page needs
   both a readout and a control, so putting it there would be undoing an
   instruction to make room for an addition.
3. One position surface per page. `/held/`'s strip is its position surface, and
   a picture with its own transport bar beside it would be a second, which the
   standing rule refuses and which would need `publish: false` to keep the
   harness pointed at the right one.

**The slug is `veil`**, which `plan-held-in-human-score.md` §6.4 proposed for a
headset page that `plan-held-in-human-3d.md` §8 then recommended against
building as a demo at all. The word is exactly right for the reachable half of
the score, the collision is with a proposal rather than with a page, and it is
better spent on the page that exists than parked on one nobody is building.
⚠️ Say so where it can be overruled rather than assuming it cannot be.

**Its position in `DEMOS` is directly after `held`**, act 6, because the story
wants the structure before the picture: this page plays on the axis `/held/`
establishes, and the sentence about the maze makes sense second and not first.

---

## 6. What this page can be graded on

The standing failure here is a picture that reports a boundary whatever it is
shown. Every check below reads PIXELS THE PAGE DREW rather than the table they
came from, and they run for a visitor because they draw into an offscreen
canvas and move nothing.

1. **`neutral` leaves the room's own tones alone**, so a neutral scene is the
   wedge dimmed and nothing else.
2. **A colour table is three gains.** Under green, the three channels of one
   step come apart.
3. 🔴 **One alpha cannot do it.** At the cylinder, the right pane's darkest step
   is lifted far off black and the left pane's is not. This is the headline and
   it is the finding from `plan-held-in-human-3d.md` §1.3.
4. **The type is the same white in both panes**, which is the negative control
   for 3: a check that simply found the two panes different would pass on any
   difference at all.
5. **The correction is in the picture.** At 39.829 s the drawn text ends with
   `houses`; at 46.355 s it ends with `buildings`, and the hesitation between
   them is longer than the deletion.
6. **The axis is the running order with the maze taken out**, and nothing
   inserts a width at the seam in either direction.
7. **The score names four tables and defines none of them**, read off the file.
8. **A visit reads one file and it is ours.**

**And the sabotage that proves they fire:** make `neutral` something other than
the identity, and give the right pane three gains instead of one alpha. The
first takes 1 red, the second takes the headline red. Both were run.

---

## 7. What this page deliberately does not claim

- **That it looks like the piece.** The room is a wedge, not a gallery.
- **That the four colours are the piece's.** They are three numbers each,
  invented here, against four words in the score.
- **That a web page in a headset could show the left pane.** It could not, and
  the right pane is the page saying so in the only language a picture has. The
  piece's own Unity application can, and does.
- **That the maze has a length**, that the river has a pace, or that the piece
  loops. All three are `settled: false` in the data and all three stay that way
  here.
- **That there is any sound.** 175.9 s of a visit is a recorded voice the score
  carries only as durations, and a silent picture of it is not a quiet version
  of the piece.

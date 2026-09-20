# plan-held-in-human-score, what the Held in Human score says and what we can use

Written 2026-09-19 against `research/held-in-human-score-2026-09-19.txt`, which
Kristjan supplied verbatim that morning.

**Held in Human** is a Unity mixed reality piece by **Liis Vares and Taavet
Jansen**, produced by **elektron.art**, shown 2024. Mixed reality design and
coding Norbert Pape, sound Mihkel Tomberg, graphics Jaan Evart, room Mari
Möldre, photography Alissa Šnaider, producer Anu Almik. The intro and outro
texts are Ene Mihkelson, *"Apartment"*, Tallinn 1985, translated from Estonian
by Miriam Anne McIlfarick-Ksenofontov. The whispers, chat and dialogue are
audience interaction from **Held in Human I**, EKA Gallery, Tallinn 2023,
remixed with ChatGPT. All of that is in the score's own credits block, which is
the only place this document takes it from.

This is not a review of the piece. It is a reading of the file: what each
parameter controls, what the running order works out to, where the arithmetic
does not close, and which of the ideas in it this repo could actually use.

🔴 **THE DATA EXISTS NOW AND IT IS THE THING A PICTURE SHOULD READ, NOT THIS
DOCUMENT AND NOT THE SCORE.** `demo/resources/held-in-human.json` carries
everything below in a form a page can draw from: the running order with a
cumulative clock, the events inside each scene, both passthrough channels as
timed points, the 24 QandA lines with the reading that assigns them, the 318
keystrokes, and the texts quoted verbatim. `node
demo/resources/build-held-in-human.mjs` derives it from the score and writes it;
`--check` prints the running order with cumulative times and writes nothing.
Every duration in it is milliseconds, every scene says whether its length is
`stated`, `measured` or `absent`, and every inference carries a field saying so
rather than only a sentence in here. ⚠️ **Every number in this document was
re-derived from that file on 2026-09-19 and five claims did not survive it.**
They are corrected below and each one says what it used to say, because a wrong
table in a document nobody re-derives is worse than no table.

Every claim below is one of three things and is labelled:

- **STATED**, the score says it in so many words.
- **MEASURED**, I computed it from the file and the script is
  reproducible in a page of JavaScript.
- **INFERRED**, my reasoning from the two. Nothing here was seen running, no
  build was opened, and no Unity project exists on this machine.

🔴 **The piece is somebody else's work.** Its texts are quoted here only where a
number depends on them, and none of them are rewritten. Nothing in section 6
may be built on this material without the authors' word.

---

## 0. One line

One text file is the whole piece: eight scenes, their lengths, where things
stand in the room, what a voice says and when it says nothing, and two
independent channels that fade the real room away and bring it back. The most
transportable idea in it is that the intro is not a string but **a recording of
somebody typing**, with the pauses and one change of mind left in.

---

## 1. What kind of file this is

A flat list of `name` then `value` on the next line, then a handful of blocks
introduced by `scene: <name>`. Comments start with `//` and several of them
carry production decisions rather than explanation, which is why they are
quoted rather than summarised below.

**There are five different micro-formats inside it**, and that matters for
section 6 more than anything else in the file:

| block | format | example |
|---|---|---|
| parameters | name on one line, value on the next | `cylinder radius` / `2.55` |
| `scene: intro text` | a keystroke recording, `<delay ms> <code>;`, ended by `end;` | `456 104;` |
| `scene: maze outer`, `scene: maze inner` | one word a line, optional `;n,n` suffix | `tree;1,2,6,7` |
| `scene: dialogue` | `speaker : text : seconds : pause` | `1: /imagine ... : 8 : 1` |
| `scene: QandA` | `text:seconds:pause`, empty text allowed | `Are you here?:5:0` |
| `scene: river`, `outro`, `credits` | markup text, `<br>` and `<size=18>` | one paragraph a line |

Nothing declares which format a block is in. The reader is expected to know,
and so is whatever loads it.

⚠️ **Two of the record formats are delimited by a character that occurs in the
text they carry.** A dialogue line splits on `:` and a QandA line splits on `:`,
so a question containing a colon cannot be written. None in the file does.

---

## 2. The running order

### 2.1 Where the order comes from

The score never lists the scenes as an order. It lists them **three times as an
order**, and all three agree:

1. the LUT colour block: transition, intro, maze, dialogue, cylinder, river,
   hold me, outro. STATED.
2. the opacity block: the same eight, same sequence. STATED.
3. the LUT transition times, which are in the same sequence with **transition
   moved to the end**. STATED.

That third one is the interesting one. The file's own comment says:

> `// transition time from the LUT of the previous scene to the LUT of the current scene`
> `// recommendation: use 0 if the previous scene has the same LUT`

`LUT transition time transition` is `0.0`. The transition scene is neutral, and
the only other neutral scene that could precede it is the **outro**. So the
file's own recommendation is satisfied only if the scene before the transition
is the outro, which means **the piece loops**: outro back into transition,
transition into intro, next visitor. INFERRED, and it is the reading that makes
the most of the file self-consistent.

The second entry path is for a headset nobody has just taken off:
`time after headset mounted before intro` is `10.0`. INFERRED: a fresh visitor
waits ten seconds and gets the intro with no transition at all.

### 2.2 The transition scene, where the arithmetic does not close

| parameter | value |
|---|---|
| `duration transition scene` | 40.0 s |
| `time until credits in transition scene` | 7.0 s |
| `credits scroll duration` | 35.0 s |
| `time after credits until intro` | 25.0 s |
| `time until QandA Transition scene` | 0.0 s |
| `number of lines QandA during Transition scene` | 0 |

Credits begin at 7.0 and scroll for 35.0, so they finish at **42.0 s, two
seconds after the scene's stated duration of 40.0**. MEASURED, and I cannot
resolve it. Three readings, none of which the file settles:

- the intro begins 25 s after the scroll ends, so 67 s after the transition
  began, and the 40 s governs something else (the room going back to full
  opacity, the objects resetting).
- `time after credits until intro` counts from the credits' **start**, putting
  the intro at 32 s, inside the 40.
- the credits are an overlay with their own clock and the 40 s is the scene.

⚠️ **I am not going to pick one.** The gap between one visitor and the next is
either 40, 42, 32 or 67 seconds depending on which reading is right, and that is
a question for whoever wrote the loader.

The two QandA parameters for this scene both say nothing happens. That is worth
noticing as a fact about the format rather than about the piece: **every scene
must answer every question, so "none" is spelled `0`.**

### 2.3 The run itself

Five scenes carry a duration. **Three do not**, and each of the three ends on
something other than a clock.

| # | scene | length | where the number comes from |
|---|---|---|---|
| 1 | transition | 40.0 s stated, 42.0 s of credits in it | STATED, and see 2.2 |
| 2 | intro | **142.3 s** | MEASURED: the keystroke track's own length, section 5.1 |
| 3 | maze | **not in the score** | the only scene with no length at all |
| 4 | dialogue | **107.9 s** | MEASURED: the 16 lines' times and pauses summed |
| 5 | cylinder | 150.0 s | STATED |
| 6 | river | 120.0 s | STATED |
| 7 | hold me | 165.0 s | STATED |
| 8 | outro | 90.0 s | STATED |

Cumulative, taking t=0 at the intro's first keystroke and treating the maze as
an unknown **M**:

| scene | starts | ends |
|---|---|---|
| intro | 0:00.0 | 2:22.3 |
| maze | 2:22.3 | 2:22.3 + M |
| dialogue | + | +1:47.9 |
| cylinder | + | +2:30.0 |
| river | + | +2:00.0 |
| hold me | + | +2:45.0 |
| outro | + | +1:30.0 |

With M taken out, intro to the end of the outro is **775.2 s, 12 min 55 s**.
MEASURED. Add the maze and the credits loop and the piece is somewhere around a
quarter of an hour. INFERRED, and it is the one headline number in this document
that a stopwatch in the gallery would settle in one visit.

### 2.4 The maze is the one scene that waits for a person

INFERRED, and the evidence is two holes that fit each other:

- the maze is the **only** scene with no duration. STATED by absence.
- `Please walk towards the stairs in front of you.:-1:0` is the **only** line in
  the file with a negative time and the only one that asks the visitor to do
  something. Every other line in that block carries a positive number of
  seconds. STATED.

So `-1` most likely means "hold until it happens" rather than a number of
seconds, and the maze runs until the visitor walks. That is the only place in
the score where the piece stops and waits.

What the maze does have is `time until start outer maze in maze scene` at
**60.0 s**: the inner maze is there from the start, and the outer one begins a
minute in. STATED.

### 2.5 Events inside scenes

| scene | at | what | source |
|---|---|---|---|
| transition | 7.0 | credits begin, scroll 35.0 s | STATED |
| maze | 60.0 | outer maze begins | STATED |
| dialogue | 30.0 | maze sound begins to fade, over 60.0 s, gone at 90.0 | STATED |
| cylinder | 60.0 | ghost trace | STATED |
| cylinder | 90.0 | QandA, 7 lines, **38.0 s**, ends at 128.0 of 150.0 | STATED + MEASURED |
| hold me | 0.0 | QandA, 5 lines, **19.0 s** | STATED + MEASURED |
| hold me | 144.0 | QandA, 11 lines, **106.5 s**, runs past the end of the scene | STATED + MEASURED |
| outro | 30.0 | outro text appears | STATED |

The maze sound fade is a nice check on the dialogue's measured length: it ends
at 90.0 s of a scene that runs 107.9 s, which leaves 17.9 s of the last two
lines with no maze underneath them. If the dialogue were much shorter or much
longer than 107.9 s the fade would not sit inside it.

### 2.6 The QandA block is one cursor, and it crosses a scene boundary

The block holds **24 lines**. The score asks for **0 + 7 + 5 + 11 = 23**. So
exactly one line is spoken by a scene the score gives no count for. MEASURED.

The reading that fits best, **model A**: the cursor starts at line 2, the
cylinder takes lines 2 to 8, hold me takes 9 to 13 and then 14 to 24, and
**line 1 belongs to the maze**. INFERRED, on three pieces of evidence:

1. line 1 is the `-1` line and asks the visitor to walk to the stairs, which
   is not a thing to say inside a cylinder.
2. under model A the last line spoken in the piece is `Yes, Let's go.`. Under
   the alternative it is never spoken at all, and the file lists it.
3. 🔴 **the 46.5 second silence lines up with the outro text to within half a
   second.** Walked against the clock, model A puts `Do you recognise it?`
   ending at outro 29.5 and the outro text appearing at outro 30.0. That is the
   single strongest thing in favour of it, and it is arithmetic rather than
   taste.

The second hold-me block, walked:

| clock | line | length |
|---|---|---|
| hold me 144.0 | How long have we been here, do you think? | 6 + 4 pause |
| hold me 154.0 | Will it end? | 3 + 2.5 |
| hold me 159.5 | Does it matter? | 3 + 2 |
| hold me 164.5 | silence | 20 |
| outro 19.5 | Is the tree still here? | 5 |
| outro 24.5 | silence | 1 |
| outro 25.5 | Do you recognise it? | 4 |
| outro 29.5 | silence | **46.5** |
| outro 76.0 | Well? Shall we go? | 4.5 |
| outro 80.5 | silence | 2 |
| outro 82.5 | Yes, Let's go. | 3 |

Ends at outro 85.5 of 90.0. Three lines fill the last 20.5 s of a hold me scene
with 21.0 s left in it, and the 20 s silence carries the voice across the
boundary into the outro. MEASURED against model A.

⚠️ **This is the one place where the score's structure is genuinely clever and
genuinely fragile.** A voice block that outlives its own scene by 85 seconds
works only because the numbers were tuned against each other. Change the hold me
duration by ten seconds and the outro text no longer lands in its silence.

---

## 3. The parameters

### 3.1 Why a score sets where you stand

```
starting position
0.0,0.0,-2.0

starting orientation
0.0
```

A mixed reality piece is installed in a real room and the visitor is already
standing somewhere when the headset goes on. The score carries the one pair of
numbers that ties the fiction to the floor, which is the only way to guarantee
that the first thing she sees is the intro text rather than the back of it. It
is the same reason a theatre score marks an entrance.

The file explains itself, and the explanation is worth having:

> `// The scene is built around the point (0,0,0)`
> `// Example:`
> `// starting position = (1.0,0.0,-2.0)`
> `// starting rotation = 180.0`
> `// The center of the space will be two meters behind the visitor,`
> `// one meter to her right`

⚠️ **The worked example resolves on one axis and only half resolves on the
other.** Two metres of depth reads straight off the third component. The lateral
clause reads correctly only if "one meter to her right" describes where the
**visitor** stands rather than where the centre is, because a visitor placed at
right = +1 has the centre one metre to her left. INFERRED, and it never bites
the piece, for the reason in 3.3.

### 3.2 The axis comment is not Unity's frame, and that is a good sign

```
// right,up,back
```

Unity's own frame is left-handed with +X right, +Y up and **+Z forward**. A
triple whose third component counts **backwards** is the opposite sign of
Unity's Z, which is the right-handed convention OpenGL uses. So the score is
written in a frame a person can hold in their head and something converts on the
way in. INFERRED from the comment alone, since no loader is visible here.

That is a design decision worth naming rather than a bug: **the file is authored
in the frame of the person standing in the room, not the frame of the engine.**
Whoever wrote the loader paid for that once so that everyone editing the score
does not pay for it every time.

### 3.3 🔴 Every placement in the file has right = 0.0

MEASURED across all six placements. Nothing in this piece is ever placed off the
centre line with a coordinate. Sideways is done entirely with the separate
rotation parameter.

| parameter | right | up | back | rotation |
|---|---|---|---|---|
| starting position | 0.0 | 0.0 | -2.0 | 0.0 |
| intro text | 0.0 | 1.8 | 1.4 | 0.0 |
| dialogue Imagine | 0.0 | 1.7 | 8.0 | 50.0 |
| dialogue Remember | 0.0 | 3.5 | 10.0 | 330.0 |
| holdme anchorpoint | 0.0 | 1.3 | -0.5 | none given |
| inner maze offset | 0.0 | 0.0 | -0.4 | none given |
| river | no placement | | | 0 |
| cylinder | radius 2.55 | | | none given |

So a placement in this score is really **a height, a distance and an angle**.
That is polar, it is how a director describes a position out loud, and it is why
the handedness question in 3.1 never costs the piece anything: the ambiguous
axis is always zero.

What the numbers then say:

- **The two speakers are 80 degrees apart.** Imagine at 50, Remember at 330.
  MEASURED.
- **They are at different heights on purpose.** Imagine sits at 1.7 m and 8 m
  away, which is eye level and on the horizon. Remember sits at 3.5 m and 10 m
  away, about ten degrees above the eye of a visitor 1.7 m tall. MEASURED.
  `/remember` is the one you look up to.
- **The intro text is 3.4 m from where she starts**, at 1.8 m, which is reading
  distance and just above eye level for a wall of text. MEASURED, and it is
  what settles which way orientation 0 faces: the text has to be in front of
  her.
- **The hold me anchor is the only thing below eye level in the piece**, at
  1.3 m and 1.5 m in front of where she began. MEASURED.
- 🔴 **She starts inside the cylinder.** The cylinder radius is 2.55 m and she
  begins 2.0 m from the centre, so the near wall is 0.55 m behind her and the
  far one 4.55 m in front. MEASURED, and true only if she has not walked, which
  by the cylinder scene she certainly has.
- **The river gets an orientation and no placement**, the only element in the
  file like that. STATED.

### 3.4 The inner maze offset

```
//shifts all objects from maze.json by the defined direction
inner maze offset
0.0,0.0,-0.4
```

The geometry lives in `maze.json`, which is not in the score, and this is the
one knob the score has over a file it does not own: move all of it 0.4 m toward
the side the visitor starts on. Worth keeping as a pattern. **When a score has
to sit on top of data somebody else exported, one global offset is usually the
whole interface it needs.**

### 3.5 Text colour

```
// this defines the normalized (0. to 1.) color values (red, green, blue) of all the text in the app
text color
1.0,1.0,1.0
```

White, and **there is exactly one text colour for the whole piece**. No per
scene colour, no per speaker colour, nothing distinguishing `/imagine` from
`/remember` by ink. All of the colour work in this piece happens to the room,
not to the type, which is section 4.

### 3.6 The two maze word lists

**Outer, 28 entries**, in order: `/imagine`, `remember`, human, brain, trust,
fear, touch, truth, `thought `, silence, home, future, taxes, `ART`, change,
`loop `, pause, storm, power, conversation, notification, texture, voice, river,
face, paper, pixel, darkness.

**Inner, 24 entries**: road, `tree;1,2,6,7`, boots, `bones;1,7`, `r,a,d,i,s,h`,
carrot, `Lucky`, `stone;1,2,4,5,6,7`, hat, god, eyes, feet, hair, `TIME;1,7`,
leaf five times, whisper three times, `/remember`, `/imagine`.

MEASURED details that would matter to whoever loads them:

- `thought ` and `loop ` carry a **trailing space** in the outer list. Nothing
  else does. If the loader compares strings anywhere, those two are different
  from what a reader thinks they are.
- the only exact string in both lists is `/imagine`. The outer list has
  `remember` with no slash, the inner has `/remember` with one.
- `leaf` appears five times and `whisper` three. Repetition is how the score
  asks for several of something, since there is no count field.

### 3.7 The `;n,n` numbers, which are a guess

Four inner entries carry them: `tree;1,2,6,7`, `bones;1,7`,
`stone;1,2,4,5,6,7`, `TIME;1,7`. The numbers used are 1, 2, 4, 5, 6, 7. **3
never appears and neither does 8 or 0.** MEASURED.

⚠️ **The following is a guess and the authors should be asked.** The most likely
reading is that the numbers select **which scenes the object is present in**,
because seven distinct values over an eight scene piece is the coincidence that
is hardest to explain any other way. Under a 1 to 7 numbering that skips the
transition:

| entry | reads as |
|---|---|
| `tree;1,2,6,7` | intro, maze, hold me, outro |
| `bones;1,7` | intro and outro only |
| `TIME;1,7` | intro and outro only |
| `stone;1,2,4,5,6,7` | everything except the dialogue |

That reading has one piece of support beyond the arithmetic: the outro text is
about a tree, and under model A the QandA asks `Is the tree still here?` inside
the outro. So a tree that is present in scene 7 is a tree the question can be
about. INFERRED, weakly.

Two other readings I cannot rule out: the numbers are variant or material
indices, or they are positions in `maze.json`. Nothing in the file says.

And `r,a,d,i,s,h` is the only entry that spells a word out with commas. The
guess is that each letter is placed as its own object. It could equally be a
parser artefact. Ask.

---

## 4. 🔴 The passthrough dramaturgy, which is the best thing in the file

Two channels run the whole piece independently, each with its own per scene
value **and its own per scene transition time**. One is a colour lookup table on
the passthrough image. The other is how much of the real room you can see at
all.

The score's own warning on the master control:

> `// this paramater can be used to dim the environment.`
> `// warning: it reduces the overall contrast, which makes it dull`

`general opacity level` is set to `1.0`, so the master dimmer is off and the per
scene numbers below are the real ones. The scene values are documented as
percentages of it, so setting the master to 0.5 would halve every row in the
table at once. That is a production decision honouring its own warning at the
top level while using the effect hard scene by scene.

### 4.1 The whole shape of the piece in one table

In loop order, with the outro feeding back into the transition:

| scene | length | LUT | LUT fade | opacity | opacity fade | change | rate |
|---|---|---|---|---|---|---|---|
| transition | 40.0 | neutral | 0.0 | **1.00** | 2.0 | +0.40 | +0.200 /s |
| intro | 142.3 | neutral | 0.0 | 0.60 | 4.0 | -0.40 | -0.100 /s |
| maze | unknown | neutral | 0.0 | 0.60 | 3.0 | 0 | 0 |
| dialogue | 107.9 | green | **0.0** | 0.70 | 6.0 | +0.10 | +0.017 /s |
| cylinder | 150.0 | green | **5.0** | **0.15** | 2.0 | **-0.55** | **-0.275 /s** |
| river | 120.0 | blue | 10.0 | 0.30 | 3.0 | +0.15 | +0.050 /s |
| hold me | 165.0 | red | 2.0 | 0.50 | 4.0 | +0.20 | +0.050 /s |
| outro | 90.0 | neutral | 10.0 | 0.60 | 10.0 | +0.10 | +0.010 /s |

Opacity values and fades STATED. Changes and rates MEASURED.

**The arc, read off the opacity column.** The room is whole only in the
transition, which is the moment nobody is being shown anything. It drops to 0.6
for the intro and the maze, comes back a little for the dialogue, collapses for
the cylinder, and then is handed back in three steps of +0.15, +0.20 and +0.10
until it is where it started. **The room is taken away and given back, and it
never returns to full while a visitor is inside the piece.**

### 4.2 The cylinder at 0.15

The fastest change in the piece and the biggest: 0.55 of range in 2.0 seconds,
which is **0.275 a second against 0.200 for the next fastest** and **0.100 for
the fastest move a visitor is inside for**. MEASURED. The 0.200 is the
transition returning the room to full between visitors, when nobody is being
shown anything, so within a visit the cylinder's collapse is nearly three times
faster than anything else and the whole opacity column is under 0.05 a second
apart from it and the intro. ⚠️ **THIS SAID "ten times faster than any other
move" AND NO PAIR OF RATES IN THE TABLE ABOVE IS TEN TO ONE.** The real ratios
are 1.4 to the transition and 2.75 to the intro, which is still the finding: it
is the one move in the piece that is fast enough to be felt as a cut.

For a person standing in a real room, 0.15 means the room is still technically
there and is no longer usable. Edges, the floor line and other people are at
fifteen per cent of their contrast, and it holds for 150 seconds. Ninety seconds
into that a voice starts asking `Have you noticed how the walls don't meet the
ceilings here?`, then `Are you here?`, then `Do you see me?`. **The scene where
the room is almost gone is the scene that asks you whether you are in it.**

⚠️ And this is exactly where the score's own warning bites hardest. Contrast is
the thing that tells a person where the floor is. The file says dimming "makes
it dull" and then dims harder here than anywhere, which reads as deliberate
rather than careless, but it is the one number I would want measured in the real
room at the real time of day before anybody walks in it.

### 4.3 The LUT sequence, and a probable off-by-one

Against the file's own recommendation, "use 0 if the previous scene has the same
LUT":

| into scene | previous LUT | this LUT | fade | follows the recommendation |
|---|---|---|---|---|
| intro | neutral | neutral | 0.0 | yes |
| maze | neutral | neutral | 0.0 | yes |
| dialogue | neutral | **green** | **0.0** | **no** |
| cylinder | green | green | **5.0** | **no** |
| river | green | blue | 10.0 | yes |
| hold me | blue | red | 2.0 | yes |
| outro | red | neutral | 10.0 | yes |
| transition | neutral | neutral | 0.0 | yes, if the outro precedes it |

🔴 **Exactly two rows break the file's own rule, they are adjacent, and swapping
them fixes both.** Dialogue would take the 5.0 s fade into green and the
cylinder would take the 0.0 for green into green.

Two readings and the file does not settle it. Either the list is shifted by one,
or the hard cut into green at the dialogue is deliberate (the colour arrives
with the first spoken line) and the 5.0 on the cylinder is a harmless no-op
between two identical tables. INFERRED. It is one question to the authors and it
is in section 7.

---

## 5. The texts

### 5.1 🔴 The intro is not a string, it is somebody typing

`scene: intro text` opens with `track 1;`, then 318 lines of
`<delay in ms> <character code>;`, then `end;`. **13 is Return and 127 is
Backspace**, everything else is the character typed. Replay it by adding the
delays and applying the codes to a buffer.

Replayed, it types the Mihkelson text the credits name:

```
When the piles for the university library foundations were
being driven in at night, the surrounding buildings would
shake. Hildegard soon got used to the earth quaking. As
readily as if she had been secretly longing for it all the time
and along with the longing for change had achieved an
altered state.
```

| | |
|---|---|
| events | 318 |
| printable keys | 307 |
| Returns | 5 |
| Backspaces | 6 |
| characters left on screen | 306, counting five line breaks and a trailing space |
| total span | **142.277 s** |
| last visible character | 131.376 s |
| shortest gap | 56 ms |
| median gap | **270 ms** |
| mean gap | 447 ms |
| 90th percentile | 845 ms |
| 99th percentile | 3049 ms |
| longest gap | **10901 ms** |
| gaps of 1 s or more | 20 |
| gaps of 2 s or more | 12 |
| rate over the whole span | **25.81 words a minute** |
| rate to the last visible character | **27.95 words a minute** |

All MEASURED, and both rates are at five characters a word counting **the 306
characters left on screen**, not the 307 keys pressed. ⚠️ **THOSE TWO ROWS SAID
25.9 AND 28.0 AND DID NOT SAY WHICH COUNT THEY MEANT.** Six backspaces remove
six presses, so the two counts differ by one and the whole-span rate comes out
25.81 on characters and 25.89 on keys. The difference is a tenth of a word a
minute and it is worth naming rather than arguing about: a figure whose basis is
unstated is a figure the next person recomputes differently and then has to work
out which of you is wrong. `held-in-human.json` carries the same two numbers and
names the basis beside them in `keystrokes.stats.wordsPerMinuteBasis`.

**The correction.** Six backspaces delete **`houses`** and **`buildings`** is
typed in its place, in the second line, so it reads "the surrounding buildings
would shake" rather than "the surrounding houses would shake".

| moment | clock |
|---|---|
| last letter of `houses` | 39.829 s |
| nothing happens for | **2.295 s** |
| six backspaces, 207 to 228 ms apart | 42.124 to 43.214 s |
| nothing happens for | 0.960 s |
| `buildings` begins | 44.174 s |
| whole repair, last wrong letter to last right one | **6.526 s** |

🔴 **The hesitation is longer than the deletion, and it is the same length as an
ordinary sentence-end pause in this track.** That is what makes it read as a
person thinking rather than as a typo. A score that stored the finished string
could not show it, and a score that stored a fake typing animation would put the
pause in the wrong place.

**Where the long pauses fall.** MEASURED, the top eight, and the `at` column is
the clock when the key after the pause lands:

| gap | at | what comes next |
|---|---|---|
| 10901 ms | 131.4 s | one space, then `end;`. The piece holds on a finished sentence |
| 3174 ms | 106.5 s | `a`, starting "and along with the longing" |
| 3071 ms | 34.7 s | a space, after "being driven in at night," |
| 3049 ms | 55.7 s | a space, after "shake." |
| 2669 ms | 23.9 s | `b`, starting "being driven in" |
| 2616 ms | 76.2 s | `A`, starting "As" |
| 2502 ms | 103.3 s | Return, ending the fourth line |
| 2378 ms | 79.8 s | `r`, starting "readily as if she had been" |

Seven of the eight sit at a sentence end or a line break. The one that does not
is the 3071 ms pause, which sits on the comma in "at night,". ⚠️ **The line
above this table used to say every one of them was at a sentence end or a line
break**, and that row was already in it when it did.

⚠️ **THIS TABLE USED TO END ON THE 2295 ms HESITATION BEFORE THE FIRST
BACKSPACE, AND CALL ITSELF THE TOP EIGHT.** That pause is the **tenth** longest
in the track, not the eighth. Two longer ones were missing: the 2378 ms above,
and a 2344 ms pause at 73.5 s on the space after "quaking.", which is the ninth.
Nothing about the hesitation changes and it is still the most interesting pause
in the intro: it is the one that is not punctuation, it is the sound of somebody
deciding, and **the correction table above is where it is described completely**,
from the last letter of `houses` to the last letter of `buildings`. What was
wrong was only the claim that a ranking contained it. A number that is
interesting and a number that is large are different facts and a table headed
"top eight" may only carry the second.

And the six lines, which come out remarkably even:

| line | ends at | took |
|---|---|---|
| When the piles ... foundations were | 21.3 s | 21.3 s |
| being driven ... buildings would | 49.1 s | 27.8 s |
| shake. Hildegard ... quaking. As | 77.5 s | 28.4 s |
| readily as if ... all the time | 103.3 s | 25.9 s |
| and along with ... achieved an | 124.7 s | 21.4 s |
| altered state. | 131.4 s | 6.6 s |

⚠️ **The last event in the track is a space typed 10.9 seconds after the final
full stop.** Whether that is a cue that advances the piece or a stray keypress
left in the recording is not visible in the file. Either way it is the longest
silence in the intro and it sits on a finished sentence.

### 5.2 The dialogue

Sixteen lines, eight for each speaker, strictly alternating, speaker 1 always
opening with `/imagine` and speaker 0 always answering with `/remember`, until
**the last two lines, where both switch to `/whisper`**. Total **107.9 s**.
MEASURED.

**Five** lines carry a pause, and the one long one is placed on purpose:
**6 seconds of silence after `/imagine the art of missing out.`**, which is line
9 of 16. The line ends at 54.9 s and the silence at 60.9 s, of 107.9. The other
four pauses are 1.0, 1.5, 0.5 and 0.5 seconds, on lines 1, 4, 11 and 13.
MEASURED. ⚠️ **THIS SAID FOUR LINES AND "every other pause is 0.5 or 1.5
seconds", AND BOTH HALVES MISSED THE SAME ROW**: the 1.0 second pause on line 1,
which is the first line in the block.

The maze sound from the previous scene is still underneath this one for the
first 30 s, fades for 60 s, and is gone at 90 s, leaving the last two lines,
the two whispers, with nothing behind them.

### 5.3 The river

Fifteen fragments and a 120 second scene, which is 8.0 s each if they were
spread evenly, **and they cannot be**, because they run from one word to
seventy-nine. MEASURED.

| fragment | words | line breaks | `<size=18>` spans |
|---|---|---|---|
| 1 Catch me if you can! | 5 | 0 | 0 |
| 5 help! help! | 2 | 0 | 0 |
| 6 And Milton yes Milton ... | **73** | 8 | 5 |
| 7 houses gone | 2 | 0 | 0 |
| 11 Institutions growing weaker ... | **79** | 12 | 4 |
| 12 Heartstroke | 1 | 0 | 0 |
| 13 Art is for Saturday morning ... | 75 | 11 | 3 |

🔴 **This is the one text block in the score with no timing information at
all.** The dialogue and the QandA both carry seconds per line. The river carries
nothing, and its fragments differ in length by a factor of seventy-nine. Either
something outside the score paces it, or it is paced by hand, or the sound
design carries it. It is the largest single hole in the file as supplied.

What the writing is doing, briefly. It is news language pulled apart and
repeated in place: "tanks tanks Merkava tanks", "down down down", "fix fix fix",
"reasons unknown" returning across unrelated stories. Named events from autumn
2024 sit next to each other with no connective tissue, and "Catch me if you
can!" opens the block and returns at fragment 9 to bracket it. The short
fragments are the ones with no source: "help! help!", "houses gone",
"Heartstroke".

Two format notes, both MEASURED. There are **31 `<size=18>` spans** across the
block, setting an absolute size on individual words. Whether 18 is larger or
smaller than the surrounding text is not visible in the score, so the direction
of the emphasis cannot be read off the file. And **every closing tag is written
`</size=18>`, carrying the value back**, which is not how such a tag is usually
written. Whether the renderer accepts it is also not visible here.

### 5.4 The QandA

Twenty-four lines, `text:seconds:pause`. **Eight of them have no text at all**,
so a third of the block is silence of a stated length, running from 1 second to
46.5. MEASURED.

The voice asks a person in a room questions, most of which nobody can answer:
`Are you here?`, `Do you see me?`, `How long have we been here, do you think?`,
`Will it end?`, `Does it matter?`. Several point at things the maze lists put on
the floor, `Did you notice the little leaf on the floor?` against five `leaf`
entries in the inner maze. It ends with a question and its own answer, `Well?
Shall we go?` and `Yes, Let's go.`, two lines apart with two seconds of nothing
between them.

⚠️ **The silences are written as rows, which is the whole reason this block
works.** An empty line with a duration is a first-class thing in this format. A
score that could only list utterances would have to fake the pauses with
trailing values on the line before, and the 46.5 second one could not exist at
all.

### 5.5 The outro and the credits

The outro is one paragraph with `<br>` at every line end, so the breaks are set
by the author rather than wrapped by the renderer. It appears at outro 30.0, and
under model A that is half a second after the voice asks `Do you recognise it?`.

The credits are one long `<br>` separated block, and two lines in them are
provenance rather than thanks:

> `Intro and Outro texts`
> `ENE MIHKELSON “Apartment”, Tallinn, 1985`
> `Translation from Estonian`
> `MIRIAM ANNE MCILFARICK-KSENOFONTOV`

> `Whispers, chat, dialogue`
> `AUDIENCE interaction from the Held in Human I`
> `EKA Gallery, Tallinn, 2023`
> `remixed with ChatGPT`

That second one explains the form of the dialogue. `/imagine` and `/remember`
read as prompts because they were prompts, and the same two words are then
placed in the maze as objects you walk past. **The prompt is the material here
rather than the tool**, which is why it is in the credits under the audience
rather than under the software.

---

## 6. What positron could take

### 6.1 What is already here

| the score needs | this repo has | fit |
|---|---|---|
| a keystroke track played back on a clock | `/typist/`, `timeline/logdeck.mjs`, `demo/shell/strip.mjs`, `demo/shell/transport-bar.mjs`, `timeline/store.mjs` | close, one conversion away |
| text standing in a room at readable size | `demo/weight/text.mjs`, distance fields, wraps against a width in metres, honours `\n` | close |
| a scene clock with positions read off it | `timeline/transport.mjs`, `observePosition` | close |
| a way out of an immersive page | `demo/shell/xr-quit.mjs` | already mandatory here |
| a room, hands and panels | `demo/shell/xr-room.mjs`, `xr-hands.mjs`, `xr-panel.mjs` | close |
| a text file that IS the piece | nothing | **missing** |
| passthrough opacity as a timed channel | nothing, and it is drawable | **missing, and cheap** |
| a colour lookup table on the passthrough image | nothing | **missing, and probably not reachable** |

### 6.2 🔴 The finding: this repo already made the opposite decision, on purpose

`/typist/` says on its own face that it records "where the text changed and what
it changed to, **never as the key you pressed**". It carries a counter called
`worked out`, which counts "the deletions where nothing said what had been
removed, so the text before and after had to be compared".

Held in Human records the key, not the change. And it is right to, because **the
six backspaces are the content**. Under typist's model those six deletions are
six rows that say a character went away without saying which, so every one of
them lands in the `worked out` counter. The two files are the two sides of one
argument, and the score is the case that justifies the side this repo did not
take.

The concrete work is small and it is not a new page:

1. one function in `demo/shell/text-adapter.mjs` that turns
   `<delay ms> <code>` into the `text-op` rows `/typist/` already plays, with
   13 as an insert of `\n` and 127 as a delete at the caret.
2. the Held in Human intro as a second fixture on that page, beside the one it
   ships.

⚠️ **And it cannot be done without asking.** The track is the authors' work and
the text inside it is a translated quotation from a published author. A fixture
is a redistribution. That is question 9 in section 7 and it comes before any
code.

### 6.3 What is a poor fit, honestly

- **`<size=18>` inline.** `weight/text.mjs` rasterises one texture per phrase at
  one size. A size change inside a line is not in it and is not a small
  addition.
- **A fifteen minute piece.** `verify.mjs` stops collecting 400 ms after the
  last assert and `settleMs` is per page. Nothing here grades a fifteen minute
  work with a segment that waits for a person, and nothing should be bent into
  trying.
- **Room scale walking.** The score assumes an installed room with a floor,
  stairs and a maze you walk through. Every XR page here assumes arm's reach
  plus a few steps.
- **The colour channel.** As far as is known here, WebXR hands a page no
  passthrough pixels and no lookup table on them, so the LUT half of section 4
  has no web equivalent. A page can only draw a translucent colour over the
  room, which is a different operation. ⚠️ **Not measured on the device**, and
  it is worth one Quest run before anyone repeats it as a fact.
- **Do not normalise the score's grammar away.** Its parameters are relative to
  a scene (`time until QandA HoldMe scene`) and this repo's timeline is absolute
  spans. Converting is arithmetic, and the relative form is the whole reason a
  dramaturg can edit the file. `plan-score.md` already holds the rule that
  covers this: normalise the envelope, never the payload.

### 6.4 The one demo the score genuinely suggests

**`veil`.** A plain list of scenes in a text file dims the real room around you
on a clock, and the page says in words that it is drawing over the room rather
than grading it, because WebXR hands a page no passthrough pixels.

That is the half of section 4 that is reachable, it is the half nothing here has
done, and the page's honest boundary is more interesting than the effect. It
would not be Held in Human and would carry none of its texts.

---

## 7. Open questions

### 7.1 The nine things the data refuses to decide

These are the places the score does not settle, and they are in
`held-in-human.json` under `ambiguities`, each with the arithmetic of every
reading and `settled: false`. **None of them is chosen silently.** `carriedAs`
names the field that holds the refusal, so a page can draw a gap rather than a
guess, and a consumer can tell "the score does not say" from "nobody looked".

| id | what the score does not settle | where it is in the JSON |
|---|---|---|
| `transition-clock` | The credits end at 42.0 in a scene stated as 40.0, and `time after credits until intro` does not say which end of the credits it counts from. Four readings, giving a gap to the next intro of 32, 40, 42 or 67 seconds. | `events[transition:credits].overrunsSceneMs` is the 2 s, `order.entry` holds both waits |
| `maze-length` | The only scene with no duration parameter, and nothing says what ends it. | `scenes[maze].durationMs` is `null`, `durationHow` is `absent` |
| `qanda-assignment` | 24 lines present, 23 asked for. The score counts lines per scene and never names them, so which line each scene speaks is a reading. | `qanda.blocks[0].countHow` is `inferred`, and **every** line carries `how: "inferred"` |
| `lut-off-by-one` | Two adjacent scenes break the file's own recommendation and swapping them fixes both. | `channels.lut.points[].followsRecommendation` |
| `the-loop` | `LUT transition time transition` is 0, which the recommendation satisfies only if the outro precedes the transition. | `order.loops` is `true` with `loopsHow: "inferred"` |
| `river-pacing` | Fifteen fragments of one to seventy-nine words in a 120 second scene, with no timing in the block at all. | every `texts.river.fragments[].durationMs` is `null` |
| `maze-suffixes` | Four inner entries carry `;n,n` and nothing says what the numbers select. Three readings. | `texts.mazeInner[].suffix` is the parsed numbers and nothing is claimed about them |
| `trailing-keypress` | The last event is a space typed 10.9 s after the final full stop. A cue or a stray press. | the last row of `keystrokes.events`, and `keystrokes.longestGaps[0]` |
| `radish` | `r,a,d,i,s,h` is the only entry that spells a word out with commas. | `texts.mazeInner[].spelledWithCommas` |

⚠️ **The list below is not the same list**, and the difference is who is being
asked. The nine above are what the FILE will not answer. Two of the nine below
are questions the file could never have answered: whether 0.15 opacity has been
walked in the real room, and whether this repo may use the intro track. Both are
questions for people.

### 7.2 For the authors

1. Which scene speaks QandA line 1, `Please walk towards the stairs in front of
   you.`, and does its `-1` mean "wait for the visitor"?
2. How long is the maze scene, and what ends it?
3. Is the transition scene the reset between visitors, and does the piece loop
   from the outro back into it?
4. `duration transition scene` is 40.0 but the credits need 42.0 and the wait
   25.0 more. Which of those three clocks decides when the next intro starts?
5. Are `LUT transition time dialogue 0.0` and `LUT transition time cylinder 5.0`
   the right way round?
6. What do the numbers after a semicolon in the inner maze list select, and why
   is `r,a,d,i,s,h` written with commas?
7. What paces the fifteen river fragments, given that the score gives them no
   timing and they run from one word to seventy-nine?
8. Has 0.15 opacity in the cylinder been walked in the real room, in the light
   the gallery actually has?
9. May positron reproduce the intro keystroke track and its text as a fixture,
   and under what credit?

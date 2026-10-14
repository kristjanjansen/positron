# plan-held-in-human-score, what the Held in Human score says and what we can use

Status (2026-10-14): done. Its data is demo/resources/held-in-human.json from demo/resources/build-held-in-human.mjs, both citing this plan, and /held/ draws from it.

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
  dramaturg can edit the file. `plans/plan-score.md` already holds the rule that
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

---

Part 2, merged from `plans/plan-held-in-human-2d.md` on 2026-10-14. Its title, status line and body follow unchanged.

# plan-held-in-human-2d, the piece as a picture on a flat screen

Status (2026-10-14): done. Built as demo/held/index.html (citing this plan), still served at https://positron.studio/held/ and listed on /archive/ since 2026-10-13.

Written 2026-09-20, in answer to one line from Kristjan: *"In bg plan and
implement basic held visualization in 2d. We have typing info, hue,
ligtness…"*

Read `plans/plan-held-in-human-score.md` for what the score SAYS and
`plans/plan-held-in-human-3d.md` for what a headset could DO with it. This is the
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

`plans/plan-held-in-human-3d.md` §1.2 settles the arithmetic. In an `alpha-blend`
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

That is `plans/plan-held-in-human-3d.md` §1.3 turned into two rectangles.

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

**The slug is `veil`**, which `plans/plan-held-in-human-score.md` §6.4 proposed for a
headset page that `plans/plan-held-in-human-3d.md` §8 then recommended against
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
   it is the finding from `plans/plan-held-in-human-3d.md` §1.3.
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

---

Part 3, merged from `plans/plan-held-in-human-3d.md` on 2026-10-14. Its title, status line and body follow unchanged.

# plan-held-in-human-3d, what of this piece a headset could actually be given

Status (2026-10-14): open. It recommends building nothing but one passthrough alpha measurement, and no page makes the passthrough alpha a parameter (grep of demo/ for it finds nothing).

Written 2026-09-19, the same day the score arrived. It answers one question
Kristjan asked about **Held in Human**: *"what can you actually simulate in
3d?"*

Read `plans/plan-held-in-human-score.md` first. That document is what the score SAYS.
This one is what a browser could DO with it, and the two are different questions
with different answers. Nothing below re-derives a number that file already
holds; where a number appears here it is either new or it is re-read from
`demo/resources/held-in-human.json`, which is the machine readable form of the
score and outranks both documents.

Every claim carries one of four labels:

- **MEASURED**, I ran it on this machine and read the number.
- **READ**, a file or a document says it and I am quoting it.
- **INFERRED**, my reasoning from the two.
- **NOT MEASURED**, it needs a headset and there is no headset attached here.

🔴 **No Quest was used for anything in this document.** Every statement about
what a Meta Quest does is READ or INFERRED. The three places where one headset
session would change an answer are named as they come up and collected in §8.

🔴 **The piece is somebody else's work.** §9 is the rights section and it is
short on purpose.

---

## 0. The short answer, in three lines and a recommendation

**Bucket 1, what the score fully specifies and a browser can do.** The whole
clock (eight scenes, eleven events of which two are waits, 775.2 s with the
maze taken out),
the opacity channel (eight values and eight ramps, which in this repo is the
alpha argument of a `gl.clearColor` call that is currently hard-coded to zero in
two files), the intro's 318 keystrokes at a position 3.40 m in front of the
visitor, the sixteen dialogue lines at two placements, the twenty-four QandA
lines with their eight silences, the outro paragraph, the credits scroll, and
the cylinder's radius.

**Bucket 2, what the score specifies and a browser cannot do.** One thing, and
it is the thing the piece is built out of: **the colour lookup table on the
passthrough image.** In an `alpha-blend` session the real room reaches the
visitor as `room * (1 - alpha)`, and `alpha` is ONE number shared by all three
colour channels. A page can dim the room and it can lay a colour on top of it.
It cannot touch the room's red without touching its green, which is the smallest
thing a colour table does.

**Bucket 3, what the score does not specify at all.** The maze, because
`maze.json` is not in the file and the score's only knob over it is a 0.4 m
offset. The sound, all of it: 175.9 s of recorded voice across 31 lines, 22.7%
of a visit, present as durations and absent as audio. `Ghost trace`, which is a
time and a name. `HoldMe`, which is an anchor point and a length. The river's
pacing. Every typeface and every type size in the piece. And the facing and the
placement of four of the eight scenes.

**Recommendation.** A faithful version is not possible from this file and a
partial one would misrepresent the piece, so do not build one. There is one
honest thing and it is a measurement rather than a demo: make the passthrough
alpha a parameter instead of a hard-coded zero, drive it from the score's own
eight values, and take it into a headset once. §8 says what that would settle
and what it would not.

---

## 1. The passthrough verdict, which decides everything else

The premise I was given to check was: **WebXR hands a page no passthrough
pixels. A session can composite over the room, but the page draws INTO that
composite and never sees the camera image.** If that is right, then the two
channels that shape the whole piece are exactly what a browser cannot do.

It is half right, it is out of date in one direction, and the half that survives
is the half that matters. Here is how I checked.

### 1.1 What I ran

**MEASURED, 2026-09-19.** I launched Chrome 153.0.8010.53 with a throwaway
profile, navigated it to a `http://127.0.0.1` origin so `isSecureContext` is
true, and read the WebXR surface out of the page. Two runs, headless and headed,
same answer. The profile was removed on the way out.

⚠️ **The first run of that probe answered "there is no WebXR here" and it was
wrong.** On `about:blank` the whole `XR*` family is absent, because
`navigator.xr` is gated on a secure context. On a real origin, 50 `XR*`
constructors appear. That is worth writing down because it is a probe that
returns a confident negative for a reason that has nothing to do with the
question, which is this project's standing failure mode in a new costume.

The two answers that matter:

```
XRRenderState.prototype:  baseLayer  constructor  depthFar  depthNear
                          inlineVerticalFieldOfView  layers

XRWebGLBinding.prototype: constructor  createCubeLayer  createCylinderLayer
                          createEquirectLayer  createProjectionLayer
                          createQuadLayer  getCameraImage  getDepthInformation
                          getReflectionCubeMap  getSubImage  getViewSubImage
                          nativeProjectionScaleFactor  usesDepthValues
```

`XRSession.prototype` carries `environmentBlendMode`, `enabledFeatures`,
`interactionMode`, the depth sensing pair, `initiateRoomCapture` and the usual
session machinery. `XRView.prototype` carries `camera`. `XRCamera` is a global.

**So the render state has six members and not one of them is about the
environment.** There is no opacity, no tint, no table, no blend control. The
session reports its blend mode and does not take one. That is the flat answer to
the second half of the premise, and it is a MEASURED fact about the Chromium the
Quest Browser is built on rather than a reading of a specification.

**And `getCameraImage` is there**, which is the half of the premise that is out
of date. See §1.5.

### 1.2 The arithmetic, which is the real proof

A session with `environmentBlendMode: alpha-blend` composites the page over the
room with source-over blending. Where the page's framebuffer holds colour `c`
and alpha `a`, the visitor sees:

```
out = c * a  +  room * (1 - a)
```

Read what that gives a page:

- **The room only ever appears multiplied by `(1 - a)`.** One scalar.
- **`a` is one channel.** There is no separate alpha for red, green and blue,
  because a framebuffer has one alpha channel and the compositor reads that one.
- **`c * a` is added on top**, and `c` does have three channels, so a page can
  lay any colour over the room at any strength.

The family of operations available to a page is therefore `out = s * room + k`,
where `s` is a **scalar** and `k` is a colour. Per pixel, `s` and `k` can both
vary, so a page can dim one part of the room more than another and wash one part
a different colour from another. What a page can never do is give the room's
three channels different gains, because there is one alpha and it multiplies all
three.

**A colour lookup table is, at its very simplest, a per-channel curve.** Every
LUT worth the name is at minimum three independent transfer functions and is
usually a three-dimensional table where the output depends on all three inputs
at once. The one operation a page cannot perform is the one operation a LUT is
defined by.

⚠️ **And there is no second pass to escape into.** The compositor blends once,
from one RGBA framebuffer, so drawing the scene in four passes still hands it a
single colour and a single alpha per pixel. The other blend mode the
specification defines is `additive`, for an optical see-through display, where
the visitor sees `room + c` and a page cannot darken the room at all. Quest
video passthrough reports `alpha-blend`, which is the better of the two for this
piece and is still one alpha.

INFERRED from the blend equation and MEASURED from the API surface: **the LUT
channel of this score is not reachable in a WebXR session, and it is not
reachable by a better page.**

### 1.3 Why a coloured quad is not a lookup table, in numbers

The obvious answer is to draw a full-view green quad at low alpha and call it
the green LUT. Take the dialogue scene, where the score asks for `green` at
opacity 0.70, and the cylinder, where it asks for `green` at opacity 0.15.

A quad of colour `c` at alpha `a` does `out = (1 - a) * room + a * c`. Three
things follow and all three are wrong for this piece:

1. **It is a lift, not a gain.** A green quad adds `a` to the green channel of
   every pixel equally, the black ones as much as the bright ones. That is fog.
   A grade moves the mid-tones and leaves the blacks alone, or crushes the blacks
   and leaves the mid-tones alone. Those look nothing like each other.
2. **It always lowers contrast, by exactly `(1 - a)` in every channel.** The
   difference between any two pixels shrinks by that factor, without exception.
   The score's own comment on the master dimmer is *"warning: it reduces the
   overall contrast, which makes it dull"*, so the authors named this cost and
   put it on a control they then left at 1.0. Implementing the colour channel as
   a wash pays that cost a second time, on a channel that was never supposed to
   have it.
3. 🔴 **It spends the dimmer's own budget.** This is the one that kills it. The
   page has one alpha. The opacity channel already needs it. In the cylinder the
   score asks for the room at 0.15, which is `a = 0.85`. Substitute green:

   ```
   out.r = 0.15 * room.r
   out.g = 0.15 * room.g + 0.85
   out.b = 0.15 * room.b
   ```

   The green channel is pinned above 0.85 everywhere in the frame. That is a
   green card with a ghost in it, not a dark room graded green.

**The score keeps two channels because they are two operations.** It runs eight
opacity values against four colour tables with independent fade times, and the
two lists disagree with each other constantly: the cylinder's opacity ramp is
2 s and its colour ramp is 5 s, the river's are 3 s and 10 s, and the outro is
the only scene in the piece where the two are equal, both at 10 s. A wash
collapses them into one channel and the disagreement becomes unrepresentable.

### 1.4 The other half is already in this repo as a hard-coded zero

The dimmer, by contrast, is not merely reachable. It is one argument in code
that already ships.

**READ, `demo/shell/xr-room.mjs:1739` and `demo/shell/xr-panel.mjs:1410`**, the
same line in both files:

```js
if (ar) gl.clearColor(0, 0, 0, 0);
```

Every passthrough page here clears the frame to transparent black, which is
`a = 0`, which is the room at 100%. `gl.clearColor(0, 0, 0, 0.85)` is the room
at 15%.

🔴 **And both ends of that range have already been measured on a real headset by
this project.** CLAUDE.md carries the rule:

> `alpha: false` on the WebGL context makes passthrough impossible. The
> compositor puts the real room behind the page and can only do that through
> transparent pixels; with no alpha there is nothing to clear to zero and the
> room is replaced by black instead of composited under.

That is `a = 1` and it reads as a bug report, which is what makes it good
evidence: nobody set out to prove the endpoint, somebody hit it and wrote down
what it looked like. `a = 0` is how four pages work today. So the two ends are
MEASURED on a Quest 3 and the ramp between them is INFERRED from the blend
equation and **NOT MEASURED**.

Two things the ramp could still get wrong, and only a headset can say:

- **Whether the compositor blends in linear light or in the display's own
  transfer curve.** If it blends after the curve, `a = 0.85` does not give a
  room at 15% of its luminance, it gives one at some other fraction, and the
  score's eight values would land somewhere other than where they land in Unity.
- **Whether the runtime does anything else with intermediate alpha**, such as
  quantising it or treating anything above a threshold as fully obscuring.
  Quest's own `XRRenderState.passthroughFullyObscured`, which READ from
  `research/quest-xr-2026-09.md` shipped in Browser 38.2 and has since been
  adopted into the W3C specification, is a hint in exactly that direction: the
  platform gives a page a way to say *I am covering the room* and no way to say
  *show me fifteen per cent of it*.

⚠️ **And the dimming would apply to a room the page is not compositing over
correctly to begin with.** `research/quest-xr-2026-09.md` and this repo's own
`BACKLOG.md` both record that a Quest composites passthrough with **no depth**,
so everything the page draws sits in front of every real wall whatever their
true distance. That is not a difference from the real piece, which is Unity
passthrough and has the same property. It matters here only because the score's
two dialogue placements are 9.4 m and 11.9 m away (§2.3) and this repo's only
page that stands words in a room had to shrink its whole world by a factor of
0.30 in passthrough for exactly this reason.

### 1.5 The one route to the pixels, and what it costs

The premise said WebXR hands a page no passthrough pixels. **That has not been
true since 2025 and the correction is already in this repo**, in
`research/quest-xr-2026-09.md`, which flags it as a trap it fell into itself:

> Meta's mixed-reality page says "There is no way to get to the pixels of the
> passthrough content", and IWSDK's camera guide (2026-09-05) says a headset's
> passthrough "is not automatically available as a browser camera". Both are
> about `navigator.mediaDevices`, a different API, and both are correct about
> it.

READ from the same file, off Meta's own release notes: passthrough camera
arrived **experimental in Browser 38.2 (2025-04-30)**, moved to **New Features
in 40.1 (2025-08-12)**, and was still being fixed in 146.0 (2026-04-21). There
is a matching consumer permission called **Headset cameras**. MEASURED here:
`XRWebGLBinding.prototype.getCameraImage` and `XRView.prototype.camera` both
exist in Chromium 153 on this laptop, so the API is not a proposal.

So there **is** a route. Here is what it costs, and why I am not recommending
it.

To grade the room with a real LUT you must:

1. **Stop using the compositor's passthrough entirely.** Draw at `a = 1`
   everywhere, which by the rule in §1.4 gives a black room.
2. **Ask for `camera-access`**, take a permission prompt in front of the
   visitor, and get a texture per frame from `getCameraImage`.
3. **Apply the LUT**, which is the only cheap step: a 3D texture lookup in the
   fragment shader.
4. **Reproject the camera image into each eye.** The cameras are not at the
   eyes. `XRCamera` hands over intrinsics and a pose, so the geometry is
   available, but reprojecting a flat image to a different viewpoint needs depth
   or it is only correct at infinity. `depth-sensing` is default on for Quest 3
   and 3S, so a coarse depth map exists, which means the step is possible and
   not that it is good.
5. **Accept the page's own latency.** The compositor reprojects passthrough at
   scan-out. A page cannot. This is the step that is not a code problem.

Four more constraints READ from the same research file: **only one foreground
app may hold camera data at a time**; the exact feature descriptor Quest wants
is UNCONFIRMED; whether the flag is still required is UNCONFIRMED; and there is
one dated contrary report from a developer on Browser 40.2 in October 2025
saying it still does not work.

**The verdict is not "impossible", it is "the wrong trade".** At the end of that
work you no longer have passthrough. You have a page-drawn video backdrop with
parallax errors at page latency, in exchange for a colour grade, inside a piece
whose entire subject is the real room the visitor is standing in. The cheap
version of the same mistake is the coloured quad. The expensive version is this.

---

## 2. The room, worked out

The `room` block of `held-in-human.json` is the place to start because every
placement in the file has `right = 0`, so a placement is a height, a distance
and an angle. Here is what that actually gives you.

### 2.1 Which way she faces, and the worked example that settles it

The score's own comment:

> `// The scene is built around the point (0,0,0)`
> `// Example:`
> `// starting position = (1.0,0.0,-2.0)`
> `// starting rotation = 180.0`
> `// The center of the space will be two meters behind the visitor,`
> `// one meter to her right`

🔴 **Both halves of that example resolve, and `plans/plan-held-in-human-score.md` says
one of them only half resolves.** The difference is the `180.0`, which that
reading leaves out of the arithmetic.

Work it with the axes the file states, right, up, back. A visitor at
`back = -2` stands 2 m in the direction of decreasing `back`. Taking increasing
`back` as the facing at rotation 0:

- **At rotation 180 she has turned round**, so the centre, which was 2 m in
  front of her, is 2 m behind her. The comment's first clause. ✔
- **At rotation 180 her own right points the way world-left points.** She is at
  `right = +1`, so the centre is 1 m to her world-left, which is 1 m to her
  right. The comment's second clause. ✔

INFERRED, and it holds whichever handedness the yaw uses, because 180 degrees is
180 degrees either way.

The real score then has `starting orientation 0.0`, so **at rotation 0 the
visitor stands 2 m in front of the centre of the space and looks toward it and
past it.** The intro text at `back = +1.4` is then 3.40 m directly in front of
her, which is the independent check: a piece whose first move is a wall of text
does not put it behind the visitor's head.

### 2.2 The six placements, from where she actually stands

MEASURED by arithmetic on the score's own numbers, with her starting point at
`back = -2` and **her eye taken at 1.7 m, which the score does not state**. The
elevation column is the only one that moves with that assumption; the distances
and the bearings do not. At the 1.6 m this repo's own pages use (`EYE_Y` in
`demo/weight/index.html` and `demo/blocks/index.html`) the four elevations read
+3.4, -11.3, +0.6 and +9.2 instead.

| placement | up | back | rotation | from her | off her axis | elevation |
|---|---|---|---|---|---|---|
| starting position | 0.0 | -2.0 | 0 | she is here | | |
| intro text | 1.8 | 1.4 | 0 | **3.40 m** | 0.0 deg | +1.7 deg |
| holdme anchorpoint | 1.3 | -0.5 | none | **1.55 m** | 0.0 deg | **-14.9 deg** |
| inner maze offset | 0.0 | -0.4 | none | a shift, not a place | | |
| dialogue Imagine | 1.7 | 8.0 | 50 | **9.41 m** | 40.6 deg | **0.0 deg** |
| dialogue Remember | 3.5 | 10.0 | 330 | **11.91 m** | 25.1 deg | +8.7 deg |

Four things fall out of that table that are not in the prose reading of the
score.

🔴 **`Imagine` is the only placement at a plausible eye height, and that is why
the eye is assumed to be 1.7 m rather than the other way round.** It is the one
number in the room block that a designer would choose to mean *level with her*,
and it is within 0.6 degrees of level across every eye height a person is likely
to have. ⚠️ Read the other way it is circular, so the honest form is: the score
does not say how tall she is, one placement reads as eye level, and every
elevation in the table hangs off that reading. `Remember` is 8.7 degrees above
her eye seen from where she stands and 10.2 degrees above it seen from the
centre, which is the number `plans/plan-held-in-human-score.md` quotes. Both are right
about their own origin and that document does not say which it used.

🔴 **The two voices are 65.8 degrees apart seen from her, not 80.** The 80 is
`50 + 30` and it is the angle at the centre of the space. She does not stand at
the centre. The composition a visitor actually gets is two voices about 66
degrees apart, one level with her eyes and one raised, at 9.4 m and 11.9 m.

🔴 **The hold me anchor is about 15 degrees BELOW her eye and 1.55 m away.** It is
the only thing in the piece you look down at, and at that distance and angle it
is within reach if she takes one step. That is arm's-reach geometry, which is
the one scale every XR page in this repo already assumes.

🔴 **Four of the six placements are inside the cylinder and two are far outside
it.** The cylinder radius is 2.55 m. The start (2.0 from centre), the intro text
(1.4), the hold me anchor (0.5) and the inner maze offset (0.4) all sit inside a
5.1 m circle. The two dialogue voices sit at 8.0 and 10.0 from the centre. That
is the split that decides what a headset in an ordinary room can hold, and it is
a clean one: **the piece is a 5 m room with two things hung a long way outside
it.**

### 2.3 The cylinder

Radius 2.55 m, so 5.10 m across. She begins 2.00 m from the centre, so **the
near wall is 0.55 m behind her and the far wall 4.55 m in front.** MEASURED, and
true only at the start, since by the cylinder scene she has walked.

That is a gallery-sized object. A Quest guardian in a domestic room is typically
2 to 3 m across, so the cylinder would enclose the real walls, and with the room
at 0.15 opacity through most of that scene the visitor would mostly not see them
anyway. INFERRED: in a small room the cylinder scene degrades gracefully and the
maze and the dialogue do not.

The score gives the cylinder a radius and nothing else. No height, no material,
no position for its centre in the vertical, no statement of whether it is a
surface or an absence. §5 counts that as one of the holes.

### 2.4 The facing of the two voices cannot be settled, and here is the control that says so

I tried to settle it and failed, and the failure is worth more than the claim
would have been.

The score uses the same comment, `// rotation around center of the space`, for
`dialogue rotation Remember`, `dialogue rotation Imagine` and `intro text
orientation`. So `rotation` and `orientation` are one thing. Two readings:

- **Rigid**, the placement is swung about the centre and the object turns with
  it, so its facing is determined.
- **Positional**, the placement is swung and the object's own facing is a
  separate thing the score does not state.

Under the rigid reading, an object that faced the visitor's start at rotation 0
would, after its swing, still face within **9.4 degrees** of her for `Imagine`
and **4.9 degrees** for `Remember`. That looked like evidence. **MEASURED
negative control: sweep the same placement through all 360 rotations and the
mean is 9.2 degrees and the worst case is 14.5 degrees.** Every rotation aims at
her within fifteen degrees, because at 8 m from a centre she stands only 2 m
from, every direction points roughly her way. The statistic is constant by
construction over the subject, which is CLAUDE.md's own rule about the
kaleidoscope in a different costume.

The bound is exact and worth keeping: `arcsin(2 / d)`, which is 14.5 degrees at
8 m and 11.5 degrees at 10 m.

**So the facing of every text surface in this piece is unstated.** That is not a
small thing to leave open, because a text plane seen edge-on is invisible, and
the two dialogue placements are the two with an angle on them.

### 2.5 What `xr-room.mjs` would have to grow

`demo/shell/xr-room.mjs` is 116 KB and owns the picture: a room from a 32-bit
seed, spinning cubes with a proven separation rule, the dotted floor grid snapped
onto detected planes where the headset reports any and onto the page's own five
quads where it does not, the two-eye pass with the `gl.clear` and
`bindAttribLocation` traps already paid for, controller stand-ins and real glTF
models through `xr-glb.mjs`, the pointer beam, and the tablet.

What it does not have, for this piece:

| the score needs | `xr-room.mjs` today | what it would take |
|---|---|---|
| a cylinder of radius 2.55 | `lathe()` exists and is **not exported** | a body of revolution is ten lines in its own idiom |
| an object placed at a height, a distance and an angle | `modelM(x, y, z, s, rx, ry)` takes cartesian | a polar wrapper, trivial |
| text standing in the room | nothing here; `demo/weight/text.mjs` has it | see §4 |
| the room dimmed on a clock | `gl.clearColor(0, 0, 0, 0)`, hard-coded | one parameter |
| a visitor who has walked to a named place | `local-floor` gives head position | the named place does not exist, see §5 |

The two-eye pass, the way out, the plane detection and the controller path all
come free, and every one of them is a WebXR defect this project has already paid
for once on real hardware. That is the genuine asset here and it is worth saying
plainly: **the expensive half of putting anything in a headset is done.**

---

## 3. Scene by scene

The running order, with both channels, MEASURED off `held-in-human.json`:

| scene | length | LUT | LUT fade | opacity | opacity fade | change |
|---|---|---|---|---|---|---|
| transition | 40.0 s | neutral | 0 s | 1.00 | 2 s | +0.40 |
| intro | 142.3 s | neutral | 0 s | 0.60 | 4 s | -0.40 |
| maze | **absent** | neutral | 0 s | 0.60 | 3 s | 0 |
| dialogue | 107.9 s | **green** | **0 s** | 0.70 | 6 s | +0.10 |
| cylinder | 150.0 s | green | 5 s | **0.15** | 2 s | **-0.55** |
| river | 120.0 s | blue | 10 s | 0.30 | 3 s | +0.15 |
| hold me | 165.0 s | red | 2 s | 0.50 | 4 s | +0.20 |
| outro | 90.0 s | neutral | 10 s | 0.60 | 10 s | +0.10 |

Two MEASURED figures about the channels that are not in the score document:

- **The room's opacity is moving for 29 seconds of a 775 second visit**, which
  is 3.7% of it. Total ramp time is 34 s, of which the maze's 3 s changes nothing
  (0.6 into 0.6) and the transition's 2 s happens between visitors. So the room
  is standing still for 746 of the 775 seconds somebody is inside the piece, and
  every move it makes is an event.
- **The colour tables run neutral 232.3 s, green 257.9 s, blue 120.0 s, red
  165.0 s** across a visit with the maze counted as zero. Green is the longest,
  and it spans the two scenes with the biggest opacity gap in the piece, 0.70 and
  0.15.

### 3.1 transition, 40 s

**What could be shown.** The credits, which arrive at 7.0 s and scroll for
35.0 s. Eleven credit groups, a canvas texture on a quad, scrolled by a UV
offset. `xr-panel.mjs` already draws panels as textures and this is that with
one animated coordinate. The room at 1.00 opacity is `clearColor(0,0,0,0)`,
which is what the repo does today.

**What could not.** Nothing, mechanically.

**What would have to be invented.** Where the credits hang, how big they are,
what typeface. The score gives no placement for them. And the scene's own clock
does not close: the credits end at 42.0 s in a scene stated as 40.0, and `time
after credits until intro` does not say which end it counts from, which gives
four different answers for when the next visitor starts. That is ambiguity
`transition-clock` in the data and it is `settled: false`.

### 3.2 intro, 142.3 s, and it is one of the two nearly free ones

**What could be shown.** All of it. 318 keystroke events with their delays
already summed into absolute times, 307 printable keys, 5 returns, 6 backspaces,
306 characters on screen, spanning 142.277 s. A position 3.40 m in front of the
visitor at 1.8 m up, on her axis, facing her. White text, stated. A 4 s opacity
ramp from 1.00 down to 0.60 at the top of the scene.

And the correction is the content: six backspaces delete `houses` and
`buildings` is typed in its place, with a **2.295 s hesitation before the first
backspace that is longer than the deletion itself.** A score holding the finished
string could not carry that. This repo already made the opposite decision on
purpose, in `/typist/`, which records the change and never the key, and
`plans/plan-held-in-human-score.md` §6.2 is right that the two files are the two sides
of one argument.

**What could not.** The typing has to appear somewhere, and the two ways of
standing text in a room here both have a problem with text that changes:

- `xr-panel.mjs` draws to a 2D canvas and uploads it, which is fine at panel
  sizes and goes to mush on a wall of text three metres wide.
- `demo/weight/text.mjs` builds signed distance fields, wraps against a width in
  **metres**, honours `\n`, and stays sharp at any size. Its own header names
  the expiry: *"Go to a glyph atlas when text has to CHANGE at runtime, anything
  typed, streamed, counted up, or translated on the fly, because this shape
  rebuilds a whole texture for a one-letter edit."* The intro is anything typed.

  MEASURED in that file: eleven phrases take about 320 ms on the main thread, so
  roughly 29 ms each. ⚠️ Those eleven are that page's own display words and a
  line of body type is a different texture, so 29 ms is an order of magnitude
  rather than a figure. INFERRED at that order: a rebuild per keystroke against
  an 11.1 ms frame at 90 Hz is a couple of dropped frames per character, 306
  times. The median gap between keystrokes is 270 ms and the shortest is 56 ms,
  so at the fast end the page would be asked to rebuild faster than it can draw.
  The repair is the one the file already names, a glyph atlas, and it is not a
  small addition.

  ⚠️ The Quest-specific half of this is already found and fixed: BACKLOG.md
  records that `/weight/`'s live retype scheduled its rebuild on
  `window.requestAnimationFrame`, **which does not fire inside an immersive
  session**, so in a headset the rebuild was queued and never ran. It uses the
  session's own frame callback now.

**What would have to be invented.** The type size, the wrap width, the typeface,
whether a caret is drawn, and whether the six lines stand still or scroll. The
score gives a colour and a position and says nothing else about the type. The
graphic designer is credited in the file and his work is not in it.

### 3.3 maze, no length, and it is the one that cannot be started

**What could be shown.** Two word lists, 28 outer and 24 inner, and one event:
the outer maze begins 60.0 s in.

**What could not.** Everything else. `maze.json` holds the geometry and is not
in the score. There are no positions, no scale, no idea what a maze is made of
here, and the score's only knob over that file is `inner maze offset`, 0.4 m
toward the side the visitor starts on. The score cannot be read into a maze
because the maze is not what the score contains.

Three further unknowns inside the two lists, all `settled: false` in the data:
the `;n,n` suffixes on four inner entries using the values 1, 2, 4, 5, 6 and 7;
`r,a,d,i,s,h` as the only entry spelled out with commas; and the trailing spaces
on `thought ` and `loop ` in the outer list, which nothing else has.

**What would have to be invented.** **The stairs.** The one QandA line with a
negative time says *"Please walk towards the stairs in front of you."* and there
are no stairs anywhere in the file. That single line also makes this the only
scene that waits for a person, so its length is not merely unstated, it is
unstatable.

⚠️ And it is the one scene that requires room-scale walking. Every XR page in
this repo assumes arm's reach plus a few steps, and a headset in a domestic room
has a guardian two or three metres across.

**Verdict: nothing.** Not a partial build, not a sketch. Placing 52 words in a
room would be inventing the room design, which the file credits to somebody else
and does not contain.

### 3.4 dialogue, 107.9 s

**What could be shown.** Sixteen lines, two speakers strictly alternating, with
their own durations and five pauses, summing to 107.9 s. Two placements with
rotations. The 6 second pause after `/imagine the art of missing out.` is line 9
of 16 and is the one long silence, placed deliberately. The last two lines switch
from `/imagine` and `/remember` to `/whisper`, and by then the maze sound has
faded out, so the two whispers have nothing behind them.

**What could not.** Speak. The line durations are the lengths of recordings the
file does not carry, 98.4 s of them across sixteen lines. A silent build shows
sixteen captions on a stopwatch.

**What would have to be invented.** Whether the lines are spoken or shown or
both, and which way each surface faces (§2.4). Also, what happens at 9.4 m and
11.9 m in a room that is 4 m wide: `/weight/` had to scale its whole world by
0.30 in passthrough for this, and uniform scaling about eye height preserves
every angle in the table in §2.2 exactly while destroying every distance. That
is the honest trade and it should be named rather than taken silently.

### 3.5 cylinder, 150 s

**What could be shown.** A cylinder of radius 2.55 m with the visitor inside it.
The fastest and largest opacity move in the piece, 0.55 of range in 2.0 seconds,
against 0.100 a second for the fastest move a visitor is inside for otherwise.
Seven QandA lines beginning at 90.0 s and ending at 128.0 s of 150.0.

The scene is worth building for its dramaturgy alone: the room collapses to 0.15
and holds there for two and a half minutes, and ninety seconds into that a voice
asks *"Have you noticed how the walls don't meet the ceilings here?"*, then *"Are
you here?"*, then *"Do you see me?"*.

**What could not.** `Ghost trace` at 60.0 s. It is an event with a time and a
name and no description anywhere in the file. It is also the only thing that
happens in the first ninety seconds of the scene other than the opacity
collapse, so not knowing it is not knowing the scene.

**What would have to be invented.** The cylinder's height, its material, whether
it is a wall or a boundary, where its centre sits vertically, and what a ghost
trace is.

### 3.6 river, 120 s

**What could be shown.** Fifteen fragments and two minutes.

**What could not.** Pace them. This is the largest hole in the file as supplied:
the dialogue carries seconds per line and the QandA carries seconds per line, and
the river carries nothing at all, while its fragments run from **one word to
seventy-nine**. Evenly spread they are 8.0 s each, and they cannot be evenly
spread.

Two more, both real:

- **31 `<size=18>` spans set an absolute size on individual words**, and 18 is
  relative to a surrounding size the file never states, so **the direction of the
  emphasis cannot be read off the score.** Bigger or smaller is a coin toss.
- `weight/text.mjs` rasterises one texture per phrase at one size. A size change
  inside a line is not in it and is not a small addition. That is a limit of this
  repo rather than of a browser: a 2D canvas does mixed sizes without complaint,
  at the cost of the sharpness the distance fields exist for.

**What would have to be invented.** The pacing, the size relationship, the
placement. The score gives the river an orientation of 0 and no position, the
only element in the file like that.

### 3.7 hold me, 165 s

**What could be shown.** An anchor point 1.55 m in front of where she started
and about 15 degrees below her eye, a duration, and two voice blocks: five lines at
0 s and eleven lines at 144.0 s. The second block runs **85.5 s past the end of
its own scene** and carries the voice across the boundary into the outro, which
is the cleverest and most fragile thing in the score.

**What could not.** Be built. **`HoldMe` is a name, a point and a length.** The
file says nothing about what it is.

⚠️ The one hint is in the geometry rather than the words, and it is a hint and
not a fact: 1.55 m away and below the eye is where a thing you take hold of is,
and it is the only placement in the piece below eye level. `xr-hands.mjs` and
`xr-panel.mjs` already carry a grab path with `grabOffset`, `heldAt` and a
`grabMovedM` counter, so if HoldMe is a thing you hold, this repo has the hands
for it. **INFERRED from a coordinate, which is not enough to build from.**

### 3.8 outro, 90 s

**What could be shown.** One paragraph with the author's own line breaks,
appearing at 30.0 s. Both channels ramping back over 10 s, which is the only
scene in the piece where the LUT fade and the opacity fade are the same length
and the only one where both are at their maximum. Under the reading the data
uses, the outro text appears **half a second after the voice asks "Do you
recognise it?"**, which is the strongest piece of arithmetic in the whole score
reading.

**What could not.** Speak the three lines that land in this scene, and grade the
room back to neutral.

**What would have to be invented.** Where the paragraph hangs and how big it is.

### 3.9 The QandA, which crosses four scenes and is the other nearly free one

It is not a scene, it is one voice reading one list with a cursor that crosses
scene boundaries. MEASURED off the data:

- 24 lines, of which **8 have no text at all** and are silences of a stated
  length, from 1 s to 46.5 s.
- **Spoken lines total 77.5 s and silences total 77.5 s**, equal to the tenth of
  a second. That is measured, and I am not claiming it was intended.
- Plus 8.5 s of pauses, so the block is 163.5 s end to end.
- The assignment of lines to scenes is entirely **INFERRED**: the score states
  how many lines each scene takes (0, 7, 5, 11) and never states which, and the
  block holds 24 against the 23 asked for.

**As timed text with real silences it is free.** The rows are in the data with
absolute times already computed. A page can show a line for exactly as long as
the score says and show nothing for exactly as long as the score says nothing,
and the silences are the reason the block works: a format that could only list
utterances would have to fake the pauses and the 46.5 second one could not exist
at all.

**What it cannot be is a voice.** 77.5 s of speech across fifteen lines, none of
it in the file.

---

## 4. What this repo already has, named

Not a gesture at capability. These are the files and what each one would do here.

| file | what it owns | what it gives this piece |
|---|---|---|
| `demo/shell/xr-panel.mjs` | the session, the render state, panels as textures, the dead-man's switch at 4 s, the entry instrumentation | the only session path that carries all five WebXR defects already fixed. A page that writes its own `requestSession` inherits none of them |
| `demo/shell/xr-room.mjs` | a room from a seed, the dotted floor on detected planes, the two-eye pass, `wallYaw` off the measured walls | the picture, the floor, and the one line that is the score's opacity channel |
| `demo/shell/xr-hands.mjs` | which hand points and which carries, the button map, grip resolution | the hold me anchor, if it turns out to be a thing you hold |
| `demo/shell/xr-controller.mjs`, `xr-glb.mjs` | real controller models through a hand-written glTF parser | nothing this piece asks for |
| `demo/shell/xr-ray.mjs`, `xr-pick.mjs` | a ray from the hand onto a rectangle | nothing this piece asks for. Held in Human has no controls |
| `demo/shell/xr-quit.mjs` | hold any button 3 s, an arc filling at your hand, no labels | the way out, which is mandatory here and which the score does not have |
| `demo/shell/xr-tablet.mjs` | a slab of controls on the left hand | refused in passthrough by standing instruction, and this piece is passthrough |
| `demo/weight/text.mjs` | words as signed distance fields, wrapped against a width in **metres**, sharp at any size | the intro, the dialogue, the outro, the river. It is the closest thing in the repo to what four of these scenes need |
| `demo/held/index.html` | the score's clock drawn as a strip, 43/43 | the piece already read, with the maze as a hatched break in pixels rather than milliseconds |
| `demo/resources/held-in-human.json` | the score as data, every duration labelled stated, measured or absent | everything above reads from this and decides nothing it leaves open |

Three measured facts about the device that this piece would depend on, READ from
CLAUDE.md and `plans/plan-xr.md`, all from a Quest 3 on 2026-09-12 and 2026-09-16:

- **The framebuffer is 3360x1760, two views, and a page holds 89.8 fps in VR and
  90.0 fps in passthrough.** Compositing over the room costs nothing measurable.
- **Audio survives an immersive session and costs nothing.** The `AudioContext`
  is running before, during and after; base and output latency are identical
  inside and outside to the digit; `AudioDecoder` configures and decodes in there
  with zero errors; a main-thread `ScriptProcessorNode` never starved over 3322
  frames. So for this piece **nothing about audio is a technical obstacle. The
  obstacle is that there is no audio.**
- **A doff is reported about ten seconds late**, which for a fifteen minute piece
  with a fixed clock is a real number rather than a curiosity.

---

## 5. What the score does not carry, and what each absence costs

This is the valuable bucket and it should be read as a list of things nobody
could build from this file however capable they were.

### 5.1 `maze.json`

**Cost: the whole maze scene, and the only scene that waits for a person.**

The score references it in a comment and holds one 0.4 m offset over it. The
geometry, the stairs, the scale, the materials and what 52 words are doing in
space are all in a file we do not have. Nothing partial is honest here.

### 5.2 The sound, all of it

**Cost: 175.9 s of recorded voice across 31 lines, 22.7% of a visit, plus every
ambience.**

The score's total specification of the sound design is **one envelope**: the
maze sound begins to fade 30.0 s into the dialogue and is gone 60.0 s later.
That is the only reference to any sound in the file, and it names a thing
(`maze sound`) that is never otherwise mentioned. Everything else about the
audio is a duration standing in for a recording: sixteen dialogue lines at 98.4 s
and fifteen spoken QandA lines at 77.5 s.

The sound designer is credited, and the source of the words is credited too:
audience interaction from Held in Human I at EKA Gallery in 2023, remixed with
ChatGPT. Neither the recordings nor the voice are in the file.

🔴 **This is the single largest reason not to build the piece from this score.**
A version where the dialogue and the QandA are captions is not a quiet version
of Held in Human. It is a different work with the same timings.

### 5.3 `Ghost trace`

**Cost: everything in the cylinder between its opening and its voice.**

A time (60.0 s) and a name. The cylinder is 150 s long, the opacity collapses in
its first 2 s and the voice arrives at 90 s, so between 2 s and 90 s the ghost
trace is the scene. It is two words.

### 5.4 What `HoldMe` is

**Cost: a 165 second scene, the longest in the piece.**

An anchor point at 1.3 m up and 0.5 m forward of the centre, and a duration. The
name suggests something and the coordinate suggests something, and neither is a
specification. §3.7 has the one geometric hint and it is a hint.

### 5.5 The river's pacing

**Cost: 120 seconds, and the only text block in the score with no timing.**

Fifteen fragments of one to seventy-nine words. Something outside the score paces
them, or the sound design does, or somebody runs them by hand, and the file does
not say which.

### 5.6 Type, everywhere

**Cost: every text surface in the piece.**

The score carries exactly one thing about type: `text color 1.0,1.0,1.0`, one
colour for the whole piece, no per scene and no per speaker. It carries no
typeface, no size, no wrap width, no leading, and no facing (§2.4). The graphic
designer is in the credits and his work is not in the file. For a piece that is
almost entirely text standing in a room, that is most of what a builder would
need to know.

### 5.7 Placement, for four of the eight scenes

**Cost: a builder becomes the room designer.**

Placed: the intro text, the two dialogue voices, the hold me anchor, the inner
maze offset. Given a radius and nothing else: the cylinder. Given an orientation
and nothing else: the river. **Given nothing at all: the outro text, the credits,
the QandA voice and the maze.**

---

## 6. The three buckets, in full

### 6.1 The score specifies it and a browser can do it

- The running order and the clock. Eight scenes, eleven events of which two
  are waits, 775.2 s from the intro's first keystroke to the end of the outro
  with the maze taken out. Already drawn by `/held/`.
- **The opacity channel.** Eight values and eight ramps, on `gl.clearColor`'s
  alpha. Both endpoints MEASURED on a Quest by this project; the ramp between
  them NOT MEASURED.
- The intro keystroke track, 318 events over 142.277 s, at 3.40 m in front at
  1.8 m up, white, with the hesitation and the correction intact.
- The QandA as timed text with real silences, 24 rows, 8 of them silence, 1 s to
  46.5 s, with the caveat that the assignment of lines to scenes is inferred.
- The dialogue as timed text at two placements 65.8 degrees apart seen from the
  visitor, one at eye level and one 8.7 degrees above.
- The outro paragraph at 30.0 s, with the author's line breaks and the piece's
  only matched pair of 10 s ramps.
- The credits, starting at 7.0 s and scrolling for 35.0 s.
- The cylinder as a shape of radius 2.55 m that the visitor begins inside.
- The way out, which the score does not have and which is mandatory here.
- ⚠️ And one thing that is reachable and unbuilt: **occlusion**. `depth-sensing`
  is default on for Quest 3 and 3S and no page in this repo asks for it, so
  everything here draws in front of every real wall. The real piece has the same
  property, so this is an improvement available rather than a gap to close.

### 6.2 The score specifies it and a browser cannot do it

**One entry, and everything in §1 is about it.**

- **The LUT on the passthrough image.** Four tables, eight values, eight ramps,
  257.9 s of green in a single visit. In an `alpha-blend` session the room
  reaches the visitor as `room * (1 - a)` with one alpha for all three channels.
  A page can dim it and lay colour over it. It cannot grade it. The `camera-access`
  route exists and replaces passthrough with a page-drawn backdrop, which is the
  wrong trade for this piece (§1.5).

⚠️ **That bucket having one entry is itself the finding.** Almost nothing this
score asks for is beyond a browser. The one thing that is, is the channel the
piece is named after: a room you are held in, coloured.

### 6.3 The score does not specify it

`maze.json`. The sound. `Ghost trace`. What HoldMe is. The river's pacing. Every
typeface and type size. The facing of every text surface. The placement of four
of the eight scenes. The stairs. Whether the piece loops. Which scene speaks the
one line with a negative time. The nine entries in `ambiguities`, all of them
`settled: false`.

---

## 7. What a build would actually look like, if somebody insisted

Not a recommendation. A description, so that the cost is visible rather than
argued about.

You would get: a fifteen minute silent piece in which the real room dims and
brightens on the score's own clock and never changes colour; a wall of text that
types itself for two and a half minutes with the hesitation intact; a gap where
the maze is, of a length you chose; sixteen captions alternating between two
points you had to guess the facing of; a cylinder of a height you invented,
containing nothing, with a two word event missing from the middle of it; fifteen
news fragments at a pace you invented; a scene called hold me consisting of an
empty point in the air for two and three quarter minutes; and a paragraph.

**More than half the running time is a scene where somebody would be inventing
the content or its pacing.** MEASURED from §5: cylinder 150 s with its one event
missing, river 120 s with no pacing at all, hold me 165 s with no description,
and the maze with neither a length nor a geometry. That is 435 s of the 775 s
known clock, 56%, before the maze is counted at all.

And it would be handed to somebody as Held in Human.

---

## 8. Recommendation

**Do not build the piece from this file.** The maze has no geometry and hold me
has no description, the cylinder's one event is two words, the river has no
pacing, the colour channel that runs underneath all of them is not reachable in
a browser, and 22.7% of a visit is a recorded voice the file carries only as
durations. A partial version would not be
a smaller Held in Human, it would be a different work wearing its timings, and
the parts it would be missing are the parts the credits name other people for.

**There is one honest thing and it is a measurement, not a demo.** The opacity
channel is already in this repo as a zero:

```js
if (ar) gl.clearColor(0, 0, 0, 0);     // xr-room.mjs:1739, xr-panel.mjs:1410
```

Make that alpha a parameter, drive it with the score's eight values and eight
ramps, and take it into a headset once. **What it would settle**, and none of
these is answerable from here:

1. **Whether the compositor's blend is linear**, and therefore whether alpha 0.85
   really is the room at fifteen per cent. If it is not, every number in the
   score's opacity column lands somewhere other than where it lands in Unity, and
   that is worth knowing before anybody quotes one.
2. **Whether the Quest does anything else with intermediate alpha**, such as
   quantising it or treating anything above a threshold as fully obscuring.
3. **Whether 0.15 for 150 seconds is safe to stand in**, which is question 8 in
   `plans/plan-held-in-human-score.md` §7.2 asked about our compositor rather than
   theirs. The score's own warning is that dimming costs contrast, and contrast
   is what tells a person where the floor is.

**And it would have to be proved by sabotage, the way everything here is.** Set
the alpha to zero and the check must go red; the failure mode this project keeps
finding is a page that reports a boundary whatever it is shown. The negative
control is the colour half: **drive the same parameter with a colour instead of
black and the room should get a fog rather than a grade**, which is §1.3 turned
into something a person can look at. A page that can show both in one session is
a page that has said something true about what a browser can and cannot do to a
room, which is more interesting than the effect.

⚠️ **That is worth doing on its own terms and it is not Held in Human.** It would
carry none of the piece's texts, none of its scenes and none of its name.
`plans/plan-held-in-human-score.md` §6.4 already proposed a page called `veil` for
roughly this, and the finding in §1.4 makes it smaller than that document
thought: the mechanism is one argument that already ships, and what is actually
missing is the measurement and the sabotage rather than the code.

---

## 9. Rights

The score is **Liis Vares and Taavet Jansen's**, produced by elektron.art, with
mixed reality design and coding by Norbert Pape, sound by Mihkel Tomberg,
graphics by Jaan Evart and room design by Mari Möldre. The intro and outro texts
are **Ene Mihkelson**, *"Apartment"*, Tallinn 1985, translated from Estonian by
**Miriam Anne McIlfarick-Ksenofontov**. The whispers, chat and dialogue are
audience interaction from Held in Human I at EKA Gallery, Tallinn, 2023.

Nothing described in this document may be built, shipped or shown without asking
the authors first, and reproducing the intro keystroke track is a redistribution
of a published author's text in translation, which is a separate permission
again. That is question 9 in `plans/plan-held-in-human-score.md` §7.2 and it comes
before any code.

The texts quoted here are quoted only where a number depends on them and none of
them is rewritten.

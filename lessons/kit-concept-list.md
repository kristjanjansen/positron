# Kit lessons: concept-list

The longer comments cut from `demo/shell/concept-list.mjs` and `demo/shell/concept-list-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-concept-list.md#<anchor>`.

<a id="header"></a>

## `concept-list.mjs` module header

```text
demo/shell/concept-list.mjs: every concept page, in teaching order. The front
page (demo/index.html) draws its cards from it and each page's prev / next
links walk it, so a new page is one row here.
🔴 `id` IS `<group>/<slug>`, THE FOLDER UNDER demo/ AND THE URL, /synth/keyboard/,
SINCE 2026-10-13: *"when all is done, move concepts to frontpage ... rename all
with group/slug, rm numbers"*. It was `n`, `<group>/<number>` under /concepts/
(asked 2026-10-11, *"/concepts/group/0x"*), and every one of those addresses is
a 404 now, with no forwarding (positron-concepts). No number is shown anywhere
a visitor looks.
🔴 THE SLUG IS ONE PLAIN LOWERCASE WORD, SINCE THE SAME EVENING: *"Resolve
clashes. Avoid dashes on names."* No hyphen, unique in its group, never the
group's own name (no /granulator/granulator/), and chosen from the title rather
than spelling it out: Circuit on Pi is /remote/circuit/. The title keeps its
words. The dashed addresses of that afternoon (/remote/circuit-on-pi/) are 404s,
no forwarding. demo/shell/concept-list-test.mjs checks all of it.
The URL group is the folder (CONCEPT_DIRS below); `group` sets the heading a
card shows under when that is not the folder (`history` shows as archives).
prev and next walk this order. There is no page per group.
```

<a id="words"></a>

## `concept-list.mjs` removed: room words

```text
room/040 Patch from words is off the index since 2026-10-10 (*"hide concepts/001 now"*);
the page stays at /room/words/.
```

<a id="synth-040"></a>

## `concept-list.mjs` removed: synth/040

```text
synth/040 Synth removed 2026-10-13 (*"can split https://positron.studio/concepts/synth/040/ apart to
different conecepts, do not dupe with existing ones (so only some last steps?). rm 040 later."*). Its
sine and freq knob are synth/000's, and its wave knob is the oscillator's own setting rather than a
module; its filter, envelope and LFO are 050. The old URL 404s (no forwarding).
050, 060 and 070 were used before (draw/000, remote/000 and remote/010); those old pages are gone.
```

<a id="envelope-lfo"></a>

## `concept-list.mjs` removed: envelope and LFO

```text
synth/060 Envelope and synth/070 LFO removed 2026-10-13 into synth/050 Sound design (*"combine
filter+envelope+lfo to single sound design concept"*). Their URLs 404 (no forwarding).
```

<a id="plaits"></a>

## `concept-list.mjs` moved: Plaits patches

```text
synth/110 Plaits patches moved to /archive/plaits-patches/ 2026-10-13 (*"arhvie plaits patches"*).
Plaits (titled Plaits keys until 2026-10-13, *"rm keys from name"*) and Piano and Rhodes under instruments in code (asked 2026-10-13, *"move plaits keys, sampler to in code instuments"*).
```

<a id="group-headings"></a>

## `concept-list.mjs` group headings

```text
Asked 2026-10-13: *"rename synth to instruments"*, *"move sampler to instruments"*,
*"make granulator its own group"*. A row's `group` sets the heading it shows under;
its folder and URL stay where they are, so no address changed.
```

<a id="dots"></a>

## `concept-list.mjs` Dot piano last

```text
Dot piano last in its group (asked 2026-10-13, *"dot piano is last in group"*).
```

<a id="beat"></a>

## `concept-list.mjs` Beat granulator

```text
sampler/070 (asked 2026-10-13, *"make followup demo with ida, dub and add tempo detection and feed it into granulator"*).
```

<a id="remote"></a>

## `concept-list.mjs` remote group

```text
sampler/050, the Pappus granulator, moved to /archive/ 2026-10-13 when the owner chose the light one (*"but we got rid of pappus?!? 060 ???"*): /archive/pappus/, still working.
synth/130 MIDI dump removed 2026-10-13 (*"rm https://positron.studio/concepts/synth/130/"*); /dump/ is not marked not needed any more.
remote, after synth (asked 2026-10-13, *"make group remote synths and move pi-playing ones there"*,
then *"yea, move them all to remote instruments or stm"*): every concept page that plays on the
Raspberry Pi. remote/000 to 050 were synth/060, synth/070, synth/100, sampler/030, rhythm/030 and
shader/010 until then; the old URLs 404 (no forwarding). synth/060 and 070 were briefly
the Envelope and LFO pages of the synth/040 split, folded into synth/050 the same day.
remote/000 Yoshimi archived 2026-10-13 with Yoshimi (*"discard yoshimi"*): archive/concepts/remote-000.md.
The gap stays; /concepts/remote/000/ is a 404.
```

<a id="draw"></a>

## `concept-list.mjs` draw group archived

```text
draw, after synth because its first page is the synth/040 voice under a pad
(asked 2026-10-12, *"make draw concept group and move xy concept and draw demo
there"*). draw/000 was synth/050 until then; /synth/sound/ is Sound design since 2026-10-13.
draw/000 XY filter moved to /archive/ 2026-10-12 (*"Revert xy changes, archive cy and draw"*), and the draw group with it.
```

<a id="clock"></a>

## `concept-list.mjs` clock group archived

```text
clock/000, 010 and 020 moved to /archive/ 2026-10-13 (*"archvie clock group"*), the clock group with them.
```

<a id="llhls"></a>

## `concept-list.mjs` LL-HLS loopback

```text
video/060 split out of video/030 2026-10-12 (*"Split hls and webrtc loopbacks"*). Not 040: /archive/ labels the archived TV page `video 040`.
```

<a id="tv"></a>

## `concept-list.mjs` TV archived

```text
video/040 TV moved to /archive/ 2026-10-12 (*"arhice https://positron.studio/concepts/video/040/"*).
```

<a id="shader-remote"></a>

## `concept-list.mjs` Shader on Pi

```text
remote/shader moved here as shader/remote 2026-10-13 (*"Move pi shader to remote shaders under shaders"*); the old URL 404s.
```

<a id="pico"></a>

## `concept-list.mjs` removed: shader/010 and Pico router

```text
shader/010 moved to remote/050 2026-10-13 (*"yea, move them all to remote instruments or stm"*); the old URL 404s (no forwarding).
device/000 Pico router moved to /archive/ 2026-10-12 (*"archive https://positron.studio/concepts/device/000/"*).
```

<a id="room-chat"></a>

## `concept-list.mjs` room chat changes

```text
room/001 Chat UI removed 2026-10-12 (*"001room rm it"*); room/002 keeps the frame.
room/window Chat UI wired moved to room/chat 2026-10-13 (*"Move chat ui wired to chat.
Rm chat ui wired"*): the patchbay-only chat it replaced is gone, /room/window/ is a 404.
```

<a id="room-history"></a>

## `concept-list.mjs` room history and admin removed

```text
room/010 History and room/020 Admin removed 2026-10-11 (*"rm room 010 020
030. since we cover it right?"*): room/004 keeps the history, room/003 the
admin. Their pages are in git history before that commit.
room/030 Broadcast removed 2026-10-12 (*"rm 030room"*); video/030 keeps the WHIP and WHEP round trip.
```

<a id="sampler"></a>

## `concept-list.mjs` sampler merges

```text
sampler/010, 020 and 040 merged into 000 2026-10-12 (*"merge 000 and 010 with sc piano (and put it looper too)"*); their URLs 404 (no forwarding).
sampler/015 Sustain debugger archived 2026-10-12 (*"arcive/move to md the sampler015"*): archive/concepts/sampler-015.md.
sampler/030 moved to remote/030 2026-10-13 (*"yea, move them all to remote instruments or stm"*); the old URL 404s (no forwarding).
```

<a id="rhythm-030"></a>

## `concept-list.mjs` rhythm/030 moved

```text
rhythm/030 moved to remote/040 2026-10-13 (*"yea, move them all to remote instruments or stm"*); the old URL 404s (no forwarding).
```

<a id="drums-remote"></a>

## `concept-list.mjs` Drums on the Pi

```text
remote/drums moved here as drums/remote 2026-10-13 (*"Move drums on pi into remote drums"*), and the rhythm group became drums (*"Renamw rythm group into drums"*); the old URLs 404.
```

<a id="archives"></a>

## `concept-list.mjs` archives group

```text
clock, renumbered 2026-10-12 (*"do a cricical read on clock concepts. order it in a way it makes sense (simper -> complex, local -> remote) etc. reduce number if needed. clearer titles and descs"*):
one machine first, then the relay, then two places on one clock. Old 070 Join late merged into Shared clock;
old 040 Follow is archived at /archive/clock-follow/. The old numbers 404 (no forwarding).
clock/030 Shared clock moved to /archive/ 2026-10-12 (*"Cut it"*): both places were simulated in one tab.
clock/040 MIDI clock and clock/050 Clock drift moved to /archive/ 2026-10-12 (*"still too many clock demos, i can not distinguish"*, *"move less relevant to archive"*).
clock/060 Play together and clock/070 Replay moved to /archive/ 2026-10-12 (*"arvhice http://127.0.0.1:8890/concepts/clock/060/ http://127.0.0.1:8890/concepts/clock/070/"*).
archives (asked 2026-10-13, *"make archives concept group. do reel-demo-like patchbay version"*):
/reel/ with the newsreel and the radio as two boxes, on /reel/'s line (demo/shell/reel-line.mjs).
```

<a id="misc"></a>

## `concept-list.mjs` misc group

```text
misc, last (asked 2026-10-11, *"move bay and tutorial to last misc group"*):
bay/000, bay/010 and tutorial/000 until then, those URLs now 404.
misc/000 Announce and misc/010 Mirror archived 2026-10-12 (*"archve/md misc 000 and 010"*): archive/concepts/misc-000.md, misc-010.md.
misc/020 Tutorial slide moved to /archive/ 2026-10-12 (*"make "/arhive" page and move
csound and tutotial slide there"*): the page stays deployed, its card is on
/archive/ (demo/archive/index.html), and misc has no concept page left. It is
/archive/tutorial-slide/ since 2026-10-13, beside the other archived pages.
```

<a id="concept-dirs"></a>

## `concept-list.mjs` CONCEPT_DIRS

```text
The folders under demo/ that hold concept pages, and so the first segment of
their URLs. workers/view/build.mjs deploys each one whole and REFUSES the build
when one is also a demo slug in demo/manifest.mjs, a file the build lists, or
a row's id names a folder not here: a concept group may never take over a
still-served address. The radio concepts were `stations` for one afternoon
because the archived radio demo still answered at /radio/; asked *"Resolve
clashes"*, that demo moved to /archive/radio/ and the group took `radio`.
`room` was the archived /room/ demo until 2026-10-01 (archive/demos/room-index.html);
/room/ itself stays a 404, only /room/<slug>/ answers. `archive` is not here:
the tutorial slide moved to /archive/tutorial-slide/ with the archived pages.
```

<a id="concept-groups"></a>

## `concept-list.mjs` CONCEPT_GROUPS

```text
The demos on the front page (asked 2026-10-12, *"inegrate fronpage
index and concepts, prefering the latter"*). Every listed, built row of
DEMOS in demo/manifest.mjs is here once, under a GROUP. A concept group puts
it beside the concept pages as a demo card; a group in CASE_GROUPS puts it
below them as a use case card. Moving a demo between the two is changing its
group, one word. Kept out of CONCEPTS on purpose, so concept-nav.mjs's pager walks
the concept pages only. `say` is the card's short line; the manifest's `one`
stays the front page's. `supersededBy: '<group>/<slug>'`, a concept id, marks a concept
like demo whose idea a concept page now shows (asked 2026-10-12, *"add label
"no needed" on conceptlike demo boxes that are superceded by simular/newer
concept"*): its card reads `not needed` and names that page. Delete the field
to take the label off.
room last (asked 2026-10-13, *"move room into last group"*).
```

<a id="group-titles"></a>

## `concept-list.mjs` GROUP_TITLES

```text
`archives` is also the first of CASE_GROUPS; as a concept group it keeps the same place on
the front page (right after rhythm) and its demo rows would draw as demo cards beside /history/newsreels/.
A group's heading on the front page is its key, unless it is named here. `remote`
reads as the owner asked for it, *"remote instruments"* (2026-10-13).
performances shows as timelines (asked 2026-10-13, *"performances = timelines"*).
Asked 2026-10-13: *"split instruments group into 'building instruments' and
'instruments in code'"*: Faust synth and Collide synth, the two whose code is on the page, show under `code`.
archives shows as history (asked 2026-10-13, *"archives = hisotry"*).
```

<a id="kit"></a>

## `concept-list.mjs` kit card

```text
kit listed 2026-10-13 (*"Bring kit card to frontpage"*): its own heading, last.
```

<a id="archived-rows"></a>

## `concept-list.mjs` archived demo rows

```text
concept like: one mechanism or technology each
csound is on /archive/ since 2026-10-12, unlisted in the manifest and off this index.
fau, collide and muta archived 2026-10-13 (*"archve fau collide muta"*): still served, listed on /archive/.
mirror, dump and the streaming group (llhls, webrtc, moq, cam, capture) archived 2026-10-13
(*"arhcive mirror, streamin group (kill / stop their workers not needed), dump"*): still served, listed on /archive/.
flipper archived 2026-10-12 (*"archive flipper"*): archive/demos/flipper-index.html.
circuit, evo, twelve and pack archived 2026-10-12 (*"arvhice circuit pack evo twelev to their own group"*):
still served at their URLs, listed on /archive/ under devices.
wire and patchbay archived 2026-10-12 (*"archive wire and patchbay"*): still served, listed on /archive/.
typist, the front page demo, archived 2026-10-12 (*"archive/mdfy typist"*): archive/typist.md.
nola archived 2026-10-13 (*"arvhice nola"*): still served, listed on /archive/.
tom archived 2026-10-13 (*"archvie tom"*): still served, listed on /archive/.
time and sync archived 2026-10-12 (*"archive time and sync demos"*): still served, listed on /archive/.
draw archived 2026-10-12 with XY filter: still served, listed on /archive/.
use cases: actual content, played with the wiring in view
reel archived 2026-10-13 (*"archive reel and floor"*): still served, listed on /archive/.
floor archived 2026-10-13 (*"archive reel and floor"*): still served, listed on /archive/.
resources archived 2026-10-13 (*"archvie resourves"*): still served, listed on /archive/.
tapes archived 2026-10-13 (*"archive tapes and deck"*): still served, listed on /archive/.
making archived 2026-10-13 (*"archive making"*): still served, listed on /archive/.
partitur archived 2026-10-13 (*"sorry, archvie partitur again"*): still served, listed on /archive/.
held archived 2026-10-13 (*"Move held to archive"*): still served, listed on /archive/.
```

<a id="archived-cases"></a>

## `concept-list.mjs` archived use case rows

```text
stage archived 2026-10-13 (*"archive weight stage"*): still served, listed on /archive/.
weight archived 2026-10-13 (*"archive weight stage"*): still served, listed on /archive/.
radio archived 2026-10-13 (*"archive wish, away, radio."*): still served, listed on /archive/.
videoradio archived 2026-10-13 (*"archvie videoradio"*): still served, listed on /archive/; its picture lives on as /shader/landscape/.
knobs archived 2026-10-13 with Yoshimi: archive/demos/knobs-index.html, /knobs/ is a 404.
away archived 2026-10-13 (*"archive wish, away, radio."*): still served, listed on /archive/.
shape archived 2026-10-12 (*"archiev shape"*): still served, listed on /archive/ under devices.
wish archived 2026-10-13 (*"archive wish, away, radio."*): still served, listed on /archive/.
```

<a id="test-header"></a>

## `concept-list-test.mjs` concept-list-test module header

```text
demo/shell/concept-list-test.mjs: every card description on the front page against the
card rule in .claude/skills/positron-describe/SKILL.md. No browser.

  node demo/shell/concept-list-test.mjs

Fails on a `say` (CONCEPTS or DEMO_CARDS) over 100 characters, or holding an
em dash, a middot or a semicolon, and prints each offender with its length.
Also on a backtick: until 2026-10-12 thirty demo cards carried the plan's
evidence column (`fau/index.html:356`) as their card text, and a code path
is never card text.
Asked 2026-10-12 on the WebRTC loopback card: *"too long. make a rule to
skill"*. 100 characters is about three lines on a card at 1280 and at 375.
And, since 2026-10-13 when the concepts became the front page at
/<group>/<slug>/ (*"rename all with group/slug, rm numbers"*), every row's id:
two segments, the folder one of CONCEPT_DIRS, no number for a segment, no id
twice, and a page on disk at demo/<id>/index.html. The slug is ONE plain
lowercase word since the same evening (*"Resolve clashes. Avoid dashes on
names."*): letters only, no hyphen, never the group's own name
(/granulator/granulator/ was the case), unique in its group. It is chosen from
the title, not spelled out of it, so the title is not compared.
```

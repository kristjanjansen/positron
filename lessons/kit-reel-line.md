# Kit lessons: reel-line.mjs

The long comments cut from `demo/shell/reel-line.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-reel-line.md#<anchor>`.

<a id="header"></a>

## reel-line.mjs, file header

demo/shell/reel-line.mjs: the year of 1965 on one line, newsreels and radio
in two lanes at the days they went out. /reel/'s timeline, moved here so a
second page can have the same line without a copy of it.

Asked 2026-10-13: *"do reel-demo-like patchbay version ... timeline is same"*
(/history/newsreels/). The line is this file; what plays is the page's.

🔴 THIS FILE OPENS NOTHING AT ERR. It reads `/reel/1965.json`, which is our
own catalogue (metadata only, no media), and it draws, picks, steps and
scrubs. Every reach for arhiiv.err.ee or vod.err.ee is in a page, behind a
press, counted by that page's `reachERR`. The line hands a page two moments
and nothing else: `onPress(it)`, a press on a mark, and `onLand(it)`, a scrub
or a press on nothing that has come to rest on a broadcast. What either one
costs a broadcaster is the page's decision, made where its count is.

Every comment below came with the code from demo/reel/index.html, where it
was written; the dates and reports in them are that page's.

<a id="sentence-case"></a>

## reel-line.mjs, sentenceCase

ERR'S NEWSREEL TITLES ARE GENUINELY ALL-CAPS — 288 of 298, against 11 of
494 on the radio side. That is the film archive's own record, typed on a
card, not a rendering accident, and it is why the two columns look unlike
each other. Shouting is hard to read next to a lowercase lead, so this
page sentence-cases them FOR DISPLAY ONLY: the fixture, the link and the
slug keep exactly what ERR holds.

The limit, stated rather than hidden: with no name list there is no way to
tell a proper noun from a common one inside a shouted line, so a personal
or place name that is not the first word comes back lowercase. A title
that is already mixed-case is left untouched, which is what keeps the
radio side — where capitals mean something — exact.

<a id="sentence-case-period"></a>

## reel-line.mjs, sentenceCase, not after a full stop

NOT after a full stop. In Estonian a period is also the ordinal marker —
`1965. aasta` is "the year 1965" and the next word is lowercase — and in
a catalogue of short titles ordinals outnumber sentence ends, so
capitalising after every `.` gets "1965. Aasta esimesed abiellujad".

<a id="series"></a>

## reel-line.mjs, SERIES

ONE LANE. The other 16 films — 16 mm rushes and a few the catalogue files
under no series — are a different kind of thing recorded for a different
reason, and a lane holding "everything that is not the other lane" is a
leftovers bin rather than a lane. `AK filmikroonika` alone is a series: one
newsreel, weekly, for a year.

<a id="create-reel-line"></a>

## reel-line.mjs, createReelLine

The line. Built in two steps because /reel/ builds its transport bar on the
deck BEFORE the strip goes on the page, and that order is its DOM order.

 const line = createReelLine({ onPress, onLand });
 const bar = createTransportBar(host, line.deck, ...);   // optional
 line.mount(host, { footer: { lines: 3 } });
 await line.ready;

@param {object} o
@param {(it: object) => void} o.onPress  a press (not a drag) on a mark
@param {(it: object) => void} o.onLand   a scrub that came to rest on a
 broadcast other than the day already picked
@param {string} [o.fixture]  the catalogue, `/reel/1965.json`

<a id="the-year"></a>

## reel-line.mjs, the year

── the year ──────────────────────────────────────────────────────────────
ABSOLUTE POSITIONS, AND NEGATIVE ONES. 1965 is before the epoch, so every
position here is a negative number of milliseconds. That is the first deck
in this project ever placed outside 1970 — and it found a real bug on the
way: `createDeck` opened its playhead at 0, which for any range not
containing zero is OUTSIDE the range. Fixed in the library, not worked
around here.

<a id="halves"></a>

## reel-line.mjs, the day picked, in two halves

THE DAY THAT IS PICKED, IN ITS TWO HALVES. `current` is the one that was
chosen; a day usually brings a newsreel AND a radio programme, and a scrub
that stops over either of them has landed on the day already picked rather
than on a new one.

<a id="clip-width"></a>

## reel-line.mjs, a clip is as wide as it is long

A CLIP IS AS WIDE AS IT IS LONG.

It was a day wide until the catalogue could say otherwise, and it could not:
there is no duration field in ERR's item API. What there IS is a SHOT LIST
with real millisecond begin/end times, so the last shot's end is a real
figure — collected for 296 of the 298 films, median 2.2 min, longest 67.

That works only because clips sit at MIDDAY. A bar drawn from midnight at
its true length would claim the film went out at 00:00, which nobody knows;
from midday it says "somewhere in this day, and this long", with room either
side. The two changes are one decision.

Two films have no shot list. They draw at the median rather than at zero —
and the line under the strip says the length is unknown when you point at
one, because a bar you can see is not a number you can trust.

<a id="two-hues"></a>

## reel-line.mjs, colorOf, two hues

TWO HUES, because they are two archives. Yellow is the site's own and the
films are ours to show; radio gets teal, far enough round the circle to be
told apart at a two-pixel mark. Neither is a quality signal — nothing here
is measured — so colour carries identity only, and the playing one is the
same hue at full brightness rather than a different colour.

<a id="describe-row"></a>

## reel-line.mjs, describeRow

THREE SHORT LINES, AND IT WAS FOUR FACTS IN THREE. The date and the
length were one string with a middot holding them apart, and the fourth
line said which medium this is, which is what the lane it is drawn in is
called: the gutter beside the mark says `newsreels` or `radio` an inch
away. These are the lines the FOOTER under the strip shows, one per row,
each clipped to its own row, so a long title ellipsises rather than
wrapping and pushing the last line out of a fixed box.

<a id="days"></a>

## reel-line.mjs, every broadcast, by day

EVERY BROADCAST, BY DAY. Stepping through one lane skips whole weeks the
other lane is the only witness to, and stepping through both as a flat
list hands you the same afternoon twice — once for its film and once for
its radio — on the 283 days where both survive. So the unit is the DAY:
one press, one broadcast day, and the day brings whichever halves of it
reached us. The film represents a day when there is one, because the film
is what carries the picture.

<a id="first-from-playhead"></a>

## reel-line.mjs, first, from the playhead

⚠️ FIRST FROM WHERE THE PLAYHEAD STANDS, NOT FROM THE YEAR'S START.
The page opens on the first newsreel's day, and the radio archive
has marks days before it, so "the first" measured from 1 January
jumped the playhead BACK to a radio programme the reader never saw
on screen, and `verify.mjs`'s "play advances position" caught the
clock going backwards. Past the last mark, the very first one.

<a id="into-of"></a>

## reel-line.mjs, intoOf

⚠️ THE ARITHMETIC IS PURE AND THE STATE IS THE THIN WRAPPER ROUND IT, so
a check can grade the mapping with nothing open and nothing picked.
A position here is a moment in 1965: a clip is drawn from the day it went
out and is as wide as it is long, so `position - item.at` IS how far into
the film the playhead has got.

<a id="fit-in-year"></a>

## reel-line.mjs, fitInYear

THE VIEW STAYS INSIDE THE YEAR. Centring on a clip near either end pushed
the window past it, so the axis read 1964-12-24 on a page whose whole
subject is 1965 — empty months either side of the material, labelled with
a year that has nothing on this line. The window keeps its width and
slides inward instead of being cropped, so the zoom the reader chose
survives being near an edge.

<a id="pick"></a>

## reel-line.mjs, pick

PICK A DAY ON THE LINE. Moves the playhead, frames the view, colours the
mark, and opens NOTHING. Returns both halves of the day.

<a id="pick-zoom"></a>

## reel-line.mjs, pick, keep the zoom

KEEP THE READER'S ZOOM. Stepping re-centres on the new day at whatever
span is currently shown — it does not snap back to the opening view,
because someone who zoomed out to see the month meant it.

<a id="scrub"></a>

## reel-line.mjs, scrubbing the year

── scrubbing the year ────────────────────────────────────────────────────
🔴 THE PLAYHEAD FOLLOWS THE FINGER. THE BROADCAST NEAREST WHERE IT STOPS IS
WHAT PLAYS. Asked 2026-09-19: *"maek scrub work"*, and until then the strip
had no `onSeek` at all, so it fell back to `deck.seek`: a drag moved the
line and nothing else happened.

⚠️ THIS AXIS IS NOT `/tapes/`'S, WHICH IS WHY IT IS NOT A COPY OF IT. A
tape runs end to end, so every position on that line is inside some
recording. A year of weekly broadcasts is mostly GAP: the median newsreel
is 2.2 minutes and the next one is a week away, so almost every position a
finger can stop on has nothing under it at all. Landing on the nearest is
therefore the only reading of a scrub that can always be honoured.

⚠️ AND THE EXPENSIVE HALF WAITS FOR THE HAND TO STOP AND LET GO. `onSeek`
fires continuously through a drag; loading on every call would tear the
media element down and build it again once per broadcast crossed, which is
the lane flashing that `/tapes/` reported, and here it would also ask ERR
for a stream URL per film crossed. So the landing wants two things: 140 ms
of stillness, which is a hand that has stopped rather than one that is
still going, and a finger that is off the glass.
WHICH LANE THE FINGER IS IN. `onSeek` is handed a position and nothing
else, and the two lanes are two archives, so a drag along the radio lane
has to land on radio. The strip resolves the lane for its own hover and
does not publish it, so the y is read here off the same geometry its
`laneAt` uses: lane boxes are in canvas units, and a client y scales into
them through the canvas's rect.

<a id="nearest-of"></a>

## reel-line.mjs, nearestOf

HOW NEAR A BROADCAST IS TO A MOMENT: the distance to its SPAN, not to its
start. A mark is minutes wide against days of gap, so the two answers
differ only when somebody has zoomed right in, which is exactly when a
finger resting inside a clip means that clip.

<a id="land-scrub-held"></a>

## reel-line.mjs, landScrub, finger still down

🔴 NOTHING PLAYS UNDER A FINGER THAT IS STILL DOWN. A hand can stop for
140 ms halfway through a drag and go on, and opening a stream at that
moment is a broadcast chosen by a pause in somebody's movement rather
than by where they let go. The landing is KEPT rather than dropped: the
release below runs it.

<a id="land-scrub-on-land"></a>

## reel-line.mjs, landScrub, onLand

What a landing does is the page's: keep going if it was going, and
otherwise just pick it. A scrub across a stopped year is somebody
reading the line, and opening a stream under every finger that comes
to rest is the cost these pages exist not to impose.

<a id="mount"></a>

## reel-line.mjs, mount

Put the line on the page.
@param {Element} host
@param {object} [o]
@param {false|object} [o.footer]  the strip's footer, `{ lines: 3 }` on
 /reel/. `false` draws none, and the strip's own tooltip says the same
 three lines on hover instead.

<a id="absolute"></a>

## reel-line.mjs, mount, absolute

DECLARED, not guessed. The strip's fallback asks `range[0] > 1e12`, which
is 2001-09-09 — every date before that, and every negative one, fails it,
so 1965 would print as a duration instead of a date.

<a id="two-lanes"></a>

## reel-line.mjs, mount, two lanes

TWO LANES, ONE DAY. Both are positioned by the date they went out, so a
newsreel and a radio programme from the same day sit at the same place —
which is the thing neither archive's own interface can show you, and the
reason to put them on a line at all.

<a id="describe-hit"></a>

## reel-line.mjs, mount, describeHit

THE LANE'S OWN THREE LINES AND NOTHING ABOVE THEM. The strip's default
block opens with the lane name and the time under the pointer, which
here is `newsreels` (the gutter an inch to the left already says it) and
the date (which `describeRow` already carries), and in a three line box
that header pushed the length off the bottom. Off a mark, the default
stands, so the box still says where the pointer is.

<a id="footer"></a>

## reel-line.mjs, mount, footer

See /reel/ for why its three lines go UNDER the line rather than over
it (*"add feature to timeline: footer section"*, 2026-09-19).

<a id="press-mark"></a>

## reel-line.mjs, press a mark

PRESS A MARK TO PLAY IT.

⚠️ A PRESS, NOT A DRAG, and that became load-bearing the moment the drag
above started meaning something. A plain drag on this strip SEEKS, and the
strip stops updating its hover for the duration of one, so the hit sitting
in `hover` at the end of a drag is the mark the drag STARTED on. Without
the six pixels, every scrub would finish by playing whatever it set off
from.

<a id="press-nothing"></a>

## reel-line.mjs, press on nothing

A press on nothing is still a position: it lands on the broadcast
nearest it, exactly as a drag does. ⚠️ AND IT LANDS HERE RATHER THAN
WAITING FOR THE TIMER, because a press held longer than 140 ms has
already spent the timer while the finger was down and there is no second
one coming.

<a id="press-cancel"></a>

## reel-line.mjs, press, cancel the scrub

A press on a mark is an ANSWER, so the drag's deferred landing has
nothing left to decide. Without this the timer fires 140 ms later and
lands on whatever was nearest that pixel, which is usually the mark just
pressed and is not always it.

<a id="span"></a>

## reel-line.mjs, SPAN, a month

A MONTH. That is a view about the YEAR rather than about one film: roughly
twenty-four newsreels on screen at once, which is what makes the shape of
the series visible — weekly, all year, with the gaps where a week was
missed.

Each clip is a 2 px mark at this span, and that is the floor doing its
job rather than a failure. A 2.2-minute film in a month is 0.005 % of the
view; nothing shows that honestly AND legibly at once. So the width is
proportional wherever there is room for it to be, the floor keeps a clip
from vanishing, and the strip prints its own span so the trade is visible
instead of mysterious. Zoom in and the bars become bars.

<a id="open-on"></a>

## reel-line.mjs, open on a paired day

Open on a day where BOTH survive, so the thing the page does is visible
before anyone presses anything. Most days pair — 283 of them — but the
first newsreel of the year is not one of them, and opening on a silent
day makes the page look like it only has half the material.

🔴 THE VIEW OPENS THERE. NOTHING IS PICKED AND NOTHING IS FETCHED.
Framing the month and standing the playhead on the day costs no bytes and
says the same thing: here is where the material starts.

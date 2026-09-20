# Handoff, 2026-09-20, session 37

🔴 **DEPLOYED. The edge is on `BUILD ad85335-220332-f1f4`**, confirmed on the
edge by `deploy.mjs` itself, and
`DEMO_BASE=https://positron.studio node demo/verify.mjs making` is **38/38
against the edge**. Five deploys this session, each verified after it landed.
**The working tree is NOT clean and nothing of this session is committed**: 110
paths, including a STAGED `git mv` of `demo/held` to `demo/weight` inherited
from session 36. 767 commits, still unpushed.

🔴 **COMMIT PATH-LIMITED OR YOU WILL TAKE THE RENAME WITH YOU.**
`git commit -F msg.txt -- <paths>`. `git add`-ing by name is NOT enough: the
index already holds the rename and it shows as `R078` rather than as an edit.

⚠️ **A DEPLOY SHIPS THE WORKING TREE, NOT A COMMIT.** `workers/view/build.mjs`
does `rm -rf public/` and rebuilds from the tree. All four deploys today were
safe because everything in the tree was finished work that had been asked for.

## The one that mattered: a finished page read as an unfinished one

🔴 **THE SESSION OPENED WITH A REQUEST FOR WORK THAT WAS ALREADY DONE.** *"in
making rm glued readouts and add that info to table columns"* had been carried
out by session 36 and **was sitting in the tree undeployed**, while the edge
still served `readout: { when, uploaded, via, length, picture, size }` and a
four column table. From outside there is no way to tell that from work nobody
had started.
🔴 **AND `HANDOFF.md` SAID IT WAS LIVE.** Its "What is live" table listed
`/making/` with the columns. True of the tree, false of the edge.
✅ **SO A ROW OF THAT TABLE IS A CLAIM ABOUT THE EDGE**, and the test is one
`curl` and one `grep`. **Check the edge before repeating a row of it.**

## What is live, and every row of this was measured ON THE EDGE

| | |
|---|---|
| `/making/` | two tabs, VIDEOS and IMAGES, 63 recovered pictures. **38/38** |
| `/held/` | the Held in Human score as a timeline. 45/45 |
| `/weight/` | the old `/held/`, renamed. 42/42 |
| `/stage/` `/mirror/` `/blocks/` `/reel/` `/kit/` | session 36's work, unchanged |

`https://positron.studio/making/#images`

## mimproject.org is in the Wayback Machine after all

🔴 **THE STANDING NOTE SAID `archive.org has nothing of it`.** MEASURED off the
CDX index: **2843 captures, 778 unique URLs, 421 HTML pages, 152 content pages,
2009-10-30 to 2026-02-09.** Wrong about pages and pictures.
✅ **RIGHT ABOUT VIDEO, AND THAT HALF IS NOW MEASURED RATHER THAN ASSUMED**:
**zero** mp4, mov, webm, mp3, wav or pdf in the entire index. The recordings
really do survive only on YouTube and Vimeo.
⚠️ **FOUR SITES LIVED ON ONE DOMAIN**: the project site, `taavetjansen`
(23 portfolio works), `opera` (the Eesti ajalugu opera, et/en/ru, a page per
cast member), and `images.squarespace-cdn.com`, where the 2016-2019 pages
embedded their pictures from.
🔴 **ALL FOUR HOSTS ARE DEAD AT THE DNS LEVEL.** `curl` answers `000`, not a
404. `elektron.art` and `lab.elektron.art` answer 200.

✅ **63 PICTURES ARE IN R2 AT `positron-station/mimproject-images/`**, a
separate prefix beside `mimproject/`. Verified 63/63 serving with exact byte
counts and the content-type the corpus states. 30 are 145x145 thumbnails,
flagged, because their originals were never captured.
🔴 **196 ARE GONE AND THE OPERA PHOTOGRAPHY IS THE BULK OF IT.** Referenced by
an archived page, never captured. The Jetpack CDN copies those pages embedded
are not in the Wayback Machine at all. **Ask Taavet for the files rather than
searching again.**
⚠️ **ERR AND MÜÜRILEHT HOLD OPERA PHOTOGRAPHS AND NOTHING OF THEIRS IS IN THE
BUCKET.** Different photographers, different rights. That is Kristjan's call.

🔴 **FOUR OF THE FIRST 67 WERE CASINO ADVERTS AND THE DOMAIN WAS SQUATTED, NOT
REVIVED.** Everything under `/wp-content/uploads/2025/01/` is DAGAS888, a Thai
online casino. Removed on instruction, deleted from R2, and the build now
THROWS on any row uploaded 2025 or later. **A site coming back and a site being
taken are the same shape in an index of URLs**, and `a 2025 revival` had been
written in four places before anybody opened a picture.

**In the repo**: `demo/resources/mimproject-images.json`,
`mimproject-images-measured.json`, `build-mimproject-images.mjs` (`--check`
prints and writes nothing). Keyed by `id`, never by file name.

## The sound, and the thing that was nearly missed

🔴 **ZERO AUDIO ON THE DOMAIN, CONFIRMED TWICE**: nothing in the CDX index, and
a second pass over the text of all 152 archived pages for `<audio>`, Bandcamp,
Mixcloud and Spotify found nothing either. `mim.ee` is a different organisation.
✅ **TWO SOUNDCLOUD EMBEDS SURVIVE**, both still resolving: **"Snd rktr4"** and
**"Nois4"** by *Taavet Juudas Iskariot*, from `/portfolio/my-music/`.

🔴 **AND THE BIGGEST FIND CAME OUT OF A RECOVERED PICTURE.** `plaadikaas.jpg`,
3000x3000, an ORPHAN with no page showing it. *Plaadikaas* is Estonian for
record sleeve. It belongs to **"And then you'll find it"**, Taavet Jansen,
premiered 24-12-2021, given away free and minted as an NFT.
🔴 **THE FIRST ANSWER ABOUT IT WAS WRONG AND WAS REPORTED AS FACT.** Three
probes came back 429, 406 and 301, and that was written up as *addressed, not
retrieved*. **Every one was rate limiting or a redirect.** With a real
user-agent, a ranged GET rather than HEAD, and six seconds between calls,
**five gateways answer 206** and both files came down in under four seconds.
✅ **WHAT THEY ARE**: `ATYWFI.zip` and `SLSS.zip`, 77.9 MB each, the English and
Estonian cuts. **The work IS a folder tree and the folder names are the text**,
nineteen levels deep, ending at `then you'll find / what you were looking
for.jpg`. One MP3 in each, **9:02, 44.1 kHz stereo, 170 kbit/s**.
⚠️ **NOTHING OF IT IS IN R2 AND THAT IS DELIBERATE.** Five gateways serve them
today. Copying published artwork is a decision, not a rescue.
⚠️ **TELL TAAVET**: `elektron.art`'s own download buttons are both dead, because
they point at `cloudflare-ipfs.com`, which Cloudflare retired. The content
behind them is fine.
⚠️ `elektron.signal` is 149 episodes, 12.15 GB, all MP3, live at
`feeds.captivate.fm/elektronsignal`. Hosted, current, nobody's emergency,
**nothing copied**.

## Three dead rules and one attribute, all found by measuring

🔴 **`.mk-square` LOST TO `.pos-vp { width: 100% }` ON SOURCE ORDER.** Same
specificity, later in the same `<style>` block, so a 460 px cap rendered 686 px
and pushed the list under the fold. **The fix is order, not weight.**
🔴 **AN INLINE STYLE BEATS EVERY SELECTOR, AND IT HAD KILLED A RULE THAT
EXISTED.** `shell.css` has carried `.pos-vp[data-full] .pos-vp-stage {
aspect-ratio: auto }` all along; `createVideoPanel`'s `aspect` option, added
later for `/stage/`, wrote `stage.style.aspectRatio`. It is `--vp-aspect` now,
read as `var(--vp-aspect, 16 / 9)`. **Fourth dead rule this project has
measured.**
🔴 **`[data-full]` MATCHES AN EMPTY ATTRIBUTE.** `syncFull` set `dataset.full =
''` on exit, so a panel that had been full ONCE kept `border: 0`,
`background: #000` and a stage with no aspect ratio for the rest of the page's
life. **It survived because entering is what gets tested and the wrong state is
the one AFTER leaving.** Deleted now, not emptied.
🔴 **THIRTY SIZE CELLS READ `0.0 MB`.** The recordings' formatter shows one
decimal of a megabyte; the thumbnails are 3 KB to 30 KB. Every count and every
corpus-against-itself check was green, because the rows were there and the
numbers came off real byte counts.

## `/making/` now, and two kit components changed

✅ **`tabs.mjs`'s FIRST USE IN A SHIPPED PAGE.** VIDEOS | IMAGES, a hash and
never a subpage, so pressing a tab while a recording plays does not throw the
document away. Neither tab costs a visitor anything: the `<video>` is
`preload="none"` and the `<img>` has no `src` at all.
✅ **THE SQUARE PICTURE BOX IS THE SAME COMPONENT AS THE VIDEO**,
`createVideoPanel({ aspect: '1 / 1' })`, contained by the stylesheet's own rule.
Capped at 460 px where the video is full width, because a square at full width
is 1000 px tall on a laptop and the list is how you reach the next picture.
✅ **KEYBOARD NAVIGATION IS IN `table.mjs`, SO EVERY TABLE HAS IT.** Arrows,
PageUp/Down, Home/End, Enter to open. **An arrow moves and does not open.**
`onPick` fetches, so an arrow that picked would pull 63 files for somebody
holding a key down. **Roving tabindex**: one stop per list, not sixty-three.
🔴 **AND STEPPING MOVES THE TABLE, NOT THE PAGE.** The first build called
`row.focus()` and `scrollIntoView`, **both of which scroll every ancestor
including the document**: MEASURED, the page moved on **56 of 62 steps**, so
the table slid up the window under the row. `focus({ preventScroll: true })`
plus arithmetic on the table's own `scrollTop`, with a row of margin, clamped.
⚠️ **THE OBVIOUS ASSERT PASSES THROUGH THAT BUG**: under the sabotage `0 rows
left the box`, because scrolling the page is one of the ways `scrollIntoView`
makes a row visible. The check has to name `window.scrollY`.
✅ **A FULL SCREEN PANEL DROPS ITS OWN SHAPE AND ITS CAP.** Measured in a real
browser: stage 1216x773 filling the display, aspect `auto`, and the exit **12 px
from the screen's right and bottom** rather than from the box's.

⚠️ **218/218 ACROSS ALL TEN PAGES THAT USE `table.mjs` OR `video-panel.mjs`**,
which is the check that matters for a kit change.

## What is open, and the file is `BACKLOG.md`

- **The opera photography, 196 pictures, is gone from every archive** and the
  people who made it are reachable. This is a question for a person.
- **The IPFS works are downloaded and not in R2.** Decide whether they belong
  there.
- **`elektron.signal`'s 149 episodes** are the same decision, larger.
- Session 36's open list is unchanged: `/knobs/`'s two diagram notes, `/radio/`'s
  `rates` option, a `back: true` link landing on the wrong box, a named value in
  a panel footer that is in no kit, `/items/` and `/radio/` throwing
  `createDiagram`'s return away, a table of prose that scrolls sideways on a
  phone, and the per-demo desc and middot sweeps.

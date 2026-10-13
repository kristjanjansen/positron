# Share images: Open Graph and Instagram, as a kit image

Written 2026-10-13. A plan, nothing in positron changed: no code, no build, no
deploy, no commit. Asked, in the background: *"In bg do plan for og and insta
images. We need patchbay renderer and typogtaphy to work there. See ../eccm and
../trip"*, then *"It will be a kit image"*.

**The marks.** READ is a file on this disk read today, named by path. MEASURED
is a number taken today on this laptop, with the script that took it (all of
them in the session scratchpad, against `http://127.0.0.1:8890`, every Chrome
killed and its profile removed on every path out). DOCS is Cloudflare's
documentation read today through the docs search. MEMORY is something not
checked today, marked so that a reader knows what would have to be looked up.
`../eccm` is `~/personal/eccm`, `../trip` is
`~/personal/trip`.

Counted today, not remembered: `DEMOS.length` is **55** (CLAUDE.md's header
says 57 of which 56 are built, and is stale), `CONCEPTS.length` is **42** in
**11** folders of `CONCEPT_DIRS`.

## The verdict

**Render the share images at BUILD time, in headless Chrome, from a kit page
that draws them with the site's own modules: `/kit/share/`, backed by one
shared module `demo/shell/share-card.mjs`.** The patchbay is DOM and SVG laid
out by a browser, so the only renderer that draws it without a second copy of
its layout code is a browser. The kit page is both the specimen sheet a person
looks at and the thing the build photographs, which is what *"it will be a kit
image"* asks for. `workers/view/build.mjs` gains a pass that captures one
1200 by 630 PNG per concept page plus one site card, writes them under
`og/` with a content hash in the name, and writes the Open Graph tags into
every page's head in the same copy loop that already writes the robots meta.
Instagram images are NOT deployed: they are downloaded from `/kit/share/` (or
written to `tmp/share/` by a script) and posted by hand, as trip and eccm do.

The edge route eccm and trip use, resvg wasm in a Worker, works for positron
too and was MEASURED working on the patchbay's own SVG, but only on SVG a
browser already laid out and only after every class is resolved to literal
attributes. That makes it a second rasteriser behind a browser, not a
replacement for one, so it is kept as the fallback for a day when images must
be made per request (section 6, route B). Satori is refused (section 6, route
C). Browser Run per request is refused (route D).

## 1. What positron already has

- **No share image anywhere.** `grep -rl 'property="og:' workers/view/public`
  is **0** files (MEASURED). `plans/` has no plan on og, share images, satori
  or resvg; the only hits for those words were unrelated (`plan-xr-together`,
  `plan-portable-board`, `plan-synthesis-2026-10-07`, all about sharing a
  room). `demo/shell/xr-panel.mjs:2087` has a `toDataURL('image/png')` for a
  headset panel and is not a share image (READ).
- **The robots posture already admits the preview bots.**
  `workers/view/src/index.js` lines 180 to 233 serve a `robots.txt` with one
  `User-agent` group per preview bot (`Twitterbot`, `Slackbot`,
  `Slack-ImgProxy`, `facebookexternalhit`, `meta-externalfetcher`,
  `LinkedInBot`, `Discordbot`, `TelegramBot`, `WhatsApp`) above `User-agent:
  * Disallow: /`, the one-group-per-bot form trip learned from Meta's parser
  (READ). The `X-Robots-Tag: noindex, nofollow` header in `_headers` and the
  robots meta stay as they are; preview bots do not index. So nothing about
  crawling has to change for cards to show in Slack, Telegram, WhatsApp or
  Facebook.
- **A page's head is static HTML and the shell writes the title in
  JavaScript.** `mount()` sets `document.title = \`POSITRON ${name}\``
  (`demo/shell/shell.mjs:83`) and adds the favicon link from script
  (`shell.mjs:805`). Link preview bots do not run JavaScript (MEMORY, but the
  same assumption every OG implementation makes, trip's and eccm's included).
  **So the `og:` tags cannot come from `mount()`. They have to be in the HTML
  file the edge serves.** Concept pages already carry a static `<title>`
  (`demo/synth/keyboard/index.html:8` reads `<title>Keyboard</title>`, READ).
- **The build already rewrites every page's head.** `withRobotsMeta()` in
  `workers/view/build.mjs` lines 894 to 918 inserts the robots meta after
  `<meta charset="utf-8">` in every `.html` it copies and counts what it
  patched (READ). The share tags are a sibling of that function, in the same
  loop, with the same count printed.
- **There is a precedent for a picture made in Chrome and shipped as a file.**
  `demo/favicon.ico` is β+ drawn by `drawMark()` in
  `demo/shell/brand-slides.mjs` with the brand face, rendered in Chrome and
  copied by the build (`shell.mjs` lines 795 to 804, `build.mjs` lines 817 to
  867, READ). `/kit/logo/` shows the favicon and app icon slides at the sizes
  they ship. The share card is the same idea at 1200 by 630.
- **`workers/view/public/` is committed**: **656** tracked files, **31 MB**
  (MEASURED, `git ls-files workers/view/public | wc -l`, `du -sh`). Every PNG
  the build writes lands in git history, which is the cost section 7 prices.

## 2. The patchbay renderer, and what it means for a still image

READ, `demo/shell/bay-view.mjs` (425 lines), `bay-traffic.mjs` (169),
`port-ink.mjs` (34), `patchbay.mjs` (233), `hero.mjs` (177).

- **`createBayView` draws SVG into the DOM and needs a laid out browser to do
  it.** It reads `el.clientWidth` to decide the width (`render()` returns
  early on 0), measures every label with a canvas `measureText` in the
  computed `font-family`, re-renders from a `ResizeObserver`, places the timed
  link labels with `path.getTotalLength()` and `getComputedTextLength()`, and
  styles everything through classes (`.lv-box rect { fill: var(--card2) }`,
  `.lv-pname { fill: currentColor }`, `.md-midi { color: var(--md-midi) }`).
  None of that exists outside a browser: not in workerd, not in Node, not in
  satori.
- **The medium colours are CSS custom properties**, `--md-<medium>` built from
  `MEDIUM_COLOURS` (`midi #6fb8e8`, `audio #ee9a4d`, `clock #c9ced6`, `value
  #9ad16b`, `video #e07a5f`, `program #c39af0`, `file #d68fc6`, `state
  #8a9fc4`), which `hero.mjs` `style()` adds once with `BAY_VIEW_CSS`.
- **`port-ink.mjs` colours port names with the CSS Custom Highlight API**,
  which only a browser has. Inside the bay's SVG the port names are coloured
  by their own `md-<medium>` class anyway, so a still image of the bay does not
  depend on it; a card that sets a port id as TEXT (outside the SVG) would.
- **`bay-traffic.mjs` animates the wires** with gradients moved by
  `requestAnimationFrame`, and `hero.mjs`'s stand-in feeds use `Math.random()`
  and the frame time. A still image is one frame of that.
  - MEASURED: two runs of the same capture gave **different bytes** (md5
    `5c1db417...` then `aca2f2bb...` for the OG size).
  - MEASURED: with `Math.random` pinned to 0.5 and every animation frame
    handed `t = 1000`, two runs gave **byte identical** PNGs at 1200 by 630
    and at 1080 by 1920 (md5 `aa9a2fef...` both times, `80a4b470...` both
    times). So a card is deterministic once its clock is frozen, which the
    module must do itself (section 5), and an unchanged page then produces an
    unchanged file and no git churn. ⚠️ Determinism across a Chrome UPDATE was
    not measured and is not expected; a Chrome update may re-key every card
    once.
- **The hero already has two patches, chosen by a media query.**
  `createHero()` picks `DESK` (7 links, drawn 900 wide) or `PHONE` (6 links,
  drawn 520 wide) on `matchMedia('(max-width: 560px)')` and scales to its
  column with `zoom`. That turned out to be exactly right for share images:
  a 1080 wide Instagram image drawn at 540 CSS px and device pixel ratio 2
  enters the phone query and gets the PHONE patch at twice the density
  (MEASURED, section 4).
- **Concept pages draw their own bay at load, with wires.** MEASURED at 1280
  by 900 on the local server, 2.5 s after load: `/synth/keyboard/` **3 boxes,
  2 wires**, 690 by 60; `/synth/sound/` **16 boxes, 16 wires**, 803 by 922;
  `/synth/timeline/` **4 boxes, 4 wires**, 690 by 60. 38 of the 43 concept
  folders' `index.html` import a bay view or `patchbay.mjs` (MEASURED, grep).
  But each page builds its bay in an inline script, and `window.__demo` does
  not expose it (keys were `name ready failed muted readout ... transport
  shellAsserts`, plus `synth knobs keyboard level` on sound). So a per page
  card that draws the page's OWN patch needs one shell hook: `createPatchbay`
  (or `mount()`) registering the bay it draws, for example on
  `window.__demo.bay`, so the card renderer can call `createBayView` on the
  same `nodes() / ports() / links()` at the card's size. Reading the page's
  already drawn `<svg>` back out is the other way and inherits the page's
  column width (690) and its tall stacks (922 px for sound), which a 630 px
  card cannot hold without a zoom that makes 11 px port names unreadable.

**So:** the patchbay renders in a browser, from data, at any width. For a
still image the browser is either the renderer (route A) or the layout engine
in front of another renderer (route B). There is no route where the patchbay
is drawn without a browser short of writing its layout a second time.

## 3. The typography

READ, `demo/shell/shell.css` lines 498 to 514, `demo/shell/canvas-font.mjs`,
`hero.mjs`, `.pos-hero*` at `shell.css` lines 8069 to 8080.

- **The faces are four self hosted woff2 latin subsets**:
  `jetbrains-mono-latin-400-normal.woff2` 21,168 bytes, `-600-` 21,860,
  `geist-latin-400-normal.woff2` 12,956, `-600-` 13,372, plus
  `jetbrains-mono-greek-600-normal.woff2` 4,308 for the β (MEASURED, `ls -la
  demo/shell/vendor`). Declared as `'Brand JetBrains Mono'` and `'Brand Geist'`
  and reached through `--mono` and `--sans`.
- **The wordmark is text, not a picture.** `.pos-hero-eye` is `400 13px` mono,
  `letter-spacing .14em`, uppercase, `--dim`, and the dot is a `<b>` in
  `--hi #ffd400`: `POSITRON<b>.</b>STUDIO`. The headline is `600
  clamp(32px, 7vw, 56px)/1.08` mono, `letter-spacing -.04em`, its full stop the
  same yellow. The two lines under it are Geist 400. So the wordmark needs no
  asset, only the face and the colour.
- **In Chrome every face just works.** MEASURED: in each capture
  `document.fonts` reported `Brand JetBrains Mono 400, 600` and `Brand Geist
  400, 600` loaded, from the same origin, before the frame was taken.
  `canvas-font.mjs` `whenFaces()` exists because a canvas does not reflow;
  the bay measures labels with a canvas, so a card must wait for both weights
  BEFORE it builds the bay, or the boxes are sized to the fallback face.
  `createShareCard()` awaits `document.fonts.load()` of the four, then draws.
- **For resvg or satori the faces must be TrueType.** resvg reads TTF or OTF
  and no woff2; satori reads TTF, OTF or WOFF and no woff2 (trip's
  `DEV.md` line 2428 and eccm's `tools/og-fonts.py` header, READ). MEASURED
  here: the four woff2 files convert offline with fontTools 4.66.1 (already in
  the uv cache, nothing installed) to **57,404, 57,372, 32,112 and 32,212
  bytes** of TTF. None is a variable font (no `fvar`), so eccm's instancing
  step is not needed.
- **The weight trap trip wrote down is real here too, one layer moved.** The
  600 files name themselves `JetBrains Mono SemiBold` and `Geist SemiBold` in
  name ID 1 and `JetBrains Mono` / `Geist` with subfamily `SemiBold` in name ID
  16 and 17 (MEASURED). In resvg, `font-family="JetBrains Mono"
  font-weight="600"` with both files loaded drew the semibold (MEASURED, a
  side by side render); naming the family `JetBrains Mono SemiBold` did not
  select it. So a resvg card names the typographic family and sets the
  weight, the opposite of trip's rule for its Sailec conversions.

## 4. What was measured: one kit image, four sizes, in headless Chrome

The scratch script loaded `/kit/frontpage/` (the page that already imports
`hero.mjs`), set the viewport with `Emulation.setDeviceMetricsOverride` as
`demo/shot.mjs` does, replaced the body with one frame of the target size on
`--bg`, called `createHero({ tag: 'h1' })`, waited for the faces and two
frames, and took `Page.captureScreenshot` clipped to the frame.

**At device pixel ratio 1** (the desk patch, 900 wide, at its desk sizes):

| size | navigate | compose | capture | PNG bytes | fits? |
| --- | --- | --- | --- | --- | --- |
| OG 1200 by 630 | 103 ms (first) | 33 ms | 79 ms | 69,668 | **38 px over** with 56 px padding: the hero is 556 px tall, so the bottom padding is eaten |
| square 1080 by 1080 | 40 ms | 28 ms | 84 ms | 75,287 | yes, but small: a 56 px headline on a 1080 image |
| portrait 1080 by 1350 | 41 ms | 29 ms | 106 ms | 77,597 | yes, small, the desk patch floats in the middle |
| story 1080 by 1920 | 40 ms | 29 ms | 89 ms | 80,464 | yes, small |

**At device pixel ratio 2**, the frame laid out at half the size (the phone
query enters below 561 CSS px, so the PHONE patch is drawn):

| size | CSS px | compose | capture | PNG bytes | fits? |
| --- | --- | --- | --- | --- | --- |
| OG 1200 by 630 | 600 by 315 | 32 ms | 79 ms | 61,309 | **no, 219 px over**: the hero does not fit 315 CSS px tall |
| square 1080 by 1080 | 540 by 540 | 27 ms | 88 ms | 107,479 | **no, 116 px over** |
| portrait 1080 by 1350 | 540 by 675 | 30 ms | 95 ms | 122,922 | yes, and it reads: phone patch, 4 by 2 boxes, a 2 line headline |
| story 1080 by 1920 | 540 by 960 | 30 ms | 101 ms | 127,197 | yes, with about 650 px to spare |

Chrome itself came up in **547 ms**; a whole run of four images took **1.7 s**
(MEASURED, twice). So per image the cost is about **150 to 230 ms** with a
warm browser, and 43 OG cards are **under 10 s** of build time, all four
sizes for 43 pages under 40 s. One browser, one tab, sequential.

What the pictures said (looked at, not only measured):

- **OG 1200 by 630 at 1x is the front page's hero, and it is a good card as
  it stands**: wordmark, the yellow dots, the headline on one line, the line
  and the small line, and the desk patch under them with every medium in its
  colour. It needs its own padding rule (the 38 px), not a new design.
- **Instagram portrait and story want 2x with the phone patch.** At 1x the
  type is too small for a phone screen; at 2x the phone patch fills the width.
  In the portrait the right column of boxes reaches 1057 of 1080 px, so the
  card frame owns its side padding (positron-compose), not the hero.
- **The square does not fit the hero.** Either the square drops the small line
  and uses a shorter patch, or the square is not offered. That is a visual
  decision for the owner (section 10).

**And the edge rasteriser, on the same bay** (route B, MEASURED in Node with
eccm's installed `@resvg/resvg-wasm` 2.6.2, read from `../eccm/node_modules`,
nothing installed or edited there):

- The bay's SVG serialised from the page **as is** cannot be used: it carries
  only classes, and resvg resolves no `var()`. Serialised with every element's
  computed `fill`, `stroke`, `stroke-width`, `opacity`, `font-family`,
  `font-size`, `font-weight` and gradient stops written as attributes, it
  rendered **identically in layout** to Chrome's frame: same boxes, same
  wires, same colours, same labels, JetBrains Mono and Geist from the
  converted TTFs.
- wasm **2,478,606 bytes**, `initWasm` **30 ms**; the bay alone **57 ms cold,
  18 ms warm**, 26,562 bytes; a whole 1200 by 630 card (wordmark, headline,
  one line, the bay) **48 ms cold, 32 to 37 ms warm**, 50,104 bytes.
- resvg drew `letter-spacing` and the coloured `<tspan>` dot correctly. It
  does not wrap text: a card's lines are broken by the composer, which in
  Chrome is the browser's job for free.

## 5. The kit image: what gets built

**`demo/shell/share-card.mjs`**, one shared module, built once by one agent
before any page work (CLAUDE.md, *anything shared is done once*):

```
createShareCard({ size: 'og' | 'portrait' | 'story' | 'square',
                  page: null | { id, title, say, bay } }) -> { el, ready }
```

- `size` sets the frame: OG 1200 by 630 at ratio 1, the Instagram sizes at
  half size and ratio 2. The frame's padding and placement are the card's own
  rules, written once (positron-compose).
- With no `page` it is the **site card**: `createHero()` as the front page has
  it. With a `page` it is the **page card**: the wordmark line, the page's
  title in the hero's headline style with the yellow full stop, its `say` from
  `CONCEPTS` as the line under it, and the page's own bay drawn by
  `createBayView` at the card's width with `stretch: false` and a `sizeAs` the
  card chooses, on the same `BAY_VIEW_CSS` and `MEDIUM_COLOURS` the hero adds.
- **It freezes its own clock**: the bay traffic is either not attached or fed
  one fixed frame, and nothing calls `Math.random()`, because MEASURED above a
  running feed changes the bytes on every build.
- `ready` resolves after both weights of both faces are loaded and two frames
  have passed, so a capture never photographs the fallback face.
- It reuses `hero.mjs` rather than copying it: the wordmark and the headline
  styles are `.pos-hero*`, and if `hero.mjs` needs to accept a width or a
  `phone` flag instead of reading `matchMedia`, that is a small change to
  `hero.mjs`, not a second hero.

**`/kit/share/`**, a new kit part (`demo/kit/share/index.html`, a row in
`demo/shell/kit-parts.mjs`, a card on `/kit/`): the specimen sheet. One block
per size showing the site card at its real pixel size scaled to the column,
then every concept page's OG card, each with a download link for its PNG.
With `?card=<group/slug>&size=<size>` it draws ONE card alone, unscaled, on a
bare page: that is the address the build photographs, so what the build
ships is exactly what the kit page shows. eccm's `public/social.html` is the
same idea (its `/social` page shows every page's share card and its Instagram
carousel, READ).

**The page's own bay.** One hook so the card can draw it: `createPatchbay` in
`patchbay.mjs` puts the `{ nodes, ports, links }` it was given on
`window.__demo.bay` (the shell's existing published object, asserted on by
the harness). That leaves the question of how the card page gets a concept
page's bay without loading the page as a visitor would. Two options, the
second preferred:

1. The build loads the concept page itself at a hidden 1200 by 630 viewport,
   waits for `__demo.bay`, and swaps in the card. Simple, and it runs every
   page's own setup code, which is a visit to the page (the shot rule says a
   shot is a visit, so it opens nothing a visitor's visit would not).
2. Pages that can, declare their bay as data in a module (`bay.mjs` already
   holds a bay as data with `createBay()`), and the card imports that. This is
   the cleaner end state and is a per page change, made as each page is
   touched, not a sweep.

Until a page exposes its bay, its card is the site card with the page's title
and `say`. That keeps the deploy correct from day one.

## 6. The four routes, compared

| | A. build, headless Chrome | B. build layout, resvg at the edge | C. satori + resvg at the edge | D. Browser Run at the edge |
| --- | --- | --- | --- | --- |
| patchbay | the real `createBayView`, unchanged | the real one, serialised with styles inlined at build, MEASURED working | **cannot run it**: satori takes a JSX tree with flexbox, no DOM, no `measureText`, no `ResizeObserver`, so the bay layout would be written a second time | the real one |
| fonts | the woff2 as shipped | four TTFs converted once, MEASURED 57 and 32 KB each | the same TTFs | the woff2 as shipped |
| text wrap | the browser's, `text-wrap: balance` included | composed by hand per line (trip's 80 line engine) | satori's flex text | the browser's |
| time | about 0.2 s an image on the laptop, MEASURED | 32 to 48 ms an image, MEASURED in Node | not measured | a browser start per miss, MEMORY seconds |
| runs where | `node workers/view/build.mjs`, which already runs on this laptop | a Worker route plus R2, as eccm's `src/og/route.mjs` | a Worker route | a Worker with the `BROWSER` binding |
| bundle | nothing | 2.48 MB wasm plus about 180 KB of fonts in `elektron-view`; eccm's whole Worker measured 2.85 MB, 1.10 MB gzip (READ, `../eccm/BACKLOG.md` line 25) | yoga wasm on top of that | nothing |
| cost | nothing | Worker CPU per miss (unmeasured), one R2 put per card | the same | DOCS: Free 10 browser minutes a day, 3 concurrent, a new browser every 20 s; Paid 10 hours a month then $0.09 an hour |
| fits positron | **yes**: every page is static, every card's inputs are known at build | only if images must be made per request, which nothing here needs | refused | refused |

**Why A.** positron is a static site with a committed build and no content
that changes between deploys: a page's title, `say` and bay change only when
somebody edits the page, which is followed by a build. trip and eccm render at
the edge because their content lives in a database and changes on a save; a
card there cannot be known at build. Here it can. A also keeps ONE renderer:
the card is the kit page, drawn by the site's modules, and the build is the
camera, which is the kit rule (*"It will be a kit image"*) taken literally.

**Why not C.** Satori would need the bay's layout, the hero's layout and the
type rules rewritten in its subset. That is the second copy LAYOUT.md rule 3
warns about, and it would drift on the first change to `bay-view.mjs`.

**Why not D.** A real Chrome per crawler miss, on a plan whose Free tier is
10 minutes a day, to draw a picture that was knowable at build. And it opens
a paid binding for something that costs nothing on the laptop.

**When B becomes right.** If a card ever has to carry live state (a room's
current patch, a recording that was just made), the build cannot know it.
Then the page's bay is serialised by the browser that has it and the edge
rasterises, exactly as MEASURED in section 4. Not now.

## 7. Per page or one site image

- **One site card** for every page that has no card of its own: the front
  page, every demo in `DEMOS`, every kit page, `/archive/*`. 1200 by 630, the
  hero as the front page draws it.
- **One card per concept page**, 42 today (the rows of `CONCEPTS`), because
  those are the pages a person shares and each one is one patchbay idea that a
  picture of its own bay explains. `unlisted` pages (`/room/words/` and the
  like) get the site card.
- **Instagram images are not per page and not deployed.** Instagram is not an
  Open Graph consumer; trip posts by hand (*"Posting stays manual"*, READ,
  `../eccm/plans/plan-eccm-social-images.md` section 1 quoting trip's
  worklog) and eccm's `/og/t/` and `/og/tp1/` cards exist to be downloaded
  (READ, `../eccm/src/og/route.mjs`). Here: `/kit/share/` draws any page's
  portrait or story card and offers the PNG; `node demo/share.mjs <group/slug>
  --size portrait` writes it to `tmp/share/` for whoever posts. Not in
  `public/`, so not in git and not in the deploy.

**Files and bytes.** 43 OG PNGs at the MEASURED 60 to 80 KB is about **3 MB**
added to `public/` once. With the frozen clock an unchanged page gives an
unchanged file, so a build changes only the cards of pages that changed. A
`TEMPLATE_V` bump or a Chrome update rewrites all 43 once, about 3 MB of
history each time.

## 8. How the tags get into the pages, and the URL

**In `build.mjs`, not in `shell.mjs`.** A sibling of `withRobotsMeta()`,
`withShareMeta(src, text)`, inserts after the charset line, for every `.html`
it copies:

```html
<meta property="og:site_name" content="positron">
<meta property="og:type" content="website">
<meta property="og:title" content="Keyboard">
<meta property="og:description" content="Play a sine synthesizer from the on-screen keys or a MIDI keyboard plugged into this computer.">
<meta property="og:url" content="https://positron.studio/synth/keyboard/">
<meta property="og:image" content="https://positron.studio/og/synth-keyboard-1a2b3c4d.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="Keyboard, its patchbay: web:keys midi-out to the sine synth">
<meta name="twitter:card" content="summary_large_image">
```

- Title and description come from `CONCEPTS` (`title`, `say`) for a concept
  page, from the page's `<title>` and its manifest `one` line for a demo, and
  from `HERO` in `hero.mjs` for the site card. The build already imports
  `CONCEPTS` (`build.mjs:75`). A page that already carries `og:image` in its
  own source is left alone, as `withRobotsMeta` leaves a page with a robots
  meta alone, and the count of patched pages is printed.
- **The image URL carries a hash and changes when the card does**, because
  Facebook, LinkedIn and Slack cache a preview by URL and refetch only on a
  debugger's *Scrape Again* (READ, eccm plan section 5, trip's
  `plans/og-cards.md`). The hash is 8 hex of FNV-1a over what the card shows
  (title, say, the bay's links, size) plus `TEMPLATE_V`, trip's and eccm's
  contract (`../eccm/src/og/card.mjs`, `TEMPLATE_V = 17` there today, READ).
  Since the files are static assets, a stale URL is simply a 404 after the
  next deploy, which is acceptable: a scraper that cached the old URL keeps
  its cached bytes.
- Absolute URLs on `https://positron.studio`, not the `workers.dev` name.
- `shell.mjs` `mount()` does not need to change. If anything, it could read
  the tags for the feedback form; nothing asks for that.

## 9. Cache and cost

- Static assets: the edge serves the PNGs like every other file, no Worker
  invocation, no R2, no CPU. A hashed name can be served `immutable` for a
  year; `_headers` (written by `build.mjs:888`) gains one `/og/*` block.
- Build time: under 10 s for 43 OG cards on this laptop (MEASURED rate), one
  headless Chrome, killed in a `finally` and on `exit` like `demo/shot.mjs`,
  temp profile removed. The pass needs the dev server or a file server on the
  checkout; it uses only the local origin and opens nothing external.
- Money: zero. Route B would add Worker CPU per miss and R2 operations within
  free tiers (eccm's plan section 9); route D would add browser hours.
- ⚠️ The build gets slower and gains a dependency on Chrome being present.
  `build.mjs` refuses a build in several named ways already; it refuses this
  one with a message too if Chrome is missing, rather than shipping pages
  whose `og:image` 404s. Or the pass is a separate `node demo/share.mjs --og`
  whose output the build copies, so `build.mjs` stays browser free and refuses
  when a card it needs is missing or stale (hash mismatch). The second shape
  is preferred: it is how the Faust AOT and the SynthDefs are handled
  (`checkFaustAot()`, the PROVENANCE files, READ `build.mjs` lines 1100 to
  1180).

## 10. Steps, in order

1. `demo/shell/share-card.mjs` with the site card only, frozen clock, faces
   awaited. `/kit/share/` showing it at four sizes. Shot with `demo/shot.mjs
   kit/share 375 1280`. One agent, before anything else.
2. The owner looks at `/kit/share/` and decides: the square at all or not;
   the padding; whether a page card is the hero's type with the page's bay,
   or something else. **Nothing visual is decided by this plan beyond reusing
   the hero.**
3. `demo/share.mjs`: loads `/kit/share/?card=...&size=...` for every card,
   captures, names by hash, writes `demo/share/og/*.png` plus a small JSON
   index (`id -> file, hash`), like the favicon is a committed source file.
4. `build.mjs`: copy `demo/share/og/` to `public/og/`, `withShareMeta()` on
   every page, refuse on a missing card, `_headers` block. Deploy.
5. The bay hook in `patchbay.mjs` and page cards with the page's own patch,
   per page as pages are touched; until then the page card is title and `say`
   over the site's patch.
6. After deploy: paste one URL in Slack and one in Telegram (the owner's own
   accounts), and one Facebook Sharing Debugger fetch. No external service
   is polled by a script.

## 11. Refused, and why

- **Satori.** It cannot run the patchbay, so it would need a second layout of
  the bay and the hero. The project's rule against second copies decides it.
- **Rendering on request (resvg, satori or Browser Run) as the first route.**
  Every card is known at build; a request path adds a wasm, a cache, a route
  and a cost for no input the build lacks.
- **Browser Run.** DOCS: Free is 10 minutes a day and one new browser every
  20 seconds; it is a paid binding for a picture a laptop makes in 0.2 s.
- **Writing the tags from `mount()`.** Preview bots do not run the shell.
- **Deploying the Instagram sizes.** They are posted by hand; putting 4 sizes
  of 43 pages (about 170 files, about 15 MB) into a committed `public/` for
  nobody to fetch is git weight for nothing.
- **WebP or AVIF.** Scrapers reject them (trip's standing rule, READ). PNG.
- **A card made by screenshotting a live page.** A page's column, its readout
  and its controls are not a card; and a page that plays something must not be
  started to be photographed.

## 12. What could not be settled

- **The owner's visual calls**: the square, the page card's layout, whether a
  page card carries the wordmark at the top or the foot, where X's title pill
  covers the bottom left (READ, trip's `plans/og-cards.md`: X draws over the
  bottom left; Facebook, LinkedIn and WhatsApp do not).
- **Instagram's story safe zone.** MEMORY: about the top and bottom 250 px of
  a 1080 by 1920 story are covered by Instagram's own interface. Not checked
  today; the story card MEASURED here has about 650 px to spare, so it can be
  centred inside such a zone, but the number wants checking before the layout
  is fixed.
- **That every concept page's bay reads well at 1200 by 630.** MEASURED only
  three: keyboard and timeline are one row (60 px tall), sound is 922 px tall
  at 803 wide and will not fit without a smaller patch or a phone style
  stack. Which pages need a shortened picture is known only after step 5.
- **Determinism across Chrome versions.** Byte identical within one Chrome,
  MEASURED; across an update, not measured.
- **Whether preview bots fetch at all through the `noindex` header.** The
  robots.txt allows them and preview bots do not index (MEMORY, and trip
  verified Facebook and X previews on its noindex staging host, READ). One
  paste into Slack after the first deploy settles it for positron.
- **Route B's CPU time on workerd.** Measured in Node only (32 to 48 ms
  wall); eccm never read its card's CPU time from Workers Logs either (READ,
  `../eccm/BACKLOG.md` line 28). Only matters if route B is ever used.
- **Whether `hero.mjs` must take a width instead of `matchMedia`.** The
  capture worked with the viewport set to the card's CSS size; a kit page that
  shows several cards side by side at once cannot set one viewport for all,
  so the kit page either draws each size in an `<iframe>` of that size or the
  hero takes a `phone` argument. Decided when step 1 is built.

## 13. What eccm and trip already did, and what is reused

READ unless marked.

**trip** (`../trip`): `plans/og-cards.md` (shipped 2026-07-08 and 2026-07-15),
`DEV.md` lines 2380 to 2479, `plans/images.md` lines 53 to 75 and 145.
- SVG composed as a string in plain JavaScript, no satori in production,
  rasterised on workerd by `@resvg/resvg-wasm` 2.6.2 with Sailec TTFs as
  `fontBuffers` and `loadSystemFonts: false`; the wasm as a compiled module
  import, `initWasm` once per isolate.
- Render on the first fetch, memoised in R2, versioned URL
  `/og/t/{id}-{v}.png` with `v` an FNV-1a hash over the visible inputs plus
  `TEMPLATE_V`, a stale `v` 302s, a missing id 404s with `no-store`,
  `immutable` for a year, `x-og: r2|render`. A miss is about 82 ms wall, a
  card 45 to 46 KB.
- Instagram at 1080 by 1350 (`/ig/o/`), carousels 2 to 20 slides all at the
  first slide's aspect, posting manual. Square 1080 only in the prototype.
- robots.txt with one group per preview bot, after Meta's synthetic 403.
  Positron already copied this (section 1).
- `DEV.md` line 2427: *"Browser Rendering = the heavyweight fallback if
  satori's flexbox-only CSS ever pinches"*. trip had no patchbay; it never
  needed a browser.
- `vanilla-prod/bench/visual.mjs` drives `puppeteer-core` against local
  Chrome for pixel diffs, not for cards.

**eccm** (`../eccm`): `plans/plan-eccm-social-images.md` (547 lines, the full
reading of trip's pipeline), `src/og/render.mjs` (22 lines), `src/og/card.mjs`
(360), `src/og/route.mjs` (168), `tools/og-fonts.py` (67),
`public/social.html`, `src/render/chrome.mjs` lines 25 to 33 and 110.
- trip's pipeline ported to a plain Worker: `GET /og/e/{id}-{lang}-{v}.png`,
  the Cache API, then R2 `og/e/`, then a render filling both; tall 4:5 cards
  at `/og/t/` and a two card carousel at `/og/tp1/` and `/og/tp2/`; page
  cards at `/og/g/` and `/og/gt/`; a site card. `TEMPLATE_V = 17`.
- Fonts: `tools/og-fonts.py` instances the variable Instrument Sans woff2 into
  static TTFs (51,556 and 51,332 bytes), renames them, merges latin and
  latin-ext, and writes real advance widths to `src/og/metrics.mjs` so line
  breaking uses the font's own metrics. bundled as wrangler `Data` modules.
- MEASURED by eccm: bundle 2.85 MB, 1.10 MB gzip; the live Feldman card
  `x-og: render` then `cache`, 42,215 bytes (`BACKLOG.md` line 25).
- `/social` is a specimen page of every share image, the model for
  `/kit/share/`.
- No share image on admin and docs pages (`HANDOFF.md` line 40), the model
  for kit pages here getting the site card rather than their own.

**What positron reuses**: the meta tag set, the hashed URL with
`TEMPLATE_V`, the specimen page, robots (already), PNG only, Instagram as a
downloaded file. **What it does not**: the edge route, R2, the wasm and the
hand composed SVG text engine, because the browser at build time does all of
it with the site's own modules, and the patchbay leaves no other choice that
does not copy it.

## The measurement scripts

In the session scratchpad, not in the repository: `og-shot.mjs` (the four
sizes at 1x, timings, the bay SVG with computed styles inlined), a 2x variant,
`og-frozen.mjs` (the determinism check), `bays.mjs` (boxes and wires on three
concept pages), `resvg-try.mjs` and `w2.mjs` (resvg on the bay and on a whole
card, the weight test). Each launched one headless Chrome with its own temp
profile and killed it in a `finally` and on `exit`; `pgrep -fl og-shot-`
printed nothing after every run. Nothing outside `127.0.0.1:8890` was
fetched; the Cloudflare figures are from the docs search.

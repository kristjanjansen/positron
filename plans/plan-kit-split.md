# plan-kit-split: one page per kit part, each with its own card

> Asked 2026-10-06, verbatim: *"for ui, we are pressing limits of tabs in kit
> page. for your testing you have page size issue. i am proposing split page up
> to separate ones, link from frontpage cards. can be something else. plan in
> bg."* Earlier the same session: *"split kit tabs into cards and keep kit group
> / path"*, *"just link from frontpage"*, *"no link to #, separate /kit/x
> pages"*, *"no elements heading. can be kit"*.
>
> **A plan. Nothing is moved, renamed or edited by this document.** The owner
> is editing `demo/kit/index.html` (the SLIDES part) in another session, so this
> was written by reading that file and by loading it twice in a headless Chrome
> of my own; `node demo/verify.mjs kit` was run **zero** times.
>
> Every claim is marked **MEASURED** (with the command) or **READ** (from the
> code, with the line). The two probes and the parser that attributed time and
> asserts to parts are in this session's scratchpad (`probe.mjs`, `wall.mjs`,
> `attrib.mjs`, `kitscan.mjs`, `lines.mjs`); they open nothing but the local dev
> server.

## 1. The verdict

**Nine pages at `/kit/<part>/`, one per tab, nested under the `kit` slug, each
its own `DEMOS` row and its own card in the front page's `kit` group.** `/kit/`
itself becomes a small unlisted page that forwards an old `#block` link to the
part that holds it and otherwise lists the nine. The code is cut as **real
separate files** over **one shared scaffolding module**, copied part by part
into new files while the monolith is left untouched, with **SLIDES (and BRAND)
moved last**, together with the owner.

Three findings decide it, and the first one changes what the split is for:

1. **The 11 s boot is not page size. It is two parts' timed checks running
   before `ready`.** MEASURED: all 76 blocks are built about 0.34 s after
   navigation; the CPU is idle for 20.6 s of a 25 s selfcheck load. Of the 11.1 s
   to `ready`, the INPUT part's two timed check chains hold about 7.5 s and the
   TAB PAGE specimen (LAYOUT) about 3.3 s. Everything else together is under a
   second. (§4)
2. **The parts are already independent in the checks.** MEASURED by parsing the
   module: of 109 top-level check statements that read a block's holder, **107
   read holders of exactly one part**. The two exceptions are one `{ }` block
   that bundles three unrelated asserts, and the SLIDES checks reading the
   HARDWARE part's OLED helpers. (§3)
3. **Nested slugs need no new mapping.** READ: a `built: true` row named
   `kit/input` deploys `demo/kit/input/` to `/kit/input/`, links to
   `/kit/input/`, and is opened by `verify.mjs` at `/kit/input/`, through code
   that already exists. The brief's assumption that the `EXTRA` map needs an
   entry holds only for `built: false` rows with a `src`, which these are not.
   (§2)

**And the split fixes the visitor breach by deleting what caused it.** The
measuring window exists only because a closed tab has no width; with no tabs
there is nothing to open, and the scaffolding can gate every check on
`SELFCHECK` with no cost to a diagram. MEASURED today: a visitor to `/kit/` runs
**230 asserts**, presses the keyboard's Loop and its keys, types into a code
box, and sees **1 FAIL** printed in the log. (§4)

## 2. The split: which parts, which slugs, and what `/kit/` becomes

### 2.1 What is there today

MEASURED (`node lines.mjs`, an acorn walk over the module in
`demo/kit/index.html`, 13,689 lines, the module from line 520):

| part | `section()` blocks | of them slide blocks | build lines | check lines | page asserts (selfcheck run) | timed waits it owns |
| --- | --- | --- | --- | --- | --- | --- |
| input | 21 | | 718 | 1,285 | 72 | about 7.5 s (looper, compile on a pause) |
| status | 4 | | 307 | 179 | 14 | none |
| timeline | 6 | | 611 | 867 | 32 | under 0.4 s |
| layout | 6 | | 198 | 54 | 4 plus 12 from the TAB PAGE drill | about 3.3 s (TAB PAGE check pass) |
| devices | 18 | | 1,259 | 1,823 | 96 | 0.6 s (header switch) |
| hardware | 8 | | 191 plus about 300 of OLED helpers | 146 | 14, after `ready` | 2.2 s, after `ready` |
| diagram | 7 | | 250 | under 100 | 3 | none |
| slides | 5 | 27 `slideBlock` specimens | about 890 | 871 | 58 plus 5 bar drill, after `ready` | 7.3 s, after `ready` |
| brand | 1 | | about 100 | about 120 | 5, after `ready` | 0.4 s, after `ready` |
| page level | | | | 429 | 28 | |

The brief's counts (input 24, devices 19) were close; the parser reads
**21 and 18**, 76 `section()` calls in all (MEASURED: `grep -oE
"^\s*section\('[a-z]+'" demo/kit/index.html | sort | uniq -c`). The head of
the file (CSS and markup) is 512 lines and the preamble before the first block
is about 1,080.

### 2.2 One page per part, not three

The owner floated about three pages and then leaned to one per part. **One per
part wins, and the reason is the tab row itself rather than taste.**

- **Three pages keep tabs, and tabs are what cost this page its measuring
  window.** A page holding INPUT, STATUS, LAYOUT and TIMELINE still has closed
  panels, still has `createDiagram` and every rect check reading zero inside
  them, and still needs `measure()`, `settle()`, `paintedOpen` and the
  `.kit-measuring` rule (READ: lines 772 to 830). One part per page has no
  closed panel, so all of that goes.
- **The tab names are already decided, twice.** The comment above `GROUPS`
  (READ: lines 590 to 706) records the argument for each part, the one that
  failed (`basics`, *"a tab is a promise that there is something behind it"*)
  and the merge of `panel` into `devices`. A card per part reuses every one of
  those decisions; a three-way grouping would reopen them.
- **The cost is nine cards where there was one.** That is what *"split kit tabs
  into cards"* asked for.

⚠️ **BRAND IS THE THIN ONE.** One block and five asserts. It passes the
`basics` bar only because the owner made it a tab on purpose the day before
(READ: line 718). Folding it into the SLIDES page as its first block is a fair
alternative, since its logo is drawn by the slide engine and its checks are
already chained after the slides' (READ: line 12569). **Recommended: keep it as
its own page**, because it was asked for as its own tab, and ask.

### 2.3 Slugs: nested `kit/<part>`

**Rows named `kit/input`, `kit/status`, `kit/timeline`, `kit/layout`,
`kit/devices`, `kit/hardware`, `kit/diagram`, `kit/slides`, `kit/brand`,
pages at `demo/kit/<part>/index.html`.** READ, every consumer of a row's name:

| consumer | what it does with `name` | works with a slash |
| --- | --- | --- |
| `workers/view/build.mjs:593` `demoFiles()` | copies `demo/${name}/*` to `${name}/*` | yes, `demo/kit/input/` -> `kit/input/` |
| `demo/manifest.mjs:1050` `targetOf()` | link is `/${name}/` | yes, `/kit/input/` |
| `demo/verify.mjs:727`, `verify-gl.mjs:261`, `verify-quest.mjs:793` | navigate to `${BASE}/${name}/` | yes |
| `demo/verify.mjs:53` | `node demo/verify.mjs kit/input` matches by name | yes |
| `demo/verify.mjs:695` | `room=${name}-test-xxxx` in the query | yes, a slash is legal in a query and no kit page reads a room |
| `demo/server.mjs:197` | tries the repo root, then `demo/` + path | yes, `/kit/input/` -> `demo/kit/input/index.html` |
| `demo/shell/shell.mjs:82,89` | `document.title`, the `h1`, the feedback slug | yes; the `h1` reads `kit/input` |
| `workers/feedback/src/index.js:180` | stores the slug, cut at 64 | yes |
| **`demo/shot.mjs:215`** | **writes `${slug}-${w}.png` into `--out`** | **no: `kit/input-375.png` is a path into a directory that does not exist. One line, `slug.replace(/\//g, '-')`.** |

⚠️ **AND THE `kit` ROW DOES NOT SWALLOW ITS CHILDREN.** `demoFiles()` copies
only `e.isFile()` entries (READ: line 598), so `demo/kit/input/` is copied by
the `kit/input` row and never by `kit`. MEASURED that nested pages already serve
from the edge: `ls -d workers/view/public/*/*/` lists `proto/deck/`,
`proto/jam/` and five more, served at their paths.
⚠️ **`/slides/` IS TAKEN** by the unlisted archived deck (READ:
`demo/manifest.mjs:939`), which is one more reason for nesting: a flat
`kit-slides` would be a third spelling of the same word.
⚠️ **FLAT SLUGS (`kit-input`) WERE CONSIDERED AND REFUSED.** They need nothing
the nested ones do not, they break *"keep kit group / path"*, and the address
would stop saying what the page is part of.

**The card title is the name, `kit/input`.** `demoCardHTML` takes a `title`
override (READ: line 1346), and its own comment argues against using it: *"a
card that says one thing while its address says another is two names for one
page"*. The `h1` will read `kit/input` too, since `verify.mjs` asserts
`meta.name === t.name` (READ: line 776).

### 2.4 What `/kit/` becomes

**An unlisted, built, shelled page: a list of the nine parts, and a forwarder
for an old link.** `/kit/#keyboard` replaces itself with `/kit/input/#keyboard`;
`/kit/#hardware` (a part id) with `/kit/hardware/`.

- **It is cheap and something still points there.** READ, `grep -rn "kit/#"`:
  ONE live code link, `demo/slides/index.html:173` (`kit/#hardware`), and nine
  in `HANDOFF.md` and `BACKLOG.md` (`#oled-fonts`, `#tab-page`, `#hardware`,
  `#button-group`, `#instrument-panel`, `#keyboard` twice, `#video-panel`).
  Those are history and are read by people following them.
- **The block map is a second copy, so both ends assert it.** A small
  `demo/shell/kit-parts.mjs` exports `[{ part, ids }]`; the forwarder reads it,
  and every part page asserts that the ids it built are exactly its row, so a
  block added without the map goes red on the page that added it.
- ⚠️ **THE CHEAPER ALTERNATIVE IS NO FORWARDER**, which is what *"names ok,
  looper retires, no redirect"* chose for retired demos on 2026-10-04
  (`plans/plan-demo-structure.md`). Then the `kit` row is removed, `/kit/`
  404s, the one live link is repointed, and the history links die. **Asked
  rather than decided.**

## 3. How the code is cut

### 3.1 How far the parts reach into each other

MEASURED (`node kitscan.mjs`): 154 top-level `let`/`const` holders. With the
page-wide helpers set aside (`d`, `out`, `px`, `measure`, `settle`, `panels`,
`kitTabs` and a dozen like them), each holder is written and read by exactly
one part, except **`hw`**, which SLIDES and HARDWARE share.

| reach | count | what it is |
| --- | --- | --- |
| check statements reading one part's holders | **107 of 109** | movable as they are |
| a `{ }` block at line 9760 holding asserts about PRESENCE (status), VIDEO PANEL (timeline) and STEPPER (input) | 1 | three independent asserts sharing a scope; split by part |
| `slideChecks()` and the OLED ON A SLIDE block reading `hw`, `oledScreen`, `drawOled`, `hwPartsLoad` | 1 | the one real dependency; the OLED helpers become a shell module |
| `kitTabs.go(...)` | 9 calls (READ: lines 6978, 11640, 11641, 12598, 13414, 13457, 13537, 13620, 13683) | all are *open the part I am about to measure*; on its own page the part is open, so they go |
| page-level checks (28 asserts) | | 8 are about the tab row and die; the rest (every block built, no block drags the page sideways, every grouped button found by the harness selector, the stack gap, newest block first, every block has an address) run on every page from the scaffolding |

### 3.2 Three ways to cut it

| option | what it is | cost | what it buys |
| --- | --- | --- | --- |
| **A. Real files over a shared scaffolding** (recommended) | `demo/kit/<part>/index.html` each holds its own blocks, holders and checks, copied verbatim; `demo/shell/kit-page.mjs` holds `section()`, the build bookkeeping and the page-level checks; `demo/shell/kit-page.css` the `.kit-*` rules; `demo/shell/oled-view.mjs` the OLED helpers | the largest move: about 9,000 lines leave one file for nine, plus three shared modules | each page is 250 to 3,100 lines (devices largest), an agent can read one whole, a red part is one file, and no page parses code it does not run |
| B. One engine, nine entry pages | the whole module becomes `demo/shell/kit-parts.mjs` exporting a builder per part; each page imports it and builds one | about the same move, into one 12,000 line module | the boot fix, and nothing for anybody reading or editing it; the size problem moves file |
| C. One file reading its part from the path | `section()` skips other parts; every check statement grows `if (PART === 'x')`; nine rows map to one `src` through `extraPages()` (`built: false` rows) | the smallest edit: about 110 guards, and the file stays 13,689 lines | the boot fix only. And `built: false` rows are skipped by `verify.mjs` (READ: line 53), so the nine would need a new harness path, which is the flag doing double duty the `kit` row's own comment already regrets (READ: manifest line 913) |

**A, because the owner's words name both problems.** *"Pressing limits of
tabs"* is the page; *"for your testing you have page size issue"* is the file
an agent has to hold to change one block. C fixes neither of those, only the
boot. B fixes the boot and leaves the file.

⚠️ **THE MOVE IS VERBATIM.** Every comment travels with its block, the way
CLAUDE.md asks rules to move between files: the comments are where this page
keeps its measurements. What changes is mechanical and listed: the first
argument of `section()` goes; the holder declarations move to the page that
fills them; `kitTabs.go` and `measure()`/`settle()` calls go; checks go under
`SELFCHECK` (§4.3).

## 4. Boot, the measuring window and the visitor

### 4.1 Where the 11 s goes

MEASURED with `probe.mjs`: one headless load of `http://127.0.0.1:<port>/kit/?selfcheck=1`,
`verify.mjs`'s own Chrome flags, `__demo.asserts` polled every 20 ms from the
page, a CPU profile at 0.5 ms; then the same load with no flag.

| | selfcheck | visitor |
| --- | --- | --- |
| `ready` | **11.08 s** | **6.72 s** |
| asserts | 350 (0 failed) | **230 (1 failed)** |
| first block-check assert | 0.34 s | 0.25 s |
| last assert | 20.97 s | 6.72 s |
| CPU idle over the profile | 20.6 s of 25.1 s | 9.6 s of 11.0 s |
| kit module self time, all of it | 0.61 s | 0.35 s |
| heaviest build | TIMELINE, 0.35 s self (`pattern.mjs` 0.21 s more) | TIMELINE, 0.18 s |
| heaviest script | `rp2040js.mjs` 1.10 s, HARDWARE, after `ready` | none over 0.1 s |

Wall clock between asserts, charged to the part whose assert ended the wait
(MEASURED, `node wall.mjs selfcheck`):

| window | part | wall |
| --- | --- | --- |
| 0.34 s to 7.75 s, before `ready` | INPUT: compile on a pause (0.34 to 4.72 s) and the keyboard looper (2.02 to 7.75 s), interleaved | about 7.4 s |
| 7.75 s to 11.08 s, before `ready` | LAYOUT: the TAB PAGE check pass and its bar drill (2.75 s of drill alone) | about 3.3 s |
| scattered, before `ready` | devices 0.6 s, timeline 0.8 s, everything else | under 1.5 s |
| after `ready` | SLIDES 7.3 s, HARDWARE 2.2 s, BRAND 0.4 s | about 9.9 s |

**So the split alone does not fix boot; where the INPUT checks run does.** On
its own page INPUT would still say `ready` at about 7.8 s, over the harness's
default 7.4 s wait (READ: `verify.mjs:742`), and would need a `bootMs`. Moved
after `d.ready()`, the way SLIDES and HARDWARE already are (READ: lines 12549
to 12577), its every gap is under the harness's 2 s of tolerated silence (the
longest MEASURED is 1.09 s) and the page is ready in well under a second.

Per page, estimated from the same run (not measured as separate pages, because
they do not exist):

| page | `ready` (selfcheck) | after `ready` | `bootMs` |
| --- | --- | --- | --- |
| kit/input | under 1 s, with its two chains moved after `ready` | about 7.5 s | none |
| kit/layout | about 3.6 s (TAB PAGE pass stays before `ready`, READ: line 12482 says why) | none | none |
| kit/devices | about 1 s | none | none |
| kit/timeline | about 1 s | none | none |
| kit/slides | about 0.5 s | about 7.3 s | none |
| kit/hardware | about 0.3 s | about 2.2 s | none |
| kit/status, kit/diagram, kit/brand | under 0.5 s | brand 0.4 s | none |

**The `bootMs: 12000` on the `kit` row goes**, and with it the comment that
says *"a page past 12 s has a build problem, not a budget one"*: it was neither.

⚠️ **THE SUITE GETS SLOWER IN TOTAL.** Nine pages each pay the harness's fixed
cost (READ: a 1.4 s sleep before the ready poll at `verify.mjs:728`, then the
2 s quiet stabiliser), so a full run spends roughly 25 to 30 s more on the kit
than today. What it buys is that touching one part runs one part.

### 4.2 The measuring window

READ, lines 772 to 830: every closed panel is laid out (`.kit-measuring
.pos-tabs-p[hidden] { display: block }`) while blocks build and checks measure,
because `createDiagram` measures its text at build time and seven diagrams once
came out *"laid out for 320 px inside a 658 px panel"*. It is ungated on
purpose, and safe only because it holds no `await`; `paintedOpen` counts frames
that would have shown every part at once.

**With one part per page there is no closed panel, so the window, the counter,
the class, the CSS rule and their two asserts are deleted, not ported.** That
is the cleanest thing in this plan: a mechanism whose comment is longer than its
code exists only to undo what the tab row does.

### 4.3 The checks a visitor runs

MEASURED, visitor load: **230 asserts run with no `?selfcheck=1`**, 228 of the
331 call sites sit outside any `if (SELFCHECK ...)` (MEASURED by the acorn walk).
Most of them only read rects, which `positron-verify` allows (*"a visit asserts
a strict subset"*). Three do what the rule forbids:

| check | what a visitor gets | READ |
| --- | --- | --- |
| COMPILE ON A PAUSE | the page types into the code box, waits, holds a note, releases it | line 7150, an ungated `(async () => {...})()` |
| the keyboard looper | the page clicks Loop and presses `a` and `d`, several turns, about 5.7 s | from line 11806 |
| a waveform on both sides | **printed as a FAIL in the visitor's log**, MEASURED today | line 11309 |

The brief also named the pad label slot as printing FAIL for a visitor; it did
**not** fail in today's visitor run, so that one is unconfirmed rather than
refuted.

**The scaffolding gates every check, read-only ones included.** CLAUDE.md:
*"A self-check never runs for a visitor. Not one, not ever, on any page."* The
only argument ever made for running them ungated on this page was the measuring
window (*"a page that measures one thing for a harness and another for a person
is a page nothing grades"*), and that argument leaves with the window. A
visitor's `/kit/input/` then builds 21 blocks and asserts nothing.

## 5. Harness and links

- **Rows.** Nine `built: true` rows in `group: 'kit'`, all with the split day as
  `created`, in the tab order, so `byNewest()` breaks the tie by array position
  and the cards read INPUT to BRAND as the tabs do (READ: manifest line 1065).
  No `bootMs` on any (§4.1). The `kit` row becomes `unlisted: true` and loses
  `bootMs`, or goes entirely if there is no forwarder (§2.4).
- **Verify.** `node demo/verify.mjs kit/devices` per page. No floor in
  `verify.mjs` reads a per-page count (READ, `grep -n floor demo/verify.mjs`:
  none), so the floors that matter are inside the page and travel with it:
  `kidsSeen >= 30` (GLUED ROWS, devices), `rings.length >= 12` (focus rings,
  stylesheet-wide, which runs ONCE, on `kit/layout`, not nine times),
  `caps.length >= 10`, `says.length >= 20`, `btns.length >= 20` (all SLIDES).
- **The count to hold each page to** is the per-part column in §2.1. Summed,
  the nine should reach 350 minus about 8 tab-row asserts plus about 6 per page
  from the scaffolding (shell's 2, every block built, no sideways drag, stack
  gap, newest first, ids match the map). **Diff each page against its row in
  that table; an unexplained drop is a check that stopped running.**
- **Links.** One live code link changes: `demo/slides/index.html:173`
  `kit/#hardware` -> `kit/hardware/`. The 221 prose mentions of `/kit/` in 78
  files (MEASURED: `grep -ro "/kit/" demo/shell demo/*/index.html .claude/skills
  | grep -v demo/kit/ | wc -l`) are left and corrected per touch, the middot
  rule's shape, except the two instructions that RUN it:
  `node demo/shot.mjs kit 375 1280` in CLAUDE.md and the `verify.mjs kit` line
  in `positron-ui`.
- **The front page title moves.** `indexTitle()` counts listed rows (READ:
  line 1333): MEASURED today *"positron: 43 media art experiments"*, which
  becomes **51**. Nine parts of a component sandbox are not eight new
  experiments; excluding the `kit` group from that count is one filter and is
  **asked, not decided**.

## 6. The front page cards

One sentence each, no colon, semicolon, dash, em dash or middot, no second fact
bolted on with *and*, and no jargon. MEASURED: of 43 listed `one` lines, 11
start with a capital and 8 end with a full stop, so these follow the majority,
lower case and no stop, as the current `kit` line does.

| card | one |
| --- | --- |
| `kit/input` | buttons, sliders, knobs, keys and fields that a visitor presses, drags or types into |
| `kit/status` | the surfaces that say how a page is doing, from a readout cell to a log line to a badge |
| `kit/timeline` | transport bars, strips and video panels for watching something play out over time |
| `kit/layout` | how blocks stack, sit in tabs and fall into cards from a wide screen down to a phone |
| `kit/devices` | instrument panels and the knobs, pads, faders and displays they are built from |
| `kit/hardware` | the Pico router's small screen and four keys, drawn by its real firmware running in the browser |
| `kit/diagram` | boxes and arrows drawn from plain data, down to a label that will not fit |
| `kit/slides` | slides made from plain data at six type sizes, with live parts of this site running on them |
| `kit/brand` | the positron logo, set large by the slide engine |

⚠️ `kit/status`'s *"from ... to ... to"* lists three surfaces of one kind and
does not add a fact; if it reads as stretched, *"readout cells, logs, tables and
badges that say how a page is doing"* is the plain list.

## 7. Order of work

The rules this follows: shared code is done once by one agent before the page
agents start; agents do not commit; nothing writes to `demo/kit/index.html`
until the last step, which is done with the owner.

0. **The owner decides four things** (§9): forwarder or none, BRAND alone or in
   SLIDES, the front page count, and whether HARDWARE boots on visit or on a
   press.
1. **One agent, the shared half.** `demo/shell/kit-page.mjs` (`createKitPage({
   name, what })` returning `section(title, note, src, build, { bare })` and
   `checkPage()` with the page-level asserts), `demo/shell/kit-page.css` (the
   `.kit-*` rules lifted from the head, lines 1 to 512), `demo/shell/oled-view.mjs`
   (`drawOled`, `oledScreen`, `oledText`, `hwPartsLoad`, `hwPart`, the two OLED
   inks, READ lines 1317 to 1590), `demo/shell/kit-parts.mjs` if there is a
   forwarder, the `shot.mjs` file name fix, and the nine manifest rows with
   **`unlisted: true`**, so `verify.mjs` can run each page while the front page
   shows none of them. The monolith keeps its own copies until step 4; that
   duplication is temporary and is named here so nobody tidies it early.
2. **Page agents in parallel**, one each for input, status, timeline, layout,
   devices, hardware and diagram. Each writes only `demo/kit/<part>/index.html`,
   copying from the monolith verbatim, then `node demo/check-html.mjs` on it and
   `node demo/verify.mjs kit/<part>` once, and reports the count against §2.1.
   INPUT moves its two timed chains after `d.ready()` and gates them; HARDWARE
   turns `hwOpen()`/`hwClose()` into the page's own start and `visibilitychange`.
   **devices first if they are serial**: it is the biggest (3,100 lines, 96
   asserts) and the one most likely to have a holder the parser filed wrong.
3. **The session**: flips the seven rows to listed, makes the `kit` row
   unlisted, builds, deploys, and quotes the stamp. `/kit/` is still the full
   monolith at this point, so the owner's SLIDES work is still at its address.
4. **With the owner, when SLIDES is quiet**: `git mv demo/kit/index.html
   demo/kit/slides/index.html`, so the file the owner has been editing keeps its
   history; delete from it everything but SLIDES and BRAND (or cut BRAND to its
   own page); write the forwarder as a new `demo/kit/index.html`; flip the last
   rows; drop `bootMs`; repoint `demo/slides/index.html:173`; deploy.

**Why SLIDES last and not first:** it is the part being edited, its checks are
the longest chain after `ready` (7.3 s), and it is the one part with a real
dependency on another (the OLED helpers), which step 1 has to have landed
before it can stand alone.

## 8. Risks

- **Two sessions writing one file.** Copy first, delete last is the whole
  defence: no agent edits `demo/kit/index.html` before step 4. ⚠️ **AND THE
  COPIES CAN GO STALE**: if the owner touches a non-SLIDES block between step 2
  and step 4, the part page lacks it. Before step 4, `git log -p --since=<step
  2> -- demo/kit/index.html` and carry any non-SLIDES hunk across.
- **A holder the parser filed under the wrong part.** It names a holder's part
  by where it is used inside a `section()` call; a holder filled by a helper
  outside any section reads as unowned. The first run of each page says so
  loudly (a `null` holder throws, `section()` records it as a block that did not
  build), and the per-part count in §2.1 is the second net.
- **A check that relied on another part being laid out beside it.** The page
  level *"no block drags the page sideways"* and *"every button in a group is
  found by the selector both harnesses press"* query `document` and today see
  all 76 blocks; on nine pages each sees its own. That is a narrower check per
  page and the same coverage in sum, not a loss.
- **`.pos-controls` order.** None of the kit blocks puts a control in that row
  (READ, the comments at lines 1046 and 1085 say so on purpose), so splitting
  moves no harness press. If HARDWARE gets a start button there (§9), it becomes
  that page's control 0.
- **The front page title** jumps from 43 to 51 unless the count is changed
  (§5).
- **History links** `/kit/#...` in `HANDOFF.md` and `BACKLOG.md` die if there is
  no forwarder.

## 9. What this plan could not settle, and why

- **Whether HARDWARE and SLIDES start on a visit.** Today each starts when its
  tab is pressed, which counted as intent (READ: lines 749 to 756). On their own
  pages the visit is the press. HARDWARE runs an emulated RP2040 flat out
  (`rp2040js.mjs`, 1.1 s of CPU in today's run), so the recommendation is a
  start button there and starting on visit for SLIDES, both pausing on
  `visibilitychange`. The owner's call.
- **Per-page `ready` times are estimates from one monolith run**, not from the
  pages, which do not exist. One `node demo/verify.mjs kit/<part>` per page in
  step 2 turns each row of §4.1 into a fact.
- **Whether the page size problem the owner meant was the file, the boot, or a
  full-page screenshot.** The first two are measured above; the scroll height of
  each part was not measured, and `node demo/shot.mjs kit/<part> 375 1280` in
  step 2 answers it.
- **The pad label slot FAIL for a visitor** named in the brief did not
  reproduce today; the waveform one did.
- **The brief's 362 asserts against today's 350** are the harness's own rows
  (contract asserts, `no console errors` and the like) counted by `verify.mjs`
  and not by the page; not re-checked, because that would have been a third
  heavy load for a number this plan does not rest on.

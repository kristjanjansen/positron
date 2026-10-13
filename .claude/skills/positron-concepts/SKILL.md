---
name: positron-concepts
description: The concept pages, small pages at /<group>/<slug>/ that each unpack one patchbay idea for a presentation, drawn as the front page's cards. Load before building or changing any concept page (demo/<group>/<slug>/, the folders in CONCEPT_DIRS), before adding a card to the front page, and before explaining a patchbay idea (site, room, node, port, link, medium, transport, a `*` link, an effect, a recorder) as a small page.
---

# Concepts pages

Written 2026-10-09 from the session that built `/concepts/misc/000/` to `/concepts/synth/010/`.
Every claim below was checked against the files that day. The pages change fast,
so check a page before quoting it.

## What they are for

An R&D presentation in half a week. The owner asked for *"simple demo pages
demo1 demo2 ... where we unpack concepts in a clear way"*, one idea per page,
numbered, kept as cards in `/concepts/`.

## Addresses, since 2026-10-13: `/<group>/<slug>/`, no numbers

🔴 **THE CONCEPTS ARE THE FRONT PAGE, AND EVERY PAGE IS `/<group>/<slug>/`.**
Instructed 2026-10-13: *"when all is done, move concepts to frontpage. use
http://127.0.0.1:8890/kit/frontpage/ on top THE HERO, LARGE. rename all with
group/slug, rm numbers"*, then *"keep same boxes style"*. This supersedes the
numbered scheme the rest of this file was written in (`/concepts/<group>/<nnn>/`,
asked 2026-10-11 as *"/concepts/group/0x"*).
- **The page is `demo/<group>/<slug>/index.html`, served at `/<group>/<slug>/`.**
- 🔴 **THE SLUG IS ONE PLAIN LOWERCASE WORD, SINCE 2026-10-13 (NIGHT).**
  Instructed: *"Resolve clashes. Avoid dashes on names."* No hyphen, no digit,
  unique in its group, and never the group's own name (`/granulator/granulator/`
  was the case that made that a rule). The word is CHOSEN from the title, not
  spelled out of it: Circuit on Pi is `/remote/circuit/`, Camera shader is
  `/video/shader/`, Live tempo is `/radio/live/`. The title keeps its words; only
  the address lost the dashes. `demo/shell/concept-list-test.mjs` fails a hyphen
  or a slug equal to its group. Until that evening the slug was the title in
  lowercase words joined by hyphens (`/remote/circuit-on-pi/`), and every one of
  those addresses is a 404, no forwarding. The table is in `positron-history`.
- **The group is the folder, and the folders are `CONCEPT_DIRS` in
  `demo/shell/concept-list.mjs`.** `workers/view/build.mjs` deploys each one whole
  and REFUSES the build when a folder is also a demo slug, a manifest page path or
  a site path, because a concept group is a top-level address now.
  🔴 **A CLASH IS RESOLVED, NOT WORKED ROUND.** For one afternoon the radio pages
  were `/stations/` because the archived radio demo still answered at `/radio/`.
  Asked *"Resolve clashes"*, the demo moved out of the way to `/archive/radio/`
  (manifest row `archive/radio`, folder `demo/archive/radio/`, the kit's
  `kit/<part>` pattern of a name with a slash, so `demo/verify.mjs archive/radio`
  still grades it against its stand-in) and the group took `radio`. MEASURED that
  night against every built manifest name, `extraPages()` and the build's fixed
  list: no other group folder takes a served address. The newsreels are
  `/history/` and show under the heading archives; a row's `group` sets the
  HEADING when it is not the folder. A new group is a new folder in
  `CONCEPT_DIRS`, checked against `ls demo` and the manifest first; when a name
  you want is taken by something archived, move the archived thing.
- **No number anywhere a visitor looks**: not on a card, not in `<title>`, not in
  `mount({ name })`, not in the pager. A row is `{ id, title, say, group? }`;
  `id` is `<group>/<slug>`, its position in `CONCEPTS` is its order, and
  `conceptNav(id)` walks that order.
- **`← concepts` goes to `/`.** Every page mounts with
  `mount({ name: '<Title>', what: '', readout: null, index: '/', indexLabel: 'concepts' })`.
- **`/concepts/` answers 302 to `/`** (workers/view/src/index.js, and
  `demo/server.mjs` locally). Every old `/concepts/<group>/<nnn>/` is a 404, by the
  no forwarding rule below. The full old to new table is in `positron-history`.
- **The shared modules live with their group** (`demo/rhythm/voices.mjs`,
  `demo/granulator/grain-rig.mjs`, `demo/code/sampler.mjs`), the list and the
  pager in `demo/shell/` (`concept-list.mjs`, `concept-nav.mjs`), and the clock kit
  the archived clock pages use at `demo/archive/clock-kit.mjs`.
- **What follows still says `/concepts/<n>/`** where it records how a page was
  built on its day. Read those as the old address of the page the table names.

- 🔴 **SPEED OVER POLISH.** The owner said *"maximum speed dx"* and *"cut your
  checks"*. A concept page is checked with `node demo/check-html.mjs
  demo/<group>/<slug>/index.html` and one look in a browser, not a harness run.
  The pages are not in `manifest.mjs`, so `demo/verify.mjs` does not grade them
  anyway.
- Local: `node demo/server.mjs`, then `http://127.0.0.1:8890/<group>/<slug>/`.
  The server 301s a slashless directory URL (`/synth/keyboard` to
  `/synth/keyboard/`) as the deploy does, so either form works.
- ⚠️ **ONE IDEA PER PAGE.** A new idea is a new page, and a new slug (a new number until 2026-10-13). Later pages copy an
  earlier one and add one thing (4 is 3 plus a store, 5 is 4 plus admin, 6 is 5
  plus a camera; 11 and 12 are 10 plus effects or a recorder), so the delta is
  the lesson.

- 🔴 **NO FORWARDING FROM AN OLD ADDRESS.** Instructed 2026-10-12: *"no old
  address forwarding"*. A concept page that moves, merges or is removed leaves
  a 404 behind, never a redirect page. Five were removed that day (sampler/010,
  020, 035, 040 and synth/050).

- 🔴 **A CONCEPT PAGE WITH A READOUT SHOWS IT ON TOP.** Instructed 2026-10-12:
  *"yeah when concept has readout move to top"*. `joined: false` in `mount()`,
  with the reason quoted beside it as the shell asks; the log stays at the foot.

- 🔴 **KNOBS ABOVE THE CODE.** Instructed 2026-10-12: *"when there are code and
  knobs on concepts, move knobs on top of code"*. Order on a synth or shader
  page: picture, knob row, code box (`CODE_ROWS` lines from `nav.mjs`), keys,
  patchbay.

## The index and a page's frame

- `demo/shell/concept-list.mjs` holds `CONCEPTS`, rows of `{ id, title, say,
  group? }` in teaching order, and `demo/index.html` (the front page) draws a
  card per row linking to `/${id}/`. (Until 2026-10-13 the rows were numbered
  and the index was `demo/concepts/index.html` at /concepts/.)
- **Titles one word or two, descs one short sentence.** Asked: *"update titles
  and descs, keep them short"*. The CLAUDE.md one sentence rule applies.
- **Cards keep one size**: `.cc-card { min-height: 110px }`. Asked: *"keep card
  size"*. Do not let a long desc grow one card.
- Every page mounts with
  `mount({ name: '<Title>', what: '', readout: null, index: '/', indexLabel: 'concepts' })`.
  Asked: *"each concept page needs link <- concepts not <- demos"*;
  `indexLabel` is the word after the arrow in `shell.mjs` and defaults to
  `demos`.
- **A new page starts with `what: ''`.** The words come when the owner asks for
  them, in the card desc first.
- Sections get a small heading, `el('h3', 'cc-h', 'links')`, with
  `.cc-h { margin: 0; font-size: 14px; color: var(--dim); font-weight: 500 }`
  and a `.cc-stack` column at `gap: 12px`.

## Deploying

- `conceptFiles()` in `workers/view/build.mjs` copies each folder of
  `CONCEPT_DIRS` whole, web extensions only, and refuses a folder that would take
  a served address. There are no manifest rows, so a new
  `demo/<group>/<slug>/` ships on the next build once its row is in
  `concept-list.mjs` (and its folder, for a new group, in `CONCEPT_DIRS`).
- Finished means deployed (CLAUDE.md): `cd workers/view && node build.mjs`,
  then `env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN node workers/view/deploy.mjs`,
  quote the BUILD stamp, and hand over `https://positron.studio/<group>/<slug>/`
  with what to look at.
- ⚠️ `workers/view/public/` is committed and a deploy ships whatever is in the
  tree, including another agent's unfinished page. Say so to peers.

## How the owner runs this work

- **"How do I improve it" is a request for a spec.** Write it in `plans/`
  (concepts so far went into `plans/plan-site-names.md` §4c to §4h), report it in
  full, and wait.
- **"do not implement, lets work it through"** stops building. Discuss only.
- A request that arrives mid-task goes in `BACKLOG.md` first.
- **Shared files are changed by one agent at a time**: `demo/shell/bay.mjs`,
  `bay-node.mjs`, `shell.mjs`, `table.mjs`, `manifest.mjs`. Page agents work
  only inside their own `demo/<group>/<slug>/`.
- **Agents never commit.** The session commits, path limited.
- **Do not willy-nilly remove UI.** Asked: *"do not just willy-nilly rm stuff
  from UI"*. The owner removes what confuses (*"rm blocks table its
  confusing"*, *"rm (sim)"*, a notice box replaced by a table); an agent asks
  before taking anything out.

## The port table

Concepts 1, 3, 4, 5 and 6 draw the room's ports the same way. Copy it from
`archive/concepts/misc-000.md` (the page was archived 2026-10-12) rather than inventing a variant.

| column | key | width | what |
| --- | --- | --- | --- |
| (no header) | `state` | 16 | live dot |
| port | `id` | grow, `hi`, `clip`, `hover: 'real'` | simulated name, real id on hover |
| who | `who` | 120 | you / Raspberry Pi / browser ab12 / CF Stream |
| dir | `dir` | 48 | `→○` in, `○→` out |
| medium | `medium` | 72 | coloured by medium |
| transport | `by` | 120 | `transports` joined with `, ` |

- **Port names are SIMULATED as `<site>:<node>:<medium>-<dir>`** on screen
  (decided in `plans/plan-site-names.md` §0 and §4c, not built on the wire).
  The real id stays on hover. A second port with the same medium and dir gets
  `-2`, but two ports that differ in ROLE are two nodes (`left:video-in`,
  `right:video-in`), not a number.
- **The port column clips, it never wraps** (`clip: true`).
- **who** reads the site's `kind` and `label` (§3), with a fallback guess from
  `place` for a sender that says neither (a Pi on older code). "you" is decided
  by the reader comparing with its own `SITE`, never sent. A browser shows as
  `browser` plus its four letters, because every tab is labelled `browser`.
- **The live dot** is `.pos-pres-dot` from `presence.mjs`, filled `var(--ok)`
  when live and an empty ring (`cc-ring`, `var(--dim2)`) when stale. Two traps,
  both hit:
  - In a table cell it needs `.pos-tbl-c .pos-pres-dot { display: inline-block;
    vertical-align: middle; }`. Outside presence's flex row the span is inline,
    ignores its width, and drew as thin lines.
  - The swap finds cells whose text is `live` or `stale`, in the BODY only
    (`.pos-tbl-body .pos-tbl-c`). The header cell is empty on purpose; do not
    turn it into a dot.
- **Simulated rows are drawn, never announced.** Cloudflare services on
  `/concepts/misc/000/` (`plans/plan-site-names.md` §4d) are page rows only, real id on
  hover reads `simulated, not announced`, and their live cell is BLANK, because
  nothing is alive to say so. No `sim` tag in the who column (*"rm (sim)"*).

### Medium colours

Defined per page as `--md-*` on `:root` and applied by adding `md-<medium>` to
any body cell whose text is a medium name. Not in `shell.css` yet; if they
stay they move there.

| medium | colour |
| --- | --- |
| midi | `#6fb8e8` |
| audio | `#ee9a4d` |
| clock | `#c9ced6` |
| value | `#9ad16b` |
| video | `#e07a5f` coral |
| program | `#c39af0` |
| file | `#d68fc6` orchid |
| state | `#8a9fc4` |

Why video is coral: it was brand yellow `--hi` first (*"conflict with brand"*),
then teal (*"teal conflicts with online"*, green is the live dot). Audio and
video are related, so they are one warm family, orange and coral.

## Tables: fixed heights, chosen per table

- **Every table that fills while you watch gets `minRows`**, so the page does
  not jump and the frame is its own empty state (`table.mjs` drops the caption
  when `minRows` is set). The count is chosen per table and was asked for
  explicitly; do not pick one number for all of them.

| table | minRows | where |
| --- | --- | --- |
| chat lines | 4 | 3, 4, 5, 6 |
| notices | 2 | 5, 6 |
| in the room | 12 | 5, 6 (4 on 3 and 4) |
| links | 6 | 10, 11 (4 on 12 in the working tree) |
| recorded notes | 6 | 12 |

- `stick: true` keeps the newest row in view on chat, notices and notes.
- `clip` plus `hover: '<field>'` puts a long value (a link's concrete pairs, a
  refusal's `why`) on hover instead of in the cell.
- Playback lights rows with the table's own `mark(fn)` and scrolls the
  table's OWN box, `scroller()`, to centre the lit row. `scrollIntoView` would
  move the whole page as well (`/synth/recorder/`, `lit()`).

## The concepts, and what each taught

**The words.** A SITE is one thing that announces (a tab, the Pi, a service). A
ROOM is one Durable Object on the relay (`studio-1`, `chat-1`). A NODE is a
part of a site (`keys`, `synth`, `screen`). A PORT is one end on a node with a
`dir` and a `medium`. A LINK is `from -> to`, held by a bay. A MEDIUM is what
flows; a TRANSPORT is what carries it (`relay`, `whep`, `whip`, `https`).

- **studio-1 is the room, and the Pi names its site after it** (`boardGraph`
  sets `site = room`). That is why nothing said "this is the Pi". The decided
  spec is `pi-1` with `kind`/`label` on the graph (§0, §3); `kind`/`label` are
  in the tree, the rename is not.
- **A `*` link is one to many** (§4h): `*` is a whole site segment, one per
  link, never matches its own site, light media other than MIDI only. A chat
  tab holds a speaker `<me>:chat:value-out -> *:chat:value-in` and a listener
  `*:chat:value-out -> <me>:chat:value-in`, and holding the listener is its consent.
- **`value` carries text**, shaped `{ of: 'text' }`. No `text` medium.
- **A light event crosses the room as one `bay.event`**: `node.emit(source, ev)`
  in `bay-node.mjs` sends it once when a link reaches another site, and the
  receiver's bay delivers only along a link it holds. A source on a site the
  sending socket never announced is refused.
- **The store is a site, the relay is not** (§4g). The relay is the room and
  keeps nothing, so it shows as the `relay` transport. `positron-store` is
  `cf-store:history:value-in/out`.
- **Admin notices** are a `notice` node with an in-port on every tab and an
  `admin:value-out` only on the admin tab (5, 6). ⚠️ **NOTHING PROVES THE ADMIN**:
  any tab can pick the admin tab, the bay checks that ports fit, not who holds
  them. That open gap is what the page asks.
- **The broadcast** (6) is the admin's camera `video-out` by WHIP to
  `cf-stream`, played by WHEP; on/off is a light `bay.event` on
  `broadcast:value-out -> *:screen:value-in`, repeated every 10 s for late
  tabs. It shares `/cam/`'s one WHIP input (409 while `/cam/` holds it).
- **An on-screen keyboard is an OUT port** (`keys:midi-out`, what it plays
  leaves it) **and an IN for its lights** (`keys:midi-in`, what it shows
  arrives). Named from the bay's side, not the hand's.
- **MIDI fx is a transform on a link; a harmonizer or octaver is PARALLEL
  links**, because a transform maps one note to one. The octaver in 11 is the
  plain link plus one `{ op: 'transpose', by }` link per added voice
  (`[0, 12, -12]`).
- **Audio fx is a node** with `audio-in` and `audio-out`, and the WebAudio graph
  follows the links: `audio()` reconnects the bus by reading `bay.links()`.
- **A low-pass filter is inaudible on a sine**, which has no overtones to take
  away. 11 and 12 use a sawtooth at gain 0.08 (the sine in 10 is 0.2).
- **A recorder is a node** (`kind: 'store'`) with `rec:midi-in` (taking the
  keys while armed) and `rec:midi-out` (playing back into the synth on a link
  of its own).

## A synth on a concept page is laid out one way

🔴 **LINEAR, AND ONLY THE KNOBS LEAVE THE LINE.** Asked 2026-10-10: *"have
standard logic for istrument panes when you lay out concept syths. they are
linear execpt knobs that are are independet in the knobs area, horiz
scrollable. no half col scope, scope is always full w"*.
- The parts of an instrument stack in one column, each at the full width of
  where it sits: the scope, the knobs area, the keyboard, the pad.
- The knobs have an area of their own, one row of boxed knobs
  (`createKnobGrid`) that scrolls sideways when it does not fit. It never
  wraps to a second row and never shares a row with a picture.
- The scope is always full width. Never a half column, never a cell beside
  the module boxes.

## Kit pieces and their traps

- **Keyboard**: `createKeyboard(host, { ...keyRange(21), base: 48, onDown,
  onUp })` is C3 to A4, 13 white keys, which fills the content width at the
  kit's 49 px minimum. 24 semitones overflowed. Ignore `how === 'midi'` in
  `onDown`/`onUp`, or lighting a key from `keys:midi-in` plays it again.
- **`createChoice`** for an effect picker (`options: [['none', false],
  ['octaver', true]]`), **`createButtonGroup`** for Join, Send, record and play.
- **`createTabs`**: the hash wins over `at`. Pages 5 and 6 read the role from
  `location.hash` first for the same reason.
- **Glyph buttons**: record `●` in red (`.cc-rec { color: var(--rec) }`, the one
  control that starts writing), stop `■`. ⚠️ `positron-ui` says `▶` U+25B6 has
  an emoji form and `►` U+25BA does not, so a play glyph is `►`.
  `/synth/recorder/` uses U+25B6 today; that is a known defect, fix it when the
  page is next touched.
- **Joining** happens on a press, never on load, and a store or camera wakes
  only on a press too (Join, Start). A concept page opens nothing on a visit.

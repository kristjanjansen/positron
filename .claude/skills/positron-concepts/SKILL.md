---
name: positron-concepts
description: The /concepts/ pages, small numbered pages that each unpack one patchbay idea for a presentation. Load before building or changing any page under demo/concepts/, before adding a card to /concepts/, and before explaining a patchbay idea (site, room, node, port, link, medium, transport, a `*` link, an effect, a recorder) as a small page.
---

# Concepts pages

Written 2026-10-09 from the session that built `/concepts/1/` to `/concepts/12/`.
Every claim below was checked against the files that day. The pages change fast,
so check a page before quoting it.

## What they are for

An R&D presentation in half a week. The owner asked for *"simple demo pages
demo1 demo2 ... where we unpack concepts in a clear way"*, one idea per page,
numbered, kept as cards in `/concepts/`.

- 🔴 **SPEED OVER POLISH.** The owner said *"maximum speed dx"* and *"cut your
  checks"*. A concept page is checked with `node demo/check-html.mjs
  demo/concepts/<n>/index.html` and one look in a browser, not a harness run.
  The pages are not in `manifest.mjs`, so `demo/verify.mjs` does not grade them
  anyway.
- Local: `node demo/server.mjs`, then `http://127.0.0.1:8890/concepts/<n>/`.
  The server 301s a slashless directory URL (`/concepts/2` to `/concepts/2/`)
  as the deploy does, so either form works.
- ⚠️ **ONE IDEA PER PAGE.** A new idea is a new number. Later pages copy an
  earlier one and add one thing (4 is 3 plus a store, 5 is 4 plus admin, 6 is 5
  plus a camera; 11 and 12 are 10 plus effects or a recorder), so the delta is
  the lesson.

## The index and a page's frame

- `demo/concepts/index.html` holds `CONCEPTS`, rows of `[title, desc, n?]` in
  teaching order. A card links to `/concepts/${n ?? i + 1}/`, so `n` lets a new
  topic start at 10 without filler rows (Keyboard is `10`).
- **Titles one word or two, descs one short sentence.** Asked: *"update titles
  and descs, keep them short"*. The CLAUDE.md one sentence rule applies.
- **Cards keep one size**: `.cc-card { min-height: 110px }`. Asked: *"keep card
  size"*. Do not let a long desc grow one card.
- Every page mounts with
  `mount({ name: 'concepts <n>', what: '', readout: null, index: '/concepts/', indexLabel: 'concepts' })`.
  Asked: *"each concept page needs link <- concepts not <- demos"*;
  `indexLabel` is the word after the arrow in `shell.mjs` and defaults to
  `demos`.
- **A new page starts with `what: ''`.** The words come when the owner asks for
  them, in the card desc first.
- Sections get a small heading, `el('h3', 'cc-h', 'links')`, with
  `.cc-h { margin: 0; font-size: 14px; color: var(--dim); font-weight: 500 }`
  and a `.cc-stack` column at `gap: 12px`.

## Deploying

- `conceptFiles()` in `workers/view/build.mjs` copies `demo/concepts/` whole,
  web extensions only. There are no manifest rows, so the pages are off the
  front page and a new `demo/concepts/<n>/` ships on the next build with no
  other edit.
- Finished means deployed (CLAUDE.md): `cd workers/view && node build.mjs`,
  then `env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN node workers/view/deploy.mjs`,
  quote the BUILD stamp, and hand over `https://positron.studio/concepts/<n>/`
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
  only inside their own `demo/concepts/<n>/`.
- **Agents never commit.** The session commits, path limited.
- **Do not willy-nilly remove UI.** Asked: *"do not just willy-nilly rm stuff
  from UI"*. The owner removes what confuses (*"rm blocks table its
  confusing"*, *"rm (sim)"*, a notice box replaced by a table); an agent asks
  before taking anything out.

## The port table

Concepts 1, 3, 4, 5 and 6 draw the room's ports the same way. Copy it from
`/concepts/1/` rather than inventing a variant.

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
  `/concepts/1/` (`plans/plan-site-names.md` §4d) are page rows only, real id on
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
| file | `#a89a8a` |
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
  move the whole page as well (`/concepts/12/`, `lit()`).

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
  tab holds a speaker `<me>:chat:out -> *:chat:in` and a listener
  `*:chat:out -> <me>:chat:in`, and holding the listener is its consent.
- **`value` carries text**, shaped `{ of: 'text' }`. No `text` medium.
- **A light event crosses the room as one `bay.event`**: `node.emit(source, ev)`
  in `bay-node.mjs` sends it once when a link reaches another site, and the
  receiver's bay delivers only along a link it holds. A source on a site the
  sending socket never announced is refused.
- **The store is a site, the relay is not** (§4g). The relay is the room and
  keeps nothing, so it shows as the `relay` transport. `positron-store` is
  `cf-store:history:in/out`.
- **Admin notices** are a `notice` node with an in-port on every tab and an
  `admin:out` only on the admin tab (5, 6). ⚠️ **NOTHING PROVES THE ADMIN**:
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
  `/concepts/12/` uses U+25B6 today; that is a known defect, fix it when the
  page is next touched.
- **Joining** happens on a press, never on load, and a store or camera wakes
  only on a press too (Join, Start). A concept page opens nothing on a visit.

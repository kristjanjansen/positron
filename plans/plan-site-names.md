# plan: a site says what it is

2026-10-09. Asked on `/concepts/1/`: *"can we imporove it. i do not what is m2
(me) m1 pi ..."*. Nothing in this plan is built. This is a spec and nothing
else.

## 0. Decided by the owner, 2026-10-09

| question | decision |
| --- | --- |
| the Pi's site id | **`pi-1`**, a second board is `pi-2` (so §4's refusal is overturned) |
| port names | **`<medium>-<dir>`**, always (§4c) |
| a browser tab's site id | **random per load**, `web-xxxx`, as today; "you" is the reader comparing with its own |
| `kind` and `label` on the graph | **yes, both** (§3) |

Not built. `/concepts/1/` SIMULATES the port names on screen only (asked: *"can
you temporarily simulate that :in :out suffixes on concept 1"*): the real id is
on hover.

## 1. The problem

A table of announced ports reads `studio-1:circuit:audio` and
`web-ab12:keys:out`. Nothing tells a reader that `studio-1` is the Raspberry Pi
or which `web-xxxx` is their own tab.

- `studio-1` is the ROOM, one Durable Object on the relay
  (`workers/relay/src/index.js:284`, `idFromName`).
- The Pi's graph uses the room as its site: `boardGraph` in
  `demo/shell/graph-registry.mjs` sets `const site = room, place = room`.
- A browser tab's site is `randomSite('web')`, which gives `web-<four>` on every
  load (`demo/shell/bay-node.mjs`).
- So the only way to tell a Pi from a browser today is to GUESS from
  `place`. `/concepts/1/` does that guess in page code right now
  (`/^studio/` means Pi, `browser` means a browser).

## 2. This was already specified and not built

`plans/plan-patchbay.md` §2.1 has:

```js
Site { id, label, kind: 'browser'|'node'|'board'|'mac', room, seenAt }
```

and says *"The human label is a separate field and is allowed to change."* The
graph that shipped is `{ v, site, place, net, nodes, ports }`. It has no `label`
and no `kind` for the site. The fix is to finish that model, not to invent a new
one.

## 3. The change (recommended): two optional fields on the graph

```js
{ v: 1, site, place, net, label, kind, nodes, ports }
```

| field | Pi board | browser tab | store (`r2`) |
| --- | --- | --- | --- |
| `kind` | `board` | `browser` | `store` |
| `label` | `Raspberry Pi` (or the board's hostname) | `browser` plus the browser and OS, e.g. `Chrome on Mac` | `recordings` |

- **"you" is not sent.** It is decided by whoever reads the list: a row is "you"
  when its site equals the reader's own `SITE`. A label saying "you" would be
  wrong on every other screen.
- **Ids do not change.** `site:node:port` stays exactly as it is, so links,
  saved patches, `address`, the 28 `studio-1:` references in
  `demo/patchbay/index.html` and the tests are untouched.
- **`v` stays 1.** Both fields are optional. A reader that sees no `kind` falls
  back to today's guess from `place`. The Pi currently running keeps working
  before it is updated.
- **`graphProblem` does not need to change.** It does not reject unknown fields.
  It should reject a `kind` outside the list, so a typo cannot pass silently.
- **`merged()` passes the two fields through** on each `sites[]` row, next to
  `site`, `stale` and `from`, so a table can show "who" without walking nodes.

### Files

| file | change |
| --- | --- |
| `demo/shell/graph-registry.mjs` | `boardGraph` adds `kind: 'board', label`; `merged().sites` carries `kind`, `label`; `graphProblem` checks `kind` |
| `demo/shell/bay-node.mjs` | nothing, or a helper `browserGraph(site)` so pages stop hand-writing `SELF` |
| `demo/patchbay/index.html` | `SELF` and `STORE` gain `kind`, `label` |
| `demo/concepts/1/index.html` | the "who" column reads `kind`/`label` instead of guessing |
| `rig/board/beat.mjs` | nothing: it calls `boardGraph`, which the board copies |
| the Pi | a rig deploy, so the Pi's own copy of `graph-registry.mjs` is the new one |

## 4. Refused, for now: renaming the Pi's site

Giving the Pi its own site id (`pi-1` and not `studio-1`) is the other way to do
it. It is not recommended now:

- It changes every port id the Pi announces, so every saved link line naming
  `studio-1:...` breaks.
- 28 references in `demo/patchbay/index.html`, plus `midi-node.mjs`'s stand-in
  board and the tests.
- It needs the Pi and the pages deployed together.
- It buys nothing the `label` field does not already buy for a reader.

If two boards ever share one room, this changes: two boards both named
`studio-1` would collide in `merged()`. That is the moment to rename. It is not
today's problem.

## 4b. Owner, 2026-10-09: saved links are not a constraint

*"i do not care about saved links"*. So the first reason in §4 is gone. The
rename is still not in the first step, because the ids and the label are
separate jobs and the label is the one a reader needs. It is now step 2 below,
not refused.

## 4c. Port names say medium and direction (step 2, with the Pi rename)

Asked: *"why this does not have :in suffix web-y27q:screen:audio"*. The third
part of an id is a free name, and it was picked two ways:

- by DIRECTION where a node has one port each way: `keys:out`, `circuit:in`,
  `recordings:in`, `recordings:out`;
- by MEDIUM where a node has several ports going the same way: `screen:audio`
  and `screen:video` (both in), `circuit:audio` (out), `gpu:program` (in).

So `screen:audio` is an input and nothing in the id says so. Direction lives
only in `dir`.

**The rule: a port name is `<medium>-<dir>`**, always, even when a node has one
port. `keys:midi-out`, `circuit:midi-in`, `circuit:audio-out`,
`screen:audio-in`, `screen:video-in`, `gpu:program-in`, `gpu:video-out`,
`recordings:audio-in`, `recordings:audio-out`.

- **Two ports that differ in ROLE are two NODES, not a number.** Asked on
  `/concepts/2/` about `screen:video-in-2`: *"what is video-in-2?"*. `/mirror/`
  has two panes on one screen; as `screen:video-in` and `screen:video-in-2` the
  number says nothing about which is which. As `left:video-in` and
  `right:video-in` the name is the role. Agreed 2026-10-09.
- A number, `audio-out-2`, is the LAST resort, for ports that really are the same
  thing twice (two identical stereo pairs). None exists today.
- `graphProblem` checks that the name starts with the port's own `medium` and
  `dir`, so a name and its fields cannot disagree.
- Done together with the Pi site rename (§4), since both change every id once:
  one rig deploy, one sweep of `demo/patchbay/index.html` (28 `studio-1:`
  references plus every port name), `midi-node.mjs`'s stand-in board, the
  patchbay link examples, and the tests.

## 4d. Cloudflare services announce too (asked 2026-10-09)

*"what about cloudflare services. do they announce. say our cam demo?"* Today
nothing under `workers/` announces. The bay sees the Pi, the Picos and browser
pages; `/cam/`'s path through Cloudflare is invisible to it. The one service
that appears is R2, and only because `/patchbay/` announces it on its behalf
into its own local registry.

**Proposal: a service is a site with `kind: 'service'`** and its own id, one per
thing a link can start or end at. For `/cam/` (read from the page's tags and
prose, NOT from tracing the code, so the ports are a first guess):

| site | label | port | transport |
| --- | --- | --- | --- |
| `cf-stream` | CF Stream | `video-in` | WHIP |
| `cf-stream` | CF Stream | `video-out` | WHEP |
| `cf-stream` | CF Stream | `video-out-2` | LL-HLS |
| `cf-moq` | CF MoQ | `video-in`, `video-out` | MoQ |
| `cf-container` | CF Container | `video-in` | RTMP |
| `cf-container` | CF Container | `video-out` | LL-HLS |
| `cf-r2` | CF R2 | `audio-in`, `audio-out` | HTTPS |

**Naming rule, asked for as consistent (*"i do not get these labels.
inconsistent"*):** a service's label is `CF <product>`, never a protocol and
never our own implementation's name. WebRTC, HLS, MoQ, RTMP are TRANSPORTS: they
live on the port, in the `transports` list the Pi already sends (its audio is
`relay, datachannel`), and a table shows them as their own column, comma joined
when a port has two. `r2` becomes `cf-r2` with the rest.

**Who sends the announce, two ways:**
1. The worker itself joins the room and announces, like the Pi. True, and costs a
   socket per service that has to be kept open (a Durable Object holding a
   relay socket, or the relay itself announcing its neighbours).
2. A page that uses the service announces it on the service's behalf, like
   `/patchbay/` does for R2. Cheap, and true only while that page is open.

Recommendation: start with 2 for `/cam/`, because nothing runs a service-side
socket today and the bay only needs the ports while somebody is looking. Move to
1 for a service that must be visible with no page open.

`kind` gains `service`. `/concepts/1/` SIMULATES the four rows above, marked
`sim`, with no network traffic.

## 4e. Mirror as a patchbay (asked on `/concepts/2/`, 2026-10-09)

`/mirror/` announces two ports and opens two links; three things it does are not
in the bay. Why: `plans/plan-routing-migration.md` line 175 sized its migration
as *"two links and the shared video opener replace its own code"*, so only what
the Pi already had ports for moved.

| missing | needs a spec change? | what to do |
| --- | --- | --- |
| the left pane, your own WebGL render | no | announce `webgl:video-out` and `left:video-in`; `TRANSPORTS.video.machine` in `bay.mjs` is already `page` |
| the knobs, `video.params` | no | `boardGraph` gives `gpu` a `value-in`; mirror announces `knobs:value-out` and sends through that link. Pi deploy, rides with step 1 |
| session control, `video.start` / `status` / `watching` | **settled by existing code** | see below |

**Session control is part of opening a link, and the kit already does it.**
`demo/shell/openers.mjs` sends `video.start` on open (line 239), `video.watching`
every 10 s (line 266), and holds the capture as a lease. Weighed against a ninth
`control` medium (commands are not a flow, every engine would need a port, it
duplicates the opener) and against leaving it outside the bay (the bay cannot
know an encoder runs, every page re-implements it). Kept.
- **The gap is size and fps**, hard coded 1280x720 at 30 in the opener. They
  become link options in the transform syntax, `{ w 1280 h 720 fps 30 }`; two
  viewers asking different sizes is the lease's question.
- `/mirror/` still sends `video.start` itself (`mirror/index.html:1677`). Likely a
  leftover duplicate of the opener's; not traced.

## 4f. A chat built only from bay blocks (asked on `/concepts/3/`, 2026-10-09)

*"make concepts 3 a minimum possible multiuser chat using patchbay blocks"*, then
*"what is missing from spec to have it"*. `/concepts/3/` works, and each gap
below is a place where it steps around the bay rather than through it.

1. **Text has no medium.** The chat borrows `value`, which is meant for numbers.
   Either `value` carries any small payload, or there is a `text` medium.
2. **No link reaches many listeners.** Links are one to one. The page sends to
   the whole room and each receiver checks after the fact that a link would have
   been accepted. Wanted: `web-xx:chat:out -> *:chat:in`, a link to anyone in the
   room with a matching port. The page shows that line now, with the concrete
   one-to-one links it stands for on hover.
3. **A light link has no rule for crossing the network.** `bay.send()` delivers
   along links inside one page only; between sites the page uses a raw
   `node.send`. Same gap as mirror's knobs (§4e). One rule for both.
4. **A person has no name.** `label` says `browser`. A chat needs a per-person
   label, which is §5's question about what a tab shows the whole room.
5. **A late joiner sees nothing earlier.** Answered in §4g.
6. **Nothing proves a line arrived.** The bay counts sent and heard per link
   inside one page; across the network nobody knows.

1 to 3 are the core: with them the chat is ports plus one `*` link and no
special code. 4 and 5 make it usable. 6 is wanted, not needed.

## 4g. The store is a site (built on `/concepts/4/`, 2026-10-09)

*"buy i can not see do relay? should it be here?"* The relay is not an end of
any link: it is the room, verbatim, keeping nothing (`workers/relay/src/index.js`
says so in its header). It shows as the TRANSPORT, `relay`, on ports that use it.

History already exists BESIDE it: `positron-store` (`workers/store/src/index.js`)
joins a room as an ordinary socket, keeps any message sent with `store: true`,
and answers `GET /room/<name>/history`. That makes it a real endpoint, so it is
a site:

```js
{ site: 'cf-store', kind: 'service', label: 'CF Store',
  ports: [ 'cf-store:history:in'  value, transports ['relay'],
           'cf-store:history:out' value, transports ['https'] ] }
```

- `/concepts/4/` announces it on the store's behalf into its own registry only,
  as `/patchbay/` does for R2, and reads history on Join after
  `POST /room/<name>/record`. A line from history is drawn with the link
  `cf-store:history:out -> <you>:chat:in`.
- Recording keeps a Durable Object awake, with a 30 minute idle stop, which is
  why it starts on a press of Join and never on a visit.
- Open: whether the store announces ITSELF into the room once recording, which
  would make it §4d's option 1 for one service, and costs nothing new because
  its socket is already in the room.

## 5. Not settled

- What the board's `label` should be: a fixed `Raspberry Pi`, its hostname, or
  something set in the rig config. Needs the owner.
- Whether a browser's label should carry the user agent at all. It is shown to
  everyone in the room.
- The `/cam/` ports in §4d are read from its description. Trace the page before building.
- Measured nothing. This is written from the code, not from a running room. What
  the Pi actually announces today has not been looked at in this session.

## 6. Cost

About 30 lines across `graph-registry.mjs` and two pages, one test case in the
registry test, and one rig deploy. The ids and the protocol version do not
change.

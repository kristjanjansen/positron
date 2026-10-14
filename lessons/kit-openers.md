# Kit lessons: openers.mjs

The long comments cut from `demo/shell/openers.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-openers.md#<anchor>`.

<a id="header"></a>

## openers.mjs, file header

demo/shell/openers.mjs: what opens a described link for real, chosen by the
transport its session names.

🔴 STEP 2 OF `plans/plan-routing-migration.md`, 2026-10-06. Eight openers and
`holdSource` lived in `/patchbay/` and nowhere else (plan §3.2), each tied to
a `web:` end, so a page that wanted to open a link had to copy them. They are
lifted here VERBATIM IN WHAT THEY SEND: the same board verbs (`input.want` and
its lease, `audio.start`, `video.start` and `video.watching`, `midi.send`,
`note.on`), the same ingest protocol, the same fetch back from R2. What
changed is how one is chosen, and who owns the page's ends.

🔴 DISPATCH IS ON `session.transport`, NOT ON THE MEDIUM (stage plan F2). The
page's own `kindOf` sent ANY video link into its screen to the Pi's
`video.start`, whatever the bay had said the link rides. Here a link's
session names a transport and only an opener for THAT transport may take it:
`relay-h264` is the board's picture, `relay` and `datachannel` its sound,
`ingest` a recording, `https` a playback, and a light link (no session) is
`bytes`. A link whose transport has no opener is refused in words, `nothing
here opens whep yet`, rather than handed to the nearest opener of its medium.
⚠️ THAT ONLY WORKS BECAUSE THE BOARD'S PORTS SAY HOW THEY TRAVEL
(`graph-registry.mjs` `BOARD_TRANSPORTS`), so the bay picks `relay-h264` from
the WHEP cell for the board's video. Without it the board's picture would be
`whep` and nothing here would open it, which is the honest answer to a port
that does not say.

🔴 A LINK OUT OF ANOTHER PAGE'S PORT IS OPENED BY THAT PAGE (`remote`), before
any transport is looked at: `/partitur/` owns its lanes, so the asker sends
`link.request` and believes the `link.state` that comes back.

⚠️ NO GUARD FOR THE HARNESS IS IN HERE, ON PURPOSE. Whether a press may open
anything is the page's policy (`/patchbay/`'s `openLink` refuses under
`?selfcheck=1`), and a page grades that guard by handing it counting openers
in place of these. Every opener here reaches real hardware or a real bucket.

<a id="by-transport"></a>

## openers.mjs, BY_TRANSPORT

🔴 WHICH OPENERS MAY TAKE A LINK, BY THE TRANSPORT ITS SESSION NAMES. A
transport missing here is one nothing in this file opens yet, and says so.

<a id="jack-transport"></a>

## openers.mjs, BY_TRANSPORT.jack

A link inside one board's JACK graph, 2026-10-11: the board applies it.

<a id="create-lease"></a>

## openers.mjs, createLease

🔴 ONE LEASE HELPER, plan §4 step 2. A board capture is a lease: asked for,
renewed every `everyMs`, and dropped by the board when nobody renews it. The
page had this inline in `holdSource`, `/away/` has its own; this is the one.
⚠️ ASK ONLY ONCE THE SOCKET IS OPEN. Measured 2026-10-04: an `input.want` sent
the moment the board was created went nowhere, the page logged `nothing
answered`, and the stream stood open at 0 frames. `createLease` is called
after the board's socket has opened, and asks at once.
@param {object} o
@param {Function} o.ask     `board.ask`: `(msg, replyType, timeoutMs) => Promise<reply|null>`
@param {string} [o.type]    the verb, `input.want`
@param {string} [o.reply]   its answer, `input.wanted`
@param {string} [o.what]    what a log line calls the thing leased
@returns {{ stop(): void, renewals(): number, last(): object|null }}

<a id="hold-source"></a>

## openers.mjs, holdSource

🔴 ONE BOARD PER SOUND, HOWEVER MANY LINKS USE IT. Listening and recording
the same input are two links and one capture: a second lease on the same
room would be a second socket asking the Pi for what it already sends. So
the source is held by count, and the last link to let go closes it.
⚠️ IT IS SILENT UNTIL A LINK SAYS OTHERWISE. The board's playout goes to
the speakers by default, and a record link alone must not play a sound
nobody linked to this screen, so the speaker edge is taken off here and the
listen link puts it back.

<a id="room-is-place"></a>

## openers.mjs, screen video, room

🔴 THE ROOM IS THE BOARD NODE'S PLACE, NOT THE PORT'S SITE. They were the
same string until 2026-10-10, when the Pi's site became `pi-1` and its
room stayed `studio-1` (plans/plan-site-names.md §0); asking the site
would send `video.start` to a room nobody is in.

<a id="video-options"></a>

## openers.mjs, screen video, options

🔴 SIZE AND RATE ARE THE LINK'S, `{ w 640, h 360, fps 15 }` (link-options.mjs).
A link with none asks 1280x720 at 30, the message this sent before. The
bay has checked them already; checked again here because a link object
can be built without the bay, and the board clamps rather than refusing.

<a id="first-viewer-wins"></a>

## openers.mjs, screen video, one encoder

⚠️ ONE ENCODER, SO THE FIRST VIEWER'S SIZE WINS. A board already drawing
answers `already: true` with the shape it is drawing, and this link gets
that shape, said in the log rather than pretended away (§4e: two viewers
asking different sizes is the lease's question, not answered here).

<a id="record"></a>

## openers.mjs, record

── recording into the store, and playing it back ──────────────────────

🔴 PLAN-UNIVERSAL-ROUTING §10 ITEM 5, *"record is a link to R2 or the store
object"*, 2026-10-04. A link into a store is opened by the page that hears
the sound: it holds the source the way listening does, taps the decoded
sound into a MediaRecorder, and ships four second pieces through ingest's
tokenless protocol (`POST /open`, `PUT /seg/<session>/<n>?fmt=webm`, `POST
/close`). Closing stops the recorder, waits for the last piece and closes
the session, which writes `manifest.json`.
⚠️ WEBM HAS NO HLS. The worker writes a playlist only for MPEG-TS, so the
playback fetches every piece and joins them into one Blob, which plays
because only the first piece carries the WebM header.

<a id="keys"></a>

## openers.mjs, keys

🔴 THE NOTES RUN THROUGH THE ROUTING CORE, WHICH IS WHAT MAKES THE PATCHBAY
ONE PATCHBAY RATHER THAN TWO DEMOS. Each open MIDI link gets its own core:
the keys are its input, the instrument its output, the link's transforms are
its ops, and the instrument's `never` list is its gate. What comes out is
what goes to the board, so a transform on the link really changes the note.
⚠️ NO `count()`: the board does not acknowledge a note, so the only number
here is what this page SENT, and a badge reading `receiving` off it would be
the queued-not-delivered count CLAUDE.md warns about.

<a id="jack"></a>

## openers.mjs, jack

🔴 A LINK INSIDE THE BOARD'S JACK GRAPH, 2026-10-11. Nothing crosses a wire
but the request: the page asks the board's room for `jack.link`, the board
resolves the two ids from its OWN announcement, applies the rows and
answers the graph read back. `count()` is the rows the board read back as
connected, which is the far side; a page that wants to know whether they
are still there asks `jack.links`.
⚠️ CLOSING UNLINKS, AND THE BOARD CUTS ONLY WHAT NOTHING ELSE WANTS: a link
that repeats the board's own chain leaves the room sounding when it closes.

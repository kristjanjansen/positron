# Kit lessons: announce

The longer comments cut from `demo/shell/announce.mjs` and `demo/shell/announce-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-announce.md#<anchor>`.

<a id="header"></a>

## `announce.mjs` module header

```text
demo/shell/announce.mjs: the one place a page says which nodes it has, to a
room it is already in.

A page's bay is `web:keys`, `web:synth`, plus whatever it draws of other
sites (`pi-1:circuit`). What it announces is only its own half, under a site
of this tab's own (`web-a1b`), in graph-registry.mjs's shape, so /connect/ and
every other registry in the room can say "this is open somewhere right now".

🔴 IT NEVER OPENS A SOCKET. `announceOn(board, bay)` rides the board's own
socket (`createBoard` in board.mjs), which a page opens on a person's press,
and a page that joins with `createBayNode` already announces through
`graphs: [...]`. A visit opens nothing (CLAUDE.md).
⚠️ UNDER `?selfcheck=` IT SAYS NOTHING unless `?relay=` points at a stand-in
on this machine, so a check never puts a graph on the real relay.
```

<a id="announceon"></a>

## `announce.mjs` announceOn

```text
Announce a page's bay on a board's socket while it is open: once on every
open (a reconnect is a new `from`), then every `everyMs`. Read again each
time, so a node the page adds later is in the next one.
⚠️ IT CANNOT HEAR `graph.ask`, because the board hands its messages to the
page; a listener hears this within `everyMs`, inside `STALE_MS`.
Stops when the board is closed.
@param {{ wire: { state: Function, stats: Function, send: Function }, close: Function }} board
@param {object} bay
@param {object} [o]  `pageGraph`'s options, plus `everyMs`, `pollMs`, `may`
```

<a id="test-header"></a>

## `announce-test.mjs` announce-test module header

```text
demo/shell/announce-test.mjs: a page's announce, in the registry's shape,
with no socket, no browser and no studio.

  node demo/shell/announce-test.mjs

MOST OF THESE ARE NEGATIVE CONTROLS (9 of 21): an announce that sent the
whole bay, the Pi's nodes included, or sent before a socket was open, or
from a check run onto the real relay, would pass every positive check here.
```

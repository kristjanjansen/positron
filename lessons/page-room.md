# Page comments: room

The full comments cut from the code under demo/ for room, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="room-1"></a>
## room-1: demo/room/broadcast/index.html, style, line 11

````css
  /* concepts room/003, THE CHAT WINDOW WITH A BROADCAST COLUMN, 2026-10-11.
     Asked: *"do room 003. move members chat the 1/3 col right. in left area
     have admin chat for broadcast messages. first in the room becomes admin.
     next ones only see broadcast messages, no composer in left"*, then *"use
     030 room wiring"*: room/030's chat, notice and admin links, without its
     camera. No history and no store since 2026-10-11 (*"no history in
     room/003"*): what was said before you joined is room/004's. */
````

<a id="room-2"></a>
## room-2: demo/room/broadcast/index.html, style, line 19

````css
  /* The chat's pieces are the kit's, demo/shell/chat-ui.mjs (asked 2026-10-11,
     *"(make it reusable) as all chat ui elements"*). Only the footer row is the page's. */
````

<a id="room-3"></a>
## room-3: demo/room/broadcast/index.html, inline script, line 44

````js
  // FIRST IN THE ROOM IS ADMIN. A tab stamps its graph with `since`, the
  // moment it joined, and every tab reads the same registry, so every tab
  // picks the same one: the live site with the earliest `since`, ties by id.
  // When that tab leaves (its graph goes stale), the next earliest takes over.
  // ⚠️ NOTHING PROVES IT, as on room/030: a clock that runs early wins, and the
  // bay checks that ports fit, not who holds them.
````

<a id="room-4"></a>
## room-4: demo/room/broadcast/index.html, inline script, line 65

````js
  // ── the links, room/030's without the camera ─────────────────────────────
  //   chat     <me>:chat:value-out -> *:chat:value-in        (speaker)
  //            *:chat:value-out -> <me>:chat:value-in        (listener)
  //   admin    <me>:admin:value-out -> *:notice:value-in     (admin only)
  //            *:admin:value-out -> <me>:notice:value-in     (every tab)
````

<a id="room-5"></a>
## room-5: demo/room/broadcast/index.html, inline script, line 121

````js
  // The broadcast area is one broadcast on show, a sign (asked 2026-10-11,
  // *"copy broadcast message rendering to 003"*); the chat is a log.
````

<a id="room-6"></a>
## room-6: demo/room/broadcast/index.html, inline script, line 160

````js
  // Clear, as on room/030 (asked 2026-10-11, *"003 add clear button to footer"*):
  // every tab in the room empties both columns.
````

<a id="room-7"></a>
## room-7: demo/room/chat/index.html, style, line 11

````css
  /* THE CHAT UI WIRED TO THE PATCHBAY, built 2026-10-11 as room/002 (*"002: wire
     in patchbay from 000 and show it"*) at /room/window/. A chat frame and
     compose box driven by the bay: two `*` links, a line crossing the room as
     one `bay.event`. The patchbay picture sits under the frame.
     Moved here 2026-10-13 (*"Move chat ui wired to chat. Rm chat ui wired"*):
     it replaces the patchbay-only chat that was /room/chat/, and /room/window/
     is a 404, no forwarding. */
````

<a id="room-8"></a>
## room-8: demo/room/chat/index.html, inline script, line 34

````js
  // ── the bay ──────────────────────────────────────────
  // Every tab is a SITE with one `chat` node and two `value` ports shaped
  // `of: text`, and holds two `*` links: a speaker and a listener. Its own
  // room, never studio-1. Nothing opens until Join is pressed.
````

<a id="room-9"></a>
## room-9: demo/room/history/index.html, style, line 11

````css
  /* concepts room/004, ROOM/003 WITH ONE BROADCAST ON SHOW, 2026-10-11. Asked:
     *"copy 003 to 004. broadcast message is a horiz vertycally centered and
     balance wrapped and supports text wrapping in the left area (not chat
     log)"*. The left area shows the latest broadcast alone, as a sign; the
     chat on the right is unchanged.

     Was room/003, THE CHAT WINDOW WITH A BROADCAST COLUMN, 2026-10-11.
     Asked: *"do room 003. move members chat the 1/3 col right. in left area
     have admin chat for broadcast messages. first in the room becomes admin.
     next ones only see broadcast messages, no composer in left"*, then *"use
     030 room wiring"*: room/030's chat, notice, admin and store links, without
     its camera. */
````

<a id="room-10"></a>
## room-10: demo/room/history/index.html, style, line 24

````css
  /* The chat's pieces are the kit's, demo/shell/chat-ui.mjs (asked 2026-10-11,
     *"(make it reusable) as all chat ui elements"*). Only the footer row is the page's. */
````

<a id="room-11"></a>
## room-11: demo/room/history/index.html, inline script, line 55

````js
  // FIRST IN THE ROOM IS ADMIN. A tab stamps its graph with `since`, the
  // moment it joined, and every tab reads the same registry, so every tab
  // picks the same one: the live site with the earliest `since`, ties by id.
  // When that tab leaves (its graph goes stale), the next earliest takes over.
  // ⚠️ NOTHING PROVES IT, as on room/030: a clock that runs early wins, and the
  // bay checks that ports fit, not who holds them.
````

<a id="room-12"></a>
## room-12: demo/room/history/index.html, inline script, line 86

````js
  // ── the links, room/030's without the camera ─────────────────────────────
  //   chat     <me>:chat:value-out -> *:chat:value-in        (speaker)
  //            *:chat:value-out -> <me>:chat:value-in        (listener)
  //   admin    <me>:admin:value-out -> *:notice:value-in     (admin only)
  //            *:admin:value-out -> <me>:notice:value-in     (every tab)
  //   store    chat and admin lines -> cf-store:history:value-in, and
  //            cf-store:history:value-out -> chat and notice (the replay)
````

<a id="room-13"></a>
## room-13: demo/room/history/index.html, inline script, line 151

````js
  // The broadcast area is one broadcast on show, a sign (asked 2026-10-11,
  // *"copy broadcast message rendering to 003"*); the chat is a log.
````

<a id="room-14"></a>
## room-14: demo/room/history/index.html, inline script, line 174

````js
  // THE HISTORY IS READ ON LOAD (asked 2026-10-11, *"load history on load.
  // when not joined, history can be played back (add trasport button
  // play/pause)"*). One GET of what positron-store kept, our own worker; the
  // recorder is only woken (the POST) on a press of Join. Before Join the
  // timeline plays the history back; Join shows all of it and goes live.
````

<a id="room-15"></a>
## room-15: demo/room/history/index.html, inline script, line 234

````js
  // Clear, as on room/030 (asked 2026-10-11, *"003 add clear button to footer"*, kept on 004):
  // the store forgets the room, and every tab in it empties both columns.
````

<a id="room-16"></a>
## room-16: demo/room/history/index.html, inline script, line 257

````js
  // ── the timeline: a broadcast lane and a chat lane ───────────────────────
  // Asked 2026-10-11, *"add timeline with broacast and chat lanes, properly
  // coloured"*. The kit's transport bar and strip glued, as on synth/020. Every
  // line is a tick at the moment it was said, a store replay at its own time.
  // Before Join the bar plays the history back: each line is an item on the
  // deck, the broadcast area shows the latest broadcast before the playhead
  // and the chat the lines before it, on play and on every seek. On Join the
  // page shows all of it and the clock runs in real time from the earliest
  // line; play after Join replays the room the same way (see `replay`).
  // Broadcast is the admin's violet, chat the yellow of `you`.
````

<a id="room-17"></a>
## room-17: demo/room/history/index.html, inline script, line 271

````js
  // PLAYBACK AFTER JOIN (asked 2026-10-12, *"004room. on playback clear the
  // contents in chat ui and add them back as playback happens"*). Play while
  // live is a replay: both columns empty to the playhead and refill as it
  // passes each line, and a seek rebuilds them to the new position. Lines that
  // arrive meanwhile are kept and land on the timeline, not in the columns.
  // Playing to the end, or saying something yourself, goes back to live.
  // Before Join the columns follow the playhead anyway.
````

<a id="room-18"></a>
## room-18: demo/room/history/index.html, inline script, line 315

````js
  // While live the strip is typist/030's: it does not run on the clock. Each
  // line refits it to the whole take, from the first line to the last plus
  // TAIL_MS, and the playhead parks at the end, so nothing scrolls and nothing
  // moves until somebody writes (asked: *"timelines are very nervous when
  // recording. the moving cursor adds stress"*, then *"typist already
  // compresses timeline and no autocroll. 030. so do same for chat rec"*).
````

<a id="room-19"></a>
## room-19: demo/room/words/index.html, style, line 16

````css
  /* KIT DEFECT, REPAIRED HERE ONLY BECAUSE shell.css IS NOT THIS PAGE'S TO
     CHANGE: `.step { height: 34px }` (shell.css 3831) beats the column choice,
     whose rule never sets the segment's height, so five options were squeezed
     into one 34 px box at 13 px each. MEASURED 2026-10-10. Belongs in
     `.pos-choice[data-orient="column"] .pos-seg`. */
````

<a id="room-20"></a>
## room-20: demo/room/words/index.html, inline script, line 47

````js
  // Words to links. A small local bay (keys, synth, filter, recorder, scope,
  // speakers), a fixed list of requests, and a button that sends the chosen
  // request plus this bay's real port list to the wish agent
  // (workers/wish/src/wish.mjs, POST /wish). The model PROPOSES; this page
  // checks every proposed link with the same two walls /wish/ uses,
  // `checkTransforms` for the shape of each transform and `bay.validate` (inside
  // `bay.link`) for the ports, and holds only what passes. Refusals are listed
  // in words beside the lines the model wrote.
  //
  // THE MODEL is the first, leftmost, in /wish/'s PATCH row:
  // @cf/meta/llama-3.3-70b-instruct-fp8-fast, at $0.293 per million input
  // tokens and $2.253 per million output tokens (Cloudflare's pricing page as
  // quoted in demo/wish/index.html, 2026-09-22).
  //
  // WHAT IT COSTS: every press of Ask is ONE Workers AI call on a paid account.
  // MEASURED 2026-10-10 on this page, two presses: 781 and 783 prompt tokens,
  // 109 and 86 completion tokens, $0.00047 and $0.00042, about 3 s each. Nothing opens on a
  // visit: no fetch, no AudioContext, until somebody presses.
````

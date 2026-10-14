# Page comments: wire

The full comments cut from the code under demo/ for wire, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="wire-1"></a>
## wire-1: demo/wire/index.html, inline script, line 37

````js
  /*
   * 🔴 TWO OLD PAGES AS TWO TABS, decided 2026-10-04 (*"names ok, looper
   * retires, no redrect, capture is fine"*, plans/plan-demo-structure.md §3.3).
   * BYTES is the old `/wire/`: a message as the exact bytes that go out and
   * come back. NOTES is the old `/instrument/`: a keyboard over the same relay,
   * and how late a note lands on another machine. Each tab is a module beside
   * this file, built the first time it is opened, with its own readout and log.
   *
   * ⚠️ THE TWO TABS USE TWO ROOMS ON PURPOSE. BYTES's room is the shared `wire`
   * whose history is its subject, so the manifest keeps `room: 'fixed'` and the
   * harness passes no `?room=`. NOTES names its own (`notes.mjs` says how), so
   * two harness runs never play into each other.
   */
````

<a id="wire-2"></a>
## wire-2: demo/wire/index.html, inline script, line 52

````js
    // No `what` under the title: each tab says what it is in the box under the
    // tab row (`tab-page.mjs` rule 6), asked 2026-10-05 as *"rm top desriptions"*.
    // The manifest's `one` line still describes the page on the index.
````

<a id="wire-3"></a>
## wire-3: demo/wire/how.mjs, module, line 1

````js
// demo/wire/how.mjs: the "How it works" picture for each tab of `/wire/`, and
// the three checks every one of them owes.
//
// 🔴 ONE PICTURE PER TAB, BECAUSE THE TWO TABS DO DIFFERENT THINGS. MESSAGES is
// a socket to the relay plus a recorder beside it and a history read over
// HTTPS; KEYBOARD is notes through the relay to another machine and, on a
// press, that machine's sound back peer to peer. One picture of both would be
// two pictures sharing a Cloudflare box.
//
// 🔴 DRAWN ON THE TAB'S FIRST SHOWING, NEVER IN `build`. `tab-page.mjs` adds the
// tab's report (readout and log) AFTER `build` returns, so a picture made in
// `build` would sit above the log rather than last; and a picture measured in a
// closed panel is laid out for a width nobody has (the kit's seven diagrams at
// 320 px inside a 658 px panel). `show()` runs after the report is placed and
// only on a panel that is open.
//
// ⚠️ `atEnd: false`, the way `/stage/` does it. With `atEnd` the component
// appends to `document.body` and both tabs' pictures would stand under the page
// whatever tab was open.
````

<a id="wire-4"></a>
## wire-4: demo/wire/bytes.mjs, module, line 1

````js
// demo/wire/bytes.mjs: the BYTES tab of `/wire/`, which is the old `/wire/`
// moved into a module (plans/plan-demo-structure.md §3.3, decided 2026-10-04).
//
// 🔴 UNCHANGED IN WHAT IT DOES, AND THAT INCLUDES ONE THING THE TAB CONVENTION
// ARGUES AGAINST. `tab-page.mjs` says a tab's `build` opens nothing and a join
// waits for the first press in its own tab. This tab joins its room and reads
// the history the moment it is built, because what other people left in the
// room IS the subject: *"already on the page when you arrive"*. The brief was
// "today's /wire/ unchanged", so it is, and the tension is reported rather than
// resolved here. It is still lazy in the sense the page can guarantee: open
// `/wire/#notes` and this tab is never built, so nothing of it is opened.
//
// 🔴 ITS CONTROLS ARE NOT IN `.pos-controls`. The harness pressed that row by
// position; inside a tab page it would press them blind in a closed tab and
// every control after them would move. So the buttons live in the tab, and
// `check()` presses them in the order the harness did (send, store, bytes,
// toobig, overfill, clear) and awaits each one, which is what the harness's
// `data-busy` wait did.
````

<a id="wire-5"></a>
## wire-5: demo/wire/bytes.mjs, module, line 34

````js
  // ONE shared room by default. It used to be a room per tab, which made
  // loading the history on arrival meaningless: a fresh room has no past.
  // Sharing it means what you find on load is what other people left. The
  // manifest row keeps `room: 'fixed'` so the harness does not rename it.
````

<a id="wire-6"></a>
## wire-6: demo/wire/bytes.mjs, module, line 48

````js
  // ── the composer ────────────────────────────────────────────────────────
  // ⚠️ NO `kind` FIELD. A text box whose value went straight into the
  // envelope's `type` asked a visitor to invent a protocol before they could
  // say hello. The kind of a message somebody types into a box is CHAT; the
  // other kinds here (`toobig`, `fill`, `chatter`) are set by the checks that
  // send them, where they mean something.
````

<a id="wire-7"></a>
## wire-7: demo/wire/bytes.mjs, module, line 59

````js
  // ⚠️ NO PRIMARY HERE. This page's whole subject is the DIFFERENCE between
  // sending and storing, and lighting one says the other is a variant.
````

<a id="wire-8"></a>
## wire-8: demo/wire/bytes.mjs, module, line 90

````js
  // 🔴 ONE LIST. Live traffic and the stored history are the SAME MESSAGES,
  // and `stored` is the whole of the difference between them.
  // 🔴 `table.mjs`, NOT `messages.mjs`: two list components on one site means
  // two places a row can be styled. `text` DOES NOT CLIP: a line of JSON cut
  // with an ellipsis is a line nobody can read, and the exact bytes are the
  // subject. It is the growing column, so it wraps.
````

<a id="wire-9"></a>
## wire-9: demo/wire/bytes.mjs, module, line 106

````js
  // ⚠️ NO WRAPPER AROUND IT. The table draws its own edge, and a padded card
  // around it drew a box inside a box.
````

<a id="wire-10"></a>
## wire-10: demo/wire/bytes.mjs, module, line 162

````js
  // ── the recorder, asked for before anything is sent ──────────────────────
  // It joins the room as an ordinary socket, so the relay still parses nothing.
  // Never awaited without a ceiling: a page that cannot reach the history must
  // say so, not hang.
````

<a id="wire-11"></a>
## wire-11: demo/wire/bytes.mjs, module, line 187

````js
    // ⚠️ THE HEADER NAME IS A CROSS-WIRE RENAME AND NOTHING TYPE-CHECKS IT.
    // It read `X-Backlog` for one deploy while the worker sent `X-Store`, so
    // `held` parsed to 0 and `the cap holds` failed against a working store.
````

<a id="wire-12"></a>
## wire-12: demo/wire/bytes.mjs, module, line 194

````js
    // ⚠️ THE HISTORY SEEDS THE LIST, IT DOES NOT REPLACE IT, or a check that
    // reads it would wipe the live rows it had just put there.
````

<a id="wire-13"></a>
## wire-13: demo/wire/bytes.mjs, module, line 211

````js
  // ── controls ────────────────────────────────────────────────────────────
  // Every assert below is made by the tab's own `A`, which `check()` hands in.
  // A visitor pressing these gets the same work and the asserts are recorded
  // the same way: they only read what the press already did.
````

<a id="wire-14"></a>
## wire-14: demo/wire/bytes.mjs, module, line 330

````js
    // ⚠️ THE ORDER IS LAYOUT, AND IT WAS SEARCHED RATHER THAN GUESSED. A
    // return path runs under the row and climbs into its box from below, so
    // with both workers in one Cloudflare box one of the three lines into the
    // list was always drawn behind the box above it or over another's name.
    // Two workers are two machines anyway (`workers/relay`, `workers/store`),
    // and of the twelve orders of three machines and two Browser boxes, Store,
    // Browser, Relay is the one clean at desk width and on a phone.
````

<a id="wire-15"></a>
## wire-15: demo/wire/notes.mjs, module, line 1

````js
// demo/wire/notes.mjs: the NOTES tab of `/wire/`, which is the old
// `/instrument/` moved into a module (plans/plan-demo-structure.md §3.3,
// decided 2026-10-04). A keyboard over the relay, with the sound made in this
// page or on another machine, and the two delays that says how late.
//
// 🔴 ITS OWN ROOM, NEVER BYTES'S. `/wire/`'s manifest row is `room: 'fixed'`
// because BYTES's shared history is its subject, so the harness passes NO
// `?room=` to this page. If this tab read `?room=` it would land every harness
// run of NOTES in one room, and two runs at once would play into each other,
// which is the shared-room defect `verify.mjs` exists to prevent. So:
//   - `?notes=<room>` names it, for a person who wants two browsers to meet;
//   - under `?selfcheck=` with no `?notes=`, it is `wire-notes-test-<6>`, one
//     per run, in the harness's own `<demo>-test-<hash>` shape;
//   - otherwise `instrument-demo`, the room `/instrument/` used, so a person
//     with that page still open in another tab meets this one.
//
// 🔴 NOTHING IS JOINED UNTIL A PRESS IN THIS TAB. `build` draws the keys and
// the strip and opens no socket and no audio; `Start audio and join` does both.
// The check asserts it as a count.
//
// 🔴 AND THE OTHER MACHINE IS GRADED NOW, ONCE, WITH A SECOND PEER IN THIS TAB.
// `/instrument/`'s `Hear the other machine` asserted nothing in any run: there
// was never a second machine in a harness room, and the handler read
// `ws.readyState`, which the `openWire` handle does not have, so it answered
// `offline` to every press for as long as it existed. The check here starts a
// stand-in peer under `?selfcheck=` only: its own socket in the same room, its
// own AudioContext, an oscillator per note it is sent, and a WebRTC answer
// carrying that sound back. It also plays one note INTO the room, so the other
// delay, a note arriving from somebody else, has something to measure. It
// stands in for `rig/m1/synth.html`, and it is honest about the difference:
// that file listens for `note`, not the `on` this page sends, and defaults to
// the room `proinst`, so the real one does not answer this page today.
````

<a id="wire-16"></a>
## wire-16: demo/wire/notes.mjs, module, line 47

````js
// ⚠️ THE KEYS WERE `midi`, `sound`, `sent`, `received`, `note in` and
// `sound back` UNTIL 2026-10-05, when a review found none of them said what
// they counted or timed. Each one now names its thing in a visitor's words.
// `readCell` reads two of them by key text, so a rename here moves it there.
````

<a id="wire-17"></a>
## wire-17: demo/wire/notes.mjs, module, line 94

````js
  // ⚠️ THE KEYBOARD LISTENS FOR LETTERS ON `window`, and so it hears them while
  // this tab is closed. A note nobody can see being played is a sound nobody
  // chose, so a letter does nothing while the tab is hidden. A press of a drawn
  // key cannot happen in a hidden panel; MIDI and the loop still play, because
  // a device or a loop that was started is somebody's choice.
````

<a id="wire-18"></a>
## wire-18: demo/wire/notes.mjs, module, line 134

````js
  // ⚠️ NO `from` AND NO `sent` IN A PAYLOAD. `wire.mjs` stamps both and throws
  // on a payload that carries either.
````

<a id="wire-19"></a>
## wire-19: demo/wire/notes.mjs, module, line 142

````js
  /**
   * THE POINT: what crosses the wire is {note, vel}, a note NUMBER, stamped by
   * the sender. Raw MIDI bytes never leave the page that owns the device.
   */
````

<a id="wire-20"></a>
## wire-20: demo/wire/notes.mjs, module, line 177

````js
    // ⚠️ NOT AWAITED BEFORE THE WORK. `resume()` waits on a gesture and never
    // rejects, so awaiting it first is a hang in a browser that is strict.
````

<a id="wire-21"></a>
## wire-21: demo/wire/notes.mjs, module, line 220

````js
  /**
   * HEAR THE OTHER MACHINE. With nobody offering it says so in words rather
   * than failing, because a page whose subject needs a second machine must
   * still be true on one.
   * 🔴 `ws.state()`, NOT `ws.readyState`. The `openWire` handle has no
   * `readyState`, so `/instrument/` read `undefined !== 1` and answered
   * `offline` to every press, which no run ever saw because nothing asserted
   * after the press.
   */
````

<a id="wire-22"></a>
## wire-22: demo/wire/notes.mjs, module, line 254

````js
  /**
   * How late the sound is, timed as a ROUND TRIP ON ONE CLOCK: pressed here,
   * heard here. A one-way stamp across two machines carries their clock offset,
   * MEASURED at about 57 ms between two Macs on network time.
   */
````

<a id="wire-23"></a>
## wire-23: demo/wire/notes.mjs, module, line 325

````js
    // ⚠️ AN HONEST BLANK, NOT A ZERO, while nobody else is in the room.
````

<a id="wire-24"></a>
## wire-24: demo/wire/notes.mjs, module, line 334

````js
  // ── how it works, last in the tab, drawn on its first showing ─────────────
  // Read off this file: `press` and `play` here, `openWire` to the relay, and
  // `remote`'s offer and answer over the same room with the sound coming back
  // as a WebRTC track (`startStandIn` speaks the other machine's half).
````

<a id="wire-25"></a>
## wire-25: demo/wire/notes.mjs, module, line 340

````js
    // ⚠️ THE ORDER IS LAYOUT, SEARCHED OVER ALL 72 ARRANGEMENTS RATHER THAN
    // GUESSED. A return path runs under the row and climbs into its box from
    // below, so it has to leave and land on the BOTTOM box of each machine or it
    // is drawn behind the box above (`notes` ran behind audio into voices, and
    // the WebRTC line behind the far keyboard). The far machine on the left
    // leaves exactly two return paths, both bottom to bottom.
````

<a id="wire-26"></a>
## wire-26: demo/wire/notes.mjs, module, line 530

````js
/**
 * 🔴 THE OTHER MACHINE, STANDING IN, AND ONLY UNDER A CHECK. Its own socket in
 * the same room, its own AudioContext, and the same three verbs
 * `rig/m1/synth.html` speaks (`here`, `offer` to `answer`), plus `on` and `off`,
 * which is what this page sends. A note it is sent becomes a short tone on the
 * track it answers with, which is what lets a press here be timed back as sound.
 * ⚠️ A TONE AND NOT SILENCE: an onset detector over silence never fires, and a
 * stand-in that cannot be heard would grade nothing.
 */
````

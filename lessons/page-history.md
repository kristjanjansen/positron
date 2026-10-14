# Page comments: history

The full comments cut from the code under demo/ for history, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="history-1"></a>
## history-1: demo/history/newsreels/index.html, style, line 12

````css
  /* 🔴 THE FILM FILLS A 4:3 PANEL, CROPPED. Asked 2026-10-13 on a shot of a
     playing newsreel with black bars left and right: *"do cropping (make
     videopanel higher)"*. AK filmikroonika is 4:3 film, and the bars come with
     ERR's encode, so the panel is 4:3 (`aspect` on createVideoPanel) and the
     video COVERS it. That is exact either way the frame arrives: a 16:9 frame
     with a centred 4:3 picture is cropped to its middle three quarters, which
     is the picture and nothing else, and a 4:3 frame fills with nothing cut.
     Not measured off ERR (a check never reaches it), so it rests on that
     geometry, and a film wider than 4:3 loses a sliver at each side rather
     than gaining a bar. (0,2,1) to beat the panel's own (0,1,1) contain. */
````

<a id="history-2"></a>
## history-2: demo/history/newsreels/index.html, style, line 23

````css
  /* FULL SCREEN SHOWS THE SAME CROP. The stage takes the screen's shape there,
     so cover alone would crop to the screen and show the bars again on a 16:10
     laptop; instead the video stays a 4:3 box, as large as fits, centred. */
````

<a id="history-3"></a>
## history-3: demo/history/newsreels/index.html, inline script, line 44

````js
  // /reel/ as a concept page: a day's newsreel and that day's radio are two
  // boxes in a patchbay, wired into this tab's picture and speakers, on
  // /reel/'s own line (demo/shell/reel-line.mjs, shared, not copied).
  //
  // 🔴 NOTHING OPENS ON A VISIT, AND A CHECK NEVER REACHES ERR. Every URL for
  // the archive goes through `reachERR` and is counted, a visit asserts zero,
  // and under `?selfcheck=1` the play press picks a day and opens nothing, as
  // on /reel/. `?base=` points the page at demo/fake-arhiiv.mjs instead of
  // arhiiv.err.ee, which is how anything here is ever played by a machine.
````

<a id="history-4"></a>
## history-4: demo/history/newsreels/index.html, inline script, line 64

````js
  // ── the bay ─────────────────────────────────────────────────────────────
  // Two outside sources, because they are two archives: the film archive's
  // newsreel and the radio archive's programme. Each is an `external` node, so
  // a link out of it needs `consent: true`, named here where the patch is
  // held. Holding a link opens nothing; the press does.
  //
  // AND THE TIMELINE IS A BOX OF ITS OWN (asked 2026-10-13: *"timeline/sync
  // should be its own box?"*), wired the way the code runs, not the way it
  // reads. The line PICKS the day and hands it to the two players in this tab,
  // so a `value` wire goes from it to the picture and to the speakers; each
  // then asks its archive over the https wire already drawn. (A light wire
  // straight to an ERR box is not what happens, and the patchbay would draw it
  // through `cf-relay:room`, which is false too: no relay is involved here.)
  // The SYNC is not at ERR, it is in this tab: the picture element is the
  // master (`mediaMaster`) and the radio element follows its play, pause and
  // seek, so the `clock` wires leave the picture, one to the timeline (the
  // playhead follows the film) and one to the speakers (the radio follows it).
````

<a id="history-5"></a>
## history-5: demo/history/newsreels/index.html, inline script, line 125

````js
  // THE KIT'S VIDEO PANEL, asked 2026-10-13: *"use std videoframe"*, 4:3 for
  // the crop above. Its footer carries mute and its own full screen square at
  // the right, mute immediately left of full screen (*"move mute to right, left
  // from fullscreen"*), the way /drums/camera/ puts a button beside that
  // square. Nothing else: no readout cells, and play is not here because it is
  // on the transport bar under the line, where /reel/ keeps it. `fullMode:
  // 'footer'` keeps that row on screen while full, and `under` brings the bar
  // and the line up under it, so play, step and mute all still work full.
````

<a id="history-6"></a>
## history-6: demo/history/newsreels/index.html, inline script, line 158

````js
  // THE TRANSPORT BAR, GLUED TO THE LINE, as /reel/ glues it (asked 2026-10-13:
  // *"add next prev buttons in transport bar (glue to timeline)"*). Play and
  // pause are its toggle, ‹ and › step one broadcast day through reel-line's
  // `next`, and nothing else: no clock (a position here is a date), no slider
  // (the line is the position surface), no loop. The line is mounted after the
  // bar, which is the order the glue reads.
  // `step` and `command` are below; the bar only calls them on a press.
````

<a id="history-7"></a>
## history-7: demo/history/newsreels/index.html, inline script, line 174

````js
  // No footer under the line (*"no footer"*): the strip's own tooltip says
  // the same three lines on hover.
````

<a id="history-8"></a>
## history-8: demo/history/newsreels/index.html, inline script, line 178

````js
  // THE PICTURE IS THE MASTER AND THE YEAR FOLLOWS IT, as on /reel/.
````

<a id="history-9"></a>
## history-9: demo/history/newsreels/index.html, inline script, line 273

````js
  // THE PICTURE DRIVES THE SOUND, as on /reel/: start and stop together, and a
  // seek takes the radio to the same offset where it is long enough.
````

<a id="history-10"></a>
## history-10: demo/history/newsreels/index.html, inline script, line 356

````js
      // PRESSES THE PAGE'S OWN BUTTONS, so it is behind the gate. With nothing
      // picked, play picks the first mark and opens nothing; the steps walk a
      // day each way and open nothing; mute flips both elements; then the page
      // goes back to how a visitor finds it.
````

<a id="history-11"></a>
## history-11: demo/history/newsreels/index.html, inline script, line 381

````js
      // Full screen by the panel's own button, and back. Headless Chrome may
      // refuse the real API without a gesture; fullscreen.mjs then covers the
      // window instead, and either counts. The footer stays on screen while
      // full, which is what keeps play and mute reachable there.
````

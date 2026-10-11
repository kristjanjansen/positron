# plan-nodes-revisited: the node based UI plan, read again after the patchbay was built (2026-10-11)

> Asked 2026-10-11: *"Read nondebased ui plan and recosnider it in the light of patchbay"*.
> The plan is `plans/plan-nodes.md` (2026-09-11). Since then `plans/plan-patchbay.md`
> (2026-09-21), `plans/plan-universal-routing.md` (2026-10-04) and
> `plans/plan-site-names.md` (2026-10-09) were written and largely built as
> `demo/shell/bay.mjs`, `graph-registry.mjs`, `bay-node.mjs`, `bay-view.mjs`,
> `bay-traffic.mjs`, `/patchbay/` and the `/concepts/` pages.
>
> **Updated 2026-10-11 evening: §3 item 3, the JACK arm, is built for the board and
> measured on the Pi; its bay half is specced, with questions in §5.**
>
> **Spec only otherwise. Nothing else here is built or measured.** Every "today" fact below was
> read from the tree on 2026-10-11 by grep; the commands are named so they can be
> re-run.

## 0. The verdict

**The plan was right about the document and wrong about the editor.** Its
lasting idea, that the document is the product and the picture is disposable,
is exactly what got built. But it imagined the document as a saved
`patch.json` of nodes and links with a dragged canvas on top. What got built is
different in three ways that change most of its recommendations:

1. **Nodes are announced, not saved.** Sites announce their nodes and ports
   live (`graph-registry.mjs`, `board.alive`), so the document a person writes
   holds only **links**, as one text line each:
   `pi-1:yoshimi:audio-out -> web-8kt:screen:audio-in { gain -6 } via datachannel`.
2. **The picture is computed, not placed.** `bay-view.mjs` lays out every node
   from bay data (left to right chain, lanes for return links, a phone layout).
   There are no coordinates anywhere, so the plan's second file
   (`patch.layout.json`) and its hardest rule (position must never mean
   anything) are true by construction rather than by assertion.
3. **The relay row flipped from NO to YES for light media.** The plan said a
   wire on the relay would be a filter in the receiver that the sender knows
   nothing about. The bay made it a link both ends declare and agree on, and
   the relay still does not parse (`bay-node.mjs` does the routing at the
   ends). Heavy media resolve to a session (`HEAVY` in `bay.mjs`), which the
   plan never considered.

So: **drop the canvas editor and the layout file; keep the rules; make the
computed picture editable by taps, not drags; finish the JACK arm, which is
still the best leftover in the whole plan.**

## 1. The plan's claims, one by one, against today

| plan-nodes said | today | status |
| --- | --- | --- |
| §0 write the canvas, 116 lines, no library | no drag canvas exists (`demo/shell/nodes.mjs` absent). `bay-view.mjs` is a computed SVG picture with no pointer handlers (`grep -c pointerdown demo/shell/bay-view.mjs` is 0) | superseded: write it, yes, but as a view, not an editor |
| §2.2 ALSA patchbay: yes, `alsa.mjs` | `rig/board/alsa.mjs` is still there; the bay now names the same ports as `pi-1:<node>:midi-in` | holds, absorbed into the bay |
| §2.2 JACK: yes, it is the gap, nine hard coded calls | **built 2026-10-11**: `rig/board/jack.mjs` parses `jack_lsp -c -p -t`, plans and applies a document of links and reads it back; the 21 shell strings in `jacksynth.mjs` are gone (`grep -c 'sh(.jack_\(dis\)\?connect' rig/board/jacksynth.mjs` is 0); `jack.list`, `jack.plan`, `jack.apply` on the wire; run on the Pi | built for the board; bay links to it not yet (§3 item 3) |
| §2.2 relay: no, a bus | light links ride the relay per site, `*` links and `bay.event` exist; the relay still does not parse | flipped to yes, rule 15 kept |
| §2.2 timeline: no | still no; but a recorder is now a store node with in and out ports (concepts 012, 013, 062) | holds, refined |
| §2.2 the page's own audio chain: yes, cheapest | built through the bay, not a canvas: concept 015 builds a WebAudio synth one linked module at a time | holds, different road |
| §4.1 `patch.json` with nodes and links | links are text lines (`parseLink`/`printLink` in `bay.mjs`); nodes come from announcements | superseded |
| §4.1 `patch.layout.json` | nothing to lay out, positions are computed | dropped |
| §4.1 rule 3, canonical form | `/patchbay/` scenes are saved to `localStorage` as JSON with no sort (`grep sort demo/patchbay/index.html` is empty) | **not met** |
| §4.1 rule 5, refusals are meaning | `accepts` (consent) is separate from `shape`; a SysEx link to the Circuit is refused by name | holds, stronger than planned |
| §4.1 rule 8, refuse an unknown `v` | graphs carry `v: 1` and `graphProblem` checks them | holds for graphs; scenes carry no `v` (UNCONFIRMED, not read in full) |
| §5.1 the harness cannot drag | `verify.mjs` `gesture()` drags any `[data-gesture]` surface with real `Input.dispatchMouseEvent` events | half true: surfaces yes, port to port no |
| §5.2 phase 1 slug `patch` | `/patch/` exists and is a different page (an instrument as a file, `plans/plan-patch.md`) | slug taken |
| §5.5 a re-patch is a timestamped event | not built | still right, still waiting |

## 2. What to drop

- **The drag canvas as the editor.** A computed layout cannot be dragged
  without inventing coordinates, and coordinates are what the plan worked
  hardest to keep out of the document. Dragging a box would either do nothing
  lasting (and read as broken) or start a layout file nobody needs.
- **`patch.layout.json`** and every assert about it (§5.2 asserts 9, 11).
- **The nodes array in the saved document.** A scene that copies node
  definitions is the plan's own rule 7 broken: embed, and the copy goes stale
  when the Pi renames `yoshimi:audio` to `yoshimi:audio-out`, which happened on
  2026-10-10.
- **`.click()` as only a negative control** (§5.1 item 5). With no canvas, the
  click path is the main path, see §3.

## 3. What to build instead, in cost order

1. **Tap to link on `bay-view.mjs`.** Tap an out port, tap an in port, and the
   page gets the link line `a -> b`; the bay validates it and the picture draws
   the verdict: a wire, or a refused stub with the reason in words (plan rule
   13). Ports are already real labels in a known place; making each one a
   `<button>` gives the keyboard path, the screen reader name and the harness
   path at once. A drag that does the same thing can come later and is sugar.
   - Where: `demo/shell/bay-view.mjs` gains an `onLink(from, to)` option; no page
     changes until one opts in. `/kit/patchbay/` is the first to opt in.
   - The assert is downstream, as the plan said: on a sound link, the level at
     the far end's analyser; on a Pi link, the board's own report read back.
     A count of drawn wires is not an assert.
   - One refused tap per run, asserted (an `audio-out` to a `midi-in`).
2. **Scenes become a canonical document.** `{ v: 1, links: [ "<line>", ... ] }`,
   lines sorted, pretty printed, the plan's rules 3 and 8. Still saved locally
   first; a scene is a list of link lines and nothing else, so ports that are
   not announced right now show as **waiting**, not as errors.
3. **The JACK arm. BUILT 2026-10-11 for the board, the bay half specced only.**
   What is now true, each checked on the Pi at <pi> that day:
   - **The graph, read off the Pi.** Eight ports: `system:capture_1/2`,
     `system:playback_1/2` (jackd's dummy driver, so they go nowhere),
     `yoshimi:left/right`, `posboard:input_1/2`. Yoshimi's two channels both
     feed `posboard:input_1` (the mono sum the capture reads) and yoshimi also
     autoconnects to the dummy playback. Nothing feeds `posboard:input_2`.
     With the granulator in, `SuperCollider:in_1/2` and `out_1/2` appear and
     the capture is fed by `out_1` and `out_2`. Captured as
     `rig/board/fixtures/jack-lsp-c-pi.txt` and `jack-lsp-cpt-pi.txt`.
   - **`rig/board/jack.mjs`**: `parseJackLsp` (ports, connections, and with
     `-p -t` each port's direction and medium), `listJack`, `plan(doc, rows)`,
     `apply(planned)` which answers the graph READ BACK, `diff`, `canonical`.
     The document is `{ v: 1, links: [{ from, to }], own: [<input>] }`:
     `links` must exist afterwards, `own` names inputs whose whole feed the
     document decides. Refused by name, and then nothing planned at all: an
     unknown `v`, a port not on the graph, a client named as if it were a port
     (with the candidates), an input as a source, an output as a destination,
     audio into MIDI, a port to itself, any `carry`. The vocabulary differences
     from `alsa.mjs` are a table at the top of the file, not flattened: exact
     `client:port` names and no fuzzy match, one channel per link, sums into
     one input, no message classes, `own` exists only here.
   - **`jacksynth.mjs` has no hard coded connects left.** Its four re-patches
     (`startJackSynth`'s capture wiring, `pappusFx` on and off, `sourceFeed`)
     and `jackRebuild` each build a document and go through `jack.mjs`. One
     deliberate difference: a document that owns an input also cuts a stray
     source into it; on the real graph that is zero extra commands. The
     readiness lesson stays where it was: `pappusFx` waits for `PAPPUS READY`
     before it patches, because a port is not an engine.
   - **On the wire**: `jack.list`, `jack.plan {patch}`, `jack.apply {patch}`
     (with `onlyIfIdle` and a journal line, like `jack.rebuild`). MEASURED over
     the relay: a zero step plan for the capture as it is, a refusal naming two
     problems, and a real `jack.apply` that cut and then restored
     `yoshimi:left -> system:playback_1` (the dummy port, inaudible), each read
     back intact. `fx.pappus` on, `source.set` on and off, `fx.pappus` off all
     left `jack.graph`'s chain intact.
   - `node rig/board/test.mjs` 235/235 before, **277/277** after, on the laptop
     and on the Pi; five sabotages of `jack.mjs` take it red (1, 1, 7, 1 and 1).

   **The bay half is NOT built, because no bay link can name two JACK ports
   today.** Every audio port the board announces is an OUT whose `address` is a
   relay room: `pi-1:yoshimi:audio-out` is the capture's stream, already past
   JACK, and there is no announced audio IN on the Pi at all. The smallest
   honest version, waiting on the questions in §5:
   - the board announces the JACK side as ports: `pi-1:capture:audio-in`
     (`posboard:input_1`) and, where sclang is installed, `pi-1:pappus:audio-in`
     and `pi-1:pappus:audio-out`, each carrying the JACK port names behind it
     (`jack: ['yoshimi:left', 'yoshimi:right']`);
   - a bay link whose two ends are on one board and both `audio` resolves to
     transport `jack` and to a `jack.mjs` document (one bay link, two JACK rows
     for a stereo source into the mono capture), planned with `jack.plan` and
     applied with `jack.apply`;
   - the page reads the far side back with `jack.list`, never a count of drawn
     wires, and one refused link per run is asserted (`pi-1:pappus:audio-in`
     as a source).
4. **A re-patch is an event.** Plan §5.5 unchanged: each applied link or unlink
   appended as a timestamped row, so a session's patching is a lane on the
   strip. Needs 2 first.

## 4. What the plan still gets right, kept as rules

- The document outlives the UI. If the picture is deleted, the link lines and
  the bay's verdicts must still work.
- Links reference ids, never positions or indices (rule 2).
- A refusal is part of the meaning and reaches the reader in words (5, 13).
- Nothing is applied that was not planned; no half applied patch (14).
- The relay stays a dumb pipe (15). The bay routes at the ends.
- Reference, never embed (7), which is why a scene holds no node definitions.
- A picture that draws perfectly while routing nothing is the failure to fear,
  so every editing assert is on the far side of the wire (§5.1 item 4).
- No general pipeline composer (§5.6). Concepts show one idea per page; the
  patchbay is a view of real links, not a programming environment.

## 5. Open, for the owner

1. **Tap or drag?** This plan says tap first because the layout is computed and
   the click path is the accessible and testable one. A drag feels more like a
   patchbay. Both can exist; which first?
2. **Where do scenes live?** `localStorage` today. Options: a file you download,
   `positron-store` (shared, survives the browser), or both.
3. **Should editing appear on the concept pages** or only on `/patchbay/` and
   `/kit/patchbay/`? Concepts today are read only pictures of links a page made.
4. **Does a scene that names absent ports wait for them**, and connect when they
   announce (the Circuit plugging into the Pi is the case), or ask first?
5. **JACK in the bay: what does `pi-1:yoshimi:audio-out` mean?** Today it is the
   relay stream every concept page links from. To link it inside the Pi it would
   have to be the JACK port, and the stream a separate node (`pi-1:capture:audio-out`)
   that pages link from instead. That renames what 017 and every Pi page link to.
6. **Who wins, a bay link or the board's own chain?** `fx.pappus` and
   `jack.rebuild` restore the board's belief, so a bay link into the granulator
   would be undone by the next rebuild. Should the insert BECOME two bay links
   (a link is a lease, plan-universal-routing §4), or stay a verb with the bay
   only drawing it?
7. **Stereo on the picture.** The capture is a mono sum of two JACK channels
   and the port says `channels: 1`. Draw two wires, or one wire that resolves
   to two rows?
8. **Exposure.** `jack.apply` is tokenless like every relay verb, so a page
   could cut the capture for everybody in `studio-1`, which `audio.stop` can
   already do. Accept that, or require the `owner`/`heldBy` of
   plan-universal-routing §6 first?
9. **Hardware inputs are not on JACK.** The Circuit comes in through `arecord`
   (`rig/board/inputs.mjs`), not JACK, so "the Circuit into the granulator" is
   not a JACK link until inputs move onto JACK (`alsa_in`), which is a larger
   change than this item.

## 6. Uncertainty

- No measurement was taken for this revision. The table in §1 is greps.
- Tap to link is a design, not a prototype; whether bay-view's port labels are
  big enough to tap on a phone is UNCONFIRMED (the plan's 11 px warning stands).
- The JACK port names were read off the Pi on 2026-10-11 (§3 item 3). The
  graph has no `-ac 2` capture: `posboard:input_2` exists and ffmpeg asks for
  `-ac 1`, so whether a source patched to `input_2` would be heard (ffmpeg
  downmixing the two) is UNMEASURED and was deliberately not tried.

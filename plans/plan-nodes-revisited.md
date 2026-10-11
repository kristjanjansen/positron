# plan-nodes-revisited: the node based UI plan, read again after the patchbay was built (2026-10-11)

> Asked 2026-10-11: *"Read nondebased ui plan and recosnider it in the light of patchbay"*.
> The plan is `plans/plan-nodes.md` (2026-09-11). Since then `plans/plan-patchbay.md`
> (2026-09-21), `plans/plan-universal-routing.md` (2026-10-04) and
> `plans/plan-site-names.md` (2026-10-09) were written and largely built as
> `demo/shell/bay.mjs`, `graph-registry.mjs`, `bay-node.mjs`, `bay-view.mjs`,
> `bay-traffic.mjs`, `/patchbay/` and the `/concepts/` pages.
>
> **Spec only. Nothing here is built or measured.** Every "today" fact below was
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
| §2.2 JACK: yes, it is the gap, nine hard coded calls | `rig/board/jacksynth.mjs` now has **21** `jack_connect`/`jack_disconnect` lines; no `jack.mjs` | still the gap, and it grew |
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
3. **The JACK arm.** Unchanged from plan §5.4 and more valuable now: the Pi
   announces `pi-1:yoshimi:audio-out` and `pi-1:synth:audio-out`, but which of
   them actually reaches the capture is 21 shell strings in `jacksynth.mjs`.
   `rig/board/jack.mjs` parses `jack_lsp -c` against a fixture, then the bay's
   links to and from Pi audio ports plan and apply real JACK connections. It
   leaves something behind with no UI at all, which was the plan's test.
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

## 6. Uncertainty

- No measurement was taken for this revision. The table in §1 is greps.
- Tap to link is a design, not a prototype; whether bay-view's port labels are
  big enough to tap on a phone is UNCONFIRMED (the plan's 11 px warning stands).
- The JACK arm's port names have not been read off the Pi since the 2026-10-10
  rename; `jack_lsp -c` on the board is the first step and costs nothing.

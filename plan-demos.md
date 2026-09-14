# plan-demos — one coherent demo story, one UI

Status: **18 of 23 built and deployed** (2026-09-04), 239/239 green against
https://positron.studio. Demos live at `/<nn>-<name>/`, notes at `/notes/`.

Built: `01`–`05` `06` `07` `09` `10` `11` `12` `13` `14` `15` `16` `17` `18` `19`.
Left: `08 moq` (needs moq-pub in the publisher image), `20`–`22` (the pages
work and are linked; not re-shelled), `23 studio` (assembly now — `10`–`14`
all exist).

The routing question in "Open questions" is ANSWERED: no `/demo/` prefix, the
demos are the root. And the token question is answered too — `ws.positron.
studio` is tokenless, so Acts 2 and 4 needed no secret in a public page.

See `PROGRESS.md` session 8 for what was measured on the way.

## The diagnosis

70 HTML pages. They fail in two opposite directions and there is nothing in
between:

- **Agent-only harness hacks** — ~25 pages that exist so a CDP script can read
  `window.__report`. `rig/config-arm-debug.html`, `rig/measure-llhls.html`,
  `proto/jam/host-check.html`, the 16 pages in `rig/moq/spike/www/`. A human
  opening these learns nothing; they are instrument panels, not demos.
- **Mega-UIs** — four pages carry 4,581 lines between them
  (`proto/remixer/index.html` 1222, `proto/megatimeline/index.html` 1220,
  `proto/m2m/show.html` 1142, `proto/m2m/grid.html` 997). `studio/console.html`
  puts *Go live · Stop show · Archive · Show · Fire · Load · Sound · Room ·
  Featured/Live/Wall* on one screen. Every feature is reachable and none is
  legible.

The root cause is that **a page is either human-facing or machine-facing, never
both.** So every capability got built twice — once as a harness that proves the
number, once as a UI that shows the thing — and neither version is the demo.

Secondary cause: **no shared shell.** `menu.html` has a real design language
(dark `#0b0e14`, yellow `#ffd400`, monospace names, 620 px column, safe-area
insets) and *nothing else uses it*. Every page reinvents its own CSS.

## The two rules that fix it

**1. One shell, zero bespoke CSS.** Extract `menu.html`'s tokens into
`demo/shell/` and let every demo import it. A demo authors content, never
chrome.

**2. Every demo is simultaneously hand-openable and CDP-drivable.** The harness
contract becomes part of the shell, not a per-page bolt-on. A demo that renders
its numbers for a human has already published them for a script. This is what
collapses the 70 pages: the ~25 harness pages stop being pages and become CDP
*scripts pointed at real demos*.

## The shell

```
demo/shell/
  shell.css     # the ONLY stylesheet in the project — menu.html's tokens
  shell.mjs     # page frame + the __demo contract
  readout.mjs   # the numbers block, same position on every page
  log.mjs       # the log strip, same position on every page
```

Every demo is exactly this:

```html
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="stylesheet" href="/demo/shell/shell.css">
<title>POSITRON · 09 ladder</title>
<script type="module">
  import { mount } from '/demo/shell/shell.mjs';

  const d = mount({
    n: '09',
    name: 'ladder',
    what: 'The same source over three transports at once. The gap is the point.',
    // the ONE number this demo exists to show
    readout: { llhls: 's', webrtc: 'ms', moq: 'ms' },
    controls: [{ id: 'go', label: 'Start all three' }],
  });

  d.on('go', async () => { /* … */ });
  d.set('moq', 26);            // updates the human readout AND __demo.readout
  d.log('moq: first frame');   // strip for a human, ring buffer for a script
  d.ready();                   // CDP waits on this, never on a sleep
</script>
```

`mount()` returns the only API a demo needs — `set`, `log`, `on`, `ready`,
`fail` — and publishes `window.__demo = { n, name, ready, readout, logs,
asserts }`. One contract, 70 pages' worth of ad-hoc `window.__mt` /
`window.__report` / beacon conventions retired.

**Hard line budget: 250 lines per demo page**, inline script included. Over
budget means the demo is doing two things — split it, or move logic into a
module under the demo's own directory. This is the rule that prevents the next
`show.html`.

## The story

One spine, borrowed from what the project actually converged on: **record →
store → play back → seek → compose → perform**. Each act only uses what the
previous act established, so the sequence is readable start to finish.

### Act 0 · the substrate — no network at all

| # | name | shows | number it must display |
|---|---|---|---|
| 01 | `transport` | one clock: play, pause, rate, seek | drift vs wall clock |
| 02 | `lanes` | audio + video + data on one transport | A/V skew, sample-accurate audio |
| 03 | `nest` | a timeline inside a timeline — quotation, loop | carry asserted at the playhead |
| 04 | `score` | a score is a *value*; round-trip it byte-identically | bytes in == bytes out |
| 05 | `strip` | deep time to 10 Gyr, `when.kind` edges, aoristic aggregate | measured ceiling |

### Act 1 · one stream — the transports, measured

| # | name | shows | number |
|---|---|---|---|
| 06 | `llhls` | the tuned low-latency player | 2.4–4.0 s glass-to-playhead |
| 07 | `webrtc` | WHIP/WHEP glass-to-glass | 74 ms p50 |
| 08 | `moq` | the fast tier, browser→browser | 26 ms p50 720p30 · 47 ms 4K30 |
| 09 | **`ladder`** | **all three, one source, side by side** | the three numbers together |

`09 ladder` is the demo the project has never had and most needs: it makes the
whole measurement campaign legible in one screen instead of three RUNBOOKs.

### Act 2 · many people

| # | name | shows | number |
|---|---|---|---|
| 10 | `room` | join, see each other | join→first-frame |
| 11 | `grid` | N up, tiered featured/live/wall | p95 flat to N=54 |
| 12 | `cues` | fire one cue, everyone acts on it | 27 ms DO relay |

### Act 3 · capture and return — the gap positron fills

| # | name | shows | number |
|---|---|---|---|
| 13 | `record` | record locally, ship segments to R2 | disk high-water = 2 segments |
| 14 | `replay` | play the recording back *with its cues* | p50 59 / p95 71 ms |
| 15 | **`seek`** | **seek inside a replay; cues re-fire correctly** | accuracy after seek |

`15 seek` is the thesis. Per the lineage notes this is the gap five generations
of prior experiments left open — it deserves its own page and currently has none.

### Act 4 · instruments

| # | name | shows | number |
|---|---|---|---|
| 16 | `looper` | play it alone, no network at all | output latency 37 ms |
| 17 | `instrument` | remote MIDI, 1:1, worker sees no MIDI byte | key→sound |
| 18 | `jam` | two players, one pulse | latency matrix |

### Act 5 · archives

| # | name | shows |
|---|---|---|
| 19 | `flipper` | live ERR channels, CORS-clear, no proxy |
| 20 | `aikajana` | one corpus, one artist |
| 21 | `megatimeline` | 1908→2026 as one zoomable century |
| 22 | `remixer` | compose *from* the archive |

### Act 6 · the composition

| # | name | shows |
|---|---|---|
| 23 | `studio` | the operator surface — **allowed** to be dense |

`studio` stays complex, but stops being *bespoke*: it imports the same panel
modules demos 10–14 use. A panel is fixed once and both places get it. That is
the difference between a mega-UI and a composition.

## Naming

`demo/NN-name/index.html` → public route `positron.studio/NN-name/`.

- Two-digit prefix, so the filesystem sorts into the story order.
- One lowercase word, no hyphens inside the name — matches the existing public
  menu (`megatimeline`, `remixer`, `looper`) and stays typeable on a phone.
- The number is navigation, not identity: `09 ladder` is "ladder" in prose.
- Renumbering is cheap (directory rename + menu regenerate); inserting `09a` is
  not allowed — renumber instead.

## Disposition of the 70 existing pages

| current | n | disposition |
|---|---|---|
| `rig/moq/spike/www/*` | 16 | **retire as pages.** Keep the committed esbuild bundles as a lib; the MoQ *demo* becomes `08 moq`, and the d16/mgrid/4k probes become CDP scripts. |
| `rig/*.html` (6) + `rig/whep` (2) + 2 obs clocks | 10 | **retire.** Become CDP scripts against real demos via `__demo`. |
| `proto/jam/host-check.html`, `proto/osc/bench.html` | 2 | **retire.** Pure probes; fold their asserts into `18 jam` / `12 cues`. |
| `proto/m2m/*` | 7 | **fold** into `10 room`, `11 grid`, `12 cues` + panel modules. `show.html`/`grid.html`/`composite.html` decompose; nothing is lost, 2,974 lines stop being three near-duplicates. |
| `proto/selfrec/*`, `proto/replay/*`, `proto/centralrec/*` | 7 | **fold** into `13 record`, `14 replay`, `15 seek`. |
| `timeline/lab/*` | 7 | **keep as lab**, outside the demo sequence — they are property-test surfaces, not demos, and that is fine once the distinction is explicit. |
| `src/index.html`, `src/demo.html` | 2 | **fold** into `06 llhls`. |
| the 5 public pages + `menu.html` | 6 | **keep**, re-shelled → `19`–`22` + generated menu. |
| `proto/{loops,paths,text,automation}` | 5 | **decide individually** — most look like superseded spikes; audit before folding. |
| `studio/console.html` | 1 | **keep as `23`**, rebuilt on shared panels. |
| `proto/jam` (4) + `proto/instrument` (2) + `proto/remixer/compose.html` | 7 | **fold** into `17 instrument`, `18 jam`, `22 remixer`. |

Rows sum to 70 (16+10+2+7+7+7+2+6+5+1+7). Net: **70 pages → 23 demos + 7 lab surfaces**, and the CDP harnesses survive as
scripts rather than as pages nobody can read.

## Order of work

1. `demo/shell/` + the `__demo` contract. Nothing else until this exists.
2. Re-shell **one** existing page as `16 looper` — it has no upstream, so it
   isolates shell bugs from network bugs. This is the proof the shell works.
3. `09 ladder`, then `15 seek` — the two demos that don't exist yet and carry
   the most story.
4. Act 0 (`01`–`05`) — cheapest, pure library, no infra.
5. Fold Acts 2–3 out of the m2m/selfrec/replay mega-UIs.
6. Re-shell the archive four (`19`–`22`).
7. Rebuild `23 studio` on the extracted panels. Last, because it consumes
   everything above.
8. Regenerate the menu from the demo directory listing, so
   `workers/view/build.mjs`'s allowlist stops being hand-maintained.

## Open questions

- **Is `positron.studio/NN-name/` the right public shape**, or should the demo
  sequence live under `/demo/NN-name/` and leave the root for the four archive
  viewers a phone visitor actually wants? The current menu is written for a
  visitor, not a reader of a 23-part story.
- **Do Acts 0–3 deploy publicly at all?** Several need a token
  (`elektron-jam` is token-gated, and a token in a public page is a published
  token — the looper's cross-device gap is exactly this). Options: keep Acts
  0–1 public and Acts 2–3 local-only, or add a tokenless rate-limited relay.
- `proto/{loops,paths,text,automation}` — audit needed before I can place them.

---

# Standard UI elements

Settled here so no demo invents its own. Two components carry every page in
Acts 0–4. **One already exists and must be adopted rather than rebuilt.**

## The divergence being fixed

Today the same play button is spelled four ways across pages — `id="play"`,
`id="playBtn"`, `id="playbtn"`, `id="plays"` — plus `pause`/`pauseBtn`,
`rate`/`rates`, `scrub`/`bar`. Every one is a hand-rolled rAF loop over a
hand-rolled DOM. That is the whole inconsistency problem in one line of grep.

## 1 · `transport-bar` — build this

`demo/shell/transport-bar.mjs` → `createTransportBar(el, deck, opts)`

Fixed DOM, fixed class names, one spelling forever:

```html
<div class="tbar">
  <button class="tbar-toggle" data-state="paused|playing|buffering">
  <div class="tbar-scrub"><div class="tbar-fill"></div><div class="tbar-head"></div></div>
  <output class="tbar-time">00:04.512 / 03:20.000</output>
  <div class="tbar-rates"><!-- rendered FROM caps.rates, never hardcoded --></div>
  <span class="tbar-badge"><!-- degraded reason · live · seek pending --></span>
</div>
```

Non-negotiable rules, each one closing a trap the library already documents:

- **Playhead comes from `observePosition(deck.transport, cb, { hz: 60 })`.**
  Never a page-local `requestAnimationFrame` loop. The library ships this
  function; ~15 pages currently reimplement it slightly differently.
- **Scrub reads `deck.range` and re-derives when `deck.rangeGen()` changes.**
  `range` is mutated in place so its identity is stable — the library's own
  comment says `rangeGen` exists precisely so "a scrubber can cheaply notice it
  must re-derive". Hold the array, watch the counter.
- **Rates are rendered from `caps.rates`**, snapped through the library's
  log-space lattice. If an adapter declares no lattice, render a static `1×`
  label — not a slider. A hardcoded 0.5×/1×/2× row is a lie the moment the
  adapter disagrees, and the library will answer
  `{degraded: true, reason: "caps.rates lattice […] cannot express …" }`.
- **Seek always goes through `deck.seek()`** — two-phase, reduce +
  `assertState`. Never write `transport.position`. This is what makes
  `15 seek` correct rather than approximately correct.
- **Degradation is visible.** Any `{ degraded, reason }` the library returns
  lands in `.tbar-badge`. Nothing is swallowed; a demo that silently ignores a
  degrade is a demo that lies about a measurement.
- **One keyboard table**: space toggles, ←/→ nudge, shift+←/→ coarse, `0`–`9`
  seek to percent, `,`/`.` step frame. Defined once in the component.
- **Capability-driven, not page-driven.** The bar renders itself from the deck's
  adapter caps (`rates`, `catchUp`, `continuous`, `loopState`, `audio`). A live
  stream with no seekable window renders no scrub track at all — the page does
  not decide this, the caps do.

## 2 · `strip` — already exists, adopt it

`timeline/strip.mjs` already ships `createStrip(canvas, deck, opts)` plus the
entire vocabulary: `tickLOD`, `TICK_LADDER`, `formatTime`, `aoristic`,
`spansOf`, `whenState`, `styleFor`, `idToColor`, `HATCH`/`hatchFor`,
`laneInk`, `strokePoly`, `zoomCeilingPps`, `ulpMs`, `DATE_WALL_MS`,
`registerRenderer`.

**Do not build a second timeline.** Standardise usage instead:

- Exactly one strip per demo, always immediately under the transport bar.
- Lane colour is `idToColor(id)` — never a per-page palette.
- Uncertainty is `hatchFor(tier)` — never a bespoke dash array.
- Tick density is `tickLOD(pxPerSecond)` — never hand-tuned per page.
- Absolute vs relative time is `formatTime(ms, major, absolute)` — one formatter.
- Zoom clamps at `zoomCeilingPps(t)`; deep time stops at `DATE_WALL_MS`.
- A demo needing custom drawing calls `registerRenderer(name, fn)`. It does
  **not** fork the strip. The registry is already there for this.

### Three sizes, no others

| class | height | used by |
|---|---|---|
| `strip-mini` | 44 px | Acts 1–2, where the timeline is context, not the subject |
| `strip` | 120 px | the default, Acts 0 and 3–4 |
| `strip-deep` | fills | `28 strip` and `21 megatimeline` only |

## 3 · The machine contract comes free

`mount()` publishes transport state into `window.__demo`:

```js
__demo.transport = { position, playing, rate, range, rangeGen, degraded }
```

So CDP asserts on **transport state, not DOM ids** — which is what makes the
~25 harness pages redundant. A script no longer needs to know whether this
page spelled it `#play` or `#playBtn`; there is no DOM in the assertion at all.

## 4 · Component mechanics — custom elements, no shadow DOM

**Decision: yes to `customElements.define`, no to shadow DOM.** Take the
lifecycle, refuse the encapsulation.

### Why the lifecycle is worth having

The m2m pages hand-roll **48 teardown calls** — 19 `clearInterval`, 19
`.close()`, 10 `removeEventListener` — and panels genuinely churn: both
`grid.html` and `show.html` have a *Rotate live page* control, and
`room-churn.html` exists as a dedicated churn test. Every panel holds
subscriptions that must be released: an `observePosition` ticker, a
`RTCPeerConnection`, a deck `dispose()`.

`disconnectedCallback` makes that teardown **structural instead of
remembered**. Remove the element, the subscription goes. That is the one thing
the imperative factory cannot give us, and it is exactly the failure mode a
rotating grid produces.

### Why shadow DOM is the wrong half

- **It fights the goal.** The entire point is *one* stylesheet enforcing
  consistency. Shadow DOM deliberately blocks inherited styles, so we would
  re-admit `shell.css` through `adoptedStyleSheets` or pipe every token in via
  `:host` custom properties — machinery whose only purpose is to defeat the
  feature we opted into.
- **It breaks the harness.** `document.querySelector` does not cross a shadow
  boundary, and the CDP scripts `evaluate()` constantly. Piercing needs
  `DOM.querySelector` with `pierce: true`, a different and clumsier code path.
  We would trade a working contract for style isolation we do not want.
- **The strip gains nothing.** `createStrip` draws to a `<canvas>`. Its
  internals are already opaque to the DOM; a shadow root around it isolates
  nothing that was not already isolated.

### Why attributes buy little here

A deck is a live JS object with getters (`durationMs`), a mutated-in-place
`range`, and a `rangeGen()` counter. It cannot be a string attribute. So the
declarative form still ends in JS:

```js
document.querySelector('positron-transport').deck = deck;   // property, not attribute
```

…which is `createTransportBar(el, deck)` with extra ceremony. Attributes stay
for the genuinely declarative knobs only — `size="mini|default|deep"`,
`labels="absolute|relative"`.

### The shape

Factory is the primitive; the element is a thin wrapper. Neither is privileged,
and the factory stays unit-testable without a DOM.

```js
// demo/shell/transport-bar.mjs
export function createTransportBar(el, deck, opts = {}) { /* … returns { destroy } */ }

class PositronTransport extends HTMLElement {
  set deck(d) { this.#bar?.destroy(); this.#bar = createTransportBar(this, d, this.#opts()); }
  disconnectedCallback() { this.#bar?.destroy(); this.#bar = null; }   // the whole point
  #opts() { return { size: this.getAttribute('size') || 'default' }; }
  #bar = null;
}
customElements.define('positron-transport', PositronTransport);
```

Same for `<positron-strip>` over `createStrip`, and for the `23 studio` panels
— which are the elements that actually mount and unmount.

### Rules

- **No shadow roots anywhere.** `shell.css` is global and cascades in.
- Every element implements `disconnectedCallback` and releases *everything*.
  A panel that leaks a ticker across a rotate is a bug, not a nuisance.
- Prefix `positron-` on all of them.
- Elements never hold state the deck already holds. The deck is the model; the
  element is a view. Two sources of truth for playhead position is how the
  current pages drifted apart.
- The factory must work with no custom element registered — that keeps Act 0
  demos usable in a bare `node` + jsdom test.

## Consequence for the line budget

With `transport-bar` + `createStrip` + `shell.css` doing the chrome, a demo
page is: markup for its own subject, wiring, and its measured numbers. The
250-line budget stops being a constraint and becomes roughly what a page
naturally weighs. `proto/m2m/show.html` is 1,142 lines today and perhaps 200 of
those are about the show.

# archive/shell — retired kit modules

## `granular-worklet.js` — retired 2026-09-14

251 lines of hand-written WebAudio granulator. It was the left pane of
`/grains/` under a page whose own line said *"the same granulator in this page
and on a Raspberry Pi"*, and **that claim was false**: a reimplementation that
sounds similar is not the same instrument, so every disagreement between the two
panes had two possible causes — the settings, or the fact that they were
different programs (LESSONS #81).

`/grains/` now loads the board's own compiled `pappus.scsyndef` into real
scsynth in the tab, so both ends run ONE definition. From that moment this file
had no reader: the only mentions left in the tree were comments saying *"this
pane used to be…"*. `demo/shell/` is ENUMERATED by `workers/view/build.mjs`,
so it was still being copied into every deploy for nobody.

⚠️ It is retired for a second reason, reported by the person listening rather
than measured: **it brought "so much noise (literally speaking)"**. That is the
expected shape of the failure the replacement fixed — an imitation passes every
comparison it was built to pass, and loses on the one nobody wrote a test for.

Kept rather than deleted because the grain scheduler in it is readable and the
`follow`-the-write-head idea is worth re-reading before anyone writes another
one. It is NOT a fallback and must not be wired back in: if a page needs a
granulator, the answer is the real one.

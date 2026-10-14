# Kit lessons: bar-drill

The longer comments cut from `demo/shell/bar-drill.mjs` and `demo/shell/bar-drill-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-bar-drill.md#<anchor>`.

<a id="header"></a>

## `bar-drill.mjs` module header

```text
demo/shell/bar-drill.mjs: the harness's transport drill, run by a page
against a bar it names.

🔴 WHY THIS EXISTS: `demo/verify.mjs` DRILLS ONE BAR PER PAGE AND A TABBED
PAGE HAS SEVERAL. The harness reads `__demo.transport` and nothing else, so a
bar built with `publish: false` is a bar the suite never presses. Decided
2026-10-04, when the owner regrouped twenty demos into four tabbed pages:
`/time/` alone will carry five bars, and four of them would have lost the
drill in the merge (`plans/plan-demo-structure.md` §3.2 and §5 step 1). So a
page runs the same drill as page asserts, through `d.assert`, against each
bar it did not publish.

🔴 IT IS THE HARNESS'S OWN DRILL, AND THE TWO MUST STAY IN STEP. Every number
in `DRILL` is a number in `demo/verify.mjs`'s transport block (the sleeps,
the 1-unit hold, the `5` key landing at half the range within 2 per cent,
the 53-pixel stride and the 90 floor on the strip, three tries), and the
verdicts are the same expressions. `node demo/shell/bar-drill-test.mjs`
reads the harness's source and fails if any of them has moved there and not
here, because two copies of one measurement are a measurement that will
disagree. Change one, change the other, run the test.

⚠️ ONE DELIBERATE DIFFERENCE, AND IT IS WHERE THE KEY IS SENT. The harness
dispatches its `5` at `window`, which every bar on a page hears. This sends
it at the bar's own element, and `transport-bar.mjs` hands a key whose
target sits inside a bar to that bar only (2026-10-04, with this file). On a
page with five bars the window key would seek all five and the drill could
not say which one landed. A page with one published bar is drilled by the
harness exactly as before.

⚠️ THE PUBLISHED BAR IS THE HARNESS'S. Drilling it here as well presses its
toggle twice from two places, and the harness runs its own drill right after
`ready`, so `assertBar` refuses `__demo.transport` rather than racing it.

⚠️ A BAR IN A CLOSED TAB CANNOT BE DRILLED, BY DESIGN. Keys do not reach a
bar inside a `[data-own-keys][hidden]` panel (see `tab-page.mjs`), so its
seek would fail for a reason that is not the bar's. `createTabPage`'s check
pass opens each tab before running its checks; a hand-rolled caller must do
the same, and the seek row says so in its detail when it was not done.
```

<a id="inkof"></a>

## `bar-drill.mjs` inkOf

```text
⚠️ SAMPLE AFTER A FRAME, AND MORE THAN ONCE, which is the harness's reason
verbatim: `resize()` in strip.mjs assigns `canvas.width`, which clears the
canvas, and only then schedules a redraw. A retry, not a tolerance: a strip
that never draws still fails, because every try lands after a fresh frame.
```

<a id="test-header"></a>

## `bar-drill-test.mjs` bar-drill-test module header

```text
demo/shell/bar-drill-test.mjs: the drill's verdicts, and its agreement with
the harness it copies, with no browser at all.

  node demo/shell/bar-drill-test.mjs

Two halves. The first grades the six verdicts `bar-drill.mjs` makes, and a
named proportion of them are NEGATIVE CONTROLS: a bar that says it is playing
and has not moved, a pause that drifts by one unit, a seek that lands 3 per
cent out, a strip of dark pixels. Those are the bars the drill exists to
fail, so a verdict that passed everything would go red here.

The second half is the reason this file exists. `bar-drill.mjs` is the
harness's drill re-run by a page, and two copies of one measurement are a
measurement that will disagree. So this reads `demo/verify.mjs`, strips its
comments (an absence or presence asserted over raw source grades the prose,
`positron-verify`), and requires every number in `DRILL` to be the number
the harness uses.

NOT GRADED HERE: `drillBar` itself, which needs a document, a real bar and
real time. `/kit/`'s TAB PAGE block runs it against a live bar and against a
bar whose clock is frozen, which must fail exactly one row.
```

# Kit lessons: knob-grid

The longer comments cut from `demo/shell/knob-grid.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-knob-grid.md#<anchor>`.

<a id="grid-header"></a>

## `knob-grid.mjs` module header

```text
demo/shell/knob-grid.mjs, knobs in boxes of their own, on a grid that keeps a
slot for every knob it was given.

🔴 THE ASK, 2026-10-10: *"Knobs: each has its own wrapper box, in a grid,
already reserve room for it. A kit component. In 40 41"*. `/concepts/synth/040/` (removed 2026-10-13)
had taken a knob the step did not offer out of the row (`cc-gone`) and hid
the whole bank when a step offered none (`cc-off`), so the row closed up and
opened out under the reader on every step. Here a knob that is switched off
keeps its box where it was, and only what is in the box dims, so nothing
reflows when a knob comes or goes.

⚠️ IT IS NOT `control-grid.mjs`, AND THE REASON IS WHAT EACH ONE IS FOR.
That one puts dial centres on a SQUARE lattice by MEASURING the biggest cell
and writing a fixed column count from script. This one is boxes of one
declared size whose count the browser derives from the width (`auto-fill`),
which is a stylesheet rule and needs no measurement at all. Folding the two
would have given the square lattice a second mode with nothing in common
with its first.
⚠️ AND IT IS NOT `createKnobBank`, which is a single scrolling row with
optional hairlines: a bank compares knobs ACROSS, and a grid of boxes wraps.

🔴 NO STYLE PROPERTY IS WRITTEN FROM HERE. The only thing set on an element
is `--kgrid-cols`, a custom property, from the `cols` option; the rules that
read it are in `shell.css` beside the knob bank.
```

<a id="grid-empty"></a>

## `knob-grid.mjs` createKnobGrid empty

```text
🔴 REFUSED, FOR THE REASON THE KNOB BANK REFUSES: a grid with no knobs is
   a container painting its own edges.
```

<a id="grid-row"></a>

## `knob-grid.mjs` createKnobGrid row

```text
`row`: one row that scrolls sideways and never wraps, the knobs area of a
concept synth (asked 2026-10-10, *"knobs ... independent in the knobs
area, horiz scrollable"*). It takes no `cols`.
```

<a id="grid-show"></a>

## `knob-grid.mjs` show

```text
Switch a knob on or off. Off keeps its box and dims what is in it.

⚠️ IT GOES THROUGH THE KNOB'S OWN `enable`, so an off knob takes no drag,
no wheel and no tab stop, which is the honest state of a knob whose cable
reaches nothing. A knob a page had already disabled for a reason of its
own is switched back on by `show(x, true)`; a page with both reasons keeps
the second one itself.
```

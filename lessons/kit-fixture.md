# Kit lessons: fixture

The longer comments cut from `demo/shell/fixture.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-fixture.md#<anchor>`.

<a id="header"></a>

## `fixture.mjs` module header

```text
demo/shell/fixture.mjs — the minimum honest adapter, shared by Act 0.

Act 0 has no network and no media, so it needs a kind that actuates something
observable and can be re-folded on seek. That is exactly the four-part
adapter contract: {caps, actuate, reduce, assertState}.
```

<a id="markadapter"></a>

## `fixture.mjs` markAdapter

```text
A kind whose "actuation" is appending to a list. reduce()/assertState() make
it seek-correct: after any seek the fold is recomputed from the rows, so the
demo shows the real two-phase behaviour rather than approximating it.
```

<a id="reduce"></a>

## `fixture.mjs` reduce

```text
state at a position = every mark at or before it.

reduceAt() hands us the PREFIX already (rows <= pos), and each row is
the PAYLOAD rather than the event, so there is nothing left to filter
and no `r.at` to filter on.
```

# Kit lessons: bay-traffic

The longer comments cut from `demo/shell/bay-traffic.mjs` and `demo/shell/bay-traffic-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-bay-traffic.md#<anchor>`.

<a id="wave"></a>

## `bay-traffic.mjs` WAVE

```text
While a stream flows, long bright bands move along it out to in: about one
band to a wire, a slow sweep every two and a half seconds, full strength
over a line that stays dim (asked 2026-10-10, *"make streamy connections
animation waaaay longer"*). Half
strength over a line raised to 0.8 was the same colour on the same colour and
read as still, reported 2026-10-10: *"i still do not see audio / vide
connector animation"*.
```

<a id="pulse-stops"></a>

## `bay-traffic.mjs` PULSE_STOPS

```text
🔴 A FEW ELEMENTS MOVED, NEVER 161 STOPS REWRITTEN, 2026-10-11. Every wire
   used to carry a 161 stop gradient whose every `stop-opacity` was written
   every frame, so a picture of 31 wires restyled about 5,000 elements sixty
   times a second. MEASURED on /typist/score/?n=6 playing, headless,
   10 s: style recalculation took 35.0 % of the main thread with the patchbay
   on screen and 0.4 % with it gone. Now the SHAPE is fixed stops written once
   (a Gaussian for a pulse, one sine period with `spreadMethod="repeat"` for a
   stream) and only its PLACE moves, as one `gradientTransform` per moving
   gradient, plus one opacity per wire whose level changed. A pulse is its own
   short lived glow path from a small pool, so pulses coalesce per wire per
   frame, and nothing at all is written for a wire that is still, for a
   picture scrolled off screen, or for a tab nobody is looking at.
```

<a id="test-header"></a>

## `bay-traffic-test.mjs` module header

```text
demo/shell/bay-traffic-test.mjs: `remove()` takes a wire's row out of the
traffic layer, against a fake DOM and a hand-driven animation frame.

  node demo/shell/bay-traffic-test.mjs

THE LEAK THIS FILE EXISTS FOR. `patchbay.mjs`'s trace() added a row for
every link it ever saw and never took one away, so a page that relinks
read one more row every frame for each link it had dropped (hero.mjs had
the same growth). A row's `read` is asked once a frame, so a read that is
still asked after `remove()` is a row that is still there.

FOUR OF THE 10 ARE NEGATIVE CONTROLS, marked `NEGATIVE CONTROL`: a remove
that took every row, or the wrong view's row, or nothing, fails them.
MEASURED 2026-10-14: `remove()` without its splice takes 4 red, and one
that matches on the link id alone, ignoring the view, takes 1 red.
```

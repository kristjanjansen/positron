# Kit lessons: audio-router

The longer comments cut from `demo/shell/audio-router.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-audio-router.md#<anchor>`.

<a id="header"></a>

## `audio-router.mjs` module header

```text
demo/shell/audio-router.mjs: wire a WebAudio graph from the audio links a bay
holds. Lifted 2026-10-14 from `route()` in demo/synth/patch-synth.mjs
(plans/plan-connect-ui.md slice 0), which lifted it from /radio/blend/.

THE RULE: disconnect every out first, then connect exactly what is held, so
an edge that was unlinked goes silent with no bookkeeping of what changed.
An in may be a node or an AudioParam (`filter:cutoff-in` is the filter's
detune, plans/plan-synth-patch.md §3 option A); `connect()` takes either.

Pure apart from the `connect` and `disconnect` it calls on what it is
handed, so node-runtime-test.mjs grades it with fake nodes and no browser.
```

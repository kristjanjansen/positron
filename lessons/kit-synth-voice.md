# Kit lessons: synth-voice.mjs

The long comments cut from `demo/shell/synth-voice.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-synth-voice.md#<anchor>`.

<a id="header"></a>

## synth-voice.mjs, file header

demo/shell/synth-voice.mjs: one oscillator per held note, a short fade in and
out, through a lowpass. Lifted 2026-10-14 from /synth/keyboard/'s inline sine
(plans/plan-connect-ui.md slice 1, decision D5: lift one copy). With the
defaults it is that sine: level 0.2 at full velocity, 10 ms in, 50 ms out,
and a lowpass at 8 kHz that a sine under A4 never reaches.
`cutoff: null` builds no filter at all, so a page that had none (the saw
copies, /synth/keyboard/) keeps exactly the nodes it made: osc, gain, bus.

NOTHING OPENS HERE. Parameters are plain state until `start(ctx)` is handed
an AudioContext; a note before that is dropped, and a knob turned before it
is already the sound the first note makes.

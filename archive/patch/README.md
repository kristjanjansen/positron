# patch, archived 2026-10-14

Was `demo/patch/`: a page that played one SuperCollider synth definition twice,
in scsynth compiled to WebAssembly (`engine.mjs`) and in the browser's own
oscillators (`synthdef-audio.mjs`, which was `demo/shell/synthdef-audio.mjs`
with this page as its only importer). It came off the site on 2026-09-13 when
its manifest row was removed, and nothing under `demo/patch/` was deployed
after that. Moved here by plans/plan-code-review-2026-10-14.md (C2).

It used the shell's vendor files. Its own `vendor/` held byte-identical copies
of `supersonic.js`, `scsynth-nrt.wasm`, `clockwork_audio_worklet.js`,
`chunks/*` and the two scsynth licences, which live in `demo/shell/vendor/`,
so those copies were deleted. `vendor/` here keeps only the two files the shell
does not have: `sonic-pi-beep.scsyndef` and its MIT licence
`LICENSE-supersonic-scsynth-synthdefs`.

It is not runnable from here as it stands: `engine.mjs` loads `./vendor/`
and `index.html` imports `/shell/synthdef-audio.mjs`. The deleted files are in
git history at the commit before the one that moved this folder.

# Handoff, 2026-09-22, session 43, closed

**A day of work that was entirely uncommitted this morning is committed in six
commits and live on the edge, and the instrument it was mostly about now runs
TWO unedited firmwares in one audio graph.**

✅ **NOTHING IS UNCOMMITTED AND THE DEPLOY MATCHES THE TREE.** `HEAD` carries
every file the previous handoff listed as at risk, `demo/muta/` included, and
`git status` is clean. The wasm mismatch that handoff opened with is gone:
`deploy.mjs` rebuilds, fingerprints and refuses to upload if a byte moved, and
it confirmed **BUILD 7e0f76b-114640-dbc2** on the edge itself.

```
f35d119  six kit components, and the case five pages had each built themselves
45c4716  /plai/ is /muta/, and a second unedited firmware runs after the first
4008985  three plans and the research they were written from
a07e93f  six lessons, and the backlog the day was worked from
7e0f76b  the build output for BUILD a07e93f-114602
e6dc49a  the stamp of the build that is on the edge, 7e0f76b-114640
```

## The push, still needing a person, now for the seventh session

🔴 **AND THERE IS A NEW FACT ABOUT IT: `git fetch origin` FAILS AS THE WORK
ACCOUNT.** Measured today: `fatal: could not read Password for
'https://kristjanjansen@github.com': Device not configured`. So the line the
previous handoff wrote, *verify the tip before running anything out of this
file*, cannot be carried out before the account switch. **The switch comes
first, then the fetch, then the lease is worth something.**

```sh
gh auth switch --user kristjanjansen
git fetch origin                                  # THIS is where the tip gets verified
git log -1 --format='%H' origin/main              # stale local ref says 4add3238...
git push --force-with-lease=main:<the sha the fetch just proved> origin HEAD:main
gh auth switch --user Kristjan-Jansen_enefit      # put it back, ASKED FOR 2026-09-17
```

⚠️ **IT IS A FORCE PUSH THAT DISCARDS ONE COMMIT ON `origin`.**
`git rev-list --left-right --count origin/main...HEAD` reads **1 149** against
the stale ref: one commit on `origin/main` that `HEAD` does not have, 149 the
other way. That one commit is what the lease is protecting and what the push
overwrites, so somebody has to look at it before deciding.

## Deployed, and what to open

Everything below is live and was confirmed after the deploy, not before it.

- **https://positron.studio/muta/** two of Emilie Gillet's firmwares chained,
  an oscillator into an effect. ✅ **38/38 green AGAINST THE DEPLOY**, which is
  the check the previous handoff could not make.
- **https://positron.studio/kit/**, **/pack/**, **/tom/**, **/wish/** all
  current as of this build.
- 🔴 **`/plai/` IS GONE AND 404s.** It existed on the deploy for part of one
  day. Any link to it out of an older file is answered by `/muta/`.

## The one thing to carry forward above everything else

🔴 **THE BEST PARTS OF THE VCV ECOSYSTEM WERE NOT WRITTEN FOR VCV, AND `/muta/`
NOW PROVES IT TWICE IN ONE GRAPH.** `plans/plan-vcv-modules.md`, 881 lines.
`AudibleInstruments` is GPL glue around a **git submodule of Emilie Gillet's MIT
firmware**, and its Plaits adapter is **391 lines of which six touch the DSP**.
✅ **TWO ARTEFACTS, ONE BUILD SCRIPT, TWO DIFFERENT DIGESTS**, which is the
assert that says the pipeline is general rather than one lucky module:
`ece3f3c55e5ab63a` for the oscillator and `1a0619e5a94767ee` for the effect,
over the same pinned commits, **0 wasm imports each**, **195.0 KB and 76.4 KB**
against `scsynth.wasm`'s **1740.8 KB**, first quantum **195 ms** after the
fetch began.
⚠️ **AND IT IS STILL HALF BUILT, WHICH HAS NOT CHANGED.** Nothing has been
built on the board, so each digest is a hook rather than a proof.

## What landed today

- **`/muta/`**, which was `/plai/` until the afternoon. Asked for as `rename
  plai demo to muta and implement warps in there`, settled as `no muta is slug.
  it contains 2 istriments chained, plai and warp`. **38/38 with 32 page
  asserts**, against the oscillator alone at 26/26 with 20.
  🔴 **HALF OF WARPS IS AN OCTAVE DOWN AT 48 kHz AND THE PAGE PRINTS IT RATHER
  THAN HIDING IT.** Its filter bank coefficients are baked at 96,000, so the
  twenty vocoder bands land at **43.7 to 3520 Hz**, which the readout reports as
  **-1.00 octaves**. The six cross modulation algorithms are exactly right,
  because `Modulator::Init` takes the rate and gets the oscillators and the
  follower times from it. **Running the context at 96 kHz is not the repair**:
  `plai_init` refuses any rate but 48000, and the two firmwares would stop being
  able to feed each other at all.
  ⚠️ **AND THE CELL ONLY SAYS IT WHILE THE VOCODER IS THE PATH RUNNING**, which
  is its own assert. A shift reported under the cross modulation algorithms
  would be a true number about the wrong signal.
  🔴 **THE BLOCK SIZE IS 12 AND `voice.cc` USES THE CONSTANT, NOT THE `size`
  ARGUMENT.** Unchanged and still the trap. Warps does NOT have it: every
  `kMaxBlockSize` there is an array dimension and every loop uses `size`.
- **Six kit components**: `range-slider.mjs`, `check.mjs`, `synth-view.mjs`,
  `step-grid.mjs`, `control-grid.mjs` and `instrument.mjs`, **140 asserts
  across six tests that need no browser**, all green today. `/kit/` 113/113 to
  147/147, `/tom/` converted and back at exactly 44/44 having lost 268 lines of
  CSS into the component.
- **Three plans**, `plan-vcv-modules`, `plan-two-more-modules` and
  `plan-browser-models`, and the research the first was written from.
  ⚠️ **`plan-two-more-modules` IS HALF SPENT ALREADY**: its Warps proposal
  shipped the same day inside `/muta/` and its 48 kHz recommendation is what
  that page does, so §3 describes a thing that exists and §4 is still a
  proposal. Its header says so.
- **Six lessons**, 107 to 112, all in `LESSONS.md`.

## What is open

1. **`origin/main`**, above. The only item needing a person, and the new fact
   about the fetch is worth reading before trying it.
2. 🔴 **NO PAGE IS GRADED ON A PHONE.** `verify.mjs` runs at 756 px with no
   viewport override, and **the only assert in this repository that entered a
   media query was removed on request** with the 320 px card specimen.
   `/circuit/`'s own *the panel box starts and ends where the rest of the page
   does* is green while being false at 390 px by 286.0 px, and `/muta/` now
   carries the same shape of claim at the same width. `/muta/`'s nine knob
   columns have never been drawn below 560 px.
   `plans/plan-panel-component.md` has three unpriced options.
3. **The board half of `/muta/`.** One aarch64 build of the same source, then
   render N samples at both ends and diff them. That is what turns a digest
   from a hook into a proof, and there are two digests to do it to now.
   ⚠️ The Pi is a live service in another building and needs asking.
4. **`CHANNEL STRIP`'s specimen**, asked for as *"make real channels with
   dividers (see panels) and line things up"*. Not started.
5. **Four checks stopped being made in session 43 and every one is named in the
   file where it was**: a read only grid's computed cursor, opacity and tab
   stops; a real strip scrolling at 320 px; that a wavetable and a blend are
   refused for DIFFERENT stated reasons; and that one component turns its
   picture off at wave 14 and on again at wave 0.
6. **The segmented choice is still `button`, not `role="radio"`.** Eleven call
   sites and a change to what every page announces. Recorded in `choice.mjs`.
7. **Two vertical rhythms exist**: `.pos-stack` is `--pos-gap: 40px` and
   `.pos-tabs-p > * + *` is **22 px**, the old pre-2026-09-20 value, live on
   every tabbed page.
8. **The second proposal in `plan-two-more-modules` is unbuilt**, and it is a
   proposal rather than a plan with a date on it.
9. **Everything carried over from session 42** that was not touched: `/bay/`
   unheard, `vad_filter` unmeasured, Estonian deliberately unscheduled, and the
   `/evo/` and `/shape/` asks in `BACKLOG.md`.

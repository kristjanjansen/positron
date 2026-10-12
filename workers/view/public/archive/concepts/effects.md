# Effects (concept 011, later 093), archived 2026-10-10

Asked: *"arvhive / rm 093"*, then *"093 just keep in md or smth"*. The page is
gone from the site and from the tree; its last version is `demo/concepts/093/index.html`
in commit `0bf0a195` (`git show 0bf0a195:demo/concepts/093/index.html`).

## What it showed

The on-screen keyboard and a saw synth, with one MIDI effect and one audio
effect, each switched by a choice.

- **MIDI fx, an octaver, is parallel links.** A transform maps one note to one
  note, so three octaves are the plain `keys -> synth` link plus one link per
  added voice carrying `{ op: 'transpose', by }`, with voices `[0, 12, -12]`.
- **Audio fx, a low-pass filter, is a node of its own** (`web:fx`, `audio-in`
  and `audio-out`, a `BiquadFilterNode` at 400 Hz, Q 6). The sound is linked
  through it: `synth -> fx -> speaker`, and the WebAudio graph followed the
  links the bay held.
- A sawtooth, not a sine, because a low-pass filter has nothing to take away
  from a sine and cannot be heard on one.

## The patch

    web:keys:midi-out -> web:synth:midi-in
    web:keys:midi-out -> web:synth:midi-in { transpose +12 }     (octaver on)
    web:keys:midi-out -> web:synth:midi-in { transpose -12 }     (octaver on)
    web:synth:audio-out -> web:fx:audio-in                       (filter on)
    web:fx:audio-out -> web:speaker:audio-in                     (filter on)
    web:synth:audio-out -> web:speaker:audio-in                  (filter off)

The kit's patchbay page still draws these links as `EFFECTS CONCEPT`.

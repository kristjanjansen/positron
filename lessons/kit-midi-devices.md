# Kit lessons: midi-devices.mjs, midi-devices-test.mjs

The long comments cut from `demo/shell/midi-devices.mjs` and `demo/shell/midi-devices-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-midi-devices.md#<anchor>`.

<a id="header"></a>

## midi-devices.mjs, file header

demo/shell/midi-devices.mjs: the MIDI inputs plugged into this machine as
`device` nodes on a page's bay. One node per input, `<site>:midi`,
`<site>:midi-2`, ..., named after the device, with one `midi-out` port
linked to the in-ports a page names. A device keeps its node id across a
replug, and an unplugged one lets go of its held notes and loses its links.

The page decides what a message becomes (`message`); by default a note on
or off is sent along the device's port and anything else is ignored.

<a id="test-header"></a>

## midi-devices-test.mjs, file header

demo/shell/midi-devices-test.mjs: `createMidiDevices` against a real bay
and a fake MIDIAccess, with no browser.

  node demo/shell/midi-devices-test.mjs

What is graded: an input becomes a `device` node linked to the in-ports a
page names; its notes travel along that link; unplugging releases what it
held and drops the links; a replug gets the same node id back.
THREE OF THE 9 ARE NEGATIVE CONTROLS, marked `NEGATIVE CONTROL`.

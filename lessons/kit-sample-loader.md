# Kit lessons: sample-loader.mjs

The long comments cut from `demo/shell/sample-loader.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-sample-loader.md#<anchor>`.

<a id="header"></a>

## sample-loader.mjs, file header

demo/shell/sample-loader.mjs: samples out of whatever somebody drops on a
page. A `.circuitpack` (zip or sysex), a zip of packs or of a bulk transfer,
a zip of plain WAVs, or loose WAVs picked together. It returns named samples,
each one `readWave`'s result, in the pack's own order.

Lifted 2026-10-12 out of /tom/, whose `openPack`, `openZip` and
`openStream` this is, word for word in what they say, for
/drums/samples/ (*"drums that play samples"*). /tom/ calls the three
it always had; the plain WAV cases are `openFiles` and are new.

🔴 READ ONLY, AND NOTHING LEAVES THE PAGE. It reads bytes a person handed
over with `unzip.mjs` and `circuit-sample.mjs` and names no network API,
MIDI port or SysEx output at all. `circuit-sample.mjs`'s own property holds
here: a bulk transfer is decoded, never sent; whether one WRITES FLASH on an
instrument is unsettled and nothing here can send one either way.

⚠️ A FILE THAT WILL NOT PARSE KEEPS ITS PLACE AND CARRIES ITS REASON
(`samplesIn`'s rule): a caller gets `wave.ok === false` and `row.why`, never
a shorter list.

<a id="shortest"></a>

## sample-loader.mjs, `openPack()`, only where something parsed

⚠️ ONLY WHERE SOMETHING PARSED. `shortest` is 0 over an empty set.

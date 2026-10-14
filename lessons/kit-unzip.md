# Kit lessons: unzip.mjs, unzip-test.mjs

The long comments cut from `demo/shell/unzip.mjs` and `demo/shell/unzip-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-unzip.md#<anchor>`.

<a id="header"></a>

## unzip.mjs, file header

demo/shell/unzip.mjs — a zip file, read in the browser, with nothing vendored.

🔴 WHY THIS IS NOT A LIBRARY. `DecompressionStream('deflate-raw')` is in every
browser this project targets and in node, so the only thing a zip library
would add here is the container: a central directory, a local header and an
offset. That is about a hundred lines and it is READ ONCE, which is exactly
`LAYOUT.md`'s test for when to write rather than take. A 40 KB dependency for
a hundred lines of structure is the trade this repository already refused for
glTF.

🔴 AND IT WAS MEASURED BEFORE IT WAS WRITTEN. `New Pack.circuitpack` holds
**164 entries, 161 deflated and 3 stored, no zip64**, so those are the two
cases that have to work and the one that does not have to.

⚠️ IT REFUSES WHAT IT CANNOT DO, BY NAME. Zip64, encryption and any
compression method other than stored or deflate throw with the method number
in the message. A reader that silently returned nothing for an encrypted entry
would be the `moq.mjs` 404 again: a wrong answer that looks like an empty one.

<a id="local-header"></a>

## unzip.mjs, readZip, the local header lengths

⚠️ THE LOCAL HEADER'S NAME AND EXTRA LENGTHS ARE NOT THE CENTRAL ONES. They
are routinely different, because the extra field carries different things in
the two places. Reading the central directory's lengths here gives a stream
that starts a few bytes off, which inflates to noise rather than to an error.

<a id="test-header"></a>

## unzip-test.mjs, file header

demo/shell/unzip-test.mjs — the zip reader, against the real pack.

  CIRCUIT_PACK=<path> node demo/shell/unzip-test.mjs

🔴 IT READS THE OWNER'S CIRCUIT PACK, WHICH LIVES IN THE OWNER'S PRIVATE PACK
REPOSITORY, NOT IN THIS ONE. Reading is free and nothing here writes. It is the right fixture precisely because it is real: a
zip somebody made for a test has whatever shape the test wanted.

THREE OF THESE ARE NEGATIVE CONTROLS, because a reader that returned an empty
array for everything would pass a suite that only counts entries.

<a id="test-wav-header"></a>

## unzip-test.mjs, the WAV header

⚠️ THE WAV'S OWN HEADER IS A SECOND SOURCE. A reader that returned the right
NUMBER of bytes of rubbish would pass the line above.

<a id="test-corrupt"></a>

## unzip-test.mjs, corrupt inflate

🔴 THE ONE THAT PROVES THE INFLATE IS REAL. Corrupt one byte in the middle
of a deflated entry's data and it must not come back as a plausible
shorter buffer.

# Kit lessons: media.mjs

The long comments cut from `demo/shell/media.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-media.md#<anchor>`.

<a id="header"></a>

## media.mjs, file header

demo/shell/media.mjs — the media-element facts every recording page needs.

🔴 THIS FILE EXISTS BECAUSE `resolveDuration` WAS WRITTEN FIVE TIMES. It is in
`capture`, `memento`, `keep`, `take` and `show`, under three different names
and with three different timeouts, and `plan-session` §6(b) asked for this
module and it did not happen. `/stage/` needed a sixth, which is the point at
which a duplication stops being an oversight and becomes a decision.

⚠️ THE FIVE COPIES ARE NOT DELETED HERE, AND THAT IS DELIBERATE. Each sits in
a page with its own asserts, and a sweep that rewrites five working pages to
prove a point is five chances to break something for no measured gain. What
this file stops is the SIXTH. Moving the others over is a line in `BACKLOG.md`
and wants its own run with the suite green either side of it.

<a id="resolve-duration"></a>

## media.mjs, resolveDuration

How long a recording is, in milliseconds, out of an element that does not
want to say.

🔴 `MediaRecorder` OUTPUT REPORTS `duration: Infinity`, which leaves a
transport bar with no range to scrub. The file is fine; the header simply has
no duration in it, because the encoder did not know one when it wrote the
header and never went back.

The dance is: wait for metadata, and if the duration is still not finite, SEEK
FAR PAST THE END. The browser then walks to the real end, discovers where that
is, and fills the duration in. Then come back to the start, because a page
that leaves the playhead at 1e6 has moved the picture for its own convenience
and a visitor sees it.

⚠️ BOTH WAITS ARE CAPPED, AND NEITHER REJECTS. A media element that never
fires `loadedmetadata` is an ordinary thing (no data, a dead URL, a tab that
was backgrounded), and an await with no timeout is a hang rather than an
error. `null` means "could not be resolved", which the caller must handle in
words rather than by printing 0.

@param {HTMLMediaElement} video the element holding the recording.
@param {{metaMs?: number, seekMs?: number}} [opts] the two caps, in ms.
@returns {Promise<number|null>} milliseconds, or `null` if it never resolved.

<a id="wait-for-first-frame"></a>

## media.mjs, waitForFirstFrame

Wait until a video element is really carrying pictures.

🔴 A WHEP TRACK EXISTS BEFORE IT CARRIES ANYTHING, and that is real knowledge
rather than a nicety: `whepPlay` resolves when the peer connection has
negotiated, which is well before Cloudflare has sent a frame. A page that puts
its badge to `live` on that promise is reporting a socket, not a picture.
`/keep/` learned this inline; this is the same loop with a name.

⚠️ IT WATCHES A FRAME COUNT, NOT `readyState`. `requestVideoFrameCallback` is
the browser saying a frame was PRESENTED. Where it does not exist the fallback
is `readyState >= HAVE_CURRENT_DATA` plus a non-zero `videoWidth`, which is
weaker and is why the return value says which one answered.

@returns {Promise<{frames: boolean, how: string, w: number, h: number}>}

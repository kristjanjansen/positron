# Kit lessons: err-live

The longer comments cut from `demo/shell/err-live.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-err-live.md#<anchor>`.

<a id="header"></a>

## `err-live.mjs` module header

```text
err-live.mjs — ERR's live HLS, as the two things a page actually needs:
 a MAPPING between the picture's clock and wall-clock time, and an honest
 answer to "will ERR hand this segment over?".

 Promoted out of `demo/flipper/` on 2026-09-08, where every one of these
 lived inline. `now` imported it too until it merged into `flipper` on
 2026-10-05. A promotion that leaves
 the original as the only caller is not a promotion (LESSONS #30).

 THREE FACTS THIS MODULE EXISTS TO CARRY, each paid for once already:

 1. ERR blocks live segments BY PROGRAMME, not by age, and a refusal is a
    403 with NO `access-control-allow-origin` — which reaches a browser as a
    CORS failure, so hls.js holds an empty buffer and the picture just stays
    black. `fetch().then(r => r.ok)` is false for a 403 that carries ACAO;
    `.catch()` is the 403 that does not. Both mean refused.

 2. A SEGMENT THAT HAS FALLEN OFF THE BACK OF THE WINDOW ANSWERS THE SAME
    WAY — 403, no ACAO. Measured 2026-09-08: `SN − 1000` refused, `SN − 30`
    served, on a channel refusing nothing. So the status code cannot tell a
    rights refusal from an expired one, and the discriminator is MEMBERSHIP:
    only ever probe segments that are in the playlist you just fetched.

 3. A refusal storm is expensive. Three consecutive `fragLoadError`s is
    enough to tell a wall from a blip, and the answer is `stopLoad()` rather
    than `pause()` — the buffer already holds real material, and pausing
    throws away picture the reader can still watch. Arrived at after one run
    issued 1794 refused requests and discarded 113 s of picture.
```

<a id="base"></a>

## `err-live.mjs` BASE

```text
🔴 ONE HOOK, BECAUSE BOTH PAGES COME THROUGH HERE. `?base=` moves every ERR
URL either page opens onto another host, and `demo/fake-err.mjs` is what the
harness puts there: a stand-in broadcaster with the same playlists, the same
sliding window and the same three refusal shapes. Until it existed, the two
pages with the most machinery in them were the two nobody could run, because
running them meant appearing in a public broadcaster's audience figures.

⚠️ IT REWRITES THE PATH AND NOTHING ELSE, which is the same shape `/tapes/`
already uses. With no `base` the parameter is empty and every URL is handed
back untouched, so a visit is byte for byte what it was.

⚠️ THREE HOSTS COLLAPSE ONTO ONE AND THAT IS DELIBERATE. `live.err.ee` has
the playlists, `www.err.ee` has the schedule and `icecast.err.ee` has the
radio mounts, and their paths do not collide, so one base can stand in for
all three. A page that needs to know which of the three it is talking to
would have to keep the original URL; neither does.
```

<a id="readplaylist"></a>

## `err-live.mjs` readPlaylist

```text
The media playlist behind a master, parsed into the parts a timeline wants.

 `pdt` is the ONE `EXT-X-PROGRAM-DATE-TIME` ERR puts on the first segment,
 and it is what makes an absolute-wall-clock position domain possible at
 all: segment i covers `pdt + Σ EXTINF[0..i)`. `date` is the server's own
 clock off the response header, which is how a page can measure the
 visitor's clock without ever silently correcting it.

 🔴 PASS `variant` BACK IN TO REFRESH, OR EVERY REFRESH IS A NEW SESSION AT
 ERR. MEASURED 2026-08-27 (`research/err-live-feeds-2026-08.md`): the master
 mints a fresh `?id=<15 digits>` session on every fetch, a bare variant
 answers 400 and a stale or foreign id answers `Failed to set session: not
 found`. `/now/` used to re-read the master once a second to move its window,
 which is 3600 sessions an hour per open tab in the books of a broadcaster
 that has already said our traffic corrupts its audience figures. With
 `variant` the master is skipped, and it is read again only when the variant
 stops answering, which is what an expired session looks like.

 🔴 A REFUSED PLAYLIST THROWS. It used to be parsed: a 400 body has no
 `#EXTINF`, so a stale session came back as a playlist with no segments, no
 PDT and a zero window, and every caller took that for a real answer.

 `masterRead` says whether this call went to the master, so a page can
 count sessions rather than claim it opens one.
```

<a id="sn"></a>

## `err-live.mjs` segment sn

```text
🔴 THE SEQUENCE NUMBER IS `MEDIA-SEQUENCE + index`, WHICH IS WHAT THE
HLS SPEC SAYS AND WHAT hls.js CALLS `frag.sn`. It used to be read out
of the file NAME with `/-(\d+)\.[a-z0-9]+$/`, which held for the
stand-in's `seg-<sn>.ts` and is a guess about ERR's `.m4s` names: a
name without that shape, or one carrying a `?id=`, gives NaN, and
`/flipper/`'s jump to the newest served frame looks a fragment up by
this number. Counting is right whatever the names are.
```

<a id="probesegment"></a>

## `err-live.mjs` probeSegment

```text
Two bytes, to ask ERR whether it will serve one segment.
 Only ever called with a segment FROM THE PLAYLIST JUST READ — see fact 2.
```

<a id="findservededge"></a>

## `err-live.mjs` findServedEdge

```text
🔴 WHERE THE BROADCASTER STOPS SERVING, FOUND BY ASKING IT TWO BYTES AT A
TIME. Promoted out of `demo/flipper/` on 2026-09-18, where it was called
`servedStart` and was the only thing on either page that could survive a
refused live edge. `/now/` had no such path at all: pointed at a channel
whose newest forty-five minutes are refused it showed black and took six
asserts red, all downstream of a clock that never started. Both pages call
this now, which is what makes it a promotion rather than a move.

It sweeps BACK from the live edge because the answer is nearly always at the
edge and nearly always "yes": the first ask is the newest segment in the
playlist, and on a channel that serves its edge that is the only request this
ever makes. A channel that refuses its edge costs up to `steps` asks.

🔴 ONLY EVER SEGMENTS FROM THE PLAYLIST JUST READ — fact 2 at the top of this
file. A segment that has fallen off the back of the window answers 403 with
no ACAO, exactly like a rights refusal, so membership is the only thing that
tells the two apart.

@param {object} pl a `readPlaylist` result
@param {{steps?: number, backoffS?: number}} [opts]
@returns {Promise<object|null>} null when there was no playlist to ask about

The result always carries `probes` (what was asked, newest first) and
`blockedMin`. Exactly one of three shapes is true:
  `edgeServed`  the newest segment was handed over; nothing is blocked
  `position`    something newer than it is refused, and this is where to
                start: `backoffS` behind the newest instant that was served
  `none`        every point asked was refused, across the whole window
```

<a id="backoff"></a>

## `err-live.mjs` backoff

```text
How far BEFORE the boundary to start. Three segments left six seconds of
material and then the playhead walked straight into the blackout, where
hls.js retried refused fragments 1794 times in one run. This buys enough
picture to be worth watching; `wallHandler` stops the storm at the far
end of it.
```

<a id="position-sn"></a>

## `err-live.mjs` position sn

```text
THE SN, NOT THE INDEX: positions slide as the window rolls, and a
later probe's index means nothing in the timeline the engine holds.
The sequence number is the one coordinate both agree on.
```

<a id="surveychannels"></a>

## `err-live.mjs` surveyChannels

```text
The same question asked of several channels, one after another.

⚠️ THIS IS SELF-CHECK WORK AND BOTH CALLERS GATE IT. A visitor watching one
channel has no use for what the other two are refusing, and asking costs a
playlist and a probe per channel on somebody else's server. What it buys is
the only thing that can tell a working boundary finder from one that answers
the same way whatever it is asked: the three channels wear three different
shapes, so a run sees a refused edge and a served edge in the same breath.
```

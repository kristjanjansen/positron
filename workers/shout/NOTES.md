# shout — NOTES

## 🔴 IT TEES NOW, AND THAT IS THE WHOLE POINT OF THE OBJECT

**MEASURED 2026-09-16 against the deployed worker, on `vikerraadio`:** three
clients listening at once, and `GET /tee/vikerraadio` answered

```json
{"listeners":3,"peak":3,"upstream":true,"title":"Võimla*",
 "pulled":424321,"served":602027,"dropped":0,
 "upstreamConnections":1,"openFor":4701}
```

**One connection upstream, three downstream.** It served 602 KB to clients out
of 424 KB pulled from the origin, which is the 1.4x that says the same bytes
went to more than one person. All three clients received their full 200 KB and
the ICY title parsed out of the single upstream and back into each of them.

Before this the worker was a pass-through: `fetch(upstream)` per request, no
caching (a cached radio stream is a contradiction), so **N browsers were N
listeners at the broadcaster**, plus one per harness tab and one per orphaned
Chrome. On 2026-09-15 that reached about a hundred concurrent clients against
one operator's limit. On 2026-09-16 ERR said the same traffic was corrupting
their public listener statistics, which is a fact about their funding rather
than about their bandwidth.

⚠️ **The ICY metadata is stripped and re-inserted per subscriber**, and that is
not a flourish. Icecast interleaves a metadata block every `icy-metaint` bytes
counted from the first byte THAT CLIENT received. A tee hands a late joiner
bytes from the middle of the origin's stream, so its byte 0 is not the origin's
byte 0: every block it expected would land in the wrong place and it would read
audio as a length byte and delete that many bytes of sound.

⚠️ **The last listener leaving eventually closes the origin.** A tee that holds
a connection nobody is hearing is WORSE than the pass-through it replaced. There
is a 20 s linger because a page reload is two seconds of nobody and hanging up
on every one of those is more connections, not fewer.

⚠️ **A HEAD still goes direct**, because it is a health question that wants the
origin's own answer and hangs up before a frame of audio is paid for. `/rec/`
recordings are files and were never in this path.

⚠️ **There is deliberately no `?direct=1`.** An escape hatch back to a
connection per client is the defect with a flag on it.

`GET /tee/<station>` is the readout. `upstreamConnections` must be 1 whenever
anybody is listening; anything else is the tee not working.

---


SHOUTcast/Icecast is one HTTP response that never ends. There is no manifest, no
segment list and no seek: the server writes audio frames at roughly wall-clock
speed and the client plays whatever it has. The questions worth asking of a
Cloudflare Worker in front of one are therefore not the LL-HLS questions.

⚠️ **AUDIO FRAMES, NOT MP3 FRAMES.** Six of the eight mounts in the allowlist are
MPEG Layer III and two are AAC in ADTS. Nothing in this worker cares, because it
passes the body through untouched; the one place it matters is the
`content-type` header, which is forwarded and never invented. See the IDA
section below.

## The origin

`icecast.err.ee`, Icecast 2.4.4, HTTP/1.0, `Connection: Close`, 128 kbps MP3.
Five public stations (`vikerraadio`, `raadio2`, `klassikaraadio`, `raadio4`,
`raadiotallinn`).

Two facts about it decided the whole design:

- **No `access-control-allow-origin`, on any response.** A browser may put the
  mount in an `<audio>` element and do nothing else with it: no `fetch`, no byte
  counting, no `icy-name`, and — because a media element without CORS may not be
  connected to a WebAudio graph — no analyser, no level, no spectrum. The relay
  exists to hand the same bytes back with CORS on them. That is the product.
- **`HEAD` answers `400 Bad Request`.** Measured on every mount. Any uptime
  checker that HEADs an Icecast URL is reading a healthy station as down. The
  relay does a GET upstream, keeps the headers and cancels the body, so `HEAD`
  through it is a 200 with `icy-name` on it.

## What a listen looks like

Both paths opened in the same tick, 60 s, `rig/shout/measure.mjs`, 2026-09-06.
The deployed column is `shout.positron.studio` — a real Cloudflare colo, not
`workerd` on a laptop:

| | direct origin | through the EDGE | (local workerd) |
|---|---|---|---|
| ttfb | 325.7 ms | **279.3 ms** | 252.1 ms |
| first byte | 502.5 ms | 455.0 ms | 400.5 ms |
| burst in the first 250 ms | 67.0 KiB | 67.0 KiB | 67.0 KiB |
| bytes / chunks | 993 KiB / 726 | 993 KiB / 1322 | 995 KiB / 1325 |
| mean rate | 135.7 kbps | 135.6 kbps | 135.9 kbps |
| chunk gap p50 / p95 / max | 79.2 / 106.1 / 218.0 ms | 41.8 / 104.9 / 216.1 ms | 74.6 / 105.1 / 227.6 ms |
| gaps past a 1 s jitter buffer | 0 | 0 | 0 |
| audio held beyond realtime | 3.62 s | 3.56 s | 3.71 s |

**Same byte, both paths: −0.8 ms of carry through the edge** (−1.4 ms through
local workerd). The relay hands Cloudflare the upstream `ReadableStream` and
touches nothing, so bytes leave as they arrive.

Two things in that table are worth saying out loud.

**The relay answered 46 ms SOONER than the origin.** Not a trick of the
measurement: Cloudflare terminates the connection at a colo in Tallinn
(`cf-ray … -TLL`) and the origin is in the same city, so the client's handshake
is with something nearer than the origin while the colo's hop to the origin is
local. Read it as "an edge in front of an origin in the same city", not as
"Cloudflare is faster than the origin" — from further away the connect saving
would grow and the carry, which is what this table exists to bound, would be
the number to re-measure.

**The edge re-chunks the stream.** Same 993 KiB, 1322 writes instead of 726, so
the median gap between chunks halves (41.8 ms against 79.2) while p95 and max
stay put. Smaller, more frequent writes: no effect on a player, but it is why
chunk COUNT is not a defect signal here.

That number is the only one worth quoting, and it is not TTFB. Icecast bursts
about 64 KiB — some four seconds of already-encoded audio — at every new
listener, so a path that connects later can still be holding more audio, and
first-byte timings compare connection setup rather than delivery. The rig takes
a 16 KiB needle out of one stream, finds it in the other (the relay does not
transcode, so the frames are identical), and subtracts the two arrival times of
that exact byte. No clock sync, no correlation window, no assumption about the
encoder.

Read the mean rate the same way: 135.9 kbps over 60 s on a 128 kbps station is
the burst amortised, not a fast link. Over a 7 s window the same stream reads
195 kbps. `26 shout` therefore asserts on the rate measured after the burst has
landed (130 kbps), and separately on the burst itself (3.67 s of audio in hand).

## Ten minutes on one response

`rig/shout/measure.mjs 600` through the edge, 2026-09-06: **9431 KiB in 12806
chunks at 128.77 kbps** — exactly nominal once the 3.6 s burst has amortised
away — and the Worker held that single response open for the whole 600 s
without a reconnect. One gap of **1684 ms**, the only one over a second; a
listener holding Icecast's burst would not have heard it, a listener with a
1 s jitter buffer would. So: streaming responses are not the limit here, and
the thing to watch is the occasional gap, not the duration.

## `/rec/` — the same station's past (2026-09-15)

Radio 1965's server started recording broadcasts this week. Icecast's on-connect
hook runs `ffmpeg -c copy` against the mount when a broadcaster sets a
`save_stream` flag, on-disconnect stops it and rsyncs the mp3 to `eccm.ee`, and
a `streamrecording` event replaces the `livestream` one with an https URL. Read
from `tarmoj/radio` at `7366bfe`.

MEASURED 2026-09-15 against `https://eccm.ee/radio/streams/`:

| | |
|---|---|
| a recording | 200, `audio/mpeg`, `accept-ranges: bytes`, LiteSpeed |
| a Range | 206 with `content-range`, so seeking works |
| CORS | **none**. Same defect as the live mount |
| their events API | `allow-origin: *` already, so only the audio needs carrying |

So `/rec/<name>.mp3` re-serves one with CORS, forwarding the client's `range`
straight through. Three things about it are deliberate:

- **The name is matched against a pattern, not taken as a parameter.** Their
  hook writes a slug of at most twenty characters and a datestamp, so that is
  what is accepted. `?url=` would make this an open proxy for anything on
  eccm.ee, which is the same reason `STATIONS` is an allowlist. PROVED by
  breaking it: `../../etc/passwd`, `anything.mp3`, a capitalised `.MP3` and a
  seven-digit datestamp all answer 404.
- **The status is passed through and the guard is `>= 400`, not `!ok`.** A Range
  answers 206, and guarding on `ok` would have made every seek report the origin
  as broken.
- **It is cached, and the live mounts are not.** A recording never changes once
  it is written; `public, max-age=86400, immutable`. That is the opposite of the
  rule above it, and the reason is that these are files rather than streams.

MEASURED through the relay on the one recording that exists (a 7 s test, 116823
bytes): 200 with `content-length` and `accept-ranges`, and `bytes 1000-1999/116823`
on a Range.

## IDA Radio: added, and it is the one station here that did not have to be (2026-09-15)

🔴 **NOT EVERY ICECAST NEEDS THIS WORKER, AND IDA RADIO IS THE PROOF.** The two
facts at the top of this file, no CORS and no TLS, are true of ERR and of
Radio 1965 and were quietly being treated as true of Icecast in general.
`idaidaida.net` has neither defect.

⚠️ **IT WAS MEASURED, REFUSED, AND THEN ADDED ANYWAY, ON INSTRUCTION.** The
measurement below has not changed and neither has what it implies: this relay
adds nothing to these two mounts, and carrying them costs 144 MB per
listener-hour of the account's egress. What changed is that `/radio/` now
plays six stations, and one code path through the relay for all six is worth
more to that page than the bytes are worth here. ⚠️ **The two entries are
`ida-tallinn` and `ida-helsinki` and they are the first thing to drop if egress
ever bites**: the page can reach these mounts directly, which is true of nothing
else in the allowlist.

MEASURED 2026-09-15 against `https://broadcast.idaidaida.net/listen/tallinn/stream`,
which is the `listen_url` the station's own AzuraCast API publishes:

| | |
|---|---|
| protocol | HTTP/2 over TLS on **port 443**, nginx in front of Icecast |
| audio | **AAC-LC 320 kbit/s, 44.1 kHz stereo**, `icy-metaint: 16000` |
| CORS | **present, and it reflects any origin.** An `Origin: https://evil.example.com` comes back allowed, a preflight answers 204 |
| HEAD | **200.** Not the `400` this worker exists to work around |
| in a real browser on `https://positron.studio` | `fetch` gives `response.type: "cors"`, the page reads `icy-name` and 302 KB of body |

So a positron page can fetch those bytes, read the ICY headers and put them
through WebAudio with nothing in between. Relaying them spends this account's
egress at **144 MB per listener-hour**, 2.5x the 128 kbps mounts above, to add a
hop that buys nothing on the network. The allowlist is what bounds it: two named
mounts, added on purpose, and nothing in this file makes a third arrive by
itself.

⚠️ **THE CONTENT-TYPE IS NOW LOAD-BEARING AND IT USED TO BE DEFAULTED.** These
mounts send `audio/aac`; every other station here sends `audio/mpeg`. The page
reads its frame scanner off that header, and the two framings share a sync word,
so a scanner pointed at the wrong one finds **nothing at all** rather than
finding rubbish — bytes arriving, no errors, no sound. This worker used to
substitute `audio/mpeg` when the origin sent no type, which was harmless while
every mount was MP3 and is now a confident wrong answer. It forwards what it was
given and sends no type when it was given none; an absent header makes the page
look at the bytes, which is the honest fallback.

⚠️ **THE IN-BAND TEXT CHANNEL IS ALIVE AND CARRIES NOTHING.** `icy-metaint: 16000`
is advertised and the slots arrive on schedule, and over ~25 s exactly one of 88
on Tallinn was non-empty: `StreamTitle=' - '`, the separator with no artist and
no title. The station names itself in the `icy-name` header and says nothing
in-band. Their AzuraCast API at `/api/nowplaying/tallinn` DOES carry show names,
answers 200 with `access-control-allow-origin: *`, and is not read by anything
here.

⚠️ **HELSINKI'S OWN API CALLS IT OFFLINE WHILE IT IS PLAYING.** `nowplaying`
reported `is_online: false`, 0 listeners and `' - Station Offline'` in the same
minute that the mount served 15 s of audio at -15.6 dB against a
synthesised-silence control at -91.0. Believe the bytes. `/health` here does,
because it asks the mount rather than the API.

## IDA goes through the relay, and that is DECIDED (2026-09-15)

IDA Radio is the first station here that does not NEED this worker: it is on
TLS, it reflects CORS to any origin, and it exposes its `icy-*` headers. The
argument for fetching it direct was that a relay adds a hop for nothing and puts
320 kbit/s of somebody else's stream on this account's egress, which is 144 MB
per listener-hour, 2.5x every other mount.

**Decided: it stays on the relay, for ONE PIPELINE.** `srcOf(id)` is
`${BASE}/${id}` and nothing in the page branches on which station it is; a
station fetched another way would be a second path that only one station takes,
and the next defect in it would be invisible on five stations out of six.

⚠️ **AND THE HOP IS NOT A COST HERE. MEASURED 2026-09-15**, time to first byte,
three runs each from this machine:

| | relayed | direct |
|---|---|---|
| 1 | 0.185 s | 0.397 s |
| 2 | 0.325 s | 0.447 s |
| 3 | 0.256 s | 0.444 s |

The relay is FASTER every time, because Cloudflare's edge is nearer than
`broadcast.idaidaida.net` is. The assumption that a proxy must cost latency was
wrong in this direction and it was worth measuring rather than reasoning about.
What the relay does cost is the egress, and that is the number to watch.

## Still open

- **Egress.** 128 kbps is ~57.6 MB per listener-hour, all of it billable and
  none of it cacheable — the origin says `Cache-Control: no-cache, no-store`,
  and a cached radio stream is a contradiction. Nothing here throttles or counts
  listeners; a link that goes anywhere public should get a cap first. ⚠️ **The
  two IDA mounts are 144 MB per listener-hour each** and are the only ones a
  page could reach without this worker, so they are where a cap costs least.
- **Their permission.** IDA publishes no terms, no licence and no refusal: no
  `/terms`, no `/privacy`, no copyright line on the about page, and a
  `robots.txt` that is AzuraCast's shipped default. The mounts declare
  `icy-pub: 1` and `icy-url: https://idaidaida.net`. That is an open door and it
  is not a licence. Anything public-facing that plays IDA should say whose it is
  and link back, and `hello@idaidaida.net` costs one email.
- **Distance.** Every number above was taken from Tallinn, where both the origin
  and the colo are. The carry figure is the one to re-measure from elsewhere.

## Reproducing

```sh
node rig/shout/measure.mjs 60 --out results/shout-edge.json \
  https://icecast.err.ee/raadiotallinn.mp3 \
  https://shout.positron.studio/raadiotallinn.mp3
```

# IDA Radio (idaidaida.net): the live feed, the archive, and why neither is wired in yet

Every claim below is labelled **READ** (taken from a page, a document or an API
response), **MEASURED** (this machine did it and the timestamp is given) or
**INFERRED** (a conclusion drawn from the two).

All timestamps are UTC on 2026-09-15.

**Short version.** The live feed is real, healthy, and better provisioned than
anything currently on `workers/shout`: HTTPS on port 443, `access-control-allow-origin`
reflected to any caller, 320 kbit/s AAC-LC. It needs **no relay at all**, which
is the opposite of the case `shout` was built for. It is nevertheless **not
added to `/radio/`**, because that page decodes MP3 frames in the tab and
the shipped frame scanner finds **zero frames in a megabyte of IDA's AAC**
(measured, with a passing MP3 control beside it). The archive is a **flat no**.

---

## 1. What it is and who runs it

- **READ** (idaidaida.net/about, and the site's own meta description): "IDA is
  an online radio located in Tallinn & Helsinki." Two channels, Tallinn and
  Helsinki, on air separately.
- **READ** (idaidaida.net/about): a non-profit, run as two entities.
  **MTÜ IDA** at Telliskivi 60a/5, Tallinn, and **IDA Community Helsinki ry** at
  Kaikukatu 4, 00530 Helsinki. Contact `hello@idaidaida.net`. Site design
  credited to WWW Stuudio.
- **READ** (Mixcloud's own feature on the station, and a third-party directory):
  founded in Tallinn in **2018**, Helsinki studio opened **March 2020**. Over 200
  shows. A member of the International Community Radio Network.
- **MEASURED 12:16, 12:23**: the site is Next.js behind Apache/ZoneOS. Programme
  data comes from a Strapi CMS at `strapi.idaidaida.net`, images from DigitalOcean
  Spaces (`ida-radio.fra1`), and broadcast from **AzuraCast** at
  `broadcast.idaidaida.net` (nginx, PHP 8.4.4).
- **READ** (`/api/station/tallinn`): AzuraCast reports `frontend: icecast`,
  `backend: liquidsoap`, `timezone: Europe/Tallinn`. The Helsinki station is id 4,
  `Europe/Helsinki`.
- **READ** (homepage): there is an iOS app, `apps.apple.com/ee/app/ida-radio/id6752990278`.

### How the site finds its own stream

- **READ** (the site's JavaScript bundles, 12:17): the player calls a Strapi
  endpoint `live`, which returns the current show for each channel plus a
  `streamSrc`.
- **MEASURED 12:17:16**, `GET https://strapi.idaidaida.net/api/live`: 200, and the
  Tallinn entry carries `"streamSrc": "https://broadcast.idaidaida.net:8000/stream"`.
  Helsinki was `null` at that moment, meaning no scheduled show, not no stream.
- ⚠️ **MEASURED**: the Strapi API answers with `Access-Control-Allow-Origin:`
  **empty**, which is not a usable value in a browser. Their own Next.js server
  does this fetch server-side. So the schedule is readable from node and from a
  Worker, and **not** from a page. Anything positron wants from the schedule has
  to be carried.

---

## 2. The live feed

### 2.1 The port trap, run as a control first

- **MEASURED 12:17:32 and 12:18:06**: `curl http://portquiz.net:8000/` and
  `:8001` both fail here with `Recv failure: Connection reset by peer`, after the
  TCP connect succeeds. `curl http://portquiz.net/` on port 80 answers **200** in
  the same seconds, and a raw `nc` to portquiz on 8000 returns nothing.
- **INFERRED**: non-standard ports are reset **on this machine**, not at the
  origin. `broadcast.idaidaida.net:8000` accepts TCP and then resets, and an
  `openssl s_client` handshake to it dies with `errno=54`. That measures this
  sandbox, and it measures nothing about IDA. This is the trap
  `research/radio-app-2026-09.md` §5 records, and the control is the only
  thing that separates the two readings.
- **So the `:8000` URL their site uses was never probed from here.** Everything
  below is the port 443 path, which is reachable and which is the station's own
  published URL.

### 2.2 The URL that works, and it is theirs

- **READ** `GET https://broadcast.idaidaida.net/api/station/tallinn` (12:21:26):
  `"listen_url": "https://broadcast.idaidaida.net/listen/tallinn/stream"`.
  That is AzuraCast's web proxy for radio, on 443, and it is what the station's
  own API hands out.
- ⚠️ **READ**: the sibling endpoint `/api/station/tallinn/nowplaying` reports a
  **different** `listen_url` for the same station, `https://broadcast.idaidaida.net:8000/stream`.
  Two of their own endpoints disagree about their own stream URL. The 443 one is
  the one a browser can use.
- **READ**: `is_public: false` on both stations, which is why `/api/stations` and
  `/api/nowplaying` return `[]` and why `/public/tallinn` is a 404. The mounts
  themselves carry `icy-pub: 1`.
- **READ**: `hls_enabled: false`, `hls_url: null`. There is no HLS here.
- **READ** `/api/status` (12:18:33): `{"online":true}`, with
  `access-control-allow-origin: *`.
- **READ** (12:21:26): Tallinn had **20 listeners, 18 unique**. Helsinki 0.

**The two stream URLs:**

```
https://broadcast.idaidaida.net/listen/tallinn/stream
https://broadcast.idaidaida.net/listen/helsinki/stream
```

### 2.3 What answers, MEASURED 12:19:35

`GET /listen/tallinn/stream` with `Icy-MetaData: 1` and `Origin: https://positron.studio`:

| | |
|---|---|
| protocol | **HTTP/2 over TLS on port 443**, nginx in front of Icecast |
| status | 200 |
| content-type | `audio/aac` (raw ADTS, not a container) |
| `icy-name` | `IDA Raadio - Tallinn` |
| `icy-description` | `IDA on Tallinnas & Helsingis asuv online-raadio.` |
| `icy-br` | 320 |
| `ice-audio-info` | `channels=2;samplerate=44100;bitrate=320` |
| `icy-url` | `https://idaidaida.net` |
| `icy-pub` | 1 |
| `icy-metaint` | **16000** |
| `access-control-allow-origin` | **`https://positron.studio`**, reflected |
| `access-control-allow-credentials` | `True` |
| `access-control-allow-headers` | `Origin, Icy-MetaData, Range` |
| `access-control-expose-headers` | `Icy-Br, Icy-Description, Icy-Genre, Icy-MetaInt, Icy-Name, Icy-Pub, Icy-Url` |
| `cache-control` | `no-store, no-cache, private` |

Helsinki answers the same shape with `icy-name: IDA Radio - Helsinki`, no
description and no `icy-url`.

🔴 **The CORS header is a reflection, not an allowlist. MEASURED 12:19:52**: the
same request with `Origin: https://evil.example.com` comes back with
`access-control-allow-origin: https://evil.example.com`, and with no `Origin` at
all the header is absent and only `Vary: Origin` remains. A preflight `OPTIONS`
answers **204** with the full set. So any origin is allowed, and positron.studio
is allowed because every origin is.

⚠️ **`HEAD` answers 200 here.** ERR's Icecast 2.4.4 answers `400` to a HEAD,
which is why `workers/shout` always does a GET upstream. This server does not
have that defect. Do not carry the assumption across.

### 2.4 What the bytes are, MEASURED 12:20:05

1,000,000 bytes pulled off the Tallinn mount, `ffprobe`:

| | |
|---|---|
| codec | **AAC-LC**, `mp4a.40.2` |
| sample rate | **44100 Hz** |
| channels | **2, stereo** |
| bitrate | **320,071 bit/s** |
| the sample held | 24.994 s of audio |
| it arrived in | 14.873 s, ttfb 323.8 ms |

**INFERRED**: 24.99 s of audio delivered in 14.87 s means Icecast handed over
about **10.1 s of already-encoded audio at connect**. That is the burst, and it
is why a mean rate over a short window reads high.

### 2.5 Is there sound in it, MEASURED 12:20:37

- Tallinn: **mean -13.2 dB, max 0.0 dB**.
- Helsinki: **mean -15.6 dB, max -2.2 dB** over a separate 15 s sample.
- Control, a synthesised 25 s of digital silence encoded the same way:
  **-91.0 dB**. So the measurement can tell silence from sound, and both mounts
  are carrying real audio.

⚠️ **Helsinki is playing while its own API says it is not.** `nowplaying`
reported `is_online: false` and 0 listeners for Helsinki at 12:21, and the mount
served 15 s of audio at -15.6 dB in the same minute. Believe the bytes.

### 2.6 Steady rate and gaps, MEASURED 12:25:01

A 40 s read of the Tallinn mount, direct, no relay:

| | |
|---|---|
| ttfb | 354.6 ms |
| first byte | 356.3 ms |
| total | 1,991,761 bytes in 595 reads over 39.68 s |
| mean rate | 401.6 kbit/s (the burst amortising) |
| **settled rate, from 10 s in** | **319.8 kbit/s**, against 320 nominal |
| gap between reads, p50 / p95 / max | **0.8 / 293.8 / 503.6 ms** |

**INFERRED**: no gap past a 1 s jitter buffer, and the settled rate is nominal to
0.06 percent. This is a well-run stream.

### 2.7 A real browser on the real origin, MEASURED 12:27:41

curl does not enforce CORS, so the header alone does not answer the question that
matters. Headless Chrome, navigated to **`https://positron.studio/`**, then asked
to reach the mount from that origin:

| | |
|---|---|
| `fetch(...)` | status **200**, `response.type` **`cors`** (not `opaque`) |
| headers the page could read | `icy-name: IDA Raadio - Tallinn`, `icy-metaint: 16000`, `content-type: audio/aac` |
| bytes read | 302,192 |
| `decodeAudioData` on 288,000 raw ADTS bytes | **ok**, 7.2 s, resampled to the 48 kHz context, 2 channels |
| `AudioDecoder.isConfigSupported({codec:'mp4a.40.2'})` | **supported** |
| `<audio crossorigin="anonymous">` tapped by `createMediaElementSource` | `readyState 4`, playing, **peak rms 0.36808** |

🔴 **So the relay is not needed for this station.** `workers/shout` exists because
ERR and Radio 1965 send no CORS header, and Radio 1965 additionally terminates no
TLS. IDA has both. A positron page can fetch these bytes, read the ICY headers off
them and put them through WebAudio with nothing in between.

⚠️ The two things a browser could read there are the two halves of the decode
problem below: `decodeAudioData` accepts raw ADTS, and WebCodecs will configure
for `mp4a.40.2`. Neither of those is the missing piece.

---

## 3. Why it is NOT in `/radio/`

🔴 **THE PAGE DECODES MP3 FRAMES IN THE TAB, AND IDA IS AAC.**

`/radio/` stopped using a media element on purpose. `demo/shell/mp3-stream.mjs`
fetches the mount, splits it into frames with `demo/shell/mp3-frames.mjs`, and
feeds those frames either to `AudioDecoder` or to `decodeAudioData`. The header
of `mp3-frames.mjs` says what it is in its first line: "Layer III only, that is
what every Icecast MP3 mount is."

**MEASURED 12:22**, the shipped scanner run over the bytes actually pulled off
IDA, and over an MP3 control in the same script:

| input | bytes | frames found |
|---|---|---|
| IDA Tallinn, AAC | 1,000,000 | **0** |
| IDA Helsinki, AAC | 600,000 | **0** |
| Klassikaraadio, MP3 (control) | 300,000 | **717**, first at offset 205, 128 kbit/s 44.1 kHz stereo |

**INFERRED, and this is the failure shape the project's rules are about**: an
ADTS sync word is `0xFFF` with the layer bits at zero, and `readHeader` rejects
anything whose layer bits are not Layer III. So the station would be selected,
the fetch would succeed, the CORS check would pass, the page would report bytes
arriving, and **not one sample would be produced**. Silence behind a page that
looks like it is working.

A second, smaller blocker in the same page: `NOMINAL_KBPS = 128` is a single
constant, and the assert `settled rate is the station's` allows 20 percent around
it. A 320 kbit/s station fails that assert on every run.

**So this is a kit change, not a list change, and `demo/shell/` is not mine to
edit in this session.** CLAUDE.md's rule is to stop and ask rather than build a
fourth copy of something in a page. What it needs, scoped:

1. `demo/shell/mp3-frames.mjs`: an ADTS scanner beside `readHeader`. Sync `0xFFF`,
   layer bits `00`, profile, the 4-bit sample-rate index, the 3-bit channel
   configuration, and the 13-bit frame length that spans bits 30 to 42. Same
   shape and roughly the same length as the MP3 one, and the same
   confirm-the-next-header trick makes a false sync vanishingly unlikely. The
   file's own header already names the moment to take a library instead, and this
   is not it: it is still a scanner, not a decoder.
2. `demo/shell/mp3-stream.mjs`: choose the scanner from the response's
   `content-type` (`audio/mpeg` against `audio/aac`), and configure `AudioDecoder`
   with `mp4a.40.2` rather than `mp3`. Both paths are measured available in
   Chrome above.
3. `demo/radio/index.html`: `NOMINAL_KBPS` becomes a per-station number, and
   `srcOf` stops hard-coding a `.mp3` suffix.
4. A decision about `srcOf` and `/health`, because both are relay-shaped and this
   station does not need a relay. See §5.

Until 1 and 2 exist, adding the row would ship a station that plays nothing.

---

## 4. The archive: **no**

The answer is no, and there are three independent reasons, any one of which is
enough.

### 4.1 What the archive actually is

- **READ** (the site's JavaScript, 12:17): an episode is played by calling Strapi
  `get-stream/<id>`, which returns SoundCloud HLS URLs and an `access_token`, and
  then handing both to the site's own `/api/resolve-stream` route, which follows
  the redirect and gives the page a URL it plays as `application/x-mpegurl`.
- **READ** (`/api/episodes`, 12:23:45): **23,510 episodes**, of which **20,716**
  carry a `soundcloud` field. Every one of those also carries a `mixcloud` field.
  So the archive is SoundCloud `ida_radio` mirrored to Mixcloud `IDA_RAADIO`.

### 4.2 The URL is signed, short-lived, and reached only with somebody else's key

**MEASURED 12:23:52 to 12:24:39**, one episode, end to end:

1. `GET https://strapi.idaidaida.net/api/get-stream/24966` answers 200 with
   `hls_aac_160_url`, `hls_mp3_128_url`, `preview_mp3_128_url` and an
   `access_token`. The token is a SoundCloud OAuth JWT. Its payload carries
   IDA's SoundCloud **client id** and an `exp` **one hour** after issue.
2. `GET` on that SoundCloud API URL with no token, or with the token as a query
   parameter, is **401**. With `Authorization: OAuth <token>` it is a **302**.
3. The redirect target is a CloudFront signed URL on
   `playback.media-streaming.soundcloud.cloud`, carrying `expires`, `Policy`,
   `Signature` and `Key-Pair-Id`. The playlist policy expired **111 minutes**
   after it was minted; the segment policy **229 minutes**.
4. The playlist itself: `#EXT-X-PLAYLIST-TYPE:VOD`, `#EXT-X-VERSION:7`, fMP4
   (`#EXT-X-MAP` to an `init.mp4`, then `.m4s` segments), **654 segments** of
   about 10 s, so about 109 minutes of audio at AAC 160k.
5. The CDN itself is generous: **`access-control-allow-origin: *`**, and a
   `Range: bytes=0-1023` answers **206** with `content-range: bytes 0-1023/202388`
   and `content-type: audio/mp4`.

**INFERRED**: the bytes are technically reachable and technically readable by a
page. What is not reachable is a **stable** URL. Every playable URL is minted
from IDA's own SoundCloud application credential, which their unauthenticated
Strapi endpoint currently hands to anyone who asks, and it dies within hours.
Building against it would mean shipping a page whose playback depends on another
organisation's OAuth client continuing to be exposed. That is precisely the
"do not build against a URL that will rotate" case.

### 4.3 Mixcloud does not offer one at all

**READ** (Mixcloud's developer documentation): "Audio streams are not available
through the Mixcloud API", for two stated reasons, reporting and royalties, and
cost and licensing. "To play Mixcloud audio on your own site, embed the player
widget instead." There is no direct URL to measure, so the Mixcloud half needs no
measurement.

### 4.4 SoundCloud's terms forbid the thing this project would do with it

**READ** (SoundCloud API Terms of Use):

- "Your app must not include file-save functionality, or otherwise designed to
  cache, download or persistently store any User Content." Only session-based
  caching is allowed, and it "must cease to be available, accessible or playable
  within your app at the end of that session."
- Displaying or streaming content requires crediting the uploader, crediting
  SoundCloud as the source, and "clearly visible backlinks from the relevant
  sounds within your app to the URL for the relevant sound on soundcloud.com".
- Content from the API "may not be used: (a) to train or otherwise develop any
  artificial intelligence technology; (b) to create fingerprints or any other
  identifying digital files of User Content".
- Modification requires the uploader's consent through a Creative Commons licence.
- "You must not rent, sell or lease access to the SoundCloud API ... and must not
  sell or transfer ... your Security Code to any third party without the prior
  written approval of SoundCloud."

**INFERRED**, three consequences for this project specifically. Using the token
from IDA's Strapi endpoint is using **IDA's** SoundCloud credential from a third
party's app, which is the last clause. Granulating a set, which is what
`/radio/` does to whatever it is pointed at, is modification, which needs the
uploader's consent. And keeping a set to loop or to analyse across a visit runs
into the caching clause.

### 4.5 So

**No.** Not "hard", not "needs a key we could ask for". The direct URL exists for
about two hours, is minted with a credential that is not ours, and the terms that
govern it forbid the modification this project's pages are built to do.

If IDA's own archive is ever wanted here, the path is a conversation with MTÜ IDA
about files, not an integration against SoundCloud.

---

## 5. Licence and terms for the LIVE feed, which is a different question

- **MEASURED 12:30:47**: idaidaida.net has **no** `/terms`, `/privacy`,
  `/legal` or `/tingimused` page. All 404. There is no `robots.txt` either.
  **READ**: the about page carries no copyright or licensing statement.
- **MEASURED**: `broadcast.idaidaida.net/robots.txt` answers 200 with
  `User-agent: *` / `Disallow: /` / `Allow: /public/`. **INFERRED**: that is
  AzuraCast's shipped default, not a hand-written policy, and robots.txt governs
  crawlers rather than a listener's media player. It is recorded here because it
  is the only machine-readable statement they publish, not because it settles
  anything.
- **READ**: the mount declares `icy-pub: 1`, which is Icecast's flag for "list
  this publicly", and `icy-url: https://idaidaida.net`.
- **INFERRED**: there is no published permission and no published refusal. The
  station is a non-profit community radio that publishes an open stream, an iOS
  app and a web player, and its own CORS configuration allows any origin. That is
  a technically open door and it is not a licence. Anything public-facing that
  plays IDA should say who it is and link back, and a conversation with
  `hello@idaidaida.net` costs one email.

---

## 6. What it would cost if anyone listened

- **MEASURED**: 320 kbit/s settled, so **144 MB per listener-hour**. That is
  **2.5 times** any station currently on `workers/shout` (128 kbit/s, 57.6 MB per
  listener-hour, recorded in `workers/shout/NOTES.md`).
- None of it is cacheable. The origin sends `cache-control: no-store, no-cache,
  private`, and a cached radio stream is a contradiction.
- **INFERRED**: ten people listening for an hour a day is about **1.4 GB a day**
  through whatever carries it, and the same again out of IDA's own server. Their
  Tallinn channel was carrying 18 unique listeners when measured, so a positron
  page that got any traffic at all would be a visible fraction of their audience.
- 🔴 **And the honest number for the relay is zero, because it should not carry
  this stream.** `shout` exists to add TLS and CORS to origins that lack them.
  This origin has both. Putting it in the allowlist would spend the account's
  egress and add a hop to buy nothing. The allowlist is there to bound exactly
  this, and the boundary holds by leaving it out.

---

## 7. What was decided, and what is open

**Decided.** The live feed measures fine and is not wired in, because
`/radio/` cannot decode it. No station was added to `workers/shout`, no
worker was deployed, and `demo/radio/index.html` is unchanged. The assert
count for `radio` is unchanged at 39.

**Open, in the order it would be done.**

1. An ADTS frame scanner in `demo/shell/mp3-frames.mjs` and a content-type branch
   in `demo/shell/mp3-stream.mjs`. That one change makes every AAC Icecast mount
   in the world playable by this project, not only IDA's.
2. Per-station `NOMINAL_KBPS` in `/radio/`, so the settled-rate assert is
   about the station being played.
3. A decision about the relay-shaped parts of that page. `srcOf` builds
   `${BASE}/${id}.mp3` and the health probe asks `${BASE}/health`, and a station
   that needs no relay fits neither. The cheapest honest answer is a per-station
   URL plus a per-station health strategy, because a direct station can be probed
   by its own `HEAD`, which this server answers 200 (measured 12:19:52) and ERR's
   does not.
4. If the schedule is ever wanted alongside the audio, note that Strapi's CORS
   header is empty, so that part does need carrying even though the audio does not.

**Not open.** The archive. See §4.

---

## 8. Reproducing

```sh
# the station's own URL, from its own API
curl -s https://broadcast.idaidaida.net/api/station/tallinn | node -e \
  "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).listen_url))"

# the headers, including the CORS reflection
curl -sS -m 15 -D - -o /dev/null --max-filesize 1 \
  -H 'Icy-MetaData: 1' -H 'Origin: https://positron.studio' \
  https://broadcast.idaidaida.net/listen/tallinn/stream

# what the bytes are
curl -sS -m 30 --max-filesize 1000000 -o /tmp/ida.aac \
  https://broadcast.idaidaida.net/listen/tallinn/stream
ffprobe -hide_banner -i /tmp/ida.aac
ffmpeg -hide_banner -i /tmp/ida.aac -af volumedetect -f null -   # against a silence control

# the blocker, and its control
node -e "import('/Users/s32863/personal/positron/demo/shell/mp3-frames.mjs').then(m=>{
  const b=new Uint8Array(require('fs').readFileSync('/tmp/ida.aac'));
  console.log('AAC frames found:', m.frameStarts(b,0).frames.length); })"
```

⚠️ And run a port control before believing any failure on `:8000`:
`curl -m 8 http://portquiz.net:8000/` against `curl -m 8 http://portquiz.net/`.
On this machine the first fails and the second answers 200, which is a fact about
this machine.

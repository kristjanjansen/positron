# Free live TV-like sources for `/now/` (2026-10-05)

ASKED, VERBATIM (BACKLOG, 2026-10-05): *"Also look into oher free live tvlike
sources"*, in the context of `/now/` (`demo/now/index.html`): one live channel
with a DVR window, drawn on a timeline whose right end is the present. Today it
is ERR's ETV (`CHANNELS[0]` from `demo/shell/err-live.mjs`), with a 2 h window
and `EXT-X-PROGRAM-DATE-TIME` (READ, `research/err-live-feeds-2026-08.md`).

## How this was done, and what that means for every line below

- **From documentation, terms pages and catalogue READMEs only.** No stream,
  playlist, segment or health URL was opened. Not one `.m3u8` was fetched. So
  **nothing here is MEASURED.**
- Every claim carries **READ** (with the URL or repo path it came from) or
  **UNKNOWN**. A verdict is my judgement and is labelled as one.
- Some READ claims come through a search engine's summary of the page rather
  than from the page itself, because two pages refused the connection
  (`docs.unified-streaming.com`, and `ireplay.tv` once before a second fetch
  worked). Those are marked **READ (search summary)**, which is weaker.

## What `/now/` needs from a source

From `research/err-live-feeds-2026-08.md` and `demo/now/index.html`:

1. **HLS that hls.js can play**, and native HLS on WebKit (`NATIVE_HLS`).
2. **`EXT-X-PROGRAM-DATE-TIME`**, because the timeline's right end is the wall
   clock and the playhead is placed by `hls.playingDate`.
3. **A DVR window measured in tens of minutes or hours**. The page opens on a
   12 minute span (`OPEN_SPAN_MS`) and advertises 120 minutes (`REACH_MS`).
4. **CORS `*`** on playlists and segments, because the page probes segments
   with two-byte range asks to find where the served window ends.
5. **Terms that let a third-party page play it**, in our own player.
6. **Nobody's audience figures distorted by our test runs.** This is the ERR
   lesson (CLAUDE.md): every connection to a broadcaster can land in its
   listener statistics. The safe answers are: it is ours, or it is a stream
   published *for* player testing, where an automated client is the intended
   audience.

## The table

Legend: R = READ, U = UNKNOWN. Sources for every R are in the candidate
sections below the table.

| # | candidate | HLS | PDT | DVR depth | CORS | terms for third-party playback | our runs distort somebody's audience? | verdict for `/now/` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Our own films as a synthetic live channel** (R2 byte ranges, sliding live playlist, in page or in a Worker) | R yes, shape already built for audio | R we write it | R as long as we like | R ours | R ours | R no, ours | **YES, first** |
| 2 | **Our own Cloudflare Stream live input, `?dvrEnabled=true`** | R yes | R yes on our LL-HLS, measured earlier in this repo | R manifest capped at 7,200 segments, "degraded" past 3 h | U for DVR manifests | R ours | R no, but it bills us per minute | **YES, second** |
| 3 | **iReplay.tv 24/7 Blender channel** | R yes, fMP4, 7 s target | R "every media playlist" | U "continuous sliding window", no length given | R `*` on manifests and segments | R free, asks for a followed backlink | R no audience to distort, it is a test stream; still somebody else's server | **YES, best external** |
| 4 | Unified Streaming public demo live (`demo.unified-streaming.com/.../live.isml`) | R (search summary) yes | U (origin adds PDT when fed UTC timestamps, R docs; whether the demo is fed so, U) | U | U | U | R test stream, no audience; somebody else's server | maybe, after reading its terms |
| 5 | Akamai `cph-p2p-msl` live test stream | R (search summary) yes, Tears of Steel, 6 s | U | U | U | U, no official page found | test stream; reported intermittent (R, search summary) | no, undocumented |
| 6 | **EbS / EbS+** (European Commission, Europe by Satellite) | R yes, "HLS adaptive streaming from 480p to 1080p" | U | U live; on demand 7 days (R) | U | R free "for EU-related information and educational purposes"; an Embed Configurator exists | U; a public channel, so assume yes until told otherwise | **maybe, the best real TV-like one, after asking** |
| 7 | Deutscher Bundestag Parlamentsfernsehen | R a third-party catalogue calls its HLS "validated but permission-pending" | U | U | U | R free for parliamentary reporting, education and culture; embedding offered; live signal to third parties "on request" | U; public channel | maybe, only by asking |
| 8 | Riigikogu (Estonian parliament) | R delivered through YouTube | U | n/a | n/a | R videos CC BY-SA (search summary) | YouTube counts views | no, YouTube only, sittings only |
| 9 | UK Parliament (parliamentlive.tv) | U | U | U | U | R must not alter, no entertainment use, embedding was suspended | U | no |
| 10 | NASA+ | U how it is delivered | U | U | U | R NASA media generally not copyrighted, credit NASA, no implied endorsement; third-party material excepted | U | maybe later, nothing documented to build on |
| 11 | iptv-org lists | R a directory of links, not a licence | per entry | per entry | per entry | R "no control over the destination" | R each entry is a broadcaster, so the ERR problem times N | **no as a source**, maybe as a catalogue |
| 12 | YouTube live (any channel) | R iframe API only | R none exposed; `getDuration()` is elapsed time since start | R DVR exists on YouTube | n/a | YouTube's terms | YouTube counts views | no |
| 13 | Webcams (Windy, Baltic Live Cam, earthTV) | U; Windy's free tier is images and a timelapse player (R) | U | U | U | R Windy: no redistribution except their widget | U; commercial aggregators count views | no |
| 14 | Public broadcasters with open HLS (DW, LRT, France 24 and similar) | U per broadcaster | U | U | U | U, no terms page found that grants third-party playback | **yes, the same class as ERR** | no, unless asked and answered in writing |
| 15 | Apple example streams | R all VOD | n/a | n/a | n/a | Apple site terms | no | no, nothing live |
| 16 | Mux `test-streams.mux.dev`; Mux test live streams | R VOD films; test live streams are 5 min, watermarked, paid plan | n/a | n/a | n/a | Mux account terms | no | no |
| 17 | DASH-IF livesim2 (public or self-hosted) | U; README and every release note describe DASH only | U for HLS | R configurable `livewindow`, default 300 s | U | open source, self-hostable single Go binary (R) | self-hosted: nobody's | no for hls.js today; worth a look only if `/now/` ever plays DASH |

## The candidates, with every source

### 1. Our own films as a synthetic live channel

- READ (`.claude/skills/positron-streaming/SKILL.md`, "An HLS station
  assembled from R2 byte ranges"): `workers/station/worker.mjs` already builds a
  **live, never VOD**, wall-clock playlist out of R2 byte ranges, with
  `MEDIA-SEQUENCE` that never goes backwards and a window that reaches back into
  the previous loop. It is audio. It does not emit PDT today (READ, `grep` of
  `workers/station/worker.mjs` finds no `PROGRAM-DATE-TIME`).
- READ (`plans/plan-flipper-patchbay.md`, cell 2): the flipper plan already
  designs *"an in-page live window"* where hls.js is handed a sliding playlist
  whose segment URIs are byte ranges of an R2 film, *"No worker changes"*. It
  also records that nothing in the cloud turns an R2 MP4 into HLS today, and
  that the films need one re-encode on the laptop (about 1.3 cents a month of
  R2 storage, READ there).
- READ (`demo/fake-err.mjs` header): the local stand-in already writes a real
  sliding media playlist with a real `PROGRAM-DATE-TIME` and real refusals.
- PDT: we write it, so it is whatever we say, and the DVR depth is whatever we
  say (a whole loop if we like).
- CORS, terms, audience: ours. Cost: R2 Class B reads, egress free (READ, the
  flipper plan's row 1).
- **What it is not:** live in the world's sense. Nothing happens in it that was
  not already in the film. `/now/` would show *a* present, not *the* present.
- **Verdict:** the one source that obeys every rule in CLAUDE.md with no
  conversation. It also gives `/now/` a deployed stand-in for free: the same
  playlist generator that `fake-err.mjs` runs on this laptop.

### 2. Our own Cloudflare Stream live input, DVR mode

- READ (https://developers.cloudflare.com/stream/stream-live/dvr-for-live/):
  DVR is enabled by adding `dvrEnabled=true` to the HLS manifest URL;
  *"Manifests are limited to a maximum of 7,200 segments"*; *"performance may be
  degraded for DVR-enabled broadcasts longer than three hours"*; DVR mode uses
  HLS manifest version 8; not available on DASH; recommended on a Video ID
  rather than a Live Input ID.
- READ (https://developers.cloudflare.com/changelog/post/2025-02-14-introducing-dvr-for-stream-live/):
  introduced 2025-02-14.
- READ (`.claude/skills/positron-streaming/SKILL.md`): Cloudflare's live
  playlists carry `EXT-X-PROGRAM-DATE-TIME` stamped at ingest, and it runs
  **331 ms backwards** during startup (that was MEASURED in this repo on an
  earlier day, not today). Whether the **DVR** manifest carries PDT on every
  segment back to the start: **UNKNOWN**.
- READ (same skill): Stream bills minutes delivered, $1 per 1,000 minutes, and
  buffering is billable. So every harness run against it costs us money, and
  nobody else anything.
- UNKNOWN: segment length on our input under DVR, so the real depth in minutes
  (7,200 times the segment duration). UNKNOWN: CORS on the DVR manifest.
- **What it needs:** something publishing. The DVR window starts at the start of
  the broadcast and grows, so a window of two hours needs two hours of
  publishing first. A Pi camera or the `pub` container's test pattern would do.
- **Verdict:** the honest *live* source we own. It costs minutes, so the
  harness must stay on the stand-in and only a person opens the real one.

### 3. iReplay.tv 24/7 Blender channel

- READ (https://ireplay.tv/blog/hls-streams-examples-streams-continuous-discontinuity-vod2live-test-video-players-app-websites/):
  a 24/7 channel of Blender Open Movies, *"running continuously since 2021"*;
  four renditions 1080p to 480x270 plus audio-only, redundant failover copies
  and an I-frame playlist; fMP4 segments with `EXT-X-MAP`, target duration 7 s;
  *"Every media playlist carries `#EXT-X-PROGRAM-DATE-TIME`, so you can test
  date-based seeking and DVR positioning"*; *"Access-Control-Allow-Origin: * on
  manifests and segments"*; no `EXT-X-ENDLIST`; real discontinuities between
  films. The only request: *"If you list this stream on your own site, please
  link back to this page or to ireplay.tv with a followed link."*
- UNKNOWN: **the window length**, which is the number `/now/` lives on. The
  page says "continuous sliding window" and gives no duration.
- UNKNOWN: any rate limit or a wish about automated clients. It is a test
  stream, so a player under test is its stated audience, but it is one small
  operator's server and our harness should still not run against it.
- The content is Blender Foundation open movies (CC BY, which I know of the
  films and did not re-read today: UNKNOWN for this channel's specific cut).
- **Verdict:** the best external candidate on paper. It has every property
  `/now/` uses except a documented window depth. The discontinuities are a
  bonus: they are exactly what a timeline should draw.

### 4. Unified Streaming public demo live

- READ (search summary of https://docs.unified-streaming.com/ pages, which
  refused a direct fetch): a public live HLS demo exists under
  `demo.unified-streaming.com/k8s/live/stable/live.isml/.m3u8`.
- READ (search summary, https://docs.unified-streaming.com/best-practice/live.html):
  Unified Origin adds `EXT-X-PROGRAM-DATE-TIME` when it recognises UTC
  timestamps; DVR window lengths of "several hours" are normal.
- READ (https://github.com/unifiedstreaming/live-demo): self-hosting it needs a
  **licence key** (`USP_LICENSE_KEY`), so it is not a free self-host.
- UNKNOWN: whether the public demo is fed UTC timestamps, its window, its
  CORS, and any terms on using it from a third-party page.
- **Verdict:** plausible, unproven. Behind iReplay because iReplay documents
  the three properties and this one documents none of them for the public
  stream.

### 5. Akamai test live stream

- READ (search summaries of https://ottverse.com/free-hls-m3u8-test-urls/ and
  https://developerinsider.co/sample-hls-m3u8-streams-test-urls-vod-and-live/):
  `cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8`, Tears of
  Steel, 6 s segments, reported as stopping at times.
- UNKNOWN: everything else, and there is no Akamai page that publishes or
  describes it. **Verdict:** no.

### 6. EbS and EbS+ (Europe by Satellite)

- READ (https://audiovisual.ec.europa.eu/en/faq): live on the AV Portal, video
  on demand *"normally available approximately 30 minutes after the start of the
  original transmission"*, *"HLS adaptive streaming from 480p to 1080p"*, an
  **Embed Configurator** for external websites, schedules *"up to 17 days of
  past and future transmissions"*, and *"The material is offered free of charge
  for EU-related information and educational purposes"*. Also: *"At the moment
  it is not possible to record the EBS streaming feed."*
- READ (https://www.europarl.europa.eu/website/multimedia-centre/en/europe-by-satellite.html,
  search summary): on demand for up to 7 days after transmission.
- READ (https://github.com/dlq/parliament-streams): an independent catalogue
  of parliamentary streams lists the EU Parliament as *"link-out/schedule
  targets; no stable raw HLS/DASH manifest was validated"*.
- UNKNOWN: PDT, live DVR depth, CORS, whether playback outside their own
  embed is welcome, whether the copyright conditions (a PDF and zip on
  https://audiovisual.ec.europa.eu/en/copyright, not read) say anything about
  third-party players. UNKNOWN: whether our runs would show in anybody's
  figures.
- **Verdict:** the closest thing to real television with a public licence and
  a published schedule (which `/now/` uses for programme marks). Not usable
  without writing to the Audiovisual Service first. The purpose clause
  (EU-related information and education) fits an R&D page loosely at best.

### 7. Deutscher Bundestag

- READ (https://www.bundestag.de/nutzungsbedingungen): free for *"parlamentarische
  Berichterstattung sowie zu Bildungs- und kulturellen Zwecken"*; no
  commercial or advertising use; credit *"Deutscher Bundestag"*; material
  offered *"zum Herunterladen oder zum Einbetten auf Seiten Dritter"*; the live
  signal is given to third parties *"auf Nachfrage"*, as SDI or a compressed IP
  signal.
- READ (https://github.com/dlq/parliament-streams): *"validated but
  permission-pending national HLS source"*.
- UNKNOWN: PDT, DVR, CORS. **Verdict:** a live feed is something they hand
  over on request, so the honest route is to ask. Not before.

### 8. Riigikogu

- READ (https://www.riigikogu.ee/en/news-and-publications/multimedia/live-broadcast/):
  live sittings go to YouTube (@riigikogu), during sittings only (Monday 15:00,
  Tuesday and Thursday 10 to 13, Wednesday from 12).
- READ (search summary): committee sitting videos are CC BY-SA.
- READ (https://www.riigikogu.ee/info-ja-meedia/subtiitritega-videovoog/): a
  subtitled stream with TalTech's *Kiirkirjutaja*, in a test period.
- **Verdict:** no. YouTube is the only delivery, and it is dark most of the week.

### 9. UK Parliament

- READ (search summaries of https://www.parliament.uk/site-information/copyright/
  and the Parliament Live help pages): parliamentary copyright, *"cannot alter the
  video or audio"*, no use for *"satire, advertising, entertainment"*, embedding
  temporarily suspended. **Verdict:** no; a remix and timeline page is the
  alteration those terms exclude.

### 10. NASA+

- READ (https://www.nasa.gov/nasa-brand-center/images-and-media/): NASA content
  is generally not copyrighted, acknowledge NASA, do not imply endorsement,
  third-party material inside NASA output is excepted.
- READ (https://en.wikipedia.org/wiki/NASA%2B): free, ad-free, includes live
  streams of launches and missions, launched 2023-11-08.
- UNKNOWN: how NASA+ live is delivered, any PDT, DVR or CORS, and whether a
  24/7 live channel still exists after NASA TV's replacement.
- **Verdict:** the licence is the friendliest of any real channel, and there is
  no documentation to build on. A candidate for a later, documented look.

### 11. iptv-org

- READ (https://github.com/iptv-org/iptv): *"No video files are stored in this
  repository. The repository simply contains user-submitted links to publicly
  available video stream URLs"*; the maintainers have *"no control"* over the
  destinations.
- READ (https://github.com/iptv-org/api): `streams.json` has `channel, feed,
  title, url, referrer, user_agent, quality, labels`, where labels can be
  `Geo-blocked` and `Not 24/7`; `blocklist.json` records `dmca` and `nsfw`
  removals.
- **Verdict:** a directory is not permission, and every row is somebody's
  broadcaster, so taking a channel from it is the ERR mistake multiplied. Its
  only safe use is as a catalogue to find a broadcaster's own terms page.

### 12. YouTube live

- READ (https://developers.google.com/youtube/iframe_api_reference): for a live
  event `getDuration()` returns *"the elapsed time since the live video stream
  began"*; no wall-clock accessor is documented.
- **Verdict:** no. An iframe gives no PDT, no pixels and no transport of our
  own, which is what `/now/` is about.

### 13. Webcams

- READ (search summary of https://api.windy.com/webcams and
  https://account.windy.com/agreements/windy-api-webcams-terms-of-use): free tier
  links images or embeds a timelapse player, image URLs valid 15 minutes, no
  redistribution except through their widget.
- Baltic Live Cam and earthTV carry Tallinn's squares (READ, search results
  pointing at https://balticlivecam.com/cameras/estonia/tallinn/freedom-square/
  and https://www.earthtv.com/en/webcam/tallinn-freedom-square). UNKNOWN: any
  terms allowing third-party HLS playback; both are commercial.
- **Verdict:** no. A Tallinn square is a lovely *present* and it is somebody's
  business with somebody's view counter.

### 14. Public broadcasters with open HLS (DW, LRT, France 24 and others)

- READ: LRT lists its live channels at https://www.lrt.lt/mediateka/tiesiogiai/
  (search result); DW runs 24 h live on its site and on YouTube
  (https://en.wikipedia.org/wiki/Deutsche_Welle). No terms page found that grants
  third-party playback of the raw stream: UNKNOWN for each.
- **Verdict:** no. They are ERR's class exactly: a public channel whose web
  audience is somebody's reported number. Only with a written yes.

### 15 to 17. Test streams that do not fit

- READ (https://developer.apple.com/streaming/examples/): every Apple example is
  labelled as a trailer, Bip Bop, 3D, APMP or immersive sample, none live.
- READ (search summary, https://www.mux.com/docs/guides/live-streaming-faqs):
  Mux test live streams are watermarked, limited to 5 minutes, disabled after
  24 hours, on a paid plan. READ
  (https://www.mux.com/docs/guides/stream-simulated-live): Mux does not natively
  do simulated live.
- READ (https://github.com/Dash-Industry-Forum/livesim2 and its releases page):
  wall-clock synchronised infinite live from looped VOD, single Go binary,
  `livewindow` default 300 s; README and release notes v1.5.2 to v1.14.0
  mention DASH only. HLS output: UNKNOWN, not found.

## About audience measurement, in general

- READ (https://et.wikipedia.org/wiki/Teleauditooriumi_m%C3%B5%C3%B5tmine, search
  summary): Kantar Emor's Estonian TV panel covers TV-set viewing, and web or
  app live viewing is not in the panel numbers.
- So whatever ERR saw from us was not the panel. It was most likely their own
  web or origin counting. UNKNOWN which system, and UNKNOWN for every other
  broadcaster above. That is why the table treats any public channel as "yes,
  assume it counts" until somebody says otherwise.

## Ranking

1. **Our own films as a synthetic live channel.** Zero conversations, zero
   third parties, PDT and depth chosen by us, and the generator half exists
   twice already (`workers/station` for audio, `demo/fake-err.mjs` for TV).
   It is a present that we made, which is weaker as *television*.
2. **Our own Cloudflare Stream input in DVR mode.** Real live, ours, PDT known
   on the non-DVR manifest. Costs minutes and needs something publishing for as
   long as the window should be.
3. **iReplay.tv Blender 24/7.** The only external stream that documents PDT,
   CORS `*` and liveness together, and asks for nothing but a backlink. Window
   depth unknown.
4. **EbS / EbS+.** The best real-world channel with a public licence and a
   schedule. Needs a written question first.
5. Unified Streaming demo, then Bundestag on request. Everything else: no.

## What one measurement would settle each top candidate

1. **Own channel:** run `/now/` against a sliding PDT playlist over one
   re-encoded R2 film, locally first (the `fake-err.mjs` shape with real
   video). Settles: does `/now/`'s edge finding and back-seek work on fMP4
   from R2 byte ranges. Zero external requests.
2. **Stream DVR:** publish to our own input for 30 minutes, then read the
   `?dvrEnabled=true` manifest once. Settles: segment count against 30 minutes
   (so the real depth per 7,200 cap), PDT on every segment back to the start,
   and CORS. Costs our minutes only.
3. **iReplay:** a person (not a harness) reads ONE media playlist once and counts
   `EXTINF` seconds and the first and last PDT. Settles the window depth. Ask
   iReplay before any automated client points at it, and add the backlink they
   ask for.
4. **EbS:** an email to the Audiovisual Service (address on their copyright
   page, `Mediatheque@ec.europa.eu`, READ via search summary) asking whether a
   third-party hls.js player on an R&D page is acceptable. Only after a yes, one
   playlist read for PDT, depth and CORS.

## UNKNOWN, collected

- iReplay window depth, rate limits, wishes about automated clients.
- Cloudflare DVR manifest: PDT on every segment, CORS, segment length on our
  input, so real depth.
- Unified Streaming demo: PDT, depth, CORS, terms.
- EbS: PDT, live depth, CORS, third-party player permission, the copyright
  PDF's actual text.
- Bundestag: PDT, depth, CORS, the answer to a request.
- NASA+: delivery, PDT, depth, CORS, whether a 24/7 channel exists.
- Every public broadcaster's web audience counting, ERR's included.
- livesim2 HLS output.

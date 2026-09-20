# Has Cloudflare abandoned streaming for AI? — Research findings (2026-08-26)

Researched by web agent; all URLs verified at research time. Complements the hands-on
measurements in plans/plan.md / plans/plan-m2m.md.

## Verdict

**No wholesale abandonment — a hard reprioritization with three distinct trajectories inside one
portfolio.** Cloudflare the company has pivoted explicitly to agentic AI (20 % workforce cut framed
as "agentic AI era" restructuring, Agents Week Aug 2026, ~18 AI-tagged posts in 11 days). Within
media: **MoQ and Realtime/RealtimeKit are actively invested** — largely *because* they serve the AI
thesis (voice agents need realtime transport). **Stream (VOD/live) is maintained-not-loved**: real
changelog activity in 2026 but zero blog posts, features frozen in "beta"/"coming soon" for 3–4
years, and its only new features are Workers-platform integrations. Nothing deprecated, no price
changes. Notably, **the internet has barely noticed either way** — there is no "Stream is
abandoned" discourse, mostly indifference, which is its own signal.

## Per-product trajectory table

| Product | Status | Trajectory | 2026 evidence | Risk for our stack |
|---|---|---|---|---|
| **MoQ relay** | free beta | **Investing** | Blog 2026-07-31; drafts 14/16 + auth; IETF draft-englishm-moq-cdn-provisioning-00 (2026-03-01); NAB 2026 demo w/ Bitmovin; largest production MoQ deployment anywhere | Low abandonment risk, high protocol-churn risk; pre-GA, no SLA |
| **Realtime SFU/TURN** (ex-Calls) | GA, priced 2024-05 | **Investing (as AI substrate)** | Changelog 2026-08-13 DataChannel partial-reliability; 2026-05-29 WebSocket adapter for transcription/agent backends | Low; matches our 1000+ session results |
| **RealtimeKit** (ex-Dyte) | beta, free; GA pricing published | **Investing** | SDK releases 2026-01/03; per-track recording 2026-05-28; transcription GA 2026-06-08 | Recording layer real and moving — but records *RealtimeKit meetings*; beta; ~$0.010/min export pricing coming |
| **Stream (VOD + live HLS)** | GA, unchanged | **Maintaining** | 2026 changelog = Workers bindings, credential rotation, disable inputs. Last blog post 2025-11-06. | Moderate: alive but ambition-free; our dead-manifest quirks unlikely to get fixed |
| **Stream LL-HLS** | "open beta" year 3 | **Abandoned-in-place (feature level)** | Still beta; being removed from main stream-live docs pages in 2026 | High-ish: works (measured) but no GA path |
| **Stream WHIP/WHEP** | "beta" year 4 | **Abandoned-in-place** | Identical 5-item "coming soon" list verbatim since 2022 (page touched 2026-04-21); our 2026-08-26 test confirms WHIP recording still absent; only movement = Mar-2025 backend migration onto Realtime infra | High: never wait on its roadmap |

## Key evidence

- **Blog cadence**: `video` tag: 8 posts (2022) → 3 → 2 → 4 → **1 in 2026** (the MoQ post). Zero
  Stream posts in 2026. AI tag: ~18 posts in 11 days of Aug 2026 alone (Agents Week: Cloudflare OS,
  Kitesurf browser, Wallets, WebMCP). Ratio ~50–100:1.
- **Changelogs are the counter-signal**: Stream's changelog is alive (4 entries 2026) but all
  platform-plumbing. Realtime's changelog is feature-bearing.
- **Company**: 2026-05-07/08 ~1,100 jobs cut (20 %), all teams except quota sales, explicitly
  "agentic AI era"; revenue up 34 % (TechCrunch 2026-05-08). No deprecations/price changes found.
- **RealtimeKit** (the Dyte acquisition, announced 2025-04-09 with the Calls→Realtime rebrand) is
  absorbing the high-level roadmap: recording — promised on Stream WHIP since 2022 — shipped in
  RealtimeKit instead (per-track recording changelog 2026-05-28). Strategic glue is AI: "Cloudflare
  is the best place to build realtime voice agents" (Dincer, 2025-08-29).
- **People**: MoQ team active (Curtis/Pandit/English; English's IETF provisioning draft = long-horizon
  thinking). Renan Dincer (author of nearly every media post 2021–2025) absent from the 2026 MoQ
  post byline. Luke Curley (kixelated, never CF) quit the IETF MoQ WG over media-layer neglect,
  forked moq-lite — yet is CF's loudest cheerleader ("The First MoQ CDN", moq.dev 2025-08-21).
- **Competitive frame**: nobody frames CF as retreating — in MoQ they're the leader (Streaming
  Learning Center 2026-05-26: largest production deployment; NAB 2026: 11 interop implementations).
  The whole realtime-video industry did the same AI pivot (Daily→Pipecat, LiveKit Cloud Agents,
  BlogGeek "the future of Video APIs is AI"). Classic CDN streaming is nobody's 2026 growth story.
- **Community**: no abandonment discourse anywhere. The 2026-07-31 MoQ API post: 8 HN points,
  1 comment (vs 292/121 for the 2025 launch). The 998-comment layoffs thread: zero streaming
  discussion. Representative gripes are quality gaps, not death: "It's terrible and you shouldn't
  use it, but it does a lot more than just serve static video files" (HN 2025-11-12).

## Implications for our stack

1. **Realtime SFU = safest leg** — GA, priced, 2026 features, strategically protected (AI rides it).
2. **MoQ = invested-but-unstable** — bet directionally, not operationally; draft churn; near-zero
   external user base.
3. **Stream LL-HLS = the exposed leg** — works today, but 3 years of beta and disappearing from
   docs; our 45–120 s dead-manifest windows are the kind of quirk that never gets fixed. Keep the
   player/rig defenses permanent.
4. **Never wait for Stream WHIP "coming soon"** — 4 years verbatim; recording effectively shipped in
   RealtimeKit instead (budget ~$0.010/min export when its pricing activates).
5. **Perception vs reality**: the internet under-rates both directions; our measured picture
   (solid SFU, quirky-but-alive LL-HLS, moving MoQ, fossilized WHIP) is more granular than anything
   published.

## Source index

MoQ relays API (2026-07-31) blog.cloudflare.com/moq-relays/ · MoQ launch (2025-08-22)
blog.cloudflare.com/moq/ · Realtime+RealtimeKit intro (2025-04-09)
blog.cloudflare.com/introducing-cloudflare-realtime-and-realtimekit/ · Stream changelog
developers.cloudflare.com/changelog/product/stream/ · Realtime changelog
developers.cloudflare.com/changelog/product/realtime/ · WHIP/WHEP beta docs
developers.cloudflare.com/stream/webrtc-beta/ · RealtimeKit pricing
developers.cloudflare.com/realtime/realtimekit/pricing · TechCrunch layoffs (2026-05-08)
techcrunch.com/2026/05/08/cloudflare-says-ai-made-1100-jobs-obsolete-even-as-revenue-hit-a-record-high/
· HN layoffs thread news.ycombinator.com/item?id=48054423 · moq.dev/blog/first-cdn/ ·
datatracker.ietf.org/doc/draft-englishm-moq-cdn-provisioning/ · streaminglearningcenter.com
(Ozer 2026-05-26) · bitmovin.com/blog/media-over-quic-bitmovin-cloudflare/ · Fastly MoQ blog
(2026-04) · bloggeek.me/future-video-api-ai/ · blog tags video/ai/cloudflare-stream ·
FastPix alternatives piece · Investing.com Q2 2026 slides · Rethink Research MoQ-fork piece ·
HN threads 45902426 / 44987924 / 46219699 · community.cloudflare.com/t/904279

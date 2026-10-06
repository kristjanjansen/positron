# Cloudflare Birthday Week 2026, read against positron

Read 2026-10-06 from https://blog.cloudflare.com/birthday-week-2026-wrap-up/
(46 announcements, 2026-09-28 to 2026-10-02). Ten announcement posts were opened;
the rest are judged from the wrap-up's one-line summary only, and say so.

Every figure below is QUOTED from the post named beside it, read through a
fetch tool that summarises pages. Prices and limits were re-fetched verbatim
where they looked odd (KV Instant, Containers). Nothing here was measured on
this account. Lines marked **INFERRED** are this reader's judgement, not the
post's words.

What positron uses, checked today in `workers/*/wrangler.jsonc`: 18 Workers,
Durable Objects with SQLite in 14 of them, R2 (`elektron-archive-test`,
`positron-station`), one Container (`workers/pub`, `@cloudflare/containers`
`^0.0.28`, `class Pub extends Container`, `sleepAfter = '10m'`,
`max_instances: 3`), Workers AI (`workers/wish`), the Rate Limiting binding,
`observability.enabled` on every worker, no KV namespace anywhere, Stream Live
(RTMPS LL-HLS and WHIP/WHEP) and Cloudflare's MoQ relay.

## The five that matter

### 1. Containers rebuilt: 648 ms median start, and the `Container` class is frozen after 2026-12-31

https://blog.cloudflare.com/faster-agent-sandboxes/

- **What it is.** A new Containers runtime driven from the Durable Object
  through `ctx.container`, with a `durable_object` scheduling policy, image and
  instance size chosen at start rather than at deploy, and filesystem
  snapshots.
- **Figures, quoted.** "median startup fell from just over four seconds to 648
  milliseconds". "100,000 Containers in 5.387 seconds across six locations".
  Config keys: `"scheduling_policy": "durable_object"`, `"images": { "node":
  { "dockerfile": "./images/node/Dockerfile" } }`, instance names `standard-1`,
  `standard-2`. The 648 ms applies to the new `durable_object` policy, not to
  the legacy path.
- **The deadline, quoted.** "We'll maintain the `Container` class and legacy
  `Sandbox` class through December 31, 2026. Existing deployments keep running
  after that date, but the classes won't get updates."
- **Touches.** `workers/pub` (the ffmpeg publisher behind `/stage/`, `/llhls/`,
  WHEP pages and the device log at `pub.positron.studio`). It is built on
  exactly the class being frozen.
- **What it would change.** Cold start is the thing every viewer of a pub-fed
  page waits through: `GET /status` "blocks on the container's cold start" (CLAUDE.md)
  and the WebSocket upgrade had to stop awaiting the publish because of it.
  Four seconds to 0.65 s would shrink that wait if it holds for our image.
  **INFERRED:** our image runs ffmpeg plus a Node server, and the post's figure
  is for agent sandboxes, so our number is unknown until measured. No local
  cold start figure for `pub` was found in `PROGRESS.md` or `HANDOFF.md`, so
  there is no "before" either. Choosing the instance size at start could let
  `/stage/` ask for a larger box only when two encodes run (the half-vCPU stall
  in `positron-streaming`). The post says NOTHING about `sleepAfter`, idle
  timeout, inbound networking (so no news for MoQ-in-a-container), pricing or
  egress.
- **Availability.** Public beta "today" (2026-09-30). Snapshots public beta.
- **Verdict: worth a plan.** Measure `pub`'s current cold start first (a
  number we do not have), then port `Pub` to `ctx.container` before
  2026-12-31 so the reference-counting sweep is not stuck on an unmaintained
  class. Not urgent to act: existing deploys keep running.

### 2. Workers Observability pricing changes on 2026-12-01, and every worker here has it on

https://blog.cloudflare.com/one-observability-platform/

- **What it is.** Eight updates folding Workers logs, Log Explorer, traces,
  alerts and analytics into one product with one SQL API and new pricing.
- **Figures, quoted.** New pricing "Effective date: December 1, 2026". Free
  plan "0.5 GB daily ingestion, 7-day retention". Paid "50 GB ingestion + 10
  GB-month storage included; $0.25/GB ingested, $0.10/GB-month stored
  thereafter". Domain Analytics: "30 days of domain analytics on every plan"
  (GA). Unified SQL API: beta. Custom alerts on the SQL API with "webhooks now
  on all plans": beta. Logpush on self-serve: "25 GB/month included; $0.03/GB
  (Cloudflare destinations), $0.10/GB (external)", GA.
- **Touches.** All 18 workers (`"observability": { "enabled": true }` in each
  `wrangler.jsonc`), and `workers/view/analytics.mjs`, which today is clamped
  to one day per GraphQL query and refused
  `httpRequestsAdaptiveGroups` older than 4w3d (`positron-streaming`).
- **What it would change.** The bill becomes bytes of log rather than events.
  **INFERRED:** the account is on Workers Paid (Containers need it), so 50 GB a
  month is included, and the noisy sources are the verify harness and `pub`'s
  ffmpeg tail. Probably $0, but nobody has measured our log volume. The
  unified SQL API and 30-day Domain Analytics might lift the one-day-per-query
  clamp in `analytics.mjs`. The post does not say whether the GraphQL limits
  change, so that is unknown.
- **Availability.** Mixed: pricing from 2026-12-01; SQL API and alerts beta;
  Domain Analytics, dashboards and Logpush GA.
- **Verdict: watch, with one action before 2026-12-01:** read the account's
  current monthly log volume in the dashboard so the new bill is a number
  rather than a surprise.

### 3. Workers "Issues": grouped errors pushed to a webhook or a coding agent

https://blog.cloudflare.com/real-time-issue-detection/

- **What it is.** Built-in error grouping for Workers: "Group repeated
  exceptions, 5xx responses, and error logs into one issue", forwarded with a
  source-mapped stack trace and surrounding logs to a webhook, chat tool, or a
  coding agent (Claude Code is named). It also flags "runaway alarms or
  excessive logging in loops".
- **Setup, quoted.** "Set `observability.issues.enabled` to `true` in
  `wrangler.jsonc`", then an automation in the dashboard.
- **Touches.** Every Durable Object worker, especially the alarm-driven ones
  (`ingest`'s hourly cron sweep, `pub`'s alarm sweep, `station`), and the
  failure modes `positron-streaming` describes as silent: an alarm that throws
  six times and is never re-run, a mail handler retried three times, a full
  relay room logging `closed 1006`.
- **What it would change.** Today a silent failure is found by somebody
  noticing. A runaway-alarm detector is exactly the "busy loop wearing a
  schedule" this repo already wrote a rule about. **INFERRED:** it sees only
  exceptions, 5xx and logs, so the worst failures here (a relay room full,
  WHEP media never arriving, a 403 from ERR) still return 200 or never reach a
  worker at all, and stay invisible.
- **Availability.** Open beta. Pricing and plan requirement not stated.
- **Verdict: worth a plan, cheap.** One config line per worker plus a webhook.
  ⚠️ Pointing it at `positron@` mail or a channel is the owner's call: it is
  new outbound traffic about every 5xx, and `quiet-feedback-stays-quiet` is a
  standing preference.

### 4. Workers KV Instant: 250 ms global writes, but tiny and expensive

https://blog.cloudflare.com/workers-kv-instant/

- **What it is.** A KV mode backed by Cloudflare's internal Quicksilver store.
- **Figures, quoted verbatim.** "reads resolving in under two milliseconds
  even at the 99th percentile". "Writes are pushed to the edge over 20 times
  faster, with 99% of all writes replicating in around 250ms." "Class B
  operations (`get`) are charged at $0.20 per million keys requested". "Class
  A operations (`put`, `delete`, and `list`) are charged at $0.10 per
  operation." "Storage is billed at $100 per MB, per month." "Each key can be
  up to 300 bytes, and values can be any size that does not cause the
  namespace to exceed one megabyte in total size." "up to 10,000 key value
  pairs". "one write per namespace per second". Config: `"mode": "instant"`.
- **Touches.** `workers/station` chose a Durable Object over KV precisely
  because "KV's up-to-60-second propagation makes it one you cannot measure"
  (`positron-streaming`). The `view` worker's global ERR gate is also a
  single DO.
- **What it would change.** Very little. One write a second and ten cents a
  write rule it out for anything that changes during a show; the DO answers
  the station's question already. **INFERRED:** the only fit is read-mostly
  configuration read in every colo (a schedule changed a few times a day),
  where it would save the DO round trip.
- **Availability.** Private beta, signup required.
- **Verdict: watch.** It removes the reason recorded for avoiding KV, which is
  worth knowing; it does not beat the DO for anything we write.

### 5. K2 Streams: an ordered, durable event log on R2

https://blog.cloudflare.com/cloudflare-k2-streams/

- **What it is.** "A serverless event streaming service built directly on top
  of R2 object storage", with Worker bindings and an HTTP API, pull-based
  consumers with leases, many independent subscriptions per stream.
- **Figures, quoted.** Produce latency "approximately 1 second at the 99th
  percentile". Beta limits "Maximum 10GB storage per account", "30 MB/s
  produce per stream". Retention default "7 days (604,800 seconds)". Pricing
  after beta: "$0.04/GB" produced, "$0.04/GB" consumed, "$0.02/GB/month"
  retained.
- **Touches.** The things that record message streams into DO SQLite today:
  `workers/store`, `workers/feedback`, `workers/cues` backlog, `workers/rtc`'s
  stored payloads, and the `__index` workaround for a DO namespace that cannot
  be enumerated.
- **What it would change.** **INFERRED:** at ~1 s p99 produce it is no use on
  the live path (the relay's DO hop is 1 to 2 ms at p50), so it could only
  replace the PERSIST half of "broadcast first, persist second": an ordered,
  replayable archive of a session's cues or notes without hand-pruned SQLite
  tables. That is a nicer shape, not a fix for anything that is broken.
- **Availability.** Public beta, Workers Paid.
- **Verdict: watch.**

## Read, and smaller than they look

- **Streamline**, https://blog.cloudflare.com/streamline/ . An open-source
  example (`github.com/cloudflare/streamline`, `cloudflare/streamline-demo`) of
  a Go controller plus FFmpeg in a Container, orchestrated by a Durable Object,
  doing "filter, overlay, subtitle, encode" on RTMPS from Stream Live and HLS
  from Stream videos, out to RTMPS/RTMP and a WebSocket fMP4 preview. It is
  `workers/pub` with a nicer API, published by Cloudflare. **No WHIP, WHEP,
  SRT, MoQ or R2, no latency, no prices.** It says nothing about WHIP
  recording or WHIP to HLS interop, so the "announced, not shipped, re-test"
  line in `positron-streaming` stands unchanged. Verdict: **watch**; worth
  reading its DO and container lifecycle code when `pub` is ported (item 1).
- **Rust in Workers via Emscripten**,
  https://blog.cloudflare.com/rust-workers-emscripten-target/ . "first public
  experimental preview" letting native Rust and Tokio run in Workers, with
  "TCP, UDP, and Unix socket support through the `-sNODERAWSOCKETS`
  compilation option"; demo is a Minecraft server in a Durable Object. No
  size, memory or CPU limits given. **INFERRED:** UDP from a Worker is the
  interesting word for MoQ and OSC, but the post does not say inbound UDP or
  QUIC is accepted, and the `positron-streaming` rule (a relay cannot live in a
  Container, dial-out only) is about inbound. Verdict: **watch**, and do not
  read it as "a MoQ relay can now run in a Worker" without a test.
- **Protected Quick Tunnels**,
  https://blog.cloudflare.com/protected-quick-tunnels/ . `cloudflared tunnel
  --url http://localhost:8080 --allowed-mail you@example.com`, "No Cloudflare
  account required on either side", sessions "Up to four hours per visitor",
  needs `cloudflared` 2026.9.3 or later, free. Touches the "hand over a link"
  rule for local pages and the Pi under `rig/`. **INFERRED:** a way to give the
  owner a clickable URL to a page on `:8890` on a phone without deploying.
  ⚠️ It needs a `cloudflared` install, and this is a managed machine where
  installs are asked first. Verdict: **watch**.
- **cf CLI**, https://blog.cloudflare.com/cloudflare-cf-cli-launch/ .
  `npm i -g cf`, TypeScript config (`cloudflare.config.ts`), JSON output,
  `cf migrate` from Wrangler; "cf will continue to delegate to Wrangler for dev
  and deployment for JavaScript Workers that need to continue to use esbuild";
  Wrangler gets "maintenance support for 18 months after the beta ends". Open
  beta. Touches `workers/view/deploy.mjs` and every `wrangler.jsonc`. The post
  does not address auth, so the `CF_API_TOKEN` shadowing trap is not known to
  be fixed. Verdict: **watch**; nothing to do for 18 months plus a beta.
- **AI Gateway Auto Router**, https://blog.cloudflare.com/auto-router/ . Routes
  LLM requests to a cheaper capable model; "free while in beta". `workers/wish`
  calls Whisper through the Workers AI binding, not through AI Gateway and not
  an LLM. Verdict: **irrelevant**.

## Everything else, one line each (judged from the wrap-up summary only)

All **irrelevant** unless stated.

- Forge SDK generation pipeline: tooling for API vendors.
- EmDash CMS: positron has no CMS.
- VoidZero update and Vinext 1.0: positron uses no bundler or Next.js.
- Kitesurf browser for agents: not a streaming or media tool.
- BEACON performance dataset: public RUM data about other sites.
- The Cold Start competition: a startup pitch event.
- Cloudflare Certificate Authority: announced intention only; certificates here already work.
- Post-quantum CA with Merkle Tree Certificates: not live, and nothing here to migrate.
- CryptoLabe cryptography discovery: enterprise PQ migration.
- IPsec downgrade protection: no IPsec here.
- Post-quantum visibility in analytics: nothing to act on.
- Application Profiles (positive security): WAF feature, no WAF in use.
- Adaptive AI WAF testing: WAF research.
- Threat Signals: threat intelligence, nothing exposed that needs it.
- Adaptive Application Security Framework: enterprise framework.
- Agentic Web strategy, Monetization Gateway (HTTP 402, beta), Pay Per Use: positron charges nobody.
- Simplified domain management: one domain, already registered.
- AI Gateway user insights: no AI Gateway in use.
- $100 million donations milestone: news.
- Cloudflare Basin GA (Iceberg on R2): no analytics tables.
- Post-quantum crypto (ML-KEM, ML-DSA) in Workers WebCrypto: nothing here needs it.
- AI Search GA: no search over documents.
- Artifacts open beta and Git platform competition: code hosting stays on GitHub.
- Cloudflare OS (waitlist): agent workspace product.
- Sovereign AI update: policy news.
- Clef decision models: classification models, no use here.
- Cloudflare Traces (open beta): request-level tracing; covered under item 2, and **INFERRED** mildly useful for "is the edge or the worker answering" questions like the `_headers` and asset-shadowing traps, not worth a plan alone.
- Enterprise for All update: Logpush on more plans, covered under item 2.
- OHTTP Gateway (closed beta): privacy relay, no use here.
- Account abuse protection dashboard: no logins.
- Civil society automation: news.
- Network performance update ("fastest provider across 74% of the top 1,000 networks"): a ranking, changes nothing we can measure.
- Web Search API in AI Gateway: no LLM calls.

## What could not be settled here

- `pub`'s cold start today. No measured number was found in the standing
  files, so the 648 ms claim has nothing to be compared against yet.
- Whether the new Containers runtime changes `sleepAfter` or activity-timeout
  semantics. The post is silent, and `pub`'s keep-alive sweep depends on them.
- Whether the GraphQL Analytics limits that `analytics.mjs` works around
  change under the unified SQL API.
- This account's monthly Workers log volume, which decides whether the
  2026-12-01 pricing costs anything.
- Nothing announced touched Cloudflare Stream, WHIP recording, WHIP to HLS
  interop, Realtime/WHEP, the MoQ relay, R2 pricing or Durable Object limits,
  as far as the wrap-up's titles and the ten posts read show.

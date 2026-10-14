# elektron-jam — RETIRED 2026-09-04

Deleted from the account (`wrangler delete`). `jam.positron.studio` no longer
resolves; `elektron-jam.kristjan-jansen.workers.dev` 404s.

**Superseded by `workers/relay` → `positron-ws` at `ws.positron.studio`**, which
does the same verbatim-relay job **tokenless**, so a public page no longer has to
publish a token to use it.

Retiring this one was safe where renaming the others is not: `JamRoom` held **no
durable storage** — its only mention of the word was the comment saying "NO
storage" — so there was no Durable Object state to abandon, unlike `elektron-rtc`
(roster, perms, cuelog, tiles) or `elektron-view` (the durable ERR cache).

The source was kept until 2026-10-14 because the measured numbers cite it by name (it is in git history now, see the last line):
**34.5–34.9 ms p50** (plans/plan-looper.md, proto/jam/NOTES.md) against cues' 37.8 and
the SFU's 16.1. Those records keep the `elektron-jam` name — they say what was
measured, and rewriting them would make them false.

Do not redeploy. If you need a token-gated relay again, add a gate to
`workers/relay` behind a path rather than resurrecting this.

The code (`src/`, `wrangler.jsonc`) was removed from the tree on 2026-10-14 and is in git history: `git show 1f036842:workers/jam/src/index.js` (the last commit that held it).

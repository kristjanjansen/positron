# Secret rotation checklist (open since session 1 → 2026-08-27)

Four exposures, ranked by blast radius. All are USER actions (dashboard/GitHub);
commands below are the exact follow-ups once each new value exists.

## 1. Cloudflare API token — pasted in chat (session 1) — HIGHEST
Scopes: Stream ✓ Calls ✓ Realtime ✓. Anyone holding it can create/delete Stream
inputs, rooms, spend money.
- Dashboard → My Profile → API Tokens → find it → **Roll** (or Delete + recreate).
- Local cleanup: the legacy value sits in repo `.env` as `CF_API_TOKEN` — replace
  it. NB the proven trap: `wrangler` auto-loads `.env` from its cwd, so a stale
  token there shadows machine OAuth (that's why uploader/postshow pin cwd to a
  dir without `.env`).
- Verify: `env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN wrangler whoami` from a
  no-.env dir → should show OAuth identity, not the token.

## 2. MoQ draft-16 relay tokens (pub + sub) — transited chat + local logs
Used by rig/moq/test-d16-{auth,inner}.sh and the obs-cloud profile.
- Dashboard → the relay's tokens → regenerate BOTH (they're shown once).
- Update: `rig/moq/.env` (or wherever the scripts read them — they reference
  paths, never literals) and `rig/obs-cloud/obs/` baked profile if it embeds one.
- Old values also linger in `rig/moq/spike/logs/*-chrome.log` (URL paths) —
  those are gitignored, but delete them: `rm -f rig/moq/spike/logs/*chrome.log`.

## 3. Public repo `kristjanjansen/studio` — CF API token + RTMPS stream key
Committed Jan 2025, still public, flagged twice (visualia lineage doc + this
session's mine).
- Rotate the token (same place as #1) and regenerate the Stream key (Stream →
  the input → reset key), THEN scrub or archive the repo. Note: rotating is what
  actually fixes it — git history rewriting is optional cleanup, not the fix.

## 4. `maria_old` git history — CF API token (server route AND a deleted
   client-side page that would have shipped it to browsers)
`server/api/streams/index.get.ts:3` at HEAD + `pages/api/index.vue:4` in history.
Same account as #1 — rotating #1 covers it. Repo is local/private; scrub if it
ever goes public.

## Post-rotation smoke (5 min)
```sh
# workers still authed (they use bindings/secrets, not the API token)
curl -s -o /dev/null -w '%{http_code}\n' https://elektron-selfrec.kristjan-jansen.workers.dev/time
# d16 relay with the NEW tokens
bash rig/moq/test-d16-auth.sh          # expects moq-transport-16 negotiated
# R2 path unaffected (OAuth, not token)
env -u CF_API_TOKEN wrangler r2 bucket list   # from proto/archive (no .env there)
```

## Worker secrets currently set (rotate only if suspected)
`SELFREC_TOKEN` (elektron-selfrec), `JAM_TOKEN` (elektron-jam), `CUES_TOKEN`,
`ROOM_TOKEN`, `OPERATOR_TOKEN` (elektron-rtc/cues — CUES_TOKEN already rotated
once after a log echo). Rotate with:
`wrangler secret put <NAME> --name <worker>` from a no-.env dir.

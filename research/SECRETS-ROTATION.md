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
curl -s -o /dev/null -w '%{http_code}\n' https://selfrec.positron.studio/time
# d16 relay with the NEW tokens
bash rig/moq/test-d16-auth.sh          # expects moq-transport-16 negotiated
# R2 path unaffected (OAuth, not token)
env -u CF_API_TOKEN wrangler r2 bucket list   # from proto/archive (no .env there)
```

## Worker secrets currently set (rotate only if suspected)
`SELFREC_TOKEN` (elektron-selfrec), `CUES_TOKEN`,
~~`JAM_TOKEN`~~ (elektron-jam was RETIRED 2026-09-04 and replaced by the
tokenless `positron-ws`; nothing reads JAM_TOKEN any more, so it needs no
rotation — but delete it from `.env` and from any Worker secret store),
`ROOM_TOKEN`, `OPERATOR_TOKEN` (elektron-rtc/cues — CUES_TOKEN already rotated
once after a log echo). Rotate with:
`wrangler secret put <NAME> --name <worker>` from a no-.env dir.

## 2026-09-10 ROOM_TOKEN rotated, and 2026-09-24 the RTMPS key after it

**`ROOM_TOKEN` — ROTATED, and verified dead.** It was found sitting in a
COMMITTED log at HEAD (`proto/m2m/logs/p3b-server-a.log`, as
`token=dae4e3d4…`), discovered while auditing the repo before publishing it to
GitHub. New secret put on `elektron-rtc`; proved by effect rather than by the
CLI's "Success" line — the old value now answers **403** and the new one **200**
on `rtc.positron.studio`. The committed string is therefore a dead literal and
needed no history rewrite. Only `studio/engine.mjs` and `studio/verify.mjs`
consume it, both from `.env`, so nothing deployed broke.

✅ **`positron-demo`'s RTMPS stream key WAS exposed and IS ROTATED**, at
**2026-09-24T19:08:11Z**. It had reached a session transcript on 2026-09-10 via
a bare `GetStreamServiceSettings`, which returns the key in clear, and anyone
holding it could PUBLISH to the input the live demos play, so the risk was
vandalism of positron.studio rather than data loss. The old value is dead.

🔴 **AND THE REASON IT SAT UNROTATED FOR TWO WEEKS WAS A WRONG SENTENCE IN THIS
FILE.** It said *"There is no rotate-key API for a Cloudflare live input"*, and
concluded that rotating meant DELETE AND RECREATE, which mints a new UID and
ripples into `demo/shell/live.mjs`, `workers/pub`'s container and every demo
that plays it. That made a one-command fix look like a scoped refactor, so it
was deferred, and then deferred again.
✅ **`POST /stream/live_inputs/<uid>/rotate_keys` EXISTS, AND HAS SINCE
2026-07-31.** It rotates the key IN PLACE: **the input UID did not change**, so
nothing in the repository needed editing and no demo moved. The whole ripple the
paragraph above described was imaginary.
⚠️ **THE LESSON IS THE ONE THIS REPOSITORY KEEPS PAYING FOR, ARRIVING AS A
SECURITY COST RATHER THAN A DOCUMENTATION ONE.** A confident sentence about a
provider's API outlived the API. Nothing type-checks a claim about somebody
else's endpoint, and the more expensive the claim makes the work sound, the
longer it survives unchecked, because nobody goes looking for a cheaper way to
do a thing they have already been told is hard. **Re-read the provider's
current docs before deferring anything on the strength of a note in here.**

**Also audited, and found harmless:** the RTMPS stream keys, SRT passphrases and
WHIP publish URL committed under `proto/m2m/artifacts/`, `proto/m2m/logs/`,
`proto/replay/` and `studio/artifacts/` all name live inputs that **404 today**,
so those credentials are dead. `.env` has never been committed (`.gitignore`
covers it from the first commit).

**The standing lesson, now earned twice.** `src/publish.sh` already learned that
redaction must live at the point of capture; this time every purpose-built
script redacted correctly (`key set, not printed`) and an ad-hoc convenience
call printed the raw object anyway. `rig/obs-pro/stream.mjs` carries a comment
forbidding any call that dumps service settings.

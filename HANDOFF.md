# Handoff, 2026-09-24, session 48, the repository went public

🔴 **THE HEADLINE: THIS IS A PUBLIC REPOSITORY NOW**, at
**https://github.com/kristjanjansen/positron**, and the thing it is FOR is that
a stranger can paste four lines into Claude Code or Codex and have a site of
their own on Cloudflare in about a quarter of an hour. That was watched end to
end and it worked.

```sh
node -e "import('./demo/manifest.mjs').then(m => console.log(m.DEMOS.length))"   # 59 today, 57 built
git log --oneline -1
node demo/verify.mjs sound pack tom          # the pages this session touched
```

## The thing to hand somebody

```
Set me up for Cloudflare: https://developers.cloudflare.com/agent-setup/prompt.md
Then read https://raw.githubusercontent.com/kristjanjansen/positron/main/.claude/skills/positron-start/SKILL.md
and follow it exactly. Run every command yourself rather than asking me to.
If you cannot read that file, stop and tell me. Do not guess what it says.

I want to build something like the stage demo at https://positron.studio/stage/.
```

⚠️ **THE FOURTH LINE IS NOT POLITENESS AND WAS EARNED BY A FAILURE.** Run in a
sandbox whose shell had no DNS, Codex could not fetch the skill, did not stop,
searched instead, found a DIFFERENT product that shares the name `positron`, and
produced 181 confident lines planning somebody else's software with the
admission buried in the last sentence. With that line it stops and says it
cannot reach the file.
⚠️ **AND RAW GITHUB CACHES FOR A FEW MINUTES.** An edit to the skill is not
instantly visible to the paste block, so a test run within a couple of minutes of
a push is testing the previous version. `cmp` the fetched file against the local
one before concluding a rule was ignored.

## What is deployed

**BUILD `3e0dbc2-040248-d71a`**, deployed and confirmed on the edge 2026-09-25,
11 files. It cleared the comment-only drift left by the previous stamp
`e0158ba-133813-eba3`, which was the path rewrites from
`measured-devices-2026-09-20.md` moving to `research/`. **Nothing a visitor sees
changed in that deploy**, and nothing under `demo/`, `src/` or `workers/` has
changed since.

✅ **`/llhls/` IS WORKING AGAIN AND WAS DARK FOR A DAY.** MEASURED 2026-09-25
against the deploy, `DEMO_BASE=https://positron.studio node demo/verify.mjs
llhls`: **12/12 green**, publisher held, manifest 200, player attached, and
**0 rebuilds, 0 stalls, 0 resyncs, 1 level switch** once playing, with 0 console
errors and 0 failed requests. The cause was the RTMPS key rotation not reaching
the `STREAM_KEY` Worker secret; the whole story is in the rewritten rotation
entry below and in `BACKLOG.md`.

The front page is **11 sections over 58 listed rows** (59 in `DEMOS`, `feedback`
is `unlisted`), titled **`positron: 58 media art experiments`** from
`indexTitle()`, which counts what it is about to draw rather than being written
down. The browser tab stays `positron`.

`TH` `err` `instruments` `u:` `kurenniemi` `capture` `timeline` `streaming`
`messages` `technologies` `kit`

## What changed, in one pass each

- **Three demos archived** to `archive/demos/`: `memento`, `blocks`, `num`.
  `/blocks/` was load-bearing and took two claims with it, both repaired.
- **`vclick` is `sound`.** Directory, URL, identity strings and 30-odd
  references. `tarmoj/vclick` is U:'s own repository and did NOT move.
- **The Circuit pack left this repository entirely**, to the private
  `kristjanjansen/packs`, verified at 3,506,555 bytes before anything was
  removed. `/pack/` and `/tom/` fetch nothing by default now and take `?pack=`.
- **`README.md`, `AGENTS.md`, `LICENSE`, `NOTICE.md`** all new. The licence is
  MIT with `NOTICE.md` indexing what it does not cover, and the finding worth
  knowing is that `demo/grains/` and `demo/patch/` are **AGPL-3.0-or-later** and
  have said so in their own source all along, so going public SATISFIES an
  obligation rather than creating one.
- **2,850 lines of embedded knowledge moved into three skills**, additively and
  verbatim, by four agents in parallel. `positron-ui` 1828, `positron-verify`
  1443, `positron-streaming` 1188. Nothing was deleted from any page.
- **`evals/`** holds two scenario cases in the layout `claude plugin eval`
  expects. That command is early-access gated on this account and has never run
  here; both cases were executed by hand instead, Claude 2/2 and Codex 2/2.
- **`research/maxmsp-rnbo-2026-09-24.md`**, and the one question that settles any
  Max plan: does the collaborator patch in RNBO, or in ordinary Max objects.

## 🔴 The history was rewritten and the remote was replaced

**Two things a public clone would have handed out, and a force-push did NOT
remove either.** MEASURED afterwards: the pack was still downloadable at
`419ec5c` at its exact byte count, because GitHub keeps serving unreferenced
objects by SHA. The repository was **deleted and recreated** from the rewritten
history instead, and the same three probes then answered 404 and 422.

- `New Pack.circuitpack`, 3,506,555 bytes
- **857 files from two Chrome user profiles** under `rig/moq/spike/logs/`,
  including `Cookies`, `Login Data`, `History`, `Web Data` and `Trust Tokens`.
  Not at HEAD, and history is what a clone gets. Also most of the 242 MB.

⚠️ **SO A FORCE-PUSH IS NOT A REMOVAL ON GITHUB.** If this happens again, the
order is: rewrite, push to a NEW repository, verify the old SHAs 404 there,
then delete the original.
✅ **`positron-demo`'s RTMPS KEY IS ROTATED**, 2026-09-24T19:08:11Z, and the
input UID did not change, so nothing in the repository needed editing. The
`rotate_keys` endpoint exists since 2026-07-31 and `research/SECRETS-ROTATION.md`
said it does not; that file was wrong on this point and right about the rest,
and it was corrected on 2026-09-25.

🔴 **AND THE SENTENCE ABOVE IS TRUE AND TOOK `/llhls/` OFF THE AIR FOR A DAY.
CORRECTED 2026-09-25.** *"Nothing in the repository needed editing"* is right,
and it is not the question. **The key is not in the repository.** It is a Worker
secret, `STREAM_KEY` on `positron-pub`, and rotating the key at Cloudflare
without re-putting that secret leaves the publisher offering a dead credential.
MEASURED: the RTMPS leg came up and was refused every 30 s with `ffmpeg exit
224`, `SSL routines::bad write retry` and a broken pipe out of the flv muxer,
the input read `status: disconnected` with `videoUID: null`, and the manifest
answered 204 for as long as anybody held it. **The WHIP leg on the same
container published throughout with 0 restarts**, which is what identified this
as a credential fault in one run rather than an encoder hunt: two legs, one
container, differing only in which secret they carry.
✅ **FIXED**, by piping the current key straight into `wrangler secret put
STREAM_KEY --name positron-pub` without printing it. Confirmed after: input
`live: true, status: ready`, manifest 200, and the packaging back to
`PART-TARGET=0.5`, `PART-HOLD-BACK=1.5`, `TARGETDURATION=3`, 41 parts with 11
independent.
⚠️ **THE RULE THIS EARNED: A ROTATION IS NOT DONE WHEN THE PROVIDER ACCEPTS IT,
IT IS DONE WHEN EVERY CONSUMER HOLDS THE NEW VALUE.** The consumers are exactly
the places a repository cannot see, which is why nobody checks them, and a
reassuring sentence about the repository reads as completion.

## What the skill learned tonight, from watching rather than reasoning

Eight corrections, seven from somebody reading real output and one from an agent
outperforming its instructions. The three that matter most:

1. 🔴 **FREE IS THE DEFAULT, NOT THE GOAL.** The skill made free the objective,
   so an agent recommended the R2 route for getting a film onto phones and
   called it "free-first", when it is the hardest thing in this repository and
   the PAID option is the easiest. The rule is now **no surprise spending, not
   never spend**: recommend what works, say what it costs, let them choose, and
   when the free route is more work say so in the same sentence as the word free.
2. 🔴 **EVERY SENTENCE THEY READ IS PLAIN, NOT ONLY THE QUESTIONS**, including
   the reason given when asking permission to run a command. An approval somebody
   did not understand is not an approval, it is a habit of pressing yes.
3. 🔴 **CHECK THE PROJECT NAME IS FREE BEFORE THE FIRST DEPLOY.** `wrangler
   deploy` overwrites a Worker of the same name without asking. An agent did this
   unprompted; the skill had not thought of it.

## What is open

🔴 **THE ONE TO PICK UP FIRST: `nativeReloadCooldownMs` IS REFERENCED AND NEVER
DEFINED, SO THE NATIVE RELOAD RATE LIMIT DOES NOT RUN.** Found 2026-09-25 while
answering an unrelated question about hls.js configuration, not looked for.
`src/low-latency-player.js:564` reads:

```js
if (since < cfg.nativeReloadCooldownMs) return;   // cfg.nativeReloadCooldownMs is undefined
```

**`since < undefined` is `false`**, so the guard never returns and every native
reload goes straight through. MEASURED by grep across the repository: the
identifier appears **twice**, and both are that same line, in
`src/low-latency-player.js` and its byte-identical deployed copy under
`workers/view/public/`. It is **not** in `DEFAULTS` (lines 103 to 235, 23 keys)
and not in any caller.
🔴 **TWO PLACES CLAIM THE GUARD WORKS, WHICH IS THE ACTUAL PROBLEM.** The
function's own comment says it is *"rate limited, because a reload storm is
worse than a stall"*, and `positron-streaming` says **"Native HLS gives one
lever and it is a reload, so rate limit it"**. The same skill records that
**rebuild storms were the direct cause of the v4 tab crash**. So a defence that
was designed, commented and written into a skill is inert in the shipped file,
and every reader of either sentence believes it is there.
⚠️ **AN UNDEFINED CONSTANT IS THE QUIETEST FAILURE JAVASCRIPT HAS**: no throw,
no warning, and the comparison silently picks the branch that does nothing.
⚠️ **NOT FIXED 2026-09-25 FOR TWO REASONS, AND NEITHER IS EFFORT.**
1. **The number has to be chosen rather than guessed.** `rebuildCooldown` next
   door is 4000 with a 3,000 ms trigger gap, but a native reload is heavier: it
   tears the element down and refetches. `stallTimeout` is 6000 and
   `sourceStallTimeout` is 12000, so anything at or under 6 s risks reloading
   inside a stall the watchdog has not finished measuring.
2. 🔴 **NOTHING HERE CAN TEST IT, AND THE PHONE IS OFF.** Said 2026-09-25: *"my
   phone is off atm"*. The native path is WebKit only, `verify.mjs` drives
   headless Chrome and never takes that branch, and `verify-native.mjs` needs a
   real iPhone. This is the file's own recorded trap arriving one layer along:
   *"local verify could not catch it because desktop Safari never takes that
   branch"*.
⚠️ **WHAT BOUNDS IT TODAY IS ACCIDENT, NOT DESIGN.** The source watchdog resets
`nativeEdgeMoved` before calling, which re-arms a 12 s timer, and the other two
triggers are element events. So a storm is unlikely rather than prevented, and
that is a smaller claim than the one currently written down.
✅ **THE FIX IS ONE KEY IN `DEFAULTS` BESIDE `rebuildCooldown`**, plus a number
with a reason on it, plus `node demo/verify-native.mjs` on a phone before
anybody writes "rate limited" again. Full workings in `BACKLOG.md`.

- ✅ **DEPLOYED 2026-09-25: BUILD `3e0dbc2-040248-d71a`**, confirmed on the
  edge, 11 files. That cleared the comment-only drift this file used to describe
  as "nothing deployed since this morning's stamp".
- ✅ **`research/SECRETS-ROTATION.md` IS CORRECTED**, 2026-09-25. The
  no-rotate-key claim is gone and the entry now records why it mattered. It
  still documents exposures, which is still a judgement call on a public
  repository.
- **`claude plugin eval` is gated here**, so the two cases in `evals/` have no
  runner in this repository and were graded by hand.
- **The `pro` remote at `mbp:positron.git` still holds PRE-REWRITE history** and
  was unreachable when checked. Force-push it before anybody pushes from that
  machine, or the old objects come back.
- 🔴 **`positron-start` NOW NAMES A URL THAT 404s, AND IT WILL KEEP 404ing UNTIL
  THIS IS PUSHED.** `.claude/skills/positron-start/PARTS.md` is new and
  untracked, and `SKILL.md` points at it TWICE by full raw URL, which is the
  only way a non-Claude agent can reach it. MEASURED 2026-09-25:
  `raw.githubusercontent.com/kristjanjansen/positron/main/.claude/skills/positron-start/PARTS.md`
  answers **404**. A clone of this repository is fine, because Claude Code reads
  the file off disk; **the paste-block route is not**, and that is the route the
  whole skill exists to serve.
  ⚠️ **AND PUSHING NEEDS THE PERSONAL ACCOUNT**, per the dance at the top of
  `CLAUDE.md`: `gh auth switch --user kristjanjansen`, push, then switch back to
  `Kristjan-Jansen_enefit`. The branch here is `session-28-station-videoradio`
  tracking `origin/main`, so the push is `HEAD:main` rather than `HEAD`.
- ⚠️ **SEVEN FILES ARE UNCOMMITTED** as of 2026-09-25: `BACKLOG.md`,
  `HANDOFF.md`, `LAYOUT.md`, `NOTICE.md`, `research/SECRETS-ROTATION.md` and the
  two skills. All documentation. Nothing under `demo/`, `src/` or `workers/`
  changed, which is why the deploy above carries no visitor-visible difference.

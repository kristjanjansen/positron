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

**BUILD `e0158ba-133813-eba3`**, confirmed on the edge at the time.
⚠️ **THE LIVE SITE IS CURRENT IN SUBSTANCE AND NOT IN BYTES.** Eight files under
`demo/` changed after that deploy and every change is a COMMENT: the path
rewrites from `measured-devices-2026-09-20.md` moving to `research/`. Nothing a
visitor sees is different. A redeploy is tidiness, not a fix.

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
still says it does not; that file is wrong on this point and right about the
rest.

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

- **Nothing is deployed since this morning's stamp.** See above: comments only.
- **`research/SECRETS-ROTATION.md` is public and one line of it is wrong** (the
  no-rotate-key claim). It also documents exposures, which is a judgement call
  now that anybody can read it.
- **`claude plugin eval` is gated here**, so the two cases in `evals/` have no
  runner in this repository and were graded by hand.
- **The `pro` remote at `mbp:positron.git` still holds PRE-REWRITE history** and
  was unreachable when checked. Force-push it before anybody pushes from that
  machine, or the old objects come back.
- **`workers/view/public/` holds stale path references** that regenerate on the
  next build.

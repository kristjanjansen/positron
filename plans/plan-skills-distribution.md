# Skills distribution: one public repo, positron-studio/positron

Status (2026-10-14): open. Waiting on the owner to create the org and transfer the repo.

Asked 2026-10-14: *"how i distr skills?"*, then *"why i need separate repo?"* and
*"kristjanjansen/positron -> positron-studio/positron perhaps?"*, then *"write to
plan, will do later"*. The research behind it is
`research/skills-distribution-2026-10-14.md`.

## Decision

No separate skills repo. This repository moves to the GitHub org
`positron-studio` and stays public. The skills meant for others are installed
from it one at a time; the rest are hidden from the install tool.

A separate repo would only pay off if this one went private. It costs an export
script to maintain, and the reasons for it (privacy, clone size, naming) are
answered here by cleaning, by `--skill`, and by the org name.

## What the owner does

1. Create the free org `positron-studio` at https://github.com/organizations/plan
   (the name read free on 2026-10-13).
2. In https://github.com/kristjanjansen/positron, Settings, Danger zone, Transfer
   ownership to `positron-studio`. GitHub redirects the old web, clone and push
   URLs; the redirect breaks only if a new `kristjanjansen/positron` is ever made.
3. Later, optional: create the npm scope `@positron-studio`.

## What the session does, before the transfer

1. Clean the private lines out of the skills and CLAUDE.md. The repo is public
   today and stays public after the move. From the research:
   - ERR's sentence about their listener statistics (positron-verify, CLAUDE.md).
   - Pointers to the Circuit pack and the `session_` names (positron-hardware,
     positron-verify, CLAUDE.md).
   - The Pi's login user and hostname, `studio-1`, `m1-1`, "a Pi in another building".
   - `kristjanjansen/*` URLs that are not the repo itself (eccm, packs, the R2 prefix).
   - Decide per case for the roughly 110 quotes of the owner's words: keep, or move
     to a private note.
   Whether to rewrite history for what is already public is a separate decision;
   the account caches and the expired key were untracked in fcdbb6c7 but are in
   history.
2. Mark every skill not meant for others `metadata: internal: "true"` so
   `npx skills` skips it. Check that the quoted form hides it, with
   `DISABLE_TELEMETRY=1 npx skills add ./ --list`.
3. Rename the public ones `positron-studio-*` so they are not read as Posit's
   `positron-*` family: start now, describe after its site examples are cut,
   compose and slides later (compose needs a rewrite for strangers, slides needs
   its source and licence found).

## What the session does, after the transfer

1. `git remote set-url origin https://github.com/positron-studio/positron.git`.
2. Update the README's raw link and the six URLs in positron-start.
3. Update the push section in CLAUDE.md: still pushed as `kristjanjansen`, the
   org's owner, with the same account switch.
4. Add `.claude-plugin/marketplace.json` listing the public skills, check with
   `claude plugin validate .`.
5. Have the site build write `/.well-known/agent-skills/index.json`, so
   `npx skills add https://positron.studio` works.
6. Tag a release, `v2026.10.14` style, so an install can pin it.

## How people install

- Any agent: `npx skills add positron-studio/positron --skill positron-studio-start`
- Claude Code: `claude plugin install positron-studio --marketplace positron-studio/positron`
- From the domain: `npx skills add https://positron.studio`
- npm, later (the antfu/skills-npm model, merging into `npx skills
  experimental_sync`): `@positron-studio/skills` with only a `skills` field pointing
  at `positron-studio/positron#<tag>`. It pins a version and holds the name.

## Not settled

- Whether a quoted `internal: "true"` hides a skill like `true` does.
- Whether Codex reads `.claude/skills/` or only `.agents/skills/`.
- The licence of the source behind positron-slides.

# `.claude/` — what a second agent in this checkout is not allowed to do

This directory exists because **more than one agent works in this repo at once**,
and the two things that hurt in that case were both being guarded by prose.

## `hooks/guard-tree.mjs`

Refuses the git commands that act on the WHOLE TREE — `git add -A`, `git commit
-a`, `git reset --hard`, `git clean -fd`, `git checkout .`, a bare `git stash`.

CLAUDE.md has carried the rule since it was learned, and the rule was still
broken twice in one session: `timeline/score.mjs` and `csound.mjs` landed inside
a commit about `loops`, `04-score/index.html` inside one about a plan document.
*"The code was right and the history lied about it, which is worse than either
being wrong on its own."*

⚠️ **It does not block committing.** `git add <path>` then `git commit -m` is
exactly what the rule asks for and it is untouched. Only the forms that move
files nobody named are refused, and the refusal prints the alternative.

**Proved by breaking it** (CLAUDE.md: *"Prove a guard fires. Break the thing on
purpose once."*) — 16 block cases and 17 allow cases, 33/33, including the two
that matter most in a repo whose own documentation quotes the command:

    grep "git add -A" LESSONS.md      -> allowed
    echo "never git add -A"           -> allowed

Re-run that table after editing the rules:

    printf '{"tool_input":{"command":"git add -A"}}' | node .claude/hooks/guard-tree.mjs; echo $?   # 2
    printf '{"tool_input":{"command":"git add demo/x"}}' | node .claude/hooks/guard-tree.mjs; echo $?   # 0

`POSITRON_ALLOW_WHOLE_TREE=1` overrides it. The failure being prevented is
**reflex**, not intent — an agent that has actually thought about it can say so,
and saying so is visible in the command.

## `settings.json`

The hook above, plus an allowlist of the read-only commands this repo runs
constantly. Three agents each prompting for `git diff` is three interruptions
for the owner, and LESSONS #80 is precisely about that: **the owner's attention
is a shared resource and an agent spends it without meaning to.**

⚠️ `node workers/view/build.mjs` is allowed **only with `--out`**. The bare form
rewrites `public/`, which is 120 committed files and the deploy artefact; it
should cost a prompt, because it is a change to shared state. See `--out` in
`build.mjs` and `plans/plan-agents.md` §1.

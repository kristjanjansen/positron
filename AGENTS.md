# positron, for an agent that is not Claude Code

Media art experiments in a browser, deployed on Cloudflare. Live at
**https://positron.studio**. R&D, not a product.

🔴 **THIS FILE EXISTS BECAUSE TWO AGENTS READ TWO DIFFERENT FILES.** Codex and
most others read `AGENTS.md`. Claude Code reads `CLAUDE.md` when there is one,
and this repository has one, so **Claude Code does not read this file at all**
and nothing here needs to repeat it. What follows is the short version plus the
pointers; `CLAUDE.md` is the long version and is worth reading whichever agent
you are.

## If somebody wants to build a site like this one

Read **`.claude/skills/positron-start/SKILL.md`** and follow it. It is written
for any agent that can run commands, it checks the machine, the Cloudflare
account, the plan and a domain before creating anything, and it assumes the
person asking is not a developer. `README.md` carries the prompt that points
here.

⚠️ The path says `.claude/` because Claude Code discovers skills there. It is an
ordinary markdown file and reads the same from anywhere. **Do not rename that
directory**: it would break Claude Code and gain nothing, since no other agent
scans it either way.

## Six rules that are true on every task here

1. **COUNT THE DEMOS, NEVER REMEMBER THEM.** Every written count in this
   repository has gone stale within hours at least twice.
   ```sh
   node -e "import('./demo/manifest.mjs').then(m => console.log(m.DEMOS.length))"
   ```
2. **Never open a connection to somebody else's stream.** Several pages play a
   public broadcaster's live mounts, and every connection this repository makes
   to one lands in that broadcaster's audience figures. They told us. Use the
   stand-ins: `demo/fake-station.mjs`, `demo/fake-tapes.mjs`, `demo/fake-err.mjs`.
3. **Hand over a URL, never a path.** `demo/stage/index.html` answers "which
   file did you edit". The answer to "where is it" is a deployed
   `https://positron.studio/<slug>/`, or a local URL with every query parameter
   it needs and the server behind it still running.
4. **No em dashes and no middots**, anywhere a reader looks: prose, UI, readout
   keys, log lines, commit messages, replies. Write the second sentence instead.
5. **A description is one sentence.** The `what` on a page and the `one` line in
   `demo/manifest.mjs` are the text a visitor reads. No colon, no semicolon, no
   second clause bolted on.
6. **A change in what a page does is a change to what it says, in the same
   commit.** Nothing type-checks a sentence, so a stale description is worse
   than a missing one.

## Run and check

```sh
node demo/server.mjs                  # serves the repo, prints its port
node demo/check-html.mjs demo/<slug>/index.html   # parses a page, no browser
node demo/verify.mjs <slug> <slug>    # only the pages you touched
cd workers/view && node build.mjs     # ALWAYS build before deploying
node workers/view/deploy.mjs          # builds, interlocks, deploys, confirms
```

⚠️ **Verify economically.** A full suite is dozens of headless Chromes. Run the
pages you touched and compare the per-page assert count against what it was.

## Where things live

| file | answers |
| --- | --- |
| `CLAUDE.md` | how this project is worked on, and what each rule cost |
| `README.md` | what this is, for a stranger, and how to build one like it |
| `HANDOFF.md` | what state this is in right now |
| `BACKLOG.md` | what has been asked for and not yet done |
| `LESSONS.md` | why the rules exist, at length |
| `PROGRESS.md` | what was measured, when |
| `LAYOUT.md` | where a new file goes |
| `plans/` | every plan. A new one goes here and nowhere else |
| `.claude/skills/` | the rules, by the kind of work being done |

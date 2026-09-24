# positron

Media art experiments in a browser, deployed on Cloudflare. Live at
**https://positron.studio**. R&D, not a product.

🔴 **THE RULES ARE IN `CLAUDE.md`. READ THAT FILE BEFORE YOU TOUCH ANYTHING.**
This one is a POINTER, deliberately, and it is four lines long for a reason:
`CLAUDE.md` says *"move a rule verbatim, do not summarise it"*, because the
measurements, the dates and the quoted reports are what make a rule survive
being argued with, and **a condensed rule reads as an opinion**. A summary here
would be a second copy of 500 lines that drifts from the first one within a
week. There is no second copy. Go and read it.

⚠️ **WHY THERE ARE TWO FILES AT ALL.** Codex and most other agents read
`AGENTS.md`; Claude Code reads `CLAUDE.md` whenever there is one, and this
repository has one, so **Claude Code never reads this file**. Nothing here needs
to be kept in step with anything, which is the whole point of it being a
pointer.

⚠️ **DO NOT RENAME `.claude/`.** Claude Code discovers its skills there, no
other agent scans it either way, and renaming it would break one tool and help
none. The files inside are ordinary markdown and read the same from anywhere.

## The one rule that costs somebody else if you miss it

🔴 **NEVER OPEN A CONNECTION TO A PUBLIC BROADCASTER'S STREAM.** Several pages
here play ERR's live mounts, and every connection this repository makes to one
is counted in that broadcaster's audience figures. They told us so, in those
words. It cannot be undone by stopping, only by not adding to it. Use the
stand-ins, which cost nobody anything: `demo/fake-station.mjs`,
`demo/fake-tapes.mjs`, `demo/fake-err.mjs`. `CLAUDE.md` has the rest of it.

## Somebody wants to build a site like this one

Read **`.claude/skills/positron-start/SKILL.md`** and follow it. It is written
for any agent that can run commands, it checks the machine, the Cloudflare
account, the plan and a domain before creating anything, and it assumes the
person asking is not a developer. `README.md` carries the prompt that points
here.

# elektron-rtc: deleted from Cloudflare 2026-10-13

Asked: *"arhcive mirror, streamin group (kill / stop their workers not needed), dump"*, then the six workers with no caller on any served page were chosen for deletion. `npx wrangler delete elektron-rtc` answered "Successfully deleted". Nothing in demo/ calls it. Redeploying it would need its routes and any stored state recreated.

The code (`src/`, `wrangler.jsonc`) was removed from the tree on 2026-10-14 and is in git history: `git show 1f036842:workers/rtc/src/index.js` (the last commit that held it).

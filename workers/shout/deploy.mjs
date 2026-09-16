// workers/shout/deploy.mjs — ship the relay, from a directory wrangler is happy in.
//
// 🔴 WHY THIS EXISTS AND WHY IT IS NOT JUST `npx wrangler deploy`. CLAUDE.md
// says a `.env` in the cwd shadows machine OAuth, and the documented fix is to
// deploy from a directory without one or to unset the two variables. MEASURED
// 2026-09-16: running `npx wrangler deploy -c workers/shout/wrangler.jsonc`
// from the repo root failed with `Authentication error [code: 10000]` while
// announcing it was using `CF_API_TOKEN` from the environment, and the same
// deploy through `workers/view/deploy.mjs` had succeeded minutes earlier. The
// difference is the working directory and the cleaned environment, both of
// which that file already gets right.
//
// ⚠️ THERE IS NO BUILD STEP HERE, so there is no build/upload interlock either.
// `worker.mjs` is the deployed artefact: what is on disk is what ships, and the
// race `workers/view/deploy.mjs` guards against (two agents building into one
// `public/`) has no equivalent.
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const env = { ...process.env };
delete env.CF_API_TOKEN;
delete env.CLOUDFLARE_API_TOKEN;
const up = spawnSync('npx', ['wrangler', 'deploy'], { cwd: HERE, stdio: 'inherit', env });
process.exit(up.status ?? 1);

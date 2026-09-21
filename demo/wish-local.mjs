// demo/wish-local.mjs — the wish worker, running here, against the real models.
//
//   node demo/wish-local.mjs            # :8799
//
// 🔴 WHY THIS EXISTS RATHER THAN `wrangler dev`. MEASURED 2026-09-21 on this
// machine: `wrangler dev` with an `ai` binding must open a REMOTE session, and
// backgrounded without a terminal it dies with `write EPIPE` every time. A page
// that can only be demonstrated by a person holding a terminal open in the
// foreground is a page nobody runs twice.
//
// 🔴 IT IS NOT A STAND-IN. `demo/fake-station.mjs` and `demo/fake-err.mjs` are
// nobody's radio and nobody's broadcaster; this calls the real Workers AI and
// spends the real account. It exists so the page has somewhere local to talk
// to, and it shares `workers/wish/src/wish.mjs` with the deployable Worker so
// the prompt and the schema cannot drift into two answers.
//
// ⚠️ THE CREDENTIAL IS THE ONE WRANGLER ALREADY HAS. It reads the OAuth token
// out of wrangler's own config, which is how `npx wrangler deploy` authenticates
// on this machine. It is never logged and never leaves this process except as an
// Authorization header to Cloudflare.
// ⚠️ AND THE REPOSITORY'S `.env` TOKEN IS THE WRONG ONE: measured, it answers
// **401** on Workers AI, because a Cloudflare API token is permission scoped and
// that one is not scoped for AI. The OAuth session carries `ai (write)`.
//
// 🔴 **AND THAT TOKEN LASTS ONE HOUR, WHICH THIS FILE USED TO NOT KNOW.**
// MEASURED 2026-09-21: `const TOK = token()` sat at module load, so the process
// read the credential once when it started and never again. The config said the
// token had expired at 01:30:11Z while the clock read 05:39:13Z, four hours
// later, and every `POST /wish` answered `{"error":"Authentication error"}`,
// which is Cloudflare's own words for a credential that has run out. Everything
// else about the server was fine: it was listening, it was routing, and a
// request with too few ports still came back with the right complaint. **A
// process that is correct for its first hour and wrong for every hour after it
// is the worst shape there is**, because the thing that changed is the clock,
// and the report a reader gets sends them to look at the process.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { handle } from '../workers/wish/src/wish.mjs';

const exec = promisify(execFile);

const CONFIG = path.join(os.homedir(), 'Library/Preferences/.wrangler/config/default.toml');

/** The last minute of a token's life is treated as gone, so a call that takes a
 *  few seconds cannot expire half way through it. */
const MARGIN_MS = 60_000;

/** One empty directory, made once and reused, for the reason in `refresh()`.
 *  Nothing is ever written into it, so it is not a leak. */
const NO_DOTENV = path.join(os.tmpdir(), 'positron-wish-no-dotenv');

/**
 * What wrangler's config says right now: the token, when it runs out, and the
 * plain sentence to show somebody if there is nothing usable in there.
 * ⚠️ `why` IS THE HALF THAT GETS PRINTED. `tok` never is.
 */
function session() {
  if (!fs.existsSync(CONFIG)) return { why: `there is no wrangler session at ${CONFIG}` };
  const raw = fs.readFileSync(CONFIG, 'utf8');
  const t = /^oauth_token\s*=\s*"([^"]*)"/m.exec(raw);
  if (!t || !t[1]) return { why: 'the wrangler session carries no access token' };
  const e = /^expiration_time\s*=\s*"([^"]*)"/m.exec(raw);
  const at = e?.[1] || '';
  const exp = at ? Date.parse(at) : NaN;
  // exp 0 means the file does not say, which is not the same as expired.
  return { tok: t[1], at, exp: Number.isFinite(exp) ? exp : 0 };
}

let refreshing = null;

/**
 * Have wrangler mint a new access token. It refreshes its own when it finds one
 * expired and rewrites the config file, so the cheapest command that makes it
 * happen is asking it who it is. MEASURED: the file's md5 changes and
 * `expiration_time` moves an hour forward.
 *
 * ⚠️ **NOTHING HERE TOUCHES THE REFRESH TOKEN.** Doing the OAuth exchange
 * ourselves could rotate it out from under wrangler and break `npx wrangler
 * deploy` for every other thing on this machine.
 *
 * 🔴 **THE WORKING DIRECTORY MUST NOT BE THIS REPOSITORY, AND `env -u` IS NOT
 * ENOUGH.** MEASURED 2026-09-21: `env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN
 * npx wrangler whoami` in the repository root answers *"You are logged in with
 * an User API Token"*, because wrangler reads `.env` out of the working
 * directory itself and this repository's `.env` carries `CF_API_TOKEN`. That is
 * the token measured at 401 on Workers AI, so a refresh run there refreshes
 * nothing and exits 0. The same command from an empty directory answers *"You
 * are logged in with an OAuth Token"* in 1.6 s.
 */
async function refresh() {
  if (refreshing) return refreshing;          // two requests at once, one subprocess
  refreshing = (async () => {
    fs.mkdirSync(NO_DOTENV, { recursive: true });
    const env = { ...process.env };
    delete env.CF_API_TOKEN;
    delete env.CLOUDFLARE_API_TOKEN;
    const tries = [['wrangler', ['whoami']], ['npx', ['--yes', 'wrangler', 'whoami']]];
    let last = 'nothing to run';
    for (const [cmd, args] of tries) {
      try {
        // ⚠️ THE OUTPUT IS SWALLOWED ON PURPOSE. It carries the account id and
        // the scope list, and the rule on this file is that nothing about the
        // credential is printed.
        await exec(cmd, args, { cwd: NO_DOTENV, env, timeout: 90_000, maxBuffer: 1 << 20 });
        return true;
      } catch (e) {
        last = e?.code === 'ENOENT' ? `${cmd} is not on PATH` : `${cmd} exited ${e?.code ?? '?'}`;
      }
    }
    console.log(`  could not refresh the wrangler session: ${last}`);
    return false;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

/** Held until it expires, so the ordinary request costs nothing at all and the
 *  first one after an expiry costs one small file read. */
let cached = null;

const LOGIN = 'Run `npx wrangler login` to re-mint it. The agent does not need restarting.';

/**
 * The token for THIS request, rather than for the request that happened to
 * arrive first. An expired one is refreshed before it is used, and if that
 * cannot be done the error says what expired, when, and what re-mints it.
 */
async function token() {
  if (process.env.CF_AI_TOKEN) return process.env.CF_AI_TOKEN;
  const now = Date.now();
  if (cached && cached.exp - MARGIN_MS > now) return cached.tok;

  let s = session();
  if (s.why) throw new Error(`${s.why}. Run \`npx wrangler login\`, or set CF_AI_TOKEN`);

  if (s.exp && s.exp - MARGIN_MS <= now) {
    console.log(`  the wrangler session expired at ${s.at}, asking wrangler for a new one`);
    const ok = await refresh();
    s = session();
    if (s.why) throw new Error(`${s.why}. Run \`npx wrangler login\`, or set CF_AI_TOKEN`);
    if (!ok || (s.exp && s.exp - MARGIN_MS <= Date.now())) {
      throw new Error(`the wrangler session expired at ${s.at} and refreshing it here did not work. ${LOGIN}`);
    }
    console.log(`  the wrangler session now runs to ${s.at}`);
  }

  cached = s.exp ? { tok: s.tok, exp: s.exp } : null;
  return s.tok;
}

function account() {
  if (process.env.CF_ACCOUNT_ID) return process.env.CF_ACCOUNT_ID;
  // The repository's own .env carries it. Read rather than required, so this
  // file works in a checkout that has no .env at all.
  const env = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '.env');
  if (fs.existsSync(env)) {
    const m = /^CF_ACCOUNT_ID\s*=\s*"?([^"\n]+)/m.exec(fs.readFileSync(env, 'utf8'));
    if (m) return m[1].trim();
  }
  throw new Error('no CF_ACCOUNT_ID in the environment or in .env');
}

const ACC = account();

/**
 * The one thing that differs from the Worker: how a model is reached.
 *
 * 🔴 **CLOUDFLARE IS THE ONLY THING THAT CAN SAY A CREDENTIAL IS DEAD**, so a
 * refusal buys exactly one refresh and one retry. The expiry in the config is a
 * good guess and it is only a guess: a token can be revoked, and a config can
 * carry no `expiration_time` at all, and in both of those the clock check above
 * sees nothing wrong.
 * ⚠️ AND THE RECOVERY IS BOUNDED. One retry per call, and `refresh()` runs one
 * subprocess however many requests are waiting on it.
 */
async function run(model, payload) {
  for (let attempt = 0; ; attempt++) {
    const tok = await token();
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACC}/ai/run/${model}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await r.json();
    if (r.ok && body.success !== false) return body.result;

    // Cloudflare says `Authentication error`, code 10000, for a credential that
    // has run out. Matched on the code AND on the words, because one account
    // answered 400 rather than 401 for it.
    const refused = r.status === 401 || r.status === 403
      || (body?.errors || []).some((e) => e?.code === 10000 || /authenticat/i.test(e?.message || ''));
    if (refused && attempt === 0) {
      cached = null;
      console.log('  Cloudflare refused the credential, asking wrangler for a new one');
      await refresh();
      continue;
    }
    if (refused) {
      const s = session();
      throw new Error('Cloudflare refused the credential, and refreshing it did not help. '
        + `The wrangler session ${s.at ? `runs to ${s.at}` : 'records no expiry'}. ${LOGIN}`);
    }
    // ⚠️ EVERY OTHER MESSAGE IS PASSED ON RATHER THAN REPLACED. Cloudflare's own
    // text said `Failed to decode base64 audio data` while this was being built,
    // and an agent that answered `the model failed` would have hidden it.
    throw new Error(body?.errors?.[0]?.message || `HTTP ${r.status}`);
  }
}

const PORT = Number(process.env.PORT || 8799);
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

http.createServer((req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', ...CORS });
    res.end(JSON.stringify(body));
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  if (req.method !== 'POST') return send(405, { error: 'post to /hear or /wish' });

  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', async () => {
    let body;
    try { body = JSON.parse(raw || '{}'); } catch { return send(400, { error: 'body is JSON' }); }
    try {
      const out = await handle(new URL(req.url, 'http://x').pathname, body, run);
      // One line per call, so a session can be read afterwards. Never the audio
      // and never the token.
      const what = out.body.text !== undefined ? JSON.stringify(out.body.text)
        : out.body.links !== undefined ? `${out.body.links.length} link(s)` : out.body.error;
      console.log(`${req.url}  ${out.status}  ${out.body.ms ?? 0} ms  ${out.body.model || ''}  ${what}`);
      send(out.status, out.body);
    } catch (e) {
      console.log(`${req.url}  500  ${e.message}`);
      send(500, { error: e.message });
    }
  });
}).listen(PORT, () => {
  console.log(`wish agent   http://127.0.0.1:${PORT}   account ${ACC.slice(0, 6)}…`);
  // ⚠️ THIS REPORTS AND DOES NOT REFUSE TO START, WHICH IS THE OTHER HALF OF
  // READING THE CREDENTIAL PER REQUEST. Somebody can run `npx wrangler login`
  // while this is up and the next call picks it up, so a missing session is a
  // line to read rather than a process that will not boot.
  const s = session();
  if (process.env.CF_AI_TOKEN) console.log('  credential   CF_AI_TOKEN, out of the environment');
  else if (s.why) console.log(`  credential   ${s.why}. Run \`npx wrangler login\``);
  // ⚠️ AN EXPIRED SESSION SAYS SO. Printing `good to <a time this morning>` is
  // how a boot line reports the exact fault it is there to catch as if it were
  // health.
  else if (s.exp && s.exp <= Date.now()) console.log(`  credential   the wrangler session expired at ${s.at}, and is refreshed on the first call`);
  else console.log(`  credential   the wrangler session, good to ${s.at || 'an unrecorded time'}`);
  console.log('  POST /hear  { audio: base64, model? }');
  console.log('  POST /wish  { text, ports: [...], model?, facts? }');
});

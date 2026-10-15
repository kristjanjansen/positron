// node demo/wish-local.mjs (:8799): the wish worker run locally against the real Workers AI (not a
// stand-in; `wrangler dev` with `ai` dies backgrounded). Uses wrangler's OAuth token, read per
// request because it lasts an hour; the repo `.env` token answers 401 on AI. Never logged.
// why: lessons/harness.md#wish-local
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createLimiter, addressTag } from '../workers/wish/src/limit.mjs';

const exec = promisify(execFile);

// Stamped `<mtime>-<size>` and re-imported when wish.mjs changes on disk (old copies stay in the
// registry). Its import of bay.mjs cannot be evicted, so a newer bay.mjs is reported: restart.
// why: lessons/harness.md#reload
const MODULE = new URL('../workers/wish/src/wish.mjs', import.meta.url);
const MODULE_PATH = fileURLToPath(MODULE);
const VOCAB_PATH = fileURLToPath(new URL('shell/bay.mjs', import.meta.url));

function stampOf(file = MODULE_PATH) {
  const st = fs.statSync(file);
  return `${Math.round(st.mtimeMs)}-${st.size}`;
}

/** The vocabulary as it was when this process first imported it. */
let vocabAtBoot = null;

/** '' while the imported vocabulary is the one on disk, or what to do about it. */
function vocabDrift() {
  const now = stampOf(VOCAB_PATH);
  if (vocabAtBoot === null) { vocabAtBoot = now; return ''; }
  if (vocabAtBoot === now) return '';
  return `demo/shell/bay.mjs changed since this process started (${vocabAtBoot} -> ${now}). `
    + 'Node cannot evict an imported module, so restart this agent to pick it up.';
}

let loaded = { stamp: '', mod: null };

/** The module as it is on disk RIGHT NOW, re-read only when it has changed. */
async function wish() {
  const stamp = stampOf();
  if (loaded.stamp === stamp) return loaded.mod;
  const mod = await import(`${MODULE.href}?v=${encodeURIComponent(stamp)}`);
  console.log(loaded.stamp
    ? `  wish.mjs reloaded   ${stamp}   was ${loaded.stamp}`
    : `  wish.mjs            ${stamp}`);
  loaded = { stamp, mod };
  return mod;
}

/* Said once per reload rather than once per request: a warning on every call is
   a warning nobody reads. */
let saidDrift = '';

const CONFIG = path.join(os.homedir(), 'Library/Preferences/.wrangler/config/default.toml');

/** The last minute of a token's life is treated as gone, so a call that takes a
 *  few seconds cannot expire half way through it. */
const MARGIN_MS = 60_000;

/** One empty directory, made once and reused, for the reason in `refresh()`.
 *  Nothing is ever written into it, so it is not a leak. */
const NO_DOTENV = path.join(os.tmpdir(), 'positron-wish-no-dotenv');

// wrangler's config now: the token, its expiry, and a sentence to print if unusable; `tok` never
// prints.
// why: lessons/harness.md#session
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

// Mint a new access token by running `wrangler whoami`; never touch the refresh token. From an
// empty
// directory: in this repo wrangler reads `.env` and refreshes nothing while exiting 0.
// why: lessons/harness.md#refresh
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
        // Output swallowed: it carries the account id and scopes.
        // why: lessons/harness.md#swallowed
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

// The token for this request; an expired one is refreshed first, or the error says what and when.
// why: lessons/harness.md#token
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

// How a model is reached. A refusal buys one refresh and one retry, since only Cloudflare knows a
// token is dead; one refresh subprocess however many requests wait.
// why: lessons/harness.md#run
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
    // Pass Cloudflare's own message on rather than replacing it.
    // why: lessons/harness.md#pass-on
    throw new Error(body?.errors?.[0]?.message || `HTTP ${r.status}`);
  }
}

const PORT = Number(process.env.PORT || 8799);
// The deployed Worker's per-visitor cap on /code and /wish, so a page meets its 429 here too.
const limiter = createLimiter();

// The deployed Worker's origin rule, from the one module.
// why: lessons/harness.md#origin
http.createServer((req, res) => {
  let cors = { 'access-control-allow-origin': 'https://positron.studio', vary: 'origin' };
  const send = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', ...cors });
    res.end(JSON.stringify(body));
  };

  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', async () => {
    let body;
    try {
      const mod = await wish();
      // A stale bay.mjs underneath says so once, naming the file and the remedy.
      // why: lessons/harness.md#vocab-drift
      const drift = vocabDrift();
      if (drift && drift !== saidDrift) { console.log(`  STALE  ${drift}`); saidDrift = drift; }
      cors = mod.corsFor(req.headers.origin || null);
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
      if (!mod.allowedOrigin(req.headers.origin || null)) {
        return send(403, { error: 'this agent answers pages on positron.studio' });
      }
      if (req.method !== 'POST') return send(405, { error: 'post to /hear, /wish or /code' });
      try { body = JSON.parse(raw || '{}'); } catch { return send(400, { error: 'body is JSON' }); }
      const limited = limiter.take(await addressTag(req.socket.remoteAddress), new URL(req.url, 'http://x').pathname);
      if (limited) { console.log(`${req.url}  429  ${limited.error}`); return send(429, { error: limited.error }); }
      const out = await mod.handle(new URL(req.url, 'http://x').pathname, body, run);
      // One line per call, so a session can be read afterwards. Never the audio
      // and never the token.
      const what = out.body.text !== undefined ? JSON.stringify(out.body.text)
        : out.body.links !== undefined ? `${out.body.links.length} link(s)`
        : out.body.code !== undefined ? `${out.body.code.length} chars of code` : out.body.error;
      console.log(`${req.url}  ${out.status}  ${out.body.ms ?? 0} ms  ${out.body.model || ''}  ${what}`);
      send(out.status, out.body);
    } catch (e) {
      console.log(`${req.url}  500  ${e.message}`);
      send(500, { error: e.message });
    }
  });
}).listen(PORT, async () => {
  console.log(`wish agent   http://127.0.0.1:${PORT}   account ${ACC.slice(0, 6)}…`);
  // The build stamp, printed before anything is asked.
  // why: lessons/harness.md#stamp
  await wish();
  console.log(`  bay.mjs             ${stampOf(VOCAB_PATH)}   the transform vocabulary`);
  vocabDrift();                    // the boot stamp everything after is compared against
  // Reports and starts anyway: a `wrangler login` while running is picked up by the next call.
  // why: lessons/harness.md#no-refuse
  const s = session();
  if (process.env.CF_AI_TOKEN) console.log('  credential   CF_AI_TOKEN, out of the environment');
  else if (s.why) console.log(`  credential   ${s.why}. Run \`npx wrangler login\``);
  // An expired session says so on the boot line.
  // why: lessons/harness.md#expired
  else if (s.exp && s.exp <= Date.now()) console.log(`  credential   the wrangler session expired at ${s.at}, and is refreshed on the first call`);
  else console.log(`  credential   the wrangler session, good to ${s.at || 'an unrecorded time'}`);
  console.log('  POST /hear  { audio: base64, model? }');
  console.log('  POST /wish  { text, ports: [...], model?, facts?, history?: [{ said, links, settings? }], current?: [links], currentSettings? }');
  console.log('  POST /code  { text, lang: glsl, contract?, error?, previous? (alone: a revision of it), model? }');
});

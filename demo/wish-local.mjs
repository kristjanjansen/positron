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
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { handle } from '../workers/wish/src/wish.mjs';

const CONFIG = path.join(os.homedir(), 'Library/Preferences/.wrangler/config/default.toml');

function token() {
  if (process.env.CF_AI_TOKEN) return process.env.CF_AI_TOKEN;
  if (!fs.existsSync(CONFIG)) {
    throw new Error(`no wrangler session at ${CONFIG}. Run \`npx wrangler login\`, or set CF_AI_TOKEN`);
  }
  const m = /^oauth_token\s*=\s*"([^"]*)"/m.exec(fs.readFileSync(CONFIG, 'utf8'));
  if (!m || !m[1]) throw new Error('wrangler config has no oauth_token. Run `npx wrangler login`');
  return m[1];
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
const TOK = token();

/** The one thing that differs from the Worker: how a model is reached. */
async function run(model, payload) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACC}/ai/run/${model}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOK}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await r.json();
  if (!r.ok || body.success === false) {
    // ⚠️ THE MESSAGE IS PASSED ON RATHER THAN REPLACED. Cloudflare's own text
    // said `Failed to decode base64 audio data` while this was being built, and
    // an agent that answered `the model failed` would have hidden it.
    const why = body?.errors?.[0]?.message || `HTTP ${r.status}`;
    throw new Error(why);
  }
  return body.result;
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
  console.log('  POST /hear  { audio: base64, model? }');
  console.log('  POST /wish  { text, ports: [...], model?, facts? }');
});

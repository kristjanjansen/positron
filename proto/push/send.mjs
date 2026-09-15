// proto/push/send.mjs — push a notification with no SDK and no server.
//
//   node proto/push/send.mjs topic     <name>  "Title"  "Body"
//   node proto/push/send.mjs token     <token> "Title"  "Body"
//   node proto/push/send.mjs subscribe <token> <topic>
//   node proto/push/send.mjs whoami
//
// Key path: `--key <path>`, or $POSITRON_SA, default ./positron-push-sa.json.
//
// WHY THIS EXISTS, AND WHY IT IS NOT `firebase-admin`. Two reasons, and the
// second is the real one:
//
//   1. It separates "is Firebase configured" from "is some server broken".
//      Right now those are indistinguishable — radio's own `config.py`
//      RAISES AT IMPORT without a MySQL URL, so a database problem and a
//      credential problem produce the same silence.
//   2. 🔴 IT IS THE PROTOTYPE OF THE WORKER, NOT A THROWAWAY. `firebase-admin`
//      is a Node library that reaches for `fs`, node crypto and gRPC; a
//      Cloudflare Worker is not Node, so it could not run this code later.
//      Everything below is `fetch` plus WebCrypto — both of which a Worker and a
//      Durable Object have natively — so the same four steps move into the DO
//      beside its alarm unchanged. Proving FCM with the SDK would mean writing
//      it a second time.
//
// The four steps, which are all FCM is on the sending side:
//   1. read the service account (client_email + an RSA private key)
//   2. sign a JWT with it                          <- WebCrypto
//   3. swap the JWT for an access token            <- oauth2.googleapis.com
//   4. POST the message                            <- fcm.googleapis.com v1
//
// ⚠️ THE LEGACY WAY IS GONE, which is why step 2 and 3 exist at all. The old
// `Authorization: key=AAAA…` server key needed none of this. MEASURED today:
// `POST https://fcm.googleapis.com/fcm/send` answers **404** — the route is
// removed, not the credential rejected — while the v1 endpoint answers 401 with
// a JSON body. The v1 control is what separates "this endpoint is dead" from
// "Google is 404-ing everything".

import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const argv = process.argv.slice(2);
const keyFlag = argv.indexOf('--key');
const KEY_PATH = keyFlag >= 0 ? argv.splice(keyFlag, 2)[1]
  : (process.env.POSITRON_SA || 'positron-push-sa.json');
const [cmd, a, b, c] = argv;

const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Import the service account's RSA key.
 *
 * ⚠️ THE NEWLINES IN THE JSON ARE LITERAL `\n` AND MUST BE UN-ESCAPED. This is
 * the single most common way this fails, and it fails as an opaque
 * `DataError`/`OperationError` from `importKey` that says nothing about
 * newlines. `JSON.parse` already turns `\\n` into real newlines, so this only
 * bites code that reads the PEM out of an env var — which is exactly what the
 * Worker version will do, so the guard stays here as the note that it will.
 */
async function importKey(pem) {
  const der = Buffer.from(
    pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, ''), 'base64');
  return subtle.importKey('pkcs8', der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

/** Steps 2 and 3: a signed JWT, exchanged for an access token. */
async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: sa.token_uri || TOKEN_URL,
    iat: now,
    // An hour is the maximum Google accepts. The Worker version should CACHE
    // the result for its lifetime rather than signing per send — a DO is the
    // natural holder, being the same object that owns the alarm.
    exp: now + 3600,
  };
  const body = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const key = await importKey(sa.private_key);
  const sig = await subtle.sign('RSASSA-PKCS1-v1_5', key, Buffer.from(body));
  const jwt = `${body}.${b64url(sig)}`;

  const res = await fetch(sa.token_uri || TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Google's error here is genuinely informative — `invalid_grant` almost
    // always means the machine's clock is wrong, not that the key is.
    throw new Error(`token exchange ${res.status}: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

/** Step 4. `target` is `{ topic }` or `{ token }`. */
async function send(sa, bearer, target, title, body) {
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const message = {
    ...target,
    notification: { title, body },
    // ⚠️ EVERY VALUE IN `data` MUST BE A STRING. FCM refuses nested objects, so
    // an item travels as a JSON string — which is exactly what radio's
    // server does, and why its client has to `JSON.parse` it back out.
    data: {
      sent_at: new Date().toISOString(),
      kind: 'positron-push-test',
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`send ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

/**
 * Put a device token on a topic.
 *
 * 🔴 WITHOUT THIS A TOPIC SEND GOES NOWHERE AND LOOKS LIKE SUCCESS. FCM accepts
 * a send to a topic with no subscribers and returns a message id happily —
 * "accepted" is not "delivered", and a topic send reports no delivery count at
 * all. Topic membership is keyed by device token and can only be set from the
 * server side, which is why the browser cannot do it itself.
 */
async function subscribe(bearer, token, topic) {
  const res = await fetch(`https://iid.googleapis.com/iid/v1:batchAdd`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${bearer}`,
      'content-type': 'application/json',
      'access_token_auth': 'true',
    },
    body: JSON.stringify({ to: `/topics/${topic}`, registration_tokens: [token] }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`subscribe ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

// ── run ───────────────────────────────────────────────────────────────────
let sa;
try {
  sa = JSON.parse(await readFile(KEY_PATH, 'utf8'));
} catch (e) {
  console.error(`could not read the service account at ${KEY_PATH} — ${e.message}`);
  console.error('pass --key <path>, or set $POSITRON_SA');
  process.exit(1);
}
// ⚠️ NEVER PRINT THE KEY. This project has a SECRETS-ROTATION.md from the last
// time one reached a log, and the publisher redacts at the point of capture for
// the same reason. The identity is safe to show; the private half is not.
if (!sa.private_key || !sa.client_email) {
  console.error(`${KEY_PATH} is not a service account key (no private_key/client_email)`);
  process.exit(1);
}

const bearer = await accessToken(sa);

if (cmd === 'whoami') {
  console.log(`project      ${sa.project_id}`);
  console.log(`service acct ${sa.client_email}`);
  console.log(`access token minted, ${bearer.length} chars — the credential works`);
} else if (cmd === 'subscribe') {
  if (!a || !b) { console.error('usage: subscribe <device-token> <topic>'); process.exit(1); }
  console.log(JSON.stringify(await subscribe(bearer, a, b), null, 1));
  console.log(`subscribed that device to "${b}"`);
} else if (cmd === 'topic' || cmd === 'token') {
  if (!a) { console.error(`usage: ${cmd} <${cmd}> "Title" "Body"`); process.exit(1); }
  const target = cmd === 'topic' ? { topic: a } : { token: a };
  const out = await send(sa, bearer, target, b || 'positron-push', c || 'it works');
  console.log(out.name);
  // 🔴 THE TWO TARGETS MEAN DIFFERENT THINGS AND THIS PRINTED ONE LINE FOR BOTH.
  // A TOKEN send is checked: an unregistered or malformed token comes back as an
  // error (`UNREGISTERED`/`INVALID_ARGUMENT`), so a 200 really does mean FCM
  // holds that device and has taken the message for it. A TOPIC send is not
  // checked at all — FCM accepts a topic with zero subscribers and returns a
  // message id just as happily, and reports no delivery count ever. Printing the
  // topic caveat under a token send understates a result that IS evidence; the
  // reverse would overstate one that is not.
  console.log(cmd === 'token'
    ? 'accepted for that device — an unknown token would have been an error, so the address is live.'
    : '⚠️ ACCEPTED, NOT DELIVERED — a topic with no subscribers accepts identically. Subscribe a device first.');
} else {
  console.error(`usage:
  node proto/push/send.mjs whoami
  node proto/push/send.mjs subscribe <device-token> <topic>
  node proto/push/send.mjs topic <name>  "Title" "Body"
  node proto/push/send.mjs token <token> "Title" "Body"`);
  process.exit(1);
}

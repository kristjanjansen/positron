# plans/plan-incoming-email.md

🔴 **NOTHING IN THIS FILE IS BUILT. NO CODE WAS WRITTEN INTO THIS REPO, NO
WORKER WAS DEPLOYED, NO DNS RECORD EXISTS, AND `positron@positron.studio` DOES
NOT RECEIVE MAIL.** `dig +short MX positron.studio` answers nothing (MEASURED
2026-09-17), which is the one-command way to check that this line is still
true. Everything below is a proposal with prices attached.

Asked 2026-09-17: *"In bg work on incoming enail using cf see ../trip of deals
collection. positron@positron.studio"*.

Claims are tagged **MEASURED** (I ran something and read the output), **READ**
(a document or a file in this account says so, link given), or **INFERRED**
(reasoned from the other two, not checked).

---

## 0. One thing I changed by reading, and it is not nothing

**MEASURED.** `GET /zones/1ead979d8f29aaecbd02d701fb557f8e/email/routing`
returned a settings object whose `created` and `modified` are both
`2026-09-17T12:00:05.78776Z`. `date -u` twenty-six seconds later read
`2026-09-17T12:00:31Z`. **INFERRED: my own read materialized that row.** It says
`enabled: false`, `status: "unconfigured"`, `synced: false`, and it brought one
routing rule with it: catch-all `all` to `drop`, `enabled: false`, `source: api`.

**Nothing is receiving mail and no DNS changed.** I re-read the zone's records
afterwards: 17 of them, 16 AAAA on `100::` (the Workers custom domains) and one
CNAME `archive` to `public.r2.dev`, every one created between 2026-09-04 and
2026-09-15. No MX, no TXT, no SPF, no DKIM. The zone is `positron.studio`,
Free Website plan, active, on `kareem.ns.cloudflare.com` and
`meilani.ns.cloudflare.com`.

Worth saying because a later reader looking at the dashboard will find an Email
Routing entry that nobody switched on, and the obvious conclusion is that
somebody started this and stopped.

---

## 1. How mail actually arrives

### The path

```
  sender  ->  route1/2/3.mx.cloudflare.net  ->  routing rule  ->  Worker email() handler
                       (MX on the apex)          (literal `to`)     (or forward, or drop)
```

Cloudflare Email Routing accepts SMTP on its own MX hosts, matches the envelope
recipient against the zone's rules, and runs the named Worker's `email()`
handler. **READ: available on Free and Paid plans**
([email-routing](https://developers.cloudflare.com/email-routing/)). Receiving
costs nothing; the Worker invocation is billed like any other.

### What has to be true of the DNS and the zone

Enabling adds, at the apex, **three MX records and two TXT records** (READ,
[enable-email-routing](https://developers.cloudflare.com/email-routing/get-started/enable-email-routing/)).
I read the exact set off the sibling zone that already runs this, so these are
the real values rather than a description of them:

**MEASURED**, `GET /zones/<trip.dance>/email/routing/dns`:

| type | name | content | priority |
|---|---|---|---|
| MX | apex | `route1.mx.cloudflare.net.` | 87 |
| MX | apex | `route2.mx.cloudflare.net.` | 42 |
| MX | apex | `route3.mx.cloudflare.net.` | 94 |
| TXT | apex | `"v=spf1 include:_spf.mx.cloudflare.net ~all"` | |
| TXT | `cf2024-1._domainkey` | `"v=DKIM1; h=sha256; k=rsa; p=…"` | |

Two consequences for `positron.studio` specifically.

- **Nothing is displaced.** The apex has no MX and no TXT today (MEASURED), so
  there is no mail flow to break and no SPF record to argue with.
- **The trap that caught the sibling zone cannot fire here.** `trip.dance` reads
  `status: "misconfigured/locked"` to this day (MEASURED) because it carries a
  deliberate user-managed `v=spf1 -all` TXT that the routing API will not
  overwrite, so the zone shows two errors, `spf.foreign` and `spf.missing`,
  forever. Its worker delivery works anyway, because **SPF governs forwarding,
  not receipt**. `positron.studio` has no TXT at all, so it should go clean.
  INFERRED, from the two zones' record sets; not checked, because checking means
  enabling.

### What the `email()` handler receives

**READ**, [Workers API](https://developers.cloudflare.com/email-service/api/route-emails/email-handler/):
`async email(message, env, ctx)`. **MEASURED** against the real runtime (see §6
for how), `Object.getOwnPropertyNames(message)` is exactly:

```
from, to, raw, rawSize, headers, setReject, forward, reply
```

- `from` / `to` are the **envelope** addresses (MAIL FROM, RCPT TO), not the
  `From:` and `To:` headers, and they can differ.
- `headers` is a `Headers`. **MEASURED: keys come through lowercased and sorted,
  and values are NOT decoded.** A subject sent as RFC 2047
  (`=?utf-8?B?a8O1aWdlIGjDpHN0aQ==?=`) is handed over exactly like that. Storing
  it raw ships gibberish to whoever reads the mailbox.
- `raw` is a `ReadableStream` of the whole MIME message. `rawSize` is its length
  in bytes.
- `setReject(reason)` ends the message with a permanent SMTP error.
- `forward(rcptTo, headers?)` sends it on to a **verified destination address**.
  Only `X-` prefixed custom headers are allowed (READ).
- `reply(message)` needs a valid DMARC result on the incoming mail, replies at
  most once per event, must address the original sender, must send from the
  receiving domain, and refuses when the `References` header has more than 100
  entries (READ,
  [reply-email-workers](https://developers.cloudflare.com/email-routing/email-workers/reply-email-workers/)).
- `canBeForwarded` is documented (READ) and **is not present in local
  development** (MEASURED). See §7, it is a trap.

### Limits

**READ**, [limits](https://developers.cloudflare.com/email-routing/limits/):

| thing | limit |
|---|---|
| inbound message size | **25 MiB** |
| routing rules per domain | 200 |
| verified destination addresses per account | 200 |
| recipients per message (to + cc + bcc) | 50 |
| subject line | 998 characters |
| custom headers, combined | 16 KB |
| domains per zone (Routing and Sending combined) | 30 |
| `References` entries before `reply()` throws | 100 |

Plus: "Workers handling incoming emails count toward standard CPU and memory
limits. The Free plan may fail with `EXCEEDED_CPU` errors" (READ). This account
runs a Container in `workers/pub`, which is a Workers Paid feature, so
**INFERRED: the account is on Workers Paid.** The subscriptions endpoint
returned `10000: Authentication error` with this token, so that is not measured.
`npx wrangler` cannot tell you either. The dashboard billing page would.

**There is no documented inbound rate limit.** I could not find one and I am not
going to guess a number. That matters for §4, and the way to find out is to ask
Cloudflare support or to watch the Email Routing activity log after the address
has been public for a week.

### Attachments

There is no attachment API. `raw` is the whole MIME message and anything you
want out of it you parse yourself. `postal-mime` is the parser Cloudflare's own
local harness uses (MEASURED, it is bundled inside miniflare). The 25 MiB
inbound cap is the only attachment limit there is.

### What it can and cannot do

It can do anything a Worker can: bindings, `fetch`, Durable Objects, R2,
`ctx.waitUntil`. It cannot return a response to the sender other than through
`setReject`, `forward` or `reply`. **A throw is not free**: community reports
say Cloudflare retries the Worker call three times and then rejects the message
with `Worker call failed for 3 times, aborting`
([community thread](https://community.cloudflare.com/t/email-workers-message-setreject-repeated-delivery-attempts/640090)).
That is READ from a forum rather than from the docs, and I could not find an
official statement. Treat it as: a bug in the handler costs three invocations
and bounces the sender.

---

## 2. What `positron@positron.studio` is FOR

**The ask does not say, and this is the load-bearing question.** `../trip`
collects travel deals because trip.ee publishes travel deals; `deals@trip.dance`
is subscribed to airline newsletters and every message is a fact about a price.
Positron has no deals, no newsletters worth subscribing to, and nothing that
arrives on a schedule.

### What this repo actually has that mail could feed

I surveyed every worker. Four candidates, three of which I want to rule out in
writing so nobody re-opens them.

- **`feedback.positron.studio` (`positron-feedback`).** Every shelled demo
  carries a feedback button (`demo/shell/feedback.mjs`), the note crosses the
  relay, a Durable Object stores it, and `/feedback/` renders the table. This is
  already "a place for a person to write to, which lands somewhere a human
  reads". It is missing exactly one door: the person who is not on the page.
  **This is the real answer.**
- **`pub.positron.studio/logs`.** Ruled out. A device that can send mail can
  send an HTTP POST, which is what phones and the Quest already do, and the ring
  is 400 lines under a hard 100 KB ceiling with the write wrapped in a
  swallow-everything `catch` because diagnostics are never load-bearing. Mail
  into it would be both redundant and worse.
- **`items.positron.studio`.** Ruled out, and firmly. `announce()` sends a real
  FCM push to real subscribed phones for room `items`, and CLAUDE.md already
  records the day an unpartitioned topic sent two real notifications to every
  real subscriber on every run of the suite. **An address in public JavaScript
  wired to a push topic is a stranger's write access to somebody's lock screen.**
- **`store.positron.studio`.** Ruled out on lifetime. 1,000 rows, 24 hours,
  pruned on every write. A message that arrives on Friday is gone by Sunday.

### The recommendation

**One real use, and it is the plain one.** `positron@positron.studio` is a
mailbox for a person: somebody who saw a demo, or was handed a link, or wants to
say something and has an email client rather than a browser tab open. It lands
in the maintainer's own inbox, and a bounded, queryable summary of it lands
beside the feedback notes so the two channels can be read as one thing.

**Yes, the honest answer here is "a place for a person to write to, which lands
somewhere a human reads", and that is not a small thing.** The site currently
shows **no email address anywhere**: the only `mailto:` strings in the tree are
the Crossref API's politeness parameter in `demo/resources/build-corpus.mjs`,
and the only contact string that ships is inside a `User-Agent` header. There is
no way to reach this project except by being on one of its pages.

**One optional second use, and it is a demo rather than a product.** This repo's
whole idiom is measuring a platform and publishing the numbers, and `email()` is
a Workers handler nothing here has touched. In half an hour of probing I found
three things worth a `/kit/` entry: a text read that loses bytes silently, a
documented endpoint path that answers 200 while the handler never runs, and a
reject that is indistinguishable from an accept. A page built on **fixtures
only, never on live mail**, would be a real demo with no privacy surface at all.
Build it after the mailbox works, or not at all.

**What I am refusing to invent.** There is no positron equivalent of a deals
collection. No parser, no normalizer, no candidate queue, no scheduled
processing. A message that arrives is a person writing a sentence, and the
correct thing to do with it is to keep it and show it to a human.

---

## 3. Where a message lands

### The shape I recommend

**Forward the whole message to a verified personal address, and store a bounded
summary in a new Durable Object.** The durable copy of a person's words is their
own mail in the maintainer's inbox; the Durable Object is a convenience that can
be wrong for a week without anybody losing a message. That property is worth
more than any storage choice below.

```
  sender -> Cloudflare MX -> rule `positron@positron.studio` -> positron-post
                                                                  |      |
                                                     forward()    |      |  summary row
                                                                  v      v
                                              the maintainer's inbox    DO SQLite
```

### The four options, priced

| where | cost at this volume | what it costs to build | verdict |
|---|---|---|---|
| **forward only, no storage** | $0 | nothing, no code at all | **step 1** |
| **new DO, SQLite, summary rows** | inside the free allowance | one worker, ~150 lines | **step 3** |
| **the existing `feedback` DO** | same | less code, more risk | rejected, below |
| **R2, raw `.eml`** | needs a new bucket | a bucket plus lifecycle | rejected, below |
| **KV** | none exist in this repo | a new primitive | rejected |
| **a relay room** | free | nothing | rejected, the relay does not parse and does not keep |

**Prices, READ.** Workers Paid includes 10 million requests a month then $0.30
per million ([workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)).
SQLite-backed Durable Objects include 5 GB-month of storage then $0.20 per
GB-month, 1 million requests a month then $0.15 per million, and 50 million rows
written a month then $1.00 per million. R2 is $0.015 per GB-month with 10
GB-month free, Class A $4.50 per million with 1 million free, egress free
([r2 pricing](https://developers.cloudflare.com/r2/pricing/)). **At any volume a
personal mailbox will see, every one of these is zero.** Storage only becomes a
number if raw messages are kept, and §4 explains why they will not be.

### Why not the existing `feedback` Durable Object

Structurally it is the closest fit: the `note` table already has `at`, `id`,
`name`, `text`, and `id` is `UNIQUE` so `INSERT OR IGNORE` gives dedupe for
free. The temptation is real and I am refusing it for one reason.

**That worker's single best property is that no caller can choose the room.**
`pickRoom()` allows exactly two names, `feedback` and `feedback-dev`, and which
one a write reaches is decided server-side from the `Origin` header against an
allowlist of one. No parameter, body field or path can move a write into the
live room. **An email has no Origin.** Adding a third room reachable by a path
that bypasses that check is a change to the one part of the design that exists
to be unbypassable. Its other writer, `#onMessage`, is WebSocket-only and
ignores everything that is not `feedback.say`.

A separate script also follows the house pattern for the stated reason: `store`
and `feedback` are separate scripts from the relay precisely so that the thing
that parses has its own deploy and its own failure. An inbound mail parser is
exactly that thing.

### Why not R2, and the BLOB trap that makes it moot

CLAUDE.md records that a Durable Object binding a `Uint8Array` to a SQLite BLOB
stores an **EMPTY** one, silently: the row reads back at 0 bytes with its hex
head blank while everything upstream looks fine. An attachment path is precisely
the shape of code that hits it.

**The way to not hit that bug is to not store bytes.** Attachments are forwarded
and counted, never stored. Nothing in this design binds a buffer to anything, so
the trap cannot fire.

If raw storage is ever wanted anyway, it needs a **new bucket**. The three that
exist are all wrong: `elektron-archive-test` is shared by `ingest`, `instrument`
and `selfrec`, `positron-station` is swept by a five-minute cron, and
`vain-archive` is quota-managed. And when that day comes, the rule is
`await blob.arrayBuffer()` before binding, then read back `length(raw)` in SQL
and assert it, because the insert itself reports success either way.

### The row

One table, following `feedback`'s shape so the two read alike:

```sql
CREATE TABLE IF NOT EXISTS mail(
  n INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT UNIQUE,          -- RFC 5322 Message-ID: the dedupe key
  at INTEGER,              -- arrival, ms
  addr TEXT,               -- the sender, needed to reply to them
  domain TEXT,             -- the sender's domain, which is what a log line gets
  subject TEXT,            -- RFC 2047 DECODED, 500 chars
  text TEXT,               -- the text/plain part, capped
  raw_size INTEGER,        -- bytes as the platform reported them
  parts INTEGER,           -- how many MIME parts
  attach INTEGER,          -- how many attachments, and
  attach_bytes INTEGER,    -- how big they were, neither of them stored
  spf TEXT, dkim TEXT, dmarc TEXT,   -- from Authentication-Results
  lossy INTEGER,           -- 1 when the text read lost bytes, see §7
  fwd INTEGER              -- 1 when forward() succeeded
);
CREATE INDEX IF NOT EXISTS mail_by_time ON mail(at);
```

Read surface: `GET /mail?last=&since=&format=text`, the same query vocabulary
`feedback` and `store` already use, behind `X-Robots-Tag: noindex, nofollow`
like every other worker here, and **not linked from any page**.

---

## 4. Spam, abuse and cost

### What Cloudflare stops before the Worker runs

**READ**, [postmaster](https://developers.cloudflare.com/email-routing/postmaster/):

- "incoming emails must either pass SPF or be correctly signed with DKIM. Emails
  that fail both checks are rejected."
- DMARC is enforced according to the sender's policy.
- Senders on Realtime Block Lists "may be temporarily delayed or blocked", with
  `554 <IP> found on one or more RBLs` back to them.

That is a genuinely better front door than an open HTTP POST, and it is worth
noting that `ingest.positron.studio` had to build its own version of this by
hand. **It is not a spam filter.** It stops forgery and known-bad hosts. It does
not stop a real host sending real mail about search engine optimisation.

### What the handler has to do

- **A per-day cap in the object.** Over it, `setReject('over quota')`. A
  permanent SMTP error is the one response that makes a sender stop; a throw
  makes them retry. 200 a day is a number nobody legitimate will reach.
- **A size ceiling.** Over ~256 KB, do not read the body at all. Record the
  headers, `rawSize`, forward, and move on. Reading 25 MiB through
  `new Response(raw).text()` on every message is how a mailbox meets the CPU
  limit, and the Free plan's failure mode for that is a named error
  (`EXCEEDED_CPU`) that the sender sees as a bounce.
- **Cap the forward too.** `forward()` is the amplifier: without a cap, an
  address published in JavaScript becomes a pipe into the maintainer's personal
  inbox that anybody can open. Forward under the daily cap, drop above it.
- **Prune on every write.** 2,000 rows and 180 days, the pattern `feedback` and
  `store` already use. Storage cannot grow without bound, so it cannot become a
  bill.
- **Never `reply()`.** An auto-reply to a forged sender is a backscatter
  generator, and the whole address is one rule away from being an open relay's
  little brother. There is no reason this mailbox needs to answer anybody.

### What the failure looks like

- **The cheap failure**, and the likely one: the mailbox fills with junk, the
  2,000-row cap prunes a real message to make room for spam, and the person
  reading `/mail?format=text` stops reading it. That is why the forward exists:
  the real copy is in an inbox with fifteen years of spam training behind it.
- **The expensive failure**: a bug in the handler throws, Cloudflare retries
  three times per message, every sender gets a bounce, and the Workers
  invocation count is three times what anybody expects. Wrap the whole handler
  in a `try` that falls back to `forward()` and never throws.
- **The invisible failure**: Cloudflare rejects at the MX for SPF or DKIM and
  the Worker never runs, so nothing is logged anywhere this repo can see and the
  sender is told their mail bounced. There is an Email Routing activity log in
  the dashboard and that is the only place it shows. **NOT CHECKED**: whether
  that log is readable through the API with this token. The command that would
  answer it is a `GET` against the zone's email routing endpoints, and I did not
  find one in the OpenAPI spec for it.

### The address in public JavaScript

The ask's framing is right: an address that appears in shipped JavaScript gets
harvested. Two things follow.

- `build.mjs` assembles `public/` from an explicit allowlist, so putting the
  address on a page is a deliberate act in one file, not a leak.
- **Publishing it is optional and reversible in the wrong direction.** Once
  harvested it cannot be un-harvested; the only exit is retiring the address.
  So: get the route working, hand the address to people directly for a while,
  and only put it on a page once somebody actually wants that.

---

## 5. Privacy

Mail is personal data in a way a relay frame is not. A relay frame is a number
somebody's browser sent; an email carries a real person's name, their address,
their words, the addresses of anybody they copied, and the IP of the machine
they sent from in the `Received` chain.

### Stored

- The sender's address, in full. **Deliberate, and the one real trade here.**
  Everything else on this list could be reduced to a hash, and CLAUDE.md already
  records the pattern (`workers/pub` stores a three-byte SHA-256 of IP plus
  user-agent as `who`, never the address). But a mailbox you cannot reply from
  is not a mailbox, so the address is kept. It is kept on a surface no page
  links to and no search engine indexes, and it is never rendered publicly.
- The subject, decoded, capped at 500 characters.
- The `text/plain` part, capped. 8,000 bytes is `feedback`'s 4,000 doubled,
  which is a paragraph or two of real writing.
- Message-ID, arrival time, `rawSize`, part and attachment counts, and the
  SPF/DKIM/DMARC verdicts.

### Never stored

- **Attachments.** Not the bytes, not a copy, not a hash of the contents. Counted
  and forwarded.
- **The raw MIME.** Nothing beyond the caps above.
- **`Received` headers**, which carry the sender's IP and their mail host.
- **`Cc` and `Bcc`.** Those are third parties who did not write to this project.
- **HTML parts.** The `text/plain` alternative or nothing.

### Retention

180 days and 2,000 rows, whichever bites first, pruned on every write. The
`feedback` worker keeps its live room until the cap and this is a deliberate
difference: a visitor typing into a box on a page they chose to open is not the
same as a person's private correspondence sitting in a database forever.

### Logging

CLAUDE.md's rule is that secrets are redacted at the point of capture, and the
same discipline applies to a stranger's address. **A log line carries the
sender's DOMAIN and the subject truncated. Never the full address, never the
body.** `../trip` does exactly this and it is the right shape:

```js
console.log(JSON.stringify({ evt: 'mail', from: domain, subject: subject.slice(0, 80) }));
```

### The one thing this plan does not settle

Whether the address, once public, needs a line somewhere saying what happens to
mail sent to it. My view: not until it is on a page. Once it is on a page, one
sentence on that page is enough, and it should say the retention window.

---

## 6. How it is verified

The standing example is `demo/fake-station.mjs`: an Icecast mount that is
nobody's radio, which took `/radio/` from ungradable to 48/48 at zero cost to
anybody. **The equivalent here already exists and ships inside wrangler**, which
is better than building one.

### The local endpoint, measured

I wrote a throwaway probe worker in the scratchpad (not in this repo), ran
`npx wrangler dev`, and delivered fixtures to it. Everything in this section is
**MEASURED** against wrangler 4.75.0.

- **The path is `POST /cdn-cgi/handler/email?from=…&to=…` with an RFC 5322 body.**
- 🔴 **THE DOCUMENTED PATH IS WRONG AND ITS FAILURE IS SILENT.** The
  [local-development page](https://developers.cloudflare.com/email-routing/email-workers/local-development/)
  says `/cdn-cgi/local/email`. Posting there does **not** 404: it falls through
  to the worker's `fetch` handler, which answered **HTTP 200** with the state
  left over from the previous delivery, so it looked exactly like a message that
  had been processed. The email handler never ran. A harness pointed at the
  documented path passes while testing nothing. The installed wrangler is
  authoritative and it says `handler`, not `local`, in as many words: any other
  `/cdn-cgi/handler/*` path answers *"is not a valid handler. Did you mean to
  use /cdn-cgi/handler/scheduled or /cdn-cgi/handler/email?"*.
- **A message with no `Message-ID` is refused 400** before the handler runs:
  `Email could not be parsed: invalid or no message id provided`.
- **The local size cap is 1 MiB, against production's 25 MiB**, and it says so:
  *"Email message size is within the production size limit of 25MiB, but exceeds
  the lower 1Mib limit for testing locally."* So nothing between 1 MiB and 25 MiB
  can be exercised locally at all.
- **The endpoint does not dedupe.** The same Message-ID delivered twice returned
  200 twice. Dedupe is entirely the handler's job, which is what makes it worth
  asserting.
- 🔴 **`setReject()` RETURNS HTTP 200, IDENTICAL TO AN ACCEPT.** Both read
  `Worker successfully processed email`. **A test that asserts on the status code
  cannot tell a rejection from a delivery**, which is the vacuous pass this repo
  has shipped before. Grade a reject by reading the worker's own state.
- **A throw returns HTTP 500** with the stack, so that one IS distinguishable.

### The harness

`workers/post/test.mjs`, no browser, in the shape of
`demo/shell/looper-test.mjs`: start `wrangler dev`, read the port back out of
its output rather than fixing one (a fixed port is a shared mutable global, and
this repo has been bitten by it three times in one session), POST each fixture,
then read the worker's own `GET /mail` and assert.

`workers/post/fixtures/` holds the messages. The ones I already built and
delivered, which can be lifted straight in:

| fixture | what it proves |
|---|---|
| `plain.eml` | the ordinary case: subject, text part, sender all land |
| `plain.eml` **twice** | dedupe: two deliveries, one row |
| `subject-2047.eml` | the stored subject reads `kõige hästi`, not `=?utf-8?B?…?=` |
| `eightbit.eml` | the lossy-read guard fires, see §7 |
| `attach.eml` | parts and attachment bytes counted, nothing stored |
| `no-msgid.eml` | **negative control**: the endpoint refuses it 400 |
| `over-1mib.eml` | **negative control**: the local cap refuses it 400 |
| 201 deliveries | the daily cap rejects, read off the worker's state |

Per the house rule, prove the guards fire: sabotage the dedupe and the duplicate
test goes red, sabotage the RFC 2047 decode and the subject test goes red,
sabotage the length comparison and the lossy test goes red. A harness whose
tests cannot be made to fail is decoration.

### What a fixture harness can never tell you, stated plainly

- **SPF, DKIM and DMARC verdicts.** MEASURED: there is no
  `Authentication-Results` header in local delivery. A handler that branches on
  those cannot be graded locally at all.
- **`canBeForwarded`.** MEASURED: absent from the local message object. It reads
  `undefined`, which is falsy, so a handler that branches on it takes one path in
  the harness and the other in production.
- **Anything over 1 MiB.** Which is most of what an attachment path is for.
- **Whether the route is live**, whether `forward()` reaches a real inbox, and
  whether Cloudflare's MX accepts real mail for this zone.

**That last group needs exactly one real message, sent once, by a person.**
`../trip` did it by opening a raw SMTP session to `route2.mx.cloudflare.net`
because its Gmail tooling was read-scoped; sending from a phone is easier and
proves the same thing. One message, then delete the row.

---

## 7. Traps, all of them measured

Three things I found in half an hour that would each have cost a session.

🔴 **`new Response(message.raw).text()` LOSES BYTES AND SAYS NOTHING.**
MEASURED: a fixture whose `Content-Transfer-Encoding: 8bit` body carried two
invalid UTF-8 bytes reported **`rawSize` 244 and a read length of 242**. The
decoder replaced them and returned a shorter string. `../trip` reads its mail
exactly this way and stores the result as the raw payload, which is fine for the
airline newsletters it subscribes to and is wrong for arbitrary mail from
strangers. **`raw.length !== message.rawSize` is a free integrity assert** and it
fires on precisely the messages where the text path is wrong. That is the `lossy`
column in §3.

🔴 **THE DOCUMENTED LOCAL ENDPOINT ANSWERS 200 AND RUNS THE WRONG HANDLER.**
§6. A harness built from the documentation reports green having tested nothing.

🔴 **A REJECT AND AN ACCEPT ARE THE SAME HTTP RESPONSE LOCALLY.** §6. Assert on
the worker's state, never on the status.

And one that is not a trap but is worth knowing: `message.headers` values are
**not** MIME-decoded (MEASURED), so every non-ASCII subject in Europe arrives as
`=?utf-8?B?…?=` and a mailbox that stores it raw is unreadable for exactly the
people most likely to write.

---

## 8. What a person has to do, and what can be done by API

**MEASURED: the machine OAuth token carries `email_routing (write)` and
`email_sending (write)`.** Run `npx wrangler whoami` **from a directory with no
`.env` in it** to see this; the repo root has one and it shadows the OAuth token
with a narrower API token that cannot even read the account's own email address.

So the whole inbound side can be done from the API with **no dashboard visit**,
which is exactly what `../trip` did. Both routes are written out below because
the ask says to name the click.

### Enable Email Routing on the zone

By API (adds the MX and TXT records above):

```
POST /zones/1ead979d8f29aaecbd02d701fb557f8e/email/routing/dns
```

⚠️ **Send an EMPTY body.** `../trip` recorded that the documented body errors
with *"must be a subdomain"* and that an empty body is the root-zone form. READ,
from that project's worklog, not measured here.

By dashboard: **Compute > Email Service > Email Routing > Onboard Domain**,
choose `positron.studio`, review the records, **Done** (READ).

### Verify a destination address

`POST /accounts/<account>/email/routing/addresses` with the address, then
**a person has to click the link in the verification mail Cloudflare sends.**
There is no API for that click. A forward to an unverified address fails.

### Create the rule

```json
{
  "name": "positron@ to positron-post",
  "matchers": [{ "type": "literal", "field": "to", "value": "positron@positron.studio" }],
  "actions":  [{ "type": "worker",  "value": ["positron-post"] }],
  "enabled": true,
  "priority": 0
}
```

`POST /zones/<zone>/email/routing/rules`. **MEASURED**: that is the exact shape
of the live `deals@trip.dance` rule, read back off this account. For step 1
below, swap the action for
`{ "type": "forward", "value": ["<verified address>"] }`.

⚠️ **Leave the catch-all alone.** The zone already has one, `all` to `drop`,
`enabled: false`. A catch-all that accepts turns every typo and every dictionary
attack into an invocation.

⚠️ **The installed wrangler cannot do this.** 4.75.0 has `send_email` bindings
and `destination_address` for the OUTBOUND side, but no inbound `addresses`
config field: MEASURED, the quoted config key `"addresses"` appears zero times
in the bundle, in both the homebrew-installed copy that actually runs here and
the npx-cached one. Newer wrangler reportedly reconciles routing rules from
`wrangler.jsonc` on deploy; **NOT CHECKED** against 4.133.0. Until somebody
checks, the rule is an API call or a dashboard click, and it lives in a comment
in `workers/post/wrangler.jsonc` so it is not lost.

---

## 9. Steps, cheapest first

1. **Decide what the address is for.** §2 says a mailbox for a person and
   refuses to invent a deals collection. One sentence back settles everything
   downstream. Costs nothing, blocks everything.
2. **Forward with no code at all.** Enable Email Routing on the zone, verify a
   destination address, add one `forward` rule. `positron@positron.studio` then
   works and lands in an inbox that already has fifteen years of spam training.
   **NEEDS A PERSON: the verification link in the mail Cloudflare sends.** The
   rest is three API calls with the token that is already on this machine, or
   four clicks in **Compute > Email Service > Email Routing**.
3. **Send one real message and delete it.** The only check that proves the route
   is live. **NEEDS A PERSON**, or a phone.
4. **Build `workers/post` against fixtures, with no route pointed at it.**
   The handler, the DO, the caps, `workers/post/test.mjs` and the fixtures from
   §6. Gradable end to end with `npx wrangler dev` and no mail from anybody.
   Nothing deployed, nothing routed, no DNS.
5. **Point the rule at the worker.** One API call changing the action from
   `forward` to `worker`. The worker keeps forwarding, so step 2 still holds if
   the storage half is wrong.
6. **Read it for a fortnight before showing it to anybody.** How much arrives,
   how much is junk, what the SPF and DKIM verdicts look like. That is the
   measurement that decides whether the caps in §4 are the right numbers, and it
   cannot be reasoned about in advance.
7. **Only then, and only if wanted: put the address on a page.** Harvesting is
   one-way. §4.
8. **Optional, and last: `/post/`, a demo that publishes what §7 measured.**
   Fixtures only. A demo that shows a stranger's mail is not a demo.

---
name: positron-start
description: Stand up a positron-shaped site of somebody's own on Cloudflare, from a fresh machine and possibly a fresh Cloudflare account. Load before the first command when somebody says they want to build something like this, or like one of its demos. Works for Claude Code, Codex or any agent that can run commands.
---

# Standing up a positron of your own

🔴 **ASSUME THE PERSON READING THIS IS NOT A DEVELOPER.** They pasted a prompt
out of a README. They may never have opened a terminal, they do not know what
wrangler is, and they cannot tell a missing dependency from a broken account.
**So YOU run every command and they answer questions.** Cloudflare's own setup
document says the same thing in one line: *"Complete all of the following steps
yourself by running the commands directly. Do not ask the user to run any of
these commands."*

⚠️ **THE TWO THINGS YOU MAY NOT DO FOR THEM** are create a Cloudflare account
(it needs their email and a password they choose) and spend their money. Every
gate below that costs something stops and asks in words, with the number.

⚠️ **AND THIS FILE IS READ BY TWO KINDS OF AGENT.** Claude Code discovers
`.claude/skills/` in any clone; Codex and the rest are simply told to read this
path. Nothing here may depend on a feature only one of them has. No tool names,
no slash commands, just commands and decisions.

---

## Step 0. Cloudflare's own setup, first

Fetch **https://developers.cloudflare.com/agent-setup/prompt.md** and follow it
before anything else. It is Cloudflare's maintained instruction for wiring an
agent to their platform, it has a branch for each agent (Claude Code, Codex,
OpenCode, Windsurf, Cursor, Copilot), and it installs their skills and MCP
servers so that everything after this point is checked against current docs
rather than against your memory of them.

⚠️ **IT IS A LIVE DOCUMENT AND THIS ONE IS NOT.** If it contradicts anything
below about how to install or authenticate, it wins.

⚠️ **AND THE README'S PROMPT ASKS FOR IT TOO, ON PURPOSE.** The same URL is the
first line of the block a person pastes, because an instruction two hops deep
(their prompt, then this file, then Cloudflare's) is one that gets skipped, and
this step is what puts the Cloudflare docs in front of you instead of your
memory of them. **If it has already run, say so in one line and move on.**
Running it twice is harmless; skipping it silently is not.

---

## Step 1. The machine

Run these and read the answers. Do not report a version to the person unless
something is wrong with it.

```sh
uname -sm          # Darwin arm64 is what this is developed on
node -v            # any current LTS or later
npx wrangler --version
```

- **macOS**: the developed case. Everything works.
- **Linux**: fine. The only parts that do not travel are the hardware pages
  under `rig/`, which talk to a Raspberry Pi and to CoreMIDI.
- **Windows**: say plainly that this needs WSL, help them install it, and do not
  start half-working. A half-working setup for somebody who cannot diagnose it
  is worse than a clear no.
- **No node**: install it for them. On macOS that is `brew install node`, and if
  there is no Homebrew either, install that first or send them to nodejs.org.
  🔴 **ASK BEFORE INSTALLING ANYTHING SYSTEM-WIDE.** Some machines are managed
  by an employer and a locally compiled binary is killed on sight.
- **No wrangler**: there is nothing to install. `npx wrangler` fetches it on
  demand, and this repo never pins it in a `package.json` because there is no
  `package.json`.

🔴 **THEY DO NOT NEED THIS REPOSITORY, AND THE DEFAULT IS NOT TO TAKE IT.** They
reached this file over the web on purpose. **Build them a NEW, SMALL project in
their own idiom**, and read a file from here over a raw URL when a specific
question comes up.

🔴 **MEASURE IT RATHER THAN TAKING MY WORD, BECAUSE THE OPPOSITE ADVICE LOOKS SO
REASONABLE.** Count what any page here actually pulls in:

```sh
grep -o "from '/[a-z-]*/" demo/stage/index.html | sort | uniq -c
```

Almost all of it is `/shell/`, which is this site's kit, and the rest is
`/timeline/`. There is **no `package.json` anywhere** and those are root-relative
paths that resolve only because `demo/server.mjs` serves the repository root. So
"copy the stage demo" means dragging every one of those files plus everything
they import, and reproducing the path layout, to get a page that looks like this
site.
🔴 **AND NEARLY ALL OF THEM ARE THIS SITE'S TASTE, NOT ITS SUBSTANCE.** Somebody else
will want different controls, different spacing, different words, a framework
this repo does not use. **That is not a compromise to talk them out of, it is
the correct outcome.** Handing them this kit makes their project a copy of one
person's aesthetic with none of the reasons behind it.

✅ **WHAT IS ACTUALLY WORTH READING IS SMALL, AND IT IS THE TWO TIMELINE FILES.**
`timeline/transport.mjs` and `timeline/media-master.mjs` are where the hard part
lives: a position domain, a transport that seeks without replaying its backlog,
and media sync that survives a seek on a paused element. That is worth reading
before reinventing. Everything else here is either furniture or this project's
own subject matter.

⚠️ **SO GET THE FILES ONLY WHEN THERE IS A REASON**, and say which reason. Good
ones: they want to run this site locally to see what they are aiming at; they
want to read several pages rather than one. Bad one: it seemed like the first
step.

```sh
git --version      # check before you use it, it may not be there
```

- **Git is there**: `git clone https://github.com/kristjanjansen/positron`.
- **Git is missing, macOS**: `xcode-select --install` opens a GUI installer the
  person has to click. **Ask first**, and offer the zip instead, which installs
  nothing at all since `curl` and `unzip` ship with the system:

```sh
curl -L -o positron.zip https://github.com/kristjanjansen/positron/archive/refs/heads/main.zip
unzip -q positron.zip     # unpacks as positron-main/
```

⚠️ **SAY WHICH ROUTE YOU USED**, because it decides whether they can ever
`git pull` an update or have to download the zip again.
⚠️ **AND BUILD BESIDE IT, NEVER INSIDE IT.** A checkout of somebody else's
research is a reference, not a starting point.

⚠️ **THERE IS NO BUILD STEP AND NOTHING TO `npm install`** in THIS repository, and
that is a fact about this one rather than advice for theirs. Every page here is
one HTML file with ES modules, served by `node demo/server.mjs`. If their own
project wants a framework, let it have one.

---

## Step 2. The Cloudflare account

```sh
npx wrangler whoami
```

**If it names an account**, they are logged in. Say which account, because
people have more than one and deploying to the wrong one is a quiet mistake.

**If it does not**, run `npx wrangler login`. It opens a browser once and comes
back. If they have no account at all, send them to
`https://dash.cloudflare.com/sign-up`, wait, and run `whoami` again.

🔴 **PREFER `wrangler login` OVER AN API TOKEN, AND THE REASON IS A TRAP THIS
REPO FELL INTO.** `wrangler` auto-loads a `.env` from its working directory, so
a stale `CF_API_TOKEN` sitting in a file shadows the machine's real login, and
every deploy silently goes somewhere else or fails with an error about
permissions that has nothing to do with permissions. If a token must be used:

```sh
env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN npx wrangler whoami
```

and deploy from a directory with no `.env` in it. `CLAUDE.md` in this repo
carries the same warning because it cost a session to find.

⚠️ **NEVER PUT A TOKEN IN A FILE YOU THEN COMMIT**, and never print one. If one
reaches a log or a transcript it is burned and has to be rotated, which is a
dashboard job the person has to do themselves.

---

## Step 3. Free or paid, which decides what you can build

```sh
npx wrangler deploy --dry-run    # proves the toolchain without creating anything
```

There is no reliable command that prints the plan, so **ask them**, and tell
them what the answer decides.

🔴 **DO NOT QUOTE A PRICE FROM MEMORY, AND DO NOT QUOTE ONE FROM THIS FILE
EITHER, BECAUSE THERE ARE NONE IN IT.** Cloudflare's prices change and this file
does not. **Read them now**, with the Cloudflare docs MCP that Step 0 installed
or by fetching the pages, and give the person TODAY'S number:

- `https://developers.cloudflare.com/workers/platform/pricing/` (Workers, and Containers)
- `https://developers.cloudflare.com/r2/pricing/`
- `https://developers.cloudflare.com/stream/pricing/`
- `https://developers.cloudflare.com/durable-objects/platform/pricing/`
- `https://developers.cloudflare.com/workers-ai/platform/pricing/`

⚠️ **A NUMBER NOBODY RE-MEASURES READS AS A FACT**, which is the oldest rule in
this repository, and here it decides whether somebody spends money. Say where
you read it and when.

What is below is the SHAPE, which moves much more slowly than the prices.
**Checked 2026-09-24; check it again rather than trusting it.**

**On the free plan you can have:**

- **Workers with static assets.** The site itself. Static asset requests are
  free and unlimited on both plans.
- **Durable Objects**, which is what a shared room, a fired cue and a message
  history are made of here. Free plan supports the **SQLite storage backend**,
  which is the only backend a new namespace can use anyway.
- **R2**, for recordings and archives. There is a monthly free allowance for
  storage and operations, and **no egress charge at all**, which is the part
  that makes it unusual.

**These cost money, and you stop and ask before touching either:**

- **Cloudflare Stream**, for live video. Prepaid storage plus a charge per
  minute delivered, and **no free tier**. It is what `llhls` and `webrtc` play.
- **Containers**, which run ffmpeg beside a Worker in `workers/pub/`. Included
  in the Workers Paid plan and **not available on free at all**.

✅ **SO THE HONEST ANSWER TO "DO I HAVE TO PAY?" IS NO, FOR MOST OF IT.** The
front page, the timeline pages, the archive pages, the MIDI pages, the messaging
pages and the recorder all run on the free plan. Live video does not. Say that
with today's numbers beside it, and let them choose, rather than quietly
building the half that needs a card.

---

## Step 3b. What YOU run, and what THEY have to click

🔴 **A NON-DEVELOPER NEEDS TO KNOW WHICH HALF IS THEIRS BEFORE THEY START.**
Almost everything is yours. The exceptions are money, identity and nameservers,
and there is no CLI for any of them. **Say this list out loud early**, so nobody
waits on the other.

| the thing | who does it | how |
| --- | --- | --- |
| a Cloudflare account | **them** | `dash.cloudflare.com/sign-up`. Needs their email and a password they choose. |
| logging wrangler in | **you run it, they click once** | `npx wrangler login` opens a browser and comes back |
| upgrading to Workers Paid, $5/month | **them** | dashboard billing. **There is no wrangler command for this.** |
| buying Stream minutes | **them** | dashboard, Stream page. Prepaid, and nothing works until it is bought. |
| choosing the `workers.dev` subdomain | **them, once** | dashboard, Workers & Pages, **Change** next to **Your subdomain** |
| registering a domain | **them** | easiest path: the Worker's **Domains** tab buys through Cloudflare Registrar and connects it automatically |
| bringing an existing domain | **them** | dashboard **Add a site**, then change nameservers at their current registrar. Takes hours to propagate. |
| attaching that domain to the Worker | **you** | one line of `wrangler.jsonc`, below, then `npx wrangler deploy` |
| creating an R2 bucket | **you** | `npx wrangler r2 bucket create <name>` |
| creating a Durable Object | **you** | declare it in `wrangler.jsonc` and deploy; there is nothing to create by hand |
| setting a secret | **you run it, they paste the value** | `npx wrangler secret put <NAME>` |
| deploying | **you** | `npx wrangler deploy` |

⚠️ **AND RUN IT FROM A DIRECTORY WITH NO `.env` IN IT**, or unset the two
variables, for the reason in Step 2.

---

## Step 4. A domain, which is optional and recommended

Ask whether they have one. If they do not, `workers.dev` genuinely works and
they can move later, so this is not a gate. **But do recommend it, and give the
reasons rather than asserting it**, because a non-developer cannot weigh this
otherwise.

🔴 **CLOUDFLARE RECOMMENDS IT THEMSELVES, AND THAT IS THE FIRST THING TO SAY.**
Their `workers.dev` page: *"It's recommended to run production Workers on a
Workers route or custom domain, rather than on your workers.dev subdomain. Your
workers.dev subdomain is treated as a Free website and is intended for personal
or hobby projects that aren't business-critical."* So this is not one project's
preference.

Then the four that this repository actually paid for:

1. **A Worker's free hostname contains its script name**, as
   `<worker>.<subdomain>.workers.dev`. Renaming a Worker creates a NEW one and
   abandons the Durable Object holding its state, so the script name tends to be
   permanent. This site's worker is STILL called `elektron-view`, two project
   renames later, and on `workers.dev` that fossil would be the address
   everybody types. On a domain it is an internal handle nobody sees.
2. **Related services want to live together.** This site runs the pages, a
   device log at `pub.`, a signalling relay at `rtc.` and a recorder at
   `selfrec.`, all on one domain. On `workers.dev` those are four unrelated
   strings that happen to share an account.
3. **`workers.dev` is on the Public Suffix List**, so browsers treat every
   subdomain under it as a separate site.
4. **A link is a thing you hand to a person.** `positron.studio/stage/` can be
   said out loud, printed beside an installation, or put in a QR code.

⚠️ A fifth reason is often given, that some corporate and school networks block
`*.workers.dev` as shared hosting. **That is reported and not measured here.**
Say so if you repeat it.

✅ **THE CHEAPEST PATH FOR SOMEBODY WITH NO DOMAIN** is the Worker's **Domains**
tab in the dashboard: it buys through Cloudflare Registrar, which sells at cost,
and connects it to the Worker in the same step. No nameserver change, no waiting.

Once the domain is an active zone on their account, attaching it is yours and it
is one line:

```jsonc
{ "routes": [ { "pattern": "their-domain.com", "custom_domain": true } ] }
```

then `npx wrangler deploy`. Cloudflare creates the DNS record and issues the
certificate itself.
⚠️ **TWO REFUSALS TO EXPECT**: a Custom Domain cannot be created on a hostname
that already has a CNAME record, and not on a zone they do not own. Both are
dashboard problems, not config problems.

---

## Step 4b. If there is live video in it, read this before promising anything

🔴 **THE STREAMING KNOWLEDGE IS IN A SKILL OF ITS OWN AND IS NOT REPEATED HERE.**
Read it when the answer turns on a detail:
`https://raw.githubusercontent.com/kristjanjansen/positron/main/.claude/skills/positron-streaming/SKILL.md`
It carries the LL-HLS and `hls.js` tuning, what each knob actually changed, the
relay, and the traps. Tuned values live beside the pages that use them, for
example `liveSyncDurationCount: 3` with `maxBufferLength: 12` and
`backBufferLength: 4` on the multi-channel page. **Do not re-derive those from
memory.**

What belongs HERE is the three facts that change what you promise somebody:

🔴 **1. CLOUDFLARE STREAM'S WebRTC CANNOT BE RECORDED. THIS IS THE ONE PEOPLE
GET WRONG.** Cloudflare's own WebRTC page: *"Recording and live HLS playback are
not yet supported"*, and the pricing page says the same from the other side,
*"WebRTC broadcasts cannot currently be recorded, thus no storage is consumed"*.
WHIP in and WHEP out must be used **together**: an RTMP or SRT input cannot be
played over WHEP, and a WHIP input cannot be recorded or played as HLS.
⚠️ It is marked as not supported **yet**, so re-check it rather than repeating
this line in a year.
✅ **SO IF THEY NEED BOTH LOW LATENCY AND A RECORDING**, say the choice out loud:
RTMP or SRT ingest, which records and plays as HLS at a few seconds of latency;
or WebRTC, which is sub-second and leaves nothing behind.

✅ **2. THERE IS A THIRD OPTION AND IT IS R2, WHICH THIS REPOSITORY USES.**
Record in the browser with `MediaRecorder`, ship the pieces to an R2 bucket as
they are made, and play them back yourself. It stays inside R2's free allowance
for a long while and carries no egress charge, it is yours rather than a
product's, and it gives a recording of a WebRTC session that Stream will not
give you. `demo/record/` ships segments as they are cut, `demo/capture/` does
camera in and segments out, and `demo/crate/` puts a long file up in pieces and
scrubs it back.
⚠️ It is more work than pressing record on Stream, and it is the honest answer
when somebody wants the recording and does not want the bill.

⚠️ **3. DELIVERY IS BILLED PER MINUTE WATCHED, WHICH IS THE COST THAT SURPRISES
PEOPLE.** It is counted from segment requests, and **client-side preloading and
buffering count**, so a page that starts a stream on load bills for viewers who
never looked.
🔴 **DO THE ARITHMETIC OUT LOUD, WITH THE RATE YOU JUST READ OFF THE PRICING
PAGE**, for what they are actually building. An installation playing eight hours
a day to one screen is 480 minutes a day and roughly 14,400 a month: multiply
that by today's per-minute-delivered rate and say the monthly figure before
anybody builds it. A page that only plays when somebody presses something costs
a fraction of the same thing. **This is the single strongest reason to make a
stream open on a press rather than on a visit.**

---

## Step 4c. If there is a model in it

Workers AI is on **both** plans. There is a **daily free allowance measured in
Neurons**, the same on free and paid, which resets at 00:00 UTC; beyond it, free
plans fail the request rather than billing silently, and paid plans are charged
per Neuron. **Read the allowance and the rate off
`https://developers.cloudflare.com/workers-ai/platform/pricing/` and say today's
numbers**, for the reason in Step 3.
⚠️ **SOME MODELS ARE PAID-ONLY** and answer `403` on the free plan, so check the
model catalog rather than assuming a name works. Many remain free, and which
ones are in which group changes.
⚠️ **AND THE SAME LOAD-ON-A-VISIT RULE APPLIES.** A model called on page load is
a model called by every visitor and every crawler. Call it on a press.

---

## Step 5. Now ask what they actually want

They already said something, and it is probably the name of a demo. **Open the
LIVE PAGE first**, at `https://positron.studio/<slug>/`, because what they saw
is what they are asking for. Read the source after, and read it as ONE ANSWER
rather than as the answer.

🔴 **ASK WHAT THEY WANT IT TO LOOK LIKE BEFORE YOU WRITE ANY INTERFACE.** They
may want a framework, a component library, a house style, or nothing at all.
**Take their preference over this repository's every time.** What is transferable
here is the ARRANGEMENT of the parts, not the controls, and a page built in
somebody else's taste with none of the reasons behind it is a page they cannot
maintain.

**Worked example, the one the README ships with: *"I want to build something
like the stage demo."***

`/stage/` puts a recorded performance in front of a room of people, asks them
something, and keeps every answer on the recording's own timeline. Decomposed
into what has to exist, what it costs, and **how much of this repository is
worth reading for it**:

| the part | what it really is | free? | read here? |
| --- | --- | --- | --- |
| something that plays a film and can be scrubbed | a `<video>` and a position control, in whatever UI they like | yes | no, build it their way |
| a position domain that survives seeking | the genuinely hard bit | yes | **yes: `timeline/transport.mjs`, `timeline/media-master.mjs`** |
| a film to play | a file, in R2 once it is large | yes | no |
| a second screen for the audience, on their phones | a Worker with a WebSocket and one Durable Object per room | yes | Cloudflare's own docs are better than this repo's version |
| answers landing on the recording's timeline | the same object, storing a position with each answer | yes | the idea, not the code |
| a live camera instead of a recording | Cloudflare Stream | **no, paid** | no |

✅ **SO THE HONEST PLAN IS: BUILD ALL OF IT ON THE FREE PLAN, IN THEIR OWN
IDIOM**, read two files from here for the timing, and leave the live-camera
variant as a later step they can pay for if they ever want it.
✅ **THAT DECOMPOSITION IS THE POINT OF THIS STEP.** Do it out loud for whatever
they asked for, before writing a line, including the last column. Somebody who
is told which one part is worth borrowing gets a project they own; somebody
handed a copy gets a project they are stuck with.

---

## Step 6. Build the smallest thing and deploy it

🔴 **GET ONE PAGE LIVE BEFORE BUILDING ANYTHING GOOD.** A non-developer who has
not yet seen their own URL has no idea whether any of this is working, and every
minute after that is spent debugging two things at once.

Their project, whatever shape it has, deploys the same way:

```sh
npx wrangler deploy          # from their project, with their wrangler.jsonc
```

⚠️ **AND IF THEY ARE ALSO RUNNING THIS REPOSITORY TO LOOK AT**, that is a
separate thing in a separate directory: `node demo/server.mjs` serves it locally,
and `node workers/view/deploy.mjs` is how THIS site ships. Do not mix the two
trees.

Then **give them the URL**, and open it yourself to check it answers before you
do. A path is not an answer to "where is it": the file you edited is not the
thing they asked for, `https://<their site>/<page>/` is.

---

## What to copy, and what not to

✅ **COPY THE SHAPE, NOT THE SURFACE.** One page per idea, one file each. One
list that every renderer reads, so there is no second place to forget a row. A
harness that drives the real page in a real browser and asserts on what the page
publishes. Read `CLAUDE.md` and the other skills in `.claude/skills/` for the
rules and, more usefully, for what each one cost.
🔴 **THE CONTROLS ARE NOT PART OF THE SHAPE.** `demo/shell/` is one project's
taste in buttons, spacing and words, and nearly everything `/stage/` imports is
that. **Their project should have its own**, in whatever framework or none
they prefer. The transferable idea is *a kit rather than a control hand-rolled
per page*, not *this kit*.

🔴 **DO NOT COPY THE THINGS THAT POINT AT SOMEBODY ELSE'S SERVER.** Several
pages here play a public broadcaster's live streams, and every connection this
repository opens to one appears in that broadcaster's audience measurement.
They told us so. If you reuse those pages, **point them at your own source or at
the stand-ins in `demo/fake-*.mjs`**, which serve the same shapes locally and
cost nobody anything.

🔴 **DO NOT COPY THE HARDWARE PAGES EXPECTING THEM TO WORK.** Everything under
`rig/` talks to one Raspberry Pi in one building and to MIDI devices on one
desk. They are worth reading and they will not run for anybody else.

⚠️ **AND DO NOT COPY THE MEASUREMENTS.** Every number written down in this
repository is a measurement of this machine, this network and this account on a
stated day. Yours will differ. Re-measure rather than quoting, which is the
house rule here and the reason most of these files are trustworthy at all.

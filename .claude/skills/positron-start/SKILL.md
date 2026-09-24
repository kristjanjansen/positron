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

🔴 **AND DO NOT ASSUME GIT. THEY REACHED THIS FILE OVER THE WEB.** The prompt in
the README asks an agent to read one public URL, deliberately, so that somebody
with no git and no GitHub account can still start. Check before you use it:

```sh
git --version
```

- **Git is there**: `git clone https://github.com/kristjanjansen/positron` and
  work from that.
- **Git is missing, macOS**: `xcode-select --install` opens a GUI installer that
  the person has to click. **Ask first**, and offer the zip instead, which needs
  nothing:

```sh
curl -L -o positron.zip https://github.com/kristjanjansen/positron/archive/refs/heads/main.zip
unzip -q positron.zip     # unpacks as positron-main/
```

  `curl` and `unzip` both ship with macOS, so this route installs nothing at all.
⚠️ **AND SAY WHICH ONE YOU USED**, because it decides whether they can ever
`git pull` an update or have to download the zip again.
⚠️ **THEY MAY NOT NEED THE REPOSITORY AT ALL.** If what they want is their own
small site, this one is a REFERENCE: read the page that does the thing they
described, and build theirs beside it rather than inside it. A copy of somebody
else's whole site is a worse starting point than one page that works.

⚠️ **THERE IS NO BUILD STEP AND NOTHING TO `npm install`.** If you find yourself
reaching for a bundler, a framework or a lockfile, you have misread the repo.
Every page is one HTML file with ES modules. `node demo/server.mjs` serves it.

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
them what the answer decides. Checked against Cloudflare's pricing pages
**2026-09-24**; they change, and the Cloudflare docs MCP from step 0 can
re-check any line of it.

**On the free plan you can have:**

- **Workers with static assets.** The site itself. Static asset requests are
  free and unlimited on both plans.
- **Durable Objects**, which is what a shared room, a fired cue and a message
  history are made of here. Free plan supports the **SQLite storage backend**,
  which is the only backend a new namespace can use anyway.
- **R2**, for recordings and archives: **10 GB stored, 1 million writes, 10
  million reads per month, and no egress charge at all.**

**These cost money, and you stop and ask before touching either:**

- **Cloudflare Stream**, for live video. **Prepaid, $5 per month per 1,000
  minutes stored, plus $1 per 1,000 minutes delivered. No free tier.** It is
  what `llhls` and `webrtc` play.
- **Containers**, which run ffmpeg beside a Worker in `workers/pub/`. Included
  in the **$5 per month Workers Paid plan** and **not available on free at
  all**.

✅ **SO THE HONEST ANSWER TO "DO I HAVE TO PAY?" IS NO, FOR MOST OF IT.** The
front page, the timeline pages, the archive pages, the MIDI pages, the messaging
pages and the recorder all run on the free plan. Live video does not. Say that,
and let them choose, rather than quietly building the half that needs a card.

---

## Step 4. A domain, which is optional and preferred

Ask whether they have a domain. If they do not, `workers.dev` genuinely works
and they can move later. **Explain why a domain is better rather than asserting
it**, because a non-developer has no way to weigh this otherwise:

1. **A worker's free hostname contains its script name.** Renaming a Worker
   creates a new one and abandons the Durable Object holding its state, so the
   script name tends to be permanent. This site's worker is STILL called
   `elektron-view`, two project renames later, and on `workers.dev` that fossil
   would be the address everybody types.
2. **Related services want to live together.** This site runs the pages, a
   device log at `pub.`, a signalling relay at `rtc.` and a recorder at
   `selfrec.` on one domain. On `workers.dev` those are four unrelated strings.
3. **`workers.dev` is on the Public Suffix List**, so browsers treat every
   subdomain under it as a separate site.
4. **A link is a thing you hand to a person.** `positron.studio/stage/` can be
   said out loud, printed beside an installation, or put in a QR code.

⚠️ A fifth reason is often given, that some corporate and school networks block
`*.workers.dev` as shared hosting. **That is reported and not measured here.**
Say so if you repeat it.

Cloudflare's registrar sells at cost and a domain bought there is already on the
account you are deploying to, which removes the only fiddly step. Adding a
custom domain to a Worker is one dashboard action or one line of
`wrangler.jsonc`.

---

## Step 5. Now ask what they actually want

They already said something, and it is probably the name of a demo. **Open that
demo and read it before you plan anything.** Every page here is one file and it
explains itself.

**Worked example, the one the README ships with: *"I want to build something
like that stage demo."***

`/stage/` puts a recorded performance in front of a room of people, asks them
something, and keeps every answer on the recording's own timeline. What that
actually needs, in the order it has to exist:

| part | where it is here | free? |
| --- | --- | --- |
| a page with a transport bar and a timeline strip | `demo/shell/`, `timeline/` | yes |
| a film to play | `demo/resources/`, or R2 for anything large | yes |
| a second screen for the audience, on their phones | `workers/` relay over WebSockets and a Durable Object | yes |
| answers landing on the recording's timeline | the same Durable Object | yes |
| a live camera instead of a recording | Cloudflare Stream | **no, paid** |

So the honest plan is: **build the whole of it on the free plan**, and leave the
live-camera variant as a later step they can pay for if they ever want it.
✅ **THAT DECOMPOSITION IS THE POINT OF THIS STEP.** Do it out loud for whatever
they asked for, before writing a line, so they can see what they are getting and
what it costs.

---

## Step 6. Build the smallest thing and deploy it

🔴 **GET ONE PAGE LIVE BEFORE BUILDING ANYTHING GOOD.** A non-developer who has
not yet seen their own URL has no idea whether any of this is working, and every
minute after that is spent debugging two things at once.

```sh
node demo/server.mjs                    # the whole repo, locally
cd workers/view && node build.mjs       # ALWAYS build before deploying
npx wrangler deploy
```

Then **give them the URL**, and open it yourself to check it answers before you
do. A path is not an answer to "where is it": `demo/stage/index.html` is the
file you edited and `https://<their site>/stage/` is the thing they asked for.

---

## What to copy, and what not to

✅ **COPY THE SHAPE.** One page per idea, one file each. One manifest that both
index renderers read. A kit of controls in `demo/shell/` rather than a control
hand-rolled per page. A harness that drives the real page through a real browser
and asserts on what it publishes. Read `CLAUDE.md` and the other skills in
`.claude/skills/` for the rules and, more usefully, for what each one cost.

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

# How to distribute positron's skills, 2026-10-14

Research only. Nothing was registered, created, committed or pushed. Asked:
*"In bg investigate how we should distribute our skills"*.

Every channel fact below was read from the vendor's own documentation or source
on 2026-10-14 and is marked **VERIFIED**. Anything reasoned from those facts is
marked **INFERENCE**. Line numbers into `.claude/skills/` are as of the morning
of 2026-10-14 while another agent was rewriting those files, so they move.

## 0. The fact that changes the question

**VERIFIED 2026-10-14: `github.com/kristjanjansen/positron` IS PUBLIC.**
`api.github.com/repos/kristjanjansen/positron` answers anonymously with
`"private": false, "visibility": "public"`, created 2026-09-24, last pushed
2026-10-12 20:47. All 12 skills are in `origin/main` and
`raw.githubusercontent.com/.../positron-verify/SKILL.md` answers 200 to anybody.
The local `main` is 231 commits ahead of `origin/main`.

So the brief's premise, *"how private skills stay in this repo"*, does not hold
today. Every skill, including the lines listed in section 2 as must-not-leave,
already left on the last push. Three consequences:

1. **They are already installable by anybody, by a tool that is not ours.**
   `npx skills add kristjanjansen/positron` scans `.claude/skills/` (it is in
   the CLI's discovery list, see 1.2). Run locally against this checkout with
   telemetry off, `npx skills@1.7.2 add ./ --list` found **8 of 12**:
   concepts, describe, diagram, hardware, history, slides, start, verify.
   `skills.sh/kristjanjansen/positron` answers 404 today, so nobody has
   installed it through that CLI yet (the site lists repos from install
   telemetry, see 1.2).
2. **The 4 it missed are missed because their frontmatter is not valid YAML.**
   compose, streaming, ui and xr are exactly the four whose `description:`
   contains an unquoted `: `, which a strict YAML parser reads as a second
   mapping key. Claude Code tolerates it (all 12 load here). The skills CLI
   does not, and other agents may not either (INFERENCE for agents not
   tested). The fix is to quote those four descriptions. That is for the agent
   rewriting the skills, not for this document.
3. **Any "keep it private" plan has two halves: stop adding to what is public,
   and decide about what already is.** The second half is a history question
   and the owner's call, see section 4, step 0.

## 1. The channels as they stand, 2026-10-14

### 1.1 Claude Code plugins and plugin marketplaces

Sources: code.claude.com/docs/en/plugins/create-marketplace,
/plugins/host-marketplace, /plugins/publish, /plugins/manifest-reference,
/plugins/marketplace-reference, /skills. All VERIFIED 2026-10-14.

- **What it is.** A git repo (or a URL, or a shared directory) holding
  `.claude-plugin/marketplace.json` with `name`, `owner` and a `plugins` array.
  Each entry has a `name` and a `source`: a relative path inside the repo,
  `github` (`owner/repo`, optional `ref` and `sha`), `git-subdir` (a
  subdirectory of another repo, partial clone), `url`, `archive` (a zip over
  HTTPS, pinned by `sha256`), `npm`, or `command`. A plugin is a directory with
  an optional `.claude-plugin/plugin.json` and `skills/<name>/SKILL.md`.
- **Install.** `claude plugin marketplace add positron-studio/skills`, then
  `claude plugin install <plugin>@<marketplace-name>`. In a session:
  `/plugin marketplace add ...` and `/plugin install ...`. Since v2.1.292 one
  shell command does both:
  `claude plugin install <plugin> --marketplace positron-studio/skills`.
  A project can register it for everyone who trusts the folder with
  `claude plugin marketplace add ... --scope project`, which writes
  `.claude/settings.json`.
- **Namespacing.** Every plugin skill runs as `/<plugin-name>:<skill-name>`.
  A plugin skill and a same-named skill anywhere else **both load**, because of
  that prefix. This is the only channel where the name clash with Posit is
  solved by the tool rather than by us.
- **Updates.** Background auto-update is **off** for a third-party marketplace
  by default and `marketplace.json` has no field to turn it on; each user turns
  it on in `/plugin` under Marketplaces, or runs
  `claude plugin update <plugin>@<marketplace>`. A user gets a new copy only
  when the plugin's **computed version** changes.
- **Versioning.** `version` in `plugin.json` (not checked against semver)
  *"pins the plugin to that version until you change it"*: push commits without
  bumping it and users keep the old copy. **Omit `version` and users track the
  commit SHA.** Pinning: `ref`/`sha` on the entry, `#<ref>` on the add command,
  `<plugin>--v<version>` tags via `claude plugin tag`. Release channels are two
  marketplaces with different `name`s pointing at different refs.
- **Renames are expensive.** `name` is permanent; a rename needs a `renames`
  map in `marketplace.json`. Choose the plugin name once (section 3).
- **Reserved.** Plugin names starting `claude-`, `anthropic-`, `cc-plugin-`
  are errors. Skill folders named `synced` or `anthropic-skills` do not load.
- **Validation.** `claude plugin validate --strict .` before every push.
- **Beyond Claude Code.** The plugin format itself is Claude Code's. But the
  skills CLI (1.2) reads `.claude-plugin/marketplace.json` and
  `plugin.json` and installs the skills they declare to 70+ agents, and Cursor
  imports skills from GitHub only *as a plugin through a marketplace* (it wants
  `.cursor-plugin/marketplace.json`, VERIFIED on cursor.com/docs/context/skills).
  So a marketplace repo with skills at standard paths serves Claude Code
  natively and everybody else through the skills CLI.

### 1.2 skills.sh and `npx skills`

Sources: github.com/vercel-labs/skills README, the published package
`skills@1.7.2` (latest on npm, read 2026-10-14), skills.sh. VERIFIED.

- **Install.** `npx skills add <owner>/<repo>` (also any git URL, a tree URL to
  one skill, a local path, or an HTTPS URL to a single `SKILL.md` or archive).
  `--skill <name>` picks skills, `-a claude-code -a codex ...` picks agents,
  `-g` installs to the user directory, `--copy` copies instead of symlinking,
  `--list` lists. `npx skills use owner/repo@skill | claude` runs one without
  installing.
- **Where it installs.** Per agent: Claude Code `.claude/skills/`; Codex,
  Cline, Warp, Zed, Pi and others `.agents/skills/`; Cursor `.agents/skills/`
  (project) and `~/.cursor/skills/` (global); 70+ agents in the table.
  Default is a symlink to one canonical copy.
- **Discovery inside a repo.** Root `SKILL.md`, `skills/`, `skills/.curated/`,
  `.agents/skills/`, `.claude/skills/` and about 50 more agent folders, walked
  three levels deep, **plus anything declared in
  `.claude-plugin/marketplace.json` or `plugin.json`**.
- **Hiding a skill.** `metadata: { internal: true }` hides a skill from
  discovery unless `INSTALL_INTERNAL_SKILLS=1`. This is a usable fence for
  project-only skills that live in a public repo (INFERENCE that it is enough:
  it hides from the CLI, not from GitHub).
- **Updates.** `npx skills update` (or `-g`, `-p`, by name). The CLI records a
  per-skill folder hash in `skills-lock.json` (project) or `.skill-lock.json`;
  for GitHub sources it compares against the git tree SHA of the skill folder
  (`getSkillFolderHashFromTree` in `dist/cli.mjs`). No version field, no
  pinning to a tag beyond pointing the source at a ref (INFERENCE from the
  source: a tree URL with a branch or tag is how to pin).
- **Listing on skills.sh.** There is no registration. Repos appear from
  install telemetry, which is sent *"only for repositories that GitHub
  positively confirms are public"*. `DISABLE_TELEMETRY=1` turns it off.
  skills.sh also runs security audits on confirmed-public repos.
- **Own-domain discovery, not in the brief and worth having.** The CLI
  resolves `npx skills add https://positron.studio` through
  `/.well-known/agent-skills/index.json` (or `/.well-known/skills/index.json`).
  A v2 entry is `{ name, description (max 1024), type: "skill-md" | "archive",
  url, digest: "sha256:<64 hex>" }`. VERIFIED in `dist/cli.mjs` lines
  3134 to 3300. That puts the install command on the site's own domain with
  no GitHub org at all, and the view worker already serves static files.
- **Beyond Claude Code.** This is the cross-agent channel. It is the only one
  in this list that writes into Codex's and Cursor's own folders.

### 1.3 Anthropic's Agent Skills (claude.ai, API, directory)

Sources: platform.claude.com/docs/en/agents-and-tools/agent-skills/overview,
code.claude.com/docs/en/plugins/publish and /plugins/anthropic-marketplaces.
VERIFIED 2026-10-14.

- **claude.ai.** Upload a skill as a zip under Settings > Features. Pro, Max,
  Team, Enterprise, with code execution on. *"Custom Skills are individual to
  each user."* Network access *"may be full, partial, or no"*.
- **Claude API.** `/v1/skills` endpoints, workspace-wide, versioned on the
  API. Skills run in the code execution container with **no network access**.
- **They do not sync.** *"Skills uploaded to claude.ai must be separately
  uploaded to the API ... Claude Code Skills are filesystem-based and separate
  from both."* ⚠️ The Claude Code skills page says the opposite in one place:
  it lists *"claude.ai account: skills enabled for your claude.ai account"* as
  loading in terminal sessions signed in with that account. Both read
  2026-10-14; which is current is unsettled.
- **Anthropic's directory** (claude.ai/directory) lists **plugins**, submitted
  from claude.ai/directory/manage, needs a paid plan, is reviewed, and reaches
  claude.ai, Cowork and Claude Code (as `<name>@synced`). Updates reach users
  after the pushed version is published. The official marketplace
  `claude-plugins-official` takes no submissions through that portal; the
  community marketplace `anthropics/claude-plugins-community` holds
  *"third-party plugins that their authors submitted"*.
- **Fit for positron.** Poor for `positron-start`: it exists to run `node`,
  `npx wrangler` and `curl` against the person's Cloudflare account, and the
  API surface has no network at all (INFERENCE: it cannot do its job there).
  The writing skills (describe, slides) would work on claude.ai. The
  directory is a later step, after a marketplace exists and has been used.

### 1.4 An npm package

VERIFIED 2026-10-14 from the marketplace reference and the skills README.

- No agent installs skills from npm on its own. npm reaches skills in exactly
  one documented way: a Claude Code marketplace entry with
  `"source": { "source": "npm", "package": "@positron-studio/skills",
  "version": "^1" }`, fetched with install scripts disabled. The skills CLI
  has no npm source.
- What npm adds over git: real semver and dist-tags. What it costs: a second
  publish step and an npm account with 2FA.
- **INFERENCE: not worth doing as a channel.** Worth doing as a name hold,
  which the 2026-10-13 names note already recommends (`@positron-studio` and
  unscoped `positron-studio`, which by npm's similarity rule also blocks the
  other three spellings).

### 1.5 Plain clone, copy, or a URL

- **Copy into `.claude/skills/`** (Claude Code), `.agents/skills/` (Codex,
  Cursor and most others), `~/.claude/skills/` for every project. VERIFIED:
  Claude Code watches these directories and picks up edits in-session; Codex
  reads `.agents/skills` up to the repo root, `~/.agents/skills` and
  `/etc/codex/skills`, and its docs do not mention `.claude/skills`; Cursor
  reads `.agents/skills`, `.cursor/skills` and *"for backward compatibility"*
  `.claude/skills` and `.codex/skills`.
- **Updates**: none. A copy is frozen. `positron-start` already says so in its
  own header (*"The checkout wins silently for that reader"*).
- **The URL door is what positron uses today**, and it is the most portable
  channel there is: the README prompt tells any agent to read
  `raw.githubusercontent.com/kristjanjansen/positron/main/.claude/skills/positron-start/SKILL.md`.
  Nothing is installed, it is current by construction, and it works in any
  agent that can fetch a URL. Its costs, both already written in the skill:
  raw GitHub caches for a few minutes, and an agent that cannot reach the URL
  may search instead (README: Codex in a sandbox *"found a different product
  that happens to share the name"*, which is the Posit collision already
  biting).

### 1.6 Anything else current

- **`claude --plugin-dir <dir or .zip>`** and `--plugin-url <zip>` load a
  plugin for one session. VERIFIED. Useful for a reviewer, not a channel.
- **Organization settings sync on claude.ai** (Team, Enterprise) syncs a
  **private** marketplace repo to an org. Not relevant: no org here.
- **Agent Skills standard** (agentskills.io/specification, VERIFIED): `name`
  1 to 64 chars, lowercase, digits, single hyphens, **must match the parent
  directory**; `description` 1 to 1024 chars; optional `license`,
  `compatibility` (max 500), `metadata` (string map), `allowed-tools`.
  *"Keep your main SKILL.md under 500 lines. Move detailed reference material
  to separate files."* positron's skills run 102 to 1,986 lines; five are over
  800. That matters only for the public ones (section 4).

### 1.7 The channels side by side

| channel | install | updates | versioning | beyond Claude Code |
| --- | --- | --- | --- | --- |
| Claude Code marketplace | `claude plugin install p --marketplace o/r` | manual, or auto-update the user switches on | `version` bump, or commit SHA if omitted; refs, tags | through the skills CLI reading the same repo; Cursor wants its own marketplace file |
| skills CLI / skills.sh | `npx skills add o/r` or `https://positron.studio` | `npx skills update` | none; folder hash | 70+ agents, writes into each one's folder |
| claude.ai upload | zip in Settings | re-upload | none for the user | claude.ai only |
| Claude API | `/v1/skills` | new version via API | API skill versions | API only, no network |
| Anthropic directory | browse claude.ai | after review | per submission | claude.ai, Cowork, Claude Code |
| npm | only as a marketplace `npm` source | as the marketplace | semver | none directly |
| copy / clone | `cp -r` | none | none | any agent, by folder |
| raw URL | "read this URL" | always current, minus a few minutes of cache | none | any agent that can fetch |

## 2. What should be distributed, skill by skill

Read 2026-10-14. Sizes are `wc -l` that morning.

| skill | lines | sort | why |
| --- | --- | --- | --- |
| `positron-start` | 1115 + PARTS 144 | **PUBLIC, the entry point** | already written for strangers and any agent; the one skill that is meant to leave |
| `positron-describe` | 240 | **PUBLIC after an edit** | the method (100 characters, verify against the page first, subject first, overstatement and understatement) is general; the examples are this site's cards |
| `positron-slides` | 102 | **PUBLIC after a provenance check** | almost entirely general writing guidance. But it says it was *"Added 2026-10-07 from a general slide-writing skill the owner supplied"*. Who wrote that source and under what licence is not recorded. Settle that before publishing |
| `positron-compose` | 808 | **PUBLIC after a real rewrite** | the principles are general (air belongs to the relationship, a thing is its own size, glued surfaces, the phone, read the computed value). The body is built from this site's pages and corrections in the owner's words (21 quoted lines) |
| `positron-diagram` | 250 | **PUBLIC later, maybe** | general rules about boxes, labels and arrows, but it governs `demo/shell/diagram.mjs`. Useful to somebody only once they have that module, which `positron-start` builds them a version of |
| `positron-concepts` | 305 | project | concept pages, `CONCEPT_DIRS`, the front page cards; meaningless outside this tree |
| `positron-ui` | 1986 | project | the kit in `demo/shell/` |
| `positron-verify` | 1494 | project, with private lines | this repo's harnesses; contains several of the lines below |
| `positron-streaming` | 1471 | project, with a public core | the provider facts (LL-HLS, WHEP, Stream, Durable Object limits, bills) are valuable to anybody; `positron-start` already sends readers to it by raw URL. Treat as a later public reference, not a skill to ship |
| `positron-xr` | 151 | project | Quest and phone fullscreen notes tied to this kit; small and could be generalised later |
| `positron-history` | 379 | **private** | renames and retirements of this site; worthless outside and full of instructions quoted verbatim |
| `positron-hardware` | 179 | **private** | one desk, one Pi, one Circuit |

### Content that must not leave, wherever it is

These are on GitHub today (section 0). Listed so the owner can decide what to
remove from the working tree before the next push, and whether history
matters.

- **The owner's first name, attached to a third party's words.**
  `positron-verify` (about line 181): *"ERR SAID SO, 2026-09-16, RELAYED TO
  KRISTJAN"* followed by ERR's own sentence in Estonian. A public
  broadcaster's private remark about its audience figures, attributed and
  dated. The rule it supports can stay; the quote and the name should not be
  in a public file. The same quote is in `CLAUDE.md` and `AGENTS.md` paraphrases
  it, so this is a repo question, not only a skills one.
- **The pack and the private repo that holds it.** `positron-hardware` (about
  line 101) names `<private-pack-repo>` and the path
  `circuit/2026-09-20-circuit.circuitpack` inside it; `positron-verify` (about
  1416 and 1442) names `New Pack.circuitpack` and `session_0`. The pack
  itself is NOT in any skill. Naming a private repo and the file in it is a
  pointer, not the content, and a low risk, but CLAUDE.md treats the owner's
  sessions as *"mine. very important"*, so the pointer does not belong in a
  file written for strangers.
- **Machine and network facts.** `positron-hardware` line 56
  `ssh positron@<ip> hostname -s` (the Pi's login user), the hostname
  `raspberrypi`, and *"a Raspberry Pi in another building"*;
  `positron-verify` and `positron-hardware` name the machines `studio-1` and
  `m1-1`. No IP address, key or token appears in any skill (grepped for key
  prefixes, 40+ character tokens and IPv4 addresses 2026-10-14; the only long
  hex is the public sha256 of hls.js 1.7.1, and the only IP is 127.0.0.1).
- **Account and bucket names.** `positron-start` carries
  `kristjanjansen/positron` in six URLs (fine while that repo is the source,
  wrong the day the public copy moves); `positron-streaming` names
  `kristjanjansen/eccm` and an R2 prefix `kristjanjansen/`.
- **Quoted instructions in general.** about 110 `*"..."*` quotes (counted 2026-10-14) across the
  skills, most of them the owner's own words to an agent (*"its a mess"*,
  *"do not do vert layouts on desktop"*). They are the owner's to publish, and
  CLAUDE.md says they are why a rule survives being argued with. They are also
  the register `positron-start` itself warns against copying. For a public
  skill, cut them; for a private one, keep them.

## 3. Naming

**VERIFIED 2026-10-13 (names note) and 2026-10-14:** `skills.sh/posit-dev/positron`
answers 200 and holds 42 `positron-*` skills; `skills.sh/positron-studio` and
`skills.sh/kristjanjansen/positron` answer 404.

What the prefix does on each channel:

- **Claude Code plugin**: skills run as `/<plugin>:<skill>`. A plugin named
  `positron-studio` with a skill `start` is `/positron-studio:start`. No
  collision possible.
- **skills CLI**: the source is namespaced (`positron-studio/skills`), but the
  **installed folder is the bare skill name**, because the standard requires
  `name` to equal the directory. Install Posit's `positron-qa-verify` and ours
  `positron-verify` into one project and they sit side by side in
  `.claude/skills/` as one apparent family. A generic bare name (`start`,
  `compose`) would collide with the next publisher who picks it.
- **Search and agents that guess**: the README already records an agent that
  could not fetch the file searching for "positron" and planning for Posit's
  IDE. A prefix that says `positron` alone keeps paying that.

**Recommendation (INFERENCE):**

1. **Rename the public skills; leave the private ones alone.** The private
   ones never need to leave, and renaming 12 skills means rewriting every
   cross-reference in CLAUDE.md, AGENTS.md and the skills themselves,
   which is the sweep the history skill exists to record.
2. **Public skill names carry `positron-studio-`, not `positron-`**:
   `positron-studio-start`, `positron-studio-describe`,
   `positron-studio-slides`, `positron-studio-compose`. Long, but it is the
   org name, it matches the domain, and it cannot be read as Posit's. All
   under 64 characters.
3. **The plugin name is `positron-studio`** and the marketplace name is
   `positron-studio` too, so the install line reads
   `claude plugin install positron-studio --marketplace positron-studio/skills`.
   Inside Claude Code that gives `/positron-studio:positron-studio-start`,
   which is redundant. Accept it: the alternative (bare skill names inside the
   plugin) breaks the skills-CLI install, which uses the same folders.
4. **Do not rely on the owner/repo prefix alone.** It exists at install time
   and is gone from the installed folder.

## 4. Recommended setup

### The shape

```
positron-studio/skills            (new, public, the only thing strangers install)
  README.md                       the prompt and three install lines
  LICENSE                         MIT, matching this repo's code licence
  .claude-plugin/marketplace.json one marketplace, one plugin, source "./"
  .claude-plugin/plugin.json      name positron-studio, no version (SHA tracking)
  skills/
    positron-studio-start/SKILL.md     + PARTS.md
    positron-studio-describe/SKILL.md
    positron-studio-slides/SKILL.md    (after the provenance check)
    positron-studio-compose/SKILL.md   (after the rewrite)

kristjanjansen/positron           (this repo, unchanged layout)
  .claude/skills/positron-*/      all 12, the working set, owner's voice
  tools/export-skills.mjs         copies the public ones out (step 4)

positron.studio
  /.well-known/agent-skills/index.json   points at the public SKILL.md files
```

Why a separate public repo rather than a marketplace file in this repo
(INFERENCE): this repo carries the committed build artefact, vendored WASM, recordings and
every private skill; a marketplace here would make `npx skills add` find all
12 by default, and every stranger's install would clone all of it. A small
repo keeps the public surface to exactly what was chosen, and its history
contains only what was published on purpose. Its cost is one sync step.

### Steps

Marked **[OWNER]** where it needs an account, a registration, a decision
about history, or anything on GitHub.

0. **[OWNER] Decide about what is already public.** Options, cheapest first:
   (a) accept it and remove the lines in section 2 from the working tree before
   the next push, so they stop being current; (b) also rewrite history with
   `git filter-repo --replace-text` as was done for the pack. CLAUDE.md's own
   rule is that *"a public clone cannot be recalled"*, so (b) only helps
   against people who have not cloned yet; the repo shows 0 stars. (c) make
   `kristjanjansen/positron` private again, which breaks the README prompt's
   raw URL and is only sensible after step 5 moves that door. This document
   recommends (a) now and (c) not at all, but the AGPL note in `NOTICE.md`
   says two pages oblige the source to be offered, which is a reason the repo
   is public in the first place.
1. **Quote the four broken descriptions** (compose, streaming, ui, xr) so the
   frontmatter is valid YAML. For the agent that owns those files.
2. **Fence the project skills from the skills CLI** while they live in a
   public repo: add `metadata:` with `internal: "true"` to the ten that are
   not public (VERIFIED behaviour in the CLI README; the spec wants string
   values, and whether the CLI reads `"true"` as true is UNTESTED). Then
   `DISABLE_TELEMETRY=1 npx skills add ./ --list` should list nothing.
3. **[OWNER] Create the GitHub org `positron-studio`** (free on 2026-10-13)
   from the personal account, and the public repo `positron-studio/skills`.
   ```sh
   gh auth switch --user kristjanjansen
   gh repo create positron-studio/skills --public --description "Agent skills for building a positron-shaped site on Cloudflare"
   gh auth switch --user <work-account>
   ```
   The org itself is created at github.com/organizations/plan; `gh` cannot
   create an org.
4. **Write `tools/export-skills.mjs` in this repo** (INFERENCE, design only).
   It reads a list of `{ from, to, mode }`:
   - `start`: `mode: "generated"`. Copied on every export, with
     `kristjanjansen/positron` raw URLs rewritten to
     `positron-studio/skills/main/skills/positron-studio-start/...`, and the
     `name:` rewritten.
   - `describe`, `slides`, `compose`: `mode: "fork"`. Written once by hand
     for strangers. The export never overwrites them; it prints the source
     skill's commits since the fork's recorded `metadata.source-commit`, so
     the owner sees what changed upstream and decides what to carry over.
   - **A deny gate that fails the export** if any output contains `KRISTJAN`,
     `<private-pack-repo>`, `circuitpack`, `session_`, `studio-1`, `m1-1`,
     `positron@`, `ERRil`, a `/Users/` path, or an IPv4 address other than
     127.0.0.1. Prove it fires once by exporting a file with one planted
     (CLAUDE.md's own rule for guards).
   Why fork rather than generate the three writing skills: their public form
   is a different document (no quotes, no `demo/shell/` paths, under 500 lines
   per the standard), so a mechanical strip of a private file would publish a
   private file with holes in it. `start` is different because it is already
   written for strangers.
5. **Fill the public repo and validate.**
   ```sh
   node tools/export-skills.mjs --out ../positron-studio-skills
   cd ../positron-studio-skills
   claude plugin validate --strict .        # drop --strict while version is omitted
   DISABLE_TELEMETRY=1 npx skills add ./ --list
   claude plugin marketplace add ./ && claude plugin install positron-studio@positron-studio
   ```
   `.claude-plugin/marketplace.json`:
   ```json
   {
     "name": "positron-studio",
     "owner": { "name": "positron.studio", "url": "https://positron.studio" },
     "plugins": [ { "name": "positron-studio", "source": "./",
       "description": "Stand up a positron-shaped site on Cloudflare, and write and lay out its pages" } ]
   }
   ```
6. **[OWNER] Push it** (personal account, as above).
7. **Move the front door.** Change the README prompt's raw URL in this repo to
   `https://raw.githubusercontent.com/positron-studio/skills/main/skills/positron-studio-start/SKILL.md`,
   and the six URLs inside `positron-start`. Keep the private
   `positron-start` in this repo as the working copy the export reads.
8. **Serve the same skills from the site** so the domain is the install
   address: have `workers/view/build.mjs` write
   `/.well-known/agent-skills/index.json` (v2 entries with `sha256` digests)
   and the public `SKILL.md` files. Then
   `npx skills add https://positron.studio` works with no GitHub in the
   sentence, and the hero's *"Delivered as agentic skills"* can link to one
   page that shows the three install lines.
9. **[OWNER, later] Hold the npm names** (`@positron-studio`,
   `positron-studio`) per the names note. Not a channel.
10. **[OWNER, later, paid plan] Submit to Anthropic's directory** from
    claude.ai/directory/manage once the marketplace has been used by somebody
    other than the owner. It is reviewed, so it is the last step, not the
    first.

### Versioning

- **Plugin: omit `version`** so Claude Code users track the commit SHA. A
  docs-only plugin has nothing to gain from semver, and a forgotten bump
  silently strands every user on the old copy (VERIFIED behaviour).
- **Each public skill keeps a date revision in its own text and frontmatter**
  (`metadata: { revision: "2026-10-14" }`), because `positron-start` already
  asks the agent to *say the revision out loud*, and that is the version a
  person can read. The skills CLI ignores it; it compares folder hashes.
- **Tag releases** `v2026.10.14` in the public repo when something
  substantial lands, so anybody can pin with
  `claude plugin marketplace add positron-studio/skills#v2026.10.14`.

### How `positron-studio-start` is the entry point

Four doors, one file, all pointing at the public repo:

| who | they run or paste |
| --- | --- |
| anybody, any agent, nothing installed | the README prompt: *"read https://raw.githubusercontent.com/positron-studio/skills/main/skills/positron-studio-start/SKILL.md and follow it"* |
| Claude Code | `claude plugin install positron-studio --marketplace positron-studio/skills`, then *"I want to build something like positron"* |
| Codex, Cursor, others | `npx skills add positron-studio/skills -a codex` (or `-a cursor`), or `npx skills add https://positron.studio` |
| a clone of the public repo | nothing; `.claude-plugin` and `skills/` are discovered |

`positron-studio-start` then names the other public skills by their public
names when it needs them (describe for words, compose for layout), and links
to `positron-streaming` in this repo by raw URL for the provider facts, as it
does today, until that has a public form of its own.

## What this could not settle

- Whether the skills CLI treats `internal: "true"` (a string, as the spec
  requires) the same as `internal: true`. Measure with step 2's `--list`.
- Whether Codex's own loader, and any agent other than the skills CLI,
  rejects the four unquoted descriptions. Only the skills CLI was run.
- Which Anthropic page is current on claude.ai skills syncing into Claude
  Code (section 1.3).
- The licence of the source behind `positron-slides`.
- Whether anybody has already cloned the public repo. GitHub shows 0 stars;
  clone counts need the owner's traffic page (Insights, Traffic), logged in.

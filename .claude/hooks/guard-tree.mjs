#!/usr/bin/env node
// guard-tree.mjs — refuse the git commands that sweep a shared checkout.
//
// 🔴 WHY THIS IS A PROGRAM AND NOT A SENTENCE. CLAUDE.md has carried the rule
// since it was learned: *"A background agent must not commit. `git add -A` in a
// shared checkout sweeps another agent's in-flight work into an unrelated
// commit. It happened twice in one session"* — `timeline/score.mjs` and
// `csound.mjs` landed inside a commit about `loops`, and `04-score/index.html`
// inside one about a plan document. The code was right and the history lied
// about it, which is worse than either alone, because a reader doing
// archaeology trusts the message.
//
// `verify.mjs` says it best, about its own version of this problem: a rule to
// remember is *"the weakest kind of guard: it only fires if the person reading
// the output happens to recall it."* It fixed that by making the harness SAY IT
// at the moment the output is read. This is the same move, one step earlier —
// at the moment the command is typed, which is the only moment that helps.
//
// ⚠️ IT DOES NOT BLOCK COMMITTING. `git commit -m` with paths staged BY NAME is
// the thing the rule asks for and it stays. Only the whole-tree forms go.
//
// Contract: PreToolUse hook. Tool call JSON on stdin; exit 0 allows, exit 2
// refuses and shows stderr to the agent.
let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let cmd = '';
try { cmd = JSON.parse(raw || '{}')?.tool_input?.command ?? ''; } catch { process.exit(0); }
if (!cmd) process.exit(0);

// A deliberate, visible override. The failure this prevents is REFLEX, not
// intent — an agent that has actually thought about it can say so.
if (process.env.POSITRON_ALLOW_WHOLE_TREE === '1') process.exit(0);

// ⚠️ SPLIT THE LINE FIRST. `grep 'git add -A' LESSONS.md` is a reasonable thing
// to run in this repo and must not be refused, so the patterns below are
// anchored to a segment that STARTS with git rather than matched anywhere in
// the string. Quoting is not parsed — this errs toward allowing, which is the
// right direction for a guard whose false positive blocks real work.
const segments = cmd.split(/(?:&&|\|\||[;\n|])/).map((s) => s.trim());

// [ test, what it would do, what to do instead ]
const RULES = [
  [/^git\s+add\s+(?:.*\s)?(?:-A|--all|-{1,2}[A-Za-z]*A[A-Za-z]*\b|\.|:\/)(?:\s|$)/,
   'stages every modified file in the checkout, including another agent\'s in-flight work',
   'git add <path> <path> — stage the paths you changed, by name'],
  [/^git\s+commit\s+(?:.*\s)?-[A-Za-z]*a[A-Za-z]*(?:\s|$)/,
   'commits every tracked modification, including work that is not yours',
   'git add <path> && git commit -m "…"'],
  [/^git\s+reset\s+(?:.*\s)?--hard/,
   'discards every uncommitted change in the checkout, with no way back',
   'git restore <path> — name the file you want reverted'],
  [/^git\s+clean\s+(?:.*\s)?-[A-Za-z]*[fd]/,
   'deletes untracked files, which is where another agent\'s new work lives before its first commit',
   'git clean -n first, then remove by name'],
  [/^git\s+(?:checkout|restore)\s+(?:--\s+)?\.(?:\s|$)/,
   'throws away every uncommitted change in the tree',
   'git restore <path> — name the file'],
  [/^git\s+stash(?:\s+(?:push|save))?\s*(?:-[A-Za-z-]+\s*)*$/,
   'hides the whole tree, including changes another agent is mid-edit on',
   'git stash push <path>, or leave it alone'],
];

for (const seg of segments) {
  for (const [re, does, instead] of RULES) {
    if (!re.test(seg)) continue;
    console.error(
      `REFUSED — \`${seg}\`\n\n`
      + `  This ${does}.\n`
      + `  Another agent works in this checkout; its dirty files are not yours to move.\n\n`
      + `  Instead: ${instead}\n\n`
      + `  CLAUDE.md: "Agents report; the session commits. And when a commit must be\n`
      + `  made while an agent is running, stage the paths by name — never git add -A."\n`
      + `  It cost this repo two mis-attributed commits in one session.\n\n`
      + `  Run \`git status --porcelain\` and stage what you actually touched.`);
    process.exit(2);
  }
}
process.exit(0);

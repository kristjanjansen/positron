# Kit lessons: link-badge.mjs

The long comments cut from `demo/shell/link-badge.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-link-badge.md#<anchor>`.

<a id="header"></a>

## link-badge.mjs, file header

demo/shell/link-badge.mjs: is anything arriving on this link, in three words.

🔴 THE OWNER'S ANSWER, MADE A KIT PIECE, 2026-10-06 (plans/plan-routing-migration.md
§3.7). Asked whether `/stage/` should move onto the patchbay, the owner said
*"i do not about patchbay, perhaps just visual indication of picture
happening"*, and what shipped there is a tag on the picture: STARTING,
RECEIVING, STALLED. That is the UI a page that moves onto the patchbay gets,
not a patch view. `/patchbay/` stays the one place links are drawn and made.

🔴 OUTCOME, NEVER INTENT, AND THE COUNT IS TAKEN ON THE FAR SIDE. A press only
makes it `starting`. `receiving` needs a number that GREW, read from an
opener's `count()`: frames decoded here, PCM frames that reached this page,
pieces ingest acknowledged. CLAUDE.md: *a count is only evidence on the far
side of the boundary*. An opener whose only count is what it sent has no
`count()`, and gets no badge rather than a badge that says `receiving` about
its own queue.

⚠️ THE RULE IS `presenceOf`, THE STAGE'S OWN, NOT A SECOND ONE TYPED HERE: a
count that grew is a heartbeat, `stallMs` is the stall window, one miss is
gone. `linkStateOf` is that rule as a pure function, so a page can feed it
fixtures in its own check pass.
⚠️ HIDDEN WHILE `unknown`, which is before a start and after a stop, as the
stage hides its tag when there is nothing to receive.

<a id="pres-null"></a>

## link-badge.mjs, createLinkBadge(), pres

⚠️ `let` AND A NULL CHECK: `createPresence` calls `onChange` once while it
is still being built, before `pres` holds anything.

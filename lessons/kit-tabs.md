# Kit lessons: tabs.mjs

The long comments cut from `demo/shell/tabs.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-tabs.md#<anchor>`.

<a id="header"></a>

## tabs.mjs, file header

demo/shell/tabs.mjs — the parts of one page, named across the top.

🔴 A HASH, NOT A SUBPAGE, AND THE REASON IS THE INSTALLED APP. Asked directly:
*"Second and third tab should be #links? Or subpages?"* A subpage is a
NAVIGATION — the document is thrown away and rebuilt, which on this project's
pages means the audio stops, the deck is rebuilt, the service worker's warm
state goes and an installed web app flashes white on every tab press. A hash
changes one attribute. It is still a real address: shareable, in the history,
answered by the back button, and a notification can open the app straight
onto one part of it.

⚠️ THE TABS ARE NOT A `choice`. `choice.mjs` is a segmented control for
mutually exclusive SETTINGS — armed options inside one box, borders overlapped
so the group reads as one thing. These are places you go. Same shape on screen
would say the same thing about two different acts, which is the drift `/kit/`
exists to catch, so this is its own component rather than a fifth caller of
that one.

⚠️ AND IT SCROLLS RATHER THAN WRAPPING, for the reason the option rows do:
MEASURED on a 390 px phone, three names wrapped a tab onto two lines and cut
the third mid-word. `flex: 0 0 auto` plus an overflowing row keeps every name
whole and lets the row move.

<a id="create-tabs"></a>

## tabs.mjs, createTabs

@param {object} o
@param {Array<{id:string, label:string, disabled?:boolean, note?:string}>} o.tabs
 `disabled` is for a part that EXISTS AND IS NOT BUILT YET. It stays in the
 row, named, unpressable — because a part that is coming and a part that does
 not exist are different facts, and hiding it makes them the same one.
@param {string} [o.at]      the id to open on; the hash wins over it
@param {boolean} [o.hash]   read and write `location.hash` (default true)
@param {(id:string)=>void} [o.onPick]
@returns {{el:HTMLElement, panel:(id:string)=>HTMLElement, go:(id:string)=>void,
          at:()=>string, buttons:HTMLButtonElement[], panels:HTMLElement}}

<a id="replace-state"></a>

## tabs.mjs, go, replaceState

⚠️ `replaceState`, NOT AN ASSIGNMENT TO `location.hash`. Assigning fires
`hashchange`, which this listens to, which calls `go` again — harmless
only because the second call returns on `id === cur`. Writing history
directly says what is meant and leaves one entry per press.

<a id="enable"></a>

## tabs.mjs, enable

🔴 A TAB WITH NOTHING BEHIND IT IS SWITCHED OFF, AT RUNTIME. Asked for on
`/pack/` 2026-09-21 against a screenshot of an empty SAMPLES tab holding a
player and a line reading `press a sample to open it here`, with no
samples: *"no samples and make tab disabled"*. A tab is a promise that
there is something under it, and an empty one is the same defect as a
column heading over no rows.
⚠️ THE REASON IS ON THE CONTROL, which is the rule the constructor already
follows for a tab that is disabled from the start: a greyed word with no
explanation reads as a fault in the page.
🔴 AND SWITCHING OFF THE OPEN TAB HAS TO MOVE OFF IT, or the page shows a
panel whose tab is greyed and nothing can bring it back. It goes to the
first tab still live.

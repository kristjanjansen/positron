---
type: regex
pattern: (your own|own project|new project|own idiom|your (stack|framework|taste)|beside it)
match: contains
target: last_message
---
The skill's largest claim, and the one that took longest to get right: a stranger
should build their own small project rather than take this repository's code.
MEASURED and written into the skill: almost everything `demo/stage/index.html`
imports is `/shell/`, which is one project's taste in controls, and there is no
package.json anywhere, so the paths resolve only because a dev server serves the
repository root.

Asserted as the claim we want and never as the absence of the word "clone",
because a correct answer may well mention cloning as the thing it is advising
against. That is rule three.

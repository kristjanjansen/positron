# Kit lessons: toggle.mjs

The long comments cut from `demo/shell/toggle.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-toggle.md#<anchor>`.

<a id="header"></a>

## toggle.mjs, file header

demo/shell/toggle.mjs. A button that stays down, in two sizes.

🔴 IT REPLACES `switch.mjs`, ASKED FOR 2026-09-23: *"integrate sustain to
footer, create toggle button, big and small, use small below keyboard, left
from notes off. rm switch button from all uis / kit"*. Three pages drew a
track-and-knob switch and one of them is the gallery.

⚠️ A SWITCH AND A TOGGLE BUTTON ARE THE SAME STATE AND A DIFFERENT CLAIM. A
switch is a SETTING: it sits there saying what the world is like, and its
knob slides. A toggle button is a CONTROL YOU ARE PRESSING: it goes down and
stays down, which is what a sustain pedal, a mute and a record arm all are on
every piece of hardware in this building. The instrument that prompted this
has a footswitch, and a footswitch is a button.

⚠️ THE VOCABULARY IS `check.mjs`'s AND `switch.mjs`'s, DELIBERATELY UNCHANGED.
`checked`, `get()`, `set(on, quiet)`, `disabled(v)` and `onChange(on)` all
mean here exactly what they mean there, so the three pages being swept do not
each learn a second word for one idea. The only new word is `size`, and it is
new because the thing it names is new.

🔴 TWO SIZES, AND THE SMALL ONE EXISTS FOR THE KEYBOARD'S FOOTER. `big` is
34 px, which is what every control on a page is. `small` is 26 px, which is
what `.kpad` already is, and `shell.css` argues that number: 34 minus 8, and
8 px is the gap between two controls, so the step down is a unit of spacing
this layout already uses rather than a number invented here. A full height
button in that row would read as the page's own controls moved under the
keys, which is exactly what the pad was built to stop.

⚠️ `aria-pressed`, NOT `role="switch"`. That is the markup difference behind
the claim above, and it is what a screen reader says out loud: *pressed* for
a button that is down, *on* for a switch that is set. The two are read
differently by people who cannot see which one you drew.

<a id="aria-pressed-state"></a>

## toggle.mjs, createToggle, state in the attribute

⚠️ THE STATE IS AN ATTRIBUTE WITH A VALUE, AND IT IS READ BACK FROM THE
    ATTRIBUTE RATHER THAN FROM A SECOND COPY. `aria-pressed` has to be correct
    for a screen reader anyway, so making it the one source means the picture,
    the announcement and `get()` cannot disagree. A boolean beside it would be
    that disagreement waiting to happen.

<a id="delete-size"></a>

## toggle.mjs, createToggle, data-size deleted

⚠️ DELETED RATHER THAN SET EMPTY. `[data-size]` would match an empty
string, and this project has already shipped a panel that stayed full
screen for the rest of a page's life on exactly that.

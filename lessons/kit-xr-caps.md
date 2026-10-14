# Kit lessons: xr-caps.mjs

The long comments cut from `demo/shell/xr-caps.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-xr-caps.md#<anchor>`.

<a id="header"></a>

## xr-caps.mjs, file header

demo/shell/xr-caps.mjs: can this browser be ASKED to open a headset session,
and what to say to somebody whose browser cannot.

🔴 THE DEFECT THIS EXISTS FOR IS ONE CHARACTER, AND IT SHIPPED ON FOUR PAGES.
Every XR page here wrote the same line:

    navigator.xr?.isSessionSupported('immersive-vr')
      .then(v => vrKnown = v, () => vrKnown = false)

On a browser with no `navigator.xr` AT ALL the optional chain returns
`undefined`, so neither handler ever runs and `vrKnown` stays `null` forever.
`/weight/` then asserted `vrKnown !== null` and reported, to a visitor holding
an iPhone, `FAIL a headset was asked about, both ways`. Reported 2026-09-19
with a photograph of exactly that: *"having no capability is not fail, its
default info"*. iPhone Safari has no `navigator.xr`, which is every visitor
on a phone.

⚠️ SO THERE IS A THIRD ANSWER, AND `demo/shell/caps.mjs` IS THE PRECEDENT.
That file already holds this principle in writing: a probe that could not
answer returns `unknown`, which never blocks, because "we did not look" must
not read as "it is missing". The same idea, one step further: a browser with
no WebXR is not a browser that failed to answer, it is a browser that was
never in a position to be asked, and that is ordinary information about a
phone rather than a fault of the page.

⚠️ THIS IS ONLY ABOUT WHETHER A SESSION CAN BE ASKED FOR. It is NOT the
nativeness probe. CLAUDE.md records that the two catch disjoint things: a
desktop Chrome has a genuinely native `navigator.xr` and answers
`immersive-vr: false`, while the Immersive Web Emulator installs a JavaScript
`XRSystem` that claims everything. `/blocks/` owns the nativeness half and
nothing here duplicates it.

<a id="xr-states"></a>

## xr-caps.mjs, XR_STATES

Every answer a probe can give, in the order they are worth reading.

 yes     this browser says it can open that session
 no      this browser has WebXR and says it cannot, or refused to answer
 absent  this browser has no WebXR at all, so there was nothing to ask
 asking  the question is out and the answer has not come back yet

⚠️ `asking` IS A FOURTH STATE AND IT IS NOT A FOURTH ANSWER. `isSessionSupported`
is a promise, so between the question and the reply there has to be something
for `caps()` to return, and the one thing it must not return is a guess. It
never blocks a control: see `canEnter`.
⚠️ `absent` RESOLVES AT ONCE. That is the whole repair: a browser with nothing
to ask is answered in the same turn the probe is built, not never.

<a id="can-enter"></a>

## xr-caps.mjs, canEnter

Should a control that opens this kind of session be pressable?

🔴 `asking` COUNTS AS YES, ON PURPOSE. A button disabled while the answer is
still coming is a control that lies in the other direction: on a headset it
would sit grey for as long as the browser takes to reply, and this project
already has a rule about a control whose state is a guess. Nothing is lost by
being late to disable, because the state that matters on a phone is `absent`
and that one is known before the first frame.

<a id="reason-for"></a>

## xr-caps.mjs, reasonFor and SAYS

What to put in a control's `title`, in plain words.

🔴 A DISABLED BUTTON WITH NO REASON IS WORSE THAN AN ENABLED ONE. It reads as
a page that is broken rather than as a browser that cannot do the thing, and
`caps.mjs` already answers this for the index: a row it cannot link says why,
in words, rather than vanishing.

⚠️ `yes` HAS NOTHING TO SAY AND RETURNS AN EMPTY STRING. A control that works
explains itself by working, and a tooltip restating the label is furniture.
This also makes one call site cover every state:
`group.enable('vr', canEnter(s), reasonFor(s, 'vr'))`.

⚠️ A VISITOR READS THIS, so it obeys the rules every visitor-facing sentence
here obeys: no file paths, no warning signs, no jargon, and nothing about how
the page found out.

<a id="create-xr-probe"></a>

## xr-caps.mjs, createXrProbe

One probe over one `XRSystem`, or over nothing at all.

⚠️ IT TAKES THE OBJECT RATHER THAN READING `navigator`, so the thing that is
hard to reproduce can be reproduced. `/kit/` builds one over `undefined` and
proves the iPhone case answers `absent` at once, one over a system that says
yes, and one over a system that refuses to answer. An instrument that
reported `absent` about everything would pass the first of those on its own,
which is why all three are graded.

@param {XRSystem|undefined|null} xr
@returns {{ caps: () => {vr: string, ar: string},
           when: (ms?: number) => Promise<{vr: string, ar: string}>,
           on: (fn: (caps: {vr: string, ar: string}) => void) => () => void }}

<a id="absent"></a>

## xr-caps.mjs, createXrProbe, the missing case

🔴 THE MISSING CASE, ANSWERED IN THIS TURN. `xr` is undefined on every
iPhone and on any browser where the feature is switched off, and the old
line left its variable at `null` forever rather than coming here.
⚠️ `isSessionSupported` IS CHECKED, NOT JUST `xr`. A browser could carry an
`XRSystem` without the query, and a missing method would throw on call
rather than answer.

<a id="when"></a>

## xr-caps.mjs, when

Settle, whatever happens. A browser whose promise never comes back gets
the snapshot as it stands after `ms`, still saying `asking`, because the
one thing worse than waiting is inventing the answer that ends the wait.

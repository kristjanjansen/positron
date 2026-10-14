# workers-lib

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `workers/_lib/http.mjs`

### origins

Above `const SITE = ['https://positron.studio', 'https://www.positron.studio'];`, lines 26 to 29 before the cut.

~~~js
// The pages this project serves: the site, this account's workers.dev mirrors,
// and a dev server on this machine or the local network. An Origin header is a
// fact about a browser only; curl sends any value, so this stops accidents and
// is not security. Same list as workers/wish/src/wish.mjs.
~~~

## `workers/_lib/relay-recorder.mjs`

### recorder

Above `export class RelayRecorder {`, lines 1 to 5 before the cut.

~~~js
// A Durable Object that keeps a relay room by joining it as an ordinary socket,
// the shape positron-store and positron-feedback share. Bundled into each
// worker by wrangler, like http.mjs. A subclass supplies `onMessage(data)` and
// `recorderMeta()` (its stored meta with `lastUse`, and anything it must write
// on the alarm), and may override `opened()` and `gone()`.
~~~

### ctor

Above `constructor(state, env, { relay, alarmMs, idleStopMs }) {`, lines 8 to 12 before the cut.

~~~js
/**
 * @param {object} state  the DO's state
 * @param {object} env
 * @param {{ relay: string, alarmMs: number, idleStopMs: number }} o
 */
~~~

### order

Above `this.chain = Promise.resolve();`, lines 22 to 25 before the cut.

~~~js
// ORDER IS THE PRODUCT, so handling is serialised through one chain. A DO's
// input gate holds events back across a STORAGE await and not across
// `blob.arrayBuffer()`, so two frames a millisecond apart would otherwise
// race each other into the table in the wrong order.
~~~

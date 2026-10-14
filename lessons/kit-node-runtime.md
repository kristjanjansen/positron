# Kit lessons: node-runtime.mjs, node-runtime-test.mjs

The long comments cut from `demo/shell/node-runtime.mjs` and `demo/shell/node-runtime-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-node-runtime.md#<anchor>`.

<a id="header"></a>

## node-runtime.mjs, file header

demo/shell/node-runtime.mjs: what makes a node on /connect/ actually run.
plans/plan-connect-ui.md §2 and slice 0.

A catalogue type (demo/shell/nodes.mjs) says what ports a node has. A
RUNTIME says what it does: a face a person sees, `deliver` functions for its
in-ports, WebAudio ends for its audio ports. A node gets its runtime while it
holds at least one link and loses it on its last unlink, so a face belongs to
a node and not to a link (two links out of the keys are one keyboard).

Kept beside nodes.mjs and never inside it: nodes.mjs is pure and import free.
Every factory is loaded with `import()` when its first node is linked, so a
visit loads none of them, and nothing here touches a browser global until
`createRuntimes()` is called. node-runtime-test.mjs grades the pure parts.

A runtime factory (`make(o)` in rt-<type>.mjs) returns, built with NO
AudioContext and NO fetch:
  face?, slot?        an element and where it goes ('picture', 'knob', 'keys')
  deliver?            { '<port>': fn }, bound onto the bay's ports here
  start?(ctx, dest)   on the first press on a face (decision D4)
  audio?              { out(port) -> AudioNode, in(port) -> AudioNode | AudioParam }
  heard()             what arrived at the far side, for asserts
  stop?(), close()    silence it; take it apart
and gets { id, type, bay, log, send(port, ev), wake(), peerParam(name), peerSpec(name), level(),
reroute(), upstream(port), downstream(port) }: reroute after an engine's
audio ends exist (a wasm voice is up late); upstream answers the runtime
linked into one of its in ports (a sample store into a file-in).

<a id="test-header"></a>

## node-runtime-test.mjs, file header

demo/shell/node-runtime-test.mjs: the pure half of node-runtime.mjs and the
router it uses, with no browser. `node demo/shell/node-runtime-test.mjs`.

MOST OF THESE ARE NEGATIVE CONTROLS. A reconcile that never closes, a router
that never disconnects and a route filter that lets a relay link through all
look fine on a happy path, so every claim below is also run against a
sabotaged copy of the function it grades, and each sabotage must turn at
least one claim red. A sabotage the claims cannot see fails this file.

NOT GRADED HERE: createRuntimes() and the rt-*.mjs factories, which need a
document and an AudioContext. /connect/'s self-check grades those.

# Kit lessons: board-collide

The longer comments cut from `demo/shell/board-collide.mjs` and `demo/shell/board-collide-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-board-collide.md#<anchor>`.

<a id="header"></a>

## `board-collide.mjs` module header

```text
demo/shell/board-collide.mjs: a SuperCollider program played on the board,
from a page. plans/plan-pi-supercollider-defs.md step 2 (2026-10-12).

The board compiles the program TEXT itself with the same `sclang-lite.mjs`
this page uses (`rig/board/scollide.mjs`), so this module never sends a byte
of SynthDef and never sends OSC. It sends verbs and keeps the board's clock:

  start()                    audio.start { source: 'collide' }
  load(name, text)           sc.load { name, text, sha }, `sha` this tab's own
                             SHA-256 of the same compile, so `same` in the
                             answer says whether both ends made one program
  hits([{ name, perfAt, args?, choke? }])
                             ONE sc.hit message, each `at` on the BOARD's clock
  noteOn / noteOff / panic   note.* { node: 'collide' }
  set(name, param, value)    sc.set
  stats()                    sc.stats

🔴 THE BOARD IS THE CLOCK WHILE IT IS IN THE ROOM (plan §2.2). `clock.ping`
in bursts, the sample with the smallest round trip kept and never an
average, with `skewSample` IMPORTED from `proto/looper/peer.mjs`, which is the
estimator `/concepts/clock/020/` was graded on (an injected 230 to 270 ms
skew found to within 2.4 ms). A hit's `at` is then this tab's moment plus the
offset, so the board only turns milliseconds into an OSC timetag.
⚠️ A HIT BEFORE THE CLOCK IS KNOWN IS REFUSED HERE, not sent at offset 0: on a
board whose clock is 250 ms away that is every hit a quarter second out, and
the board would count it as somebody else's lateness.

🔴 HOW FAR AHEAD, PER PATH (plan §2.4): 250 ms on the relay, 150 direct.
`AHEAD` holds both; the page picks by `board.stats().via`.

⚠️ THE `board` IS ANYTHING WITH `ask(msg, type, ms)` AND `send(msg)`. On a page
it is `createBoard` from `board.mjs`, whose harness guard (`?selfcheck=1`
refuses every send) applies to all of this. In node it is a socket on a
loopback relay (`board-collide-test.mjs`), which is how step 2 is measured.
```

<a id="test-header"></a>

## `board-collide-test.mjs` module header

```text
demo/shell/board-collide-test.mjs: board-collide.mjs against the stand-in board.

  node demo/shell/board-collide-test.mjs

plans/plan-pi-supercollider-defs.md step 2. No browser and no Pi: the
stand-in (`demo/fake-board.mjs`) on a relay of its own on 127.0.0.1, its
clock pushed 230 to 270 ms away from this machine's, answering through the
board's own `rig/board/scollide.mjs` over a fake scsynth that counts, on its
side of the wire, how early each bundle arrived.

WHAT IS MEASURED, and what would make each row go red:
  - the offset this module finds against the injected skew (clock/020 found
    one to within 2.4 ms; the bar here is 5 ms on a loopback relay);
  - a drum pattern at 120 bpm handed over at AHEAD 250, the hits handed over
    against the hits the stand-in started, and `late` and `droppedLate` 0;
  - SABOTAGE 1: AHEAD 10 makes the board count late or dropped hits;
  - SABOTAGE 2: the estimator's sign flipped puts every `at` about twice the
    skew out, and the board drops every hit as too old;
  - `same: true` for every program: this tab's WebCrypto hash against the
    board's node:crypto hash of its own compile.
⚠️ A LOOPBACK RELAY IS ~1 ms, so this grades the arithmetic and the verbs,
never the relay's tail. Step 6 on the Pi is what reads `late` over 1000 hits.
```

# Kit lessons: reel.mjs, reel-test.mjs

The long comments cut from `demo/shell/reel.mjs` and `demo/shell/reel-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-reel.md#<anchor>`.

<a id="header"></a>

## reel.mjs, file header

demo/shell/reel.mjs: a social reel. A 1080 x 1920 frame drawn from a deck's
position, the standard transport bar over it, record and download at the
bar's right, and the take on `__demo.take`. Lifted out of /social/typist/
(asked as "one test page, next we abstract into reusable lib").

A page brings its own `draw` and its timeline: what happens at what time and
what it sounds like. A visit draws the finished frame and opens nothing; the
page's sounds are loaded on the first press of play or record.

  const reel = await createReel({ d, name: 'typist', side: [fields],
    timeline: () => ({ items: [{ at, payload }], end }),
    draw: (ctx, { pos, playing, idle, take }) => ...,
    sound: { gain: 0.7, load: async (ac, out) => voice },
    play: (payload, voice) => voice.sound(...) });

<a id="test-header"></a>

## reel-test.mjs, file header

node demo/shell/reel-test.mjs: the pure half of reel.mjs, with no browser.
Not graded here: the canvas, the deck, the bar and MediaRecorder itself,
which need a document and are graded by /social/typist/ and a real take.
Six of the asserts are NEGATIVE CONTROLS, marked (neg).

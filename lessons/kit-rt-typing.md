# Kit lessons: rt-typing.mjs

The long comments cut from `demo/shell/rt-typing.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-typing.md#<anchor>`.

<a id="header"></a>

## rt-typing.mjs, file header

demo/shell/rt-typing.mjs: the runtime of a `typing` node on /connect/
(node-runtime.mjs). Its face is /typist/'s sheet of paper (typist/paper.mjs);
every input on it leaves on typing:value-out as `{ of: 'text', text, kind,
column }`, kind being the InputEvent's inputType. Typing is a person's press,
so it starts the page's sound.

# Kit lessons: chat-ui

The longer comments cut from `demo/shell/chat-ui.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-chat-ui.md#<anchor>`.

<a id="header"></a>

## `chat-ui.mjs` module header

```text
demo/shell/chat-ui.mjs: the chat's pieces, one module for every page that
draws a chat (asked 2026-10-11, *"copy broadcast message rendering to 003"*,
*"(make it reusable) as all chat ui elements"*). Lifted from
/concepts/room/001/ to /room/history/, where each page had its own copy.

  createChatLog()        lines, newest at the bottom, scrolling inside itself
  createChatSign()       one line on show, centred both ways, balanced, brand face
  createChatCompose(o)   the box: grows to six lines, Enter sends, Shift and
                         Enter is a new line, the send icon in its bottom right,
                         hidden until enabled (no chat box before Join)
  createChatColumn(o)    a heading, a body (a log or a sign) and a compose box;
                         `ink` colours your own name and the box's focus edge
  createChatWindow(o)    the frame: the kit's video panel holding one column
                         full width, or two with the second a third wide;
                         a phone stacks two columns, each half the stage
  createChatGrid(o)      one to six equal cells in the kit's video panel,
                         edge to edge, the layout following the
                         count and the frame's own width (lifted from
                         /typist/score/, the multi typer);
                         `fixed: true` keeps one shape at every count

Nothing here opens anything: a page wires the send and the arrivals.
```

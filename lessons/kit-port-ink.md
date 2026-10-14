# Kit lessons: port-ink.mjs

The long comments cut from `demo/shell/port-ink.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-port-ink.md#<anchor>`.

<a id="header"></a>

## port-ink.mjs, file header

demo/shell/port-ink.mjs: colours the port part of every port id on the
page (`web:keys:midi-out`) in its medium's colour, read from the bay's own
port, without touching the text. The CSS Custom Highlight API paints ranges
over the existing text nodes, so a cell still holds plain ASCII that copies,
clips and sorts as it did; no spans are added. A browser without
`CSS.highlights` shows the text uncoloured.

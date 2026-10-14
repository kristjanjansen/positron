# Kit lessons: rt-store.mjs

The long comments cut from `demo/shell/rt-store.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-store.md#<anchor>`.

<a id="header"></a>

## rt-store.mjs, file header

demo/shell/rt-store.mjs: the runtime of a file store on /connect/
(node-runtime.mjs): our own R2 bucket, read through the station worker's
/media/ door. It holds an address and opens nothing; the engine at the far
end of its file-out link reads from it on a person's press, and only while
that link holds (`upstream('file-in')`).

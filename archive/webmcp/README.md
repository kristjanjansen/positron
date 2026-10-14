# WebMCP probes, 2026-10-14

The scratch experiments behind `research/webmcp-2026-10-14.md`, kept as a record.
They ran in headless Chrome 155 with `--enable-features=WebMCP` through
`demo/chrome.mjs`:

- `page.html`, `probe.mjs`: register an imperative tool with `document.modelContext` and call it.
- `page2.html`: a declarative `<form toolname>` that Chrome turns into a tool.
- `invoke.mjs`: the experimental CDP `WebMCP` domain (`enable`, `invokeTool`, `toolResponded`).
- `proto.mjs`: a tool call carries no user activation.

Nothing on the site uses WebMCP. The plan is `plans/plan-webmcp.md`.

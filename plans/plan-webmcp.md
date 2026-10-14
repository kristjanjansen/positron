# WebMCP on /connect/

Status (2026-10-14): open, kept as a plan. Asked: *"just keep mcp as plan. archive code"*.
Research: `research/webmcp-2026-10-14.md`. Probes: `archive/webmcp/`.

## The first step, when it is taken

1. On /connect/, register `list_nodes`, `list_links`, `list_examples`, `link`
   and `unlink` with `document.modelContext.registerTool`, only when
   `document.modelContext` exists, all under one AbortController.
   `link` calls the page's `connect(from, to, transforms, false)`: consent is
   always false, so `bay.mjs` refuses any link out of somebody else's server.
2. The self-check, under `?selfcheck=1` only, calls them through `executeTool`:
   keys to synth links, a link from ERR is refused, `list_links` matches
   `bay.links()`.
3. `demo/verify.mjs` launches /connect/ with `--enable-features=WebMCP` and
   makes one CDP `WebMCP.invokeTool` pass; with the flag off nothing registers.
4. Origin trial tokens (Chrome 149 to 156, Edge 150) only after that.

## Held back on purpose

- `play_note`, `set_knob`, `build_example`: sound starts on a person's press
  (decision D4 in `plans/plan-connect-ui.md`), and a tool call carries no user
  activation (measured).
- Any tool that reaches ERR, the Pi, Stream, the relay or the wish worker.
- A site-wide tool set from the shell: pages do not hand the shell their bay,
  and a generic press tool could start paid or remote things.

## Watch

The spec moved `window.agent` to `navigator.modelContext` to `document.modelContext`
in a year; the origin trial ends with Chrome 156. Claude in Chrome does not discover
page tools yet ([anthropics/claude-code#76809](https://github.com/anthropics/claude-code/issues/76809)).

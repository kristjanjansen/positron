// Vendor bundle for demo 08. Only the surface the demo actually uses, so the
// page itself stays readable like every other demo (hls.min.js plays the same
// role for 06). Bundled in Docker because native esbuild is SIGKILLed by
// ThreatLocker on this machine — rig/moq/RUNBOOK.md §3.5.
export { Connection, Path, Broadcast } from "@moq/net";
export * as Container from "@moq/hang/container";

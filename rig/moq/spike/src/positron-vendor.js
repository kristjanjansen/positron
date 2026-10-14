// Vendor bundle of the @moq/net surface the MoQ page uses, built in Docker (native esbuild is
// killed).
// why: lessons/rig-moq.md#positron-vendor
export { Connection, Path, Broadcast } from "@moq/net";
export * as Container from "@moq/hang/container";

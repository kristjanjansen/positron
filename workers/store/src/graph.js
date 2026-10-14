// What positron-store says it is, as a site in the room it records (graph-registry.mjs shape).
// A literal, not an import from demo/; workers/store/graph-check.mjs runs it through graphProblem.
// why: lessons/workers-store.md#graph
export const STORE_GRAPH = {
  v: 1, site: 'cf-store', place: 'cloudflare', net: 'cloudflare', kind: 'service', label: 'CF Store',
  nodes: [{ id: 'cf-store:history', kind: 'store', label: 'history', place: 'cloudflare', net: 'cloudflare' }],
  ports: [
    { id: 'cf-store:history:value-in', label: 'history', dir: 'in', medium: 'value', transports: ['relay'] },
    { id: 'cf-store:history:value-out', label: 'history', dir: 'out', medium: 'value', transports: ['https'] },
  ],
};

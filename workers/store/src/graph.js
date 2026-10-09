// workers/store/src/graph.js: what positron-store says it is, as a site.
//
/*
 * THE STORE IS A SITE IN THE ROOM IT RECORDS (plans/plan-site-names.md §4g,
 * 2026-10-09). Its socket is already a member, so it says what it is in the
 * shape `demo/shell/graph-registry.mjs` reads, and every page's registry sees
 * it without a page announcing it on its behalf.
 * ⚠️ A LITERAL, NOT AN IMPORT. The worker imports nothing from demo/, and
 * `workers/store/graph-check.mjs` runs this exact object through
 * `graphProblem` so the two cannot drift silently.
 */
export const STORE_GRAPH = {
  v: 1, site: 'cf-store', place: 'cloudflare', net: 'cloudflare', kind: 'service', label: 'CF Store',
  nodes: [{ id: 'cf-store:history', kind: 'store', label: 'history', place: 'cloudflare', net: 'cloudflare' }],
  ports: [
    { id: 'cf-store:history:in', label: 'history', dir: 'in', medium: 'value', transports: ['relay'] },
    { id: 'cf-store:history:out', label: 'history', dir: 'out', medium: 'value', transports: ['https'] },
  ],
};

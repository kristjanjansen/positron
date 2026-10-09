// Is the store's announce a graph every page's registry will take.
// node workers/store/graph-check.mjs
import { STORE_GRAPH } from './src/graph.js';
import { graphProblem, createRegistry } from '../../demo/shell/graph-registry.mjs';

const why = graphProblem(STORE_GRAPH);
const r = createRegistry();
const took = r.ingest({ type: 'graph.announce', from: 'abc123', graph: STORE_GRAPH });
const site = r.merged().sites.find((s) => s.site === 'cf-store');
// negative control: a kind outside SITE_KINDS must be refused
const bad = graphProblem({ ...STORE_GRAPH, kind: 'cloud' });
const ok = !why && took && site?.kind === 'service' && site?.label === 'CF Store' && !!bad;
console.log(`graphProblem: ${why || 'none'}; registry took it: ${took}; site row: ${JSON.stringify(site)}; bad kind refused: ${bad || 'NO'}`);
process.exit(ok ? 0 : 1);

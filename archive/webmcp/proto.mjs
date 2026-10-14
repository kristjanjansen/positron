import { launchChrome } from '../../demo/chrome.mjs';
const b = await launchChrome({ prefix: 'webmcp-probe', args: ['--disable-gpu'] });
try {
  const p = await (await fetch(`http://127.0.0.1:${b.port}/json/protocol`)).json();
  const d = p.domains.find((x) => x.domain === 'WebMCP');
  console.log(JSON.stringify({ experimental: d.experimental, commands: d.commands, events: d.events?.map(e => ({ name: e.name, params: e.parameters?.map(q => q.name) })), types: d.types?.map(t => ({ id: t.id, props: t.properties?.map(q => q.name), enum: t.enum })) }, null, 1));
} finally { await b.close(); }

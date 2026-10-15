// demo/shell/pair-examples.mjs: the bays drawn in two facing columns (`arrange: 'pair'`), shared by
// /kit/patchbay/'s TWO COLUMNS ON A PHONE and /social/patchbay/'s posts, so both show the same patch.
import { MEDIA } from './bay.mjs';

const KEYS = ['web:keys:midi-out', 'web:synth:midi-in'], SOUND = ['web:synth:audio-out', 'web:speaker:audio-in'];
const CHAT = [['web:chat:value-out', '*:chat:value-in'], ['*:chat:value-out', 'web:chat:value-in']];
const ADMIN = [['web:admin:value-out', '*:notice:value-in'], ['*:admin:value-out', 'web:notice:value-in']];

/** `{ id, title, say, links: [from, to][], labels }`, newest first. */
export const PAIR_EXAMPLES = [
  { id: 'radio', title: 'Radio tuner', say: 'Three recordings, a noise and a dial into one tuner.',
    links: [...['raadio2', 'raadio4', 'ida'].map((s) => [`cf-r2:${s}:file-out`, 'web:player:file-in']),
      ['web:player:audio-out', 'web:tuner:audio-in'], ['web:noise:audio-out', 'web:tuner:audio-in'],
      ['web:dial:value-out', 'web:tuner:value-in'], ['web:tuner:audio-out', 'web:speaker:audio-in']],
    labels: { 'cf-r2:raadio2': 'Raadio 2 recording', 'cf-r2:raadio4': 'Raadio 4 recording', 'cf-r2:ida': 'Ida recording',
      'web:player': 'player', 'web:noise': 'noise', 'web:dial': 'dial', 'web:tuner': 'tuner', 'web:speaker': 'speakers' } },
  { id: 'recorder', title: 'Recorder', say: 'The keys into a synth and a recorder that plays back into it.',
    links: [KEYS, ['web:keys:midi-out', 'web:rec:midi-in'], ['web:rec:midi-out', 'web:synth:midi-in'], SOUND],
    labels: { 'web:keys': 'on-screen keyboard', 'web:rec': 'recorder', 'web:synth': 'saw synth', 'web:speaker': 'speakers' } },
  { id: 'broadcast', title: 'Broadcast', say: 'A chat, an admin line and a camera through Stream to every tab.',
    links: [...CHAT, ...ADMIN, ['web:broadcast:value-out', '*:screen:value-in'], ['*:broadcast:value-out', 'web:screen:value-in'],
      ['web:camera:video-out', 'cf-stream:live:video-in'], ['cf-stream:live:video-out', 'web:screen:video-in']],
    labels: { 'web:chat': 'chat box', '*:chat': 'chat box', 'web:admin': 'admin line', '*:admin': 'admin line',
      'web:notice': 'notice bar', '*:notice': 'notice bar', 'web:broadcast': 'on air switch', '*:broadcast': 'on air switch',
      'web:screen': 'on air video', '*:screen': 'on air video', 'web:camera': 'camera', 'cf-stream:live': 'Stream live input' } },
];

const nodeOf = (id) => id.split(':').slice(0, 2).join(':');
const mediumOf = (id) => { const m = id.split(':')[2].split('-')[0]; return MEDIA.includes(m) ? m : 'value'; };

/** A bay-shaped object (`nodes`, `ports`, `links` as functions) for one example. */
export function pairBay({ links, labels = {} }) {
  const ports = new Map(), nodes = new Map();
  const ls = links.map(([from, to], i) => {
    for (const [id, dir] of [[from, 'out'], [to, 'in']]) {
      if (!nodes.has(nodeOf(id))) nodes.set(nodeOf(id), { id: nodeOf(id), label: labels[nodeOf(id)] || '' });
      if (!ports.has(id)) ports.set(id, { id, dir, medium: mediumOf(id) });
    }
    return { id: `l${i}`, from, to };
  });
  return { nodes: () => [...nodes.values()], ports: () => [...ports.values()], links: () => ls };
}

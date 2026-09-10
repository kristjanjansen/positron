// Talk to Ableton Live over AbletonOSC. Runs ON the machine Live is on.
//
//   node live-osc.mjs status              what Live has, and whether it can hear us
//   node live-osc.mjs get <addr> [args]   one query
//
// OSC IS UDP AND A REPLY CAN SIMPLY NOT ARRIVE -- measured once in session 15,
// one unanswered `current_song_time` killed a run while a second run lost 0 of
// 111. So every ask retries rather than failing on a single packet. Never put
// this in the timing path: it arms and reads, and the numbers come from audio.
import dgram from 'node:dgram';

const HOST = process.env.LIVE_HOST || '127.0.0.1';
const SEND = 11000, RECV = 11001;

const pad4 = (b) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4 || (b.length % 4 === 0 ? 0 : 0))]);
const ostr = (s) => { const b = Buffer.from(s + '\0', 'ascii'); return Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]); };

function encode(addr, args = []) {
  let tags = ',', body = Buffer.alloc(0);
  for (const a of args) {
    if (typeof a === 'number' && Number.isInteger(a)) { tags += 'i'; const b = Buffer.alloc(4); b.writeInt32BE(a); body = Buffer.concat([body, b]); }
    else if (typeof a === 'number') { tags += 'f'; const b = Buffer.alloc(4); b.writeFloatBE(a); body = Buffer.concat([body, b]); }
    else { tags += 's'; body = Buffer.concat([body, ostr(String(a))]); }
  }
  return Buffer.concat([ostr(addr), ostr(tags), body]);
}

function decode(buf) {
  let o = 0;
  const rs = () => { const e = buf.indexOf(0, o); const s = buf.toString('ascii', o, e); o = Math.ceil((e + 1) / 4) * 4; return s; };
  const addr = rs(), tags = rs(), out = [];
  for (const t of tags.slice(1)) {
    if (t === 'i') { out.push(buf.readInt32BE(o)); o += 4; }
    else if (t === 'f') { out.push(buf.readFloatBE(o)); o += 4; }
    else if (t === 's') out.push(rs());
  }
  return { addr, args: out };
}

const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
await new Promise((r) => sock.bind(RECV, r));

export function ask(addr, args = [], tries = 4) {
  return new Promise((resolve) => {
    let done = false;
    const on = (m) => { const d = decode(m); if (!done && d.addr === addr) { done = true; sock.off('message', on); resolve(d.args); } };
    sock.on('message', on);
    let n = 0;
    const go = () => {
      if (done) return;
      if (n++ >= tries) { sock.off('message', on); return resolve(null); }
      sock.send(encode(addr, args), SEND, HOST);
      setTimeout(go, 600);
    };
    go();
  });
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'get') {
  console.log(JSON.stringify(await ask(rest[0], rest.slice(1).map((x) => (/^-?\d+$/.test(x) ? +x : x)))));
  process.exit(0);
}

// default: status
const names = await ask('/live/song/get/track_names');
if (!names) { console.log('Live did not answer — is AbletonOSC enabled in Preferences > Link/Tempo/MIDI > Control Surface?'); process.exit(1); }
console.log('tracks            :', names.join(', '));
const n = (await ask('/live/song/get/num_tracks'))?.[0] ?? 0;
for (let i = 0; i < n; i++) {
  const devs = await ask('/live/track/get/devices/name', [i]);
  // the first arg echoes the track index; anything after it is the answer
  const list = (devs || []).slice(1);
  console.log(`  track ${i} "${names[i]}" instruments: ${list.length ? list.join(', ') : 'NONE'}`);
}
const types = (await ask('/live/track/get/available_input_routing_types', [0])) || [];
console.log('input routing on track 0:', types.slice(1).join(' | ') || '(none)');
console.log(types.some((t) => String(t).includes('IAC'))
  ? 'IAC IS visible to Live'
  : 'IAC is NOT visible to Live — enable it in Preferences > Link/Tempo/MIDI > MIDI Ports (Track = On)');
process.exit(0);

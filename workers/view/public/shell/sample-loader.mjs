// demo/shell/sample-loader.mjs: samples out of whatever is dropped on a page (a .circuitpack,
// a zip of packs or WAVs, loose WAVs), in the pack's order. Read only: it sends nothing.
// A file that will not parse keeps its place with `wave.ok === false` and `row.why`.
// why: lessons/kit-sample-loader.md#header

import { readZip } from './unzip.mjs';
import { samplesIn, summariseAll, containerOf, sampleSetIn, CONTAINER, readWave, summarise } from './circuit-sample.mjs';
import { PATCH_BYTES } from './circuit-patch.mjs';

/**
 * @param {object} o
 * @param {(line: string, kind?: string) => void} [o.say]  the drop box's own line
 * @param {(line: string, kind?: string) => void} [o.log]  the page's log
 * @returns {{
 *   openPack(name: string, bytes: Uint8Array, from?: string): Promise<object[]|null>,
 *   openStream(name: string, bytes: Uint8Array, from?: string): Promise<object[]|null>,
 *   openZip(name: string, bytes: Uint8Array, o?: { wavs?: boolean }): Promise<object[]|null>,
 *   openFiles(files: {name: string, bytes: Uint8Array}[]): Promise<object[]|null>,
 * }}  every opener answers the samples, `{ name, size, wave, row }[]`, or null
 */
export function createSampleLoader({ say = () => {}, log = () => {} } = {}) {
  /** A pack: a zip of WAVs inside, or a sysex bulk transfer that is not a zip. */
  async function openPack(name, bytes, from = '') {
    const kind = containerOf(bytes);
    if (kind.kind === CONTAINER.sysex) return openStream(name, bytes, from);
    if (kind.kind !== CONTAINER.zip) { say(`${name}: ${kind.why}`, 'bad'); return null; }
    let list;
    try { list = readZip(bytes); }
    catch (e) { say(`${name} did not read as a pack: ${e.message}`, 'bad'); return null; }
    const got = await samplesIn(list);
    if (!got.length) { say(`${name} holds no samples`, 'bad'); return null; }
    const all = summariseAll(got.map((g) => g.wave));
    log(`${name}: ${all.parsed} of ${all.count} samples read`
      + (all.refused ? `, ${all.refused} refused` : '')
      // Only where something parsed: `shortest` is 0 over an empty set.
      // why: lessons/kit-sample-loader.md#shortest
      + (all.parsed ? `, ${all.shortest.toFixed(2)} s to ${all.longest.toFixed(2)} s` : ''));
    say(`${name}${from ? ` ${from}` : ''}`, 'good');
    return got;
  }

  /** A bulk transfer: decoded against its own length and CRC32, never sent. */
  async function openStream(name, bytes, from = '') {
    const set = sampleSetIn(bytes);
    log(`${name} is not a zip. It is ${set.messages.toLocaleString()} sysex messages carrying `
      + `${set.streams.length} stream(s), ${set.verified} of them verified against a checksum`
      + (set.other ? `, and ${set.other} message(s) outside any stream` : ''), 'hi');
    for (const s of set.streams) {
      if (!s.ok) { log(`the stream at ${s.at} was refused: ${s.why}`, 'bad'); continue; }
      log(`the stream at ${s.at} restores ${s.plainBytes.toLocaleString()} bytes from `
        + `${s.carriers.toLocaleString()} carriers, crc 0x${s.crc.toString(16)}, and holds ${s.holds}`);
    }
    if (!set.ok) { say(`${name}: ${set.why}`, 'bad'); return null; }
    const all = summariseAll(set.samples.map((g) => g.wave));
    const empty = set.samples.filter((g) => g.wave.frames === 0).length;
    log(`${name}: ${all.parsed - empty} filled slot(s) of ${all.count}`
      + (empty ? `, ${empty} empty` : '')
      + `, ${all.seconds.toFixed(2)} s in total`);
    say(`${name}${from ? ` ${from}` : ''}`, 'good');
    return set.samples;
  }

  /**
   * A download: a zip of packs, or of one bulk transfer. With `wavs: true` a
   * zip holding neither but holding WAVs opens as a kit of those WAVs, which
   * is what /tom/ never did and /drums/samples/ wants.
   */
  async function openZip(name, bytes, { wavs = false } = {}) {
    let list;
    try { list = readZip(bytes); }
    catch (e) { say(`${name} did not read as a zip: ${e.message}`, 'bad'); return null; }
    const packs = list.filter((e) => e.name.endsWith('.circuitpack'));
    const others = list.filter((e) => e.name.endsWith('.circuittrackspack'));
    const streams = list.filter((e) => /\.syx$/i.test(e.name) && e.size > PATCH_BYTES
      && !e.name.startsWith('__MACOSX/'));
    if (others.length) {
      log(`${others.length} pack(s) in it are for a Circuit Tracks, not a Circuit, and were left alone`, 'bad');
    }
    if (!packs.length && streams.length) {
      if (streams.length > 1) {
        log(`${streams.length} bulk transfers in ${name}: `
            + `${streams.map((e) => e.name.split('/').pop()).join(', ')}. Opening the first`, 'hi');
      }
      return openStream(streams[0].name.split('/').pop(), await streams[0].read(), `inside ${name}`);
    }
    if (!packs.length && wavs && list.some((e) => /\.wav$/i.test(e.name) && !e.name.startsWith('__MACOSX/'))) {
      return openPack(name, bytes);
    }
    if (!packs.length) { say(`${name} holds no Circuit pack and no bulk transfer`, 'bad'); return null; }
    if (packs.length > 1) {
      log(`${packs.length} packs in ${name}: ${packs.map((e) => e.name.split('/').pop()).join(', ')}. `
          + 'Opening the first', 'hi');
    }
    return openPack(packs[0].name.split('/').pop(), await packs[0].read(), `inside ${name}`);
  }

  /**
   * Whatever was dropped at once: loose WAVs are one kit, in the order of the
   * number in their names; a zip or a pack opens as above. The LAST file that
   * opened wins, as on /tom/.
   */
  async function openFiles(files) {
    const loose = files.filter((f) => /\.wav$/i.test(f.name));
    let got = null;
    if (loose.length) {
      const order = (n) => { const m = String(n).match(/(\d+)(?!.*\d)/); return m ? +m[1] : -1; };
      got = loose.slice().sort((a, b) => order(a.name) - order(b.name) || a.name.localeCompare(b.name)).map((f) => {
        const wave = readWave(f.bytes);
        return { name: f.name, size: f.bytes.length, wave, row: summarise(wave, f.name) };
      });
      const all = summariseAll(got.map((g) => g.wave));
      log(`${loose.length} WAV file(s): ${all.parsed} read` + (all.refused ? `, ${all.refused} refused` : ''));
      say(loose.length === 1 ? loose[0].name : `${loose.length} WAV files`, all.parsed ? 'good' : 'bad');
      if (!all.parsed) got = null;
    }
    for (const f of files.filter((x) => !/\.wav$/i.test(x.name))) {
      const one = f.name.toLowerCase().endsWith('.zip')
        ? await openZip(f.name, f.bytes, { wavs: true })
        : await openPack(f.name, f.bytes);
      if (one) got = one;
    }
    return got;
  }

  return { openPack, openStream, openZip, openFiles };
}

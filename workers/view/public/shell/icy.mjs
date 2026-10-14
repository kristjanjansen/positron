// demo/shell/icy.mjs: the Icecast in-band text channel, demuxed. After every `icy-metaint` audio bytes
// comes one length byte (x16) and that much text. Raadio Tallinn: 16000 at 128 kbps, one slot a second.
// A pure byte demuxer: no fetch, no DOM; the page decides what a title means.
// why: lessons/kit-icy.md#header

/**
 * @param {number} metaint  bytes of audio between slots. 0 or NaN means no `icy-metaint`.
 * @param {{onTitle?: (t: string) => void, onSlot?: () => void,
 *          onMeta?: (text: string) => void,
 *          onAudio?: (bytes: Uint8Array) => void}} handlers
 *   onSlot fires per slot, empty ones included; onMeta for slots with bytes; onTitle on change only.
 *   onAudio hands back the audio with the text taken out; concatenated, it is the pure MP3 stream.
 * @returns {(chunk: Uint8Array) => void}
 * why: lessons/kit-icy.md#icydemuxer
 */
export function icyDemuxer(metaint, { onTitle, onSlot, onMeta, onAudio } = {}) {
  const step = Number(metaint) || 0;
  let need = step, mode = 'audio', metaLen = 0;
  let spare = new Uint8Array(0);
  let last = null;

  const concat = (a, c) => {
    const o = new Uint8Array(a.length + c.length);
    o.set(a); o.set(c, a.length);
    return o;
  };

  return function eat(chunk) {
    // No `icy-metaint` means every byte is audio, not nothing to do.
    // why: lessons/kit-icy.md#no-metaint
    if (!step) { if (chunk.length) onAudio?.(chunk); return; }
    // The leftover carries state across chunks: a slot's length byte and text can land in two chunks.
    // why: lessons/kit-icy.md#spare
    let b = spare.length ? concat(spare, chunk) : chunk;
    for (;;) {
      if (mode === 'audio') {
        if (b.length < need) {
          if (b.length) onAudio?.(b);
          need -= b.length; b = b.subarray(b.length); break;
        }
        if (need) onAudio?.(b.subarray(0, need));
        b = b.subarray(need);
        mode = 'len';
      } else if (mode === 'len') {
        if (b.length < 1) break;
        metaLen = b[0] * 16;
        b = b.subarray(1);
        onSlot?.();
        if (metaLen) { mode = 'meta'; } else { mode = 'audio'; need = step; }
      } else {
        if (b.length < metaLen) break;
        const txt = new TextDecoder('utf-8', { fatal: false })
          .decode(b.subarray(0, metaLen)).replace(/\0+$/, '');
        onMeta?.(txt);
        const m = /StreamTitle='([^']*)'/.exec(txt);
        if (m && m[1] && m[1] !== last) { last = m[1]; onTitle?.(m[1]); }
        b = b.subarray(metaLen);
        mode = 'audio'; need = step;
      }
    }
    spare = b;
  };
}

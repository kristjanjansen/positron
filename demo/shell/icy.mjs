// demo/shell/icy.mjs — the SHOUTcast/Icecast in-band text channel, demuxed.
//
// An Icecast response with `Icy-MetaData: 1` is not pure MP3. After every
// `icy-metaint` bytes of audio comes ONE length byte (in units of 16) and that
// many bytes of text — `StreamTitle='…';StreamUrl='…'` — and then audio again.
// Almost every slot is EMPTY: a station only writes when something changes.
// MEASURED on Raadio Tallinn: metaint 16000 at 128 kbps, so one slot per second
// exactly, and 1 of 29 carried text over 25 s.
//
// ⚠️ THIS LIVED INSIDE `shout`'s PAGE AND WAS LIFTED HERE RATHER THAN COPIED.
// A second page (`radio`) needed the same forty lines, and this repo has
// paid twice for two copies of one function — `rowHTML` printed `undefined`
// over every demo name for an afternoon, and `moq.mjs` held a URL that had been
// renamed away. CLAUDE.md's rule is the reason this file exists: *"A control
// that exists in one page and nowhere else is a component that has not been
// noticed yet, not a special case."*
//
// It is a pure byte demuxer: no fetch, no element, no DOM. Whoever owns the
// stream feeds it chunks and gets callbacks; what to DO with a title is the
// page's business, which is why `onTitle` is a callback and not a DOM write.

/**
 * @param {number} metaint  bytes of audio between metadata slots. 0 or NaN
 *   means the station sent no `icy-metaint`, and then `eat` is a no-op —
 *   deliberately, because a stream without the header is not broken, it is
 *   just not talking.
 * @param {{onTitle?: (t: string) => void, onSlot?: () => void,
 *          onMeta?: (text: string) => void,
 *          onAudio?: (bytes: Uint8Array) => void}} handlers
 *   onSlot fires once per slot INCLUDING the empty ones — which is the only
 *   way to know the channel is alive rather than merely quiet. onMeta fires
 *   only for slots that carried bytes. onTitle fires only when the title
 *   actually CHANGED, so a station that repeats itself does not look like a
 *   station that is doing something.
 *
 *   🔴 onAudio HANDS BACK THE AUDIO WITH THE TEXT TAKEN OUT, and it was added
 *   the day a caller needed the samples rather than the titles. Until then both
 *   callers fed this demuxer purely to read the station's text and let an
 *   `<audio>` element fetch the SAME STREAM A SECOND TIME for the sound — so
 *   the audio bytes arriving here were simply dropped on the floor. When
 *   `/radio/` had to decode for itself (WebKit does not route a media
 *   element into WebAudio — see mp3-stream.mjs), there was nowhere for the bytes
 *   to come out. ⚠️ A demuxer that throws away half of what it demuxes reads as
 *   complete right up until somebody wants the other half.
 *
 *   It fires one or more times per chunk, in order, never across a metadata
 *   slot — so concatenating everything it emits is the pure MP3 stream.
 * @returns {(chunk: Uint8Array) => void}
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
    // ⚠️ NO `icy-metaint` MEANS EVERY BYTE IS AUDIO, not that there is nothing
    // to do. This returned early before `onAudio` existed, which was harmless
    // while the only product was titles and is a silent no-sound bug now.
    if (!step) { if (chunk.length) onAudio?.(chunk); return; }
    // ⚠️ THE LEFTOVER IS THE WHOLE TRICK. A slot's length byte and its text can
    // land in different network chunks, so state has to survive a chunk
    // boundary — parsing each chunk independently loses a title roughly
    // whenever one straddles, which is silent and looks like a quiet station.
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

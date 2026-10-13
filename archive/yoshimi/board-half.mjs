// archive/yoshimi/board-half.mjs: what rig/board/board.mjs did for Yoshimi, verbatim.
//
// Cut out on 2026-10-13 when Yoshimi left the Raspberry Pi
// (archive/yoshimi/README.md). NOT a module: the text to paste back into
// rig/board/board.mjs, with this import at the top of that file:
//
//   import { yoshimiPatches, YOSHIMI_DIR } from './yoshimi.mjs';
//   import { statSync } from 'node:fs';
//
// Three sections. Each is shown as it stood in commit 07d2f1e1.

// ── 1. the bank map and the bank CC, above `const log = ...` ────────────────
/**
 * Yoshimi's bank map, read once and re-read when Yoshimi rewrites it.
 *
 * The file is 660 KB of gzipped XML and a patch step asks for the bank number
 * every time, so re-reading it per keystroke would be silly — but caching it
 * forever would make an instrument added on the board invisible until a restart.
 * The mtime is the cheap way to have both.
 */
let yoshimiMemo = null, yoshimiMemoAt = 0;
function yoshimiList() {
  let mtime = 0;
  try { mtime = statSync(`${YOSHIMI_DIR}/yoshimi.banks`).mtimeMs; } catch { /* answered below */ }
  if (!yoshimiMemo || mtime !== yoshimiMemoAt) { yoshimiMemo = yoshimiPatches(); yoshimiMemoAt = mtime; }
  return yoshimiMemo;
}
/**
 * Which controller selects a bank, for the instrument that is running.
 *
 * 32 is the MIDI standard (bank select LSB) and is the right answer for any
 * synth that has banks at all; Yoshimi's is read from Yoshimi rather than
 * assumed, because it is settable there and a page cannot see the setting.
 */
const bankCC = (source) => (source === 'yoshimi' ? yoshimiList().bankCC ?? 32 : 32);

// ── 2. inside `handle()`, `case 'voices.list'`, before the fixed-table reply ─
//
      if (src === 'yoshimi') {
        const list = yoshimiList();
        log(`voices.list: ${list.count} patches in ${list.bankCount} banks, root ${list.root}${list.stale ? ' (STALE — the bank map disagrees with the disk)' : ''}`);
        // ⚠️ `source` names the INSTRUMENT and must survive the spread. The
        // list carried its own `source` (the file it was read from) for one
        // revision, the spread overwrote this one with a path, and every
        // client waiting for "the yoshimi list" waited forever — with the
        // reply sitting right there. The file is `file`.
        return reply('voices.listed', { ...list, source: 'yoshimi' });
      }

// ── 3. the one-line defaults that made Yoshimi the board's instrument ───────
// They are NOT to be put back as they were if the board ever has two JACK
// synths: today a bare `audio.start` and a note to an idle board are refused in
// words, and that stays the better answer. Listed so the old behaviour is known:
//
//   startAudio(msg.source ?? 'yoshimi', msg).then((r) => reply('audio.started', r));
//   if (!synth && !inst) await startAudio('yoshimi', {});
//   : planned.problems.some((p) => /yoshimi/.test(p)) ? ' Yoshimi is not running: audio.start raises it.' : '';
//   const jack = jackSynthAvailable('yoshimi') || [...inputsCfg.inputs.values()].some((i) => i.via === 'jack');

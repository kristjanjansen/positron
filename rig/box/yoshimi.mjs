// rig/box/yoshimi.mjs — read Yoshimi's instrument library out of Yoshimi's own
// state, so the patch stepper walks patches that EXIST.
//
// Why this file is here at all: Yoshimi's banks are numbered sparsely and do
// not start where a naive walk starts. The Rhodes bank holds 26 instruments
// spread across slots 1…68, and the banks themselves are numbered 5, 10, 15 …
// 120 rather than 0, 1, 2. So "step the program number 0…127" lands on an empty
// slot most of the time, and Yoshimi's answer to an empty slot is to do
// NOTHING — the previous instrument keeps sounding, which is what "the patch
// buttons do nothing" was.
//
// ── how a bank DIRECTORY becomes a MIDI BANK NUMBER ──────────────────────────
// It is not the sort order of /usr/share/yoshimi/banks and it is not derivable
// from the directory at all. Yoshimi keeps the mapping in its own file:
//
//   ~/.config/yoshimi/yoshimi.banks      (gzipped XML, "Roots and Banks")
//     <BANKROOT id="10">                 <- the MIDI ROOT number (CC 0)
//       <string name="bank_root">/usr/share/yoshimi/banks</string>
//       <bank_id id="80">                <- the MIDI BANK number (CC 32)
//         <string name="dirname">Rhodes</string>
//         <instrument_id id="0">         <- the MIDI PROGRAM number
//           <string name="listname">DX Rhodes 1</string>
//           <string name="filename">0001-DX Rhodes 1.xiz</string>
//
// Two numbers there are one-off from each other and both appear in this repo's
// history as a guess. Settled by ASKING YOSHIMI, 2026-09-11, by sending real
// MIDI bytes to a throwaway instance and reading what it said it loaded:
//
//   program 0  -> "Main Part 1 loaded 0001-DX Rhodes 1"
//   program 1  -> "Main Part 1 loaded 0002-DX Rhodes 2"
//   program 5  -> "Main Part 1 load FAILED No instrument at 6 in this bank"
//   program 6  -> "Main Part 1 loaded 0007-Dig Rhodes"
//
// So the wire value is `instrument_id`, which is the filename's NNNN MINUS ONE.
// ⚠️ Program 0 DOES exist — it is slot 0001 — contrary to what HANDOFF said.
// The defect was never program 0; it was the 122 empty slots either side of it.
//
// ── the numbers this library actually holds ──────────────────────────────────
// Yoshimi's own splash says "Found 1822 instruments in 48 banks", and that line
// has been quoted three different ways in this repo. It counts BOTH bank roots,
// and the second root is a byte-for-byte copy of the first that Yoshimi makes
// on its first run so the user has something writable. The real library is
// 911 instruments in 24 banks, of which 878 are reachable — 33 sit in slots
// above 128, which need Yoshimi's extended program-change control, and that is
// switched off here (`midi_upper_voice_C` 128 means "no CC assigned").
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { homedir } from 'node:os';

/** Where Yoshimi keeps the state this module reads. */
export const YOSHIMI_DIR = process.env.BOX_YOSHIMI_CONFIG || `${homedir()}/.config/yoshimi`;

/** A plain program change carries seven bits, so this is the last reachable slot. */
export const MAX_PROGRAM = 127;

/**
 * Yoshimi writes its XML through zlib when `gzip_compression` is non-zero and
 * as plain text when it is zero, with the SAME filename either way — so the
 * file has to be sniffed rather than assumed. (Reading the gzipped form as
 * UTF-8 is how `grep` on it returns nothing at all.)
 */
export function readYoshimiXml(path) {
  const buf = readFileSync(path);
  return (buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf).toString('utf8');
}

const unxml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const str = (chunk, name) => {
  const m = chunk.match(new RegExp(`<string name="${name}">([^<]*)</string>`));
  return m ? unxml(m[1]) : null;
};
const num = (chunk, name) => {
  const m = chunk.match(new RegExp(`<par(?:U)? name="${name}" value="(-?\\d+)"`));
  return m ? +m[1] : null;
};

/**
 * The roots-and-banks file, as data. Split-on-lookahead rather than a real XML
 * parser: the shape is fixed, flat and machine-written, and a dependency on the
 * box is a dependency to install on the box.
 */
export function parseBanks(xml) {
  const roots = [];
  for (const rootChunk of xml.split(/(?=<BANKROOT )/).slice(1)) {
    const rid = +rootChunk.match(/<BANKROOT id="(\d+)"/)[1];
    const path = str(rootChunk, 'bank_root');
    const banks = [];
    for (const bankChunk of rootChunk.split(/(?=<bank_id )/).slice(1)) {
      const bid = +bankChunk.match(/<bank_id id="(\d+)"/)[1];
      const dir = str(bankChunk, 'dirname');
      const patches = [];
      for (const insChunk of bankChunk.split(/(?=<instrument_id )/).slice(1)) {
        const pid = +insChunk.match(/<instrument_id id="(\d+)"/)[1];
        // `isUsed` no means Yoshimi knows the slot and knows it is empty.
        if (/name="isUsed" value="no"/.test(insChunk)) continue;
        const file = str(insChunk, 'filename');
        patches.push({ program: pid, name: str(insChunk, 'listname') || file || `slot ${pid + 1}`, file });
      }
      patches.sort((a, b) => a.program - b.program);
      banks.push({ bank: bid, name: dir, dir, patches });
    }
    banks.sort((a, b) => a.bank - b.bank);
    roots.push({ root: rid, path, banks });
  }
  return { roots, version: +(xml.match(/name="Banks_Version" value="(\d+)"/)?.[1] ?? 0) };
}

/**
 * The per-instance config, for the three facts that decide whether a patch
 * change lands at all. Read rather than typed: a wrong guess about these cost
 * an hour once already, and a constant typed in a page can disagree with the
 * synth that is running.
 *
 *   midi_bank_C          the CC that selects a BANK. 32 here. NOT 0.
 *   midi_bank_root       the CC that selects a ROOT. 0 here, and left alone —
 *                        sending banks on it moves the root directory instead,
 *                        after which every program change lands nowhere.
 *   midi_upper_voice_C   the CC that reaches slots 129…160. 128 means "none".
 *   ignore_program_change 0 means program changes are obeyed.
 */
export function parseInstance(xml) {
  return {
    bankCC: num(xml, 'midi_bank_C') ?? 32,
    rootCC: num(xml, 'midi_bank_root') ?? 0,
    upperVoiceCC: num(xml, 'midi_upper_voice_C') ?? 128,
    programChange: num(xml, 'ignore_program_change') === 0,
    rootCurrent: num(xml, 'root_current_ID'),
    bankCurrent: num(xml, 'bank_current_ID'),
  };
}

/**
 * Which root a bank number means.
 *
 * `root_current_ID` is 0 on this board and there is no root 0 — Yoshimi says
 * "No match for root ID 0" at startup and then reports "Root 10" when a bank
 * arrives, so it falls back to the LAST root it knows. Reproduce that, and say
 * which one was picked rather than hiding the choice.
 */
export function chooseRoot(roots, rootCurrent) {
  const named = roots.find((r) => r.root === rootCurrent);
  return named ?? roots[roots.length - 1] ?? null;
}

/** Is the same bank/program the same instrument in every root? */
function rootsAgree(roots) {
  if (roots.length < 2) return true;
  const key = (r) => r.banks.map((b) => `${b.bank}:${b.patches.map((p) => `${p.program}=${p.name}`).join(',')}`).join('|');
  const first = key(roots[0]);
  return roots.every((r) => key(r) === first);
}

/**
 * The whole answer, for one box: which banks exist, what is in them, and what
 * to put on the wire to reach each one.
 *
 * Cross-checked against the filesystem rather than trusted. `yoshimi.banks` is
 * written when Yoshimi rescans, so it can be older than the directory it
 * describes — and a stale list reads exactly like a working one until a patch
 * change silently does nothing. `disk` counts the instrument files actually
 * present; when it disagrees with the list, `stale` says so instead of the
 * caller finding out by ear.
 */
export function yoshimiPatches({ dir = YOSHIMI_DIR } = {}) {
  const banksFile = `${dir}/yoshimi.banks`;
  const instFile = `${dir}/yoshimi-0.instance`;
  if (!existsSync(banksFile)) {
    return { ok: false, reason: `no ${banksFile} — start yoshimi once so it writes its bank map`,
             banks: [], count: 0, bankCC: 32 };
  }
  let parsed, inst;
  try { parsed = parseBanks(readYoshimiXml(banksFile)); }
  catch (e) { return { ok: false, reason: `could not read ${banksFile}: ${e.message}`, banks: [], count: 0, bankCC: 32 }; }
  try { inst = parseInstance(readYoshimiXml(instFile)); }
  catch { inst = { bankCC: 32, rootCC: 0, upperVoiceCC: 128, programChange: true, rootCurrent: null, bankCurrent: null }; }

  const root = chooseRoot(parsed.roots, inst.rootCurrent);
  if (!root) return { ok: false, reason: `${banksFile} lists no bank roots`, banks: [], count: 0, bankCC: inst.bankCC };

  // Slots above 128 need the extended program-change control, and it is off.
  const reach = (p) => p.program <= MAX_PROGRAM;
  let count = 0, hidden = 0, stale = false;
  const banks = root.banks.map((b) => {
    const patches = b.patches.filter(reach).map((p) => ({ program: p.program, name: p.name }));
    hidden += b.patches.length - patches.length;
    count += patches.length;
    let disk = null;
    try {
      // ⚠️ COUNT SLOTS, NOT FILES. Yoshimi writes BOTH .xiz (compressed) and
      // .xiy (plain) instruments, and the SAME slot can be present in both
      // formats — Strings holds 54 files in 47 slots, Guitar 23 in 20. Counting
      // files made this cross-check report every fourth bank as out of date on
      // a board where nothing was wrong, which is worse than not checking: a
      // staleness flag that is always on cannot report staleness. The four
      // leading digits ARE the slot.
      disk = new Set(readdirSync(`${root.path}/${b.dir}`)
        .filter((f) => /^\d{4}-.*\.xi[zy]$/i.test(f))
        .map((f) => f.slice(0, 4))).size;
    } catch { /* a bank root that moved is what `stale` is for */ }
    if (disk !== null && disk !== b.patches.length) stale = true;
    return { bank: b.bank, name: b.name, dir: b.dir, disk, patches };
  }).filter((b) => b.patches.length);

  return {
    ok: count > 0,
    reason: count > 0 ? null : 'yoshimi knows no instruments in the current bank root',
    file: banksFile,
    root: root.root,
    rootPath: root.path,
    roots: parsed.roots.map((r) => ({ root: r.root, path: r.path })),
    rootsAgree: rootsAgree(parsed.roots),
    bankCC: inst.bankCC,
    rootCC: inst.rootCC,
    upperVoiceCC: inst.upperVoiceCC,
    programChange: inst.programChange,
    maxProgram: MAX_PROGRAM,
    banks,
    bankCount: banks.length,
    count,
    hidden,
    stale,
  };
}

/** The stepper's order: every real patch, bank by bank, program by program. */
export function flatten(list) {
  const out = [];
  for (const b of list.banks ?? []) for (const p of b.patches) out.push({ bank: b.bank, bankName: b.name, program: p.program, name: p.name });
  return out;
}

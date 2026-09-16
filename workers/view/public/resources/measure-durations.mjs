// demo/resources/measure-durations.mjs — how long each recording actually is.
//
//   node demo/resources/measure-durations.mjs            # ask only the ones with no answer yet
//   node demo/resources/measure-durations.mjs --again    # ask every one again
//   node demo/resources/measure-durations.mjs --only ia:videoplayback-13_202304/...
//
// NODE ONLY. Writes `durations.json` beside the corpus; `build-corpus.mjs`
// reads that file and puts a `durationMs` on the matching row. It is a separate
// step for one reason: the corpus is built from seventeen catalogues and this
// asks twenty-six MEDIA FILES, which is a different kind of request to a
// different kind of host. Folding it into the build would mean re-asking
// archive.org for headers every time somebody wanted to change a date.
//
// 🔴 GENTLY, AND THAT IS THE WHOLE DESIGN OF THIS FILE RATHER THAN A SETTING IN
// IT. The ask was *"do measure file lengths gently"*, and what makes it gentle
// is measured rather than intended:
//
//   · ONE FILE AT A TIME, with `PAUSE_MS` between two of them. Nothing here is
//     in a hurry; twenty-six files at two seconds apart is under a minute.
//   · `-probesize 65536`. ffprobe reads 5 MB by default before it will say what
//     is in a container. MEASURED on the same mp3, 64 KB against the default:
//     the same duration to the microsecond, in 2.0 s rather than 2.9. For a
//     file 12 MB long that is the difference between reading a header and
//     reading half the recording.
//   · IT ASKS EACH FILE ONCE, EVER. The answer is written down and committed,
//     and a second run skips everything already in the file. A duration does
//     not change; a file that has one does not need asking again. `--again` is
//     there for a host that has replaced its media.
//
// ⚠️ A FILE THAT WOULD NOT ANSWER IS WRITTEN DOWN AS SUCH, with the reason. A
// dropped row and a row nobody asked about look identical in a finished list,
// and only one of them is a finding: `zenodo:5801697` is 225 MB of MPEG program
// stream, which carries no duration in a header at all.

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, 'corpus.json');
const OUT = join(HERE, 'durations.json');

const argv = process.argv.slice(2);
const AGAIN = argv.includes('--again');
const ONLY = (() => {
  const i = argv.indexOf('--only');
  return i < 0 ? null : new Set(argv[i + 1].split(','));
})();

// Two seconds between two files. Nothing about this measurement is urgent, and
// a burst of twenty-six requests at a host is the thing being avoided.
const PAUSE_MS = 2000;
// A file that has not answered in this long is not going to. Long enough for
// archive.org's redirect to a storage node plus a header read on a bad day.
const GIVE_UP_MS = 45000;
const UA = 'positron-corpus/1.0 (+https://positron.studio; kristjan.jansen@gmail.com)';

/**
 * 🔴 WHAT COUNTS AS A RECORDING, AND IT IS THE FILENAME AS WELL AS THE HEADER.
 * `fileType` is the content-type the HOST sent, and archive.org serves an `.avi`
 * as `video/mp4` — the same trap `/tapes/` carries a comment about, which is
 * why both ends test the extension too. Here it only decides who gets ASKED, so
 * a wrong guess costs one request and no wrong data.
 */
const TIME_BASED = /^(audio|video)\//i;
const TIME_EXT = /\.(mp3|m4a|mp4|m4v|webm|ogg|oga|opus|wav|aac|flac|avi|mpg|mpeg|mov|mkv)(\?|#|$)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** ffprobe, with a deadline of our own. `-rw_timeout` covers a socket that has
 *  gone quiet; it does not cover a host that answers one byte a second. */
function probe(url) {
  return new Promise((res) => {
    const args = [
      '-v', 'error',
      '-user_agent', UA,
      // The header, not the recording. See the note at the head of this file.
      '-probesize', '65536', '-analyzeduration', '500000',
      '-rw_timeout', '20000000',
      '-show_entries', 'format=duration,format_name,bit_rate,size',
      '-of', 'json', url,
    ];
    const child = execFile('ffprobe', args, { maxBuffer: 1 << 20 }, (err, stdout, stderr) => {
      clearTimeout(timer);
      if (err && !stdout) return res({ ok: false, why: (stderr || err.message).trim().split('\n')[0] });
      let j = null;
      try { j = JSON.parse(stdout); } catch { /* ffprobe wrote something else */ }
      const f = j?.format;
      const secs = Number(f?.duration);
      if (!Number.isFinite(secs) || secs <= 0) {
        return res({ ok: false, why: 'the container carries no duration', format: f?.format_name || null });
      }
      res({ ok: true, ms: Math.round(secs * 1000), format: f?.format_name || null,
            kbps: f?.bit_rate ? Math.round(Number(f.bit_rate) / 1000) : null,
            bytes: f?.size ? Number(f.size) : null });
    });
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* gone */ } },
      GIVE_UP_MS);
  });
}

const version = await new Promise((res) => {
  execFile('ffprobe', ['-version'], (e, out) => res(e ? 'ffprobe' : (out.split('\n')[0] || 'ffprobe')));
});

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8'));
const held = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { items: {} };
const known = { ...held.items };

const want = corpus.items.filter((it) => it.file
  && (TIME_BASED.test(it.fileType || '') || TIME_EXT.test(it.file))
  && (!ONLY || ONLY.has(it.id)));

console.log(`${want.length} recordings in the corpus · ${version}`);
let asked = 0, got = 0, refused = 0, skipped = 0;
for (const it of want) {
  if (!AGAIN && known[it.id] && !ONLY) { skipped++; continue; }
  if (asked) await sleep(PAUSE_MS);
  asked++;
  const r = await probe(it.file);
  const at = new Date().toISOString();
  if (r.ok) {
    got++;
    known[it.id] = { ms: r.ms, format: r.format, kbps: r.kbps, bytes: r.bytes, at };
    console.log(`  ${String(Math.round(r.ms / 1000)).padStart(5)}s  ${it.id}`);
  } else {
    refused++;
    // ⚠️ WRITTEN DOWN, NOT DROPPED. `ms: null` with a reason is a measurement
    // that was made and came back empty, which is a different fact from a file
    // nobody asked about, and the page says so in its own gutter.
    known[it.id] = { ms: null, why: r.why, format: r.format ?? null, at };
    console.log(`     --  ${it.id} · ${r.why}`);
  }
}

const doc = {
  what: 'How long each recording in corpus.json actually runs, read off the file itself. '
      + 'One request per file, once, at least two seconds apart, reading the header rather '
      + 'than the recording.',
  generator: 'demo/resources/measure-durations.mjs',
  how: version,
  generated: new Date().toISOString(),
  counts: {
    known: Object.values(known).filter((v) => v.ms > 0).length,
    refused: Object.values(known).filter((v) => !(v.ms > 0)).length,
  },
  items: Object.fromEntries(Object.entries(known).sort(([a], [b]) => a.localeCompare(b))),
};
writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
console.log(`\n${OUT}`);
console.log(`${doc.counts.known} measured · ${doc.counts.refused} would not say · `
  + `${asked} asked this run, ${got} answered, ${refused} did not, ${skipped} already known`);

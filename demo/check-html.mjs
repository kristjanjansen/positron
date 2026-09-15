#!/usr/bin/env node
/**
 * Syntax-check the JavaScript inside a demo page, without a browser.
 *
 * 🔴 IT EXISTS BECAUSE A BACKTICK INSIDE A GLSL COMMENT CLOSES THE TEMPLATE
 * LITERAL AROUND IT. That happened seven times in one session on
 * `/videoradio/`, whose shaders are template literals with prose in them, and
 * every time the page died at parse: no log line, no assert, no picture, and an
 * error in devtools pointing at a line hundreds below the one that broke it.
 * `node --check` finds it in about forty milliseconds and says where.
 *
 * ⚠️ IT IS NOT A HARNESS AND IT OPENS NOTHING. No Chrome, no profile, no relay,
 * no stream off anybody else's server — which is what makes it the right check
 * to run after editing a page this repo has asked not to be re-verified. It
 * answers one question, "will this parse", and says nothing at all about
 * whether the page works.
 *
 *   node demo/check-html.mjs demo/radio/index.html
 *   node demo/check-html.mjs demo/ *\/index.html     (every page)
 *
 * ⚠️ `--check` NEEDS A FILE WITH AN EXTENSION IT KNOWS, so each block is
 * written to a temporary `.mjs` beside the OS temp dir and removed afterwards.
 * Piping it in reports `[stdin]` as the filename and every line number is the
 * block's rather than the page's; the offset is added back here instead.
 */
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node demo/check-html.mjs <page.html> [more.html ...]');
  process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), 'poscheck-'));
let blocks = 0, bad = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  // Only modules. A classic `<script>` with no type is not parsed as one, and
  // this repo has none in a page.
  const re = /<script\b[^>]*\btype\s*=\s*["']module["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (let m; (m = re.exec(src)); ) {
    // ⚠️ THE LINE THE BLOCK STARTS ON, so a reported line is a line in the
    // PAGE. A number that is right about a temporary file and wrong about the
    // file being edited is worse than no number.
    const before = src.slice(0, m.index + m[0].indexOf('>') + 1);
    const offset = before.split('\n').length - 1;
    const tmp = join(dir, `b${blocks}.mjs`);
    blocks++;
    writeFileSync(tmp, m[1]);
    try {
      execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    } catch (e) {
      bad++;
      const out = String(e.stderr || e.stdout || e.message);
      // `/tmp/poscheck-x/b0.mjs:412` -> `demo/page/index.html:1099`
      console.log(out.replace(new RegExp(`${tmp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+)`, 'g'),
        (_, n) => `${file}:${Number(n) + offset}`));
    }
  }
}
rmSync(dir, { recursive: true, force: true });
// ⚠️ SAY THE BLOCK COUNT. A page whose script tag was renamed would check zero
// blocks and pass, which is the shape of green this repo minds most.
console.log(`${blocks} module block${blocks === 1 ? '' : 's'} in ${files.length} file${files.length === 1 ? '' : 's'}: ${bad ? `${bad} FAILED` : 'all parse'}`);
process.exit(bad ? 1 : 0);

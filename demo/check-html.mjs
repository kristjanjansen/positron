#!/usr/bin/env node
// node demo/check-html.mjs <page.html ...>: `node --check` on each module block of a page, no
// browser. It answers "will this parse" (a backtick in a GLSL comment closes the template) and
// nothing more. Each block goes to a temporary `.mjs`, since `--check` needs a known extension.
// why: lessons/harness.md#check-html
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
    // The line the block starts on, so a reported line is a line in the page.
    // why: lessons/harness.md#line-offset
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
// Say the block count: a renamed script tag would check zero blocks and pass.
// why: lessons/harness.md#block-count
console.log(`${blocks} module block${blocks === 1 ? '' : 's'} in ${files.length} file${files.length === 1 ? '' : 's'}: ${bad ? `${bad} FAILED` : 'all parse'}`);
process.exit(bad ? 1 : 0);

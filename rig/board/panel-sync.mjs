// node rig/board/panel-sync.mjs [<pi>]: copy demo/shell/panel-screen.mjs to the board on every save,
// where panel.mjs reloads it within a second. For designing the OLED live beside /devices/text/?live=1.
// The address defaults to the one the board answered on 2026-10-15; push.sh finds it if it moved.
import { watch, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, basename } from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PI = process.argv[2] || process.env.BOARD_IP || '192.168.1.213';
const SRC = fileURLToPath(new URL('../../demo/shell/panel-screen.mjs', import.meta.url));
const DEST = `positron@${PI}:/opt/positron-board/demo/shell/panel-screen.mjs`;
let last = '', timer = null;
function copy() {
  let m;
  try { m = createHash('md5').update(readFileSync(SRC)).digest('hex'); } catch { return; }   // mid-save
  if (m === last) return;
  last = m;
  const t0 = Date.now();
  execFile('scp', ['-q', '-o', 'BatchMode=yes', SRC, DEST], (err) => {
    console.log(err ? `copy failed: ${err.message.trim()}` : `${new Date().toTimeString().slice(0, 8)} sent to ${PI} in ${Date.now() - t0} ms`);
  });
}
copy();
// The folder, not the file: an editor that saves by replacing the file leaves a watch on the old one.
watch(dirname(SRC), (ev, name) => { if (name === basename(SRC)) { clearTimeout(timer); timer = setTimeout(copy, 150); } });
console.log(`watching ${SRC}, copying to ${PI} on every save. Ctrl+C stops.`);

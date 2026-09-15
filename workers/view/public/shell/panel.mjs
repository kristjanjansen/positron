// demo/shell/panel.mjs — a picture with a footer of real numbers under it.
//
// `plan-xr-room.md` §2 says the room's panels are "like `mirror`'s: a picture
// with a footer of real numbers under it — that already exists as a design and
// it reads well, so the room borrows rather than invents". This is that design,
// extracted, so the borrowing is a module rather than a resemblance.
//
// 🔴 IT DRAWS TO A CANVAS, WHICH IS WHY IT WORKS IN BOTH PLACES. A page can put
// the canvas on screen; an immersive session can hand the same canvas to
// `texImage2D` and hang it in the room. `scene` already does exactly that for
// its status panel — a 2D canvas uploaded as a texture — because THE 2D PAGE IS
// INVISIBLE INSIDE AN IMMERSIVE SESSION: `d.log` and the readout are behind
// your face, so anything you need to read while wearing the headset has to be
// drawn in the scene.
//
// ⚠️ CONTAINED, NEVER COVERED OR STRETCHED. The rule `pattern.mjs` paid for:
// iOS ignores a resolution request and hands back PORTRAIT, where stretching
// squashes a face and `cover` showed 32% of the frame. One line of arithmetic
// said so before it shipped and nobody did it.
//
// ⚠️ THE FOOTER CARRIES WHAT THIS PANEL MEASURED, NEVER INSTRUCTIONS. Same rule
// as a strip's gutter: `latency 2.31 s` or an honest `no way to check`, not
// "press play". A panel that has nothing to say says so in words, because a
// blank cell collapses "we did not look" and "we looked and it was fine".
//
// ⚠️ AND A PANEL THAT IS NOT LIVE SAYS SO. `plan-xr-room.md` §5.6: a frozen
// frame reads as a broken stream. `state` is drawn where you cannot miss it.

// 🔴 NO PAD AROUND THE PICTURE. A panel in a headset is a SCREEN, and a screen
// with a margin around its image reads as a photograph of a screen. The picture
// goes edge to edge and the only inset is the footer's own text. Reported from
// the device, and it is the same instinct that took the border off a television.
const PAD = 10;                 // text inset inside the footer ONLY
export const FOOT = 44;         // the footer strip's height at 1x
const ROUND = 18;               // the corner radius, at 1x

/**
 * 🔴 THE FOOTER, ONCE, FOR THE PANELS THAT HAVE A PICTURE ABOVE IT AND FOR THE
 * ONES THAT DO NOT.
 *
 * A panel whose picture is RENDERED by the graphics card rather than drawn on a
 * canvas cannot carry a word — a framebuffer has no text in it — so its numbers
 * have to arrive as a second, much smaller texture. That strip has to look
 * exactly like the footer under every other panel here, and the only way two
 * surfaces look exactly alike is if they are one function.
 *
 * ⚠️ FIXED COLUMNS, so two panels side by side can be read across. A column
 * that sizes to its content is the alignment bug the slider group had.
 */
function footerInto(ctx, footer, w, fy, tone) {
  ctx.strokeStyle = tone.line; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, fy - 8); ctx.lineTo(w - PAD, fy - 8); ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const cols = Math.max(1, footer.length);
  const colW = (w - PAD * 2) / cols;
  footer.forEach(([k, v], i) => {
    const x = PAD + i * colW;
    ctx.fillStyle = tone.dim;
    ctx.font = '500 9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(String(k).toUpperCase(), x, fy);
    ctx.fillStyle = v == null || v === '' ? tone.dim : tone.fg;
    ctx.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
    // ⚠️ NOTHING, NOT A ZERO. A missing measurement prints as ABSENT — a
    // zero reads as a very impressive measurement of nothing. It drew an em
    // dash until 2026-09-13; the label above the slot already says the slot
    // is there, and a column of dashes reads as failed readings.
    if (v != null && v !== '') ctx.fillText(String(v), x, fy + 12);
  });
}

/**
 * A footer strip on its own — the bottom of a panel, with no picture over it.
 *
 * For a panel whose picture is a framebuffer in a headset session's own
 * context. It is a NINTH of a full panel's pixels and it is handed to the card
 * only when a number moves rather than every frame, which is most of why a
 * live-rendered panel costs no copy worth measuring. `dirty()` is the version
 * an XR render loop compares against its last upload.
 */
export function createPanelFooter({ width = 640, scale = 2 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(FOOT * scale);
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const tok = (n, fb) => (css.getPropertyValue(n) || '').trim() || fb;
  const tone = { fg: tok('--fg', '#e8edf5'), dim: tok('--dim2', '#7a879c'),
                 field: '#0b0e14', line: '#232c3a' };
  let version = 0;
  function draw(footer = []) {
    ctx.save();
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, width, FOOT);
    ctx.fillStyle = tone.field;
    ctx.fillRect(0, 0, width, FOOT);
    footerInto(ctx, footer, width, 8, tone);
    ctx.restore();
    version++;
    return version;
  }
  draw([]);
  return { canvas, ctx, draw, dirty: () => version, height: FOOT };
}

/**
 * @param {object} o
 * @param {number} [o.width]
 * @param {number} [o.height]
 * @param {string} o.title      what this panel is — a transport name, usually
 * @param {number} [o.scale]    device pixels per css pixel for the canvas
 * @returns {{canvas:HTMLCanvasElement, draw:(o:object)=>void, dirty:()=>number}}
 */
export function createPanel({ width = 640, height = 400, title = '', scale = 2 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  let version = 0;

  const css = getComputedStyle(document.documentElement);
  const tok = (n, fb) => (css.getPropertyValue(n) || '').trim() || fb;
  const FG = tok('--fg', '#e8edf5');
  const DIM = tok('--dim2', '#7a879c');
  const HI = tok('--hi', '#ffd400');
  const OK = tok('--ok', '#6ee7a8');
  const FIELD = '#0b0e14';
  const LINE = '#232c3a';

  /**
   * @param {object} o
   * @param {CanvasImageSource|null} o.source  a <video>, a canvas, anything drawable
   * @param {Array<[string,string]>} [o.footer] label/value pairs
   * @param {string} [o.state]   'live' | 'still' | a sentence saying why not
   * @param {boolean} [o.gazed]  is this the panel being looked at
   */
  function draw({ source, footer = [], state = 'live', gazed = false } = {}) {
    const W = canvas.width, H = canvas.height, s = scale;
    ctx.save();
    ctx.scale(s, s);
    const w = W / s, h = H / s;

    // Rounded, and CLIPPED to the rounding — a radius drawn only as a border
    // leaves square corners of picture poking out past it.
    ctx.clearRect(0, 0, w, h);
    const round = (r) => { ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); };
    round(ROUND);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = FIELD;
    ctx.fillRect(0, 0, w, h);

    const picH = h - FOOT;
    const picW = w;

    // ── the picture ──────────────────────────────────────────────────────
    if (source) {
      const sw = source.videoWidth || source.width || 0;
      const sh = source.videoHeight || source.height || 0;
      if (sw && sh) {
        // CONTAIN. `Math.min`, never `Math.max` — the whole difference between
        // showing the frame and showing a third of it.
        const k = Math.min(picW / sw, picH / sh);
        const dw = sw * k, dh = sh * k;
        ctx.drawImage(source, (picW - dw) / 2, (picH - dh) / 2, dw, dh);
      }
    } else {
      // Not a frozen frame and not an empty box: words.
      ctx.fillStyle = DIM;
      ctx.font = '500 13px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText(typeof state === 'string' && state !== 'live' ? state : 'nothing arriving yet',
                   PAD + 2, picH / 2);
    }

    // ── whether it is live ───────────────────────────────────────────────
    // 🔴 NO TITLE IN THE CORNER. It sat over the picture, which is the one
    // thing a panel exists to show, and it said something that never changed —
    // the same rule as a readout cell that cannot move. What the panel IS
    // belongs in the footer beside its numbers, where it is read once.
    ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'top';
    if (state !== 'live') {
      const say = state === 'still' ? 'not live' : String(state);
      ctx.fillStyle = HI;
      ctx.textAlign = 'right';
      ctx.fillText(say, w - PAD - 2, PAD);
      ctx.textAlign = 'left';
    }

    // ── the footer ─────────────────────────────────────────
    // One routine, shared with `createPanelFooter` — see the note above it.
    footerInto(ctx, footer, w, h - FOOT + 8,
               { fg: FG, dim: DIM, field: FIELD, line: LINE });

    ctx.restore();
    // The one you are looking at. An edge rather than a wash: a tint over the
    // picture changes the thing the panel exists to show. Drawn AFTER the clip
    // is released so the stroke is not half eaten by its own rounding.
    ctx.strokeStyle = gazed ? OK : LINE;
    ctx.lineWidth = gazed ? 2.5 : 1;
    ctx.beginPath();
    ctx.roundRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, ROUND - 1);
    ctx.stroke();
    ctx.restore();
    version++;
  }

  // A texture upload is only worth doing when the picture changed; `dirty()`
  // is what an XR render loop compares against its own last upload.
  return { canvas, ctx, draw, dirty: () => version };
}

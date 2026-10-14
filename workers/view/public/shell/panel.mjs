// demo/shell/panel.mjs: a picture with a footer of real numbers under it, drawn to a canvas
// so a page shows it and an XR session uploads it. Contained, never covered or stretched;
// the footer carries measurements, never instructions; a panel that is not live says so.
// why: lessons/kit-panel.md#header

// No pad around the picture: in a headset a margin reads as a photograph of a screen.
// why: lessons/kit-panel.md#no-pad
import { font, whenFaces } from './canvas-font.mjs';

const PAD = 10;                 // text inset inside the footer ONLY
export const FOOT = 44;         // the footer strip's height at 1x
const ROUND = 18;               // the corner radius, at 1x

/**
 * The one footer, for panels with a picture and for a live panel's separate strip, so the two
 * look alike. Fixed columns, so panels side by side read across.
 * why: lessons/kit-panel.md#footer-into
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
    ctx.font = font(400, 9);
    ctx.fillText(String(k).toUpperCase(), x, fy);
    ctx.fillStyle = v == null || v === '' ? tone.dim : tone.fg;
    ctx.font = font(600, 15);
    // A missing measurement prints nothing, never a zero or a dash.
    // why: lessons/kit-panel.md#footer-absent
    if (v != null && v !== '') ctx.fillText(String(v), x, fy + 12);
  });
}

/**
 * A footer strip alone, for a panel whose picture is a framebuffer in an XR session. A ninth
 * of the pixels, uploaded only when a number moves; `dirty()` is the version to compare.
 * why: lessons/kit-panel.md#create-panel-footer
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
  let version = 0, lastFooter = [];
  function draw(footer = []) {
    lastFooter = footer;
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
  // The face may arrive after the first draw, and a canvas keeps the fallback
  // it was drawn in, so draw the last footer again once it is here.
  whenFaces(() => draw(lastFooter));
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
  let lastArgs = null;
  function draw(args = {}) {
    lastArgs = args;
    const { source, footer = [], state = 'live', gazed = false } = args;
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
      ctx.font = font(400, 13);
      ctx.textBaseline = 'middle';
      ctx.fillText(typeof state === 'string' && state !== 'live' ? state : 'nothing arriving yet',
                   PAD + 2, picH / 2);
    }

    // ── whether it is live ──
    // No title over the picture; what the panel is belongs in the footer.
    // why: lessons/kit-panel.md#draw-no-title
    ctx.font = font(600, 12);
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
  // A panel drawn once before the face loaded keeps the fallback, so draw
  // the last one again when it arrives. A live panel would get there anyway.
  whenFaces(() => { if (lastArgs) draw(lastArgs); });
  return { canvas, ctx, draw, dirty: () => version };
}

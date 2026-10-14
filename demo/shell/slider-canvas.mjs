// demo/shell/slider-canvas.mjs: the kit slider (slider.mjs, `.sld-lane` and `.sld-knob` in
// shell.css) drawn on a canvas, for a picture that is recorded rather than laid out.
// The look is read off a real `.sld` built off screen, so the two cannot drift.
//
//   const look = sliderLook();
//   drawSlider(ctx, look, { x, y, w, scale: 2.88, t: 0.4, marks: [{ at: 0.2, label: 'R2', on: true }] });

/** Where the handle's left edge sits: a share of the TRAVEL, never of the lane, as slider.mjs places it. */
export const knobLeft = (t, laneW, knobW) => Math.max(0, Math.min(1, t)) * (laneW - knobW);
/** A mark's centre: on the handle's centre when the handle is at `at`, as /radio/tuner/'s scale. */
export const markX = (at, laneW, knobW) => knobLeft(at, laneW, knobW) + knobW / 2;

// /radio/tuner/'s `.cc-mark` (11 px mono, --dim2, --hi when tuned) under `.cc-dial`'s 6 px gap.
// It is page CSS there, not kit, so its two numbers live here.
export const MARK = { px: 11, gap: 6 };

const num = (v) => parseFloat(v) || 0;

/** The kit slider's computed look, in CSS px at scale 1. Browser only. */
export function sliderLook(doc = document) {
  const mk = (cls) => Object.assign(doc.createElement('span'), { className: cls });
  const sld = mk('sld'), lane = mk('sld-lane'), knob = mk('sld-knob');
  lane.append(knob); sld.append(lane);
  const host = mk('');
  host.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden';
  host.append(sld);
  doc.body.append(host);
  try {
    const L = getComputedStyle(lane), K = getComputedStyle(knob), R = getComputedStyle(doc.documentElement);
    // `inset 0 0 0 1px <colour>`, serialised as `rgb(..) 0px 0px 0px 1px inset`: the 4th length is the line
    const sh = L.boxShadow, col = sh.match(/rgba?\([^)]*\)|#[0-9a-f]+/i);
    const lens = sh.replace(col?.[0] || '', '').match(/-?[\d.]+px/g) || [];
    return {
      laneH: lane.getBoundingClientRect().height || num(L.height),
      knobW: knob.getBoundingClientRect().width || num(K.width),
      knobH: knob.getBoundingClientRect().height || num(K.height),
      radius: num(L.borderTopLeftRadius),
      knobRadius: num(K.borderTopLeftRadius),
      lane: L.backgroundColor,
      edge: col ? col[0] : R.getPropertyValue('--line2').trim(),
      edgeW: lens.length >= 4 ? num(lens[3]) : 1,
      knob: K.backgroundColor,
      dim2: R.getPropertyValue('--dim2').trim(),
      hi: R.getPropertyValue('--hi').trim(),
      mono: R.getPropertyValue('--mono').trim() || 'monospace',
    };
  } finally { host.remove(); }
}

function round(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

/**
 * Draw the slider at `x, y`, `w` wide, every kit size times `scale`, the handle at `t` (0 to 1),
 * and each mark's label under the lane, lit when `on`. Returns where things landed, for a check.
 */
export function drawSlider(ctx, look, { x, y, w, scale = 1, t = 0, marks = [] }) {
  const h = look.laneH * scale, kw = look.knobW * scale, kh = look.knobH * scale;
  round(ctx, x, y, w, h, look.radius * scale);
  ctx.fillStyle = look.lane;
  ctx.fill();
  // the lane's edge is an inset shadow, so the line sits inside the lane's own box
  const e = look.edgeW * scale;
  round(ctx, x + e / 2, y + e / 2, w - e, h - e, Math.max(0, look.radius * scale - e / 2));
  ctx.lineWidth = e;
  ctx.strokeStyle = look.edge;
  ctx.stroke();
  const kx = x + knobLeft(t, w, kw);
  round(ctx, kx, y, kw, kh, look.knobRadius * scale);
  ctx.fillStyle = look.knob;
  ctx.fill();

  const px = MARK.px * scale, base = y + h + MARK.gap * scale + px * 0.8;
  ctx.font = `400 ${px}px ${look.mono}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const m of marks) {
    ctx.fillStyle = m.on ? look.hi : look.dim2;
    ctx.fillText(m.label, x + markX(m.at, w, kw), base);
  }
  ctx.textAlign = 'left';
  return { knobX: kx, knobW: kw, top: y, bottom: y + h, labelBase: base, labelPx: px };
}

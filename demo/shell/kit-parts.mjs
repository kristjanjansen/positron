// demo/shell/kit-parts.mjs, which block of the kit lives on which part page.
//
// 🔴 THE BLOCK MAP, 2026-10-06, FOR THE KIT SPLIT (plans/plan-kit-split.md
// section 2.4). `/kit/` was one page of eight tabs and every block on it had an
// address, `/kit/#keyboard`, so links to blocks exist in this repository and in
// people's notes. Once the parts are pages of their own at `/kit/<part>/`, an
// old address has to be told where its block went, and this is where that is
// written down.
// ⚠️ IT IS A SECOND COPY OF WHAT THE PAGES BUILD, SO BOTH ENDS ASSERT IT. Every
// part page compares the ids its `section()` calls produced against its row
// here, in order (`checkPage()` in `kit-page.mjs`), so a block added to a page
// without being added here goes red on the page that added it. The forwarder,
// which is `demo/kit/index.html` since step 4 of the plan, reads it and grades
// only the lookup, because it builds nothing.
// ⚠️ THE ORDER IS THE TAB ORDER `/kit/` HAD, and the order inside a row is the
// order of the blocks on that page, which is newest first.
// ⚠️ THE `slides` ROW WAS RE-DERIVED WHEN SLIDES MOVED TO `/kit/slides/` (step 4,
// the same day) from that page's own `section()` and `slideBlock()` calls, and
// that page asserts it like every other.
// ⚠️ AN ID IS THE TITLE, LOWER CASE, WITH EVERY RUN OF OTHER CHARACTERS A DASH,
// which is `idFor` below and the same function the monolith used.
// ⚠️ `logo` IS THE NINTH PART, 2026-10-06 (*"add kit/logo page and use
// individual slides from the brand slides"*): the logo left `/kit/`'s BRAND
// tab for a `brand` deck on the front page, and came back as this part when
// that deck was removed, one block per slide.

export const KIT_PARTS = [
  { part: 'input', label: 'INPUT', ids: [
    'code-box', 'knobs-under-the-code', 'compile-on-a-pause', 'toggle',
    'range-slider', 'checkbox', 'choice-standing-up', 'drop-target', 'button-group',
    'control-row', 'stepper', 'slider', 'slider-group', 'slider-group-paired',
    'invisible-hand', 'choice', 'choice-pending', 'field', 'piano-roll', 'keyboard',
    'picker',
  ] },
  { part: 'status', label: 'STATUS', ids: [
    'midi-log', 'presence', 'readout-and-log', 'table',
  ] },
  { part: 'timeline', label: 'TIMELINE', ids: [
    'local-and-remote', 'note-grid', 'transport-bar', 'glued-transport-bar',
    'strip-view', 'video-panel',
  ] },
  { part: 'layout', label: 'LAYOUT', ids: [
    'tab-page', 'stack', 'tabs', 'card', 'card-grid-on-a-phone',
    'card-refused-and-with-buttons',
  ] },
  { part: 'devices', label: 'DEVICES', ids: [
    'instrument-panel', 'glued-rows', 'panel-seam', 'instrument-header',
    'stepped-knob', 'control-grid', 'instrument', 'step-grid', 'envelope',
    'filter-response', 'waveform', 'panel', 'segment-display', 'knob', 'pad',
    'fader', 'head-gap-and-foot', 'channel-strip',
  ] },
  { part: 'hardware', label: 'HARDWARE', ids: [
    'key-labels', 'header', 'link', 'activity', 'hold', 'text', 'router-firmware',
    'oled-fonts',
  ] },
  { part: 'diagram', label: 'DIAGRAM', ids: [
    'diagram', 'diagram-a-label-that-does-not-fit', 'diagram-containers',
    'diagram-inner-arrows', 'diagram-return-paths', 'diagram-routing',
    'diagram-on-a-phone',
  ] },
  { part: 'slides', label: 'SLIDES', ids: [
    'names-from-the-code-in-the-words', 'synths-deck', 'the-player', 'half-width-players', 'step-6', 'step-5', 'step-4', 'step-3',
    'step-2', 'step-1', 'the-scale', 'title-slide', 'big-number',
    'headline-over-text', 'statement', 'table-with-row-lines',
    'live-log-on-a-slide', 'live-tabular-log-on-a-slide', 'headline-with-a-caption',
    'yellow-and-hue-marks', 'title-on-top-text-at-the-bottom',
    'interactive-on-the-right', 'oled-on-a-slide', 'screen-and-keys-on-a-slide',
    'slider-on-a-slide', 'knob-on-a-slide', 'waveform-on-a-slide',
    'video-on-a-slide', 'diagram-on-a-slide', 'step-grid-on-a-slide',
    'readout-on-a-slide', 'timeline-on-a-slide', 'transport-bar-on-a-slide',
    'fau-on-a-slide',
  ] },
  { part: 'logo', label: 'LOGO', ids: [
    'stacked-logo', 'horizontal-logo', 'wordmark-in-fives', 'wordmark-in-threes',
    'favicon', 'app-icon',
  ] },
];

export const idFor = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The row for one part, or null. */
export const partRow = (part) => KIT_PARTS.find((p) => p.part === part) || null;

/**
 * Where an old `/kit/#name` address goes now: a block id lands on its part's
 * page at that block, a part id lands on the part's page, anything else is
 * null and the forwarder stays where it is.
 */
export function whereIs(name) {
  if (!name) return null;
  for (const p of KIT_PARTS) if (p.ids.includes(name)) return `/kit/${p.part}/#${name}`;
  for (const p of KIT_PARTS) if (p.part === name) return `/kit/${p.part}/`;
  return null;
}

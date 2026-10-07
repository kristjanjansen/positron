// demo/shell/decks.mjs: the slide decks, played on the front page.
//
// 🔴 A DECK IS PLAIN DATA, PLAYED IN PLACE ON THE FRONT PAGE. Asked 2026-10-06,
// after a first deck had been built as /brand/ with a card linking to it: *"use
// 2col slidedeck here. no separate page"*. So the front page puts one half
// width player per deck under its `slides` heading, two a row, one below
// 560 px of the row's own width (the container query `/cam/` and the kit's
// HALF WIDTH PLAYERS use). Both front page renderers call `mountDecks`:
// demo/index.html locally and workers/view/menu.html on the edge, so there is
// one copy of it.
// ⚠️ AND SINCE LATER THE SAME DAY A DECK ALSO HAS A PAGE, `/slides/<name>/`
// (`deckPage` below), which the half width player's footer links to. The
// card is still the player; the page is where a deck is played at full width.
//
// ⚠️ NOTHING HERE OPENS ANYTHING. A slide is drawn from its data; the only
// files a deck costs are the slide face's, from this origin.
// ⚠️ AND THE `synths` DECK KEEPS THAT ON A VISIT. Its second slide draws a
// scope, code and a plate; the Faust runtime and the compiled program are
// fetched by a `Test tone` press and by nothing else, the live compiler only
// by a press after the code was edited, and the only AudioContext is the
// page's shared one, made by that press (`demo/shell/slide-synth.mjs`).

import { createSlidePlayer, fitBox } from './slide.mjs';
import { createCodeBox } from './code-box.mjs';
import { SYNTH_STEPS } from './synth-steps.mjs';
import { synthSlot } from './slide-synth.mjs';
import { deckFrameHTML } from '../manifest.mjs';

/**
 * SYNTHS IN CODE, asked 2026-10-06: *"do slide deck Synths in code in the fau
 * examples ... keep it simple. add to frontpage"*, and cut to TWO SLIDES the
 * same day: *"rm fau slides c-f. first layout Synths / in code (better desc),
 * no body text"*, then a split with the title and what is going on on the
 * left and one instrument panel on the right (`demo/shell/slide-synth.mjs`).
 * The intro sets its two lines the way the brand logo sets its three
 * (`brand-slides.mjs`), declared `lines` at step 6, the largest the scale has, solid, on the left
 * edge, with only a caption under them. The program is compiled ahead of time
 * (`demo/resources/build-faust-aot.mjs`), so `Test tone` costs a few kB and no
 * compiler until somebody edits the code.
 */
/** Each program's words on its slide, by `id`: what a line of the code does
 * and what to try, asked 2026-10-06 as *"make useful slide texts"*. The third
 * slide the same day: *"slode 3: make 0.5 into knob 0..1"*, and the fourth:
 * *"slide 4 is freq"*. */
// NO TITLES ON THE STEPS, 2026-10-06: *"rm titles from 2-4, not useful"*,
// after *"slide titles make no sense. its educational step by step
// material"*. The sentence is the slide. A name or a piece of code in
// backticks is set in mono, and a knob's name wears its knob's hue
// (`hueVars` in slide.mjs, called by the slot from its hue book).
const WORDS = {
  sine: { text: '`os.osc(440)` is a sine at 440 Hz and `* 0.5` plays it at half volume. '
      + 'Change a number and press Start to hear yours' },
  volume: { text: '`hslider` makes the 0.5 in `process` a knob named `volume`. '
      + 'Turn it while the tone plays' },
  pitch: { text: '`freq` puts the 440 on a knob beside `volume`, from 50 to 2000 Hz. '
      + 'Turn it to 880 and the tone goes up an octave' },
  saw: { text: '`os.sawtooth` puts a sawtooth where the sine was, brighter and buzzier. '
      + 'Watch the scope change shape' },
  filter: { text: '`fi.lowpass` lets through what is under `cutoff` and takes the rest away. '
      + 'Turn `cutoff` down and the buzz fades to a dull hum' },
  lfo: { text: 'An LFO is a sine too slow to hear, and `sweep` moves `cutoff` with it. '
      + 'Turn `rate` and `depth` while it plays' },
  // slide 6, asked as *"how to make it a radio (sawtooth?)"*
  wave: { text: '`nentry` with a radio style draws `wave` as a choice, and `select2` plays the sine or the saw by it. '
      + 'Pick saw while the tone plays' },
};
const SYNTHS = [
  // the positron deck's title slide, the name and one line on the bottom edge,
  // asked 2026-10-07 as *"use same style for synths slide 1"*; it was two
  // `lines` at step 6, then 5, with a caption
  { name: 'synths in code', title: 'Synths in code', by: 'From a sine wave to an instrument' },
  ...SYNTH_STEPS.filter((st) => !st.hidden).map((st) => ({
    // a third for the words and two for the instrument, the words on the
    // foot of their column, asked 2026-10-06 as *"use 1:2 cols layout"* and
    // *"align text to bottom of slide"*
    name: st.name, layout: 'split', side: 'right', cols: '1:2', bottom: true, ...WORDS[st.id],
    // one step down, asked 2026-10-06 as *"use smaller text size"*
    textStep: 2,
    slot: synthSlot(st),
  })),
];

/**
 * WHAT IS POSITRON, 2026-10-07, asked as *"what-is-positron.md make slides.
 * shorten speaker notes to body text"*. The headings are the talk's own; each
 * body is one sentence cut from that slide's speaker notes, and the notes
 * themselves are kept whole in `notes`, which is not drawn. The source's
 * format line (`MIDI · audio · ...`) is not on a slide: a row of facts glued
 * with middots is the thing this repository does not print.
 */
/**
 * THE PROMPT ON THE LAST SLIDE, asked 2026-10-07 as *"add actual prompt (see
 * readme) that merges cf and positron skill lookup, put it into code box"*.
 * VERBATIM from README.md's `Build one like it`, which is where it is kept and
 * explained: Cloudflare's own setup line, then the positron-start skill. If
 * one changes, change the other.
 * ⚠️ READ ONLY, and a URL is coloured as a string so the two lookups stand out.
 */
export const SETUP_PROMPT = `Fetch and execute the appropriate instructions to set me up for Cloudflare from
https://developers.cloudflare.com/agent-setup/prompt.md

Then read https://raw.githubusercontent.com/kristjanjansen/positron/main/.claude/skills/positron-start/SKILL.md
and follow it exactly. Run every command yourself rather than asking me to.
If you cannot read that file, stop and tell me. Do not guess what it says.

I want to build something like the stage demo at https://positron.studio/stage/.`;
const PROMPT_LANG = { name: 'prompt', rules: [[/https?:\/\/\S+/, 'string'], [/[^\s]+/, '']] };
function promptSlot(host) {
  const code = createCodeBox({ language: PROMPT_LANG, value: SETUP_PROMPT, rows: 11, label: '',
    ariaLabel: 'the prompt to paste into a coding agent, read only' });
  code.input.readOnly = true;
  // a narrower logical width and soft wrapping, so the prompt is read at a
  // larger size than its 107 character lines would allow unwrapped
  const fb = fitBox(host, 560, { fill: true });
  fb.inner.append(code.el);
  return null;
}

const POSITRON_WORDS = [
  // 🔴 TEN THINGS TO DO, 2026-10-07, asked as *"rename slides to 10 things you
  // can do with Positron. make descs be useful, see slodes skills. cut 2ns
  // slide. add first interactive element"*. So the deck is its title and ten
  // slides, each heading a thing a visitor can do, each body what to press and
  // what changes, each caption the page where it is done. Every body is read
  // off that page's own manifest line or source the same day. The first thing
  // was done ON the slide (the synths deck's volume step) until it was cut the
  // same day: *"rm Build a synth from shared parts slide"*.
  // ⚠️ NO SUBTITLE NOW: the three line name and the two line subtitle spilled
  // the title slide (MEASURED by the deck's own spill check), so the subtitle
  // went to the notes rather than the name being cut
  { name: 'title', title: '10 things you can do with Positron',
    notes: 'From microcontrollers to distributed performances. I started building Positron for my own work: making instruments, working with recordings and connecting media across devices. I want other people to be able to understand those parts and adapt them for their own work. Positron is an evolving R&D project.' },
  { name: 'connect', say: 'Connect instruments and streams',
    text: 'Link notes, sound, video and code between your browser and a Raspberry Pi, each link checked before it opens', textStep: 2,
    cap: 'positron.studio/patchbay',
    notes: 'A control message, an audio session and a program travel by different transports. They do not become the same kind of data because they appear in one patch bay.' },
  { name: 'hardware', say: 'Play real hardware on screen',
    text: 'A Novation Circuit, a TASCAM Model 12 and an Evolution keyboard move on screen when the real ones move', textStep: 2,
    cap: 'positron.studio/circuit',
    notes: 'The hardware kit also runs the Pico router\'s own firmware in the browser, screen and keys, at positron.studio/kit/hardware.' },
  { name: 'devices', say: 'Run one program on two devices',
    text: 'The same shader draws in your browser and on a Raspberry Pi, side by side', textStep: 2,
    cap: 'positron.studio/mirror',
    notes: 'Other paths: Faust compiled in the tab, and Plaits C++ compiled to WebAssembly at positron.studio/muta. A program needs its runtime and a capable device; portable means a path shown to work.' },
  { name: 'time', say: 'Agree on time between places',
    text: 'Compare four ways two places agree on when something happens, from firing on arrival to lining up on a recording', textStep: 2,
    cap: 'positron.studio/sync',
    notes: 'A position in a source, a local clock and what a player shows need explicit relationships. Do not equate timeline resolution with measured network accuracy.' },
  { name: 'gesture', say: 'Record a gesture and rebuild it',
    text: 'Draw a line, keep fewer samples, then turn one knob from a staircase to a smooth curve through them', textStep: 2,
    cap: 'positron.studio/draw',
    notes: 'Ask the audience what changed. A smooth line estimates what happened between points and need not match the hand.' },
  { name: 'archive', say: 'Play an archive as one tape',
    text: 'Every Erkki Kurenniemi recording that plays, laid end to end on one timeline', textStep: 2,
    cap: 'positron.studio/tapes',
    notes: 'It plays from archive.org, so open it when somebody will listen. A trace keeps what was captured, and a score composes references to it.' },
  { name: 'learn', say: 'Learn synthesis by changing code',
    text: 'Go from a sine wave to a filter swept by an LFO, one line of code and one knob at a time', textStep: 2,
    cap: 'positron.studio/slides/synths',
    notes: 'Start by listening, then move into the code. A concept learned in a small example should stay useful in a larger instrument.' },
  { name: 'score', say: 'Play a score from 1924',
    text: 'Moholy-Nagy\'s score for a mechanical variety act runs as a timeline, and any other screen can show its light', textStep: 2,
    cap: 'positron.studio/partitur',
    notes: 'Moholy-Nagy asked how different sensory elements join one composition. Kurenniemi is the other explicit reference.' },
  { name: 'build', say: 'Build one of your own',
    text: 'Paste this into a coding agent', textStep: 2,
    slot: promptSlot,
    notes: 'The first line is Cloudflare\'s own setup prompt, the rest points at the positron-start skill. Close with a concrete invitation: choose one example, try a change, and tell me where you needed help.' },
];

// every inner slide's headline at step 3, asked 2026-10-07 as *"iside slides use
// lesser text size"*; the title slide keeps the title's own step
const POSITRON = POSITRON_WORDS.map((sl) => (sl.title ? sl : { ...sl, sayStep: 3 }));

/**
 * 🔴 ONE DECK SINCE 2026-10-06. The `brand` deck went the same day, asked as
 * *"add kit/logo page and use individual slides from the brand slides. rm brand
 * slids after it"*: its six slides are blocks of `/kit/logo/` now, drawn by
 * `brand-slides.mjs`. `title` is the name a half width player shows in its
 * footer. A deck page has NO sentence under its heading, asked the same day as
 * *"no desc on slides pages"*: the deck is the page.
 */
export const DECKS = [
  // positron first, asked 2026-10-07 as *"reverse their order"*
  { name: 'positron', title: '10 things you can do with Positron', slides: POSITRON },
  { name: 'synths', title: 'Synths in code', slides: SYNTHS },
];

/** Where a deck's own page is: `/slides/<name>/`. */
export const deckHref = (deck) => `/slides/${deck.name}/`;

/**
 * One player per deck into every `[data-decks]` holder under `root`.
 * 🔴 ITS FOOTER NAMES THE DECK, asked 2026-10-06: *"add slides/(slug) page on
 * each slode deck. title is on footer on 1/2 w it replaces page count and
 * becomes link to slides/(slug) page"*. So the count's slot holds the deck's
 * title as a link to its page, which plays it at full width with the count.
 */
export function mountDecks(root = document) {
  const players = [];
  for (const host of root.querySelectorAll('[data-decks]')) {
    // the frames `groupHTML` drew; a holder with none gets them here
    let row = host.querySelector(':scope > .pos-decks-in');
    if (!row) { row = document.createElement('div'); row.className = 'pos-decks-in'; host.replaceChildren(row); }
    for (const f of row.querySelectorAll('[data-deck-frame]')) {
      if (!DECKS.some((d) => d.name === f.dataset.deckFrame)) f.remove();
    }
    for (const deck of DECKS) {
      let frame = row.querySelector(`[data-deck-frame="${deck.name}"]`);
      if (!frame) {
        row.insertAdjacentHTML('beforeend', deckFrameHTML(deck.name));
        frame = row.lastElementChild;
      }
      // 🔴 BUILT WHEN IT NEARS THE SCREEN, NOT ON LOAD, 2026-10-06 (*"show the
      // frame, lazyload ocntents"*): a deck is every slide's code box, knobs
      // and scope, and a visitor who never scrolls to it pays for none of it
      const build = () => {
        // the link reads See slides rather than the deck's name, asked 2026-10-07 as
        // *"in 1/2 w replace title with "See slides" link in footer"*: the name is
        // on the slide above it already
        const p = createSlidePlayer(deck.slides, { title: { text: 'See slides', href: deckHref(deck) } });
        p.el.dataset.deck = deck.name;
        frame.replaceWith(p.el);
        players.push(p);
      };
      whenNear(frame, build);
    }
  }
  return players;
}

/** `fn` once, when `el` comes within a screen's height of the viewport; at once where nothing can tell. */
function whenNear(el, fn) {
  if (typeof IntersectionObserver !== 'function') { fn(); return; }
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    fn();
  }, { rootMargin: '100% 0px' });
  io.observe(el);
}

/**
 * 🔴 A DECK'S OWN PAGE, `/slides/<name>/`, the same day and the same ask. The
 * page is a manifest row `slides/<name>` and three lines that call this, so a
 * new deck is a `DECKS` entry, a row and a copy of `demo/slides/synths/`. It
 * mounts the shell, plays the deck at the page's full width with the ordinary
 * `N / M` count, and grades that behind `?selfcheck=1` only.
 * ⚠️ THE HEADING IS THE DECK'S NAME ALONE, the way a kit part's is its part:
 * `__demo.name` and `document.title` keep `slides/<name>`, which is the
 * identity `verify.mjs` checks against the manifest row.
 */
export async function deckPage(name) {
  const deck = DECKS.find((k) => k.name === name);
  if (!deck) throw new Error(`no deck called ${name}`);
  const { mount } = await import('./shell.mjs');
  const { createStack } = await import('./stack.mjs');
  const { SELFCHECK } = await import('./selfcheck.mjs');
  // no log under the deck, asked 2026-10-07 as *"rm logs on slide pages"*
  const d = mount({ name: `slides/${name}`, readout: null, showLog: false });
  const h1 = d.head.querySelector('.pos-name');
  if (h1) h1.textContent = name;
  const p = createSlidePlayer(deck.slides);
  p.el.dataset.deck = name;
  createStack(d.el).add(p.el);
  if (SELFCHECK) await deckChecks(d, deck, p);
  d.ready();
  // 🔴 THE SYNTHS DECK'S SOUND CHECKS, moved here from /kit/slides/ on
  // 2026-10-06 (*"rm from slides kit page"*). After `ready`, because they
  // take about twenty seconds and `ready` is also the harness's boot wait;
  // each one asserts within its silence limit, so the count is collected.
  if (SELFCHECK && name === 'synths') {
    const { synthChecks } = await import('./deck-checks.mjs');
    await synthChecks(d, p);
  }
  return { d, deck, player: p };
}

async function deckChecks(d, deck, p) {
  const frames = (n) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  await frames(3);
  const n = p.slides.length;
  const foreign = () => performance.getEntriesByType('resource').map((e) => e.name)
    .filter((u) => new URL(u).origin !== location.origin);

  // 1. the deck at full width, its footer the ordinary count and no link
  const bw = d.el.getBoundingClientRect().width, pw = p.el.getBoundingClientRect().width;
  d.assert('the deck plays at the page’s full width with the count in its footer and no title link',
    n === deck.slides.length && Math.abs(pw - bw) <= 1 && p.count.tagName === 'SPAN'
      && p.count.textContent === `1 / ${n}` && !p.el.querySelector('a.sl-title'),
    `${n} slides, the player ${pw.toFixed(0)} px in a ${bw.toFixed(0)} px page, the footer reads "${p.count.textContent}"`);

  // 2. the arrows on the player step it and the count follows; NEGATIVE, a key
  //    on the page outside the player moves nothing
  const key = (t, k) => t.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  key(p.el, 'ArrowRight');
  const after = p.count.textContent;
  key(document.body, 'ArrowLeft');
  const outside = p.at();
  key(p.el, 'ArrowLeft');
  d.assert('ArrowRight on the player steps the deck and the count says so, and a key outside it moves nothing',
    after === `${Math.min(2, n)} / ${n}` && outside === Math.min(1, n - 1) && p.at() === 0 && p.count.textContent === `1 / ${n}`,
    `"${after}" after ArrowRight, slide ${outside + 1} after a key on the page, "${p.count.textContent}" after ArrowLeft`);

  // 3. stepping through the whole deck fetched nothing off this origin and spills nothing
  const spills = [];
  for (let i = 0; i < n; i++) {
    p.go(i);
    await frames(2);
    const inn = p.slides[i].el.querySelector('.sl-in');
    // ⚠️ AND THE EVIDENCE REGION'S OWN CHILDREN, 2026-10-07. `.sl-ev` centres
    // what it holds, so evidence taller than the room the headline leaves
    // overflows UP over the headline and DOWN over the caption while `.sl-in`
    // reports no spill at all. MEASURED on three text decks written 2026-10-07
    // and removed the same day (*"rm new slides. not useful"*): a three line headline drawn through by its own text, a
    // four row table over its caption, and this assert green on both.
    const ev = p.slides[i].el.querySelector('.sl-ev');
    const er = ev?.getBoundingClientRect();
    const evSpill = ev && [...ev.children].some((c) => {
      const r = c.getBoundingClientRect();
      return r.top < er.top - 1 || r.bottom > er.bottom + 1;
    });
    if (inn.scrollHeight > inn.clientHeight + 1 || inn.scrollWidth > inn.clientWidth + 1 || evSpill) spills.push(p.slides[i].spec.name);
  }
  p.go(0);
  const off = foreign();
  d.assert('a step through every slide fetched nothing from another origin and no slide spills',
    off.length === 0 && spills.length === 0,
    `${off.length} request(s) off this origin${off.length ? `: ${off.slice(0, 2).join(', ')}` : ''}${spills.length ? `, SPILLING: ${spills.join(', ')}` : ', nothing spills'}`);
}

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
  { name: 'synths in code', layout: 'left', lines: [[5, 'Synths'], [5, 'in code']],
    // step 5, not 6, asked 2026-10-07 as *"use smaller type in 1st slide in synth slids"*
    // asked 2026-10-06: *"make it better. no ref to faust"*
    cap: 'from sine wave to an instrument' },
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
  const code = createCodeBox({ language: PROMPT_LANG, value: SETUP_PROMPT, rows: 9, label: '',
    ariaLabel: 'the prompt to paste into a coding agent, read only' });
  code.input.readOnly = true;
  // a narrower logical width and soft wrapping, so the prompt is read at a
  // larger size than its 107 character lines would allow unwrapped
  const fb = fitBox(host, 560, { fill: true });
  fb.inner.append(code.el);
  return null;
}

const POSITRON_WORDS = [
  { name: 'title', title: 'What is Positron',
    // the source's subtitle on the bottom edge, asked 2026-10-07 as *"in positron
    // sides in 1st add subtitle on botton"*. `by` is the slot a title slide sets
    // there, and it carries the subtitle here rather than a name
    // reworded the same day: *"studio is not clen enougj. also from microcotrollers
    // to distrubuted (or whaerver)"*
    by: 'Instruments and media, from microcontrollers to distributed performances',
    notes: 'I started building Positron for my own work: making instruments, working with recordings and connecting media across devices. The project now includes reusable tools, examples and lessons. I want other people to be able to understand those parts and adapt them for their own work. This is an introduction for curious artists, musicians and creative developers. Positron is an evolving R&D project.' },
  { name: 'instruments', say: '10 things you can do with Positron',
    text: 'A musician might start with a synth, someone interested in movement with Draw', textStep: 2,
    notes: 'These are different ways into the same project. An artist might start with projected media or an archive. Show two or three real examples. Explain what each one does before introducing the underlying architecture. The proposed continuous radio-tuning slider is future work; do not present it as part of the current demo.' },
  { name: 'blocks', say: 'Reusable building blocks',
    text: 'Parts are reused across works instead of rebuilding each instrument from scratch', textStep: 2,
    notes: 'The project includes a UI kit, media runtimes, a patch bay and timeline tools. Reuse is concrete in the playable synth lessons and the timeline-based demos. This does not mean every example already uses every shared component. Show one component in a lesson and in another example, using an actual documented pair.' },
  { name: 'connecting', say: 'Connecting instruments and streams',
    text: 'A control message, an audio session and a program travel by different transports', textStep: 2,
    notes: 'The patch bay describes what participants send and receive, and checks connections before opening them. They do not become the same kind of data because they appear in one patch bay. Show an existing compatible connection and identify its source and destination.' },
  { name: 'interfaces', say: 'Interfaces for media and hardware',
    text: 'An interface can control a device and show what it is doing', textStep: 2,
    notes: 'Browser panels connect to familiar instruments, including Circuit and TASCAM examples. The hardware kit also presents the Pico router\'s screen and keys using its firmware in the browser. Show a control and the parameter or device behavior it represents. Avoid a gallery of unrelated widgets.' },
  { name: 'programs', say: 'Media programs on supported devices',
    text: 'Each program needs its runtime and a capable device, so portable means a path shown to work', textStep: 2,
    notes: 'Send a rendered stream, or run the program that generates it. Examples: Faust, Plaits C++ compiled to WebAssembly, and shaders in a browser or on a Raspberry Pi. The browser SuperCollider example supports a subset of the language. The distinction matters when deciding where computation happens and what travels over the connection.' },
  { name: 'time', say: 'Time and composition',
    text: 'A position in a source, a local clock and what a player shows need explicit relationships', textStep: 2,
    notes: 'The score model can place, repeat and change the playback rate of passages. The timing layer separately decides whether an action follows arrival, a shared time, a beat or media presentation. Use a short timeline example. Do not equate timeline resolution with measured network accuracy.' },
  { name: 'gestures', say: 'Recording and reconstructing gestures',
    text: 'A smooth line estimates what happened between points, and it need not match the hand', textStep: 2,
    notes: 'Draw one stroke. Increase the interval between retained points, then compare hold, linear and spline reconstruction on the same samples. Ask the audience what changed. Do not claim that every instrument can already record and replay its controls through Draw.' },
  { name: 'archives', say: 'Recordings and archives',
    text: 'A trace keeps what was captured, and a score composes references to it', textStep: 2,
    notes: 'Those references can carry boundaries, placement, rate, repetition and provenance. An uncertain recording date is a different issue from reconstructing missing content, and the timeline tools distinguish them. The project is not a general automated film-restoration system.' },
  { name: 'learning', say: 'Learning with working examples',
    text: 'Start by listening, then move into the code that makes the sound', textStep: 2,
    notes: 'The lesson can introduce an oscillator, volume, pitch, filtering and modulation through working components. A concept learned in a small example should remain useful in a larger instrument. Positron uses established media languages and web technologies; avoid calling them all standards.' },
  { name: 'related', say: 'Related artistic practices',
    text: 'Moholy-Nagy asked how the senses join one composition, and Kurenniemi built instruments across media', textStep: 2,
    notes: 'Partitur uses a Moholy-Nagy graphic score. Other useful comparisons include Electronic Cafe for remote participation, Sandin for sharing construction knowledge, and ossia for interactive media scores. These are references and adjacent practices, not claims that every idea originated here.' },
  { name: 'sharing', say: 'Sharing examples and instructions',
    text: 'Paste this into a coding agent to build one of your own', textStep: 2,
    slot: promptSlot,
    notes: 'A skill carries working instructions alongside the code, so a person or a coding agent can begin with an example and change it. The first line is Cloudflare\'s own setup prompt, the rest points at positron-start. Close with a concrete invitation: choose one example, try a change, and tell me where you needed help.' },
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
  { name: 'synths', title: 'Synths in code', slides: SYNTHS },
  { name: 'positron', title: 'What is Positron', slides: POSITRON, heading: 'logo' },
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
        const p = createSlidePlayer(deck.slides, { title: { text: deck.title, href: deckHref(deck) }, mark: true });
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
  const d = mount({ name: `slides/${name}`, readout: null });
  const h1 = d.head.querySelector('.pos-name');
  if (h1) h1.textContent = name;
  // 🔴 THE HORIZONTAL LOGO AS THE HEADING, asked 2026-10-07 as *"change page
  // title to positron horizonal logo"*, for a deck that says `heading: 'logo'`.
  // The h1 keeps its name for a screen reader; `__demo.name` and
  // `document.title` keep `slides/<name>`.
  if (h1 && deck.heading === 'logo') {
    h1.textContent = '';
    h1.setAttribute('aria-label', 'positron studio');
    const row = document.createElement('span');
    row.className = 'sl-logo-h';
    row.setAttribute('aria-hidden', 'true');
    const b = document.createElement('span');
    b.className = 'sl-logo-b';
    const plus = document.createElement('span');
    plus.className = 'sl-hi';
    plus.textContent = '+';
    b.append('β', plus);
    const w = document.createElement('span');
    w.className = 'sl-logo-w';
    for (const t of ['positron', 'studio']) { const x = document.createElement('span'); x.textContent = t; w.append(x); }
    row.append(b, w);
    h1.append(row);
  }
  const p = createSlidePlayer(deck.slides, { mark: true });
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

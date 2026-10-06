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

import { createSlidePlayer } from './slide.mjs';
import { SYNTH_STEPS } from './synth-steps.mjs';
import { synthSlot } from './slide-synth.mjs';

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
  // slide 6, asked as *"how to make it a radio (sawtooth?)"*
  wave: { text: '`nentry` with a radio style draws `wave` as a choice, and `select2` plays the sine or the saw by it. '
      + 'Pick saw while the tone plays' },
};
const SYNTHS = [
  { name: 'synths in code', layout: 'left', lines: [[6, 'Synths'], [6, 'in code']],
    // asked 2026-10-06: *"make it better. no ref to faust"*
    cap: 'from sine wave to an instrument' },
  ...SYNTH_STEPS.map((st) => ({
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
 * 🔴 ONE DECK SINCE 2026-10-06. The `brand` deck went the same day, asked as
 * *"add kit/logo page and use individual slides from the brand slides. rm brand
 * slids after it"*: its six slides are blocks of `/kit/logo/` now, drawn by
 * `brand-slides.mjs`. `title` is the name a half width player shows in its
 * footer. A deck page has NO sentence under its heading, asked the same day as
 * *"no desc on slides pages"*: the deck is the page.
 */
export const DECKS = [
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
    const row = document.createElement('div');
    row.className = 'pos-decks-in';
    for (const deck of DECKS) {
      const p = createSlidePlayer(deck.slides, { title: { text: deck.title, href: deckHref(deck) } });
      p.el.dataset.deck = deck.name;
      row.append(p.el);
      players.push(p);
    }
    host.replaceChildren(row);
  }
  return players;
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
    if (inn.scrollHeight > inn.clientHeight + 1 || inn.scrollWidth > inn.clientWidth + 1) spills.push(p.slides[i].spec.name);
  }
  p.go(0);
  const off = foreign();
  d.assert('a step through every slide fetched nothing from another origin and no slide spills',
    off.length === 0 && spills.length === 0,
    `${off.length} request(s) off this origin${off.length ? `: ${off.slice(0, 2).join(', ')}` : ''}${spills.length ? `, SPILLING: ${spills.join(', ')}` : ', nothing spills'}`);
}

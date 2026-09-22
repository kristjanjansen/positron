// demo/shell/instrument.mjs — a cased panel with the instrument's name on it.
//
// 🔴 THIS IS A COMPOSITION, NOT A LAYOUT ENGINE, AND THAT IS THE WHOLE POINT.
// `createPanelLayout` already owns the case, the fixed column and the one
// scrolling strip; `createNameplate` already owns the plate and its three
// placements. What did not exist was the sentence that joins them, and five
// pages had each written it themselves:
//
//   /tom/      createNameplate({ lines: ['POSITRON', 'TOM'], place: 'ends' })
//              panel.el.prepend(plate.el)
//   /circuit/  its own createNameplate call and its own placing
//   /evo/      the same again
//   /twelve/   createNameplate({ lines: ['MODEL 12'], place: 'end' })
//   /kit/      two more, in its PANEL specimen
//
// `positron-ui` names this exactly: a control that exists in one page and
// nowhere else is a component that has not been noticed yet. Here it was in
// five, which is not a special case, it is a component with five copies of its
// assembly instructions.
//
// ⚠️ NOTHING HERE REIMPLEMENTS EITHER PART. If a panel behaviour is wrong, it
// is wrong in `panel-layout.mjs` and it is wrong for every page at once, which
// is the property a second implementation would have destroyed.
//
// 🔴 AND THE PLATE GOES IN BY `prepend`, WHICH IS WHAT `/tom/` DISCOVERED AND
// THE OTHERS DID DIFFERENTLY. A nameplate is not a row inside the scroller: it
// belongs to the CASE, above the fixed column and the strip both, or it scrolls
// away from the instrument it names.

import { el } from './shell.mjs';
import { createGlue } from './glue.mjs';
import { createPanelLayout, createNameplate } from './panel-layout.mjs';
import { createPresence, createPresenceButton } from './presence.mjs';

/** What every instrument on this site is made by, so no page types it. */
export const MAKER = 'POSITRON';

/**
 * What the header's status control says in its two states.
 *
 * 🔴 THE WORDS ARE THE ONES IN THE ASK, AND THE COLOURS COME FROM THE KIT.
 * Asked 2026-09-22: *"left: online status button: enabled disabled
 * (green/gray)"*. `presence.mjs` already owns green for a thing that answered
 * and grey for one that has not, already reserves the badge's width off the
 * longest word it can say so it cannot twitch, and is already the settled
 * answer on eight pages. A second green dot here would be the hand-rolled
 * control defect arriving inside the kit.
 * ⚠️ TWO STATES, NOT FIVE, WHICH IS WHAT `can` IS FOR. A header is not asking
 * whether a board in another building is answering; it is saying whether this
 * instrument is switched into the chain, which has no `checking` and no
 * `coming`. Narrowing it also narrows the reserve to the longer of these two
 * words rather than to `coming online`.
 */
/**
 * 🔴 THE WORD SAYS WHAT A PRESS DOES, NOT WHAT THE STATE IS, SINCE 2026-09-22:
 * *"online labels: 'turn on' 'turn off'"*. It read `enabled` and `disabled`.
 * ⚠️ AND IT IS ONE WORD, CORRECTED WITHIN THE HOUR TO *"*name* off / on"*. The
 * badge already prints the instrument's name in front of it, so `PLAITS turn
 * off` said the verb twice as far as a reader is concerned.
 * 🔴 **AND THEN REVERSED: *"reverse on / off names"*, SO THE WORD IS THE STATE
 * AFTER ALL.** `PLAITS on` means it IS on, and the dot agrees with it rather
 * than contradicting it. The first arrangement asked a reader to hold two
 * things at once, a green dot meaning running and a word meaning what a press
 * would do, and one of them had to be read backwards. Two channels saying one
 * fact beats two channels saying two.
 * ⚠️ **THE DOT STILL CARRIES THE STATE**, which is what makes this legible
 * rather than confusing: green with `turn off` is a thing that is on and a
 * press that would stop it. Two channels, one fact each, which is the rule this
 * project applies to every other control.
 * ⚠️ AND IT IS RIGHT ONLY BECAUSE THE CONTROL ACTS. A badge that reported and
 * could not be pressed would be labelled with an instruction nobody can
 * follow, so a caller that supplies no `press` still gets the states named as
 * states through `says`.
 */
export const HEADER_SAYS = { online: 'on', offline: 'off' };
/** The only two states a header's status control can reach. See `HEADER_SAYS`. */
export const HEADER_STATES = ['online', 'offline'];

/**
 * The plate's lines, and the placement they need.
 *
 * 🔴 PURE, AND SEPARATE, SO IT CAN BE GRADED WITH NO BROWSER. Everything else
 * in this file needs a `document`, and a rule that only a browser can check is
 * a rule that gets checked once. `node demo/shell/instrument-test.mjs` runs
 * this in a few milliseconds.
 * ⚠️ ONE LINE OR TWO, AND THE CALLER DOES NOT CHOOSE THE PLACEMENT FOR ONE.
 * A maker of `''` is how a page says *this thing carries no brand*, which is
 * what `/twelve/` means by `MODEL 12` alone, and `ends` is `space-between`,
 * which parks a lone child on the LEFT. `createNameplate` records that as the
 * reason `end` exists, so choosing it here rather than leaving it to a caller
 * is this function agreeing with that file.
 */
export function plateSpec(maker, name, place = 'ends') {
  const lines = maker ? [maker, name] : [name];
  return { lines, place: lines.length === 1 ? 'end' : place };
}

/**
 * The header row: a status control on the left, a patch selector optically
 * centred on the case, and the nameplate on the right.
 *
 * 🔴 **A THREE COLUMN GRID WITH EQUAL OUTER TRACKS, WHICH IS THE WHOLE ASK AND
 * IS SAID PRECISELY IN IT.** *"center patch selector (optically center to the
 * instrument)"*. Centred to the INSTRUMENT, not balanced between two unequal
 * neighbours: a flex row with a status on one side and a plate on the other
 * puts its middle child wherever the difference between those two leaves it,
 * which is a different place on every panel and moves the moment a patch name
 * gets longer. `1fr auto 1fr` puts the centre track on the container's own
 * centre whatever is in the outer two, and `.panel-case` is
 * `padding: 0 var(--panel-pad)`, the same both sides, so the header's centre is
 * the CASE's centre. That is what `/kit/` asserts, against the case's own box.
 *
 * 🔴 **THE STATUS CONTROL ACTS OR IT IS NOT A BUTTON, AND THAT IS DECIDED HERE
 * RATHER THAN LEFT TO A CALLER.** `positron-ui` calls a control whose only
 * honest behaviour is to do nothing *"the shape of control this project calls a
 * lie"*, and the ask wants one element that both reports a state and looks
 * pressable. So: a caller that hands over `press` gets a real button that calls
 * it, built by `createPresenceButton`, and a caller that hands over nothing
 * gets a BADGE, which is a span with no tab stop, no pointer cursor and no
 * handler. There is no third shape, and nothing here ever presses itself.
 * ⚠️ **A BADGE IS NOT A DEGRADED BUTTON, IT IS THE HONEST ANSWER FOR AN
 * INSTRUMENT THAT IS SIMPLY ON.** `/muta/`'s two firmwares are in the page and
 * cannot be unplugged; a header on one of those reports and does not pretend to
 * connect anything.
 *
 * ⚠️ **AND THE PLATE IN A HEADER IS `end`, NEVER `ends`.** `ends` is
 * `space-between`, which needs a box that SPANS something to put a gap in; in a
 * header's right cell, which is as wide as its content, it puts the maker and
 * the model hard against each other. `end` pushes both to the right edge, and
 * `shell.css` gives that placement a `column-gap` so two lines read as two.
 */
function buildHeader({ name, maker, header }) {
  const { online = {}, patch = null } = header;
  const head = el('div', 'panel-head');

  /* ⚠️ THE PLATE IS FIRST IN THE DOM AND THIRD IN THE PICTURE, and that is the
     phone layout rather than an accident. Asked for as *"3 levels"*: the title,
     then the enabled button at full width, then the patch at full width. A
     single column grid lays its children out in source order, so this order IS
     the phone. The desktop places all three by `grid-column` in `shell.css`,
     which is visible in the stylesheet, rather than by a flex `order` nobody
     can see in the markup. */
  /**
   * 🔴 A HEADER MAY CARRY NO PLATE AT ALL, `plate: false`, ADDED 2026-09-22:
   * *"rm nameplates"*. It is not a bare removal: the status control prints the
   * instrument's name in front of its state, so a plate beside it is the name
   * twice on one row, which is the doubled-channel objection this project keeps
   * making about everything else.
   * ⚠️ **THE DEFAULT KEEPS THE PLATE**, because a caller whose status control
   * is a plain badge with no name has nothing else to say which instrument it
   * is looking at.
   */
  const plate = header.plate === false
    ? null
    : createNameplate({ ...plateSpec(maker, name, 'end'), cls: 'panel-head-plate' });
  if (plate) head.append(plate.el);

  let status = null;
  if (online !== false) {
    const { press = null, state = 'online', says = {}, of = name, ...rest } = online;
    const opts = {
      of,
      can: HEADER_STATES,
      says: { ...HEADER_SAYS, ...says },
      state,
      ...rest,
    };
    status = press
      ? createPresenceButton({ ...opts, press, aria: `switch ${of} on and off` })
      : createPresence({ ...opts, mode: 'badge' });
    status.el.classList.add('panel-head-on');
    head.append(status.el);
  }

  const mid = el('div', 'panel-head-mid');
  if (patch) mid.append(patch.el || patch);
  head.append(mid);

  return { head, plate, status, mid };
}

/**
 * A cased instrument panel with its name printed across the top.
 *
 * @param {object}  o
 * @param {string}  o.name            the model, printed at the right end
 * @param {string}  [o.maker=MAKER]   the maker, printed at the left end
 * @param {Element} [o.host]          append the case to this
 * @param {string}  [o.place='ends']  a `createNameplate` placement
 * @param {object}  [o.panel]         passed straight to `createPanelLayout`
 * @param {object}  [o.header]        build a header row across the top of the
 *   case. See `buildHeader`. `{ online, patch }`, where `online` takes a
 *   `press` to become a button and is `false` for no status control at all.
 *
 *   🔴 **IT IS AN OPTION AND THE DEFAULT IS OFF, WHICH IS A DECISION ABOUT
 *   OTHER PEOPLE'S PAGES RATHER THAN A HEDGE.** The plate sits in the case's
 *   top inset today and `/muta/` and `/kit/` both ASSERT it there, one of them
 *   by reading the case's first child. Moving it into a header for every caller
 *   would take those asserts red on pages nobody had touched, and this file
 *   already records a wrapper shipping a defect to a new page on the day it was
 *   written to prevent one. **With a header the plate moves into it; without
 *   one nothing about any existing case changes.**
 * @returns {{el, panel, plate, fixed, strip, flow, head, online, add, shown}}
 */
export function createInstrument(o = {}) {
  const {
    name, maker = MAKER, host, place = 'ends', panel: panelOpts = {},
    header = false,
  } = o;
  /**
   * 🔴 REFUSED WITHOUT A NAME, FOR THE REASON `knob.mjs` REFUSES WITHOUT A
   * LABEL: the plate is the only thing on a case that says which instrument
   * this is, and a case with an unnamed plate is furniture wearing a border.
   * ⚠️ IT THROWS AT BUILD TIME, IN FRONT OF THE AUTHOR, rather than rendering
   * an empty plate a visitor has to interpret. `createNameplate` already
   * refuses a plate with no lines at all and this is the same refusal one
   * argument earlier, where the caller can still see what they forgot.
   */
  if (!name) {
    throw new Error('an instrument needs a name: the plate is the only thing saying which one it is');
  }

  /* The lines and the placement are decided by `plateSpec`, which is pure and
     is graded without a browser. */
  const spec = plateSpec(maker, name, place);
  /* 🔴 THE HEADER OWNS THE PLATE WHEN THERE IS ONE, AND THE PANEL OWNS IT WHEN
     THERE IS NOT. Two plates would be two names on one case, and handing the
     panel a plate it then places in the top inset while the header holds
     another is exactly that. */
  /**
   * 🔴 THE HEADER IS A GLUED PART, NOT A ROW INSIDE THE CASE, SINCE
   * 2026-09-22. Reported against a screenshot: *"this does not look like glued
   * transport or smt. underline does not extend to sides, to much padding. make
   * it a snd componetn or reuse one"*.
   * 🔴 **AND EVERY WORD OF THAT WAS A SYMPTOM OF ONE CAUSE: IT WAS AN
   * IMITATION.** A border drawn on a child of the case sits INSIDE the case's
   * own padding, so it can never reach the sides; the padding was the case's
   * plus the header's; and the whole thing was a second implementation of a
   * seam `glue.mjs` already owns and `/pack/`, `/tom/` and `/wish/` already
   * use. `positron-ui` opens with BUILD FROM `/kit/` for exactly this.
   * ✅ `createGlue` gives the seam its full width, drops the doubled padding by
   * making the children give up their own border and radius, and makes an
   * instrument with a header the same object as a transport bar over the strip
   * it drives.
   */
  const head = header ? buildHeader({ name, maker, header }) : null;
  /**
   * 🔴 THE PANEL PLACES THE PLATE, THIS FILE DOES NOT. It did
   * `panel.el.prepend(plate.el)` for one day, which is exactly what the five
   * pages before it were doing, and it inherited exactly what they were paying
   * for: the case's padding is horizontal only, so a plate put in from outside
   * sat on the top border. `/tom/` had fixed that in its OWN stylesheet and
   * `/plai/` had no such rule, so this wrapper shipped the defect to a new page
   * on the day it was written to prevent it.
   * ⚠️ **CENTRALISING AN ASSEMBLY THAT DOES NOT OWN ITS OWN LAYOUT MOVES THE
   * DUPLICATION RATHER THAN REMOVING IT.** `createPanelLayout` takes a `plate`
   * now and owns the spacing, so no wrapper and no page can get it wrong.
   */
  /**
   * 🔴 THE CASE KEEPS ITS OWN PLATE WHENEVER THE BAR IS NOT CARRYING ONE.
   * A header with `plate: false` used to leave the instrument with no plate
   * anywhere, which was right while the status control printed the name beside
   * it and wrong the moment the bar moved to the foot: a nameplate at the
   * BOTTOM of a case names it after a reader has already read it.
   * ⚠️ SO THE TEST IS WHO HAS THE PLATE, NOT WHETHER THERE IS A BAR. One plate,
   * in one of two places, decided by the bar rather than by the caller having
   * to remember to ask twice.
   */
  const barHasPlate = !!head && header.plate !== false;
  const panel = createPanelLayout({ ...panelOpts, plate: barHasPlate ? null : spec });
  const plate = barHasPlate ? head.plate : panel.plate;
  /* 🔴 THE HEADER GOES IN BY `prepend`, FOR THE REASON THE PLATE DOES: it
     belongs to the CASE, above the fixed column and the strip both, or it
     scrolls away from the instrument it names. `/tom/` found that with a plate.
     ⚠️ AND THE SPACING IS `shell.css`'S, NOT THIS FILE'S. `.panel-case >
     .panel-head` carries the same `padding-block` the plate's own rule does,
     off the same `--panel-pad`. Centralising an assembly that does not own its
     own layout moves the duplication rather than removing it, which is written
     at length in `panel-layout.mjs` and was paid for on `/plai/`. */
  /* 🔴 GLUED, NEVER PREPENDED, SINCE 2026-09-22. This put the header INSIDE the
     case, where its underline sat within the case's own padding and could never
     reach the sides, and where its padding was the case's plus its own. See the
     note on `head` above. `createGlue` returns the single block unwrapped when
     there is only one, so a case with no header gains no box and no edge. */
  /**
   * 🔴 THE BAR SITS ABOVE OR BELOW, `header: { at: 'head' | 'foot' }`, ADDED
   * 2026-09-22: *"make it revertable: move plaits/warps headers to footers and
   * add nameplate to top right"*. **`head` is the default and nothing about it
   * changed**, which is the whole of *revertable*: a caller moves one word back
   * and gets exactly what it had, rather than a rewrite being undone by hand.
   * ⚠️ AND `createGlue` TAKES THE PARTS IN ORDER, so this is an argument swap
   * rather than a second assembly. The seam, the shared border and the children
   * giving up their own edges are the same either way.
   */
  const atFoot = !!head && header.at === 'foot';
  const root = head
    ? (atFoot ? createGlue(panel.el, head.head) : createGlue(head.head, panel.el))
    : panel.el;
  host?.append(root);

  return {
    el: root,
    /** The case itself, which is `el` on an instrument with no header. */
    case: panel.el,
    panel,
    plate,
    /** The header row, or `null` on a case that was not given one. */
    head: head?.head || null,
    /** The header's status control, or `null`. A presence api either way. */
    online: head?.status || null,
    /** The header's centre cell, which is where a patch selector goes. */
    patchSlot: head?.mid || null,
    // The three places a caller puts things, forwarded rather than wrapped, so
    // everything `panel-layout.mjs` documents about them stays true here.
    fixed: panel.fixed,
    strip: panel.strip,
    flow: panel.flow,
    /** Put blocks in the scrolling flow, in order. `null` is skipped. */
    add(...blocks) {
      const into = panel.flow || panel.strip;
      for (const b of blocks) if (b) into.append(b.el || b);
      return this;
    },
    /** What the plate RENDERS, uppercase transform included. See the plate. */
    shown: () => plate.shown(),
  };
}

export default createInstrument;

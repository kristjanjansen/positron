// demo/shell/local-remote.mjs. A thing here, the same thing somewhere else,
// and one fader between them.
//
// 🔴 ASKED FOR 2026-09-23 IN THESE WORDS: *"make general 'local and remote'
// component that can be used for video and audio"*, with a drawing of two
// pictures side by side over a row reading `labelleftalign  x-fade-slider
// labelrightalign`, and then *"some kind of scope?"*, *"viz can be audio
// (waveforms), video or missing."* and *"its 'glue' thing"*.
//
// 🔴 TWO PAGES ALREADY HAD HALF OF IT EACH, WHICH IS THE WHOLE ARGUMENT FOR
// BUILDING IT ONCE. `/grains/` has the fader and its arithmetic and no shared
// layout; `/mirror/` has the layout, the two panels and the phone arrangement
// and no fader at all. `/kit/`'s own standing rule is that a control living in
// one page is a component nobody has noticed yet, and this one lives in two.
// TAKE THE BETTER HALF OF EACH, NEVER THE AVERAGE: that is how `board.mjs` was
// made out of `/keys/` and `/knobs/`, where the page that had less gained three
// things rather than the two meeting in the middle.
//
// 🔴 `missing` IS THE STATE THIS WAS DESIGNED AROUND FIRST, NOT LAST. A remote
// side with nothing coming back is the ordinary case on this desk. A pane that
// draws nothing and says nothing is indistinguishable from one that is broken,
// so a missing pane carries a SENTENCE in the well where the picture would be,
// and it is the caller's sentence rather than a generic one: *"the board has
// not answered yet"* and *"no camera on this machine"* are different facts and
// only the page knows which it has.
//
// 🔴 THE FADER IS ALWAYS ENABLED AND IT GOES INTO SILENCE, AND THAT REVERSES
// THE FIRST ANSWER THIS COMPONENT WAS GIVEN. Asked as *"if one is missing,
// disabled xfade?"*, answered yes, and then corrected by the fact that decides
// it: *"remote can come and go, it has online status hence the xfade disable.
// or perhaps just always enabled. just goes into silece when no source"*.
//   - A CONTROL WHOSE ENABLED STATE FOLLOWS A SOCKET DIES UNDER YOUR FINGER.
//     The remote comes and goes, so disabling makes the fader go dead mid drag
//     and come back a second later, which is worse than either fixed answer.
//   - THE LIE IT WAS PROTECTING AGAINST DOES NOT EXIST, because the pane
//     already says the far end is absent. Fading toward an end that is honestly
//     reported as gone and getting silence is not a control lying. Silence is
//     the truthful output of there being no sound there.
//   - AND IT KEEPS THE CHECKS ALIVE. `disabled` is not a style, it is a
//     `return` in front of the handler, and every harness here drives a page by
//     clicking its controls. The board is unreachable from a harness, so a
//     fader disabled on a missing remote is a fader disabled on EVERY run, and
//     every crossfade check goes quiet while the suite stays green. That bill
//     has already been paid twice in one day, on `/mirror/` and `/blocks/`.
//
// 🔴 NO OPACITY IN THE FIRST VERSION, AND THAT IS A DECISION TAKEN AND REVERSED
// WITHIN THE HOUR RATHER THAN A FEATURE NOBODY GOT TO. Asked as *"when x-fading,
// make the other side more tansparent as long as i go with slider to other
// side"*, withdrawn in the next message as *"rm fadeout on xfade for not. too
// flickery on online/offline cases"*. The reason is the collision this file
// already names from the other end: a pane faded to nothing by the slider looks
// exactly like a pane with nothing coming back, and a remote that flaps gives
// two visual events per drop where there should be one. The fader moves GAIN
// and nothing else.
// ⚠️ WHAT WOULD MAKE IT SAFE IF IT COMES BACK, kept so the next attempt starts
// past this one: opacity is the right channel and cannot reflow, the value has
// to be driven by the fader ALONE, it needs a floor, and the pane's own frame
// and its presence badge stay at full strength whatever the slider says.

import { el } from './shell.mjs';
import { createVideoPanel } from './video-panel.mjs';
import { createPresence } from './presence.mjs';
import { createSlider } from './slider.mjs';

/**
 * 🔴 WHERE THE ARRANGEMENT CHANGES, DECLARED ONCE, IN THIS FILE AND NOWHERE
 * ELSE. 560 px is the number `shell.css` already uses eleven times and there is
 * no reason for a twelfth measurement. It is typed HERE rather than in the
 * stylesheet because the arrangement is a JavaScript decision (see `arrange`
 * below), and a number typed in two files is a number that will disagree, which
 * this project has already repaired as `--sld-col` and again as `--ctl-gap`.
 */
export const NARROW_PX = 560;

/** What a pane can be holding. `missing` is a real state, not the absence of one. */
export const KINDS = ['video', 'audio', 'missing'];

/** The two arrangements. See `arrange` for why this is not a media query. */
export const ARRANGEMENTS = ['wide', 'narrow'];

/**
 * 🔴 EQUAL POWER, AND `/grains/` ALREADY WROTE THIS LINE. Lifted rather than
 * rewritten, from `demo/grains/index.html:468`, where the comment beside it
 * says what it is for: two uncorrelated sources at 0.5 each are 6 dB down in
 * the middle of a linear fade, and the middle is exactly where a listener stops
 * to compare the two ends.
 *
 * ⚠️ IT IS EXPORTED SO IT CAN BE GRADED WITHOUT A BROWSER. `node
 * demo/shell/local-remote-test.mjs` runs it against the property that names it,
 * which is that the two gains keep constant POWER rather than constant sum, and
 * against a linear pair as a negative control.
 *
 * @param {number} b 0 is all local, 1 is all remote. Anything outside is clamped.
 * @returns {{local: number, remote: number}}
 */
export function fadeGains(b) {
  const x = Math.max(0, Math.min(1, Number.isFinite(b) ? b : 0));
  return { local: Math.cos(x * Math.PI / 2), remote: Math.sin(x * Math.PI / 2) };
}

/**
 * A thing running here and the same thing running somewhere else, side by side,
 * with one fader between them.
 *
 * @param {object} o
 * @param {object} [o.local]   the near side. `{ label, of, kind, media, say, presence }`
 * @param {object} [o.remote]  the far side, same shape.
 * @param {number} [o.value]   where the fader starts, 0 all local, 1 all remote.
 * @param {string} [o.aria]    what a screen reader calls the fader. It has no
 *   visible label of its own, by the rule `/grains/` settled: a slider between
 *   two named ends does not need a third word between them, it needs room.
 * @param {'hover'|'footer'|'bare'} [o.fullMode]  handed to both panels.
 * @param {string} [o.aspect]  the shape of both picture wells, a CSS ratio.
 * @param {(v:number, g:{local:number,remote:number})=>void} [o.onFade]
 * @param {(line:string, how:string)=>void} [o.onLog]  a STATE CHANGE, not a tick.
 */
export function createLocalRemote({
  local = {}, remote = {},
  value = 0,
  aria = 'crossfade between here and there',
  fullMode = 'hover',
  aspect = null,
  onFade = null,
  onLog = null,
} = {}) {
  const root = el('div', 'pos-lr');

  /**
   * 🔴 ONE SURFACE, BECAUSE THE ASK SAID *"its 'glue' thing"*. The two wells
   * and the row under them are one object with one border and hairline seams
   * between the parts, which is `.pos-glue`'s look rather than three boxes with
   * the page rhythm between them. It is not `createGlue` itself: that stacks
   * blocks vertically and this puts two of them SIDE BY SIDE, which is a claim
   * a vertical stack cannot make. The look is shared; the arrangement is not.
   */
  const sides = {};

  function makeSide(which, spec) {
    const {
      label = which, of = '', kind = 'missing', media = null, say = '',
      presence: wantPresence,
    } = spec || {};
    if (!KINDS.includes(kind)) {
      throw new Error(`local-remote: ${which} kind is one of ${KINDS.join(', ')}, `
        + `not ${JSON.stringify(kind)}.`);
    }

    const pane = el('div', `pos-lr-pane pos-lr-${which}`);

    /**
     * 🔴 THE LABEL IS ONE ELEMENT WITH TWO HOMES, NEVER TWO ELEMENTS WITH ONE
     * STRING. A row that exists twice is a readout living in two files, which
     * is a defect this project has already named, and `video-panel.mjs`'s
     * `under()` settled the same question the same way: it MOVES the page's own
     * control row into the panel while full and puts it back, *"the page's own
     * element, moved, never a copy"*.
     */
    const labelEl = el('span', 'pos-lr-lab', label);

    /**
     * 🔴 ONLY A SIDE THAT CAN BE ABSENT GETS A BADGE, AND `/mirror/` SETTLED
     * THIS. A presence dot under the near picture is a badge about the browser
     * you are reading this in, which can never say anything but online, and a
     * control with one honest state is the shape this project calls a lie. The
     * default is therefore *the far side has one, the near side does not*, and
     * a page that knows better passes `presence: true` or `presence: false`.
     */
    const wants = wantPresence === undefined ? which === 'remote' : !!wantPresence;
    const presence = wants
      ? createPresence({ of: of || (which === 'remote' ? 'the far end' : 'this page'),
        mode: 'dot', state: 'unknown' })
      : null;

    const panel = createVideoPanel({
      media: null,
      left: presence ? presence.el : false,
      fullMode,
      aspect,
    });
    pane.append(panel.el);

    /**
     * 🔴 THE SENTENCE LIVES IN THE WELL, AND IT IS DRAWN OVER WHATEVER IS
     * THERE RATHER THAN INSTEAD OF IT. A page whose remote drops while a frozen
     * last frame is still on screen has a picture that is a LIE about now, and
     * clearing it would throw away the only thing that says what the far end
     * looked like when it was answering. So the note sits on top and the frame
     * stays under it.
     * ⚠️ IT IS NOT A LIVE SENTENCE. Nothing that redraws every frame may change
     * how much room it takes, and this one changes when a socket changed, which
     * is a thing that happened rather than a thing that ticks.
     */
    const note = el('p', 'pos-lr-say', say || '');
    panel.stage.append(note);

    let nowKind = kind;
    let mediaEl = null;

    const setMedia = (node) => {
      const next = node ? (node.el || node) : null;
      if (mediaEl && mediaEl !== next) mediaEl.remove();
      mediaEl = next;
      if (mediaEl) panel.stage.insertBefore(mediaEl, note);
      return mediaEl;
    };

    const paint = () => {
      /**
       * ⚠️ DELETED, NEVER SET EMPTY. `[data-kind]` matches an attribute whose
       * value is the empty string, which is the bug `video-panel.mjs` shipped
       * as `dataset.full = full ? fullMode : ''` and carried for as long as it
       * existed: a panel that had been full ONCE kept every full-screen rule
       * for the rest of the page's life. There is nothing to delete here
       * because a kind is always one of three, and the note below is where the
       * trap actually lives.
       */
      pane.dataset.kind = nowKind;
      const text = note.textContent || '';
      if (text) pane.dataset.say = '1'; else delete pane.dataset.say;
    };

    const api = {
      which,
      el: pane,
      panel,
      presence,
      labelEl,
      get stage() { return panel.stage; },
      get media() { return mediaEl; },

      /** Rename this side. The fader's end label and the pane's label are one element. */
      label(text) {
        if (text === undefined) return labelEl.textContent;
        labelEl.textContent = text ?? '';
        return labelEl.textContent;
      },

      /**
       * What this pane is holding, and the sentence it shows while it is
       * holding nothing.
       *
       * ⚠️ A CHANGE OF KIND IS A STATE CHANGE AND GETS A LOG LINE, which is
       * this project's rule about where a fact goes: a figure belongs in a
       * readout cell, a claim belongs in an assert, and a state change belongs
       * in the log WHEN IT CHANGES.
       */
      kind(next, opt = {}) {
        if (next === undefined) return nowKind;
        if (!KINDS.includes(next)) {
          throw new Error(`local-remote: kind is one of ${KINDS.join(', ')}, `
            + `not ${JSON.stringify(next)}.`);
        }
        const was = nowKind;
        nowKind = next;
        if (opt.say !== undefined) note.textContent = opt.say ?? '';
        if (opt.media !== undefined) setMedia(opt.media);
        paint();
        if (was !== next) {
          onLog?.(`${labelEl.textContent || which} is ${next === 'missing'
            ? 'not answering' : `showing ${next}`}`, next === 'missing' ? 'warn' : 'ok');
        }
        return nowKind;
      },

      /** The sentence shown while there is nothing to draw. */
      say(text) {
        if (text === undefined) return note.textContent;
        note.textContent = text ?? '';
        paint();
        return note.textContent;
      },
      sayEl: note,

      /** Put a picture, a canvas or a wave view in the well. */
      media(node) { setMedia(node); paint(); return mediaEl; },
    };

    if (media) setMedia(media);
    paint();
    return api;
  }

  sides.local = makeSide('local', local);
  sides.remote = makeSide('remote', remote);

  // ── the fader, and the row it lives in ────────────────────────────────────
  //
  // 🔴 NO VISIBLE LABEL ON THE SLIDER, WHICH IS `/grains/`'S SETTLED ANSWER AND
  // NOT A SAVING. Its ENDS are labelled, so a third word between them printed
  // `THIS PAGE  BLEND 0 %  THE BOARD`: three labels for one control, the middle
  // one stacked over its own number and squeezing the track down to a stub.
  // ⚠️ `aria` STILL GETS ONE, because a screen reader has no ends to read.
  let fading = false;
  const fade = createSlider({
    label: '', aria, min: 0, max: 100, step: 1,
    value: Math.round(Math.max(0, Math.min(1, value)) * 100), unit: '%',
    onInput: (v) => apply(v / 100, 'hand'),
  });

  const bar = el('div', 'pos-lr-bar');
  const fadeCell = el('div', 'pos-lr-fade');
  fadeCell.append(fade.el);
  /**
   * 🔴 THE LABELS ARE IN THE BAR IN THE WIDE ARRANGEMENT AND IN THEIR OWN
   * PANE'S FOOTER IN THE NARROW ONE, AND THAT IS TWO STRUCTURES RATHER THAN ONE
   * STRUCTURE AT TWO SIZES. Given as two drawings, and the second one is not a
   * reflow of the first: wide is one footer holding two labels with the fader
   * between them, narrow is a footer per pane with the fader as a full width
   * band under both. `video-panel.mjs`'s native shape IS the narrow one, *"a
   * picture, and a row of three slots under it"*, so the phone arrangement is
   * the component this is built out of and the wide arrangement is the special
   * case, which is the opposite of how it would be written by default.
   */
  bar.append(sides.local.labelEl, fadeCell, sides.remote.labelEl);
  root.append(sides.local.el, sides.remote.el, bar);

  // ── what the fader moves ─────────────────────────────────────────────────
  //
  // 🔴 A CROSSFADE IS AN AUDIO CLAIM, SO THIS MOVES REAL GAIN. A fader that
  // only redraws is the shape this project calls a lie. What it cannot do is
  // OWN the audio graph: an AudioContext does not exist until somebody has
  // pressed something, and this component is built at page load. So the nodes
  // arrive later, through `gain()`, and the numbers also go out through
  // `onFade` for a page whose sink is an `<audio>` element's `.volume` rather
  // than a node.
  let sinks = { local: null, remote: null };
  let blend = Math.max(0, Math.min(1, value));

  /** A GainNode, an AudioParam, or nothing. Anything else is a caller's typo. */
  const paramOf = (x) => {
    if (!x) return null;
    if (typeof x.gain?.value === 'number') return x.gain;        // a GainNode
    if (typeof x.value === 'number') return x;                    // an AudioParam
    throw new Error('local-remote: a gain is a GainNode or an AudioParam, '
      + 'and this is neither. A fader wired to something that has no level is a fader that lies.');
  };

  function apply(v, how) {
    blend = Math.max(0, Math.min(1, v));
    const g = fadeGains(blend);
    if (sinks.local) sinks.local.value = g.local;
    if (sinks.remote) sinks.remote.value = g.remote;
    // ⚠️ THE GUARD IS ABOUT RE-ENTRY, NOT ABOUT COST. `fade.set` fires this
    // function back through `onInput` on some paths, and a page whose `onFade`
    // moves the fader would otherwise recurse.
    if (!fading) { fading = true; try { onFade?.(blend, g); } finally { fading = false; } }
    return g;
  }

  // ── which arrangement, and why it is not a media query ────────────────────
  //
  // 🔴 A MEDIA QUERY ADDS NO SPECIFICITY, AND WORSE THAN THAT, NO HARNESS HERE
  // CAN ENTER ONE. `demo/verify.mjs` runs at 756 px with no viewport override,
  // so every assert on every page in this repository passes without ever
  // entering its phone layout, and `.pos-pick`'s entire phone arrangement sat
  // dead in `shell.css` for weeks with every line of it correct. Deciding the
  // arrangement HERE, in JavaScript, off an attribute, makes both arrangements
  // reachable at any width: `/kit/` grades the phone one at desktop size, and
  // it is a MEASUREMENT rather than a reading of source order.
  //
  // 🔴 AND IT WATCHES ITS OWN WIDTH RATHER THAN THE WINDOW'S, which is the
  // other half. A component in a half page column on a 1280 px screen is 600 px
  // wide, and a viewport query would tell it it has room it does not have.
  // `/kit/` shows the phone arrangement by putting one in a 375 px frame, which
  // is how `CARD GRID ON A PHONE` already works, and that only works at all
  // because the component asks its own box.
  let forced = null;
  let arrangement = null;

  function layOut(next) {
    if (next === arrangement) return arrangement;
    arrangement = next;
    root.dataset.arrange = next;
    /**
     * 🔴 THE LABEL MOVES HOUSE, AND IT IS THE SAME NODE ON BOTH SIDES OF THE
     * MOVE. In the narrow arrangement it goes into that pane's own footer,
     * which is where `video-panel.mjs` puts a fact about the picture above it;
     * in the wide one it goes back into the bar, on its own side of the fader.
     * ⚠️ THE CENTRE SLOT, NOT THE LEFT ONE. The left slot already holds the
     * presence dot on the far side and nothing on the near side, and a label
     * that sits beside a dot on one pane and against the wall on the other is
     * two panes that do not line up. The centre is empty by default on both.
     */
    for (const which of ['local', 'remote']) {
      const s = sides[which];
      if (next === 'narrow') s.panel.slots.centre.append(s.labelEl);
      else bar.insertBefore(s.labelEl, which === 'local' ? fadeCell : null);
    }
    return arrangement;
  }

  const widthNow = () => root.getBoundingClientRect().width;
  const follow = () => {
    if (forced) return;
    const w = widthNow();
    // ⚠️ A BOX WITH NO WIDTH YET IS NOT A NARROW BOX. A component built inside a
    // closed tab panel measures 0, and reading that as a phone would lay the
    // whole thing out for a screen nobody has. `/kit/` has already been bitten
    // by exactly this: seven diagrams built inside a closed panel came out laid
    // out for 320 px inside a 658 px panel.
    if (!(w > 0)) return;
    layOut(w <= NARROW_PX ? 'narrow' : 'wide');
  };

  // Start wide, then correct on the first measurement. A component that has
  // never been measured has to pick one, and the wide arrangement is the one
  // that does not move an element into a slot it may have to be taken out of.
  layOut('wide');

  let ro = null;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(follow);
    ro.observe(root);
  }

  apply(blend, 'build');

  const api = {
    el: root,
    local: sides.local,
    remote: sides.remote,
    /** The slider itself, for a page that wants to rename or re-scale it. */
    fade,
    /** The row under the two panes. */
    bar,

    /**
     * Where the fader is, 0 all local and 1 all remote. Pass a number to drive it.
     *
     * ⚠️ IT MOVES THE CONTROL AS WELL AS THE GAIN. A page that set the level
     * and left the handle where it was would be showing a position that is not
     * the position, which is the same fault as a description that has drifted:
     * nothing type checks it and a visitor believes it.
     */
    value(v) {
      if (v === undefined) return blend;
      const want = Math.max(0, Math.min(1, v));
      fade.set(Math.round(want * 100), { quiet: true });
      apply(want, 'set');
      return blend;
    },

    /** The two gains as they are right now, equal power. */
    gains: () => fadeGains(blend),

    /**
     * Wire the fader to a real audio graph, whenever the page has one.
     *
     * 🔴 IT IS A SETTER RATHER THAN AN OPTION BECAUSE OF WHEN AN AudioContext
     * EXISTS. Sound here is always allowed to be late: `AudioContext.resume()`
     * waits on a gesture and never rejects, so a component that demanded its
     * nodes at build time would force every page to build its graph on a visit,
     * which is the defect `/reel/` shipped and this repository has now paid for
     * on four pages.
     * ⚠️ PASSING IT AGAIN RE-BINDS. `null` on a side unwires that side and
     * leaves whatever it was last set to where it stands, because a component
     * that reset somebody else's node on the way out would be changing a level
     * nobody asked it to touch.
     */
    gain({ local: l, remote: r } = {}) {
      sinks = { local: paramOf(l), remote: paramOf(r) };
      apply(blend, 'wire');
      return sinks;
    },

    /**
     * Read the arrangement, or pin one.
     *
     * `arrange()` answers `'wide'` or `'narrow'`.
     * `arrange('narrow')` pins it, which is what a specimen at a phone's width
     * and a check both want. `arrange(null)` hands it back to the box's width.
     */
    arrange(next) {
      if (next === undefined) return arrangement;
      if (next === null) { forced = null; follow(); return arrangement; }
      if (!ARRANGEMENTS.includes(next)) {
        throw new Error(`local-remote: an arrangement is one of ${ARRANGEMENTS.join(', ')}, `
          + `not ${JSON.stringify(next)}.`);
      }
      forced = next;
      return layOut(next);
    },

    /** The width this box would change arrangement at. */
    narrowPx: NARROW_PX,

    destroy() {
      ro?.disconnect();
      root.remove();
    },
  };

  return api;
}

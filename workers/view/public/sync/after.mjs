// demo/sync/after.mjs: the AFTER tab of /sync/, from the old /replay/
// (plans/plan-demo-structure.md §3.1, step 7).
//
// The fourth of the four regimes in plans/plan-routing-time.md: ALIGNED
// AFTER, ON ONE RECORDING. Nothing travels at all by the time this plays: the
// show and the cues an operator called during it are both files, and they
// agree because the picture is the clock and every cue is a moment of the
// picture's own time.
//
// WHAT CAME OVER FROM /replay/: the 190 s show off R2, its eight cues, the
// media element as transport master, the loop, the watchdog, the diagram.
// WHAT CHANGED ON THE WAY IN:
//   1  🔴 THIS TAB OWNS THE PAGE'S ONE PUBLISHED TRANSPORT BAR, so the harness
//      drills it as `__demo.transport` exactly as it drilled /replay/'s. Every
//      other bar on /sync/ is `publish: false` and drilled as page asserts.
//   2  🔴 THE LOOP IS LAID AROUND THE FIRST CUE, so the check that the picture
//      stays inside a loop also makes a cue fire on every lap, and *cues land
//      within 250 ms of the picture* is graded on every run. On /replay/ it
//      ran only when the harness happened to play past 15 s, which it never
//      did, so the page's headline number was never asserted.
//   3  The diagram is drawn the first time the tab is shown, into the tab,
//      after its readout and log. `atEnd` would put it under the whole page,
//      under every tab.

import { el, armVideo, playOrPrompt } from '/shell/shell.mjs';
import { createTransportBar } from '/shell/transport-bar.mjs';
import { createStripView } from '/shell/strip.mjs';
import { createGlue } from '/shell/glue.mjs';
import { createDiagram } from '/shell/diagram.mjs';
import { createDeck } from '/timeline/transport.mjs';
import { mediaMaster } from '/timeline/media-master.mjs';
import { ARCHIVE, CUES, cueItems } from '/shell/archive.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One lap, and long enough that a picture which ignores the loop is obvious
// rather than arguable: with the loop working the element never passes `b`,
// and without it the element is a full second past by the time the sampling
// stops.
const LOOP_MS = 900;
const SAMPLE_MS = 2000;
// The first cue sits inside the lap, 400 ms after its start.
const LOOP_LEAD_MS = 400;
// What the wrap can honestly cost. The bar wraps from its own paint at 60 Hz
// once the playhead reaches `b`, and the playhead is re-anchored on the
// picture four times a second, so a third of a second is slack rather than
// tolerance. A picture that is not being looped at all is a second past this.
const LOOP_SLACK_MS = 350;

// NATIVE HLS ONLY ON WEBKIT, gated on ManagedMediaSource. `canPlayType(
// 'application/vnd.apple.mpegurl')` answers "maybe" in Chrome as well as
// Safari, so it cannot tell them apart. Same rule as src/low-latency-player.js.
const NATIVE_HLS = 'ManagedMediaSource' in window
  && !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl');

// `media` is not a cell: the picture's own clock is printed on the bar beside
// the duration. `worst` is, because a median on its own hides the one bad fire.
export const readout = { fired: '', 'late by': 'ms', worst: 'ms', apart: 'ms' };

export function build({ panel, log, set, d }) {
  const video = el('video', 'sync-video', null, { playsinline: '', muted: '', preload: 'auto' });
  video.muted = true;

  // ── the cue lane: the media is the master, the deck is the score ─────────
  const fires = [];
  const cueAdapter = {
    // NO `rates`: this playhead follows a media element and never drives it,
    // so there is no speed to arm, and a lattice of one draws a lone `1`.
    caps: { continuous: false, assertOnSeek: true },
    actuate(payload) {
      // error is measured in MEDIA time, the only clock that means anything
      // for a recording
      const mediaMs = video.currentTime * 1000;
      fires.push({ id: payload.id, mediaMs, wantMs: payload.offsetMs, errMs: mediaMs - payload.offsetMs });
      render();
    },
    // reduceAt() hands over the PREFIX already, and each row is the payload
    reduce(rows) { return { count: rows.length, last: rows.length ? rows[rows.length - 1].id : null }; },
    assertState(state) { return state; },
  };
  const deck = createDeck({ items: cueItems(), adapters: { cue: cueAdapter }, range: [0, ARCHIVE.durationMs] });

  let master = null, hls = null, loaded = false;

  /** Point the element at the show. Once, on the first press of ▸. */
  function attach() {
    if (loaded) return;
    loaded = true;
    armVideo(video);
    const url = ARCHIVE.hls;
    if (NATIVE_HLS) {
      video.src = url;
    } else if (window.Hls && window.Hls.isSupported()) {
      hls = new window.Hls({ enableWorker: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) log(`hls fatal ${data.type}/${data.details}`, 'bad');
      });
    } else {
      log('this browser has no way to play HLS', 'bad');
      return;
    }
    // MEDIA IS THE MASTER: the deck follows currentTime, it does not drive it
    master = mediaMaster(deck, video, {
      anchorMs: 0,
      onCorrection: (c) => log(`correction ${JSON.stringify(c).slice(0, 90)}`),
    });
    video.addEventListener('loadedmetadata', () => {
      log(`playing ${ARCHIVE.hls.split('/').slice(-2).join('/')}, ${video.duration?.toFixed?.(1)} s, ${CUES.length} cues`);
    }, { once: true });
  }

  /**
   * 🔴 THE PAGE OWNS WHAT IS BEING PLAYED, SO THE BAR ASKS IT RATHER THAN THE
   * DECK. The bar's loop wraps by SEEKING, and the deck is a FOLLOWER of the
   * picture, so a seek written to the follower was undone by the master's next
   * tick. Every verb drives the element; the deck follows.
   */
  const command = {
    play: () => {
      const first = !loaded;
      attach();
      // The picture starts where the playhead already is.
      if (first) {
        const at = Math.max(0, deck.position());
        if (at > 1) { try { video.currentTime = at / 1000; } catch { /* no data yet */ } }
      }
      // FIRED, NEVER AWAITED: play() waits on a gesture and does not reject.
      playOrPrompt(video, d);
      deck.play();
    },
    pause: () => { video.pause(); deck.pause(); },
    seek: (pos) => {
      const ms = Math.max(0, pos);
      if (loaded) { try { video.currentTime = ms / 1000; } catch { /* no data yet */ } }
      return deck.seek(ms);
    },
  };

  // ONE POSITION SURFACE: the strip seeks on press and on drag, so the bar
  // has no slider. NO WAY BUTTON: a picture only runs forwards.
  // ⚠️ IN THE PAGE BEFORE THE STRIP IS MADE, or it fits itself to the 300 px
  // a detached canvas measures and never fits again.
  const shelf = el('div');
  panel.add(video, shelf);
  const bar = createTransportBar(shelf, deck, { scrub: false, command });
  const strip = createStripView(shelf, deck, { size: 'default', lanes: [{
    id: 'cue', kind: 'cue', height: 44, as: 'ticks',
    color: '#ffd400', width: 2.5, latch: true, firedColor: '#8fd6a8',
  }] });
  shelf.append(createGlue(bar.el, strip.el));

  function render() {
    set('fired', fires.length);
    if (!fires.length) return;
    const errs = fires.map((f) => Math.abs(f.errMs)).sort((a, b) => a - b);
    set('late by', errs[errs.length >> 1]);
    set('worst', errs[errs.length - 1]);
  }

  // WATCHDOG. media-master's own rule: inside jumpMs an error is frame
  // quantisation; past it the element has MOVED and the timeline must follow.
  // Nothing is set before there is a picture, and it only pulls while the
  // show is rolling, so a paused scrub is never taken out of a hand.
  const watch = setInterval(() => {
    if (!master || video.readyState < 2) return;
    const off = video.currentTime * 1000 - deck.position();
    set('apart', off, Math.abs(off) > 250 ? 'bad' : 'ok');
    if (deck.playing?.() && Math.abs(off) > 250) {
      deck.seek(video.currentTime * 1000);
      log(`pulled the timeline back ${off.toFixed(0)} ms onto the picture`, 'bad');
    }
  }, 400);
  addEventListener('pagehide', () => clearInterval(watch));

  /**
   * THE DIAGRAM, LAST IN THE TAB. Drawn on the first showing, because a
   * diagram laid out inside a closed panel is laid out for a width nobody has,
   * and because by then the tab's readout and log are already in place above.
   */
  let dg = null, fitted = false;
  function drawDiagram() {
    if (dg) return;
    const host = el('div');
    panel.add(host);
    dg = createDiagram(host, {
      caption: 'The picture is the clock. Everything else in this tab follows where it has got to.',
      nodes: [
        { id: 'cf', label: 'Cloudflare', sub: 'R2 bucket', kind: 'cloud', tech: 'cloudflare',
          children: [
            { id: 'playlist', label: 'playlist', sub: 'm3u8 text',
              note: 'Text naming every four second file of the show, in order. It is fetched '
                  + 'once, because a recording that has already finished never grows.' },
            { id: 'segs', label: 'segments', sub: '4s each',
              note: 'The show itself, cut into four second files at the moment it was '
                  + 'recorded. A seek fetches the one file the playhead landed in.' },
          ] },
        // `set: true`: these four are not one chain, and `cue log` is a file
        // this page ships rather than something upstream produces.
        { id: 'you', label: 'Browser', sub: 'phone or laptop', kind: 'here', tech: 'browser', set: true,
          children: [
            { id: 'hls', label: 'hls.js', sub: 'MediaSource',
              note: 'Fetches the files the playlist names and appends them to a '
                  + '**MediaSource** buffer. Safari has no need of it: **ManagedMediaSource** '
                  + 'means WebKit plays the playlist itself and this never loads.' },
            { id: 'video', label: 'video', sub: 'one element',
              note: 'Muted, and decoding whatever is in the buffer. Its currentTime is the '
                  + 'only clock in this tab that means anything.' },
            { id: 'cues', label: 'cue log', sub: '8, in the page',
              note: 'Eight cues an operator called while the show went out on 2026-08-26, each '
                  + 'stamped with how far into the recording it happened. Hard coded into this '
                  + 'page as a JavaScript module: no Durable Object, nothing fetched.' },
            { id: 'clock', label: 'timeline', sub: '8 cues, 1 loop',
              note: 'Holds the eight cues at the moment each was called, and the two marks a '
                  + 'loop runs between. A lap coming round writes **video** currentTime, '
                  + 'which is what makes the picture turn round with the playhead.' },
          ] },
      ],
      links: [
        { from: 'playlist', to: 'hls', label: 'file names',
          note: 'Under a kilobyte of text, listing the files and how long each one runs. The '
              + 'player turns that list into a duration it can seek inside before a single '
              + 'frame is fetched.' },
        { from: 'segs', to: 'hls', label: '4s of video',
          note: 'Ordinary HTTP GETs, one per file, and only for the part of the show being '
              + 'watched. Seeking to the end of a 190 second recording fetches one file '
              + 'rather than 48.' },
        { from: 'hls', to: 'video',
          note: 'Bytes appended below JavaScript, which is why a locked phone keeps playing: '
              + 'nothing on the page runs between one frame and the next.' },
        { from: 'video', to: 'clock',
          note: 'Where the picture has actually got to, read from **timeupdate** four times a '
              + 'second and from **requestVideoFrameCallback** once per presented frame. The '
              + '**timeline** is bent onto it and never the other way round.' },
        // NO ARROW FROM `cue log` TO `timeline`: `createDiagram` refused it on
        // `cuts` in both orderings, and its note carries what it would have said.
      ],
    }, { how: true });
  }

  /** The loop, pressed the way a finger presses it, around the first cue. */
  async function gradeLoop() {
    const cap = performance.now() + 8000;
    while (video.readyState < 2 && performance.now() < cap) await sleep(100);
    if (video.readyState < 2) {
      return { pass: false, detail: `no picture arrived to loop, readyState ${video.readyState}` };
    }
    const a = CUES[0].offsetMs - LOOP_LEAD_MS;
    const b = a + LOOP_MS;
    command.seek(a); bar.api.pressLoop();
    command.seek(b); bar.api.pressLoop();
    if (!bar.api.loop) return { pass: false, detail: 'the loop did not take' };
    // a seek into a part of the show not buffered yet is a wait, not a failure
    const go = performance.now() + 4000;
    while ((video.currentTime * 1000 < a || video.currentTime * 1000 > b) && performance.now() < go) await sleep(50);
    const from = video.currentTime;
    while (video.currentTime <= from && performance.now() < go) await sleep(50);
    let maxCt = video.currentTime;
    const end = performance.now() + SAMPLE_MS;
    while (performance.now() < end) {
      maxCt = Math.max(maxCt, video.currentTime);
      await sleep(50);
    }
    bar.api.pressLoop();                     // take it off again
    const ceiling = (b + LOOP_SLACK_MS) / 1000;
    const ran = maxCt - a / 1000;
    // BOTH HALVES, or a picture that never played would pass by standing still
    return {
      pass: ran > 0.4 && maxCt <= ceiling,
      detail: `the picture ran ${ran.toFixed(2)} s from the loop start and reached `
        + `${maxCt.toFixed(2)} s, against a ceiling of ${ceiling.toFixed(2)} s`,
    };
  }

  return {
    show() {
      drawDiagram();
      // the strip fits the whole show to its width once it has one
      if (!fitted) { fitted = true; requestAnimationFrame(() => strip.strip.fit()); }
    },
    hide() { if (deck.playing?.()) command.pause(); },

    async check({ A }) {
      A('nothing was fetched and no picture was asked for before the first press of play',
        !loaded && !hls && !video.currentSrc, loaded ? 'already attached' : 'the element has no source yet');
      bar.api.el.querySelector('.tbar-toggle').click();
      const lp = await gradeLoop();
      A('the picture stays inside the loop', lp.pass, lp.detail);
      const toggle = bar.api.el.querySelector('.tbar-toggle');
      if (bar.api.playing) toggle.click();
      if (fires.length) {
        const errs = fires.map((f) => Math.abs(f.errMs)).sort((x, y) => x - y);
        const p50 = errs[Math.floor(errs.length * 0.5)];
        A('cues land within 250 ms of the picture', p50 < 250,
          `p50 ${p50.toFixed(0)} ms, worst ${errs[errs.length - 1].toFixed(0)} ms, over ${fires.length} fires of ${fires[0].id}`);
      } else {
        A('cues land within 250 ms of the picture', false, `no cue fired inside a loop laid around ${CUES[0].id}`);
      }
      A('the diagram drew every name and every arrow whole', !!dg && dg.cuts.length === 0,
        dg ? (dg.cuts.map((c) => `${c.where} ${c.id}`).join(', ') || 'nothing cut, nothing refused') : 'no diagram');
      // the MANIFEST, not the element's readiness, which depends on how fast
      // R2 answered. A second request, made only to grade, so only here.
      let mOk = false, mStatus = 0;
      try { const r = await fetch(ARCHIVE.hls, { cache: 'no-store' }); mStatus = r.status; mOk = r.ok; } catch (e) { log(String(e), 'bad'); }
      A('archive manifest reachable', mOk, `HTTP ${mStatus}, readyState ${video.readyState}`);
      A('media is the transport master', !!master);
      A('deck range is the show length', deck.durationMs === ARCHIVE.durationMs, `${deck.durationMs} ms`);
      A('all eight cues are in the score',
        (deck.reduceAt?.('cue', ARCHIVE.durationMs)?.count ?? 0) === CUES.length,
        `${deck.reduceAt?.('cue', ARCHIVE.durationMs)?.count} of ${CUES.length}`);
      // BOTH HALVES ARE THE CLAIM, read off this tab's bar and not the page:
      // a bar that drew nothing would otherwise pass as one that correctly
      // leaves out a control.
      const loopBtn = bar.api.el.querySelector('.tbar-loop');
      const ways = bar.api.el.querySelectorAll('.tbar-loopgrp .tbar-x').length;
      A('a loop, and no way button, because a picture only runs forwards', !!loopBtn && ways === 0,
        `${loopBtn ? 'LOOP is on the bar' : 'NO LOOP BUTTON AT ALL'}, ${ways} way button(s) beside it`);
      const rateBtns = bar.api.el.querySelectorAll('.tbar-rates button').length;
      A('no speed picker, because nothing here has a speed to arm',
        bar.api.lattice === null && rateBtns === 0, `lattice ${JSON.stringify(bar.api.lattice)}, ${rateBtns} buttons`);
      A('this is the page’s one published transport', window.__demo?.transport === bar.api,
        window.__demo?.transport === bar.api ? 'the harness drills this bar' : 'another bar is published');
    },
  };
}

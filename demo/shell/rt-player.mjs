// demo/shell/rt-player.mjs: a `player` node on /connect/: /granulator/'s recordings, looped into
// player:audio-out, behind Play and a picker. A recording is fetched only on Play, from our own
// bucket, and only from the store linked into player:file-in.
// why: lessons/kit-rt-player.md#header

import { createButtonGroup } from './button-group.mjs';
import { createPicker } from './picker.mjs';
import { createSources } from '/granulator/grain-rig.mjs';

export function make({ upstream, wake, log }) {
  const sources = createSources({ log });
  let at = 0, out = null, src = null, playing = false, opened = 0;
  const say = document.createElement('p');
  say.className = 'cn-face-say';
  say.textContent = 'stopped: Play fetches the recording from our bucket';
  const picker = createPicker({ what: 'recording', prev: () => choose(at - 1), next: () => choose(at + 1), onPick: (i) => choose(i) });
  picker.options(sources.map((s) => s.label), 0);
  picker.show(sources[0].label, 0);
  function choose(i) {
    at = (i + sources.length) % sources.length;
    picker.show(sources[at].label, at);
    if (playing) { stop(); play(); }
  }
  const buttons = createButtonGroup({ buttons: [{ id: 'play', icon: 'play', label: 'play', onPress: () => (playing ? stop() : play()) }] });
  async function play() {
    wake();
    const store = upstream('file-in');
    const s = sources[at];
    if (!store?.url || !s.url.startsWith(store.url)) { say.textContent = 'no recording is linked into file-in, so there is nothing to play'; return; }
    playing = true;
    buttons.setIcon('play', 'stop', 'stop');
    say.textContent = `fetching ${s.label}`;
    store.read();
    try {
      const o = await s.open(out.context);
      if (!playing) { o.stop(); return; }
      src = o; opened++;
      o.node.connect(out);
      say.textContent = `playing ${s.label}, looped`;
    } catch (e) {
      playing = false;
      buttons.setIcon('play', 'play', 'play');
      say.textContent = `${s.label} did not load: ${e.message}`;
    }
  }
  function stop() {
    playing = false;
    src?.stop(); src = null;
    buttons.setIcon('play', 'play', 'play');
    say.textContent = 'stopped';
  }
  const row = document.createElement('div');
  row.className = 'cn-pi-row';
  row.append(buttons.el, picker.el);
  const face = document.createElement('div');
  face.className = 'cn-panel';
  face.append(row, say);
  return {
    face, slot: 'panel', play, stop,
    start(ctx) { out = ctx.createGain(); },
    audio: { out: () => out },
    playing: () => playing && !!src,
    heard: () => opened,
    close() { stop(); try { out?.disconnect(); } catch { /* not connected */ } face.remove(); },
  };
}

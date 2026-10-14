// demo/shell/rt-speaker.mjs: the `speaker` node on /connect/: a gain into the page's one way out.
// `heard()` is the level measured there, so it reads silence whatever the links say.
// why: lessons/kit-rt-speaker.md#header

export function make({ level }) {
  let master = null;
  return {
    start(ctx, destination) {
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(destination);
    },
    audio: { in: () => master },
    heard: () => level(),
    close() { try { master?.disconnect(); } catch { /* not connected */ } master = null; },
  };
}

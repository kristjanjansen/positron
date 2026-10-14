// demo/shell/rt-speaker.mjs: the runtime of a `speaker` node on /connect/
// (node-runtime.mjs): a gain into the page's one way out to the speakers.
// `heard()` is the level measured there, so it reads silence when nothing
// reaches the speakers whatever the links say.

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

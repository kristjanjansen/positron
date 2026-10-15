// demo/shell/rt-store.mjs: a file store on /connect/ (node-runtime.mjs), our R2 bucket
// through the station worker's /media/ door. It opens nothing; the engine on its
// file-out link reads on a press, while that link holds.
// why: lessons/kit-rt-store.md#header

// Where each store's files are, as the pages that read them say.
const MEDIA = 'https://positron-station.kristjan-jansen.workers.dev/media/';
export const ADDRESS = {
  'typewriter-samples': `${MEDIA}typewriter/hermes-precisa-305/`,
  'piano-samples': `${MEDIA}sampler/`,
  'rhodes-samples': `${MEDIA}sampler/`,
  recording: MEDIA,
};

export function make({ type }) {
  let reads = 0;
  return {
    type,
    url: ADDRESS[type] ?? null,
    /** A reader says it fetched from here, so the count is the far side's. */
    read() { reads++; return ADDRESS[type] ?? null; },
    heard: () => reads,
    close() {},
  };
}

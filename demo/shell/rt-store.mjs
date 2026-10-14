// demo/shell/rt-store.mjs: the runtime of a file store on /connect/
// (node-runtime.mjs): our own R2 bucket, read through the station worker's
// /media/ door. It holds an address and opens nothing; the engine at the far
// end of its file-out link reads from it on a person's press, and only while
// that link holds (`upstream('file-in')`).

// Where each store's files are, as the pages that read them say.
const MEDIA = 'https://positron-station.kristjan-jansen.workers.dev/media/';
export const ADDRESS = {
  'typewriter-samples': `${MEDIA}typewriter/hermes-precisa-305/`,
  'piano-samples': `${MEDIA}sampler/`,
  recording: MEDIA,
};

export function make({ type }) {
  let reads = 0;
  return {
    url: ADDRESS[type] ?? null,
    /** A reader says it fetched from here, so the count is the far side's. */
    read() { reads++; return ADDRESS[type] ?? null; },
    heard: () => reads,
    close() {},
  };
}

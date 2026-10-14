// node demo/shell/reel-test.mjs: the pure half of reel.mjs, with no browser.
// Not graded here: the canvas, the deck, the bar and MediaRecorder itself,
// which need a document and are graded by /social/typist/ and a real take.
// Six of the asserts are NEGATIVE CONTROLS, marked (neg).
import { W, H, SAFE_TOP, SAFE_BOTTOM, X, TEXT_W, TYPES, pickType, extOf, atRest, waitsForSound } from './reel.mjs';

let ok = 0, bad = 0;
const t = (name, cond, detail = '') => {
  if (cond) ok++; else bad++;
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
};

t('the frame is a 9:16 story at 1080 wide', W === 1080 && H === 1920);
t('the top band clears the 14% a story covers', SAFE_TOP >= 0.14 * H, `${SAFE_TOP} of ${H}`);
// SAFE_BOTTOM itself is 2 px inside the covered 35% (1250 against 1248); typist
// keeps its last baseline 80 px above it, and that is the line graded here.
t('the words stop above the 35% a story covers', SAFE_BOTTOM - 80 <= 0.65 * H, `${SAFE_BOTTOM - 80}, limit ${0.65 * H}`);
t('the text width is the frame less both side margins', TEXT_W === W - 2 * X);

t('Chrome gets the H.264 and AAC MP4 first', pickType(() => true) === TYPES[0]);
t('a browser with only WebM gets WebM', pickType((s) => s.startsWith('video/webm')) === 'video/webm;codecs=vp9,opus');
t('(neg) a browser that supports nothing gets the default, not a type it refused', pickType(() => false) === '');
t('(neg) plain mp4 is not chosen over the codec string when both work',
  pickType((s) => s === 'video/mp4' || s === TYPES[0]) === TYPES[0]);

t('an mp4 blob downloads as .mp4', extOf('video/mp4') === 'mp4');
t('(neg) a webm blob does not download as .mp4', extOf('video/webm') === 'webm');
t('an empty type downloads as .webm, the recorder default', extOf('') === 'webm');

t('stopped at the start is at rest', atRest(0, false, 7000));
t('stopped at the end is at rest', atRest(7000, false, 7000));
t('(neg) paused in the middle is not at rest, so a scrub shows the partial frame', !atRest(3000, false, 7000));
t('playing from 0 is not at rest', !atRest(0, true, 7000));

const load = async () => ({});
t('a reel of events waits for its sounds before the first play', waitsForSound({ load }, false));
t('(neg) a continuous reel starts now and its sound joins late', !waitsForSound({ load, late: true }, false));
t('(neg) sounds already loaded are never waited for again', !waitsForSound({ load }, true));
t('a reel with no sounds has nothing to wait for', !waitsForSound(undefined, false) && !waitsForSound({ gain: 1 }, false));

console.log(`\n${ok}/${ok + bad} ok`);
process.exit(bad ? 1 : 0);

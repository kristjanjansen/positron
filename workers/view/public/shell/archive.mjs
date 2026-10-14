// demo/shell/archive.mjs: the real archive fixture, a 190 s show as segmented HLS on R2 with its
// eight operator cues. T0 is the native anchor, -15 ms against the content anchor, so offsets are real.
// why: lessons/kit-archive.md#header

export const ARCHIVE = {
  hls: 'https://archive.positron.studio/shows/archive-test/index.m3u8',
  hlsFallback: 'https://pub-b8d50fdb5f6a41dbba072e433903705d.r2.dev/shows/archive-test/index.m3u8',
  room: 'archive-test',
  T0: 1787745030511,
  durationMs: 190000,
  segmentMs: 4000,
};

/** offsetMs is ms from T0, i.e. media time. */
export const CUES = [
  {
    "id": "CUE-01",
    "offsetMs": 15001,
    "mode": "now",
    "text": "CUE-01"
  },
  {
    "id": "CUE-02",
    "offsetMs": 36300,
    "mode": "scheduled",
    "text": "CUE-02"
  },
  {
    "id": "CUE-03",
    "offsetMs": 57702,
    "mode": "now",
    "text": "CUE-03"
  },
  {
    "id": "CUE-04",
    "offsetMs": 78100,
    "mode": "scheduled",
    "text": "CUE-04"
  },
  {
    "id": "CUE-05",
    "offsetMs": 99902,
    "mode": "now",
    "text": "CUE-05"
  },
  {
    "id": "CUE-06",
    "offsetMs": 120400,
    "mode": "scheduled",
    "text": "CUE-06"
  },
  {
    "id": "CUE-07",
    "offsetMs": 141603,
    "mode": "now",
    "text": "CUE-07"
  },
  {
    "id": "CUE-08",
    "offsetMs": 162800,
    "mode": "scheduled",
    "text": "CUE-08"
  }
];

/** deck items for a cue lane. */
export const cueItems = () =>
  CUES.map((c) => ({ at: c.offsetMs, kind: 'cue', id: c.id, payload: c }));

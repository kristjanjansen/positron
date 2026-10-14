# workers-station

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `workers/station/worker.mjs`

### door

Above `import { OPEN } from '../_lib/http.mjs';`, lines 1 to 13 before the cut.

~~~js
// positron-station, since 2026-10-02 only the door to its bucket's media.
//
// The radio station that was here moved to eccm with its programmes, records
// and channels (asked in eccm: "do the station. when working, discard the
// positron one"): it is src/station/station.mjs in
// https://github.com/kristjanjansen/eccm, at /stream on eccm's Worker, and the
// station code that stood in this file is in git history before this commit.
// What stays is GET /media/<key>, because the bucket holds more than the
// station did and those objects are read through this address: the MIM project
// videos and pictures (demo/resources/mimproject*.json, the FILM constants in
// workers/pub/container/server.mjs) and kristjanjansen/. The Worker keeps its
// name so every one of those URLs keeps working. Range requests answer 206,
// which the videos need for seeking.
~~~

### archive-prefix

Above `let name;`, lines 34 to 37 before the cut.

~~~js
// archive/ in this bucket is cold storage, not media: the Yoshimi state
// tarball went there on 2026-10-13 (archive/yoshimi/README.md), and this
// door is the bucket's only public route (no r2.dev URL, no custom domain,
// both checked that day). Read it with `wrangler r2 object get --remote`.
~~~

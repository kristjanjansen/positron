# workers-sweep

Comments cut from the code on 2026-10-14 and kept here verbatim, so the code can say in one to three lines what it cannot say itself. Each `why:` pointer in the code names one heading below.

## `workers/sweep/worker.mjs`

### sweep

Above `const API = 'https://api.cloudflare.com/client/v4/accounts';`, lines 1 to 19 before the cut.

~~~js
// positron-sweep: deletes old Stream recordings of the test inputs, hourly.
//
// WHY. Recording cannot be turned off on the RTMPS path (`positron-streaming`),
// the account cap is 1000 storage minutes, and testing filled 75 per cent of it
// in about three weeks. A full cap blocks new live streams, so the real cost of
// not sweeping is an outage. `deleteRecordingAfterDays` has a minimum of 30,
// which is too coarse.
//
// WHAT. Recordings whose `liveInput` is one of `INPUTS` (the uids of the rig
// inputs `low-latency-demo` and `latency-rig-llhls` since 2026-10-13, when
// `positron-demo` and `positron-cam` were deleted; by uid and never by name, because a name
// is a label somebody can change), `created` more than `MAX_AGE_H` hours ago,
// and in state `ready`. Never `live-inprogress`, and nothing still processing.
//
// THE CRON AND THE ROUTE RUN ONE FUNCTION. A cron that can only be observed by
// waiting an hour is one nobody measures, so `POST /sweep` with the bearer
// token runs it now, and `?dry=1` lists what it would delete and deletes
// nothing. Both report what they did in both directions: a cleanup nobody is
// told about cannot be told apart from a leak.
~~~

# Follow (concept clock/040), moved to the archive 2026-10-12

Asked: *"move to archive https://positron.studio/concepts/clock/040/. add short
summary what you said on it"*. The page stays deployed at
`/concepts/clock/040/` and is off the concepts index. It was built in commit
`fafd676b` together with the bay's `ahead` and `follow` link options.

## What it was for

A cue is a small message that belongs to a moment of a video, sent to people
watching that video: a light going red or a caption on `/stage/`'s live show,
or `/partitur/`'s score cues to `/wall/`'s captions over the stage picture.

A cue arrives in about 30 ms. The video over LL-HLS shows 2 to 8 s behind, and
by a different amount for every viewer, moving during the show. So a cue fired
on arrival shows seconds before the picture it belongs to.

A follow link, `{ follow web-1:cam:video-out }`, makes each receiver hold the
cue until its own copy of the video reaches that moment. The sender never
needs to know anybody's delay.

## What it measured

| link | cue on arrival | following, median off | worst |
| --- | --- | --- | --- |
| WebRTC, about 67 ms behind | 22 to 28 ms early | 1.7 to 13 ms | 5.9 to 19.6 ms |
| LL-HLS, 4 s stepping to 6 s | about 5 s early | 2.6 ms | 68 ms, at the step |

On WebRTC following hardly matters; only slow video needs it.

## Why it went to the archive

The picture was modelled: a delay inside the tab, the way `/sync/`'s Follow tab
models it, so no real stream ever arrives late. The mechanism is shown
honestly, but nothing on screen is a real late picture.

## What would make it real

Our own LL-HLS test picture, the one `/llhls/` plays from our publisher, with
its burned in clock: a cue such as "flash at 12:00:05.000 of the picture's own
clock" fires seconds early on arrival and lands on the frame showing that time
when following. It costs Cloudflare Stream minutes while it plays and needs the
publisher awake, both ours.

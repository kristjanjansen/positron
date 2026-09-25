# plan-two-machines: m1 and m2 on one remote, and the rig that went stale between them

Written 2026-09-25 on m1 (MacBookPro18,3, Apple M1 Pro, measured with
`sysctl -n hw.model`), against the running rig, not from documentation. Every
number below says whether it was measured today, measured earlier and re-checked,
or inferred from reading code. The inferences are marked and there are four of
them.

## What started it

The rack rig runs from `~/positron-rack/`, which is OUTSIDE the checkout. It was
put there by hand on 11 and 12 September 2026 and nothing has deployed to it
since. Meanwhile the repo moved: `box` became `board`, `rack` became `able`, and
`live-agent.mjs` changed its default channel count from 2 to 1 on a measurement.

MEASURED today, before any change: four of the eight deployed source files
differed from `rig/m1/`.

| file | lines differing | what the difference was |
| --- | --- | --- |
| `live-agent.mjs` | 36 | the `box`/`board` and `rack`/`able` renames, and `CH` going from a hardcoded 2 to `--channels` defaulting to 1 with the left-of-pair downmix that makes mono correct |
| `live-check.mjs` | 12 | `rig/pro-instrument/` paths became `rig/m1/`, and the env var `PRO_SSH` became `M1_SSH` |
| `rack-agent.mjs` | 4 | comments only, the same two renames |
| `bin/audiotap.m` | 16 | comments only, two measured notes added |
| `live-osc.mjs` | 0 | identical |
| `midisend.c` | 0 | identical |
| `bin/midisend.c` | 0 | identical |
| `bin/midilisten.c` | 0 | identical |
| `studio.positron.rack-agent.plist` | 0 | identical to the copy in `~/Library/LaunchAgents/` |

The repo was the newer side on all four. That is the good case. The bad case is
the same drift with the install newer, which is unrecoverable without reading a
diff, and nothing here would have told anybody either way.

## 🔴 The drift check this repo already has could not have caught this, by construction

`rig/audit.mjs` has an `m1` entry. It lists three files with reasons, one of
which says in as many words *"copied by hand, not deployed by anything"*. So the
problem was written down. The check still could not see it.

INFERRED from reading `rig/audit.mjs:149-172`: `auditPro()` tests each listed
path with `test -e <path> && echo y` and reports `ok` or `MISSING`. There is no
content comparison anywhere in the file, and no `md5sum`, no `cmp`, no size.

MEASURED today, the three paths it checks:

    ~/positron-rack/live-check.mjs      exists
    ~/positron-rack/rack-agent.mjs      exists
    /tmp/midisend                       exists

So for the whole fortnight the audit's m1 arm would have printed `ok ok ok` over
a rig two renames and one channel-count behind. **An existence check on a
hand-copied file is a check that a hand copy once happened.** It is the same
shape as a green suite with two asserts in it.

Three more things are wrong with that entry, all MEASURED by reading it against
the running system today:

- It says the rig is `PARKED`. The rack has been running under launchd since
  12 September and was pid 775 when this was written.
- It does not list `live-agent.mjs`, which is the file launchd actually executes.
  It lists `rack-agent.mjs`, which is the parked rig's checkup and is not running.
- It does not list `bin/audiotap`, `bin/midisend` or `bin/midilisten`, which are
  the three binaries the play path depends on.
- INFERRED from `rig/audit.mjs`: `sh()` always shells out to `ssh`, with no local
  branch, and `m1.ssh` defaults to `mbp`. `mbp` has no entry in `~/.ssh/config`
  on this machine (MEASURED). So `node rig/audit.mjs m1` run ON m1 reports
  `unreachable`, which the file itself is careful to distinguish from absent, and
  which is still no answer.

## 🔴 The audiotap rebuild question, settled by measurement

The task that produced this plan asked for the binaries to be rebuilt from
source, on the reasonable ground that `audiotap.m` had changed. Rebuilding
`audiotap` was REFUSED, and here is the arithmetic.

`rig/m1/audiotap.m:99-126` carries two warnings, both marked measured:

> THE GRANT IS KEYED TO THE PATH AND THE SIGNATURE. Move the binary and it is a
> new subject. Rebuild it and the ad-hoc signature's cdhash changes, so the
> stored requirement no longer matches and macOS asks again.

> MEASURED, the rebuild caveat is real and not theoretical: a second copy of this
> program was granted, then recompiled and re-signed at the SAME PATH. Its TCC
> row was still there and still said allowed, and the preflight read 2 (never
> asked), because the stored requirement is a 40-byte cdhash and the cdhash had
> moved.

MEASURED today, three builds compared:

| binary | CDHash | `__TEXT,__text` md5 | size |
| --- | --- | --- | --- |
| installed, built 12 Sept | `62307d2e1e9079e749b805f4f2b1a70d4963cb20` | `22fb2b4d2a65b7783cbfd9526aefe445` | 73,216 |
| built today from `rig/m1/audiotap.m` | `71566a7f9deaf5f48c14c64ede3721d8e156f43e` | `22fb2b4d2a65b7783cbfd9526aefe445` | 73,216 |
| built today from the deployed old source | `88a6c859c0887191f5d2e61a1ad999459b4ca19a` | `22fb2b4d2a65b7783cbfd9526aefe445` | 73,216 |

**The executable code is byte-identical in all three.** The 16-line source diff
is entirely comments, so it cannot reach the machine code, and it does not. What
differs is `LC_UUID`, which the linker derives from the input file paths among
other things, and which sits inside the signed region. Three different UUIDs,
three different cdhashes, one instruction stream.

    UUID 90F9096D-6E4E-37F3-A89B-28003D57533F   installed
    UUID FF271E37-024A-35EB-8CA9-1E4B0F9B26D4   built from rig/m1/
    UUID 84590825-0196-3272-8597-F59F9B53ABF9   built from the old copy

So a rebuild of `audiotap` today buys exactly nothing and costs the TCC grant
until somebody is at the keyboard to click Allow. On a rig that is live in room
`m1-1` that is a strict loss, and the rule about not leaving the rig worse
decides it. The source was copied across so the two sides agree on paper; the
granted binary was left alone.

⚠️ **AND THIS IS A TRAP FOR THE NEXT PERSON, NOT A ONE-OFF.** `audiotap.m` is a
file whose comments change often, because it is where the permission lessons get
written down. Every one of those comment edits makes the deployed source differ
from the checkout, which invites a rebuild, which breaks the grant. **A drift
check that compares `audiotap.m` byte for byte will cry wolf and get somebody to
break the tap in response to a comment.** Compare the compiled code, not the
source, for that one file. See the check design below.

`midisend` and `midilisten` need no TCC grant at all, so rebuilding them is
harmless. It was also unnecessary: MEASURED today, both installed binaries'
`__TEXT,__text` sections are byte-identical to a fresh build from the repo
sources, and both sources were already identical on the two sides.

| binary | installed `__text` md5 | fresh build `__text` md5 |
| --- | --- | --- |
| `midisend` | `c9293f4937fed458a1c0afc0d3683b66` | `c9293f4937fed458a1c0afc0d3683b66` |
| `midilisten` | `a71d0dc68fafcf2f60b038bc1b67e4b7` | `a71d0dc68fafcf2f60b038bc1b67e4b7` |

All three binaries in `~/positron-rack/bin/` are provably current against the
checkout. None needed rebuilding and one must not be.

## Part 1. Where the rig should live, and what belongs in git

### Source, and it is already in the right place

These are the rack's source files, and all of them are tracked in `rig/m1/`:

    live-agent.mjs      the agent launchd runs
    live-check.mjs      the "is it set up" check
    live-osc.mjs        the AbletonOSC client live-check imports
    rack-agent.mjs      the parked rig's relay-facing checkup
    audiotap.m          the Core Audio process tap
    midisend.c          notes out over CoreMIDI
    midilisten.c        the wire watcher
    studio.positron.rack-agent.plist    the launchd job
    README.md           the measurements and the two traps

One source file existed ONLY on this disk and in no commit: `bin/taptest.sh`, a
9-line script that runs the tap and holds a chord through `midisend`. MEASURED:
`git ls-files rig/m1/` did not list it and it appears nowhere in the repo. It has
been copied to `rig/m1/taptest.sh` and is untracked in the working tree for the
session to decide on. **A file that lives only inside an untracked install
directory is a file one `rm -rf` from gone**, and that is the second-worst thing
the hand-copy arrangement did. The worst is the drift.

### Build output, which must never be committed, and is not yet ignored

`audiotap`, `midisend` and `midilisten` are compiled, arm64-only, and in
`audiotap`'s case carry a code signature whose identity is machine state. They
belong in no commit.

🔴 **MEASURED: `.gitignore` does not cover them.** `git check-ignore -v` answers
nothing for every plausible in-tree path:

    rig/m1/bin/audiotap      NOT IGNORED
    rig/m1/audiotap          NOT IGNORED
    rig/m1/midisend          NOT IGNORED
    rig/m1/midilisten        NOT IGNORED

MEASURED: no Mach-O binary is tracked anywhere in the repo today, checked by
running `file --mime` over `git ls-files`. That is luck rather than policy. It
holds only because the build has always happened outside the checkout, in
`~/positron-rack/bin/`, and the whole point of the recommendation below is to
move the build INTO the checkout. The moment it moves, an untracked 73 KB
arm64 binary sits in `rig/m1/bin/` with nothing stopping it.

⚠️ There is a second line already: `.claude/hooks/` refuses `git add -A` in this
repo, for the purchased-soundbank reason. A hook is not the first line and
`.gitignore` says so about itself, twice, in comments.

**Do this, and do it before anything builds in-tree:**

```
# compiled rig tools: arm64 Mach-O, and audiotap's signature identity is
# machine state that a clone cannot inherit. Built by rig/m1/build.sh.
rig/m1/bin/
```

An ignored directory rather than three filenames, for the reason `.gitignore`
already gives itself about `tmp/`: a filename rule rots the moment the next tool
arrives under a different name.

### The canonical copy, named

`~/positron-rack/bin/` currently holds BOTH the three binaries and copies of
`audiotap.m`, `midisend.c` and `midilisten.c`, and `~/positron-rack/` holds a
third copy of `midisend.c` at its root. MEASURED: all copies of `midisend.c` are
byte-identical (md5 `b6aa018dc8128fe9bbadaa6f48fad22c`), all copies of
`midilisten.c` are identical (`a0310779db261fe648f683316bf0a982`), and
`audiotap.m` was the one that had drifted.

🔴 **`rig/m1/` IS CANONICAL. THE COPIES IN `~/positron-rack/` AND IN
`~/positron-rack/bin/` ARE BUILD INPUTS AND NOTHING ELSE.** They exist so a
rebuild can happen on a machine with no checkout, which is a case that has never
arisen and would be answered by cloning. They are three chances to edit the
wrong file, and the board rig has already paid for exactly this: the
`positron-hardware` skill records that `~/positron/` on the Pi is stale, has no
`pappus.mjs`, and that editing it tells you nothing about what is running.
**Two copies of a source file is one copy and one decoy.**

### Machine state, which cannot live in the repo at all

Four things, and none of them are files a clone can carry:

1. **The TCC grant.** `kTCCServiceAudioCapture` against the absolute path
   `/Users/kristjanjansen/positron-rack/bin/audiotap` plus a 40-byte cdhash.
   Path-keyed and signature-keyed, so it does not survive a move OR a rebuild.
   It is granted by a human clicking Allow, once, in a GUI session.
   ⚠️ **This is the single reason the install location is hard to change.** Any
   new path is a new subject and needs a fresh click.
2. **The launchd bootstrap.** `~/Library/LaunchAgents/studio.positron.rack-agent.plist`
   plus `launchctl bootstrap gui/$(id -u) ...`. MEASURED: the installed plist is
   byte-identical to `rig/m1/studio.positron.rack-agent.plist`, so the FILE is in
   the repo and only the bootstrap is state.
3. **The installed location itself**, which the plist hardcodes three times:
   `ProgramArguments` names `/Users/kristjanjansen/positron-rack/live-agent.mjs`,
   `WorkingDirectory` is `/Users/kristjanjansen/positron-rack`, and the
   interpreter is the absolute `/opt/homebrew/bin/node`. MEASURED: that symlink
   resolves to node v24.20.0. The absolute node path is deliberate and the plist
   says why in a comment: launchd starts with a minimal PATH and `node` is not on
   it.
4. **The room name**, `m1-1`, passed as `--room m1-1` in the plist. See Part 3.

Also machine state, and listed in `rig/audit.mjs` as `by hand` already: Live
itself, AbletonOSC selected as a Control Surface, the Stage-73 licence,
BlackHole, the Multi-Output Device, IAC Driver Bus 1, and Live's audio output
device. Four of those are Preferences clicks with no API and they are why the
older rig is parked.

### 🔴 The recommendation: keep `~/positron-rack`, and deploy to it with a script

The tempting answer is to run the rig straight out of `~/projects/positron/rig/m1/`
and delete the drift problem at the root. **Do not.** Three reasons, in order of
weight.

**1. A checkout is a mutable directory under a live instrument.** `git pull`,
`git checkout <branch>`, `git stash`, a rebase, and every agent that writes a
file in this repo all change the bytes under a running agent. launchd's
`KeepAlive` is `true`, so the next crash or restart picks up whatever is there,
including a half-applied merge or another branch's code. The rig is live in room
`m1-1`, which means a browser at <https://positron.studio/able/> is pointed at
it. This repo already knows this shape from the other direction: the board's
service runs from `/opt/positron-board` and the skill's rule about it exists
because the checkout copy is not the thing running.

**2. The TCC grant is path-keyed, so the move costs a click and the move back
costs another.** MEASURED above: the grant names an absolute path. Moving the
build to `rig/m1/bin/audiotap` makes a new subject that has never been granted,
so the tap comes back refused and emits nothing, and by the file's own warning a
refused tap is the failure that reports as success from every layer above. That
click has to happen with somebody at the keyboard. It is a one-off cost and it is
a real one.

**3. It puts the build output inside the repo, where `.gitignore` does not cover
it.** Fixable in one line, as above, and it is one more thing that has to be
right.

The argument FOR running from the checkout is that it makes drift impossible, and
that argument is answered more cheaply: **drift is not impossible, it is
undetected.** A 12-line deploy script and a check that reports a version removes
the problem this plan exists about, without putting a git working tree under a
live performance instrument.

So:

- **`~/positron-rack/` stays the install location.** The plist keeps its absolute
  paths. The TCC grant keeps its subject. Nothing needs a click.
- **`rig/m1/push.sh` deploys to it**, modelled on `rig/board/push.sh`, which
  already exists and already prints the md5 of what landed *"because 'it
  deployed' and 'it says it deployed' have been different things here before"*.
  It copies the sources, rebuilds `midisend` and `midilisten`, and refuses to
  rebuild `audiotap` unless asked with an explicit flag, printing the grant
  warning when it declines.
- **`rig/m1/build.sh` holds the three compile lines**, which today live only in
  the source headers as comments. A comment is not a build.
- **The `codesign` line goes in `build.sh` next to the `clang` line**, because
  `audiotap.m` says in capitals that skipping it means silence, and a build step
  in a comment is a build step somebody will skip.

⚖️ **UNSETTLED, and it is the one thing that would change this recommendation:**
whether a Developer ID signature would make the grant survive a rebuild.
`audiotap.m` says it would (*"A real Developer ID would survive rebuilds; ad-hoc
does not"*), marked as a claim rather than a measurement, and there is no
Developer ID on this machine to test it with. If one is ever available, the
cost-benefit flips: a rebuild becomes free, running from the checkout becomes
cheap, and this section is worth rewriting. Until then it stands.

## Part 2. m1 and m2 on one remote

### What each machine is

MEASURED on m1 today: `hw.model` is `MacBookPro18,3`, the CPU is an Apple M1 Pro,
`hostname -s` is `MacBookPro`. `rig/audit.mjs:86` records the same figures and
also records that m2 is an Apple M2 Pro, and says why the naming matters:

> ⚠️ `m1`, NOT `pro`. BOTH Macs here are "Pro". "the Pro" named neither of them
> unambiguously and was used for both.

⚠️ **Everything below about m2 is INFERENCE.** m2 was not reachable from this
session and nothing on it was measured. `mbp` has no `~/.ssh/config` entry here
(MEASURED), so there is not even a name to reach it by. What m2 has installed,
which node it runs, whether it has Live, and whether it has a checkout at all are
all unknown. The design is built to be correct when those answers are no.

### How rig code stays in step, without hand copying

The mechanism is the same one the board already uses, which is the argument for
it: one checkout per machine, a deploy script that is the only way code reaches
an install, and an audit that compares content rather than existence.

    git clone / git pull           the checkout is the only editing surface
    rig/m1/build.sh                compiles into rig/m1/bin/, ignored by git
    rig/m1/push.sh                 copies sources + binaries to ~/positron-rack,
                                   prints md5 of what landed, kickstarts launchd
    rig/m1/install.sh              first run only: plist, bootstrap, first build,
                                   and the one Allow click

**The install step on a fresh Mac**, in order, with the manual parts marked:

1. `git clone https://github.com/kristjanjansen/positron.git ~/projects/positron`
2. `brew install node` and check `node -e 'typeof WebSocket'` answers `function`.
   MEASURED on m1: v24.20.0. The agent uses the built-in WebSocket and no npm
   dependency, the same choice `rig/board/board.mjs` made. The board's `setup.sh`
   already refuses a node below 22 for this exact reason, and the m1 installer
   should do the same check.
3. `cd ~/projects/positron/rig/m1 && ROOM=<name> ./install.sh`
   which builds, copies to `~/positron-rack`, writes the plist with the room and
   the absolute node path resolved from `command -v node`, and bootstraps it.
4. 🔴 **BY HAND, ONCE:** run `~/positron-rack/bin/audiotap Live` from a terminal
   and click Allow. Nothing can automate a TCC prompt. The installer should print
   this as the last line and say it is not optional.
5. **BY HAND, and only on a machine that is meant to play Live:** Live itself,
   AbletonOSC as a Control Surface, IAC Driver Bus 1, an armed track with an
   instrument. `rig/audit.mjs`'s `manual` list is already the checklist.

⚠️ **The plist must be generated, not copied, and that is a change from today.**
It currently hardcodes `/Users/kristjanjansen/`, `/opt/homebrew/bin/node` and
`--room m1-1`. On m2 the username may differ, the Homebrew prefix differs between
Apple Silicon and Intel (`/opt/homebrew` against `/usr/local`), and the room MUST
differ. `install.sh` should write the plist from a template with `$HOME`,
`$(command -v node)` and `$ROOM` substituted, and the template stays in
`rig/m1/`. INFERRED, not measured: nothing was run on m2 to confirm its Homebrew
prefix.

### What is m1-only and must be guarded

The failure to avoid is a checkout on m2 running a check that cannot pass there
and reporting a broken rig. This repo has the rule already, in `rig/audit.mjs`:
an unreadable thing is reported as *"we did not check"*, never as absent. Applied
to m2:

| m1-only | what m2 must do instead |
| --- | --- |
| **the Core Audio process tap** (`audiotap`) | it compiles on any Mac, but its grant does not transfer and there is nothing to tap. A check on m2 reports `n/a on this machine` |
| **CoreMIDI and IAC Driver Bus 1** | compiles anywhere, but IAC has to be enabled in Audio MIDI Setup and Live has to listen. `n/a` unless the machine declares itself a rig |
| **Ableton Live, AbletonOSC, the Stage-73** | licensed software and Preferences clicks. Already `by hand` in `audit.mjs`. On m2 these are `n/a`, not `MISSING` |
| **the launchd agent** | must not be bootstrapped on m2 at all unless m2 is deliberately made a second rig, which needs its own room. `install.sh` refuses without `ROOM` |
| **the compiled binaries** | arm64 Mach-O, so they will not run on an Intel Mac. They are build output, not artefacts, and each machine builds its own. This is a second reason they must be `.gitignore`d rather than committed |

**The guard should be one declared fact, not a hostname test.** A file at
`~/positron-rack/.rig` written by `install.sh`, carrying the room name and the
install date, makes "is this machine a rig" a question with an answer instead of
a guess. A hostname test breaks the day somebody renames a Mac, and both of these
are called `MacBookPro`-something. INFERRED: this file does not exist today and
nothing reads it.

### 🔴 The room name, and why a fixed one is right here and wrong on `/stage/`

m1's plist hardcodes `--room m1-1`, and `live-agent.mjs:26` defaults to the same.
**That is correct and it must not be changed.** `demo/verify.mjs:624` already
says why, and the distinction it draws is the whole answer:

> ⚠️ TWO ROOMS ARE NOT LIKE THAT AND MUST NOT BE OVERRIDDEN. `room: 'fixed'` in
> the manifest means the name is not a rendezvous this page invented, it is the
> ADDRESS OF A MACHINE. `studio-1` is where the Raspberry Pi is and `m1-1` is
> where the studio Mac's agent is. Renaming those does not isolate a run, it
> points it at nothing.

MEASURED: `demo/manifest.mjs` carries `room: 'fixed'` on five rows, `able` among
them, and `demo/able/index.html:23` reads `q.get('room') || 'm1-1'`. So the
harness does not randomise `able`'s room, deliberately.

**`/stage/`'s `stage-demo` is the opposite case and `HANDOFF.md:87` records it as
an open bug:**

> The room is a FIXED name, `stage-demo`, so every harness run and every probe
> this session joined the same room a visitor joins. `demo/verify.mjs` gives
> every other page its own room per run and this page's default is shared with
> the public.

The two look identical and are not. `m1-1` is an ADDRESS: one machine answers
there, and a second client joining it gets the same instrument, which is a
turn-taking problem and not an isolation one. `stage-demo` is a RENDEZVOUS the
page invented: nothing lives there, everybody who arrives is a peer, and a
harness run and a visitor in the same one see each other's traffic. **An address
should be fixed. A rendezvous must never be.**

**So m2 gets `m2-1`, and it gets it by being told, never by defaulting.**

🔴 **AND THE INSTALLER MUST REFUSE TO GUESS, BECAUSE THE BOARD ALREADY PAID FOR
THIS.** `rig/board/setup.sh:27-38`, verbatim:

> 🔴 NO DEFAULT ROOM, AND THIS USED TO READ `${ROOM:-studio-1}`. That default
> pointed EVERY board anybody installed at OUR room. The relay has no
> authentication, no routing and no sender identity, so the room name is the only
> isolation this stack has: two boards in one room flap `boardFrom` twice a beat
> and interleave two `aseq` counters into a single playout ring. An installer
> whose default is somebody else's studio is a footgun with a friendly face, so
> this now REFUSES rather than guesses.

That paragraph is about a Raspberry Pi and every clause of it is true of a second
Mac. **This is the CLAUDE.md rule about one shared resource with everything
around it partitioned, arriving for the third time.** The relay is shared, it has
no sender identity, and the room name is the only partition. On FCM the
unpartitioned thing was `env.FCM_TOPIC` and every suite run notified every real
subscriber for a day. On the board it was the default room. Here it would be two
`live-agent` processes in `m1-1`.

INFERRED from reading `live-agent.mjs`, not measured, because running a second
agent into the live room to watch it break is not a test worth its cost: two
agents in `m1-1` both receive every note and both hand it to their own Live, so a
press plays twice. Both then stream PCM into the same room, interleaved, each
announcing its own `audioChannels`, and the page's `samples / channels / rate`
check will disagree with one of the two senders on alternate frames. That is
exactly the flip-flop the README records from the day an agent announced 1 while
sending 2, except with no bug to fix, because both senders are telling the truth
about themselves.

There is also a hard ceiling. `LESSONS #56`, quoted in `demo/verify.mjs`: nine
orphaned Chromes filled `studio-1` and took a live demo down, and the relay
allows 16 to a room and does not say no, it just drops. Two agents restarting
under `KeepAlive` in one room is a way to spend that budget with nobody watching.

**`m1-1` stays hardcoded in m1's plist. It is an address, and addresses are
written down.** What changes is that the INSTALLER stops being able to produce a
second machine carrying it.

### Git hygiene for two machines on one remote

MEASURED: `origin` is `https://github.com/kristjanjansen/positron.git`, the branch
is `main`, HEAD is `61ad3b6`.

**The push dance.** CLAUDE.md documents it: `git push` answers
`Repository not found`, which is a 404 wearing an auth failure, because
`Kristjan-Jansen_enefit` is the active `gh` account and `kristjanjansen` owns the
repo. On two machines that is two independent keychains and two independent
active accounts, so the dance has to be learned twice and forgotten twice.

⚠️ **MEASURED today and worth a line: `gh auth status` on m1 currently reports
`Logged in to github.com as kristjanjansen`.** CLAUDE.md says the active account
must be switched back to `Kristjan-Jansen_enefit` after a push, quoting
*"ASKED FOR 2026-09-17"*, and it is not switched back right now. Nothing was
changed about it here, because the active account is machine-wide and changing it
was not asked for. It is reported rather than fixed.

**The thing that actually removes the dance is an SSH key**, and CLAUDE.md already
names it as the only thing that would: `ssh -T git@github.com` answers
`Permission denied (publickey)`, so there is no key on the personal account, and
the keychain shortcut was tried and does not work because the helper on PATH and
the one git resolves out of Xcode's gitconfig are different binaries. **With two
machines the dance is paid twice per session, so the key is worth roughly twice
what it was.** Recommendation: generate a key per machine, add both to the
personal account, and switch `origin` to `git@github.com:`. It is unrelated to
the rig and it is the highest-value git item on this list.

**Two machines both pushing to `main`.** The ordinary answer applies and needs no
policy: pull with rebase, push, and whoever is second rebases. Set
`git config pull.rebase true` on both so a pull cannot produce a merge commit
nobody asked for.

🔴 **EXCEPT FOR THE BUILD OUTPUT, WHICH IS A CONFLICT FACTORY AND IS COMMITTED ON
PURPOSE.** MEASURED: `git ls-files workers/view/public | wc -l` is **396 files**,
and `workers/view/build.mjs:3` says `public/` is *"the deploy artefact
(committed)"* with a comment at line 51 explaining that it is committed
deliberately so `git log --oneline -- workers/view/public` is a record of what
was deployed. MEASURED: session 49 alone produced **eight commits whose message
is exactly `session 49: the build output`**. One of them, `9bafbfb`, touches
`workers/view/public/shell/shell.mjs` and `workers/view/public/stage/index.html`.

With one machine that is noise. With two it is the worst kind of merge conflict:
a generated tree where both sides are correct, git cannot tell which generation
is newer, and the resolution is not to merge but to regenerate. Eight commits in
one session means eight chances a day for the two machines to collide on 396
generated files.

**Two options, and the first is the recommendation.**

- **Recommended: leave `public/` committed, and make regeneration the resolution.**
  Add a line to `rig/` and to CLAUDE.md's build stanza: a conflict anywhere under
  `workers/view/public/` is resolved with `git checkout --ours` on nothing, and
  instead with `node build.mjs` on the merged source followed by a fresh commit.
  Never by hand-editing a generated file. This keeps the deploy record that
  `build.mjs` argues for and costs one documented recipe.
- **Rejected: stop committing `public/`.** It would end the conflicts outright,
  and it would throw away the answer to *"what is actually on the edge right
  now"*, which is a question this project has needed and which `build.mjs`
  defends in a comment. Not worth it. ⚖️ If the conflicts turn out to cost more
  than the record is worth once two machines are really both building, this is
  the thing to revisit, and the evidence to collect first is how often a session
  on one machine touches `public/` at all.

⚠️ **AND AGENTS STILL DO NOT COMMIT.** CLAUDE.md's rule is unchanged and two
machines make it more important, not less: a `git add -A` on m2 now sweeps m1's
work as well, once it has been pulled.

## Part 3. The drift check, recommended and specified

**Yes, this needs a check, and it is cheap.** The whole argument of this plan is
that the drift was written down in `rig/audit.mjs` as a comment and was invisible
to the code in the same file. A comment saying *"copied by hand, not deployed by
anything"* is a warning; `test -e` is not a check.

The home is `rig/audit.mjs`, because it already knows the machine, the install
location and the reasons, and because a second tool would be a second thing to
remember. INFERRED from reading it: the change is contained to the `m1` entry and
`auditPro()`, and needs a local branch in `sh()` so it can run ON m1.

**What it should report, in this order:**

1. **A version.** One line, printable, comparable: the short sha the install was
   deployed from, written by `push.sh` into `~/positron-rack/.rig` at deploy time
   along with the room and the date. The question *"is the running rig current"*
   then has a one-token answer instead of a diff. INFERRED: no such file exists
   today.
2. **Content, per file, by md5**, against `rig/m1/`. Not `test -e`. This is the
   line that would have caught all four drifted files on any day in the
   fortnight.
3. 🔴 **For `audiotap`, compare the COMPILED CODE, NOT THE SOURCE.** MEASURED
   above: the source diff was comments only and the machine code was identical,
   so a source-md5 check would have reported drift on `audiotap.m` and the
   obvious response to that report is a rebuild, which breaks the TCC grant for
   no gain. Compare `otool -s __TEXT __text <binary> | tail -n +3 | md5` between
   the installed binary and a build from the checkout, which is what settled the
   question today. If they match, print `code current, signature untouched` and
   say nothing about the source. If they differ, print the rebuild-and-click cost
   explicitly next to the finding.
4. **The launchd job and the room**, from `launchctl print`, so the audit reports
   which room the running process is actually in rather than which room a file
   says. MEASURED: today's `launchctl print` gives `state = running`, the pid, and
   the full `ProgramArguments` including `--room m1-1`.
5. **The TCC grant, from the log.** `/tmp/rack-agent.log` carries
   `tap: permission to record system audio: allowed` on every restart, which is
   `audiotap`'s own preflight result and is the only honest source for it. The
   audit should read the most recent one and print it with its timestamp.
6. **`audiotap exited (1)` must be reported as Live being closed, not as a
   fault.** MEASURED today by running the binary by hand: it prints
   `nothing making sound matches "Live"` and lists the processes that are making
   sound. A check that calls this red will be ignored within a week, because Live
   is closed most of the time.
7. **On a machine that is not a rig, every one of these is `n/a`, never
   `MISSING`.** Keyed off `~/positron-rack/.rig` existing, not off the hostname.

**What NOT to build.** No watcher, no hook, no CI step, no scheduled job. This
is a thing you run when you are about to touch the rig, in the same breath as
`live-check.mjs`, and `rig/audit.mjs` already exists to be run that way. A drift
check that runs unattended is a drift check that emails somebody about a comment
edit in `audiotap.m`.

## What was measured today, in one list

- The four drifted files and their line counts, by `diff -u` on all eight
  deployed sources against `rig/m1/`.
- `audiotap`: three builds, three cdhashes, three `LC_UUID`s, one identical
  `__TEXT,__text` md5 `22fb2b4d2a65b7783cbfd9526aefe445` at 73,216 bytes.
- `midisend` and `midilisten`: installed `__text` identical to a fresh build.
- `.gitignore` covers none of the three binaries, by `git check-ignore -v`.
- No Mach-O binary is tracked in the repo, by `file --mime` over `git ls-files`.
- `bin/taptest.sh` exists in the install and in no commit.
- `rig/audit.mjs` checks the m1 files with `test -e` only; all three paths exist,
  so it would have read `ok` throughout the drift.
- The plist installed at `~/Library/LaunchAgents/` is byte-identical to the repo's.
- `hw.model` `MacBookPro18,3`, Apple M1 Pro, node v24.20.0 at
  `/opt/homebrew/bin/node`.
- `gh auth status` is on `kristjanjansen`, not switched back.
- `git ls-files workers/view/public` is 396 files; session 49 made eight
  `the build output` commits.
- `live-check.mjs` reads 3/6 both before and after the refresh, the three
  failures all being Live not running.

## What is inference and was not measured

- **Everything about m2.** It was not reachable, nothing on it was run, and its
  Homebrew prefix, node version and Live installation are all unknown. The design
  is written to be correct when the answers are no.
- **What two `live-agent` processes in one room actually do.** Read from
  `live-agent.mjs` and from the README's account of the announce/check mismatch.
  Not run, because the test costs a live room.
- **That `rig/audit.mjs` reports `unreachable` for m1 when run on m1.** Read from
  the code path, which has no local branch, plus the measured absence of an
  `~/.ssh/config` entry for `mbp`. The command was not run, because pointing it
  at the board means ssh to a Pi in another building.
- **That a Developer ID signature would survive a rebuild.** Claimed in
  `audiotap.m`, unmeasured there and unmeasurable here. It is the one fact that
  would change the install-location recommendation.

## The order to do it in

1. `.gitignore`: add `rig/m1/bin/`. One line, no risk, and it has to land before
   anything builds in the checkout.
2. Commit `rig/m1/taptest.sh`, which is in the working tree now and exists in no
   commit.
3. `rig/m1/build.sh`: the three compile lines out of the source headers, with the
   `codesign` line beside the `clang` line, and `audiotap` behind an explicit
   flag with the grant warning printed when it declines.
4. `rig/m1/push.sh`: deploy to `~/positron-rack`, print md5 of what landed, write
   `~/positron-rack/.rig` with the sha and the room, `launchctl kickstart -k`.
   Model it on `rig/board/push.sh`.
5. `rig/audit.mjs`: fix the m1 entry (it is not parked, it is missing
   `live-agent.mjs` and the three binaries), add the local branch, and move from
   `test -e` to md5 with the `audiotap` exception at point 3 of Part 3.
6. `rig/m1/install.sh` and the plist template, with `ROOM` required and no
   default, copying `rig/board/setup.sh`'s refusal verbatim in spirit.
7. The SSH key on the personal GitHub account, which is not a rig task and is the
   single biggest saving on a two-machine day.
8. `pull.rebase true` on both machines, and the `workers/view/public/` conflict
   recipe written into CLAUDE.md's build stanza.

Items 1 to 3 are worth doing whatever else is decided. Item 5 is the one that
answers the question this plan was written about.

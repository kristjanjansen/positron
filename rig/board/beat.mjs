// rig/board/beat.mjs: what the board says about itself, `board.hello` when it
// joins and `board.alive` every five seconds, as two pure functions.
//
// They lived inline in `board.mjs` until 2026-10-04, where nothing could reach
// them: that file dials the relay the moment it is imported. They moved here
// when both messages started carrying `graph` (plans/plan-universal-routing.md
// §11 step 3), because a field that a page draws the desk from is a field a
// test has to be able to read, and `test.mjs` imports this file.
//
// ⚠️ THE FACTS ARE PASSED IN, NEVER LOOKED UP. Everything the board has to ask
// the machine for (`aconnect -l`, `which yoshimi`, whether `/dev/video11`
// exists) is asked in `board.mjs` and handed over, so this file runs the same
// on a laptop and on the Pi.
//
// 🔴 `graph-registry.mjs` IS IMPORTED HERE, AND `push.sh` SHIPS IT FROM HERE.
// Its grep reads every `rig/board/*.mjs` for an import that climbs two levels,
// so a direct import from any file in this directory is enough. An import that
// went through another `demo/shell/` file would not be followed, which is why
// that file itself imports nothing.
// ⚠️ THE GREP READS COMMENTS TOO. A comment here quoting the import pattern
// with a placeholder path was matched as an import and handed to `tar` as a
// file to ship, 2026-10-04, caught before any push. Never write that pattern
// in a comment in this directory.

import { boardGraph } from '../../demo/shell/graph-registry.mjs';

/**
 * The board as a graph, from what the board knows.
 * @param {object} f
 * @param {string} f.room
 * @param {string} [f.net]          `BOARD_NET`, left out when unset
 * @param {object} f.instruments    the map `board.hello` sends: name -> available
 * @param {Map|Array} f.inputs      `parseInputs(...).inputs`, a Map, or its values
 * @param {Array} f.ports           `addressable()` rows, `state().ports`
 * @param {number} f.frameMs
 * @param {boolean} f.gpu           `videoAvailable()`
 */
export function graphOf(f) {
  const inputs = f.inputs instanceof Map ? [...f.inputs.values()] : (f.inputs || []);
  return boardGraph({
    room: f.room, net: f.net || null, instruments: f.instruments || {},
    // Only what the graph reads. `device` is an ALSA name on the board and
    // means nothing to a page, so it does not ride on every beat.
    inputs: inputs.map((i) => ({ name: i.name, channels: i.channels, midi: i.midi ?? null })),
    alsa: f.ports || [], frameMs: f.frameMs, gpu: f.gpu !== false,
  });
}

/**
 * `f.graphFacts` is what `graphOf` takes, and the hello is where the board
 * gathers it: the same object rides on every beat after it.
 * ⚠️ `audioChannels` is NOT a count of MIDI channels, which is 16 and
 * multitimbral. The board captures `arecord -c 1`, so it says
 * ONE, and `demo/able`'s Mac says two: both counts are on the relay at once
 * and no page is left inferring which it is holding.
 */
export function helloMsg(f) {
  return { type: 'board.hello', name: f.name, id: f.id, backend: f.backend, ports: f.ports.length, dry: f.dry,
           since: f.since, audioChannels: 1, frameMs: f.frameMs, instruments: f.instruments,
           ...(f.error ? { error: f.error, hint: f.hint } : {}),
           graph: graphOf(f.graphFacts) };
}

/**
 * ⚠️ ONE SHAPE, ONE PLACE. `board.mjs` sends this from the heartbeat and from
 * `sweepInsert()`, so two copies of this object is how a field ends up on one
 * of them. `insert` is `insertState()`, spread so the fields stay top level
 * where every page already reads them.
 * ⚠️ `graph` IS LEFT OUT UNTIL THE FIRST HELLO, because the facts it is built from
 * are gathered there. A beat before the socket opens is not sent anyway.
 */
export function aliveMsg(f) {
  return { type: 'board.alive', name: f.name, id: f.id, upSec: f.upSec,
           audio: f.audio, voices: f.voices, frames: f.frames, ...f.insert,
           ...(f.graphFacts ? { graph: graphOf(f.graphFacts) } : {}) };
}

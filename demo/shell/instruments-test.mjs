// demo/shell/instruments-test.mjs: the desk's taxonomy, with no browser.
// `node demo/shell/instruments-test.mjs`. Asserts name the exact maker; negative controls fail a
// specific wrong implementation, since a lookup table passes a naive test by accident.
// why: lessons/kit-instruments.md#test-header
import { DESK, KINDS, describe, alias, normalise, sounds, resolve, tokenise, reword } from './instruments.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? `  (${detail})` : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `  (${detail})` : ''}`); }
};

// 1. The name that started it. `MK-425C USB MIDI Keyboard` had no Evolution in
//    it anywhere, which is why a model told to connect `evolution` found nothing.
{
  const d = describe('MK-425C USB MIDI Keyboard');
  ok('the keyboard answers to its maker, which its port name never contained',
    d.maker === 'Evolution' && d.full === 'Evolution MK-425C'
    && d.words.some((w) => w.toLowerCase() === 'evolution'),
    d.full);
}

// 2. Every kind is one of the published list, or the list is decoration.
ok('every entry on the desk has a kind and it is one of KINDS',
  DESK.every((e) => KINDS.includes(e.kind)),
  DESK.map((e) => e.kind).join(', '));

// 3. Each of the four named kinds is actually on the desk.
// why: lessons/kit-instruments.md#t3-kinds
{
  const reachable = new Set(DESK.flatMap((e) => [e.kind, ...(e.also || [])]));
  const want = ['keyboard', 'drum machine', 'mixer', 'soundcard'];
  const missing = want.filter((w) => !reachable.has(w));
  ok('the four kinds asked for are each reachable by name',
    missing.length === 0, missing.length ? `missing ${missing.join(', ')}` : want.join(', '));
}

// 4. The direction word comes off, which is what joins two halves of one cable.
ok('a trailing direction word is not part of an instrument name',
  describe('Model 12 MIDI IN').full === describe('Model 12 MIDI OUT').full,
  describe('Model 12 MIDI IN').full);

// 5. NEGATIVE CONTROL. A name nothing recognises gets NO invented brand. A
//    table that guessed would give this one a maker.
{
  const d = describe('Some Unknown Box');
  ok('NEGATIVE CONTROL: an unrecognised name gets no maker, no kind and no invention',
    d.known === false && d.maker === null && d.kind === null && d.full === 'Some Unknown Box',
    `${d.full}, maker ${d.maker}`);
}

// 6. NEGATIVE CONTROL. The empty and absent cases do not throw and do not
//    invent. A page asks about a port before it knows anything about it.
ok('NEGATIVE CONTROL: nothing, an empty string and a number all answer without throwing',
  ['', null, undefined, 42].every((v) => {
    const d = describe(v);
    return d.known === false && typeof d.label === 'string' && d.label.length > 0;
  }),
  `unnamed reads "${describe('').label}"`);

// 7. The loopback is the one thing nobody plays, and it is a BEHAVIOUR flag
//    rather than a label. `/bay/` links instruments by having them played, and
//    a loopback returns everything sent to it.
ok('the virtual bus is the only entry nobody plays',
  describe('IAC Driver Bus 1').plays === false
  && DESK.filter((e) => e.plays === false).length === 1
  && describe('Circuit').plays === true,
  `${DESK.filter((e) => e.plays === false).map((e) => e.model).join(', ')} is not played`);

// 8. NEGATIVE CONTROL. The Circuit and the Circuit Tracks are DIFFERENT
//    instruments and must not collide. Their patch headers differ at one byte,
//    so a table answering `Circuit` for both would hand somebody the wrong one.
{
  const c = describe('Circuit'), t = describe('Circuit Tracks');
  ok('NEGATIVE CONTROL: Circuit and Circuit Tracks are told apart',
    c.model === 'Circuit' && t.model === 'Circuit Tracks' && c.full !== t.full,
    `${c.full} against ${t.full}`);
}

// 8b. NEGATIVE CONTROL: the Model 12's two port pairs must not share a name; order matters.
// why: lessons/kit-instruments.md#t8b
{
  const midi = describe('Model 12 MIDI IN');
  const daw = describe('Model 12 DAW Control IN');
  ok('NEGATIVE CONTROL: the Model 12 and its DAW control surface are two rows, not one name twice',
    midi.full !== daw.full && midi.maker === 'TASCAM' && daw.maker === 'TASCAM'
    && /daw/i.test(daw.full) && !/daw/i.test(midi.full),
    `${midi.full} against ${daw.full}`);
}

// 9. The alias line is what a model reads, and it must not repeat the full name
//    it sits beside, or the prompt says one thing twice.
{
  const line = alias('MK-425C USB MIDI Keyboard');
  ok('the alias line offers other words and never repeats the full name',
    line.startsWith('also called:') && !line.includes('Evolution MK-425C')
    && line.includes('Evolution') && line.includes('keyboard'),
    line);
}

// 10. NEGATIVE CONTROL. An unknown port contributes no alias line at all,
//     rather than a line saying nothing, which would be furniture in a prompt.
ok('NEGATIVE CONTROL: an unrecognised port adds no alias line',
  alias('Some Unknown Box') === '' && alias('') === '',
  'both empty');

// 11. Every word is a string somebody could type, and the raw name is among
//     them, because a reader may type what they see on the row.
{
  const d = describe('MK-425C USB MIDI Keyboard');
  ok('the words include the raw port name, because a reader types what is on the row',
    d.words.includes('MK-425C USB MIDI Keyboard')
    && d.words.every((w) => typeof w === 'string' && w.length > 0),
    `${d.words.length} words`);
}

// 12. No duplicates, or a prompt lists the same word twice and a picker shows it.
{
  const d = describe('Circuit');
  ok('the words are deduplicated',
    new Set(d.words.map((w) => w.toLowerCase())).size === d.words.length,
    d.words.join(' | '));
}

// 13. Nothing the desk says carries an em dash or a middot, which is a rule
//     about everything a reader looks at and these strings reach a page.
{
  const all = DESK.flatMap((e) => [e.maker, e.model, e.kind, e.note, ...(e.also || [])]).join(' ');
  ok('nothing in the taxonomy carries an em dash or a middot',
    !all.includes('—') && !all.includes('·'), `${all.length} characters`);
}

// 14. A note is one sentence. It reaches a hover and a prompt, and the standing
//     rule for a note is two sentences at most with about forty words.
ok('every note is one short sentence',
  DESK.every((e) => !e.note || (e.note.split(/\s+/).length <= 20 && !/\.\s/.test(e.note))),
  DESK.map((e) => e.note.split(/\s+/).length).join(', ') + ' words');

// Hearing a name wrong. Every negative control below is a real false match from the first build;
// the asserts that matter are the ones about silence.
// why: lessons/kit-instruments.md#t-hearing

// 16. Spoken digits become a model number, which is what a person says out loud.
ok('a spoken model number normalises to digits',
  normalise('mk four twenty five c') === 'mk 425 c'
  && normalise('Model  12!') === 'model 12',
  `"${normalise('mk four twenty five c')}"`);

// 17. The sound key brings together what a microphone confuses, and it is the
//     two-tokens-into-one case that a token by token comparison cannot reach.
ok('tascam and task am reduce to the same sound',
  sounds('tascam') === sounds('task am') && sounds('tascam').length >= 4,
  `${sounds('tascam')} for both`);

// 18. The cases this was asked for.
{
  const a = resolve('connect evolution to circuit').map((h) => h.full);
  const b = resolve('connect the task am to the circus').map((h) => h.full);
  ok('a sentence naming the instruments properly resolves both, exactly',
    a.includes('Evolution MK-425C') && a.includes('Novation Circuit')
    && resolve('connect evolution to circuit').every((h) => h.how === 'exact'),
    a.join(', '));
  ok('and a mis-heard sentence still resolves them, by sound',
    b.includes('Novation Circuit') && b.some((f) => f.startsWith('TASCAM')),
    b.join(', '));
}

// 19. NEGATIVE CONTROL. An instruction that names no instrument resolves to
//     NOTHING. Three sentences, all of them things somebody would really say.
{
  const quiet = ['can you make it a bit louder please',
    'put the mod wheel on the master filter',
    'connect it to the thing and then route it'];
  const noisy = quiet.filter((q) => resolve(q).length);
  ok('NEGATIVE CONTROL: an instruction naming no instrument resolves to nothing',
    noisy.length === 0,
    noisy.length ? `matched in: ${noisy.join(' | ')}` : `${quiet.length} sentences, all silent`);
}

// 20. NEGATIVE CONTROL: `connect` is one edit from `circuit`; only the stop list separates them.
// why: lessons/kit-instruments.md#t20
ok('NEGATIVE CONTROL: the verb "connect" never resolves to the Circuit',
  !resolve('connect').length && !resolve('connect connect').length
  && resolve('circuit').some((h) => h.full === 'Novation Circuit'),
  'the verb is silent and the noun is not');

// 21. NEGATIVE CONTROL. The instrument that is not plugged in is never offered,
//     however many aliases it shares with one that is.
ok('NEGATIVE CONTROL: an instrument that is not on the desk is never resolved',
  DESK.some((e) => e.present === false)
  && !resolve('connect the novation drum machine').some((h) => /Tracks/.test(h.full)),
  resolve('connect the novation drum machine').map((h) => h.full).join(', ') || 'nothing');

// 22. An exact hit always beats a sound-alike for the same instrument, or a
//     sentence that named a thing properly could be "corrected" to something
//     else, which is the worst thing this could do.
{
  const h = resolve('circuit').find((x) => x.full === 'Novation Circuit');
  ok('an exact hit wins, so a properly named instrument is never re-interpreted',
    h && h.how === 'exact' && h.cost === 0, h ? `${h.how} ${h.cost}` : 'no hit');
}

// What real speech models said: 48 instructions in six `say` voices through three Whisper models,
// 144 transcripts quoted exactly. Kept: rows where the name arrived broken and rows naming nothing.
// why: lessons/kit-instruments.md#t-heard

/** [transcript as returned, models that returned it, what must be found] */
const HEARD = [
  // the name arrived broken and was recovered
  ['Send the Novation to the taskam.', 'whisper', ['Novation Circuit', 'TASCAM']],
  [' Send the Novation to the taskome.', 'tiny-en', ['Novation Circuit', 'TASCAM']],
  ['The evolution plays the circuit and the taskham records it.', 'whisper',
    ['Evolution MK-425C', 'Novation Circuit', 'TASCAM']],
  [' Taspim', 'tiny-en', ['TASCAM']],
  ['Open the IOC driver.', 'turbo', ['Apple IAC Driver']],
  [' Open the ISC driver', 'tiny-en', ['Apple IAC Driver']],
  ['Send the keyboard through the IRC driver to the circuit.', 'turbo',
    ['Evolution MK-425C', 'Apple IAC Driver', 'Novation Circuit']],
  ['Play the MK425C into the circuit.', 'turbo and whisper',
    ['Evolution MK-425C', 'Novation Circuit']],
  ['MK425C', 'turbo and whisper', ['Evolution MK-425C']],
  [' Play the MK425 C into the circuit.', 'tiny-en',
    ['Evolution MK-425C', 'Novation Circuit']],
  ['The fast track row is the recording input.', 'whisper', ['M-Audio Fast Track Pro']],
  [' Fast-trap.', 'tiny-en', ['M-Audio Fast Track Pro']],
  ['Put the Groover box through the audio interface.', 'turbo', ['Novation Circuit']],
  ['put the groove a box through the audio interface.', 'whisper', ['Novation Circuit']],
  [' put the groovabox through the audio interface.', 'tiny-en', ['Novation Circuit']],
  ['Apple Boss is echoing everything back.', 'whisper', ['Apple IAC Driver']],
  [' the apple bosses echoing everything back.', 'tiny-en', ['Apple IAC Driver']],
  ['Use the Mordio Fast Track Pro for the recording.', 'whisper', ['M-Audio Fast Track Pro']],
  [' Connect the Evolution keyboard to the Notation circuit.', 'tiny-en',
    ['Evolution MK-425C', 'Novation Circuit']],
  [' The sound card is on channel 1.', 'all three', ['M-Audio Fast Track Pro']],
];

{
  const wrong = [];
  for (const [text, who, want] of HEARD) {
    const got = resolve(text).map((h) => h.full);
    for (const w of want) if (!got.some((g) => g.includes(w))) wrong.push(`${who}: ${w} not in ${JSON.stringify(text)}`);
  }
  ok('every instrument a real model mangled is still found, over 20 real transcripts',
    wrong.length === 0, wrong.length ? wrong.join(' | ') : `${HEARD.length} transcripts, ${HEARD.reduce((a, h) => a + h[2].length, 0)} instruments`);
}

// Sixteen of the 48 instructions name nothing; 48 of 48 transcripts must resolve to nothing.
// why: lessons/kit-instruments.md#t-silences
{
  const quiet = [
    'Make it louder.', 'Stop everything.', 'Put the mod wheel on the filter',
    'Can you make it a bit louder please?', 'Turn the reverb down a little.',
    ' Turn the river down a little.', 'Start the recording now.',
    'Clear all the connections.', 'Transpose it up one octave.',
    'What is connected right now?', 'Mute the second channel', 'Set the tempo to 120.',
    'Play a chord and hold it down.', ' Play Accord and hold it down.',
    'Root it to the thing and then send it back.', 'route it to the thing and then send it back.',
    'Give me a bit more bass in the monitors.', 'Give me a bit more base in the monitors.',
    'disconnect everything and start again', 'Send a program change on channel 10.',
  ];
  const noisy = quiet.filter((q) => resolve(q).length);
  ok('NEGATIVE CONTROL: 20 real transcripts of instructions naming nothing are all silent',
    noisy.length === 0,
    noisy.length ? noisy.map((q) => `${JSON.stringify(q)} -> ${resolve(q).map((h) => h.full)}`).join(' | ')
      : `${quiet.length} transcripts, all silent`);
}

// NEGATIVE CONTROL for the floor on what was said: `card` and `chord` reduce to `krt`, one edit from
// keyboard and Circuit. The soundcard must survive.
// why: lessons/kit-instruments.md#t-floor
{
  const card = resolve('The sound card is on channel 1.').map((h) => h.full);
  const chord = resolve('Play a chord and hold it down.').map((h) => h.full);
  ok('NEGATIVE CONTROL: "card" and "chord" reach neither the keyboard nor the Circuit',
    card.length === 1 && card[0] === 'M-Audio Fast Track Pro' && chord.length === 0,
    `card -> ${card.join(', ')}, chord -> ${chord.join(', ') || 'nothing'}`);
}

// NEGATIVE CONTROL for `control` in the stop list, all four inflections; `controller` still finds
// the keyboard through the exact branch.
// why: lessons/kit-instruments.md#t-control
{
  const daw = resolve('The Tascam Model 12 door control does nothing at all.').map((h) => h.full);
  const inflected = ['a controlled sound', 'controlling the level', 'the control room',
    'the controls are on the left'].filter((s) => resolve(s).length);
  const real = resolve('The controller has 25 keys on it').map((h) => h.full);
  ok('NEGATIVE CONTROL: no form of "control" reaches the keyboard, and "controller" still does',
    !daw.includes('Evolution MK-425C') && inflected.length === 0
    && real.includes('Evolution MK-425C'),
    `daw -> ${daw.join(', ')}, inflections ${inflected.join(' | ') || 'all silent'}`);
}

// NEGATIVE CONTROL: `the master bus` and `a bus compressor` must not reach the IAC Driver;
// `virtual bus` still does.
// why: lessons/kit-instruments.md#t-bus
{
  const mix = ['the master bus', 'a bus compressor', 'the mix bus', 'the aux bus']
    .filter((s) => resolve(s).length);
  const real = resolve('Route the Virtual Bus to the Loopback.').map((h) => h.full);
  ok('NEGATIVE CONTROL: a bare "bus" names nothing, and "virtual bus" still names the IAC Driver',
    mix.length === 0 && real.includes('Apple IAC Driver'),
    `${mix.join(' | ') || 'four mixing phrases silent'}, virtual bus -> ${real.join(', ')}`);
}

// NEGATIVE CONTROL for the window running from one token: five ordinary words a wider window
// could have let in. It changed none of 132 studio phrases.
// why: lessons/kit-instruments.md#t-window
{
  const loud = ['grab the fader', 'group the channels', 'the disk is full',
    'copper wire on the jack', 'a task for later', 'a grip on it', 'the tusk']
    .filter((s) => resolve(s).length);
  ok('NEGATIVE CONTROL: a one token window opens none of the near misses',
    loud.length === 0,
    loud.length ? loud.map((s) => `${s} -> ${resolve(s).map((h) => h.full)}`).join(' | ')
      : 'seven near misses silent');
}

// NEGATIVE CONTROL for the stop token exemption: `crack the gate open` must not become the
// Circuit, which the obvious repair does at distance 0.
// why: lessons/kit-instruments.md#t-exemption
{
  const gate = resolve('crack the gate open').map((h) => h.full);
  const machine = resolve('machine from').map((h) => h.full);
  const split = resolve('put the groove a box through the audio interface.').map((h) => h.full);
  ok('NEGATIVE CONTROL: an ignored stop word must change nothing, so "crack the gate" stays silent',
    gate.length === 0 && machine.length === 0 && split.includes('Novation Circuit'),
    // The detail names all three halves, so a failure points at the right one.
    // why: lessons/kit-instruments.md#t-exemption-detail
    `crack the gate -> ${gate.join(', ') || 'nothing'}, machine from -> `
    + `${machine.join(', ') || 'nothing'}, groove a box -> ${split.join(', ') || 'nothing'}`);
}

// NEGATIVE CONTROL for `Fast Track`: its two ordinary words alone must not reach it.
// why: lessons/kit-instruments.md#t-fast-track
{
  const ftp = 'M-Audio Fast Track Pro';
  const found = ['Fast Track', 'The fast track row is the recording input.', ' Fast-trap.']
    .every((s) => resolve(s).some((h) => h.full === ftp));
  const loud = ['fast forward', 'the first take', 'the track is long', 'a fast one',
    'arm the track', 'a click track'].filter((s) => resolve(s).length);
  ok('NEGATIVE CONTROL: "fast track" names the soundcard and "fast" and "track" alone do not',
    found && loud.length === 0,
    loud.length ? loud.join(' | ') : 'three hearings found, six ordinary phrases silent');
}

// The ceiling: three of 144 transcripts lost the name entirely, and must find nothing.
// why: lessons/kit-instruments.md#t-ceiling
{
  const gone = [
    ['Ask them.', 'turbo heard the whole word "tascam" as two others'],
    ['So good.', 'whisper heard the whole word "circuit" as two others'],
  ];
  const found = gone.filter(([s]) => resolve(s).length);
  ok('NEGATIVE CONTROL: a transcript that lost the name resolves to nothing, rather than to something',
    found.length === 0,
    found.length ? found.map(([s]) => `${JSON.stringify(s)} -> ${resolve(s).map((h) => h.full)}`).join(' | ')
      : gone.map(([s]) => JSON.stringify(s)).join(' and ') + ' both silent');
}

// Where a name sits in the sentence. Every token's slice of the raw string must reduce back to that
// token, so `tokenise()` and `normalise()` agree by property, not by reading them.
// why: lessons/kit-instruments.md#t-tokenise
{
  const strings = [
    '', ' ', '...', 'Play the MK425C into the circuit.', ' Play the MK425 C into the circuit.',
    'mk four twenty five c', 'The tascam model twelve daw control does nothing at all.',
    'put the groove a box through the audio interface.', 'Set the tempo to 120.',
    'Connect the keyboard to the circuit and transpose it up one semitone.',
    'MK-425C', 'Twenty-five!', 'a1 b2', 'one two three four', '  leading and trailing  ',
  ];
  const bad = [];
  for (const s of strings) {
    const tok = tokenise(s);
    if (tok.map((t) => t.word).join(' ') !== normalise(s)) bad.push(`${JSON.stringify(s)} does not rebuild`);
    for (const t of tok) {
      if (normalise(s.slice(t.at, t.to)) !== t.word) {
        bad.push(`${JSON.stringify(s)} token ${JSON.stringify(t.word)} points at ${JSON.stringify(s.slice(t.at, t.to))}`);
      }
    }
  }
  ok('every token knows where it came from, and its own words reduce back to it',
    bad.length === 0, bad.length ? bad.join(' | ') : `${strings.length} strings, offsets intact`);
}

// A hit points at the words that matched, which is what makes a correction placeable.
// why: lessons/kit-instruments.md#t-spans
{
  const s = 'Play the MK425C into the circuit.';
  const hits = resolve(s);
  const slice = (f) => { const h = hits.find((x) => x.full === f); return h ? s.slice(h.at, h.to) : null; };
  ok('a hit points at the words in the raw sentence, capitals and all',
    slice('Evolution MK-425C') === 'MK425C' && slice('Novation Circuit') === 'circuit',
    `${JSON.stringify(slice('Evolution MK-425C'))} and ${JSON.stringify(slice('Novation Circuit'))}`);
}

/** The three instruments `/wish/` actually has. Everything else on DESK is in
 *  this room and not on that page, which is the whole point of `has`. */
const WISH = new Set(['Evolution MK-425C', 'Novation Circuit', 'TASCAM Model 12']);
const onWish = { has: (f) => WISH.has(f) };

// A mis-heard name is repaired in the words a reader is looking at, and the
// repair says what it replaced. Three real transcripts, three models.
{
  const cases = [
    ['put the groove a box through the audio interface.', 'put the Novation Circuit through the audio interface.', 'groove a box'],
    ['Play the MK425C into the circuit.', 'Play the Evolution MK-425C into the circuit.', 'MK425C'],
    ['The evolution plays the circuit and the taskham records it.',
      'The evolution plays the circuit and the TASCAM Model 12 records it.', 'taskham'],
  ];
  const bad = [];
  for (const [said, want, was] of cases) {
    const r = reword(said, onWish);
    if (r.text !== want) bad.push(`${JSON.stringify(said)} -> ${JSON.stringify(r.text)}`);
    if (!r.fixed.some((f) => f.was === was)) bad.push(`${JSON.stringify(said)} did not report ${JSON.stringify(was)}`);
  }
  ok('a mis-heard name is corrected in the raw words, and the correction says what it replaced',
    bad.length === 0, bad.length ? bad.join(' | ') : `${cases.length} real transcripts repaired and reported`);
}

// NEGATIVE CONTROL: an exact hearing is never rewritten.
// why: lessons/kit-instruments.md#t-exact
{
  const same = ['Connect the keyboard to the circuit and transpose it up one semitone.',
    'The desk needs DOM mode switched on.', 'Send the circuit to the model 12.'];
  const moved = same.filter((s) => reword(s, onWish).text !== s);
  ok('NEGATIVE CONTROL: a sentence that named the instruments properly comes back untouched',
    moved.length === 0, moved.length ? moved.map((s) => JSON.stringify(reword(s, onWish).text)).join(' | ')
      : `${same.length} sentences unchanged`);
}

// NEGATIVE CONTROL: nothing named, nothing changed, character for character.
// why: lessons/kit-instruments.md#t-unchanged
{
  const quiet = ['Make it louder.', 'Stop everything.', 'Put the mod wheel on the filter',
    'Turn the reverb down a little.', 'Play a chord and hold it down.', 'Set the tempo to 120.',
    'Give me a bit more bass in the monitors.', 'Root it to the thing and then send it back.'];
  const moved = quiet.filter((s) => reword(s, onWish).text !== s);
  ok('NEGATIVE CONTROL: an instruction naming nothing is returned exactly as it arrived',
    moved.length === 0, moved.length ? moved.join(' | ') : `${quiet.length} instructions unchanged`);
}

// NEGATIVE CONTROL: an instrument the caller does not have is reported, never substituted.
// why: lessons/kit-instruments.md#t-absent
{
  const away = [['The fast track row is the recording input.', 'M-Audio Fast Track Pro'],
    ['Apple Boss is echoing everything back.', 'Apple IAC Driver'],
    ['The tascam model twelve daw control does nothing at all.', 'TASCAM Model 12 DAW control']];
  const bad = [];
  for (const [s, name] of away) {
    const r = reword(s, onWish);
    if (r.text !== s) bad.push(`${JSON.stringify(s)} was rewritten to ${JSON.stringify(r.text)}`);
    if (!r.absent.some((a) => a.names.includes(name))) bad.push(`${JSON.stringify(s)} did not report ${name}`);
    if (r.fixed.length) bad.push(`${JSON.stringify(s)} claimed a repair`);
  }
  ok('NEGATIVE CONTROL: a name this desk does not have is reported and never substituted',
    bad.length === 0, bad.length ? bad.join(' | ')
      : away.map(([, n]) => n).join(', ') + ' each named and each left alone');
}

// Two hits for one instruction: a name inside a longer name is one instrument, the longer one.
// why: lessons/kit-instruments.md#t-inside
{
  const s = 'The tascam model twelve daw control does nothing at all.';
  const names = reword(s).hits.map((h) => h.full);
  ok('a more specific name beats the name inside it, so one span names one instrument',
    names.length === 1 && names[0] === 'TASCAM Model 12 DAW control', names.join(', ') || 'nothing');
}

// NEGATIVE CONTROL: `audio interface` names two instruments the caller has; never repaired.
// Graded with a desk that has both, since `/wish/` cannot raise the ambiguity.
// why: lessons/kit-instruments.md#t-ambiguous
{
  const both = { has: (f) => f === 'TASCAM Model 12' || f === 'M-Audio Fast Track Pro' };
  const s = 'Send it through the audio interface.';
  const r = reword(s, both);
  const u = r.unsure[0];
  ok('NEGATIVE CONTROL: one span naming two instruments on the desk is reported and never picked',
    r.text === s && r.fixed.length === 0 && !!u && u.names.length === 2
      && u.names.includes('TASCAM Model 12') && u.names.includes('M-Audio Fast Track Pro'),
    u ? `${JSON.stringify(u.was)} -> ${u.names.join(' or ')}, nothing rewritten` : 'no ambiguity reported');
}

// The same refusal on a mis-heard span (`taskam`), the branch sabotage showed was ungraded.
// why: lessons/kit-instruments.md#t-ambiguous-sound
{
  const both = { has: (f) => f.startsWith('TASCAM') };
  const s = 'Send the Novation to the taskam.';
  const r = reword(s, both);
  const u = r.unsure[0];
  ok('NEGATIVE CONTROL: a mis-heard span naming two instruments is refused rather than guessed',
    r.text === s && r.fixed.length === 0 && !!u && u.was === 'taskam' && u.names.length === 2,
    u ? `${JSON.stringify(u.was)} -> ${u.names.join(' or ')}, ${r.fixed.length} repaired`
      : `no ambiguity reported, ${r.fixed.length} repaired`);
}

// A name `reword` can write must be a name `describe()` gives for a port on the desk.
// why: lessons/kit-instruments.md#t-vocabulary
{
  const ports = ['MK-425C USB MIDI Keyboard', 'Circuit', 'Model 12 MIDI IN'];
  const known = new Set(ports.map((p) => describe(p).full));
  const writes = ['put the groove a box through it', 'Play the MK425C', 'the taskham records it']
    .flatMap((s) => reword(s, { has: (f) => known.has(f) }).fixed.map((f) => f.full));
  ok('every name a repair can write is a name the desk already answers to',
    writes.length === 3 && writes.every((w) => known.has(w)), writes.join(', ') || 'nothing written');
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);

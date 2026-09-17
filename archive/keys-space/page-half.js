  // ── the space the note falls into ───────────────────────────────────────
  // 🔴 AN INSERT THAT PASSES THE DRY SIGNAL, AND THE DIFFERENCE IS NOTE-OFF.
  // The one that used to sit here REPLACED the signal, so releasing a key
  // swapped one drone for another and every instrument's envelope, attack and
  // patch character were washed out before you heard them. That is why the
  // patch arrows and the die both stopped doing anything audible. A reverb adds
  // a tail, so the note still stops when you let go. `rig/box/README.md` has
  // the rest of that story.
  //
  // ⚠️ THIS IS A CSOUND INSERT ON THE JACK GRAPH, `positron-space`, and it is
  // the one stage between the instrument and the capture that this page can
  // actually reach. It is deliberately not drawn: it would be a fifth box in a
  // container drawn to hold four, and nobody asked for it.
  //
  // ⚠️ THE BOARD RENDERS, THE PAGE SENDS NUMBERS — the same split `mirror` uses
  // for its shader knobs. Nothing is processed in this page: it plays what
  // arrives and no more.
  // ⚠️ `off`, NOT `dry`. This row said `dry · room · hall` beside a chorus row
  // saying `off · light · wide` — the same idea in two words, one of which you
  // have to already know. And it IS off: `mix: 0` with the chorus off sends
  // `on: false`, so the insert comes out of the graph rather than sitting in it
  // doing nothing. One vocabulary across two adjacent controls.
  const SPACE = [
    ['off',  { mix: 0,    room: 0.2, damp: 6000 }],
    ['room', { mix: 0.26, room: 0.35, damp: 7000 }],
    ['hall', { mix: 0.4,  room: 0.8, damp: 4500 }],
  ];
  const CHORUS = [['off', 0], ['light', 0.35], ['wide', 0.7]];
  // ⚠️ BOTH OFF AT THE START, so the first thing you hear is the INSTRUMENT.
  // This opened on `room` — a little reverb by default, on the argument that
  // dry is a test rather than a sound. That argument is about mixing a record;
  // this page exists to let you hear what a Raspberry Pi three hundred metres
  // away is making, and putting an effect in front of it on arrival means the
  // first patch you press is not the patch. Nothing is in the graph until you
  // put it there.
  let spaceAt = 0, chorusAt = 0;

  // ⚠️ `createChoice`, NOT SIX LOOSE BUTTONS. This row built its own by hand and
  // it showed: no grouping, so three choices read as three unrelated controls;
  // the wrong corner on every button; and a `::after` that appended ' on' or
  // ' off' to each one, inherited from when this was a single toggle — so a
  // three-way row rendered `dry off`, `room on`, `off on`. Which one is chosen
  // is already said by colour and by aria-pressed.
  const spaceRow = el('span', 'fx');

  /** One message, the whole state. Clamped again at the far end. */
  function sendSpace() {
    const [, p] = SPACE[spaceAt];
    send({ type: 'fx.space', on: spaceAt > 0 || chorusAt > 0,
           mix: p.mix, room: p.room, damp: p.damp, chorus: CHORUS[chorusAt][1] });
  }
  const spacePick = createChoice({
    // ⚠️ `reverb`, NOT `space`. "Space" is what it does to your ear and "reverb"
    // is what it is called by everyone who has met one; a visitor who knows the
    // word gets no help from the poetic one, and a visitor who does not is no
    // better off either.
    label: 'reverb', options: SPACE.map(([n]) => [n, n]), at: spaceAt,
    onPick: (_v, name, i) => { spaceAt = i; sendSpace(); d.log(`space ${name}`); },
  });
  const chorusPick = createChoice({
    label: 'chorus', options: CHORUS.map(([n]) => [n, n]), at: chorusAt,
    onPick: (_v, name, i) => { chorusAt = i; sendSpace(); d.log(`chorus ${name}`); },
  });
  spaceRow.append(spacePick.el, chorusPick.el);
  spaceRow.hidden = true;             // shown when an instrument that can be wrapped is up
  // ⚠️ A CLASS, NOT INLINE STYLE. This set `display` and `align-items` on the
  // element, and an inline style beats every stylesheet — including the media
  // query that puts these controls full width on a phone, which is why reverb
  // and chorus stayed 113 px wide on a 390 px screen while the row above them
  // went full width. Measured twice before the cause was the style attribute.
  //
  // 🔴 IN THE PATCH ROW, AND UNTIL 2026-09-16 THESE TWO CONTROLS COULD NOT BE
  // SEEN AT ALL. They were appended into `.pos-controls`, and this page declares
  // `controls: []`, so `mount()` had already set `hidden` on that row — for the
  // right reason, since a row with nothing in it paints a band of dead space.
  // Nothing ever cleared it. `spaceRow.hidden = m.jack === false` was toggling a
  // child of an element that was `display: none`, so reverb and chorus were
  // invisible in every state the page has, on every visit. FOUND by reading the
  // computed display off a real browser while measuring this page's gaps:
  // `.pos-controls` came back 0 px high and `none`.
  // ⚠️ THE FIX IS NOT TO UN-HIDE THE SHELL'S ROW. Two reasons: the row would
  // then open the page ABOVE the transport bar, and the order asked for is the
  // bar first; and these two belong with the patch, which is the other thing
  // you set and then leave alone. The page's own CSS already styles `.pick .fx`
  // exactly as it styled `.pos-controls .fx`, phone rules included.
  picks.append(spaceRow);

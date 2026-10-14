// demo/shell/rt-collide.mjs: a `collide` node on /connect/ (node-runtime.mjs), the
// SuperCollider voice of /code/collide/ in the page's one context. midi-in and value-in
// (`bright`, `decay`) in, audio-out out; its face is the program in the code box.
// why: lessons/kit-rt-collide.md#header

import { CODE_ROWS } from './concept-nav.mjs';
import { createCodeBox } from './code-box.mjs';
import { createHueBook } from './code-lang.mjs';
import { createCompileIdle } from './compile-idle.mjs';
import { createCollideVoice, PROGRAM } from '/code/collide-voice.mjs';

export function make({ log, wake, reroute }) {
  let notes = 0, params = 0;
  const voice = createCollideVoice({ log, who: 'SuperCollider' });
  const names = voice.compiled.knobs.map((k) => k.name);
  const code = createCodeBox({ language: 'sclang', rows: CODE_ROWS, label: '', value: PROGRAM, hues: createHueBook(),
    ariaLabel: 'the SuperCollider program this synth plays, edit it and it recompiles' });
  createCompileIdle({ input: code.input, host: code.el, compile: async (text) => {
    const out = await voice.load(text);
    log(out.ok ? `the edit compiled and plays from the next note` : `the edit did not compile, the last good program keeps playing: ${out.error}`,
      out.ok ? '' : 'warn');
    return out;
  } });
  const face = document.createElement('div');
  face.className = 'cn-panel';
  face.append(code.el);
  face.addEventListener('pointerenter', () => voice.warm(), { once: true });
  return {
    face, slot: 'panel', voice, names,
    deliver: {
      'midi-in': (e) => {
        if (e?.cls !== 'note') return;
        notes++;
        // A note before the engine is up waits in the voice, and wakes the page's sound.
        if (!voice.engine()) wake();
        if (e.d2) voice.noteOn(e.d1, e.d2); else voice.noteOff(e.d1);
      },
      'value-in': (e) => {
        if (e?.of !== 'param') return;
        if (voice.param(e.name, e.v)) params++;
        else log(`SuperCollider has no ${e.name}, so it ignores it`);
      },
    },
    start(ctx) { voice.wake(ctx).then(() => reroute(), () => {}); },
    audio: { out: () => voice.out() },
    param: (name) => voice.values.get(name),
    /** A knob's travel for one of its names, off the program's own `spec`. */
    spec(name) { const k = voice.compiled.knobs.find((x) => x.name === name); return k ? { min: k.spec.min, max: k.spec.max, value: k.value } : null; },
    heard: () => notes,
    params: () => params,
    stop: () => voice.panic(),
    close() { voice.panic(); try { voice.out()?.disconnect(); } catch { /* not connected */ } face.remove(); },
  };
}

// demo/shell/rt-collide.mjs: a `collide` node on /connect/ (node-runtime.mjs), the
// SuperCollider voice of /code/collide/ in the page's one context. midi-in, value-in
// (`bright`, `decay`) and program-in (a whole program) in, audio-out out; its face is the code box.
// why: lessons/kit-rt-collide.md#header

import { CODE_ROWS } from './concept-nav.mjs';
import { createCodeBox } from './code-box.mjs';
import { createHueBook } from './code-lang.mjs';
import { createCompileIdle } from './compile-idle.mjs';
import { createCollideVoice, PROGRAM } from '/code/collide-voice.mjs';
import { compile } from './sclang-lite.mjs';

export function make({ log, wake, reroute }) {
  let notes = 0, params = 0, programs = 0, refused = 0, lastProgram = null;
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
      // A whole program: compiled here at once, so the answer is { ok, error } now; a refusal keeps
      // the last good program and the code box as they were. The engine takes it from the next note.
      'program-in': (e) => {
        const say = (r) => { lastProgram = { ...r, at: e?.at ?? null }; if (r.ok) programs++; else refused++; return lastProgram; };
        if (e?.of !== 'program' || typeof e.source !== 'string') { log('SuperCollider takes a program on program-in, and this was not one', 'warn'); return say({ ok: false, error: 'not a program' }); }
        const c = compile(e.source);
        if (!c.ok) return say({ ok: false, error: c.message });
        code.set(e.source);
        lastProgram = { ok: true, error: '', at: e.at ?? null, loaded: voice.load(e.source) };
        programs++;
        return lastProgram;
      },
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
    /** Programs taken and refused on program-in, and how the last one ended ({ ok, error, loaded }). */
    programs: () => ({ ran: programs, refused, last: lastProgram }),
    code,
    stop: () => voice.panic(),
    close() { voice.panic(); try { voice.out()?.disconnect(); } catch { /* not connected */ } face.remove(); },
  };
}

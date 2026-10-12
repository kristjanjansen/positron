const KNOB = 'web:knob-segments:value-out', CODE = 'web:code:program-out';
export async function run(ev, sleep, log) {
  await ev('document.querySelector(".cc-top button").click(), 1');
  for (let i = 0; i < 40; i++) { if (await ev('__demo.shader.pi.mode()') !== 'checking') break; await sleep(250); }
  log('mode', await ev('__demo.shader.pi.mode()'), 'reason', await ev('__demo.shader.pi.reason()'));
  if (await ev('__demo.shader.pi.mode()') !== 'relay') return;
  for (let i = 0; i < 40; i++) { if (await ev('__demo.shader.pi.video.decoded()') > 60) break; await sleep(250); }
  await sleep(3000);
  log('decoded', await ev('__demo.shader.pi.video.decoded()'), 'lost', await ev('__demo.shader.pi.video.lost()'),
    'fps', await ev('__demo.shader.pi.video.fps().toFixed(1)'), 'kbit', await ev('Math.round(__demo.shader.pi.video.kbit())'), 'lastSeq', await ev('__demo.shader.pi.video.lastSeq()'));
  log('footer', await ev('document.querySelectorAll(".pos-vp-foot")[1]?.textContent'));
  // knob turns: alternate 3 and 9, 2.5 s apart
  for (const v of [3, 9, 3, 9, 3, 9, 8]) {
    await ev(`__demo.shader.bay.send("${KNOB}", { of: "param", name: "segments", v: ${v}, at: performance.now() }), 1`);
    await sleep(2500);
  }
  log('replies params', JSON.stringify(await ev('__demo.shader.replies.filter((r) => r.type === "video.params").map((r) => [r.ok, r.mirrors])')));
  // a good edit: invert the colour
  const good = await ev('__demo.shader.code.value().replace("o = vec4(mix(c, fb, uFb), 1.0); }", "o = vec4(1.0 - mix(c, fb, uFb), 1.0); }")');
  log('good edit differs', good !== await ev('__demo.shader.code.value()'));
  await ev(`__demo.shader.bay.send("${CODE}", { of: "program", source: ${JSON.stringify(good)}, at: performance.now() }), 1`);
  await sleep(3500);
  // a broken edit
  const bad = good.replace('o = vec4(1.0 - mix(c, fb, uFb), 1.0); }', 'o = vec4(1.0 - mix(c, fb, uFb), 1.0) }');
  await ev(`__demo.shader.bay.send("${CODE}", { of: "program", source: ${JSON.stringify(bad)}, at: performance.now() }), 1`);
  await sleep(2500);
  log('shader replies', JSON.stringify(await ev('__demo.shader.replies.filter((r) => r.type === "video.shader.applied").map((r) => ({ ok: r.ok, bytes: r.bytes, reason: r.reason && r.reason.slice(0, 120) }))')));
  // back to the page's own program, then leave
  await ev(`__demo.shader.bay.send("${CODE}", { of: "program", source: __demo.shader.code.value(), at: performance.now() }), 1`);
  await sleep(2500);
  log('lags', JSON.stringify(await ev('__demo.shader.pi.lags().map((l) => ({ what: l.what, ms: Math.round(l.ms), diff: +l.diff.toFixed(1), bar: +l.bar.toFixed(1), seq: l.seq }))')));
  log('decoded', await ev('__demo.shader.pi.video.decoded()'), 'lost', await ev('__demo.shader.pi.video.lost()'));
  await ev('document.querySelector(".cc-top button").click(), 1');
  await sleep(1500);
  log('mode after leave', await ev('__demo.shader.pi.mode()'));
}

export async function run(ev, sleep, log) {
  await ev('document.querySelector(".cc-top button").click(), 1');
  for (let i = 0; i < 40; i++) { if (await ev('__demo.shader.pi.mode()') !== 'checking') break; await sleep(100); }
  const good = await ev('__demo.shader.code.value().replace("o = vec4(mix(c, fb, uFb), 1.0); }", "o = vec4(1.0 - mix(c, fb, uFb), 1.0); }")');
  await ev(`__demo.shader.bay.send("web:code:program-out", { of: "program", source: ${JSON.stringify(good)}, at: performance.now() }), 1`);
  log('edit sent while held, mode', await ev('__demo.shader.pi.mode()'), 'decoded', await ev('__demo.shader.pi.video.decoded()'));
  await sleep(7000);
  log('replies', JSON.stringify(await ev('__demo.shader.replies.filter((r) => r.type === "video.shader.applied").map((r) => ({ ok: r.ok, bytes: r.bytes, reason: r.reason }))')));
  await ev('document.querySelector(".cc-top button").click(), 1');
  await sleep(800);
}

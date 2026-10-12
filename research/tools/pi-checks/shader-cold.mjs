export async function run(ev, sleep, log) {
  await ev('document.querySelector(".cc-top button").click(), 1');
  for (let i = 0; i < 40; i++) { if (await ev('__demo.shader.pi.mode()') !== 'checking') break; await sleep(250); }
  log('mode', await ev('__demo.shader.pi.mode()'), 'reason', await ev('__demo.shader.pi.reason()'));
  await sleep(7000);
  log('decoded', await ev('__demo.shader.pi.video.decoded()'), 'lost', await ev('__demo.shader.pi.video.lost()'));
  log('replies', JSON.stringify(await ev('__demo.shader.replies.map((r) => ({ type: r.type, ok: r.ok, reason: r.reason, detail: r.detail }))')));
  // an edit after the picture is up still goes straight through
  const src = await ev('__demo.shader.code.value()');
  await ev(`__demo.shader.bay.send("web:code:program-out", { of: "program", source: ${JSON.stringify(src)}, at: performance.now() }), 1`);
  await sleep(2500);
  log('replies after an edit', JSON.stringify(await ev('__demo.shader.replies.filter((r) => r.type === "video.shader.applied").map((r) => ({ ok: r.ok, reason: r.reason }))')));
  await ev('document.querySelector(".cc-top button").click(), 1');
  await sleep(1000);
  log('mode after leave', await ev('__demo.shader.pi.mode()'));
}

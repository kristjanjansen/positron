export async function run(ev, sleep, log) {
  log('room', await ev('document.title'));
  await ev('[...document.querySelectorAll("button")].find((b) => /Show the board/i.test(b.textContent + (b.getAttribute("aria-label")||"")))?.click(), 1');
  let n = 0;
  for (let i = 0; i < 40; i++) { n = await ev('__demo.link?.frames ?? 0'); const k = await ev('__demo.link?.kbit ?? null'); if (k && n > 60) break; await sleep(500); }
  await sleep(3000);
  log('link', JSON.stringify(await ev('__demo.link')));
  log('pane box', JSON.stringify(await ev('__demo.panes?.box ?? null')));
  log('badge tag', await ev('document.querySelector(".pos-vp-tag, [class*=tag]")?.textContent ?? null'));
}

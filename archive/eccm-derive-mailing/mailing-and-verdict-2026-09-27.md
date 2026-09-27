# The mailing block and the verdict line of the derived samples, removed 2026-09-27

Asked, verbatim: *"Rm sellel nadalal eccmis and footer from detected examples.
Archice that code to md”s"*. These were the last two parts of every sample
page on `demo/eccm/derive.html`: a newsletter block titled *Sel nädalal
ECCMis* with two dated rows, and a small muted line at the foot of the sample
saying what the scheme was. The block was asked for the day before as
*"rich text, mailings, etc."* so a serif could be judged in a mailing; the
foot line duplicated the readings beside the picture, which gained a *serif*
row when it went. Kept here as it was, so a mailing sample can be put back
without being redrawn.

## The stylesheet rules, from the page's `@layer page`

```css
    .sample .mail { margin-block-start: 2lh; max-inline-size: var(--eccm-measure); padding: var(--eccm-s-6); outline: 1px solid var(--ev-ink2); font-family: var(--ev-body-face); }
    .sample .mail .mail-name { font-size: var(--eccm-t-s); line-height: var(--eccm-lh-meta); color: var(--ev-ink2); font-family: 'Schibsted Grotesk', Helvetica, Arial, sans-serif; }
    .sample .mail h3 { font-size: var(--eccm-t-l); font-family: var(--ev-title-face); margin-block: var(--eccm-s-2) var(--eccm-s-4); }
    .sample .mail ul { list-style: none; padding: 0; display: grid; gap: var(--eccm-s-2); }
    .sample .mail li { display: grid; grid-template-columns: max-content minmax(0, 1fr); column-gap: var(--eccm-s-4); }
    .sample .mail time { color: var(--ev-ink2); font-variant-numeric: tabular-nums; font-family: 'Schibsted Grotesk', Helvetica, Arial, sans-serif; }
    .sample .mail a { color: inherit; text-decoration-color: var(--ev-accent, var(--ev-ink2)); }
    .sample .verdict { margin-block-start: 2lh; font-size: var(--eccm-t-s); line-height: var(--eccm-lh-meta); color: var(--ev-ink2); font-family: 'Schibsted Grotesk', Helvetica, Arial, sans-serif; }
```

## The markup, inside the sample's `innerHTML` template (a template literal, hence the `${}`)

```html
      <div class="mail"><p class="mail-name">Uudiskiri, 29. september</p><h3>Sel nädalal ECCMis</h3><ul><li><time>K 30.09</time><span><a href="./event.html">Gestuurid/situatsioonid</a>, ECCM saal, 19.00</span></li><li><time>L 10.10</time><span><a href="./event.html">Morton Feldman 100</a>, Arvo Pärdi Keskus, 18.00</span></li></ul></div>
      <p class="verdict"></p>
```

## The line that filled the verdict

```js
    el.querySelector('.verdict').textContent = `${s.mode} scheme; ground ${s.groundNote}; ${s.accent ? `accent ${hex(s.accent.rgb)}` : s.notes.join('; ')}; ${s.serif ? 'serif in the title and facts' + (s.mode === 'light' && lum(s.ground) >= 0.8 ? ' and the body' : ', the body stays in the sans on a ground this dark') : 'no serif'}${s.serifHow ? ' (' + s.serifHow + ')' : ''}.`;
```

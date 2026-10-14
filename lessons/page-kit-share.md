# Page comments: kit-share

The full comments cut from the code under demo/ for kit-share, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="kit-share-1"></a>
## kit-share-1: demo/kit/share/index.html, inline script, line 32

````js
  /**
   * 🔴 kit/share, THE SHARE CARD, 2026-10-13. Asked: *"Build frontpage og card
   * and apply to all pages"*, then *"What headless chrome?!!? See ../eccm etc"*.
   * The card every page names in its og:image and the Instagram portrait
   * beside it, both the front page's hero type alone (*"No patchbay. Do like
   * frontpage. Do also ig image"*), written as SVG by demo/shell/share-card.mjs
   * with no DOM and made PNGs at build by resvg (workers/view/og/render.mjs).
   * eccm's /social is the model: the images a page is shared with, as they ship.
   * ⚠️ THE PNG EXISTS ONLY IN A BUILD. The dev server serves the repository,
   * where there is no og/ directory, so this page asks for the PNG only when
   * its own head carries the og:image the build writes, and says so otherwise
   * rather than logging a 404.
   * ⚠️ A VISIT OPENS NOTHING. The SVG is drawn from data in this tab.
   */
````

# Page comments: kit

The full comments cut from the code under demo/ for kit, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="kit-1"></a>
## kit-1: demo/kit/index.html, inline script, line 33

````js
  /**
   * 🔴 `/kit/` SINCE STEP 4 OF plans/plan-kit-split.md, 2026-10-06. It used to
   * be every part of the kit on one page of eight tabs; that file moved with
   * `git mv` to `demo/kit/slides/index.html`, so its history follows SLIDES,
   * and every other part is a page of its own at `/kit/<part>/`.
   * ⚠️ WHAT IT DOES: an old address naming a block, `/kit/#keyboard`, replaces
   * itself with the part page holding that block, `/kit/input/#keyboard`; one
   * naming a part, `/kit/#hardware`, goes to `/kit/hardware/`; anything else
   * stays here and reads a list of the parts. The map is
   * `demo/shell/kit-parts.mjs`, and every part page asserts its own row of it,
   * so this page builds nothing and grades only the lookup.
   * ⚠️ `replace`, NOT `assign`, so the back button skips the address that only
   * existed to be forwarded.
   */
````

<a id="kit-2"></a>
## kit-2: demo/kit/index.html, inline script, line 57

````js
  // 🔴 THE KIT'S OWN INDEX SINCE 2026-10-10 (*"make a separate kit page (rm
  // from frontpage)"*): the parts are off the front page and are cards here,
  // each with the one line its manifest row carries, so the words cannot drift.
````

# og-fonts.py: the TrueType faces the share card is drawn in, and their
# advance widths, made from the site's own woff2 subsets in demo/shell/vendor/.
# eccm's tools/og-fonts.py, cut down: resvg reads TrueType or OpenType and no
# woff2, and these four are static faces already (no fvar), so each is only
# decompressed. Nothing is renamed: the 600 files carry the typographic family
# `JetBrains Mono` / `Geist` with subfamily SemiBold in name IDs 16 and 17, and
# resvg picks them by family plus font-weight="600" (MEASURED in
# plans/plan-og-insta-images.md section 3; naming the SemiBold family did not).
#
#   uvx --offline --from 'fonttools[woff]' python workers/view/og/og-fonts.py
#
# writes workers/view/og/fonts/*.ttf and demo/shell/font-metrics.mjs; run again
# only when a face changes, then bump TEMPLATE_V in demo/shell/share-card.mjs.
import io, json, os, sys
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
VENDOR = os.path.join(ROOT, 'demo', 'shell', 'vendor')
OUT = os.path.join(HERE, 'fonts')

# key in the metrics, family as the TTF names it, weight, vendor file
FACES = [
    ('mono400', 'JetBrains Mono', 400, 'jetbrains-mono-latin-400-normal'),
    ('mono600', 'JetBrains Mono', 600, 'jetbrains-mono-latin-600-normal'),
    ('sans400', 'Geist', 400, 'geist-latin-400-normal'),
    ('sans600', 'Geist', 600, 'geist-latin-600-normal'),
]

os.makedirs(OUT, exist_ok=True)
metrics = {}
for key, family, weight, stem in FACES:
    font = TTFont(os.path.join(VENDOR, stem + '.woff2'))
    if 'fvar' in font: sys.exit(f'{stem} is a variable font; instance it first, as eccm does')
    font.flavor = None
    path = os.path.join(OUT, stem + '.ttf')
    font.save(path)
    font = TTFont(path)
    upem = font['head'].unitsPerEm
    hmtx = font['hmtx'].metrics
    os2 = font['OS/2']
    adv = {str(cp): round(hmtx[g][0] / upem, 4) for cp, g in font.getBestCmap().items()}
    metrics[key] = {'family': family, 'weight': weight, 'file': stem + '.ttf',
                    'cap': round(os2.sCapHeight / upem, 4), 'asc': round(os2.sTypoAscender / upem, 4),
                    'desc': round(-os2.sTypoDescender / upem, 4), 'adv': adv}
    print(f'{stem}.ttf: {os.path.getsize(path)} bytes, {len(adv)} code points, weight {os2.usWeightClass}', file=sys.stderr)

with open(os.path.join(ROOT, 'demo', 'shell', 'font-metrics.mjs'), 'w') as fh:
    fh.write('// demo/shell/font-metrics.mjs: written by workers/view/og/og-fonts.py, the\n')
    fh.write("// advance width of every code point of the site's two faces at 400 and 600,\n")
    fh.write('// and each face\'s cap height, ascent and descent, in ems, read from the\n')
    fh.write('// TTFs made from demo/shell/vendor/*.woff2. Used to lay text out with no DOM\n')
    fh.write('// (demo/shell/bay-svg.mjs, demo/shell/share-card.mjs). Do not edit by hand.\n')
    fh.write('export default ' + json.dumps(metrics, separators=(',', ':')) + ';\n')

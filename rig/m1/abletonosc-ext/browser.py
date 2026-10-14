# AbletonOSC handler for Live's browser: /live/browser/roots, instruments, find, load.
# Registered from view.py, since /live/api/reload does not reload manager.py.
# why: lessons/rig-m1.md#abletonosc-browser
from typing import Optional, Tuple


def register(self):
    """`self` is any AbletonOSCHandler — we borrow its .song/.osc_server/.manager."""
    if True:
        def browser():
            return self.manager.application.browser

        def walk(item, depth=0, limit=6):
            """Depth-first over the browser tree. Live nests instruments several
            folders deep and only leaves are loadable, so a shallow scan finds
            categories and nothing you can actually load."""
            if depth > limit:
                return
            try:
                children = list(item.children)
            except Exception:
                children = []
            if getattr(item, "is_loadable", False):
                yield item
            for c in children:
                for r in walk(c, depth + 1, limit):
                    yield r

        # Search every root: third-party plugins are under `plugins`, not `instruments`.
        # why: lessons/rig-m1.md#abletonosc-roots
        ROOTS = ("instruments", "plugins", "sounds", "drums", "user_library",
                 "packs", "audio_effects", "midi_effects")

        def roots():
            b = browser()
            out = []
            for name in ROOTS:
                r = getattr(b, name, None)
                if r is None:
                    continue
                try:
                    out.append((name, len(list(r.children))))
                except Exception:
                    out.append((name, -1))      # present but would not enumerate
            return out

        def get_instruments(params: Optional[Tuple] = ()):
            return tuple(c.name for c in browser().instruments.children)

        def get_roots(params: Optional[Tuple] = ()):
            # Flattened, because OSC carries no nesting: name, count, name, ...
            flat = []
            for name, n in roots():
                flat.extend([name, n])
            return tuple(flat)

        def _hits(needle, limit):
            b = browser()
            out = []
            for rootname in ROOTS:
                root = getattr(b, rootname, None)
                if root is None:
                    continue
                for item in walk(root):
                    if needle in item.name.lower():
                        out.append((rootname, item))
                        if len(out) >= limit:
                            return out
            return out

        def find(params: Optional[Tuple] = ()):
            needle = str(params[0]).lower()
            limit = int(params[1]) if len(params) > 1 else 20
            # "root/name", so the caller sees where an item was found.
            # why: lessons/rig-m1.md#abletonosc-hit
            return tuple("%s/%s" % (r, it.name) for r, it in _hits(needle, limit))

        def load(params: Optional[Tuple] = ()):
            index = int(params[0])
            needle = str(params[1]).lower()
            track = self.song.tracks[index]
            # load_item acts on the SELECTED track, so selecting is not optional.
            self.song.view.selected_track = track
            # Same roots as `find`, in the same order, so what you searched for
            # is what you load. Two different search paths for finding and
            # loading is a name that exists and will not open.
            hits = _hits(needle, 1)
            if hits:
                rootname, item = hits[0]
                browser().load_item(item)
                return (index, item.name, rootname, "loaded")
            return (index, str(params[1]), "", "not found")

        self.osc_server.add_handler("/live/browser/instruments", get_instruments)
        self.osc_server.add_handler("/live/browser/roots", get_roots)
        self.osc_server.add_handler("/live/browser/find", find)
        self.osc_server.add_handler("/live/browser/load", load)

# AbletonOSC handler for Live's BROWSER — the one thing AbletonOSC does not
# expose and the one thing a remote instrument needs: a track with no device on
# it makes no sound however well the MIDI arrives.
#
# Live's LOM does have it (Live 10+): application.browser.instruments is a tree
# of BrowserItem, and browser.load_item(item) loads onto the SELECTED track. So
# "load an instrument onto track N" is: select N, find a loadable item, load it.
#
#   /live/browser/roots                       -> every browser root and its size
#   /live/browser/instruments                 -> top-level instrument names
#   /live/browser/find <substring> [limit]    -> loadable items matching
#   /live/browser/load <track_index> <name>   -> select track, load first match
#
# Installed to Live's Remote Scripts and picked up by /live/api/reload.
# REGISTERED FROM view.py, NOT FROM manager.py. /live/api/reload does rebuild the
# handler list -- it calls clear_api() then init_api() -- but it reloads only the
# abletonosc/* modules, and NOT manager.py. So a handler added to manager's list
# needs a Live restart, while one registered from inside an already-reloaded
# module does not. Live refuses AppleScript quit, so "no restart" is the whole
# point.
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

        # ⚠️ A VST IS NOT UNDER `instruments`, AND SEARCHING ONLY THERE FINDS
        # NOTHING WITH NO ERROR. Live's browser has separate roots and third
        # party plugins live under `plugins`; `instruments` holds Live's own
        # devices. Asking this for "Arturia", "Analog Lab" and "Rhodes" all
        # returned empty, which reads as "not installed" and meant "not looked
        # for". Every root is searched now and each hit says which one it came
        # from, because loading needs to look in the same place.
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
            # "root/name", so the caller can see WHERE it was found — an Arturia
            # patch under `plugins` and a Live preset under `sounds` are
            # different things and a bare name hides that.
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

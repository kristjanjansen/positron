# AbletonOSC handler for Live's BROWSER — the one thing AbletonOSC does not
# expose and the one thing a remote instrument needs: a track with no device on
# it makes no sound however well the MIDI arrives.
#
# Live's LOM does have it (Live 10+): application.browser.instruments is a tree
# of BrowserItem, and browser.load_item(item) loads onto the SELECTED track. So
# "load an instrument onto track N" is: select N, find a loadable item, load it.
#
#   /live/browser/instruments                 -> top-level instrument names
#   /live/browser/find <substring> [limit]    -> loadable items matching
#   /live/browser/load <track_index> <name>   -> select track, load first match
#
# Installed to Live's Remote Scripts and picked up by /live/api/reload.
from typing import Optional, Tuple
from .handler import AbletonOSCHandler


class BrowserHandler(AbletonOSCHandler):
    def __init__(self, manager):
        super().__init__(manager)
        self.class_identifier = "browser"

    def init_api(self):
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

        def get_instruments(params: Optional[Tuple] = ()):
            return tuple(c.name for c in browser().instruments.children)

        def find(params: Optional[Tuple] = ()):
            needle = str(params[0]).lower()
            limit = int(params[1]) if len(params) > 1 else 20
            out = []
            for item in walk(browser().instruments):
                if needle in item.name.lower():
                    out.append(item.name)
                    if len(out) >= limit:
                        break
            return tuple(out)

        def load(params: Optional[Tuple] = ()):
            index = int(params[0])
            needle = str(params[1]).lower()
            track = self.song.tracks[index]
            # load_item acts on the SELECTED track, so selecting is not optional.
            self.song.view.selected_track = track
            for item in walk(browser().instruments):
                if needle in item.name.lower():
                    browser().load_item(item)
                    return (index, item.name, "loaded")
            return (index, str(params[1]), "not found")

        self.osc_server.add_handler("/live/browser/instruments", get_instruments)
        self.osc_server.add_handler("/live/browser/find", find)
        self.osc_server.add_handler("/live/browser/load", load)

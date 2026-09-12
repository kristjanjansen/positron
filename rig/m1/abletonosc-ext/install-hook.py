import sys, os
p = os.path.expanduser("~/Music/Ableton/User Library/Remote Scripts/AbletonOSC/abletonosc/view.py")
s = open(p).read()
MARK = "# --- positron: Live's browser"
if MARK in s:
    print("view.py already hooked")
    sys.exit(0)
s = s.rstrip() + '''

        ''' + MARK + ''', registered here because view.py is one
        # of the modules /live/api/reload actually reloads. manager.py is NOT
        # reloaded, so a handler added to its list needs a Live restart -- and
        # Live refuses AppleScript quit, which is the whole reason for this.
        try:
            import importlib
            from . import browser as _browser
            importlib.reload(_browser)
            _browser.register(self)
        except Exception:
            import logging, traceback
            logging.getLogger("abletonosc").warning(traceback.format_exc())
'''
open(p, "w").write(s)
print("view.py hooks the browser handlers")

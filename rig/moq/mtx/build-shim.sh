#!/bin/bash
# Bundle the §12 shim player + post-bundle patch:
# mediamtx 1.20.1 rejects ANY SUBSCRIBE parameter except AuthorizationToken
# ("unsupported parameter type: 16" = FORWARD 0x10) and closes the session —
# so strip @moq/net's v15+ SUBSCRIBE params (priority/order/forward/filter).
# draft-14 (CF bonus) uses fixed fields, not params -> unaffected.
set -e
cd /Users/s32863/personal/positron/rig/moq/spike
docker run --rm -v "$PWD":/s -w /s node:20-alpine sh -c \
  "npx --yes esbuild src/play-mtx.js --bundle --format=esm --outfile=www/play-mtx.js" 2>/dev/null
python3 - << 'PYEOF'
old = """          const params = new Parameters();
          params.subscriberPriority = this.subscriberPriority;
          params.groupOrder = GROUP_ORDER;
          params.forward = true;
          params.subscriptionFilter = 2;
          await params.encode(w, version2);"""
new = """          const params = new Parameters();
          // shim patch: mediamtx closes the session on any SUBSCRIBE param
          // other than AuthorizationToken; send zero params on v15+.
          await params.encode(w, version2);"""
p = "/Users/s32863/personal/positron/rig/moq/spike/www/play-mtx.js"
src = open(p).read()
assert src.count(old) == 1, "SUBSCRIBE params block not found exactly once - @moq/net changed?"
open(p, "w").write(src.replace(old, new))
print("patched: v15+ SUBSCRIBE params stripped")
PYEOF

#!/bin/bash
# Bundle the §12 shim player, then strip @moq/net's v15+ SUBSCRIBE params: mediamtx 1.20.1 accepts
# only AuthorizationToken and closes the session otherwise. draft-14 is unaffected.
# why: lessons/rig-moq.md#build-shim
set -e
cd "$(dirname "$0")/../spike"
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
p = "www/play-mtx.js"   # the cwd is rig/moq/spike
src = open(p).read()
assert src.count(old) == 1, "SUBSCRIBE params block not found exactly once - @moq/net changed?"
open(p, "w").write(src.replace(old, new))
print("patched: v15+ SUBSCRIBE params stripped")
PYEOF

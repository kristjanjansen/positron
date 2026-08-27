
## Building (no Docker, no native binary)

    cd proto/jam/moq && npm run build      # ~1 s, esbuild-wasm
    npm run check                          # verify www/ matches src/

The built bundles in `www/` are COMMITTED — you only need this when `src/`
changes. `esbuild-wasm` is a .wasm module run by node itself, so ThreatLocker
has no native binary to kill (that is why this is not vite/rollup, both of
which shell out to a native esbuild/rolldown binary).

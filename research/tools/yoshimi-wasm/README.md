# yoshimi-wasm measurement scripts (2026-10-13)

The scripts behind `research/yoshimi-wasm-2026-10-13.md`. They expect a working
directory laid out like this, which is what they were run in:

    bench/            zyn-bench.mjs zyn-sweep.mjs yosh-bench.cjs padmem.mjs
    jy/               git clone https://github.com/jariseon/yoshimi   (branch wam)
    zrel/             gh release download v0.2.0 -R gboddin/zynaddsubfx-wasm, plus unzip web.zip
    site/             zyn.html, morph.xml (gunzipped 0033-AddSynth Morph.xiz), z -> ../zrel, y -> ../jy/wam/dist
    runner.mjs        serves site/ and opens pages in headless Chrome, killed on every exit path

    node bench/zyn-bench.mjs  <xiz ...>      boot, patch load ms, % of one core for 1 and 8 voices
    node bench/yosh-bench.cjs <xiz ...>      the same against the 2019 Yoshimi build
    node bench/yosh-bench.cjs --sweep        every .xiz in jy/banks
    node bench/zyn-sweep.mjs                 the same for Zyn
    node bench/padmem.mjs                    PADsynth wavetable MiB per patch, from the XML
    node runner.mjs zyn.html y/test.html     both builds in a real AudioWorklet (copy yoshimi-test.html to jy/wam/dist/test.html)

Nothing is vendored here: the binaries and banks stay upstream.

# Max/MSP, RNBO, and what a collaborator's patch can reach

Asked 2026-09-24: a collaborator has Max experience, and we want to know how
their sketches could connect to a Cloudflare-hosted web thing, and whether we can
run and validate their patches here **without anyone buying a licence**.

🔴 **READ OFF VENDOR DOCUMENTATION ON 2026-09-24, NOT MEASURED HERE.** Nothing in
this file was run on this machine. Every claim carries its source, and anything
that could not be confirmed is marked **unverified** rather than smoothed over.
Licences and version numbers move; re-check before a plan is built on one.

---

## What RNBO is, because the name explains nothing

**RNBO is a second patching environment that lives inside Max, and its patches
can run where Max is not installed.** That is the whole idea.

An ordinary Max patch runs in Max, on a machine with Max on it, and nowhere
else. You put an `rnbo~` object in a patch, open it, and patch **inside** it;
what you build in there can then be EXPORTED and compiled to run somewhere else
entirely: a web page, an audio plugin, C++ source, a Raspberry Pi.

⚠️ **AND THAT IS THE CATCH, SO IT IS THE FIRST THING TO ESTABLISH WITH ANYBODY
BRINGING A PATCH.** RNBO is not a button that exports the Max patch you already
have. It is a different, smaller object set that you patch in deliberately.
**A sketch made of ordinary Max objects does not reach the web** until somebody
rebuilds it inside `rnbo~`. Which objects RNBO covers is **unverified** here and
is the single largest unknown in any plan that depends on this.

✅ **SO THE ONE QUESTION THAT SETTLES THE WHOLE PLAN IS: do you patch in RNBO, or
in ordinary Max objects?**

---

## 1. Running a patch without buying anything

✅ **THERE IS NO SEPARATE FREE RUNTIME ANY MORE, BECAUSE MAX ITSELF BECAME ONE.**
Cycling '74: *"With Max 7 and greater, you can run, edit and save Max patches for
the first 30 days. After 30 days, you can still run and edit Max patches, but you
cannot save your changes without purchasing a license."*
<https://support.cycling74.com/hc/en-us/articles/360049930694-Do-I-have-to-purchase-Max-to-open-and-use-a-patcher>

The downloads page says the same: *"Max is a fully functional demo for the first
30 days. No serial number or authorization required."* and *"Beginning with Max
version 7, you no longer need a separate runtime version."*
<https://cycling74.com/downloads/older>

Current release is **Max 9.1.5**, macOS Universal, free download.
<https://cycling74.com/downloads>

✅ **WHICH MEANS VALIDATING SOMEBODY ELSE'S SKETCH IS FREE AND HAS NO DEADLINE.**
You are not keeping your edits, so the thing that expires is the thing you do not
need. Requirements: macOS 11.0 or later, Apple Silicon or Intel.
<https://support.cycling74.com/hc/en-us/articles/360051184013-System-Requirements-for-Max>

⚠️ **UNVERIFIED: whether anything beyond SAVING is disabled after day 30.** No
Cycling '74 document enumerates it, and it matters for RNBO export, below.

---

## 2. 🔴 THERE IS NO COMMAND LINE, AND THAT IS THE FINDING THAT SHAPES EVERYTHING

**No documented headless mode, no `-nogui`, no CLI entry point.** The Max 9
object reference, the user guide and the support site carry nothing. The only
material is forum workarounds: launch by AppleScript, hide the window, run a Mac
Mini as a black box. <https://cycling74.com/forums/terminal-maxmsp>

⚠️ **This is absence of documentation rather than a documented refusal**, so it is
**unverified** as an official "no". `open -a Max patch.maxpat` starts the GUI
app, which is not headless.

🔴 **SO EVERY MAX-SIDE CHECK IS A PERSON AT A SCREEN**, which fits this project's
harness habits badly: no assert count, no `__demo`, nothing a CDP driver can
reach. **If automated grading matters, automate the exported WEB build in a
browser, never the patch in Max.**

---

## 3. The web path, which is the useful one

**RNBO ships inside the Max application from 8.5 onward and is licensed
separately.** The demo is the part that matters: *"This demo mode allows you to
create a rnbo~ object, open its RNBO patcher, edit its contents, and even export
to a variety of targets. However, without a valid RNBO license, you will be
unable to save your RNBO patcher. The RNBO demo has no expiration date."*
<https://support.cycling74.com/hc/en-us/articles/10208417899411-Is-there-a-RNBO-demo>

⚠️ **EXPORT NEEDS THE NETWORK.** *"RNBO requires an internet connection to export
to the following targets: Web, Audio Plugin, Max External."* Only C++ source
export works offline.
<https://support.cycling74.com/hc/en-us/articles/10500185155603-RNBO-Authorization>

🔴 **AND THE DEMO IS CONDITIONED ON AN AUTHORIZED MAX, WHICH AN EXPIRED TRIAL IS
NOT.** So if a web export matters, **do it inside the first 30 days**. Whether it
still works on day 31 is **unverified**, and finding out the hard way is the
expensive way.

**Prices, for the record and dated**: Max permanent EUR 399, annual EUR 129,
monthly EUR 13.99 (<https://cycling74.com/shop/max>). RNBO permanent EUR 299,
annual EUR 120, monthly EUR 12 (<https://cycling74.com/shop/rnbo>). RNBO is an
add-on requiring an active Max 8+ licence and is **not** included in one.

### What the export actually is

*"A single .json file that contains everything you need to run your patch in the
browser"*, compiled by a remote cloud compiler to WebAssembly. Each device
becomes an **AudioWorkletNode**, falling back to ScriptProcessorNode on older
browsers. Default filename `patch.export.json`, plus a media folder if the patch
uses samples.
<https://rnbo.cycling74.com/learn/the-web-export-target>
<https://rnbo.cycling74.com/learn/exporting-to-the-web-export-target>

✅ **IT HOSTS AS STATIC FILES ON A WORKER.** The runtime is `@rnbo/js`, **MIT
licensed, zero dependencies**, 1.4.5 published 2026-07-07. Cycling '74 serve it
from their own CDN with `access-control-allow-origin: *`, and being MIT it can be
self-hosted from the Worker instead, which is the right call here: one fewer
third party in the request path.

⚠️ **IT MUST BE SERVED OVER http(s), NEVER `file://`**, *"because the browser will
not enable WebAssembly or AudioWorklets for any page loaded with a file:// URL
scheme."* <https://rnbo.cycling74.com/learn/loading-a-rnbo-device-in-the-browser-js>

⚠️ **UNVERIFIED: whether it needs COOP/COEP cross-origin isolation.** The docs
mention only the http(s) requirement and say nothing about isolation headers.
Worth measuring rather than assuming, because it changes what the Worker has to
send.

### Driving it from ordinary JavaScript, which is the whole point

```js
const param = device.parametersById.get("my_param");
param.value = 1;
param.normalizedValue = 0.2;
param.changeEvent.subscribe((v) => {});
```
<https://rnbo.cycling74.com/learn/getting-and-setting-parameters-js>

Messages both ways, through inports and outports:

```js
const { TimeNow, MessageEvent } = require("@rnbo/js");
device.scheduleEvent(new MessageEvent(TimeNow, "dest", [75]));
device.messageEvent.subscribe((ev) => console.log(ev.tag, ev.payload));
```
<https://rnbo.cycling74.com/learn/sending-and-receiving-messages-inlets-outlets>

✅ **SO A DURABLE OBJECT PUSHING VALUES OVER A WEBSOCKET INTO `param.value` IS AN
ORDINARY BUILD** with nothing exotic in it, and it is the same arrangement this
repository already uses for a board in another building.

⚠️ **ONE TRAP IN THE OFFICIAL TEMPLATE.** `Cycling74/rnbo.example.webpage` was
last pushed 2023-02-22 and its HTML declares `rnbo-version 1.0.0-alpha.5` against
a current engine of 1.4.5, while the docs warn that *"version mismatches between
your exported patch and the library version can cause problems."*
<https://rnbo.cycling74.com/learn/using-the-web-page-template>

### The licence, which is unusually friendly to R&D

Exported code is dual licensed under the Cycling '74 License for Max-Generated
Code or GPLv3, and the engine source is MIT. Non-commercial use is granted
outright: *"free to use this software for educational, research, and prototyping
purposes"*, and entities under $200k annual revenue or funding *"do not need to
contact Cycling '74 ... and you do not have to pay any fees"*. Sharing exported
web binaries is permitted for noncommercial use.
<https://support.cycling74.com/hc/en-us/articles/10730637742483-RNBO-Export-Licensing-FAQ>

---

## 4. Talking to a Worker from Max itself

✅ **NODE FOR MAX IS BUNDLED AND CURRENT.** Max 9.1.0 release notes: *"Node for
Max: v3.0.3 (bundles Node v22.18)"*. <https://cycling74.com/releases/max/9.1.0>

`node.script` *"controls a local Node.js process from Max"*, separate process,
npm integration, `autostart`, `watch`, stdin, asynchronous messaging, and scripts
reach Max through `require("max-api")`.
<https://docs.cycling74.com/reference/node.script>

🔴 **SO `npm install ws` AND AN OUTBOUND WEBSOCKET TO A WORKER IS ORDINARY NODE**,
and it is the path with the most documentation behind it.
⚠️ **UNVERIFIED: any documented network limits.** None were found, which is not
the same as there being none.

🔴 **MAX HAS NO NATIVE WEBSOCKET OBJECT**, which is my reading of the reference
index rather than a Cycling '74 statement, so **unverified** as an official
claim. The forum record is consistent with it. What Max does ship:

| object | what it is | source |
| --- | --- | --- |
| `udpsend` / `udpreceive` | Max messages serialised as OSC-compatible UDP packets | <https://docs.cycling74.com/reference/udpsend/> |
| `maxurl` | a libcurl wrapper for HTTP requests. One-shot, not a socket | <https://docs.cycling74.com/reference/maxurl/> |
| `jweb` | an embedded Chromium (CEF 135 in 9.1.0) hosting a page that can message the patch, and can hold a socket like any browser page | <https://docs.cycling74.com/reference/jweb/> |

The in-Max `v8` engine gained an XMLHttpRequest implementation in 9.1.0, but the
JavaScript user guide documents no `fetch`, no `WebSocket`, no DOM and no
`setTimeout`. <https://docs.cycling74.com/userguide/javascript/>

✅ **THE TWO TO BUILD ARE `node.script` WITH `ws`, OR OSC OVER `udpsend` INTO A
SMALL NODE BRIDGE THAT HOLDS THE SOCKET.** The second is the more conventional
shape in the Max world and is the same arrangement `rig/` already uses.

---

## 5. Pure Data, and why it does not rescue the CLI problem

✅ **FREE, BSD, AND GENUINELY HEADLESS.** Vanilla 0.56-5, macOS build at
<https://msp.ucsd.edu/Software/pd-0.56-5.macos.zip>. The manual documents
`pd [flags] [patches]` with `-nogui`, `-stderr`, `-send` (send a message once
patches have loaded), `-open`, `-noaudio`, `-batch`, `-r`, `-audiobuf`.
<https://msp.ucsd.edu/Pd_documentation/3.installing.configuring.htm>

That combination is exactly the shape this project's harnesses want: launch, send
a message in, read stderr, exit. OSC is in vanilla via `oscformat` and
`oscparse`. WebSockets: **no maintained external confirmed, unverified**, so
assume OSC plus a bridge.

🔴 **AND IT IS NO USE FOR VALIDATING A MAX PATCH.** `.maxpat` is JSON and Pd's
format is not. A converter exists (<https://github.com/tmhglnd/max-pd-converter>)
whose own README says abstractions and externals are unsupported and output may
carry syntax errors needing manual repair. **For anything with UI objects or MSP
specifics that is a rewrite, not an import.** Pd is the right tool only if
somebody decides to reimplement from scratch.

---

## 6. What this means, bluntly

✅ **POSSIBLE, FOR NOTHING:**
1. **Run and edit their patch, indefinitely.** Saving is the only thing that
   stops, and we are not keeping edits.
2. **Export to the web with no RNBO purchase, IF it is an RNBO patch.** Demo mode
   never expires and permits export. Needs an authorized Max, so inside 30 days.
3. **Host the result on a Worker.** One `patch.export.json`, `rnbo.min.js`
   self-hosted, a page. Static.
4. **Drive a Worker from Max**, `node.script` with `ws` on bundled Node 22.18, or
   OSC into a Node bridge.

🔴 **NOT POSSIBLE:**
1. **No headless Max, so no automated validation of a patch.** Automate the web
   export in a browser instead.
2. **A plain Max patch does not reach the web.** Only what is built inside
   `rnbo~`. **Ask the collaborator this first.**
3. **Pd will not open a Max patch.** Free and headless and irrelevant here.
4. **Day 31 RNBO export is unverified.** Treat the trial window as the deadline.

⚠️ **AND INSTALLING ANY OF IT IS A DECISION ABOUT A MANAGED LAPTOP**, where
locally compiled binaries are killed on sight. Max is a signed vendor installer
and therefore a different risk class from a compiled binary, but it is still an
install and it is the owner's call, not an agent's.

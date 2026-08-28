#!/usr/bin/env python3
"""python-osc side of the interop matrix. Reads {cases, bundles} JSON on stdin,
writes {rows} JSON on stdout. Both directions:
  ours->theirs   python-osc's OscMessage/OscBundle parses OUR bytes
  theirs->ours   python-osc builds the same message; we compare BYTES.
A case python-osc cannot express is reported `unsupported` with the exception —
that is a finding about python-osc's coverage, not a hole in the harness."""
import json, sys, binascii

from pythonosc.osc_message import OscMessage
from pythonosc.osc_message_builder import OscMessageBuilder
from pythonosc.osc_bundle import OscBundle
from pythonosc.osc_bundle_builder import OscBundleBuilder, IMMEDIATELY
from pythonosc.parsing import osc_types

rows = []


def rec(direction, shape, case, verdict, detail=None):
    rows.append({"direction": direction, "shape": shape, "case": case,
                 "verdict": verdict, "detail": detail or {}})


def build_arg(t, v):
    """map a corpus arg to what OscMessageBuilder wants for typetag `t`."""
    if t == "b":
        return bytes(v)
    if t == "h":
        return int(v["big"]) if isinstance(v, dict) else int(v)
    if t == "m":
        return bytes(v)
    if t == "r":
        return bytes(v)
    if t == "c":
        return v
    if t == "t":
        # python-osc timetags are float seconds since the UNIX epoch
        return (v["seconds"] - 2208988800) + v["fraction"] / 2 ** 32
    return v


data = json.load(sys.stdin)

for c in data["cases"]:
    ours = binascii.unhexlify(c["ourHex"])
    # ---- OURS -> THEIRS -----------------------------------------------
    try:
        m = OscMessage(ours)
        got_types = "".join(m.dgram[m.dgram.index(b",") + 1:].split(b"\x00")[0].decode("ascii"))
        ok = m.address == c["address"]
        rec("ours->theirs", "message", c["id"], "pass" if ok else "mismatch",
            {} if ok else {"got": m.address, "want": c["address"], "gotTypes": got_types})
    except Exception as e:
        rec("ours->theirs", "message", c["id"], "error",
            {"error": f"{type(e).__name__}: {e}", "ourHex": c["ourHex"]})

    # ---- THEIRS -> OURS (byte compare) --------------------------------
    try:
        b = OscMessageBuilder(address=c["address"])
        for i, t in enumerate(c["types"]):
            if t in "TFNI":
                # python-osc infers these from the VALUE, and has no way to say
                # "encode nil" other than passing None.
                b.add_arg({"T": True, "F": False, "N": None, "I": None}[t],
                          {"T": b.ARG_TYPE_TRUE, "F": b.ARG_TYPE_FALSE,
                           "N": b.ARG_TYPE_NIL, "I": "I"}.get(t))
            else:
                b.add_arg(build_arg(t, c["args"][i]), t)
        theirs = b.build().dgram
        their_hex = binascii.hexlify(theirs).decode()
        same = their_hex == c["ourHex"]
        rec("theirs->ours", "message", c["id"],
            "byte-identical" if same else "decodes-differs",
            {} if same else {"ourHex": c["ourHex"], "theirHex": their_hex})
    except Exception as e:
        rec("theirs->ours", "message", c["id"], "unsupported",
            {"error": f"{type(e).__name__}: {e}"})

for bc in data["bundles"]:
    ours = binascii.unhexlify(bc["ourHex"])
    try:
        bun = OscBundle(ours)
        n = bun.num_contents
        ok = n == bc["n"]
        rec("ours->theirs", "bundle", bc["id"], "pass" if ok else "mismatch",
            {} if ok else {"got": n, "want": bc["n"]})
    except Exception as e:
        rec("ours->theirs", "bundle", bc["id"], "error",
            {"error": f"{type(e).__name__}: {e}", "ourHex": bc["ourHex"]})

# python-osc bundle BUILD, immediate only (its builder takes a float timestamp)
try:
    bb = OscBundleBuilder(IMMEDIATELY)
    m1 = OscMessageBuilder(address="/a"); m1.add_arg(1, "i"); bb.add_content(m1.build())
    m2 = OscMessageBuilder(address="/b"); m2.add_arg(2.0, "f"); bb.add_content(m2.build())
    rec("theirs->ours", "bundle", "bundle-immediate-2", "built",
        {"theirHex": binascii.hexlify(bb.build().dgram).decode()})
except Exception as e:
    rec("theirs->ours", "bundle", "bundle-immediate-2", "unsupported",
        {"error": f"{type(e).__name__}: {e}"})

json.dump({"rows": rows}, sys.stdout)

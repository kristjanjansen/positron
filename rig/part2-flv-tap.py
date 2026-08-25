#!/usr/bin/env python3
"""FLV-over-TCP tap: timestamps when each tag's bytes ARRIVE from the encoder's muxer.

Listens on a port, accepts connections in a loop (encoder restarts = new conn),
parses the FLV stream, writes one JSONL row per tag:
    {conn, t, dts, type, size, key}
t = wall clock (time.time()) of the recv() that completed the tag.
dts = FLV tag timestamp in ms. type = 'v'/'a'/'s'. key = video keyframe flag.

Usage: part2-flv-tap.py PORT out.jsonl
"""
import sys, socket, time, json

PORT = int(sys.argv[1])
out = open(sys.argv[2], 'a')

srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(('127.0.0.1', PORT))
srv.listen(1)
print(f'tap listening on 127.0.0.1:{PORT}', flush=True)

conn_id = 0
while True:
    c, addr = srv.accept()
    conn_id += 1
    print(f'[conn {conn_id}] accepted', flush=True)
    buf = bytearray()
    pos = 0           # parse cursor into buf
    state = 'hdr'     # 'hdr' -> flv header+prevtag0 (13 bytes), then tags
    n_tags = 0
    try:
        while True:
            chunk = c.recv(65536)
            t = time.time()
            if not chunk:
                break
            buf += chunk
            # parse as far as possible; every completed tag gets THIS chunk's t
            while True:
                if state == 'hdr':
                    if len(buf) - pos < 13:
                        break
                    if buf[pos:pos+3] != b'FLV':
                        print(f'[conn {conn_id}] not FLV, closing', flush=True)
                        raise ValueError('not flv')
                    pos += 13
                    state = 'tag'
                else:
                    if len(buf) - pos < 11:
                        break
                    typ = buf[pos]
                    size = int.from_bytes(buf[pos+1:pos+4], 'big')
                    ts = int.from_bytes(buf[pos+4:pos+7], 'big') | (buf[pos+7] << 24)
                    need = 11 + size + 4
                    if len(buf) - pos < need:
                        break
                    data0 = buf[pos+11] if size else 0
                    tname = {8: 'a', 9: 'v', 18: 's'}.get(typ, str(typ))
                    key = ((data0 >> 4) & 0xF) == 1 if typ == 9 else None
                    out.write(json.dumps(dict(conn=conn_id, t=round(t, 4), dts=ts,
                                              type=tname, size=size, key=key)) + '\n')
                    n_tags += 1
                    pos += need
                # compact buffer occasionally
                if pos > 1 << 20:
                    del buf[:pos]
                    pos = 0
            out.flush()
    except (ValueError, OSError) as e:
        print(f'[conn {conn_id}] error: {e}', flush=True)
    finally:
        c.close()
        out.flush()
        print(f'[conn {conn_id}] closed after {n_tags} tags', flush=True)

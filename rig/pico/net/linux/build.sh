#!/bin/sh
# rig/pico/net/linux/build.sh: runs INSIDE the positron-pico-net image, never on
# the Mac. Compiles mbedTLS (the SDK's submodule, our config) and the node into
# /out/<name>. test.mjs calls it; extra CFLAGS select a variant, e.g.
#   build.sh node-linux-in4k -DPOSITRON_TLS_IN=4096
set -e
NAME=${1:-node-linux}; [ $# -gt 0 ] && shift
EXTRA="$*"
MB=/opt/pico-sdk/lib/mbedtls
SRC=/src
OBJ=/tmp/obj-$NAME
mkdir -p "$OBJ" /out
CFLAGS="-std=gnu11 -O2 -DPOSITRON_HOST -DMBEDTLS_CONFIG_FILE=\"positron_mbedtls_config.h\" -I$SRC -I$MB/include -I$MB/library $EXTRA"
export CFLAGS OBJ
ls $MB/library/*.c | xargs -P 12 -I{} sh -c 'gcc $CFLAGS -w -c {} -o $OBJ/$(basename {} .c).o'
W="-Wall -Wextra -Werror -Wshadow"
gcc $CFLAGS $W -c $SRC/ws.c -o $OBJ/z_ws.o
gcc $CFLAGS $W -c $SRC/node.c -o $OBJ/z_node.o
gcc $CFLAGS $W -c $SRC/linux/main.c -o $OBJ/z_main.o
gcc -o /out/$NAME $OBJ/*.o
echo "built /out/$NAME ($EXTRA)"

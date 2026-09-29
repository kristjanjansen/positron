#!/bin/zsh
cd ~/positron-rack/bin
rm -f /tmp/t2.raw /tmp/t2.log
./audiotap Live > /tmp/t2.raw 2> /tmp/t2.log &
sleep 2
( printf "on 60 110\non 64 100\non 67 100\n"; sleep 4; printf "off 60\noff 64\noff 67\n"; sleep 0.5 ) | ./midisend IAC >/dev/null 2>&1
sleep 1
pkill -x audiotap
echo DONE >> /tmp/t2.log

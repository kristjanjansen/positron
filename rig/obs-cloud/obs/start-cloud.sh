#!/bin/bash
# CF Firecracker guests mount NO /dev/shm (only a 6G tmpfs on /dev) — CEF then
# dies FATAL "incorrect permissions on /dev/shm" (SIGTRAP) as soon as a browser
# source spawns, and OBS crash-loops. /dev is tmpfs, so a 1777 directory there
# gives POSIX shm a working home. Runs as root, then hands off to supervisord
# (PID 1 stays supervisord -> SIGTERM from stop()/rollouts is honored).
mkdir -p /dev/shm
chmod 1777 /dev/shm
exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf

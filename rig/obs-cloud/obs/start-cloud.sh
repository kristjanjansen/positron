#!/bin/bash
# Firecracker guests have no /dev/shm and CEF dies without it, so make a 1777 one on /dev's tmpfs.
# Then exec supervisord as PID 1, which honours SIGTERM.
# why: lessons/rig-obs.md#start-cloud
mkdir -p /dev/shm
chmod 1777 /dev/shm
exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf

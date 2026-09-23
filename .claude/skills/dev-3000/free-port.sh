#!/usr/bin/env bash
# Frees a TCP port (default 3000): SIGTERM whatever is listening, SIGKILL after 5s if still alive.
set -u
PORT="${1:-3000}"

pids=$(lsof -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | sort -u)
if [ -z "$pids" ]; then
  echo "Port $PORT is free."
  exit 0
fi

echo "Port $PORT is in use by:"
ps -o pid=,user=,args= -p $pids 2>/dev/null
kill $pids 2>/dev/null

for _ in $(seq 1 10); do
  sleep 0.5
  lsof -t -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || { echo "Port $PORT freed."; exit 0; }
done

echo "Still listening after SIGTERM; sending SIGKILL."
kill -9 $pids 2>/dev/null
sleep 0.5
if lsof -t -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERROR: could not free port $PORT (process may belong to another user; try sudo)." >&2
  exit 1
fi
echo "Port $PORT freed."

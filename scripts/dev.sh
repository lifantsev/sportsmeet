#!/usr/bin/env bash
set -euo pipefail

# Resolve paths relative to this file, regardless of where you run it from.
cd "$(dirname "$0")/.."

for folder in client server; do
  if [ ! -d "$folder/node_modules" ]; then
    echo "Missing dependencies. Run: npm --prefix $folder install"
    exit 1
  fi
done

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  echo "Created server/.env using the local database defaults."
fi

server_pid=''
client_pid=''
cleanup() {
  trap - EXIT INT TERM
  [ -z "$server_pid" ] || kill "$server_pid" 2>/dev/null || true
  [ -z "$client_pid" ] || kill "$client_pid" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Run the underlying commands directly so cleanup targets the actual servers.
(cd server && exec node --env-file-if-exists=.env --watch index.js) &
server_pid=$!
(cd client && exec node node_modules/vite/bin/vite.js --port 5173 --strictPort) &
client_pid=$!

echo "Open http://localhost:5173 — press Ctrl+C to stop both servers."
echo "PostgreSQL must be running. Existing database contents are preserved."

while kill -0 "$server_pid" 2>/dev/null && kill -0 "$client_pid" 2>/dev/null; do
  sleep 1
done
echo "A server stopped; shutting down the other server."
exit 1

#!/usr/bin/env bash
#
# Run the protocol integration test suite against a Starfish server.
#
# Usage:
#   ./scripts/run-integration-tests.sh <server-type>
#
# Supported server types: golang
#
# The script builds the server, starts it on a random port, runs the
# integration tests, and tears everything down regardless of outcome.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_TYPE="${1:?Usage: $0 <server-type>}"
PORT="${STARFISH_TEST_PORT:-0}"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Pick a random available port if not specified
pick_port() {
  python3 -c 'import socket; s=socket.socket(); s.bind(("",0)); print(s.getsockname()[1]); s.close()'
}

wait_for_server() {
  local port=$1
  local max_attempts=30
  for i in $(seq 1 $max_attempts); do
    if nc -z localhost "$port" 2>/dev/null; then
      return 0
    fi
    sleep 0.2
  done
  echo "Error: server did not start on port $port within ${max_attempts} attempts" >&2
  return 1
}

start_golang() {
  local port=$1
  echo "Building Go server..."
  (cd "$ROOT_DIR/servers/golang" && go build -o "$ROOT_DIR/.build/starfish-golang" .)
  echo "Starting Go server on port $port..."
  "$ROOT_DIR/.build/starfish-golang" -addr ":$port" &
  SERVER_PID=$!
  wait_for_server "$port"
}

# --- Main ---

if [[ "$PORT" -eq 0 ]]; then
  PORT=$(pick_port)
fi

mkdir -p "$ROOT_DIR/.build"

case "$SERVER_TYPE" in
  golang)
    start_golang "$PORT"
    ;;
  # Future server types go here:
  # python)
  #   start_python "$PORT"
  #   ;;
  # typescript)
  #   start_typescript "$PORT"
  #   ;;
  *)
    echo "Unknown server type: $SERVER_TYPE" >&2
    echo "Supported types: golang" >&2
    exit 1
    ;;
esac

echo "Running integration tests against $SERVER_TYPE server on port $PORT..."
cd "$ROOT_DIR/tests/integration"

# Install deps if needed
if [[ ! -d node_modules ]]; then
  npm install --silent
fi

STARFISH_SERVER_URL="ws://localhost:$PORT/starfish" npx vitest run --reporter=verbose

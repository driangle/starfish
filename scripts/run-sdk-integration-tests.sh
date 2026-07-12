#!/usr/bin/env bash
#
# Run an SDK's integration test suite against a Starfish server.
#
# Usage:
#   ./scripts/run-sdk-integration-tests.sh <sdk-type> <server-type>
#
# Example:
#   ./scripts/run-sdk-integration-tests.sh typescript golang
#
# The script builds the server, starts it on a random port, runs the
# SDK's integration tests, and tears everything down regardless of outcome.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SDK_TYPE="${1:?Usage: $0 <sdk-type> <server-type>}"
SERVER_TYPE="${2:?Usage: $0 <sdk-type> <server-type>}"
PORT="${STARFISH_TEST_PORT:-0}"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

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

# --- Server starters ---

start_golang() {
  local port=$1
  echo "Building Go server..."
  (cd "$ROOT_DIR/servers/golang" && go build -o "$ROOT_DIR/.build/starfish-golang" .)
  echo "Starting Go server on port $port..."
  "$ROOT_DIR/.build/starfish-golang" -addr ":$port" &
  SERVER_PID=$!
  wait_for_server "$port"
}

start_typescript() {
  local port=$1
  echo "Building TypeScript server..."
  (cd "$ROOT_DIR/servers/typescript" && npm install --silent 2>/dev/null && npm run build)
  echo "Starting TypeScript server on port $port..."
  node "$ROOT_DIR/servers/typescript/dist/main.js" --port "$port" &
  SERVER_PID=$!
  wait_for_server "$port"
}

# --- SDK test runners ---

run_sdk_typescript() {
  local port=$1
  echo "Running TypeScript SDK integration tests..."
  cd "$ROOT_DIR/sdks/typescript"

  if [[ ! -d node_modules ]]; then
    npm install --silent
  fi

  STARFISH_SERVER_URL="ws://localhost:$port/starfish" npx vitest run --config integration/vitest.config.ts --reporter=verbose
}

run_sdk_python() {
  local port=$1
  echo "Running Python SDK integration tests..."
  cd "$ROOT_DIR/sdks/python"

  pip install -e ".[dev]" --quiet 2>/dev/null

  STARFISH_SERVER_URL="ws://localhost:$port/starfish" pytest integration/ -v
}

# --- Main ---

if [[ "$PORT" -eq 0 ]]; then
  PORT=$(pick_port)
fi

mkdir -p "$ROOT_DIR/.build"

# Start server
case "$SERVER_TYPE" in
  golang)
    start_golang "$PORT"
    ;;
  typescript)
    start_typescript "$PORT"
    ;;
  *)
    echo "Unknown server type: $SERVER_TYPE" >&2
    echo "Supported server types: golang, typescript" >&2
    exit 1
    ;;
esac

# Run SDK tests
case "$SDK_TYPE" in
  typescript)
    run_sdk_typescript "$PORT"
    ;;
  python)
    run_sdk_python "$PORT"
    ;;
  *)
    echo "Unknown SDK type: $SDK_TYPE" >&2
    echo "Supported SDK types: typescript, python" >&2
    exit 1
    ;;
esac

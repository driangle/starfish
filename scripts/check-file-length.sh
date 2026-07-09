#!/usr/bin/env bash
# Check that source files don't exceed a maximum line count.
# Usage: check-file-length.sh <directory> [--source-max N] [--test-max N]
#
# Defaults: 200 lines for source files, 500 for test files.
# Test files are detected by suffix: _test.go, .test.ts, .spec.ts

set -euo pipefail

dir="${1:-.}"
source_max=200
test_max=500

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-max) source_max="$2"; shift 2 ;;
    --test-max)   test_max="$2";   shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

violations=0

while IFS= read -r -d '' file; do
  lines=$(wc -l < "$file")

  # Determine if this is a test file
  is_test=false
  case "$file" in
    *_test.go|*.test.ts|*.spec.ts) is_test=true ;;
  esac

  if $is_test; then
    max=$test_max
  else
    max=$source_max
  fi

  if (( lines > max )); then
    echo "FAIL: $file has $lines lines (max $max)"
    violations=$((violations + 1))
  fi
done < <(find "$dir" -type f \( -name '*.go' -o -name '*.ts' \) \
  -not -path '*/vendor/*' \
  -not -path '*/node_modules/*' \
  -not -path '*/dist/*' \
  -not -path '*/.build/*' \
  -print0)

if (( violations > 0 )); then
  echo ""
  echo "$violations file(s) exceed the line limit."
  exit 1
fi

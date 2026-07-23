#!/usr/bin/env bash
# Run all lesson-generator tests: unit (node) + e2e (agent-browser).
set -u
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$DIR"

echo "### unit ###"
node scripts/tests/test-unit.mjs || exit 1
echo
echo "### e2e ###"
bash scripts/tests/test-e2e.sh || exit 1
echo
echo "all tests passed"

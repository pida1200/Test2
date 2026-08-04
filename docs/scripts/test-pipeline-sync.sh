#!/usr/bin/env bash
# Unit tests for pipeline-sync-lib (marker replace, history, blocked, concurrency mock).
set -euo pipefail
cd "$(dirname "$0")/../.."
node docs/scripts/test-pipeline-sync.cjs

#!/usr/bin/env bash
# Spustí testy/lint examples/backend; skip jen když projekt chybí.
set -euo pipefail
if [ ! -f examples/backend/package.json ]; then
  echo "[check] examples/backend not present - skipped"
  exit 0
fi
npm --prefix examples/backend test
npm --prefix examples/backend run lint

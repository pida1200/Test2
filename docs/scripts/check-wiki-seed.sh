#!/usr/bin/env bash
# Offline check: docs/wiki/ seed structure (ASCII paths).
# Exit 0 = all required files exist and have a # heading; 1 = MISSING or EMPTY.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WIKI="${ROOT}/docs/wiki"

REQUIRED=(
  "Home.md"
  "_Sidebar.md"
  "aplikacni/prehled.md"
  "aplikacni/moduly.md"
  "aplikacni/uzivatelske-scenare.md"
  "provozni/prehled.md"
  "provozni/deploy.md"
  "provozni/konfigurace.md"
  "provozni/monitoring.md"
  "zmeny/index.md"
  "zmeny/_sablona-zmeny.md"
)

errors=0

for rel in "${REQUIRED[@]}"; do
  path="${WIKI}/${rel}"
  if [[ ! -f "${path}" ]]; then
    echo "MISSING: docs/wiki/${rel}"
    errors=$((errors + 1))
    continue
  fi
  if [[ ! -s "${path}" ]] || ! grep -q '^#' "${path}"; then
    echo "EMPTY: docs/wiki/${rel}"
    errors=$((errors + 1))
  fi
done

if [[ "${errors}" -gt 0 ]]; then
  exit 1
fi

count="${#REQUIRED[@]}"
echo "OK: wiki seed (${count} souborů)"
exit 0

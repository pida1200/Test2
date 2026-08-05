#!/usr/bin/env bash
# Negativní + happy-path testy pro check-wiki-seed.sh (offline, bez sítě).
# Použití: bash docs/scripts/test-check-wiki-seed.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHECK="${ROOT}/docs/scripts/check-wiki-seed.sh"
WIKI="${ROOT}/docs/wiki"
TARGET="${WIKI}/Home.md"

cleanup() {
  if [[ -n "${backup:-}" && -f "${backup}" ]]; then
    mv -f "${backup}" "${TARGET}"
  fi
  if [[ -n "${empty_backup:-}" && -f "${empty_backup}" ]]; then
    mv -f "${empty_backup}" "${empty_target}"
  fi
}
trap cleanup EXIT

run_check() {
  bash "${CHECK}" 2>&1
}

assert_exit() {
  local expected="$1"
  local label="$2"
  set +e
  local out exit_code
  out="$(run_check)"
  exit_code=$?
  set -e
  if [[ "${exit_code}" -ne "${expected}" ]]; then
    echo "FAIL  ${label}: exit ${exit_code}, expected ${expected}"
    echo "${out}"
    exit 1
  fi
  echo "${out}"
  echo "OK    ${label}: exit ${exit_code}"
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if [[ "${haystack}" != *"${needle}"* ]]; then
    echo "FAIL  ${label}: output missing '${needle}'"
    echo "${haystack}"
    exit 1
  fi
  echo "OK    ${label}: output contains '${needle}'"
}

# 1) Happy path
out="$(assert_exit 0 "happy path")"
assert_contains "${out}" "OK: wiki seed" "happy path message"

# 2) MISSING — dočasně přesunout povinný soubor
backup="$(mktemp)"
mv "${TARGET}" "${backup}"
out="$(assert_exit 1 "MISSING Home.md")"
assert_contains "${out}" "MISSING: docs/wiki/Home.md" "MISSING message"
mv "${backup}" "${TARGET}"
backup=""

# 3) EMPTY — dočasně prázdný soubor bez nadpisu
empty_target="${WIKI}/zmeny/index.md"
empty_backup="$(mktemp)"
cp "${empty_target}" "${empty_backup}"
: > "${empty_target}"
out="$(assert_exit 1 "EMPTY zmeny/index.md")"
assert_contains "${out}" "EMPTY: docs/wiki/zmeny/index.md" "EMPTY message"
mv "${empty_backup}" "${empty_target}"
empty_backup=""

echo "check-wiki-seed negative tests passed."

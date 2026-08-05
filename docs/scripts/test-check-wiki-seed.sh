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
  if [[ -n "${inject_file:-}" && -f "${inject_file}" ]]; then
    rm -f "${inject_file}"
  fi
  if [[ -n "${sidebar_backup:-}" && -f "${sidebar_backup}" ]]; then
    mv -f "${sidebar_backup}" "${WIKI}/_Sidebar.md"
  fi
  rm -rf "${WIKI}/_dup_a" "${WIKI}/_dup_b" 2>/dev/null || true
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
empty_target="${WIKI}/zmeny-index.md"
empty_backup="$(mktemp)"
cp "${empty_target}" "${empty_backup}"
: > "${empty_target}"
out="$(assert_exit 1 "EMPTY zmeny-index.md")"
assert_contains "${out}" "EMPTY: docs/wiki/zmeny-index.md" "EMPTY message"
mv "${empty_backup}" "${empty_target}"
empty_backup=""

# 4) BROKEN LINK
sidebar_backup="$(mktemp)"
cp "${WIKI}/_Sidebar.md" "${sidebar_backup}"
printf '\n- [Ghost](neexistuje-stranka)\n' >> "${WIKI}/_Sidebar.md"
out="$(assert_exit 1 "BROKEN LINK")"
assert_contains "${out}" "BROKEN LINK:" "BROKEN LINK message"
mv "${sidebar_backup}" "${WIKI}/_Sidebar.md"
sidebar_backup=""

# 5) BAD LINK FORM (slash)
sidebar_backup="$(mktemp)"
cp "${WIKI}/_Sidebar.md" "${sidebar_backup}"
printf '\n- [Bad](aplikacni/prehled)\n' >> "${WIKI}/_Sidebar.md"
out="$(assert_exit 1 "BAD LINK FORM slash")"
assert_contains "${out}" "BAD LINK FORM:" "BAD LINK FORM message"
mv "${sidebar_backup}" "${WIKI}/_Sidebar.md"
sidebar_backup=""

# 6) DUPLICATE PAGE — stejný basename ve dvou nested cestách (macOS FS je case-insensitive)
nested_dir="${WIKI}/_dup_a"
mkdir -p "${WIKI}/_dup_a" "${WIKI}/_dup_b"
printf '# A\n' > "${WIKI}/_dup_a/collide.md"
printf '# B\n' > "${WIKI}/_dup_b/collide.md"
out="$(assert_exit 1 "DUPLICATE PAGE")"
assert_contains "${out}" "DUPLICATE PAGE:" "DUPLICATE PAGE message"
assert_contains "${out}" "NESTED PAGE:" "NESTED also reported"
rm -rf "${WIKI}/_dup_a" "${WIKI}/_dup_b"
nested_dir=""

# 7) ORPHAN
inject_file="${WIKI}/orphan-test-page.md"
printf '# Orphan test\n\nText.\n' > "${inject_file}"
out="$(assert_exit 1 "ORPHAN")"
assert_contains "${out}" "ORPHAN: docs/wiki/orphan-test-page.md" "ORPHAN message"
rm -f "${inject_file}"
inject_file=""

echo "check-wiki-seed negative tests passed."

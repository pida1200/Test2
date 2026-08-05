#!/usr/bin/env bash
# Offline testy pro ma-run-role.sh (bez sítě, bez nutnosti nainstalovaného cursor-agent).
# Použití: bash docs/scripts/test-ma-run-role.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="${ROOT}/docs/scripts/ma-run-role.sh"

run() {
  bash "${SCRIPT}" "$@" 2>&1
}

assert_exit() {
  local expected="$1"
  local label="$2"
  shift 2
  set +e
  local out exit_code
  out="$(run "$@")"
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

assert_not_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if [[ "${haystack}" == *"${needle}"* ]]; then
    echo "FAIL  ${label}: output unexpectedly contains '${needle}'"
    echo "${haystack}"
    exit 1
  fi
  echo "OK    ${label}: output does not contain '${needle}'"
}

# 1) --help → exit 0, obsahuje seznam rolí a exit kódy
out="$(assert_exit 0 "--help" --help)"
assert_contains "${out}" "Role (whitelist):" "help lists roles"
assert_contains "${out}" "Exit kódy:" "help lists exit codes"

# 2) --dry-run → exit 0 i BEZ binárky (CURSOR_AGENT_BIN nesmyslná cesta), obsahuje ROLE: i --model
out="$(CURSOR_AGENT_BIN=/nonexistent/cursor-agent assert_exit 0 "--dry-run bez binárky" \
  --role analytik --pipeline 83 --model claude-opus-5-thinking-high --dry-run)"
assert_contains "${out}" "ROLE: Analytik" "dry-run obsahuje ROLE:"
assert_contains "${out}" "--model claude-opus-5-thinking-high" "dry-run obsahuje --model"
assert_contains "${out}" "PIPELINE: #83" "dry-run obsahuje PIPELINE"

# 3) chybí --model → exit 2, usage
out="$(assert_exit 2 "chybí --model" --role vyvojar --pipeline 83)"
assert_contains "${out}" "Chybí povinný parametr --model" "missing --model message"

# 4) chybí --pipeline → exit 2
out="$(assert_exit 2 "chybí --pipeline" --role vyvojar --model composer-2.5-fast)"
assert_contains "${out}" "Chybí povinný parametr --pipeline" "missing --pipeline message"

# 5) neznámá role → exit 2
out="$(assert_exit 2 "neznámá role" --role neexistuje --pipeline 83 --model composer-2.5-fast)"
assert_contains "${out}" "Neznámá role: neexistuje" "unknown role message"

# 6) CURSOR_AGENT_BIN=/nonexistent → exit 3, stdout obsahuje prompt + fallback větu
out="$(CURSOR_AGENT_BIN=/nonexistent assert_exit 3 "CLI chybí" \
  --role tester --pipeline 83 --model composer-2.5-fast)"
assert_contains "${out}" "Spusť roli přes Cursor Task" "CLI missing fallback sentence"
assert_contains "${out}" "ROLE: Tester" "CLI missing output contains prompt"

# 7) role, která nesmí zapisovat → bez --write se nepředává --force
out="$(CURSOR_AGENT_BIN=/nonexistent assert_exit 0 "role bez zápisu (dry-run)" \
  --role analytik --pipeline 83 --model claude-opus-5-thinking-high --dry-run)"
assert_not_contains "${out}" "--force" "no --force without --write"

# 8) --write → mapuje na --force
out="$(CURSOR_AGENT_BIN=/nonexistent assert_exit 0 "--write → --force (dry-run)" \
  --role vyvojar --pipeline 83 --model composer-2.5-fast --write --dry-run)"
assert_contains "${out}" "--force" "--write maps to --force"

# 9) --print-prompt → jen prompt (bez řádku PŘÍKAZ:)
out="$(CURSOR_AGENT_BIN=/nonexistent assert_exit 0 "--print-prompt" \
  --role kontrolor-v --pipeline 83 --model gpt-5.6-sol-medium --print-prompt)"
assert_contains "${out}" "ROLE: Kontrolor vývojáře" "print-prompt obsahuje ROLE"
assert_not_contains "${out}" "PŘÍKAZ:" "print-prompt neobsahuje sestavený příkaz"

# 10) diakritika / # v promptu zůstává neporušená (žádný eval, žádné rozbití quoting)
out="$(CURSOR_AGENT_BIN=/nonexistent assert_exit 0 "diakritika v promptu" \
  --role kontrolor-t --pipeline 83 --model claude-sonnet-5-thinking-high --dry-run)"
assert_contains "${out}" "Kontrolor testera" "diacritics preserved"
assert_contains "${out}" "NESMÍŠ:" "diacritics preserved (NESMÍŠ)"

# 11) --pipeline s "#" prefixem se normalizuje
out="$(CURSOR_AGENT_BIN=/nonexistent assert_exit 0 "pipeline s # prefixem" \
  --role integrator --pipeline "#83" --model composer-2.5-fast --dry-run)"
assert_contains "${out}" "PIPELINE: #83" "pipeline # prefix normalized"

# 12) CLI NALEZENO (dočasná falešná binárka), ale skončí nenulově → exit 4,
#     stdout/stderr fake CLI zachovaný beze zásahu (E5 z ANALÝZY #85 §5).
FAKE_CLI_DIR="$(mktemp -d)"
trap 'rm -rf "${FAKE_CLI_DIR}"' EXIT
FAKE_CLI="${FAKE_CLI_DIR}/fake-cursor-agent.sh"
cat > "${FAKE_CLI}" <<'FAKEEOF'
#!/usr/bin/env bash
echo "FAKE_CLI_STDOUT: castecny vystup pred padem"
echo "FAKE_CLI_STDERR: simulovana chyba CLI" >&2
exit 1
FAKEEOF
chmod +x "${FAKE_CLI}"

out="$(CURSOR_AGENT_BIN="${FAKE_CLI}" assert_exit 4 "CLI nalezeno, selhalo nenulove (fake binarka)" \
  --role tester --pipeline 83 --model composer-2.5-fast)"
assert_contains "${out}" "FAKE_CLI_STDOUT: castecny vystup pred padem" "exit 4 zachovava stdout fake CLI"
assert_contains "${out}" "FAKE_CLI_STDERR: simulovana chyba CLI" "exit 4 zachovava stderr fake CLI"
assert_contains "${out}" "CLI_FAIL:" "exit 4 obsahuje CLI_FAIL hlasku"

rm -rf "${FAKE_CLI_DIR}"
trap - EXIT

echo "ma-run-role.sh testy passed."

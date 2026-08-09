#!/usr/bin/env bash
# Offline/online preflight for MA P3: cursor-agent PATH, gh, merge labely.
# Exit 0 = vše OK nebo jen WARN; exit 1 = FAIL (chybí CLI / kritické).
# Použití: bash docs/scripts/check-ma-env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FAIL=0
WARN=0

ok() { echo "OK   $*"; }
warn() { echo "WARN $*"; WARN=$((WARN + 1)); }
fail() { echo "FAIL $*"; FAIL=$((FAIL + 1)); }

# --- 1) Cursor Agent CLI -------------------------------------------------
BIN="${CURSOR_AGENT_BIN:-}"
if [[ -z "${BIN}" ]]; then
  if command -v cursor-agent >/dev/null 2>&1; then
    BIN="cursor-agent"
  elif command -v agent >/dev/null 2>&1; then
    BIN="agent"
  fi
fi

if [[ -z "${BIN}" ]]; then
  fail "cursor-agent / agent není v PATH"
  echo "     Install: curl https://cursor.com/install -fsS | bash"
  echo "     PATH:    export PATH=\"\$HOME/.local/bin:\$PATH\""
else
  ok "CLI binarka: ${BIN} ($(command -v "${BIN}"))"
  help_out="$("${BIN}" --help 2>&1 || true)"
  for flag in '-p' '--print' '--output-format' '--model' '--force' '-f'; do
    if [[ "${help_out}" == *"${flag}"* ]]; then
      ok "flag ${flag} v --help"
    else
      fail "flag ${flag} chybí v --help (ma-run-role.sh ho používá)"
    fi
  done
  if CURSOR_AGENT_BIN="${BIN}" bash "${ROOT}/docs/scripts/ma-run-role.sh" \
      --role analytik --pipeline 1 --model auto --dry-run >/tmp/ma-env-dry.txt 2>&1; then
    ok "ma-run-role.sh --dry-run exit 0 (CURSOR_AGENT_BIN=${BIN})"
  else
    fail "ma-run-role.sh --dry-run selhal s CURSOR_AGENT_BIN=${BIN}"
  fi
fi

# --- 2) gh ---------------------------------------------------------------
if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    ok "gh auth status"
    # Issues write probe (neblokující — Cloud často jen Contents)
    if gh api user >/dev/null 2>&1; then
      ok "gh api user"
    else
      warn "gh api user selhal — token může být jen integration (Issues write často 403)"
    fi
  else
    warn "gh není přihlášené (gh auth login)"
  fi
else
  warn "gh chybí v PATH"
fi

# --- 3) Labely merge Ano/Ne ----------------------------------------------
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  labels="$(gh label list --limit 100 2>/dev/null || true)"
  for name in multiagent/merge-review merge/approved merge/rejected merge/done merge/failed; do
    if printf '%s\n' "${labels}" | grep -qE "^${name}[[:space:]]"; then
      ok "label ${name}"
    else
      warn "label ${name} chybí — bash docs/scripts/create-multiagent-labels.sh"
    fi
  done
fi

# --- 4) Branch protection (jen info) -------------------------------------
echo ""
echo "Branch protection na main: ověř v GitHub UI"
echo "  Settings → Branches → Branch protection rules → main"
echo "  Doporučeno: Require a pull request before merging = OFF (repo bez PR),"
echo "  nebo Require status checks; Restrict who can push to matching branches."
echo "  Checklist: docs/wiki/provozni-branch-protection.md"
echo "Live smoke merge: docs/wiki/provozni-merge-smoke.md"

echo ""
if [[ "${FAIL}" -gt 0 ]]; then
  echo "Výsledek: ${FAIL} FAIL, ${WARN} WARN"
  exit 1
fi
echo "Výsledek: OK (${WARN} WARN)"
exit 0

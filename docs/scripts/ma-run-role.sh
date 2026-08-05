#!/usr/bin/env bash
# Spustí jednu MA roli přes Cursor Agent CLI (CLI first, Task = fallback).
# Kontrakt: ANALÝZA #85 §3 · docs/multi-agent-workflow.md (sekce "Token budget rolí").
# Použití:
#   bash docs/scripts/ma-run-role.sh --role <role> --pipeline <N> \
#        [--issue <N>] [--model <slug>] [--write] [--dry-run] [--print-prompt] [--help]
# Exit: 0 OK/--dry-run/--help/--print-prompt · 2 usage · 3 CLI chybí (vytiskne prompt) · 4 CLI selhalo.
# Portable: bash 3.2+ (bez asociativních polí; indexová pole OK).
#
# E10 (dlouhý/visící běh CLI): skript NEZAVÁDÍ vlastní timeout — "${CURSOR_AGENT_BIN}" se spustí
# na popředí a skript čeká na jeho konec. Přerušení (Ctrl-C / kill) řeší volající (Integrátor,
# skill, terminál), ne tento skript. Detail: docs/multi-agent-workflow.md (sekce "Token budget rolí").

set -euo pipefail

CURSOR_AGENT_BIN="${CURSOR_AGENT_BIN:-cursor-agent}"
MA_ROLE_EXTRA_ARGS="${MA_ROLE_EXTRA_ARGS:-}"

usage() {
  cat <<'EOF'
Použití:
  bash docs/scripts/ma-run-role.sh --role <role> --pipeline <N> \
       [--issue <N>] [--model <slug>] [--write] [--dry-run] [--print-prompt] [--help]

Role (whitelist):
  analytik | kontrolor-a | vyvojar | kontrolor-v | tester | kontrolor-t | integrator

Parametry:
  --role          povinný  role z whitelistu výše
  --pipeline      povinný  číslo [PIPELINE] issue (akceptuje "83" i "#83")
  --issue         volitelný  vstupní artefakt; lze opakovat pro víc vstupů
  --model         povinný  slug z docs/multi-agent-workflow.md (sekce Modely)
  --write         volitelný  povolí zápisové nástroje (mapuje na --force)
  --dry-run       volitelný  vytiskne příkaz + prompt, nespustí CLI, exit 0 i bez binárky
  --print-prompt  volitelný  vytiskne jen prompt (pro ruční vložení do Task)
  --help          nápověda + exit 0

Exit kódy:
  0  OK / --dry-run / --help / --print-prompt
  2  chybný vstup (neznámá role, chybí --pipeline nebo --model)
  3  Cursor Agent CLI nenalezeno v PATH — vytiskne hotový prompt pro Task fallback
  4  CLI nalezeno, ale skončilo nenulovým exit kódem

Poznámka (E10): skript nemá vlastní timeout pro dlouhý/visící běh CLI — přerušení
(Ctrl-C / kill) je na volajícím (Integrátor / terminál), ne na tomto skriptu.

Env:
  CURSOR_AGENT_BIN     přepis binárky (default: cursor-agent)
  MA_ROLE_EXTRA_ARGS   volitelné doplňkové flagy pro CLI (např. "--trust"), whitespace-oddělené

Sestavený příkaz (referenční tvar):
  $CURSOR_AGENT_BIN -p --output-format text --model <slug> [--force] "<prompt>"

Detail: docs/multi-agent-workflow.md (sekce "Token budget rolí"), .cursor/skills/m/SKILL.md
EOF
}

role_label() {
  case "$1" in
    analytik) printf '%s' "Analytik" ;;
    kontrolor-a) printf '%s' "Kontrolor analytika" ;;
    vyvojar) printf '%s' "Vývojář" ;;
    kontrolor-v) printf '%s' "Kontrolor vývojáře" ;;
    tester) printf '%s' "Tester" ;;
    kontrolor-t) printf '%s' "Kontrolor testera" ;;
    integrator) printf '%s' "Integrátor" ;;
    *) printf '%s' "" ;;
  esac
}

role_forbidden() {
  case "$1" in
    analytik) printf '%s' "implementovat; uzavírat verdikt; git push" ;;
    kontrolor-a) printf '%s' "editovat body ANALÝZA za analytika; kódovat; vytvořit IMPLEMENTACE při NO-GO" ;;
    vyvojar) printf '%s' "měnit kontrakt bez eskalace; git push; spustit Testera bez gate/go na VERDIKT-V" ;;
    kontrolor-v) printf '%s' "implementovat fixy; posunout dál při NO-GO; přepisovat existující NO-GO verdikt" ;;
    tester) printf '%s' "rozšiřovat feature mimo testy; zakládat [BUG] pro každý drobný nález ve scope" ;;
    kontrolor-t) printf '%s' "psát produkční kód; uzavírat pipeline při NO-GO; zakládat [BUG] issue" ;;
    integrator) printf '%s' "merge do main (jen člověk); uzavírat [PIPELINE]; full npm run check, pokud Tester doložil zelené" ;;
    *) printf '%s' "" ;;
  esac
}

role_card() {
  case "$1" in
    analytik) printf '%s' "docs/ma-role-cards/analytik.md" ;;
    kontrolor-a) printf '%s' "docs/ma-role-cards/kontrolor-a.md" ;;
    vyvojar) printf '%s' "docs/ma-role-cards/vyvojar.md" ;;
    kontrolor-v) printf '%s' "docs/ma-role-cards/kontrolor-v.md" ;;
    tester) printf '%s' "docs/ma-role-cards/tester.md" ;;
    kontrolor-t) printf '%s' "docs/ma-role-cards/kontrolor-t.md" ;;
    integrator) printf '%s' "docs/ma-role-cards/integrator.md" ;;
    *) printf '%s' "" ;;
  esac
}

is_known_role() {
  case "$1" in
    analytik|kontrolor-a|vyvojar|kontrolor-v|tester|kontrolor-t|integrator) return 0 ;;
    *) return 1 ;;
  esac
}

ROLE=""
PIPELINE=""
MODEL=""
WRITE=0
DRY_RUN=0
PRINT_PROMPT=0
ISSUES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --role)
      if [[ $# -lt 2 ]]; then echo "Chybí hodnota pro --role" >&2; usage >&2; exit 2; fi
      ROLE="$2"; shift 2 ;;
    --pipeline)
      if [[ $# -lt 2 ]]; then echo "Chybí hodnota pro --pipeline" >&2; usage >&2; exit 2; fi
      PIPELINE="$2"; shift 2 ;;
    --issue)
      if [[ $# -lt 2 ]]; then echo "Chybí hodnota pro --issue" >&2; usage >&2; exit 2; fi
      ISSUES+=("$2"); shift 2 ;;
    --model)
      if [[ $# -lt 2 ]]; then echo "Chybí hodnota pro --model" >&2; usage >&2; exit 2; fi
      MODEL="$2"; shift 2 ;;
    --write) WRITE=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --print-prompt) PRINT_PROMPT=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Neznámý parametr: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "${ROLE}" ]]; then
  echo "Chybí povinný parametr --role" >&2
  usage >&2
  exit 2
fi

if ! is_known_role "${ROLE}"; then
  echo "Neznámá role: ${ROLE} (whitelist: analytik, kontrolor-a, vyvojar, kontrolor-v, tester, kontrolor-t, integrator)" >&2
  usage >&2
  exit 2
fi

if [[ -z "${PIPELINE}" ]]; then
  echo "Chybí povinný parametr --pipeline" >&2
  usage >&2
  exit 2
fi

if [[ -z "${MODEL}" ]]; then
  echo "Chybí povinný parametr --model" >&2
  usage >&2
  exit 2
fi

PIPELINE_NUM="${PIPELINE#\#}"
ROLE_LABEL="$(role_label "${ROLE}")"
FORBIDDEN="$(role_forbidden "${ROLE}")"
ROLE_CARD="$(role_card "${ROLE}")"

issue_lines=""
if [[ ${#ISSUES[@]} -gt 0 ]]; then
  for i in "${ISSUES[@]}"; do
    issue_lines+="VSTUP_ISSUE: #${i#\#}"$'\n'
  done
else
  issue_lines="VSTUP_ISSUE: dle aktuální fáze PIPELINE #${PIPELINE_NUM} (viz auto-přehled)"$'\n'
fi

build_prompt() {
  printf 'ROLE: %s\n' "${ROLE_LABEL}"
  printf 'MODEL: %s\n' "${MODEL}"
  printf 'PIPELINE: #%s\n' "${PIPELINE_NUM}"
  printf '%s' "${issue_lines}"
  printf 'VÝSTUP_ISSUE: vytvoř/aktualizuj dle role card + .cursor/skills/m/SKILL.md\n'
  printf 'ROLE_CARD: %s — vyplň VÝSTUP dle této karty (necelý workflow).\n' "${ROLE_CARD}"
  printf 'Skill STOP/orchestrace: .cursor/skills/m/SKILL.md. Modely/MERGE-PENDING detail jen při potřebě: docs/multi-agent-workflow.md.\n'
  printf 'NESMÍŠ: %s\n' "${FORBIDDEN}"
}

PROMPT="$(build_prompt)"

CMD_ARGS=("-p" "--output-format" "text" "--model" "${MODEL}")
if [[ "${WRITE}" -eq 1 ]]; then
  CMD_ARGS+=("--force")
fi
if [[ -n "${MA_ROLE_EXTRA_ARGS}" ]]; then
  # Záměrné word-splitting: dokumentovaný env s whitespace-oddělenými flagy.
  # shellcheck disable=SC2206
  EXTRA_ARGS=(${MA_ROLE_EXTRA_ARGS})
  CMD_ARGS+=("${EXTRA_ARGS[@]}")
fi

if [[ "${PRINT_PROMPT}" -eq 1 ]]; then
  printf '%s\n' "${PROMPT}"
  exit 0
fi

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "PŘÍKAZ: ${CURSOR_AGENT_BIN} ${CMD_ARGS[*]} \"<prompt>\""
  echo "---"
  echo "PROMPT:"
  printf '%s\n' "${PROMPT}"
  exit 0
fi

if ! command -v "${CURSOR_AGENT_BIN}" >/dev/null 2>&1; then
  echo "CLI_CHYBI: '${CURSOR_AGENT_BIN}' nenalezeno v PATH."
  echo "Spusť roli přes Cursor Task (fallback) — vlož tento prompt:"
  echo "---"
  printf '%s\n' "${PROMPT}"
  exit 3
fi

set +e
"${CURSOR_AGENT_BIN}" "${CMD_ARGS[@]}" "${PROMPT}"
CLI_EXIT=$?
set -e

if [[ "${CLI_EXIT}" -ne 0 ]]; then
  echo "CLI_FAIL: ${CURSOR_AGENT_BIN} skončilo s exit kódem ${CLI_EXIT}." >&2
  exit 4
fi

exit 0

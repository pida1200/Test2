#!/usr/bin/env bash
# Lokální simulace gate precedence + VERDIKT routing z multiagent-next.yml.
# Použití: bash docs/scripts/dry-run-multiagent-next.sh "multiagent/verdikt,gate/go" "[VERDIKT-V] feature — GO"
set -euo pipefail

_run() {
  local labels_csv="$1"
  local title="$2"
  local -a labels
  IFS=',' read -ra labels <<< "$labels_csv"

  local gate artifact vk
  gate=$(resolve_gate "${labels[@]}")
  artifact=$(resolve_artifact "${labels[@]}")
  vk=$(verdict_kind "$title")

  echo "labels: $labels_csv"
  echo "title:  $title"
  echo "artifact: $artifact · gate: $gate · verdict: $vk"

  case "$artifact:$gate:$vk" in
    multiagent/verdikt:gate/pending:V) echo "→ Kontrolor vývojáře · gpt-5.6-sol-medium" ;;
    multiagent/verdikt:gate/go:V)       echo "→ Tester · composer-2.5-fast" ;;
    multiagent/verdikt:gate/no-go:V)    echo "→ Vývojář (rework) · composer-2.5-fast" ;;
    multiagent/verdikt:gate/pending:A) echo "→ Kontrolor analytika · claude-opus-5-thinking-high" ;;
    multiagent/verdikt:gate/go:A)      echo "→ Vývojář · composer-2.5-fast" ;;
    multiagent/verdikt:gate/pending:T) echo "→ Kontrolor testera · claude-sonnet-5-thinking-high" ;;
    multiagent/verdikt:gate/go:T)      echo "→ Integrátor · composer-2.5-fast" ;;
    *) echo "→ viz map v .github/workflows/multiagent-next.yml" ;;
  esac
}

resolve_gate() {
  local -a labels=("$@") gates=()
  local l g x
  for l in "${labels[@]}"; do [[ "$l" == gate/* ]] && gates+=("$l"); done
  for g in gate/go gate/no-go gate/blocked gate/pending; do
    for x in "${gates[@]}"; do [[ "$x" == "$g" ]] && { echo "$g"; return; }; done
  done
  echo "gate/pending"
}

resolve_artifact() {
  local -a labels=("$@") a l
  for a in multiagent/verdikt multiagent/analyza multiagent/implementace multiagent/testy multiagent/pipeline; do
    for l in "${labels[@]}"; do [[ "$l" == "$a" ]] && { echo "$a"; return; }; done
  done
  echo "multiagent/pipeline"
}

verdict_kind() {
  local title="$1"
  if [[ "$title" =~ VERDIKT-A ]]; then echo A
  elif [[ "$title" =~ VERDIKT-V ]]; then echo V
  elif [[ "$title" =~ VERDIKT-T ]]; then echo T
  else echo "?"
  fi
}

labels_csv="${1:-multiagent/verdikt,gate/pending}"
title="${2:-[VERDIKT-V] test — pending}"

echo "=== dry-run multiagent-next ==="
_run "$labels_csv" "$title"

echo ""
echo "=== precedence: pending+go → go wins ==="
_run "multiagent/verdikt,gate/pending,gate/go" "[VERDIKT-V] test — GO"

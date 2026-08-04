#!/usr/bin/env bash
# Vytvoří labely pro multi-agent I/O přes GitHub Issues.
# Spusť z kořene repa: bash docs/scripts/create-multiagent-labels.sh
set -euo pipefail
create() {
  local name="$1" color="$2" desc="$3"
  gh label create "$name" --color "$color" --description "$desc" 2>/dev/null \
    || gh label edit "$name" --color "$color" --description "$desc"
}
create "multiagent" "0E8A16" "Multi-agent pipeline"
create "multiagent/pipeline" "1D76DB" "Epic pipeline issue"
create "multiagent/analyza" "5319E7" "Analyst output"
create "multiagent/implementace" "B60205" "Developer output"
create "multiagent/testy" "FBCA04" "Tester output"
create "multiagent/verdikt" "D93F0B" "Controller verdict"
create "gate/pending" "C2E0C6" "Awaiting review or rework"
create "gate/go" "0E8A16" "Gate passed"
create "gate/no-go" "B60205" "Gate blocked"
echo "OK: multi-agent labels ready"

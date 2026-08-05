#!/usr/bin/env bash
# Labely pro multi-agent 7-issue model (multiagent/* + gate/*).
# Labely ma/* z PR #3 NEZAVÁDĚT.
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
create "multiagent/bug" "E99695" "Bug found by Tester"
create "gate/pending" "C2E0C6" "Awaiting review or rework"
create "gate/go" "0E8A16" "Gate passed"
create "gate/no-go" "B60205" "Gate blocked"
create "gate/blocked" "B60205" "Escalation after 3 reworks"
create "merge/approved" "0E8A16" "Human-approved merge to main (multiagent-merge.yml)"
create "merge/done" "0E8A16" "Merge to main completed by multiagent-merge.yml"
create "merge/failed" "B60205" "Merge to main blocked by a guard or error"
create "wiki/sync-failed" "B60205" "Wiki mirror sync failed after merge (see follow-up issue)"
echo "OK: multi-agent labels ready (no ma/* labels)"

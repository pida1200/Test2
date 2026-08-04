#!/usr/bin/env bash
# Labely pro jednoduchý multi-agent (1 issue + ma/* stav).
# Spusť: bash docs/scripts/create-multiagent-labels.sh
set -euo pipefail
create() {
  local name="$1" color="$2" desc="$3"
  gh label create "$name" --color "$color" --description "$desc" 2>/dev/null \
    || gh label edit "$name" --color "$color" --description "$desc"
}
create "multiagent" "0E8A16" "Multi-agent feature issue"
create "ma/analyza" "5319E7" "Phase: analyst"
create "ma/review-a" "D93F0B" "Phase: review analysis"
create "ma/vyvoj" "1D76DB" "Phase: developer"
create "ma/review-v" "D93F0B" "Phase: review implementation"
create "ma/testy" "FBCA04" "Phase: tester"
create "ma/review-t" "D93F0B" "Phase: review tests"
create "ma/done" "0E8A16" "Phase: integrator / done"
create "ma/blocked" "B60205" "Phase: blocked"
# legacy (7-issue model) — volitelné
create "multiagent/pipeline" "1D76DB" "Legacy epic"
create "multiagent/analyza" "5319E7" "Legacy analyst issue"
create "multiagent/implementace" "B60205" "Legacy developer issue"
create "multiagent/testy" "FBCA04" "Legacy tester issue"
create "multiagent/verdikt" "D93F0B" "Legacy verdict issue"
create "gate/pending" "C2E0C6" "Legacy gate pending"
create "gate/go" "0E8A16" "Legacy gate passed"
create "gate/no-go" "B60205" "Legacy gate blocked"
echo "OK: multi-agent labels ready"

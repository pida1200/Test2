#!/usr/bin/env bash
# Lokální přehled pipeline — stejná logika jako multiagent-pipeline-sync.yml.
# Použití: bash docs/scripts/ma-pipeline-view.sh 17
# Pozn.: prefix ma- v názvu skriptu ≠ GitHub label ma/* (ty se nezavádějí).
set -euo pipefail

PIPELINE_NUM="${1:-}"
if [[ -z "$PIPELINE_NUM" || "$PIPELINE_NUM" == \#* ]]; then
  PIPELINE_NUM="${PIPELINE_NUM#\#}"
fi
if [[ -z "$PIPELINE_NUM" || ! "$PIPELINE_NUM" =~ ^[0-9]+$ ]]; then
  echo "Usage: bash docs/scripts/ma-pipeline-view.sh <pipeline-issue-number>" >&2
  exit 1
fi

REPO="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)}"
if [[ -z "$REPO" ]]; then
  echo "Cannot detect repo — set GITHUB_REPOSITORY or run inside git repo with gh" >&2
  exit 1
fi

echo "=== Pipeline #$PIPELINE_NUM ($REPO) ==="
echo ""

gh issue view "$PIPELINE_NUM" --repo "$REPO" --json title,state,labels -q \
  '"Title: \(.title)\nState: \(.state)\nLabels: \([.labels[].name] | join(", "))"' 2>/dev/null || {
  echo "Pipeline issue #$PIPELINE_NUM not found" >&2
  exit 1
}

gh issue list --repo "$REPO" --label multiagent --state all --limit 200 \
  --json number,title,state,labels,body | \
  node -e "
const PIPELINE_RE = /^\s*Pipeline(?:\s+issue)?:\s*#?(\d+)\s*\$/m;
const pipelineNum = process.argv[1];
const PHASES = [
  ['ANALÝZA', 'multiagent/analyza', null],
  ['VERDIKT-A', 'multiagent/verdikt', 'A'],
  ['IMPLEMENTACE', 'multiagent/implementace', null],
  ['VERDIKT-V', 'multiagent/verdikt', 'V'],
  ['TESTY', 'multiagent/testy', null],
  ['VERDIKT-T', 'multiagent/verdikt', 'T'],
];

function resolveGate(labels) {
  const gates = labels.filter(l => l.startsWith('gate/'));
  for (const g of ['gate/go', 'gate/no-go', 'gate/blocked', 'gate/pending']) {
    if (gates.includes(g)) return g;
  }
  return 'gate/pending';
}

function verdictKind(title) {
  if (/\\[VERDIKT-A\\]|VERDIKT-A/i.test(title)) return 'A';
  if (/\\[VERDIKT-V\\]|VERDIKT-V/i.test(title)) return 'V';
  if (/\\[VERDIKT-T\\]|VERDIKT-T/i.test(title)) return 'T';
  return null;
}

const issues = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const byPhase = {};
for (const [label] of PHASES) byPhase[label] = [];

for (const iss of issues) {
  if (String(iss.number) === pipelineNum) continue;
  const m = (iss.body || '').match(PIPELINE_RE);
  if (!m || m[1] !== pipelineNum) continue;
  const labels = (iss.labels || []).map(l => l.name);
  const vk = verdictKind(iss.title || '');
  for (const [phaseLabel, artifact, verdict] of PHASES) {
    if (verdict) {
      if (labels.includes('multiagent/verdikt') && vk === verdict) {
        byPhase[phaseLabel].push(iss);
      }
    } else if (labels.includes(artifact)) {
      byPhase[phaseLabel].push(iss);
    }
  }
}

console.log('');
console.log('| Fáze | Issue | Gate | Stav |');
console.log('|------|-------|------|------|');
for (const [phaseLabel] of PHASES) {
  const list = byPhase[phaseLabel].sort((a, b) => a.number - b.number);
  const iss = list.length ? list[list.length - 1] : null;
  if (!iss) {
    console.log('| ' + phaseLabel + ' | — | — | — |');
  } else {
    const labels = (iss.labels || []).map(l => l.name);
    console.log('| ' + phaseLabel + ' | #' + iss.number + ' | \`' + resolveGate(labels) + '\` | ' + iss.state + ' |');
  }
}
console.log('');
console.log('_(Skript ma-pipeline-view.sh — lokální náhled; plná historie verdiktů v CI sync)_');
console.log('Další krok: viz komentář s markerem multiagent-next na aktivním artefaktu, nebo /m #' + pipelineNum);
" "$PIPELINE_NUM"

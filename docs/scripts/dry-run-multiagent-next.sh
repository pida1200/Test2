#!/usr/bin/env bash
# Lokální simulace next-step routing (multiagent-next-lib.cjs).
# Použití: bash docs/scripts/dry-run-multiagent-next.sh "multiagent/verdikt,gate/go" "[VERDIKT-V] feature — GO"
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LABELS_CSV="${1:-multiagent/verdikt,gate/pending}"
TITLE="${2:-[VERDIKT-V] test — pending}"
BODY="${3:-Pipeline: #99}"

echo "=== dry-run multiagent-next ==="
node -e "
const next = require('${ROOT}/docs/scripts/multiagent-next-lib.cjs');
const labels = process.argv[1].split(',').map(s => s.trim()).filter(Boolean);
const title = process.argv[2];
const body = process.argv[3];
const r = next.routeNextStep({ labels, title, body, issueNumber: 99 });
console.log('labels:', labels.join(','));
console.log('title: ', title);
console.log('artifact:', r.artifact, '· gate:', r.gate, '· verdict:', r.vk);
console.log('→', r.info.role, '·', r.info.model);
console.log('prompt:', r.prompt);
" "$LABELS_CSV" "$TITLE" "$BODY"

echo ""
echo "=== precedence: pending+go → go wins ==="
node -e "
const next = require('${ROOT}/docs/scripts/multiagent-next-lib.cjs');
const r = next.routeNextStep({
  labels: ['multiagent/verdikt', 'gate/pending', 'gate/go'],
  title: '[VERDIKT-V] test — GO',
  body: 'Pipeline: #99',
  issueNumber: 99,
});
console.log('gate:', r.gate, '→', r.info.role, '·', r.info.model);
if (r.gate !== 'gate/go' || r.info.role !== 'Tester') {
  console.error('FAIL: expected gate/go → Tester');
  process.exit(1);
}
console.log('OK precedence');
"

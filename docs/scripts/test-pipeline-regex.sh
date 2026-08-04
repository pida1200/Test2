#!/usr/bin/env bash
# Test anchored Pipeline regex (multiagent-next.yml / pipeline-sync).
# Použití: bash docs/scripts/test-pipeline-regex.sh
set -euo pipefail

node -e "
const RE = /^\s*Pipeline(?:\s+issue)?:\s*#?(\d+)\s*\$/m;

const cases = [
  { name: 'prose mention (must NOT match)', body: '#13 mělo chybně Pipeline: 10 v citaci', expect: null },
  { name: 'standalone line (must match)', body: 'Some text\\nPipeline: #17\\nMore', expect: '17' },
  { name: 'Pipeline issue variant', body: 'Pipeline issue: 9', expect: '9' },
  { name: 'missing (null)', body: 'No pipeline here', expect: null },
];

let failed = 0;
for (const c of cases) {
  const m = c.body.match(RE);
  const got = m ? m[1] : null;
  const ok = got === c.expect;
  console.log((ok ? 'OK' : 'FAIL') + '  ' + c.name + ' → ' + JSON.stringify(got));
  if (!ok) { console.log('  expected ' + JSON.stringify(c.expect)); failed++; }
}
process.exit(failed ? 1 : 0);
"

echo "Pipeline regex tests passed."

#!/usr/bin/env bash
# Unit tests for multiagent-next-lib.cjs
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"
node <<'NODE'
const assert = require('assert');
const next = require('./docs/scripts/multiagent-next-lib.cjs');

assert.strictEqual(next.resolveGate(['gate/pending', 'gate/go']), 'gate/go');
assert.strictEqual(next.resolveArtifact(['multiagent/analyza', 'multiagent/verdikt']), 'multiagent/verdikt');
assert.strictEqual(next.verdictKind('[VERDIKT-V] x'), 'V');
assert.strictEqual(next.parsePipelineNum('foo\nPipeline: #42\nbar'), '42');
assert.strictEqual(next.parsePipelineNum('See Pipeline: #42 in prose'), null);
assert.strictEqual(next.parseVstupNum('### X\n\nVstup: #8\n'), '8');
assert.strictEqual(next.parseVerdiktValue('### Verdikt\n\nVerdikt: NO-GO\n'), 'NO-GO');

const r = next.routeNextStep({
  labels: ['multiagent', 'multiagent/verdikt', 'gate/go'],
  title: '[VERDIKT-A] feat — GO',
  body: 'Verdikt: GO\n\nPipeline: #34\n',
  issueNumber: 40,
});
assert.strictEqual(r.prompt, '/m #34');
assert.ok(r.commentBody.includes('/m #34 once'));
assert.strictEqual(r.info.role, 'Vývojář');
assert.ok(r.commentBody.includes('<!-- multiagent-next -->'));

assert.strictEqual(next.modelForPhase('VERDIKT-V'), next.MODELS.kontrolorV);
console.log('OK multiagent-next-lib tests');
NODE

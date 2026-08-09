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
assert.ok(r.cliOneLiner.includes('ma-run-role.sh'));
assert.ok(r.cliOneLiner.includes('--role vyvojar'));
assert.ok(r.cliOneLiner.includes('--pipeline 34'));
assert.ok(r.cliOneLiner.includes('--write'));
assert.strictEqual(r.info.model, next.MODELS.vyvojar);
assert.strictEqual(next.MODELS.vyvojar, next.MODEL_AUTO);
assert.strictEqual(next.MODELS.analytik, 'auto');

// Pin tabulka drží kontrolor ≠ produkce (default MODELS = auto)
assert.strictEqual(next.MODELS_PINNED.kontrolorA, 'cursor-grok-4.5-high-fast');
assert.notStrictEqual(next.MODELS_PINNED.kontrolorA, next.MODELS_PINNED.analytik);

assert.strictEqual(next.modelForPhase('VERDIKT-V'), next.MODELS.kontrolorV);
assert.strictEqual(next.modelForPhase('VERDIKT-A'), next.MODELS.kontrolorA);

// Kontrolor A route (pending verdikt) → CLI one-liner bez --write
const ka = next.routeNextStep({
  labels: ['multiagent', 'multiagent/verdikt', 'gate/pending'],
  title: '[VERDIKT-A] feat',
  body: 'Pipeline: #34\nVstup: #35\nVerdikt: GO\n',
  issueNumber: 40,
});
assert.strictEqual(ka.info.role, 'Kontrolor analytika');
assert.ok(ka.cliOneLiner.includes('--role kontrolor-a'));
assert.ok(ka.cliOneLiner.includes(next.MODELS.kontrolorA));
assert.ok(!ka.cliOneLiner.includes('--write'));

// #81 (C5): pipeline gate/go hint routes to label merge/approved, not to a manual/no-action merge.
const pipelineGo = next.routeNextStep({
  labels: ['multiagent', 'multiagent/pipeline', 'gate/go'],
  title: '[PIPELINE] test',
  body: '',
  issueNumber: 81,
});
assert.ok(pipelineGo.commentBody.includes('merge/approved'));
assert.ok(!pipelineGo.commentBody.includes('bez akce agenta'));
assert.ok(pipelineGo.cliOneLiner.includes('--role integrator'));

// risk/low (#102): ANALÝZA self-check gate/go → rovnou Vývojář, ne nejednoznačné "Kontrolor A / Vývojář"
const analyzaGoDefault = next.routeNextStep({
  labels: ['multiagent', 'multiagent/analyza', 'gate/go'],
  title: '[ANALÝZA] test',
  body: 'Pipeline: #100\n',
  issueNumber: 102,
});
assert.strictEqual(analyzaGoDefault.info.role, 'Kontrolor A / Vývojář');

const analyzaGoRiskLow = next.routeNextStep({
  labels: ['multiagent', 'multiagent/analyza', 'gate/go'],
  title: '[ANALÝZA] test',
  body: 'Pipeline: #100\n',
  issueNumber: 102,
  riskLow: true,
});
assert.strictEqual(analyzaGoRiskLow.info.role, 'Vývojář');
assert.strictEqual(analyzaGoRiskLow.info.model, next.MODELS.vyvojar);
assert.ok(analyzaGoRiskLow.commentBody.includes('risk/low'));
assert.ok(analyzaGoRiskLow.cliOneLiner.includes('--role vyvojar'));

// risk/low nemá vliv mimo ANALÝZA gate/go (žádná zkratka jinde)
const implGoRiskLow = next.routeNextStep({
  labels: ['multiagent', 'multiagent/implementace', 'gate/go'],
  title: '[IMPLEMENTACE] test',
  body: 'Pipeline: #100\n',
  issueNumber: 103,
  riskLow: true,
});
assert.strictEqual(implGoRiskLow.info.role, 'Kontrolor V / Tester');

// next-lib re-exportuje jediný verdikt parser (ma-verdict-lib.cjs)
assert.strictEqual(typeof next.verdictLib.parseVerdictComment, 'function');
assert.strictEqual(typeof next.verdictLib.resolveVerdictSignal, 'function');

console.log('OK multiagent-next-lib tests');
NODE

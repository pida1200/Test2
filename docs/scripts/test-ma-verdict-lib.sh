#!/usr/bin/env bash
# Unit tests for ma-verdict-lib.cjs (offline, fixtures, no GitHub API calls).
# Kontrakt: ANALÝZA #102 v2 (rework po VERDIKT-A NO-GO #104; VERDIKT-A GO #105). Pipeline: #100.
# Pozitivní P1-P5 + negativní N1-N13 dle tabulek "Ověření" v #102.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"
node <<'NODE'
const assert = require('assert');
const lib = require('./docs/scripts/ma-verdict-lib.cjs');

function commentBody({ kind = 'A', pipeline = '100', vstup = '102', verdikt = 'GO', kontrola = 'kontrolor', extraLines = [] } = {}) {
  return [
    `<!-- multiagent-verdikt v="1" kind="${kind}" pipeline="${pipeline}" vstup="${vstup}" verdikt="${verdikt}" kontrola="${kontrola}" -->`,
    `### VERDIKT-${kind} — ${verdikt}`,
    '',
    `Pipeline: #${pipeline}`,
    `Vstup: #${vstup}`,
    `Verdikt: ${verdikt}`,
    '',
    '## Checklist',
    '1. ok',
    ...extraLines,
  ].join('\n');
}

// --- parseVerdictComment: happy path -------------------------------------

{
  const p = lib.parseVerdictComment({ id: 1, created_at: '2026-08-05T10:00:00Z', author: 'alice', body: commentBody() });
  assert.strictEqual(p.valid, true);
  assert.strictEqual(p.kind, 'A');
  assert.strictEqual(p.pipeline, '100');
  assert.strictEqual(p.vstup, '102');
  assert.strictEqual(p.verdikt, 'GO');
  assert.strictEqual(p.kontrola, 'kontrolor');
  assert.strictEqual(p.reason, null);
}
console.log('OK  parseVerdictComment: validní GO komentář → valid true');

// --- N1: bez markeru -------------------------------------------------------

{
  const p = lib.parseVerdictComment({ body: 'Verdikt: GO\n\nPipeline: #100\n' });
  assert.strictEqual(p.valid, false);
  assert.strictEqual(p.reason, 'zadny-marker');
}
console.log('OK  N1: text jen "Verdikt: GO" bez markeru → zadny-marker');

// --- N2: marker bez odpovídajícího "Verdikt: GO" v textu -------------------

{
  const body = [
    '<!-- multiagent-verdikt v="1" kind="A" pipeline="100" vstup="102" verdikt="GO" kontrola="kontrolor" -->',
    '### VERDIKT-A — GO',
    '',
    'Pipeline: #100',
    'Vstup: #102',
    '',
    'Chybí řádek Verdikt.',
  ].join('\n');
  const p = lib.parseVerdictComment({ body });
  assert.strictEqual(p.valid, false);
  assert.strictEqual(p.reason, 'body-nesouhlasi');
}
console.log('OK  N2: marker bez "Verdikt: GO" v textu → body-nesouhlasi');

// --- N9: dvojí verdikt v textu ----------------------------------------------

{
  const body = commentBody({ extraLines: ['', 'Verdikt: NO-GO'] });
  const p = lib.parseVerdictComment({ body });
  assert.strictEqual(p.valid, false);
  assert.strictEqual(p.reason, 'body-nesouhlasi');
}
console.log('OK  N9: komentář obsahuje Verdikt: GO i Verdikt: NO-GO → invalid');

// --- N10: marker verdikt="NO-GO" zakázán ------------------------------------

{
  const body = commentBody({ verdikt: 'NO-GO' });
  const p = lib.parseVerdictComment({ body });
  assert.strictEqual(p.valid, false);
  assert.strictEqual(p.reason, 'no-go-jen-jako-issue');
}
console.log('OK  N10: marker verdikt="NO-GO" → no-go-jen-jako-issue');

// --- N11: dvojí marker / duplicitní klíč / neznámý klíč ---------------------

{
  const body = commentBody() + '\n\n' + commentBody();
  const p = lib.parseVerdictComment({ body });
  assert.strictEqual(p.valid, false);
  assert.strictEqual(p.reason, 'vice-markeru');
}
console.log('OK  N11a: 2× marker v komentáři → vice-markeru');

{
  const body = [
    '<!-- multiagent-verdikt v="1" v="1" kind="A" pipeline="100" vstup="102" verdikt="GO" kontrola="kontrolor" -->',
    'Pipeline: #100',
    'Vstup: #102',
    'Verdikt: GO',
  ].join('\n');
  const p = lib.parseVerdictComment({ body });
  assert.strictEqual(p.valid, false);
  assert.strictEqual(p.reason, 'atributy');
  assert.ok(p.errors.some((e) => e.includes('Duplicitní atribut')));
}
console.log('OK  N11b: duplicitní atribut markeru → atributy');

{
  const body = [
    '<!-- multiagent-verdikt v="1" kind="A" pipeline="100" vstup="102" verdikt="GO" kontrola="kontrolor" neznamy="x" -->',
    'Pipeline: #100',
    'Vstup: #102',
    'Verdikt: GO',
  ].join('\n');
  const p = lib.parseVerdictComment({ body });
  assert.strictEqual(p.valid, false);
  assert.strictEqual(p.reason, 'atributy');
  assert.ok(p.errors.some((e) => e.includes('Neznámý atribut')));
}
console.log('OK  N11c: neznámý atribut markeru → atributy');

// --- N12: neznámá verze kontraktu -------------------------------------------

{
  const body = [
    '<!-- multiagent-verdikt v="2" kind="A" pipeline="100" vstup="102" verdikt="GO" kontrola="kontrolor" -->',
    'Pipeline: #100',
    'Vstup: #102',
    'Verdikt: GO',
  ].join('\n');
  const p = lib.parseVerdictComment({ body });
  assert.strictEqual(p.valid, false);
  assert.strictEqual(p.reason, 'atributy');
  assert.ok(p.errors.some((e) => e.includes('Neznámá verze')));
}
console.log('OK  N12: v="2" (neznámá verze) → atributy (neznámá verze)');

// --- validateVerdictComment wrapper (gate-check) ----------------------------

{
  const r = lib.validateVerdictComment(commentBody());
  assert.strictEqual(r.valid, true);
  assert.deepStrictEqual(r.errors, []);
}
console.log('OK  validateVerdictComment: validní tvar → valid true, errors []');

{
  const r = lib.validateVerdictComment('nic tu není');
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.length >= 1);
}
console.log('OK  validateVerdictComment: bez markeru → valid false + errors');

// --- checkCommentTrust (§3) --------------------------------------------------

const validParsed = lib.parseVerdictComment({ id: 1, created_at: '2026-08-05T10:00:00Z', author: 'alice', body: commentBody() });

{
  const t = lib.checkCommentTrust(validParsed, {
    pipeline: '100',
    hostIssueNumber: '102',
    hostLabels: ['multiagent', 'multiagent/analyza'],
    riskLow: false,
    authorPermission: 'write',
  });
  assert.strictEqual(t.allowed, true);
}
console.log('OK  checkCommentTrust: autor write, umístění/pipeline/artefakt ok → allowed');

// N3: pipeline replay
{
  const t = lib.checkCommentTrust(validParsed, {
    pipeline: '99',
    hostIssueNumber: '102',
    hostLabels: ['multiagent/analyza'],
    authorPermission: 'write',
  });
  assert.strictEqual(t.allowed, false);
}
console.log('OK  N3: pipeline="100" v markeru ≠ vyhodnocovaná #99 → deny (replay)');

// N4: kopie na jiné issue (vstup ≠ hostitel)
{
  const t = lib.checkCommentTrust(validParsed, {
    pipeline: '100',
    hostIssueNumber: '999',
    hostLabels: ['multiagent/analyza'],
    authorPermission: 'write',
  });
  assert.strictEqual(t.allowed, false);
}
console.log('OK  N4: vstup="102" ≠ hostitelské issue #999 → deny (kopie)');

// N5: kind neodpovídá labelu hostitele
{
  const parsedV = lib.parseVerdictComment({ id: 2, created_at: '2026-08-05T10:00:00Z', author: 'alice', body: commentBody({ kind: 'V' }) });
  const t = lib.checkCommentTrust(parsedV, {
    pipeline: '100',
    hostIssueNumber: '102',
    hostLabels: ['multiagent', 'multiagent/analyza'],
    authorPermission: 'write',
  });
  assert.strictEqual(t.allowed, false);
}
console.log('OK  N5: kind="V" na issue s multiagent/analyza → deny (artefakt)');

// N6: autor bez dostatečného oprávnění
for (const perm of ['read', 'triage', 'none', null, undefined]) {
  const t = lib.checkCommentTrust(validParsed, {
    pipeline: '100',
    hostIssueNumber: '102',
    hostLabels: ['multiagent/analyza'],
    authorPermission: perm,
  });
  assert.strictEqual(t.allowed, false, `permission ${perm} mělo být deny`);
}
console.log('OK  N6: autor s permission read/triage/none/neznámou → deny (trust)');

// N13: kontrola="self" bez risk/low
{
  const parsedSelf = lib.parseVerdictComment({ id: 3, created_at: '2026-08-05T10:00:00Z', author: 'alice', body: commentBody({ kontrola: 'self' }) });
  const t = lib.checkCommentTrust(parsedSelf, {
    pipeline: '100',
    hostIssueNumber: '102',
    hostLabels: ['multiagent/analyza'],
    riskLow: false,
    authorPermission: 'write',
  });
  assert.strictEqual(t.allowed, false);
}
console.log('OK  N13: kontrola="self" bez risk/low na [PIPELINE] → deny');

// --- resolveVerdictSignal ----------------------------------------------------

const hostIssueA = { number: 102, labels: ['multiagent', 'multiagent/analyza'] };

// P1: validní GO komentář (marker + pole + autor write) → status GO, source comment
{
  const r = lib.resolveVerdictSignal({
    kind: 'A',
    pipeline: '100',
    hostIssue: hostIssueA,
    comments: [{ id: 1, body: commentBody(), created_at: '2026-08-05T10:00:00Z', author: 'alice' }],
    verdictIssues: [],
    labelEvents: [],
    permissions: { alice: 'write' },
    pipelineLabels: [],
  });
  assert.strictEqual(r.status, 'GO');
  assert.strictEqual(r.source, 'comment');
}
console.log('OK  P1: validní GO komentář → status GO, source comment');

// P2: staré [VERDIKT-A] gate/go + Verdikt: GO → status GO, source issue
{
  const r = lib.resolveVerdictSignal({
    kind: 'A',
    pipeline: '100',
    verdictIssues: [
      { number: 105, body: 'Verdikt: GO\n\nPipeline: #100\n', labels: ['multiagent', 'multiagent/verdikt', 'gate/go'], created_at: '2026-08-05T09:00:00Z' },
    ],
  });
  assert.strictEqual(r.status, 'GO');
  assert.strictEqual(r.source, 'issue');
}
console.log('OK  P2: staré [VERDIKT-A] gate/go + Verdikt: GO → status GO, source issue (zpětná kompatibilita)');

// P3: osa GO → NO-GO → GO (novější) → status GO
{
  const r = lib.resolveVerdictSignal({
    kind: 'A',
    pipeline: '100',
    verdictIssues: [
      { number: 90, body: 'Verdikt: GO\n\nPipeline: #100\n', labels: ['multiagent/verdikt', 'gate/go'], created_at: '2026-08-01T09:00:00Z' },
      { number: 91, body: 'Verdikt: NO-GO\n\nPipeline: #100\n', labels: ['multiagent/verdikt', 'gate/no-go'], created_at: '2026-08-02T09:00:00Z' },
      { number: 92, body: 'Verdikt: GO\n\nPipeline: #100\n', labels: ['multiagent/verdikt', 'gate/go'], created_at: '2026-08-03T09:00:00Z' },
    ],
  });
  assert.strictEqual(r.status, 'GO');
  assert.strictEqual(r.authoritative.id, 92);
}
console.log('OK  P3: osa GO → NO-GO → GO (novější) → status GO (poslední autoritativní)');

// P4: kontrola="self" + risk/low na [PIPELINE] → status GO
{
  const r = lib.resolveVerdictSignal({
    kind: 'A',
    pipeline: '100',
    hostIssue: hostIssueA,
    comments: [{ id: 4, body: commentBody({ kontrola: 'self' }), created_at: '2026-08-05T10:00:00Z', author: 'alice' }],
    verdictIssues: [],
    labelEvents: [],
    permissions: { alice: 'write' },
    pipelineLabels: ['risk/low'],
  });
  assert.strictEqual(r.status, 'GO');
  assert.strictEqual(r.source, 'comment');
}
console.log('OK  P4: kontrola="self" + risk/low na [PIPELINE] → status GO');

// P5: validní GO + STARŠÍ gate/pending event → GO (event je starší, není stale)
{
  const r = lib.resolveVerdictSignal({
    kind: 'A',
    pipeline: '100',
    hostIssue: hostIssueA,
    comments: [{ id: 5, body: commentBody(), created_at: '2026-08-05T10:00:00Z', author: 'alice' }],
    verdictIssues: [],
    labelEvents: [{ event: 'labeled', label: { name: 'gate/pending' }, created_at: '2026-08-05T08:00:00Z' }],
    permissions: { alice: 'write' },
    pipelineLabels: [],
  });
  assert.strictEqual(r.status, 'GO');
}
console.log('OK  P5: GO + starší gate/pending event → status GO (není stale)');

// N7: osa GO → NO-GO (poslední NO-GO) → status NO-GO
{
  const r = lib.resolveVerdictSignal({
    kind: 'A',
    pipeline: '100',
    verdictIssues: [
      { number: 90, body: 'Verdikt: GO\n\nPipeline: #100\n', labels: ['multiagent/verdikt', 'gate/go'], created_at: '2026-08-01T09:00:00Z' },
      { number: 91, body: 'Verdikt: NO-GO\n\nPipeline: #100\n', labels: ['multiagent/verdikt', 'gate/no-go'], created_at: '2026-08-02T09:00:00Z' },
    ],
  });
  assert.strictEqual(r.status, 'NO-GO');
}
console.log('OK  N7: osa GO → NO-GO (poslední) → status NO-GO');

// N8: GO starší než labeled gate/no-go/gate/pending event → status stale
{
  const r = lib.resolveVerdictSignal({
    kind: 'A',
    pipeline: '100',
    hostIssue: hostIssueA,
    comments: [{ id: 6, body: commentBody(), created_at: '2026-08-05T10:00:00Z', author: 'alice' }],
    verdictIssues: [],
    labelEvents: [{ event: 'labeled', label: { name: 'gate/pending' }, created_at: '2026-08-05T11:00:00Z' }],
    permissions: { alice: 'write' },
    pipelineLabels: [],
  });
  assert.strictEqual(r.status, 'stale');
}
console.log('OK  N8: GO starší než novější gate/pending event → status stale');

// Fail-closed: neúplný/neznámý komentář nikdy nedá GO; chybějící kontext → 'none', ne GO
{
  const r = lib.resolveVerdictSignal({
    kind: 'A',
    pipeline: '100',
    comments: [{ id: 7, body: commentBody(), created_at: '2026-08-05T10:00:00Z', author: 'alice' }],
    // hostIssue/labelEvents/permissions chybí → komentáře se neuvažují (fail-closed default)
    verdictIssues: [],
  });
  assert.strictEqual(r.status, 'none');
}
console.log('OK  fail-closed: bez hostIssue/labelEvents/permissions se GO komentář neuváží → status none');

{
  const r = lib.resolveVerdictSignal({ kind: 'A', pipeline: '100' });
  assert.strictEqual(r.status, 'none');
}
console.log('OK  fail-closed: prázdný vstup → status none (nikdy GO)');

// --- buildUnifiedVerdictHistoryLine ------------------------------------------

{
  const r = lib.resolveVerdictSignal({
    kind: 'A',
    pipeline: '100',
    verdictIssues: [
      { number: 104, body: 'Verdikt: NO-GO\n\nPipeline: #100\n', labels: ['multiagent/verdikt', 'gate/no-go'], created_at: '2026-08-05T09:00:00Z' },
    ],
    hostIssue: hostIssueA,
    comments: [{ id: 123, body: commentBody(), created_at: '2026-08-05T10:00:00Z', author: 'alice' }],
    labelEvents: [],
    permissions: { alice: 'write' },
    pipelineLabels: [],
  });
  const line = lib.buildUnifiedVerdictHistoryLine('VERDIKT-A', r);
  assert.strictEqual(line, 'VERDIKT-A #104 NO-GO → komentář #123 GO (rework 1/3)');
}
console.log('OK  buildUnifiedVerdictHistoryLine: issue NO-GO → GO komentář v jedné chronologické historii');

{
  const line = lib.buildUnifiedVerdictHistoryLine('VERDIKT-V', { timeline: [] });
  assert.strictEqual(line, null);
}
console.log('OK  buildUnifiedVerdictHistoryLine: prázdná osa → null');

console.log('OK ma-verdict-lib tests');
NODE

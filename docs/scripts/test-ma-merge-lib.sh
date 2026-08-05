#!/usr/bin/env bash
# Unit tests for ma-merge-lib.cjs (offline, fixtures, no GitHub API calls).
# Pipeline: #81 (ANALÝZA #93 v2 — oprava vad 1/2/3 z VERDIKT-A NO-GO #94).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"
node <<'NODE'
const assert = require('assert');
const lib = require('./docs/scripts/ma-merge-lib.cjs');

// --- parseMergePending -------------------------------------------------

{
  const comments = [
    { id: 1, created_at: '2026-08-01T10:00:00Z', body: 'foo' },
    {
      id: 2,
      created_at: '2026-08-02T10:00:00Z',
      body:
        'MERGE-PENDING\n\n<!-- multiagent-merge-pending pipeline="81" branch="feature/pipeline-81-merge-git-ukol" sha="abc1234" -->',
    },
  ];
  const parsed = lib.parseMergePending(comments);
  assert.strictEqual(parsed.pipeline, '81');
  assert.strictEqual(parsed.branch, 'feature/pipeline-81-merge-git-ukol');
  assert.strictEqual(parsed.sha, 'abc1234');
  assert.strictEqual(parsed.source, 'marker');
}
console.log('OK  parseMergePending: marker (branch/sha/pipeline)');

{
  const comments = [
    {
      id: 1,
      created_at: '2026-08-01T10:00:00Z',
      body: 'MERGE-PENDING\n\n**Větev:** `feature/pipeline-74-merge-clovek`\n**HEAD:** `deadbee`',
    },
  ];
  const parsed = lib.parseMergePending(comments);
  assert.strictEqual(parsed.pipeline, null);
  assert.strictEqual(parsed.branch, 'feature/pipeline-74-merge-clovek');
  assert.strictEqual(parsed.sha, 'deadbee');
  assert.strictEqual(parsed.source, 'fallback');
}
console.log('OK  parseMergePending: chybějící marker → fallback na **Větev:**/**HEAD:**');

{
  const comments = [
    {
      id: 1,
      created_at: '2026-08-01T10:00:00Z',
      body: '<!-- multiagent-merge-pending pipeline="81" branch="feature/old" sha="1111111" -->',
    },
    {
      id: 2,
      created_at: '2026-08-03T10:00:00Z',
      body: '<!-- multiagent-merge-pending pipeline="81" branch="feature/new" sha="2222222" -->',
    },
  ];
  const parsed = lib.parseMergePending(comments);
  assert.strictEqual(parsed.branch, 'feature/new');
  assert.strictEqual(parsed.sha, '2222222');
}
console.log('OK  parseMergePending: dva markery → poslední (created_at) vyhrává');

{
  const parsed = lib.parseMergePending([{ id: 1, created_at: '2026-08-01T10:00:00Z', body: 'nic tu není' }]);
  assert.strictEqual(parsed, null);
}
console.log('OK  parseMergePending: chybí marker i fallback → null (guard fail E2)');

// --- evaluateGuards -----------------------------------------------------

const fullGoFixture = {
  actorPermission: 'write',
  pipelineIssue: { state: 'open', labels: ['multiagent', 'multiagent/pipeline', 'gate/go'] },
  verdicts: {
    A: { gate: 'gate/go', verdikt: 'GO' },
    V: { gate: 'gate/go', verdikt: 'GO' },
    T: { gate: 'gate/go', verdikt: 'GO' },
  },
  openBlockerBugInScope: false,
  branchExistsOnOrigin: true,
  headMatchesSha: true,
  mergeConflict: false,
  checkFailed: false,
};

{
  const r = lib.evaluateGuards(fullGoFixture);
  assert.strictEqual(r.pass, true);
  assert.deepStrictEqual(r.failures, []);
}
console.log('OK  evaluateGuards: plná GO sada → pass');

{
  const fixture = {
    ...fullGoFixture,
    verdicts: { ...fullGoFixture.verdicts, V: { gate: 'gate/no-go', verdikt: 'NO-GO' } },
  };
  const r = lib.evaluateGuards(fixture);
  assert.strictEqual(r.pass, false);
  assert.ok(r.failures.some((f) => f.includes('VERDIKT-V')));
}
console.log('OK  evaluateGuards: verdikt NO-GO → fail (G2)');

{
  const fixture = {
    ...fullGoFixture,
    pipelineIssue: { state: 'open', labels: ['multiagent', 'multiagent/pipeline', 'gate/pending'] },
  };
  const r = lib.evaluateGuards(fixture);
  assert.strictEqual(r.pass, false);
  assert.ok(r.failures.some((f) => f.startsWith('G1:')));
}
console.log('OK  evaluateGuards: chybějící gate/go na [PIPELINE] → fail (G1)');

{
  const fixture = { ...fullGoFixture, openBlockerBugInScope: true };
  const r = lib.evaluateGuards(fixture);
  assert.strictEqual(r.pass, false);
  assert.ok(r.failures.some((f) => f.startsWith('G3:')));
}
console.log('OK  evaluateGuards: otevřený blocker bug ve scope → fail (G3)');

{
  const fixture = { ...fullGoFixture, headMatchesSha: false };
  const r = lib.evaluateGuards(fixture);
  assert.strictEqual(r.pass, false);
  assert.ok(r.failures.some((f) => f.startsWith('G4:') && f.includes('drift')));
}
console.log('OK  evaluateGuards: HEAD drift → fail (G4, D5)');

{
  const fixture = { ...fullGoFixture, branchExistsOnOrigin: false };
  const r = lib.evaluateGuards(fixture);
  assert.strictEqual(r.pass, false);
  assert.ok(r.failures.some((f) => f.startsWith('G4:') && f.includes('neexistuje')));
}
console.log('OK  evaluateGuards: větev neexistuje na originu → fail (G4)');

{
  const fixture = { ...fullGoFixture, actorPermission: 'read' };
  const r = lib.evaluateGuards(fixture);
  assert.strictEqual(r.pass, false);
  assert.ok(r.failures.some((f) => f.startsWith('G0:')));
}
console.log('OK  evaluateGuards: actor bez ≥ write → fail (G0)');

{
  const fixture = { ...fullGoFixture, markerPipelineOk: false };
  const r = lib.evaluateGuards(fixture);
  assert.strictEqual(r.pass, false);
  assert.ok(r.failures.some((f) => f.startsWith('G4b:')));
}
console.log('OK  evaluateGuards: pipeline= v markeru ≠ issue → fail (G4b)');

// --- G2 přes verdictSignals (ANALÝZA #102 v2 — resolveVerdictSignal) --------

const fullGoSignals = {
  A: { status: 'GO', source: 'comment' },
  V: { status: 'GO', source: 'issue' },
  T: { status: 'GO', source: 'comment' },
};

{
  const fixture = { ...fullGoFixture, verdicts: undefined, verdictSignals: fullGoSignals };
  const r = lib.evaluateGuards(fixture);
  assert.strictEqual(r.pass, true);
}
console.log('OK  evaluateGuards: verdictSignals plná GO sada (GO komentář i staré issue) → pass');

for (const status of ['NO-GO', 'stale', 'none']) {
  const fixture = {
    ...fullGoFixture,
    verdicts: undefined,
    verdictSignals: { ...fullGoSignals, V: { status } },
  };
  const r = lib.evaluateGuards(fixture);
  assert.strictEqual(r.pass, false, `status ${status} mělo selhat`);
  assert.ok(r.failures.some((f) => f.startsWith('G2:') && f.includes('VERDIKT-V')));
}
console.log('OK  evaluateGuards: verdictSignals status NO-GO/stale/none → fail (G2), nikdy GO');

{
  // verdictSignals má přednost před legacy verdicts, i kdyby legacy tvar byl formálně GO.
  const fixture = {
    ...fullGoFixture,
    verdictSignals: { ...fullGoSignals, A: { status: 'stale' } },
  };
  const r = lib.evaluateGuards(fixture);
  assert.strictEqual(r.pass, false);
  assert.ok(r.failures.some((f) => f.includes('VERDIKT-A')));
}
console.log('OK  evaluateGuards: verdictSignals má přednost před legacy verdicts');

// --- shaMatches / markerPipelineMatches --------------------------------

{
  assert.strictEqual(lib.shaMatches('abcdef0123456789', 'abcdef0'), true);
  assert.strictEqual(lib.shaMatches('abcdef0123456789', 'abcdef0123456789'), true);
  assert.strictEqual(lib.shaMatches('abcdef0123456789', 'abc'), false); // < 7
  assert.strictEqual(lib.shaMatches('abcdef0123456789', 'zzzzzzz'), false);
  assert.strictEqual(lib.shaMatches('', 'abcdef0'), false);
}
console.log('OK  shaMatches: ≥7 prefix / equality; krátký SHA reject');

{
  assert.strictEqual(
    lib.markerPipelineMatches({ pipeline: '81', source: 'marker' }, 81),
    true
  );
  assert.strictEqual(
    lib.markerPipelineMatches({ pipeline: '99', source: 'marker' }, 81),
    false
  );
  assert.strictEqual(
    lib.markerPipelineMatches({ pipeline: null, source: 'fallback' }, 81),
    true
  );
}
console.log('OK  markerPipelineMatches: marker vs fallback');

// --- authorizeRun (vada 1 z VERDIKT-A NO-GO #94) ------------------------

{
  const r = lib.authorizeRun({ eventName: 'issues', labelName: 'merge/approved', currentLabels: ['merge/approved'] });
  assert.deepStrictEqual({ allowed: r.allowed, push: r.push }, { allowed: true, push: true });
}
console.log('OK  authorizeRun: issues.labeled + merge/approved → {allowed:true, push:true}');

{
  const r = lib.authorizeRun({ eventName: 'issues', labelName: 'gate/go', currentLabels: ['gate/go'] });
  assert.deepStrictEqual({ allowed: r.allowed, push: r.push }, { allowed: false, push: false });
}
console.log('OK  authorizeRun: issues.labeled s jiným labelem → deny');

{
  const r = lib.authorizeRun({ eventName: 'workflow_dispatch', dryRun: true, currentLabels: [] });
  assert.deepStrictEqual({ allowed: r.allowed, push: r.push }, { allowed: true, push: false });
}
console.log('OK  authorizeRun: dispatch dry_run:true (default) → {allowed:true, push:false}');

{
  const r = lib.authorizeRun({ eventName: 'workflow_dispatch', dryRun: false, currentLabels: [] });
  assert.deepStrictEqual({ allowed: r.allowed, push: r.push }, { allowed: false, push: false });
}
console.log('OK  authorizeRun: dispatch dry_run:false bez merge/approved → {allowed:false, push:false}');

{
  const r = lib.authorizeRun({
    eventName: 'workflow_dispatch',
    dryRun: false,
    currentLabels: ['merge/approved'],
    approvedByPermission: 'read',
  });
  assert.deepStrictEqual({ allowed: r.allowed, push: r.push }, { allowed: false, push: false });
}
console.log('OK  authorizeRun: dispatch dry_run:false, label od uživatele bez ≥ write → deny');

{
  const r = lib.authorizeRun({
    eventName: 'workflow_dispatch',
    dryRun: false,
    currentLabels: ['merge/approved'],
    approvedByPermission: 'write',
  });
  assert.deepStrictEqual({ allowed: r.allowed, push: r.push }, { allowed: true, push: true });
}
console.log('OK  authorizeRun: dispatch dry_run:false, ověřený merge/approved (≥ write) → {allowed:true, push:true}');

{
  const r = lib.authorizeRun({ eventName: 'pull_request', currentLabels: ['merge/approved'] });
  assert.deepStrictEqual({ allowed: r.allowed, push: r.push }, { allowed: false, push: false });
}
console.log('OK  authorizeRun: neznámá událost → deny');

// Invariant (DoD 6): žádný vstup s dryRun:true nebo allowed:false nesmí vrátit push:true.
{
  const matrix = [
    { eventName: 'issues', labelName: 'merge/approved', currentLabels: [] },
    { eventName: 'issues', labelName: 'gate/go', currentLabels: [] },
    { eventName: 'workflow_dispatch', dryRun: true, currentLabels: ['merge/approved'], approvedByPermission: 'admin' },
    { eventName: 'workflow_dispatch', dryRun: false, currentLabels: [], approvedByPermission: 'admin' },
    { eventName: 'workflow_dispatch', dryRun: false, currentLabels: ['merge/approved'], approvedByPermission: 'none' },
    { eventName: 'workflow_dispatch', dryRun: false, currentLabels: ['merge/approved'], approvedByPermission: 'write' },
    { eventName: 'bogus', currentLabels: ['merge/approved'] },
  ];
  for (const input of matrix) {
    const r = lib.authorizeRun(input);
    if (input.dryRun === true || r.allowed === false) {
      assert.strictEqual(r.push, false, `invariant porušen pro ${JSON.stringify(input)}`);
    }
  }
}
console.log('OK  authorizeRun: invariant — dryRun:true nebo allowed:false nikdy nevrátí push:true');

// --- composeResultComment (vada 3 z VERDIKT-A NO-GO #94) ----------------

{
  const body = lib.composeResultComment({
    status: 'merged',
    mergeSha: 'abc1234',
    mergedCommits: [{ sha: 'abc1234', message: "Merge branch 'feature/x' (#81)" }],
    runUrl: 'https://github.com/pida1200/Test2/actions/runs/1',
    wikiSync: 'ok',
  });
  assert.ok(body.includes('<!-- multiagent-merge-result -->'));
  assert.ok(body.includes('wiki-sync: ok'));
}
console.log('OK  composeResultComment: marker + wiki-sync: ok');

{
  const body = lib.composeResultComment({ status: 'merged', mergeSha: 'abc1234', wikiSync: 'skipped', wikiSyncReason: 'dry-run' });
  assert.ok(body.includes('wiki-sync: skipped (dry-run)'));
}
console.log('OK  composeResultComment: wiki-sync: skipped uvádí důvod');

{
  const body = lib.composeResultComment({
    status: 'merged',
    mergeSha: 'abc1234',
    wikiSync: 'failed',
    wikiLogArtifactUrl: 'https://github.com/pida1200/Test2/actions/runs/1#artifacts',
    followUpIssueUrl: 'https://github.com/pida1200/Test2/issues/999',
  });
  assert.ok(body.includes('wiki-sync: failed'));
  assert.ok(body.includes('https://github.com/pida1200/Test2/actions/runs/1#artifacts'));
  assert.ok(body.includes('https://github.com/pida1200/Test2/issues/999'));
}
console.log('OK  composeResultComment: wiki-sync: failed → odkaz na log i follow-up');

{
  const body = lib.composeResultComment({
    status: 'failed',
    failureReasons: ['G2: poslední [VERDIKT-V] nemá gate/go + „Verdikt: GO“'],
    wikiSync: 'skipped',
    wikiSyncReason: 'merge neproběhl',
  });
  assert.ok(body.includes('1. G2:'));
  assert.ok(body.includes('wiki-sync: skipped (merge neproběhl)'));
}
console.log('OK  composeResultComment: status failed → číslovaný seznam důvodů');

{
  let threw = false;
  try {
    lib.composeResultComment({ status: 'merged', mergeSha: 'abc1234' });
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, 'composeResultComment musí selhat, chybí-li wiki-sync stav');
}
console.log('OK  composeResultComment: chybějící wikiSync → throw (řádek wiki-sync: nesmí chybět)');

console.log('OK ma-merge-lib tests');
NODE

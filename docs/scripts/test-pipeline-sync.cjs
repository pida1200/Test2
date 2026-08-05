#!/usr/bin/env node
/**
 * Unit tests for pipeline-sync-lib.js
 * Run: bash docs/scripts/test-pipeline-sync.sh
 */
const assert = require('assert');
const lib = require('./pipeline-sync-lib.cjs');

const { START, END } = lib;

let passed = 0;
let failed = 0;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log('OK  ' + name);
      passed++;
    })
    .catch((e) => {
      console.error('FAIL ' + name);
      console.error('  ' + e.message);
      failed++;
    });
}

const sampleSection = [
  START,
  '',
  '| Fáze | Issue | Gate | Stav |',
  '|------|-------|------|------|',
  '| ANALÝZA | #13 | `gate/go` | open |',
  '',
  'Historie verdiktů: —',
  '',
  'Další krok: **Analytik** · `claude-opus-5-thinking-high` · /m #17',
  '',
  END,
].join('\n');

const newSection = [
  START,
  '',
  '| Fáze | Issue | Gate | Stav |',
  '|------|-------|------|------|',
  '| IMPLEMENTACE | #19 | `gate/pending` | open |',
  '',
  'Historie verdiktů: VERDIKT-V #12 NO-GO → #14 GO (rework 1/3)',
  '',
  'Další krok: **Vývojář** · `composer-2.5-fast` · /m #17',
  '',
  END,
].join('\n');

async function run() {
  await test('marker replace preserves outside text', () => {
    const body = '### Feature\n\nRuční kontext Integrátora.\n\n' + sampleSection + '\n\n### Ověření\nnpm test\n';
    const result = lib.replacePrehledSection(body, newSection);
    assert.ok(result.includes('Ruční kontext Integrátora.'), 'prefix preserved');
    assert.ok(result.includes('### Ověření'), 'suffix preserved');
    assert.ok(result.includes('IMPLEMENTACE | #19'), 'section updated');
    assert.ok(!result.includes('| ANALÝZA | #13 |'), 'old section gone');
  });

  await test('missing markers appends section', () => {
    const body = '### Feature\n\nBez markerů.\n';
    const result = lib.replacePrehledSection(body, sampleSection);
    assert.ok(result.includes('Bez markerů.'), 'original kept');
    assert.ok(result.includes(START), 'markers appended');
    assert.ok(result.endsWith('\n'));
  });

  await test('no-op when section unchanged', () => {
    const body = 'Intro\n\n' + sampleSection + '\n';
    const result = lib.replacePrehledSection(body, sampleSection);
    assert.strictEqual(result, body);
  });

  await test('preserve outside text key stable', () => {
    const body = 'A\n\n' + sampleSection + '\n\nB';
    const k1 = lib.outsideKey(body);
    const replaced = lib.replacePrehledSection(body, newSection);
    const k2 = lib.outsideKey(replaced);
    assert.strictEqual(k1, k2);
  });

  await test('isVerdictNoGo line-anchored (not mid-line citation)', () => {
    assert.strictEqual(lib.isVerdictNoGo('Verdikt: NO-GO\n\nVady...'), true);
    assert.strictEqual(lib.isVerdictNoGo('Verdikt: GO\n\nOK'), false);
    assert.strictEqual(
      lib.isVerdictNoGo('### CI\n\nVerdikt: NO-GO\n\nPipeline: #1\n'),
      true,
    );
    assert.strictEqual(
      lib.isVerdictGo('### CI\n\nVerdikt: GO\n\nPipeline: #1\n'),
      true,
    );
  });

  await test('GO body citing Verdikt: NO-GO does not count as NO-GO', () => {
    const goWithCitation = [
      'Verdikt: GO',
      '',
      'Opraveno dle #20. Předchozí verdikt obsahoval: Verdikt: NO-GO',
    ].join('\n');
    assert.strictEqual(lib.isVerdictNoGo(goWithCitation), false);
    assert.strictEqual(lib.isVerdictGo(goWithCitation), true);
    const issues = [
      { number: 20, body: 'Verdikt: NO-GO\n\nVady' },
      { number: 22, body: goWithCitation },
    ];
    assert.strictEqual(lib.countNoGoRounds(issues), 1);
    const line = lib.buildVerdictHistoryLine('VERDIKT-V', issues);
    assert.ok(line.includes('#20 NO-GO'));
    assert.ok(line.includes('#22 GO'));
    assert.ok(line.includes('rework 1/3'));
  });

  await test('history counts NO-GO issues even if latest is GO', () => {
    const issues = [
      { number: 12, body: 'Verdikt: NO-GO\n\nVady' },
      { number: 14, body: 'Verdikt: GO\n\nOK' },
    ];
    const line = lib.buildVerdictHistoryLine('VERDIKT-V', issues);
    assert.ok(line.includes('#12 NO-GO'));
    assert.ok(line.includes('#14 GO'));
    assert.ok(line.includes('rework 1/3'));
    assert.strictEqual(lib.countNoGoRounds(issues), 1);
  });

  await test('3x NO-GO body → shouldBlockPipeline', () => {
    const byPhase = {
      'VERDIKT-V': [
        { number: 5, body: 'Verdikt: NO-GO\n' },
        { number: 6, body: 'Verdikt: NO-GO\n' },
        { number: 7, body: 'Verdikt: NO-GO\n' },
      ],
    };
    assert.strictEqual(lib.maxNoGoRounds(byPhase), 3);
    assert.strictEqual(lib.shouldBlockPipeline(byPhase), true);
  });

  await test('2x NO-GO does not block', () => {
    const byPhase = {
      'VERDIKT-A': [
        { number: 1, body: 'Verdikt: NO-GO\n' },
        { number: 2, body: 'Verdikt: NO-GO\n' },
      ],
    };
    assert.strictEqual(lib.shouldBlockPipeline(byPhase), false);
  });

  await test('safeUpdatePipelineBody retries after outside drift (mock)', async () => {
    let reads = 0;
    let body = 'Manual edit\n\n' + sampleSection + '\n';
    const github = {
      rest: {
        issues: {
          get: async () => {
            reads++;
            if (reads === 2) {
              body = 'Manual edit CHANGED\n\n' + sampleSection + '\n';
            }
            return { data: { body } };
          },
          update: async ({ body: nb }) => {
            body = nb;
            return {};
          },
        },
      },
    };
    const r = await lib.safeUpdatePipelineBody(github, 'o', 'r', 17, newSection, { maxRetries: 3 });
    assert.strictEqual(r.updated, true);
    assert.ok(reads >= 4, 'expected re-fetch retry after drift (reads=' + reads + ')');
    assert.ok(body.includes('Manual edit CHANGED'), 'uses latest outside text');
    assert.ok(body.includes('IMPLEMENTACE | #19'), 'section updated after retry');
  });

  await test('safeUpdatePipelineBody succeeds when stable (mock)', async () => {
    let body = 'Keep me\n\n' + sampleSection + '\n\nTail';
    const github = {
      rest: {
        issues: {
          get: async () => ({ data: { body } }),
          update: async ({ body: nb }) => {
            body = nb;
            return {};
          },
        },
      },
    };
    const r = await lib.safeUpdatePipelineBody(github, 'o', 'r', 17, newSection);
    assert.strictEqual(r.updated, true);
    assert.ok(body.includes('Keep me'));
    assert.ok(body.includes('Tail'));
    assert.ok(body.includes('IMPLEMENTACE | #19'));
  });

  console.log('');
  console.log(`=== test-pipeline-sync: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();

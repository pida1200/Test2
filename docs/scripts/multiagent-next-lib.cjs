/**
 * Shared next-step routing for multiagent-next.yml + dry-run + tests.
 * Model slugs mirror docs/multi-agent-workflow.md (sekce Modely) — keep in sync there first.
 */

const { PIPELINE_RE, VSTUP_RE, VERDIKT_RE, parsePipelineNum } = require('./pipeline-sync-lib.cjs');
const verdictLib = require('./ma-verdict-lib.cjs');

const ARTIFACT_ORDER = [
  'multiagent/verdikt',
  'multiagent/analyza',
  'multiagent/implementace',
  'multiagent/testy',
  'multiagent/pipeline',
  'multiagent/bug',
];

const GATE_PRECEDENCE = ['gate/go', 'gate/no-go', 'gate/blocked', 'gate/pending'];

const MODELS = {
  // Cursor Models only (Grok + Composer) — vyhnout se Anthropic/OpenAI on-demand.
  // Kontrolor ≠ produkce: Grok high vs high-fast / Composer vs Grok.
  analytik: 'cursor-grok-4.5-high',
  kontrolorA: 'cursor-grok-4.5-high-fast',
  vyvojar: 'composer-2.5-fast',
  kontrolorV: 'cursor-grok-4.5-high',
  tester: 'composer-2.5-fast',
  kontrolorT: 'cursor-grok-4.5-high-fast',
  integrator: 'composer-2.5-fast',
};

/** CLI role slug for docs/scripts/ma-run-role.sh --role */
const ROLE_CLI = {
  'Kontrolor analytika': 'kontrolor-a',
  'Analytik (rework)': 'analytik',
  Analytik: 'analytik',
  Vývojář: 'vyvojar',
  'Vývojář (rework)': 'vyvojar',
  'Kontrolor vývojáře': 'kontrolor-v',
  Tester: 'tester',
  'Tester (rework)': 'tester',
  'Kontrolor testera': 'kontrolor-t',
  Integrátor: 'integrator',
  'Integrátor → Analytik': 'integrator',
  'Kontrolor A / Vývojář': 'kontrolor-a',
};

const verdictRoutes = {
  A: {
    'gate/pending': {
      role: 'Kontrolor analytika',
      model: MODELS.kontrolorA,
      hint: 'Verdikt GO|NO-GO + sync gate na #ANALÝZA',
    },
    'gate/go': {
      role: 'Vývojář',
      model: MODELS.vyvojar,
      hint: 'VERDIKT-A GO — spusť Vývojáře → [IMPLEMENTACE]',
    },
    'gate/no-go': {
      role: 'Analytik (rework)',
      model: MODELS.analytik,
      hint: 'VERDIKT-A NO-GO — oprav [ANALÝZA], znovu review',
    },
  },
  V: {
    'gate/pending': {
      role: 'Kontrolor vývojáře',
      model: MODELS.kontrolorV,
      hint: 'Verdikt GO|NO-GO + sync gate na #IMPLEMENTACE',
    },
    'gate/go': {
      role: 'Tester',
      model: MODELS.tester,
      hint: 'VERDIKT-V GO — spusť Testera → [TESTY]',
    },
    'gate/no-go': {
      role: 'Vývojář (rework)',
      model: MODELS.vyvojar,
      hint: 'VERDIKT-V NO-GO — oprav [IMPLEMENTACE], znovu review',
    },
  },
  T: {
    'gate/pending': {
      role: 'Kontrolor testera',
      model: MODELS.kontrolorT,
      hint: 'Verdikt GO|NO-GO + sync gate na #TESTY',
    },
    'gate/go': {
      role: 'Integrátor',
      model: MODELS.integrator,
      hint: 'VERDIKT-T GO — Integrátor: handoff MERGE-PENDING (merge do main = člověk)',
    },
    'gate/no-go': {
      role: 'Tester (rework)',
      model: MODELS.tester,
      hint: 'VERDIKT-T NO-GO — oprav [TESTY] nebo eskalace na Vývojáře',
    },
  },
};

const artifactMap = {
  'multiagent/pipeline': {
    'gate/pending': {
      role: 'Integrátor → Analytik',
      model: MODELS.integrator,
      hint: 'Kickoff: vytvoř [ANALÝZA] nebo spusť Analytika',
    },
    'gate/blocked': {
      role: 'Eskalace',
      model: '—',
      hint: 'Vyřeš blokaci (≥3 reworky), sundat gate/blocked',
    },
    'gate/go': {
      role: 'Integrátor',
      model: MODELS.integrator,
      hint: 'MERGE-PENDING — přidej label `merge/approved` (spustí multiagent-merge.yml)',
    },
  },
  'multiagent/analyza': {
    'gate/pending': {
      role: 'Analytik',
      model: MODELS.analytik,
      hint: 'Doplň analýzu → Kontrolor A',
    },
    'gate/no-go': {
      role: 'Analytik (rework)',
      model: MODELS.analytik,
      hint: 'Oprav dle VERDIKT-A',
    },
    'gate/go': {
      role: 'Kontrolor A / Vývojář',
      model: MODELS.kontrolorA,
      hint: 'Analýza schválena — čeká VERDIKT-A nebo Vývojář',
    },
  },
  'multiagent/implementace': {
    'gate/pending': {
      role: 'Vývojář',
      model: MODELS.vyvojar,
      hint: 'Implementuj dle ANALÝZY; WIP commit OK',
    },
    'gate/no-go': {
      role: 'Vývojář (rework)',
      model: MODELS.vyvojar,
      hint: 'Oprav dle VERDIKT-V',
    },
    'gate/go': {
      role: 'Kontrolor V / Tester',
      model: MODELS.kontrolorV,
      hint: 'Implementace schválena — čeká VERDIKT-V nebo Tester',
    },
  },
  'multiagent/testy': {
    'gate/pending': {
      role: 'Tester',
      model: MODELS.tester,
      hint: 'Testy + checklist → Kontrolor T',
    },
    'gate/no-go': {
      role: 'Tester (rework)',
      model: MODELS.tester,
      hint: 'Oprav testy dle VERDIKT-T',
    },
    'gate/go': {
      role: 'Integrátor',
      model: MODELS.integrator,
      hint: 'Testy OK — Integrátor: MERGE-PENDING handoff (ne merge do main)',
    },
  },
  'multiagent/bug': {
    'gate/pending': {
      role: 'Vývojář',
      model: MODELS.vyvojar,
      hint: 'Bug mimo pipeline — oprav dle repo-kvalita.mdc nebo povyš na pipeline (/m #N)',
    },
  },
};

/** Phase-key → default model (for pipeline-sync prehled „Další krok“). */
const PHASE_MODELS = {
  ANALÝZA: MODELS.analytik,
  'VERDIKT-A': MODELS.kontrolorA,
  IMPLEMENTACE: MODELS.vyvojar,
  'VERDIKT-V': MODELS.kontrolorV,
  TESTY: MODELS.tester,
  'VERDIKT-T': MODELS.kontrolorT,
};

function resolveGate(labelList) {
  const gates = (labelList || []).filter((l) => l.startsWith('gate/'));
  for (const g of GATE_PRECEDENCE) {
    if (gates.includes(g)) return g;
  }
  return 'gate/pending';
}

function resolveArtifact(labelList) {
  const arts = (labelList || []).filter((l) => l.startsWith('multiagent/'));
  for (const a of ARTIFACT_ORDER) {
    if (arts.includes(a)) return a;
  }
  return arts[0] || 'multiagent/pipeline';
}

function verdictKind(title) {
  const t = title || '';
  if (/\[VERDIKT-A\]|VERDIKT-A/i.test(t)) return 'A';
  if (/\[VERDIKT-V\]|VERDIKT-V/i.test(t)) return 'V';
  if (/\[VERDIKT-T\]|VERDIKT-T/i.test(t)) return 'T';
  return null;
}

function parseVstupNum(body) {
  const m = (body || '').match(VSTUP_RE);
  return m ? m[1] : null;
}

function parseVerdiktValue(body) {
  const m = (body || '').match(VERDIKT_RE);
  return m ? m[1] : null;
}

function expectedProdLabel(title) {
  if (/\[VERDIKT-A\]|VERDIKT-A/i.test(title || '')) return 'multiagent/analyza';
  if (/\[VERDIKT-V\]|VERDIKT-V/i.test(title || '')) return 'multiagent/implementace';
  if (/\[VERDIKT-T\]|VERDIKT-T/i.test(title || '')) return 'multiagent/testy';
  return null;
}

/**
 * @param {{ labels: string[], title?: string, body?: string, issueNumber: number, riskLow?: boolean }} opts
 *   `riskLow` = má nadřazená `[PIPELINE]` label `risk/low`? (ANALÝZA #102 — přeskočí Kontrolora A)
 * @returns {{ artifact, gate, vk, pipelineNum, info, prompt, commentBody }}
 */
function routeNextStep(opts) {
  const labels = opts.labels || [];
  const title = opts.title || '';
  const body = opts.body || '';
  const n = opts.issueNumber;
  const riskLow = !!opts.riskLow;

  const artifact = resolveArtifact(labels);
  const gate = resolveGate(labels);
  const vk = artifact === 'multiagent/verdikt' ? verdictKind(title) : null;

  const parsed = parsePipelineNum(body);
  const pipelineNum =
    parsed || (artifact === 'multiagent/pipeline' ? String(n) : null);

  let info;
  if (artifact === 'multiagent/verdikt' && vk && verdictRoutes[vk]) {
    info = verdictRoutes[vk][gate] || verdictRoutes[vk]['gate/pending'];
  } else {
    const map = artifactMap[artifact] || artifactMap['multiagent/pipeline'];
    info =
      map[gate] ||
      map['gate/pending'] || { role: '—', model: '—', hint: 'Zkontroluj labely' };
  }

  // risk/low (#102): self-check GO na ANALÝZE (bez nového [VERDIKT-A]) → routuj rovnou
  // na Vývojáře, ne na nejednoznačné „Kontrolor A / Vývojář“.
  if (artifact === 'multiagent/analyza' && gate === 'gate/go' && riskLow) {
    info = {
      role: 'Vývojář',
      model: MODELS.vyvojar,
      hint: 'ANALÝZA self-check GO (risk/low, Kontrolor A přeskočen) — spusť Vývojáře → [IMPLEMENTACE]',
    };
  }

  const prompt = pipelineNum ? `/m #${pipelineNum}` : `/m #${n}`;
  const promptOnce = `${prompt} once`;
  const roleCli = ROLE_CLI[info.role] || null;
  const writeFlag =
    roleCli === 'vyvojar' || roleCli === 'tester' || roleCli === 'integrator'
      ? ' --write'
      : '';
  const cliOneLiner =
    roleCli && pipelineNum && info.model && info.model !== '—'
      ? `bash docs/scripts/ma-run-role.sh --role ${roleCli} --pipeline ${pipelineNum} --model ${info.model}${writeFlag}`
      : null;
  const verdictTag = vk ? ` · Verdikt: **${vk}**` : '';
  const marker = '<!-- multiagent-next -->';
  const commentLines = [
    marker,
    `### Multiagent — další krok`,
    ``,
    `Artefakt: \`${artifact}\` · Gate: \`${gate}\`${verdictTag} · Role: **${info.role}** · Model: \`${info.model}\``,
    ``,
  ];
  if (cliOneLiner) {
    commentLines.push(
      `CLI first (Integrátor / terminál):`,
      ``,
      '```bash',
      cliOneLiner,
      '```',
      ``,
      `Exit 3 = CLI chybí → Task fallback s vytištěným promptem. Orchestace:`,
      ``
    );
  } else {
    commentLines.push(`V Cursoru (Agent chat):`, ``);
  }
  commentLines.push(
    '```text',
    `${prompt}           # orchestrace do STOP (default)`,
    `${promptOnce}      # jen jeden krok`,
    '```',
    ``,
    `_(skill: \`.cursor/skills/m/SKILL.md\` — CI nespouští Cursor)_`,
    ``,
    `_${info.hint}_`,
    ``,
    `Docs: role card \`docs/ma-role-cards/\` · \`docs/multi-agent-workflow.md\``
  );
  const commentBody = commentLines.join('\n');

  return {
    artifact,
    gate,
    vk,
    pipelineNum,
    info,
    prompt,
    promptOnce,
    cliOneLiner,
    roleCli,
    commentBody,
    marker,
  };
}

function modelForPhase(phaseKey) {
  return PHASE_MODELS[phaseKey] || MODELS.integrator;
}

module.exports = {
  PIPELINE_RE,
  VSTUP_RE,
  VERDIKT_RE,
  MODELS,
  PHASE_MODELS,
  ROLE_CLI,
  ARTIFACT_ORDER,
  GATE_PRECEDENCE,
  resolveGate,
  resolveArtifact,
  verdictKind,
  parsePipelineNum,
  parseVstupNum,
  parseVerdiktValue,
  expectedProdLabel,
  routeNextStep,
  modelForPhase,
  // Re-export jediného verdikt parseru (ma-verdict-lib.cjs) — next.yml jej používá
  // pro risk/low routing (viz routeNextStep) beze změny importu ve workflow.
  verdictLib,
};

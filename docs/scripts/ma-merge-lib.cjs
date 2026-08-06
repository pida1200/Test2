/**
 * Pure helpers for .github/workflows/multiagent-merge.yml (testable offline, no GitHub/network deps).
 * Kontrakt: ANALÝZA #93 (v2, rework po VERDIKT-A NO-GO #94) + ANALÝZA #102 v2 (G2 přes
 * ma-verdict-lib.cjs, Pipeline #100). Guardy G0–G6 = evaluateGuards(); autorizace zápisu
 * (G7) = authorizeRun() — jediná a společná pro issues.labeled i workflow_dispatch,
 * default = deny. Workflow smí volat `git push` výhradně když authorizeRun().push === true.
 *
 * G2 (VERDIKT-A/V/T GO): preferovaný vstup je `verdictSignals` — `{ A, V, T }`, kde
 * každá hodnota je výstup `ma-verdict-lib.cjs#resolveVerdictSignal()` (`status`
 * GO|NO-GO|stale|none). Akceptuje se výhradně `status === 'GO'` — zpětně kompatibilní
 * i s legacy `verdicts` tvarem (`{ gate, verdikt }` z `[VERDIKT-*]` issue) pro pipeline
 * bez `verdictSignals`.
 */

const MERGE_PENDING_RE =
  /<!--\s*multiagent-merge-pending\s+pipeline="(\d+)"\s+branch="([^"]+)"\s+sha="([0-9a-fA-F]+)"\s*-->/;
const FALLBACK_BRANCH_RE = /\*\*Větev:\*\*\s*`([^`]+)`/;
const FALLBACK_SHA_RE = /\*\*HEAD:\*\*\s*`([0-9a-fA-F]+)`/;

const MERGE_RESULT_MARKER = '<!-- multiagent-merge-result -->';

const WRITE_PERMISSIONS = ['admin', 'write'];

/**
 * Parse the MERGE-PENDING handoff from `[PIPELINE]` comments.
 * Takes the LAST comment (by created_at) that carries the machine marker (E3 — rework
 * generates more than one handoff). Falls back to the pre-marker `**Větev:**` / `**HEAD:**`
 * shape for backward compatibility with older pipelines (#74, #83). Returns null when
 * neither is present (guard fail „chybí handoff“, E2).
 *
 * @param {{ body?: string, created_at?: string, id?: number }[]} comments
 * @returns {{ pipeline: string|null, branch: string, sha: string, source: 'marker'|'fallback', commentId?: number }|null}
 */
function parseMergePending(comments) {
  const sorted = [...(comments || [])].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );

  for (let i = sorted.length - 1; i >= 0; i--) {
    const body = sorted[i].body || '';
    const m = body.match(MERGE_PENDING_RE);
    if (m) {
      return {
        pipeline: m[1],
        branch: m[2],
        sha: m[3],
        source: 'marker',
        commentId: sorted[i].id,
      };
    }
  }

  for (let i = sorted.length - 1; i >= 0; i--) {
    const body = sorted[i].body || '';
    const b = body.match(FALLBACK_BRANCH_RE);
    const s = body.match(FALLBACK_SHA_RE);
    if (b && s) {
      return {
        pipeline: null,
        branch: b[1],
        sha: s[1],
        source: 'fallback',
        commentId: sorted[i].id,
      };
    }
  }

  return null;
}

/**
 * Single, shared write-authorization guard (G7) — oprava vady #1 (VERDIKT-A NO-GO #94).
 * `workflow_dispatch` NENÍ paralelní cesta k zápisu do `main`: ostrý běh (`dryRun: false`)
 * vyžaduje stejný ověřený signál `merge/approved` jako `issues.labeled`. Default = deny.
 *
 * Invariant vynucený implementací: nikdy nevrátí `push: true`, pokud `allowed !== true`
 * nebo je-li efektivně dry-run.
 *
 * @param {object} input
 * @param {'issues'|'workflow_dispatch'|string} input.eventName
 * @param {string} [input.labelName] - `github.event.label.name` (jen pro eventName === 'issues')
 * @param {boolean} [input.dryRun] - workflow_dispatch `dry_run` input; chybí-li, chová se jako `true` (fail-closed default)
 * @param {string[]} [input.currentLabels] - aktuální labely na `[PIPELINE]` issue
 * @param {string|null} [input.approvedByPermission] - oprávnění (admin|write|triage|read|none) uživatele, který přidal POSLEDNÍ `merge/approved` labeled timeline event
 * @returns {{ allowed: boolean, push: boolean, reason: string }}
 */
function authorizeRun(input) {
  const opts = input || {};
  const currentLabels = opts.currentLabels || [];
  const hasApprovedLabel = currentLabels.includes('merge/approved');

  let result;

  if (opts.eventName === 'issues') {
    if (opts.labelName === 'merge/approved') {
      result = { allowed: true, push: true, reason: 'issues.labeled: merge/approved' };
    } else {
      result = {
        allowed: false,
        push: false,
        reason: `issues.labeled: label „${opts.labelName || '?'}“ ≠ merge/approved`,
      };
    }
  } else if (opts.eventName === 'workflow_dispatch') {
    const dryRun = opts.dryRun !== false; // default true — fail-closed (§3.1 D6)
    if (dryRun) {
      result = { allowed: true, push: false, reason: 'workflow_dispatch dry_run:true — report only' };
    } else if (!hasApprovedLabel) {
      result = {
        allowed: false,
        push: false,
        reason: 'workflow_dispatch dry_run:false bez merge/approved na [PIPELINE]',
      };
    } else if (!WRITE_PERMISSIONS.includes(opts.approvedByPermission)) {
      result = {
        allowed: false,
        push: false,
        reason: 'merge/approved přidal uživatel bez oprávnění ≥ write (nebo nelze ověřit)',
      };
    } else {
      result = {
        allowed: true,
        push: true,
        reason: 'workflow_dispatch dry_run:false s ověřeným merge/approved (≥ write)',
      };
    }
  } else {
    result = { allowed: false, push: false, reason: `neznámá událost: ${opts.eventName}` };
  }

  // Defensive invariant — nikdy push:true bez allowed:true.
  if (result.push && !result.allowed) {
    return { allowed: false, push: false, reason: 'invariant: push vyžaduje allowed' };
  }
  return result;
}

/**
 * Guardy G0–G6 (bez G7 — ten je v authorizeRun). Čistá agregace nad předpočítanými
 * fakty (workflow je zjistí přes GitHub API); žádné síťové volání zde.
 *
 * @param {object} input
 * @param {string} input.actorPermission - oprávnění actora (G0)
 * @param {{ state: 'open'|'closed', labels: string[] }} input.pipelineIssue - G1
 * @param {{ A?: object, V?: object, T?: object }} [input.verdictSignals] - preferovaný G2 vstup: `resolveVerdictSignal()` výstup na fázi (`status` GO|NO-GO|stale|none)
 * @param {{ A?: {gate: string|null, verdikt: string|null}, V?: ..., T?: ... }} [input.verdicts] - legacy G2 vstup (poslední verdikt issue každého druhu); ignorováno, je-li dán `verdictSignals`
 * @param {boolean} input.openBlockerBugInScope - otevřený multiagent/bug, blocker, ve scope – odloženo (G3)
 * @param {boolean} input.branchExistsOnOrigin - G4
 * @param {boolean} input.headMatchesSha - G4 (HEAD drift, D5)
 * @param {boolean} [input.markerPipelineOk=true] - G4b: pipeline="N" v markeru == issue
 * @param {boolean} [input.mergeConflict] - G5
 * @param {boolean} [input.checkFailed] - G6 (`npm run check` po merge)
 * @returns {{ pass: boolean, failures: string[] }}
 */
function evaluateGuards(input) {
  const opts = input || {};
  const failures = [];

  if (!WRITE_PERMISSIONS.includes(opts.actorPermission)) {
    failures.push('G0: actor nemá oprávnění ≥ write');
  }

  const pipelineIssue = opts.pipelineIssue || {};
  const plLabels = pipelineIssue.labels || [];
  if (
    pipelineIssue.state !== 'open' ||
    !plLabels.includes('multiagent/pipeline') ||
    !plLabels.includes('gate/go')
  ) {
    failures.push('G1: [PIPELINE] není OPEN s labely multiagent/pipeline + gate/go');
  }

  if (opts.verdictSignals) {
    // Nový kontrakt (#102): jediný akceptovaný stav je 'GO' — fail-closed pro NO-GO/stale/none.
    for (const kind of ['A', 'V', 'T']) {
      const signal = opts.verdictSignals[kind];
      const status = signal && signal.status;
      if (status !== 'GO') {
        failures.push(`G2: VERDIKT-${kind} signál není GO (status: ${status || 'none'})`);
      }
    }
  } else {
    // Zpětná kompatibilita se starým tvarem (poslední [VERDIKT-*] issue, žádný GO komentář).
    const verdicts = opts.verdicts || {};
    for (const kind of ['A', 'V', 'T']) {
      const v = verdicts[kind];
      if (!v || v.gate !== 'gate/go' || v.verdikt !== 'GO') {
        failures.push(`G2: poslední [VERDIKT-${kind}] nemá gate/go + „Verdikt: GO“`);
      }
    }
  }

  if (opts.openBlockerBugInScope) {
    failures.push('G3: otevřený multiagent/bug (Závažnost: blocker, Rozsah: ve scope – odloženo)');
  }

  if (!opts.branchExistsOnOrigin) {
    failures.push('G4: větev z MERGE-PENDING markeru neexistuje na originu');
  } else if (!opts.headMatchesSha) {
    failures.push('G4: HEAD větve neodpovídá sha z markeru (drift) — Integrátor obnoví MERGE-PENDING');
  }

  if (opts.markerPipelineOk === false) {
    failures.push('G4b: pipeline="N" v MERGE-PENDING markeru ≠ číslo [PIPELINE] issue');
  }

  if (opts.mergeConflict) {
    failures.push('G5: merge do main by způsobil konflikt');
  }

  if (opts.checkFailed) {
    failures.push('G6: ověření (`npm run check`) po merge selhalo');
  }

  return { pass: failures.length === 0, failures };
}

/**
 * Compose the merge-result comment for `[PIPELINE]` — oprava vady #3 (VERDIKT-A NO-GO #94).
 * `wiki-sync: ok|failed|skipped` MUSÍ být vždy přítomné — chybějící stav je považován
 * za chybu (composeResultComment jej vynutí throw).
 *
 * @param {object} input
 * @param {'merged'|'already-merged'|'failed'} input.status
 * @param {string} [input.mergeSha]
 * @param {{ sha: string, message: string }[]} [input.mergedCommits]
 * @param {string[]} [input.failureReasons] - pro status 'failed' (číslovaný seznam)
 * @param {string} [input.runUrl]
 * @param {'ok'|'failed'|'skipped'} input.wikiSync
 * @param {string} [input.wikiSyncReason] - důvod pro 'skipped' (např. „dry-run“)
 * @param {string} [input.wikiLogArtifactUrl] - odkaz na artefakt wiki-sync.log (pro 'failed')
 * @param {string} [input.followUpIssueUrl] - odkaz na založený [BUG] follow-up (pro 'failed')
 * @returns {string}
 */
function composeResultComment(input) {
  const opts = input || {};
  if (!['ok', 'failed', 'skipped'].includes(opts.wikiSync)) {
    throw new Error('composeResultComment: wikiSync musí být ok|failed|skipped (nikdy nesmí chybět)');
  }

  const lines = [MERGE_RESULT_MARKER];

  if (opts.status === 'failed') {
    lines.push('### Merge do main — selhal', '');
    const reasons = opts.failureReasons && opts.failureReasons.length ? opts.failureReasons : ['neznámý důvod'];
    reasons.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
  } else if (opts.status === 'already-merged') {
    lines.push('### Merge do main — již sloučeno', '', 'Větev je již obsažena v `main` (no-op, idempotence).');
  } else {
    lines.push('### Merge do main — proveden', '');
    if (opts.mergeSha) lines.push(`Merge commit: \`${opts.mergeSha}\``);
    if (opts.mergedCommits && opts.mergedCommits.length) {
      lines.push('', 'Sloučené commity:');
      opts.mergedCommits.forEach((c) => lines.push(`- \`${c.sha}\` ${c.message}`));
    }
  }

  if (opts.runUrl) {
    lines.push('', `Běh: ${opts.runUrl}`);
  }

  let wikiLine = `wiki-sync: ${opts.wikiSync}`;
  if (opts.wikiSync === 'skipped' && opts.wikiSyncReason) {
    wikiLine += ` (${opts.wikiSyncReason})`;
  }
  lines.push('', wikiLine);

  if (opts.wikiSync === 'failed') {
    lines.push(
      opts.wikiLogArtifactUrl
        ? `Log: ${opts.wikiLogArtifactUrl}`
        : 'Log: (artefakt wiki-sync.log — viz běh výše)'
    );
    lines.push(
      opts.followUpIssueUrl
        ? `Follow-up: ${opts.followUpIssueUrl}`
        : 'Follow-up: [BUG] issue bude založen (viz komentář workflow)'
    );
  }

  return lines.join('\n');
}

/**
 * SHA match for MERGE-PENDING marker vs remote branch tip.
 * Requires marker sha length ≥ 7 (rejects ambiguous short prefixes), then
 * case-insensitive equality or remote startsWith(marker).
 *
 * @param {string|null|undefined} remoteSha
 * @param {string|null|undefined} markerSha
 * @returns {boolean}
 */
function shaMatches(remoteSha, markerSha) {
  if (!remoteSha || !markerSha) return false;
  const remote = String(remoteSha).trim().toLowerCase();
  const marker = String(markerSha).trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(marker) || marker.length < 7) return false;
  if (!/^[0-9a-f]+$/.test(remote)) return false;
  return remote === marker || remote.startsWith(marker);
}

/**
 * Marker pipeline="N" must equal the issue being merged.
 * Fallback handoffs (no pipeline field) are allowed for older pipelines (#74/#83).
 *
 * @param {{ pipeline: string|null, source: string }|null} pending
 * @param {string|number} pipelineNum
 * @returns {boolean}
 */
function markerPipelineMatches(pending, pipelineNum) {
  if (!pending) return true;
  if (pending.source === 'fallback' || pending.pipeline == null) return true;
  return String(pending.pipeline) === String(pipelineNum);
}

module.exports = {
  MERGE_PENDING_RE,
  MERGE_RESULT_MARKER,
  WRITE_PERMISSIONS,
  parseMergePending,
  authorizeRun,
  evaluateGuards,
  composeResultComment,
  shaMatches,
  markerPipelineMatches,
};

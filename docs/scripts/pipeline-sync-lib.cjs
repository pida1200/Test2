/**
 * Pure helpers for multiagent-pipeline-sync (testable, no GitHub deps).
 * Used by docs/scripts/test-pipeline-sync.mjs and multiagent-pipeline-sync.yml via require.
 */

const START = '<!-- multiagent:prehled:start -->';
const END = '<!-- multiagent:prehled:end -->';
const PIPELINE_RE = /^\s*Pipeline(?:\s+issue)?:\s*#?(\d+)\s*$/m;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractOutsideMarkers(body, start = START, end = END) {
  const b = body || '';
  if (!b.includes(start) || !b.includes(end)) {
    return { hasMarkers: false, prefix: b, suffix: '', section: null };
  }
  const re = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  const match = b.match(re);
  if (!match) {
    return { hasMarkers: false, prefix: b, suffix: '', section: null };
  }
  const idx = b.indexOf(match[0]);
  return {
    hasMarkers: true,
    prefix: b.slice(0, idx),
    suffix: b.slice(idx + match[0].length),
    section: match[0],
  };
}

function outsideKey(body, start = START, end = END) {
  const p = extractOutsideMarkers(body, start, end);
  return `${p.prefix}\0${p.suffix}`;
}

function replacePrehledSection(body, sectionBlock, start = START, end = END) {
  const parts = extractOutsideMarkers(body, start, end);
  if (parts.hasMarkers) {
    return parts.prefix + sectionBlock + parts.suffix;
  }
  const trimmed = (body || '').trimEnd();
  return trimmed + (trimmed ? '\n\n' : '') + sectionBlock + '\n';
}

function parsePipelineNum(body) {
  const m = (body || '').match(PIPELINE_RE);
  return m ? m[1] : null;
}

/** Immutable audit: NO-GO stays in body even if labels later change on a new issue. */
function isVerdictNoGo(body) {
  const b = body || '';
  const trimmed = b.trimStart();
  return /^Verdikt:\s*NO-GO\b/.test(trimmed) || /\bVerdikt:\s*NO-GO\b/.test(b);
}

function isVerdictGo(body) {
  const trimmed = (body || '').trimStart();
  return /^Verdikt:\s*GO\b/.test(trimmed);
}

function countNoGoRounds(verdictIssues) {
  return (verdictIssues || []).filter((i) => isVerdictNoGo(i.body)).length;
}

function buildVerdictHistoryLine(phaseKey, verdictIssues) {
  const sorted = [...(verdictIssues || [])].sort((a, b) => a.number - b.number);
  const noGos = sorted.filter((i) => isVerdictNoGo(i.body));
  const gos = sorted.filter((i) => isVerdictGo(i.body));
  const latestGo = gos.length ? gos[gos.length - 1] : null;

  if (noGos.length === 0 && !latestGo) return null;
  if (noGos.length === 0 && latestGo) {
    return `${phaseKey} #${latestGo.number} GO`;
  }
  const chain = noGos.map((i) => `#${i.number} NO-GO`).join(' → ');
  if (latestGo) {
    return `${phaseKey} ${chain} → #${latestGo.number} GO (rework ${noGos.length}/3)`;
  }
  return `${phaseKey} ${chain} (rework ${noGos.length}/3)`;
}

function maxNoGoRounds(byPhase) {
  const keys = ['VERDIKT-A', 'VERDIKT-V', 'VERDIKT-T'];
  return Math.max(0, ...keys.map((k) => countNoGoRounds(byPhase[k] || [])));
}

function shouldBlockPipeline(byPhase) {
  return maxNoGoRounds(byPhase) >= 3;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Re-fetch before update; retry if text outside markers drifted (concurrent Integrátor edit).
 */
async function safeUpdatePipelineBody(github, owner, repo, issueNumber, sectionBlock, opts = {}) {
  const maxRetries = opts.maxRetries ?? 3;
  const start = opts.start ?? START;
  const end = opts.end ?? END;
  let baselineOutside = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { data: fresh } = await github.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });
    const body = fresh.body || '';
    const key = outsideKey(body, start, end);

    if (baselineOutside === null) {
      baselineOutside = key;
    }

    const { data: preUpdate } = await github.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });
    const preBody = preUpdate.body || '';
    const preKey = outsideKey(preBody, start, end);

    if (preKey !== baselineOutside) {
      baselineOutside = preKey;
      if (attempt < maxRetries - 1) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw new Error('Pipeline body changed outside markers — abort to avoid overwrite');
    }

    const newBody = replacePrehledSection(preBody, sectionBlock, start, end);
    if (newBody === preBody) {
      return { updated: false, reason: 'unchanged' };
    }

    await github.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      body: newBody,
    });

    const { data: post } = await github.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });
    const postParts = extractOutsideMarkers(post.body || '', start, end);
    const preParts = extractOutsideMarkers(preBody, start, end);

    if (postParts.prefix !== preParts.prefix || postParts.suffix !== preParts.suffix) {
      if (attempt < maxRetries - 1) {
        await sleep(400 * (attempt + 1));
        baselineOutside = outsideKey(post.body || '', start, end);
        continue;
      }
      throw new Error('Post-update outside markers mismatch');
    }

    return { updated: true };
  }

  throw new Error('Failed to update pipeline body after retries');
}

module.exports = {
  START,
  END,
  PIPELINE_RE,
  extractOutsideMarkers,
  outsideKey,
  replacePrehledSection,
  parsePipelineNum,
  isVerdictNoGo,
  isVerdictGo,
  countNoGoRounds,
  buildVerdictHistoryLine,
  maxNoGoRounds,
  shouldBlockPipeline,
  sleep,
  safeUpdatePipelineBody,
};

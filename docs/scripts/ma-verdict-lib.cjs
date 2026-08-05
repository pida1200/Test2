/**
 * Shared verdict contract — jediný parser pro next/sync/gate-check/merge.
 * Kontrakt: ANALÝZA #102 (v2, rework po VERDIKT-A NO-GO #104; VERDIKT-A GO #105). Pipeline: #100.
 *
 * GO smí být buď (a) komentář na produkčním issue s markerem `multiagent-verdikt`
 * (viz MARKER_SCAN_RE) — nové `[VERDIKT-*]` se v tomto případě NEzakládá — nebo
 * (b) zpětně kompatibilní staré `[VERDIKT-*]` issue s `gate/go` + `Verdikt: GO`.
 * NO-GO má VŽDY vlastní `[VERDIKT-*]` issue (audit trail); marker verdikt="NO-GO"
 * je zakázán (viz parseVerdictComment, reason 'no-go-jen-jako-issue').
 *
 * Tři vrstvy (§1–§3 ANALÝZA #102):
 *   1) parseVerdictComment / validateVerdictComment — čistě textový tvar markeru + body
 *   2) resolveVerdictSignal — sjednocená časová osa (komentáře + verdikt issues),
 *      precedence (poslední vyhrává, NO-GO vítězí při shodném čase) a invalidace (stale)
 *   3) checkCommentTrust — fail-closed důvěryhodnost (autor, umístění, pipeline, artefakt, self-check)
 *
 * Fail-closed vždy: cokoli neúplné/neznámé/neověřitelné → nikdy `status: 'GO'`.
 */

const { PIPELINE_RE, VSTUP_RE, VERDIKT_RE, isVerdictGo, isVerdictNoGo } = require('./pipeline-sync-lib.cjs');

const MARKER_SCAN_RE = /<!--\s*multiagent-verdikt\b([^>]*)-->/g;
const ATTR_RE = /([a-z]+)="([^"]*)"/g;

const ALLOWED_KEYS = ['v', 'kind', 'pipeline', 'vstup', 'verdikt', 'kontrola'];
const ALLOWED_KIND = ['A', 'V', 'T'];
const ALLOWED_KONTROLA = ['kontrolor', 'self'];
const SUPPORTED_VERSION = '1';

const WRITE_PERMISSIONS = ['admin', 'write'];

/** kind (A|V|T) → očekávaný label produkčního (hostitelského) issue — inverze next-lib expectedProdLabel. */
const PROD_LABEL_FOR_KIND = {
  A: 'multiagent/analyza',
  V: 'multiagent/implementace',
  T: 'multiagent/testy',
};

/**
 * Format-level parser (§1) — marker + anchored body lines. Žádné GitHub API, žádná
 * důvěryhodnost (viz checkCommentTrust). Fail-closed: `valid !== true` nikdy neznamená GO.
 *
 * @param {{ body?: string, id?: number, created_at?: string, author?: string }} comment
 * @returns {{
 *   valid: boolean, kind: string|null, pipeline: string|null, vstup: string|null,
 *   verdikt: string|null, kontrola: string|null, commentId?: number, createdAt?: string,
 *   author?: string, reason: string|null, errors: string[]
 * }}
 */
function parseVerdictComment(comment) {
  const c = comment || {};
  const body = c.body || '';
  const base = { commentId: c.id, createdAt: c.created_at, author: c.author };
  const empty = { kind: null, pipeline: null, vstup: null, verdikt: null, kontrola: null };

  const markers = [...body.matchAll(MARKER_SCAN_RE)];
  if (markers.length === 0) {
    return {
      ...base,
      ...empty,
      valid: false,
      reason: 'zadny-marker',
      errors: ['Chybí marker multiagent-verdikt — komentář není verdikt.'],
    };
  }
  if (markers.length >= 2) {
    return {
      ...base,
      ...empty,
      valid: false,
      reason: 'vice-markeru',
      errors: [`Marker multiagent-verdikt je v komentáři ${markers.length}× — nedůvěryhodné (očekáváno právě 1×).`],
    };
  }

  const attrMatches = [...markers[0][1].matchAll(ATTR_RE)];
  const attrs = {};
  const errors = [];
  const seenKeys = new Set();
  for (const [, key, value] of attrMatches) {
    if (!ALLOWED_KEYS.includes(key)) {
      errors.push(`Neznámý atribut markeru: „${key}“.`);
      continue;
    }
    if (seenKeys.has(key)) {
      errors.push(`Duplicitní atribut markeru: „${key}“.`);
      continue;
    }
    seenKeys.add(key);
    attrs[key] = value;
  }
  for (const key of ALLOWED_KEYS) {
    if (!(key in attrs)) errors.push(`Chybí povinný atribut markeru: „${key}“.`);
  }

  if (errors.length) {
    return {
      ...base,
      kind: attrs.kind || null,
      pipeline: attrs.pipeline || null,
      vstup: attrs.vstup || null,
      verdikt: attrs.verdikt || null,
      kontrola: attrs.kontrola || null,
      valid: false,
      reason: 'atributy',
      errors,
    };
  }

  if (attrs.v !== SUPPORTED_VERSION) {
    errors.push(`Neznámá verze kontraktu markeru: v="${attrs.v}" (podporováno jen "${SUPPORTED_VERSION}").`);
  }
  if (!ALLOWED_KIND.includes(attrs.kind)) {
    errors.push(`Neplatný kind="${attrs.kind}" (očekáváno A|V|T).`);
  }
  if (!/^\d+$/.test(attrs.pipeline)) {
    errors.push(`Neplatné pipeline="${attrs.pipeline}" (očekáváno číslo).`);
  }
  if (!/^\d+$/.test(attrs.vstup)) {
    errors.push(`Neplatné vstup="${attrs.vstup}" (očekáváno číslo).`);
  }
  let isNoGoMarker = false;
  if (attrs.verdikt === 'NO-GO') {
    isNoGoMarker = true;
    errors.push('marker verdikt="NO-GO" není povolen — NO-GO patří výhradně do vlastního [VERDIKT-*] issue.');
  } else if (attrs.verdikt !== 'GO') {
    errors.push(`Neplatné verdikt="${attrs.verdikt}" (očekáváno GO).`);
  }
  if (!ALLOWED_KONTROLA.includes(attrs.kontrola)) {
    errors.push(`Neplatné kontrola="${attrs.kontrola}" (očekáváno kontrolor|self).`);
  }

  if (errors.length) {
    return {
      ...base,
      kind: attrs.kind || null,
      pipeline: attrs.pipeline || null,
      vstup: attrs.vstup || null,
      verdikt: attrs.verdikt || null,
      kontrola: attrs.kontrola || null,
      valid: false,
      reason: isNoGoMarker ? 'no-go-jen-jako-issue' : 'atributy',
      errors,
    };
  }

  // Body musí obsahovat anchored Pipeline:/Vstup:/Verdikt: GO shodné s markerem (reuse regexů).
  const bodyPipeline = (body.match(PIPELINE_RE) || [])[1] || null;
  const bodyVstup = (body.match(VSTUP_RE) || [])[1] || null;
  const bodyVerdiktMatch = body.match(VERDIKT_RE);
  const bodyVerdikt = bodyVerdiktMatch ? bodyVerdiktMatch[1] : null;

  const bodyErrors = [];
  if (bodyPipeline !== attrs.pipeline) {
    bodyErrors.push(`Řádek "Pipeline: #${bodyPipeline || '?'}" v textu neodpovídá markeru pipeline="${attrs.pipeline}".`);
  }
  if (bodyVstup !== attrs.vstup) {
    bodyErrors.push(`Řádek "Vstup: #${bodyVstup || '?'}" v textu neodpovídá markeru vstup="${attrs.vstup}".`);
  }
  if (bodyVerdikt !== 'GO') {
    bodyErrors.push(`Řádek "Verdikt: GO" v textu chybí nebo neodpovídá markeru (nalezeno: ${bodyVerdikt || 'nic'}).`);
  }
  if (isVerdictNoGo(body)) {
    bodyErrors.push('Komentář obsahuje i řádek "Verdikt: NO-GO" — dvojí verdikt je nejednoznačný, zakázáno.');
  }

  if (bodyErrors.length) {
    return {
      ...base,
      kind: attrs.kind,
      pipeline: attrs.pipeline,
      vstup: attrs.vstup,
      verdikt: attrs.verdikt,
      kontrola: attrs.kontrola,
      valid: false,
      reason: 'body-nesouhlasi',
      errors: bodyErrors,
    };
  }

  return {
    ...base,
    kind: attrs.kind,
    pipeline: attrs.pipeline,
    vstup: attrs.vstup,
    verdikt: 'GO',
    kontrola: attrs.kontrola,
    valid: true,
    reason: null,
    errors: [],
  };
}

/**
 * Wrapper pro gate-check job (issue_comment created/edited) — jen `{ valid, errors }`.
 * Stejná pravidla jako parseVerdictComment (jeden parser, viz hlavička souboru).
 *
 * @param {string} body
 * @returns {{ valid: boolean, errors: string[], parsed: ReturnType<typeof parseVerdictComment> }}
 */
function validateVerdictComment(body) {
  const parsed = parseVerdictComment({ body });
  return { valid: parsed.valid, errors: parsed.errors, parsed };
}

/**
 * Fail-closed trust guard (§3) — autor, umístění, pipeline, artefakt, self-check.
 * Default = deny: chybějící/neověřitelný vstup nikdy nevrátí allowed:true.
 *
 * @param {ReturnType<typeof parseVerdictComment>} parsed - musí mít `valid: true`
 * @param {object} ctx
 * @param {string|number} ctx.pipeline - vyhodnocovaná [PIPELINE] (číslo)
 * @param {string|number} ctx.hostIssueNumber - issue, na kterém komentář leží (produkční issue)
 * @param {string[]} [ctx.hostLabels] - labely hostitelského issue
 * @param {boolean} [ctx.riskLow] - má [PIPELINE] label `risk/low`?
 * @param {string|null} [ctx.authorPermission] - permission autora komentáře (admin|write|triage|read|none|null)
 * @returns {{ allowed: boolean, reason: string|null }}
 */
function checkCommentTrust(parsed, ctx) {
  const opts = ctx || {};
  if (!parsed || !parsed.valid) {
    return { allowed: false, reason: 'neplatny-format' };
  }
  if (!WRITE_PERMISSIONS.includes(opts.authorPermission)) {
    return { allowed: false, reason: 'autor bez ověřeného oprávnění ≥ write' };
  }
  if (opts.hostIssueNumber == null || String(parsed.vstup) !== String(opts.hostIssueNumber)) {
    return { allowed: false, reason: 'kopie komentáře — vstup neodpovídá hostitelskému issue' };
  }
  if (opts.pipeline == null || String(parsed.pipeline) !== String(opts.pipeline)) {
    return { allowed: false, reason: 'replay z jiné pipeline — pipeline neodpovídá vyhodnocované [PIPELINE]' };
  }
  const hostLabels = opts.hostLabels || [];
  const expectedLabel = PROD_LABEL_FOR_KIND[parsed.kind];
  if (!expectedLabel || !hostLabels.includes(expectedLabel)) {
    return { allowed: false, reason: `kind="${parsed.kind}" neodpovídá labelu hostitele (očekáváno ${expectedLabel || '?'})` };
  }
  if (parsed.kontrola === 'self' && !opts.riskLow) {
    return { allowed: false, reason: 'kontrola="self" bez labelu risk/low na [PIPELINE]' };
  }
  return { allowed: true, reason: null };
}

function issueVerdictStatus(issue) {
  const labels = (issue && issue.labels) || [];
  const body = (issue && issue.body) || '';
  if (labels.includes('gate/go') && isVerdictGo(body)) return 'GO';
  if (labels.includes('gate/no-go') && isVerdictNoGo(body)) return 'NO-GO';
  return null;
}

function tsOf(v) {
  return new Date(v || 0).getTime();
}

/** Precedence: pozdější čas vyhrává; při shodě NO-GO > GO; poté vyšší id. */
function compareTimelineEntries(a, b) {
  const ta = tsOf(a.ts);
  const tb = tsOf(b.ts);
  if (ta !== tb) return ta - tb;
  if (a.status !== b.status) return a.status === 'NO-GO' ? 1 : -1;
  return (a.id || 0) - (b.id || 0);
}

/**
 * Sjednocená časová osa GO/NO-GO signálů pro jednu fázi (A/V/T) — §2 ANALÝZA #102.
 * Kombinuje validní + důvěryhodné GO komentáře a `[VERDIKT-<kind>]` issues (staré i nové
 * pipeline). Autoritativní je poslední záznam; poslední NO-GO přebíjí libovolný starší GO;
 * GO je `stale`, pokud na hostitelském issue existuje novější `labeled` event
 * `gate/no-go`/`gate/pending` (rework vždy přepne gate zpět na pending — deterministický signál).
 *
 * Fail-closed defaulty: bez `hostIssue`/`labelEvents`/`permissions` se komentáře vůbec
 * neuvažují (jen zpětně kompatibilní `[VERDIKT-*]` issues); bez jakéhokoli platného
 * záznamu vrací `status: 'none'`.
 *
 * @param {object} input
 * @param {'A'|'V'|'T'} input.kind
 * @param {string|number} input.pipeline - vyhodnocovaná [PIPELINE]
 * @param {{ number: string|number, labels?: string[] }} [input.hostIssue] - produkční issue (ANALÝZA/IMPLEMENTACE/TESTY)
 * @param {{ id?: number, body?: string, created_at?: string, author?: string }[]} [input.comments] - komentáře na hostIssue
 * @param {{ number: number, body?: string, labels?: string[], created_at?: string }[]} [input.verdictIssues] - `[VERDIKT-<kind>]` issues pro tuto pipeline
 * @param {{ event: string, label?: { name?: string }, created_at?: string }[]} [input.labelEvents] - timeline eventy na hostIssue
 * @param {Object.<string,string>} [input.permissions] - login → permission (pro autora GO komentáře)
 * @param {string[]} [input.pipelineLabels] - labely [PIPELINE] issue (kontrola risk/low)
 * @returns {{ status: 'GO'|'NO-GO'|'stale'|'none', source: 'comment'|'issue'|null, authoritative: object|null, reasons: string[] }}
 */
function resolveVerdictSignal(input) {
  const opts = input || {};
  const reasons = [];
  const timeline = [];

  for (const issue of opts.verdictIssues || []) {
    const status = issueVerdictStatus(issue);
    if (status) {
      timeline.push({ ts: issue.created_at, status, source: 'issue', id: issue.number, ref: issue });
    }
  }

  const hasCommentContext = !!(opts.hostIssue && opts.labelEvents !== undefined && opts.permissions !== undefined);
  if (!hasCommentContext) {
    if (opts.comments && opts.comments.length) {
      reasons.push('GO komentáře ignorovány — chybí hostIssue/labelEvents/permissions (fail-closed default).');
    }
  } else {
    const riskLow = !!(opts.pipelineLabels || []).includes('risk/low');
    for (const comment of opts.comments || []) {
      const parsed = parseVerdictComment(comment);
      if (!parsed.valid) {
        if (parsed.reason !== 'zadny-marker') reasons.push(`komentář #${comment.id ?? '?'}: ${parsed.reason}`);
        continue;
      }
      if (parsed.kind !== opts.kind) continue; // jiná fáze (A/V/T) — nerelevantní pro tuto osu
      const trust = checkCommentTrust(parsed, {
        pipeline: opts.pipeline,
        hostIssueNumber: opts.hostIssue.number,
        hostLabels: opts.hostIssue.labels,
        riskLow,
        authorPermission: (opts.permissions || {})[comment.author] ?? null,
      });
      if (!trust.allowed) {
        reasons.push(`komentář #${comment.id ?? '?'}: ${trust.reason}`);
        continue;
      }
      timeline.push({ ts: parsed.createdAt, status: 'GO', source: 'comment', id: parsed.commentId, ref: parsed });
    }
  }

  timeline.sort(compareTimelineEntries);

  if (timeline.length === 0) {
    return { status: 'none', source: null, authoritative: null, timeline, reasons: reasons.length ? reasons : ['žádný platný GO/NO-GO signál'] };
  }

  const authoritative = timeline[timeline.length - 1];

  if (authoritative.status === 'NO-GO') {
    return { status: 'NO-GO', source: authoritative.source, authoritative, timeline, reasons };
  }

  // authoritative.status === 'GO' — invalidace reworkem (stale)
  const labelEvents = opts.labelEvents || [];
  const authTs = tsOf(authoritative.ts);
  const staleEvent = labelEvents.find((e) => {
    if (e.event !== 'labeled') return false;
    const name = e.label && e.label.name;
    if (name !== 'gate/no-go' && name !== 'gate/pending') return false;
    return tsOf(e.created_at) > authTs;
  });
  if (staleEvent) {
    reasons.push(`GO je stale — novější labeled event „${staleEvent.label.name}“ na hostitelském issue`);
    return { status: 'stale', source: authoritative.source, authoritative, timeline, reasons };
  }

  return { status: 'GO', source: authoritative.source, authoritative, timeline, reasons };
}

/** `#N` pro issue zdroj, `komentář #N` pro comment zdroj — čitelná reference v historii. */
function formatTimelineRef(entry) {
  return entry.source === 'comment' ? `komentář #${entry.id}` : `#${entry.id}`;
}

/**
 * Sjednocená historie verdiktů pro `[PIPELINE]` přehled (§2) — stejný tvar jako
 * `pipeline-sync-lib.cjs#buildVerdictHistoryLine`, ale nad `resolveVerdictSignal().timeline`,
 * takže zahrnuje jak `[VERDIKT-*]` issues, tak validní GO komentáře, chronologicky.
 *
 * @param {string} phaseKey - např. 'VERDIKT-A'
 * @param {ReturnType<typeof resolveVerdictSignal>} resolveResult
 * @returns {string|null}
 */
function buildUnifiedVerdictHistoryLine(phaseKey, resolveResult) {
  const timeline = (resolveResult && resolveResult.timeline) || [];
  if (!timeline.length) return null;
  const sorted = [...timeline].sort(compareTimelineEntries);
  const noGos = sorted.filter((e) => e.status === 'NO-GO');
  const gos = sorted.filter((e) => e.status === 'GO');
  const latestGo = gos.length ? gos[gos.length - 1] : null;

  if (noGos.length === 0 && !latestGo) return null;
  if (noGos.length === 0 && latestGo) {
    return `${phaseKey} ${formatTimelineRef(latestGo)} GO`;
  }
  const lastNoGo = noGos[noGos.length - 1];
  const chain = noGos.map((e) => `${formatTimelineRef(e)} NO-GO`).join(' → ');
  if (latestGo && tsOf(latestGo.ts) > tsOf(lastNoGo.ts)) {
    return `${phaseKey} ${chain} → ${formatTimelineRef(latestGo)} GO (rework ${noGos.length}/3)`;
  }
  return `${phaseKey} ${chain} (rework ${noGos.length}/3)`;
}

module.exports = {
  MARKER_SCAN_RE,
  ALLOWED_KEYS,
  ALLOWED_KIND,
  ALLOWED_KONTROLA,
  SUPPORTED_VERSION,
  WRITE_PERMISSIONS,
  PROD_LABEL_FOR_KIND,
  parseVerdictComment,
  validateVerdictComment,
  checkCommentTrust,
  resolveVerdictSignal,
  formatTimelineRef,
  buildUnifiedVerdictHistoryLine,
};

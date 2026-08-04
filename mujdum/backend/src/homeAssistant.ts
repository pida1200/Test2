import { trimTrailingSlashes } from "./trimTrailingSlashes.js";

type HomeAssistantConfig = {
  url: string;
  token: string;
};

function normalizeBaseUrl(url: string) {
  return trimTrailingSlashes(url);
}

type HaState = {
  entity_id: string;
  state: string;
  attributes?: Record<string, unknown>;
};

function isHaState(value: unknown): value is HaState {
  return (
    typeof value === "object" &&
    value !== null &&
    "entity_id" in value &&
    typeof value.entity_id === "string" &&
    "state" in value &&
    typeof value.state === "string"
  );
}

export async function haRenderTemplate(
  cfg: HomeAssistantConfig,
  template: string
): Promise<string> {
  const base = normalizeBaseUrl(cfg.url);
  const res = await fetch(`${base}/api/template`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ template })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Home Assistant template error: ${res.status} ${text}`);
  }

  return await res.text();
}

export async function haListAreaNames(cfg: HomeAssistantConfig): Promise<string[]> {
  // Use HA template API; it returns plain text.
  // areas() -> list of area IDs; area_name(id) -> human readable.
  const template =
    "{{ areas() | map('area_name') | list | tojson }}";
  const rendered = await haRenderTemplate(cfg, template);
  const parsed = JSON.parse(rendered) as unknown;
  if (!Array.isArray(parsed)) return [];
  return Array.from(
    new Set(
      parsed
        .filter((x) => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
    )
  );
}

export async function haListStates(cfg: HomeAssistantConfig): Promise<HaState[]> {
  const base = normalizeBaseUrl(cfg.url);
  const res = await fetch(`${base}/api/states`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${cfg.token}`,
      "content-type": "application/json"
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Home Assistant states error: ${res.status} ${text}`);
  }
  const json: unknown = await res.json();
  return Array.isArray(json) ? json.filter(isHaState) : [];
}

export async function haGetWeatherTemperatureFromState(
  cfg: HomeAssistantConfig,
  entityId: string
): Promise<number | null> {
  const base = normalizeBaseUrl(cfg.url);
  const res = await fetch(`${base}/api/states/${encodeURIComponent(entityId)}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${cfg.token}`,
      "content-type": "application/json"
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Home Assistant state error: ${res.status} ${text}`);
  }
  const json: unknown = await res.json();
  if (!isHaState(json)) return null;
  const v = json.attributes?.temperature;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getFriendlyName(s: HaState) {
  const v = s.attributes?.friendly_name;
  return typeof v === "string" ? v : undefined;
}

function findEntityByFriendlyName(states: HaState[], name: string) {
  const n = name.trim();
  return states.find((s) => getFriendlyName(s) === n);
}

function escapeHaTemplateString(value: string) {
  const backslash = String.fromCodePoint(92);
  return value
    .replaceAll(backslash, backslash + backslash)
    .replaceAll('"', backslash + '"');
}

async function findEntityIdByFriendlyNameAndArea(
  cfg: HomeAssistantConfig,
  friendlyName: string,
  areaName: string,
  cache: Map<string, string | null>
): Promise<string | null> {
  const cacheKey = `${friendlyName}\0${areaName}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

  const template = `{% set target_fn = "${escapeHaTemplateString(friendlyName)}" %}{% set target_area = "${escapeHaTemplateString(areaName)}" %}{% set ns = namespace(eid="") %}{% for eid in states | map(attribute="entity_id") | list %}{% if state_attr(eid, "friendly_name") == target_fn and area_name(area_id(eid)) == target_area %}{% set ns.eid = eid %}{% endif %}{% endfor %}{{ ns.eid }}`;
  const rendered = (await haRenderTemplate(cfg, template)).trim();
  const entityId = rendered || null;
  cache.set(cacheKey, entityId);
  return entityId;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const x = Number(v);
    if (Number.isFinite(x)) return x;
  }
  return null;
}

const UNAVAILABLE_METRIC_VALUES = new Set(["unavailable", "unknown", ""]);

function isUnavailableMetricValue(normalized: unknown): boolean {
  return (
    typeof normalized === "string" &&
    UNAVAILABLE_METRIC_VALUES.has(normalized.trim().toLowerCase())
  );
}

function readMetricRawValue(
  state: HaState,
  valueFrom?: DashboardHaMetricConfig["valueFrom"]
): unknown {
  if (valueFrom === "state" || !valueFrom) return state.state;
  return state.attributes?.[valueFrom.attribute];
}

function normalizeMetricValue(raw: unknown): unknown {
  const n = toNumber(raw);
  return n ?? raw;
}

function collectFallbackStates(
  spec: DashboardHaMetricConfig,
  byId: Map<string, HaState>
): HaState[] {
  if (!Array.isArray(spec.fallbackEntityIds)) return [];
  return spec.fallbackEntityIds
    .map((id) => (typeof id === "string" ? byId.get(id) : undefined))
    .filter((x): x is HaState => Boolean(x));
}

function resolvePrimaryState(
  spec: DashboardHaMetricConfig,
  resolvedEntityId: string | undefined,
  states: HaState[],
  byId: Map<string, HaState>
): { state?: HaState; source?: "entityId" | "friendlyName" } {
  if (resolvedEntityId) {
    return { state: byId.get(resolvedEntityId), source: "entityId" };
  }
  if (spec.friendlyName) {
    return {
      state: findEntityByFriendlyName(states, spec.friendlyName),
      source: "friendlyName"
    };
  }
  return {};
}

function pickFirstAvailableFallback(
  fallbacks: HaState[],
  valueFrom?: DashboardHaMetricConfig["valueFrom"]
): { state?: HaState; normalized?: unknown } {
  for (const alt of fallbacks) {
    const altNorm = normalizeMetricValue(readMetricRawValue(alt, valueFrom));
    if (!isUnavailableMetricValue(altNorm)) {
      return { state: alt, normalized: altNorm };
    }
  }
  return {};
}

async function resolveMetricEntityId(
  spec: DashboardHaMetricConfig,
  cfg: HomeAssistantConfig,
  areaEntityCache: Map<string, string | null>
): Promise<string | undefined> {
  if (spec.entityId) return spec.entityId;
  if (spec.friendlyName && spec.areaName) {
    return (
      (await findEntityIdByFriendlyNameAndArea(
        cfg,
        spec.friendlyName,
        spec.areaName,
        areaEntityCache
      )) ?? undefined
    );
  }
  return undefined;
}

function resolveMetricEntry(
  key: string,
  spec: DashboardHaMetricConfig,
  primary: { state?: HaState; source?: "entityId" | "friendlyName" },
  fallbacks: HaState[],
  primaryState: HaState
): {
  metricValue?: unknown;
  resolution: DashboardHaMetricResolution;
} {
  const raw = readMetricRawValue(primaryState, spec.valueFrom);
  const normalized = normalizeMetricValue(raw);

  if (!isUnavailableMetricValue(normalized) && normalized !== null && normalized !== undefined) {
    return {
      metricValue: normalized,
      resolution: {
        key,
        picked: {
          entity_id: primaryState.entity_id,
          friendly_name: getFriendlyName(primaryState),
          source: primary.state ? (primary.source ?? "entityId") : "fallback"
        },
        value: { raw, normalized },
        unavailable: false
      }
    };
  }

  const fallbackPick = pickFirstAvailableFallback(fallbacks, spec.valueFrom);
  const picked = fallbackPick.normalized ?? normalized;
  const pickedState = fallbackPick.state;
  const pickedUnavailable = isUnavailableMetricValue(picked);

  return {
    metricValue: pickedUnavailable ? undefined : picked,
    resolution: {
      key,
      picked: {
        entity_id: (pickedState ?? primaryState).entity_id,
        friendly_name: getFriendlyName(pickedState ?? primaryState),
        source: pickedState ? "fallback" : (primary.source ?? "entityId")
      },
      value: {
        raw: pickedState ? readMetricRawValue(pickedState, spec.valueFrom) : raw,
        normalized: picked
      },
      unavailable: true
    }
  };
}

export type DashboardHaMetricConfig = {
  // allow overriding by entity_id; otherwise resolve by friendly_name
  entityId?: string;
  // optional fallbacks (first available wins)
  fallbackEntityIds?: string[];
  friendlyName?: string;
  /** When friendly_name is duplicated, pick entity in this HA area (e.g. Ložnice). */
  areaName?: string;
  // pick from state or attribute
  valueFrom?: "state" | { attribute: string };
};

export type DashboardHaMetricResolution = {
  key: string;
  picked?: {
    entity_id: string;
    friendly_name?: string;
    source: "entityId" | "friendlyName" | "fallback";
  };
  value?: {
    raw: unknown;
    normalized: unknown;
  };
  unavailable?: boolean;
};

export async function haComputeDashboardMetrics(
  cfg: HomeAssistantConfig,
  mapping: Record<string, DashboardHaMetricConfig>
): Promise<{ metrics: Record<string, unknown>; resolution: DashboardHaMetricResolution[] }> {
  const states = await haListStates(cfg);

  const byId = new Map(states.map((s) => [s.entity_id, s]));
  const metrics: Record<string, unknown> = {};
  const resolution: DashboardHaMetricResolution[] = [];
  const areaEntityCache = new Map<string, string | null>();

  for (const [key, spec] of Object.entries(mapping)) {
    const resolvedEntityId = await resolveMetricEntityId(spec, cfg, areaEntityCache);
    const primary = resolvePrimaryState(spec, resolvedEntityId, states, byId);
    const fallbacks = collectFallbackStates(spec, byId);
    const primaryState = primary.state ?? fallbacks[0];
    if (!primaryState) {
      resolution.push({ key });
      continue;
    }

    const entry = resolveMetricEntry(key, spec, primary, fallbacks, primaryState);
    if (entry.metricValue !== undefined) {
      metrics[key] = entry.metricValue;
    }
    resolution.push(entry.resolution);
  }

  // Derived metrics
  const irrigationAuto = states.filter((s) => {
    const fn = getFriendlyName(s) ?? "";
    return fn.includes("Automatické zavlažování") && s.state === "on";
  });
  metrics.irrigation_auto_any = irrigationAuto.length > 0;

  resolution.push({
    key: "irrigation_auto_any",
    picked: { entity_id: "(derived)", friendly_name: undefined, source: "fallback" },
    unavailable: false
  });

  return { metrics, resolution };
}


import { parseNumberSetting } from "./appUtils.js";

export function formatTemp(v: unknown) {
  if (typeof v === "number" && Number.isFinite(v)) return `${v.toFixed(1)} °C`;
  if (typeof v === "string" && v.trim()) return `${v} °C`;
  return "—";
}

export function formatOnOff(v: unknown) {
  if (typeof v === "boolean") return v ? "Zapnuto" : "Vypnuto";
  if (typeof v === "string") {
    if (v === "on") return "Zapnuto";
    if (v === "off") return "Vypnuto";
    return v;
  }
  return "—";
}

export function formatMinutesLeft(v: unknown) {
  const n = parseNumberSetting(v);
  if (!Number.isFinite(n)) return "—";
  const m = Math.max(0, Math.trunc(n));
  if (m === 0) return "0 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  return `${h}:${mm} h`;
}

export function formatRainSensor(v: unknown) {
  if (typeof v !== "string") return formatOnOff(v);
  const s = v.trim().toLowerCase();
  if (!s) return "—";
  if (s === "dry") return "Sucho";
  if (s === "wet") return "Déšť";
  if (s === "rain") return "Déšť";
  return v;
}

export function formatIrrigationRainSensor(v: unknown) {
  if (typeof v === "boolean") return v ? "Déšť" : "Sucho";
  if (typeof v === "string") {
    if (v === "on") return "Déšť";
    if (v === "off") return "Sucho";
  }
  return "—";
}

export function formatPercent(v: unknown) {
  const n = parseNumberSetting(v);
  if (!Number.isFinite(n)) return "—";
  const x = Math.max(0, Math.min(100, n));
  return `${Math.round(x)} %`;
}

export function formatPower(v: unknown) {
  const n = parseNumberSetting(v);
  if (!Number.isFinite(n)) return "—";
  const w = Math.round(n);
  const abs = Math.abs(w);
  if (abs >= 1000) return `${(w / 1000).toFixed(2)} kW`;
  return `${w} W`;
}

export function formatEnergyKwh(v: unknown) {
  const n = parseNumberSetting(v);
  if (!Number.isFinite(n)) return "—";
  if (n < 10) return `${n.toFixed(2)} kWh`;
  return `${n.toFixed(1)} kWh`;
}

export function formatMowerSchedulePaused(v: unknown) {
  if (typeof v === "boolean") return v ? "Plán pozastaven" : "Plán aktivní";
  if (typeof v === "string") {
    if (v === "on") return "Plán pozastaven";
    if (v === "off") return "Plán aktivní";
  }
  return "—";
}

import { describe, expect, it } from "vitest";
import {
  buildElectricityEnergyBuckets,
  ELECTRICITY_CONSUMPTION_KEY,
  ELECTRICITY_PRODUCTION_KEY,
  ElectricityEnergyBucketsError,
  loadElectricityEnergyBuckets,
  monthWeekBuckets,
  yearMonthBuckets
} from "../src/electricityEnergyBuckets.js";
import { createFakeDb } from "./fakeDb.js";
import type { PowerSample } from "../src/electricityEnergy.js";

function hourlySamples(
  dayIso: string,
  fromHourUtc: number,
  toHourUtc: number,
  watts: number
): PowerSample[] {
  const out: PowerSample[] = [];
  for (let h = fromHourUtc; h <= toHourUtc; h++) {
    const ts = `${dayIso}T${String(h).padStart(2, "0")}:00:00.000Z`;
    out.push({ ts, watts });
  }
  return out;
}

describe("electricityEnergyBuckets", () => {
  it("month → kalendářní týdny po–ne, pět sloupců pro 2025-05", () => {
    const bounds = monthWeekBuckets("2025-05");
    const keys = bounds.map((b) => b.key);
    expect(keys).toEqual([
      "2025-04-28",
      "2025-05-05",
      "2025-05-12",
      "2025-05-19",
      "2025-05-26"
    ]);
  });

  it("year → 12 měsíčních sloupců pro minulý rok", () => {
    const bounds = yearMonthBuckets("2025");
    expect(bounds).toHaveLength(12);
    expect(bounds[0].key).toBe("2025-01");
    expect(bounds[11].key).toBe("2025-12");
  });

  it("integruje výkon do správného týdenního sloupce (kWh)", () => {
    // konstantní výkon 12 h → kWh = W * h / 1000
    const production = hourlySamples("2025-05-13", 6, 18, 1000); // 12 kWh
    const consumption = hourlySamples("2025-05-13", 6, 18, 500); // 6 kWh

    const result = buildElectricityEnergyBuckets(
      "month",
      "2025-05",
      production,
      consumption
    );

    expect(result.bucketUnit).toBe("week");
    const week = result.buckets.find((b) => b.key === "2025-05-12");
    expect(week).toBeDefined();
    expect(week!.producedKwh).toBeCloseTo(12, 1);
    expect(week!.consumedKwh).toBeCloseTo(6, 1);

    // ostatní týdny zůstanou nulové
    const others = result.buckets.filter((b) => b.key !== "2025-05-12");
    for (const b of others) {
      expect(b.producedKwh).toBe(0);
      expect(b.consumedKwh).toBe(0);
    }
  });

  it("loadElectricityEnergyBuckets čte z DB a sčítá energii", async () => {
    const production = hourlySamples("2025-05-13", 6, 18, 1000);
    const consumption = hourlySamples("2025-05-13", 6, 18, 500);
    const history = [
      ...production.map((s) => ({
        key: ELECTRICITY_PRODUCTION_KEY,
        created_at: s.ts,
        value: s.watts,
        numeric_value: s.watts
      })),
      ...consumption.map((s) => ({
        key: ELECTRICITY_CONSUMPTION_KEY,
        created_at: s.ts,
        value: s.watts,
        numeric_value: s.watts
      }))
    ];
    const db = createFakeDb({ history });

    const result = await loadElectricityEnergyBuckets(db, {
      period: "month",
      anchor: "2025-05"
    });

    const week = result.buckets.find((b) => b.key === "2025-05-12");
    expect(week!.producedKwh).toBeCloseTo(12, 1);
    expect(week!.consumedKwh).toBeCloseTo(6, 1);
  });

  it("odmítne neplatný anchor", async () => {
    const db = createFakeDb();
    await expect(
      loadElectricityEnergyBuckets(db, { period: "month", anchor: "2025" })
    ).rejects.toBeInstanceOf(ElectricityEnergyBucketsError);
    await expect(
      loadElectricityEnergyBuckets(db, { period: "year", anchor: "2025-05" })
    ).rejects.toBeInstanceOf(ElectricityEnergyBucketsError);
  });
});

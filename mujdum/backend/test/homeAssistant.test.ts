import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  haComputeDashboardMetrics,
  haGetWeatherTemperatureFromState,
  haListAreaNames,
  haListStates,
  haRenderTemplate,
  type DashboardHaMetricConfig
} from "../src/homeAssistant.js";

const cfg = { url: "http://homeassistant.local/", token: "secret" };

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      return handler(url, init);
    })
  );
}

describe("homeAssistant", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("haRenderTemplate POSTs template and strips trailing slash from base URL", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("http://homeassistant.local/api/template");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toMatchObject({
        authorization: "Bearer secret",
        "content-type": "application/json"
      });
      expect(JSON.parse(String(init?.body))).toEqual({ template: "{{ 1 }}" });
      return new Response("ok", { status: 200 });
    });

    await expect(haRenderTemplate(cfg, "{{ 1 }}")).resolves.toBe("ok");
  });

  it("haRenderTemplate throws on HTTP error", async () => {
    mockFetch(() => new Response("bad", { status: 500 }));
    await expect(haRenderTemplate(cfg, "x")).rejects.toThrow(/500/);
  });

  it("haListAreaNames parses unique trimmed names", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/template")) {
        return new Response(JSON.stringify([" Ložnice ", "Ložnice", "Tata obývák", ""]), {
          status: 200
        });
      }
      return new Response("not found", { status: 404 });
    });

    await expect(haListAreaNames(cfg)).resolves.toEqual(["Ložnice", "Tata obývák"]);
  });

  it("haListAreaNames returns empty array for non-array template output", async () => {
    mockFetch(() => new Response(JSON.stringify({ x: 1 }), { status: 200 }));
    await expect(haListAreaNames(cfg)).resolves.toEqual([]);
  });

  it("haListStates filters invalid entries", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/states")) {
        return new Response(
          JSON.stringify([
            { entity_id: "sensor.a", state: "12" },
            { entity_id: "bad" },
            null,
            { entity_id: "sensor.b", state: "off", attributes: { friendly_name: "Relay" } }
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      return new Response("missing", { status: 404 });
    });

    const states = await haListStates(cfg);
    expect(states).toHaveLength(2);
    expect(states[0]?.entity_id).toBe("sensor.a");
  });

  it("haListStates throws on HTTP error", async () => {
    mockFetch(() => new Response("fail", { status: 503 }));
    await expect(haListStates(cfg)).rejects.toThrow(/503/);
  });

  it("haGetWeatherTemperatureFromState reads numeric and string attributes", async () => {
    mockFetch((url) => {
      if (url.includes("weather.forecast_home")) {
        return new Response(
          JSON.stringify({
            entity_id: "weather.forecast_home",
            state: "sunny",
            attributes: { temperature: 18.5 }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      return new Response("missing", { status: 404 });
    });

    await expect(
      haGetWeatherTemperatureFromState(cfg, "weather.forecast_home")
    ).resolves.toBe(18.5);
  });

  it("haGetWeatherTemperatureFromState parses string temperature", async () => {
    mockFetch(() =>
      Response.json({
        entity_id: "weather.forecast_home",
        state: "cloudy",
        attributes: { temperature: "7.2" }
      })
    );
    await expect(
      haGetWeatherTemperatureFromState(cfg, "weather.forecast_home")
    ).resolves.toBe(7.2);
  });

  it("haGetWeatherTemperatureFromState returns null without temperature", async () => {
    mockFetch(() =>
      Response.json({
        entity_id: "weather.forecast_home",
        state: "cloudy",
        attributes: {}
      })
    );
    await expect(
      haGetWeatherTemperatureFromState(cfg, "weather.forecast_home")
    ).resolves.toBeNull();
  });

  it("haComputeDashboardMetrics resolves entityId and friendlyName", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/states")) {
        return Response.json([
          {
            entity_id: "sensor.temp",
            state: "21.5",
            attributes: { friendly_name: "Teplota obývák" }
          },
          {
            entity_id: "sensor.mower",
            state: "unavailable",
            attributes: { friendly_name: "Mower status" }
          },
          {
            entity_id: "sensor.mower_backup",
            state: "42",
            attributes: { friendly_name: "Mower backup" }
          },
          {
            entity_id: "switch.irrigation",
            state: "on",
            attributes: { friendly_name: "Zahrada Automatické zavlažování" }
          }
        ]);
      }
      return new Response("missing", { status: 404 });
    });

    const mapping: Record<string, DashboardHaMetricConfig> = {
      temp_obyvak: { entityId: "sensor.temp", valueFrom: "state" },
      mower_status: {
        friendlyName: "Mower status",
        fallbackEntityIds: ["sensor.mower_backup"],
        valueFrom: "state"
      },
      missing_metric: { entityId: "sensor.missing", valueFrom: "state" }
    };

    const { metrics, resolution } = await haComputeDashboardMetrics(cfg, mapping);

    expect(metrics.temp_obyvak).toBe(21.5);
    expect(metrics.mower_status).toBe(42);
    expect(metrics.irrigation_auto_any).toBe(true);
    expect(resolution.find((r) => r.key === "temp_obyvak")?.picked?.entity_id).toBe("sensor.temp");
    expect(resolution.find((r) => r.key === "mower_status")?.picked?.source).toBe("fallback");
    expect(resolution.find((r) => r.key === "missing_metric")).toEqual({ key: "missing_metric" });
  });

  it("haComputeDashboardMetrics resolves friendlyName in area via template", async () => {
    mockFetch((url, init) => {
      if (url.endsWith("/api/states")) {
        return Response.json([
          {
            entity_id: "sensor.loznice_temp",
            state: "19.2",
            attributes: { friendly_name: "_TZ3000 TS0201 Teplota" }
          }
        ]);
      }
      if (url.endsWith("/api/template") && init?.method === "POST") {
        return new Response("sensor.loznice_temp", { status: 200 });
      }
      return new Response("missing", { status: 404 });
    });

    const { metrics, resolution } = await haComputeDashboardMetrics(cfg, {
      temp_loznice: {
        friendlyName: "_TZ3000 TS0201 Teplota",
        areaName: "Ložnice",
        valueFrom: "state"
      }
    });

    expect(metrics.temp_loznice).toBe(19.2);
    expect(resolution[0]?.picked?.entity_id).toBe("sensor.loznice_temp");
    expect(resolution[0]?.picked?.source).toBe("entityId");
  });

  it("haComputeDashboardMetrics reads attribute values", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/states")) {
        return Response.json([
          {
            entity_id: "weather.forecast_home",
            state: "sunny",
            attributes: { temperature: 15, friendly_name: "Weather" }
          }
        ]);
      }
      return new Response("missing", { status: 404 });
    });

    const { metrics } = await haComputeDashboardMetrics(cfg, {
      temp_jircany: {
        entityId: "weather.forecast_home",
        valueFrom: { attribute: "temperature" }
      }
    });

    expect(metrics.temp_jircany).toBe(15);
  });

  it("haComputeDashboardMetrics caches area template lookups", async () => {
    let templateCalls = 0;
    mockFetch((url, init) => {
      if (url.endsWith("/api/states")) {
        return Response.json([]);
      }
      if (url.endsWith("/api/template") && init?.method === "POST") {
        templateCalls += 1;
        return new Response("sensor.cached", { status: 200 });
      }
      return new Response("missing", { status: 404 });
    });

    const mapping: Record<string, DashboardHaMetricConfig> = {
      a: { friendlyName: "Same", areaName: "Room", valueFrom: "state" },
      b: { friendlyName: "Same", areaName: "Room", valueFrom: "state" }
    };

    await haComputeDashboardMetrics(cfg, mapping);
    expect(templateCalls).toBe(1);
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  intervalSecondsFromMs,
  parseNumberSetting,
  readDashIntervalSeconds,
  readSportIntervalSeconds,
  runAsyncAction
} from "../src/ui/appUtils.js";

describe("appUtils", () => {
  it("parseNumberSetting parses numbers and strings", () => {
    expect(parseNumberSetting(30_000)).toBe(30_000);
    expect(parseNumberSetting("45")).toBe(45);
    expect(Number.isNaN(parseNumberSetting(null))).toBe(true);
  });

  it("intervalSecondsFromMs converts ms to seconds", () => {
    expect(intervalSecondsFromMs(30_000)).toBe("30");
    expect(intervalSecondsFromMs("120000")).toBe("120");
    expect(intervalSecondsFromMs(0)).toBe("");
  });

  it("readDashIntervalSeconds reads dashboard setting", () => {
    expect(
      readDashIntervalSeconds({ settings: { dashboard_sync_interval_ms: 15_000 } })
    ).toBe("15");
  });

  it("readSportIntervalSeconds falls back to 180", () => {
    expect(readSportIntervalSeconds({ settings: {} })).toBe("180");
    expect(readSportIntervalSeconds({ settings: { sport_sync_interval_ms: 60_000 } })).toBe(
      "60"
    );
  });

  it("runAsyncAction swallows async errors", async () => {
    const action = runAsyncAction(async () => {
      throw new Error("fail");
    });
    await expect(async () => {
      action();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }).not.toThrow();
  });

  it("runAsyncAction runs sync callbacks", () => {
    const fn = vi.fn();
    runAsyncAction(fn)();
    expect(fn).toHaveBeenCalledOnce();
  });
});

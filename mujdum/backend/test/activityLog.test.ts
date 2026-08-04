import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActivityLogger } from "../src/activityLog.js";

describe("createActivityLogger", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("strips trailing slashes from Elasticsearch URL", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 201 }));

    const logger = createActivityLogger("http://elastic.local:9200///");
    await logger.log({ event: "settings.update", message: "test" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/elastic\.local:9200\/mujdum-activities-/),
      expect.any(Object)
    );
  });

  it("logs to stdout only when Elasticsearch URL is missing", async () => {
    const logger = createActivityLogger(undefined);
    await logger.log({ event: "error", message: "offline", level: "error" });

    expect(fetch).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalled();
  });
});

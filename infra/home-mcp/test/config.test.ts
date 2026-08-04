import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("parses valid env", () => {
    const cfg = loadConfig({
      HOME_MCP_HOST: "192.168.1.123",
      HOME_MCP_PORT: "8766",
      HOME_MCP_AUTH_TOKEN: "0123456789abcdef0123456789abcdef",
      MUJDUM_API_URL: "http://127.0.0.1:3001/"
    });

    expect(cfg.host).toBe("192.168.1.123");
    expect(cfg.port).toBe(8766);
    expect(cfg.mujdumApiUrl).toBe("http://127.0.0.1:3001");
  });

  it("rejects missing token", () => {
    expect(() =>
      loadConfig({
        HOME_MCP_AUTH_TOKEN: "",
        MUJDUM_API_URL: "http://127.0.0.1:3001"
      })
    ).toThrow(/Invalid home-mcp config/);
  });
});

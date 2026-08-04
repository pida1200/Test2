import { describe, expect, it } from "vitest";
import { MujdumClient, MujdumApiError } from "../src/clients/mujdumClient.js";

describe("MujdumClient", () => {
  it("getDashboard returns parsed JSON", async () => {
    const fetchFn = async (url: string | URL) => {
      expect(String(url)).toBe("http://localhost:3001/api/dashboard");
      return new Response(JSON.stringify({ metrics: { temp_jircany: 20 }, updated_at: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const client = new MujdumClient("http://localhost:3001", fetchFn as typeof fetch);
    const data = await client.getDashboard();
    expect(data).toMatchObject({ metrics: { temp_jircany: 20 } });
  });

  it("throws MujdumApiError on HTTP error", async () => {
    const fetchFn = async () => new Response("fail", { status: 503 });
    const client = new MujdumClient("http://localhost:3001", fetchFn as typeof fetch);

    await expect(client.health()).rejects.toBeInstanceOf(MujdumApiError);
  });

  it("getMetricHistory builds minutes query", async () => {
    let captured = "";
    const fetchFn = async (url: string | URL) => {
      captured = String(url);
      return new Response(JSON.stringify({ key: "temp_jircany", points: [] }), {
        status: 200
      });
    };

    const client = new MujdumClient("http://localhost:3001", fetchFn as typeof fetch);
    await client.getMetricHistory({ key: "temp_jircany", minutes: 1440 });

    expect(captured).toBe(
      "http://localhost:3001/api/dashboard/metrics/temp_jircany/history?minutes=1440"
    );
  });

  it("getMetricHistory builds from/to query", async () => {
    let captured = "";
    const fetchFn = async (url: string | URL) => {
      captured = String(url);
      return new Response(JSON.stringify({ points: [] }), { status: 200 });
    };

    const client = new MujdumClient("http://localhost:3001", fetchFn as typeof fetch);
    await client.getMetricHistory({
      key: "temp_obyvak",
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-02T00:00:00.000Z"
    });

    expect(captured).toContain("/api/dashboard/metrics/temp_obyvak/history?");
    expect(captured).toContain("from=2026-05-01");
    expect(captured).toContain("to=2026-05-02");
  });

  it("listRooms calls dictionaries endpoint", async () => {
    let captured = "";
    const fetchFn = async (url: string | URL) => {
      captured = String(url);
      return new Response(JSON.stringify({ items: [{ id: 1, name: "Obývák" }] }), {
        status: 200
      });
    };

    const client = new MujdumClient("http://localhost:3001", fetchFn as typeof fetch);
    const data = await client.listRooms();

    expect(captured).toBe("http://localhost:3001/api/dictionaries/rooms");
    expect(data).toMatchObject({ items: [{ name: "Obývák" }] });
  });

  it("listSportTeams calls sport-teams endpoint", async () => {
    let captured = "";
    const fetchFn = async (url: string | URL) => {
      captured = String(url);
      return new Response(JSON.stringify({ items: [{ id: 1, name: "Sparta" }] }), {
        status: 200
      });
    };

    const client = new MujdumClient("http://localhost:3001", fetchFn as typeof fetch);
    await client.listSportTeams();

    expect(captured).toBe("http://localhost:3001/api/dictionaries/sport-teams");
  });

  it("listSportPlayers calls sport-players endpoint", async () => {
    let captured = "";
    const fetchFn = async (url: string | URL) => {
      captured = String(url);
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    };

    const client = new MujdumClient("http://localhost:3001", fetchFn as typeof fetch);
    await client.listSportPlayers();

    expect(captured).toBe("http://localhost:3001/api/dictionaries/sport-players");
  });

  it("getSportUpcoming builds query params", async () => {
    let captured = "";
    const fetchFn = async (url: string | URL) => {
      captured = String(url);
      return new Response(
        JSON.stringify({ items: [], synced_at: "2026-05-17T12:00:00.000Z" }),
        { status: 200 }
      );
    };

    const client = new MujdumClient("http://localhost:3001", fetchFn as typeof fetch);
    await client.getSportUpcoming({
      from: "2026-05-17T00:00:00.000Z",
      to: "2026-05-24T00:00:00.000Z",
      teamId: 3
    });

    expect(captured).toContain("/api/sport/upcoming?");
    expect(captured).toContain("from=2026-05-17");
    expect(captured).toContain("to=2026-05-24");
    expect(captured).toContain("teamId=3");
  });
});

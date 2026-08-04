export type FetchFn = typeof fetch;

export class MujdumApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string
  ) {
    super(message);
    this.name = "MujdumApiError";
  }
}

export type MetricHistoryQuery = {
  key: string;
  minutes?: number;
  from?: string;
  to?: string;
};

export type SportUpcomingQuery = {
  from?: string;
  to?: string;
  teamId?: number;
  playerId?: number;
};

export class MujdumClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: FetchFn = fetch
  ) {}

  async health(): Promise<{ ok: boolean }> {
    return this.getJson<{ ok: boolean }>("/health");
  }

  async getDashboard(): Promise<unknown> {
    return this.getJson("/api/dashboard");
  }

  async getMetricHistory(query: MetricHistoryQuery): Promise<unknown> {
    const key = encodeURIComponent(query.key.trim());
    const params = new URLSearchParams();

    if (query.from && query.to) {
      params.set("from", query.from);
      params.set("to", query.to);
    } else if (query.minutes !== undefined) {
      params.set("minutes", String(query.minutes));
    }

    const qs = params.toString();
    const path = `/api/dashboard/metrics/${key}/history${qs ? `?${qs}` : ""}`;
    return this.getJson(path);
  }

  async listRooms(): Promise<unknown> {
    return this.getJson("/api/dictionaries/rooms");
  }

  async listSportTeams(): Promise<unknown> {
    return this.getJson("/api/dictionaries/sport-teams");
  }

  async listSportPlayers(): Promise<unknown> {
    return this.getJson("/api/dictionaries/sport-players");
  }

  async getSportUpcoming(query: SportUpcomingQuery = {}): Promise<unknown> {
    const params = new URLSearchParams();
    if (query.from?.trim()) params.set("from", query.from.trim());
    if (query.to?.trim()) params.set("to", query.to.trim());
    if (query.teamId !== undefined) params.set("teamId", String(query.teamId));
    if (query.playerId !== undefined) params.set("playerId", String(query.playerId));

    const qs = params.toString();
    const path = `/api/sport/upcoming${qs ? `?${qs}` : ""}`;
    return this.getJson(path);
  }

  private async getJson<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchFn(url, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    const text = await res.text();
    if (!res.ok) {
      throw new MujdumApiError(`mujdum API ${path} failed`, res.status, text);
    }

    return JSON.parse(text) as T;
  }
}

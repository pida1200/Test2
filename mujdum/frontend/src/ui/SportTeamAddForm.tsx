import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getApiErrorMessage } from "../apiError.js";
import { runAsyncAction } from "./appUtils.js";
import {
  resolveEffectiveSport,
  resolveSportFromQuery,
  type SportOption
} from "./sportTheSportsDbFormUtils.js";

export type SportTeamAddPayload = {
  name: string;
  thesportsdb_team_id: string;
  sport: string;
  league_hint?: string;
};

type TeamOption = {
  thesportsdb_team_id: string;
  name: string;
  sport: string | null;
  league: string | null;
  country: string | null;
};

type Props = Readonly<{
  onSubmit: (payload: SportTeamAddPayload) => Promise<void>;
  onError: (message: string) => void;
}>;

export function SportTeamAddForm({ onSubmit, onError }: Props) {
  const sportListId = useId();

  const [sports, setSports] = useState<SportOption[]>([]);
  const [demoKey, setDemoKey] = useState(false);
  const [sportQuery, setSportQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [teamQuery, setTeamQuery] = useState("");
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamOption | null>(null);
  const [teamSearchLoading, setTeamSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [teamSearchError, setTeamSearchError] = useState<string | null>(null);
  /** null = ještě neproběhlo vyhledání pro aktuální dotaz */
  const [teamSearchDone, setTeamSearchDone] = useState(false);

  const teamSearchGen = useRef(0);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const effectiveSport = resolveEffectiveSport(sportQuery, selectedSport, sports);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sport/thesportsdb/sports")
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(getApiErrorMessage(json, "Načtení sportů selhalo."));
        }
        return res.json() as Promise<{ items: SportOption[]; demo_key?: boolean }>;
      })
      .then((data) => {
        if (cancelled) return;
        setSports(data.items ?? []);
        setDemoKey(Boolean(data.demo_key));
      })
      .catch((e) => {
        if (cancelled) return;
        onErrorRef.current(
          e instanceof Error ? e.message : "Načtení sportů selhalo."
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sportSuggestions = sports.filter((s) => {
    const q = sportQuery.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q);
  });

  const pickSport = useCallback((name: string) => {
    setSelectedSport(name);
    setSportQuery(name);
    setSelectedTeam(null);
    setTeamQuery("");
    setTeamOptions([]);
    setFieldError(null);
  }, []);

  useEffect(() => {
    const resolved = resolveSportFromQuery(sportQuery, sports);
    if (resolved && resolved !== selectedSport) {
      setSelectedSport(resolved);
    }
  }, [sportQuery, sports, selectedSport]);

  useEffect(() => {
    if (!effectiveSport || teamQuery.trim().length < 2) {
      setTeamOptions([]);
      setTeamSearchError(null);
      setTeamSearchDone(false);
      setTeamSearchLoading(false);
      return;
    }

    setTeamSearchDone(false);
    const gen = ++teamSearchGen.current;
    const timer = globalThis.setTimeout(() => {
      setTeamSearchLoading(true);
      setTeamSearchError(null);
      const params = new URLSearchParams({
        sport: effectiveSport,
        q: teamQuery.trim()
      });
      fetch(`/api/sport/thesportsdb/teams/search?${params}`)
        .then(async (res) => {
          const text = await res.text();
          let json: unknown = null;
          if (text) {
            try {
              json = JSON.parse(text) as unknown;
            } catch {
              json = null;
            }
          }
          if (!res.ok) {
            const hint =
              res.status === 404 && text.includes("Cannot GET")
                ? "Backend na serveru nemá endpoint vyhledávání týmů — spusť deploy (./scripts/deploy-remote.sh)."
                : getApiErrorMessage(json, "Vyhledávání týmů selhalo.");
            throw new Error(hint);
          }
          return json as { items: TeamOption[]; demo_key?: boolean };
        })
        .then((data) => {
          if (gen !== teamSearchGen.current) return;
          setTeamOptions(data.items ?? []);
          if (data.demo_key) setDemoKey(true);
          setTeamSearchDone(true);
        })
        .catch((e) => {
          if (gen !== teamSearchGen.current) return;
          const message =
            e instanceof Error ? e.message : "Vyhledávání týmů selhalo.";
          setTeamSearchError(message);
          onErrorRef.current(message);
          setTeamOptions([]);
          setTeamSearchDone(true);
        })
        .finally(() => {
          if (gen === teamSearchGen.current) setTeamSearchLoading(false);
        });
    }, 300);

    return () => globalThis.clearTimeout(timer);
  }, [effectiveSport, teamQuery]);

  const pickTeam = useCallback(
    async (team: TeamOption) => {
      const sport = effectiveSport;
      if (!sport) return;
      setFieldError(null);

      const verifyRes = await fetch(
        `/api/sport/thesportsdb/teams/${encodeURIComponent(team.thesportsdb_team_id)}/verify?sport=${encodeURIComponent(sport)}`
      );
      if (!verifyRes.ok) {
        const json = await verifyRes.json().catch(() => null);
        setFieldError(
          getApiErrorMessage(json, "Tým nelze ověřit v TheSportsDB pro zvolený sport.")
        );
        return;
      }

      const verified = (await verifyRes.json()) as {
        team: TeamOption;
      };
      setSelectedTeam(verified.team);
      setTeamQuery(verified.team.name);
      setTeamOptions([]);
    },
    [effectiveSport]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);

    const sport = effectiveSport;
    if (!sport) {
      setFieldError("Vyber sport ze seznamu (např. Soccer nebo Fotbal).");
      return;
    }

    if (!selectedTeam) {
      setFieldError("Vyber tým z našeptávače TheSportsDB (min. 2 znaky názvu).");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: selectedTeam.name,
        thesportsdb_team_id: selectedTeam.thesportsdb_team_id,
        sport,
        league_hint: selectedTeam.league ?? undefined
      });
      setSportQuery("");
      setSelectedSport(null);
      setTeamQuery("");
      setSelectedTeam(null);
      setTeamOptions([]);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Uložení týmu selhalo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form sportAddForm" onSubmit={handleSubmit}>
      {demoKey ? (
        <p className="tileHint">
          Použitý je demo klíč TheSportsDB — našeptávač může vracet nepřesné výsledky. Pro
          spolehlivé vyhledávání použij vlastní API klíč.
        </p>
      ) : null}

      <label className="label comboField">
        <span className="labelText">Sport</span>
        <input
          className="input"
          value={sportQuery}
          onChange={(e) => {
            const value = e.target.value;
            setSportQuery(value);
            const resolved = resolveSportFromQuery(value, sports);
            if (resolved) {
              setSelectedSport(resolved);
            } else {
              setSelectedSport(null);
              setSelectedTeam(null);
              setTeamQuery("");
              setTeamOptions([]);
            }
            setFieldError(null);
          }}
          onBlur={() => {
            const resolved = resolveSportFromQuery(sportQuery, sports);
            if (resolved) pickSport(resolved);
          }}
          placeholder="Začni psát např. Soccer nebo Fotbal"
          list={sportListId}
          autoComplete="off"
        />
        <datalist id={sportListId}>
          {sportSuggestions.map((s) => (
            <option key={s.name} value={s.name} />
          ))}
        </datalist>
      </label>

      <label className="label comboField">
        <span className="labelText">Tým</span>
        <input
          className="input"
          value={teamQuery}
          disabled={!effectiveSport}
          onChange={(e) => {
            setTeamQuery(e.target.value);
            setSelectedTeam(null);
            setFieldError(null);
            setTeamSearchError(null);
          }}
          placeholder={
            effectiveSport
              ? "Hledej tým (min. 2 znaky)…"
              : "Nejdřív zadej sport (např. Soccer nebo Fotbal)"
          }
          autoComplete="off"
        />
        {teamSearchLoading ? <span className="comboHint">Hledám…</span> : null}
        {teamSearchError ? (
          <p className="comboFieldError">{teamSearchError}</p>
        ) : null}
        {!teamSearchLoading &&
        teamSearchDone &&
        !teamSearchError &&
        effectiveSport &&
        teamQuery.trim().length >= 2 &&
        teamOptions.length === 0 ? (
          <span className="comboHint">Žádný tým — zkus jiný název nebo zkontroluj sport.</span>
        ) : null}
        {teamOptions.length > 0 ? (
          <ul className="comboList" aria-label="Nalezené týmy">
            {teamOptions.map((team) => (
              <li key={team.thesportsdb_team_id}>
                <button
                  type="button"
                  className="comboOption"
                  aria-pressed={selectedTeam?.thesportsdb_team_id === team.thesportsdb_team_id}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={runAsyncAction(() => pickTeam(team))}
                >
                  <span className="comboOptionTitle">{team.name}</span>
                  <span className="comboOptionMeta">
                    {[team.league, team.country, `ID ${team.thesportsdb_team_id}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </label>

      {selectedTeam ? (
        <p className="comboSelected">
          Vybráno: <strong>{selectedTeam.name}</strong> (TheSportsDB ID{" "}
          {selectedTeam.thesportsdb_team_id}
          {selectedTeam.league ? `, ${selectedTeam.league}` : ""})
        </p>
      ) : null}

      {fieldError ? <p className="comboFieldError">{fieldError}</p> : null}

      <button className="button" type="submit" disabled={submitting || !selectedTeam}>
        {submitting ? "Ukládám…" : "Přidat tým"}
      </button>
    </form>
  );
}

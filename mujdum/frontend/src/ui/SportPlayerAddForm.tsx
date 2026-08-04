import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getApiErrorMessage } from "../apiError.js";
import { runAsyncAction } from "./appUtils.js";
import {
  resolveEffectiveSport,
  resolveSportFromQuery,
  type SportOption
} from "./sportTheSportsDbFormUtils.js";

export type SportPlayerAddPayload = {
  name: string;
  thesportsdb_player_id: string;
  sport: string;
};

type PlayerOption = {
  thesportsdb_player_id: string;
  name: string;
  sport: string | null;
  team: string | null;
};

type Props = Readonly<{
  onSubmit: (payload: SportPlayerAddPayload) => Promise<void>;
  onError: (message: string) => void;
}>;

export function SportPlayerAddForm({ onSubmit, onError }: Props) {
  const sportListId = useId();

  const [sports, setSports] = useState<SportOption[]>([]);
  const [demoKey, setDemoKey] = useState(false);
  const [sportQuery, setSportQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [playerQuery, setPlayerQuery] = useState("");
  const [playerOptions, setPlayerOptions] = useState<PlayerOption[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOption | null>(null);
  const [playerSearchLoading, setPlayerSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [playerSearchError, setPlayerSearchError] = useState<string | null>(null);
  const [playerSearchDone, setPlayerSearchDone] = useState(false);

  const playerSearchGen = useRef(0);
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
    setSelectedPlayer(null);
    setPlayerQuery("");
    setPlayerOptions([]);
    setFieldError(null);
  }, []);

  useEffect(() => {
    const resolved = resolveSportFromQuery(sportQuery, sports);
    if (resolved && resolved !== selectedSport) {
      setSelectedSport(resolved);
    }
  }, [sportQuery, sports, selectedSport]);

  useEffect(() => {
    if (!effectiveSport || playerQuery.trim().length < 2) {
      setPlayerOptions([]);
      setPlayerSearchError(null);
      setPlayerSearchDone(false);
      setPlayerSearchLoading(false);
      return;
    }

    setPlayerSearchDone(false);
    const gen = ++playerSearchGen.current;
    const timer = globalThis.setTimeout(() => {
      setPlayerSearchLoading(true);
      setPlayerSearchError(null);
      const params = new URLSearchParams({
        sport: effectiveSport,
        q: playerQuery.trim()
      });
      fetch(`/api/sport/thesportsdb/players/search?${params}`)
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
                ? "Backend nemá endpoint vyhledávání sportovců — spusť deploy."
                : getApiErrorMessage(json, "Vyhledávání sportovců selhalo.");
            throw new Error(hint);
          }
          return json as { items: PlayerOption[]; demo_key?: boolean };
        })
        .then((data) => {
          if (gen !== playerSearchGen.current) return;
          setPlayerOptions(data.items ?? []);
          if (data.demo_key) setDemoKey(true);
          setPlayerSearchDone(true);
        })
        .catch((e) => {
          if (gen !== playerSearchGen.current) return;
          const message =
            e instanceof Error ? e.message : "Vyhledávání sportovců selhalo.";
          setPlayerSearchError(message);
          onErrorRef.current(message);
          setPlayerOptions([]);
          setPlayerSearchDone(true);
        })
        .finally(() => {
          if (gen === playerSearchGen.current) setPlayerSearchLoading(false);
        });
    }, 300);

    return () => globalThis.clearTimeout(timer);
  }, [effectiveSport, playerQuery]);

  const pickPlayer = useCallback(
    async (player: PlayerOption) => {
      const sport = effectiveSport;
      if (!sport) return;
      setFieldError(null);

      const verifyRes = await fetch(
        `/api/sport/thesportsdb/players/${encodeURIComponent(player.thesportsdb_player_id)}/verify?sport=${encodeURIComponent(sport)}`
      );
      if (!verifyRes.ok) {
        const json = await verifyRes.json().catch(() => null);
        setFieldError(
          getApiErrorMessage(json, "Sportovce nelze ověřit v TheSportsDB pro zvolený sport.")
        );
        return;
      }

      const verified = (await verifyRes.json()) as { player: PlayerOption };
      setSelectedPlayer(verified.player);
      setPlayerQuery(verified.player.name);
      setPlayerOptions([]);
    },
    [effectiveSport]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);

    const sport = effectiveSport;
    if (!sport) {
      setFieldError("Vyber sport ze seznamu (např. Ice Hockey nebo Hokej).");
      return;
    }

    if (!selectedPlayer) {
      setFieldError("Vyber sportovce z našeptávače TheSportsDB (min. 2 znaky jména).");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: selectedPlayer.name,
        thesportsdb_player_id: selectedPlayer.thesportsdb_player_id,
        sport
      });
      setSportQuery("");
      setSelectedSport(null);
      setPlayerQuery("");
      setSelectedPlayer(null);
      setPlayerOptions([]);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Uložení sportovce selhalo.");
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
              setSelectedPlayer(null);
              setPlayerQuery("");
              setPlayerOptions([]);
            }
            setFieldError(null);
          }}
          onBlur={() => {
            const resolved = resolveSportFromQuery(sportQuery, sports);
            if (resolved) pickSport(resolved);
          }}
          placeholder="Začni psát např. Ice Hockey nebo Hokej"
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
        <span className="labelText">Sportovec</span>
        <input
          className="input"
          value={playerQuery}
          disabled={!effectiveSport}
          onChange={(e) => {
            setPlayerQuery(e.target.value);
            setSelectedPlayer(null);
            setFieldError(null);
            setPlayerSearchError(null);
          }}
          placeholder={
            effectiveSport
              ? "Hledej jméno (min. 2 znaky)…"
              : "Nejdřív zadej sport (např. Ice Hockey nebo Hokej)"
          }
          autoComplete="off"
        />
        {playerSearchLoading ? <span className="comboHint">Hledám…</span> : null}
        {playerSearchError ? (
          <p className="comboFieldError">{playerSearchError}</p>
        ) : null}
        {!playerSearchLoading &&
        playerSearchDone &&
        !playerSearchError &&
        effectiveSport &&
        playerQuery.trim().length >= 2 &&
        playerOptions.length === 0 ? (
          <span className="comboHint">
            Žádný sportovec — zkus jiné jméno nebo zkontroluj sport.
          </span>
        ) : null}
        {playerOptions.length > 0 ? (
          <ul className="comboList" aria-label="Nalezení sportovci">
            {playerOptions.map((player) => (
              <li key={player.thesportsdb_player_id}>
                <button
                  type="button"
                  className="comboOption"
                  aria-pressed={
                    selectedPlayer?.thesportsdb_player_id === player.thesportsdb_player_id
                  }
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={runAsyncAction(() => pickPlayer(player))}
                >
                  <span className="comboOptionTitle">{player.name}</span>
                  <span className="comboOptionMeta">
                    {[player.team, player.sport, `ID ${player.thesportsdb_player_id}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </label>

      {selectedPlayer ? (
        <p className="comboSelected">
          Vybráno: <strong>{selectedPlayer.name}</strong> (TheSportsDB ID{" "}
          {selectedPlayer.thesportsdb_player_id}
          {selectedPlayer.team ? `, ${selectedPlayer.team}` : ""})
        </p>
      ) : null}

      {fieldError ? <p className="comboFieldError">{fieldError}</p> : null}

      <button className="button" type="submit" disabled={submitting || !selectedPlayer}>
        {submitting ? "Ukládám…" : "Přidat sportovce"}
      </button>
    </form>
  );
}

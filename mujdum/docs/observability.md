## Observability (Elasticsearch + Kibana)

### Kde to běží

- Elasticsearch: `http://localhost:9200`
- Kibana: `http://localhost:5601`

### Co se loguje

Backend zapisuje do Elasticsearch aplikační “aktivity” jako JSON dokumenty:

- index: `mujdum-activities-YYYY-MM`
- pole:
  - `@timestamp`
  - `level` (`info|warn|error`)
  - `event` (např. `dictionary.rooms.sync_from_ha`, `dictionary.rooms.sync_manual`, `dashboard.ha_sync`, `dashboard.snapshot_ingest`, `settings.update`, `error`)
  - `message`
  - `data` (detail)

U **`dashboard.ha_sync`** je v `data.resolution` jen **zkrácený přehled** po syncu (klíč metriky, jak byla entita vybrána, příznak nedostupnosti) — bez uložení plných hodnot stavů z HA; ty jsou v Postgresu (`dashboard_metrics` / historie).

Selže-li **zápis dokumentu do Elasticsearch** (HTTP chyba ES, síť), backend vypíše chybu na stderr (`[activityLog] elastic index failed …`), dokument do indexu nedorazí; aktivita je pořád na stdout.

Selže-li **periodický HA sync** výjimkou před zápisem do DB, zaloguje se `level: error`, `event: error`, text „Dashboard HA sync failed“ a stack v `data`.

Zároveň každá aktivita jde i na stdout (`docker compose logs backend`).

### Jak to otevřít v Kibana

1) Otevři `http://localhost:5601`
2) Vytvoř Data View pro `mujdum-activities-*`
3) Otevři Discover a filtruj podle:
   - `level: "error"`
   - `event: "dashboard.ha_sync"`
   - `event: "dictionary.rooms.sync_from_ha"`
   - `event: "settings.update"`

### Typické chyby

- **Home Assistant URL špatně** (např. dvojité `http://`) → v logu `getaddrinfo ENOTFOUND`
- **token neplatný** → `401` z HA REST API (uvidíš v `message`/`data`)
- **proxy na FE**: když `/api` vrací 404 typu `Cannot GET /dashboard`, je špatně `proxy_pass` v `frontend/nginx.conf`

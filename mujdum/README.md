## mujdum

Třívrstvá aplikace:

- **frontend**: React (responsivní UI)
- **backend**: Node.js (business logika + integrace)
- **db**: PostgreSQL

### Lokální běh (v Dockeru celé)

1) Připrav konfiguraci (bez ní se HA sync přeskočí):

```bash
cd mujdum
cp .env.example .env
```

Do `mujdum/.env` doplň minimálně:

- `HOME_ASSISTANT_URL`
- `HOME_ASSISTANT_TOKEN` (Long-Lived Access Token)

1) Spusť celý stack:

```bash
cd mujdum
docker compose up -d
```

**Automatický nasazování změn do lokálního Dockeru:** po úpravách ve `frontend/` nebo `backend/` stačí mít zapnuté sledování — Compose znovu postaví příslušný image a kontejner:

```bash
cd mujdum
npm run docker:watch
```

(Příkaz `docker compose watch` musí umět tvoje instalace Docker Compose, typicky Docker Desktop. Běží v popředí; ukončení Ctrl+C.)

V Cursoru po úpravách kódu FE/BE agent automaticky pouští `docker compose up -d --build` podle pravidla **`.cursor/rules/mujdum-docker.mdc`** (pokud neřekneš opak).

1) UI + API:

```bash
# FE: http://localhost:3000
# BE: http://localhost:3001/health
# Kibana: http://localhost:5601
```

Pozn.: Nic se nespouští “z lokálu” mimo Docker — backend i frontend běží v kontejnerech, backend si bere konfiguraci z `mujdum/.env`.

### Struktura

- `frontend/` – React aplikace
- `backend/` – API server + migrace + testy
- `docker-compose.yml` – celý stack (FE/BE/DB/Elasticsearch/Kibana)

### Dokumentace

- `docs/README.md` – přehled + jak spustit
- `docs/zadani.md` – zadání sladěné s aktuálním chováním
- `docs/architecture.md` – architektura a tok dat
- `docs/api.md` – API endpointy
- `docs/observability.md` – logování (Elasticsearch/Kibana)
- `docs/home-assistant-mapovani.md` – mapování Home Assistant → metriky dashboardu
- `docs/grafy.md` – mapa souborů a nastavení variant grafů (MUI / timeline)
- Doplňkové poznámky a session (Obsidian): **`projekty/mujdum/hub`** ve vaultu (odkaz z `docs/README.md`)

Konfigurační šablona: `.env.example` (zkopíruj na `.env` v kořeni `mujdum/`).

### Nasazení na vzdálený Docker (SSH)

Cílový stroj ve zadání: **`192.168.1.123`**. Na serveru musí běžet Docker + Compose. SSH účet na tom serveru je v praxi **`zkorinek`** (není totéž co lokální uživatel na Macu — proto dřív selhávalo nasazení, když skript bral omylem `$USER`).

1. Jeden soubor s parametry (doporučeno): zkopíruj `mujdum/.deploy.env.example` → **`mujdum/.deploy.env`** a uprav.
2. Spusť:

```bash
cd mujdum
./scripts/deploy-remote.sh
```

Skript načte `.deploy.env` (pokud existuje), provede `rsync` kódu (lokální **`.env` se nepřenáší** — na serveru nech vlastní `mujdum/.env`) a na serveru `docker compose up -d --build`.

**Bez skriptu** (stejné ověření jako u předchozího úspěšného deploye — přímý engine přes SSH):

```bash
cd mujdum
docker -H "ssh://zkorinek@192.168.1.123" compose up -d --build
```

(Vyžaduje funkční `ssh zkorinek@192.168.1.123` a aby byl kontext buildu dostupný na daemonu; často jednodušší je varianta s `rsync` výše.)

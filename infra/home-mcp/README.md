# home-mcp (Docker)

MCP server pro Cursor: read-only přístup k **mujdum** API přes LAN.

- Zadání a roadmap: [`mujdum/docs/sport.md`](../../mujdum/docs/sport.md)
- Implementováno: **fáze 1–3** (základní tools) + **fáze 8** (sport číselníky a upcoming). Deploy na `192.168.1.123:8766`.

## Požadavky

- Běžící **mujdum backend** (`http://127.0.0.1:3001` lokálně, na Pi stejně při `network_mode: host`)
- Node **22+** pro lokální vývoj; v Dockeru image `node:22-alpine`

## Lokální vývoj

```bash
cd infra/home-mcp
cp .env.example .env
```

V `.env` minimálně:

```bash
HOME_MCP_AUTH_TOKEN=$(openssl rand -hex 32)   # vyplň do .env
HOME_MCP_HOST=127.0.0.1
HOME_MCP_PORT=8766
MUJDUM_API_URL=http://127.0.0.1:3001
```

```bash
npm install
npm test
npm run build
npm start
```

Ověření:

```bash
curl -s http://127.0.0.1:8766/health
# → {"ok":true,"service":"home-mcp"}

curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8766/mcp
# → 401

curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer <HOME_MCP_AUTH_TOKEN>" \
  http://127.0.0.1:8766/mcp
# → 405 (endpoint je POST-only — v pořádku)
```

## Nasazení na 192.168.1.123

```bash
cd infra/home-mcp
# .env na serveru: zkopíruj .env.example → ~/home-mcp/.env na Pi (deploy skript při chybějícím .env vytvoří šablonu)
./deploy-remote.sh
```

V `.env` na serveru:

| Proměnná | Příklad |
|----------|---------|
| `HOME_MCP_HOST` | `192.168.1.123` |
| `HOME_MCP_PORT` | `8766` |
| `HOME_MCP_AUTH_TOKEN` | z `openssl rand -hex 32` |
| `MUJDUM_API_URL` | `http://127.0.0.1:3001` |

Port **8766** (vedle Hydrawise MCP na **8765**).

## Cursor (`~/.cursor/mcp.json`)

**Lokálně** (Mac, `home-mcp` + mujdum na localhost):

```json
{
  "mcpServers": {
    "home": {
      "url": "http://127.0.0.1:8766/mcp",
      "headers": {
        "Authorization": "Bearer <HOME_MCP_AUTH_TOKEN>"
      }
    }
  }
}
```

**Vzdáleně** (Pi, stejná síť LAN):

```json
{
  "mcpServers": {
    "home": {
      "url": "http://192.168.1.123:8766/mcp",
      "headers": {
        "Authorization": "Bearer <HOME_MCP_AUTH_TOKEN>"
      }
    }
  }
}
```

Token musí být **stejný** jako `HOME_MCP_AUTH_TOKEN` v `.env` na stroji, kde MCP běží. Token nedávat do gitu.

Po změně `mcp.json` v Cursoru restart MCP / reload window.

## Tools (read-only)

| Tool | HTTP | Vstup |
|------|------|--------|
| `mujdum_health` | `GET /health` | — |
| `mujdum_dashboard_metrics` | `GET /api/dashboard` | — |
| `mujdum_metric_history` | `GET /api/dashboard/metrics/:key/history` | `key`; volitelně `minutes` **nebo** `from` + `to` (ISO) |
| `mujdum_rooms_list` | `GET /api/dictionaries/rooms` | — |
| `mujdum_sport_teams_list` | `GET /api/dictionaries/sport-teams` | — |
| `mujdum_sport_players_list` | `GET /api/dictionaries/sport-players` | — |
| `mujdum_sport_upcoming` | `GET /api/sport/upcoming` | volitelně `from`, `to` (ISO, oba nebo žádný), `teamId`, `playerId` (interní ID z číselníků) |

Příklady: `mujdum_metric_history` s `key: "temp_jircany"`, `minutes: 1440`; `mujdum_sport_upcoming` s `teamId: 1` pro zápasy jednoho týmu.

## Bezpečnost

- Pouze **LAN**; na Pi firewall — port 8766 ne do internetu
- Každý request na `/mcp` vyžaduje `Authorization: Bearer …`
- Žádný přímý přístup k Postgresu ani zápis do mujdum (zatím)

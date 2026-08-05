# Deploy

> Bez secretů. Vzdálený deploy jen na žádost.

## Lokálně (mujdum)

```bash
cd mujdum && docker compose up -d --build frontend backend
curl -s http://127.0.0.1:3001/health
```

## Vzdáleně

Jen když uživatel výslovně požádá — viz `mujdum/scripts/deploy-remote.sh` / `mujdum-docker.mdc`.

## Číselníky

```bash
cd ciselniky && npm run deploy && npm run check
```

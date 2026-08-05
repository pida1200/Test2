# Konfigurace

> **Nikdy** neuvádět hesla, API klíče ani tokeny. Jen názvy proměnných a kde se berou.

## Typické soubory

| Soubor | Účel |
|--------|------|
| `mujdum/.env` / `.env.example` | runtime BE/FE |
| `ciselniky/.env` | číselníky |
| Cloud Environment secrets | např. `GH_TOKEN` pro Issues write |

## Příklady názvů (bez hodnot)

- `THESPORTSDB_API_KEY`
- `DATABASE_URL` / DB host+port
- `GH_TOKEN` (Issues pro cloud agenty)

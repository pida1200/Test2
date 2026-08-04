# Sloučení Postgres DB (lokál ↔ vzdálený Docker)

Postup pro sjednocení `dashboard_metrics` a `dashboard_metrics_history` mezi lokálním `docker compose` a serverem (typicky `192.168.1.123`), aby obě DB měly **maximální historii**.

## Principy

- **Lokální backend nezastavovat** — během merge pokračuje HA sync a přibývají nové řádky.
- Historie se slučuje podle **`(key, created_at)`** — mezi lokálem a 123 se časové značky obvykle **nepřekrývají** (každý backend zapisuje `now()` při vlastním syncu).
- **`dashboard_metrics`**: u každého `key` platí řádek s **nejnovějším `updated_at`**.
- Zálohy před začátkem; artefakty merge do `.db-merge-backup/` (v gitu ignorováno).

## Příprava

```bash
cd mujdum
mkdir -p .db-merge-backup
date -u +"%Y-%m-%dT%H:%M:%SZ" | tee .db-merge-backup/T0.txt

docker exec mujdum-db-1 pg_dump -U postgres -Fc mujdum > .db-merge-backup/local-pre.dump
ssh zkorinek@192.168.1.123 'docker exec mujdum-db-1 pg_dump -U postgres -Fc mujdum' \
  > .db-merge-backup/remote-pre.dump
```

## 1. Doplnění lokálu daty ze vzdáleného

Export z 123 → staging tabulky v lokálním Postgresu → `INSERT … WHERE NOT EXISTS (key, created_at)`.

```bash
# export CSV (příklad)
ssh zkorinek@192.168.1.123 "docker exec mujdum-db-1 psql -U postgres -d mujdum -c \
  \"\\copy (SELECT key, value::text, numeric_value, created_at FROM dashboard_metrics_history ORDER BY id) TO STDOUT WITH (FORMAT csv)\"" \
  > .db-merge-backup/remote_history.csv
```

Stejně `dashboard_metrics`. Na lokálu staging + insert/upsert (viz skripty v chatu / poslední merge 2026-05-17).

## 2. Nasazení sloučené historie na 123

- `docker compose stop backend` **jen na vzdáleném hostu**
- Export plné historie z lokálu po kroku 1; zapsat `T1-export-end.txt`
- Na 123: `TRUNCATE dashboard_metrics_history` + `\copy` z lokálního CSV
- `UPSERT` `dashboard_metrics` z lokálu
- **Delta**: řádky z lokálu s `created_at >= T1` doplnit na 123 (`INSERT … NOT EXISTS`)
- `docker compose start backend` na 123
- **Dohrátí**: řádky zapsané na 123 po startu backendu doplnit zpět na lokál (stejný `NOT EXISTS`)

## 3. Ověření

```bash
docker exec mujdum-db-1 psql -U postgres -d mujdum -t -c \
  "SELECT count(*) FROM dashboard_metrics_history;"
ssh zkorinek@192.168.1.123 "docker exec mujdum-db-1 psql -U postgres -d mujdum -t -c \
  \"SELECT count(*) FROM dashboard_metrics_history;\""
curl -s http://localhost:3001/health
curl -s http://192.168.1.123:3001/health
```

Počty historie by měly být shodné (± pár řádků během posledního syncu — dohrát deltou).

## Co merge neřeší

- **Elasticsearch** (activity log) — samostatné volume, tento postup se netýká.
- **Budoucí divergence**: oba backendy dál syncují HA → znovu vzniknou rozdílné časové řady; dlouhodobě zvaž sync jen na produkčním hostu.

## Varianta bez TRUNCATE (doporučená, symetrická)

Místo kroku 2 (`stop backend` + `TRUNCATE` + `\copy`) lze sloučit **oboustranně přes `INSERT … WHERE NOT EXISTS (key, created_at)`** — idempotentní, **nezastavuje** ani jeden backend:

1. Zálohy obou (`pg_dump -Fc`).
2. Export 123 (history+metrics CSV) → `docker cp` do lokálního kontejneru → `\copy` do temp staging (`ON COMMIT DROP`) → `INSERT … NOT EXISTS`; metriky `ON CONFLICT (key) DO UPDATE … WHERE EXCLUDED.updated_at > current`. → lokál = union.
3. Export lokálu (už union) → `scp` na 123 → `docker cp` → stejný `INSERT … NOT EXISTS`. → 123 = union.
4. **Delta** (sync běžel během operace): z každé strany exportuj `created_at >= cutoff` a doplň `NOT EXISTS` na druhou stranu.

Skripty (poslední běh): `mujdum/.db-merge-backup/merge_into_local.sql`, `merge_into_remote.sql` (gitignored).

## Reference

- Poslední úspěšný merge: **2026-05-30** (357 625 řádků historie, 24 metrik) — varianta bez TRUNCATE.
- Předchozí: **2026-05-17** (~176k řádků historie, 24 metrik).
- `docker-compose.yml`: `restart: unless-stopped` u všech služeb (po rebootu hosta stack naběhne sám).

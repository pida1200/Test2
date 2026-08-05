# Monitoring a health

## Health

```bash
curl -s http://127.0.0.1:3001/health
curl -s http://127.0.0.1:3011/health   # ciselniky BE, pokud běží
```

## Typické kontroly

- backend/frontend logy v Dockeru
- CI: Sonar / coverage joby (skip když lockfile chybí)

## Incidenty (doplňovat)

| Symptom | Pravděpodobná příčina | Akce |
|---------|----------------------|------|
| Cloud agent 403 Issues | token bez `issues` scope | Desktop nebo `GH_TOKEN` |
| … | … | … |

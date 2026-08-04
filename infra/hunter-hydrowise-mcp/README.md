# Hunter Hydrawise MCP (Docker)

Služba [skialpine/hunter-hydrowise-mcp](https://github.com/skialpine/hunter-hydrowise-mcp) v kontejneru Node 24, síť **host** (naslouchání na LAN IP kvůli ověření `Host` v upstreamu).

## Nasazení na server (192.168.1.123)

```bash
cd infra/hunter-hydrowise-mcp
cp .env.example .env
# vyplň HYDRAWISE_USERNAME, HYDRAWISE_PASSWORD, HYDRAWISE_MCP_AUTH_TOKEN
./deploy-remote.sh
```

Nebo ručně na serveru v `~/hunter-hydrowise-mcp`: `docker compose up -d --build`.

## Cursor (klient)

- URL: `http://<LAN-IP>:8765/mcp`
- Header: `Authorization: Bearer <HYDRAWISE_MCP_AUTH_TOKEN>` (stejný token jako v `.env` na serveru)

Hydrawise účet nesdílej v gitu — `.env` je v `.gitignore`.

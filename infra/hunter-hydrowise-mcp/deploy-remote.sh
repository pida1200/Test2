#!/usr/bin/env bash
# Rsync stacku na vzdálený host a docker compose up --build.
# Načte mujdum/.deploy.env pokud existuje (MUJDUM_DEPLOY_HOST, MUJDUM_DEPLOY_USER).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
CURSOR_ROOT="$(cd "${ROOT}/../.." && pwd)"
MUJDUM_ROOT="${CURSOR_ROOT}/mujdum"
if [[ -f "${MUJDUM_ROOT}/.deploy.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${MUJDUM_ROOT}/.deploy.env"
  set +a
fi

HOST="${MUJDUM_DEPLOY_HOST:-192.168.1.123}"
REMOTE_USER="${MUJDUM_DEPLOY_USER:-zkorinek}"

echo "Deploy hydrowise-mcp: ${ROOT} -> ${REMOTE_USER}@${HOST}:~/hunter-hydrowise-mcp"

rsync -avz --delete \
  --exclude '.env' \
  --exclude '.DS_Store' \
  "${ROOT}/" "${REMOTE_USER}@${HOST}:~/hunter-hydrowise-mcp/"

ssh "${REMOTE_USER}@${HOST}" bash -s <<'EOS'
set -euo pipefail
cd ~/hunter-hydrowise-mcp
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo ">>> Vytvořen ~/hunter-hydrowise-mcp/.env — doplň HYDRAWISE_USERNAME, HYDRAWISE_PASSWORD a HYDRAWISE_MCP_AUTH_TOKEN (např. openssl rand -hex 32), pak znovu spusť deploy-remote.sh z lokálu." >&2
  exit 1
fi
if ! grep -qE '^HYDRAWISE_USERNAME=.+[^[:space:]]' .env \
  || ! grep -qE '^HYDRAWISE_PASSWORD=.+[^[:space:]]' .env \
  || ! grep -qE '^HYDRAWISE_MCP_AUTH_TOKEN=.+[^[:space:]]' .env; then
  echo ">>> V .env dopiš Hydrawise účet a MCP token. Chybějící nebo prázdné:" >&2
  grep -qE '^HYDRAWISE_USERNAME=.+[^[:space:]]' .env || echo "    - HYDRAWISE_USERNAME" >&2
  grep -qE '^HYDRAWISE_PASSWORD=.+[^[:space:]]' .env || echo "    - HYDRAWISE_PASSWORD" >&2
  grep -qE '^HYDRAWISE_MCP_AUTH_TOKEN=.+[^[:space:]]' .env || echo "    - HYDRAWISE_MCP_AUTH_TOKEN (openssl rand -hex 32)" >&2
  exit 1
fi
docker compose up -d --build
echo "Hotovo. curl -i http://127.0.0.1:8765/mcp → očekávej 405 (endpoint je POST-only)."
EOS

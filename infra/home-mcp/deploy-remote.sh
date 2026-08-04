#!/usr/bin/env bash
# Rsync home-mcp na vzdálený host a docker compose up --build.

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

echo "Deploy home-mcp: ${ROOT} -> ${REMOTE_USER}@${HOST}:~/home-mcp"

rsync -avz --delete \
  --exclude '.env' \
  --exclude '.env.local-cursor-hint' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude '.DS_Store' \
  "${ROOT}/" "${REMOTE_USER}@${HOST}:~/home-mcp/"

ssh "${REMOTE_USER}@${HOST}" bash -s <<'EOS'
set -euo pipefail
cd ~/home-mcp
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo ">>> Vytvořen ~/home-mcp/.env — doplň HOME_MCP_AUTH_TOKEN (openssl rand -hex 32) a HOME_MCP_HOST=${HOST:-192.168.1.123}, pak znovu deploy-remote.sh." >&2
  exit 1
fi
if ! grep -qE '^HOME_MCP_AUTH_TOKEN=.+[^[:space:]]' .env; then
  echo ">>> V .env doplň HOME_MCP_AUTH_TOKEN (openssl rand -hex 32)" >&2
  exit 1
fi
docker compose up -d --build
echo "Hotovo. curl -i http://127.0.0.1:8766/mcp → očekávej 405 (POST-only)."
EOS

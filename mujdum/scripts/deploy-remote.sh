#!/usr/bin/env bash
# Nasazení aktuálního kódu mujdum na vzdálený host přes rsync + docker compose.
#
# Použití:
#   cd mujdum && ./scripts/deploy-remote.sh
#
# Volitelný soubor mujdum/.deploy.env (zkopíruj z .deploy.env.example) nastaví host/user/cestu.
# Nebo jednorázově:
#   MUJDUM_DEPLOY_HOST=... MUJDUM_DEPLOY_USER=zkorinek ./scripts/deploy-remote.sh
#
# Proměnné:
#   MUJDUM_DEPLOY_HOST   – IP / hostname (výchozí: 192.168.1.123)
#   MUJDUM_DEPLOY_USER   – SSH uživatel na serveru (výchozí: zkorinek — stejný účet jako u úspěšného nasazení na 192.168.1.123; NENÍ to lokální $USER na Macu)
#   MUJDUM_DEPLOY_PATH   – cesta na serveru (výchozí: ~/mujdum)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "${ROOT}/.deploy.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${ROOT}/.deploy.env"
  set +a
fi

HOST="${MUJDUM_DEPLOY_HOST:-192.168.1.123}"
REMOTE_USER="${MUJDUM_DEPLOY_USER:-zkorinek}"
REMOTE_PATH="${MUJDUM_DEPLOY_PATH:-~/mujdum}"

echo "Deploy: ${ROOT} -> ${REMOTE_USER}@${HOST}:${REMOTE_PATH}"

rsync -avz --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude '**/node_modules/' \
  --exclude 'backend/dist/' \
  --exclude 'frontend/dist/' \
  --exclude '**/*.tsbuildinfo' \
  --exclude '.env' \
  --exclude '.DS_Store' \
  "${ROOT}/" "${REMOTE_USER}@${HOST}:${REMOTE_PATH}/"

ssh "${REMOTE_USER}@${HOST}" "cd ${REMOTE_PATH} && docker compose up -d --build"

echo "Hotovo. Ověř: curl -s http://${HOST}:3001/health"

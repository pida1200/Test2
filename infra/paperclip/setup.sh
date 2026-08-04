#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
VENDOR="${ROOT}/vendor/paperclip"
REPO="${PAPERCLIP_REPO:-https://github.com/paperclipai/paperclip.git}"
REF="${PAPERCLIP_REF:-master}"

ensure_secret_file() {
  local env_file="${ROOT}/paperclip.env"
  local example="${ROOT}/paperclip.env.example"
  if [[ ! -f "${env_file}" ]]; then
    cp "${example}" "${env_file}"
  fi
  if ! grep -q '^BETTER_AUTH_SECRET=.\+' "${env_file}" 2>/dev/null; then
    local secret
    secret="$(openssl rand -hex 32)"
    if grep -q '^BETTER_AUTH_SECRET=' "${env_file}"; then
      if [[ "$(uname -s)" == "Darwin" ]]; then
        sed -i '' "s/^BETTER_AUTH_SECRET=.*/BETTER_AUTH_SECRET=${secret}/" "${env_file}"
      else
        sed -i "s/^BETTER_AUTH_SECRET=.*/BETTER_AUTH_SECRET=${secret}/" "${env_file}"
      fi
    else
      printf '\nBETTER_AUTH_SECRET=%s\n' "${secret}" >> "${env_file}"
    fi
    echo "Vygenerován BETTER_AUTH_SECRET do paperclip.env"
  fi
}

clone_upstream() {
  if [[ -d "${VENDOR}/.git" ]]; then
    echo "Upstream už je naklonovaný: ${VENDOR}"
    return 0
  fi
  mkdir -p "${ROOT}/vendor"
  git clone --depth 1 --branch "${REF}" "${REPO}" "${VENDOR}"
}

usage() {
  echo "Použití: $0 [up|down|logs|path]"
  echo "  up    — naklonuje/updatuje Paperclip, složí kontejnery (build může trvat dlouho)"
  echo "  down  — docker compose down"
  echo "  logs  — docker compose logs -f server"
  echo "  path  — vytiskne cestu ke klonu (vendor/paperclip)"
}

cmd="${1:-up}"

case "${cmd}" in
  path)
    clone_upstream
    echo "${VENDOR}"
    ;;
  up)
    clone_upstream
    ensure_secret_file
    cd "${ROOT}"
    docker compose up --build -d
    echo ""
    echo "UI: ${PAPERCLIP_PUBLIC_URL:-http://localhost:3100}"
    echo "Postgres z hostu: postgres://paperclip:paperclip@127.0.0.1:${POSTGRES_PUBLISH_PORT:-5433}/paperclip"
    ;;
  down)
    cd "${ROOT}"
    docker compose down
    ;;
  logs)
    cd "${ROOT}"
    docker compose logs -f server
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Neznámý příkaz: ${cmd}" >&2
    usage >&2
    exit 1
    ;;
esac

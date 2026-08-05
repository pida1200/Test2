#!/usr/bin/env bash
# Sync docs/wiki/ (git seed = source of truth) → GitHub Wiki (Test2.wiki.git).
#
# Prerequisites:
#   - Repo has Wiki enabled (Settings → Features → Wikis)
#   - Wiki git repo exists = at least one page created once in UI:
#       https://github.com/pida1200/Test2/wiki
#     (Create the first page → Save). After that, this script can push.
#
# Usage (from repo root):
#   bash docs/scripts/sync-wiki-to-github.sh
#
# Env:
#   WIKI_REMOTE  override remote URL (default: https://github.com/<owner>/<repo>.wiki.git)
#   DRY_RUN=1    copy + commit locally, do not push

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SEED="${ROOT}/docs/wiki"
OWNER_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "pida1200/Test2")"
REMOTE="${WIKI_REMOTE:-https://github.com/${OWNER_REPO}.wiki.git}"

if [[ ! -d "${SEED}" ]]; then
  echo "ERROR: missing seed ${SEED}" >&2
  exit 1
fi

bash "${ROOT}/docs/scripts/check-wiki-seed.sh"

TOKEN="$(gh auth token)"
AUTH_REMOTE="https://x-access-token:${TOKEN}@github.com/${OWNER_REPO}.wiki.git"

if ! git ls-remote "${AUTH_REMOTE}" &>/dev/null; then
  cat >&2 <<EOF
ERROR: GitHub Wiki git ještě neexistuje (${REMOTE}).

Bootstrap (jednou):
  1. Otevři https://github.com/${OWNER_REPO}/wiki
  2. Create the first page (název Home), vlož obsah z docs/wiki/Home.md, Save
  3. Spusť znovu: bash docs/scripts/sync-wiki-to-github.sh
EOF
  exit 2
fi

TMP="$(mktemp -d)"
cleanup() { rm -rf "${TMP}"; }
trap cleanup EXIT

echo "Cloning ${REMOTE} …"
git clone --depth 1 "${AUTH_REMOTE}" "${TMP}/wiki"
cd "${TMP}/wiki"

# Replace wiki content with seed (preserve .git)
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
# Copy seed; keep directory structure (aplikacni/, provozni/, zmeny/)
cp -R "${SEED}/." .

# Fix link that only makes sense in monorepo (already absolute in seed Home.md)
git add -A

if git diff --cached --quiet; then
  echo "OK: wiki already in sync (no changes)"
  exit 0
fi

git -c user.email="wiki-sync@users.noreply.github.com" -c user.name="wiki-sync" \
  commit -m "sync: docs/wiki/ → GitHub Wiki"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "DRY_RUN=1 — commit created locally, not pushed"
  git log -1 --oneline
  exit 0
fi

# Prefer current branch (often master for wikis)
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git push origin "HEAD:${BRANCH}"
echo "OK: pushed to ${REMOTE} (branch ${BRANCH})"
echo "View: https://github.com/${OWNER_REPO}/wiki"

#!/usr/bin/env bash
# Offline check: docs/wiki/ seed — REQUIRED files, flat unique slugs, internal links.
# Exit 0 = OK; 1 = MISSING / EMPTY / BROKEN LINK / DUPLICATE PAGE / BAD LINK FORM / ORPHAN / NESTED.
# Portable: bash 3.2+ (no associative arrays).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WIKI="${WIKI_ROOT:-${ROOT}/docs/wiki}"

REQUIRED=(
  "Home.md"
  "_Sidebar.md"
  "aplikacni-prehled.md"
  "aplikacni-moduly.md"
  "aplikacni-uzivatelske-scenare.md"
  "provozni-prehled.md"
  "provozni-deploy.md"
  "provozni-konfigurace.md"
  "provozni-monitoring.md"
  "zmeny-index.md"
  "zmeny-sablona.md"
)

errors=0
link_count=0

TMP="$(mktemp -d)"
cleanup() { rm -rf "${TMP}"; }
trap cleanup EXIT

PAGES="${TMP}/pages.txt"
REFS="${TMP}/refs.txt"
: > "${PAGES}"
: > "${REFS}"

lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

page_exists() {
  local key
  key="$(lower "$1")"
  grep -qxF "${key}" "${PAGES}" 2>/dev/null
}

ref_add() {
  local key
  key="$(lower "$1")"
  if ! grep -qxF "${key}" "${REFS}" 2>/dev/null; then
    printf '%s\n' "${key}" >> "${REFS}"
  fi
}

ref_has() {
  local key
  key="$(lower "$1")"
  grep -qxF "${key}" "${REFS}" 2>/dev/null
}

for rel in "${REQUIRED[@]}"; do
  path="${WIKI}/${rel}"
  if [[ ! -f "${path}" ]]; then
    echo "MISSING: docs/wiki/${rel}"
    errors=$((errors + 1))
    continue
  fi
  if [[ ! -s "${path}" ]] || ! grep -q '^#' "${path}"; then
    echo "EMPTY: docs/wiki/${rel}"
    errors=$((errors + 1))
  fi
done

# Nested pages forbidden (GitHub Wiki basename-only)
nested_list="$(find "${WIKI}" -mindepth 2 -name '*.md' 2>/dev/null || true)"
if [[ -n "${nested_list}" ]]; then
  while IFS= read -r nested; do
    [[ -z "${nested}" ]] && continue
    rel="${nested#"${WIKI}/"}"
    echo "NESTED PAGE: docs/wiki/${rel} (GitHub Wiki uses basename only — keep seed flat)"
    errors=$((errors + 1))
  done <<< "${nested_list}"
fi

# Basename uniqueness across entire seed tree (case-insensitive)
BASENAMES="${TMP}/basenames.txt"
: > "${BASENAMES}"
all_md="$(find "${WIKI}" -name '*.md' 2>/dev/null || true)"
if [[ -n "${all_md}" ]]; then
  while IFS= read -r path; do
    [[ -z "${path}" ]] && continue
    base="$(basename "${path}" .md)"
    key="$(lower "${base}")"
    if grep -qxF "${key}" "${BASENAMES}" 2>/dev/null; then
      other="$(find "${WIKI}" -name '*.md' | while IFS= read -r p; do
        b="$(basename "${p}" .md)"
        if [[ "$(lower "${b}")" == "${key}" && "${p}" != "${path}" ]]; then
          echo "${p#"${WIKI}/"}"
          break
        fi
      done)"
      echo "DUPLICATE PAGE: ${base} (${other:-?}, ${path#"${WIKI}/"})"
      errors=$((errors + 1))
    else
      printf '%s\n' "${key}" >> "${BASENAMES}"
    fi
  done <<< "${all_md}"
fi

# Link targets = flat root pages only
shopt -s nullglob
for path in "${WIKI}"/*.md; do
  base="$(basename "${path}" .md)"
  printf '%s\n' "$(lower "${base}")" >> "${PAGES}"
done

ref_add "Home"
ref_add "_Sidebar"

strip_code() {
  perl -0pe 's/```.*?```//gs; s/`[^`]*`//g' "$1" 2>/dev/null || cat "$1"
}

shopt -s nullglob
for path in "${WIKI}"/*.md; do
  rel="$(basename "${path}")"
  text="$(strip_code "${path}")"
  links="$(printf '%s' "${text}" | grep -oE '\[[^]]*?\]\([^)]+\)' || true)"
  if [[ -z "${links}" ]]; then
    continue
  fi
  while IFS= read -r link; do
    [[ -z "${link}" ]] && continue
    href="$(printf '%s' "${link}" | sed -E 's/^\[[^]]*\]\((.*)\)$/\1/')"
    if [[ "${href}" == http://* || "${href}" == https://* || "${href}" == mailto:* ]]; then
      continue
    fi
    if [[ "${href}" == \#* ]]; then
      continue
    fi

    target="${href%%\#*}"
    [[ -z "${target}" ]] && continue

    link_count=$((link_count + 1))
    bad=0

    if [[ "${target}" == *../* || "${target}" == ./* || "${target}" == */* || "${target}" == *.md ]]; then
      echo "BAD LINK FORM: docs/wiki/${rel} → ${href}"
      errors=$((errors + 1))
      bad=1
    fi

    ref_add "${target}"
    if [[ "${bad}" -eq 0 ]] && ! page_exists "${target}"; then
      echo "BROKEN LINK: docs/wiki/${rel} → ${href}"
      errors=$((errors + 1))
    fi
  done <<< "${links}"
done

for path in "${WIKI}"/*.md; do
  base="$(basename "${path}" .md)"
  key="$(lower "${base}")"
  if [[ "${key}" == "home" || "${key}" == "_sidebar" ]]; then
    continue
  fi
  if ! ref_has "${base}"; then
    echo "ORPHAN: docs/wiki/${base}.md"
    errors=$((errors + 1))
  fi
done

if [[ "${errors}" -gt 0 ]]; then
  exit 1
fi

count=0
for _ in "${WIKI}"/*.md; do
  count=$((count + 1))
done
echo "OK: wiki seed (${count} souborů, ${link_count} odkazů ověřeno)"
exit 0

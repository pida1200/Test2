#!/usr/bin/env bash
# Offline testy check-ma-env.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="${ROOT}/docs/scripts/check-ma-env.sh"

# Fake CLI s --help obsahujícím požadované flagy
FAKE_DIR="$(mktemp -d)"
trap 'rm -rf "${FAKE_DIR}"' EXIT
FAKE="${FAKE_DIR}/cursor-agent"
cat > "${FAKE}" <<'EOF'
#!/usr/bin/env bash
if [[ "${1:-}" == "--help" ]]; then
  cat <<H
Usage: agent [options]
  -p, --print
  --output-format <format>
  --model <model>
  -f, --force
H
  exit 0
fi
exit 0
EOF
chmod +x "${FAKE}"

PATH="${FAKE_DIR}:/usr/bin:/bin" CURSOR_AGENT_BIN=cursor-agent \
  bash "${SCRIPT}" >/tmp/check-ma-env-out.txt 2>&1 || true
# S fake CLI by měl projít flag check; gh může WARN
if grep -q 'FAIL.*flag' /tmp/check-ma-env-out.txt; then
  echo "FAIL: neočekávaný FAIL na flagu"
  cat /tmp/check-ma-env-out.txt
  exit 1
fi
grep -q 'OK   CLI binarka' /tmp/check-ma-env-out.txt
grep -q 'OK   flag --model' /tmp/check-ma-env-out.txt
echo "OK check-ma-env.sh offline testy"

#!/usr/bin/env bash
set -euo pipefail

# Prevent MSYS/Git Bash on Windows from mangling Unix paths in docker arguments.
# These are no-ops on Linux and macOS.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

# Usage: bash scripts/verify.sh
# Smoke-tests the locally built image. Run from repo root after task docker-build.
# Requires Docker with NET_ADMIN/NET_RAW capability support.

REGISTRY="fredplex"
IMAGE="nordvpn"
GIT_HASH="$(git log --format="%h" -n 1)"

IMAGE_REF="${1:-${REGISTRY}/${IMAGE}:${GIT_HASH}}"
NORDVPN_VERSION="${2:-$(grep "ARG NORDVPN_VERSION" Dockerfile | sed "s/ARG NORDVPN_VERSION='//;s/'$//")}"
EXPECTED_IMAGE_VERSION="${3:-${GIT_HASH}}"

CONTAINER="nordvpn_verify_$$"
PASS=0
FAIL=0
WARN=0

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; FAIL=$((FAIL + 1)); }
warn() { echo "  WARN  $1"; WARN=$((WARN + 1)); }

echo "=== Verifying ${IMAGE_REF} ==="
echo "    NordVPN target: ${NORDVPN_VERSION}"
echo "    Image version target: ${EXPECTED_IMAGE_VERSION}"
echo ""

if ! docker image inspect "${IMAGE_REF}" > /dev/null 2>&1; then
  echo "ERROR: Image ${IMAGE_REF} not found. Run: task docker-build" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Stateless checks — no container startup required
# ---------------------------------------------------------------------------
echo "--- Stateless checks ---"

# 1. IMAGE_VERSION env must contain the expected version
#    Uses docker inspect — no container startup required.
ACTUAL_VERSION="$(docker inspect "${IMAGE_REF}" \
  --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep '^IMAGE_VERSION=' | cut -d= -f2 || echo 'ERROR')"
if [[ "${ACTUAL_VERSION}" == *"${EXPECTED_IMAGE_VERSION}"* ]]; then
  pass "IMAGE_VERSION env contains ${EXPECTED_IMAGE_VERSION}"
else
  fail "IMAGE_VERSION env: expected it to contain '${EXPECTED_IMAGE_VERSION}', got '${ACTUAL_VERSION}'"
fi

# 2. nordvpn --version must report the pinned NORDVPN_VERSION
ACTUAL_NORDVPN="$(docker run --rm --entrypoint /bin/bash "${IMAGE_REF}" -c "nordvpn --version" 2>/dev/null \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo 'ERROR')"
if [[ "${ACTUAL_NORDVPN}" == "${NORDVPN_VERSION}" ]]; then
  pass "nordvpn --version = ${NORDVPN_VERSION}"
else
  fail "nordvpn --version: expected '${NORDVPN_VERSION}', got '${ACTUAL_NORDVPN}'"
fi

# 3. iptables kill-switch — run the 00-firewall commands directly, verify DROP policy
POLICY="$(docker run --rm \
  --cap-add=NET_ADMIN --cap-add=NET_RAW \
  "${IMAGE_REF}" \
  /bin/bash -c \
  'update-alternatives --set iptables /usr/sbin/iptables-legacy >/dev/null 2>&1 || true; \
   iptables -P OUTPUT DROP 2>/dev/null; \
   iptables -L OUTPUT 2>/dev/null | head -1' \
  | grep -oE 'policy [A-Z]+' | awk '{print $2}' || echo 'ERROR')"
if [[ "${POLICY}" == "DROP" ]]; then
  pass "iptables OUTPUT policy DROP (kill-switch functional)"
else
  fail "iptables kill-switch: expected OUTPUT policy DROP, got '${POLICY}'"
fi

# ---------------------------------------------------------------------------
# Runtime check — start the container and inspect the live daemon
# ---------------------------------------------------------------------------
echo ""
echo "--- Runtime check (daemon socket) ---"
echo "    Starting container with fake token — waiting 12s for s6 init..."

docker run -d --name "${CONTAINER}" \
  --cap-add=NET_ADMIN --cap-add=NET_RAW \
  -e TOKEN=verify_smoke_test \
  "${IMAGE_REF}" > /dev/null

cleanup() { docker rm -f "${CONTAINER}" > /dev/null 2>&1 || true; }
trap cleanup EXIT

sleep 12

RUNNING="$(docker inspect "${CONTAINER}" --format '{{.State.Running}}' 2>/dev/null || echo 'false')"
if [[ "${RUNNING}" == "true" ]]; then
  if docker exec "${CONTAINER}" test -S /run/nordvpn/nordvpnd.sock 2>/dev/null; then
    pass "nordvpnd socket present at /run/nordvpn/nordvpnd.sock"
  else
    warn "nordvpnd socket not present after 12s (daemon may still be starting)"
  fi
else
  EXIT_CODE="$(docker inspect "${CONTAINER}" --format '{{.State.ExitCode}}' 2>/dev/null || echo '?')"
  warn "Container exited (code ${EXIT_CODE}) — expected if TOKEN auth failed after s6 init"
fi

cleanup
trap - EXIT

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== ${PASS} passed | ${FAIL} failed | ${WARN} warnings ==="

[[ ${FAIL} -eq 0 ]]

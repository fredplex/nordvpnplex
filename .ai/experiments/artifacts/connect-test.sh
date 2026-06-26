#!/usr/bin/env bash
set -uo pipefail
# Real-token NordVPN connect + egress test (the gate task verify CANNOT perform).
# Usage: TOKEN_FILE=/path/to/token bash connect-test.sh <IMAGE_REF> <CONTAINER> <CONNECT_TARGET>
# The token is read from a file and never appears in args, env dumps, or output.

IMAGE_REF="${1:?image ref required}"
CONTAINER="${2:?container name required}"
CONNECT_TARGET="${3:-Spain}"
TOKEN_FILE="${TOKEN_FILE:?set TOKEN_FILE to the token file path}"

TOK="$(tr -d '[:space:]' < "$TOKEN_FILE")"
[ -n "$TOK" ] || { echo "RESULT: ERROR empty token"; exit 1; }

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
echo "Starting $CONTAINER from $IMAGE_REF (CONNECT=$CONNECT_TARGET)..."
docker run -d --name "$CONTAINER" \
  --cap-add=NET_ADMIN --cap-add=NET_RAW \
  -e TOKEN="$TOK" -e CONNECT="$CONNECT_TARGET" \
  "$IMAGE_REF" >/dev/null

CONNECTED="no"; waited=0
for i in $(seq 1 24); do
  sleep 5; waited=$((waited + 5))
  if docker exec "$CONTAINER" nordvpn status 2>/dev/null | grep -q "Status: Connected"; then
    CONNECTED="yes"; break
  fi
  if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" != "true" ]; then
    echo "Container exited early after ~${waited}s."; break
  fi
done

echo "=============== RESULT: $IMAGE_REF ==============="
echo "CONNECTED: $CONNECTED  (waited ~${waited}s)"
echo "--- nordvpn status ---"
docker exec "$CONTAINER" nordvpn status 2>/dev/null || echo "(status unavailable)"
echo "--- egress (ipinfo.io, via tunnel) ---"
docker exec "$CONTAINER" curl -s --max-time 15 https://ipinfo.io/json 2>/dev/null \
  | grep -E '"(ip|city|region|country|org)"' || echo "(egress check unavailable)"
if [ "$CONNECTED" != "yes" ]; then
  echo "--- last 30 log lines (diagnosis; scripts do not echo the token) ---"
  docker logs --tail 30 "$CONTAINER" 2>&1 | tail -30
fi
echo "--- image size ---"
docker image inspect "$IMAGE_REF" --format '{{.Size}}' 2>/dev/null \
  | awk '{printf "%.1f MB\n", $1/1024/1024}'
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
echo "=============== END ==============="

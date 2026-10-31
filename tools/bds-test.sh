#!/usr/bin/env bash
# Smoke test: load the packs into a Bedrock Dedicated Server (Docker), summon
# every bird and fail if the content log reports errors.
# Usage: tools/bds-test.sh   (run `npm run build` first)
set -euo pipefail

cd "$(dirname "$0")/.."
NAME=birds-bds-test
DATA="$PWD/build/bds"
LEVEL=birds_test
IMAGE=${BDS_IMAGE:-itzg/minecraft-bedrock-server:latest}
TIMEOUT=${BDS_TIMEOUT:-600}

uuid() { node -e "console.log(require('./build/$1/manifest.json').header.uuid)"; }
version() { node -e "console.log(JSON.stringify(require('./build/$1/manifest.json').header.version))"; }

docker rm -f "$NAME" >/dev/null 2>&1 || true
rm -rf "$DATA"
mkdir -p "$DATA/behavior_packs" "$DATA/resource_packs" "$DATA/worlds/$LEVEL"
cp -R build/behavior_pack "$DATA/behavior_packs/birds_bp"
cp -R build/resource_pack "$DATA/resource_packs/birds_rp"
echo "[{\"pack_id\":\"$(uuid behavior_pack)\",\"version\":$(version behavior_pack)}]" > "$DATA/worlds/$LEVEL/world_behavior_packs.json"
echo "[{\"pack_id\":\"$(uuid resource_pack)\",\"version\":$(version resource_pack)}]" > "$DATA/worlds/$LEVEL/world_resource_packs.json"

docker run -d --name "$NAME" --cap-add SYS_PTRACE \
  -e EULA=TRUE \
  -e LEVEL_NAME="$LEVEL" \
  -e LEVEL_TYPE=FLAT \
  -e GAMEMODE=creative \
  -e CONTENT_LOG_FILE_ENABLED=true \
  -e CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true \
  -e CONTENT_LOG_LEVEL=info \
  -v "$DATA:/data" \
  "$IMAGE" >/dev/null

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "Waiting for server (timeout ${TIMEOUT}s)..."
start=$(date +%s)
until docker logs "$NAME" 2>&1 | grep -q "Server started"; do
  if ! docker ps -q -f name="$NAME" | grep -q .; then
    docker logs "$NAME" 2>&1 | tail -50
    echo "Server container exited early"; exit 1
  fi
  if (( $(date +%s) - start > TIMEOUT )); then
    docker logs "$NAME" 2>&1 | tail -50
    echo "Timed out waiting for server"; exit 1
  fi
  sleep 5
done

send() { docker exec -u 0 "$NAME" send-command "$@"; }
send tickingarea add circle 0 0 0 3 birds_test true
sleep 5
# Summon in a 6-wide grid that stays inside the ticking area.
n=0
ids=""
for f in build/behavior_pack/entities/*.json; do
  id=$(basename "$f" .json)
  grep -q '"is_spawnable": false' "$f" && continue
  ids="$ids $id"
  x=$(( (n % 6) * 6 )); z=$(( (n / 6) * 6 ))
  # A glass cage keeps the birds from flying off before the check.
  send fill $x -60 $z $((x + 4)) -55 $((z + 4)) glass hollow
  send summon "birds:$id" $((x + 2)) -59 $((z + 2))
  n=$((n + 1))
done
send setblock 40 -60 40 birds:nest_box
send setblock 42 -60 40 birds:bird_hide
send time set night
sleep 10
send time set day
sleep 10
send scriptevent birds:selftest "$ids"
sleep 3

LOG=$(docker logs "$NAME" 2>&1)
echo "$LOG" | grep -iE "birds|error|warn|\[Scripting\]" | grep -vE "send-command|^\s*$" | tail -100 || true

if ! echo "$LOG" | grep -q "\[Birds of Prey\] loaded"; then
  echo "FAIL: add-on script did not report loading"; exit 1
fi
if echo "$LOG" | grep -qiE "Unknown block|is not a valid block|Cannot place block"; then
  echo "FAIL: a block could not be placed"; exit 1
fi
if ! echo "$LOG" | grep -q "selftest PASS"; then
  echo "FAIL: not every bird could be summoned, or a self-check failed"; exit 1
fi
if echo "$LOG" | grep -E "ERROR|\[error\]|Error\]" | grep -viE "Failed to connect|network|telemetry" | grep -q .; then
  echo "FAIL: content log has errors"; exit 1
fi
echo "PASS: Bedrock Dedicated Server loaded the packs without errors"

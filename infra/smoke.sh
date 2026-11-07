#!/usr/bin/env bash
# Builds and starts the whole stack, then checks it works end to end.
# Run from anywhere: bash infra/smoke.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  sed -e "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" \
      -e "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=$(openssl rand -hex 24)/" \
      -e "s/^DETECTOR_TOKEN=.*/DETECTOR_TOKEN=$(openssl rand -hex 32)/" \
      .env.example > .env
  echo "Created .env with random passwords"
fi

# Older .env files predate the detector token, so add one if it's missing.
grep -q '^DETECTOR_TOKEN=' .env || echo "DETECTOR_TOKEN=$(openssl rand -hex 32)" >> .env

bind=$(grep '^HTTP_BIND=' .env | cut -d= -f2)
base="http://${bind:-127.0.0.1:8080}"

fail() {
  echo "FAILED: $1"
  docker compose ps
  docker compose logs --tail=30
  exit 1
}

docker compose up --build --detach --wait --wait-timeout 240 || fail "stack did not become healthy"

[ "$(curl -s "$base/api/healthz")" = '{"status":"ok"}' ] || fail "/api/healthz through nginx"
echo "ok: API liveness through nginx"

curl -s "$base/api/readyz" | grep '"status":"ready"' >/dev/null || fail "/api/readyz through nginx"
echo "ok: API reaches PostGIS and Redis"

curl -s "$base/" | grep '<title>BantayBuhay</title>' >/dev/null || fail "web app through nginx"
echo "ok: web app served"

[ "$(curl -s -o /dev/null -w '%{http_code}' "$base/some/client/route")" = 200 ] || fail "SPA fallback"
echo "ok: client-side routes fall back to the app"

curl -sI "$base/" | grep -i '^content-security-policy:' >/dev/null || fail "security headers"
echo "ok: security headers present"

status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$base/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"nobody@bantaybuhay.test","password":"wrong"}')
[ "$status" = 401 ] || fail "login through nginx returned $status, expected 401"
echo "ok: migrations ran and login reaches the database"

[ "$(curl -s -o /dev/null -w '%{http_code}' "$base/api/incidents")" = 401 ] || fail "incidents without a session"
echo "ok: incidents require a session"

for probe in "POST /api/detections" "GET /api/internal/cameras" "POST /api/cameras/00000000-0000-4000-8000-000000000000/heartbeat"; do
  status=$(curl -s -o /dev/null -w '%{http_code}' -X "${probe%% *}" "$base${probe#* }")
  case "$status" in 403 | 404) ;; *) fail "$probe is reachable through nginx ($status)" ;; esac
done
echo "ok: detector-only routes are closed to the outside"

published=$(docker compose ps --format '{{.Service}} {{.Ports}}' | grep -e '->' | grep -v '^nginx ' || true)
[ -z "$published" ] || fail "only nginx may publish a port, found: $published"
echo "ok: only nginx publishes a port"

docker compose stop redis >/dev/null 2>&1
status=$(curl -s -o /dev/null -w '%{http_code}' "$base/api/readyz")
docker compose start redis >/dev/null 2>&1
[ "$status" = 503 ] || fail "readiness returned $status with Redis stopped, expected 503"
echo "ok: readiness reports 503 when Redis is down"

docker compose up --detach --wait --wait-timeout 120 >/dev/null 2>&1 || fail "stack did not recover"
curl -s "$base/api/readyz" | grep '"status":"ready"' >/dev/null || fail "readiness after Redis restart"
echo "ok: readiness recovers when Redis returns"

docker compose --progress quiet run --rm -T seed >/dev/null || fail "seeding cameras"
reading=0
for _ in $(seq 1 30); do
  reading=$(docker compose exec -T inference python -c "import json,urllib.request; s=json.load(urllib.request.urlopen('http://127.0.0.1:8000/status')); print(sum(1 for c in s['cameras'] if c['frames'] > 0))" 2>/dev/null || echo 0)
  [ "$reading" -ge 6 ] && break
  sleep 3
done
[ "$reading" -ge 6 ] || fail "inference is reading $reading of 6 camera streams"
echo "ok: inference is reading all 6 simulated camera streams"

echo "All smoke checks passed. App: $base"

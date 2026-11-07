#!/usr/bin/env bash
# Builds and starts the whole stack, then checks it works end to end.
# Run from anywhere: bash infra/smoke.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  sed -e "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" \
      -e "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=$(openssl rand -hex 24)/" \
      .env.example > .env
  echo "Created .env with random passwords"
fi

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

echo "All smoke checks passed. App: $base"

#!/usr/bin/env bash
# Switches a server to a release unpacked in /opt/bantaybuhay/releases/<id>, then checks it.
# Run as root by the deploy command (AWS SSM), never by hand on a laptop:
#
#   activate.sh /opt/bantaybuhay/releases/<id> web|detector
#
# If the new release doesn't answer its health check, the previous release is put back and the
# script exits with an error, so the deploy fails visibly and the site keeps running.
set -euo pipefail

release="$1"
role="$2"
base=/opt/bantaybuhay
region=ap-southeast-1
previous="$(readlink -f "$base/current" || true)"

log() { printf '[activate] %s\n' "$*"; }

# App secrets live in SSM Parameter Store: /bantaybuhay/api/ for the API only (database, storage
# key) and /bantaybuhay/shared/ for what both servers need (the detector token). Each service gets
# only its own, in a root-owned file readable by the service's group.
write_env() {
  local target="$1" paths="$2"
  shift 2
  local tmp path
  tmp="$(mktemp)"
  for path in $paths; do
    aws ssm get-parameters-by-path --region "$region" --path "$path" --with-decryption \
      --query 'Parameters[].[Name,Value]' --output text |
      while IFS=$'\t' read -r name value; do
        printf '%s=%s\n' "${name##*/}" "$value"
      done >>"$tmp"
  done
  printf '%s\n' "$@" >>"$tmp"
  install -m 0640 -o root -g bantaybuhay "$tmp" "$target"
  rm -f "$tmp"
}

switch_to() {
  ln -sfn "$1" "$base/current.next"
  mv -T "$base/current.next" "$base/current"
}

healthy() {
  local url="$1"
  for _ in $(seq 1 30); do
    if curl -sf -o /dev/null --max-time 3 "$url"; then return 0; fi
    sleep 2
  done
  return 1
}

roll_back() {
  log "health check failed"
  if [ -n "$previous" ] && [ -d "$previous" ] && [ "$previous" != "$release" ]; then
    log "putting back $(basename "$previous")"
    switch_to "$previous"
    systemctl restart "$1"
    [ "$role" = web ] && systemctl reload nginx
  fi
  exit 1
}

chown -R root:root "$release"

if [ "$role" = web ]; then
  log "installing the API's dependencies"
  (cd "$release" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    --workspace @bantaybuhay/api --workspace @bantaybuhay/shared)

  write_env /etc/bantaybuhay/api.env "/bantaybuhay/api/ /bantaybuhay/shared/" \
    "HOST=0.0.0.0" "PORT=3000" "COOKIE_SECURE=true" "DATABASE_CA_FILE=./certs/supabase-ca.crt"

  install -m 0644 "$release/infra/server/bantaybuhay-api.service" /etc/systemd/system/bantaybuhay-api.service
  systemctl daemon-reload
  systemctl enable bantaybuhay-api >/dev/null

  # Nginx: HTTPS once a certificate exists for this server's name, plain HTTP before that.
  # shellcheck disable=SC1091
  . /etc/bantaybuhay/site.env
  export SERVER_NAME
  install -d /etc/nginx/bantaybuhay
  install -m 0644 "$release/infra/nginx/locations.inc" /etc/nginx/bantaybuhay/locations.inc
  template=http
  [ -f "/etc/letsencrypt/live/$SERVER_NAME/fullchain.pem" ] && template=https
  envsubst '${SERVER_NAME}' <"$release/infra/nginx/$template.conf.template" >/etc/nginx/sites-available/bantaybuhay
  ln -sfn /etc/nginx/sites-available/bantaybuhay /etc/nginx/sites-enabled/bantaybuhay
  rm -f /etc/nginx/sites-enabled/default
  nginx -t

  switch_to "$release"
  systemctl restart bantaybuhay-api
  systemctl reload nginx
  healthy http://127.0.0.1:3000/api/readyz || roll_back bantaybuhay-api
  healthy http://127.0.0.1/ || roll_back bantaybuhay-api
elif [ "$role" = detector ]; then
  log "installing the detector's dependencies"
  [ -x "$base/venv/bin/python" ] || python3.12 -m venv "$base/venv"
  "$base/venv/bin/pip" install --quiet --disable-pip-version-check -r "$release/services/inference/requirements.txt"

  # shellcheck disable=SC1091
  . /etc/bantaybuhay/site.env
  write_env /etc/bantaybuhay/detector.env "/bantaybuhay/shared/" \
    "API_URL=$API_URL" "MODEL_PATH=$base/models/dfine_n_coco.onnx" "VIDEO_DIR=$base/media/sim" \
    "CAMERA_LIMIT=0" "FRAMES_PER_SECOND=2"

  install -m 0644 "$release/infra/server/bantaybuhay-detector.service" /etc/systemd/system/bantaybuhay-detector.service
  systemctl daemon-reload
  systemctl enable bantaybuhay-detector >/dev/null

  switch_to "$release"
  systemctl restart bantaybuhay-detector
  healthy http://127.0.0.1:8000/healthz || roll_back bantaybuhay-detector
else
  echo "Unknown role: $role" >&2
  exit 2
fi

log "$(basename "$release") is live"

# Keep the five newest releases for rollback; remove older ones.
ls -1dt "$base"/releases/*/ 2>/dev/null | tail -n +6 | xargs -r rm -rf

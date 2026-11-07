#!/usr/bin/env bash
# First boot of a BantayBuhay server (EC2 user data, Ubuntu 24.04). The provisioning step puts
# three lines before this script:
#   ROLE=web|detector
#   SERVER_NAME=<public name, web only>
#   API_URL=<the web server's private API address, detector only>
#
# It installs only what the role needs and leaves the app itself to the first deploy. There's no
# SSH: AWS Systems Manager reaches the server through its role.
set -euo pipefail
exec > >(tee -a /var/log/bantaybuhay-bootstrap.log) 2>&1

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y upgrade
apt-get install -y unattended-upgrades curl xz-utils ca-certificates
snap install aws-cli --classic

useradd --system --no-create-home --shell /usr/sbin/nologin bantaybuhay || true
install -d -m 0755 /opt/bantaybuhay /opt/bantaybuhay/releases
install -d -m 0750 -o root -g bantaybuhay /etc/bantaybuhay
printf 'ROLE=%s\nSERVER_NAME=%s\nAPI_URL=%s\n' "$ROLE" "${SERVER_NAME:-}" "${API_URL:-}" >/etc/bantaybuhay/site.env

if [ "$ROLE" = web ]; then
  apt-get install -y nginx certbot gettext-base
  install -d -m 0755 /var/www/letsencrypt

  # Node.js from nodejs.org, the newest 26.x, checked against the release's published checksums.
  base=https://nodejs.org/dist/latest-v26.x
  sums="$(curl -fsSL "$base/SHASUMS256.txt")"
  file="$(printf '%s\n' "$sums" | grep -oE 'node-v[0-9.]+-linux-x64\.tar\.xz' | head -1)"
  curl -fsSLO "$base/$file"
  printf '%s\n' "$sums" | grep " $file\$" | sha256sum -c -
  tar -xJf "$file" -C /usr/local --strip-components=1 --exclude='*/CHANGELOG.md' --exclude='*/README.md' --exclude='*/LICENSE'
  rm -f "$file"
  node --version
fi

if [ "$ROLE" = detector ]; then
  apt-get install -y python3.12-venv libgl1 libglib2.0-0
  # D-FINE-N trained on COCO, Apache 2.0. The checksum pins the exact file.
  install -d -m 0755 /opt/bantaybuhay/models /opt/bantaybuhay/media/sim
  curl -fsSL -o /opt/bantaybuhay/models/dfine_n_coco.onnx \
    https://huggingface.co/onnx-community/dfine_n_coco-ONNX/resolve/main/onnx/model.onnx
  echo "0f684f409618ee8a822410e754a29caa817d1aa16283ce89cad936d0a48e2f35  /opt/bantaybuhay/models/dfine_n_coco.onnx" | sha256sum -c -
fi

echo "bootstrap finished for $ROLE"

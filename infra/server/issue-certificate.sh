#!/usr/bin/env bash
# Gets the HTTPS certificate for the web server from Let's Encrypt, then switches nginx to HTTPS.
# Run once, as root, through the "Server operations" workflow. Renewal is automatic: certbot's
# timer renews it, and the hook reloads nginx.
#
# This accepts the Let's Encrypt Subscriber Agreement and registers without an email address.
set -euo pipefail

# shellcheck disable=SC1091
. /etc/bantaybuhay/site.env
export SERVER_NAME

certbot certonly --webroot -w /var/www/letsencrypt -d "$SERVER_NAME" \
  --agree-tos --register-unsafely-without-email --non-interactive \
  --deploy-hook "systemctl reload nginx"

envsubst '${SERVER_NAME}' </opt/bantaybuhay/current/infra/nginx/https.conf.template >/etc/nginx/sites-available/bantaybuhay
nginx -t
systemctl reload nginx
echo "HTTPS is on for https://$SERVER_NAME"

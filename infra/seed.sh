#!/usr/bin/env bash
# Creates the 20 fictional test accounts and saves their passwords to a git-ignored file.
# Does nothing if the database already has users.
set -euo pipefail
cd "$(dirname "$0")/.."

output=seed-credentials.local.json
result=$(docker compose --progress quiet run --rm --build -T seed)

if printf '%s' "$result" | grep '"skipped": true' >/dev/null; then
  echo "The database already has users, so nothing changed."
  [ -f "$output" ] && echo "Existing credentials: $output"
  exit 0
fi

printf '%s\n' "$result" > "$output"
echo "Created test accounts. Passwords are in $output, which git ignores."

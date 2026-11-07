#!/usr/bin/env bash
# Runs in GitHub Actions: tells every running BantayBuhay server of one role to fetch a release
# from the deploy bucket and activate it, through AWS Systems Manager (no SSH). Prints the
# server's output and fails if activation failed, after which the server has rolled back.
#
#   remote-deploy.sh web|detector <release-id>
set -euo pipefail

role="$1"
release="$2"
region="${AWS_REGION:-ap-southeast-1}"
bucket="${BUCKET:?BUCKET is required}"

instances="$(aws ec2 describe-instances --region "$region" \
  --filters "Name=tag:Project,Values=bantaybuhay" "Name=tag:Role,Values=$role" "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].InstanceId' --output text)"

if [ -z "$instances" ]; then
  echo "No running $role server, so nothing to deploy there."
  exit 0
fi

dir="/opt/bantaybuhay/releases/$release"
# SSM runs these with sh, not bash, so no pipefail here; activate.sh itself runs under bash.
commands=$(cat <<EOF
set -eu
aws s3 cp --region $region s3://$bucket/releases/$release.tgz /tmp/$release.tgz --only-show-errors
mkdir -p $dir
tar -xzf /tmp/$release.tgz -C $dir
rm -f /tmp/$release.tgz
bash $dir/infra/server/activate.sh $dir $role
EOF
)

for instance in $instances; do
  echo "Deploying $release to $role server $instance"
  command_id="$(aws ssm send-command --region "$region" --instance-ids "$instance" \
    --document-name AWS-RunShellScript --comment "BantayBuhay deploy $release" \
    --timeout-seconds 900 \
    --parameters "$(jq -cn --arg c "$commands" '{commands: ($c | split("\n")), executionTimeout: ["900"]}')" \
    --query 'Command.CommandId' --output text)"

  # Wait for the command, then show what the server printed.
  status=Pending
  for _ in $(seq 1 180); do
    sleep 5
    status="$(aws ssm get-command-invocation --region "$region" --command-id "$command_id" --instance-id "$instance" \
      --query Status --output text 2>/dev/null || echo Pending)"
    case "$status" in Pending | InProgress | Delayed) continue ;; *) break ;; esac
  done
  aws ssm get-command-invocation --region "$region" --command-id "$command_id" --instance-id "$instance" \
    --query '[StandardOutputContent, StandardErrorContent]' --output text
  if [ "$status" != Success ]; then
    echo "Deploy to $instance ended as $status; the server kept or restored its previous release." >&2
    exit 1
  fi
done

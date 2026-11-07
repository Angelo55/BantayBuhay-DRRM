#!/usr/bin/env bash
# Runs in GitHub Actions: runs one shell command as root on every running BantayBuhay server of a
# role, through AWS Systems Manager, and prints the output.
#
#   remote-run.sh web|detector "<command>"
set -euo pipefail

role="$1"
command="$2"
region="${AWS_REGION:-ap-southeast-1}"

instances="$(aws ec2 describe-instances --region "$region" \
  --filters "Name=tag:Project,Values=bantaybuhay" "Name=tag:Role,Values=$role" "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].InstanceId' --output text)"
if [ -z "$instances" ]; then
  echo "No running $role server."
  exit 1
fi

for instance in $instances; do
  command_id="$(aws ssm send-command --region "$region" --instance-ids "$instance" \
    --document-name AWS-RunShellScript --comment "BantayBuhay operations" \
    --parameters "$(jq -cn --arg c "$command" '{commands: [$c]}')" \
    --query 'Command.CommandId' --output text)"
  status=Pending
  for _ in $(seq 1 120); do
    sleep 3
    status="$(aws ssm get-command-invocation --region "$region" --command-id "$command_id" --instance-id "$instance" \
      --query Status --output text 2>/dev/null || echo Pending)"
    case "$status" in Pending | InProgress | Delayed) continue ;; *) break ;; esac
  done
  echo "== $role server $instance: $status"
  aws ssm get-command-invocation --region "$region" --command-id "$command_id" --instance-id "$instance" \
    --query '[StandardOutputContent, StandardErrorContent]' --output text
  [ "$status" = Success ] || exit 1
done

# EC2 hardening

**Status, updated 2026-11-19:** done, though not the way this guide first planned. The Nov 7 version was a manual checklist for one Docker host reached over SSH. The servers were instead created on Nov 8 by `infra/aws/provision.mjs`, set up on first boot by `infra/server/bootstrap.sh`, and are changed only by deploys and the **Server operations** workflow. Nobody logs in to them, and there's no Docker.

This file records what each part of the original checklist became, what's still missing, and how to check it. Day-to-day operation is in the [runbook](../RUNBOOK.md).

## The servers

| | Web server | Detector server |
| --- | --- | --- |
| Instance | `i-0549a6e4aaf4f24c3`, t3.medium | `i-0b346802331481f68`, c7i.xlarge |
| Runs | nginx, the web app, the API (`bantaybuhay-api`) | The detector (`bantaybuhay-detector`) |
| Hours | Normally always on; the owner sometimes stops it to save credit | Only for demos |
| Public address | Elastic IP 54.169.12.87, `54-169-12-87.sslip.io` | None needed |
| Security group | `bantaybuhay-web` (sg-01e12a3be11547d66) | `bantaybuhay-detector` (sg-056f5249b0510ef47) |
| System | Ubuntu 24.04 LTS, 20 GB encrypted gp3 disk | Same |

## The original checklist, as built

| # | Planned on Nov 7 | What was done | State |
| --- | --- | --- | --- |
| 1 | Security group: 80 and 443 open, 22 only from your IP until SSM works | Web: 80 and 443 from anywhere, and 3000 only from the detector's security group. Detector: nothing inbound. **Port 22 was never opened** | Done |
| 2 | Update the system, unattended upgrades | `bootstrap.sh` runs `apt-get upgrade` and installs `unattended-upgrades` on first boot | Done |
| 3 | A `deploy` user with sudo | Not needed: there's no login. The services run as an unprivileged system user, `bantaybuhay`, with no shell and no home directory. Deploys run as root through SSM | Replaced |
| 4 | SSH key-only access | No SSH at all. The instances have no key pair, and nothing listens for logins from outside | Replaced, stronger |
| 5 | Require IMDSv2 | Set at launch: `HttpTokens=required` | Done |
| 6 | UFW firewall | Not installed. The security groups are the firewall, and with no Docker, nothing can bypass them by publishing a port | Replaced |
| 7 | Fail2ban | Not needed: there's no SSH or other login to guess at. Nginx limits each visitor to 20 API requests a second, and the API limits sign-in attempts | Replaced |
| 8 | 4 GB swap | **Not set up.** The web server uses about 670 MB of its 3.8 GB under load, so it hasn't been needed | Open, low priority |
| 9 | Docker with log limits | No Docker. The API and detector are systemd services with `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome` and `PrivateTmp`, restarting by themselves if they stop | Replaced |
| 10 | Elastic IP, HTTPS, renewal hook | Elastic IP attached. Let's Encrypt certificate for `54-169-12-87.sslip.io`, valid until 2027-02-05, issued by the `issue-certificate` operation. Certbot's timer renews it, and the hook reloads nginx. TLS 1.2 and 1.3 only, HTTP/2, HSTS for a year | Done |
| 11 | Systems Manager access | Both servers have an instance role with `AmazonSSMManagedInstanceCore`, plus read access to their own parameters and the release bucket | Done |
| 12 | Backups: S3 lifecycle, nightly `pg_dump`, EBS snapshots | The database is on Supabase, not the server, and **no backup of our own exists**. The free plan's own protection is limited; check the Supabase dashboard. The servers hold nothing that can't be rebuilt from a release. The release bucket is private and encrypted, and it deletes releases after 30 days | **Open, before real data** |
| 13 | Budget alerts, CloudWatch alarm, external uptime check | A US$50 monthly budget alert exists. There's no CloudWatch alarm. The **Uptime check** workflow tests `/api/readyz` every three hours and opens an issue when it fails | Partly done |
| 14 | Verify from outside | See below. Checked on Nov 8 and again on Nov 19 | Done |

## Also in place

These weren't in the original checklist:

- **Security headers** on every response: HSTS, a strict Content Security Policy, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, and a `Permissions-Policy` that turns off the camera, microphone and location.
- **Detector-only routes are closed to the internet:** `/api/internal/*` and camera heartbeats return 404, and `POST /api/detections` returns 403. The detector reaches the API privately.
- **Secrets stay out of releases.** Each deploy writes them from Parameter Store into a root-owned file that only the service's group can read. The web server gets the API's secrets; the detector gets only its token.
- **Deploys can't come from anywhere but `main`.** GitHub's AWS sign-in only works in the `production` environment, which accepts only `main`, and the deploy role can only upload releases and run commands on servers tagged `Project=bantaybuhay`.

## Still open

| Gap | Why it matters | When |
| --- | --- | --- |
| No database backups of our own | Supabase's free plan isn't built for keeping real records | Before any real data |
| No swap | A memory spike could stop the API instead of slowing it | If memory use grows |
| No CloudWatch alarm on the server's status checks | The uptime check only runs every three hours | Before real operations |
| One web server | A single point of failure | Before real operations |

## Verify

From any computer outside AWS:

```bash
curl -sI https://54-169-12-87.sslip.io/
```

Expect `HTTP/2 200` with `strict-transport-security` and `content-security-policy` headers.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://54-169-12-87.sslip.io/
```

Expect `301`, the redirect to HTTPS.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://54-169-12-87.sslip.io/api/detections
```

Expect `403`: outsiders can't post detections.

```bash
curl -s https://54-169-12-87.sslip.io/api/readyz
```

Expect `{"status":"ready",...}`: the API is up and can reach the database.

On the server itself, run **Actions > Server operations > `status`**. It shows the services' state, the active release, readiness, disk and memory. [SSL Labs](https://www.ssllabs.com/ssltest/) should grade the site A or better.

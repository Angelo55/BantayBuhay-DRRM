# BantayBuhay operations runbook

How the live system runs, and what to do when something needs changing. Commands run in the VS Code terminal with the `app` folder open, unless a step says it runs in GitHub.

Live site: <https://54-169-12-87.sslip.io> (Let's Encrypt certificate, renewed automatically).

## What runs where

| Part | Where | Runs |
| --- | --- | --- |
| Web app and API | Web server `i-0549a6e4aaf4f24c3`, t3.medium, Singapore, Elastic IP 54.169.12.87 | All the time. Nginx serves the built web app and passes `/api` and `/socket.io` to the API (systemd unit `bantaybuhay-api`) on 127.0.0.1:3000 |
| Detector | Detector server `i-0b346802331481f68`, c7i.xlarge, Singapore | Only when started, for demos. Systemd unit `bantaybuhay-detector` reads the six simulated cameras at 2 fps and posts to the API over the private network |
| Database and snapshots | Supabase project `bantaybuhay` (`lscshfcspvrrgktiotju`), Singapore, free plan | Postgres with PostGIS and row level security; private Storage bucket `snapshots` |
| Secrets | AWS SSM Parameter Store, `/bantaybuhay/api/*` and `/bantaybuhay/shared/*` | Written to each server at deploy time, readable only by that service |
| Releases | S3 bucket `bantaybuhay-deploy-195170887047` | One archive per deploy |

Nobody logs in to the servers with SSH: port 22 is closed, and every command goes through AWS Systems Manager.

## Deploy

Pushing to `main` deploys automatically: **CI** runs, and when it passes, **Deploy** builds a release, uploads it to S3 and tells each running server to switch to it. GitHub signs in to AWS as the `bantaybuhay-github-deploy` role, so no AWS keys are stored in GitHub.

On each server, `infra/server/activate.sh` unpacks the release, writes the service's settings from Parameter Store, restarts the service and checks its health. If the health check fails, it **puts the previous release back** and the deploy fails in GitHub, so the site keeps running the old version.

To deploy again without a new commit (for example after changing a secret): GitHub > Actions > **Deploy** > Run workflow, on `main`.

The last step of every deploy checks `https://54-169-12-87.sslip.io/api/readyz`.

## Roll back

Automatic rollback covers a release that doesn't start. For a release that starts but behaves wrongly, revert the commit and push:

```bash
git revert <commit>
```

```bash
git push origin main
```

CI and Deploy then ship the reverted code. Each server keeps its five newest releases in `/opt/bantaybuhay/releases`.

A database migration isn't undone by a code rollback. Write a new migration that reverses it.

## Server operations

GitHub > Actions > **Server operations** > Run workflow, then pick an action:

| Action | What it does |
| --- | --- |
| `status` | Service state, the active release, the API's readiness, disk and memory |
| `api-logs` | Last 200 lines of the API log |
| `restart-api` | Restarts the API and checks readiness |
| `issue-certificate` | Gets the HTTPS certificate and switches nginx to HTTPS. Done once; renewal is automatic |
| `start-detector` | Starts the detector server (about US$0.21 an hour while running) |
| `stop-detector` | Stops it. A stopped server costs only its disk |
| `detector-logs` | Last 200 lines of the detector log |

## Demo day: the detector

1. Run **Server operations** > `start-detector`, about 10 minutes before you need it. It starts the server and waits until it's running; the detector then loads its model and starts watching the cameras on its own.
2. Deploys skip a stopped server, so the detector still has the release from when it last ran. If `main` has changed since, run **Deploy** > Run workflow now.
3. Run `detector-logs` to confirm it says it's watching 6 cameras.
4. Sign in to the live console as an operator. Detections appear as incidents or in the review queue.
5. Afterwards, run `stop-detector`. A running detector costs about US$5 a day, so don't leave it on.

## Database changes

Schema changes are SQL files in `supabase/migrations`, named `<timestamp>_<name>.sql`. Test them locally first:

```bash
npm run test:local
```

See what Supabase hasn't applied yet (changes nothing):

```bash
npm run db:migrate
```

Apply it:

```bash
npm run db:migrate -- --apply
```

Each file runs in its own transaction and is recorded in Supabase's migration history, the same table the Supabase dashboard and CLI use. If one fails, it's rolled back and the command stops. Apply migrations before pushing code that depends on them.

## Secrets

| Secret | Where it lives | Used by |
| --- | --- | --- |
| Database connection string and password | Supabase; your `apps/api/.env`; SSM `/bantaybuhay/api/DATABASE_URL` | API |
| Supabase secret key (Storage) | Supabase; your `apps/api/.env`; SSM `/bantaybuhay/api/SUPABASE_SERVICE_ROLE_KEY` | API |
| Detector token, server | SSM `/bantaybuhay/shared/DETECTOR_TOKEN` | API and detector on the servers |
| Detector token, laptop | Your `apps/api/.env` | Local API and detector |
| Test account passwords | `apps/api/seed-credentials.local.json`, git-ignored | People signing in by hand |

None of them are in the repository or in GitHub.

**To rotate the database password or Supabase secret key:**

1. Change it in the Supabase dashboard (Database > Settings for the password; Project Settings > API Keys for a new secret key).
2. Put the new value in `apps/api/.env`, and check it:

   ```bash
   npm run db:check
   ```

3. Copy the settings to Parameter Store. This also creates a new server detector token:

   ```bash
   npm run deploy:secrets
   ```

4. GitHub > Actions > **Deploy** > Run workflow, so both servers pick up the new values.
5. Delete the old secret key in Supabase once the deploy has passed.

The live site fails its readiness check between step 1 and step 4, so rotate when nobody is demonstrating it.

## Costs

On-demand prices in Singapore, before tax, paid from the account's US$149 credit. A US$50 monthly budget alert is set on the account.

| Item | Rate | Per month |
| --- | --- | --- |
| Web server, t3.medium, always on | US$0.053 an hour | about US$39 |
| Elastic IP on the web server | US$0.005 an hour | about US$3.65 |
| Two 20 GB encrypted gp3 disks | about US$0.096 per GB-month | about US$3.85 |
| Detector server, c7i.xlarge | US$0.206 an hour, only while running | US$0 stopped; about US$5 a day running |
| S3 releases, SSM, Supabase free plan | | under US$1 |

With the detector stopped, that's about US$46 a month, so the credit lasts about three months. Check the real figures in the AWS Billing console.

## After setup: remove the extra AWS permissions

While the servers were being set up, the `bantaybuhay-dev` IAM user had the managed policy `BantayBuhayServerSetup` attached for creating roles, the bucket and parameters. Deploys don't need it: GitHub uses its own role. Once no more servers or roles need creating, detach it. In the AWS console, signed in as root: IAM > Users > `bantaybuhay-dev` > Permissions, select `BantayBuhayServerSetup`, Remove.

`npm run deploy:secrets` needs it, so attach it again before rotating secrets. [`infra/aws/README.md`](../infra/aws/README.md) explains what the policy grants.

## When something's wrong

| Symptom | First check |
| --- | --- |
| The site doesn't load | **Server operations** > `status`. If nginx isn't active, `restart-api` won't help; redeploy with **Deploy** > Run workflow |
| The page loads but sign-in fails, or the console is empty | `status`: if `readyz` isn't `ready`, the API can't reach Supabase. Check the Supabase dashboard; a free project pauses after a week without activity and needs restoring there |
| A deploy failed | Open the failed run: the step's log shows the server's output. The previous release is still running |
| No detections | Is the detector server running (`detector-logs`)? It needs the web server's private address, set when it was created |
| The certificate is near expiry | Certbot renews it automatically. Run `issue-certificate` to force a new one |

Local development problems are covered in the [README](../README.md).

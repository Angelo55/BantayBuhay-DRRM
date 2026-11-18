---
name: bantaybuhay
description: Architecture, conventions, commands and rules for BantayBuhay DRRM, the incident detection and response platform for Kabankalan City (React 19 + Vite web app, Fastify API, Python detector, Supabase Postgres with PostGIS and row level security, AWS EC2 with systemd and nginx, GitHub Actions deploys through SSM). Use it whenever working anywhere in this repository - the operations console, landing page, API routes, auth and roles, incidents and their status flow, detections and the review queue, the map, live updates, snapshots, database migrations, seed data, the detector service, CI/CD, the servers or the docs - even for a small fix or a question that doesn't name the project.
---

# BantayBuhay DRRM

BantayBuhay helps a city DRRM office find and respond to emergencies. Cameras feed a detector. What it finds becomes an incident, or waits in a review queue when it's unsure. Operators verify incidents, assign responders and follow them on a map of Kabankalan City's 32 barangays. It's built for the TALISIK Hackathon 2026 (Track 2, DRRM), and it's live at <https://54-169-12-87.sslip.io>.

Read the files linked here before changing the area they cover; this skill is the map, not the territory.

## Confirmed choices (they may change)

The owner asked for these to be restated in every status update. `docs/phase-0/PLAN.md` holds the current list.

- **Video source:** simulated feeds for now. Each camera plays `media/sim/<name>.mp4` (git-ignored) on a loop, or a moving test pattern.
- **MVP incident types:** fire and smoke, person down, flood, SOS gesture. First stretch: vehicular accident. Only person-down detection exists so far.

## Rules that never bend

1. **No secrets in git:** no passwords, keys, tokens or `.env` files. Local secrets live in `apps/api/.env`; server secrets in AWS SSM Parameter Store (`/bantaybuhay/api/*`, `/bantaybuhay/shared/*`). Never print them in chat or logs.
2. **No real personal, medical or biometric data, faces or real CCTV footage.** Seed data is fictional. Seed passwords go only to the git-ignored `seed-credentials.local.json` at the repository root.
3. **No facial recognition.** Civilians are linked to incidents through their own SOS, operator search and QR medical IDs.
4. **Dispatch always needs a person.** The system never auto-dispatches.
5. **One database for everyone.** Every laptop and the live site share the Supabase project `bantaybuhay` (ref `lscshfcspvrrgktiotju`). Local testing writes live data. Ask before seeding, applying migrations or deleting rows.
6. **Ask before anything destructive or costly:** deleting resources, changing production data, starting paid AWS resources, rotating credentials, force-pushing. Never touch the owner's other projects: the PESO EC2 instance `peso-ec2-app-destination`, or the Supabase projects `practicon` and `peso-kabankalan`.
7. **`DESIGN.md` is the design contract.** It overrides every design skill. Don't imitate another company's brand.

## Layout

| Path | What it is |
| --- | --- |
| `apps/web` | React 19, Vite 8, TypeScript, Tailwind 4, MapLibre, Motion, GSAP (landing page only) |
| `apps/api` | Fastify 5, `pg`, Zod via `fastify-type-provider-zod`, Socket.IO, built-in Argon2id |
| `services/inference` | Python 3.12 FastAPI detector: OpenCV, ONNX Runtime, D-FINE-N (Apache 2.0) |
| `packages/shared` | Types and constants shared by web and API (`ROLES`, incident types, statuses) |
| `supabase/migrations` | The schema: SQL files named `<14-digit timestamp>_<name>.sql` |
| `scripts` | Setup, dev, stop, test database, accounts and secrets helpers |
| `infra/server` | Bootstrap, release activation, deploy and run-command scripts, systemd units |
| `infra/nginx` | Site templates and shared locations (security headers, CSP, blocked internal routes) |
| `infra/aws` | IAM policy and the idempotent provisioning script |
| `.github/workflows` | `ci.yml`, `deploy.yml`, `dependencies.yml`, `operations.yml`, `uptime.yml` |
| `docs` | Runbook, teammate setup, migration reports, design analysis, Phase 0 plan and proposals |
| `legacy` | The 2025 upstream prototype. Reference only: never build, run or import it |

## Commands

Run from the repository root.

| Task | Command |
| --- | --- |
| First time on a machine | `npm install`, then `npm run setup` |
| Check `apps/api/.env` against Supabase | `npm run db:check` |
| Start API and web | `npm run dev` (web <http://127.0.0.1:5173>, API :3000) |
| Add the detector | `npm run dev:all` (laptop default: 1 camera at 1 fps) |
| One service | `npm run dev:api`, `npm run dev:web`, `npm run dev:inference` |
| Stop leftovers | `npm run stop` (kills the app's servers on 3000, 5173 and 8000) |
| All tests with a throwaway database | `npm run test:local` (native Postgres 17 and PostGIS on port 55432) |
| Lint, types, build | `npm run lint && npm run typecheck && npm run build` |
| Detector tests | in `services/inference`: `.venv/Scripts/python -m pytest` (Windows) |
| Pending Supabase migrations | `npm run db:migrate` (lists, changes nothing) |
| Apply them | `npm run db:migrate -- --apply` (ask first) |
| Seed an empty database | `npm run db:seed` (ask first) |
| Test accounts | `npm run accounts` |
| Each role reaches only its own data | `npm run check:roles` (needs the app running) |

On Windows, `npm run stop` ends every process on those ports. If the owner's own dev servers are running, test on spare ports instead (`PORT=3001`, `vite --port 5174`).

## How the pieces fit

- **Roles:** `admin`, `operator`, `responder`, `civilian`. Sessions are opaque tokens in HttpOnly cookies, stored hashed in `sessions`, valid 12 hours. Passwords use Argon2id (`apps/api/src/password.ts`). Login is rate-limited.
- **Incidents:** types `fire_smoke`, `person_down`, `flood`, `sos_gesture`. Severities `low`, `medium`, `high`, `critical`. Statuses `detected` > `verified` > `dispatched` > `on_scene` > `resolved`, or `dismissed`. Every change is recorded in `incident_events`. Operators acknowledge new incidents (`acknowledged_at`, `acknowledged_by`).
- **Detections:** the detector posts to `POST /api/detections` with the detector token. A detection persisting over several frames above its threshold becomes an incident; below it, it waits in the review queue. Nginx refuses `POST /api/detections`, `/api/internal/*` and camera heartbeats from the internet; the detector reaches the API privately.
- **Row level security:** every signed-in request runs as the restricted role `bantaybuhay_app`, through `SET ROLE` plus `set_config('app.user_id' / 'app.role')`, reset when the response ends. Policies in `supabase/migrations/20261107162127_request_role_and_policies.sql` decide what each user sees. A responder sees only incidents assigned to them. Login, session lookup, detector ingest and live-update fan-out use the login role through `systemDb` (`apps/api/src/database.ts`). Use `systemDb` only for work no signed-in user is doing. Column grants hide `password_hash`. `apps/api/src/rls.test.ts` tests the policies.
- **Live updates:** Socket.IO with the in-memory adapter, one API process. The database is the source of truth: clients refetch after reconnecting. There's no Redis.
- **Snapshots:** private Supabase Storage bucket `snapshots` (JPEG, 512 KB limit), served only through the audited API endpoint. The web app never gets a Supabase key.
- **Database connection:** the Supabase session pooler, TLS verified against `apps/api/certs/supabase-ca.crt`, pool of 5. Queries from a laptop cross to Singapore, about 25 ms each.
- **Map:** MapLibre with the OpenFreeMap street basemap (allowed in the CSP) and the 32 barangay polygons in the database.
- **Audit:** sensitive reads and every state change go to `audit_logs`.

## Web app conventions

- Feature code uses components from `apps/web/src/ui` and token classes only: no hex values, pixel radii or ad hoc shadows. `src/design/contrast.test.ts` must pass after any colour change.
- Light theme is the default; dark is a user choice (`data-theme="dark"`).
- Severity always shows colour, shape and word, never just a dot. Critical alerts get the full-width red banner.
- Motion tokens live in `apps/web/src/ui/motion.ts`, mirrored as CSS variables (a test checks they match). Respect reduced motion everywhere. GSAP loads lazily, on the landing page only.
- Routes: `/` landing, `/login`, `/app` console, `/styleguide`. A 401 sends the user to `/login`.
- The landing page may follow `design-taste-frontend`; the operations console never does.

## Data and migrations

- Change the schema only with a **new** migration file. Never edit one that's already applied.
- Tests apply the migrations to the local test database (`apps/api/src/migrate.ts`, its own history table). Supabase gets them through `npm run db:migrate -- --apply`, which reads `supabase_migrations.schema_migrations` like the Supabase CLI and refuses other databases.
- New tables need row level security and policies in the same migration, plus tests in `rls.test.ts`.
- Apply a migration to Supabase before pushing code that needs it.

## Shipping changes

- Both developers push to `main` directly or merge pull requests; no approval is required. GitHub blocks force-pushes and deleting `main`. Use `git pull --rebase` before pushing. See `CONTRIBUTING.md`.
- **CI** runs lint, type checks, every test against a Postgres service, the build and a start-up check of the built API, on every push and every pull request.
- **Deploy** runs after CI passes on a push to `main` in this repository. It builds a release archive, uploads it to S3, and runs `infra/server/activate.sh` on each running server through SSM. Activation health-checks the release and restores the previous one if the check fails. GitHub signs in to AWS through OIDC (role `bantaybuhay-github-deploy`), and only from the `production` environment, which accepts only `main`. There are no AWS keys in GitHub.
- A failed deploy opens a "Production deploy failed" issue assigned to everyone with push access; the next success closes it.
- **Uptime check** queries `/api/readyz` every three hours, which also keeps the free Supabase project from pausing. It opens a "Live site is down" issue when the check fails.
- **Server operations** (manual workflow): `status`, `api-logs`, `restart-api`, `rollback-web`, `issue-certificate`, `start-detector`, `stop-detector`, `detector-logs`.
- Commit messages end with the attribution line the session specifies.

## Servers and costs

| Server | Instance | Runs |
| --- | --- | --- |
| Web: nginx, web app, API (`bantaybuhay-api.service`) | `i-0549a6e4aaf4f24c3`, t3.medium, Elastic IP 54.169.12.87 | Normally always. The owner sometimes stops it to save credit |
| Detector (`bantaybuhay-detector.service`) | `i-0b346802331481f68`, c7i.xlarge | Only for demos, about US$0.21 an hour |

- Region `ap-southeast-1`. AWS account 195170887047, IAM user `bantaybuhay-dev`, US$149 credit, US$50 monthly budget alert. No SSH: port 22 is closed and the owner's network blocks it, so everything goes through SSM.
- The laptop's AWS CLI sessions expire; when a call fails with an expired session, ask the owner to run `aws login`. The GitHub workflows work regardless.
- A stopped web server makes deploys fail at the public-site check. After starting it, check the Supabase project is active (restore it if paused), then run Deploy on `main`.
- A deploy skips a stopped detector server; after starting it, run Deploy again if `main` moved.

## Where to look

| Need | File |
| --- | --- |
| Operating the live system | `docs/RUNBOOK.md` |
| Teammate laptop setup, sharing secrets | `docs/TEAMMATE-SETUP.md` |
| Daily git workflow | `CONTRIBUTING.md` |
| Design tokens, components, severity, motion | `DESIGN.md`, `docs/design/` |
| Plan, dates, scoring, open decisions | `docs/phase-0/PLAN.md` |
| Architecture as built, and the original options | `docs/phase-0/INFRASTRUCTURE.md` |
| Server hardening as built | `docs/phase-0/EC2-HARDENING.md` |
| Docker-to-Supabase move: baseline and results | `docs/migration/PHASE-1-AUDIT.md`, `docs/migration/PHASE-2-REPORT.md` |
| CPU benchmark | `docs/benchmarks/cpu-latency-2026-11-07.md` |
| Audit of the 2025 prototype | `docs/phase-0/AUDIT.md` |

## Known gaps

- Fire and smoke, flood and SOS detectors aren't built; neither are medical profiles, consent, encryption or access logging (milestone M5).
- No database backups beyond what Supabase's free plan provides, and no CloudWatch alarms; the uptime check is the only monitor.
- One web server: a single point of failure, fine for a demo.
- The repository is public, while its history still holds face photos from the 2025 prototype and it has no license. Visibility is the owner's decision; don't change it.

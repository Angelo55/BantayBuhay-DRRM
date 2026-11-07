# Phase 1: Docker audit, migration matrix and baseline

Measured 2026-11-07 on the development laptop: Intel Core i3-1220P (10 cores, 12 threads), 7.7 GB RAM, Windows 11, Docker Desktop on WSL 2 (VM limited to 12 CPUs and 3.7 GB). No changes were made to the stack for this audit, except that the inference service and camera simulator were left stopped afterwards to free the CPU.

## What runs today

| Compose service | Image | What it provides |
|---|---|---|
| `postgres` | `postgis/postgis:17-3.7-alpine` (714 MB) | The database, with PostGIS for barangays, cameras and incident locations |
| `migrate` | `bantaybuhay-api` (305 MB) | One-shot job that applies `apps/api/migrations/*.sql` |
| `seed` (profile `tools`) | `bantaybuhay-api` | Creates the 20 fictional test accounts, writes `seed-credentials.local.json` |
| `redis` | `redis:8.8-alpine` (156 MB) | Socket.IO adapter (only needed for more than one API process) and a readiness check |
| `api` | `bantaybuhay-api` (305 MB) | Fastify API, Socket.IO, auth, audit, detection ingest |
| `nginx` | `bantaybuhay-nginx` (96 MB) | Serves the built web app; reverse proxy; CSP and security headers; 20 req/s per-IP limit; blocks `/api/internal/`, heartbeats and `POST /api/detections` from outside |
| `inference` | `bantaybuhay-inference` (680 MB) | D-FINE-N person-down detector reading 6 camera streams at 2 fps |
| `mediamtx` | `bluenviron/mediamtx:1.21.3-ffmpeg` (286 MB) | Six simulated RTSP camera streams (test pattern or `media/sim/*.mp4`) |
| `postgres` in `compose.test.yaml` | `postgis/postgis:17-3.7-alpine` | Throwaway in-memory database for the 89 API tests |

Volumes: `bantaybuhay_postgres_data`, `bantaybuhay_redis_data`, `bantaybuhay_snapshots`. Dockerfiles: `apps/api/Dockerfile`, `infra/nginx/Dockerfile`, `services/inference/Dockerfile`.

## Migration matrix

| Today | Decision | Replacement |
|---|---|---|
| `postgres` | Replaced by Supabase | Supabase Postgres 17 with PostGIS, project in Singapore (ap-southeast-1) |
| `migrate` | Replaced | The same SQL files as Supabase CLI migrations, applied with `supabase db push` (no Docker needed for push) |
| `seed` | Native | `npm run db:seed`, same fictional accounts, credentials still only in the git-ignored file |
| `redis` | No longer needed | One API process uses Socket.IO's built-in memory adapter. Readiness checks the database only |
| `api` | Native | `tsx watch` hot reload in development; systemd on the server |
| `nginx` (local) | No longer needed locally | The Vite dev server proxies `/api` and `/socket.io` to the API. The internal-route block moves into the API itself so it holds without nginx |
| `nginx` (server) | Native | Native nginx with TLS on the VPS, same headers and limits |
| `inference` | Native, off by default locally | Python venv. Locally it's opt-in and limited to 1 camera at 1 fps; the demo runs it on the VPS |
| `mediamtx` | No longer needed locally | Inference reads `media/sim/*.mp4` files directly with OpenCV, so no RTSP server is needed. The RTSP path stays for real cameras |
| `snapshots` volume | Replaced by Supabase | Private Storage bucket. The API uploads with the service-role key and serves each view through an audited, short-lived signed URL |
| Test database | Native or CI only | See question notes: native PostgreSQL 17 + PostGIS on Windows, or run DB tests in CI only |
| Docker Desktop and its WSL VM | Removed from the local workflow | Frees the memory the VM reserves |

## Baseline

### Resource use

| State | Host CPU | Host RAM used | Notes |
|---|---|---|---|
| Full stack running, idle (no users) | 73–88% (5 samples) | 6.9 of 7.7 GB | Inference 395–734% of one core, mediamtx 31–72%, everything else under 3% |
| Inference and mediamtx stopped | 5–18% | 7.0 GB | CPU falls by about 70 points; RAM doesn't fall because the WSL VM keeps its memory |
| Docker WSL VM (`vmmemWSL`) | | 3.7 GB private memory | Reserved while Docker Desktop runs, whether containers are busy or not |

Per-container memory at idle: inference 578–594 MB, mediamtx 173 MB, postgres 67 MB, api 48–50 MB, nginx 12 MB, redis 11 MB, test postgres 132 MB.

**Finding:** the slowdown is two separate costs. CPU comes almost entirely from inference and the camera simulator, and would be the same without Docker. RAM comes from the Docker VM (3.7 GB on a 7.7 GB laptop), which removing Docker does fix.

### Cold start

`docker compose down`, then `docker compose up -d --wait` until every container is healthy, with Docker Desktop already running: **24.3 s and 24.5 s** (two runs). Starting Docker Desktop itself adds to this and wasn't measured.

### API response times

Through nginx at 15 requests per second (below the 20 req/s per-IP limit), 300 requests each:

| Endpoint | p50 | p90 | p99 |
|---|---|---|---|
| `GET /api/healthz` (no database) | 10 ms | 26 ms | 60 ms |
| `GET /api/readyz` (database and Redis) | 12 ms | 27 ms | 56 ms |
| `GET /` (static page) | 5 ms | 10 ms | 24 ms |

Load test, 3,000 requests to `/api/readyz` with 25 concurrent clients, from inside the network:

| Condition | Throughput | p50 | p90 | p99 | Failures |
|---|---|---|---|---|---|
| Inference running | 279 req/s | 31.8 ms | 253 ms | 484 ms | 0 |
| Inference stopped | 1,774 req/s | 9.7 ms | 21.5 ms | 82 ms | 0 |

Authenticated endpoints such as the incident list weren't load-tested, because that needs a test login read from the git-ignored credentials file.

## What to expect after the move

- **RAM:** about 3.7 GB back from the Docker VM. Native API and Vite dev server use roughly 250 MB together.
- **CPU:** the same as today unless inference stays off locally, which is why it's opt-in.
- **Latency on the laptop gets worse, not better.** Every database query travels to Singapore (about 40–70 ms per round trip from the Philippines), so local API responses will be slower than the 10 ms above. On the VPS in Singapore next to Supabase, the round trip is a few milliseconds. The after-numbers will be measured the same way and reported honestly.
- **Cold start** becomes the time for `npm run dev` to have the API and Vite ready, with no VM to boot.

## Decisions (2026-11-07)

| Question | Decision |
|---|---|
| 1. Docker on the EC2 server too? | Yes. The server runs nginx, the API and inference as systemd services, the same way they run locally |
| 2. Supabase plan | Free for now. JPEG snapshots only, no clips, with a retention limit. Revisit Pro (US$25/month) around Nov 17 for the event week |
| 3. What moves into Supabase | Hybrid: Postgres with PostGIS, and Storage for snapshots. Login (cookie sessions), live updates (Socket.IO) and audited medical access stay in the Node API. Redis is dropped. The frontend gets no Supabase key |
| 4. Where inference runs | On the VPS for the demo. On the laptop it's opt-in, 1 camera at 1 fps. No external API, so CCTV frames never leave our systems (RA 10173) |
| 5. Existing data | Clean re-seed. Everything in the local database is fictional seed data or test incidents |
| Merge | `feat/detection` and `feat/design-system` merged into `main`. The Docker setup is archived on `archive/docker-stack` |

## Done so far

- Supabase project `bantaybuhay` (ref `lscshfcspvrrgktiotju`), Singapore, free plan, US$0/month.
- PostGIS 3.3.7 enabled; all migrations applied; 32 barangays loaded.
- Migrations live in `supabase/migrations/` with the versions Supabase recorded, so `supabase db push` and the test runner apply the same files.
- Every app table has RLS on and no grants for Supabase's Data API roles (`anon`, `authenticated`). The audit trigger function has a fixed search path.

## How RLS will constrain the API

Supabase's `postgres` login role bypasses RLS, so connecting as it would make the policies decorative. The API will run each request's queries in a transaction that switches to a dedicated role without that bypass and records who is asking:

```sql
SET LOCAL ROLE bantaybuhay_app;
SELECT set_config('app.user_id', $1, true), set_config('app.role', $2, true);
```

Policies then read `current_setting('app.user_id')` and `current_setting('app.role')`. Examples:

- Civilians see only their own profile.
- Responders see incidents they're assigned to.
- Operators and admins see operations data.
- Medical records (milestone 5) are readable by the owning civilian, and by a responder only while assigned to an active incident involving that civilian. Every such read is written to the audit log.

Login, detection ingest from the inference service and seeding run as a separate system path with their own narrow policies.

## Still to do

1. API: the request-scoped role and policies above, Storage for snapshots, Redis removed, internal-route guard moved into the API.
2. Native run: `npm run dev` (API and Vite) with `concurrently`, per-service scripts, inference reading clip files directly, `.env.example` files and a setup script. Docker files removed from the working tree.
3. Test database without Docker: native PostgreSQL 17 with PostGIS on Windows, or database tests in CI only.
4. Re-seed the 20 fictional accounts into Supabase.
5. Landing page at `/`.
6. Server: systemd units, nginx with TLS, GitHub Actions deploy with health checks and rollback.
7. After-measurements, regression checklist, README and runbook.

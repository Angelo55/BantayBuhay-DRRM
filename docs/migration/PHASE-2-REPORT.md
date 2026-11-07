# Supabase and native run: before and after

The [Phase 1 audit](PHASE-1-AUDIT.md) measured the Docker setup on 2026-11-07. This report measures the native setup that replaced it, the same way where possible, on 2026-11-08: same laptop (Intel Core i3-1220P, 7.7 GB RAM, Windows 11), same tools (autocannon, Windows process counters).

The two setups differ in one way that matters for every latency number: **before, the database ran on the laptop; now it's Supabase in Singapore.** Requests that touch the database now cross the internet from the Philippines. The audit predicted this, and the numbers below show it.

## Summary

| | Before (Docker) | After (native + Supabase) |
| --- | --- | --- |
| Start the app | 24.3–24.5 s, with Docker Desktop already running | **11.4 s**, no Docker Desktop needed |
| Memory reserved by the dev setup | 3.7 GB (Docker's WSL VM, whether busy or not) | About 370 MB in use (API 172 MB, Vite 194 MB working set) |
| Host CPU, app idle, detector off | 5–18% | 8–15% |
| Host CPU, detector on as it starts by default | 73–88% (six cameras at 2 fps, always) | Detector uses 0.8 of one core (one camera at 1 fps, opt-in) |
| Local API, database check, median | 12 ms (local database) | 27 ms (Supabase in Singapore) |
| Live site | Not deployed | 31 ms median from the laptop; Lighthouse 97–100 mobile, 100 desktop |
| Database check under load, 25 clients | 1,774 req/s (laptop, local database) | 1,500 req/s on the live server, p99 43 ms |

The laptop is faster to start and has about 3.3 GB more free memory. Local requests that touch the database are slower, by the round trip to Singapore. The live server sits in the same region as Supabase, so the demo doesn't pay that cost.

## Resource use

### Memory

Measured 20 seconds after a fresh start, on spare ports (3001 and 5174) so the measurement didn't disturb the servers already running:

| Process | Processes | Working set | Private (committed) |
| --- | --- | --- | --- |
| API (`tsx watch` and Node) | 6 | 172 MB | 221 MB |
| Web (Vite dev server) | 5 | 194 MB | 1,305 MB |

Vite commits far more memory than it touches. Windows counts commit against the page file, not RAM, but on a 7.7 GB laptop already at 18.5 of 20.7 GB committed (by other apps) it's worth knowing: close the dev server when you aren't using it. In the Docker setup the web app was a built bundle behind nginx (12 MB), with no live reload.

Docker's VM held 3.7 GB the whole time Docker Desktop ran. That's gone.

### CPU

With the native API and Vite idle and the detector off, host CPU sat at 8–15%, mostly other apps. Before, the full Docker stack idled at 73–88% because the detector and camera simulator always ran.

### The detector

Run natively against a small stand-in API on the laptop, so the benchmark wrote nothing to Supabase. Measured over 30 seconds after a 30-second warm-up. All cameras showed the moving test pattern, since `media/sim` has no clips on this laptop.

| Setting | Detector CPU | Memory | Frames read per camera in the first minute |
| --- | --- | --- | --- |
| Before: Docker, 6 cameras at 2 fps, plus mediamtx | 395–734% of one core, plus 31–72% for mediamtx | 578–594 MB, plus 173 MB | Not measured |
| **Laptop default now: 1 camera at 1 fps** | **82% of one core** | 536 MB | 42: keeping up, after model loading |
| Same load as before: 6 cameras at 2 fps | 432% of one core, host at 87% | 746 MB | 41–45: about half the 2 fps asked for, so the laptop falls behind |

The detector itself costs about the same with or without Docker; detection is the expensive part. What changed is that it's now off unless you ask for it (`npm run dev:all`), it watches one camera at 1 fps on a laptop, and it reads clips directly, so the mediamtx camera simulator isn't needed. Six cameras at 2 fps belong on the detector server, which is what it's for.

`npm run dev:inference` now applies the laptop default even without `services/inference/.env`. Before this change, a fresh clone without that file ran all six cameras at 2 fps.

## Cold start

From nothing running to the API answering `/api/readyz` (connected to Supabase) and Vite serving the page:

| | API ready | Web ready | Both ready |
| --- | --- | --- | --- |
| Before: `docker compose up -d --wait`, Docker Desktop already running | | | 24.3 s and 24.5 s |
| After: API and Vite started together | 10.7 s | 11.4 s | **11.4 s** |

Before, starting Docker Desktop itself came on top of the 24 seconds. Now there's nothing to start first.

## Response times

### Local API on the laptop

15 requests per second for 20 seconds, one client. Before, requests went through nginx to a local database; now they go straight to the API, which talks to Supabase.

| Endpoint | Before p50 / p90 / p99 | After p50 / p90 / p99 |
| --- | --- | --- |
| `/api/healthz` (no database) | 10 / 26 / 60 ms | 0 / 6 / 25 ms |
| `/api/readyz` (database) | 12 / 27 / 56 ms | 27 / 48 / 267 ms |

Load test on `/api/readyz`, 25 concurrent clients. The after-run used 1,000 requests instead of 3,000, to stay light on Supabase's free connection pooler.

| | Throughput | p50 | p90 | p99 | Failures |
| --- | --- | --- | --- | --- | --- |
| Before, detector stopped | 1,774 req/s | 9.7 ms | 21.5 ms | 82 ms | 0 |
| Before, detector running | 279 req/s | 31.8 ms | 253 ms | 484 ms | 0 |
| **After, laptop to Supabase** | **91 req/s** | 246 ms | 253 ms | 624 ms | 0 |

The ceiling is arithmetic: the API keeps at most 5 database connections (Supabase's free pooler allows few), and each query is a round trip of about 50 ms to Singapore, so about 100 queries a second is the most one laptop can push. Real use is a handful of operators, far below that. Nothing failed.

### Live site, measured from the laptop

Through the internet, HTTPS and nginx, to the web server in Singapore; 15 requests per second for 20 seconds each:

| Endpoint | p50 | p90 | p99 | Failures |
| --- | --- | --- | --- | --- |
| `/` (landing page) | 25 ms | 45 ms | 64 ms | 0 |
| `/api/healthz` | 29 ms | 51 ms | 101 ms | 0 |
| `/api/readyz` (database) | 31 ms | 55 ms | 63 ms | 0 |

On the server, the database is in the same AWS region, so `/api/readyz` costs only 2 ms more than `/api/healthz`, against 27 ms on the laptop.

### Live API, measured on the web server

Run on the web server itself through AWS Systems Manager, straight to the API on 127.0.0.1:3000 (skipping nginx and its per-visitor limit), so it shows the server and Supabase without the internet in between. Same load test as the Docker baseline: 3,000 requests to `/api/readyz`, 25 concurrent clients.

| | Throughput | p50 | p90 | p99 | Failures |
| --- | --- | --- | --- | --- | --- |
| Before: laptop, local database, detector stopped | 1,774 req/s | 9.7 ms | 21.5 ms | 82 ms | 0 |
| **After: web server to Supabase, same region** | **1,500 req/s** | 9 ms | 12 ms | 43 ms | 0 |

One client at 15 requests per second: p50 2 ms, p90 147 ms, p99 209 ms, no failures. The median is the same-region round trip. The slower tail at this light load, which disappears under heavy load, looks like pooled connections being reopened while idle; it wasn't investigated further.

The web server (2 vCPUs, 3.8 GB) used 668 MB of memory in total, with a load average of 0.34 just after the test.

### Page quality, live

Lighthouse on the live landing page after gzip was enabled: **97 performance, 100 accessibility, 100 best practices, 100 SEO** on mobile, and 100 across on desktop. The landing page holds 60 fps up to a 6× CPU slowdown. With reduced motion, GSAP isn't loaded and all content shows at once.

## Regression checklist

`Pass` means checked on 2026-11-08 and passing. `Manual` means it needs a person, or a change to live data that needs approval first.

### Live site (https://54-169-12-87.sslip.io)

| Check | How | Result |
| --- | --- | --- |
| HTTP redirects to HTTPS | `curl` the `http://` address: 301 | Pass |
| Landing, `/login`, `/app`, `/styleguide` load | `curl`: 200 each | Pass |
| Certificate valid | Let's Encrypt, expires 2027-02-05, renews automatically | Pass |
| Security headers | HSTS, CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` all present | Pass |
| Detector-only routes closed to the internet | `/api/internal/*` and camera heartbeats 404; `POST /api/detections` 403 | Pass |
| Signed-out users see no incidents | `GET /api/incidents`: 401 | Pass |
| Scripts are compressed | `Content-Encoding: gzip` on the app bundle | Pass |
| API reaches Supabase | `/api/readyz`: 200 | Pass |
| Every role reaches only its own pages and data | `npm run check:roles` against the live site: 12 of 12 | Pass |
| No browser console errors on the landing page and sign-in | Browser check | Pass |
| Link preview shows the hero image | Paste the address into Messenger or Facebook's Sharing Debugger | Manual, after this change deploys |
| Operator gets an emergency alert, acknowledges it, assigns a responder | Needs a detection posted to the live database; approve that first, or start the detector for a demo | Manual |
| A second operator's console updates live | Two browsers signed in, with the step above | Manual |
| A responder sees only incidents assigned to them | Covered by row level security tests and `check:roles`; worth one look in the browser | Manual |
| Snapshot images open from an incident | Needs a detection with a snapshot | Manual |

### Laptop

| Check | How | Result |
| --- | --- | --- |
| App starts natively | `npm run dev`: API connected to Supabase, Vite serving | Pass, 11.4 s |
| Stop leaves nothing behind | `npm run stop` | Pass, checked when it was written |
| Settings are complete and the connection is verified TLS | `npm run db:check` | Pass |
| Supabase schema matches `supabase/migrations` | `npm run db:migrate`: 8 applied, nothing to apply | Pass |
| Detector runs at the laptop default | One camera at 1 fps, 0 errors | Pass |
| Lint, type check, build | `npm run lint && npm run typecheck && npm run build` | See the commit's CI run |
| API and web tests, with row level security | `npm run test:local` | See the commit's CI run |
| Detector tests | `pytest` in `services/inference` | See the commit's CI run |

The CI run on the commit that adds this report is the record for the last three rows.

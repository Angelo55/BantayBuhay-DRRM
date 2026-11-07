# Phase 0 audit: BantayBuhay2025

**Audited:** 2026-11-07, upstream commit `a94600c` (tagged `upstream-2025-12-15`)

**Verdict:** BantayBuhay2025 is a UI prototype for webcam-based gesture and face recognition, not a DRRM platform. Rebuild the backend, data, map and detection layers. Keep the UI component library, the SOS gesture logic and the research material.

## Needs your attention first

| # | Finding | Status | What's needed |
|---|---|---|---|
| 1 | **A real person's face photos are in the repo.** Four webcam images sit in `registered_faces/responder_juan/`. | Removed from the current tree of the new repo. They remain in its preserved history, and **remain publicly visible in the upstream repo**. | Ask Vincent to purge them upstream. Decide whether to rewrite history here before this repo ever goes public (see [PLAN.md](PLAN.md)). |
| 2 | **Upstream has no license**, so reuse rights aren't granted by default. | The new repo is private and grants no license. | Get Vincent's written permission and choose a license before going public. |
| 3 | **The name `Angelo55/BantayBuhay` was already taken** by your private research repo. | Left untouched. The baseline is in [Angelo55/BantayBuhay-DRRM](https://github.com/Angelo55/BantayBuhay-DRRM). | Tell me if you'd prefer another name. |

The history scan found no real API keys, private keys, tokens or committed `.env` files. It did find mock passwords in source (see "Security" below); they aren't real credentials.

## What it implements

| Layer | Stack | State |
|---|---|---|
| Frontend | Next.js 16.0.7, React 19.2, Tailwind 4, shadcn/ui, Recharts (generated from v0) | 18 pages (15 dashboard, plus login, register and home), mostly showing hard-coded data |
| API | Next.js route handlers | All mock: in-memory arrays reset on restart. `package.json` has no database driver |
| Vision | 3 Flask servers (ports 5000 to 5002), OpenCV, MediaPipe, `face_recognition`/dlib | Works on browser webcam frames sent as base64. No RTSP or HLS ingestion |
| Database | MySQL 8 schema in `scripts/` | Never connected to the Next.js app. Only the face-registration server queries it |
| Map | Google Maps `<iframe>` | No markers, barangay boundaries or overlays. The location list is mock data |
| Deployment | Compose file for gesture server, MySQL and Adminer | Not usable as written (see below) |
| Tests and CI | None | `scripts/test_*.py` are manual scripts. There is no pipeline |

## Requirements gap

| Your requirement | Exists today? |
|---|---|
| CCTV ingestion (RTSP/HLS) | No, webcam only |
| Fire, flood, accident, collapse, crowd surge, person down | No. Only SOS gesture and face recognition |
| Measured detection confidence | No. The gesture server returns fixed values (`0.95` for SOS, `0.5` otherwise) |
| Human verification queue | No |
| Geolocated incidents and barangay map | No |
| Real-time alerts | No. There is no WebSocket or SSE |
| Status flow Detected > Verified > Dispatched > On Scene > Resolved | No. Only `reported`, `responding`, `resolved` |
| Four-role RBAC | No. The schema has manager and responder; the users page uses admin, operator and viewer |
| Civilian medical profiles, consent, encryption, access audit | No |

## What was run

Everything was run in a scratch copy with `npm install`, `tsc` and `next build`.

| Check | Result |
|---|---|
| `next build` | Passes, but only because `next.config.mjs` sets `ignoreBuildErrors: true` |
| `tsc --noEmit` | **11 type errors in source**, in `app/dashboard/users/page.tsx` (10) and `app/register/page.tsx` (1). Registration calls a `register` function that doesn't exist |
| `npm audit --omit=dev` | **1 critical and 3 high**: `next`, `postcss`, `sharp`, `zod`. npm also marks `next@16.0.7` as deprecated for a security vulnerability |
| `npm run lint` | Can't work: ESLint isn't a dependency |
| `pnpm-lock.yaml` | Effectively empty, so dependency versions aren't locked |

Not run: the Docker stack and the Python servers. The Docker findings below come from reading the files.

## Security

These are blockers for any system holding medical data:

- **No real authentication.** `app/api/auth/login/route.ts` compares plaintext mock passwords in source, then the client stores the user object in `localStorage`. Editing that value changes who the UI thinks you are.
- **No server-side authorization.** There is no middleware, and no API route checks identity. Anyone can read or create incidents.
- **Mass assignment.** `POST /api/incidents` spreads the raw request body into the record, with no validation.
- **Open vision servers.** All three bind `0.0.0.0` with unrestricted CORS and no authentication, including the endpoint that triggers an SOS.
- **Exposed services.** Compose publishes MySQL on `3306` and Adminer on `8080`.
- **Hard-coded URLs.** 11 `localhost` URLs in the UI code won't work once deployed.

## Other defects

- **Compose build fails as written.** The context is `./docker/gesture`, which contains only the Dockerfile, but the Dockerfile copies `scripts/requirements.txt` from outside it.
- **Database init likely aborts.** `init-database.sql` uses `ADD COLUMN IF NOT EXISTS`, which MySQL 8 doesn't support, despite the comment saying it does.
- **Seed logins can't work.** The bcrypt values are placeholder patterns, not real hashes.
- **Docs describe missing code.** `VISION_SERVER_SETUP.md` refers to `vision_server.py` and Gemini, and neither is in the repo. `lib/api.ts` targets a backend on port 8000 that doesn't exist.
- **Accessibility is unaddressed.** None of the app's own components or dashboard pages use `aria-` attributes, and only the vendored shadcn/ui components do.

## Reuse or rebuild

| Item | Decision | Why |
|---|---|---|
| `components/ui/` (57 shadcn/ui components) | **Reuse** | Radix-based and framework-independent |
| Dashboard layout, sidebar, stat cards | **Adapt** | A starting point; needs an operations-focused redesign |
| SOS gesture heuristic (`is_sos_signal`) | **Adapt** | Working logic and a good demo, but needs a measured confidence |
| `types/index.ts` | **Adapt** | Partial; roles and statuses change |
| Research paper, ERD, use-case diagram | **Reuse** in the paper | Your own repo, with the same problem framing |
| Next.js route handlers, mock data | **Rebuild** | All mock |
| Auth, RBAC, audit | **Rebuild** | Unsafe by design |
| Database schema | **Rebuild** | Lacks spatial data, civilians, consent and encryption |
| Map | **Rebuild** | An iframe can't show live overlays |
| Flask vision servers | **Rebuild** | Webcam-oriented, unauthenticated |
| Face registration and recognition | **Drop from MVP** | Decision 1 in [PLAN.md](PLAN.md) |
| Compose file, Dockerfile | **Rebuild** | Broken and exposes the database |

Next.js coupling is small: only 13 `app/` files and 1 component import from `next/`.

## Your research repo

`Angelo55/BantayBuhay` holds the paper by Quimanjan, Deguitos and Lacsao, an ERD, a use-case diagram and a three-table MySQL schema. Two things carry over:

- **Scope has grown.** The paper covers a campus: students, faculty and security officers, with webcams, gestures and falls. This brief covers citywide DRRM with CCTV and more hazard types.
- **Identification has changed.** The paper retrieves medical history through facial recognition. The brief doesn't say how a civilian is linked to an incident, which is the largest open design question.

The paper's references also need cleaning up before reuse: at least one reference number is used twice.

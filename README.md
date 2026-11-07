# BantayBuhay DRRM

AI-assisted Disaster Risk Reduction and Management (DRRM) incident detection and response platform. The primary deployment target and map coverage is Kabankalan City, Negros Occidental.

> **Status: early build. Not production-ready.** Operators can sign in, see the Kabankalan map, and receive, acknowledge, verify, assign and dispatch incidents live. Responders see only their own incidents. Six simulated cameras feed a detection service: person-down detection works, and uncertain detections wait in a review queue. Fire, flood and SOS detection and medical profiles come next. See [DESIGN.md](DESIGN.md) for the interface design. The upstream prototype is kept in [`legacy/`](legacy/) for reference only; see [the Phase 0 audit](docs/phase-0/AUDIT.md) before reusing any of it.

## Run it locally

Everything runs natively from one terminal, with no Docker. The database is BantayBuhay's Supabase project in Singapore. You need Node.js 24.7 or newer, Python 3.12 and Git. Open the `app` folder in VS Code and use its terminal (Terminal > New Terminal), or pick the same commands from Terminal > Run Task.

**First time on a machine:**

```bash
npm install
```

```bash
npm run setup
```

Setup builds the shared package, creates `apps/api/.env` from [the template](apps/api/.env.example), creates the detection service's Python environment, downloads and checks the detection model, and downloads the test database. Then fill in `apps/api/.env` (the template says where each value comes from) and check it:

```bash
npm run db:check -w apps/api
```

**Start the app** (API and web), then open <http://127.0.0.1:5173>:

```bash
npm run dev
```

**With the camera detector too:**

```bash
npm run dev:all
```

On a laptop the detector watches one camera at one frame per second; change that in `services/inference/.env` (see [its template](services/inference/.env.example)). Each simulated camera plays `media/sim/<name>.mp4` on a loop, or a moving test pattern if that clip is missing. The names are `barangay-1`, `binicuil`, `tagukon`, `hilamonan`, `tampalon` and `camansi`. `media/` is git-ignored, so footage never enters the repository.

**One service at a time**, for debugging: `npm run dev:api`, `npm run dev:web` or `npm run dev:inference`.

**Stop:** press Ctrl+C in the terminal running the app. If a closed terminal left a server running, this stops it:

```bash
npm run stop
```

| Service | Address |
| --- | --- |
| Web app | <http://127.0.0.1:5173> |
| API | <http://127.0.0.1:3000> (the web app reaches it through `/api`) |
| Detector | <http://127.0.0.1:8000/status> |

## Develop

Run every test, with a throwaway local database that starts and stops by itself:

```bash
npm run test:local
```

```bash
npm run lint && npm run typecheck && npm run build
```

For the detection service, in `services/inference`:

```bash
.venv/Scripts/python -m pytest
```

Database changes are SQL files in [`supabase/migrations`](supabase/migrations). The API tests apply them to the local test database; Supabase gets them through the Supabase CLI or dashboard. Row level security limits every signed-in request; see the comments in the migrations.

| Path | Purpose |
| --- | --- |
| `apps/web` | React web app |
| `apps/api` | Fastify API |
| `services/inference` | Detection service: reads camera clips or streams and reports what persists |
| `packages/shared` | Types shared by the web app and API |
| `supabase/migrations` | Database schema, row level security and storage bucket |
| `scripts` | Setup, dev, stop and test database helpers |
| `infra` | Nginx configuration for the server |
| `legacy` | Upstream prototype, not built or run |

## Credits

This repository continues [BantayBuhay2025](https://github.com/Quimanjan16/BantayBuhay2025), committed by Vincent Joed Quimanjan ([Quimanjan16](https://github.com/Quimanjan16)). The upstream commit history is preserved, and the upstream tip is tagged `upstream-2025-12-15`.

The original concept comes from the research paper *BantayBuhay: An AI-Integrated Camera Surveillance System with Facial Recognition and Hand Gesture Recognition for Real-Time Danger Detection* by Vincent Joed G. Quimanjan, Meryl Jane M. Deguitos and Angelo P. Lacsao (College of Engineering and Computer Sciences, Fellowship Baptist College, Kabankalan).

## License

**No license has been granted.** Upstream publishes no license, so its code remains under its author's copyright. Written permission from the original author is needed before this repository is made public or relicensed.

## Planning documents

- [Phase 0 audit](docs/phase-0/AUDIT.md)
- [Skill toolkit report](docs/phase-0/SKILLS.md)
- [Infrastructure proposal](docs/phase-0/INFRASTRUCTURE.md)
- [EC2 hardening guide](docs/phase-0/EC2-HARDENING.md)
- [Phased plan](docs/phase-0/PLAN.md)

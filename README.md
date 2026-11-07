# BantayBuhay DRRM

AI-assisted Disaster Risk Reduction and Management (DRRM) incident detection and response platform. The primary deployment target and map coverage is Kabankalan City, Negros Occidental.

> **Status: early build. Not production-ready.** Operators can sign in, see the Kabankalan map, and receive, acknowledge, verify, assign and dispatch incidents live. Responders see only their own incidents. Six simulated cameras feed a detection service: person-down detection works, and uncertain detections wait in a review queue. Fire, flood and SOS detection and medical profiles come next. See [DESIGN.md](DESIGN.md) for the interface design. The upstream prototype is kept in [`legacy/`](legacy/) for reference only; see [the Phase 0 audit](docs/phase-0/AUDIT.md) before reusing any of it.

## Run it locally

You need Docker Desktop and Git Bash. This builds and starts the stack, creates a `.env` with random passwords if there isn't one, and checks that everything works:

```bash
bash infra/smoke.sh
```

Then open <http://127.0.0.1:8080>.

**Camera footage:** each simulated camera plays `media/sim/<name>.mp4` on a loop, and shows a test pattern if that file is missing. The names are `barangay-1`, `binicuil`, `tagukon`, `hilamonan`, `tampalon` and `camansi`. The `media/` folder is git-ignored, so footage never enters the repository. After adding a clip, run `docker compose restart mediamtx`.

To stop the stack:

```bash
docker compose down
```

## Develop

```bash
npm install
```

API tests need a throwaway database, so start it first:

```bash
npm run test:db
```

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

To create the 20 fictional test accounts, with passwords saved to the git-ignored `seed-credentials.local.json`:

```bash
bash infra/seed.sh
```

For the inference service, in `services/inference`:

```bash
python -m venv .venv && .venv/Scripts/python -m pip install -r requirements-dev.txt && .venv/Scripts/python -m pytest
```

| Path | Purpose |
| --- | --- |
| `apps/web` | React web app |
| `apps/api` | Fastify API |
| `services/inference` | Detection service: reads camera streams and reports what persists |
| `packages/shared` | Types shared by the web app and API |
| `infra` | Nginx, MediaMTX camera simulation, smoke test and seed script |
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

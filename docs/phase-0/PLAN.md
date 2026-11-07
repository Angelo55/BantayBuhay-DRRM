# Phased plan

**Status: awaiting your decisions.** Implementation starts after you approve the stack in [INFRASTRUCTURE.md](INFRASTRUCTURE.md).

## Your six questions

| # | Question | Answer |
|---|---|---|
| 1 | What does BantayBuhay2025 implement, and what's its stack? | A webcam gesture and face recognition prototype with mock auth and data. Next.js 16, React 19, shadcn/ui, Flask, MediaPipe, dlib, MySQL schema. See [AUDIT.md](AUDIT.md) |
| 2 | Real CCTV feeds, or simulated? | **Nothing in either repo gives real camera access, so I recommend simulating.** Use ffmpeg to loop recorded clips through MediaMTX as RTSP, labeled "Simulated feed" in the UI. Real feeds can replace them later without pipeline changes. Using LGU cameras would need a formal arrangement under NPC Circular 2024-02 |
| 3 | Which incident types for the MVP? | **Recommended:** fire and smoke, person down, flood, SOS gesture. **First stretch:** vehicular accident. **Later:** crowd surge. **Collapse:** manual report only. Depends on your deadline |
| 4 | Can the current EC2 handle real-time inference? | **Can't answer yet.** I have no access to it, and the AWS CLI isn't installed here. Send me its type and region. Then a one-hour benchmark on a `c7i.2xlarge` (about $0.41) answers the question with data |
| 5 | Do we have a domain? | **Need your answer.** I have no record of one. `sslip.io` works as a stopgap |
| 6 | Judging criteria and deadline? | **Need your answer.** Milestones below are in working days, so they can be fitted to the date |

## Decisions needed from you

| # | Decision | Recommendation | Why it matters |
|---|---|---|---|
| 1 | **How does a civilian get linked to an incident?** Your brief says responders see "relevant civilians", but a fire on camera doesn't identify anyone | **No live facial recognition in the MVP.** Link through civilian SOS, operator search, and a responder scanning the civilian's QR medical ID. Each link is explicit and audited | This drives the data model and the main privacy risk. Face recognition on public CCTV tied to medical records is the riskiest feature possible under RA 10173. It can stay as future opt-in research |
| 2 | **Approve the stack** | As listed in [INFRASTRUCTURE.md](INFRASTRUCTURE.md) | Blocks implementation |
| 3 | **Approve paid AWS use** | Up to $5 for the benchmark now, with a budget for the hackathon set after the benchmark | Your rules require approval |
| 4 | **Face photos in git history** | Leave history intact while private. Before going public, purge them with `git filter-repo` and force-push, which needs your explicit go-ahead. Separately, ask Vincent to remove them from public upstream | This conflicts with "keep upstream history" |
| 5 | **Repo visibility and license** | Stay private until Vincent confirms permission in writing, then choose a license | If judges need access, they can be added as collaborators |
| 6 | **Merge the docs branch** | Merge once you've reviewed | These documents are on `docs/phase-0`, not yet on `main` |

## MVP milestones

Estimates assume about two full-time developers and are rough. Each milestone ends with something that can be demonstrated.

| # | Milestone | Days | Done when |
|---|---|---|---|
| M0 | **Decisions and benchmark** | 0.5 to 1 | The decisions above are made; CPU or GPU is chosen from measurements |
| M1 | **Foundation**: monorepo, Compose, CI, deploy to EC2, health checks, hardening | 1.5 | A push to `main` deploys a hello-world stack over HTTPS, and a failed health check rolls back automatically |
| M2 | **Core domain**: database, auth, four-role RBAC, seed data, incident status flow | 2 | All 20 seeded accounts log in, and tests prove each role's permissions |
| M3 | **Map and real-time**: Kabankalan map, 32 barangays, cameras, severity markers, Socket.IO alerts, acknowledge and assign | 2 | An incident created through the API appears on another user's map within 1 second, on the same network |
| M4 | **Detection**: simulated cameras, inference service, MVP incident types, persistence rule, verification queue | 3 | A recorded fire clip creates a located incident with a snapshot, and low-confidence detections go to the queue |
| M5 | **Medical context**: civilian profiles, consent, encryption, access policy, audit log, responder view | 2 | Tests prove a responder sees data only while assigned to an active incident, every read is logged, and the database holds only ciphertext |
| M6 | **Polish and proof**: responsive UI from 320px to ultrawide, WCAG AA checks, evaluation numbers, docs, demo rehearsal | 2 to 3 | The demo script runs end to end twice in a row, and the results table contains measured numbers |

**Total: about 13 to 15 working days.** A shorter deadline means cutting in this order: flood, then QR scanning, then SOS gesture polish. Fire, person down, operator flow and the medical access rules are the core story, so they stay.

### Seed data

Seed 2 Admin, 5 DRRM Operator, 3 Responder and 10 Civilian accounts, all fictional. The seed script generates random passwords and writes them to a git-ignored file, which `.gitignore` already covers. Medical data is invented, and no real person's details or photos are used.

### Proposed repository layout

```text
apps/web/            React operations console and civilian app
apps/api/            Fastify API and notification worker
services/inference/  FastAPI inference service
packages/shared/     Shared types and Zod schemas
infra/               Compose, Nginx, deploy scripts
docs/                Paper, runbook, OpenAPI reference
legacy/              Upstream prototype, moved here for reference
```

## Stretch goals

In priority order:

1. Vehicular accident detection
2. SMS and email alerts (SMS providers cost money, so this needs your approval)
3. PWA with installable responder view and push notifications
4. Real RTSP camera, if the team or LGU can provide one with proper authorization
5. Crowd surge detection
6. Capacitor mobile wrapper
7. MFA for admins and operators
8. Face masking in stored snapshots

## After the hackathon

Before any real deployment:

- LGU agreement, Data Protection Officer, privacy impact assessment and legal review
- Multi-AZ hosting and managed database
- Field evaluation on real Kabankalan camera footage
- Operator training and a defined manual fallback
- Independent security testing

## Documentation plan

| Document | When |
|---|---|
| Technical README | M1, updated each milestone |
| OpenAPI reference | Generated from M2 onward |
| Deployment runbook | M1, based on [EC2-HARDENING.md](EC2-HARDENING.md) |
| Research paper: Introduction, Related Work, Methodology, Architecture | Drafted from M0, building on your existing paper |
| Research paper: AI Model and Evaluation, Testing, Results, Limitations | M6, with measured results only |

## Top risks

| Risk | Impact | Mitigation |
|---|---|---|
| False alarms during the live demo | High | Rehearsed clips, tuned thresholds, verification queue shown as a feature |
| Venue internet fails | High | Phone hotspot backup, plus a recorded demo video as a fallback |
| Model underperforms on some classes | Medium | Fire and person down first; report weak results honestly |
| GPU quota isn't granted in time | Medium | CPU-first design; request quota on day 0 |
| Medical access bug | High | Single policy function with tests written first, reviewed before merge |
| Forgotten instances run up costs | Medium | AWS Budget alerts; stop GPU instances after each session |
| Scope exceeds the deadline | High | Fixed cut order above |

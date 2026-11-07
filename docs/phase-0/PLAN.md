# Phased plan

**Event:** TALISIK Hackathon Challenge 2026, Track 2: Disaster Risk Reduction and Management (College), at National University Bacolod.

**Status:** stack and schedule approved on 2026-11-07. The build has started locally.

## Hard dates

| Date (2026) | What's due | Owner |
|---|---|---|
| **Mon, Nov 9, 11:59 PM** | **Registration and concept proposal.** The portal closes strictly at this time | Team |
| Nov 10 | Screening of entries | Organizers |
| Wed, Nov 11 | Finalists and presentation order announced (top 10 per track) | Organizers |
| Nov 12 to 17 | Final registration, security questions, and laptop declaration (brand, model, serial number) | Team |
| **Tue, Nov 17, 11:59 PM** | **Initial pitch deck** | Team |
| **Fri, Nov 20** | College round. Registration from 8:00 AM, final deck by **12:30 PM strictly**, pitching from 1:00 PM | Team |
| Sat, Nov 21 | Winning decks showcase, for category champions | Champions |

Everyone must be in the venue at least 5 minutes before the program begins. **Arriving late means immediate disqualification.**

The guidelines give no registration link or proposal format, so get these from the organizers.

## What the guidelines change

**This is an idea-stage pitch competition, and working code isn't scored.** The guidelines say judges evaluate "the logic, validity, and regional practicality" and won't penalize teams for having no prototype. The earlier plan treated the build as the main deliverable, which no longer fits the scoring.

| Criterion | Weight | What earns the points | Status |
|---|---|---|---|
| Problem-Solution Fit | **50%** | A verified NIR community problem, precise beneficiaries, root causes | **Largest gap.** The evidence so far is the CPSU incident in your paper and PSA population figures. No Kabankalan DRRM interview exists yet |
| Viability and Feasibility | **30%** | Regional cost, accessibility, sustainability, piloting, compliance | Compliance design exists. Cost model and pilot plan don't |
| Pitch Deck and Presentation | **20%** | Clear deck, student mastery, strong Q&A, on time | Not started |

**Recommendation:** keep building, but as evidence for the pitch rather than the main goal. A short recorded demo proves feasibility and sets you apart, while validation work earns more of the score.

**Pitch rules:**

- **Timing:** a 5-minute pitch, plus 3 minutes of Q&A. Overtime costs 0.1 point per second, and the mic can be cut.
- **Demo:** use a 30 to 45 second recorded clip, not a live demo. Decks are submitted ahead of time and there's an AV lineup, so ask the organizers whether embedded video plays.

**Team rules to confirm now:**

- **Composition:** exactly 3 eligible students and 1 faculty coach, from an accredited NIR institution. A school can field one team per category.
- **Student-led work:** concept and pitch must be entirely student-led. The guidelines don't mention AI tools, so ask your coach or the organizers whether AI-assisted work must be disclosed. All three of you should be able to explain every part in Q&A.
- **Intellectual property:** teams keep their IP, and BUGLAS NIR and DOST get non-exclusive promotional rights. Vincent's permission (see the decisions below) still matters.

## Your six questions

| # | Question | Answer |
|---|---|---|
| 1 | What does BantayBuhay2025 implement, and what's its stack? | **Answered.** A webcam gesture and face recognition prototype with mock auth and data. See [AUDIT.md](AUDIT.md) |
| 2 | Real CCTV feeds, or simulated? | **Simulated for now, confirmed by you.** No reconfigured CCTV is needed for the pitch or prototype: the guidelines don't require operational hardware, and recorded video can run through the same pipeline. The long-term system uses your own cameras (see [INFRASTRUCTURE.md](INFRASTRUCTURE.md)) |
| 3 | Which incident types for the MVP? | **Confirmed by you:** fire and smoke, person down, flood, SOS gesture. First stretch: vehicular accident |
| 4 | Can the current EC2 handle real-time inference? | **No, but a new CPU instance can.** The existing stopped `t3.medium`, named for the PESO project, is too small and isn't dedicated to BantayBuhay. A `c7i.2xlarge` met the target with no GPU: D-FINE-N handled 8 cameras at 2 fps with no dropped frames ([results](../benchmarks/cpu-latency-2026-11-07.md)). Accuracy isn't measured yet |
| 5 | Do we have a domain? | **No.** Use `<elastic-ip>.sslip.io` for HTTPS for now |
| 6 | Judging criteria and deadline? | **Answered above** |

## Confirmed for now, open to change

**You asked to be reminded of these regularly, because they may change.** Each status update repeats this list.

| Choice | Current value | What would change it |
|---|---|---|
| Video source | Simulated feeds | A purchased RTSP camera arrives in time. The pipeline stays the same |
| MVP incident types | Fire and smoke, person down, flood, SOS gesture | Interview findings or time. **Flood is the first cut** if the schedule slips |

## Decisions still needed

| # | Decision | Recommendation | Why it matters |
|---|---|---|---|
| 1 | **Merge M2 into `main`** | Merge, since M2 passes CI | Keeps later work on a current base |
| 2 | **Face photos in git history** | Leave history intact while private. Purge before going public, which needs a force-push and your go-ahead. Ask Vincent to remove them from public upstream | Conflicts with "keep upstream history" |
| 3 | **Repo visibility and license** | Stay private until Vincent confirms in writing | If judges need access, add them as collaborators |
| 4 | **Merge the docs branch** | Merge after review | These documents are on `docs/phase-0`, not on `main` |

**Settled on Nov 7:** the stack and schedule are approved, and the team reports it's registered, with the concept proposal still to submit. The working design links civilians through their own SOS, operator search and QR medical IDs, with no facial recognition; your answer read as acceptance, so tell me if you meant otherwise. The concept proposal draft is in Claude Docs for the team to edit.

## Schedule

The earlier estimate of 13 to 15 working days for two full-time developers **doesn't fit a production-grade build before the Nov 17 deck.** So this plan targets a demo-ready slice by Nov 16, and production hardening continues after the event.

### Team track (earns most of the score)

| Dates | Task | Done when |
|---|---|---|
| Nov 7 to 9 | Edit the concept proposal draft and submit it, if the registration didn't already include one | Submission confirmed |
| Nov 8 to 14 | Interview Kabankalan's City DRRM office, responders and residents. Record response times, current process, past incidents and needs | Named sources and specific findings for the deck |
| Nov 10 to 15 | Cost model from real quotes: camera, networking, compute, per-site and per-year costs. Pilot plan: one site, who funds it, who operates it | One-page cost table and pilot plan |
| Nov 12 to 17 | Finalist registration, security questions, laptop declaration. Declare any laptop you'll bring | Registration confirmed |
| Nov 14 to 17 | Build the deck and submit | Submitted by Nov 17, 11:59 PM |
| Nov 18 to 20 | Timed rehearsals (under 4:50), Q&A drills, final deck edits | Final deck in by 12:30 PM on Nov 20 |

### Build track (supports feasibility)

**Local first until Nov 11.** Docker on your laptop is free, and this avoids spending credit before finalists are announced. Deploy to AWS after that.

| Dates | Milestone | Done when |
|---|---|---|
| Nov 7 to 8 | **M0, M1 Foundation:** benchmark, monorepo, Compose, CI, health checks | Stack runs locally, CI passes, CPU or GPU chosen from measurements. **Done on Nov 7: CPU** |
| Nov 8 to 10 | **M2 Core domain:** database, auth, four-role RBAC, seed data, status flow | All 20 seeded accounts log in, and tests prove role permissions. **Done on Nov 7,** API only, on branch `feat/core-domain` |
| Nov 10 to 12 | **M3 Map and real-time:** 32 barangays, cameras, markers, live alerts, acknowledge and assign | An incident appears live on another user's map |
| Nov 11 to 14 | **M4 Detection,** in this order: fire and smoke, person down, SOS gesture, flood. Includes the verification queue | A recorded fire clip creates a located incident, and low-confidence detections go to the queue |
| Nov 12 | **Deploy:** EC2 hardening, HTTPS, CI/CD with rollback | The app runs on `sslip.io` over HTTPS |
| Nov 13 to 15 | **M5 Medical context:** profiles, consent, encryption, access rule, audit log | Tests prove a responder sees data only while assigned to an active incident, and that every read is logged |
| Nov 15 to 16 | **M6 Demo:** UI polish, measured results, demo video | 30 to 45 second clip recorded, in time for the Nov 17 deck |

**If time runs short, cut in this order:** flood, then QR scanning, then SOS polish, then CI/CD rollback. Fire, person down, the operator flow and medical access rules stay. These dates assume focused full-time work, so they'll need to move if the team is also in classes.

**Deferred until after Nov 21:** full WCAG audit, full research paper, OpenAPI polish, the ultrawide layout and zero-downtime tuning. Your brief still requires these; they just don't affect the pitch.

### Seed data

Seed 2 Admin, 5 DRRM Operator, 3 Responder and 10 Civilian accounts, all fictional. The seed script generates random passwords and writes them to a file that `.gitignore` already covers. No real person's details or photos are used.

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
2. A real purchased camera in the demo
3. SMS and email alerts (SMS providers cost money, so this needs your approval)
4. PWA with installable responder view and push notifications
5. Crowd surge detection
6. Capacitor mobile wrapper
7. MFA for admins and operators
8. Face masking in stored snapshots

## After the hackathon

Before any real deployment:

- Pre-incubation or pilot partner, which the rubric specifically rewards planning for
- Data Protection Officer, privacy impact assessment and legal review
- Multi-AZ hosting and a managed database
- Field evaluation on footage from your own cameras
- Operator training and a defined manual fallback
- Independent security testing

## Top risks

| Risk | Impact | Mitigation |
|---|---|---|
| Concept proposal not submitted by Nov 9 | **Fatal** | Team reports it's registered; confirm the proposal is in |
| No verified local problem evidence | High, on 50% of the score | Interviews start Nov 8 |
| Build takes time from pitch work | High | Pitch tasks take priority, and the build has a fixed cut order |
| Video won't play on venue AV | Medium | Ask organizers; carry screenshots in the deck as backup |
| Going over 5 minutes | Medium | Timed rehearsals under 4:50 |
| Hard Q&A on privacy or surveillance | Medium | No facial recognition, and a prepared RA 10173 answer |
| Model underperforms on a class | Medium | Fire and person down first; report weak results honestly |
| AWS credit burned by idle instances | Medium | Local first, Budget alerts, stop instances after each session |
| Medical access bug | High | One policy function with tests written first |

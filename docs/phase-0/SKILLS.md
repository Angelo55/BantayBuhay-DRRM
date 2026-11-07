# Skill toolkit report

**Reviewed:** 2026-11-07. All eight repos are cloned to `C:\BantayBuhay\toolkit\`, and new installs are in `C:\BantayBuhay\.claude\skills\`. Both folders sit outside this git repository.

**Decision:** I installed a curated set of 12 skills rather than everything. Installing all of them would add about 90 skills, including competing TDD and review processes and an always-on hook.

## Summary

| Repo | What it does | Project phase | Install status | Conflicts |
|---|---|---|---|---|
| [latent-spaces/brag](https://github.com/latent-spaces/brag) | Turns a project into a short launch video | Hackathon demo video | Already installed at user level (`brag`, `brag-slim`) | None. The installed copies differ from the repo's latest; left unchanged |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Anti-template design rules for company and marketing sites | Public landing page only | Installed (38 MB) | **Overlaps** with the other design skills. Wrong for the ops console |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Searchable design data: palettes, type, UX and accessibility guidelines | All UI work | `ui-ux-pro-max` already installed at user level. Six companion skills not installed | **Overlaps** with design skills. Its `design` companion can call paid image APIs |
| [mattpocock/skills](https://github.com/mattpocock/skills) | Small, composable engineering skills: TDD, specs, tickets, domain modeling | All build phases | 6 installed | **Competes** with Superpowers on process; its `code-review` duplicates the built-in one |
| [obra/superpowers](https://github.com/obra/superpowers) | Full agent methodology with mandatory workflow gates | Debugging and verification | 3 installed, **hook withheld** | **Conflicts** with your autonomy rules (see below) |
| [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | 84 `DESIGN.md` analyses of well-known brands | Design reference | Cloned only. It contains no skills | Must not be copied wholesale, because these are other companies' brand identities |
| [anthropics/skills](https://github.com/anthropics/skills) | Official example skills | UI build, end-to-end testing | 2 installed | Document skills are already available in this app |
| [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | Coding discipline: simplicity, surgical changes, verifiable goals | All coding | Already available in this app | None; complements everything |

## Installed skills

| Skill | Source | Used for |
|---|---|---|
| `tdd` | mattpocock | Test-first work on RBAC, medical access rules and the status flow |
| `domain-modeling` | mattpocock | Glossary and architecture decision records |
| `to-spec`, `to-tickets` | mattpocock | Turning the approved plan into tickets |
| `codebase-design` | mattpocock | Module boundaries |
| `setup-matt-pocock-skills` | mattpocock | One-time repo setup. Run it manually as `/setup-matt-pocock-skills` when the build starts |
| `systematic-debugging` | superpowers | Root-cause debugging |
| `verification-before-completion` | superpowers | Evidence before claiming work is done |
| `receiving-code-review` | superpowers | Assessing review feedback critically |
| `frontend-design` | anthropics (Apache 2.0) | Visual direction for the app |
| `webapp-testing` | anthropics (Apache 2.0) | Playwright end-to-end testing |
| `design-taste-frontend` | taste-skill (MIT) | Public landing page only |

## Conflicts and how they're resolved

These rules are recorded in `C:\BantayBuhay\CLAUDE.md`.

1. **Superpowers' session hook is withheld.** Its `SessionStart` hook and `using-superpowers` skill require a skill check before every response, including clarifying questions, and send new builds through a brainstorming gate. That contradicts your rule to run safe tasks without asking, and it adds overhead under a hackathon deadline.
2. **One process owner.** Planning and TDD use mattpocock. Superpowers supplies only debugging and verification. `systematic-debugging` mentions `superpowers:test-driven-development`, which isn't installed, so `tdd` stands in for it.
3. **One code review.** Use the built-in `/code-review`. Mattpocock's version isn't installed.
4. **One design authority.** A project-owned `DESIGN.md` wins over every design skill. `ui-ux-pro-max` supplies data, and `frontend-design` guides visual direction. `taste-skill` covers only the public landing page, because its rules assume marketing pages (for example, one section per screen and real photographs).
5. **No brand imitation.** The `DESIGN.md` examples can inform thinking about dense interfaces, but BantayBuhay gets its own identity. Severity colors are a safety requirement, not a style choice.

## What the review covered

- **Checked:** licenses, skill names and descriptions, plugin manifests, hooks, install scripts and package lifecycle scripts. I also pattern-scanned for pipe-to-shell commands, credential paths, prompt-injection phrases and permission bypasses, and checked the installed skills' `SKILL.md` files for hidden Unicode.
- **Found:** `--dangerously-skip-permissions` appears only in Superpowers' own test scripts, which weren't installed or run. Installed skills contain no hooks, and hidden-character counts were zero.
- **Not done:** a line-by-line read of every file. I ran none of the repos' scripts or installers.
- **License note:** `andrej-karpathy-skills` has no `LICENSE` file, though its plugin manifest says MIT. Anthropic's repo mixes Apache 2.0 with source-available document skills; both skills installed from it carry Apache 2.0.

## Adding or removing skills

The new skills may not appear until a new session starts; I confirmed the files are in place, but didn't test loading them. To remove one, delete its folder from `C:\BantayBuhay\.claude\skills\`. To add more, copy a skill folder there from `toolkit\`.

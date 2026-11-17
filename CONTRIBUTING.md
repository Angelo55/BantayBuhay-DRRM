# Working on BantayBuhay together

Two people push to this repository, and every merge into `main` goes live. This is how changes get from your laptop to the live site without anyone overwriting anyone else's work.

## The short version

1. Start a branch from the latest `main`.
2. Commit and push it. CI checks every push.
3. Open a pull request into `main` and turn on auto-merge.
4. When CI passes and the other developer approves, GitHub merges it. Deploy then ships it to the live site, health-checks it, and rolls back by itself if the new version doesn't start.

Nobody deploys by hand, logs in to the server, or holds AWS keys.

## Every change, step by step

Get the latest `main` and start a branch named after the change:

```bash
git switch main
```

```bash
git pull
```

```bash
git switch -c fire-detector
```

Work, commit as often as you like, and push. The first push sets up tracking:

```bash
git push -u origin fire-detector
```

Every push runs **CI**: lint, type checks, all tests against a throwaway database, a production build and a start-up check of the built API. The result shows next to the commit on GitHub, and GitHub emails you if it fails.

When the change is ready, open a pull request and ask for it to merge itself once it's allowed:

```bash
gh pr create --fill
```

```bash
gh pr merge --auto --squash
```

Or use the link `git push` prints, then **Enable auto-merge** on the pull request page.

The other developer is asked to review automatically. Once CI and the dependency audit pass and they approve, GitHub squashes the branch into one commit on `main` and deletes the branch. About 10 minutes later the change is live.

## What `main` requires

These rules are set on GitHub, so they apply to everyone:

| Rule | Why |
| --- | --- |
| Changes reach `main` only through a pull request | Nobody overwrites anyone else's work; force-pushes and deleting `main` are blocked |
| **Web and API**, **Detector** and **Dependency audit** must pass | Broken code never reaches the live site |
| The branch must be up to date with `main` | What was tested is what gets merged. Click **Update branch** on the pull request if it falls behind |
| One approval from the other developer | A second pair of eyes before anything goes live |
| Review comments must be resolved | Nothing raised in review is forgotten |
| A new push after approval needs a fresh approval | What was approved is what gets merged |

The repository owner (Angelo55) can merge a pull request without waiting for the approval or the checks, for urgent fixes. Even then, **Deploy only ships a commit after CI passes on `main`**.

## If two people change the same file

GitHub says the pull request has conflicts. Bring `main` into your branch and fix them locally:

```bash
git pull origin main
```

Git marks the conflicting lines in each file. Keep the right version of each, then commit and push. CI runs again.

## When a deploy fails

The deploy rolls the server back by itself, so the live site keeps the previous version. GitHub opens an issue titled **Production deploy failed**, assigned to both developers, with a link to the run. The server's own output is in the failed step. The next successful deploy closes the issue.

If a change deployed but behaves wrongly:

- **Fast:** Actions > **Server operations** > Run workflow > `rollback-web` puts the previous release back on the web server.
- **Then:** revert the change in a pull request (`git revert <commit>`), so the next deploy doesn't bring it back.

## Database changes

Schema changes are new files in `supabase/migrations`; never edit one that has already been applied. Supabase is shared by everyone's laptop and the live site, so apply a migration only when its pull request is approved, just before merging:

```bash
npm run db:migrate -- --apply
```

The [runbook](docs/RUNBOOK.md#database-changes) has the details.

## Setting up your laptop

Follow [Run it locally](README.md#run-it-locally) in the README. You need your own `apps/api/.env`. Get the Supabase database password and storage key from the repository owner through a private channel, never in an issue, a commit or a group chat. Generate your own detector token. CI needs none of these: it uses its own throwaway database.

## Rules that never bend

- No secrets, passwords, keys or `.env` files in commits. Git ignores them; don't force-add them.
- No real personal data, real medical data, faces or real CCTV footage. Seed data is fictional.
- Production settings and AWS access stay with the repository owner. Deploys reach AWS through GitHub's short-lived sign-in, which only works from `main`.

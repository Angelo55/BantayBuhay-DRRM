# Working on BantayBuhay together

Two people push to this repository, and every push to `main` that passes CI goes live. This is how changes get from your laptop to the live site without anyone overwriting anyone else's work.

## The short version

1. Get the latest `main`, make your change, commit.
2. Push to `main`.
3. CI checks it. If it passes, Deploy ships it to the live site about 10 minutes later, health-checks it, and rolls back by itself if the new version doesn't start.

Nobody deploys by hand, logs in to the server, or holds AWS keys. If CI fails, nothing is deployed: the live site keeps the last version that passed.

## Every change, step by step

Start from the latest `main`. Pulling with rebase keeps your commits on top of the other developer's, without merge commits:

```bash
git switch main
```

```bash
git pull --rebase
```

Work and commit as usual. Before pushing, run the checks on your laptop, so a broken commit doesn't sit on `main`:

```bash
npm run test:local
```

Then pull again (the other developer may have pushed meanwhile) and push:

```bash
git pull --rebase
```

```bash
git push
```

If `git push` is refused with "rejected (fetch first)" or "non-fast-forward", someone pushed before you. That's the rule that stops anyone overwriting the other's work. Run `git pull --rebase` and push again.

After you push, watch the run on GitHub under **Actions**. GitHub emails you if CI fails on your commit.

## Optional: a branch and a pull request

For a bigger change, or one you'd like the other developer to look at first, use a branch instead:

```bash
git switch -c fire-detector
```

```bash
git push -u origin fire-detector
```

CI runs on every push to the branch. When it's ready, open a pull request and merge it yourself once the checks are green:

```bash
gh pr create --fill
```

```bash
gh pr merge --squash
```

Nothing requires a review or a pull request; it's there when it helps.

## What GitHub enforces on `main`

| Rule | Why |
| --- | --- |
| No force-pushes | Nobody can overwrite commits the other person already pushed |
| `main` can't be deleted | The live site's source can't disappear |
| Only `main` can deploy | The production environment refuses every other branch, and the AWS sign-in only works there |
| Deploy waits for CI | A commit that fails lint, type checks, tests or the build is never deployed |

The **Dependency audit** also runs on every push to `main` and weekly. A failure there doesn't block deploys, but fix it soon: Dependabot usually has a pull request for it.

## If two people change the same file

`git pull --rebase` stops at the conflicting lines and marks them in the file. Keep the right version of each, then:

```bash
git add <file>
```

```bash
git rebase --continue
```

Then push.

## When a deploy fails

The deploy rolls the server back by itself, so the live site keeps the previous version. GitHub opens an issue titled **Production deploy failed**, assigned to both developers, with a link to the run. The server's own output is in the failed step. The next successful deploy closes the issue.

If a change deployed but behaves wrongly:

- **Fast:** Actions > **Server operations** > Run workflow > `rollback-web` puts the previous release back on the web server.
- **Then:** undo the change on `main` (`git revert <commit>`, then push), so the next deploy doesn't bring it back.

If the web server is stopped, deploys show as failed but nothing breaks. After starting it again, run Actions > **Deploy** > Run workflow on `main`.

## Database changes

Schema changes are new files in `supabase/migrations`; never edit one that has already been applied. Supabase is shared by everyone's laptop and the live site, so apply a migration just before pushing the code that needs it:

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

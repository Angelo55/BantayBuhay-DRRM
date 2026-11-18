# Setting up a teammate's laptop

How a new developer gets BantayBuhay running on their own laptop, and what the repository owner has to send them. This file contains no secrets; the secrets travel separately, as described below.

## Why the teammate needs something from the owner

When you run the app on your laptop (`npm run dev`), the API connects to the database: BantayBuhay's Supabase project. The connection details live in `apps/api/.env`. That file is deliberately **not** in GitHub, because it holds the database password. Cloning the repository gives you all the code, but not the keys to the database, so they come from the owner.

GitHub doesn't need them. CI tests against its own throwaway database, and the live server reads its own copy from AWS.

## What's in `apps/api/.env`

| Line | Secret? | Where it comes from |
| --- | --- | --- |
| `DATABASE_URL` | **Yes**: it contains the database password | The owner sends it |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes**: full access to stored snapshots | The owner sends it |
| `DETECTOR_TOKEN` | Yes, but each person makes their own | One command, in step 3 below |
| `SUPABASE_URL`, `DATABASE_CA_FILE`, `COOKIE_SECURE`, `HOST`, `PORT` | No | Already filled in by the template |

Test account passwords are separate: they're in `seed-credentials.local.json` in the project's top folder, also kept out of GitHub.

## For the owner: what to send

1. Open your own `apps/api/.env` in VS Code.
2. Copy just the two secret lines: `DATABASE_URL=...` and `SUPABASE_SERVICE_ROLE_KEY=...`.
3. Send them to your teammate in a **private one-to-one message**. Never send them through GitHub (issues, commits, pull requests), a group chat or a shared document.
4. So your teammate can sign in to the app as the fictional test users, also send the passwords:
   - run `npm run accounts` on your laptop and send the output the same private way, or
   - send the file `seed-credentials.local.json` from the project's top folder.
5. Once your teammate confirms they've copied everything, delete the messages.

## For the teammate: setting up

You need Node.js 24.7 or newer, Python 3.12, Git, VS Code, and access to the GitHub repository (the owner adds you as a collaborator).

### 1. Get the code and install everything

In the VS Code terminal (Terminal > New Terminal):

```bash
git clone https://github.com/Angelo55/BantayBuhay-DRRM.git
```

```bash
cd BantayBuhay-DRRM
```

```bash
npm install
```

```bash
npm run setup
```

Setup creates your `apps/api/.env` from the template, sets up the detection service and downloads the test database. Open the `BantayBuhay-DRRM` folder in VS Code (File > Open Folder) for the next steps.

### 2. Paste in the owner's two lines

Open `apps/api/.env`. Replace the `DATABASE_URL=...` line and the empty `SUPABASE_SERVICE_ROLE_KEY=` line with the two lines the owner sent. Save the file.

If the owner sent `seed-credentials.local.json`, put it in the project's top folder (`BantayBuhay-DRRM`, next to `package.json`).

### 3. Make your own detector token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the long string it prints and paste it after `DETECTOR_TOKEN=` in `apps/api/.env`. Save.

### 4. Check the connection and start the app

```bash
npm run db:check
```

Every line should say `PASS`. Then start the app:

```bash
npm run dev
```

Open <http://127.0.0.1:5173>. Sign in at `/login` with one of the test accounts; `npm run accounts` lists them if you have the credentials file.

To stop the app, press Ctrl+C in that terminal.

### 5. Start contributing

[CONTRIBUTING.md](../CONTRIBUTING.md) explains the daily workflow: pull, commit, push to `main`, and the live site updates itself once CI passes.

## Two things to know

**Your laptop uses the same database as the live site.** There's only one Supabase project, so anything you create, change or delete while testing locally also shows up on the live site. Don't run `npm run db:seed` or `npm run db:migrate -- --apply` without telling the owner first.

**If a secret ever leaks**, for example pasted somewhere public or committed by mistake, tell the owner straight away. The password and key have to be changed; the runbook's [Secrets](RUNBOOK.md#secrets) section has the steps, and the live site needs a redeploy afterwards.

## When something doesn't work

| Problem | What to do |
| --- | --- |
| `npm run setup` says Node is too old | Install Node.js 24.7 or newer from nodejs.org, then run it again |
| Setup can't find Python 3.12 | Install Python 3.12 from python.org, then run it again |
| `npm run db:check` fails on the database | Check the `DATABASE_URL` line was pasted whole, on one line, with no spaces around `=` |
| `npm run db:check` fails on storage | Check the `SUPABASE_SERVICE_ROLE_KEY` line; it starts with `sb_secret_` |
| Everything worked yesterday but not today | The Supabase project may be paused; ask the owner to restore it in the Supabase dashboard |
| A port is already in use | A previous run is still going. Run `npm run stop`, then `npm run dev` again |

// A throwaway PostgreSQL 17 + PostGIS database for the API tests, without Docker, an installer or a
// background service. Windows only; elsewhere, point TEST_DATABASE_URL at any Postgres with PostGIS.
//
//   npm run test:db        downloads and verifies the binaries once, then starts a fresh database
//   npm run test:db:stop   stops it and deletes its data
//
// Everything lives in .local/ (git-ignored). The database listens on 127.0.0.1:55432 only, trusts
// local connections and skips disk syncs: it holds test data for one run and is wiped every start.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL = join(ROOT, ".local");
const DOWNLOADS = join(LOCAL, "downloads");
const PGSQL = join(LOCAL, "pgsql");
const DATA = join(LOCAL, "pgdata-test");
const LOG = join(LOCAL, "pgdata-test.log");
const PORT = "55432";
const USER = "bantaybuhay";
const DATABASE = "bantaybuhay_test";

// Pinned builds. The PostGIS checksum matches OSGeo's published MD5; EDB publishes none, so its
// SHA-256 was recorded from the first download. A mismatch means a corrupted or altered file.
const POSTGRES = {
  file: "postgresql-17.11-1-windows-x64-binaries.zip",
  url: "https://get.enterprisedb.com/postgresql/postgresql-17.11-1-windows-x64-binaries.zip",
  sha256: "6eabdf00d2893713b75db4336a23c3fdf505f056e217ec6e2e95d901750cfea3",
};
const POSTGIS = {
  file: "postgis-bundle-pg17-3.6.2x64.zip",
  url: "https://download.osgeo.org/postgis/windows/pg17/postgis-bundle-pg17-3.6.2x64.zip",
  sha256: "7ba180ee2a352987b9a2f194673652c59483b55852295ccf401dceccd8765425",
  folder: "postgis-bundle-pg17-3.6.2x64",
};
const INSTALLED_MARKER = join(PGSQL, ".bantaybuhay-installed");
const INSTALLED_VERSION = `${POSTGRES.file}+${POSTGIS.file}`;

// Windows' own tar (bsdtar) reads zip files; Git Bash's GNU tar doesn't.
const TAR = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
const bin = (name) => join(PGSQL, "bin", `${name}.exe`);

function run(command, args, { quiet = false } = {}) {
  // stdio is ignored for quiet commands: pg_ctl's server keeps inherited pipes open otherwise.
  const result = spawnSync(command, args, { stdio: quiet ? "ignore" : "inherit", windowsHide: true });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function must(command, args, what, options) {
  if (run(command, args, options) !== 0) throw new Error(`${what} failed. See ${LOG} if the server was involved.`);
}

async function sha256(path) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(path), hash);
  return hash.digest("hex");
}

async function ensureDownloaded({ file, url, sha256: expected }) {
  const path = join(DOWNLOADS, file);
  if (!existsSync(path)) {
    mkdirSync(DOWNLOADS, { recursive: true });
    console.log(`Downloading ${file} (a few hundred MB, once)...`);
    const response = await fetch(url);
    if (!response.ok || !response.body) throw new Error(`Download of ${file} failed (${response.status})`);
    const partial = `${path}.partial`;
    await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
    renameSync(partial, path);
  }
  const actual = await sha256(path);
  if (actual !== expected) {
    rmSync(path, { force: true });
    throw new Error(`${file} doesn't match its pinned checksum, so it was deleted. Run again to re-download.`);
  }
  return path;
}

async function ensureInstalled() {
  if (existsSync(INSTALLED_MARKER) && readFileSync(INSTALLED_MARKER, "utf8") === INSTALLED_VERSION) return;
  const postgresZip = await ensureDownloaded(POSTGRES);
  const postgisZip = await ensureDownloaded(POSTGIS);
  console.log("Unpacking PostgreSQL and PostGIS into .local/pgsql...");
  rmSync(PGSQL, { recursive: true, force: true });
  // Only the server: pgAdmin, StackBuilder and the docs make up most of the archive.
  must(TAR, ["-xf", postgresZip, "-C", LOCAL, "pgsql/bin", "pgsql/lib", "pgsql/share"], "Unpacking PostgreSQL");
  const staging = join(LOCAL, "postgis-staging");
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  must(TAR, ["-xf", postgisZip, "-C", staging, `${POSTGIS.folder}/bin`, `${POSTGIS.folder}/lib`, `${POSTGIS.folder}/share`], "Unpacking PostGIS");
  // PostGIS's DLLs go next to postgres.exe, where Windows looks for a library's dependencies.
  for (const part of ["bin", "lib", "share"]) {
    cpSync(join(staging, POSTGIS.folder, part), join(PGSQL, part), { recursive: true, force: true });
  }
  rmSync(staging, { recursive: true, force: true });
  writeFileSync(INSTALLED_MARKER, INSTALLED_VERSION);
}

function isRunning() {
  return existsSync(DATA) && run(bin("pg_ctl"), ["status", "-D", DATA], { quiet: true }) === 0;
}

function stop() {
  if (isRunning()) must(bin("pg_ctl"), ["stop", "-D", DATA, "-m", "fast", "-w"], "Stopping the test database", { quiet: true });
  rmSync(DATA, { recursive: true, force: true });
}

async function start() {
  await ensureInstalled();
  stop();
  must(bin("initdb"), ["-D", DATA, "-U", USER, "--auth=trust", "-E", "UTF8", "--locale=C"], "Creating the test database", { quiet: true });
  const serverOptions = `-p ${PORT} -c listen_addresses=127.0.0.1 -c fsync=off -c synchronous_commit=off -c full_page_writes=off`;
  must(bin("pg_ctl"), ["start", "-D", DATA, "-l", LOG, "-w", "-o", serverOptions], "Starting the test database", { quiet: true });
  must(bin("createdb"), ["-h", "127.0.0.1", "-p", PORT, "-U", USER, DATABASE], "Creating the test schema", { quiet: true });
  console.log(`Test database ready on 127.0.0.1:${PORT}. Stop it with: npm run test:db:stop`);
}

const command = process.argv[2];
if (process.platform !== "win32") {
  console.error("The bundled test database is for Windows. Elsewhere, set TEST_DATABASE_URL to a Postgres 17 with PostGIS.");
  process.exit(command === "stop" ? 0 : 1);
}
try {
  if (command === "start") await start();
  else if (command === "stop") {
    stop();
    console.log("Test database stopped and its data deleted.");
  } else if (command === "status") console.log(isRunning() ? "running" : "stopped");
  else {
    console.error("Usage: node scripts/test-db.mjs start|stop|status");
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

// Checks the settings in apps/api/.env against Supabase: npm run db:check -w apps/api
// It prints only pass/fail results and counts, never the connection string, password or key.
import { TLSSocket } from "node:tls";
import { loadConfig } from "./config.js";
import { createPool } from "./database.js";

function report(ok: boolean, label: string, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `: ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

// Error messages from pg and fetch can include host names but not passwords; keep them short.
const reason = (error: unknown) =>
  error instanceof Error ? error.message.split("\n")[0]!.slice(0, 160) : String(error);

let config;
try {
  config = loadConfig(process.env);
  report(true, "Settings in apps/api/.env are complete");
} catch (error) {
  report(false, "Settings in apps/api/.env", reason(error));
  process.exit(1);
}

report(Boolean(config.databaseCaFile), "Database certificate file is set", config.databaseCaFile ? "" : "DATABASE_CA_FILE is empty");

let pool;
try {
  pool = createPool(config);
} catch (error) {
  report(false, "Database certificate file can be read", reason(error));
  process.exit(1);
}

try {
  const client = await pool.connect();
  try {
    report(true, "Connected to the database");
    // Checked on this machine's socket. Postgres's own view (pg_stat_ssl) only describes the
    // pooler's internal connection, not the one from here to Supabase.
    const socket = (client as unknown as { connection: { stream: unknown } }).connection.stream;
    const verified = socket instanceof TLSSocket && socket.encrypted && socket.authorized;
    report(
      verified,
      "Connection is encrypted and Supabase's certificate is verified",
      verified && socket instanceof TLSSocket ? String(socket.getProtocol()) : "",
    );
    const { rows } = await client.query<{ postgis: string; barangays: number }>(
      `SELECT PostGIS_Lib_Version() AS postgis, (SELECT count(*)::int FROM barangays) AS barangays`,
    );
    const row = rows[0]!;
    report(true, "PostGIS is available", row.postgis);
    report(row.barangays === 32, "Kabankalan barangays are loaded", `${row.barangays} of 32`);
  } finally {
    client.release();
  }
} catch (error) {
  report(false, "Connected to the database", reason(error));
} finally {
  await pool.end();
}

if (config.snapshots.kind === "supabase") {
  const { url, serviceRoleKey, bucket } = config.snapshots;
  const headers: Record<string, string> = { apikey: serviceRoleKey };
  if (serviceRoleKey.startsWith("eyJ")) headers.authorization = `Bearer ${serviceRoleKey}`;
  try {
    const response = await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    const body = response.ok ? ((await response.json()) as { public?: boolean }) : null;
    report(response.ok, "Snapshot bucket is reachable with the secret key", response.ok ? "" : `HTTP ${response.status}`);
    if (body) report(body.public === false, "Snapshot bucket is private");
  } catch (error) {
    report(false, "Snapshot bucket is reachable", reason(error));
  }
} else {
  report(false, "Snapshot storage uses Supabase", "set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}

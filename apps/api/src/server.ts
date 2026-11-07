import { readFileSync } from "node:fs";
import pg from "pg";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { snapshotStoreFor } from "./snapshots.js";

const config = loadConfig(process.env);

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 5000,
  // Supabase's free pooler allows few connections; one API process needs only a handful.
  max: 5,
  // Supabase signs its database certificates with its own CA. With the CA file, the connection
  // is encrypted and the server is verified; without it (local test database), plain TCP.
  ssl: config.databaseCaFile ? { ca: readFileSync(config.databaseCaFile, "utf8") } : undefined,
});

// One API process, so live updates use Socket.IO's built-in in-memory adapter. Running more than
// one process would need a shared adapter again.
const app = buildApp({
  logger: true,
  db: pool,
  cookieSecure: config.cookieSecure,
  detectorToken: config.detectorToken,
  snapshots: snapshotStoreFor(config.snapshots),
  checks: {
    // PostGIS_Version also proves the spatial extension is available.
    postgres: () => pool.query("SELECT PostGIS_Version()"),
  },
});

pool.on("error", (error) => app.log.error({ err: error }, "postgres pool error"));

async function shutdown() {
  await app.close();
  await pool.end();
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    shutdown().then(
      () => process.exit(0),
      (error) => {
        app.log.error({ err: error }, "shutdown failed");
        process.exit(1);
      },
    );
  });
}

await app.listen({ host: config.host, port: config.port });

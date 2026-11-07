import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createPool } from "./database.js";
import { snapshotStoreFor } from "./snapshots.js";

const config = loadConfig(process.env);

const pool = createPool(config);

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

import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import pg from "pg";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig(process.env);

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 2000,
});
const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

// Live updates use their own connections, which queue commands while reconnecting.
const pubClient = new Redis(config.redisUrl);
const subClient = pubClient.duplicate();

const app = buildApp({
  logger: true,
  db: pool,
  cookieSecure: config.cookieSecure,
  detectorToken: config.detectorToken,
  snapshotDir: config.snapshotDir,
  realtimeAdapter: createAdapter(pubClient, subClient),
  checks: {
    // PostGIS_Version also proves the spatial extension is available.
    postgres: () => pool.query("SELECT PostGIS_Version()"),
    redis: () => redis.ping(),
  },
});

pool.on("error", (error) => app.log.error({ err: error }, "postgres pool error"));
for (const client of [redis, pubClient, subClient]) {
  client.on("error", (error) => app.log.error({ err: error }, "redis connection error"));
}

async function shutdown() {
  await app.close();
  await pool.end();
  for (const client of [redis, pubClient, subClient]) client.disconnect();
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

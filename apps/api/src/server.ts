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

const app = buildApp({
  logger: true,
  db: pool,
  cookieSecure: config.cookieSecure,
  checks: {
    // PostGIS_Version also proves the spatial extension is available.
    postgres: () => pool.query("SELECT PostGIS_Version()"),
    redis: () => redis.ping(),
  },
});

pool.on("error", (error) => app.log.error({ err: error }, "postgres pool error"));
redis.on("error", (error) => app.log.error({ err: error }, "redis connection error"));

async function shutdown() {
  await app.close();
  await pool.end();
  redis.disconnect();
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

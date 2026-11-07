import { readFileSync } from "node:fs";
import pg from "pg";
import type { Config } from "./config.js";

// The API's connection pool. Supabase signs its database certificates with its own CA: with the
// CA file the connection is encrypted and the server is verified; without it (local test
// database), plain TCP.
export function createPool(config: Pick<Config, "databaseUrl" | "databaseCaFile">): pg.Pool {
  return new pg.Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 5000,
    // Supabase's free pooler allows few connections; one API process needs only a handful.
    max: 5,
    ssl: config.databaseCaFile ? { ca: readFileSync(config.databaseCaFile, "utf8") } : undefined,
  });
}

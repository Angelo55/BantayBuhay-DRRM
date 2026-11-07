import { readFileSync } from "node:fs";
import { ROLES, type PublicUser } from "@bantaybuhay/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import pg from "pg";
import type { Config } from "./config.js";

// The database role user requests run under. It doesn't bypass row level security, so the
// policies in supabase/migrations decide what each user can read and change.
export const APP_ROLE = "bantaybuhay_app";

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

// Anything that runs a query: a pool, a client inside a transaction, or a Db.
export interface Queryable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query<R extends pg.QueryResultRow = any>(text: string, values?: unknown[]): Promise<pg.QueryResult<R>>;
}

export interface Db extends Queryable {
  // Runs work in one transaction on one connection, committing only if it succeeds.
  transaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T>;
}

async function inTransaction<T>(client: pg.PoolClient, work: (client: pg.PoolClient) => Promise<T>) {
  await client.query("BEGIN");
  try {
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

// The login role, which bypasses row level security. Only for work no signed-in user is doing:
// login, session lookup, detector ingest and live-update fan-out.
export function systemDb(pool: pg.Pool): Db {
  return {
    query: (text, values) => pool.query(text, values),
    async transaction(work) {
      const client = await pool.connect();
      try {
        return await inTransaction(client, work);
      } finally {
        client.release();
      }
    },
  };
}

declare module "fastify" {
  interface FastifyRequest {
    // The signed-in user's view of the database, bound by row level security.
    db: Db;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Values are checked against strict patterns before being written into the statement, because
// SET ROLE can't take parameters.
export function identityStatement(user: PublicUser): string {
  if (!UUID.test(user.id) || !ROLES.includes(user.role)) throw new Error("Refusing an unexpected user identity");
  return (
    `SET ROLE ${APP_ROLE}; ` +
    `SELECT set_config('app.user_id', '${user.id}', false), set_config('app.role', '${user.role}', false)`
  );
}

export const RESET = "RESET ROLE; SELECT set_config('app.user_id', '', false), set_config('app.role', '', false)";

// Gives each request one connection, claimed on its first query and switched to the restricted
// role for the signed-in user. When the response is sent, the connection is reset before it goes
// back to the pool; if the reset fails, the connection is discarded instead of reused.
export function registerRequestDb(app: FastifyInstance, pool: pg.Pool) {
  const claimed = new WeakMap<FastifyRequest, Promise<pg.PoolClient>>();

  function claim(request: FastifyRequest): Promise<pg.PoolClient> {
    let client = claimed.get(request);
    if (!client) {
      const user = request.user;
      // Checked here, so a route that forgot its guard fails instead of running unrestricted.
      if (!user) throw new Error("request.db used without a signed-in user");
      client = (async () => {
        const connection = await pool.connect();
        try {
          await connection.query(identityStatement(user));
          return connection;
        } catch (error) {
          connection.release(error as Error);
          throw error;
        }
      })();
      claimed.set(request, client);
    }
    return client;
  }

  async function release(request: FastifyRequest) {
    const pending = claimed.get(request);
    if (!pending) return;
    claimed.delete(request);
    let client: pg.PoolClient;
    try {
      client = await pending;
    } catch {
      return; // Never connected, or already discarded.
    }
    try {
      await client.query(RESET);
      client.release();
    } catch (error) {
      client.release(error as Error);
    }
  }

  app.decorateRequest("db", null as unknown as Db);
  app.addHook("onRequest", async (request) => {
    request.db = {
      query: async (text, values) => (await claim(request)).query(text, values),
      transaction: async (work) => inTransaction(await claim(request), work),
    };
  });
  app.addHook("onResponse", async (request) => release(request));
  app.addHook("onRequestAbort", async (request) => release(request));
}

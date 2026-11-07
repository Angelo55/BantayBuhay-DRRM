// Row level security, tested at the database: each query below has no WHERE clause guarding it,
// so only the policies stand between a user and other people's data. If a route ever forgets a
// filter, these are the rules that still hold.
import type { PublicUser, Role } from "@bantaybuhay/shared";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { identityStatement, RESET } from "./database.js";
import { createUser, PASSWORD, resetDb, testPool, TEST_DATABASE_URL } from "./test-support/db.js";

const db = testPool();

type Person = PublicUser;
let operator: Person;
let admin: Person;
let responderA: Person;
let responderB: Person;
let civilianA: Person;
let civilianB: Person;
let incidentA: string;
let incidentB: string;

async function person(role: Role): Promise<Person> {
  const user = await createUser(db, role);
  return { id: user.id, email: user.email, fullName: `Test ${role}`, role };
}

async function incident(): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO incidents (incident_type, severity, status, location, created_by)
     VALUES ('fire_smoke', 'high', 'dispatched', ST_SetSRID(ST_MakePoint(122.82, 9.98), 4326), $1)
     RETURNING id`,
    [operator.id],
  );
  const id = rows[0]!.id;
  await db.query("INSERT INTO incident_events (incident_id, actor_id, to_status) VALUES ($1, $2, 'detected')", [
    id,
    operator.id,
  ]);
  return id;
}

// Runs work on one connection switched to the restricted role, as the API does per request.
async function as<T>(user: Person, work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query(identityStatement(user));
    return await work(client);
  } finally {
    await client.query(RESET);
    client.release();
  }
}

beforeAll(async () => {
  await resetDb(db);
  [operator, admin, responderA, responderB, civilianA, civilianB] = await Promise.all([
    person("operator"),
    person("admin"),
    person("responder"),
    person("responder"),
    person("civilian"),
    person("civilian"),
  ]);
  for (const [index, civilian] of [civilianA, civilianB].entries()) {
    await db.query(
      "INSERT INTO civilian_profiles (user_id, birth_date, medical_id_token) VALUES ($1, '1990-01-01', $2)",
      [civilian.id, `test-token-${index}-${civilian.id}`],
    );
  }
  incidentA = await incident();
  incidentB = await incident();
  await db.query(
    "INSERT INTO assignments (incident_id, responder_id, assigned_by) VALUES ($1, $2, $4), ($3, $5, $4)",
    [incidentA, responderA.id, incidentB, operator.id, responderB.id],
  );
  await db.query("INSERT INTO audit_logs (actor_id, action) VALUES ($1, 'test.entry')", [operator.id]);
});

afterAll(async () => {
  await db.end();
});

describe("a responder", () => {
  it("sees only the incident they're assigned to, even with no filter in the query", async () => {
    const ids = await as(responderA, async (client) => (await client.query("SELECT id FROM incidents")).rows);
    expect(ids).toEqual([{ id: incidentA }]);
  });

  it("can't read another incident's history or change it", async () => {
    await as(responderA, async (client) => {
      const events = await client.query("SELECT incident_id FROM incident_events");
      expect(events.rows.every((row) => row.incident_id === incidentA)).toBe(true);
      expect(events.rowCount).toBeGreaterThan(0);

      const update = await client.query("UPDATE incidents SET status = 'resolved' WHERE id = $1", [incidentB]);
      expect(update.rowCount).toBe(0);
    });
    const { rows } = await db.query("SELECT status FROM incidents WHERE id = $1", [incidentB]);
    expect(rows[0].status).toBe("dispatched");
  });

  it("loses access when released from the incident", async () => {
    const extra = await incident();
    await db.query("INSERT INTO assignments (incident_id, responder_id, assigned_by, released_at) VALUES ($1, $2, $3, now())", [
      extra,
      responderA.id,
      operator.id,
    ]);
    const seen = await as(responderA, async (client) => (await client.query("SELECT id FROM incidents WHERE id = $1", [extra])).rowCount);
    expect(seen).toBe(0);
  });

  it("can't see civilians' profiles", async () => {
    const count = await as(responderA, async (client) => (await client.query("SELECT 1 FROM civilian_profiles")).rowCount);
    expect(count).toBe(0);
  });
});

describe("a civilian", () => {
  it("sees only their own profile and no incidents", async () => {
    await as(civilianA, async (client) => {
      const profiles = await client.query("SELECT user_id FROM civilian_profiles");
      expect(profiles.rows).toEqual([{ user_id: civilianA.id }]);
      expect((await client.query("SELECT 1 FROM incidents")).rowCount).toBe(0);
      expect((await client.query("SELECT id FROM users")).rows).toEqual([{ id: civilianA.id }]);
    });
  });
});

describe("every user", () => {
  it("can't read password hashes, not even their own", async () => {
    await expect(as(operator, (client) => client.query("SELECT password_hash FROM users"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("can't write an audit entry under someone else's name", async () => {
    await expect(
      as(operator, (client) =>
        client.query("INSERT INTO audit_logs (actor_id, action) VALUES ($1, 'forged')", [responderA.id]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("can't record an assignment as made by another operator", async () => {
    const other = await person("operator");
    await expect(
      as(operator, (client) =>
        client.query("INSERT INTO assignments (incident_id, responder_id, assigned_by) VALUES ($1, $2, $3)", [
          incidentB,
          responderA.id,
          other.id,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("the audit log", () => {
  it("is readable by admins only", async () => {
    const forOperator = await as(operator, async (client) => (await client.query("SELECT 1 FROM audit_logs")).rowCount);
    const forAdmin = await as(admin, async (client) => (await client.query("SELECT 1 FROM audit_logs")).rowCount);
    expect(forOperator).toBe(0);
    expect(forAdmin).toBeGreaterThan(0);
  });
});

describe("the API's per-request connection", () => {
  it("runs a signed-in user's queries under the restricted role, then resets the connection", async () => {
    // One connection, so the request and the check afterwards must share it.
    const single = new pg.Pool({ connectionString: TEST_DATABASE_URL, max: 1 });
    const app = buildApp({ checks: {}, db: single, loginAttemptsPerMinute: 1000 });
    try {
      const login = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: responderA.email, password: PASSWORD },
      });
      const cookie = login.cookies.map((item) => `${item.name}=${item.value}`).join("; ");

      const list = await app.inject({ method: "GET", url: "/api/incidents", headers: { cookie } });
      expect(list.json().incidents.map((item: { id: string }) => item.id)).toEqual([incidentA]);

      const after = await single.query<{ who: string; role: string | null }>(
        "SELECT current_user AS who, nullif(current_setting('app.role', true), '') AS role",
      );
      expect(after.rows[0]!.who).not.toBe("bantaybuhay_app");
      expect(after.rows[0]!.role).toBeNull();
    } finally {
      await app.close();
      await single.end();
    }
  });
});

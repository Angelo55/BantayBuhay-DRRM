import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { seed } from "./seed.js";
import { resetDb, testPool } from "./test-support/db.js";

const db = testPool();

beforeEach(() => resetDb(db));
afterAll(() => db.end());

describe("seed", () => {
  it("creates 2 admins, 5 operators, 3 responders and 10 civilians", async () => {
    const { accounts } = await seed(db);

    const count = (role: string) => accounts.filter((item) => item.role === role).length;
    expect([count("admin"), count("operator"), count("responder"), count("civilian")]).toEqual([
      2, 5, 3, 10,
    ]);
  });

  it("creates accounts that can sign in, using only reserved test emails", async () => {
    const { accounts } = await seed(db);
    const app = buildApp({ checks: {}, db, loginAttemptsPerMinute: 1000 });

    for (const account of accounts) {
      expect(account.email).toMatch(/@bantaybuhay\.test$/);
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: account.email, password: account.password },
      });
      expect(response.statusCode).toBe(200);
    }
    await app.close();
  });

  it("gives every account its own password", async () => {
    const { accounts } = await seed(db);
    expect(new Set(accounts.map((item) => item.password)).size).toBe(20);
  });

  it("places every civilian and camera inside a Kabankalan barangay", async () => {
    await seed(db);
    const { rows } = await db.query(
      `SELECT (SELECT count(*)::int FROM civilian_profiles WHERE barangay_psgc IS NULL) AS "civiliansWithout",
              (SELECT count(DISTINCT barangay_psgc)::int FROM civilian_profiles) AS "civilianBarangays",
              (SELECT count(*)::int FROM cameras c JOIN barangays b ON b.psgc = c.barangay_psgc
               WHERE ST_Contains(b.boundary, c.location)) AS "camerasInside"`,
    );
    expect(rows[0]).toEqual({ civiliansWithout: 0, civilianBarangays: 10, camerasInside: 6 });
  });

  it("leaves an existing database alone", async () => {
    await seed(db);
    expect(await seed(db)).toEqual({ accounts: [], skipped: true, cameras: 0 });
  });
});

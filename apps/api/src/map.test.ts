import type { Role } from "@bantaybuhay/shared";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { seed } from "./seed.js";
import { createUser, PASSWORD, resetDb, testPool } from "./test-support/db.js";

const db = testPool();
const app = buildApp({ checks: {}, db, loginAttemptsPerMinute: 1000 });

async function cookiesFor(role: Role) {
  const user = await createUser(db, role);
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: user.email, password: PASSWORD },
  });
  return { bb_session: response.cookies.find((item) => item.name === "bb_session")!.value };
}

const get = async (url: string, role?: Role) =>
  app.inject({ method: "GET", url, cookies: role ? await cookiesFor(role) : {} });

beforeEach(() => resetDb(db));
afterAll(async () => {
  await app.close();
  await db.end();
});

describe("barangay boundaries", () => {
  it("returns all 32 Kabankalan barangays as GeoJSON to any signed-in user", async () => {
    const response = await get("/api/barangays", "civilian");

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.type).toBe("FeatureCollection");
    expect(body.features).toHaveLength(32);
    const names = body.features.map((feature: { properties: { name: string } }) => feature.properties.name);
    expect(names).toEqual(expect.arrayContaining(["Binicuil", "Tagukon", "Barangay 1"]));
    expect(body.features[0].geometry.type).toBe("MultiPolygon");
  });

  it("requires a session", async () => {
    expect((await get("/api/barangays")).statusCode).toBe(401);
  });
});

describe("cameras", () => {
  it("lists the seeded simulated cameras, each inside a barangay", async () => {
    await seed(db);
    const response = await get("/api/cameras", "operator");

    expect(response.statusCode).toBe(200);
    const { cameras } = response.json();
    expect(cameras.length).toBeGreaterThan(0);
    for (const camera of cameras) {
      expect(camera).toMatchObject({ isSimulated: true });
      expect(camera.barangayName).toBeTruthy();
    }
  });

  it("is closed to civilians", async () => {
    expect((await get("/api/cameras", "civilian")).statusCode).toBe(403);
  });
});

describe("responder roster", () => {
  it("lists responders with their unit for operators", async () => {
    await seed(db);
    const response = await get("/api/responders", "operator");

    expect(response.statusCode).toBe(200);
    const { responders } = response.json();
    expect(responders).toHaveLength(3);
    expect(responders[0]).toMatchObject({ activeAssignments: 0 });
    expect(responders[0].unit).toBeTruthy();
  });

  it("is closed to responders", async () => {
    expect((await get("/api/responders", "responder")).statusCode).toBe(403);
  });
});

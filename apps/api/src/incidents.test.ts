import type { Role } from "@bantaybuhay/shared";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { createUser, PASSWORD, resetDb, testPool } from "./test-support/db.js";

const db = testPool();
const app = buildApp({ checks: {}, db, loginAttemptsPerMinute: 1000 });

const newIncident = {
  incidentType: "fire_smoke",
  severity: "high",
  description: "Smoke near the public market",
  latitude: 9.9864,
  longitude: 122.8161,
};

interface Actor {
  id: string;
  cookies: Record<string, string>;
}

async function signedIn(role: Role): Promise<Actor> {
  const user = await createUser(db, role);
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: user.email, password: PASSWORD },
  });
  const cookie = response.cookies.find((item) => item.name === "bb_session")!;
  return { id: user.id, cookies: { bb_session: cookie.value } };
}

const report = (actor: Actor, payload: object = newIncident) =>
  app.inject({ method: "POST", url: "/api/incidents", cookies: actor.cookies, payload });

const setStatus = (actor: Actor, id: string, to: string) =>
  app.inject({
    method: "POST",
    url: `/api/incidents/${id}/status`,
    cookies: actor.cookies,
    payload: { to },
  });

const assign = (actor: Actor, id: string, responderId: string) =>
  app.inject({
    method: "POST",
    url: `/api/incidents/${id}/assignments`,
    cookies: actor.cookies,
    payload: { responderId },
  });

const listFor = async (actor: Actor) => {
  const response = await app.inject({
    method: "GET",
    url: "/api/incidents",
    cookies: actor.cookies,
  });
  return response.json().incidents as { id: string }[];
};

async function reportedId(operator: Actor) {
  return (await report(operator)).json().incident.id as string;
}

let operator: Actor;
let responder: Actor;

beforeEach(async () => {
  await resetDb(db);
  operator = await signedIn("operator");
  responder = await signedIn("responder");
});
afterAll(async () => {
  await app.close();
  await db.end();
});

describe("reporting an incident", () => {
  it("creates it as detected, at the given location", async () => {
    const response = await report(operator);

    expect(response.statusCode).toBe(201);
    expect(response.json().incident).toMatchObject({
      status: "detected",
      incidentType: "fire_smoke",
      latitude: 9.9864,
      longitude: 122.8161,
    });
  });

  it.each(["responder", "civilian"] as const)("is not open to a %s", async (role) => {
    expect((await report(await signedIn(role))).statusCode).toBe(403);
  });

  it.each([
    ["an unknown type", { ...newIncident, incidentType: "alien_invasion" }],
    ["an impossible latitude", { ...newIncident, latitude: 91 }],
    ["a missing location", { incidentType: "flood", severity: "low" }],
  ])("rejects %s", async (_label, payload) => {
    expect((await report(operator, payload)).statusCode).toBe(400);
  });
});

describe("location and acknowledgement", () => {
  it("names the barangay that contains the incident", async () => {
    const { rows } = await db.query<{ lat: number; lng: number }>(
      `SELECT ST_Y(ST_PointOnSurface(boundary)) AS lat, ST_X(ST_PointOnSurface(boundary)) AS lng
       FROM barangays WHERE name = 'Binicuil'`,
    );
    const inside = { ...newIncident, latitude: rows[0]!.lat, longitude: rows[0]!.lng };

    const response = await report(operator, inside);

    expect(response.json().incident.barangayName).toBe("Binicuil");
  });

  it("leaves the barangay empty for a point outside the city", async () => {
    const bacolod = { ...newIncident, latitude: 10.6765, longitude: 122.9509 };
    expect((await report(operator, bacolod)).json().incident.barangayName).toBeNull();
  });

  it("records the first acknowledgement and keeps it", async () => {
    const id = await reportedId(operator);
    const acknowledge = () =>
      app.inject({
        method: "POST",
        url: `/api/incidents/${id}/acknowledge`,
        cookies: operator.cookies,
      });

    const first = await acknowledge();
    const second = await acknowledge();

    expect(first.statusCode).toBe(200);
    expect(first.json().incident.acknowledgedAt).toBeTruthy();
    expect(second.json().incident.acknowledgedAt).toBe(first.json().incident.acknowledgedAt);
  });

  it("doesn't let a responder acknowledge", async () => {
    const id = await reportedId(operator);
    const response = await app.inject({
      method: "POST",
      url: `/api/incidents/${id}/acknowledge`,
      cookies: responder.cookies,
    });
    expect(response.statusCode).toBe(403);
  });

  it("lists the responders currently assigned", async () => {
    const id = await reportedId(operator);
    await setStatus(operator, id, "verified");
    const response = await assign(operator, id, responder.id);
    expect(response.statusCode).toBe(201);

    const detail = await app.inject({
      method: "GET",
      url: `/api/incidents/${id}`,
      cookies: operator.cookies,
    });
    expect(detail.json().incident.responders).toEqual([
      expect.objectContaining({ id: responder.id }),
    ]);
  });
});

describe("status flow", () => {
  it("runs from detected to resolved and keeps the history", async () => {
    const id = await reportedId(operator);

    expect((await setStatus(operator, id, "verified")).statusCode).toBe(200);
    expect((await assign(operator, id, responder.id)).statusCode).toBe(201);
    expect((await setStatus(operator, id, "dispatched")).statusCode).toBe(200);
    expect((await setStatus(responder, id, "on_scene")).statusCode).toBe(200);
    const resolved = await setStatus(responder, id, "resolved");

    expect(resolved.statusCode).toBe(200);
    expect(resolved.json().incident.status).toBe("resolved");
    expect(resolved.json().incident.resolvedAt).toBeTruthy();

    const detail = await app.inject({
      method: "GET",
      url: `/api/incidents/${id}`,
      cookies: operator.cookies,
    });
    const steps = detail.json().events.map((event: { toStatus: string }) => event.toStatus);
    expect(steps).toEqual(["detected", "verified", "dispatched", "on_scene", "resolved"]);
  });

  it("refuses to skip a step", async () => {
    const id = await reportedId(operator);
    expect((await setStatus(operator, id, "resolved")).statusCode).toBe(409);
  });

  it("refuses to dispatch with no responder assigned", async () => {
    const id = await reportedId(operator);
    await setStatus(operator, id, "verified");
    expect((await setStatus(operator, id, "dispatched")).statusCode).toBe(409);
  });

  it("lets an operator close a false alarm", async () => {
    const id = await reportedId(operator);
    const response = await setStatus(operator, id, "dismissed");
    expect(response.statusCode).toBe(200);
    expect(response.json().incident.status).toBe("dismissed");
  });

  it("applies only one of two identical simultaneous changes", async () => {
    const id = await reportedId(operator);
    const results = await Promise.all([
      setStatus(operator, id, "verified"),
      setStatus(operator, id, "verified"),
    ]);
    expect(results.map((item) => item.statusCode).sort()).toEqual([200, 409]);
  });

  it("returns 404 for an incident that doesn't exist", async () => {
    const response = await setStatus(
      operator,
      "00000000-0000-4000-8000-000000000000",
      "verified",
    );
    expect(response.statusCode).toBe(404);
  });

  it("records each change in the audit log", async () => {
    const id = await reportedId(operator);
    await setStatus(operator, id, "verified");
    const admin = await signedIn("admin");

    const response = await app.inject({
      method: "GET",
      url: "/api/audit-logs",
      cookies: admin.cookies,
    });

    expect(response.json().logs).toContainEqual(
      expect.objectContaining({
        action: "incident.status_changed",
        entityId: id,
        actorId: operator.id,
      }),
    );
  });
});

describe("responder limits", () => {
  it("blocks a responder from verifying or dismissing", async () => {
    const id = await reportedId(operator);
    expect((await setStatus(responder, id, "verified")).statusCode).toBe(403);
    expect((await setStatus(responder, id, "dismissed")).statusCode).toBe(403);
  });

  it("blocks a responder who isn't assigned to the incident", async () => {
    const id = await reportedId(operator);
    await setStatus(operator, id, "verified");
    await assign(operator, id, responder.id);
    await setStatus(operator, id, "dispatched");
    const other = await signedIn("responder");

    expect((await setStatus(other, id, "on_scene")).statusCode).toBe(404);
  });

  it("can only assign someone with the responder role", async () => {
    const id = await reportedId(operator);
    await setStatus(operator, id, "verified");
    const civilian = await signedIn("civilian");
    expect((await assign(operator, id, civilian.id)).statusCode).toBe(422);
  });

  it("refuses a second assignment of the same responder", async () => {
    const id = await reportedId(operator);
    await setStatus(operator, id, "verified");
    await assign(operator, id, responder.id);
    expect((await assign(operator, id, responder.id)).statusCode).toBe(409);
  });

  it("refuses assignment before an incident is verified", async () => {
    const id = await reportedId(operator);
    expect((await assign(operator, id, responder.id)).statusCode).toBe(409);
  });

  it("is not open to responders", async () => {
    const id = await reportedId(operator);
    await setStatus(operator, id, "verified");
    expect((await assign(responder, id, responder.id)).statusCode).toBe(403);
  });
});

describe("who can see incidents", () => {
  it("shows operators every incident", async () => {
    const id = await reportedId(operator);
    expect((await listFor(operator)).map((item) => item.id)).toEqual([id]);
  });

  it("shows a responder only incidents assigned to them", async () => {
    const assigned = await reportedId(operator);
    await reportedId(operator);
    await setStatus(operator, assigned, "verified");
    await assign(operator, assigned, responder.id);

    expect((await listFor(responder)).map((item) => item.id)).toEqual([assigned]);
  });

  it("hides an unassigned incident's details from a responder", async () => {
    const id = await reportedId(operator);
    const response = await app.inject({
      method: "GET",
      url: `/api/incidents/${id}`,
      cookies: responder.cookies,
    });
    expect(response.statusCode).toBe(404);
  });

  it("ends a responder's access when the incident resolves", async () => {
    const id = await reportedId(operator);
    await setStatus(operator, id, "verified");
    await assign(operator, id, responder.id);
    await setStatus(operator, id, "dispatched");
    await setStatus(responder, id, "on_scene");
    await setStatus(responder, id, "resolved");

    expect(await listFor(responder)).toEqual([]);
  });

  it("is closed to civilians", async () => {
    const civilian = await signedIn("civilian");
    const response = await app.inject({
      method: "GET",
      url: "/api/incidents",
      cookies: civilian.cookies,
    });
    expect(response.statusCode).toBe(403);
  });

  it("requires a session", async () => {
    const response = await app.inject({ method: "GET", url: "/api/incidents" });
    expect(response.statusCode).toBe(401);
  });
});

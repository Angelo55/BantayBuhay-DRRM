import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Role } from "@bantaybuhay/shared";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { seed } from "./seed.js";
import { createUser, PASSWORD, resetDb, testPool } from "./test-support/db.js";

const db = testPool();
const DETECTOR_TOKEN = "test-detector-token-0123456789abcdef";
const app = buildApp({
  checks: {},
  db,
  loginAttemptsPerMinute: 1000,
  detectorToken: DETECTOR_TOKEN,
  snapshotDir: mkdtempSync(join(tmpdir(), "bb-snapshots-")),
});

// The smallest valid JPEG header and end markers, enough to pass the type check.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);

let cameraId: string;

async function cookiesFor(role: Role) {
  const user = await createUser(db, role);
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: user.email, password: PASSWORD },
  });
  const value = response.cookies.find((item) => item.name === "bb_session")!.value;
  return { id: user.id, cookies: { bb_session: value } };
}

const detect = (overrides: object = {}, token = DETECTOR_TOKEN) =>
  app.inject({
    method: "POST",
    url: "/api/detections",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      cameraId,
      incidentType: "person_down",
      confidence: 0.9,
      modelVersion: "dfine-n-coco/person-down-v1",
      capturedAt: new Date().toISOString(),
      snapshot: JPEG.toString("base64"),
      ...overrides,
    },
  });

beforeEach(async () => {
  await resetDb(db);
  await seed(db);
  const { rows } = await db.query<{ id: string }>(
    "SELECT id FROM cameras WHERE name = 'Simulated camera, Binicuil'",
  );
  cameraId = rows[0]!.id;
});
afterAll(async () => {
  await app.close();
  await db.end();
});

describe("detector access", () => {
  it("refuses a detection without the detector token", async () => {
    expect((await detect({}, "wrong-token-but-long-enough-0123456789")).statusCode).toBe(401);
    const missing = await app.inject({ method: "POST", url: "/api/detections", payload: {} });
    expect(missing.statusCode).toBe(401);
  });

  it("refuses a user session in place of the detector token", async () => {
    const operator = await cookiesFor("operator");
    const response = await app.inject({
      method: "POST",
      url: "/api/detections",
      cookies: operator.cookies,
      payload: {},
    });
    expect(response.statusCode).toBe(401);
  });

  it("rejects a snapshot that isn't a JPEG", async () => {
    const response = await detect({ snapshot: Buffer.from("<svg/>").toString("base64") });
    expect(response.statusCode).toBe(400);
  });

  it("rejects an unknown camera", async () => {
    const response = await detect({ cameraId: "00000000-0000-4000-8000-000000000000" });
    expect(response.statusCode).toBe(422);
  });
});

describe("what a detection becomes", () => {
  it("raises a located incident when confidence is high", async () => {
    const response = await detect();

    expect(response.statusCode).toBe(201);
    expect(response.json().outcome).toBe("alerted");
    const operator = await cookiesFor("operator");
    const list = await app.inject({ method: "GET", url: "/api/incidents", cookies: operator.cookies });
    expect(list.json().incidents).toEqual([
      expect.objectContaining({
        incidentType: "person_down",
        status: "detected",
        source: "detection",
        cameraName: "Simulated camera, Binicuil",
        barangayName: "Binicuil",
        snapshotDetectionId: response.json().detection.id,
      }),
    ]);
  });

  it("adds repeat detections to the open incident instead of raising new ones", async () => {
    const first = await detect();
    const second = await detect({ confidence: 0.95 });

    expect(second.json().outcome).toBe("attached");
    expect(second.json().detection.incidentId).toBe(first.json().detection.incidentId);
  });

  it("raises a new incident once the earlier one is closed", async () => {
    const first = await detect();
    await db.query("UPDATE incidents SET status = 'resolved' WHERE id = $1", [
      first.json().detection.incidentId,
    ]);
    expect((await detect()).json().outcome).toBe("alerted");
  });

  it("sends a medium-confidence detection to the review queue", async () => {
    const response = await detect({ confidence: 0.45 });

    expect(response.statusCode).toBe(201);
    expect(response.json().outcome).toBe("queued");
    const operator = await cookiesFor("operator");
    const queue = await app.inject({
      method: "GET",
      url: "/api/detections?status=pending",
      cookies: operator.cookies,
    });
    expect(queue.json().detections).toEqual([
      expect.objectContaining({ id: response.json().detection.id, cameraName: "Simulated camera, Binicuil" }),
    ]);
    const incidents = await app.inject({ method: "GET", url: "/api/incidents", cookies: operator.cookies });
    expect(incidents.json().incidents).toEqual([]);
  });

  it("drops a low-confidence detection without storing it", async () => {
    const response = await detect({ confidence: 0.1 });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ outcome: "ignored" });
  });
});

describe("review queue", () => {
  it("raises an incident when an operator confirms a detection", async () => {
    const queued = (await detect({ confidence: 0.45 })).json().detection;
    const operator = await cookiesFor("operator");

    const response = await app.inject({
      method: "POST",
      url: `/api/detections/${queued.id}/review`,
      cookies: operator.cookies,
      payload: { decision: "confirm" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().detection).toMatchObject({ reviewStatus: "confirmed" });
    expect(response.json().incident).toMatchObject({ status: "detected", source: "detection" });
  });

  it("closes a rejected detection without an incident, and only once", async () => {
    const queued = (await detect({ confidence: 0.45 })).json().detection;
    const operator = await cookiesFor("operator");
    const review = () =>
      app.inject({
        method: "POST",
        url: `/api/detections/${queued.id}/review`,
        cookies: operator.cookies,
        payload: { decision: "reject" },
      });

    const first = await review();
    expect(first.json().detection.reviewStatus).toBe("rejected");
    expect((await review()).statusCode).toBe(409);
  });

  it("is closed to responders", async () => {
    const responder = await cookiesFor("responder");
    const response = await app.inject({
      method: "GET",
      url: "/api/detections?status=pending",
      cookies: responder.cookies,
    });
    expect(response.statusCode).toBe(403);
  });
});

describe("snapshots", () => {
  it("serves a snapshot to operators and logs the viewing", async () => {
    const detection = (await detect()).json().detection;
    const operator = await cookiesFor("operator");

    const response = await app.inject({
      method: "GET",
      url: `/api/detections/${detection.id}/snapshot`,
      cookies: operator.cookies,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/jpeg");
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.rawPayload.equals(JPEG)).toBe(true);
    const admin = await cookiesFor("admin");
    const logs = await app.inject({ method: "GET", url: "/api/audit-logs", cookies: admin.cookies });
    expect(logs.json().logs).toContainEqual(
      expect.objectContaining({ action: "detection.snapshot_viewed", actorId: operator.id }),
    );
  });

  it("hides a snapshot from a responder who isn't assigned", async () => {
    const detection = (await detect()).json().detection;
    const responder = await cookiesFor("responder");
    const response = await app.inject({
      method: "GET",
      url: `/api/detections/${detection.id}/snapshot`,
      cookies: responder.cookies,
    });
    expect(response.statusCode).toBe(404);
  });
});

describe("camera status", () => {
  it("lists cameras for the detector, and marks a camera online after a heartbeat", async () => {
    const auth = { authorization: `Bearer ${DETECTOR_TOKEN}` };
    const internal = await app.inject({ method: "GET", url: "/api/internal/cameras", headers: auth });
    expect(internal.json().cameras).toContainEqual(
      expect.objectContaining({ id: cameraId, streamPath: "sim/binicuil" }),
    );

    await app.inject({ method: "POST", url: `/api/cameras/${cameraId}/heartbeat`, headers: auth });

    const operator = await cookiesFor("operator");
    const cameras = await app.inject({ method: "GET", url: "/api/cameras", cookies: operator.cookies });
    const binicuil = cameras.json().cameras.find((item: { id: string }) => item.id === cameraId);
    expect(binicuil.status).toBe("online");
    const others = cameras.json().cameras.filter((item: { id: string }) => item.id !== cameraId);
    expect(others.every((item: { status: string }) => item.status === "offline")).toBe(true);
  });

  it("keeps the camera list from users", async () => {
    const operator = await cookiesFor("operator");
    const response = await app.inject({
      method: "GET",
      url: "/api/internal/cameras",
      cookies: operator.cookies,
    });
    expect(response.statusCode).toBe(401);
  });
});

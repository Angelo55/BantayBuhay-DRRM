import type { Role } from "@bantaybuhay/shared";
import { io, type Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { createUser, PASSWORD, resetDb, testPool } from "./test-support/db.js";

const db = testPool();
const app = buildApp({ checks: {}, db, loginAttemptsPerMinute: 1000 });
let baseUrl = "";
const sockets: Socket[] = [];

interface Actor {
  id: string;
  cookie: string;
}

async function signedIn(role: Role): Promise<Actor> {
  const user = await createUser(db, role);
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: user.email, password: PASSWORD },
  });
  const value = response.cookies.find((item) => item.name === "bb_session")!.value;
  return { id: user.id, cookie: `bb_session=${value}` };
}

function connect(cookie?: string) {
  const socket = io(baseUrl, {
    transports: ["websocket"],
    extraHeaders: cookie ? { cookie } : {},
    reconnection: false,
  });
  sockets.push(socket);
  return socket;
}

function connected(socket: Socket) {
  return new Promise<void>((resolve, reject) => {
    socket.on("connect", () => resolve());
    socket.on("connect_error", reject);
  });
}

function nextEvent<T>(socket: Socket, event: string, timeoutMs = 2000) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${event} within ${timeoutMs} ms`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

const post = (actor: Actor, url: string, payload: object = {}) =>
  app.inject({ method: "POST", url, headers: { cookie: actor.cookie }, payload });

const newIncident = {
  incidentType: "fire_smoke",
  severity: "critical",
  latitude: 9.9864,
  longitude: 122.8161,
};

beforeAll(async () => {
  baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });
});
beforeEach(() => resetDb(db));
afterEach(() => {
  for (const socket of sockets.splice(0)) socket.disconnect();
});
afterAll(async () => {
  await app.close();
  await db.end();
});

describe("live updates", () => {
  it("refuses a connection without a session", async () => {
    await expect(connected(connect())).rejects.toThrow(/unauthorized/);
  });

  it("tells every operator about a new incident within a second", async () => {
    const [reporter, watcher] = [await signedIn("operator"), await signedIn("operator")];
    const socket = connect(watcher.cookie);
    await connected(socket);

    const received = nextEvent<{ id: string; status: string }>(socket, "incident.created", 1000);
    const created = await post(reporter, "/api/incidents", newIncident);

    expect(await received).toMatchObject({ id: created.json().incident.id, status: "detected" });
  });

  it("tells a responder only about incidents assigned to them", async () => {
    const operator = await signedIn("operator");
    const responder = await signedIn("responder");
    const socket = connect(responder.cookie);
    await connected(socket);
    const unexpected: unknown[] = [];
    socket.on("incident.created", (payload) => unexpected.push(payload));

    const id = (await post(operator, "/api/incidents", newIncident)).json().incident.id;
    await post(operator, `/api/incidents/${id}/status`, { to: "verified" });
    const assigned = nextEvent<{ id: string; responders: { id: string }[] }>(
      socket,
      "incident.updated",
    );
    await post(operator, `/api/incidents/${id}/assignments`, { responderId: responder.id });

    const update = await assigned;
    expect(update.id).toBe(id);
    expect(update.responders.map((item) => item.id)).toEqual([responder.id]);
    expect(unexpected).toEqual([]);
  });

  it("tells the responder when an operator resolves their incident", async () => {
    const operator = await signedIn("operator");
    const responder = await signedIn("responder");
    const id = (await post(operator, "/api/incidents", newIncident)).json().incident.id;
    await post(operator, `/api/incidents/${id}/status`, { to: "verified" });
    await post(operator, `/api/incidents/${id}/assignments`, { responderId: responder.id });
    await post(operator, `/api/incidents/${id}/status`, { to: "dispatched" });
    await post(operator, `/api/incidents/${id}/status`, { to: "on_scene" });
    const socket = connect(responder.cookie);
    await connected(socket);

    const resolved = nextEvent<{ status: string }>(socket, "incident.updated");
    await post(operator, `/api/incidents/${id}/status`, { to: "resolved" });

    expect((await resolved).status).toBe("resolved");
  });
});

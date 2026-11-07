import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { createUser, PASSWORD, resetDb, testPool } from "./test-support/db.js";

const db = testPool();
const makeApp = (options = {}) => buildApp({ checks: {}, db, cookieSecure: true, ...options });

async function login(app: ReturnType<typeof makeApp>, email: string, password = PASSWORD) {
  return app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });
}

function sessionCookie(response: Awaited<ReturnType<typeof login>>) {
  const cookie = response.cookies.find((item) => item.name === "bb_session");
  return { bb_session: cookie!.value };
}

beforeEach(() => resetDb(db));
afterAll(() => db.end());

describe("login", () => {
  it("returns the user and sets a protected session cookie", async () => {
    const user = await createUser(db, "operator");
    const response = await login(makeApp(), user.email);

    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({ id: user.id, role: "operator" });
    expect(response.body).not.toContain("password");
    const cookie = response.cookies.find((item) => item.name === "bb_session")!;
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "Strict", path: "/" });
  });

  it("ignores letter case in the email", async () => {
    const user = await createUser(db, "admin");
    expect((await login(makeApp(), user.email.toUpperCase())).statusCode).toBe(200);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const user = await createUser(db, "admin");
    const app = makeApp();
    const wrongPassword = await login(app, user.email, "not the password");
    const unknownEmail = await login(app, "nobody@bantaybuhay.test");

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPassword.body).toBe(unknownEmail.body);
  });

  it("refuses a disabled account", async () => {
    const user = await createUser(db, "responder");
    await db.query("UPDATE users SET disabled_at = now() WHERE id = $1", [user.id]);
    expect((await login(makeApp(), user.email)).statusCode).toBe(401);
  });

  it("rejects a malformed request", async () => {
    const response = await makeApp().inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "not-an-email" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("limits repeated attempts", async () => {
    const app = makeApp({ loginAttemptsPerMinute: 2 });
    await login(app, "a@bantaybuhay.test");
    await login(app, "a@bantaybuhay.test");
    expect((await login(app, "a@bantaybuhay.test")).statusCode).toBe(429);
  });
});

describe("sessions", () => {
  it("identifies the signed-in user", async () => {
    const user = await createUser(db, "civilian");
    const app = makeApp();
    const cookies = sessionCookie(await login(app, user.email));

    const response = await app.inject({ method: "GET", url: "/api/auth/me", cookies });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.email).toBe(user.email);
  });

  it("rejects a request with no session or a made-up one", async () => {
    const app = makeApp();
    const anonymous = await app.inject({ method: "GET", url: "/api/auth/me" });
    const forged = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: { bb_session: "made-up" },
    });
    expect(anonymous.statusCode).toBe(401);
    expect(forged.statusCode).toBe(401);
  });

  it("rejects an expired session", async () => {
    const user = await createUser(db, "civilian");
    const app = makeApp({ sessionTtlMs: -1000 });
    const cookies = sessionCookie(await login(app, user.email));
    const response = await app.inject({ method: "GET", url: "/api/auth/me", cookies });
    expect(response.statusCode).toBe(401);
  });

  it("ends the session on logout", async () => {
    const user = await createUser(db, "civilian");
    const app = makeApp();
    const cookies = sessionCookie(await login(app, user.email));

    const logout = await app.inject({ method: "POST", url: "/api/auth/logout", cookies });
    const after = await app.inject({ method: "GET", url: "/api/auth/me", cookies });

    expect(logout.statusCode).toBe(204);
    expect(after.statusCode).toBe(401);
  });

  it("ends existing sessions when an account is disabled", async () => {
    const user = await createUser(db, "responder");
    const app = makeApp();
    const cookies = sessionCookie(await login(app, user.email));
    await db.query("UPDATE users SET disabled_at = now() WHERE id = $1", [user.id]);

    const response = await app.inject({ method: "GET", url: "/api/auth/me", cookies });
    expect(response.statusCode).toBe(401);
  });
});

describe("role checks", () => {
  it.each(["operator", "responder", "civilian"] as const)(
    "blocks %s from the user list",
    async (role) => {
      const user = await createUser(db, role);
      const app = makeApp();
      const cookies = sessionCookie(await login(app, user.email));
      const response = await app.inject({ method: "GET", url: "/api/users", cookies });
      expect(response.statusCode).toBe(403);
    },
  );

  it("lets an admin list users, without password data", async () => {
    const admin = await createUser(db, "admin");
    const app = makeApp();
    const cookies = sessionCookie(await login(app, admin.email));

    const response = await app.inject({ method: "GET", url: "/api/users", cookies });

    expect(response.statusCode).toBe(200);
    expect(response.json().users).toHaveLength(1);
    expect(response.body).not.toContain("argon2");
  });

  it("requires a session for the user list", async () => {
    const response = await makeApp().inject({ method: "GET", url: "/api/users" });
    expect(response.statusCode).toBe(401);
  });
});

describe("audit log", () => {
  it("records sign-ins and failures for admins to read", async () => {
    const admin = await createUser(db, "admin");
    const app = makeApp();
    await login(app, admin.email, "not the password");
    const cookies = sessionCookie(await login(app, admin.email));

    const response = await app.inject({ method: "GET", url: "/api/audit-logs", cookies });

    expect(response.statusCode).toBe(200);
    const actions = response.json().logs.map((log: { action: string }) => log.action);
    expect(actions).toEqual(expect.arrayContaining(["auth.login_failed", "auth.login"]));
    expect(response.body).not.toContain("not the password");
  });

  it("is closed to non-admins", async () => {
    const operator = await createUser(db, "operator");
    const app = makeApp();
    const cookies = sessionCookie(await login(app, operator.email));
    const response = await app.inject({ method: "GET", url: "/api/audit-logs", cookies });
    expect(response.statusCode).toBe(403);
  });

  it("can't be altered, even directly in the database", async () => {
    const admin = await createUser(db, "admin");
    await login(makeApp(), admin.email);
    await expect(db.query("DELETE FROM audit_logs")).rejects.toThrow(/append-only/);
  });
});

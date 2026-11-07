import type pg from "pg";
import { describe, expect, it } from "vitest";
import { buildApp as buildFullApp, type AppOptions } from "./app.js";

// Health routes never query this database.
const unusedDb = {} as pg.Pool;
const buildApp = (options: Pick<AppOptions, "checks" | "checkTimeoutMs">) =>
  buildFullApp({ ...options, db: unusedDb });

const healthy = async () => {};
const failing = async () => {
  throw new Error("postgres://user:secret@db refused");
};

describe("GET /api/healthz", () => {
  it("reports the process alive even when a dependency is down", async () => {
    const app = buildApp({ checks: { postgres: failing } });

    const response = await app.inject({ method: "GET", url: "/api/healthz" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});

describe("GET /api/readyz", () => {
  it("is ready when every dependency responds", async () => {
    const app = buildApp({ checks: { postgres: healthy, storage: healthy } });

    const response = await app.inject({ method: "GET", url: "/api/readyz" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ready",
      checks: { postgres: "ok", storage: "ok" },
    });
  });

  it("returns 503 and names the dependency that failed", async () => {
    const app = buildApp({ checks: { postgres: failing, storage: healthy } });

    const response = await app.inject({ method: "GET", url: "/api/readyz" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      status: "not_ready",
      checks: { postgres: "down", storage: "ok" },
    });
  });

  it("does not expose error details to callers", async () => {
    const app = buildApp({ checks: { postgres: failing } });

    const response = await app.inject({ method: "GET", url: "/api/readyz" });

    expect(response.body).not.toContain("secret");
  });

  it("treats a dependency that hangs as down", async () => {
    const app = buildApp({
      checks: { postgres: () => new Promise(() => {}) },
      checkTimeoutMs: 10,
    });

    const response = await app.inject({ method: "GET", url: "/api/readyz" });

    expect(response.statusCode).toBe(503);
    expect(response.json().checks.postgres).toBe("down");
  });
});

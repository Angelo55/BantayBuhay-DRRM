import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const valid = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  REDIS_URL: "redis://:pass@localhost:6379",
};

describe("loadConfig", () => {
  it("applies defaults for the host and port", () => {
    expect(loadConfig(valid)).toMatchObject({ host: "0.0.0.0", port: 3000 });
  });

  it("reads the port from the environment as a number", () => {
    expect(loadConfig({ ...valid, PORT: "4000" }).port).toBe(4000);
  });

  it("refuses to start without a database URL", () => {
    expect(() => loadConfig({ REDIS_URL: valid.REDIS_URL })).toThrow(/DATABASE_URL/);
  });

  it("does not repeat a secret value in its error", () => {
    expect(() => loadConfig({ ...valid, REDIS_URL: "not a url with s3cret" })).not.toThrow(
      /s3cret/,
    );
  });
});

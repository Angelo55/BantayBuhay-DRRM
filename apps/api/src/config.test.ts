import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const valid = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
};

describe("loadConfig", () => {
  it("applies defaults for the host and port", () => {
    expect(loadConfig(valid)).toMatchObject({ host: "0.0.0.0", port: 3000 });
  });

  it("reads the port from the environment as a number", () => {
    expect(loadConfig({ ...valid, PORT: "4000" }).port).toBe(4000);
  });

  it("refuses to start without a database URL", () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it("does not repeat a secret value in its error", () => {
    expect(() => loadConfig({ DATABASE_URL: "not a url with s3cret" })).not.toThrow(/s3cret/);
  });

  it("stores snapshots nowhere unless told where", () => {
    expect(loadConfig(valid).snapshots).toEqual({ kind: "none" });
  });

  it("uses a local folder when one is given", () => {
    expect(loadConfig({ ...valid, SNAPSHOT_DIR: "./snapshots" }).snapshots).toEqual({
      kind: "folder",
      dir: "./snapshots",
    });
  });

  it("prefers Supabase Storage and trims a trailing slash from its URL", () => {
    const config = loadConfig({
      ...valid,
      SNAPSHOT_DIR: "./snapshots",
      SUPABASE_URL: "https://example.supabase.co/",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
    });
    expect(config.snapshots).toEqual({
      kind: "supabase",
      url: "https://example.supabase.co",
      serviceRoleKey: "test-service-role-key-not-real",
      bucket: "snapshots",
    });
  });

  it("refuses half a Supabase configuration", () => {
    expect(() => loadConfig({ ...valid, SUPABASE_URL: "https://example.supabase.co" })).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
  });
});

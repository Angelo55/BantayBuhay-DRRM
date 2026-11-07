import { readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { MIGRATIONS_DIR } from "./migrate.js";
import { parseMigrationFile, planMigrations } from "./push-migrations.js";

describe("planMigrations", () => {
  const files = ["20261107140054_detections.sql", "20261107135943_core_domain.sql", "README.md"];

  it("lists files Supabase hasn't applied, oldest first", () => {
    const plan = planMigrations(files, []);
    expect(plan.pending.map((migration) => migration.name)).toEqual(["core_domain", "detections"]);
  });

  it("skips what Supabase already applied", () => {
    const plan = planMigrations(files, ["20261107135943"]);
    expect(plan.pending.map((migration) => migration.version)).toEqual(["20261107140054"]);
    expect(planMigrations(files, ["20261107135943", "20261107140054"]).pending).toEqual([]);
  });

  it("reports migrations applied on Supabase that this folder doesn't have", () => {
    expect(planMigrations(files, ["20261107135943", "20261201000000"]).unknown).toEqual(["20261201000000"]);
  });

  it("refuses SQL files that don't follow the naming convention", () => {
    const plan = planMigrations([...files, "fix.sql"], []);
    expect(plan.invalid).toEqual(["fix.sql"]);
    expect(plan.pending).toHaveLength(2);
  });

  it("can read every file in supabase/migrations", async () => {
    const all = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql"));
    expect(all.length).toBeGreaterThan(0);
    expect(all.map(parseMigrationFile).every(Boolean)).toBe(true);
  });
});

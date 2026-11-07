// Applies new files in supabase/migrations to Supabase, the way `supabase db push` does, using the
// connection in apps/api/.env.
//
//   npm run db:migrate              lists what would run, changes nothing
//   npm run db:migrate -- --apply   applies it
//
// Supabase records applied migrations in supabase_migrations.schema_migrations (the dashboard, the
// CLI and the MCP server all write there), so this reads the same table and skips what's in it.
// The local test database keeps its own list instead (see migrate.ts) and is refused here.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createPool } from "./database.js";
import { MIGRATIONS_DIR } from "./migrate.js";

export interface MigrationFile {
  version: string;
  name: string;
  file: string;
}

// Files are named <version>_<name>.sql, the Supabase CLI's convention.
export function parseMigrationFile(file: string): MigrationFile | null {
  const match = /^(\d{14})_(.+)\.sql$/.exec(file);
  return match ? { version: match[1]!, name: match[2]!, file } : null;
}

export function planMigrations(files: string[], appliedVersions: string[]) {
  const applied = new Set(appliedVersions);
  const parsed = files.filter((file) => file.endsWith(".sql")).map((file) => ({ file, migration: parseMigrationFile(file) }));
  const invalid = parsed.filter((entry) => !entry.migration).map((entry) => entry.file);
  const migrations = parsed.flatMap((entry) => (entry.migration ? [entry.migration] : []));
  migrations.sort((a, b) => a.version.localeCompare(b.version));
  const known = new Set(migrations.map((migration) => migration.version));
  return {
    pending: migrations.filter((migration) => !applied.has(migration.version)),
    // Applied on Supabase but missing here: someone changed the database outside this folder.
    unknown: appliedVersions.filter((version) => !known.has(version)).sort(),
    invalid,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL isn't set. Fill in apps/api/.env first.");
  const pool = createPool({ databaseUrl, databaseCaFile: process.env.DATABASE_CA_FILE });
  const client = await pool.connect();
  try {
    const table = await client.query<{ exists: boolean }>(
      "SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS exists",
    );
    if (!table.rows[0]?.exists) {
      throw new Error("This database has no Supabase migration history, so it isn't the Supabase project. Nothing was changed.");
    }
    const applied = await client.query<{ version: string }>("SELECT version FROM supabase_migrations.schema_migrations");
    const plan = planMigrations(
      await readdir(MIGRATIONS_DIR),
      applied.rows.map((row) => row.version),
    );

    for (const file of plan.invalid) console.log(`Skipped ${file}: names must look like 20261107135943_name.sql`);
    for (const version of plan.unknown) {
      console.log(`Warning: Supabase has migration ${version}, which isn't in supabase/migrations. Add it before changing the schema again.`);
    }
    console.log(`${applied.rowCount} migrations already applied on Supabase.`);
    if (plan.pending.length === 0) {
      console.log("Supabase is up to date. Nothing to apply.");
      return;
    }
    console.log(`${plan.pending.length} to apply:`);
    for (const migration of plan.pending) console.log(`  ${migration.file}`);
    if (!apply) {
      console.log("\nNothing was changed. To apply them, run: npm run db:migrate -- --apply");
      return;
    }

    for (const migration of plan.pending) {
      const sql = await readFile(MIGRATIONS_DIR + migration.file, "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES ($1, $2, $3)", [
          migration.version,
          migration.name,
          [sql],
        ]);
        await client.query("COMMIT");
        console.log(`Applied ${migration.file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`${migration.file} failed and was rolled back: ${error instanceof Error ? error.message : error}`, {
          cause: error,
        });
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

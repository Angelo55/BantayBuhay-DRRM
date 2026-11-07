import type { Role } from "@bantaybuhay/shared";
import pg from "pg";
import { hashPassword } from "../password.js";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://bantaybuhay:test-only@127.0.0.1:55432/bantaybuhay_test";

export const PASSWORD = "correct horse battery staple";

export function testPool() {
  return new pg.Pool({ connectionString: TEST_DATABASE_URL });
}

export async function resetDb(db: pg.Pool) {
  await db.query(
    "TRUNCATE users, sessions, incidents, incident_events, assignments, audit_logs CASCADE",
  );
}

let sequence = 0;

export async function createUser(db: pg.Pool, role: Role) {
  sequence += 1;
  const email = `${role}${sequence}@bantaybuhay.test`;
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [email, await hashPassword(PASSWORD), `Test ${role}`, role],
  );
  return { id: rows[0]!.id, email, role };
}

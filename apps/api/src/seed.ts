import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { Role } from "@bantaybuhay/shared";
import pg from "pg";
import { hashPassword } from "./password.js";

// Every person here is invented. Emails use .test, a domain reserved for testing.
const PEOPLE: { name: string; role: Role; unit?: string; birthDate?: string }[] = [
  { name: "Liza Dimaculangan", role: "admin" },
  { name: "Ramon Salvacion", role: "admin" },
  { name: "Carmela Javellana", role: "operator" },
  { name: "Noel Tupas", role: "operator" },
  { name: "Grace Magbanua", role: "operator" },
  { name: "Arnel Sobrevega", role: "operator" },
  { name: "Joy Palmares", role: "operator" },
  { name: "Dennis Alipao", role: "responder", unit: "Fire Response" },
  { name: "Mylene Gatuslao", role: "responder", unit: "Emergency Medical" },
  { name: "Rodel Hechanova", role: "responder", unit: "Search and Rescue" },
  { name: "Analyn Depra", role: "civilian", birthDate: "1988-03-14" },
  { name: "Bernie Lacson", role: "civilian", birthDate: "1975-07-02" },
  { name: "Cecilia Mabaquiao", role: "civilian", birthDate: "1963-11-23" },
  { name: "Danilo Parreno", role: "civilian", birthDate: "1991-05-30" },
  { name: "Elena Sumagaysay", role: "civilian", birthDate: "2001-01-17" },
  { name: "Felix Tolentin", role: "civilian", birthDate: "1956-09-08" },
  { name: "Gemma Vilches", role: "civilian", birthDate: "1984-12-11" },
  { name: "Hector Yanson", role: "civilian", birthDate: "1997-06-25" },
  { name: "Irene Zerrudo", role: "civilian", birthDate: "1979-04-19" },
  { name: "Jomar Abello", role: "civilian", birthDate: "2003-08-06" },
];

export interface SeededAccount {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

export async function seed(db: pg.Pool) {
  const existing = await db.query("SELECT 1 FROM users LIMIT 1");
  if (existing.rowCount) return { accounts: [] as SeededAccount[], skipped: true };

  const accounts: SeededAccount[] = [];
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    for (const person of PEOPLE) {
      const email = `${person.name.toLowerCase().replace(/\s+/g, ".")}@bantaybuhay.test`;
      const password = randomBytes(12).toString("base64url");
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [email, await hashPassword(password), person.name, person.role],
      );
      const id = rows[0]!.id;
      if (person.role === "responder") {
        await client.query("INSERT INTO responder_profiles (user_id, unit) VALUES ($1, $2)", [
          id,
          person.unit,
        ]);
      }
      if (person.role === "civilian") {
        await client.query(
          `INSERT INTO civilian_profiles (user_id, birth_date, medical_id_token)
           VALUES ($1, $2, $3)`,
          [id, person.birthDate, randomBytes(24).toString("base64url")],
        );
      }
      accounts.push({ email, password, fullName: person.name, role: person.role });
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return { accounts, skipped: false };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  if (process.env.ALLOW_SEED !== "true") throw new Error("Set ALLOW_SEED=true to seed test accounts");
  const db = new pg.Pool({ connectionString: url });
  // Stdout carries only the credentials, so it can be redirected to a git-ignored file.
  console.log(JSON.stringify(await seed(db), null, 2));
  await db.end();
}

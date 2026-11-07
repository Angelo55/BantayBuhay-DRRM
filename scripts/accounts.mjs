// Shows the fictional test accounts created by npm run db:seed, for signing in by hand.
//
//   npm run accounts                    every account with its password
//   npm run accounts -- --no-passwords  without passwords, for sharing a screen or a log
//
// The passwords live only in the git-ignored seed-credentials.local.json on this computer.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "seed-credentials.local.json");
const ROLE_NAME = { admin: "Admin", operator: "DRRM operator", responder: "Responder", civilian: "Civilian" };
const showPasswords = !process.argv.includes("--no-passwords");

if (!existsSync(FILE)) {
  console.error("No seed-credentials.local.json yet. Run npm run db:seed first.");
  process.exit(1);
}

const accounts = JSON.parse(readFileSync(FILE, "utf8"));
const rows = accounts.map((account) => [
  ROLE_NAME[account.role] ?? account.role,
  account.fullName,
  account.email,
  ...(showPasswords ? [account.password] : []),
]);
const header = ["Role", "Name", "Email", ...(showPasswords ? ["Password"] : [])];
const widths = header.map((title, column) => Math.max(title.length, ...rows.map((row) => row[column].length)));
const line = (cells) => cells.map((cell, column) => cell.padEnd(widths[column])).join("  ");

console.log(line(header));
console.log(widths.map((width) => "-".repeat(width)).join("  "));
for (const row of rows) console.log(line(row));
console.log("\nSign in at http://127.0.0.1:5173 while npm run dev is running. These accounts are fictional test data.");

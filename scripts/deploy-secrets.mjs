// Copies the server's secrets into AWS SSM Parameter Store (Singapore), encrypted, so the servers
// can read them at deploy time. Run it yourself after the AWS permissions are in place:
//
//   npm run deploy:secrets
//
// It reads the database and storage settings from apps/api/.env, creates a new detector token
// for the servers (different from your laptop's), and prints only parameter names, never values.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REGION = "ap-southeast-1";
const AWS = process.platform === "win32" && existsSync("C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe")
  ? "C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe"
  : "aws";

const envFile = join(ROOT, "apps", "api", ".env");
if (!existsSync(envFile)) {
  console.error("apps/api/.env is missing. Fill it in first (npm run setup creates it).");
  process.exit(1);
}
const env = parseEnv(readFileSync(envFile, "utf8"));

// /bantaybuhay/api/ is readable only by the web server; /bantaybuhay/shared/ by both servers.
const parameters = [
  ["/bantaybuhay/api/DATABASE_URL", env.DATABASE_URL],
  ["/bantaybuhay/api/SUPABASE_URL", env.SUPABASE_URL],
  ["/bantaybuhay/api/SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY],
  ["/bantaybuhay/shared/DETECTOR_TOKEN", randomBytes(32).toString("hex")],
];

const missing = parameters.filter(([, value]) => !value).map(([name]) => name.split("/").pop());
if (missing.length) {
  console.error(`apps/api/.env doesn't set: ${missing.join(", ")}`);
  process.exit(1);
}

const scratch = mkdtempSync(join(tmpdir(), "bb-secrets-"));
process.on("exit", () => rmSync(scratch, { recursive: true, force: true }));

for (const [name, value] of parameters) {
  // The value goes in through a private temporary file, so it never appears in a command line,
  // the process list or a log. The folder is deleted when the script ends.
  const inputFile = join(scratch, "input.json");
  writeFileSync(inputFile, JSON.stringify({ Name: name, Value: value, Type: "SecureString", Overwrite: true }), {
    mode: 0o600,
  });
  const result = spawnSync(
    AWS,
    ["ssm", "put-parameter", "--region", REGION, "--cli-input-json", `file://${inputFile}`, "--output", "text"],
    { encoding: "utf8", windowsHide: true },
  );
  rmSync(inputFile, { force: true });
  if (result.status !== 0) {
    console.error(`Couldn't save ${name}: ${(result.stderr || "").split("\n")[0]}`);
    console.error("Check that the BantayBuhayServerSetup policy is attached to bantaybuhay-dev (infra/aws/README.md).");
    process.exit(1);
  }
  console.log(`Saved ${name}`);
}
console.log("\nAll server secrets are in Parameter Store, encrypted. The next deploy picks them up.");

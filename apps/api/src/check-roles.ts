// Signs in as one seeded account of each role through the running API, and checks what each
// role can and can't reach. Start the API first (npm run dev), then: npm run check:roles
//
// Passwords are read from the git-ignored seed-credentials.local.json and never printed.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Role } from "@bantaybuhay/shared";
import type { SeededAccount } from "./seed.js";

const BASE = (process.env.API_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const CREDENTIALS = fileURLToPath(new URL("../../../seed-credentials.local.json", import.meta.url));

// What each role should get from each endpoint: 200 allowed, 403 refused.
const EXPECTED: Record<string, Record<Role, number>> = {
  "/api/auth/me": { admin: 200, operator: 200, responder: 200, civilian: 200 },
  "/api/barangays": { admin: 200, operator: 200, responder: 200, civilian: 200 },
  "/api/incidents": { admin: 200, operator: 200, responder: 200, civilian: 403 },
  "/api/cameras": { admin: 200, operator: 200, responder: 200, civilian: 403 },
  "/api/responders": { admin: 200, operator: 200, responder: 403, civilian: 403 },
  "/api/detections": { admin: 200, operator: 200, responder: 403, civilian: 403 },
  "/api/users": { admin: 200, operator: 403, responder: 403, civilian: 403 },
  "/api/audit-logs": { admin: 200, operator: 403, responder: 403, civilian: 403 },
};

let failures = 0;
function report(ok: boolean, label: string, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `: ${detail}` : ""}`);
  if (!ok) failures += 1;
}

let accounts: SeededAccount[];
try {
  accounts = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as SeededAccount[];
} catch {
  console.error("seed-credentials.local.json is missing. Run npm run db:seed first.");
  process.exit(1);
}

try {
  await fetch(`${BASE}/api/healthz`, { signal: AbortSignal.timeout(3000) });
} catch {
  console.error(`The API isn't answering at ${BASE}. Start it with npm run dev, then run this again.`);
  process.exit(1);
}

for (const role of ["admin", "operator", "responder", "civilian"] as const) {
  const account = accounts.find((item) => item.role === role);
  if (!account) {
    report(false, `${role}: an account exists in the credentials file`);
    continue;
  }
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  report(login.status === 200 && Boolean(cookie), `${role}: signs in as ${account.fullName}`, login.status === 200 ? "" : `HTTP ${login.status}`);
  if (!cookie) continue;

  const wrong: string[] = [];
  for (const [path, expected] of Object.entries(EXPECTED)) {
    const response = await fetch(`${BASE}${path}`, { headers: { cookie } });
    if (response.status !== expected[role]) wrong.push(`${path} gave ${response.status}, expected ${expected[role]}`);
    if (response.ok && path === "/api/barangays") {
      const body = (await response.json()) as { features: unknown[] };
      if (body.features.length !== 32) wrong.push(`${body.features.length} barangays instead of 32`);
    } else if (response.ok && path === "/api/cameras") {
      const body = (await response.json()) as { cameras: unknown[] };
      if (body.cameras.length !== 6) wrong.push(`${body.cameras.length} cameras instead of 6`);
    } else {
      await response.arrayBuffer();
    }
  }
  const allowed = Object.values(EXPECTED).filter((expected) => expected[role] === 200).length;
  report(wrong.length === 0, `${role}: reaches its ${allowed} allowed endpoints and is refused the rest`, wrong.join("; "));

  const logout = await fetch(`${BASE}/api/auth/logout`, { method: "POST", headers: { cookie } });
  const after = await fetch(`${BASE}/api/auth/me`, { headers: { cookie } });
  report(logout.status === 204 && after.status === 401, `${role}: signs out, and the old session stops working`);
}

process.exitCode = failures ? 1 : 0;

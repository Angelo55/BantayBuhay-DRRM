// Starts the detection service from its Python virtual environment, natively.
//
//   npm run dev:inference
//
// Settings come from services/inference/.env (see .env.example there). The detector token is read
// from apps/api/.env when it isn't set, so the shared secret lives in one place.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SERVICE = join(ROOT, "services", "inference");
const python = join(SERVICE, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");

if (!existsSync(python)) {
  console.error("The detection service's Python environment is missing. Run: npm run setup");
  process.exit(1);
}

const readEnv = (path) => (existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {});
const env = { ...readEnv(join(SERVICE, ".env")), ...process.env };
env.DETECTOR_TOKEN ??= readEnv(join(ROOT, "apps", "api", ".env")).DETECTOR_TOKEN;
// Laptop defaults. Measured on the i3 laptop: one camera at 1 fps uses about 0.8 of a core; all six
// at 2 fps use about 4.3 cores and still fall behind. The server's systemd unit sets its own values.
env.CAMERA_LIMIT ??= "1";
env.FRAMES_PER_SECOND ??= "1";
if (!env.DETECTOR_TOKEN) {
  console.error("No DETECTOR_TOKEN in services/inference/.env or apps/api/.env, so detection would be off.");
  process.exit(1);
}

const child = spawn(
  python,
  ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", env.INFERENCE_PORT ?? "8000"],
  { cwd: SERVICE, env, stdio: "inherit", windowsHide: true },
);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));

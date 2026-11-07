// Prepares a fresh clone for development, natively (no Docker). Safe to run again.
//
//   npm install
//   npm run setup
//
// It builds the shared package, creates apps/api/.env from the template if it's missing, creates
// the detection service's Python environment, downloads and checks the detection model, and
// downloads the test database binaries.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INFERENCE = join(ROOT, "services", "inference");
const WINDOWS = process.platform === "win32";
const VENV_PYTHON = join(INFERENCE, ".venv", WINDOWS ? "Scripts/python.exe" : "bin/python");

// D-FINE-N trained on COCO, Apache 2.0, from https://huggingface.co/ustc-community/dfine-nano-coco.
const MODEL = {
  url: "https://huggingface.co/onnx-community/dfine_n_coco-ONNX/resolve/main/onnx/model.onnx",
  path: join(INFERENCE, "models", "dfine_n_coco.onnx"),
  sha256: "0f684f409618ee8a822410e754a29caa817d1aa16283ce89cad936d0a48e2f35",
};

const notes = [];
const step = (text) => console.log(`\n> ${text}`);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", windowsHide: true, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
}

// npm sets npm_execpath when it runs this script; calling it through node avoids needing a shell.
const npm = (...args) =>
  process.env.npm_execpath ? run(process.execPath, [process.env.npm_execpath, ...args]) : run(WINDOWS ? "npm.cmd" : "npm", args, { shell: WINDOWS });

async function sha256(path) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(path), hash);
  return hash.digest("hex");
}

function findPython() {
  // The detection service is pinned to Python 3.12, like the server.
  const candidates = WINDOWS ? [["py", ["-3.12"]], ["python", []]] : [["python3.12", []], ["python3", []]];
  for (const [command, prefix] of candidates) {
    const result = spawnSync(command, [...prefix, "--version"], { encoding: "utf8", windowsHide: true });
    if (result.status === 0 && /Python 3\.12\./.test(`${result.stdout}${result.stderr}`)) return [command, prefix];
  }
  return null;
}

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 24 || (major === 24 && minor < 7)) {
  console.error(`Node ${process.versions.node} is too old: BantayBuhay needs 24.7 or newer for built-in Argon2.`);
  process.exit(1);
}
if (!existsSync(join(ROOT, "node_modules"))) {
  console.error("Run npm install first, then npm run setup.");
  process.exit(1);
}

try {
  step("Building the shared package");
  npm("run", "build", "-w", "@bantaybuhay/shared");

  step("API settings");
  const apiEnv = join(ROOT, "apps", "api", ".env");
  if (existsSync(apiEnv)) {
    console.log("apps/api/.env exists, left as it is.");
  } else {
    copyFileSync(join(ROOT, "apps", "api", ".env.example"), apiEnv);
    console.log("Created apps/api/.env from the template.");
    notes.push("Fill in apps/api/.env (database, certificate, secret key, detector token), then run: npm run db:check -w apps/api");
  }

  step("Detection service: Python environment");
  if (existsSync(VENV_PYTHON)) {
    console.log("services/inference/.venv exists.");
  } else {
    const python = findPython();
    if (!python) throw new Error("Python 3.12 wasn't found. Install it from python.org, then run npm run setup again.");
    run(python[0], [...python[1], "-m", "venv", join(INFERENCE, ".venv")]);
  }
  run(VENV_PYTHON, ["-m", "pip", "install", "--quiet", "--disable-pip-version-check", "-r", join(INFERENCE, "requirements-dev.txt")]);

  step("Detection model");
  if (existsSync(MODEL.path) && (await sha256(MODEL.path)) === MODEL.sha256) {
    console.log("Model present and checked.");
  } else {
    mkdirSync(dirname(MODEL.path), { recursive: true });
    console.log("Downloading the D-FINE-N model (about 15 MB)...");
    const response = await fetch(MODEL.url);
    if (!response.ok || !response.body) throw new Error(`Model download failed (${response.status})`);
    const partial = `${MODEL.path}.partial`;
    await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
    if ((await sha256(partial)) !== MODEL.sha256) {
      rmSync(partial, { force: true });
      throw new Error("The downloaded model doesn't match its pinned checksum, so it wasn't used.");
    }
    renameSync(partial, MODEL.path);
    console.log("Model downloaded and checked.");
  }

  if (WINDOWS) {
    step("Test database binaries");
    run(process.execPath, [join(ROOT, "scripts", "test-db.mjs"), "install"]);
  }

  console.log("\nSetup finished.");
  for (const note of notes) console.log(`- ${note}`);
  console.log("- Start the app: npm run dev   (add the detection service with: npm run dev:all)");
} catch (error) {
  console.error(`\nSetup stopped: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

// Stops BantayBuhay's development servers if any are still running, for example after a closed
// terminal left them behind. Ctrl+C in the terminal running npm run dev is the normal way to stop.
//
//   npm run stop
//
// It only stops Node or Python processes listening on the API (3000), web (5173) and detector
// (8000) ports, so other programs are never touched.
import { spawnSync } from "node:child_process";

const PORTS = [3000, 5173, 8000];
const ALLOWED = new Set(["node", "python", "pythonw"]);

if (process.platform !== "win32") {
  console.error("npm run stop is for Windows. Elsewhere, stop the servers with Ctrl+C.");
  process.exit(1);
}

function powershell(command) {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error(result.stderr.trim() || "PowerShell failed");
  return result.stdout.trim();
}

// Finding nothing counts as an error in PowerShell, so the listing always ends with "exit 0".
const listing = powershell(
  `$found = @(Get-NetTCPConnection -State Listen -LocalPort ${PORTS.join(",")} -ErrorAction SilentlyContinue | ` +
    "ForEach-Object { $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; " +
    "[pscustomobject]@{ port = $_.LocalPort; pid = $_.OwningProcess; name = $p.ProcessName } }); " +
    "if ($found.Count) { $found | ConvertTo-Json -Compress }; exit 0",
);
const found = listing ? [].concat(JSON.parse(listing)) : [];

if (found.length === 0) {
  console.log("No BantayBuhay servers are running.");
  process.exit(0);
}
for (const { port, pid, name } of found) {
  if (!ALLOWED.has(String(name).toLowerCase())) {
    console.log(`Port ${port} is used by ${name} (${pid}), which isn't a BantayBuhay server, so it was left alone.`);
    continue;
  }
  powershell(`Stop-Process -Id ${Number(pid)} -Force`);
  console.log(`Stopped ${name} on port ${port}.`);
}

// Stops BantayBuhay's development servers if any are still running, for example after a closed
// terminal left them behind. Ctrl+C in the terminal running npm run dev is the normal way to stop.
//
//   npm run stop
//
// For each of the API (3000), web (5173) and detector (8000) ports, it finds the process
// listening there and walks up to the top of BantayBuhay's own process tree: npm, concurrently,
// the tsx watcher that would restart the API, the Python launcher that would keep the detector
// running. It closes that whole tree. The walk stops at anything else, such as your terminal or
// VS Code, so other programs are never touched.
import { spawnSync } from "node:child_process";

if (process.platform !== "win32") {
  console.error("npm run stop is for Windows. Elsewhere, stop the servers with Ctrl+C.");
  process.exit(1);
}

const SCRIPT = String.raw`
$ports = 3000, 5173, 8000
$ours = 'BantayBuhay\\app|concurrently|npm-cli\.js|npm run|/c vite|tsx|uvicorn|run-inference'
$names = 'node.exe', 'cmd.exe', 'python.exe', 'pythonw.exe'
$byId = @{}
Get-CimInstance Win32_Process | ForEach-Object { $byId[[int]$_.ProcessId] = $_ }
$trees = @{}
foreach ($listener in @(Get-NetTCPConnection -State Listen -LocalPort $ports -ErrorAction SilentlyContinue)) {
  $process = $byId[[int]$listener.OwningProcess]
  if (-not $process -or $names -notcontains $process.Name.ToLower()) {
    "OTHER|$($listener.LocalPort)|$($process.Name)"
    continue
  }
  $top = $process
  while ($true) {
    $parent = $byId[[int]$top.ParentProcessId]
    if (-not $parent -or $names -notcontains $parent.Name.ToLower() -or $parent.CommandLine -notmatch $ours) { break }
    $top = $parent
  }
  $id = [int]$top.ProcessId
  if ($trees.ContainsKey($id)) { $trees[$id] += ", $($listener.LocalPort)" } else { $trees[$id] = "$($listener.LocalPort)" }
}
# Second pass: BantayBuhay's own dev commands that no longer hold a port but would restart a server,
# such as a tsx watcher whose API was stopped. Matched only by commands specific to this project.
$specific = 'run dev:(api|web|all|inference)|@bantaybuhay/|concurrently.*--names api,web|run-inference\.mjs|uvicorn app\.main:app|tsx\S* watch --env-file-if-exists=\.env src/server\.ts'
foreach ($process in $byId.Values) {
  if ($names -notcontains $process.Name.ToLower() -or $process.CommandLine -notmatch $specific) { continue }
  $top = $process
  while ($true) {
    $parent = $byId[[int]$top.ParentProcessId]
    if (-not $parent -or $names -notcontains $parent.Name.ToLower() -or $parent.CommandLine -notmatch $ours) { break }
    $top = $parent
  }
  $id = [int]$top.ProcessId
  if (-not $trees.ContainsKey($id)) { $trees[$id] = "" }
}
foreach ($id in $trees.Keys) {
  taskkill /PID $id /T /F | Out-Null
  "STOPPED|$($trees[$id])"
}
exit 0
`;

const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", SCRIPT], {
  encoding: "utf8",
  windowsHide: true,
});
if (result.status !== 0) {
  console.error(result.stderr.trim() || "Couldn't check the dev servers.");
  process.exit(1);
}

const lines = result.stdout.split(/\r?\n/).filter(Boolean);
if (lines.length === 0) console.log("No BantayBuhay servers are running.");
for (const line of lines) {
  const [kind, ports, name] = line.split("|");
  if (kind === "STOPPED") {
    console.log(ports ? `Stopped the server tree on port ${ports}.` : "Stopped a leftover BantayBuhay dev process that would have restarted a server.");
  }
  if (kind === "OTHER") console.log(`Port ${ports} is used by ${name}, which isn't a BantayBuhay server, so it was left alone.`);
}

// Confirm the ports really are free now.
const check = spawnSync(
  "powershell.exe",
  ["-NoProfile", "-NonInteractive", "-Command", "@(Get-NetTCPConnection -State Listen -LocalPort 3000,5173,8000 -ErrorAction SilentlyContinue).Count; exit 0"],
  { encoding: "utf8", windowsHide: true },
);
const still = Number(check.stdout.trim() || "0");
if (lines.some((line) => line.startsWith("STOPPED")) && still > 0) {
  console.error("Something is still listening on those ports. Close VS Code's terminals and run npm run stop again.");
  process.exitCode = 1;
}

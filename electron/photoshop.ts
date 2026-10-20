import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";

const CANDIDATE_DIRS = [
  "C:\\Program Files\\Adobe",
  "C:\\Program Files (x86)\\Adobe",
];

function walkPhotoshopExe(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const hits: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(root, entry.name);
    if (/photoshop/i.test(entry.name)) {
      const exe = path.join(full, "Photoshop.exe");
      if (fs.existsSync(exe)) hits.push(exe);
    }
    try {
      for (const inner of fs.readdirSync(full, { withFileTypes: true })) {
        if (!inner.isDirectory()) continue;
        if (/photoshop/i.test(inner.name)) {
          const exe = path.join(full, inner.name, "Photoshop.exe");
          if (fs.existsSync(exe)) hits.push(exe);
        }
      }
    } catch {
      /* skip inaccessible folders */
    }
  }
  return hits;
}

export function detectPhotoshop(explicitPath?: string): { found: boolean; path: string } {
  if (explicitPath && fs.existsSync(explicitPath)) {
    return { found: true, path: explicitPath };
  }
  const found = CANDIDATE_DIRS.flatMap(walkPhotoshopExe);
  found.sort().reverse();
  if (found[0]) return { found: true, path: found[0] };
  return { found: false, path: "" };
}

export function probePhotoshopCom(callback: (ok: boolean, detail: string) => void): void {
  const ps = `$p = New-Object -ComObject Photoshop.Application; $p.Name`;
  execFile(
    "powershell.exe",
    ["-NoProfile", "-Command", ps],
    { timeout: 8000, windowsHide: true },
    (error, stdout) => {
      if (error) {
        callback(false, error.message);
        return;
      }
      callback(true, stdout.trim());
    },
  );
}

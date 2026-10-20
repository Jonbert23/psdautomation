import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function toJsxPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function launchPhotoshopScript(jobDir: string, bootstrapPath: string): Promise<void> {
  const jsxPath = toJsxPath(bootstrapPath);
  const ps1Path = path.join(jobDir, "launch.ps1");
  const ps1 = [
    "$ErrorActionPreference = 'Stop'",
    "$jsxPath = '" + jsxPath.replace(/'/g, "''") + "'",
    "$source = 'app.displayDialogs = DialogModes.NO; $.evalFile(new File(\"' + $jsxPath + '\" ));'",
    "$app = $null",
    "try { $app = [Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application') } catch { $app = New-Object -ComObject Photoshop.Application }",
    "$app.Visible = $true",
    "for ($i = 0; $i -lt 40; $i++) { try { $null = $app.Name; break } catch { Start-Sleep -Milliseconds 500 } }",
    "try { $app.DoJavaScript($source) } catch { $winPath = $jsxPath -replace '/', '\\'; $app.DoJavaScriptFile($winPath) }",
  ].join("\r\n");
  fs.writeFileSync(ps1Path, ps1, "utf8");
  return execFileAsync("powershell.exe", ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-File", ps1Path], {
    timeout: 15 * 60 * 1000,
    windowsHide: true,
  }).then(() => undefined);
}

export function waitForResult(resultPath: string, timeoutMs: number): Promise<unknown> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (fs.existsSync(resultPath)) {
        try {
          resolve(JSON.parse(fs.readFileSync(resultPath, "utf8")));
          return;
        } catch {
          /* still writing */
        }
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error("Photoshop did not write a result file. The job was not marked complete."));
        return;
      }
      setTimeout(tick, 1500);
    };
    tick();
  });
}

export function readResult<T>(resultPath: string): T | null {
  if (!fs.existsSync(resultPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(resultPath, "utf8")) as T;
  } catch {
    return null;
  }
}

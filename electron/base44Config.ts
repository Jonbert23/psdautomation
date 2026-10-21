import fs from "node:fs";
import path from "node:path";
import { extractAppId } from "../shared/licenseGrant";

export interface Base44AppConfig {
  appId: string;
  appBaseUrl: string;
  functionsVersion: string;
}

type ViteEnv = { env?: Record<string, string | undefined> };

let userDataDir = "";

export function initBase44Config(dir: string): void {
  userDataDir = dir;
}

function envVar(name: string): string {
  const meta = (import.meta as ViteEnv).env;
  return String(meta?.[name] || process.env[name] || "").trim();
}

function projectRoot(): string {
  return path.resolve(__dirname, "..");
}

function webRoot(): string {
  return path.resolve(projectRoot(), "..", "web");
}

function savedPath(): string {
  return path.join(userDataDir || path.join(projectRoot(), ".local"), "license", "base44-config.json");
}

function parseDotEnv(contents: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const raw of contents.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function readDotEnv(filePath: string): Record<string, string> {
  try {
    if (!fs.existsSync(filePath)) return {};
    return parseDotEnv(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function readAppPointer(filePath: string): string {
  try {
    if (!fs.existsSync(filePath)) return "";
    const stripped = fs
      .readFileSync(filePath, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const parsed = JSON.parse(stripped) as Record<string, unknown>;
    const nested = parsed.app && typeof parsed.app === "object" ? (parsed.app as Record<string, unknown>) : {};
    return String(parsed.appId || parsed.app_id || parsed.id || nested.id || "").trim();
  } catch {
    return "";
  }
}

function readSaved(): Partial<Base44AppConfig> {
  try {
    if (!userDataDir || !fs.existsSync(savedPath())) return {};
    const parsed = JSON.parse(fs.readFileSync(savedPath(), "utf8")) as Partial<Base44AppConfig>;
    return {
      appId: String(parsed.appId || "").trim(),
      appBaseUrl: String(parsed.appBaseUrl || "").trim(),
      functionsVersion: String(parsed.functionsVersion || "").trim(),
    };
  } catch {
    return {};
  }
}

function firstValue(...values: Array<string | undefined>): string {
  return values.map((value) => String(value || "").trim()).find(Boolean) || "";
}

export function readBase44Config(): Base44AppConfig & { configured: boolean } {
  const viteAppId = envVar("VITE_BASE44_APP_ID");
  const viteBaseUrl = envVar("VITE_BASE44_APP_BASE_URL");
  const viteFunctions = envVar("VITE_BASE44_FUNCTIONS_VERSION");
  const desktopEnv = {
    ...readDotEnv(path.join(projectRoot(), ".env")),
    ...readDotEnv(path.join(projectRoot(), ".env.local")),
  };
  const webEnv = readDotEnv(path.join(webRoot(), ".env.local"));
  const saved = readSaved();
  const linkedAppId = readAppPointer(path.join(webRoot(), "base44", ".app.jsonc"));

  const appId = extractAppId(
    firstValue(
      viteAppId,
      desktopEnv.VITE_BASE44_APP_ID,
      saved.appId,
      webEnv.VITE_BASE44_APP_ID,
      linkedAppId,
    ),
  );
  const appBaseUrl = firstValue(
    viteBaseUrl,
    desktopEnv.VITE_BASE44_APP_BASE_URL,
    saved.appBaseUrl,
    webEnv.VITE_BASE44_APP_BASE_URL,
  );
  const functionsVersion = firstValue(
    viteFunctions,
    desktopEnv.VITE_BASE44_FUNCTIONS_VERSION,
    saved.functionsVersion,
    webEnv.VITE_BASE44_FUNCTIONS_VERSION,
  );

  return { appId, appBaseUrl, functionsVersion, configured: Boolean(appId) };
}

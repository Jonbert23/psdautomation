/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import fs from "node:fs";
import path from "node:path";

function readDotEnv(filePath: string): Record<string, string> {
  try {
    if (!fs.existsSync(filePath)) return {};
    const values: Record<string, string> = {};
    for (const raw of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
  } catch {
    return {};
  }
}

function linkedWebAppId(): string {
  const pointer = path.resolve(__dirname, "..", "web", "base44", ".app.jsonc");
  try {
    if (!fs.existsSync(pointer)) return "";
    const stripped = fs
      .readFileSync(pointer, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const parsed = JSON.parse(stripped) as Record<string, unknown>;
    return String(parsed.appId || parsed.app_id || parsed.id || "").trim();
  } catch {
    return "";
  }
}

function hydrateBase44Env(): void {
  const webEnv = readDotEnv(path.resolve(__dirname, "..", "web", ".env.local"));
  const appId = process.env.VITE_BASE44_APP_ID || webEnv.VITE_BASE44_APP_ID || linkedWebAppId();
  const appBaseUrl = process.env.VITE_BASE44_APP_BASE_URL || webEnv.VITE_BASE44_APP_BASE_URL || "";
  const functionsVersion = process.env.VITE_BASE44_FUNCTIONS_VERSION || webEnv.VITE_BASE44_FUNCTIONS_VERSION || "";
  if (appId) process.env.VITE_BASE44_APP_ID = appId;
  if (appBaseUrl) process.env.VITE_BASE44_APP_BASE_URL = appBaseUrl;
  if (functionsVersion) process.env.VITE_BASE44_FUNCTIONS_VERSION = functionsVersion;
}

hydrateBase44Env();

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    electron([
      {
        entry: "electron/main.ts",
        onstart({ startup }) {
          startup();
        },
        vite: {
          envDir: path.resolve(__dirname),
          build: {
            outDir: "dist-electron",
            sourcemap: true,
          },
          resolve: {
            alias: {
              "@shared": path.resolve(__dirname, "shared"),
              bufferutil: path.resolve(__dirname, "electron/optional-stub.cjs"),
              "utf-8-validate": path.resolve(__dirname, "electron/optional-stub.cjs"),
            },
          },
        },
      },
      {
        entry: "electron/preload.ts",
        onstart(args) {
          args.reload();
        },
        vite: {
          build: { outDir: "dist-electron", sourcemap: true },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});

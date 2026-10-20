/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import path from "node:path";

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
          build: { outDir: "dist-electron", sourcemap: true },
          resolve: {
            alias: {
              "@shared": path.resolve(__dirname, "shared"),
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

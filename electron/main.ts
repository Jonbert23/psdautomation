import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { WorkspaceStore } from "./store";
import { detectPhotoshop } from "./photoshop";
import { runOrder } from "./runner";
import { captureLayoutDocument, openLayoutDocument, previewLayoutSize } from "./layout";
import { generateDesignTemplate } from "./template";
import type { GarmentProfile, ProductionOrder } from "../shared/types";

let store: WorkspaceStore;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#ecece8",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

function registerIpc() {
  ipcMain.handle("dashboard:get", () => {
    const stats = store.dashboard();
    const detected = detectPhotoshop(store.getSettings().photoshopPath);
    return {
      ...stats,
      photoshopReady: detected.found,
      photoshopPath: detected.path,
      activity: store.listActivity().slice(0, 12),
    };
  });

  ipcMain.handle("categories:list", () => store.listCategories());
  ipcMain.handle("categories:create", (_e, name: string) => store.addCategory(name));

  ipcMain.handle("profiles:list", () => store.listProfiles());
  ipcMain.handle("profiles:get", (_e, id: string) => store.getProfile(id));
  ipcMain.handle("profiles:save", (_e, profile: Partial<GarmentProfile>) => store.saveProfile(profile));
  ipcMain.handle("profiles:duplicate", (_e, id: string) => store.duplicateProfile(id));
  ipcMain.handle("profiles:archive", (_e, id: string) => store.setProfileStatus(id, "archived"));
  ipcMain.handle("profiles:restore", (_e, id: string) => store.setProfileStatus(id, "active"));
  ipcMain.handle("profiles:delete", (_e, id: string) => store.deleteProfile(id));

  ipcMain.handle("orders:list", () => store.listOrders());
  ipcMain.handle("orders:get", (_e, id: string) => store.getOrder(id));
  ipcMain.handle("orders:save", (_e, order: ProductionOrder) => store.saveOrder(order));
  ipcMain.handle("orders:delete", (_e, id: string) => store.deleteOrder(id));
  ipcMain.handle("jobs:list", () => store.listJobs());
  ipcMain.handle("jobs:get", (_e, id: string) => store.getJob(id));
  ipcMain.handle("jobs:runOrder", async (_e, orderId: string) => runOrder(store, orderId));
  ipcMain.handle("activity:list", () => store.listActivity());

  ipcMain.handle("settings:get", () => store.getSettings());
  ipcMain.handle("settings:update", (_e, patch) => store.updateSettings(patch));

  ipcMain.handle("dialog:openFile", async (_e, options: { title?: string; filters?: Electron.FileFilter[] }) => {
    const result = await dialog.showOpenDialog({
      title: options?.title ?? "Select file",
      properties: ["openFile"],
      filters: options?.filters ?? [{ name: "All files", extensions: ["*"] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("dialog:openFolder", async (_e, title?: string) => {
    const result = await dialog.showOpenDialog({
      title: title ?? "Select folder",
      properties: ["openDirectory", "createDirectory"],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("workspace:backup", async () => {
    const result = await dialog.showSaveDialog({
      title: "Backup workspace",
      defaultPath: "garment-workspace.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePath) return null;
    return store.backupTo(result.filePath);
  });

  ipcMain.handle("workspace:restore", async () => {
    const result = await dialog.showOpenDialog({
      title: "Restore workspace",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return store.restoreFrom(result.filePaths[0]);
  });

  ipcMain.handle("photoshop:detect", () => detectPhotoshop(store.getSettings().photoshopPath));

  ipcMain.handle("layout:preview", (_e, profile: GarmentProfile, sizeId: string) => previewLayoutSize(profile, sizeId));
  ipcMain.handle("layout:open", (_e, profile: GarmentProfile, sizeId: string) =>
    openLayoutDocument(profile, sizeId, store.getSettings().photoshopPath),
  );
  ipcMain.handle("layout:capture", (_e, profile: GarmentProfile) =>
    captureLayoutDocument(profile, store.getSettings().photoshopPath),
  );
  ipcMain.handle("template:generate", (_e, profile: GarmentProfile) =>
    generateDesignTemplate(profile, store.getSettings().photoshopPath),
  );
}

app.whenReady().then(() => {
  store = new WorkspaceStore(app.getPath("userData"));
  registerIpc();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

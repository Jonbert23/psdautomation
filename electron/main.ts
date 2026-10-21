import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { WorkspaceStore } from "./store";
import { detectPhotoshop } from "./photoshop";
import { runOrder } from "./runner";
import { captureLayoutDocument, openLayoutDocument, previewLayoutSize } from "./layout";
import { generateDesignTemplate } from "./template";
import { LicenseStore } from "./licenseStore";
import { LicenseService } from "./license";
import { initBase44Config } from "./base44";
import { startWebLoginWindow } from "./webLogin";
import { startBillingWindow } from "./billing";
import { PLANS } from "../shared/plans";
import type { GarmentProfile, ProductionOrder } from "../shared/types";
import type { AuthStatus } from "../shared/licenseGrant";

let store: WorkspaceStore;
let license: LicenseService;
let mainWindow: BrowserWindow | null = null;

function notifyAuthChanged(status: AuthStatus) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("auth:changed", status);
  }
}

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
  mainWindow = win;
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
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
  ipcMain.handle("jobs:runOrder", async (_e, orderId: string) => {
    license.assertUsable();
    return runOrder(store, orderId);
  });
  ipcMain.handle("activity:list", () => store.listActivity());

  ipcMain.handle("auth:status", () => license.status());
  ipcMain.handle("auth:login", async (_e, email: string, password: string) => license.login(email, password));
  ipcMain.handle("auth:startWebLogin", async (event) => {
    const parent = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
    return startWebLoginWindow({
      parent,
      license,
      onChanged: notifyAuthChanged,
    });
  });
  ipcMain.handle("auth:logout", () => {
    const status = license.logout();
    notifyAuthChanged(status);
    return status;
  });
  ipcMain.handle("auth:refresh", async () => {
    const status = await license.refresh();
    notifyAuthChanged(status);
    return status;
  });
  ipcMain.handle("auth:profile", () => license.profile());
  ipcMain.handle("auth:updateProfile", (_e, patch: { displayName?: string }) => license.updateProfile(patch));
  ipcMain.handle("billing:plans", () => PLANS);
  ipcMain.handle("billing:status", () => license.billingStatus());
  ipcMain.handle("billing:subscribe", async (event, planId: string) => {
    const parent = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
    const started = await license.createCheckout(planId);
    return startBillingWindow({
      parent,
      license,
      checkoutUrl: String(started.checkoutUrl),
      onChanged: notifyAuthChanged,
    });
  });
  ipcMain.handle("billing:changePlan", (_e, planId: string) => license.changePlan(planId));
  ipcMain.handle("billing:cancel", () => license.cancelBilling());

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
  const userData = app.getPath("userData");
  initBase44Config(userData);
  store = new WorkspaceStore(userData);
  license = new LicenseService(new LicenseStore(userData));
  registerIpc();
  void license.refresh();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

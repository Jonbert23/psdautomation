import { app, BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import { isNewerVersion, type AppUpdateStatus } from "../shared/appVersion";

export function installUpdate(): void {
  if (!app.isPackaged) return;
  autoUpdater.quitAndInstall(false, true);
}

export function startAutoUpdate(getWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) return;

  autoUpdater.allowPrerelease = false;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  let version = "";

  const send = (status: AppUpdateStatus) => {
    const win = getWindow();
    if (!win || win.isDestroyed()) return;
    win.webContents.send("update:status", status);
  };

  autoUpdater.on("update-available", (info) => {
    if (!isNewerVersion(info.version, app.getVersion())) return;
    version = info.version;
    send({ phase: "downloading", version, percent: 0 });
  });

  autoUpdater.on("download-progress", (progress) => {
    if (!version) return;
    send({ phase: "downloading", version, percent: Math.round(progress.percent) });
  });

  autoUpdater.on("update-downloaded", (info) => {
    if (!isNewerVersion(info.version, app.getVersion())) return;
    version = info.version;
    send({ phase: "ready", version });
  });

  autoUpdater.on("error", (error) => {
    console.error("Update check failed", error);
  });

  void autoUpdater.checkForUpdates().catch((error) => {
    console.error("Update check failed", error);
  });
}

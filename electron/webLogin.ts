import { BrowserWindow, session } from "electron";
import { readBase44Config } from "./base44";
import type { LicenseService } from "./license";
import type { AuthStatus } from "../shared/licenseGrant";
import { desktopLoginUrl, extractAccessToken, resolveWebOrigin } from "../shared/webAuth";

function chromeUserAgent(): string {
  return session.defaultSession.getUserAgent().replace(/\sElectron\/\S+/, "");
}

const READ_STORED_TOKEN = `(() => {
  try {
    return localStorage.getItem("base44_access_token") || localStorage.getItem("token") || "";
  } catch {
    return "";
  }
})()`;

let loginWindow: BrowserWindow | null = null;
let loginInFlight: Promise<AuthStatus> | null = null;

function allowedOrigin(): string {
  return resolveWebOrigin(readBase44Config().appBaseUrl);
}

export function startWebLoginWindow(options: {
  parent: BrowserWindow | null;
  license: LicenseService;
  onChanged: (status: AuthStatus) => void;
}): Promise<AuthStatus> {
  if (loginInFlight) {
    if (loginWindow && !loginWindow.isDestroyed()) loginWindow.focus();
    return loginInFlight;
  }

  loginInFlight = new Promise((resolve) => {
    const origin = allowedOrigin();
    const win = new BrowserWindow({
      parent: options.parent ?? undefined,
      modal: Boolean(options.parent),
      width: 480,
      height: 740,
      minWidth: 420,
      minHeight: 560,
      autoHideMenuBar: true,
      backgroundColor: "#ffffff",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    loginWindow = win;
    win.webContents.setUserAgent(chromeUserAgent());

    let consumed = false;
    let pendingAuth: Promise<void> = Promise.resolve();

    const finish = () => {
      const status = options.license.status();
      resolve(status);
      options.onChanged(status);
    };

    const consume = (token: string) => {
      if (consumed) return;
      const trimmed = token.trim();
      if (!trimmed) return;
      consumed = true;
      pendingAuth = options.license
        .loginWithToken(trimmed)
        .then(() => undefined)
        .catch(() => undefined);
      void pendingAuth.finally(() => {
        if (!win.isDestroyed()) win.close();
      });
    };

    const tryUrl = (url: string) => {
      const token = extractAccessToken(url, origin);
      if (token) consume(token);
    };

    win.webContents.setWindowOpenHandler(({ url }) => {
      void win.loadURL(url);
      return { action: "deny" };
    });

    win.webContents.on("will-redirect", (_event, url) => tryUrl(url));
    win.webContents.on("will-navigate", (_event, url) => tryUrl(url));
    win.webContents.on("did-navigate", (_event, url) => tryUrl(url));
    win.webContents.on("did-navigate-in-page", (_event, url) => tryUrl(url));
    win.webContents.on("did-finish-load", () => {
      if (consumed || win.isDestroyed()) return;
      const current = win.webContents.getURL();
      tryUrl(current);
      if (consumed) return;
      try {
        if (new URL(current).origin !== origin) return;
      } catch {
        return;
      }
      void win.webContents
        .executeJavaScript(READ_STORED_TOKEN, true)
        .then((stored) => {
          if (typeof stored === "string") consume(stored);
        })
        .catch(() => undefined);
    });

    win.on("closed", () => {
      loginWindow = null;
      void pendingAuth.finally(() => {
        loginInFlight = null;
        finish();
      });
    });

    void win.loadURL(desktopLoginUrl(readBase44Config().appBaseUrl));
  });

  return loginInFlight;
}

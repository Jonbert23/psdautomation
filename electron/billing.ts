import { BrowserWindow, session } from "electron";
import { readBase44Config } from "./base44";
import type { LicenseService } from "./license";
import type { AuthStatus } from "../shared/licenseGrant";
import { DESKTOP_BILLING_PATH, resolveWebOrigin } from "../shared/webAuth";

function chromeUserAgent(): string {
  return session.defaultSession.getUserAgent().replace(/\sElectron\/\S+/, "");
}

function isBillingReturn(urlString: string, origin: string): boolean {
  try {
    const url = new URL(urlString);
    return url.origin === origin && url.pathname === DESKTOP_BILLING_PATH;
  } catch {
    return false;
  }
}

let payWindow: BrowserWindow | null = null;
let payInFlight: Promise<AuthStatus> | null = null;

export function startBillingWindow(options: {
  parent: BrowserWindow | null;
  license: LicenseService;
  checkoutUrl: string;
  onChanged: (status: AuthStatus) => void;
}): Promise<AuthStatus> {
  if (payInFlight) {
    if (payWindow && !payWindow.isDestroyed()) payWindow.focus();
    return payInFlight;
  }

  payInFlight = new Promise((resolve) => {
    const origin = resolveWebOrigin(readBase44Config().appBaseUrl);
    const win = new BrowserWindow({
      parent: options.parent ?? undefined,
      modal: Boolean(options.parent),
      width: 520,
      height: 780,
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
    payWindow = win;
    win.webContents.setUserAgent(chromeUserAgent());

    const finish = async () => {
      const status = await options.license.refresh();
      options.onChanged(status);
      resolve(status);
    };

    const maybeClose = (url: string) => {
      if (isBillingReturn(url, origin) && !win.isDestroyed()) win.close();
    };

    win.webContents.setWindowOpenHandler(({ url }) => {
      void win.loadURL(url);
      return { action: "deny" };
    });
    win.webContents.on("will-redirect", (_event, url) => maybeClose(url));
    win.webContents.on("will-navigate", (_event, url) => maybeClose(url));
    win.webContents.on("did-navigate", (_event, url) => maybeClose(url));
    win.webContents.on("did-navigate-in-page", (_event, url) => maybeClose(url));

    win.on("closed", () => {
      payWindow = null;
      void finish().finally(() => {
        payInFlight = null;
      });
    });

    void win.loadURL(options.checkoutUrl);
  });

  return payInFlight;
}

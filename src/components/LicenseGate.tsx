import type { ReactNode } from "react";
import { useLicense } from "../lib/LicenseContext";
import { LicenseBlockedPage } from "../pages/LicenseBlocked";
import { LoginPage } from "../pages/Login";

export function LicenseGate({ children }: { children: ReactNode }) {
  const { status, loading } = useLicense();
  const usable = Boolean(status?.usable);
  const signedIn = Boolean(status?.signedIn);

  return (
    <div className="app-root">
      <div
        className={usable ? undefined : "app-inert"}
        aria-hidden={!usable}
        ref={(node) => {
          if (node) node.inert = !usable;
        }}
      >
        {children}
      </div>
      {!usable ? (
        <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-overlay-title">
          {loading || !status ? (
            <div className="auth-card">
              <p className="auth-kicker">PSD Automation</p>
              <h1 id="auth-overlay-title">Checking license…</h1>
              <p className="muted">The app is loaded. Sign-in is required before you can use it.</p>
            </div>
          ) : !signedIn ? (
            <LoginPage />
          ) : (
            <LicenseBlockedPage />
          )}
        </div>
      ) : null}
    </div>
  );
}

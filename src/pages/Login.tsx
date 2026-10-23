import { useState } from "react";
import { GoogleIcon } from "../components/GoogleIcon";
import { useLicense } from "../lib/LicenseContext";

export function LoginPage() {
  const { startWebLogin, error, status } = useLicense();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  async function onGoogle() {
    setLocalError("");
    setBusy(true);
    try {
      await startWebLogin();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  const message =
    localError ||
    error ||
    (status?.code === "session_replaced" ? status.message : "") ||
    (status && !status.usable && status.signedIn ? status.message : "");

  return (
    <div className="auth-card">
      <p className="auth-kicker">PSD Automation</p>
      <h1 id="auth-overlay-title">Sign in with Google</h1>
      <p className="muted">
        Use the same website account. A new account includes 30 days, and paying for a plan extends that
        subscription. Only this PC stays signed in. The app stays on screen but cannot be used until you finish.
      </p>
      {message ? <div className="error-banner">{message}</div> : null}
      <button className="btn google" type="button" onClick={() => void onGoogle()} disabled={busy}>
        <GoogleIcon />
        {busy ? "Waiting for sign-in…" : "Sign in with Google"}
      </button>
    </div>
  );
}

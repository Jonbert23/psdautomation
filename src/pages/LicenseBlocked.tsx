import { useState } from "react";
import { PlanPicker } from "../components/PlanPicker";
import { useLicense } from "../lib/LicenseContext";
import { api } from "../lib/api";
import type { Plan } from "@shared/plans";

export function LicenseBlockedPage() {
  const { status, logout, refresh } = useLicense();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function subscribe(plan: Plan) {
    setError("");
    setBusy(true);
    try {
      await api().billing.subscribe(plan.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card wide">
      <p className="auth-kicker">License</p>
      <h1 id="auth-overlay-title">Pay to use this PC</h1>
      <p className="muted">
        {status?.message ||
          "Choose a term. One payment covers 1, 6, or 12 months, and a longer term is discounted. Pay again to renew."}
      </p>
      {status?.email ? <p className="muted">Signed in as {status.email}</p> : null}
      {error ? <div className="error-banner">{error}</div> : null}
      <PlanPicker onSelect={subscribe} ctaLabel={busy ? "Waiting…" : ""} />
      <div className="row-actions" style={{ marginTop: 8 }}>
        <button className="btn" type="button" onClick={() => void refresh()}>
          Refresh license
        </button>
        <button className="btn" type="button" onClick={() => void logout()}>
          Sign out
        </button>
      </div>
    </div>
  );
}

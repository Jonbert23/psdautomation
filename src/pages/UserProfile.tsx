import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { PlanPicker } from "../components/PlanPicker";
import { useLicense } from "../lib/LicenseContext";
import type { UserProfile } from "@shared/licenseGrant";
import type { BillingSubscription, Plan } from "@shared/plans";

function roleLabel(role: UserProfile["role"]): string {
  return role === "admin" ? "Administrator" : "Operator";
}

export function UserProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const { refresh } = useLicense();

  async function load() {
    const [next, billing] = await Promise.all([api().auth.profile(), api().billing.status()]);
    setProfile(next);
    setDisplayName(next.displayName);
    setSubscription(billing.subscription);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const next = await api().auth.updateProfile({ displayName });
      setProfile(next);
      setDisplayName(next.displayName);
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile && !error) return <p className="muted">Loading profile…</p>;

  const expiryLabel = profile?.expiresAt ? new Date(profile.expiresAt).toLocaleDateString() : "—";

  return (
    <>
      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="ok-banner">{message}</div> : null}
      <section className="card">
        <h3>Profile</h3>
        <form className="card-body form-grid" onSubmit={(event) => void onSave(event)}>
          <div className="field span-2">
            <label htmlFor="display-name">Display name</label>
            <input
              id="display-name"
              className="input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={80}
              required
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" value={profile?.email || "—"} readOnly />
          </div>
          <div className="field">
            <label>Account type</label>
            <input className="input" value={profile ? roleLabel(profile.role) : "—"} readOnly />
          </div>
          <div className="field">
            <label>Plan</label>
            <input className="input" value={profile?.planName || "—"} readOnly />
          </div>
          <div className="field">
            <label>Expires</label>
            <input className="input" value={expiryLabel} readOnly />
          </div>
          <div className="row-actions span-2" style={{ gridColumn: "span 2" }}>
            <button className="btn primary" type="submit" disabled={saving || !profile}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </section>
      <section className="card" style={{ marginTop: 8 }}>
        <h3>Billing</h3>
        <div className="card-body">
          <p className="muted">
            {profile?.planName
              ? `${profile.planName} runs until ${expiryLabel}. Paying for a plan extends this subscription.`
              : "No subscription yet. Pay for 1, 6, or 12 months to start one. The subscription is stored on the website."}
          </p>
          <PlanPicker
            currentPlanId={subscription?.status === "active" ? subscription.planId : null}
            onSelect={async (plan: Plan) => {
              setError("");
              setMessage("");
              try {
                await api().billing.subscribe(plan.id);
                await refresh();
                const billing = await api().billing.status();
                setSubscription(billing.subscription);
                setMessage("Payment window closed. The subscription extends after PayMongo confirms the payment.");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not start payment.");
              }
            }}
          />
        </div>
      </section>
    </>
  );
}

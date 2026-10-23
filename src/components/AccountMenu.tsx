import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, Bell, LogOut, User } from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { PlanPicker } from "./PlanPicker";
import { api } from "../lib/api";
import { useLicense, useLicenseStatus } from "../lib/LicenseContext";
import type { UserProfile } from "@shared/licenseGrant";
import type { DashboardPayload } from "../vite-env";
import type { Plan } from "@shared/plans";

type AccountWindow = "upgrade" | "profile" | "usage" | "notifications";

function roleLabel(role: UserProfile["role"]): string {
  return role === "admin" ? "Administrator" : "Operator";
}

function formatExpiry(iso: string | null | undefined): string {
  if (!iso) return "No expiry";
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? `Renew Date ${date.toLocaleDateString()}` : "No expiry";
}

export function AccountMenu({ active }: { active: boolean }) {
  const license = useLicenseStatus();
  const { logout, refresh } = useLicense();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [place, setPlace] = useState({ left: 88, bottom: 16 });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [windowKind, setWindowKind] = useState<AccountWindow | null>(null);

  function showCard() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setPlace({ left: rect.right + 12, bottom: window.innerHeight - rect.bottom });
    setCardOpen(true);
  }

  function hideCard() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setCardOpen(false), 200);
  }

  useEffect(() => {
    if (!cardOpen) return;
    let cancel = false;
    api()
      .auth.profile()
      .then((next) => {
        if (!cancel) setProfile(next);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [cardOpen]);

  useEffect(() => {
    if (!windowKind) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setWindowKind(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [windowKind]);

  function openWindow(kind: AccountWindow) {
    setCardOpen(false);
    setWindowKind(kind);
  }

  const name = profile?.displayName || "Account";
  const email = profile?.email || license.email || "";
  const planName = profile?.planName || license.planName || "No plan";
  const expiry = formatExpiry(profile?.expiresAt || license.expiresAt);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        ref={anchorRef}
        isActive={active || cardOpen}
        aria-label="Account"
        aria-expanded={cardOpen}
        className="mx-auto size-11 justify-center gap-0 rounded-lg p-0"
        onMouseEnter={showCard}
        onMouseLeave={hideCard}
        onFocus={showCard}
        onClick={showCard}
      >
        <User className="!size-[22px]" strokeWidth={1.75} />
      </SidebarMenuButton>
      {cardOpen
        ? createPortal(
            <div
              ref={cardRef}
              className="account-card"
              style={{ left: place.left, bottom: place.bottom }}
              onMouseEnter={showCard}
              onMouseLeave={hideCard}
            >
              <div className="account-card-name">{name}</div>
              {email ? <div className="account-card-email">{email}</div> : null}
              <div className="account-card-plan">
                <span>{planName}</span>
                <span>{expiry}</span>
              </div>
              <button className="account-upgrade" type="button" onClick={() => openWindow("upgrade")}>
                Upgrade plan
              </button>
              <ul className="account-menu-list">
                <li>
                  <button type="button" onClick={() => openWindow("profile")}>
                    <User strokeWidth={1.75} />
                    View & edit profile
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => openWindow("usage")}>
                    <BarChart3 strokeWidth={1.75} />
                    Usage stats
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => openWindow("notifications")}>
                    <Bell strokeWidth={1.75} />
                    Notification preferences
                  </button>
                </li>
              </ul>
              <ul className="account-menu-list account-menu-foot">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setCardOpen(false);
                      void logout();
                    }}
                  >
                    <LogOut strokeWidth={1.75} />
                    Log out
                  </button>
                </li>
              </ul>
            </div>,
            document.body,
          )
        : null}
      {windowKind
        ? createPortal(
            <AccountWindow
              kind={windowKind}
              onClose={() => setWindowKind(null)}
              onProfile={setProfile}
              refresh={refresh}
            />,
            document.body,
          )
        : null}
    </SidebarMenuItem>
  );
}

function AccountWindow({
  kind,
  onClose,
  onProfile,
  refresh,
}: {
  kind: AccountWindow;
  onClose: () => void;
  onProfile: (profile: UserProfile) => void;
  refresh: () => Promise<unknown>;
}) {
  const title =
    kind === "upgrade"
      ? "Upgrade plan"
      : kind === "profile"
        ? "View & edit profile"
        : kind === "usage"
          ? "Usage stats"
          : "Notification preferences";
  return (
    <div className="account-window-backdrop" onMouseDown={onClose}>
      <div
        className={`account-window${kind === "upgrade" ? " wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h3>{title}</h3>
          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="account-window-body">
          {kind === "upgrade" ? <UpgradePane refresh={refresh} /> : null}
          {kind === "profile" ? <ProfilePane onProfile={onProfile} /> : null}
          {kind === "usage" ? <UsagePane /> : null}
          {kind === "notifications" ? <NotificationsPane /> : null}
        </div>
      </div>
    </div>
  );
}

function UpgradePane({ refresh }: { refresh: () => Promise<unknown> }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  useEffect(() => {
    api()
      .billing.status()
      .then((billing) => setCurrentPlanId(billing.subscription?.status === "active" ? billing.subscription.planId : null))
      .catch(() => {});
  }, []);

  return (
    <>
      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="ok-banner">{message}</div> : null}
      <p className="muted">Paying for a plan extends your subscription by 1, 6, or 12 months.</p>
      <PlanPicker
        currentPlanId={currentPlanId}
        onSelect={async (plan: Plan) => {
          setError("");
          setMessage("");
          try {
            await api().billing.subscribe(plan.id);
            await refresh();
            setMessage("Payment window closed. The subscription extends after PayMongo confirms the payment.");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not start payment.");
          }
        }}
      />
    </>
  );
}

function ProfilePane({ onProfile }: { onProfile: (profile: UserProfile) => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api()
      .auth.profile()
      .then((next) => {
        setProfile(next);
        setDisplayName(next.displayName);
        onProfile(next);
      })
      .catch((err: Error) => setError(err.message));
  }, [onProfile]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const next = await api().auth.updateProfile({ displayName });
      setProfile(next);
      setDisplayName(next.displayName);
      onProfile(next);
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile && !error) return <p className="muted">Loading profile…</p>;
  const expiry = profile?.expiresAt ? new Date(profile.expiresAt).toLocaleDateString() : "—";

  return (
    <>
      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="ok-banner">{message}</div> : null}
      <form className="form-grid" onSubmit={(event) => void onSave(event)}>
        <div className="field span-2">
          <label htmlFor="account-display-name">Display name</label>
          <input
            id="account-display-name"
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
          <input className="input" value={expiry} readOnly />
        </div>
        <div className="row-actions span-2">
          <button className="btn primary" type="submit" disabled={saving || !profile}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </>
  );
}

function UsagePane() {
  const [stats, setStats] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api()
      .dashboard()
      .then(setStats)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!stats) return <p className="muted">Loading usage…</p>;

  const rows = [
    ["Active profiles", stats.profileCount],
    ["Pending orders", stats.pendingOrders],
    ["Completed jobs", stats.completedJobs],
    ["Failed jobs", stats.failedJobs],
  ] as const;

  return (
    <ul className="account-stats">
      {rows.map(([label, value]) => (
        <li key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </li>
      ))}
    </ul>
  );
}

function NotificationsPane() {
  const [jobFinished, setJobFinished] = useState(false);
  const [licenseExpiry, setLicenseExpiry] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api()
      .settings.get()
      .then((settings) => {
        setJobFinished(settings.notifyOnJobFinished);
        setLicenseExpiry(settings.notifyOnLicenseExpiry);
        setReady(true);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  async function save(next: { notifyOnJobFinished?: boolean; notifyOnLicenseExpiry?: boolean }) {
    setError("");
    try {
      const saved = await api().settings.update(next);
      setJobFinished(saved.notifyOnJobFinished);
      setLicenseExpiry(saved.notifyOnLicenseExpiry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save notification preferences.");
    }
  }

  if (error && !ready) return <div className="error-banner">{error}</div>;

  return (
    <>
      {error ? <div className="error-banner">{error}</div> : null}
      <label className="account-toggle">
        <input
          type="checkbox"
          checked={jobFinished}
          disabled={!ready}
          onChange={(event) => {
            const checked = event.target.checked;
            setJobFinished(checked);
            void save({ notifyOnJobFinished: checked });
          }}
        />
        <span>Notify when an automation job finishes or fails</span>
      </label>
      <label className="account-toggle">
        <input
          type="checkbox"
          checked={licenseExpiry}
          disabled={!ready}
          onChange={(event) => {
            const checked = event.target.checked;
            setLicenseExpiry(checked);
            void save({ notifyOnLicenseExpiry: checked });
          }}
        />
        <span>Notify when the license expires within 7 days</span>
      </label>
    </>
  );
}

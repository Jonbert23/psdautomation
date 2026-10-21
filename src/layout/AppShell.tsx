import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useLicenseStatus } from "../lib/LicenseContext";

const LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/profiles", label: "Garment profiles" },
  { to: "/orders", label: "Production orders" },
  { to: "/jobs", label: "Automation jobs" },
  { to: "/profile", label: "Profile" },
  { to: "/settings", label: "Settings" },
];

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/profiles": "Garment profiles",
  "/profiles/new": "New garment profile",
  "/orders": "Production orders",
  "/orders/new": "New production order",
  "/jobs": "Automation jobs",
  "/profile": "Profile",
  "/settings": "Settings",
};

export function AppShell() {
  const location = useLocation();
  const license = useLicenseStatus();
  const title =
    TITLES[location.pathname] ??
    (location.pathname.startsWith("/profiles/")
      ? "Edit garment profile"
      : location.pathname.startsWith("/orders/")
        ? "Edit production order"
        : "Garment Customizer");
  const expiryLabel = license.expiresAt
    ? new Date(license.expiresAt).toLocaleDateString()
    : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>Garment Customizer</h1>
          <p>Photoshop production desk</p>
        </div>
        <nav className="nav">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">Schema v1 · Local workspace</div>
      </aside>
      <div className="main">
        <header className="topbar">
          <h2>{title}</h2>
          <div className="grow" />
          <div className="license-chip" title={license.email || undefined}>
            {license.usable ? (
              <>
                <span>{license.planName || "Licensed"}</span>
                {expiryLabel ? <span className="muted">until {expiryLabel}</span> : null}
              </>
            ) : (
              <span>{license.signedIn ? "License required" : "Sign in required"}</span>
            )}
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

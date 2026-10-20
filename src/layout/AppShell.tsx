import { NavLink, Outlet, useLocation } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/profiles", label: "Garment profiles" },
  { to: "/orders", label: "Production orders" },
  { to: "/jobs", label: "Automation jobs" },
  { to: "/settings", label: "Settings" },
];

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/profiles": "Garment profiles",
  "/profiles/new": "New garment profile",
  "/orders": "Production orders",
  "/orders/new": "New production order",
  "/jobs": "Automation jobs",
  "/settings": "Settings",
};

export function AppShell() {
  const location = useLocation();
  const title =
    TITLES[location.pathname] ??
    (location.pathname.startsWith("/profiles/")
      ? "Edit garment profile"
      : location.pathname.startsWith("/orders/")
        ? "Edit production order"
        : "Garment Customizer");

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
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

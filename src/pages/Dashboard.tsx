import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatWhen } from "../lib/api";
import type { DashboardPayload } from "../vite-env";

export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api()
      .dashboard()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <p className="muted">Loading workspace…</p>;

  return (
    <>
      <p className="page-lead">
        A garment profile is a reusable layout (parts, sizes, presets, fields). Pick the design file and output
        folder when you run a job, not when you create the profile.
      </p>
      <div className="stats">
        <Stat label="Garment profiles" value={data.profileCount} />
        <Stat label="Configured sizes" value={data.sizeCount} />
        <Stat label="Custom attributes" value={data.attributeCount} />
        <Stat label="Pending orders" value={data.pendingOrders} />
        <Stat label="Completed jobs" value={data.completedJobs} />
        <Stat label="Failed jobs" value={data.failedJobs} danger />
      </div>
      <div className="grid-2">
        <section className="card">
          <h3>Recent activity</h3>
          <div className="card-body">
            {data.activity.length === 0 ? (
              <div className="empty">No activity yet.</div>
            ) : (
              <ul className="activity">
                {data.activity.map((item) => (
                  <li key={item.id}>
                    <div>{item.message}</div>
                    <div className="when">{formatWhen(item.at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <section className="card">
          <h3>Quick actions</h3>
          <div className="card-body actions">
            <button className="btn primary" onClick={() => navigate("/profiles/new")}>
              Create garment profile
            </button>
            <button className="btn" onClick={() => navigate("/profiles")} disabled={data.profileCount === 0}>
              Add attributes
            </button>
            <button className="btn" onClick={() => navigate("/orders/new")} disabled={data.profileCount === 0}>
              Create an order
            </button>
            <button className="btn" onClick={() => navigate("/orders")} disabled={data.profileCount === 0}>
              Run automation
            </button>
          </div>
          <div className="card-body">
            <div className="muted">
              Photoshop:{" "}
              {data.photoshopReady ? (
                <span className="badge ok">Detected</span>
              ) : (
                <span className="badge warn">Not found</span>
              )}
            </div>
            <p className="muted">{data.photoshopPath || "Set a Photoshop path in Settings if auto-detect fails."}</p>
            <p className="muted">
              Run from an order: select profile, design PSD, output folder, then Run automation. Photoshop must be
              installed.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`stat${danger ? " danger" : ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

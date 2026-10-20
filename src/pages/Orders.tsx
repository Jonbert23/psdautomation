import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GarmentProfile, ProductionOrder } from "@shared/types";
import { api, formatWhen } from "../lib/api";

export function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [profiles, setProfiles] = useState<GarmentProfile[]>([]);
  const [error, setError] = useState("");

  async function refresh() {
    const [o, p] = await Promise.all([api().orders.list(), api().profiles.list()]);
    setOrders(o);
    setProfiles(p.filter((x) => x.status === "active"));
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, []);

  const profileName = (id: string) => profiles.find((p) => p.id === id)?.name || id;

  async function remove(id: string) {
    if (!confirm("Delete this order?")) return;
    await api().orders.delete(id);
    await refresh();
  }

  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      <p className="page-lead">
        Create an order from a garment profile, then choose the design PSD, output folder, save formats, and file
        naming for that batch.
      </p>
      <div className="toolbar">
        <button className="btn primary" disabled={profiles.length === 0} onClick={() => navigate("/orders/new")}>
          New order
        </button>
        {profiles.length === 0 && <span className="muted">Create a garment profile before adding an order.</span>}
      </div>
      {profiles.length > 0 && (
        <p className="muted">
          Profiles available: {profiles.map((p) => p.name || "Untitled").join(", ")}
        </p>
      )}
      {orders.length === 0 ? (
        <div className="empty">
          No production orders yet.
          <div style={{ marginTop: 10 }}>
            <button className="btn primary" disabled={profiles.length === 0} onClick={() => navigate("/orders/new")}>
              Create order from a profile
            </button>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Profile</th>
                <th>Status</th>
                <th>Items</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.name || "Untitled"}</strong>
                  </td>
                  <td>{profileName(o.profileId)}</td>
                  <td>{o.status}</td>
                  <td>{o.items.length}</td>
                  <td className="muted">{formatWhen(o.updatedAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn" onClick={() => navigate(`/orders/${o.id}`)}>
                        Open
                      </button>
                      <button className="btn danger" onClick={() => remove(o.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

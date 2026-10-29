import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { profileCategoryIds } from "@shared/defaults";
import type { Category, GarmentProfile, ProductionOrder } from "@shared/types";
import { FilterTabs } from "../components/FilterTabs";
import { FolderCard, FolderGrid } from "../components/FolderCard";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";

export function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [profiles, setProfiles] = useState<GarmentProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const [o, p, c] = await Promise.all([api().orders.list(), api().profiles.list(), api().categories.list()]);
    setOrders(o);
    setProfiles(p.filter((x) => x.status === "active"));
    setCategories(c);
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, []);

  const profileName = (id: string) => profiles.find((p) => p.id === id)?.name || id;
  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    return orders.filter((o) => {
      if (category !== "all") {
        const profile = profiles.find((p) => p.id === o.profileId);
        if (!profile || !profileCategoryIds(profile).includes(category)) return false;
      }
      const hay = `${o.name} ${profileName(o.profileId)} ${o.status}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [orders, profiles, category, query]);

  async function remove(id: string) {
    if (!confirm("Delete this order?")) return;
    await api().orders.delete(id);
    await refresh();
  }

  return (
    <>
      <PageHeader
        title="Automation"
        description="Run a layout against a design file and export the batch."
      />
      {error && <div className="error-banner">{error}</div>}
      <div className="toolbar">
        <input className="search" placeholder="Search automations" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn primary" disabled={profiles.length === 0} onClick={() => navigate("/orders/new")}>
          New automation
        </button>
        {profiles.length === 0 && <span className="muted">Create a layout before adding an automation.</span>}
      </div>
      <FilterTabs
        value={category}
        onChange={setCategory}
        items={[{ id: "all", label: "All" }, ...categories.map((c) => ({ id: c.id, label: c.name }))]}
      />
      {profiles.length > 0 && (
        <p className="muted">
          Layouts available: {profiles.map((p) => p.name || "Untitled").join(", ")}
        </p>
      )}
      {orders.length === 0 ? (
        <div className="empty">
          No automations yet.
          <div style={{ marginTop: 10 }}>
            <button className="btn primary" disabled={profiles.length === 0} onClick={() => navigate("/orders/new")}>
              Create automation from a layout
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">No automations match these filters.</div>
      ) : (
        <FolderGrid>
          {filtered.map((o) => (
            <FolderCard
              key={o.id}
              name={o.name || "Untitled"}
              detail={`${profileName(o.profileId)} · ${o.items.length} item${o.items.length === 1 ? "" : "s"} · ${o.status}`}
              onOpen={() => navigate(`/orders/${o.id}`)}
              inside={
                <>
                  <button className="btn primary" type="button" onClick={() => navigate(`/orders/${o.id}`)}>
                    Open
                  </button>
                  <button className="btn icon-btn" type="button" aria-label="Delete" onClick={() => remove(o.id)}>
                    <Trash2 size={14} />
                  </button>
                </>
              }
            />
          ))}
        </FolderGrid>
      )}
    </>
  );
}

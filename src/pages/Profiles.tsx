import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Category, GarmentProfile } from "@shared/types";
import { templateGuideReady } from "@shared/steps";
import { FolderCard, FolderGrid } from "../components/FolderCard";
import { api, formatWhen } from "../lib/api";

export function ProfilesPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<GarmentProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("active");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [guideBusyId, setGuideBusyId] = useState<string | null>(null);

  async function refresh() {
    const [p, c] = await Promise.all([api().profiles.list(), api().categories.list()]);
    setProfiles(p);
    setCategories(c);
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (category !== "all" && p.categoryId !== category) return false;
      const hay = `${p.name} ${p.description}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    });
  }, [profiles, query, category, status]);

  async function onDuplicate(id: string) {
    await api().profiles.duplicate(id);
    await refresh();
  }

  async function onArchive(id: string, archived: boolean) {
    if (archived) await api().profiles.restore(id);
    else await api().profiles.archive(id);
    await refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this garment profile permanently?")) return;
    await api().profiles.delete(id);
    await refresh();
  }

  async function onTemplateGuide(profile: GarmentProfile) {
    if (!templateGuideReady(profile)) return;
    setError("");
    setNotice("");
    setGuideBusyId(profile.id);
    try {
      const result = await api().template.generate(profile);
      if (!result) return;
      const skipped =
        result.skipped.length > 0
          ? ` Skipped ${result.skipped.length} field${result.skipped.length === 1 ? "" : "s"}.`
          : "";
      setNotice(`Template Guide saved to ${result.outputPath}.${skipped} Pick this file as the design on a production order.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuideBusyId(null);
    }
  }

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="ok-banner">{notice}</div>}
      <div className="toolbar">
        <input className="search" placeholder="Search profiles" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All statuses</option>
        </select>
        <button className="btn primary" onClick={() => navigate("/profiles/new")}>
          New profile
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="empty">
          No garment profiles match these filters.
          <div style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={() => navigate("/profiles/new")}>
              Create a profile
            </button>
          </div>
        </div>
      ) : (
        <FolderGrid>
          {filtered.map((p) => (
            <FolderCard
              key={p.id}
              name={p.name || "Untitled"}
              detail={`${catName(p.categoryId)} · ${p.parts.length} parts · ${p.sizes.length} sizes · ${p.attributes.length} fields`}
              status={p.status}
              updated={formatWhen(p.updatedAt)}
              onOpen={() => navigate(`/profiles/${p.id}`)}
              actions={
                <>
                  <button className="btn" onClick={() => navigate(`/profiles/${p.id}`)}>
                    Edit
                  </button>
                  <button className="btn" onClick={() => onDuplicate(p.id)}>
                    Duplicate
                  </button>
                  <button
                    className="btn"
                    disabled={guideBusyId !== null || !templateGuideReady(p)}
                    title={
                      templateGuideReady(p)
                        ? "Build a PSD with part groups and field text layers"
                        : "Finish Parts, Sizes, Presets, Layout, and Fields first"
                    }
                    onClick={() => onTemplateGuide(p)}
                  >
                    {guideBusyId === p.id ? "Generating…" : "Template Guide"}
                  </button>
                  <button className="btn" onClick={() => onArchive(p.id, p.status === "archived")}>
                    {p.status === "archived" ? "Restore" : "Archive"}
                  </button>
                  <button className="btn danger" onClick={() => onDelete(p.id)}>
                    Delete
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

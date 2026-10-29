import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { profileCategoryIds } from "@shared/defaults";
import type { Category, GarmentProfile } from "@shared/types";
import { templateGuideReady } from "@shared/steps";
import { FilterTabs } from "../components/FilterTabs";
import { FolderCard, FolderGrid } from "../components/FolderCard";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";

export function ProfilesPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<GarmentProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
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
      if (category !== "all" && !profileCategoryIds(p).includes(category)) return false;
      const hay = `${p.name} ${p.description}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    });
  }, [profiles, query, category]);

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
  const catNames = (profile: GarmentProfile) => profileCategoryIds(profile).map(catName).join(", ");

  return (
    <>
      <PageHeader
        title="Layouts"
        description="Reusable garment layouts — parts, sizes, presets, and fields."
      />
      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="ok-banner">{notice}</div>}
      <div className="toolbar">
        <input className="search" placeholder="Search layouts" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn primary" onClick={() => navigate("/profiles/new")}>
          New layout
        </button>
      </div>
      <FilterTabs
        value={category}
        onChange={setCategory}
        items={[{ id: "all", label: "All" }, ...categories.map((c) => ({ id: c.id, label: c.name }))]}
      />
      {filtered.length === 0 ? (
        <div className="empty">
          No layouts match these filters.
          <div style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={() => navigate("/profiles/new")}>
              Create a layout
            </button>
          </div>
        </div>
      ) : (
        <FolderGrid>
          {filtered.map((p) => (
            <FolderCard
              key={p.id}
              name={p.name || "Untitled"}
              detail={`${catNames(p)} · ${p.parts.length} parts · ${p.sizes.length} sizes · ${p.attributes.length} fields`}
              onOpen={() => navigate(`/profiles/${p.id}`)}
              inside={
                <>
                  <button
                    className="btn primary"
                    type="button"
                    disabled={guideBusyId !== null || !templateGuideReady(p)}
                    title={
                      templateGuideReady(p)
                        ? "Build a PSD with part groups and field text layers"
                        : "Finish Parts, Sizes, Presets, and Layout first"
                    }
                    onClick={() => onTemplateGuide(p)}
                  >
                    {guideBusyId === p.id ? "Generating…" : "Template Guide"}
                  </button>
                  <button className="btn icon-btn" type="button" aria-label="Delete" onClick={() => onDelete(p.id)}>
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

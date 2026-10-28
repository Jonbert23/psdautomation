import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PublicCatalogProfile } from "@shared/types";
import { FilterTabs } from "../components/FilterTabs";
import { FolderCard, FolderGrid } from "../components/FolderCard";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import type { DashboardPayload } from "../vite-env";

export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(() => navigator.onLine);
  const [catalog, setCatalog] = useState<PublicCatalogProfile[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("all");

  useEffect(() => {
    api()
      .dashboard()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      if (!navigator.onLine) {
        setOnline(false);
        setCatalog([]);
        return;
      }
      setOnline(true);
      try {
        const profiles = await api().catalog.list();
        if (!active || !navigator.onLine) return;
        setCatalog(profiles);
      } catch {
        if (!active) return;
        setCatalog([]);
      }
    }

    function goOffline() {
      setOnline(false);
      setCatalog([]);
    }

    void loadCatalog();
    window.addEventListener("online", loadCatalog);
    window.addEventListener("offline", goOffline);
    return () => {
      active = false;
      window.removeEventListener("online", loadCatalog);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  async function download(profile: PublicCatalogProfile) {
    if (busyId) return;
    setNotice("");
    setCatalogError("");
    setBusyId(profile.id);
    try {
      const saved = await api().catalog.download(profile);
      setNotice(`“${saved.name}” is in your profiles.`);
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : "Could not download that profile.");
    } finally {
      setBusyId("");
    }
  }

  const catalogTabs = useMemo(() => {
    const names = [...new Set(catalog.map((profile) => profile.categoryName || "Uncategorized"))].sort((a, b) =>
      a.localeCompare(b),
    );
    return [{ id: "all", label: "All" }, ...names.map((name) => ({ id: name, label: name }))];
  }, [catalog]);
  const visibleCatalog = useMemo(() => {
    if (catalogCategory === "all") return catalog;
    return catalog.filter((profile) => (profile.categoryName || "Uncategorized") === catalogCategory);
  }, [catalog, catalogCategory]);
  const showCatalog = online && catalog.length > 0;

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <p className="muted">Loading workspace…</p>;

  return (
    <>
      <PageHeader
        title="Home"
        description="Your layouts and automations."
      />
      <section className="welcome-banner" aria-label="Welcome">
        <div className="welcome-copy">
          <h2>Welcome to SHUZEE</h2>
          <p>
            A garment profile is a reusable layout (parts, sizes, presets, fields). Pick the design file and output
            folder when you run a job, not when you create the profile.
          </p>
          <button type="button" className="welcome-start" onClick={() => navigate("/profiles/new")}>
            Start Now
          </button>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <span className="shape tall" />
          <span className="shape wide" />
          <span className="shape slim" />
          <span className="shape small" />
        </div>
      </section>
      {showCatalog ? (
        <section className="public-profiles">
          <h3>Public profiles</h3>
          {catalogError ? <div className="error-banner">{catalogError}</div> : null}
          {notice ? <div className="ok-banner">{notice}</div> : null}
          <FilterTabs value={catalogCategory} onChange={setCatalogCategory} items={catalogTabs} />
          {visibleCatalog.length === 0 ? (
            <p className="muted">No public layouts match this category.</p>
          ) : (
          <FolderGrid>
            {visibleCatalog.map((profile) => (
              <FolderCard
                key={profile.id}
                name={profile.name || "Untitled"}
                detail={catalogDetail(profile)}
                onOpen={() => void download(profile)}
                inside={
                  <button
                    className="btn primary"
                    type="button"
                    disabled={busyId === profile.id}
                    onClick={() => void download(profile)}
                  >
                    {busyId === profile.id ? "Downloading…" : "Download"}
                  </button>
                }
              />
            ))}
          </FolderGrid>
          )}
        </section>
      ) : null}
    </>
  );
}

function catalogDetail(profile: PublicCatalogProfile): string {
  const category = profile.categoryName || "Uncategorized";
  const parts = profile.parts?.length ?? 0;
  const sizes = profile.sizes?.length ?? 0;
  const fields = profile.attributes?.length ?? 0;
  return `${category} · ${parts} parts · ${sizes} sizes · ${fields} fields`;
}

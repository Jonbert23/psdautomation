import { useEffect, useState } from "react";
import type { AppSettings, Category } from "@shared/types";
import { api } from "../lib/api";

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [detected, setDetected] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [s, c, ps] = await Promise.all([
      api().settings.get(),
      api().categories.list(),
      api().photoshop.detect(),
    ]);
    setSettings(s);
    setCategories(c);
    setDetected(ps.found ? ps.path : "Photoshop.exe was not found in Program Files.");
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, []);

  async function save() {
    if (!settings) return;
    await api().settings.update(settings);
    setMessage("Settings saved.");
  }

  async function browsePs() {
    const file = await api().dialogs.openFile({
      title: "Locate Photoshop.exe",
      filters: [{ name: "Executable", extensions: ["exe"] }],
    });
    if (file && settings) setSettings({ ...settings, photoshopPath: file });
  }

  async function backup() {
    const path = await api().workspace.backup();
    if (path) setMessage(`Backup saved: ${path}`);
  }

  async function restore() {
    if (!confirm("Restore replaces the current workspace. Continue?")) return;
    await api().workspace.restore();
    setMessage("Workspace restored.");
    await load();
  }

  async function addCategory() {
    setError("");
    try {
      await api().categories.create(newCategory);
      setNewCategory("");
      setCategories(await api().categories.list());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!settings) return <p className="muted">Loading settings…</p>;

  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      {message && <div className="ok-banner">{message}</div>}
      <section className="card">
        <h3>Photoshop</h3>
        <div className="card-body form-grid">
          <div className="field span-2">
            <label>Photoshop.exe path</label>
            <div className="path-row">
              <input
                className="input"
                value={settings.photoshopPath}
                onChange={(e) => setSettings({ ...settings, photoshopPath: e.target.value })}
              />
              <button className="btn" onClick={browsePs}>
                Browse
              </button>
            </div>
            <p className="muted">{detected}</p>
          </div>
        </div>
      </section>
      <section className="card" style={{ marginTop: 8 }}>
        <h3>Garment categories</h3>
        <div className="card-body">
          <p className="muted">Categories are data, not code. Add any garment type you need.</p>
          <div className="toolbar">
            <input className="input" placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <button className="btn" onClick={addCategory}>
              Add category
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Id</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="muted">{c.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="card" style={{ marginTop: 8 }}>
        <h3>Backup and restore</h3>
        <div className="card-body">
          <p className="muted">The workspace file includes profiles, orders, jobs, and settings (schemaVersion 1).</p>
          <div className="row-actions">
            <button className="btn" onClick={backup}>
              Backup workspace
            </button>
            <button className="btn danger" onClick={restore}>
              Restore workspace
            </button>
            <button className="btn primary" onClick={save}>
              Save settings
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

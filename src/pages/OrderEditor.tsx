import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { GarmentProfile, OrderItem, ProductionOrder } from "@shared/types";
import { createId } from "@shared/ids";
import { emptyOrder, emptyOrderItem, normalizeOrder } from "@shared/orders";
import { profileReadyForAutomation, validateOrder } from "@shared/validation";
import { api } from "../lib/api";

export function OrderEditorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<GarmentProfile[]>([]);
  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [running, setRunning] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const profile = useMemo(
    () => profiles.find((p) => p.id === order?.profileId) ?? null,
    [profiles, order?.profileId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = (await api().profiles.list()).filter((p) => p.status === "active");
        if (cancelled) return;
        setProfiles(list);
        if (id) {
          const found = await api().orders.get(id);
          if (!found) setError("Order not found.");
          else setOrder(normalizeOrder(found));
        } else {
          const preferred = params.get("profile") || list[0]?.id;
          const selected = list.find((p) => p.id === preferred) ?? list[0];
          if (!selected) {
            setError("Create a garment profile first. Orders are built from a profile’s parts, sizes, and fields.");
          } else {
            setOrder(emptyOrder(selected));
          }
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, params]);

  function patch(next: Partial<ProductionOrder>) {
    setOrder((o) => (o ? { ...o, ...next } : o));
  }

  function setProfileId(profileId: string) {
    const next = profiles.find((p) => p.id === profileId);
    if (!next || !order) return;
    setOrder({
      ...emptyOrder(next),
      id: order.id,
      name: order.name,
      customerName: order.customerName,
      notes: order.notes,
      designTemplatePath: order.designTemplatePath,
      outputFolder: order.outputFolder,
      exportFormats: order.exportFormats,
      namingTemplate: order.namingTemplate,
      createdAt: order.createdAt,
    });
  }

  function patchRow(rowId: string, next: Partial<OrderItem>) {
    if (!order) return;
    patch({
      items: order.items.map((row) => (row.id === rowId ? { ...row, ...next } : row)),
    });
  }

  function setAttr(rowId: string, attrId: string, value: string | number | boolean | null) {
    if (!order) return;
    patch({
      items: order.items.map((row) =>
        row.id === rowId ? { ...row, attributeValues: { ...row.attributeValues, [attrId]: value } } : row,
      ),
    });
  }

  async function browseDesign() {
    const file = await api().dialogs.openFile({
      title: "Select design PSD for this run",
      filters: [{ name: "Photoshop", extensions: ["psd", "psb"] }],
    });
    if (file) patch({ designTemplatePath: file });
  }

  async function browseOutput() {
    const folder = await api().dialogs.openFolder("Output folder for this run");
    if (folder) patch({ outputFolder: folder });
  }

  async function saveDraft() {
    if (!order) return null;
    setError("");
    const saved = await api().orders.save(order);
    setOrder(saved);
    if (!id) navigate(`/orders/${saved.id}`, { replace: true });
    setNotice("Order saved.");
    return saved;
  }

  async function run() {
    if (!order || !profile) return;
    setError("");
    setNotice("");
    const ready = profileReadyForAutomation(profile);
    if (!ready.ok) {
      setError(ready.issues.map((i) => i.message).join(" "));
      return;
    }
    const check = validateOrder(order, profile);
    if (!check.ok) {
      setError(check.issues.map((i) => i.message).join(" "));
      return;
    }
    setRunning(true);
    try {
      const saved = await api().orders.save({ ...order, status: "queued" });
      setOrder(saved);
      if (!id) navigate(`/orders/${saved.id}`, { replace: true });
      const job = await api().jobs.runOrder(saved.id);
      setNotice(
        job.status === "completed"
          ? "Automation finished. Check the output folder and Jobs."
          : "Automation finished with errors. See Jobs for details.",
      );
      const updated = await api().orders.get(saved.id);
      if (updated) setOrder(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  if (!loaded) return <p className="muted">Loading order…</p>;
  if (!order) {
    return (
      <>
        {error && <div className="error-banner">{error}</div>}
        <button className="btn" onClick={() => navigate("/profiles/new")}>
          Create a garment profile
        </button>
      </>
    );
  }

  const issues = profile ? validateOrder(order, profile).issues : [];
  const attrs = [...(profile?.attributes ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const sizes = [...(profile?.sizes ?? [])].filter((s) => s.enabled);

  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="ok-banner">{notice}</div>}
      <p className="page-lead">
        Pick the garment profile, then the design file, output folder, and save formats for this batch. Rows use
        that profile’s fields. Photoshop must be installed to run.
      </p>
      <section className="card">
        <h3>This run</h3>
        <div className="card-body form-grid">
          <div className="field">
            <label>Order name</label>
            <input className="input" value={order.name} onChange={(e) => patch({ name: e.target.value })} />
          </div>
          <div className="field">
            <label>Garment profile</label>
            <select className="select" value={order.profileId} onChange={(e) => setProfileId(e.target.value)}>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || "Untitled"}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Customer / team (optional)</label>
            <input className="input" value={order.customerName} onChange={(e) => patch({ customerName: e.target.value })} />
          </div>
          <div className="field span-2">
            <label>Design file (this run only)</label>
            <div className="path-row">
              <input
                className="input"
                value={order.designTemplatePath}
                onChange={(e) => patch({ designTemplatePath: e.target.value })}
              />
              <button className="btn" onClick={browseDesign}>
                Browse
              </button>
            </div>
          </div>
          <div className="field span-2">
            <label>Output folder (this run only)</label>
            <div className="path-row">
              <input className="input" value={order.outputFolder} onChange={(e) => patch({ outputFolder: e.target.value })} />
              <button className="btn" onClick={browseOutput}>
                Browse
              </button>
            </div>
          </div>
          <div className="field span-2">
            <label>Save formats (this run only)</label>
            <div className="row-actions">
              <label className="check-inline">
                <input
                  type="checkbox"
                  checked={order.exportFormats.savePsd}
                  onChange={(e) =>
                    patch({ exportFormats: { ...order.exportFormats, savePsd: e.target.checked } })
                  }
                />
                PSD
              </label>
              <label className="check-inline">
                <input
                  type="checkbox"
                  checked={order.exportFormats.savePng}
                  onChange={(e) =>
                    patch({ exportFormats: { ...order.exportFormats, savePng: e.target.checked } })
                  }
                />
                PNG
              </label>
              <label className="check-inline">
                <input
                  type="checkbox"
                  checked={order.exportFormats.saveJpg}
                  onChange={(e) =>
                    patch({ exportFormats: { ...order.exportFormats, saveJpg: e.target.checked } })
                  }
                />
                JPG
              </label>
            </div>
          </div>
          <div className="field span-2">
            <label>File naming (this run only)</label>
            <input
              className="input"
              value={order.namingTemplate}
              onChange={(e) => patch({ namingTemplate: e.target.value })}
            />
            <span className="muted">Tokens: {"{order} {garment} {size} {item} {customer} {date}"} and field keys.</span>
          </div>
        </div>
      </section>
      <div className="toolbar" style={{ marginTop: 12 }}>
        <button className="btn primary" disabled={!profile} onClick={() => profile && patch({ items: [...order.items, emptyOrderItem(profile)] })}>
          Add row
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {attrs.map((attr) => (
                <th key={attr.id}>{attr.displayName || attr.key}</th>
              ))}
              <th>Size</th>
              <th>Qty</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {order.items.map((row) => (
              <tr key={row.id}>
                {attrs.map((attr) => (
                  <td key={attr.id}>
                    {attr.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        checked={Boolean(row.attributeValues[attr.id])}
                        onChange={(e) => setAttr(row.id, attr.id, e.target.checked)}
                      />
                    ) : (
                      <input
                        className="input"
                        value={row.attributeValues[attr.id] === null || row.attributeValues[attr.id] === undefined ? "" : String(row.attributeValues[attr.id])}
                        onChange={(e) => setAttr(row.id, attr.id, e.target.value)}
                      />
                    )}
                  </td>
                ))}
                <td>
                  <select className="select" value={row.sizeId} onChange={(e) => patchRow(row.id, { sizeId: e.target.value })}>
                    {sizes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ width: 72 }}>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => patchRow(row.id, { quantity: Number(e.target.value) || 1 })}
                  />
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="btn"
                      onClick={() => patch({ items: [...order.items, { ...row, id: createId("row") }] })}
                    >
                      Duplicate
                    </button>
                    <button
                      className="btn danger"
                      onClick={() => patch({ items: order.items.filter((r) => r.id !== row.id) })}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {issues.length > 0 && (
        <p className="muted" style={{ marginTop: 8 }}>
          {issues.length} check{issues.length === 1 ? "" : "s"} before run: {issues[0].message}
        </p>
      )}
      <div className="toolbar" style={{ marginTop: 12 }}>
        <button className="btn" onClick={() => saveDraft().catch((e: Error) => setError(e.message))}>
          Save order
        </button>
        <button className="btn primary" disabled={running} onClick={run}>
          {running ? "Running in Photoshop…" : "Run automation"}
        </button>
        <button className="btn" onClick={() => navigate("/orders")}>
          Back
        </button>
      </div>
    </>
  );
}

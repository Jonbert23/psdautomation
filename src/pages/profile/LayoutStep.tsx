import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { GarmentPart, GarmentProfile } from "@shared/types";
import {
  defaultLayoutSizeId,
  documentPlacements,
  layoutBounds,
  layoutPlacements,
  resetLayoutOffsets,
  sizesWithPresetCoverage,
  usesFreeOffsets,
} from "@shared/layout";
import type { LayoutPreviewPart } from "../../vite-env";
import { api } from "../../lib/api";

const CANVAS_W = 780;
const CANVAS_H = 420;

export function LayoutStep({
  profile,
  onChange,
}: {
  profile: GarmentProfile;
  onChange: (patch: Partial<GarmentProfile>) => void;
}) {
  const covered = useMemo(() => sizesWithPresetCoverage(profile), [profile]);
  const [sizeId, setSizeId] = useState(
    () => profile.layoutReferenceSizeId || defaultLayoutSizeId(profile) || covered[0]?.id || "",
  );
  const [previews, setPreviews] = useState<LayoutPreviewPart[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const drag = useRef<{ partId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    if (!sizeId && covered[0]) setSizeId(covered[0].id);
  }, [covered, sizeId]);

  const presetKey = profile.presetAssignments.map((a) => `${a.sizeId}:${a.partId}:${a.filePath}`).join("|");

  useEffect(() => {
    if (!sizeId) {
      setPreviews([]);
      return;
    }
    let cancelled = false;
    api()
      .layout.preview(profile, sizeId)
      .then((rows) => {
        if (!cancelled) setPreviews(rows);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
    // profile snapshot for PNG paths only — offsets are applied from profile.parts below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeId, presetKey]);

  const sizes = previews.map((p) => ({ partId: p.partId, width: p.width, height: p.height }));
  const placed = layoutPlacements(profile.parts, sizes);
  const bounds = layoutBounds(placed);
  const docPlaced = documentPlacements(placed);
  const scale = Math.min(CANVAS_W / Math.max(bounds.width, 1), CANVAS_H / Math.max(bounds.height, 1), 1);
  const previewById = new Map(previews.map((p) => [p.partId, p]));
  const selected = profile.parts.find((p) => p.id === selectedId);
  const selectedPlace = placed.find((p) => p.partId === selectedId);

  function bakeRowIfNeeded(parts: GarmentPart[]): GarmentPart[] {
    if (usesFreeOffsets(parts)) return parts;
    const baked = layoutPlacements(parts, sizes);
    return parts.map((part) => {
      const hit = baked.find((p) => p.partId === part.id);
      return hit ? { ...part, offsetX: hit.x, offsetY: hit.y } : part;
    });
  }

  function setPartOffset(partId: string, x: number, y: number) {
    const next = bakeRowIfNeeded(profile.parts).map((part) =>
      part.id === partId ? { ...part, offsetX: Math.round(x), offsetY: Math.round(y) } : part,
    );
    onChange({ parts: next, layoutReferenceSizeId: sizeId });
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, partId: string) {
    const hit = placed.find((p) => p.partId === partId);
    if (!hit) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(partId);
    drag.current = {
      partId,
      startX: event.clientX,
      startY: event.clientY,
      origX: hit.x,
      origY: hit.y,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const state = drag.current;
    if (!state) return;
    const dx = (event.clientX - state.startX) / scale;
    const dy = (event.clientY - state.startY) / scale;
    setPartOffset(state.partId, state.origX + dx, state.origY + dy);
  }

  function onPointerUp() {
    drag.current = null;
  }

  async function openPhotoshop() {
    setError("");
    setNotice("");
    setBusy("Opening Photoshop…");
    try {
      await api().layout.open(profile, sizeId);
      setNotice("Photoshop is open. Move the part:* layers, then click Capture layout.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function capturePhotoshop() {
    setError("");
    setNotice("");
    setBusy("Capturing layout…");
    try {
      const next = await api().layout.capture(profile);
      onChange({ parts: next.parts, layoutReferenceSizeId: sizeId });
      setNotice("Captured layer positions from Photoshop.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  function resetRow() {
    onChange({ parts: resetLayoutOffsets(profile.parts), layoutReferenceSizeId: sizeId });
    setNotice("Offsets cleared. Parts will pack left to right until you arrange them.");
  }

  return (
    <>
      <p className="page-lead">
        Arrange parts once for every size. Drag on the canvas, or open Photoshop, move the layers, then capture. Original
        PNG presets are not overwritten.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="ok-banner">{notice}</div>}
      {covered.length === 0 ? (
        <div className="empty">Assign required PNG presets before arranging parts.</div>
      ) : (
        <>
          <div className="toolbar">
            <label className="field" style={{ minWidth: 180 }}>
              <span>Preview size</span>
              <select
                className="select"
                value={sizeId}
                onChange={(e) => {
                  setSizeId(e.target.value);
                  onChange({ layoutReferenceSizeId: e.target.value });
                }}
              >
                {covered.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn primary" disabled={Boolean(busy) || !sizeId} onClick={openPhotoshop}>
              Open in Photoshop
            </button>
            <button className="btn" disabled={Boolean(busy)} onClick={capturePhotoshop}>
              Capture layout
            </button>
            <button className="btn" onClick={resetRow}>
              Reset to auto-row
            </button>
            {busy && <span className="muted">{busy}</span>}
          </div>
          <div
            className="layout-canvas"
            style={{ width: CANVAS_W, height: CANVAS_H }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {docPlaced.map((item) => {
              const preview = previewById.get(item.partId);
              if (!preview) return null;
              return (
                <button
                  key={item.partId}
                  type="button"
                  className={`layout-part${selectedId === item.partId ? " selected" : ""}`}
                  style={{
                    left: item.x * scale,
                    top: item.y * scale,
                    width: item.width * scale,
                    height: item.height * scale,
                    backgroundImage: `url(${preview.dataUrl})`,
                  }}
                  onPointerDown={(e) => onPointerDown(e, item.partId)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                >
                  <span>{preview.name}</span>
                </button>
              );
            })}
            {previews.length === 0 && <div className="empty layout-empty">No PNG previews for this size.</div>}
          </div>
          {selected && selectedPlace && (
            <div className="form-grid" style={{ marginTop: 12, maxWidth: 420 }}>
              <div className="field">
                <label htmlFor="layout-x">{selected.name || "Part"} X</label>
                <input
                  id="layout-x"
                  className="input"
                  type="number"
                  value={Math.round(selectedPlace.x)}
                  onChange={(e) => setPartOffset(selected.id, Number(e.target.value), selectedPlace.y)}
                />
              </div>
              <div className="field">
                <label htmlFor="layout-y">{selected.name || "Part"} Y</label>
                <input
                  id="layout-y"
                  className="input"
                  type="number"
                  value={Math.round(selectedPlace.y)}
                  onChange={(e) => setPartOffset(selected.id, selectedPlace.x, Number(e.target.value))}
                />
              </div>
            </div>
          )}
          <p className="muted" style={{ marginTop: 10 }}>
            {usesFreeOffsets(profile.parts)
              ? "Using captured/dragged positions for every size."
              : "No custom positions yet. Production will pack parts left to right."}
          </p>
        </>
      )}
    </>
  );
}

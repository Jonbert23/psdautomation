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

export function LayoutStep({
  profile,
  onChange,
}: {
  profile: GarmentProfile;
  onChange: (patch: Partial<GarmentProfile>) => void;
}) {
  const covered = useMemo(() => sizesWithPresetCoverage(profile), [profile]);
  const sizeId = defaultLayoutSizeId(profile) || "";
  const [previews, setPreviews] = useState<LayoutPreviewPart[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ partId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const presetKey = profile.presetAssignments.map((a) => `${a.sizeId}:${a.partId}:${a.filePath}`).join("|");

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setCanvasSize({ width: Math.max(1, rect.width), height: Math.max(1, rect.height) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [covered.length]);

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
  const scale = Math.min(
    canvasSize.width / Math.max(bounds.width, 1),
    canvasSize.height / Math.max(bounds.height, 1),
  );
  const offsetX = (canvasSize.width - bounds.width * scale) / 2;
  const offsetY = (canvasSize.height - bounds.height * scale) / 2;
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

  function resetRow() {
    onChange({ parts: resetLayoutOffsets(profile.parts), layoutReferenceSizeId: sizeId });
    setNotice("Offsets cleared. Parts will pack left to right until you arrange them.");
  }

  return (
    <div className="layout-step">
      <p className="page-lead">
        Arrange parts once for every size. Drag them on the canvas. Original PNG presets are not overwritten.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="ok-banner">{notice}</div>}
      {covered.length === 0 ? (
        <div className="empty">Assign required PNG presets before arranging parts.</div>
      ) : (
        <>
          <div className="toolbar">
            <button className="btn" type="button" onClick={resetRow}>
              Reset to auto-row
            </button>
          </div>
          <div
            ref={canvasRef}
            className="layout-canvas"
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
                    left: offsetX + item.x * scale,
                    top: offsetY + item.y * scale,
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
    </div>
  );
}

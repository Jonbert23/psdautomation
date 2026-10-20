import type { GarmentPart, GarmentProfile, SizeDefinition } from "./types";

export const LAYOUT_ROW_SPACING = 5;
export const LAYOUT_DOCUMENT_NAME = "GARMENT_LAYOUT";

export interface PartPixelSize {
  partId: string;
  width: number;
  height: number;
}

export interface PlacedPart {
  partId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutBounds {
  width: number;
  height: number;
  originX: number;
  originY: number;
}

export interface CapturedPosition {
  partId: string;
  x: number;
  y: number;
  sortOrder?: number;
}

export function usesFreeOffsets(parts: Pick<GarmentPart, "enabled" | "offsetX" | "offsetY">[]): boolean {
  return parts.some((p) => p.enabled && (p.offsetX !== 0 || p.offsetY !== 0));
}

export function enabledPartsSorted(parts: GarmentPart[]): GarmentPart[] {
  return parts.filter((p) => p.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function autoRowPlacements(sizes: PartPixelSize[], spacing = LAYOUT_ROW_SPACING): PlacedPart[] {
  let x = 0;
  return sizes.map((size, index) => {
    if (index > 0) x += spacing;
    const placed: PlacedPart = {
      partId: size.partId,
      x,
      y: 0,
      width: size.width,
      height: size.height,
    };
    x += size.width;
    return placed;
  });
}

export function freeOffsetPlacements(
  parts: Pick<GarmentPart, "id" | "offsetX" | "offsetY">[],
  sizes: PartPixelSize[],
): PlacedPart[] {
  const sizeById = new Map(sizes.map((s) => [s.partId, s]));
  return parts
    .map((part) => {
      const size = sizeById.get(part.id);
      if (!size) return null;
      return {
        partId: part.id,
        x: part.offsetX,
        y: part.offsetY,
        width: size.width,
        height: size.height,
      };
    })
    .filter((p): p is PlacedPart => p !== null);
}

export function layoutPlacements(
  parts: GarmentPart[],
  sizes: PartPixelSize[],
  spacing = LAYOUT_ROW_SPACING,
): PlacedPart[] {
  const enabled = enabledPartsSorted(parts);
  const sizeOrder = enabled
    .map((part) => sizes.find((s) => s.partId === part.id))
    .filter((s): s is PartPixelSize => Boolean(s));
  if (!usesFreeOffsets(enabled)) return autoRowPlacements(sizeOrder, spacing);
  return freeOffsetPlacements(enabled, sizeOrder);
}

export function layoutBounds(placements: PlacedPart[]): LayoutBounds {
  if (placements.length === 0) {
    return { width: 1, height: 1, originX: 0, originY: 0 };
  }
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const p of placements) {
    left = Math.min(left, p.x);
    top = Math.min(top, p.y);
    right = Math.max(right, p.x + p.width);
    bottom = Math.max(bottom, p.y + p.height);
  }
  return {
    originX: left,
    originY: top,
    width: Math.max(1, Math.ceil(right - left)),
    height: Math.max(1, Math.ceil(bottom - top)),
  };
}

export function documentPlacements(placements: PlacedPart[]): PlacedPart[] {
  const bounds = layoutBounds(placements);
  return placements.map((p) => ({
    ...p,
    x: p.x - bounds.originX,
    y: p.y - bounds.originY,
  }));
}

export function applyCapturedPositions(parts: GarmentPart[], captured: CapturedPosition[]): GarmentPart[] {
  const byId = new Map(captured.map((c) => [c.partId, c]));
  const next = parts.map((part) => {
    const hit = byId.get(part.id);
    if (!hit) return part;
    return {
      ...part,
      offsetX: hit.x,
      offsetY: hit.y,
      sortOrder: hit.sortOrder ?? part.sortOrder,
    };
  });
  return next;
}

export function resetLayoutOffsets(parts: GarmentPart[]): GarmentPart[] {
  return parts.map((part) => ({ ...part, offsetX: 0, offsetY: 0 }));
}

export function sizesWithPresetCoverage(profile: GarmentProfile): SizeDefinition[] {
  const enabledParts = enabledPartsSorted(profile.parts);
  const required = enabledParts.filter((p) => p.required);
  return profile.sizes
    .filter((s) => s.enabled)
    .filter((size) =>
      required.every((part) =>
        profile.presetAssignments.some(
          (a) => a.sizeId === size.id && a.partId === part.id && a.filePath.trim() !== "",
        ),
      ),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function defaultLayoutSizeId(profile: GarmentProfile): string | undefined {
  const covered = sizesWithPresetCoverage(profile);
  if (covered.length === 0) return undefined;
  const remembered = covered.find((s) => s.id === profile.layoutReferenceSizeId);
  if (remembered) return remembered.id;
  return covered[covered.length - 1].id;
}

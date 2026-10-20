import type { AttributeDefinition, GarmentProfile } from "./types";
import {
  documentPlacements,
  enabledPartsSorted,
  layoutBounds,
  layoutPlacements,
  type PartPixelSize,
} from "./layout";

export const DEFAULT_PLACEHOLDER_WIDTH = 400;
export const DEFAULT_PLACEHOLDER_HEIGHT = 500;
export const PLACEHOLDER_FILLS = ["#3d6b99", "#8a5a12", "#1f5c3a", "#6b3d6b", "#5c3a1f", "#2e4a6b"];
export const TEXT_FIELD_TYPES = new Set(["text", "number", "select", "color"]);

export interface TemplateTextLayer {
  name: string;
  contents: string;
}

export interface TemplateFill {
  hex: string;
  r: number;
  g: number;
  b: number;
}

export interface TemplateGroup {
  partId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: TemplateFill;
  texts: TemplateTextLayer[];
}

export interface TemplateSkip {
  attributeId: string;
  displayName: string;
  reason: string;
}

export interface TemplateSpec {
  width: number;
  height: number;
  documentName: string;
  groups: TemplateGroup[];
  skipped: TemplateSkip[];
}

export function splitLayerNames(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function hexToRgb(hex: string): TemplateFill {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return {
    hex,
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function textContents(attr: AttributeDefinition): string {
  if (attr.defaultValue !== null && attr.defaultValue !== undefined && String(attr.defaultValue).trim() !== "") {
    return String(attr.defaultValue);
  }
  if (attr.placeholder.trim()) return attr.placeholder;
  return attr.displayName.trim() || attr.key || "Text";
}

export function buildTemplateSpec(profile: GarmentProfile, sizes: PartPixelSize[] = []): TemplateSpec {
  const parts = enabledPartsSorted(profile.parts).filter((p) => p.photoshopLayer.trim() !== "");
  const sizeById = new Map(sizes.map((s) => [s.partId, s]));
  const resolvedSizes: PartPixelSize[] = parts.map((part) => {
    const hit = sizeById.get(part.id);
    return {
      partId: part.id,
      width: hit?.width && hit.width > 0 ? hit.width : DEFAULT_PLACEHOLDER_WIDTH,
      height: hit?.height && hit.height > 0 ? hit.height : DEFAULT_PLACEHOLDER_HEIGHT,
    };
  });
  const placed = documentPlacements(layoutPlacements(parts, resolvedSizes));
  const bounds = layoutBounds(placed);
  const skipped: TemplateSkip[] = [];
  const groups: TemplateGroup[] = [];

  for (const [index, part] of parts.entries()) {
    const box = placed.find((p) => p.partId === part.id);
    if (!box) continue;
    const seen = new Set<string>();
    const texts: TemplateTextLayer[] = [];
    for (const attr of profile.attributes) {
      if (!TEXT_FIELD_TYPES.has(attr.type)) {
        if (attr.mapping?.partId === part.id) {
          skipped.push({
            attributeId: attr.id,
            displayName: attr.displayName || attr.key,
            reason: `Field type "${attr.type}" is not created as a text layer.`,
          });
        }
        continue;
      }
      if (attr.mapping?.partId !== part.id) continue;
      const names = splitLayerNames(attr.mapping.layerName ?? "");
      if (names.length === 0) {
        skipped.push({
          attributeId: attr.id,
          displayName: attr.displayName || attr.key,
          reason: "No Photoshop layer name.",
        });
        continue;
      }
      const contents = textContents(attr);
      for (const name of names) {
        if (seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        texts.push({ name, contents });
      }
    }
    groups.push({
      partId: part.id,
      name: part.photoshopLayer.trim(),
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      fill: hexToRgb(PLACEHOLDER_FILLS[index % PLACEHOLDER_FILLS.length]),
      texts,
    });
  }

  for (const attr of profile.attributes) {
    if (!TEXT_FIELD_TYPES.has(attr.type)) continue;
    if (!attr.mapping?.partId) {
      skipped.push({
        attributeId: attr.id,
        displayName: attr.displayName || attr.key,
        reason: "Not attached to a garment part.",
      });
      continue;
    }
    if (!parts.some((p) => p.id === attr.mapping?.partId)) {
      skipped.push({
        attributeId: attr.id,
        displayName: attr.displayName || attr.key,
        reason: "Attached part is missing or disabled.",
      });
    }
  }

  const name = profile.name.trim() || "Garment template";
  return {
    width: bounds.width,
    height: bounds.height,
    documentName: name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80),
    groups,
    skipped,
  };
}

import { createId } from "@shared/ids";
import type { AttributeDefinition, AttributeType, GarmentPart, SizeDefinition } from "@shared/types";

export function newPart(sortOrder: number): GarmentPart {
  return {
    id: createId("part"),
    name: "",
    enabled: true,
    required: false,
    sortOrder,
    photoshopLayer: "",
    layerKind: "group",
    offsetX: 0,
    offsetY: 0,
    scaleMode: "stretch",
    clippingMask: true,
    visibleInOutput: true,
  };
}

export function newSize(sortOrder: number, label = ""): SizeDefinition {
  return {
    id: createId("size"),
    label,
    description: "",
    enabled: true,
    sortOrder,
    partDimensions: {},
  };
}

export function slugKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "field";
}

export function newAttribute(sortOrder: number, type: AttributeType = "text"): AttributeDefinition {
  return {
    id: createId("attr"),
    key: `field_${sortOrder + 1}`,
    displayName: "",
    type,
    description: "",
    required: false,
    defaultValue: type === "checkbox" ? false : "",
    placeholder: "",
    group: "",
    sortOrder,
    options: [],
  };
}

export function reorderItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const copy = list.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function fileName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

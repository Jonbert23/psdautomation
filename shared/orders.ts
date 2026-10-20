import type { GarmentProfile, OrderExportFormats, OrderItem, ProductionOrder } from "./types";
import { createId, nowIso } from "./ids";
import { DEFAULT_NAMING_TEMPLATE } from "./naming";

export function defaultOrderExportFormats(): OrderExportFormats {
  return {
    savePsd: true,
    savePng: false,
    saveJpg: false,
    jpgQuality: 10,
  };
}

export function normalizeOrder(order: ProductionOrder): ProductionOrder {
  const formats = order.exportFormats ?? defaultOrderExportFormats();
  const naming = (order.namingTemplate ?? "").trim() || DEFAULT_NAMING_TEMPLATE;
  return {
    ...order,
    exportFormats: {
      savePsd: Boolean(formats.savePsd),
      savePng: Boolean(formats.savePng),
      saveJpg: Boolean(formats.saveJpg),
      jpgQuality: typeof formats.jpgQuality === "number" ? formats.jpgQuality : 10,
    },
    namingTemplate: naming,
  };
}

export function emptyOrderItem(profile: GarmentProfile): OrderItem {
  const size = profile.sizes.find((s) => s.enabled) ?? profile.sizes[0];
  const attributeValues: OrderItem["attributeValues"] = {};
  for (const attr of profile.attributes) {
    attributeValues[attr.id] = attr.defaultValue;
  }
  return {
    id: createId("row"),
    sizeId: size?.id ?? "",
    quantity: 1,
    attributeValues,
  };
}

export function emptyOrder(profile: GarmentProfile): ProductionOrder {
  const stamp = nowIso();
  return {
    id: createId("ord"),
    name: "",
    profileId: profile.id,
    customerName: "",
    notes: "",
    status: "draft",
    designTemplatePath: "",
    outputFolder: "",
    exportFormats: defaultOrderExportFormats(),
    namingTemplate: profile.exportSettings?.namingTemplate?.trim() || DEFAULT_NAMING_TEMPLATE,
    items: [emptyOrderItem(profile)],
    createdAt: stamp,
    updatedAt: stamp,
  };
}

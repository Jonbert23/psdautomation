import type { AppDatabase, AppSettings, Category, ExportSettings, GarmentProfile } from "./types";
import { SCHEMA_VERSION } from "./types";
import { createId, nowIso } from "./ids";

export const DEFAULT_CATEGORIES: { id: string; name: string }[] = [
  { id: "tshirt", name: "T-shirt" },
  { id: "basketball-jersey", name: "Basketball jersey" },
  { id: "polo", name: "Polo shirt" },
  { id: "long-sleeve", name: "Long sleeve" },
  { id: "rider-jersey", name: "Rider jersey" },
  { id: "esports-jersey", name: "Esports jersey" },
  { id: "hoodie", name: "Hoodie" },
  { id: "custom", name: "Custom garment" },
];

export function defaultExportSettings(): ExportSettings {
  return {
    savePsd: true,
    savePng: false,
    saveJpg: false,
    jpgQuality: 10,
    preserveLayers: true,
    exportPartsSeparately: false,
    exportCombinedDocument: false,
    namingTemplate: "{order}_{garment}_{size}_{item}",
    conflictPolicy: "warn",
    organizeBy: "order",
    defaultOutputFolder: "",
  };
}

export function profileCategoryIds(profile: Pick<GarmentProfile, "categoryId" | "categoryIds">): string[] {
  const listed = Array.isArray(profile.categoryIds)
    ? profile.categoryIds.map((id) => id.trim()).filter(Boolean)
    : [];
  const unique = [...new Set(listed)];
  if (unique.length) return unique;
  const single = profile.categoryId?.trim();
  return single ? [single] : [];
}

export function emptyProfile(partial?: Partial<GarmentProfile>): GarmentProfile {
  const stamp = nowIso();
  const profile: GarmentProfile = {
    id: createId("prf"),
    name: "",
    categoryId: "custom",
    categoryIds: ["custom"],
    description: "",
    previewImage: "",
    templatePath: "",
    status: "active",
    parts: [],
    sizes: [],
    attributes: [],
    presetAssignments: [],
    exportSettings: defaultExportSettings(),
    createdAt: stamp,
    updatedAt: stamp,
    ...partial,
  };
  const ids = profileCategoryIds(
    partial?.categoryIds?.length
      ? profile
      : { categoryId: profile.categoryId, categoryIds: [] },
  );
  profile.categoryIds = ids;
  profile.categoryId = ids[0] || "";
  return profile;
}

export function seedCategories(): Category[] {
  const stamp = nowIso();
  return DEFAULT_CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: stamp,
  }));
}

export function defaultSettings(): AppSettings {
  return {
    photoshopPath: "",
    lastOutputFolder: "",
    notifyOnJobFinished: false,
    notifyOnLicenseExpiry: false,
    licenseExpiryNotifiedFor: null,
  };
}

export function emptyDatabase(): AppDatabase {
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: seedCategories(),
    profiles: [],
    orders: [],
    jobs: [],
    activity: [
      {
        id: createId("act"),
        at: nowIso(),
        type: "system",
        message: "Workspace initialized. Create a garment profile to begin.",
      },
    ],
    settings: defaultSettings(),
    profileSync: {},
    pendingProfileDeletes: [],
  };
}

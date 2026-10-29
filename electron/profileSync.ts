import fs from "node:fs";
import path from "node:path";
import type { LicenseService } from "./license";
import type { WorkspaceStore } from "./store";
import { emptyProfile, defaultExportSettings, profileCategoryIds } from "../shared/defaults";
import { createId } from "../shared/ids";
import type { ExportSettings, GarmentProfile, PublicCatalogProfile } from "../shared/types";

function safeFileName(name: string, fallback: string): string {
  const base = path.basename(name || fallback).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.toLowerCase().endsWith(".png") ? base : `${base || "preset"}.png`;
}

function asCatalog(value: unknown): PublicCatalogProfile[] {
  if (!value || typeof value !== "object") return [];
  const profiles = (value as { profiles?: unknown }).profiles;
  return Array.isArray(profiles) ? (profiles as PublicCatalogProfile[]) : [];
}

export class ProfileSync {
  private running = false;

  constructor(
    private readonly store: WorkspaceStore,
    private readonly license: LicenseService,
    private readonly userDataDir: string,
  ) {}

  async syncPending(): Promise<void> {
    if (this.running) return;
    if (!this.license.status().signedIn) return;
    this.running = true;
    try {
      await this.flushDeletes();
      for (const profile of this.store.listProfiles()) {
        if (profile.catalogImport) continue;
        if (this.store.syncStamp(profile.id) === profile.updatedAt) continue;
        try {
          await this.push(profile);
        } catch {
          // The next pass retries a profile that could not be uploaded.
        }
      }
    } finally {
      this.running = false;
    }
  }

  syncOne(id: string): void {
    const profile = this.store.getProfile(id);
    if (!profile || profile.catalogImport) return;
    void this.push(profile).catch(() => undefined);
  }

  async flushDeletes(): Promise<void> {
    if (!this.license.status().signedIn) return;
    for (const localId of this.store.pendingDeletes()) {
      try {
        const data = await this.license.callFunction("deleteMyProfile", { localId });
        if (data.ok) this.store.completeProfileDelete(localId);
      } catch {
        // Keep the id queued until the PC is online.
      }
    }
  }

  async listPublic(): Promise<PublicCatalogProfile[]> {
    const data = await this.license.callFunction("listPublicProfiles", {});
    if (!data.ok) throw new Error(String(data.message || "Could not load public profiles."));
    return asCatalog(data);
  }

  async download(remote: PublicCatalogProfile): Promise<GarmentProfile> {
    const id = createId("prf");
    const dir = path.join(this.userDataDir, "catalog-presets", id);
    fs.mkdirSync(dir, { recursive: true });
    const presetAssignments = [];
    for (const preset of remote.presets || []) {
      if (!preset?.fileUrl) continue;
      const response = await fetch(preset.fileUrl);
      if (!response.ok) throw new Error(`Could not download a preset for ${remote.name}.`);
      const fileName = safeFileName(preset.fileName, `${preset.sizeId}-${preset.partId}.png`);
      const filePath = path.join(dir, fileName);
      fs.writeFileSync(filePath, Buffer.from(await response.arrayBuffer()));
      presetAssignments.push({ sizeId: preset.sizeId, partId: preset.partId, filePath });
    }

    const names = (remote.categoryNames || []).map((name) => name.trim()).filter(Boolean);
    const categoryNames = names.length ? names : [remote.categoryName || "Custom garment"];
    const categories = categoryNames.map((name) => this.store.ensureCategory(name));
    const exportSettings: ExportSettings = {
      ...defaultExportSettings(),
      ...(remote.exportSettings || {}),
      defaultOutputFolder: "",
    };
    return this.store.saveProfile(
      emptyProfile({
        id,
        name: remote.name || "Public profile",
        description: remote.description || "",
        categoryId: categories[0]?.id || "",
        categoryIds: categories.map((category) => category.id),
        status: remote.status === "archived" ? "archived" : "active",
        parts: remote.parts || [],
        sizes: remote.sizes || [],
        attributes: remote.attributes || [],
        presetAssignments,
        exportSettings,
        layoutReferenceSizeId: remote.layoutReferenceSizeId || "",
        templatePath: "",
        previewImage: "",
        catalogImport: true,
      }),
    );
  }

  private async push(profile: GarmentProfile): Promise<void> {
    const categories = this.store.listCategories();
    const categoryNames = profileCategoryIds(profile)
      .map((id) => categories.find((item) => item.id === id)?.name || "")
      .filter(Boolean);
    const presets = [];
    for (const assignment of profile.presetAssignments || []) {
      if (!assignment.filePath || !fs.existsSync(assignment.filePath)) continue;
      presets.push({
        sizeId: assignment.sizeId,
        partId: assignment.partId,
        fileName: path.basename(assignment.filePath),
        dataBase64: fs.readFileSync(assignment.filePath).toString("base64"),
      });
    }
    const exportSettings = { ...profile.exportSettings, defaultOutputFolder: "" };
    const data = await this.license.callFunction(
      "syncMyProfiles",
      {
        localId: profile.id,
        name: profile.name,
        description: profile.description,
        categoryName: categoryNames.join(" · "),
        status: profile.status,
        updatedAt: profile.updatedAt,
        profile: {
          parts: profile.parts,
          sizes: profile.sizes,
          attributes: profile.attributes,
          exportSettings,
          layoutReferenceSizeId: profile.layoutReferenceSizeId || "",
          categoryNames,
        },
        presets,
      },
      60_000,
    );
    if (!data.ok) throw new Error(String(data.message || "Could not sync profile."));
    this.store.markProfileSynced(profile.id, profile.updatedAt);
  }
}

import fs from "node:fs";
import path from "node:path";
import type { AppDatabase, ActivityEvent, AutomationJob, GarmentProfile, ProductionOrder } from "../shared/types";
import { SCHEMA_VERSION } from "../shared/types";
import { emptyDatabase, emptyProfile } from "../shared/defaults";
import { normalizeOrder } from "../shared/orders";
import { createId, nowIso } from "../shared/ids";
import { validateProfile, validateSchemaVersion } from "../shared/validation";

const DB_NAME = "workspace.json";

export class WorkspaceStore {
  readonly filePath: string;
  private data: AppDatabase;

  constructor(userDataDir: string) {
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
    this.filePath = path.join(userDataDir, DB_NAME);
    this.data = this.load();
  }

  private load(): AppDatabase {
    if (!fs.existsSync(this.filePath)) {
      const fresh = emptyDatabase();
      this.write(fresh);
      return fresh;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8")) as AppDatabase;
      return this.migrate(parsed);
    } catch {
      const backup = `${this.filePath}.corrupt-${Date.now()}.bak`;
      fs.copyFileSync(this.filePath, backup);
      const fresh = emptyDatabase();
      this.write(fresh);
      return fresh;
    }
  }

  private migrate(data: AppDatabase): AppDatabase {
    const version = data?.schemaVersion ?? 0;
    if (version === SCHEMA_VERSION) {
      return {
        ...emptyDatabase(),
        ...data,
        schemaVersion: SCHEMA_VERSION,
      };
    }
    if (version > SCHEMA_VERSION) {
      throw new Error(`Workspace was saved with schema ${version}. This app supports ${SCHEMA_VERSION}.`);
    }
    const next: AppDatabase = {
      ...emptyDatabase(),
      ...data,
      schemaVersion: SCHEMA_VERSION,
    };
    this.write(next);
    return next;
  }

  private write(data: AppDatabase): void {
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmp, this.filePath);
  }

  private persist(): void {
    this.write(this.data);
  }

  private log(type: string, message: string, entityId?: string): void {
    const event: ActivityEvent = {
      id: createId("act"),
      at: nowIso(),
      type,
      message,
      entityId,
    };
    this.data.activity = [event, ...this.data.activity].slice(0, 200);
  }

  snapshot(): AppDatabase {
    return JSON.parse(JSON.stringify(this.data)) as AppDatabase;
  }

  dashboard() {
    const active = this.data.profiles.filter((p) => p.status === "active");
    return {
      profileCount: active.length,
      sizeCount: active.reduce((n, p) => n + p.sizes.filter((s) => s.enabled).length, 0),
      attributeCount: active.reduce((n, p) => n + p.attributes.length, 0),
      pendingOrders: this.data.orders.filter((o) =>
        ["draft", "validated", "queued", "processing"].includes(o.status),
      ).length,
      completedJobs: this.data.jobs.filter((j) => j.status === "completed").length,
      failedJobs: this.data.jobs.filter((j) => j.status === "failed").length,
    };
  }

  listCategories() {
    return this.data.categories;
  }

  addCategory(name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Category name is required.");
    const exists = this.data.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) throw new Error("A category with that name already exists.");
    const category = { id: createId("cat"), name: trimmed, createdAt: nowIso() };
    this.data.categories.push(category);
    this.log("category", `Added category "${trimmed}"`, category.id);
    this.persist();
    return category;
  }

  listProfiles() {
    return this.data.profiles;
  }

  getProfile(id: string) {
    return this.data.profiles.find((p) => p.id === id) ?? null;
  }

  saveProfile(input: Partial<GarmentProfile> & { id?: string }): GarmentProfile {
    const existing = input.id ? this.getProfile(input.id) : null;
    const profile = existing
      ? { ...existing, ...input, id: existing.id, createdAt: existing.createdAt, updatedAt: nowIso() }
      : emptyProfile({ ...input, updatedAt: nowIso() });

    const v = validateProfile(profile);
    const blocking = v.issues.filter((i) => i.code === "required" && i.path === "categoryId");
    if (blocking.length) throw new Error(blocking[0].message);

    if (existing) {
      this.data.profiles = this.data.profiles.map((p) => (p.id === profile.id ? profile : p));
      this.log("profile", `Updated profile "${profile.name}"`, profile.id);
    } else {
      this.data.profiles.unshift(profile);
      this.log("profile", `Created profile "${profile.name}"`, profile.id);
    }
    this.persist();
    return profile;
  }

  duplicateProfile(id: string): GarmentProfile {
    const source = this.getProfile(id);
    if (!source) throw new Error("Profile not found.");
    const copy = emptyProfile({
      ...JSON.parse(JSON.stringify(source)) as GarmentProfile,
      id: createId("prf"),
      name: `${source.name} copy`,
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    this.data.profiles.unshift(copy);
    this.log("profile", `Duplicated profile "${source.name}"`, copy.id);
    this.persist();
    return copy;
  }

  setProfileStatus(id: string, status: "active" | "archived") {
    const profile = this.getProfile(id);
    if (!profile) throw new Error("Profile not found.");
    profile.status = status;
    profile.updatedAt = nowIso();
    this.log("profile", `${status === "archived" ? "Archived" : "Restored"} "${profile.name}"`, id);
    this.persist();
    return profile;
  }

  deleteProfile(id: string) {
    const profile = this.getProfile(id);
    if (!profile) throw new Error("Profile not found.");
    this.data.profiles = this.data.profiles.filter((p) => p.id !== id);
    this.log("profile", `Deleted profile "${profile.name}"`, id);
    this.persist();
  }

  listOrders() {
    return this.data.orders.map((o) => normalizeOrder(o));
  }

  getOrder(id: string) {
    const found = this.data.orders.find((o) => o.id === id);
    return found ? normalizeOrder(found) : null;
  }

  saveOrder(input: ProductionOrder): ProductionOrder {
    const existing = this.getOrder(input.id);
    const order: ProductionOrder = normalizeOrder({
      ...input,
      updatedAt: nowIso(),
      createdAt: existing?.createdAt ?? input.createdAt ?? nowIso(),
    });
    if (existing) {
      this.data.orders = this.data.orders.map((o) => (o.id === order.id ? order : o));
      this.log("order", `Updated order "${order.name || order.id}"`, order.id);
    } else {
      this.data.orders.unshift(order);
      this.log("order", `Created order "${order.name || order.id}"`, order.id);
    }
    this.persist();
    return order;
  }

  deleteOrder(id: string) {
    const order = this.getOrder(id);
    if (!order) throw new Error("Order not found.");
    this.data.orders = this.data.orders.filter((o) => o.id !== id);
    this.log("order", `Deleted order "${order.name || id}"`, id);
    this.persist();
  }

  listJobs() {
    return this.data.jobs;
  }

  getJob(id: string) {
    return this.data.jobs.find((j) => j.id === id) ?? null;
  }

  saveJob(job: AutomationJob): AutomationJob {
    const existing = this.getJob(job.id);
    if (existing) {
      this.data.jobs = this.data.jobs.map((j) => (j.id === job.id ? job : j));
    } else {
      this.data.jobs.unshift(job);
    }
    this.persist();
    return job;
  }

  listActivity() {
    return this.data.activity;
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(patch: Partial<AppDatabase["settings"]>) {
    this.data.settings = { ...this.data.settings, ...patch };
    this.persist();
    return this.data.settings;
  }

  backupTo(targetPath: string) {
    this.persist();
    fs.copyFileSync(this.filePath, targetPath);
    this.log("system", `Backup written to ${targetPath}`);
    this.persist();
    return targetPath;
  }

  restoreFrom(sourcePath: string) {
    const parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as AppDatabase;
    const check = validateSchemaVersion(parsed.schemaVersion);
    if (!check.ok) throw new Error(check.issues[0]?.message ?? "Invalid backup.");
    this.data = this.migrate(parsed);
    this.log("system", `Workspace restored from ${sourcePath}`);
    this.persist();
    return this.snapshot();
  }
}

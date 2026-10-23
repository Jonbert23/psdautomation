/// <reference types="vite/client" />

import type { DashboardStats, ActivityEvent, Category, GarmentProfile, ProductionOrder, AutomationJob, AppSettings, PublicCatalogProfile } from "@shared/types";
import type { TemplateSkip } from "@shared/templateSpec";
import type { AuthStatus, UserProfile } from "@shared/licenseGrant";
import type { BillingSnapshot, Plan } from "@shared/plans";

export interface DashboardPayload extends DashboardStats {
  activity: ActivityEvent[];
}

export interface LayoutPreviewPart {
  partId: string;
  name: string;
  filePath: string;
  dataUrl: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface DesktopApi {
  dashboard: () => Promise<DashboardPayload>;
  categories: {
    list: () => Promise<Category[]>;
    create: (name: string) => Promise<Category>;
  };
  profiles: {
    list: () => Promise<GarmentProfile[]>;
    get: (id: string) => Promise<GarmentProfile | null>;
    save: (profile: Partial<GarmentProfile>) => Promise<GarmentProfile>;
    duplicate: (id: string) => Promise<GarmentProfile>;
    archive: (id: string) => Promise<GarmentProfile>;
    restore: (id: string) => Promise<GarmentProfile>;
    delete: (id: string) => Promise<void>;
  };
  catalog: {
    list: () => Promise<PublicCatalogProfile[]>;
    download: (profile: PublicCatalogProfile) => Promise<GarmentProfile>;
  };
  orders: {
    list: () => Promise<ProductionOrder[]>;
    get: (id: string) => Promise<ProductionOrder | null>;
    save: (order: ProductionOrder) => Promise<ProductionOrder>;
    delete: (id: string) => Promise<void>;
  };
  jobs: {
    list: () => Promise<AutomationJob[]>;
    get: (id: string) => Promise<AutomationJob | null>;
    runOrder: (orderId: string) => Promise<AutomationJob>;
  };
  auth: {
    status: () => Promise<AuthStatus>;
    login: (email: string, password: string) => Promise<AuthStatus>;
    startWebLogin: () => Promise<AuthStatus>;
    logout: () => Promise<AuthStatus>;
    refresh: () => Promise<AuthStatus>;
    profile: () => Promise<UserProfile>;
    updateProfile: (patch: { displayName?: string }) => Promise<UserProfile>;
    onChanged: (callback: (status: AuthStatus) => void) => () => void;
  };
  billing: {
    plans: () => Promise<Plan[]>;
    status: () => Promise<BillingSnapshot>;
    subscribe: (planId: string) => Promise<AuthStatus>;
    changePlan: (planId: string) => Promise<BillingSnapshot>;
    cancel: () => Promise<BillingSnapshot>;
  };
  activity: { list: () => Promise<ActivityEvent[]> };
  settings: {
    get: () => Promise<AppSettings>;
    update: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  };
  dialogs: {
    openFile: (options?: { title?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
    openFolder: (title?: string) => Promise<string | null>;
  };
  workspace: {
    backup: () => Promise<string | null>;
    restore: () => Promise<unknown>;
  };
  photoshop: {
    detect: () => Promise<{ found: boolean; path: string }>;
  };
  layout: {
    preview: (profile: GarmentProfile, sizeId: string) => Promise<LayoutPreviewPart[]>;
    open: (profile: GarmentProfile, sizeId: string) => Promise<{ ok: true; documentName: string }>;
    capture: (profile: GarmentProfile) => Promise<GarmentProfile>;
  };
  template: {
    generate: (profile: GarmentProfile) => Promise<{ outputPath: string; skipped: TemplateSkip[] } | null>;
  };
}

declare global {
  interface Window {
    api: DesktopApi;
  }
}

export {};

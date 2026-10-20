export const SCHEMA_VERSION = 1 as const;

export type AttributeType =
  | "text"
  | "number"
  | "select"
  | "color"
  | "image"
  | "checkbox";

export type ScaleMode = "fit" | "fill" | "stretch" | "contain";

export type MeasurementUnit = "px" | "cm" | "mm" | "in";

export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type OrderStatus = "draft" | "validated" | "queued" | "processing" | "completed" | "failed";

export type ProfileStatus = "active" | "archived";

export type LayerKindHint =
  | "auto"
  | "text"
  | "group"
  | "smartObject"
  | "raster"
  | "reference";

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Dimensions {
  width: number;
  height: number;
  unit: MeasurementUnit;
}

export interface PartExportSettings {
  enabled: boolean;
  format?: "psd" | "png" | "jpg";
  suffix?: string;
}

export interface GarmentPart {
  id: string;
  name: string;
  enabled: boolean;
  required: boolean;
  sortOrder: number;
  photoshopLayer: string;
  layerKind: LayerKindHint;
  offsetX: number;
  offsetY: number;
  width?: number;
  height?: number;
  scaleMode: ScaleMode;
  clippingMask: boolean;
  visibleInOutput: boolean;
  exportSettings?: PartExportSettings;
}

export interface SizeDefinition {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  sortOrder: number;
  dimensions?: Dimensions;
  partDimensions: Record<string, Dimensions>;
}

export interface SelectOption {
  value: string;
  label: string;
  mapsTo?: {
    layerName?: string;
    textValue?: string;
    visible?: boolean;
  };
}

export interface AttributeMapping {
  layerName: string;
  layerKind: LayerKindHint;
  partId?: string;
}

export interface AttributeDefinition {
  id: string;
  key: string;
  displayName: string;
  type: AttributeType;
  description: string;
  required: boolean;
  defaultValue: string | number | boolean | null;
  placeholder: string;
  group: string;
  sortOrder: number;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options: SelectOption[];
  visibleWhen?: { attributeId: string; equals: string | boolean };
  mapping?: AttributeMapping;
}

export interface PresetAssignment {
  sizeId: string;
  partId: string;
  /** Path to a PNG layout/mask for this size and part. */
  filePath: string;
}

export type FileConflictPolicy = "warn" | "overwrite" | "suffix";

export interface ExportSettings {
  savePsd: boolean;
  savePng: boolean;
  saveJpg: boolean;
  jpgQuality: number;
  preserveLayers: boolean;
  exportPartsSeparately: boolean;
  exportCombinedDocument: boolean;
  namingTemplate: string;
  conflictPolicy: FileConflictPolicy;
  organizeBy: "order" | "garment" | "size" | "customer";
  defaultOutputFolder: string;
}

export interface GarmentProfile {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  previewImage: string;
  templatePath: string;
  status: ProfileStatus;
  parts: GarmentPart[];
  sizes: SizeDefinition[];
  attributes: AttributeDefinition[];
  presetAssignments: PresetAssignment[];
  exportSettings: ExportSettings;
  /** Size whose PNG presets were used when arranging parts. Layout is shared across sizes. */
  layoutReferenceSizeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  sizeId: string;
  quantity: number;
  attributeValues: Record<string, string | number | boolean | null>;
}

export interface OrderExportFormats {
  savePsd: boolean;
  savePng: boolean;
  saveJpg: boolean;
  jpgQuality: number;
}

export interface ProductionOrder {
  id: string;
  name: string;
  profileId: string;
  customerName: string;
  notes: string;
  status: OrderStatus;
  /** Design PSD/PSB for this run only — not stored on the profile. */
  designTemplatePath: string;
  /** Output folder for this run only — not stored on the profile. */
  outputFolder: string;
  /** Save formats for this run only — not stored on the profile. */
  exportFormats: OrderExportFormats;
  /** File naming template for this run only — not stored on the profile. */
  namingTemplate: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface JobItemError {
  code: string;
  message: string;
}

export interface JobItem {
  id: string;
  orderItemId: string;
  status: JobStatus;
  progress: number;
  currentPart?: string;
  error?: JobItemError;
  outputPaths: string[];
}

export interface AutomationJob {
  id: string;
  orderId: string;
  profileId: string;
  status: JobStatus;
  progress: number;
  currentItemId?: string;
  startedAt?: string;
  completedAt?: string;
  logPath?: string;
  items: JobItem[];
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  at: string;
  type: string;
  message: string;
  entityId?: string;
}

export interface AppSettings {
  photoshopPath: string;
  lastOutputFolder: string;
}

export interface AppDatabase {
  schemaVersion: typeof SCHEMA_VERSION;
  categories: Category[];
  profiles: GarmentProfile[];
  orders: ProductionOrder[];
  jobs: AutomationJob[];
  activity: ActivityEvent[];
  settings: AppSettings;
}

export interface DashboardStats {
  profileCount: number;
  sizeCount: number;
  attributeCount: number;
  pendingOrders: number;
  completedJobs: number;
  failedJobs: number;
  photoshopReady: boolean;
  photoshopPath: string;
}

export interface ValidationIssue {
  path: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

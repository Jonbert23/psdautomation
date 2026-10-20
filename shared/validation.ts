import { extractTokens } from "./naming";
import { resolvePresets } from "./presets";
import type {
  AttributeDefinition,
  GarmentProfile,
  ProductionOrder,
  ValidationIssue,
  ValidationResult,
} from "./types";
import { SCHEMA_VERSION } from "./types";

function issue(path: string, code: string, message: string): ValidationIssue {
  return { path, code, message };
}

export function validateSchemaVersion(version: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (version !== SCHEMA_VERSION) {
    issues.push(
      issue("schemaVersion", "unsupported_schema", `Unsupported schema version: ${String(version)}.`),
    );
  }
  return { ok: issues.length === 0, issues };
}

export function validateProfile(profile: GarmentProfile): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!profile.name.trim()) issues.push(issue("name", "required", "Garment name is required."));
  if (!profile.categoryId) issues.push(issue("categoryId", "required", "Category is required."));

  const partIds = new Set<string>();
  for (const part of profile.parts) {
    if (!part.id) issues.push(issue("parts", "invalid_id", "Every part needs a unique id."));
    if (partIds.has(part.id)) {
      issues.push(issue(`parts.${part.id}`, "duplicate_id", `Duplicate part id "${part.id}".`));
    }
    partIds.add(part.id);
    if (!part.name.trim()) {
      issues.push(issue(`parts.${part.id}.name`, "required", "Part name is required."));
    }
  }

  const sizeIds = new Set<string>();
  for (const size of profile.sizes) {
    if (sizeIds.has(size.id)) {
      issues.push(issue(`sizes.${size.id}`, "duplicate_id", `Duplicate size id "${size.id}".`));
    }
    sizeIds.add(size.id);
    if (!size.label.trim()) {
      issues.push(issue(`sizes.${size.id}.label`, "required", "Size label is required."));
    }
  }

  const attrKeys = new Set<string>();
  const attrIds = new Set<string>();
  for (const attr of profile.attributes) {
    if (attrIds.has(attr.id)) {
      issues.push(issue(`attributes.${attr.id}`, "duplicate_id", `Duplicate attribute id "${attr.id}".`));
    }
    attrIds.add(attr.id);
    if (!attr.displayName.trim()) {
      issues.push(issue(`attributes.${attr.id}.displayName`, "required", "Attribute display name is required."));
    }
    if (!attr.key.trim()) {
      issues.push(issue(`attributes.${attr.id}.key`, "required", "Attribute key is required."));
    } else if (attrKeys.has(attr.key)) {
      issues.push(issue(`attributes.${attr.id}.key`, "duplicate_key", `Duplicate attribute key "${attr.key}".`));
    }
    attrKeys.add(attr.key);
    if (attr.type === "select" && attr.options.length === 0) {
      issues.push(issue(`attributes.${attr.id}.options`, "empty_options", `Dropdown "${attr.displayName}" has no options.`));
    }
    if (attr.mapping?.partId && !partIds.has(attr.mapping.partId)) {
      issues.push(
        issue(`attributes.${attr.id}.mapping.partId`, "unknown_part", `Attribute maps to unknown part "${attr.mapping.partId}".`),
      );
    }
  }

  issues.push(...resolvePresets(profile).issues);

  const enabledRequired = profile.parts.filter((p) => p.enabled && p.required);
  if (profile.parts.length > 0 && enabledRequired.length === 0) {
    issues.push(issue("parts", "no_required_part", "At least one enabled part should be required for automation."));
  }

  return { ok: issues.length === 0, issues };
}

export function validateAttributeValue(
  attr: AttributeDefinition,
  value: string | number | boolean | null | undefined,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const empty =
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value.trim() === "");

  if (attr.required && empty && attr.type !== "checkbox") {
    issues.push(issue(attr.key, "required", `"${attr.displayName}" is required.`));
    return issues;
  }
  if (empty) return issues;

  if (attr.type === "number") {
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(n)) issues.push(issue(attr.key, "not_number", `"${attr.displayName}" must be a number.`));
    if (attr.min !== undefined && n < attr.min) {
      issues.push(issue(attr.key, "min", `"${attr.displayName}" must be at least ${attr.min}.`));
    }
    if (attr.max !== undefined && n > attr.max) {
      issues.push(issue(attr.key, "max", `"${attr.displayName}" must be at most ${attr.max}.`));
    }
  }
  if (attr.type === "text" || attr.type === "select") {
    const s = String(value);
    if (attr.minLength !== undefined && s.length < attr.minLength) {
      issues.push(issue(attr.key, "min_length", `"${attr.displayName}" is too short.`));
    }
    if (attr.maxLength !== undefined && s.length > attr.maxLength) {
      issues.push(issue(attr.key, "max_length", `"${attr.displayName}" is too long.`));
    }
  }
  if (attr.type === "select") {
    const allowed = attr.options.map((o) => o.value);
    if (!allowed.includes(String(value))) {
      issues.push(issue(attr.key, "invalid_option", `"${attr.displayName}" has an invalid option.`));
    }
  }
  return issues;
}

export function validateOrder(order: ProductionOrder, profile: GarmentProfile): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!order.name.trim()) issues.push(issue("name", "required", "Order name is required."));
  if (order.profileId !== profile.id) {
    issues.push(issue("profileId", "mismatch", "Order does not match the selected garment profile."));
  }
  if (!order.designTemplatePath.trim()) {
    issues.push(issue("designTemplatePath", "required", "Select a design file for this run."));
  }
  if (!order.outputFolder.trim()) {
    issues.push(issue("outputFolder", "required", "Select an output folder for this run."));
  }
  const formats = order.exportFormats;
  if (!formats || !(formats.savePsd || formats.savePng || formats.saveJpg)) {
    issues.push(issue("exportFormats", "required", "Select at least one save format (PSD, PNG, or JPG)."));
  }
  const naming = (order.namingTemplate ?? "").trim();
  if (!naming) {
    issues.push(issue("namingTemplate", "required", "A file naming template is required for this run."));
  } else {
    const attrKeys = new Set(profile.attributes.map((a) => a.key));
    for (const token of extractTokens(naming)) {
      if (token.startsWith("attr_")) continue;
      const builtins = ["order", "garment", "size", "item", "quantity", "customer", "date"];
      if (!builtins.includes(token) && !attrKeys.has(token)) {
        issues.push(issue("namingTemplate", "unknown_token", `Unknown naming token "{${token}}".`));
      }
    }
  }
  if (order.items.length === 0) {
    issues.push(issue("items", "empty", "Add at least one garment row."));
  }
  const enabledSizes = new Set(profile.sizes.filter((s) => s.enabled).map((s) => s.id));
  order.items.forEach((item, index) => {
    if (!enabledSizes.has(item.sizeId)) {
      issues.push(issue(`items.${index}.sizeId`, "invalid_size", `Row ${index + 1}: size is missing or disabled.`));
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      issues.push(issue(`items.${index}.quantity`, "invalid_qty", `Row ${index + 1}: quantity must be at least 1.`));
    }
    for (const attr of profile.attributes) {
      const vis = attr.visibleWhen;
      if (vis) {
        const other = item.attributeValues[vis.attributeId];
        if (other !== vis.equals) continue;
      }
      issues.push(
        ...validateAttributeValue(attr, item.attributeValues[attr.id]).map((i) => ({
          ...i,
          path: `items.${index}.${i.path}`,
        })),
      );
    }
  });
  return { ok: issues.length === 0, issues };
}

export function profileReadyForAutomation(profile: GarmentProfile): ValidationResult {
  const base = validateProfile(profile);
  const issues = [...base.issues];
  if (profile.sizes.filter((s) => s.enabled).length === 0) {
    issues.push(issue("sizes", "empty", "Configure at least one enabled size."));
  }
  const enabledParts = profile.parts.filter((p) => p.enabled);
  if (enabledParts.length === 0) {
    issues.push(issue("parts", "empty", "Configure at least one enabled garment part."));
  }
  for (const part of enabledParts) {
    if (!part.photoshopLayer.trim()) {
      issues.push(
        issue(`parts.${part.id}.photoshopLayer`, "required", `Part "${part.name}" needs a Photoshop layer name.`),
      );
    }
  }
  return { ok: issues.length === 0, issues };
}

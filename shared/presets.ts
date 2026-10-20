import type { GarmentProfile, ValidationIssue } from "./types";

export interface ResolvedPreset {
  sizeId: string;
  partId: string;
  filePath: string;
}

export function isPngPresetPath(filePath: string): boolean {
  return /\.png$/i.test(filePath.trim());
}

export function resolvePresets(profile: GarmentProfile): {
  resolved: ResolvedPreset[];
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];
  const resolved: ResolvedPreset[] = [];
  const enabledParts = profile.parts.filter((p) => p.enabled);
  const enabledSizes = profile.sizes.filter((s) => s.enabled);

  for (const size of enabledSizes) {
    for (const part of enabledParts) {
      const matches = profile.presetAssignments.filter(
        (a) => a.sizeId === size.id && a.partId === part.id && a.filePath.trim() !== "",
      );
      if (matches.length > 1) {
        issues.push({
          path: `presetAssignments.${size.id}.${part.id}`,
          code: "duplicate_assignment",
          message: `Multiple presets assigned for size "${size.label}" / part "${part.name}".`,
        });
      }
      if (matches.length === 0) {
        if (part.required) {
          issues.push({
            path: `presetAssignments.${size.id}.${part.id}`,
            code: "missing_preset",
            message: `Required part "${part.name}" has no PNG preset for size "${size.label}".`,
          });
        }
        continue;
      }
      const filePath = matches[0].filePath.trim();
      if (!isPngPresetPath(filePath)) {
        issues.push({
          path: `presetAssignments.${size.id}.${part.id}`,
          code: "invalid_preset_type",
          message: `Preset for size "${size.label}" / part "${part.name}" must be a PNG file.`,
        });
        continue;
      }
      resolved.push({
        sizeId: size.id,
        partId: part.id,
        filePath,
      });
    }
  }

  return { resolved, issues };
}

export function findPreset(
  profile: GarmentProfile,
  sizeId: string,
  partId: string,
): string {
  const { resolved, issues } = resolvePresets(profile);
  const hit = resolved.find((r) => r.sizeId === sizeId && r.partId === partId);
  if (!hit) {
    const issue = issues.find(
      (i) => i.path === `presetAssignments.${sizeId}.${partId}`,
    );
    throw new Error(issue?.message ?? `No preset for size ${sizeId} / part ${partId}.`);
  }
  return hit.filePath;
}

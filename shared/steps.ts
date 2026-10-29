import { profileCategoryIds } from "./defaults";
import { profileReadyForAutomation, validateProfile } from "./validation";
import { resolvePresets } from "./presets";
import type { GarmentProfile } from "./types";

export const PROFILE_STEPS = [
  { id: "identity", label: "Identity" },
  { id: "parts", label: "Parts" },
  { id: "sizes", label: "Sizes" },
  { id: "presets", label: "Presets" },
  { id: "layout", label: "Layout" },
  { id: "fields", label: "Custom" },
  { id: "export", label: "Conflicts" },
] as const;

export type ProfileStepId = (typeof PROFILE_STEPS)[number]["id"];

export type StepState = "empty" | "progress" | "ready";

export function stepStates(profile: GarmentProfile): Record<ProfileStepId, StepState> {
  const identityReady = profile.name.trim() !== "" && profileCategoryIds(profile).length > 0;
  const enabledParts = profile.parts.filter((p) => p.enabled);
  const requiredParts = enabledParts.filter((p) => p.required);
  const partsMapped = enabledParts.length > 0 && enabledParts.every((p) => p.photoshopLayer.trim() !== "");
  const partsReady = requiredParts.length > 0 && partsMapped;
  const partsProgress = profile.parts.length > 0 && !partsReady;

  const enabledSizes = profile.sizes.filter((s) => s.enabled);
  const sizesReady = enabledSizes.length > 0 && enabledSizes.every((s) => s.label.trim() !== "");
  const sizesProgress = profile.sizes.length > 0 && !sizesReady;

  const presetIssues = resolvePresets(profile).issues.filter((i) =>
    ["missing_preset", "duplicate_assignment", "invalid_preset_type"].includes(i.code),
  );
  const presetsReady = partsReady && sizesReady && presetIssues.length === 0;
  const assigned = profile.presetAssignments.filter((a) => a.filePath.trim() !== "").length;
  const presetsProgress = assigned > 0 && !presetsReady;

  const fieldIssues = validateProfile(profile).issues.filter((i) => i.path.startsWith("attributes"));
  const fieldsReady = fieldIssues.length === 0;
  const fieldsProgress = profile.attributes.length > 0 && !fieldsReady;

  const exportReady = true;
  const layoutReady = presetsReady;
  const layoutProgress = presetsProgress || (assigned > 0 && !layoutReady);

  return {
    identity: identityReady ? "ready" : "empty",
    parts: partsReady ? "ready" : partsProgress ? "progress" : "empty",
    sizes: sizesReady ? "ready" : sizesProgress ? "progress" : "empty",
    presets: presetsReady ? "ready" : presetsProgress ? "progress" : "empty",
    layout: layoutReady ? "ready" : layoutProgress ? "progress" : "empty",
    fields: profile.attributes.length === 0 ? "empty" : fieldsReady ? "ready" : fieldsProgress ? "progress" : "empty",
    export: exportReady ? "ready" : "empty",
  };
}

export function presetCoverage(profile: GarmentProfile): { filled: number; required: number } {
  const enabledParts = profile.parts.filter((p) => p.enabled && p.required);
  const enabledSizes = profile.sizes.filter((s) => s.enabled);
  const required = enabledParts.length * enabledSizes.length;
  let filled = 0;
  for (const size of enabledSizes) {
    for (const part of enabledParts) {
      const hit = profile.presetAssignments.find(
        (a) => a.sizeId === size.id && a.partId === part.id && a.filePath.trim() !== "",
      );
      if (hit) filled += 1;
    }
  }
  return { filled, required };
}

export function profileReuseReady(profile: GarmentProfile): boolean {
  return profileReadyForAutomation(profile).ok;
}

/** Template Guide needs parts, sizes, presets, and layout. Custom details are optional. */
export function templateGuideReady(profile: GarmentProfile): boolean {
  const states = stepStates(profile);
  const customOk = profile.attributes.length === 0 || states.fields === "ready";
  return (
    states.parts === "ready" &&
    states.sizes === "ready" &&
    states.presets === "ready" &&
    states.layout === "ready" &&
    customOk
  );
}

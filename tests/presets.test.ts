import { describe, expect, it } from "vitest";
import { emptyProfile } from "../shared/defaults";
import { findPreset, resolvePresets } from "../shared/presets";
import type { GarmentPart, SizeDefinition } from "../shared/types";

const front: GarmentPart = {
  id: "front",
  name: "Front",
  enabled: true,
  required: true,
  sortOrder: 0,
  photoshopLayer: "front",
  layerKind: "reference",
  offsetX: 0,
  offsetY: 0,
  scaleMode: "stretch",
  clippingMask: true,
  visibleInOutput: true,
};

const sleeve: GarmentPart = {
  ...front,
  id: "sleeve",
  name: "Sleeve",
  required: false,
};

const small: SizeDefinition = {
  id: "s",
  label: "Small",
  description: "",
  enabled: true,
  sortOrder: 0,
  partDimensions: {},
};

const medium: SizeDefinition = {
  ...small,
  id: "m",
  label: "Medium",
};

describe("preset resolution", () => {
  it("allows the same preset file to be reused", () => {
    const profile = emptyProfile({
      parts: [front],
      sizes: [small, medium],
      presetAssignments: [
        { sizeId: "s", partId: "front", filePath: "C:/shared_front.png" },
        { sizeId: "m", partId: "front", filePath: "C:/shared_front.png" },
      ],
    });
    const { resolved, issues } = resolvePresets(profile);
    expect(issues).toHaveLength(0);
    expect(resolved).toHaveLength(2);
    expect(resolved[0].filePath).toBe(resolved[1].filePath);
  });

  it("reports missing required assignments instead of falling back", () => {
    const profile = emptyProfile({
      parts: [front],
      sizes: [small, medium],
      presetAssignments: [{ sizeId: "s", partId: "front", filePath: "C:/small_front.png" }],
    });
    const { issues } = resolvePresets(profile);
    expect(issues.some((i) => i.code === "missing_preset")).toBe(true);
    expect(() => findPreset(profile, "m", "front")).toThrow(/no png preset/i);
  });

  it("ignores optional parts without presets", () => {
    const profile = emptyProfile({
      parts: [front, sleeve],
      sizes: [small],
      presetAssignments: [{ sizeId: "s", partId: "front", filePath: "C:/small_front.png" }],
    });
    const { issues } = resolvePresets(profile);
    expect(issues).toHaveLength(0);
  });

  it("flags duplicate assignments", () => {
    const profile = emptyProfile({
      parts: [front],
      sizes: [small],
      presetAssignments: [
        { sizeId: "s", partId: "front", filePath: "a.png" },
        { sizeId: "s", partId: "front", filePath: "b.png" },
      ],
    });
    expect(resolvePresets(profile).issues.some((i) => i.code === "duplicate_assignment")).toBe(true);
  });

  it("rejects non-PNG preset files", () => {
    const profile = emptyProfile({
      parts: [front],
      sizes: [small],
      presetAssignments: [{ sizeId: "s", partId: "front", filePath: "C:/small_front.psd" }],
    });
    const { resolved, issues } = resolvePresets(profile);
    expect(resolved).toHaveLength(0);
    expect(issues.some((i) => i.code === "invalid_preset_type")).toBe(true);
  });
});

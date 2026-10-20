import { describe, expect, it } from "vitest";
import { emptyProfile } from "../shared/defaults";
import {
  applyCapturedPositions,
  autoRowPlacements,
  defaultLayoutSizeId,
  documentPlacements,
  layoutBounds,
  layoutPlacements,
  resetLayoutOffsets,
  usesFreeOffsets,
} from "../shared/layout";
import type { GarmentPart } from "../shared/types";
import { stepStates } from "../shared/steps";

function part(partial: Partial<GarmentPart> & { id: string }): GarmentPart {
  return {
    name: partial.id,
    enabled: true,
    required: true,
    sortOrder: 0,
    photoshopLayer: partial.id,
    layerKind: "group",
    offsetX: 0,
    offsetY: 0,
    scaleMode: "stretch",
    clippingMask: true,
    visibleInOutput: true,
    ...partial,
  };
}

describe("layout helper", () => {
  it("uses auto-row when every offset is zero", () => {
    const parts = [part({ id: "a", sortOrder: 0 }), part({ id: "b", sortOrder: 1 })];
    expect(usesFreeOffsets(parts)).toBe(false);
    expect(layoutPlacements(parts, [
      { partId: "a", width: 100, height: 50 },
      { partId: "b", width: 80, height: 40 },
    ])).toEqual([
      { partId: "a", x: 0, y: 0, width: 100, height: 50 },
      { partId: "b", x: 105, y: 0, width: 80, height: 40 },
    ]);
  });

  it("uses free offsets when any part is moved", () => {
    const parts = [part({ id: "a", offsetX: 10, offsetY: 20 }), part({ id: "b", offsetX: 200, offsetY: 0 })];
    expect(usesFreeOffsets(parts)).toBe(true);
    const placed = layoutPlacements(parts, [
      { partId: "a", width: 50, height: 50 },
      { partId: "b", width: 40, height: 40 },
    ]);
    expect(placed).toEqual([
      { partId: "a", x: 10, y: 20, width: 50, height: 50 },
      { partId: "b", x: 200, y: 0, width: 40, height: 40 },
    ]);
  });

  it("computes a bounding box including negative origins", () => {
    const bounds = layoutBounds([
      { partId: "a", x: -10, y: 5, width: 20, height: 10 },
      { partId: "b", x: 30, y: 0, width: 10, height: 40 },
    ]);
    expect(bounds).toEqual({ originX: -10, originY: 0, width: 50, height: 40 });
    expect(documentPlacements([
      { partId: "a", x: -10, y: 5, width: 20, height: 10 },
      { partId: "b", x: 30, y: 0, width: 10, height: 40 },
    ])[0]).toMatchObject({ x: 0, y: 5 });
  });

  it("merges captured positions onto matching parts", () => {
    const parts = [part({ id: "a" }), part({ id: "b", sortOrder: 1 })];
    const next = applyCapturedPositions(parts, [
      { partId: "b", x: 40, y: 12, sortOrder: 0 },
      { partId: "missing", x: 1, y: 1 },
    ]);
    expect(next.find((p) => p.id === "a")?.offsetX).toBe(0);
    expect(next.find((p) => p.id === "b")).toMatchObject({ offsetX: 40, offsetY: 12, sortOrder: 0 });
  });

  it("resets offsets back to auto-row zeros", () => {
    const next = resetLayoutOffsets([part({ id: "a", offsetX: 9, offsetY: 3 })]);
    expect(next[0]).toMatchObject({ offsetX: 0, offsetY: 0 });
  });

  it("defaults layout size to the last covered size", () => {
    const profile = emptyProfile({
      parts: [part({ id: "front" })],
      sizes: [
        { id: "s", label: "S", description: "", enabled: true, sortOrder: 0, partDimensions: {} },
        { id: "l", label: "L", description: "", enabled: true, sortOrder: 1, partDimensions: {} },
      ],
      presetAssignments: [
        { sizeId: "s", partId: "front", filePath: "C:/s.png" },
        { sizeId: "l", partId: "front", filePath: "C:/l.png" },
      ],
    });
    expect(defaultLayoutSizeId(profile)).toBe("l");
    expect(defaultLayoutSizeId({ ...profile, layoutReferenceSizeId: "s" })).toBe("s");
  });

  it("spaces auto-row parts by 5px", () => {
    expect(autoRowPlacements([{ partId: "a", width: 10, height: 10 }])).toEqual([
      { partId: "a", x: 0, y: 0, width: 10, height: 10 },
    ]);
  });
});

describe("layout step state", () => {
  it("is ready when required presets exist", () => {
    const profile = emptyProfile({
      name: "Shirt",
      categoryId: "tshirt",
      parts: [part({ id: "front", photoshopLayer: "front" })],
      sizes: [{ id: "s", label: "S", description: "", enabled: true, sortOrder: 0, partDimensions: {} }],
      presetAssignments: [{ sizeId: "s", partId: "front", filePath: "C:/front.png" }],
    });
    expect(stepStates(profile).layout).toBe("ready");
    expect(stepStates(emptyProfile()).layout).toBe("empty");
  });
});

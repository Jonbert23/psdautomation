import { describe, expect, it } from "vitest";
import { emptyProfile } from "../shared/defaults";
import { buildTemplateSpec, splitLayerNames } from "../shared/templateSpec";
import type { AttributeDefinition, GarmentPart } from "../shared/types";

function part(partial: Partial<GarmentPart> & { id: string; photoshopLayer: string }): GarmentPart {
  return {
    name: partial.photoshopLayer,
    enabled: true,
    required: true,
    sortOrder: 0,
    layerKind: "group",
    offsetX: 0,
    offsetY: 0,
    scaleMode: "stretch",
    clippingMask: true,
    visibleInOutput: true,
    ...partial,
  };
}

function attr(partial: Partial<AttributeDefinition> & { id: string }): AttributeDefinition {
  return {
    key: partial.id,
    displayName: partial.id,
    type: "text",
    description: "",
    required: false,
    defaultValue: "",
    placeholder: "",
    group: "",
    sortOrder: 0,
    options: [],
    ...partial,
  };
}

describe("templateSpec", () => {
  it("splits comma-separated layer names", () => {
    expect(splitLayerNames("front_num, back_num")).toEqual(["front_num", "back_num"]);
  });

  it("builds a group per enabled part with nested text for attached fields", () => {
    const spec = buildTemplateSpec(
      emptyProfile({
        name: "Round neck",
        parts: [
          part({ id: "front", photoshopLayer: "front", sortOrder: 0 }),
          part({ id: "back", photoshopLayer: "back", sortOrder: 1 }),
          part({ id: "off", photoshopLayer: "skip", enabled: false, sortOrder: 2 }),
        ],
        attributes: [
          attr({ id: "name", displayName: "Name", mapping: { layerName: "surname", layerKind: "text", partId: "front" } }),
          attr({
            id: "numf",
            displayName: "Number",
            type: "number",
            mapping: { layerName: "front_num", layerKind: "text", partId: "front" },
          }),
          attr({
            id: "numb",
            displayName: "Number",
            mapping: { layerName: "back_num", layerKind: "text", partId: "back" },
          }),
          attr({ id: "orphan", displayName: "Loose", mapping: { layerName: "x", layerKind: "text" } }),
        ],
      }),
      [
        { partId: "front", width: 100, height: 80 },
        { partId: "back", width: 90, height: 80 },
      ],
    );
    expect(spec.groups.map((g) => g.name)).toEqual(["front", "back"]);
    expect(spec.groups[0].texts.map((t) => t.name)).toEqual(["surname", "front_num"]);
    expect(spec.groups[1].texts.map((t) => t.name)).toEqual(["back_num"]);
    expect(spec.groups[0].x).toBe(0);
    expect(spec.groups[1].x).toBe(105);
    expect(spec.width).toBe(195);
    expect(spec.skipped.some((s) => s.attributeId === "orphan")).toBe(true);
  });

  it("skips image and checkbox fields and uses default placeholder size", () => {
    const spec = buildTemplateSpec(
      emptyProfile({
        parts: [part({ id: "front", photoshopLayer: "front" })],
        attributes: [
          attr({
            id: "logo",
            type: "image",
            mapping: { layerName: "logo", layerKind: "smartObject", partId: "front" },
          }),
        ],
      }),
    );
    expect(spec.groups[0].width).toBe(400);
    expect(spec.groups[0].height).toBe(500);
    expect(spec.groups[0].texts).toEqual([]);
    expect(spec.skipped[0].reason).toMatch(/not created as a text layer/i);
  });

  it("deduplicates text layer names in a group", () => {
    const spec = buildTemplateSpec(
      emptyProfile({
        parts: [part({ id: "front", photoshopLayer: "front" })],
        attributes: [
          attr({ id: "a", mapping: { layerName: "surname,surname", layerKind: "text", partId: "front" } }),
        ],
      }),
    );
    expect(spec.groups[0].texts).toHaveLength(1);
  });
});

import type { AttributeDefinition, GarmentPart } from "./types";
import { createId } from "./ids";
import { enabledPartsSorted } from "./layout";

export function starterParts(startOrder = 0): GarmentPart[] {
  const defs: Array<{ name: string; layer: string; required: boolean }> = [
    { name: "Front body", layer: "front", required: true },
    { name: "Back body", layer: "back", required: true },
    { name: "Left sleeve", layer: "leftsleeve", required: false },
    { name: "Right sleeve", layer: "rightsleeve", required: false },
    { name: "Ribbing", layer: "ribbing", required: false },
  ];
  return defs.map((d, i) => ({
    id: createId("part"),
    name: d.name,
    enabled: true,
    required: d.required,
    sortOrder: startOrder + i,
    photoshopLayer: d.layer,
    layerKind: "group",
    offsetX: 0,
    offsetY: 0,
    scaleMode: "stretch",
    clippingMask: true,
    visibleInOutput: true,
  }));
}

function textField(
  startOrder: number,
  spec: {
    key: string;
    displayName: string;
    placeholder: string;
    required: boolean;
    layerName: string;
    partId?: string;
  },
): AttributeDefinition {
  return {
    id: createId("attr"),
    key: spec.key,
    displayName: spec.displayName,
    type: "text",
    description: "Written to matching text layers in the design file at run time.",
    required: spec.required,
    defaultValue: "",
    placeholder: spec.placeholder,
    group: "player",
    sortOrder: startOrder,
    options: [],
    mapping: spec.partId
      ? { layerName: spec.layerName, layerKind: "text", partId: spec.partId }
      : { layerName: spec.layerName, layerKind: "text" },
  };
}

export function starterFields(startOrder = 0, parts: GarmentPart[] = []): AttributeDefinition[] {
  const enabled = enabledPartsSorted(parts);
  const required = enabled.filter((p) => p.required);
  const primary = required[0] ?? enabled[0];
  const secondary = required[1] ?? (enabled[1] && enabled[1].id !== primary?.id ? enabled[1] : undefined);

  const fields: AttributeDefinition[] = [
    textField(startOrder, {
      key: "name",
      displayName: "Name",
      placeholder: "Player name",
      required: true,
      layerName: "surname",
      partId: primary?.id,
    }),
  ];

  if (secondary) {
    fields.push(
      textField(startOrder + 1, {
        key: "front_number",
        displayName: "Front number",
        placeholder: "07",
        required: false,
        layerName: "front_num",
        partId: primary.id,
      }),
      textField(startOrder + 2, {
        key: "back_number",
        displayName: "Back number",
        placeholder: "07",
        required: false,
        layerName: "back_num",
        partId: secondary.id,
      }),
    );
  } else {
    fields.push(
      textField(startOrder + 1, {
        key: "number",
        displayName: "Number",
        placeholder: "07",
        required: false,
        layerName: "front_num",
        partId: primary?.id,
      }),
    );
  }

  return fields;
}

export const STARTER_SIZE_LABELS = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

import { describe, expect, it } from "vitest";
import { emptyProfile } from "../shared/defaults";
import { createId } from "../shared/ids";
import {
  profileReadyForAutomation,
  validateAttributeValue,
  validateOrder,
  validateProfile,
  validateSchemaVersion,
} from "../shared/validation";
import { SCHEMA_VERSION } from "../shared/types";
import type { AttributeDefinition, ProductionOrder } from "../shared/types";
import { defaultOrderExportFormats } from "../shared/orders";

function sampleProfile() {
  const partId = "part_front";
  const sizeId = "size_m";
  const attr: AttributeDefinition = {
    id: "attr_name",
    key: "jersey_name",
    displayName: "Jersey Name",
    type: "text",
    description: "",
    required: true,
    defaultValue: "",
    placeholder: "",
    group: "player",
    sortOrder: 0,
    options: [],
    mapping: { layerName: "surname", layerKind: "text", partId },
  };
    return emptyProfile({
    name: "Basketball jersey",
    categoryId: "basketball-jersey",
    parts: [
      {
        id: partId,
        name: "Front body",
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
      },
    ],
    sizes: [
      {
        id: sizeId,
        label: "Medium",
        description: "",
        enabled: true,
        sortOrder: 0,
        partDimensions: {},
      },
    ],
    attributes: [attr],
    presetAssignments: [{ sizeId, partId, filePath: "C:/presets/medium_front.png" }],
    exportSettings: {
      ...emptyProfile().exportSettings,
      namingTemplate: "{order}_{garment}_{size}_{jersey_name}",
    },
  });
}

describe("schema", () => {
  it("accepts current schema version", () => {
    expect(validateSchemaVersion(SCHEMA_VERSION).ok).toBe(true);
  });

  it("rejects unknown schema versions", () => {
    const result = validateSchemaVersion(99);
    expect(result.ok).toBe(false);
    expect(result.issues[0].code).toBe("unsupported_schema");
  });
});

describe("profile validation", () => {
  it("accepts a complete dynamic profile", () => {
    expect(validateProfile(sampleProfile()).ok).toBe(true);
    expect(profileReadyForAutomation(sampleProfile()).ok).toBe(true);
  });

  it("flags missing required name", () => {
    const profile = sampleProfile();
    profile.name = "  ";
    expect(validateProfile(profile).issues.some((i) => i.path === "name")).toBe(true);
  });

  it("does not assume jersey fields", () => {
    const profile = emptyProfile({ name: "Polo", categoryId: "polo" });
    const keys = profile.attributes.map((a) => a.key);
    expect(keys).not.toContain("surname");
    expect(keys).not.toContain("number");
  });

  it("is reusable without a design file or output folder", () => {
    const profile = sampleProfile();
    profile.templatePath = "";
    profile.exportSettings.defaultOutputFolder = "";
    const ready = profileReadyForAutomation(profile);
    expect(ready.ok).toBe(true);
    expect(ready.issues.some((i) => i.path === "templatePath")).toBe(false);
  });
});

describe("attribute values", () => {
  const requiredText: AttributeDefinition = {
    id: "a1",
    key: "name",
    displayName: "Name",
    type: "text",
    description: "",
    required: true,
    defaultValue: "",
    placeholder: "",
    group: "",
    sortOrder: 0,
    options: [],
  };

  it("blocks empty required fields", () => {
    expect(validateAttributeValue(requiredText, "").length).toBeGreaterThan(0);
  });

  it("allows optional empty fields", () => {
    expect(validateAttributeValue({ ...requiredText, required: false }, "").length).toBe(0);
  });
});

describe("orders", () => {
  it("requires a value for each required attribute", () => {
    const profile = sampleProfile();
    const order: ProductionOrder = {
      id: createId("ord"),
      name: "Falcons",
      profileId: profile.id,
      customerName: "Falcons",
      notes: "",
      status: "draft",
      designTemplatePath: "C:/designs/batch.psd",
      outputFolder: "C:/out",
      exportFormats: defaultOrderExportFormats(),
      namingTemplate: "{order}_{garment}_{size}_{item}",
      createdAt: "",
      updatedAt: "",
      items: [
        {
          id: "i1",
          sizeId: profile.sizes[0].id,
          quantity: 1,
          attributeValues: {},
        },
      ],
    };
    const result = validateOrder(order, profile);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "required")).toBe(true);
  });

  it("requires a design file and output folder on the run", () => {
    const profile = sampleProfile();
    const order: ProductionOrder = {
      id: createId("ord"),
      name: "Falcons",
      profileId: profile.id,
      customerName: "Falcons",
      notes: "",
      status: "draft",
      designTemplatePath: "",
      outputFolder: "",
      exportFormats: defaultOrderExportFormats(),
      namingTemplate: "{order}_{garment}_{size}_{item}",
      createdAt: "",
      updatedAt: "",
      items: [
        {
          id: "i1",
          sizeId: profile.sizes[0].id,
          quantity: 1,
          attributeValues: { attr_name: "Player One" },
        },
      ],
    };
    const result = validateOrder(order, profile);
    expect(result.issues.some((i) => i.path === "designTemplatePath")).toBe(true);
    expect(result.issues.some((i) => i.path === "outputFolder")).toBe(true);
  });
});

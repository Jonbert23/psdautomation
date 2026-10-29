import { describe, expect, it } from "vitest";
import { emptyProfile } from "../shared/defaults";
import { profileReuseReady, stepStates, templateGuideReady } from "../shared/steps";
import { starterFields, starterParts } from "../shared/starters";

describe("profile steps", () => {
  it("starts empty except optional export defaults", () => {
    const states = stepStates(emptyProfile());
    expect(states.identity).toBe("empty");
    expect(states.parts).toBe("empty");
    expect(states.sizes).toBe("empty");
    expect(states.presets).toBe("empty");
    expect(states.layout).toBe("empty");
    expect(states.fields).toBe("empty");
    expect(states.export).toBe("ready");
  });

  it("marks identity ready from name and category only", () => {
    expect(stepStates(emptyProfile({ name: "Round neck", categoryId: "tshirt" })).identity).toBe("ready");
  });

  it("does not require a design file for reuse readiness", () => {
    const parts = starterParts();
    const front = parts[0];
    const profile = emptyProfile({
      name: "Round neck",
      categoryId: "tshirt",
      parts,
      sizes: [{ id: "s", label: "S", description: "", enabled: true, sortOrder: 0, partDimensions: {} }],
      attributes: starterFields(),
      presetAssignments: parts
        .filter((p) => p.required)
        .map((p) => ({ sizeId: "s", partId: p.id, filePath: `C:/${p.id}.png` })),
    });
    expect(profile.templatePath).toBe("");
    expect(profileReuseReady(profile)).toBe(true);
    expect(stepStates(profile).presets).toBe("ready");
    expect(stepStates(profile).layout).toBe("ready");
    expect(front.photoshopLayer).toBe("front");
    const attached = starterFields(0, parts);
    expect(attached[0].mapping?.partId).toBe(front.id);
    expect(attached.some((a) => a.mapping?.layerName === "front_num")).toBe(true);
    expect(attached.some((a) => a.mapping?.layerName === "back_num")).toBe(true);
    expect(templateGuideReady(profile)).toBe(true);
    expect(templateGuideReady(emptyProfile())).toBe(false);
    expect(templateGuideReady({ ...profile, attributes: [] })).toBe(true);
    expect(
      templateGuideReady({
        ...profile,
        attributes: profile.attributes.map((attr) => ({ ...attr, displayName: "" })),
      }),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { emptyProfile } from "../shared/defaults";
import { emptyOrder } from "../shared/orders";
import { validateOrder } from "../shared/validation";

describe("orders", () => {
  it("builds columns from the selected profile, not a hardcoded jersey list", () => {
    const profile = emptyProfile({
      name: "v-neck",
      categoryId: "tshirt",
      attributes: [
        {
          id: "a1",
          key: "player",
          displayName: "Player",
          type: "text",
          description: "",
          required: true,
          defaultValue: "",
          placeholder: "",
          group: "",
          sortOrder: 0,
          options: [],
        },
      ],
      sizes: [{ id: "s", label: "M", description: "", enabled: true, sortOrder: 0, partDimensions: {} }],
    });
    const order = emptyOrder(profile);
    expect(order.profileId).toBe(profile.id);
    expect(order.designTemplatePath).toBe("");
    expect(order.exportFormats.savePsd).toBe(true);
    expect(order.namingTemplate).toContain("{order}");
    expect(order.items[0].attributeValues.a1).toBe("");
    const missingFiles = validateOrder(order, profile);
    expect(missingFiles.issues.some((i) => i.path === "designTemplatePath")).toBe(true);
  });
});

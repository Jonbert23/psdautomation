import { describe, expect, it } from "vitest";
import { extractTokens, renderNamingTemplate, sanitizeFileName } from "../shared/naming";
import { convertMeasurement } from "../shared/units";

describe("naming", () => {
  it("extracts tokens", () => {
    expect(extractTokens("{order}_{garment}_{jersey_name}")).toEqual(["order", "garment", "jersey_name"]);
  });

  it("renders a file name from mixed tokens", () => {
    const { fileName, unknownTokens } = renderNamingTemplate(
      "{order}_{garment}_{size}_{jersey_name}_{jersey_number}",
      {
        order: "Falcons batch",
        garment: "Jersey",
        size: "Large",
        jersey_name: "Player One",
        jersey_number: "07",
      },
      ["jersey_name", "jersey_number"],
    );
    expect(unknownTokens).toHaveLength(0);
    expect(fileName).toBe("Falcons_batch_Jersey_Large_Player_One_07");
  });

  it("sanitizes illegal characters", () => {
    expect(sanitizeFileName("A/B:*?")).toBe("A_B");
  });
});

describe("units", () => {
  it("converts cm to mm", () => {
    expect(convertMeasurement(2.5, "cm", "mm")).toBe(25);
  });

  it("converts inches to mm", () => {
    expect(convertMeasurement(1, "in", "mm")).toBeCloseTo(25.4);
  });

  it("converts mm to pixels at 300 ppi", () => {
    expect(convertMeasurement(25.4, "mm", "px", 300)).toBeCloseTo(300);
  });
});

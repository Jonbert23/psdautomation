import { describe, expect, it } from "vitest";
import { PLANS, formatPlanPrice, getPlan } from "../shared/plans";

describe("term plans", () => {
  it("charges ₱699, 10% off for 6 months, and 20% off for 12 months", () => {
    expect(getPlan("month")?.amount).toBe(69900);
    expect(getPlan("half_year")?.amount).toBe(377460);
    expect(getPlan("year")?.amount).toBe(671040);
    expect(getPlan("starter")).toBeNull();
  });

  it("shows the discounted monthly price on longer terms", () => {
    expect(formatPlanPrice(PLANS[0])).toBe("₱699");
    expect(formatPlanPrice(PLANS[1])).toBe("₱3,774.60 · ₱629.10/month");
    expect(formatPlanPrice(PLANS[2])).toBe("₱6,710.40 · ₱559.20/month");
  });

  it("lists the same features on every term", () => {
    expect(PLANS[0].features).toEqual(PLANS[1].features);
    expect(PLANS[1].features).toEqual(PLANS[2].features);
    expect(PLANS[0].features.length).toBeGreaterThan(0);
  });
});

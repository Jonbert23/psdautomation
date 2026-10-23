import { describe, expect, it } from "vitest";
import {
  accountRole,
  extractAppId,
  isGrantUsable,
  licenseMessage,
  normalizeDisplayName,
  type LicenseGrant,
} from "../shared/licenseGrant";

function grant(overrides: Partial<LicenseGrant> = {}): LicenseGrant {
  return {
    userId: "u1",
    email: "op@example.com",
    licenseId: "lic1",
    planName: "Starter",
    machineId: "pc-1",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    status: "active",
    ...overrides,
  };
}

describe("isGrantUsable", () => {
  it("allows a grant that expires in the future", () => {
    expect(isGrantUsable(grant())).toBe(true);
  });

  it("rejects a missing or expired grant", () => {
    expect(isGrantUsable(null)).toBe(false);
    expect(isGrantUsable(grant({ expiresAt: new Date(Date.now() - 1000).toISOString() }))).toBe(false);
  });
});

describe("extractAppId", () => {
  it("accepts a raw id or pulls it from a Builder URL", () => {
    expect(extractAppId("abc123")).toBe("abc123");
    expect(extractAppId("https://app.base44.com/apps/abc123/editor")).toBe("abc123");
  });
});

describe("accountRole", () => {
  it("treats only admin as admin", () => {
    expect(accountRole("admin")).toBe("admin");
    expect(accountRole("operator")).toBe("operator");
    expect(accountRole("user")).toBe("operator");
  });
});

describe("normalizeDisplayName", () => {
  it("trims and caps the name at 80 characters", () => {
    expect(normalizeDisplayName("  Ada  ")).toBe("Ada");
    expect(normalizeDisplayName("x".repeat(90)).length).toBe(80);
  });
});

describe("licenseMessage", () => {
  it("maps server codes to the account-page copy", () => {
    expect(licenseMessage("no_license")).toBe("Choose a plan and pay for 1, 6, or 12 months to start your subscription.");
    expect(licenseMessage("expired")).toBe("Your subscription has expired. Pay for a plan to extend it.");
    expect(licenseMessage("session_replaced")).toBe("This account signed in on another device.");
    expect(licenseMessage("revoked")).toBe("License has been revoked.");
  });
});

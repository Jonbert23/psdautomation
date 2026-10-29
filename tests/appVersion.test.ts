import { describe, expect, it } from "vitest";
import { isNewerVersion } from "../shared/appVersion";

describe("isNewerVersion", () => {
  it("accepts a higher stable version", () => {
    expect(isNewerVersion("0.3.0", "0.2.0")).toBe(true);
    expect(isNewerVersion("0.2.10", "0.2.9")).toBe(true);
    expect(isNewerVersion("v0.2.1", "0.2.0")).toBe(true);
  });

  it("skips the same or an older version", () => {
    expect(isNewerVersion("0.2.0", "0.2.0")).toBe(false);
    expect(isNewerVersion("0.2.0", "0.2.1")).toBe(false);
    expect(isNewerVersion("0.9.9", "1.0.0")).toBe(false);
  });
});

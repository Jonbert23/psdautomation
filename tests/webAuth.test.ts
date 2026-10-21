import { describe, expect, it } from "vitest";
import { desktopLoginUrl, extractAccessToken, resolveWebOrigin } from "../shared/webAuth";

describe("resolveWebOrigin", () => {
  it("uses https app base URL when set", () => {
    expect(resolveWebOrigin("https://example.test/app")).toBe("https://example.test");
  });

  it("falls back to production for missing or non-https values", () => {
    expect(resolveWebOrigin("")).toBe("https://psdcorner.com");
    expect(resolveWebOrigin("http://localhost:5173")).toBe("https://psdcorner.com");
  });
});

describe("desktopLoginUrl", () => {
  it("opens production login with the desktop callback returnTo", () => {
    expect(desktopLoginUrl()).toBe("https://psdcorner.com/login?returnTo=%2Fdesktop-auth");
  });
});

describe("extractAccessToken", () => {
  it("reads a token from the allowed origin query or hash", () => {
    expect(
      extractAccessToken("https://psdcorner.com/desktop-auth?access_token=abc", "https://psdcorner.com"),
    ).toBe("abc");
    expect(
      extractAccessToken("https://psdcorner.com/desktop-auth#access_token=xyz", "https://psdcorner.com"),
    ).toBe("xyz");
  });

  it("ignores tokens from other hosts", () => {
    expect(
      extractAccessToken("https://accounts.google.com/?access_token=abc", "https://psdcorner.com"),
    ).toBeNull();
  });
});

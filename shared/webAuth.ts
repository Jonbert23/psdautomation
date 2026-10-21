export const DEFAULT_WEB_ORIGIN = "https://psdcorner.com";
export const DESKTOP_AUTH_PATH = "/desktop-auth";
export const DESKTOP_BILLING_PATH = "/desktop-billing";

export function resolveWebOrigin(appBaseUrl?: string): string {
  try {
    const url = new URL(String(appBaseUrl || "").trim());
    if (url.protocol === "https:") return url.origin;
  } catch {
    // Fall through to production.
  }
  return DEFAULT_WEB_ORIGIN;
}

export function desktopLoginUrl(appBaseUrl?: string): string {
  const origin = resolveWebOrigin(appBaseUrl);
  return `${origin}/login?returnTo=${encodeURIComponent(DESKTOP_AUTH_PATH)}`;
}

export function extractAccessToken(urlString: string, allowedOrigin: string): string | null {
  try {
    const url = new URL(urlString);
    if (url.origin !== allowedOrigin) return null;
    const fromQuery = url.searchParams.get("access_token")?.trim();
    if (fromQuery) return fromQuery;
    if (url.hash) {
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const fromHash = hash.get("access_token")?.trim();
      if (fromHash) return fromHash;
    }
  } catch {
    return null;
  }
  return null;
}

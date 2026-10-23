export interface LicenseGrant {
  userId: string;
  email: string;
  licenseId: string;
  planName: string;
  machineId: string | null;
  expiresAt: string;
  status: string;
}

export interface StoredLicense {
  token: string;
  grant: LicenseGrant | null;
  lastCode?: string | null;
  lastMessage?: string | null;
  sessionId?: string | null;
}

export function extractAppId(value: string): string {
  const trimmed = value.trim();
  const fromUrl = trimmed.match(/\/apps\/([A-Za-z0-9]+)/);
  return fromUrl?.[1] || trimmed;
}

export function isGrantUsable(grant: LicenseGrant | null | undefined, now = Date.now()): boolean {
  if (!grant?.expiresAt) return false;
  const time = new Date(grant.expiresAt).getTime();
  return Number.isFinite(time) && time > now;
}

export interface AuthStatus {
  configured: boolean;
  signedIn: boolean;
  usable: boolean;
  email: string | null;
  planName: string | null;
  expiresAt: string | null;
  code: string;
  message: string;
}

export type UserRole = "admin" | "operator";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  planName: string | null;
  expiresAt: string | null;
}

export const DISPLAY_NAME_MAX = 80;

export function accountRole(role: unknown): UserRole {
  return role === "admin" ? "admin" : "operator";
}

export function normalizeDisplayName(value: unknown): string {
  return String(value ?? "").trim().slice(0, DISPLAY_NAME_MAX);
}

export function licenseMessage(code: string | undefined | null, fallback?: string): string {
  switch (code) {
    case "no_license":
      return "Choose a plan and pay for 1, 6, or 12 months to start your subscription.";
    case "expired":
      return "Your subscription has expired. Pay for a plan to extend it.";
    case "session_replaced":
      return "This account signed in on another device.";
    case "revoked":
      return "License has been revoked.";
    case "unauthorized":
      return "Sign in required.";
    case "invalid_request":
      return "This PC could not be identified for activation.";
    default:
      return fallback || "Could not activate this PC.";
  }
}

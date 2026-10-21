import os from "node:os";
import { app } from "electron";
import { createBase44Client, invokeFunction, readBase44Config } from "./base44";
import type { LicenseStore } from "./licenseStore";
import {
  accountRole,
  DISPLAY_NAME_MAX,
  isGrantUsable,
  licenseMessage,
  normalizeDisplayName,
  type AuthStatus,
  type LicenseGrant,
  type UserProfile,
} from "../shared/licenseGrant";
import type { BillingSnapshot, BillingSubscription } from "../shared/plans";
import packageJson from "../package.json";

export type { AuthStatus, UserProfile };

type AuthUser = {
  id?: string;
  email?: string;
  displayName?: string;
  full_name?: string;
  role?: string;
};

function asBillingSubscription(value: unknown): BillingSubscription | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return {
    id: row.id ? String(row.id) : null,
    planId: row.planId ? String(row.planId) : null,
    status: row.status ? String(row.status) : null,
  };
}

function asGrant(value: unknown): LicenseGrant | null {
  if (!value || typeof value !== "object") return null;
  const grant = value as Partial<LicenseGrant>;
  if (!grant.expiresAt) return null;
  return {
    userId: String(grant.userId || ""),
    email: String(grant.email || ""),
    licenseId: String(grant.licenseId || ""),
    planName: String(grant.planName || ""),
    machineId: grant.machineId ? String(grant.machineId) : null,
    expiresAt: String(grant.expiresAt),
    status: String(grant.status || "active"),
  };
}

function appVersion(): string {
  const fromPackage = String(packageJson.version || "").slice(0, 40);
  try {
    const version = app.getVersion();
    if (version && version !== "0.0.0" && !version.startsWith("33.")) return version.slice(0, 40);
  } catch {
    // Main process helpers can run before app is ready in tests.
  }
  return fromPackage || "0.2.0";
}

export class LicenseService {
  constructor(private readonly store: LicenseStore) {}

  status(): AuthStatus {
    const { configured } = readBase44Config();
    if (!configured) {
      return {
        configured: false,
        signedIn: false,
        usable: false,
        email: null,
        planName: null,
        expiresAt: null,
        code: "unauthenticated",
        message: "Sign in with the same account you use on the website.",
      };
    }

    const token = this.store.getToken();
    const grant = this.store.getGrant();
    if (!token) {
      return {
        configured: true,
        signedIn: false,
        usable: false,
        email: null,
        planName: null,
        expiresAt: null,
        code: "unauthenticated",
        message: "Sign in with the same account you use on the website.",
      };
    }

    if (isGrantUsable(grant)) {
      return {
        configured: true,
        signedIn: true,
        usable: true,
        email: grant?.email || null,
        planName: grant?.planName || null,
        expiresAt: grant?.expiresAt || null,
        code: "ok",
        message: "License is active on this PC.",
      };
    }

    const code = this.store.getLastCode() || (grant ? "expired" : "no_license");
    return {
      configured: true,
      signedIn: true,
      usable: false,
      email: grant?.email || null,
      planName: grant?.planName || null,
      expiresAt: grant?.expiresAt || null,
      code,
      message: this.store.getLastMessage() || licenseMessage(code),
    };
  }

  assertUsable(): void {
    const current = this.status();
    if (!current.usable) throw new Error(current.message);
  }

  async login(email: string, password: string): Promise<AuthStatus> {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      throw new Error("Enter your email and password.");
    }
    const client = createBase44Client();
    let result: { access_token?: string };
    try {
      result = await client.auth.loginViaEmailPassword(trimmed, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed.";
      throw new Error(message);
    }
    const token = result?.access_token;
    if (!token) throw new Error("Sign in failed.");
    return this.loginWithToken(token);
  }

  async loginWithToken(token: string): Promise<AuthStatus> {
    const trimmed = token.trim();
    if (!trimmed) throw new Error("Sign in failed.");
    const client = createBase44Client();
    try {
      client.auth.setToken(trimmed, false);
    } catch {
      // Node has no localStorage; the client already received the token above.
    }
    this.store.saveSession({ token: trimmed, grant: null, lastCode: null, lastMessage: null });
    try {
      await this.activate({ requireGrant: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not activate this PC.";
      this.store.saveSession({ token: trimmed, grant: null, lastCode: "error", lastMessage: message });
    }
    return this.status();
  }

  logout(): AuthStatus {
    this.store.clear();
    return this.status();
  }

  async refresh(): Promise<AuthStatus> {
    await this.activate({ requireGrant: false });
    return this.status();
  }

  async profile(): Promise<UserProfile> {
    const token = this.store.getToken();
    if (!token) throw new Error("Sign in required.");
    const client = this.authedClient(token);
    let me: AuthUser;
    try {
      me = (await client.auth.me()) as AuthUser;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load your profile.";
      throw new Error(message);
    }
    const id = String(me?.id || "").trim();
    if (!id) throw new Error("Could not load your profile.");
    const grant = this.store.getGrant();
    return {
      id,
      email: String(me.email || grant?.email || "").trim(),
      displayName: normalizeDisplayName(me.displayName || me.full_name),
      role: accountRole(me.role),
      planName: grant?.planName || null,
      expiresAt: grant?.expiresAt || null,
    };
  }

  async updateProfile(patch: { displayName?: string }): Promise<UserProfile> {
    const displayName = normalizeDisplayName(patch?.displayName);
    if (!displayName) throw new Error("Enter a display name.");
    const current = await this.profile();
    const token = this.store.getToken();
    if (!token) throw new Error("Sign in required.");
    const client = this.authedClient(token);
    try {
      await client.entities.User.update(current.id, { displayName: displayName.slice(0, DISPLAY_NAME_MAX) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save your profile.";
      throw new Error(message);
    }
    return this.profile();
  }

  async billingStatus(): Promise<BillingSnapshot> {
    const data = await this.invokeBilling("getMySubscription", {});
    return {
      subscription: asBillingSubscription(data.subscription),
      message: typeof data.message === "string" ? data.message : null,
    };
  }

  async createCheckout(planId: string): Promise<BillingSnapshot> {
    const data = await this.invokeBilling("createSubscription", { planId, returnTo: "desktop" });
    if (!data.ok) throw new Error(String(data.message || "Could not start the subscription."));
    const checkoutUrl = typeof data.checkoutUrl === "string" ? data.checkoutUrl : "";
    if (!checkoutUrl) throw new Error("PayMongo did not return a payment page.");
    return {
      subscription: asBillingSubscription(data.subscription),
      checkoutUrl,
      message: typeof data.message === "string" ? data.message : null,
    };
  }

  async changePlan(planId: string): Promise<BillingSnapshot> {
    const data = await this.invokeBilling("changeSubscriptionPlan", { planId });
    if (!data.ok) throw new Error(String(data.message || "Could not change plan."));
    return {
      subscription: asBillingSubscription(data.subscription),
      message: typeof data.message === "string" ? data.message : "Plan change takes effect next cycle.",
    };
  }

  async cancelBilling(): Promise<BillingSnapshot> {
    const data = await this.invokeBilling("cancelSubscription", {});
    if (!data.ok) throw new Error(String(data.message || "Could not cancel."));
    return {
      subscription: asBillingSubscription(data.subscription),
      message: typeof data.message === "string" ? data.message : "Subscription cancelled.",
    };
  }

  private async invokeBilling(name: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const token = this.store.getToken();
    if (!token) throw new Error("Sign in required.");
    return invokeFunction(this.authedClient(token), name, data);
  }

  private authedClient(token: string) {
    const client = createBase44Client(token);
    try {
      client.auth.setToken(token, false);
    } catch {
      // Node has no localStorage.
    }
    return client;
  }

  private async activate(options: { requireGrant: boolean }): Promise<void> {
    const token = this.store.getToken();
    if (!token) return;

    const existing = this.store.getGrant();
    const client = createBase44Client(token);
    try {
      client.auth.setToken(token, false);
    } catch {
      // Ignored in the main process.
    }

    let data: Record<string, unknown>;
    try {
      data = await invokeFunction(client, "activateDesktop", {
        machineId: this.store.getMachineId(),
        machineLabel: os.hostname().slice(0, 120),
        appVersion: appVersion(),
      });
    } catch (error) {
      if (options.requireGrant) {
        const message = error instanceof Error ? error.message : "Could not reach the licensing server.";
        throw new Error(message);
      }
      return;
    }

    const code = typeof data.code === "string" ? data.code : "";
    const message = typeof data.message === "string" ? data.message : licenseMessage(code);
    const grant = asGrant(data.grant);

    if (data.ok && grant) {
      this.store.saveSession({ token, grant, lastCode: null, lastMessage: null });
      return;
    }

    if (code === "unauthorized") {
      this.store.clear();
      return;
    }

    const keepOfflineGrant = !options.requireGrant && code === "revoked" && isGrantUsable(existing);
    if (keepOfflineGrant) {
      this.store.saveSession({
        token,
        grant: existing,
        lastCode: null,
        lastMessage: null,
      });
      return;
    }

    this.store.saveSession({
      token,
      grant: options.requireGrant ? null : isGrantUsable(existing) && code !== "expired" ? existing : null,
      lastCode: code || "error",
      lastMessage: message,
    });

    if (options.requireGrant) return;
  }
}

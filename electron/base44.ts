import { createClient } from "@base44/sdk";
import { readBase44Config } from "./base44Config";

export { initBase44Config, readBase44Config } from "./base44Config";

export function createBase44Client(token?: string | null) {
  const { appId, appBaseUrl, functionsVersion } = readBase44Config();
  if (!appId) {
    throw new Error("Couldn't sign in right now. Check your email and password, then try again.");
  }
  return createClient({
    appId,
    token: token || undefined,
    functionsVersion: functionsVersion || undefined,
    appBaseUrl: appBaseUrl || undefined,
    analytics: { enabled: false },
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function invokeFunction(
  client: ReturnType<typeof createBase44Client>,
  name: string,
  data: Record<string, unknown> = {},
  timeoutMs = 12000,
) {
  try {
    const timeoutMessage = timeoutMs === 12000 ? "Timed out contacting the licensing server." : "Timed out contacting the server.";
    const result = await withTimeout(client.functions.invoke(name, data), timeoutMs, timeoutMessage);
    return (result?.data ?? result) as Record<string, unknown>;
  } catch (error: unknown) {
    const err = error as { data?: Record<string, unknown>; response?: { data?: Record<string, unknown> } };
    const body = err?.data || err?.response?.data;
    if (body && typeof body === "object") return body;
    throw error;
  }
}

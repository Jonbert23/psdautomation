export function api() {
  if (!window.api) {
    throw new Error("Desktop bridge is unavailable. Start the app with npm run dev (Electron).");
  }
  return window.api;
}

export function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export type AppUpdateStatus =
  | { phase: "downloading"; version: string; percent: number }
  | { phase: "ready"; version: string };

function versionParts(value: string): number[] {
  const core = value.trim().replace(/^v/i, "").split("-")[0] ?? "";
  return core.split(".").map((part) => {
    const n = Number.parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

/** True when next is a higher release than the version already installed. */
export function isNewerVersion(next: string, current: string): boolean {
  const left = versionParts(next);
  const right = versionParts(current);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

import { useEffect, useState } from "react";
import type { AppUpdateStatus } from "@shared/appVersion";
import { api } from "../lib/api";

export function UpdateBanner() {
  const [status, setStatus] = useState<AppUpdateStatus | null>(null);

  useEffect(() => {
    if (!window.api?.updates) return;
    return window.api.updates.onStatus(setStatus);
  }, []);

  if (!status) return null;

  return (
    <div className="update-banner" role="status">
      <span>
        {status.phase === "downloading"
          ? `Downloading update ${status.percent}%`
          : `Version ${status.version} is ready`}
      </span>
      {status.phase === "ready" ? (
        <button className="btn primary" type="button" onClick={() => void api().updates.restart()}>
          Restart
        </button>
      ) : null}
    </div>
  );
}

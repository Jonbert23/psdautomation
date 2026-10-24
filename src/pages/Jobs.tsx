import { useEffect, useState } from "react";
import type { AutomationJob } from "@shared/types";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";

export function JobsPage() {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api()
      .jobs.list()
      .then(setJobs)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <PageHeader
        title="Notification"
        description="Status of automation runs from Photoshop."
      />
      {error && <div className="error-banner">{error}</div>}
      {jobs.length === 0 ? (
        <div className="empty">No automation runs yet. Open an automation and click Run automation.</div>
      ) : (
        <ul className="job-list">
          {jobs.map((j) => (
            <li key={j.id}>
              <div>
                <strong>{j.id}</strong>
                {j.items.some((i) => i.error) ? (
                  <div className="muted">{j.items.find((i) => i.error)?.error?.message}</div>
                ) : null}
              </div>
              <span className={`badge ${j.status === "failed" ? "bad" : j.status === "completed" ? "ok" : ""}`}>
                {j.status}
              </span>
              <span className="muted job-progress">{j.progress}%</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

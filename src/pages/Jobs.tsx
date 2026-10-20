import { useEffect, useState } from "react";
import type { AutomationJob } from "@shared/types";
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
      {error && <div className="error-banner">{error}</div>}
      <p className="page-lead">
        Jobs are created when you click Run automation on an order. A job is completed only if Photoshop writes
        result.json.
      </p>
      {jobs.length === 0 ? (
        <div className="empty">No automation jobs yet. Open a production order and click Run automation.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Status</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.id}</td>
                  <td>
                    {j.status}
                    {j.items.some((i) => i.error) ? (
                      <div className="muted">{j.items.find((i) => i.error)?.error?.message}</div>
                    ) : null}
                  </td>
                  <td>{j.progress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

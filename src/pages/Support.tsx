import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";

interface SupportTutorial {
  id: string;
  title: string;
  description: string;
  fileName: string;
  videoUrl: string;
  downloaded: boolean;
  sortOrder: number | null;
}

export function SupportPage() {
  const [tutorials, setTutorials] = useState<SupportTutorial[]>([]);
  const [offline, setOffline] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api()
      .support.list()
      .then((result) => {
        setTutorials(result.tutorials);
        setOffline(result.offline);
        setSelectedId((current) => current || result.tutorials[0]?.id || "");
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const selected = tutorials.find((item) => item.id === selectedId) || null;
  const localSrc = selected?.downloaded ? `app-video://video/${encodeURIComponent(selected.id)}` : "";
  const remoteSrc = !offline && selected?.videoUrl ? selected.videoUrl : "";
  const src = localSrc || remoteSrc;

  return (
    <>
      <PageHeader
        title="Support"
        description="Tutorial videos."
      />
      {error && <div className="error-banner">{error}</div>}
      {offline && tutorials.length > 0 && (
        <p className="support-note">You are offline. Downloaded tutorials still play.</p>
      )}
      {tutorials.length === 0 ? (
        <div className="empty">
          {offline ? "No saved tutorials to play offline." : "No tutorials yet."}
        </div>
      ) : (
        <div className="support-layout">
          <ul className="support-list">
            {tutorials.map((tutorial) => (
              <li key={tutorial.id}>
                <button
                  type="button"
                  className={tutorial.id === selectedId ? "support-item active" : "support-item"}
                  onClick={() => setSelectedId(tutorial.id)}
                >
                  <strong>{tutorial.title}</strong>
                  {tutorial.description ? <span>{tutorial.description}</span> : null}
                </button>
              </li>
            ))}
          </ul>
          <section className="support-player">
            {selected && src ? (
              <video key={selected.id} controls preload="none" src={src} autoPlay />
            ) : (
              <div className="empty">This tutorial is not available offline.</div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

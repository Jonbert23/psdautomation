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
}

export function SupportPage() {
  const [tutorials, setTutorials] = useState<SupportTutorial[]>([]);
  const [offline, setOffline] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

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

  const download = async (tutorial: SupportTutorial) => {
    setBusyId(tutorial.id);
    setError("");
    try {
      const saved = await api().support.download(tutorial);
      setTutorials((current) => current.map((item) => (item.id === saved.id ? { ...item, ...saved, downloaded: true } : item)));
      setSelectedId(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download that tutorial.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      <PageHeader
        title="Support"
        description="Tutorial videos. A download stays in the app and plays when you are offline."
      />
      {error && <div className="error-banner">{error}</div>}
      {offline && tutorials.length > 0 && (
        <p className="support-note">You are offline. Downloaded tutorials still play.</p>
      )}
      {tutorials.length === 0 ? (
        <div className="empty">
          {offline
            ? "Download a tutorial while you are online to play it here."
            : "No tutorials yet."}
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
              <video key={src} controls src={src} />
            ) : (
              <div className="empty">Download this tutorial while you are online to play it.</div>
            )}
            {selected ? (
              <div className="support-actions">
                {selected.downloaded ? (
                  <span>Saved in the app</span>
                ) : (
                  <button
                    type="button"
                    className="btn primary"
                    disabled={offline || busyId === selected.id || !selected.videoUrl}
                    onClick={() => void download(selected)}
                  >
                    {busyId === selected.id ? "Downloading…" : "Download"}
                  </button>
                )}
              </div>
            ) : null}
          </section>
        </div>
      )}
    </>
  );
}

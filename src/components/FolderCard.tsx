import type { ReactNode } from "react";

export function FolderGrid({ children }: { children: ReactNode }) {
  return <div className="folder-grid">{children}</div>;
}

export function FolderCard({
  name,
  detail,
  status,
  updated,
  onOpen,
  inside,
  actions,
}: {
  name: string;
  detail?: string;
  status?: string;
  updated?: string;
  onOpen: () => void;
  inside?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article className="folder-card">
      <div className="folder-silhouette">
        <div className="folder-face">
          <button type="button" className="folder-open" onClick={onOpen}>
            <span className="folder-name">{name}</span>
            {detail ? <span className="muted folder-detail">{detail}</span> : null}
            {status || updated ? (
              <span className="folder-meta">
                {status ? <span className="badge">{status}</span> : null}
                {updated ? <span className="muted">{updated}</span> : null}
              </span>
            ) : null}
          </button>
          {inside ? <div className="folder-inside">{inside}</div> : null}
        </div>
      </div>
      {actions ? <div className="row-actions folder-actions">{actions}</div> : null}
    </article>
  );
}

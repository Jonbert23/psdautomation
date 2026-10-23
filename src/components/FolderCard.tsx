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
  actions,
}: {
  name: string;
  detail?: string;
  status?: string;
  updated?: string;
  onOpen: () => void;
  actions?: ReactNode;
}) {
  return (
    <article className="folder-card">
      <button type="button" className="folder-face" onClick={onOpen}>
        <span className="folder-tab" aria-hidden="true" />
        <span className="folder-name">{name}</span>
        {detail ? <span className="muted folder-detail">{detail}</span> : null}
        <span className="folder-meta">
          {status ? <span className="badge">{status}</span> : null}
          {updated ? <span className="muted">{updated}</span> : null}
        </span>
      </button>
      {actions ? <div className="row-actions folder-actions">{actions}</div> : null}
    </article>
  );
}

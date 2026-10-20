import type { GarmentProfile, PresetAssignment } from "@shared/types";
import { resolvePresets } from "@shared/presets";
import { presetCoverage } from "@shared/steps";
import { api } from "../../lib/api";
import { fileName } from "../../lib/profileFactories";

export function PresetsStep({
  profile,
  onChange,
}: {
  profile: GarmentProfile;
  onChange: (patch: Partial<GarmentProfile>) => void;
}) {
  const parts = [...profile.parts].filter((p) => p.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const sizes = [...profile.sizes].filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const issues = resolvePresets(profile).issues;
  const coverage = presetCoverage(profile);

  function assignment(sizeId: string, partId: string): PresetAssignment | undefined {
    return profile.presetAssignments.find((a) => a.sizeId === sizeId && a.partId === partId);
  }

  function setCell(sizeId: string, partId: string, filePath: string) {
    const rest = profile.presetAssignments.filter((a) => !(a.sizeId === sizeId && a.partId === partId));
    onChange({
      presetAssignments: filePath.trim() ? [...rest, { sizeId, partId, filePath }] : rest,
    });
  }

  async function browse(sizeId: string, partId: string) {
    const file = await api().dialogs.openFile({
      title: "Select preset PNG",
      filters: [{ name: "PNG", extensions: ["png"] }],
    });
    if (file) setCell(sizeId, partId, file);
  }

  function reuseFrom(sizeId: string, partId: string, sourcePath: string) {
    setCell(sizeId, partId, sourcePath);
  }

  const knownPaths = [...new Set(profile.presetAssignments.map((a) => a.filePath).filter(Boolean))];

  if (parts.length === 0 || sizes.length === 0) {
    return (
      <div className="empty">Add at least one enabled part and one enabled size before assigning presets.</div>
    );
  }

  return (
    <>
      <p className="page-lead">
        Each size and required part needs a PNG layout (silhouette or mask). The same PNG can be reused. Missing
        required cells stay highlighted — the engine will not pick another size for you.
      </p>
      <p className="muted">
        Required coverage: {coverage.filled}/{coverage.required}
      </p>
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table>
          <thead>
            <tr>
              <th>Size</th>
              {parts.map((part) => (
                <th key={part.id}>
                  {part.name || "Untitled"}
                  {part.required ? "" : " (optional)"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizes.map((size) => (
              <tr key={size.id}>
                <td>
                  <strong>{size.label || "Untitled"}</strong>
                </td>
                {parts.map((part) => {
                  const current = assignment(size.id, part.id);
                  const missing = issues.some(
                    (i) => i.path === `presetAssignments.${size.id}.${part.id}` && i.code === "missing_preset",
                  );
                  const duplicate = issues.some(
                    (i) => i.path === `presetAssignments.${size.id}.${part.id}` && i.code === "duplicate_assignment",
                  );
                  const notPng = issues.some(
                    (i) => i.path === `presetAssignments.${size.id}.${part.id}` && i.code === "invalid_preset_type",
                  );
                  return (
                    <td key={part.id} className={missing || notPng ? "preset-missing" : ""}>
                      <div className="path-row">
                        <input
                          className="input"
                          value={current?.filePath ?? ""}
                          placeholder={part.required ? "Required" : "Optional"}
                          onChange={(e) => setCell(size.id, part.id, e.target.value)}
                        />
                        <button className="btn" onClick={() => browse(size.id, part.id)}>
                          Browse
                        </button>
                      </div>
                      {current?.filePath ? (
                        <div className="muted">{fileName(current.filePath)}</div>
                      ) : null}
                      {duplicate ? <div className="muted">Duplicate assignment</div> : null}
                      {notPng ? <div className="muted">Must be a PNG</div> : null}
                      {knownPaths.length > 0 && (
                        <select
                          className="select"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) reuseFrom(size.id, part.id, e.target.value);
                          }}
                        >
                          <option value="">Reuse file…</option>
                          {knownPaths.map((p) => (
                            <option key={p} value={p}>
                              {fileName(p)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

import type { GarmentPart, GarmentProfile, ScaleMode } from "@shared/types";
import { starterParts } from "@shared/starters";
import { newPart } from "../../lib/profileFactories";
import { ReorderHandle, useRowReorder } from "../../components/ReorderHandle";

const SCALE_MODES: ScaleMode[] = ["stretch", "fit", "fill", "contain"];

export function PartsStep({
  profile,
  onChange,
}: {
  profile: GarmentProfile;
  onChange: (patch: Partial<GarmentProfile>) => void;
}) {
  const parts = [...profile.parts].sort((a, b) => a.sortOrder - b.sortOrder);
  const reorder = useRowReorder(parts, (next: GarmentPart[]) => setParts(next));

  function setParts(next: GarmentPart[]) {
    onChange({ parts: next.map((p, i) => ({ ...p, sortOrder: i })) });
  }

  function patchPart(id: string, patch: Partial<GarmentPart>) {
    setParts(parts.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function remove(id: string) {
    onChange({
      parts: parts.filter((p) => p.id !== id).map((p, i) => ({ ...p, sortOrder: i })),
      presetAssignments: profile.presetAssignments.filter((a) => a.partId !== id),
      attributes: profile.attributes.map((attr) =>
        attr.mapping?.partId === id ? { ...attr, mapping: { ...attr.mapping, partId: undefined } } : attr,
      ),
    });
  }

  function duplicate(part: GarmentPart) {
    const copy: GarmentPart = { ...part, id: newPart(parts.length).id, name: `${part.name || "Part"} copy` };
    setParts([...parts, copy]);
  }

  return (
    <>
      <p className="page-lead">
        Parts are pieces placed from any design file onto PNG size presets. Map each part to a Photoshop layer or group
        name (for example <code>front</code>). The design PSD itself is not stored on this profile.
      </p>
      <div className="toolbar">
        <button className="btn primary" onClick={() => setParts([...parts, newPart(parts.length)])}>
          Add part
        </button>
        <button
          className="btn"
          onClick={() => setParts([...parts, ...starterParts(parts.length)])}
          disabled={parts.some((p) => p.photoshopLayer === "front")}
        >
          Insert starter parts
        </button>
      </div>
      {parts.length === 0 ? (
        <div className="empty">No parts yet. Add your own or insert the T-shirt starter set.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th />
                <th>Part name</th>
                <th>Layer name</th>
                <th>Required</th>
                <th>On</th>
                <th>Clip</th>
                <th>Scale</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {parts.map((part, index) => (
                <tr key={part.id} {...reorder.rowProps(index)}>
                  <td>
                    <ReorderHandle label={`Drag ${part.name || "part"}`} {...reorder.handleProps(index)} />
                  </td>
                  <td>
                    <input
                      className="input"
                      value={part.name}
                      placeholder="Front body"
                      onChange={(e) => patchPart(part.id, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      value={part.photoshopLayer}
                      placeholder="front"
                      onChange={(e) => patchPart(part.id, { photoshopLayer: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={part.required}
                      onChange={(e) => patchPart(part.id, { required: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={part.enabled}
                      onChange={(e) => patchPart(part.id, { enabled: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={part.clippingMask}
                      onChange={(e) => patchPart(part.id, { clippingMask: e.target.checked })}
                    />
                  </td>
                  <td>
                    <select
                      className="select"
                      value={part.scaleMode}
                      onChange={(e) => patchPart(part.id, { scaleMode: e.target.value as ScaleMode })}
                    >
                      {SCALE_MODES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn" onClick={() => duplicate(part)}>
                        Duplicate
                      </button>
                      <button className="btn danger" onClick={() => remove(part.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

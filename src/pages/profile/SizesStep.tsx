import type { GarmentProfile, SizeDefinition } from "@shared/types";
import { STARTER_SIZE_LABELS } from "@shared/starters";
import { createId } from "@shared/ids";
import { newSize } from "../../lib/profileFactories";
import { ReorderHandle, useRowReorder } from "../../components/ReorderHandle";

export function SizesStep({
  profile,
  onChange,
}: {
  profile: GarmentProfile;
  onChange: (patch: Partial<GarmentProfile>) => void;
}) {
  const sizes = [...profile.sizes].sort((a, b) => a.sortOrder - b.sortOrder);
  const reorder = useRowReorder(sizes, (next: SizeDefinition[]) => setSizes(next));

  function setSizes(next: SizeDefinition[], assignments = profile.presetAssignments) {
    onChange({ sizes: next.map((s, i) => ({ ...s, sortOrder: i })), presetAssignments: assignments });
  }

  function patchSize(id: string, patch: Partial<SizeDefinition>) {
    setSizes(sizes.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function insertStarterSizes() {
    const extra = STARTER_SIZE_LABELS.filter((label) => !sizes.some((s) => s.label.toUpperCase() === label)).map(
      (label, i) => newSize(sizes.length + i, label),
    );
    setSizes([...sizes, ...extra]);
  }

  function duplicate(size: SizeDefinition) {
    const id = createId("size");
    const copy: SizeDefinition = { ...size, id, label: `${size.label || "Size"} copy`, partDimensions: { ...size.partDimensions } };
    const extra = profile.presetAssignments
      .filter((a) => a.sizeId === size.id)
      .map((a) => ({ ...a, sizeId: id }));
    setSizes([...sizes, copy], [...profile.presetAssignments, ...extra]);
  }

  function remove(id: string) {
    setSizes(
      sizes.filter((s) => s.id !== id),
      profile.presetAssignments.filter((a) => a.sizeId !== id),
    );
  }

  return (
    <>
      <p className="page-lead">
        Sizes are labels on this garment type, not a fixed list in code. Add whatever the shop uses. PNG layout
        files are assigned on the next step.
      </p>
      <div className="toolbar">
        <button className="btn primary" onClick={() => setSizes([...sizes, newSize(sizes.length)])}>
          Add size
        </button>
        <button className="btn" onClick={insertStarterSizes}>
          Insert XS–3XL
        </button>
      </div>
      {sizes.length === 0 ? (
        <div className="empty">No sizes yet.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th />
                <th>Label</th>
                <th>Description</th>
                <th>On</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sizes.map((size, index) => (
                <tr key={size.id} {...reorder.rowProps(index)}>
                  <td>
                    <ReorderHandle label={`Drag ${size.label || "size"}`} {...reorder.handleProps(index)} />
                  </td>
                  <td>
                    <input
                      className="input"
                      value={size.label}
                      placeholder="L"
                      onChange={(e) => patchSize(size.id, { label: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      value={size.description}
                      onChange={(e) => patchSize(size.id, { description: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={size.enabled}
                      onChange={(e) => patchSize(size.id, { enabled: e.target.checked })}
                    />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn" onClick={() => duplicate(size)}>
                        Duplicate
                      </button>
                      <button className="btn danger" onClick={() => remove(size.id)}>
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

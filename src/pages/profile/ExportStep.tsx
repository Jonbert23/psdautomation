import type { FileConflictPolicy, GarmentProfile } from "@shared/types";

export function ExportStep({
  profile,
  onChange,
}: {
  profile: GarmentProfile;
  onChange: (patch: Partial<GarmentProfile>) => void;
}) {
  const ex = profile.exportSettings;

  function patchExport(next: Partial<GarmentProfile["exportSettings"]>) {
    onChange({ exportSettings: { ...ex, ...next } });
  }

  return (
    <>
      <p className="page-lead">
        File names and save formats are set on the production order. These options only control overwrite behavior
        for this garment type.
      </p>
      <section className="card">
        <h3>Conflicts</h3>
        <div className="card-body form-grid">
          <div className="field">
            <label>Conflict policy</label>
            <select
              className="select"
              value={ex.conflictPolicy}
              onChange={(e) => patchExport({ conflictPolicy: e.target.value as FileConflictPolicy })}
            >
              <option value="warn">Warn</option>
              <option value="suffix">Add suffix</option>
              <option value="overwrite">Overwrite</option>
            </select>
          </div>
          <div className="field">
            <label>Organize by</label>
            <select
              className="select"
              value={ex.organizeBy}
              onChange={(e) =>
                patchExport({ organizeBy: e.target.value as GarmentProfile["exportSettings"]["organizeBy"] })
              }
            >
              <option value="order">Order</option>
              <option value="garment">Garment</option>
              <option value="size">Size</option>
              <option value="customer">Customer</option>
            </select>
          </div>
        </div>
      </section>
    </>
  );
}

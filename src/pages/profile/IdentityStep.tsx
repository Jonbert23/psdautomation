import type { Category, GarmentProfile } from "@shared/types";

export function IdentityStep({
  profile,
  categories,
  onChange,
}: {
  profile: GarmentProfile;
  categories: Category[];
  onChange: (patch: Partial<GarmentProfile>) => void;
}) {
  return (
    <>
      <p className="page-lead">
        Name the garment type. This profile is reused for any design whose layer names match the parts and fields
        you configure next. The design file is chosen when you run a job, not here.
      </p>
      <section className="card">
        <h3>Identity</h3>
        <div className="card-body form-grid">
          <div className="field">
            <label>Garment name</label>
            <input
              className="input"
              value={profile.name}
              placeholder="Round neck T-shirt"
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Category</label>
            <select className="select" value={profile.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field span-2">
            <label>Description (optional)</label>
            <textarea
              className="textarea"
              value={profile.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </div>
        </div>
      </section>
    </>
  );
}

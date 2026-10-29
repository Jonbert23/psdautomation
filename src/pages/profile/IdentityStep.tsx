import { profileCategoryIds } from "@shared/defaults";
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
  const selected = profileCategoryIds(profile);

  const toggle = (id: string, checked: boolean) => {
    const next = checked ? [...selected, id] : selected.filter((item) => item !== id);
    const unique = [...new Set(next)];
    if (!unique.length) return;
    const ordered = categories.map((category) => category.id).filter((item) => unique.includes(item));
    const ids = [...ordered, ...unique.filter((item) => !ordered.includes(item))];
    onChange({ categoryIds: ids, categoryId: ids[0] });
  };

  return (
    <>
      <p className="page-lead">
        Name the garment type. This profile is reused for any design whose layer names match the parts and fields
        you configure next. The design file is chosen when you run a job, not here.
      </p>
      <section className="card">
        <h3>Identity</h3>
        <div className="card-body form-grid">
          <div className="field span-2">
            <label>Garment name</label>
            <input
              className="input"
              value={profile.name}
              placeholder="Round neck T-shirt"
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>
          <div className="field span-2">
            <label>Categories</label>
            <div className="check-list">
              {categories.map((c) => (
                <label key={c.id} className="check-inline">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={(e) => toggle(c.id, e.target.checked)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
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

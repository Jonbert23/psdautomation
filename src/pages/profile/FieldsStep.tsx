import type { AttributeDefinition, AttributeType, GarmentProfile } from "@shared/types";
import { starterFields } from "@shared/starters";
import { enabledPartsSorted } from "@shared/layout";
import { TEXT_FIELD_TYPES } from "@shared/templateSpec";
import { moveItem, newAttribute, slugKey } from "../../lib/profileFactories";

const TYPES: AttributeType[] = ["text", "number", "select", "color", "image", "checkbox"];

export function FieldsStep({
  profile,
  onChange,
}: {
  profile: GarmentProfile;
  onChange: (patch: Partial<GarmentProfile>) => void;
}) {
  const attrs = [...profile.attributes].sort((a, b) => a.sortOrder - b.sortOrder);
  const parts = enabledPartsSorted(profile.parts);

  function setAttrs(next: AttributeDefinition[]) {
    onChange({ attributes: next.map((a, i) => ({ ...a, sortOrder: i })) });
  }

  function patch(id: string, next: Partial<AttributeDefinition>) {
    setAttrs(attrs.map((a) => (a.id === id ? { ...a, ...next } : a)));
  }

  function patchMapping(id: string, attr: AttributeDefinition, next: Partial<NonNullable<AttributeDefinition["mapping"]>>) {
    patch(id, {
      mapping: {
        layerName: attr.mapping?.layerName ?? "",
        layerKind: attr.mapping?.layerKind ?? "text",
        partId: attr.mapping?.partId,
        ...next,
      },
    });
  }

  return (
    <>
      <p className="page-lead">
        These become columns on every order. Attach each field to a garment part so its text layer is created inside
        that part’s group in Template Guide. Image and checkbox fields are not written as text. The order still
        chooses the design file at run time.
      </p>
      <div className="toolbar">
        <button className="btn primary" onClick={() => setAttrs([...attrs, newAttribute(attrs.length)])}>
          Add field
        </button>
        <button
          className="btn"
          onClick={() => setAttrs([...attrs, ...starterFields(attrs.length, profile.parts)])}
          disabled={attrs.some((a) => a.key === "name")}
        >
          Insert name and number
        </button>
      </div>
      {attrs.length === 0 ? (
        <div className="empty">No order fields yet. Automation can still place parts if you only need sizes.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Display name</th>
                <th>Key</th>
                <th>Type</th>
                <th>Part</th>
                <th>Layer names</th>
                <th>Required</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {attrs.map((attr, index) => (
                <tr key={attr.id}>
                  <td>
                    <input
                      className="input"
                      value={attr.displayName}
                      placeholder="Jersey name"
                      onChange={(e) => {
                        const displayName = e.target.value;
                        const auto = slugKey(displayName);
                        const key = !attr.key || attr.key.startsWith("field_") ? auto : attr.key;
                        patch(attr.id, { displayName, key });
                      }}
                    />
                  </td>
                  <td>
                    <input className="input" value={attr.key} onChange={(e) => patch(attr.id, { key: slugKey(e.target.value) })} />
                  </td>
                  <td>
                    <select
                      className="select"
                      value={attr.type}
                      onChange={(e) => {
                        const type = e.target.value as AttributeType;
                        patch(attr.id, {
                          type,
                          options:
                            type === "select"
                              ? attr.options.length
                                ? attr.options
                                : [{ value: "option_1", label: "Option 1" }]
                              : attr.options,
                          mapping: {
                            layerName: attr.mapping?.layerName ?? "",
                            layerKind: TEXT_FIELD_TYPES.has(type)
                              ? "text"
                              : type === "image"
                                ? "smartObject"
                                : type === "checkbox"
                                  ? "group"
                                  : attr.mapping?.layerKind ?? "auto",
                            partId: attr.mapping?.partId,
                          },
                        });
                      }}
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="select"
                      value={attr.mapping?.partId ?? ""}
                      onChange={(e) => patchMapping(attr.id, attr, { partId: e.target.value || undefined })}
                    >
                      <option value="">Not attached</option>
                      {parts.map((part) => (
                        <option key={part.id} value={part.id}>
                          {part.name || part.photoshopLayer || part.id}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="input"
                      value={attr.mapping?.layerName ?? ""}
                      placeholder="surname"
                      onChange={(e) => patchMapping(attr.id, attr, { layerName: e.target.value })}
                    />
                    {attr.type === "select" && (
                      <input
                        className="input"
                        style={{ marginTop: 6 }}
                        value={attr.options.map((o) => o.label).join(", ")}
                        placeholder="Option A, Option B"
                        onChange={(e) =>
                          patch(attr.id, {
                            options: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)
                              .map((label) => ({ value: slugKey(label), label })),
                          })
                        }
                      />
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={attr.required}
                      onChange={(e) => patch(attr.id, { required: e.target.checked })}
                    />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn" disabled={index === 0} onClick={() => setAttrs(moveItem(attrs, index, -1))}>
                        Up
                      </button>
                      <button
                        className="btn"
                        disabled={index === attrs.length - 1}
                        onClick={() => setAttrs(moveItem(attrs, index, 1))}
                      >
                        Down
                      </button>
                      <button className="btn danger" onClick={() => setAttrs(attrs.filter((a) => a.id !== attr.id))}>
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

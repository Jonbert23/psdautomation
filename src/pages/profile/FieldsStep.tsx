import type { AttributeDefinition, AttributeType, GarmentProfile } from "@shared/types";
import { starterFields } from "@shared/starters";
import { enabledPartsSorted } from "@shared/layout";
import { TEXT_FIELD_TYPES } from "@shared/templateSpec";
import { newAttribute, slugKey } from "../../lib/profileFactories";
import { ReorderHandle, useRowReorder } from "../../components/ReorderHandle";

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
  const reorder = useRowReorder(attrs, (next: AttributeDefinition[]) => setAttrs(next));

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
        Add the extra details you type on each order, like a player name or a jersey number. They show up as columns
        when you fill in an order. Choose which part of the garment each one belongs to, so the words are printed on
        the right piece. Photos and yes-or-no choices stay with the order and are not printed as words. You still
        pick the design file later, when you run the order.
      </p>
      <div className="toolbar">
        <button className="btn primary" onClick={() => setAttrs([...attrs, newAttribute(attrs.length)])}>
          Add custom
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
        <div className="empty">Nothing custom yet. You can still place the garment parts if you only need sizes.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th />
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
                <tr key={attr.id} {...reorder.rowProps(index)}>
                  <td>
                    <ReorderHandle label={`Drag ${attr.displayName || "custom detail"}`} {...reorder.handleProps(index)} />
                  </td>
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

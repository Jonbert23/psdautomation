# Photoshop engine

`engine.jsx` runs production jobs. `layout.jsx` opens a working `GARMENT_LAYOUT` document so you can arrange PNG parts in Photoshop, then writes `positions.json` on capture. `template.jsx` builds a Template Guide PSD from the profile (part groups, colored placeholders, nested text layers) and saves the path you chose.

Production will:

- Read `job.json` (schemaVersion, profile snapshot, order items)
- Open the configured design template and place artwork onto per-part PNG presets
- Apply attribute mappings (text, image, visibility, select)
- Place artwork on reference layers using the existing scale/clip behavior from `tshirt_customizer.jsx`
- Export using profile export settings
- Write `result.json` and `engine.log`
- Close documents without saving originals

The legacy scripts at the repository root remain the current production workflow.

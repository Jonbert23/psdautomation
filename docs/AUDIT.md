# Phase 1 Audit: Dynamic Garment Customizer

**Date:** 2026-10-14  
**Scope:** Entire workspace plus both Photoshop JSX scripts.

## Current technology stack

There is **no desktop application** yet. The workspace is a Photoshop scripting project:

| Item | Status |
|---|---|
| Application framework | None |
| UI | ScriptUI dialogs inside Photoshop (`Window("dialog")`) |
| Persistence | None (in-memory arrays only) |
| Database | None |
| Tests | None |
| Package manifest | None |
| Photoshop engine | ExtendScript JSX (`#target photoshop`) |

Files of interest:

- `tshirt_customizer.jsx` — named-entry customizer (name, number, size)
- `tshirt_bulk_generator.jsx` — size × quantity bulk layout (no name/number)
- `preset.psd` and `preset/` — combined size preset documents
- `t-shirt template*.psd` — design templates
- `Sample.jpg`, `Tutorial/`, `test/` — sample/tutorial assets

Photoshop requirement in both scripts: **CS6 / version 13 or later**.

## Current script behavior (`tshirt_customizer.jsx`)

End-to-end workflow:

1. User picks a design template (`.psd` / `.psb`).
2. User adds rows of **name**, optional **number**, and **hardcoded size**.
3. User picks an output folder and export flags (PSD / PNG / JPG).
4. Optional **single combined PSD** vs **one file per garment**.
5. For each row:
   - Open the template (never saved back).
   - Replace hardcoded text layers.
   - Merge hardcoded part groups.
   - Open a single `preset.psd` that contains a `SIZES` folder.
   - Show the matching size folder, **delete other size folders**, ungroup, delete hidden layers.
   - Copy design parts onto reference layers, scale-to-bounds, clip.
   - Save copies to the output folder.
   - Close documents with `DONOTSAVECHANGES`.

`tshirt_bulk_generator.jsx` reuses the same placement engine but skips text replacement. It stacks processed garments vertically into one print sheet.

## Photoshop API usage to preserve

These operations are real and working. The new engine must keep them, driven by config instead of hardcoded names:

- `app.open` / `doc.close(SaveOptions.DONOTSAVECHANGES)` — originals stay intact
- Recursive layer search (`findLayerByName`)
- `textItem.contents` replacement
- `LayerSet.merge()`
- Layer `copy()` / `paste()`
- `layer.resize` + `translate` against reference `bounds` (stretch-to-fit)
- Clipping via `layer.grouped = true` after stacking customized layer above reference
- `PhotoshopSaveOptions` (layered PSD)
- `ExportOptionsSaveForWeb` PNG-24
- `JPEGSaveOptions` quality 10
- `app.preferences.rulerUnits = Units.PIXELS` during processing
- Combined/bulk vertical layout with layer groups per entry

Silent-failure behavior that **must not** be copied:

- `matchLayerToReference` swallows errors
- Clipping-mask creation swallows errors
- Optional parts (sleeves, ribbing) are skipped with no report if missing

## Required template layers (current hardcoded contract)

**Design template** (merged then copied):

| Layer / group | Required today |
|---|---|
| `front` | Yes |
| `back` | Yes |
| `leftsleeve` / `sleeve_left` / `left_sleeve` | Optional |
| `rightsleeve` / `sleeve_right` / `right_sleeve` | Optional |
| `ribbing` | Optional |

**Text layers** (first match wins; all are attempted):

- Name: `surname`, `name`, `text`
- Number: `back_num`, `front_num`, `number`

**Preset document:**

- Must contain a group named `SIZES`
- Size groups named like `XSMALL`, `SMALL`, `MEDUIM` (typo preserved), `LARGE`, `XLARGE`, `2XLARGE` … `7XLARGE`
- Inside the selected size: reference layers `front`, `back`, optional sleeves and ribbing

## Existing limitations

1. **Hardcoded garment type** — T-shirt only; parts and attributes are baked into the script.
2. **Hardcoded sizes** — dropdown list; size-folder detection even keys off the strings `SMALL`, `LARGE`, `MEDUIM`.
3. **Single combined preset** — `findTshirtPsdFile()` looks for `preset.psd` next to the template. All sizes live in one `SIZES` group. Processing **deletes unused size folders in the open document** (safe because the file is not saved, but incompatible with per-part presets).
4. **No dynamic attributes** — only name + number.
5. **No image / color / visibility attributes.**
6. **No orders, jobs, retries, or logs** beyond a final alert.
7. **No persistence** — closing the dialog loses the entry list.
8. **No layer inspection UI.**
9. **Scaling is stretch** (`scaleX` and `scaleY` independently). Fit / fill / aspect-ratio modes do not exist.
10. **PNG/JPG in customizer** are disabled conceptually for combined PSD mode.
11. Combined processing counts every item as success if the batch function does not throw.

## Features that must be preserved

- Do not modify original templates or presets (close without saving).
- Text replacement on mapped layers.
- Merge part groups before copy.
- Place artwork onto reference layers, scale, clip.
- Per-item PSD / PNG / JPG export.
- Combined vertical PSD output (bulk sheet).
- Photoshop CS6+ compatibility target for the JSX layer.
- Existing sample templates remain usable if a default “legacy T-shirt” profile maps the old layer names.

## Integration constraint

A normal renderer (browser or Electron Chromium) **cannot** execute JSX inside Photoshop. The desktop app must:

1. Validate configuration and orders in Node/Electron.
2. Write a versioned JSON job payload to disk.
3. Invoke Photoshop (COM on Windows, or `Photoshop.exe` + JSX) to run a configuration-driven engine script.
4. Read a JSON result/log written by that script.

Phase 2 builds the UI and persistence. Phase 5 wires the real JSX engine to that JSON contract.
